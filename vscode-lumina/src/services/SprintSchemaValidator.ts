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
    warnings?: string[];  // Non-fatal warnings (e.g., skipped SUGGESTED tasks)
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

            // Rule 6: Validate template task compliance (Pattern-SPRINT-TEMPLATE-001)
            const templateCheck = this.validateTemplateCompliance(data);
            if (!templateCheck.valid) {
                return templateCheck;
            }

            // Return success with any warnings from template validation
            return {
                valid: true,
                warnings: templateCheck.warnings
            };

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
     * Rule 6: Validate template task compliance (Pattern-SPRINT-TEMPLATE-001)
     *
     * DESIGN DECISION: Enforce template tasks at validation time
     * WHY: Prevent skipping required quality tasks that prevent production bugs
     *
     * REASONING CHAIN:
     * 1. Every sprint should include normalized template tasks
     * 2. REQUIRED tasks (13): DOC-*, QA-*, AGENT-*, INFRA-*, CONFIG-*
     * 3. SUGGESTED tasks (4): PERF-*, SEC-*, COMPAT-* (can skip with justification)
     * 4. CONDITIONAL tasks (0-8): PUB-* (if publishing), UX-* (if user-facing)
     * 5. RETROSPECTIVE tasks (2): RETRO-001, RETRO-002
     * 6. Fail fast if required tasks missing
     * 7. Warn if suggested tasks skipped without justification
     *
     * PATTERN: Pattern-SPRINT-TEMPLATE-001 (Sprint Template System)
     */
    private validateTemplateCompliance(data: SprintData): ValidationResult {
        const warnings: string[] = [];

        // Required template task IDs (must be present in every sprint)
        const REQUIRED_TASKS = [
            'DOC-001',  // Update CHANGELOG.md
            'DOC-002',  // Update README.md
            'DOC-003',  // Extract reusable patterns
            'DOC-004',  // Update CLAUDE.md
            'QA-001',   // Run ripple analysis
            'QA-002',   // Verify test coverage
            'QA-003',   // Run dependency audit
            'QA-004',   // Validate TypeScript compilation
            'AGENT-001', // Update agent context files
            'AGENT-002', // Update KNOWN_ISSUES.md
            'INFRA-001', // Verify git hooks
            'INFRA-002', // Run sprint schema validation
            'CONFIG-001' // Validate settings schema
        ];

        // Retrospective tasks (must be present in every sprint)
        const RETROSPECTIVE_TASKS = [
            'RETRO-001',  // Sprint retrospective
            'RETRO-002'   // Extract patterns from learnings
        ];

        // Suggested tasks (can skip with justification)
        const SUGGESTED_TASKS = [
            'PERF-001',   // Performance regression testing
            'SEC-001',    // Security vulnerability scan
            'COMPAT-001', // Cross-platform testing
            'COMPAT-002'  // Backwards compatibility check
        ];

        // Conditional tasks - Publishing (only if sprint is a release)
        const PUBLISHING_TASKS = [
            'PUB-001',  // Pre-publish validation
            'PUB-002',  // Build and verify .vsix package
            'PUB-003',  // Verify no runtime npm dependencies
            'PUB-004',  // Generate release artifacts
            'PUB-005'   // Post-publish verification
        ];

        // Conditional tasks - User Experience (only if user-facing changes)
        const UX_TASKS = [
            'UX-001',  // Create upgrade documentation
            'UX-002',  // Update screenshots and demos
            'UX-003'   // Generate user-facing release notes
        ];

        // Detect conditions from sprint metadata
        const sprintName = (data.meta as any)?.sprint_name || '';
        const isPublishing = this.detectPublishingCondition(sprintName, data);
        const isUserFacing = this.detectUserFacingCondition(sprintName, data);

        // Check required tasks
        for (const taskId of REQUIRED_TASKS) {
            if (!data.tasks[taskId]) {
                return {
                    valid: false,
                    error: `Missing required template task: ${taskId}`,
                    suggestions: [
                        'Template tasks ensure consistent sprint quality',
                        'Add missing task from SPRINT_TEMPLATE.toml',
                        `REQUIRED tasks cannot be skipped (historical bugs prevented)`,
                        'Run: Use sprint-plan skill to auto-inject template tasks'
                    ]
                };
            }
        }

        // Check retrospective tasks
        for (const taskId of RETROSPECTIVE_TASKS) {
            if (!data.tasks[taskId]) {
                return {
                    valid: false,
                    error: `Missing retrospective task: ${taskId}`,
                    suggestions: [
                        'Retrospective tasks are required for every sprint',
                        'Add missing task from SPRINT_TEMPLATE.toml',
                        'RETRO-001: Sprint retrospective (captures learnings)',
                        'RETRO-002: Extract patterns from learnings'
                    ]
                };
            }
        }

        // Check conditional publishing tasks (if publishing sprint)
        if (isPublishing) {
            for (const taskId of PUBLISHING_TASKS) {
                if (!data.tasks[taskId]) {
                    return {
                        valid: false,
                        error: `Publishing sprint missing conditional task: ${taskId}`,
                        suggestions: [
                            'Sprint name indicates publishing/release',
                            'Publishing sprints require PUB-* tasks (historical bug prevention)',
                            'Add missing publishing tasks from SPRINT_TEMPLATE.toml',
                            'These tasks prevent version mismatch, broken releases, npm dep bugs'
                        ]
                    };
                }
            }
        }

        // Check conditional UX tasks (if user-facing changes)
        if (isUserFacing) {
            for (const taskId of UX_TASKS) {
                if (!data.tasks[taskId]) {
                    // UX tasks are softer requirement - warn but don't fail
                    warnings.push(`User-facing sprint should include UX task: ${taskId}`);
                }
            }
        }

        // Check suggested tasks (warnings only)
        const justifications = this.getSuggestedTaskJustifications(data);
        for (const taskId of SUGGESTED_TASKS) {
            if (!data.tasks[taskId]) {
                const hasJustification = justifications.some(j => j.includes(taskId));
                if (!hasJustification) {
                    warnings.push(
                        `SUGGESTED task ${taskId} skipped without justification. ` +
                        `Add justification to [metadata.template_justifications].skipped_suggested`
                    );
                }
            }
        }

        return {
            valid: true,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    }

    /**
     * Detect if sprint is a publishing/release sprint
     */
    private detectPublishingCondition(sprintName: string, data: SprintData): boolean {
        const text = sprintName.toLowerCase();
        return (
            text.includes('publish') ||
            text.includes('release') ||
            text.includes('version bump') ||
            text.includes('deploy') ||
            /v\d+\.\d+/.test(text)  // Matches v1.0, v2.0, etc.
        );
    }

    /**
     * Detect if sprint has user-facing changes
     */
    private detectUserFacingCondition(sprintName: string, data: SprintData): boolean {
        const text = sprintName.toLowerCase();
        const hasUiKeywords = (
            text.includes('ui') ||
            text.includes('ux') ||
            text.includes('user experience') ||
            text.includes('interface') ||
            text.includes('component')
        );

        // Also check if sprint has UI-* or UX-* prefix tasks (indicates UI work)
        const hasUiTasks = Object.keys(data.tasks).some(taskId =>
            taskId.startsWith('UI-') || taskId.startsWith('UX-')
        );

        return hasUiKeywords || hasUiTasks;
    }

    /**
     * Extract justifications for skipped suggested tasks
     */
    private getSuggestedTaskJustifications(data: SprintData): string[] {
        try {
            const metadata = (data as any).metadata;
            if (!metadata) return [];

            const justifications = metadata.template_justifications;
            if (!justifications) return [];

            const skipped = justifications.skipped_suggested;
            if (!skipped || !Array.isArray(skipped)) return [];

            return skipped;
        } catch (error) {
            return [];
        }
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
    if (result.valid && (!result.warnings || result.warnings.length === 0)) {
        return '✅ Sprint TOML validation passed';
    }

    if (result.valid && result.warnings && result.warnings.length > 0) {
        let message = '⚠️  Sprint TOML validation passed with warnings:\n\n';
        for (const warning of result.warnings) {
            message += `  ⚠ ${warning}\n`;
        }
        return message;
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
