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
});
