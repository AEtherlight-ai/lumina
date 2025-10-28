/**
 * Progress Monitor - Track sprint execution metrics
 *
 * DESIGN DECISION: Aggregate metrics (velocity, estimated completion time)
 * WHY: Predictive analytics enable proactive sprint management
 *
 * REASONING CHAIN:
 * 1. Track task start/end timestamps
 * 2. Calculate velocity (tasks/hour)
 * 3. Estimate remaining time (tasks_remaining / velocity)
 * 4. Show: "Estimated completion: 2:30 PM (2 hours 15 minutes)"
 * 5. Update every task completion
 * 6. Result: User knows if sprint on track or delayed
 *
 * PATTERN: Pattern-METRICS-001 (Sprint Execution Metrics)
 * RELATED: AS-017 (Progress Monitoring)
 */

/**
 * Task execution record
 */
export interface TaskExecution {
    /** Task ID */
    taskId: string;
    /** Agent type */
    agentType: string;
    /** Start timestamp */
    startedAt: string;
    /** End timestamp (if complete) */
    completedAt?: string;
    /** Duration in milliseconds (if complete) */
    duration?: number;
    /** Status */
    status: 'pending' | 'running' | 'complete' | 'failed';
}

/**
 * Sprint metrics
 */
export interface SprintMetrics {
    /** Tasks completed */
    tasksCompleted: number;
    /** Tasks remaining */
    tasksRemaining: number;
    /** Tasks total */
    tasksTotal: number;
    /** Velocity (tasks per hour) */
    velocity: number;
    /** Estimated remaining time (milliseconds) */
    estimatedRemainingTime: number;
    /** Estimated completion timestamp */
    estimatedCompletionTime: string;
    /** Sprint started at */
    sprintStartedAt: string;
    /** Sprint completed at (if complete) */
    sprintCompletedAt?: string;
    /** Total sprint duration (milliseconds, if complete) */
    totalDuration?: number;
}

/**
 * Progress monitor
 *
 * DESIGN DECISION: Real-time metrics calculation
 * WHY: Velocity updated after each task, accurate estimates
 */
export class ProgressMonitor {
    private executions: Map<string, TaskExecution> = new Map();
    private sprintStartedAt: string | null = null;
    private sprintCompletedAt: string | null = null;

    /**
     * Start sprint
     */
    startSprint(): void {
        this.sprintStartedAt = new Date().toISOString();
        this.sprintCompletedAt = null;
        this.executions.clear();
    }

    /**
     * Complete sprint
     */
    completeSprint(): void {
        this.sprintCompletedAt = new Date().toISOString();
    }

    /**
     * Start task
     */
    startTask(taskId: string, agentType: string): void {
        const execution: TaskExecution = {
            taskId,
            agentType,
            startedAt: new Date().toISOString(),
            status: 'running',
        };

        this.executions.set(taskId, execution);
    }

    /**
     * Complete task
     */
    completeTask(taskId: string): void {
        const execution = this.executions.get(taskId);
        if (!execution) {
            return;
        }

        execution.completedAt = new Date().toISOString();
        execution.duration = new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime();
        execution.status = 'complete';

        this.executions.set(taskId, execution);
    }

    /**
     * Fail task
     */
    failTask(taskId: string): void {
        const execution = this.executions.get(taskId);
        if (!execution) {
            return;
        }

        execution.completedAt = new Date().toISOString();
        execution.duration = new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime();
        execution.status = 'failed';

        this.executions.set(taskId, execution);
    }

    /**
     * Get sprint metrics
     *
     * @param tasksTotal - Total tasks in sprint
     */
    getMetrics(tasksTotal: number): SprintMetrics {
        const now = Date.now();
        const sprintStart = this.sprintStartedAt ? new Date(this.sprintStartedAt).getTime() : now;
        const elapsedTime = now - sprintStart;

        // Count completed tasks
        const completedExecutions = Array.from(this.executions.values()).filter(
            e => e.status === 'complete'
        );
        const tasksCompleted = completedExecutions.length;
        const tasksRemaining = tasksTotal - tasksCompleted;

        // Calculate velocity (tasks per hour)
        const elapsedHours = elapsedTime / (1000 * 60 * 60);
        const velocity = elapsedHours > 0 ? tasksCompleted / elapsedHours : 0;

        // Estimate remaining time
        const estimatedRemainingTime = velocity > 0 ? (tasksRemaining / velocity) * (1000 * 60 * 60) : 0;
        const estimatedCompletionTime = new Date(now + estimatedRemainingTime).toISOString();

        // Total duration (if sprint complete)
        const totalDuration = this.sprintCompletedAt
            ? new Date(this.sprintCompletedAt).getTime() - sprintStart
            : undefined;

        return {
            tasksCompleted,
            tasksRemaining,
            tasksTotal,
            velocity,
            estimatedRemainingTime,
            estimatedCompletionTime,
            sprintStartedAt: this.sprintStartedAt || new Date().toISOString(),
            sprintCompletedAt: this.sprintCompletedAt || undefined,
            totalDuration,
        };
    }

    /**
     * Get task execution
     */
    getTaskExecution(taskId: string): TaskExecution | null {
        return this.executions.get(taskId) || null;
    }

    /**
     * Get all executions
     */
    getAllExecutions(): TaskExecution[] {
        return Array.from(this.executions.values());
    }

    /**
     * Format duration
     *
     * DESIGN DECISION: Human-readable duration (2h 15m)
     * WHY: User-friendly display in webview
     */
    static formatDuration(milliseconds: number): string {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Format time remaining
     *
     * DESIGN DECISION: Relative time (in 2 hours 15 minutes)
     * WHY: User-friendly, emphasizes urgency
     */
    static formatTimeRemaining(milliseconds: number): string {
        return `in ${ProgressMonitor.formatDuration(milliseconds)}`;
    }

    /**
     * Export to JSON (for persistence)
     */
    toJSON(): object {
        return {
            sprintStartedAt: this.sprintStartedAt,
            sprintCompletedAt: this.sprintCompletedAt,
            executions: Array.from(this.executions.entries()),
        };
    }

    /**
     * Import from JSON (for recovery)
     */
    fromJSON(json: any): void {
        this.sprintStartedAt = json.sprintStartedAt;
        this.sprintCompletedAt = json.sprintCompletedAt;
        this.executions = new Map(json.executions);
    }
}
