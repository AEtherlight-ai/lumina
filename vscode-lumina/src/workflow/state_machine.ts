/**
 * Workflow State Machine - Sprint execution lifecycle management
 *
 * DESIGN DECISION: Explicit state transitions with validation
 * WHY: Prevents invalid state transitions, enables workflow recovery
 *
 * REASONING CHAIN:
 * 1. Sprint starts: NOT_STARTED → IN_PROGRESS
 * 2. User pauses: IN_PROGRESS → PAUSED
 * 3. User resumes: PAUSED → IN_PROGRESS
 * 4. All tasks complete: IN_PROGRESS → COMPLETE
 * 5. Critical failure: ANY → FAILED
 * 6. Result: Predictable workflow lifecycle with recovery
 *
 * PATTERN: Pattern-STATE-MACHINE-001 (Workflow State Management)
 * RELATED: AS-003 (Task Scheduler), AS-014 (File-Based IPC)
 */

/**
 * Workflow state enumeration
 */
export enum WorkflowState {
    /** Sprint not yet started */
    NOT_STARTED = 'NOT_STARTED',
    /** Sprint in progress (tasks executing) */
    IN_PROGRESS = 'IN_PROGRESS',
    /** Sprint paused by user */
    PAUSED = 'PAUSED',
    /** Sprint completed successfully */
    COMPLETE = 'COMPLETE',
    /** Sprint failed (critical error) */
    FAILED = 'FAILED',
}

/**
 * State transition event
 */
export interface StateTransition {
    /** Previous state */
    from: WorkflowState;
    /** New state */
    to: WorkflowState;
    /** Timestamp of transition (ISO 8601) */
    timestamp: string;
    /** Reason for transition */
    reason?: string;
    /** User who triggered transition (if manual) */
    user?: string;
}

/**
 * Workflow state snapshot
 */
export interface WorkflowSnapshot {
    /** Current state */
    state: WorkflowState;
    /** State transition history */
    transitions: StateTransition[];
    /** Tasks completed */
    tasksCompleted: number;
    /** Tasks remaining */
    tasksRemaining: number;
    /** Active agents count */
    activeAgents: number;
    /** Last updated timestamp */
    lastUpdated: string;
}

/**
 * Workflow state machine
 *
 * DESIGN DECISION: Immutable state with event sourcing
 * WHY: Enables state recovery, audit trail, debugging
 *
 * REASONING CHAIN:
 * 1. State stored as transitions history (event sourcing)
 * 2. Current state derived from latest transition
 * 3. All state changes recorded (audit trail)
 * 4. Can replay history for debugging
 * 5. Result: Recoverable, auditable workflow state
 */
export class WorkflowStateMachine {
    private state: WorkflowState;
    private transitions: StateTransition[];
    private tasksCompleted: number = 0;
    private tasksTotal: number;
    private activeAgents: number = 0;

    /**
     * Valid state transitions
     *
     * DESIGN DECISION: Whitelist approach for transitions
     * WHY: Prevents invalid state changes, explicit validation
     */
    private static readonly VALID_TRANSITIONS: Map<WorkflowState, WorkflowState[]> = new Map([
        [WorkflowState.NOT_STARTED, [WorkflowState.IN_PROGRESS, WorkflowState.FAILED]],
        [WorkflowState.IN_PROGRESS, [WorkflowState.PAUSED, WorkflowState.COMPLETE, WorkflowState.FAILED]],
        [WorkflowState.PAUSED, [WorkflowState.IN_PROGRESS, WorkflowState.FAILED]],
        [WorkflowState.COMPLETE, []],  // Terminal state
        [WorkflowState.FAILED, []],    // Terminal state
    ]);

    constructor(tasksTotal: number) {
        this.state = WorkflowState.NOT_STARTED;
        this.transitions = [];
        this.tasksTotal = tasksTotal;
    }

    /**
     * Get current state
     */
    getState(): WorkflowState {
        return this.state;
    }

    /**
     * Get state transition history
     */
    getTransitions(): StateTransition[] {
        return [...this.transitions];
    }

    /**
     * Get workflow snapshot
     */
    getSnapshot(): WorkflowSnapshot {
        return {
            state: this.state,
            transitions: [...this.transitions],
            tasksCompleted: this.tasksCompleted,
            tasksRemaining: this.tasksTotal - this.tasksCompleted,
            activeAgents: this.activeAgents,
            lastUpdated: new Date().toISOString(),
        };
    }

    /**
     * Check if transition is valid
     */
    private isValidTransition(to: WorkflowState): boolean {
        const validTransitions = WorkflowStateMachine.VALID_TRANSITIONS.get(this.state);
        return validTransitions ? validTransitions.includes(to) : false;
    }

    /**
     * Transition to new state
     *
     * @param to - Target state
     * @param reason - Reason for transition (optional)
     * @param user - User who triggered transition (optional)
     * @throws Error if transition is invalid
     */
    transition(to: WorkflowState, reason?: string, user?: string): void {
        if (!this.isValidTransition(to)) {
            throw new Error(
                `Invalid state transition: ${this.state} → ${to}. ` +
                `Valid transitions from ${this.state}: ` +
                `[${WorkflowStateMachine.VALID_TRANSITIONS.get(this.state)?.join(', ') || 'none'}]`
            );
        }

        const transition: StateTransition = {
            from: this.state,
            to,
            timestamp: new Date().toISOString(),
            reason,
            user,
        };

        this.transitions.push(transition);
        this.state = to;
    }

    /**
     * Start sprint
     */
    start(reason?: string): void {
        this.transition(WorkflowState.IN_PROGRESS, reason || 'Sprint started');
    }

    /**
     * Pause sprint
     */
    pause(reason?: string, user?: string): void {
        this.transition(WorkflowState.PAUSED, reason || 'Sprint paused', user);
    }

    /**
     * Resume sprint
     */
    resume(reason?: string, user?: string): void {
        this.transition(WorkflowState.IN_PROGRESS, reason || 'Sprint resumed', user);
    }

    /**
     * Complete sprint
     */
    complete(reason?: string): void {
        this.transition(WorkflowState.COMPLETE, reason || 'Sprint completed successfully');
    }

    /**
     * Fail sprint
     */
    fail(reason: string, user?: string): void {
        this.transition(WorkflowState.FAILED, reason, user);
    }

    /**
     * Update task progress
     *
     * DESIGN DECISION: Auto-transition to COMPLETE when all tasks done
     * WHY: Automatic workflow progression, reduces manual steps
     */
    updateTaskProgress(tasksCompleted: number, activeAgents: number): void {
        this.tasksCompleted = tasksCompleted;
        this.activeAgents = activeAgents;

        // Auto-complete if all tasks done
        if (
            this.state === WorkflowState.IN_PROGRESS &&
            this.tasksCompleted === this.tasksTotal &&
            this.activeAgents === 0
        ) {
            this.complete(`All tasks completed (${this.tasksCompleted}/${this.tasksTotal})`);
        }
    }

    /**
     * Check if workflow is terminal (cannot transition further)
     */
    isTerminal(): boolean {
        return this.state === WorkflowState.COMPLETE || this.state === WorkflowState.FAILED;
    }

    /**
     * Check if workflow is active (can accept task updates)
     */
    isActive(): boolean {
        return this.state === WorkflowState.IN_PROGRESS || this.state === WorkflowState.PAUSED;
    }

    /**
     * Serialize to JSON
     */
    toJSON(): object {
        return {
            state: this.state,
            transitions: this.transitions,
            tasksCompleted: this.tasksCompleted,
            tasksTotal: this.tasksTotal,
            activeAgents: this.activeAgents,
        };
    }

    /**
     * Deserialize from JSON
     *
     * DESIGN DECISION: Replay transitions to reconstruct state
     * WHY: Enables state recovery from disk, consistent with event sourcing
     */
    static fromJSON(json: any): WorkflowStateMachine {
        const machine = new WorkflowStateMachine(json.tasksTotal);

        // Replay transitions
        for (const transition of json.transitions) {
            machine.state = transition.from;
            machine.transition(transition.to, transition.reason, transition.user);
        }

        machine.tasksCompleted = json.tasksCompleted;
        machine.activeAgents = json.activeAgents;

        return machine;
    }
}
