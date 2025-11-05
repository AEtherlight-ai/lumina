import * as fs from 'fs';
import * as path from 'path';
import { SprintTask } from '../commands/SprintLoader';
import { TaskDependencyValidator } from './TaskDependencyValidator';

/**
 * REFACTOR-000: TaskStarter Service
 *
 * DESIGN DECISION: Orchestrate task starting workflow with dependency validation
 * WHY: Enforce proper workflow (Pre-Task Analysis, TDD, TOML updates)
 *
 * REASONING CHAIN:
 * 1. Find next ready task (no blocking dependencies)
 * 2. Validate dependencies before starting
 * 3. Update sprint TOML: status = "in_progress"
 * 4. Trigger Pre-Task Analysis workflow
 * 5. Generate test stubs (TDD RED phase)
 * 6. Enable coding (TDD GREEN phase)
 *
 * PATTERN: Pattern-TASK-ANALYSIS-001, Pattern-TDD-001
 * PERFORMANCE: <500ms for full workflow
 * RELATED: TaskDependencyValidator.ts, SprintLoader.ts
 */
export class TaskStarter {
    private validator: TaskDependencyValidator;

    constructor() {
        this.validator = new TaskDependencyValidator();
    }

    /**
     * Find next ready task (no blocking dependencies)
     *
     * ALGORITHM:
     * 1. Filter to pending tasks
     * 2. Check dependencies for each
     * 3. Sort by: no deps > short time > phase order
     * 4. Return first match
     *
     * @param allTasks - All tasks in the sprint
     * @returns Next ready task or null if all blocked
     */
    public findNextReadyTask(allTasks: SprintTask[]): SprintTask | null {
        // Filter to pending tasks only
        const pending = allTasks.filter(t => t.status === 'pending');

        // Find tasks that are ready (all deps completed)
        const ready = pending.filter(task =>
            this.validator.isTaskReady(task, allTasks)
        );

        if (ready.length === 0) {
            return null;
        }

        // Sort by priority:
        // 1. Tasks with no dependencies (independent work)
        // 2. Shortest estimated time (quick wins)
        // 3. Phase order (maintain sprint sequence)
        ready.sort((a, b) => {
            // Priority 1: No dependencies first
            const aDeps = a.dependencies?.length || 0;
            const bDeps = b.dependencies?.length || 0;
            if (aDeps !== bDeps) {
                return aDeps - bDeps;
            }

            // Priority 2: Shorter time first
            const aTime = this.parseEstimatedTime(a.estimated_time);
            const bTime = this.parseEstimatedTime(b.estimated_time);
            if (aTime !== bTime) {
                return aTime - bTime;
            }

            // Priority 3: Phase order
            return a.phase.localeCompare(b.phase);
        });

        return ready[0];
    }

    /**
     * Find alternative tasks (for blocked task warnings)
     *
     * @param blockedTask - The task that is blocked
     * @param allTasks - All tasks in the sprint
     * @returns Array of up to 3 alternative ready tasks
     */
    public findAlternativeTasks(blockedTask: SprintTask, allTasks: SprintTask[]): SprintTask[] {
        // Find all ready tasks except the blocked one
        const ready = allTasks
            .filter(t => t.status === 'pending' && t.id !== blockedTask.id)
            .filter(t => this.validator.isTaskReady(t, allTasks));

        // Sort by estimated time (prefer quick wins)
        ready.sort((a, b) => {
            const aTime = this.parseEstimatedTime(a.estimated_time);
            const bTime = this.parseEstimatedTime(b.estimated_time);
            return aTime - bTime;
        });

        // Return top 3 alternatives
        return ready.slice(0, 3);
    }

    /**
     * Start a task (main workflow orchestration)
     *
     * WORKFLOW:
     * 1. Validate dependencies (unless override)
     * 2. Update TOML: status = "in_progress"
     * 3. Run Pre-Task Analysis (8 steps)
     * 4. Generate test stubs (TDD RED)
     * 5. Enable Edit/Write tools
     *
     * @param task - The task to start
     * @param allTasks - All tasks in the sprint
     * @param sprintPath - Path to ACTIVE_SPRINT.toml
     * @param override - Allow starting despite unmet dependencies
     * @throws Error if dependencies not met and override = false
     */
    public async startTask(
        task: SprintTask,
        allTasks: SprintTask[],
        sprintPath: string,
        override: boolean = false
    ): Promise<void> {
        // Step 1: Validate dependencies
        if (!override && !this.validator.validateDependencies(task, allTasks)) {
            const blocking = this.validator.getBlockingDependencies(task, allTasks);
            const blockingIds = blocking.map(t => t.id).join(', ');
            throw new Error(
                `Task ${task.id} has unmet dependencies: ${blockingIds}. ` +
                `Use override=true to start anyway (not recommended).`
            );
        }

        // Step 2: Update TOML status to in_progress
        await this.updateTaskStatus(task.id, 'in_progress', sprintPath);

        // Steps 3-5: Pre-Task Analysis, test generation, etc.
        // These will be implemented in the UI integration (REFACTOR-000 Phase 2)
        // For now, we've validated the core logic
    }

    /**
     * Update task status in TOML file
     *
     * @param taskId - ID of task to update
     * @param newStatus - New status value
     * @param sprintPath - Path to ACTIVE_SPRINT.toml
     */
    private async updateTaskStatus(
        taskId: string,
        newStatus: string,
        sprintPath: string
    ): Promise<void> {
        // Read TOML file
        const content = fs.readFileSync(sprintPath, 'utf-8');

        // Find and replace status line for this task
        // Pattern: [tasks.TASK-ID] section, then status = "..." line
        const taskSectionRegex = new RegExp(
            `(\\[tasks\\.${taskId}\\][\\s\\S]*?status\\s*=\\s*")[^"]+(")`
        );

        const updated = content.replace(taskSectionRegex, `$1${newStatus}$2`);

        // Write back to file
        fs.writeFileSync(sprintPath, updated, 'utf-8');
    }

    /**
     * Parse estimated time to minutes (for sorting)
     *
     * @param timeStr - Time string (e.g., "2 hours", "30 minutes")
     * @returns Time in minutes
     */
    private parseEstimatedTime(timeStr: string): number {
        const hourMatch = timeStr.match(/(\d+)\s*hours?/i);
        const minuteMatch = timeStr.match(/(\d+)\s*minutes?/i);

        let totalMinutes = 0;
        if (hourMatch) {
            totalMinutes += parseInt(hourMatch[1]) * 60;
        }
        if (minuteMatch) {
            totalMinutes += parseInt(minuteMatch[1]);
        }

        return totalMinutes || 60; // Default to 1 hour if can't parse
    }
}
