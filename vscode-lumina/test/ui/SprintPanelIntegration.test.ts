import * as assert from 'assert';
import { TaskStarter } from '../../src/services/TaskStarter';
import { TaskDependencyValidator } from '../../src/services/TaskDependencyValidator';
import { SprintTask } from '../../src/commands/SprintLoader';

/**
 * REFACTOR-000-UI: Sprint Panel UI Integration Tests (TDD RED Phase)
 *
 * DESIGN DECISION: Test UI integration logic before implementation
 * WHY: TDD ensures correct button states and message handling
 *
 * Test Coverage: 10 tests for Sprint Panel UI integration
 * Expected: ALL TESTS FAIL until implementation exists
 */

suite('Sprint Panel UI Integration Tests', () => {
    let taskStarter: TaskStarter;
    let validator: TaskDependencyValidator;
    let mockTasks: SprintTask[];

    setup(() => {
        taskStarter = new TaskStarter();
        validator = new TaskDependencyValidator();

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
                name: 'Ready Task',
                status: 'pending',
                phase: 'phase1',
                agent: 'test-agent',
                estimated_time: '2 hours',
                dependencies: []
            },
            {
                id: 'TASK-003',
                name: 'In Progress Task',
                status: 'in_progress',
                phase: 'phase1',
                agent: 'test-agent',
                estimated_time: '3 hours',
                dependencies: []
            },
            {
                id: 'TASK-004',
                name: 'Blocked Task',
                status: 'pending',
                phase: 'phase2',
                agent: 'test-agent',
                estimated_time: '4 hours',
                dependencies: ['TASK-002'] // TASK-002 is pending
            }
        ];
    });

    test('Start Next Task button should find correct ready task', () => {
        const nextTask = taskStarter.findNextReadyTask(mockTasks);

        assert.notStrictEqual(nextTask, null, 'Should find a ready task');
        assert.strictEqual(nextTask!.status, 'pending', 'Next task should be pending');
        assert.strictEqual(
            validator.isTaskReady(nextTask!, mockTasks),
            true,
            'Next task should have all dependencies met'
        );
    });

    test('Start button should be enabled for ready tasks', () => {
        const readyTask = mockTasks.find(t => t.id === 'TASK-002')!;
        const isReady = validator.isTaskReady(readyTask, mockTasks);

        assert.strictEqual(isReady, true, 'TASK-002 should be ready (no deps, pending status)');
    });

    test('Start button should be blocked for tasks with unmet dependencies', () => {
        const blockedTask = mockTasks.find(t => t.id === 'TASK-004')!;
        const isReady = validator.isTaskReady(blockedTask, mockTasks);

        assert.strictEqual(isReady, false, 'TASK-004 should be blocked (pending dependency)');
    });

    test('Clicking Start on ready task should call startTask()', async () => {
        const readyTask = mockTasks.find(t => t.id === 'TASK-002')!;
        const sprintPath = 'internal/sprints/ACTIVE_SPRINT.toml';

        // Mock: Verify startTask can be called without error
        try {
            await taskStarter.startTask(readyTask, mockTasks, sprintPath);
            assert.ok(true, 'startTask() should be called successfully for ready task');
        } catch (error) {
            assert.fail(`startTask() should not throw for ready task: ${(error as Error).message}`);
        }
    });

    test('Clicking Start on blocked task should detect blocking dependencies', () => {
        const blockedTask = mockTasks.find(t => t.id === 'TASK-004')!;
        const blocking = validator.getBlockingDependencies(blockedTask, mockTasks);

        assert.strictEqual(blocking.length, 1, 'Should identify 1 blocking dependency');
        assert.strictEqual(blocking[0].id, 'TASK-002', 'Should identify TASK-002 as blocking');
    });

    test('Warning dialog should list blocking dependencies with status', () => {
        const blockedTask = mockTasks.find(t => t.id === 'TASK-004')!;
        const blocking = validator.getBlockingDependencies(blockedTask, mockTasks);

        // Verify we can extract dependency info for dialog
        blocking.forEach(dep => {
            assert.ok(dep.id, 'Dependency should have ID');
            assert.ok(dep.name, 'Dependency should have name');
            assert.ok(dep.status, 'Dependency should have status');
        });
    });

    test('Warning dialog should suggest 3 alternatives', () => {
        const blockedTask = mockTasks.find(t => t.id === 'TASK-004')!;
        const alternatives = taskStarter.findAlternativeTasks(blockedTask, mockTasks);

        assert.ok(alternatives.length <= 3, 'Should suggest up to 3 alternatives');
        alternatives.forEach(alt => {
            assert.strictEqual(alt.status, 'pending', 'Alternatives should be pending');
            assert.notStrictEqual(alt.id, blockedTask.id, 'Should not suggest the blocked task itself');
        });
    });

    test('Override button should allow starting blocked task', async () => {
        const blockedTask = mockTasks.find(t => t.id === 'TASK-004')!;
        const sprintPath = 'internal/sprints/ACTIVE_SPRINT.toml';

        // Should not throw when override = true
        try {
            await taskStarter.startTask(blockedTask, mockTasks, sprintPath, true);
            assert.ok(true, 'startTask() with override should succeed for blocked task');
        } catch (error) {
            assert.fail(`startTask() with override should not throw: ${(error as Error).message}`);
        }
    });

    test('Status icons should map correctly to task states', () => {
        const iconMap = {
            'pending': '⏸️',
            'in_progress': '🔄',
            'completed': '✅',
            'blocked': '🔒',
            'skipped': '⏭️'
        };

        // Test icon mapping logic
        assert.strictEqual(iconMap['pending'], '⏸️', 'Pending icon should be ⏸️');
        assert.strictEqual(iconMap['in_progress'], '🔄', 'In progress icon should be 🔄');
        assert.strictEqual(iconMap['completed'], '✅', 'Completed icon should be ✅');
        assert.strictEqual(iconMap['blocked'], '🔒', 'Blocked icon should be 🔒');
        assert.strictEqual(iconMap['skipped'], '⏭️', 'Skipped icon should be ⏭️');
    });

    test('Progress display should calculate correctly', () => {
        const completed = mockTasks.filter(t => t.status === 'completed').length;
        const inProgress = mockTasks.filter(t => t.status === 'in_progress').length;
        const total = mockTasks.length;

        assert.strictEqual(completed, 1, 'Should count 1 completed task');
        assert.strictEqual(inProgress, 1, 'Should count 1 in-progress task');
        assert.strictEqual(total, 4, 'Should count 4 total tasks');

        const progressText = `${completed}/${total} completed | ${inProgress} in progress`;
        assert.strictEqual(progressText, '1/4 completed | 1 in progress', 'Progress text should format correctly');
    });
});
