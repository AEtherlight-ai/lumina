/**
 * TestValidator - Validate tests exist and pass before task completion
 *
 * DESIGN DECISION: Block task completion if tests missing or failing
 * WHY: Create "ratchet" preventing code without tests from entering codebase
 *
 * REASONING CHAIN:
 * 1. Reddit insight: "TDD creates a ratchet, a floor that constantly moves up"
 * 2. Without enforcement, tests get skipped ("I'll add them later")
 * 3. Subtle breakage appears 4 changes later
 * 4. Validator BLOCKS completion → forces tests BEFORE marking done
 * 5. Requires EXECUTION PROOF (not just file existence)
 * 6. Detects manual script workarounds (must run actual test suite)
 * 7. Result: No code enters codebase without passing tests
 *
 * PATTERN: Pattern-TDD-001 (Test-Driven Development Ratchet)
 * RELATED: MID-012 (TDD Enforcement), TestContextGatherer
 */

import { TestContextGatherer, TestContext } from './TestContextGatherer';
import { TestRequirementGenerator, Task } from './TestRequirementGenerator';

export interface ValidationResult {
    valid: boolean;
    taskId: string;
    errors: string[];
    warnings: string[];
    context?: TestContext;
}

export class TestValidator {
    private contextGatherer: TestContextGatherer;

    constructor(workspaceRoot?: string) {
        this.contextGatherer = new TestContextGatherer(workspaceRoot);
    }

    /**
     * Validate task has complete, passing tests
     *
     * CRITICAL: This method BLOCKS task completion if validation fails
     */
    async validate(task: Task): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check if task needs tests
        if (!TestRequirementGenerator.needsTests(task)) {
            return {
                valid: true,
                taskId: task.id,
                errors: [],
                warnings: ['Task type does not require tests (documentation/pattern)']
            };
        }

        // Generate test requirements
        const requirements = TestRequirementGenerator.generate(task);
        const expectedFiles = requirements.testFiles;

        // Gather test context
        const context = await this.contextGatherer.gather(task.id, expectedFiles);

        // VALIDATION RULE 1: Test files must exist
        if (context.testFilesMissing.length > 0) {
            errors.push(`Missing test files: ${context.testFilesMissing.join(', ')}`);
            errors.push(`Expected: ${expectedFiles.join(', ')}`);
        }

        // VALIDATION RULE 2: Tests must pass (REQUIRES EXECUTION PROOF)
        if (context.testFilesFound.length > 0 && !context.testsPassing) {
            errors.push('Tests exist but are FAILING');
            if (context.testOutput) {
                errors.push(`Test output: ${this.truncateOutput(context.testOutput)}`);
            }
        }

        // VALIDATION RULE 3: Must have execution proof (not just file existence)
        if (context.testFilesFound.length > 0 && !context.testOutput) {
            errors.push('Tests found but no execution proof');
            errors.push('Tests must be run and output captured');
            errors.push('Run: npm test');
        }

        // VALIDATION RULE 4: Detect manual script workarounds
        const hasManualScript = await this.detectManualScriptWorkaround(task, context);
        if (hasManualScript) {
            errors.push('MANUAL SCRIPT DETECTED: Test validation bypassed');
            errors.push('Tests must run through actual test suite (npm test)');
            errors.push('Manual scripts like "console.log" or "node test.js" are not allowed');
        }

        // VALIDATION RULE 5: Coverage requirement (WARNING if not met)
        if (context.coverage && context.coverage.overall < requirements.coverageRequirement) {
            const currentPct = Math.round(context.coverage.overall * 100);
            const requiredPct = Math.round(requirements.coverageRequirement * 100);
            warnings.push(`Coverage ${currentPct}% below target ${requiredPct}%`);
        }

        // Determine validity
        const valid = errors.length === 0;

        return {
            valid,
            taskId: task.id,
            errors,
            warnings,
            context
        };
    }

    /**
     * Validate multiple tasks at once
     */
    async validateBatch(tasks: Task[]): Promise<ValidationResult[]> {
        const results: ValidationResult[] = [];

        for (const task of tasks) {
            const result = await this.validate(task);
            results.push(result);
        }

        return results;
    }

    /**
     * Quick validation (checks file existence only, no execution)
     */
    async validateQuick(task: Task): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!TestRequirementGenerator.needsTests(task)) {
            return {
                valid: true,
                taskId: task.id,
                errors: [],
                warnings: ['Task type does not require tests']
            };
        }

        const requirements = TestRequirementGenerator.generate(task);
        const testFilesFound = await this.contextGatherer['findExistingTests'](requirements.testFiles);

        if (testFilesFound.length === 0) {
            errors.push('No test files found');
        } else if (testFilesFound.length < requirements.testFiles.length) {
            warnings.push(`Only ${testFilesFound.length}/${requirements.testFiles.length} test files found`);
        }

        return {
            valid: errors.length === 0,
            taskId: task.id,
            errors,
            warnings
        };
    }

    /**
     * Detect manual script workarounds (e.g., console.log, node test.js)
     */
    private async detectManualScriptWorkaround(task: Task, context: TestContext): Promise<boolean> {
        if (!context.testOutput) {
            return false; // No output = no workaround detection possible
        }

        const output = context.testOutput.toLowerCase();

        // Check for manual script indicators
        const manualScriptIndicators = [
            'console.log',           // Manual console logging
            'node test.js',          // Direct node execution (not test runner)
            'ts-node test.ts',       // Direct ts-node execution
            'manual validation',     // Explicit manual validation text
            'skipping tests',        // Tests were skipped
            'todo:',                 // TODO tests
            '.skip',                 // describe.skip or it.skip
            'pending tests'          // Jest/Mocha pending tests
        ];

        for (const indicator of manualScriptIndicators) {
            if (output.includes(indicator)) {
                return true; // Manual workaround detected
            }
        }

        // Check if npm test was actually run (should have test runner output)
        const hasTestRunnerOutput =
            output.includes('test suites') ||  // Jest
            output.includes('passing') ||      // Mocha
            output.includes('specs') ||        // Jasmine
            output.includes('tests passed');   // Generic

        if (!hasTestRunnerOutput) {
            return true; // Likely manual script if no test runner output
        }

        return false;
    }

    /**
     * Generate validation report (human-readable)
     */
    static generateReport(result: ValidationResult): string {
        const { valid, taskId, errors, warnings, context } = result;

        let report = `\n=== Test Validation Report: ${taskId} ===\n\n`;

        if (valid) {
            report += '✅ VALIDATION PASSED\n\n';
        } else {
            report += '❌ VALIDATION FAILED\n\n';
        }

        if (context) {
            report += `Status: ${TestContextGatherer.getStatusMessage(context)}\n`;
            report += `Test Files: ${context.testFilesFound.length}/${context.testFilesExpected.length} found\n`;
            report += `Tests Passing: ${context.testsPassing ? 'Yes' : 'No'}\n`;

            if (context.coverage) {
                const pct = Math.round(context.coverage.overall * 100);
                report += `Coverage: ${pct}%\n`;
            }

            report += '\n';
        }

        if (errors.length > 0) {
            report += 'ERRORS:\n';
            for (const error of errors) {
                report += `  ❌ ${error}\n`;
            }
            report += '\n';
        }

        if (warnings.length > 0) {
            report += 'WARNINGS:\n';
            for (const warning of warnings) {
                report += `  ⚠️  ${warning}\n`;
            }
            report += '\n';
        }

        if (!valid) {
            report += 'RESOLUTION:\n';
            report += '  1. Write tests FIRST (Red phase)\n';
            report += '  2. Run tests: npm test (verify they FAIL)\n';
            report += '  3. Implement code (Green phase)\n';
            report += '  4. Run tests: npm test (verify they PASS)\n';
            report += '  5. Refactor if needed (tests still PASS)\n';
            report += '  6. Validate again\n';
        }

        report += '\n=================================\n';

        return report;
    }

    /**
     * Truncate test output for display (keep first/last lines)
     */
    private truncateOutput(output: string, maxLines: number = 20): string {
        const lines = output.split('\n');
        if (lines.length <= maxLines) {
            return output;
        }

        const halfMax = Math.floor(maxLines / 2);
        const firstLines = lines.slice(0, halfMax);
        const lastLines = lines.slice(-halfMax);

        return [
            ...firstLines,
            `... (${lines.length - maxLines} lines omitted) ...`,
            ...lastLines
        ].join('\n');
    }

    /**
     * Get validation status emoji
     */
    static getValidationEmoji(result: ValidationResult): string {
        if (result.valid) {
            return '✅';
        }
        if (result.warnings.length > 0 && result.errors.length === 0) {
            return '⚠️';
        }
        return '❌';
    }
}
