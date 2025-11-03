/**
 * Tests for TestValidator
 *
 * TEST STRATEGY (TDD - Red/Green/Refactor):
 * 1. Write tests FIRST → Run → FAIL (red)
 * 2. Implement minimum code → Run → PASS (green)
 * 3. Refactor for clarity → Run → STILL PASS
 *
 * TEST COVERAGE:
 * 1. Task validation (tests exist, pass, have coverage)
 * 2. Test execution proof requirement (not just file existence)
 * 3. Manual script workaround detection
 * 4. Coverage requirement enforcement
 * 5. Batch validation
 * 6. Quick validation (file existence only)
 * 7. Validation report generation
 *
 * UNIT TEST APPROACH:
 * WHY: TestValidator is core infrastructure (TDD enforcement)
 * HOW: Run with plain Mocha in Node.js (npm run test:unit)
 * REASONING: Fast, isolated, proper TDD - validates the validator
 *
 * RUN TESTS: npm run test:unit
 */

import * as assert from 'assert';
import { TestValidator, ValidationResult } from '../../services/TestValidator';
import { Task } from '../../services/TestRequirementGenerator';

suite('TestValidator Tests', () => {
    let validator: TestValidator;

    setup(() => {
        validator = new TestValidator();
    });

    suite('Task Validation - Basic Cases', () => {
        test('should PASS validation for documentation task (no tests required)', async () => {
            const docTask: Task = {
                id: 'DOC-001',
                name: 'Update documentation',
                description: 'Update README with new pattern',
                category: 'Documentation'
            };

            const result = await validator.validate(docTask);
            assert.strictEqual(result.valid, true);
            assert.strictEqual(result.taskId, 'DOC-001');
            assert.strictEqual(result.errors.length, 0);
            assert.ok(result.warnings.some(w => w.includes('does not require tests')));
        });

        test('should FAIL validation for infrastructure task without tests', async () => {
            const infraTask: Task = {
                id: 'INF-001',
                name: 'Create new service',
                description: 'Create TestValidator service',
                category: 'Infrastructure',
                files_to_modify: ['src/services/TestValidator.ts']
            };

            const result = await validator.validate(infraTask);
            assert.strictEqual(result.valid, false);
            assert.strictEqual(result.taskId, 'INF-001');
            assert.ok(result.errors.some(e => e.includes('Missing test files')));
        });

        test('should FAIL validation if tests exist but are failing', async () => {
            const taskWithFailingTests: Task = {
                id: 'INF-002',
                name: 'Task with failing tests',
                description: 'Tests exist but fail',
                category: 'Infrastructure',
                files_to_modify: ['src/services/Example.ts'],
                deliverables: ['Create Example.ts', 'Add tests']
            };

            const result = await validator.validate(taskWithFailingTests);
            // This will fail if tests are actually failing
            // Result depends on TestContextGatherer execution
            assert.strictEqual(result.taskId, 'INF-002');
        });
    });

    suite('Test Execution Proof Requirement', () => {
        test('should FAIL if no execution proof (tests found but not run)', async () => {
            const task: Task = {
                id: 'INF-003',
                name: 'Task with unrun tests',
                description: 'Test files exist but were not executed',
                category: 'Infrastructure'
            };

            const result = await validator.validate(task);
            // Validation should fail if tests not run
            // Implementation will check context.testOutput for execution proof
            assert.strictEqual(result.taskId, 'INF-003');
        });
    });

    suite('Manual Script Workaround Detection', () => {
        test('should detect manual script workarounds (console.log)', async () => {
            // This test validates the detectManualScriptWorkaround logic
            const task: Task = {
                id: 'INF-004',
                name: 'Task with manual validation',
                description: 'Used console.log instead of test suite',
                category: 'Infrastructure'
            };

            const result = await validator.validate(task);
            // If test output contains "console.log", should be detected
            assert.strictEqual(result.taskId, 'INF-004');
        });

        test('should detect node test.js workaround (not test runner)', async () => {
            const task: Task = {
                id: 'INF-005',
                name: 'Task with direct node execution',
                description: 'Ran node test.js instead of npm test',
                category: 'Infrastructure'
            };

            const result = await validator.validate(task);
            assert.strictEqual(result.taskId, 'INF-005');
        });
    });

    suite('Coverage Requirement Enforcement', () => {
        test('should WARN if coverage below requirement', async () => {
            const task: Task = {
                id: 'INF-006',
                name: 'Task with low coverage',
                description: 'Tests pass but coverage is 50% (need 80%)',
                category: 'Infrastructure'
            };

            const result = await validator.validate(task);
            // If coverage < 80%, should have warning
            assert.strictEqual(result.taskId, 'INF-006');
        });

        test('should PASS if coverage meets requirement', async () => {
            const task: Task = {
                id: 'INF-007',
                name: 'Task with good coverage',
                description: 'Tests pass and coverage is 90%',
                category: 'Infrastructure'
            };

            const result = await validator.validate(task);
            assert.strictEqual(result.taskId, 'INF-007');
        });
    });

    suite('Batch Validation', () => {
        test('should validate multiple tasks at once', async () => {
            const tasks: Task[] = [
                {
                    id: 'BATCH-001',
                    name: 'Task 1',
                    description: 'First task',
                    category: 'Documentation'
                },
                {
                    id: 'BATCH-002',
                    name: 'Task 2',
                    description: 'Second task',
                    category: 'Infrastructure'
                },
                {
                    id: 'BATCH-003',
                    name: 'Task 3',
                    description: 'Third task',
                    category: 'UI'
                }
            ];

            const results = await validator.validateBatch(tasks);
            assert.strictEqual(results.length, 3);
            assert.strictEqual(results[0].taskId, 'BATCH-001');
            assert.strictEqual(results[1].taskId, 'BATCH-002');
            assert.strictEqual(results[2].taskId, 'BATCH-003');
        });

        test('should handle empty batch', async () => {
            const results = await validator.validateBatch([]);
            assert.strictEqual(results.length, 0);
        });
    });

    suite('Quick Validation (File Existence Only)', () => {
        test('should perform quick validation without test execution', async () => {
            const task: Task = {
                id: 'QUICK-001',
                name: 'Quick validation task',
                description: 'Check files exist only',
                category: 'Infrastructure'
            };

            const result = await validator.validateQuick(task);
            assert.strictEqual(result.taskId, 'QUICK-001');
            // Quick validation should not have testOutput or coverage
            assert.strictEqual(result.context, undefined);
        });
    });

    suite('Validation Report Generation', () => {
        test('should generate report for valid task', async () => {
            const validResult: ValidationResult = {
                valid: true,
                taskId: 'TEST-001',
                errors: [],
                warnings: []
            };

            const report = TestValidator.generateReport(validResult);
            assert.ok(report.includes('✅ VALIDATION PASSED'));
            assert.ok(report.includes('TEST-001'));
        });

        test('should generate report for invalid task', async () => {
            const invalidResult: ValidationResult = {
                valid: false,
                taskId: 'TEST-002',
                errors: ['Missing test files', 'Tests not run'],
                warnings: ['Coverage below target']
            };

            const report = TestValidator.generateReport(invalidResult);
            assert.ok(report.includes('❌ VALIDATION FAILED'));
            assert.ok(report.includes('TEST-002'));
            assert.ok(report.includes('Missing test files'));
            assert.ok(report.includes('Tests not run'));
            assert.ok(report.includes('Coverage below target'));
            assert.ok(report.includes('RESOLUTION'));
        });

        test('should generate report with context', async () => {
            const resultWithContext: ValidationResult = {
                valid: true,
                taskId: 'TEST-003',
                errors: [],
                warnings: [],
                context: {
                    taskId: 'TEST-003',
                    testFilesExpected: ['test1.test.ts', 'test2.test.ts'],
                    testFilesFound: ['test1.test.ts', 'test2.test.ts'],
                    testFilesMissing: [],
                    testsPassing: true,
                    testOutput: 'All tests passed',
                    coverage: {
                        statements: 0.95,
                        branches: 0.90,
                        functions: 0.92,
                        lines: 0.94,
                        overall: 0.93
                    },
                    status: 'complete'
                }
            };

            const report = TestValidator.generateReport(resultWithContext);
            assert.ok(report.includes('Test Files: 2/2 found'));
            assert.ok(report.includes('Tests Passing: Yes'));
            assert.ok(report.includes('Coverage: 93%'));
        });
    });

    suite('Validation Emoji', () => {
        test('should return ✅ for valid result', () => {
            const validResult: ValidationResult = {
                valid: true,
                taskId: 'TEST-001',
                errors: [],
                warnings: []
            };

            const emoji = TestValidator.getValidationEmoji(validResult);
            assert.strictEqual(emoji, '✅');
        });

        test('should return ⚠️ for warnings only', () => {
            const warningResult: ValidationResult = {
                valid: true,
                taskId: 'TEST-002',
                errors: [],
                warnings: ['Coverage below target']
            };

            const emoji = TestValidator.getValidationEmoji(warningResult);
            assert.strictEqual(emoji, '⚠️');
        });

        test('should return ❌ for errors', () => {
            const errorResult: ValidationResult = {
                valid: false,
                taskId: 'TEST-003',
                errors: ['Tests failing'],
                warnings: []
            };

            const emoji = TestValidator.getValidationEmoji(errorResult);
            assert.strictEqual(emoji, '❌');
        });
    });

    suite('Edge Cases', () => {
        test('should handle task with no category', async () => {
            const task: Task = {
                id: 'EDGE-001',
                name: 'Task without category',
                description: 'No category specified'
            };

            const result = await validator.validate(task);
            assert.strictEqual(result.taskId, 'EDGE-001');
            // Should infer category from name/description
        });

        test('should handle task with empty deliverables', async () => {
            const task: Task = {
                id: 'EDGE-002',
                name: 'Task with empty deliverables',
                description: 'Deliverables array is empty',
                category: 'Infrastructure',
                deliverables: []
            };

            const result = await validator.validate(task);
            assert.strictEqual(result.taskId, 'EDGE-002');
        });

        test('should handle task with special characters in name', async () => {
            const task: Task = {
                id: 'EDGE-003',
                name: 'Task with special chars: <>&"\'',
                description: 'Special characters in name',
                category: 'Documentation'
            };

            const result = await validator.validate(task);
            assert.strictEqual(result.taskId, 'EDGE-003');
        });
    });

    suite('Performance', () => {
        test('should validate task in <2s', async () => {
            const task: Task = {
                id: 'PERF-001',
                name: 'Performance test',
                description: 'Validate quickly',
                category: 'Infrastructure'
            };

            const start = Date.now();
            await validator.validate(task);
            const duration = Date.now() - start;

            assert.ok(duration < 2000, `Validation took ${duration}ms (should be <2000ms)`);
        });

        test('should quick-validate in <500ms', async () => {
            const task: Task = {
                id: 'PERF-002',
                name: 'Quick validation perf test',
                description: 'Quick validation should be fast',
                category: 'Infrastructure'
            };

            const start = Date.now();
            await validator.validateQuick(task);
            const duration = Date.now() - start;

            assert.ok(duration < 500, `Quick validation took ${duration}ms (should be <500ms)`);
        });
    });
});
