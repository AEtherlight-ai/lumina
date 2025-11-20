#!/usr/bin/env node

/**
 * Sprint TOML Schema Validation - Pre-Commit Hook Script
 *
 * DESIGN DECISION: Validate sprint TOML before git commit
 * WHY: Prevent committing broken sprint files that will break sprint panel for team
 *
 * REASONING CHAIN:
 * 1. Git pre-commit hook calls this script
 * 2. Script checks if ACTIVE_SPRINT.toml is staged
 * 3. If staged -> validate structure
 * 4. If invalid -> block commit, show errors
 * 5. If valid -> allow commit
 * 6. Result: Only valid sprint files reach repository
 *
 * USAGE:
 *   node scripts/validate-sprint-schema.js
 *   OR from .git/hooks/pre-commit:
 *   node scripts/validate-sprint-schema.js || exit 1
 *
 * PATTERN: Pattern-VALIDATION-001 (Comprehensive System Validation)
 * RELATED: SprintSchemaValidator.ts, .git/hooks/pre-commit
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// TOML parser (use same as VS Code extension)
const toml = require('@iarna/toml');

/**
 * Validation result interface
 */
class ValidationResult {
    constructor(valid, error, suggestions) {
        this.valid = valid;
        this.error = error;
        this.suggestions = suggestions || [];
    }
}

/**
 * SprintSchemaValidator (Node.js version)
 * Simplified version of vscode-lumina/src/services/SprintSchemaValidator.ts
 */
class SprintSchemaValidator {
    constructor() {
        this.VALID_STATUSES = ['pending', 'in_progress', 'completed'];
        this.REQUIRED_FIELDS = ['id', 'name', 'status', 'phase', 'agent'];
    }

    validate(tomlContent) {
        try {
            // Rule 0: Check for deprecated {text} placeholder syntax (BUG-001)
            // WHY: {text} conflicts with TOML table headers, causes parse errors
            // FIX: Use <text> instead
            const deprecatedPlaceholders = this.detectDeprecatedPlaceholders(tomlContent);
            if (deprecatedPlaceholders.length > 0) {
                return new ValidationResult(
                    false,
                    `Deprecated {text} placeholder syntax detected (conflicts with TOML table headers)`,
                    [
                        'Replace {text} with <text> in all placeholders',
                        `Found ${deprecatedPlaceholders.length} instances:`,
                        ...deprecatedPlaceholders.slice(0, 3).map(loc => `  Line ${loc.line}: ${loc.text}`),
                        deprecatedPlaceholders.length > 3 ? `  ... and ${deprecatedPlaceholders.length - 3} more` : '',
                        '',
                        'Quick fix: Run migration script:',
                        '  node scripts/migrate-sprint-syntax.js --apply'
                    ].filter(s => s !== '')
                );
            }

            const data = toml.parse(tomlContent);

            // Rule 1: Tasks section exists
            if (!data.tasks || typeof data.tasks !== 'object') {
                return new ValidationResult(
                    false,
                    'No [tasks] section found in sprint file',
                    ['Add tasks using format: [tasks.TASK-ID]']
                );
            }

            // Rule 2: Reject nested [[epic.*.tasks]] format
            if (data.epic) {
                return new ValidationResult(
                    false,
                    'Invalid format: [[epic.*.tasks]] not supported by SprintLoader',
                    [
                        'Use [tasks.ID] format instead',
                        'Example: [tasks.MID-015] NOT [[epic.middleware.tasks]]'
                    ]
                );
            }

            // Rule 3: Validate task fields
            for (const [taskId, task] of Object.entries(data.tasks)) {
                const missing = this.REQUIRED_FIELDS.filter(field => !task[field]);

                if (missing.length > 0) {
                    return new ValidationResult(
                        false,
                        `Task ${taskId} missing required fields: ${missing.join(', ')}`,
                        [`Add missing fields to [tasks.${taskId}]`]
                    );
                }

                // Validate status
                if (!this.VALID_STATUSES.includes(task.status)) {
                    return new ValidationResult(
                        false,
                        `Task ${taskId} has invalid status: "${task.status}"`,
                        [`Valid statuses: ${this.VALID_STATUSES.join(', ')}`]
                    );
                }

                // Validate ID matches key
                if (task.id !== taskId) {
                    return new ValidationResult(
                        false,
                        `Task ${taskId}: id field "${task.id}" doesn't match section key "${taskId}"`,
                        [`Change id = "${task.id}" to id = "${taskId}"`]
                    );
                }
            }

            // Rule 4: Check circular dependencies
            const circular = this.detectCircularDeps(data.tasks);
            if (circular.length > 0) {
                return new ValidationResult(
                    false,
                    `Circular dependency detected: ${circular.join(' -> ')} -> ${circular[0]}`,
                    ['Remove one dependency to break the cycle']
                );
            }

            return new ValidationResult(true);

        } catch (error) {
            return new ValidationResult(
                false,
                `TOML parse error: ${error.message}`,
                [
                    'Check TOML syntax (quotes, brackets, escape sequences)',
                    'Valid escape sequences: \\t, \\n, \\r, \\", \\\\'
                ]
            );
        }
    }

    detectDeprecatedPlaceholders(content) {
        const lines = content.split('\n');
        const locations = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Skip comments
            if (line.trim().startsWith('#')) {
                continue;
            }

            // Detect {text} inside quoted strings only
            // Pattern: Matches {anything} inside double/single/triple quotes
            const inQuotesRegex = /["']([^"']*\{[^}]+\}[^"']*)["']|"""([^"]*\{[^}]+\}[^"]*)"""/g;
            let match;

            while ((match = inQuotesRegex.exec(line)) !== null) {
                const matchedText = match[1] || match[2];
                const placeholders = matchedText.match(/\{[^}]+\}/g);

                if (placeholders) {
                    placeholders.forEach(placeholder => {
                        locations.push({
                            line: i + 1,
                            text: line.trim().substring(0, 80) + (line.length > 80 ? '...' : ''),
                            placeholder: placeholder
                        });
                    });
                }
            }
        }

        return locations;
    }

    detectCircularDeps(tasks) {
        const visited = new Set();
        const stack = new Set();
        const path = [];

        for (const taskId of Object.keys(tasks)) {
            const cycle = this.detectCycle(taskId, tasks, visited, stack, path);
            if (cycle) {
                return cycle;
            }
        }

        return [];
    }

    detectCycle(taskId, tasks, visited, stack, path) {
        if (stack.has(taskId)) {
            const cycleStart = path.indexOf(taskId);
            return path.slice(cycleStart);
        }

        if (visited.has(taskId)) {
            return null;
        }

        visited.add(taskId);
        stack.add(taskId);
        path.push(taskId);

        const task = tasks[taskId];
        if (task && task.dependencies) {
            for (const depId of task.dependencies) {
                if (!tasks[depId]) {
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
}

/**
 * Check if ACTIVE_SPRINT.toml is staged for commit
 */
function isSprintFileStaged() {
    try {
        // Get list of staged files
        const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' });

        // Check if ACTIVE_SPRINT.toml is in staged files
        return stagedFiles.split('\n').some(file => file.includes('ACTIVE_SPRINT.toml'));
    } catch (error) {
        console.error('Error checking staged files:', error.message);
        return false;
    }
}

/**
 * Find ACTIVE_SPRINT.toml file in repository
 */
function findSprintFile() {
    // Common locations to check
    const possiblePaths = [
        path.join(process.cwd(), 'internal', 'sprints', 'ACTIVE_SPRINT.toml'),
        path.join(process.cwd(), 'sprints', 'ACTIVE_SPRINT.toml'),
        path.join(process.cwd(), 'ACTIVE_SPRINT.toml'),
        path.join(process.cwd(), '.aetherlight', 'ACTIVE_SPRINT.toml')
    ];

    for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
            return filePath;
        }
    }

    return null;
}

/**
 * Main validation function
 */
function main() {
    console.log('[ÆtherLight] Checking sprint schema...');

    // Check if sprint file is staged
    if (!isSprintFileStaged()) {
        console.log('[ÆtherLight] ACTIVE_SPRINT.toml not modified, skipping validation');
        process.exit(0);
    }

    // Find sprint file
    const sprintPath = findSprintFile();
    if (!sprintPath) {
        console.log('[ÆtherLight] ACTIVE_SPRINT.toml not found, skipping validation');
        process.exit(0);
    }

    console.log(`[ÆtherLight] Validating: ${sprintPath}`);

    // Read and validate
    try {
        const content = fs.readFileSync(sprintPath, 'utf-8');
        const validator = new SprintSchemaValidator();
        const result = validator.validate(content);

        if (!result.valid) {
            // Validation failed - block commit
            console.error('\n❌ Sprint TOML validation failed:\n');
            console.error(`  ${result.error}\n`);

            if (result.suggestions.length > 0) {
                console.error('💡 Suggestions:');
                result.suggestions.forEach(suggestion => {
                    console.error(`  • ${suggestion}`);
                });
                console.error('');
            }

            console.error('🚫 Commit blocked. Fix validation errors and try again.\n');
            process.exit(1);
        }

        console.log('✅ Sprint TOML validation passed\n');
        process.exit(0);

    } catch (error) {
        console.error(`\n❌ Error reading sprint file: ${error.message}\n`);
        process.exit(1);
    }
}

// Run validation
main();
