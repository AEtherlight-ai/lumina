#!/usr/bin/env node

/**
 * Completion Documentation Validation - Pre-Commit Hook Script
 *
 * DESIGN DECISION: Enforce completion_notes for completed tasks
 * WHY: Prevent 72% compliance issue (BUG-002A audit finding)
 *
 * REASONING CHAIN:
 * 1. Template v1.4.1 added Section 12 (Post-Completion Documentation)
 * 2. But it's just instructions - Claude can forget
 * 3. ENHANCE-001.2 completed successfully but Sprint TOML not updated
 * 4. Same issue occurred with BUG-002A (3 hours wasted on manual audit)
 * 5. Solution: Pre-commit hook enforces completion_notes field
 * 6. Result: 100% process compliance guaranteed
 *
 * USAGE:
 *   node scripts/validate-completion-documentation.js
 *   OR from .git/hooks/pre-commit:
 *   node scripts/validate-completion-documentation.js || exit 1
 *
 * PATTERN: Pattern-VALIDATION-001 (Comprehensive System Validation)
 * PATTERN: Pattern-TDD-001 (Tests written first - see validate-completion-documentation.test.js)
 * RELATED: VAL-001 (Sprint schema validation), Template v1.4.1 Section 12
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// TOML parser (use same as VS Code extension)
const toml = require('@iarna/toml');

/**
 * Completion Documentation Validator
 *
 * WHY: Validates that all completed tasks have completion_notes
 * REASONING: Prevents documentation gaps that cause 72% compliance
 */
class CompletionDocumentationValidator {
    constructor() {
        this.violations = [];
        this.warnings = [];
        this.stats = {
            totalFiles: 0,
            totalTasks: 0,
            completedTasks: 0,
            tasksWithNotes: 0
        };
    }

    /**
     * Validate sprint TOML file
     *
     * @param {string} filePath - Path to sprint TOML file
     * @returns {boolean} - True if valid, false if violations found
     */
    validateFile(filePath) {
        if (!fs.existsSync(filePath)) {
            // File doesn't exist - skip validation
            return true;
        }

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const data = toml.parse(content);

            this.stats.totalFiles++;

            // Check if tasks section exists
            if (!data.tasks || typeof data.tasks !== 'object') {
                // No tasks section - skip validation
                return true;
            }

            // Validate each task
            for (const [taskId, task] of Object.entries(data.tasks)) {
                this.stats.totalTasks++;

                // Only validate completed tasks
                if (task.status === 'completed') {
                    this.stats.completedTasks++;

                    // Check if completion_notes exists and is non-empty
                    if (!task.completion_notes || task.completion_notes.trim() === '') {
                        this.violations.push({
                            taskId,
                            taskName: task.name || 'Unknown Task',
                            file: filePath
                        });
                    } else {
                        this.stats.tasksWithNotes++;
                    }
                }
            }

            return true;

        } catch (error) {
            // TOML parsing error - warn but don't block commit
            this.warnings.push(`Error parsing ${filePath}: ${error.message}`);
            return true;
        }
    }

    /**
     * Validate all sprint files in directory
     *
     * @param {string} sprintDir - Directory containing sprint TOML files
     */
    validateDirectory(sprintDir) {
        if (!fs.existsSync(sprintDir)) {
            return;
        }

        try {
            const files = fs.readdirSync(sprintDir);

            for (const file of files) {
                if (file.endsWith('.toml')) {
                    const filePath = path.join(sprintDir, file);
                    this.validateFile(filePath);
                }
            }
        } catch (error) {
            this.warnings.push(`Error reading directory ${sprintDir}: ${error.message}`);
        }
    }

    /**
     * Check if validation passed (no violations)
     *
     * @returns {boolean} - True if no violations, false otherwise
     */
    isValid() {
        return this.violations.length === 0;
    }

    /**
     * Generate error message for violations
     *
     * @returns {string} - Formatted error message
     */
    getErrorMessage() {
        if (this.violations.length === 0) {
            return null;
        }

        const lines = [];
        lines.push('\n❌ VALIDATION FAILED: Completed tasks missing completion_notes:\n');

        for (const violation of this.violations) {
            lines.push(`   - ${violation.taskId}: ${violation.taskName}`);
        }

        lines.push('');
        lines.push('💡 TIP: Add completion_notes field after completed_date in Sprint TOML');
        lines.push('');
        lines.push('Example:');
        lines.push('  status = "completed"');
        lines.push('  completed_date = "2025-11-13"');
        lines.push('  completion_notes = """');
        lines.push('  Completed 2025-11-13 by [agent]');
        lines.push('  ');
        lines.push('  Implementation Summary:');
        lines.push('  - Files created: [list files]');
        lines.push('  - Lines written: [count]');
        lines.push('  - Tests: [coverage %]');
        lines.push('  """');
        lines.push('');
        lines.push('🚫 Commit blocked. Add completion_notes and try again.\n');

        return lines.join('\n');
    }

    /**
     * Get validation statistics
     *
     * @returns {object} - Stats object
     */
    getStats() {
        return this.stats;
    }
}

/**
 * Check if sprint files are staged for commit
 *
 * WHY: Only validate if sprint files are being committed
 * REASONING: No point in blocking commit if sprint files haven't changed
 */
function areSprintFilesStaged() {
    try {
        // Get list of staged files
        const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' });

        // Check if any .toml files in sprints directory are staged
        return stagedFiles.split('\n').some(file =>
            file.includes('sprints/') && file.endsWith('.toml')
        );
    } catch (error) {
        // Git command failed - skip validation
        return false;
    }
}

/**
 * Find sprint directories to validate
 *
 * WHY: Support multiple sprint directory locations
 * REASONING: Projects may use internal/sprints/ or sprints/
 */
function findSprintDirectories() {
    const possibleDirs = [
        path.join(process.cwd(), 'internal', 'sprints'),
        path.join(process.cwd(), 'sprints'),
        path.join(process.cwd(), '.aetherlight', 'sprints')
    ];

    return possibleDirs.filter(dir => fs.existsSync(dir));
}

/**
 * Main validation function
 */
function main() {
    console.log('[ÆtherLight] Checking completion documentation...');

    // Check if sprint files are staged
    if (!areSprintFilesStaged()) {
        console.log('[ÆtherLight] No sprint files modified, skipping completion validation');
        process.exit(0);
    }

    // Find sprint directories
    const sprintDirs = findSprintDirectories();
    if (sprintDirs.length === 0) {
        console.log('[ÆtherLight] No sprint directories found, skipping validation');
        process.exit(0);
    }

    // Create validator
    const validator = new CompletionDocumentationValidator();

    // Validate all sprint directories
    for (const sprintDir of sprintDirs) {
        console.log(`[ÆtherLight] Validating: ${sprintDir}`);
        validator.validateDirectory(sprintDir);
    }

    // Show warnings (but don't block)
    if (validator.warnings.length > 0) {
        console.warn('\n⚠️  Warnings:');
        validator.warnings.forEach(warning => {
            console.warn(`  ${warning}`);
        });
        console.warn('');
    }

    // Check if validation passed
    if (!validator.isValid()) {
        // Validation failed - block commit
        console.error(validator.getErrorMessage());
        process.exit(1);
    }

    // Validation passed
    const stats = validator.getStats();
    console.log(`✅ Completion documentation validation passed`);
    console.log(`   Files validated: ${stats.totalFiles}`);
    console.log(`   Completed tasks: ${stats.completedTasks}`);
    console.log(`   Tasks with completion_notes: ${stats.tasksWithNotes}\n`);

    process.exit(0);
}

// Run validation
if (require.main === module) {
    main();
}

// Export for testing
module.exports = { CompletionDocumentationValidator };
