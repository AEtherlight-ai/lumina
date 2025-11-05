import { SprintTask } from '../commands/SprintLoader';

/**
 * REFACTOR-000: TaskDependencyValidator Service
 *
 * DESIGN DECISION: Validate sprint task dependencies before starting
 * WHY: Prevents starting tasks with unmet dependencies
 *
 * REASONING CHAIN:
 * 1. Check task.dependencies array
 * 2. For each dependency ID, find the task
 * 3. Verify dependency task has status = "completed"
 * 4. Return validation result (true/false)
 * 5. Provide list of blocking dependencies for user feedback
 *
 * PATTERN: Pattern-TASK-ANALYSIS-001 (Pre-Task Analysis Protocol)
 * PERFORMANCE: <50ms (simple array operations)
 * RELATED: TaskStarter.ts, SprintLoader.ts
 */
export class TaskDependencyValidator {
    /**
     * Validate if all task dependencies are completed
     *
     * @param task - The task to validate
     * @param allTasks - All tasks in the sprint
     * @returns true if all dependencies completed, false otherwise
     */
    public validateDependencies(task: SprintTask, allTasks: SprintTask[]): boolean {
        // No dependencies = always valid
        if (!task.dependencies || task.dependencies.length === 0) {
            return true;
        }

        // Check each dependency
        for (const depId of task.dependencies) {
            const depTask = allTasks.find(t => t.id === depId);

            // Dependency not found or not completed = invalid
            if (!depTask || depTask.status !== 'completed') {
                return false;
            }
        }

        return true;
    }

    /**
     * Get list of blocking dependencies (non-completed)
     *
     * @param task - The task to check
     * @param allTasks - All tasks in the sprint
     * @returns Array of tasks that are blocking this task
     */
    public getBlockingDependencies(task: SprintTask, allTasks: SprintTask[]): SprintTask[] {
        if (!task.dependencies || task.dependencies.length === 0) {
            return [];
        }

        const blocking: SprintTask[] = [];

        for (const depId of task.dependencies) {
            const depTask = allTasks.find(t => t.id === depId);

            if (depTask && depTask.status !== 'completed') {
                blocking.push(depTask);
            }
        }

        return blocking;
    }

    /**
     * Check if task is ready to start
     * Conditions: status = "pending" AND all dependencies completed
     *
     * @param task - The task to check
     * @param allTasks - All tasks in the sprint
     * @returns true if task is ready to start, false otherwise
     */
    public isTaskReady(task: SprintTask, allTasks: SprintTask[]): boolean {
        // Must be pending (not completed or in_progress)
        if (task.status !== 'pending') {
            return false;
        }

        // Must have all dependencies completed
        return this.validateDependencies(task, allTasks);
    }
}
