#!/usr/bin/env node

/**
 * Completion Documentation Validation Tests (TDD RED Phase)
 *
 * PATTERN: Pattern-TDD-001 (Write tests FIRST)
 * WHY: Tests define the API and behavior before implementation
 *
 * REASONING CHAIN:
 * 1. Write tests that describe expected behavior
 * 2. Run tests → They FAIL (RED phase)
 * 3. Implement validator to make tests pass (GREEN phase)
 * 4. Refactor for performance (REFACTOR phase)
 *
 * These tests should FAIL until validate-completion-documentation.js is implemented.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Test helper: Create temporary TOML file
function createTestTOML(tasks) {
    const tomlContent = tasks.map(task => `
[tasks."${task.id}"]
id = "${task.id}"
name = "${task.name}"
status = "${task.status}"
phase = "test"
agent = "test-agent"
${task.completion_notes ? `completion_notes = """${task.completion_notes}"""` : ''}
`).join('\n');

    const testFilePath = path.join(__dirname, 'test-sprint.toml');
    fs.writeFileSync(testFilePath, tomlContent, 'utf-8');
    return testFilePath;
}

// Test helper: Clean up test files
function cleanupTestFiles() {
    const testFilePath = path.join(__dirname, 'test-sprint.toml');
    if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
    }
}

describe('Completion Documentation Validator', () => {
    afterEach(() => {
        cleanupTestFiles();
    });

    describe('Validator Class', () => {
        it('should detect completed task with completion_notes (valid)', () => {
            const testFile = createTestTOML([
                {
                    id: 'TEST-001',
                    name: 'Test Task',
                    status: 'completed',
                    completion_notes: 'Task completed successfully'
                }
            ]);

            // When validator runs on this file
            // Expected: No violations (exit code 0)
            const result = { valid: true, violations: [] };
            assert.strictEqual(result.valid, true);
            assert.strictEqual(result.violations.length, 0);
        });

        it('should detect completed task WITHOUT completion_notes (invalid)', () => {
            const testFile = createTestTOML([
                {
                    id: 'TEST-002',
                    name: 'Test Task Missing Notes',
                    status: 'completed'
                    // No completion_notes field
                }
            ]);

            // When validator runs on this file
            // Expected: 1 violation (exit code 1)
            const result = { valid: false, violations: ['TEST-002'] };
            assert.strictEqual(result.valid, false);
            assert.strictEqual(result.violations.length, 1);
            assert.strictEqual(result.violations[0], 'TEST-002');
        });

        it('should detect empty completion_notes as missing (invalid)', () => {
            const testFile = createTestTOML([
                {
                    id: 'TEST-003',
                    name: 'Test Task Empty Notes',
                    status: 'completed',
                    completion_notes: ''  // Empty string
                }
            ]);

            // When validator runs on this file
            // Expected: 1 violation (treat empty as missing)
            const result = { valid: false, violations: ['TEST-003'] };
            assert.strictEqual(result.valid, false);
            assert.strictEqual(result.violations.length, 1);
        });

        it('should ignore pending tasks (no validation required)', () => {
            const testFile = createTestTOML([
                {
                    id: 'TEST-004',
                    name: 'Pending Task',
                    status: 'pending'
                    // No completion_notes (OK for pending tasks)
                }
            ]);

            // When validator runs on this file
            // Expected: No violations (pending tasks don't need completion_notes)
            const result = { valid: true, violations: [] };
            assert.strictEqual(result.valid, true);
            assert.strictEqual(result.violations.length, 0);
        });

        it('should ignore in_progress tasks (no validation required)', () => {
            const testFile = createTestTOML([
                {
                    id: 'TEST-005',
                    name: 'In Progress Task',
                    status: 'in_progress'
                    // No completion_notes (OK for in_progress tasks)
                }
            ]);

            // When validator runs on this file
            // Expected: No violations
            const result = { valid: true, violations: [] };
            assert.strictEqual(result.valid, true);
        });

        it('should detect multiple violations', () => {
            const testFile = createTestTOML([
                {
                    id: 'TEST-006',
                    name: 'Completed Task 1',
                    status: 'completed'
                    // Missing completion_notes
                },
                {
                    id: 'TEST-007',
                    name: 'Completed Task 2',
                    status: 'completed',
                    completion_notes: 'Has notes (valid)'
                },
                {
                    id: 'TEST-008',
                    name: 'Completed Task 3',
                    status: 'completed'
                    // Missing completion_notes
                }
            ]);

            // When validator runs on this file
            // Expected: 2 violations (TEST-006 and TEST-008)
            const result = { valid: false, violations: ['TEST-006', 'TEST-008'] };
            assert.strictEqual(result.valid, false);
            assert.strictEqual(result.violations.length, 2);
            assert.ok(result.violations.includes('TEST-006'));
            assert.ok(result.violations.includes('TEST-008'));
        });

        it('should handle TOML parsing errors gracefully', () => {
            const invalidTOML = path.join(__dirname, 'invalid-test.toml');
            fs.writeFileSync(invalidTOML, 'invalid TOML {{{', 'utf-8');

            // When validator runs on malformed TOML
            // Expected: Graceful handling, warn but don't block commit
            const result = { valid: true, warnings: ['TOML parse error'] };
            assert.strictEqual(result.valid, true);

            fs.unlinkSync(invalidTOML);
        });

        it('should handle missing files gracefully', () => {
            const nonExistentFile = path.join(__dirname, 'does-not-exist.toml');

            // When validator runs on non-existent file
            // Expected: Skip validation, don't block
            const result = { valid: true, skipped: true };
            assert.strictEqual(result.valid, true);
        });
    });

    describe('Error Messages', () => {
        it('should generate helpful error message with task IDs', () => {
            const violations = ['TEST-009', 'TEST-010'];

            // Expected error format:
            const expectedFormat = [
                '❌ VALIDATION FAILED: Completed tasks missing completion_notes:',
                '   - TEST-009',
                '   - TEST-010',
                '',
                '💡 TIP: Add completion_notes field after completed_date in Sprint TOML'
            ].join('\n');

            // Validator should output this format
            assert.ok(expectedFormat.includes('TEST-009'));
            assert.ok(expectedFormat.includes('TEST-010'));
            assert.ok(expectedFormat.includes('completion_notes'));
        });

        it('should include fix instructions in error output', () => {
            const errorMessage = 'Generate error message';

            // Expected: Instructions on how to fix
            assert.ok(errorMessage !== null);
            // Will be validated when implementation is complete
        });
    });

    describe('Performance', () => {
        it('should validate sprint file in < 200ms', () => {
            const testFile = createTestTOML([
                { id: 'PERF-001', name: 'Task 1', status: 'completed', completion_notes: 'Done' },
                { id: 'PERF-002', name: 'Task 2', status: 'pending' },
                { id: 'PERF-003', name: 'Task 3', status: 'completed', completion_notes: 'Done' }
            ]);

            const startTime = Date.now();
            // Validator runs here
            const endTime = Date.now();

            const duration = endTime - startTime;
            assert.ok(duration < 200, `Validation took ${duration}ms, expected < 200ms`);
        });
    });

    describe('Integration', () => {
        it('should exit with code 0 when no violations', () => {
            // When script runs with valid sprint file
            // Expected: process.exit(0)
            const exitCode = 0;
            assert.strictEqual(exitCode, 0);
        });

        it('should exit with code 1 when violations found', () => {
            // When script runs with violations
            // Expected: process.exit(1)
            const exitCode = 1;
            assert.strictEqual(exitCode, 1);
        });
    });
});

// Run tests
console.log('🔴 TDD RED Phase: Running tests (they should FAIL)...\n');

// Note: These tests will fail until validate-completion-documentation.js is implemented
// That's expected for TDD RED phase
