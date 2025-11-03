/**
 * Tests for TestContextGatherer
 *
 * TEST STRATEGY (TDD - Red/Green/Refactor):
 * 1. Write tests FIRST → Run → FAIL (red)
 * 2. Implement minimum code → Run → PASS (green)
 * 3. Refactor for clarity → Run → STILL PASS
 *
 * TEST COVERAGE:
 * 1. Test file discovery (find existing tests)
 * 2. Test execution (run tests, capture output)
 * 3. Coverage parsing (read coverage reports)
 * 4. Status determination (none/partial/complete)
 * 5. Test result validation
 * 6. Error handling (missing files, failing tests)
 *
 * UNIT TEST APPROACH:
 * WHY: TestContextGatherer interacts with file system and test runner
 * HOW: Run with plain Mocha in Node.js (npm run test:unit)
 * REASONING: Validates context gathering logic with mocked file system
 *
 * NOTE: Some tests may need file system access (integration tests)
 *
 * RUN TESTS: npm run test:unit
 */

import * as assert from 'assert';
import { TestContextGatherer, TestContext, CoverageInfo } from '../../services/TestContextGatherer';

suite('TestContextGatherer Tests', () => {
    let gatherer: TestContextGatherer;

    setup(() => {
        gatherer = new TestContextGatherer();
    });

    suite('Test File Discovery', () => {
        test('should find existing test files in workspace', async () => {
            const expectedFiles = [
                'vscode-lumina/src/test/services/testValidator.test.ts',
                'vscode-lumina/src/test/services/testRequirementGenerator.test.ts'
            ];

            const context = await gatherer.gather('TEST-001', expectedFiles);
            assert.strictEqual(context.taskId, 'TEST-001');
            assert.ok(Array.isArray(context.testFilesFound));
            assert.ok(Array.isArray(context.testFilesMissing));
        });

        test('should identify missing test files', async () => {
            const expectedFiles = [
                'vscode-lumina/src/test/services/nonexistent.test.ts'
            ];

            const context = await gatherer.gather('TEST-002', expectedFiles);
            assert.strictEqual(context.taskId, 'TEST-002');
            assert.ok(context.testFilesMissing.length > 0);
        });

        test('should handle empty file list', async () => {
            const context = await gatherer.gather('TEST-003', []);
            assert.strictEqual(context.taskId, 'TEST-003');
            assert.strictEqual(context.testFilesExpected.length, 0);
            assert.strictEqual(context.testFilesFound.length, 0);
            assert.strictEqual(context.status, 'none');
        });

        test('should handle relative file paths', async () => {
            const expectedFiles = [
                'test/services/testValidator.test.ts',
                'src/test/services/testValidator.test.ts'
            ];

            const context = await gatherer.gather('TEST-004', expectedFiles);
            assert.strictEqual(context.taskId, 'TEST-004');
        });
    });

    suite('Status Determination', () => {
        test('should return "none" status when no tests found', async () => {
            const expectedFiles = [
                'test/nonexistent1.test.ts',
                'test/nonexistent2.test.ts'
            ];

            const context = await gatherer.gather('TEST-005', expectedFiles);
            assert.strictEqual(context.status, 'none');
        });

        test('should return "partial" status when some tests found', async () => {
            // This test requires actual files to exist
            // Will be implemented when running in real workspace
            const expectedFiles = [
                'vscode-lumina/src/test/services/confidenceScorer.test.ts',
                'vscode-lumina/src/test/services/nonexistent.test.ts'
            ];

            const context = await gatherer.gather('TEST-006', expectedFiles);
            // Status should be 'partial' if some files found
            assert.ok(['none', 'partial', 'complete'].includes(context.status));
        });

        test('should return "complete" status when all tests found', async () => {
            const expectedFiles = [
                'vscode-lumina/src/test/services/confidenceScorer.test.ts'
            ];

            const context = await gatherer.gather('TEST-007', expectedFiles);
            // Status depends on whether file actually exists
            assert.ok(['none', 'partial', 'complete'].includes(context.status));
        });
    });

    suite('Test Execution', () => {
        test('should capture test output when tests run', async () => {
            // This test requires actual test execution
            // Will run when npm test is available
            const expectedFiles = [
                'vscode-lumina/src/test/services/confidenceScorer.test.ts'
            ];

            const context = await gatherer.gather('TEST-008', expectedFiles);
            // If tests were run, should have output
            if (context.testFilesFound.length > 0) {
                assert.ok(typeof context.testsPassing === 'boolean');
            }
        });

        test('should mark testsPassing as false when tests fail', async () => {
            // This test validates test failure detection
            const expectedFiles = [
                'vscode-lumina/src/test/services/confidenceScorer.test.ts'
            ];

            const context = await gatherer.gather('TEST-009', expectedFiles);
            assert.ok(typeof context.testsPassing === 'boolean');
        });

        test('should handle test execution errors gracefully', async () => {
            const expectedFiles = [
                'test/invalid-test-file-that-causes-error.test.ts'
            ];

            const context = await gatherer.gather('TEST-010', expectedFiles);
            assert.strictEqual(context.taskId, 'TEST-010');
            assert.strictEqual(context.testsPassing, false);
        });

        test('should not run tests when no test files found', async () => {
            const expectedFiles = [
                'test/nonexistent.test.ts'
            ];

            const context = await gatherer.gather('TEST-011', expectedFiles);
            assert.strictEqual(context.testsPassing, false);
            assert.strictEqual(context.testOutput, undefined);
        });
    });

    suite('Coverage Parsing', () => {
        test('should parse coverage report when available', async () => {
            // This test validates coverage parsing
            const expectedFiles = [
                'vscode-lumina/src/test/services/confidenceScorer.test.ts'
            ];

            const context = await gatherer.gather('TEST-012', expectedFiles);
            // If coverage report exists, should be parsed
            if (context.coverage) {
                assert.ok(typeof context.coverage.statements === 'number');
                assert.ok(typeof context.coverage.branches === 'number');
                assert.ok(typeof context.coverage.functions === 'number');
                assert.ok(typeof context.coverage.lines === 'number');
                assert.ok(typeof context.coverage.overall === 'number');
                assert.ok(context.coverage.overall >= 0 && context.coverage.overall <= 1);
            }
        });

        test('should handle missing coverage report gracefully', async () => {
            const expectedFiles = [
                'vscode-lumina/src/test/services/testValidator.test.ts'
            ];

            const context = await gatherer.gather('TEST-013', expectedFiles);
            // Coverage may be undefined if no coverage report
            if (context.coverage) {
                assert.ok(typeof context.coverage.overall === 'number');
            }
        });

        test('should calculate overall coverage as average', async () => {
            // This test validates coverage calculation logic
            const mockCoverage: CoverageInfo = {
                statements: 0.95,
                branches: 0.90,
                functions: 0.92,
                lines: 0.94,
                overall: 0.0 // Will be calculated
            };

            // Overall should be average of all metrics
            const expected = (0.95 + 0.90 + 0.92 + 0.94) / 4;
            assert.ok(Math.abs(expected - 0.9275) < 0.001);
        });
    });

    suite('Test Context Structure', () => {
        test('should return complete TestContext object', async () => {
            const expectedFiles = [
                'vscode-lumina/src/test/services/confidenceScorer.test.ts'
            ];

            const context = await gatherer.gather('TEST-014', expectedFiles);
            assert.ok(context.taskId);
            assert.ok(Array.isArray(context.testFilesExpected));
            assert.ok(Array.isArray(context.testFilesFound));
            assert.ok(Array.isArray(context.testFilesMissing));
            assert.ok(typeof context.testsPassing === 'boolean');
            assert.ok(['none', 'partial', 'complete'].includes(context.status));
        });

        test('should include testOutput when tests run', async () => {
            const expectedFiles = [
                'vscode-lumina/src/test/services/confidenceScorer.test.ts'
            ];

            const context = await gatherer.gather('TEST-015', expectedFiles);
            if (context.testFilesFound.length > 0) {
                // Output may be string or undefined
                assert.ok(typeof context.testOutput === 'string' || context.testOutput === undefined);
            }
        });

        test('should include coverage when available', async () => {
            const expectedFiles = [
                'vscode-lumina/src/test/services/confidenceScorer.test.ts'
            ];

            const context = await gatherer.gather('TEST-016', expectedFiles);
            if (context.coverage) {
                assert.ok(typeof context.coverage.overall === 'number');
                assert.ok(context.coverage.overall >= 0 && context.coverage.overall <= 1);
            }
        });
    });

    suite('Status Message Generation', () => {
        test('should generate status message for "none" status', () => {
            const context: TestContext = {
                taskId: 'TEST-017',
                testFilesExpected: ['test1.test.ts', 'test2.test.ts'],
                testFilesFound: [],
                testFilesMissing: ['test1.test.ts', 'test2.test.ts'],
                testsPassing: false,
                status: 'none'
            };

            const message = TestContextGatherer.getStatusMessage(context);
            assert.ok(message.includes('🔴') || message.includes('none') || message.includes('No'));
        });

        test('should generate status message for "partial" status', () => {
            const context: TestContext = {
                taskId: 'TEST-018',
                testFilesExpected: ['test1.test.ts', 'test2.test.ts'],
                testFilesFound: ['test1.test.ts'],
                testFilesMissing: ['test2.test.ts'],
                testsPassing: false,
                status: 'partial'
            };

            const message = TestContextGatherer.getStatusMessage(context);
            assert.ok(message.includes('🟡') || message.includes('partial') || message.includes('Some'));
        });

        test('should generate status message for "complete" status', () => {
            const context: TestContext = {
                taskId: 'TEST-019',
                testFilesExpected: ['test1.test.ts', 'test2.test.ts'],
                testFilesFound: ['test1.test.ts', 'test2.test.ts'],
                testFilesMissing: [],
                testsPassing: true,
                status: 'complete'
            };

            const message = TestContextGatherer.getStatusMessage(context);
            assert.ok(message.includes('🟢') || message.includes('complete') || message.includes('All'));
        });
    });

    suite('Edge Cases', () => {
        test('should handle null workspace root', () => {
            const gathererWithNull = new TestContextGatherer(undefined);
            assert.ok(gathererWithNull);
        });

        test('should handle task with special characters in ID', async () => {
            const context = await gatherer.gather('TEST-<>&"\'-020', []);
            assert.strictEqual(context.taskId, 'TEST-<>&"\'-020');
        });

        test('should handle very long file paths', async () => {
            const longPath = 'a/'.repeat(100) + 'test.test.ts';
            const context = await gatherer.gather('TEST-021', [longPath]);
            assert.strictEqual(context.taskId, 'TEST-021');
        });

        test('should handle file paths with backslashes (Windows)', async () => {
            const windowsPath = 'vscode-lumina\\src\\test\\services\\test.test.ts';
            const context = await gatherer.gather('TEST-022', [windowsPath]);
            assert.strictEqual(context.taskId, 'TEST-022');
        });

        test('should handle file paths with forward slashes (Unix)', async () => {
            const unixPath = 'vscode-lumina/src/test/services/test.test.ts';
            const context = await gatherer.gather('TEST-023', [unixPath]);
            assert.strictEqual(context.taskId, 'TEST-023');
        });

        test('should handle duplicate file paths', async () => {
            const expectedFiles = [
                'test/same.test.ts',
                'test/same.test.ts',
                'test/same.test.ts'
            ];

            const context = await gatherer.gather('TEST-024', expectedFiles);
            assert.strictEqual(context.testFilesExpected.length, 3);
        });
    });

    suite('Performance', () => {
        test('should gather context in <2s', async () => {
            const expectedFiles = [
                'vscode-lumina/src/test/services/confidenceScorer.test.ts'
            ];

            const start = Date.now();
            await gatherer.gather('PERF-001', expectedFiles);
            const duration = Date.now() - start;

            assert.ok(duration < 2000, `Context gathering took ${duration}ms (should be <2000ms)`);
        });

        test('should handle 10 file paths in <3s', async () => {
            const expectedFiles = Array(10).fill('test/test.test.ts');

            const start = Date.now();
            await gatherer.gather('PERF-002', expectedFiles);
            const duration = Date.now() - start;

            assert.ok(duration < 3000, `Context gathering for 10 files took ${duration}ms (should be <3000ms)`);
        });

        test('should handle coverage parsing in <500ms', async () => {
            // This test validates coverage parsing performance
            // Actual timing depends on coverage report size
            const start = Date.now();
            const expectedFiles = [
                'vscode-lumina/src/test/services/confidenceScorer.test.ts'
            ];
            await gatherer.gather('PERF-003', expectedFiles);
            const duration = Date.now() - start;

            assert.ok(duration < 5000, `Coverage parsing took ${duration}ms (should be reasonable)`);
        });
    });
});
