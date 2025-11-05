import * as assert from 'assert';
import { TaskDependencyValidator } from '../../src/services/TaskDependencyValidator';
import { SprintTask } from '../../src/commands/SprintLoader';

/**
 * REFACTOR-000: TaskDependencyValidator Tests (TDD RED Phase)
 *
 * DESIGN DECISION: Test dependency validation logic before implementation
 * WHY: TDD ensures correct dependency checking from the start
 *
 * Test Coverage: 5 tests for dependency validation
 * Expected: ALL TESTS FAIL until implementation exists
 */

suite('TaskDependencyValidator Tests', () => {
    let validator: TaskDependencyValidator;
    let mockTasks: SprintTask[];

    setup(() => {
        validator = new TaskDependencyValidator();

        // Mock task data for testing
        mockTasks = [
            {
                id: 'TASK-001',
                name: 'Task 1',
                status: 'completed',
                phase: 'phase1',
                agent: 'test-agent',
                estimated_time: '1 hour',
                dependencies: []
            },
            {
                id: 'TASK-002',
                name: 'Task 2',
                status: 'pending',
                phase: 'phase1',
                agent: 'test-agent',
                estimated_time: '2 hours',
                dependencies: ['TASK-001'] // Depends on TASK-001 (completed)
            },
            {
                id: 'TASK-003',
                name: 'Task 3',
                status: 'pending',
                phase: 'phase1',
                agent: 'test-agent',
                estimated_time: '3 hours',
                dependencies: ['TASK-002'] // Depends on TASK-002 (pending)
            },
            {
                id: 'TASK-004',
                name: 'Task 4',
                status: 'pending',
                phase: 'phase1',
                agent: 'test-agent',
                estimated_time: '1 hour',
                dependencies: [] // No dependencies
            }
        ];
    });

    test('validateDependencies() returns true when all dependencies completed', () => {
        const task = mockTasks.find(t => t.id === 'TASK-002')!;
        const result = validator.validateDependencies(task, mockTasks);

        assert.strictEqual(result, true, 'Should return true when all dependencies are completed');
    });

    test('validateDependencies() returns false when dependencies pending', () => {
        const task = mockTasks.find(t => t.id === 'TASK-003')!;
        const result = validator.validateDependencies(task, mockTasks);

        assert.strictEqual(result, false, 'Should return false when dependencies are pending');
    });

    test('validateDependencies() returns true when no dependencies', () => {
        const task = mockTasks.find(t => t.id === 'TASK-004')!;
        const result = validator.validateDependencies(task, mockTasks);

        assert.strictEqual(result, true, 'Should return true when task has no dependencies');
    });

    test('getBlockingDependencies() returns list of non-completed dependencies', () => {
        const task = mockTasks.find(t => t.id === 'TASK-003')!;
        const blocking = validator.getBlockingDependencies(task, mockTasks);

        assert.strictEqual(blocking.length, 1, 'Should return 1 blocking dependency');
        assert.strictEqual(blocking[0].id, 'TASK-002', 'Should identify TASK-002 as blocking');
        assert.strictEqual(blocking[0].status, 'pending', 'Blocking dependency should be pending');
    });

    test('isTaskReady() checks both status=pending and dependencies completed', () => {
        const readyTask = mockTasks.find(t => t.id === 'TASK-002')!;
        const blockedTask = mockTasks.find(t => t.id === 'TASK-003')!;
        const completedTask = mockTasks.find(t => t.id === 'TASK-001')!;

        assert.strictEqual(
            validator.isTaskReady(readyTask, mockTasks),
            true,
            'TASK-002 should be ready (pending + all deps completed)'
        );

        assert.strictEqual(
            validator.isTaskReady(blockedTask, mockTasks),
            false,
            'TASK-003 should not be ready (pending dep blocks it)'
        );

        assert.strictEqual(
            validator.isTaskReady(completedTask, mockTasks),
            false,
            'TASK-001 should not be ready (already completed)'
        );
    });
});
