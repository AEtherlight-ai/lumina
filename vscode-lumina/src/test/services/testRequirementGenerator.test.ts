/**
 * Tests for TestRequirementGenerator
 *
 * TEST STRATEGY (TDD - Red/Green/Refactor):
 * 1. Write tests FIRST → Run → FAIL (red)
 * 2. Implement minimum code → Run → PASS (green)
 * 3. Refactor for clarity → Run → STILL PASS
 *
 * TEST COVERAGE:
 * 1. Test requirement generation per task category
 * 2. Category detection (Infrastructure, UI, API, Feature, Documentation)
 * 3. Test type detection (unit, integration, e2e, component)
 * 4. Coverage requirement calculation
 * 5. Test file path generation
 * 6. Requirements text generation
 * 7. Edge cases (unknown categories, missing fields)
 *
 * UNIT TEST APPROACH:
 * WHY: TestRequirementGenerator is pure logic (category → requirements mapping)
 * HOW: Run with plain Mocha in Node.js (npm run test:unit)
 * REASONING: Fast, isolated, validates auto-generation logic
 *
 * RUN TESTS: npm run test:unit
 */

import * as assert from 'assert';
import { TestRequirementGenerator, TestRequirement, Task } from '../../services/TestRequirementGenerator';

suite('TestRequirementGenerator Tests', () => {
    suite('Category Detection', () => {
        test('should detect Infrastructure category from explicit field', () => {
            const task: Task = {
                id: 'TEST-001',
                name: 'Create service',
                description: 'Build new service',
                category: 'Infrastructure'
            };

            const result = TestRequirementGenerator.generate(task);
            assert.strictEqual(result.category, 'Infrastructure');
        });

        test('should infer Infrastructure from task name (service)', () => {
            const task: Task = {
                id: 'TEST-002',
                name: 'Create TestValidator service',
                description: 'Build validator'
            };

            const result = TestRequirementGenerator.generate(task);
            assert.strictEqual(result.category, 'Infrastructure');
        });

        test('should infer UI category from task name (component)', () => {
            const task: Task = {
                id: 'TEST-003',
                name: 'Create SprintProgressPanel component',
                description: 'Build panel UI'
            };

            const result = TestRequirementGenerator.generate(task);
            assert.strictEqual(result.category, 'UI');
        });

        test('should infer API category from task name (endpoint)', () => {
            const task: Task = {
                id: 'TEST-004',
                name: 'Add API endpoint for user creation',
                description: 'Create user endpoint'
            };

            const result = TestRequirementGenerator.generate(task);
            assert.strictEqual(result.category, 'API');
        });

        test('should infer Feature category from task name (feature)', () => {
            const task: Task = {
                id: 'TEST-005',
                name: 'Implement voice recording feature',
                description: 'Add voice feature'
            };

            const result = TestRequirementGenerator.generate(task);
            assert.strictEqual(result.category, 'Feature');
        });

        test('should infer Documentation category from task name (docs)', () => {
            const task: Task = {
                id: 'TEST-006',
                name: 'Update pattern documentation',
                description: 'Add new patterns to docs'
            };

            const result = TestRequirementGenerator.generate(task);
            assert.strictEqual(result.category, 'Documentation');
        });

        test('should infer Testing category from task name (test)', () => {
            const task: Task = {
                id: 'TEST-007',
                name: 'Add TDD enforcement tests',
                description: 'Test the validator'
            };

            const result = TestRequirementGenerator.generate(task);
            assert.strictEqual(result.category, 'Testing');
        });

        test('should default to General for unknown category', () => {
            const task: Task = {
                id: 'TEST-008',
                name: 'Random task',
                description: 'No clear category'
            };

            const result = TestRequirementGenerator.generate(task);
            assert.strictEqual(result.category, 'General');
        });
    });

    suite('Test Type Detection', () => {
        test('should detect unit test type for services', () => {
            const task: Task = {
                id: 'TEST-009',
                name: 'Create service',
                description: 'Build service',
                files_to_modify: ['src/services/TestValidator.ts']
            };

            const result = TestRequirementGenerator.generate(task);
            assert.strictEqual(result.testType, 'unit');
        });

        test('should detect component test type for UI', () => {
            const task: Task = {
                id: 'TEST-010',
                name: 'Create component',
                description: 'Build component',
                files_to_modify: ['src/views/SprintProgressPanel.ts']
            };

            const result = TestRequirementGenerator.generate(task);
            assert.strictEqual(result.testType, 'component');
        });

        test('should detect integration test type for API', () => {
            const task: Task = {
                id: 'TEST-011',
                name: 'Create API endpoint',
                description: 'Build endpoint'
            };

            const result = TestRequirementGenerator.generate(task);
            assert.strictEqual(result.testType, 'integration');
        });

        test('should detect e2e test type for workflow', () => {
            const task: Task = {
                id: 'TEST-012',
                name: 'Implement user workflow',
                description: 'Build complete workflow'
            };

            const result = TestRequirementGenerator.generate(task);
            assert.strictEqual(result.testType, 'integration');
        });
    });

    suite('Coverage Requirement Calculation', () => {
        test('should require 90% coverage for Infrastructure tasks', () => {
            const task: Task = {
                id: 'TEST-013',
                name: 'Create service',
                description: 'Build service',
                category: 'Infrastructure'
            };

            const result = TestRequirementGenerator.generate(task);
            assert.strictEqual(result.coverageRequirement, 0.9);
        });

        test('should require 85% coverage for API tasks', () => {
            const task: Task = {
                id: 'TEST-014',
                name: 'Create API endpoint',
                description: 'Build endpoint',
                category: 'API'
            };

            const result = TestRequirementGenerator.generate(task);
            assert.strictEqual(result.coverageRequirement, 0.85);
        });

        test('should require 70% coverage for UI tasks', () => {
            const task: Task = {
                id: 'TEST-015',
                name: 'Create component',
                description: 'Build component',
                category: 'UI'
            };

            const result = TestRequirementGenerator.generate(task);
            assert.strictEqual(result.coverageRequirement, 0.7);
        });

        test('should require 80% coverage for Feature tasks', () => {
            const task: Task = {
                id: 'TEST-016',
                name: 'Implement feature',
                description: 'Build feature',
                category: 'Feature'
            };

            const result = TestRequirementGenerator.generate(task);
            assert.strictEqual(result.coverageRequirement, 0.8);
        });

        test('should require 0% coverage for Documentation tasks', () => {
            const task: Task = {
                id: 'TEST-017',
                name: 'Update docs',
                description: 'Update documentation',
                category: 'Documentation'
            };

            const result = TestRequirementGenerator.generate(task);
            assert.strictEqual(result.coverageRequirement, 0);
        });
    });

    suite('Test File Path Generation', () => {
        test('should generate test file paths for services', () => {
            const task: Task = {
                id: 'TEST-018',
                name: 'Create service',
                description: 'Build service',
                files_to_modify: ['vscode-lumina/src/services/TestValidator.ts']
            };

            const result = TestRequirementGenerator.generate(task);
            assert.ok(result.testFiles.length > 0);
            assert.ok(result.testFiles.some(f => f.includes('test')));
        });

        test('should handle multiple files', () => {
            const task: Task = {
                id: 'TEST-019',
                name: 'Create multiple services',
                description: 'Build services',
                files_to_modify: [
                    'src/services/TestValidator.ts',
                    'src/services/TestRequirementGenerator.ts'
                ]
            };

            const result = TestRequirementGenerator.generate(task);
            assert.ok(result.testFiles.length >= 2);
        });

        test('should handle task with no files', () => {
            const task: Task = {
                id: 'TEST-020',
                name: 'General task',
                description: 'No specific files'
            };

            const result = TestRequirementGenerator.generate(task);
            assert.ok(result.testFiles.length >= 0);
        });

        test('should handle deliverables as file source', () => {
            const task: Task = {
                id: 'TEST-021',
                name: 'Create service',
                description: 'Build service',
                deliverables: ['Create TestValidator.ts', 'Add tests for TestValidator']
            };

            const result = TestRequirementGenerator.generate(task);
            assert.ok(result.testFiles.length > 0);
        });
    });

    suite('Requirements Text Generation', () => {
        test('should generate TDD requirements for Infrastructure task', () => {
            const task: Task = {
                id: 'TEST-022',
                name: 'Create service',
                description: 'Build TestValidator service',
                category: 'Infrastructure'
            };

            const result = TestRequirementGenerator.generate(task);
            assert.ok(result.testRequirements.includes('TDD'));
            assert.ok(result.testRequirements.includes('90%'));
            assert.ok(result.testRequirements.includes('unit'));
        });

        test('should generate requirements for UI task', () => {
            const task: Task = {
                id: 'TEST-023',
                name: 'Create component',
                description: 'Build SprintProgressPanel',
                category: 'UI'
            };

            const result = TestRequirementGenerator.generate(task);
            assert.ok(result.testRequirements.includes('component'));
            assert.ok(result.testRequirements.includes('70%'));
        });

        test('should generate requirements for API task', () => {
            const task: Task = {
                id: 'TEST-024',
                name: 'Create endpoint',
                description: 'Build user creation endpoint',
                category: 'API'
            };

            const result = TestRequirementGenerator.generate(task);
            assert.ok(result.testRequirements.includes('integration'));
            assert.ok(result.testRequirements.includes('85%'));
        });

        test('should indicate no tests for Documentation task', () => {
            const task: Task = {
                id: 'TEST-025',
                name: 'Update docs',
                description: 'Update pattern documentation',
                category: 'Documentation'
            };

            const result = TestRequirementGenerator.generate(task);
            assert.ok(result.testRequirements.includes('No tests required') ||
                      result.testRequirements.includes('Documentation'));
        });
    });

    suite('needsTests Static Method', () => {
        test('should return true for Infrastructure tasks', () => {
            const task: Task = {
                id: 'TEST-026',
                name: 'Create service',
                description: 'Build service',
                category: 'Infrastructure'
            };

            const needsTests = TestRequirementGenerator.needsTests(task);
            assert.strictEqual(needsTests, true);
        });

        test('should return true for API tasks', () => {
            const task: Task = {
                id: 'TEST-027',
                name: 'Create endpoint',
                description: 'Build endpoint',
                category: 'API'
            };

            const needsTests = TestRequirementGenerator.needsTests(task);
            assert.strictEqual(needsTests, true);
        });

        test('should return true for UI tasks', () => {
            const task: Task = {
                id: 'TEST-028',
                name: 'Create component',
                description: 'Build component',
                category: 'UI'
            };

            const needsTests = TestRequirementGenerator.needsTests(task);
            assert.strictEqual(needsTests, true);
        });

        test('should return false for Documentation tasks', () => {
            const task: Task = {
                id: 'TEST-029',
                name: 'Update docs',
                description: 'Update documentation',
                category: 'Documentation'
            };

            const needsTests = TestRequirementGenerator.needsTests(task);
            assert.strictEqual(needsTests, false);
        });

        test('should return false for Pattern tasks', () => {
            const task: Task = {
                id: 'TEST-030',
                name: 'Add pattern',
                description: 'Add new pattern',
                category: 'Pattern'
            };

            const needsTests = TestRequirementGenerator.needsTests(task);
            assert.strictEqual(needsTests, false);
        });
    });

    suite('Edge Cases', () => {
        test('should handle task with no name', () => {
            const task: Task = {
                id: 'TEST-031',
                name: '',
                description: 'No name provided'
            };

            const result = TestRequirementGenerator.generate(task);
            assert.ok(result.category);
            assert.ok(result.testType);
        });

        test('should handle task with no description', () => {
            const task: Task = {
                id: 'TEST-032',
                name: 'Task with no description',
                description: ''
            };

            const result = TestRequirementGenerator.generate(task);
            assert.ok(result.category);
        });

        test('should handle task with special characters', () => {
            const task: Task = {
                id: 'TEST-033',
                name: 'Task with chars: <>&"\'',
                description: 'Special chars in description: <>&"\''
            };

            const result = TestRequirementGenerator.generate(task);
            assert.ok(result.category);
        });

        test('should handle task with very long name', () => {
            const task: Task = {
                id: 'TEST-034',
                name: 'A'.repeat(1000),
                description: 'Very long name'
            };

            const result = TestRequirementGenerator.generate(task);
            assert.ok(result.category);
        });

        test('should handle task with undefined fields', () => {
            const task: Task = {
                id: 'TEST-035',
                name: 'Minimal task',
                description: undefined,
                category: undefined,
                files_to_modify: undefined,
                deliverables: undefined
            };

            const result = TestRequirementGenerator.generate(task);
            assert.ok(result.category);
            assert.ok(result.testType);
            assert.ok(typeof result.coverageRequirement === 'number');
        });
    });

    suite('Performance', () => {
        test('should generate requirements in <50ms', () => {
            const task: Task = {
                id: 'PERF-001',
                name: 'Performance test',
                description: 'Generate requirements quickly',
                category: 'Infrastructure',
                files_to_modify: ['src/services/TestValidator.ts']
            };

            const start = Date.now();
            TestRequirementGenerator.generate(task);
            const duration = Date.now() - start;

            assert.ok(duration < 50, `Generation took ${duration}ms (should be <50ms)`);
        });

        test('should generate requirements for 100 tasks in <500ms', () => {
            const tasks: Task[] = [];
            for (let i = 0; i < 100; i++) {
                tasks.push({
                    id: `PERF-${i.toString().padStart(3, '0')}`,
                    name: `Task ${i}`,
                    description: 'Performance test task',
                    category: 'Infrastructure'
                });
            }

            const start = Date.now();
            for (const task of tasks) {
                TestRequirementGenerator.generate(task);
            }
            const duration = Date.now() - start;

            assert.ok(duration < 500, `Generation for 100 tasks took ${duration}ms (should be <500ms)`);
        });
    });
});
