/**
 * Sprint TOML Schema Validator - VAL-001
 *
 * DESIGN DECISION: Validate sprint TOML structure before parsing
 * WHY: Prevent Claude from inventing unsupported formats that break sprint panel
 *
 * REASONING CHAIN:
 * 1. Claude Code writes to ACTIVE_SPRINT.toml
 * 2. May invent unsupported formats (e.g., [[epic.*.tasks]] instead of [tasks.ID])
 * 3. SprintLoader parser can't find tasks → Sprint panel shows incomplete list
 * 4. Hours wasted debugging TOML structure
 * 5. Solution: Validate structure BEFORE parsing, fail fast with clear errors
 *
 * PATTERN: Pattern-VALIDATION-001 (Comprehensive System Validation)
 * RELATED: SprintLoader.ts (parser), FileSystemWatcher (real-time validation)
 * TRIGGERED BY: 2025-11-03 bug - Claude used [[epic.middleware.tasks]], breaking panel
 */

import * as toml from '@iarna/toml';

/**
 * Validation result with error details and fix suggestions
 */
export interface ValidationResult {
    valid: boolean;
    error?: string;
    suggestions?: string[];
    line?: number;  // Line number where error occurred (if available)
}

/**
 * Sprint task data structure (minimal interface for validation)
 */
interface SprintTask {
    id: string;
    name: string;
    status: string;
    phase: string;
    agent: string;
    dependencies?: string[];
    [key: string]: any;
}

/**
 * Sprint data structure
 */
interface SprintData {
    tasks: Record<string, SprintTask>;
    epic?: any;  // Should NOT exist (forbidden format)
    [key: string]: any;
}

/**
 * SprintSchemaValidator - Validates ACTIVE_SPRINT.toml structure
 *
 * Validation Rules:
 * 1. Tasks must use [tasks.ID] format (NOT [[epic.*.tasks]])
 * 2. Required fields: id, name, status, phase, agent
 * 3. Status must be: pending, in_progress, or completed
 * 4. No circular dependencies
 * 5. No duplicate task IDs
 */
export class SprintSchemaValidator {
    private readonly VALID_STATUSES = ['pending', 'in_progress', 'completed'];
    private readonly REQUIRED_FIELDS = ['id', 'name', 'status', 'phase', 'agent'];

    /**
     * Validate sprint TOML content
     *
     * @param tomlContent - Raw TOML file content
     * @returns ValidationResult with error details if invalid
     */
    validate(tomlContent: string): ValidationResult {
        try {
            // Parse TOML
            const data = toml.parse(tomlContent) as SprintData;

            // Rule 1: Tasks must be under [tasks] section
            const tasksCheck = this.validateTasksSection(data);
            if (!tasksCheck.valid) {
                return tasksCheck;
            }

            // Rule 2: Reject nested structures like [[epic.*.tasks]]
            const epicCheck = this.validateNoEpicFormat(data);
            if (!epicCheck.valid) {
                return epicCheck;
            }

            // Rule 3: Validate required fields and status values
            const fieldsCheck = this.validateTaskFields(data.tasks);
            if (!fieldsCheck.valid) {
                return fieldsCheck;
            }

            // Rule 4: Check for circular dependencies
            const circularCheck = this.validateNoCircularDeps(data.tasks);
            if (!circularCheck.valid) {
                return circularCheck;
            }

            // Rule 5: Check for duplicate task IDs
            const duplicatesCheck = this.validateNoDuplicateIds(data.tasks);
            if (!duplicatesCheck.valid) {
                return duplicatesCheck;
            }

            return { valid: true };

        } catch (error) {
            // TOML parse error
            return {
                valid: false,
                error: `TOML parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                suggestions: [
                    'Check TOML syntax (quotes, brackets, escape sequences)',
                    'Common issues: Unescaped backslashes, invalid escape sequences',
                    'Valid escape sequences: \\t, \\n, \\r, \\", \\\\'
                ]
            };
        }
    }

    /**
     * Rule 1: Validate [tasks] section exists
     */
    private validateTasksSection(data: SprintData): ValidationResult {
        if (!data.tasks || typeof data.tasks !== 'object') {
            return {
                valid: false,
                error: 'No [tasks] section found in sprint file',
                suggestions: [
                    'Add tasks using format: [tasks.TASK-ID]',
                    'Example: [tasks.MID-001]'
                ]
            };
        }

        if (Object.keys(data.tasks).length === 0) {
            return {
                valid: false,
                error: 'Sprint file has empty [tasks] section',
                suggestions: ['Add at least one task']
            };
        }

        return { valid: true };
    }

    /**
     * Rule 2: Reject [[epic.*.tasks]] format
     */
    private validateNoEpicFormat(data: SprintData): ValidationResult {
        if (data.epic) {
            return {
                valid: false,
                error: 'Invalid format: [[epic.*.tasks]] not supported by SprintLoader',
                suggestions: [
                    'Use [tasks.ID] format instead',
                    'Example: [tasks.MID-015] NOT [[epic.middleware.tasks]]',
                    'SprintLoader expects flat data.tasks object, not nested structure'
                ]
            };
        }

        return { valid: true };
    }

    /**
     * Rule 3: Validate required fields and status values
     */
    private validateTaskFields(tasks: Record<string, SprintTask>): ValidationResult {
        for (const [taskId, task] of Object.entries(tasks)) {
            // Check required fields
            const missing = this.REQUIRED_FIELDS.filter(field => !task[field]);

            if (missing.length > 0) {
                return {
                    valid: false,
                    error: `Task ${taskId} missing required fields: ${missing.join(', ')}`,
                    suggestions: [
                        `Add missing fields to [tasks.${taskId}]`,
                        `Required: ${this.REQUIRED_FIELDS.join(', ')}`
                    ]
                };
            }

            // Validate status value
            if (!this.VALID_STATUSES.includes(task.status)) {
                return {
                    valid: false,
                    error: `Task ${taskId} has invalid status: "${task.status}"`,
                    suggestions: [
                        `Valid statuses: ${this.VALID_STATUSES.join(', ')}`,
                        `Change status = "${task.status}" to one of the valid values`
                    ]
                };
            }

            // Validate ID matches key (consistency check)
            if (task.id !== taskId) {
                return {
                    valid: false,
                    error: `Task ${taskId}: id field "${task.id}" doesn't match section key "${taskId}"`,
                    suggestions: [
                        `Change id = "${task.id}" to id = "${taskId}"`,
                        'OR rename section [tasks.${task.id}]'
                    ]
                };
            }
        }

        return { valid: true };
    }

    /**
     * Rule 4: Check for circular dependencies
     */
    private validateNoCircularDeps(tasks: Record<string, SprintTask>): ValidationResult {
        const visited = new Set<string>();
        const stack = new Set<string>();
        const cyclePath: string[] = [];

        for (const taskId of Object.keys(tasks)) {
            const cycle = this.detectCycle(taskId, tasks, visited, stack, cyclePath);
            if (cycle) {
                return {
                    valid: false,
                    error: `Circular dependency detected: ${cycle.join(' → ')} → ${cycle[0]}`,
                    suggestions: [
                        'Remove one dependency to break the cycle',
                        'Task dependencies should form a directed acyclic graph (DAG)'
                    ]
                };
            }
        }

        return { valid: true };
    }

    /**
     * Depth-first search for cycle detection
     */
    private detectCycle(
        taskId: string,
        tasks: Record<string, SprintTask>,
        visited: Set<string>,
        stack: Set<string>,
        path: string[]
    ): string[] | null {
        if (stack.has(taskId)) {
            // Found cycle - return path from cycle start
            const cycleStart = path.indexOf(taskId);
            return path.slice(cycleStart);
        }

        if (visited.has(taskId)) {
            return null;  // Already checked this branch
        }

        visited.add(taskId);
        stack.add(taskId);
        path.push(taskId);

        const task = tasks[taskId];
        if (task && task.dependencies) {
            for (const depId of task.dependencies) {
                if (!tasks[depId]) {
                    // Dependency doesn't exist (but this is not a circular dependency issue)
                    continue;
                }

                const cycle = this.detectCycle(depId, tasks, visited, stack, path);
                if (cycle) {
                    return cycle;
                }
            }
        }

        stack.delete(taskId);
        path.pop();

        return null;
    }

    /**
     * Rule 5: Check for duplicate task IDs
     */
    private validateNoDuplicateIds(tasks: Record<string, SprintTask>): ValidationResult {
        const ids = new Set<string>();
        const duplicates: string[] = [];

        for (const [taskId, task] of Object.entries(tasks)) {
            if (ids.has(task.id)) {
                duplicates.push(task.id);
            }
            ids.add(task.id);
        }

        if (duplicates.length > 0) {
            return {
                valid: false,
                error: `Duplicate task IDs found: ${duplicates.join(', ')}`,
                suggestions: [
                    'Each task must have a unique ID',
                    'Rename duplicate tasks with unique identifiers'
                ]
            };
        }

        return { valid: true };
    }

    /**
     * Validate file on disk (convenience method)
     *
     * @param filePath - Path to sprint TOML file
     * @returns ValidationResult
     */
    async validateFile(filePath: string): Promise<ValidationResult> {
        const fs = await import('fs/promises');
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return this.validate(content);
        } catch (error) {
            return {
                valid: false,
                error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
                suggestions: [`Check file path: ${filePath}`]
            };
        }
    }
}

/**
 * Format validation result as user-friendly error message
 */
export function formatValidationError(result: ValidationResult): string {
    if (result.valid) {
        return '✅ Sprint TOML validation passed';
    }

    let message = `❌ Sprint TOML validation failed:\n\n${result.error}`;

    if (result.suggestions && result.suggestions.length > 0) {
        message += '\n\n💡 Suggestions:\n';
        for (const suggestion of result.suggestions) {
            message += `  • ${suggestion}\n`;
        }
    }

    return message;
}
