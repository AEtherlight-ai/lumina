/**
 * Tests for ConfidenceScorer
 *
 * TEST STRATEGY (TDD - Red/Green/Refactor):
 * 1. Write tests FIRST → Run → FAIL (red)
 * 2. Implement minimum code → Run → PASS (green)
 * 3. Refactor for clarity → Run → STILL PASS
 *
 * TEST COVERAGE:
 * 1. Individual task scoring (0.0-1.0)
 * 2. Scoring criteria weights (agent, patterns, files, validation, why/context)
 * 3. Gap identification (missing fields)
 * 4. Action assignment (accept/fill_gaps/regenerate)
 * 5. Sprint-level confidence (average + distribution)
 * 6. Performance (<100ms per task, <2s for 50 tasks)
 *
 * UNIT TEST APPROACH:
 * WHY: ConfidenceScorer is pure Node.js module (no VS Code dependencies)
 * HOW: Run with plain Mocha in Node.js (npm run test:unit)
 * REASONING: Fast, isolated, proper TDD - same as MultiFormatParser
 *
 * RUN TESTS: npm run test:unit
 */

import * as assert from 'assert';
import { ConfidenceScorer, TaskScore, SprintConfidence } from '../../services/ConfidenceScorer';
import { Task } from '../../services/MultiFormatParser';

suite('ConfidenceScorer Tests', () => {
    let scorer: ConfidenceScorer;

    setup(() => {
        scorer = new ConfidenceScorer();
    });

    suite('Individual Task Scoring', () => {
        test('should score complete task as 1.0', () => {
            const completeTask: Task = {
                id: 'TEST-001',
                name: 'Complete Task',
                description: 'Fully specified task',
                agent: 'test-agent',
                patterns: ['Pattern-TEST-001'],
                deliverables: ['Create test file'],
                validation_criteria: ['Test passes'],
                why: 'Because testing',
                context: 'Test context'
            };

            const score = scorer.scoreTask(completeTask);
            assert.strictEqual(score.confidence, 1.0);
            assert.strictEqual(score.action, 'accept');
            assert.strictEqual(score.gaps.length, 0);
        });

        test('should score empty task as 0.0', () => {
            const emptyTask: Task = {
                id: 'TEST-002',
                name: 'Empty Task',
                description: ''
            };

            const score = scorer.scoreTask(emptyTask);
            assert.strictEqual(score.confidence, 0.0);
            assert.strictEqual(score.action, 'regenerate');
            assert.ok(score.gaps.length > 0);
        });

        test('should score task with only agent as 0.2', () => {
            const partialTask: Task = {
                id: 'TEST-003',
                name: 'Partial Task',
                description: 'Only has agent',
                agent: 'test-agent'
            };

            const score = scorer.scoreTask(partialTask);
            assert.strictEqual(score.confidence, 0.2);
            assert.strictEqual(score.action, 'regenerate');
        });

        test('should score task with agent + patterns as 0.4', () => {
            const task: Task = {
                id: 'TEST-004',
                name: 'Task with patterns',
                description: 'Has agent and patterns',
                agent: 'test-agent',
                patterns: ['Pattern-TEST-001']
            };

            const score = scorer.scoreTask(task);
            assert.strictEqual(score.confidence, 0.4);
            assert.strictEqual(score.action, 'regenerate');
        });

        test('should score task with agent + patterns + deliverables as 0.6', () => {
            const task: Task = {
                id: 'TEST-005',
                name: 'Task with deliverables',
                description: 'Has agent, patterns, deliverables',
                agent: 'test-agent',
                patterns: ['Pattern-TEST-001'],
                deliverables: ['Create file', 'Add tests']
            };

            const score = scorer.scoreTask(task);
            assert.strictEqual(score.confidence, 0.6);
            assert.strictEqual(score.action, 'fill_gaps');
        });

        test('should score task with all criteria except why/context as 0.8', () => {
            const task: Task = {
                id: 'TEST-006',
                name: 'Nearly complete task',
                description: 'Missing only why/context',
                agent: 'test-agent',
                patterns: ['Pattern-TEST-001'],
                deliverables: ['Create file'],
                validation_criteria: ['Test passes']
            };

            const score = scorer.scoreTask(task);
            assert.strictEqual(score.confidence, 0.8);
            assert.strictEqual(score.action, 'accept');
        });
    });

    suite('Gap Identification', () => {
        test('should identify all missing fields for empty task', () => {
            const task: Task = {
                id: 'TEST-007',
                name: 'Empty',
                description: ''
            };

            const score = scorer.scoreTask(task);
            assert.ok(score.gaps.includes('agent'));
            assert.ok(score.gaps.includes('patterns'));
            assert.ok(score.gaps.includes('deliverables'));
            assert.ok(score.gaps.includes('validation_criteria'));
            assert.ok(score.gaps.includes('why/context'));
        });

        test('should identify specific gaps', () => {
            const task: Task = {
                id: 'TEST-008',
                name: 'Partial',
                description: 'Has some fields',
                agent: 'test-agent',
                why: 'Because'
            };

            const score = scorer.scoreTask(task);
            assert.ok(score.gaps.includes('patterns'));
            assert.ok(score.gaps.includes('deliverables'));
            assert.ok(score.gaps.includes('validation_criteria'));
            assert.ok(!score.gaps.includes('agent'));
            assert.ok(!score.gaps.includes('why/context'));
        });

        test('should have no gaps for complete task', () => {
            const task: Task = {
                id: 'TEST-009',
                name: 'Complete',
                description: 'All fields present',
                agent: 'test-agent',
                patterns: ['Pattern-TEST-001'],
                deliverables: ['File'],
                validation_criteria: ['Test'],
                why: 'Why',
                context: 'Context'
            };

            const score = scorer.scoreTask(task);
            assert.strictEqual(score.gaps.length, 0);
        });
    });

    suite('Action Assignment', () => {
        test('should assign "accept" for confidence ≥ 0.8', () => {
            const task: Task = {
                id: 'TEST-010',
                name: 'High confidence',
                description: 'Test',
                agent: 'test-agent',
                patterns: ['Pattern-TEST-001'],
                deliverables: ['File'],
                validation_criteria: ['Test']
            };

            const score = scorer.scoreTask(task);
            assert.ok(score.confidence >= 0.8);
            assert.strictEqual(score.action, 'accept');
        });

        test('should assign "fill_gaps" for confidence 0.5-0.79', () => {
            const task: Task = {
                id: 'TEST-011',
                name: 'Medium confidence',
                description: 'Test',
                agent: 'test-agent',
                patterns: ['Pattern-TEST-001'],
                deliverables: ['File']
            };

            const score = scorer.scoreTask(task);
            assert.ok(score.confidence >= 0.5 && score.confidence < 0.8);
            assert.strictEqual(score.action, 'fill_gaps');
        });

        test('should assign "regenerate" for confidence < 0.5', () => {
            const task: Task = {
                id: 'TEST-012',
                name: 'Low confidence',
                description: 'Test',
                agent: 'test-agent'
            };

            const score = scorer.scoreTask(task);
            assert.ok(score.confidence < 0.5);
            assert.strictEqual(score.action, 'regenerate');
        });
    });

    suite('Sprint-Level Confidence', () => {
        test('should calculate average confidence for sprint', () => {
            const tasks: Task[] = [
                {
                    id: 'T1',
                    name: 'Task 1',
                    description: 'Complete',
                    agent: 'agent',
                    patterns: ['P1'],
                    deliverables: ['D1'],
                    validation_criteria: ['V1'],
                    why: 'Why'
                },
                {
                    id: 'T2',
                    name: 'Task 2',
                    description: 'Partial',
                    agent: 'agent'
                }
            ];

            const sprintScore = scorer.scoreSprint(tasks);
            // Task 1: 1.0, Task 2: 0.2, Average: 0.6
            assert.strictEqual(sprintScore.averageConfidence, 0.6);
            assert.strictEqual(sprintScore.totalTasks, 2);
        });

        test('should calculate confidence distribution', () => {
            const tasks: Task[] = [
                // High confidence (≥0.8)
                {
                    id: 'T1',
                    name: 'High',
                    description: 'Test',
                    agent: 'agent',
                    patterns: ['P1'],
                    deliverables: ['D1'],
                    validation_criteria: ['V1']
                },
                // Medium confidence (0.5-0.79)
                {
                    id: 'T2',
                    name: 'Medium',
                    description: 'Test',
                    agent: 'agent',
                    patterns: ['P1'],
                    deliverables: ['D1']
                },
                // Low confidence (<0.5)
                {
                    id: 'T3',
                    name: 'Low',
                    description: 'Test',
                    agent: 'agent'
                }
            ];

            const sprintScore = scorer.scoreSprint(tasks);
            assert.strictEqual(sprintScore.distribution.high, 1);
            assert.strictEqual(sprintScore.distribution.medium, 1);
            assert.strictEqual(sprintScore.distribution.low, 1);
        });

        test('should handle empty sprint', () => {
            const sprintScore = scorer.scoreSprint([]);
            assert.strictEqual(sprintScore.averageConfidence, 0.0);
            assert.strictEqual(sprintScore.totalTasks, 0);
            assert.strictEqual(sprintScore.distribution.high, 0);
            assert.strictEqual(sprintScore.distribution.medium, 0);
            assert.strictEqual(sprintScore.distribution.low, 0);
        });
    });

    suite('Performance', () => {
        test('should score task in <100ms', () => {
            const task: Task = {
                id: 'PERF-001',
                name: 'Performance test',
                description: 'Test performance',
                agent: 'test-agent',
                patterns: ['Pattern-TEST-001'],
                deliverables: ['File'],
                validation_criteria: ['Test'],
                why: 'Why',
                context: 'Context'
            };

            const start = Date.now();
            scorer.scoreTask(task);
            const duration = Date.now() - start;

            assert.ok(duration < 100, `Scoring took ${duration}ms (should be <100ms)`);
        });

        test('should score 50 tasks in <2s', () => {
            const tasks: Task[] = [];
            for (let i = 0; i < 50; i++) {
                tasks.push({
                    id: `PERF-${i.toString().padStart(3, '0')}`,
                    name: `Task ${i}`,
                    description: 'Performance test task',
                    agent: 'test-agent',
                    patterns: ['Pattern-TEST-001'],
                    deliverables: ['File'],
                    validation_criteria: ['Test']
                });
            }

            const start = Date.now();
            scorer.scoreSprint(tasks);
            const duration = Date.now() - start;

            assert.ok(duration < 2000, `Scoring 50 tasks took ${duration}ms (should be <2000ms)`);
        });
    });
});
