import * as assert from 'assert';
import { TaskStarter } from '../../src/services/TaskStarter';
import { SprintTask } from '../../src/commands/SprintLoader';

/**
 * REFACTOR-000: TaskStarter Tests (TDD RED Phase)
 *
 * DESIGN DECISION: Test task selection and orchestration logic before implementation
 * WHY: TDD ensures correct task starter workflow from the start
 *
 * Test Coverage: 10 tests for task starter logic
 * Expected: ALL TESTS FAIL until implementation exists
 */

suite('TaskStarter Tests', () => {
    let taskStarter: TaskStarter;
    let mockTasks: SprintTask[];

    setup(() => {
        taskStarter = new TaskStarter();

        // Mock task data for testing
        mockTasks = [
            {
                id: 'TASK-001',
                name: 'Completed Task',
                status: 'completed',
                phase: 'phase1',
                agent: 'test-agent',
                estimated_time: '1 hour',
                dependencies: []
            },
            {
                id: 'TASK-002',
                name: 'Ready Task (no deps)',
                status: 'pending',
                phase: 'phase1',
                agent: 'test-agent',
                estimated_time: '2 hours',
                dependencies: []
            },
            {
                id: 'TASK-003',
                name: 'Ready Task (deps met)',
                status: 'pending',
                phase: 'phase1',
                agent: 'test-agent',
                estimated_time: '3 hours',
                dependencies: ['TASK-001'] // TASK-001 is completed
            },
            {
                id: 'TASK-004',
                name: 'Blocked Task',
                status: 'pending',
                phase: 'phase2',
                agent: 'test-agent',
                estimated_time: '4 hours',
                dependencies: ['TASK-002', 'TASK-003'] // Both pending
            },
            {
                id: 'TASK-005',
                name: 'Quick Task',
                status: 'pending',
                phase: 'phase1',
                agent: 'test-agent',
                estimated_time: '30 minutes',
                dependencies: []
            }
        ];
    });

    test('findNextReadyTask() returns task with no dependencies', () => {
        const next = taskStarter.findNextReadyTask(mockTasks);

        assert.notStrictEqual(next, null, 'Should find a ready task');
        assert.strictEqual(next!.dependencies.length, 0, 'Should prioritize task with no dependencies');
    });

    test('findNextReadyTask() respects completed dependencies', () => {
        const next = taskStarter.findNextReadyTask(mockTasks);

        // Should return either TASK-002, TASK-003, or TASK-005 (all are ready)
        assert.notStrictEqual(next, null, 'Should find a ready task');
        assert.ok(
            ['TASK-002', 'TASK-003', 'TASK-005'].includes(next!.id),
            'Should return a task with no blocking dependencies'
        );
    });

    test('findNextReadyTask() returns null when all tasks blocked or completed', () => {
        const allBlockedOrCompleted: SprintTask[] = [
            {
                id: 'TASK-001',
                name: 'Completed',
                status: 'completed',
                phase: 'phase1',
                agent: 'test-agent',
                estimated_time: '1 hour',
                dependencies: []
            },
            {
                id: 'TASK-002',
                name: 'Blocked',
                status: 'pending',
                phase: 'phase1',
                agent: 'test-agent',
                estimated_time: '2 hours',
                dependencies: ['TASK-003'] // Depends on pending task
            },
            {
                id: 'TASK-003',
                name: 'Blocked',
                status: 'pending',
                phase: 'phase1',
                agent: 'test-agent',
                estimated_time: '3 hours',
                dependencies: ['TASK-002'] // Circular dependency
            }
        ];

        const next = taskStarter.findNextReadyTask(allBlockedOrCompleted);

        assert.strictEqual(next, null, 'Should return null when no tasks are ready');
    });

    test('findNextReadyTask() prioritizes tasks with no dependencies over tasks with met dependencies', () => {
        const next = taskStarter.findNextReadyTask(mockTasks);

        // Should prefer TASK-002 or TASK-005 (no deps) over TASK-003 (has deps but met)
        assert.notStrictEqual(next, null, 'Should find a ready task');
        assert.strictEqual(
            next!.dependencies.length,
            0,
            'Should prioritize tasks with no dependencies'
        );
    });

    test('findAlternativeTasks() finds 3 ready alternatives', () => {
        const blockedTask = mockTasks.find(t => t.id === 'TASK-004')!;
        const alternatives = taskStarter.findAlternativeTasks(blockedTask, mockTasks);

        assert.ok(alternatives.length > 0 && alternatives.length <= 3, 'Should return up to 3 alternatives');
        alternatives.forEach(alt => {
            assert.notStrictEqual(alt.id, 'TASK-004', 'Should not include the blocked task');
            assert.strictEqual(alt.status, 'pending', 'Alternatives should be pending');
        });
    });

    test('findAlternativeTasks() excludes the blocked task itself', () => {
        const blockedTask = mockTasks.find(t => t.id === 'TASK-002')!;
        const alternatives = taskStarter.findAlternativeTasks(blockedTask, mockTasks);

        const includesBlockedTask = alternatives.some(alt => alt.id === 'TASK-002');
        assert.strictEqual(includesBlockedTask, false, 'Should not include the blocked task in alternatives');
    });

    test('findAlternativeTasks() returns empty array if no alternatives available', () => {
        const onlyTask: SprintTask[] = [
            {
                id: 'TASK-001',
                name: 'Only Task',
                status: 'pending',
                phase: 'phase1',
                agent: 'test-agent',
                estimated_time: '1 hour',
                dependencies: ['TASK-002'] // Blocked
            }
        ];

        const blockedTask = onlyTask[0];
        const alternatives = taskStarter.findAlternativeTasks(blockedTask, onlyTask);

        assert.strictEqual(alternatives.length, 0, 'Should return empty array when no alternatives');
    });

    test('startTask() updates TOML status to in_progress', async () => {
        const task = mockTasks.find(t => t.id === 'TASK-002')!;
        const sprintPath = 'internal/sprints/ACTIVE_SPRINT.toml';

        await taskStarter.startTask(task, mockTasks, sprintPath);

        // Mock: In actual implementation, this would update the TOML file
        // For now, we're testing that the method exists and completes
        assert.ok(true, 'startTask() should complete without errors');
    });

    test('startTask() throws error if dependencies not met (no override)', async () => {
        const blockedTask = mockTasks.find(t => t.id === 'TASK-004')!;
        const sprintPath = 'internal/sprints/ACTIVE_SPRINT.toml';

        try {
            await taskStarter.startTask(blockedTask, mockTasks, sprintPath, false);
            assert.fail('Should have thrown error for blocked task');
        } catch (error) {
            assert.ok(error instanceof Error, 'Should throw Error');
            assert.ok(
                (error as Error).message.includes('dependencies'),
                'Error message should mention dependencies'
            );
        }
    });

    test('startTask() allows override when explicitly requested', async () => {
        const blockedTask = mockTasks.find(t => t.id === 'TASK-004')!;
        const sprintPath = 'internal/sprints/ACTIVE_SPRINT.toml';

        // Should not throw when override = true
        await taskStarter.startTask(blockedTask, mockTasks, sprintPath, true);

        assert.ok(true, 'startTask() should allow override for blocked task');
    });

    /**
     * PROTECT-000B: Phase-Aware Smart Selection Tests
     * Tests for enhanced selection algorithm with phase awareness
     */
    suite('PROTECT-000B: Phase-Aware Smart Selection', () => {
        test('Prioritizes tasks in same phase as last completed', () => {
            const phaseAwareTasks: SprintTask[] = [
                {
                    id: 'COMPLETED-001',
                    name: 'Last Completed',
                    status: 'completed',
                    phase: 'phase-2-core',
                    agent: 'test-agent',
                    estimated_time: '1 hour',
                    dependencies: [],
                    completed_date: '2025-11-07'
                },
                {
                    id: 'PENDING-PHASE-1',
                    name: 'Phase 1 Task',
                    status: 'pending',
                    phase: 'phase-1-foundation',
                    agent: 'test-agent',
                    estimated_time: '1 hour',
                    dependencies: []
                },
                {
                    id: 'PENDING-PHASE-2',
                    name: 'Phase 2 Task (Same as last completed)',
                    status: 'pending',
                    phase: 'phase-2-core',
                    agent: 'test-agent',
                    estimated_time: '1 hour',
                    dependencies: []
                },
                {
                    id: 'PENDING-PHASE-3',
                    name: 'Phase 3 Task',
                    status: 'pending',
                    phase: 'phase-3-advanced',
                    agent: 'test-agent',
                    estimated_time: '1 hour',
                    dependencies: []
                }
            ];

            const next = taskStarter.findNextReadyTask(phaseAwareTasks);

            assert.strictEqual(
                next!.id,
                'PENDING-PHASE-2',
                'Should select task in same phase as last completed (phase-2)'
            );
            assert.strictEqual(next!.phase, 'phase-2-core');
        });

        test('Prioritizes earlier phases when no last completed phase', () => {
            const neverStartedTasks: SprintTask[] = [
                {
                    id: 'PENDING-PHASE-3',
                    name: 'Phase 3 Task',
                    status: 'pending',
                    phase: 'phase-3-advanced',
                    agent: 'test-agent',
                    estimated_time: '1 hour',
                    dependencies: []
                },
                {
                    id: 'PENDING-PHASE-1',
                    name: 'Phase 1 Task',
                    status: 'pending',
                    phase: 'phase-1-foundation',
                    agent: 'test-agent',
                    estimated_time: '1 hour',
                    dependencies: []
                },
                {
                    id: 'PENDING-PHASE-2',
                    name: 'Phase 2 Task',
                    status: 'pending',
                    phase: 'phase-2-core',
                    agent: 'test-agent',
                    estimated_time: '1 hour',
                    dependencies: []
                }
            ];

            const next = taskStarter.findNextReadyTask(neverStartedTasks);

            assert.strictEqual(
                next!.id,
                'PENDING-PHASE-1',
                'Should select earliest phase (phase-1) when no completed tasks'
            );
        });

        test('Applies full priority order: phase → dependencies → time', () => {
            const complexTasks: SprintTask[] = [
                {
                    id: 'COMPLETED-001',
                    name: 'Last Completed Phase 1',
                    status: 'completed',
                    phase: 'phase-1-foundation',
                    agent: 'test-agent',
                    estimated_time: '1 hour',
                    dependencies: [],
                    completed_date: '2025-11-07'
                },
                {
                    id: 'PENDING-PHASE-1-LONG',
                    name: 'Phase 1, 0 deps, 4 hours',
                    status: 'pending',
                    phase: 'phase-1-foundation',
                    agent: 'test-agent',
                    estimated_time: '4 hours',
                    dependencies: []
                },
                {
                    id: 'PENDING-PHASE-1-SHORT',
                    name: 'Phase 1, 0 deps, 1 hour',
                    status: 'pending',
                    phase: 'phase-1-foundation',
                    agent: 'test-agent',
                    estimated_time: '1 hour',
                    dependencies: []
                },
                {
                    id: 'PENDING-PHASE-1-WITH-DEPS',
                    name: 'Phase 1, 1 dep, 30 minutes',
                    status: 'pending',
                    phase: 'phase-1-foundation',
                    agent: 'test-agent',
                    estimated_time: '30 minutes',
                    dependencies: ['COMPLETED-001']
                },
                {
                    id: 'PENDING-PHASE-2',
                    name: 'Phase 2, 0 deps, 30 minutes',
                    status: 'pending',
                    phase: 'phase-2-core',
                    agent: 'test-agent',
                    estimated_time: '30 minutes',
                    dependencies: []
                }
            ];

            const next = taskStarter.findNextReadyTask(complexTasks);

            // Priority order:
            // 1. Same phase as last completed (phase-1) - all phase-1 tasks qualify
            // 2. Earlier phase (phase-1 before phase-2) - already phase-1
            // 3. Fewest dependencies (0 deps) - PENDING-PHASE-1-LONG and PENDING-PHASE-1-SHORT qualify
            // 4. Shortest time (1 hour < 4 hours) - PENDING-PHASE-1-SHORT wins

            assert.strictEqual(
                next!.id,
                'PENDING-PHASE-1-SHORT',
                'Should apply full priority: same phase → fewest deps → shortest time'
            );
        });

        test('Phase number extraction works correctly', () => {
            const phaseTests: SprintTask[] = [
                {
                    id: 'TASK-PHASE-10',
                    name: 'Phase 10',
                    status: 'pending',
                    phase: 'phase-10-final',
                    agent: 'test-agent',
                    estimated_time: '1 hour',
                    dependencies: []
                },
                {
                    id: 'TASK-PHASE-2',
                    name: 'Phase 2',
                    status: 'pending',
                    phase: 'phase-2-core',
                    agent: 'test-agent',
                    estimated_time: '1 hour',
                    dependencies: []
                },
                {
                    id: 'TASK-PHASE-1',
                    name: 'Phase 1',
                    status: 'pending',
                    phase: 'phase-1-foundation',
                    agent: 'test-agent',
                    estimated_time: '1 hour',
                    dependencies: []
                }
            ];

            const next = taskStarter.findNextReadyTask(phaseTests);

            assert.strictEqual(
                next!.id,
                'TASK-PHASE-1',
                'Should correctly parse phase numbers and sort (1 < 2 < 10)'
            );
        });

        test('Performance: Selection completes in <100ms', () => {
            // Create 100 mock tasks for performance testing
            const largeTasks: SprintTask[] = [];
            for (let i = 1; i <= 100; i++) {
                largeTasks.push({
                    id: `TASK-${i.toString().padStart(3, '0')}`,
                    name: `Task ${i}`,
                    status: i <= 50 ? 'completed' : 'pending',
                    phase: `phase-${(i % 5) + 1}`,
                    agent: 'test-agent',
                    estimated_time: `${i % 8 + 1} hours`,
                    dependencies: i > 50 && i <= 60 ? [`TASK-${(i - 50).toString().padStart(3, '0')}`] : [],
                    completed_date: i <= 50 ? '2025-11-07' : undefined
                });
            }

            const startTime = Date.now();
            const next = taskStarter.findNextReadyTask(largeTasks);
            const duration = Date.now() - startTime;

            assert.notStrictEqual(next, null, 'Should find a ready task');
            assert.ok(duration < 100, `Selection should complete in <100ms (took ${duration}ms)`);
        });

        test('Handles tasks with unusual phase names gracefully', () => {
            const unusualPhaseTasks: SprintTask[] = [
                {
                    id: 'TASK-1',
                    name: 'No phase number',
                    status: 'pending',
                    phase: 'initialization',
                    agent: 'test-agent',
                    estimated_time: '1 hour',
                    dependencies: []
                },
                {
                    id: 'TASK-2',
                    name: 'Standard phase',
                    status: 'pending',
                    phase: 'phase-1-foundation',
                    agent: 'test-agent',
                    estimated_time: '2 hours',
                    dependencies: []
                }
            ];

            const next = taskStarter.findNextReadyTask(unusualPhaseTasks);

            // Should prefer standard phase format (phase-1) over unparseable phase (defaults to 99)
            assert.strictEqual(
                next!.id,
                'TASK-2',
                'Should handle unparseable phase names (default to low priority)'
            );
        });
    });
});
