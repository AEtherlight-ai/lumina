/**
 * Workflow Controller - Orchestrate sprint execution
 *
 * DESIGN DECISION: Single controller coordinates all workflow components
 * WHY: Central control point for sprint lifecycle, state management, recovery
 *
 * REASONING CHAIN:
 * 1. User starts sprint
 * 2. Controller creates state machine (NOT_STARTED → IN_PROGRESS)
 * 3. Controller spawns task scheduler
 * 4. Scheduler spawns agents via terminal spawner
 * 5. Agents write completion signals (IPC)
 * 6. Controller monitors signals, updates state machine
 * 7. When all tasks complete: IN_PROGRESS → COMPLETE
 * 8. Result: End-to-end sprint orchestration
 *
 * PATTERN: Pattern-CONTROLLER-001 (Workflow Orchestration)
 * RELATED: AS-003 (Task Scheduler), AS-014 (IPC), AS-015 (State Machine)
 */

import * as vscode from 'vscode';
import { WorkflowStateMachine, WorkflowState, WorkflowSnapshot } from './state_machine';
import { WorkflowPersistence } from './persistence';
// TODO Phase 4: Uncomment when modules implemented
// import { SignalReader } from '../ipc_dogfooding/reader';  // IPC module in TypeScript
// import { TaskScheduler } from '../task_scheduler/scheduler';
// import { SprintPlan } from '../sprint_parser/types';

// Temporary stubs for Phase 4 compilation
class SignalReader {
    constructor(private workflowDir: string) {}
    async list_signals(): Promise<string[]> { return []; }
    async read_signal(taskId: string): Promise<any> { return { status: 'success' }; }
}

class TaskScheduler {
    constructor(private sprint: SprintPlan, private workflowDir: string) {}
    async start(): Promise<void> {}
    async pause(): Promise<void> {}
    async resume(): Promise<void> {}
    async stop(): Promise<void> {}
    async getProgress(): Promise<{ tasksCompleted: number; activeAgents: number }> {
        return { tasksCompleted: 0, activeAgents: 0 };
    }
}

interface SprintPlan {
    tasks: { length: number };
}

/**
 * Workflow event listener
 */
export interface WorkflowEventListener {
    onStateChange?(state: WorkflowState): void;
    onTaskComplete?(taskId: string): void;
    onTaskFailed?(taskId: string, error: string): void;
    onSprintComplete?(): void;
    onSprintFailed?(reason: string): void;
}

/**
 * Workflow controller
 *
 * DESIGN DECISION: Event-driven architecture with listeners
 * WHY: UI can subscribe to workflow events, update progress in real-time
 */
export class WorkflowController {
    private machine: WorkflowStateMachine;
    private persistence: WorkflowPersistence;
    private scheduler: TaskScheduler | null = null;
    private signalReader: SignalReader | null = null;
    private listeners: WorkflowEventListener[] = [];
    private monitoringHandle: NodeJS.Timeout | null = null;

    constructor(
        private workflowDir: string,
        private sprint: SprintPlan
    ) {
        this.machine = new WorkflowStateMachine(sprint.tasks.length);
        this.persistence = new WorkflowPersistence(workflowDir);
    }

    /**
     * Add event listener
     */
    addListener(listener: WorkflowEventListener): void {
        this.listeners.push(listener);
    }

    /**
     * Remove event listener
     */
    removeListener(listener: WorkflowEventListener): void {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    /**
     * Notify listeners of state change
     */
    private notifyStateChange(state: WorkflowState): void {
        this.listeners.forEach(listener => {
            if (listener.onStateChange) {
                listener.onStateChange(state);
            }
        });
    }

    /**
     * Notify listeners of task completion
     */
    private notifyTaskComplete(taskId: string): void {
        this.listeners.forEach(listener => {
            if (listener.onTaskComplete) {
                listener.onTaskComplete(taskId);
            }
        });
    }

    /**
     * Notify listeners of task failure
     */
    private notifyTaskFailed(taskId: string, error: string): void {
        this.listeners.forEach(listener => {
            if (listener.onTaskFailed) {
                listener.onTaskFailed(taskId, error);
            }
        });
    }

    /**
     * Notify listeners of sprint completion
     */
    private notifySprintComplete(): void {
        this.listeners.forEach(listener => {
            if (listener.onSprintComplete) {
                listener.onSprintComplete();
            }
        });
    }

    /**
     * Notify listeners of sprint failure
     */
    private notifySprintFailed(reason: string): void {
        this.listeners.forEach(listener => {
            if (listener.onSprintFailed) {
                listener.onSprintFailed(reason);
            }
        });
    }

    /**
     * Start sprint execution
     *
     * DESIGN DECISION: Idempotent start (can resume from saved state)
     * WHY: Handles VS Code restarts gracefully
     */
    async start(): Promise<void> {
        // Check if resuming from saved state
        const savedMachine = await this.persistence.load();
        if (savedMachine) {
            this.machine = savedMachine;

            if (this.machine.getState() === WorkflowState.PAUSED) {
                vscode.window.showInformationMessage(
                    'Sprint was paused. Click Resume to continue.',
                    'Resume',
                    'Restart'
                ).then(choice => {
                    if (choice === 'Resume') {
                        this.resume();
                    } else if (choice === 'Restart') {
                        this.restart();
                    }
                });
                return;
            }
        }

        // Start new sprint
        try {
            this.machine.start('Sprint started by user');
            this.notifyStateChange(WorkflowState.IN_PROGRESS);

            // Save state
            await this.persistence.save(this.machine);

            // Initialize task scheduler
            this.scheduler = new TaskScheduler(this.sprint, this.workflowDir);

            // Initialize signal reader (for monitoring agent completions)
            this.signalReader = new SignalReader(this.workflowDir);

            // Start monitoring
            this.startMonitoring();

            // Start task execution
            await this.scheduler.start();

        } catch (error: any) {
            this.machine.fail(`Failed to start sprint: ${error.message}`);
            this.notifySprintFailed(error.message);
            await this.persistence.save(this.machine);
        }
    }

    /**
     * Pause sprint execution
     */
    async pause(): Promise<void> {
        if (this.machine.getState() !== WorkflowState.IN_PROGRESS) {
            throw new Error(`Cannot pause sprint in state: ${this.machine.getState()}`);
        }

        this.machine.pause('Sprint paused by user', 'user');
        this.notifyStateChange(WorkflowState.PAUSED);

        // Stop monitoring
        this.stopMonitoring();

        // Pause scheduler
        if (this.scheduler) {
            await this.scheduler.pause();
        }

        // Save state
        await this.persistence.save(this.machine);
    }

    /**
     * Resume sprint execution
     */
    async resume(): Promise<void> {
        if (this.machine.getState() !== WorkflowState.PAUSED) {
            throw new Error(`Cannot resume sprint in state: ${this.machine.getState()}`);
        }

        this.machine.resume('Sprint resumed by user', 'user');
        this.notifyStateChange(WorkflowState.IN_PROGRESS);

        // Restart monitoring
        this.startMonitoring();

        // Resume scheduler
        if (this.scheduler) {
            await this.scheduler.resume();
        }

        // Save state
        await this.persistence.save(this.machine);
    }

    /**
     * Restart sprint from beginning
     */
    async restart(): Promise<void> {
        // Stop current execution
        await this.stop();

        // Delete saved state
        await this.persistence.delete();

        // Create new state machine
        this.machine = new WorkflowStateMachine(this.sprint.tasks.length);

        // Start fresh
        await this.start();
    }

    /**
     * Stop sprint execution
     */
    async stop(): Promise<void> {
        this.stopMonitoring();

        if (this.scheduler) {
            await this.scheduler.stop();
            this.scheduler = null;
        }

        this.signalReader = null;
    }

    /**
     * Start monitoring agent completion signals
     *
     * DESIGN DECISION: Poll signals every 1 second
     * WHY: Filesystem watcher unreliable in some environments, polling ensures detection
     */
    private startMonitoring(): void {
        if (this.monitoringHandle) {
            return;  // Already monitoring
        }

        this.monitoringHandle = setInterval(async () => {
            if (!this.signalReader || !this.scheduler) {
                return;
            }

            // Get all completion signals
            const signals = await this.signalReader.list_signals();

            for (const taskId of signals) {
                const signal = await this.signalReader.read_signal(taskId);

                if (signal.status === 'success') {
                    this.notifyTaskComplete(taskId);
                } else if (signal.status === 'failed') {
                    this.notifyTaskFailed(taskId, signal.error || 'Unknown error');
                }

                // Update state machine progress
                const progress = await this.scheduler.getProgress();
                this.machine.updateTaskProgress(
                    progress.tasksCompleted,
                    progress.activeAgents
                );

                // Save state
                await this.persistence.save(this.machine);
                await this.persistence.saveSnapshot(this.machine.getSnapshot());

                // Check if sprint complete
                if (this.machine.getState() === WorkflowState.COMPLETE) {
                    this.notifySprintComplete();
                    this.stopMonitoring();
                }
            }
        }, 1000);  // Poll every 1 second
    }

    /**
     * Stop monitoring
     */
    private stopMonitoring(): void {
        if (this.monitoringHandle) {
            clearInterval(this.monitoringHandle);
            this.monitoringHandle = null;
        }
    }

    /**
     * Get current workflow state
     */
    getState(): WorkflowState {
        return this.machine.getState();
    }

    /**
     * Get workflow snapshot
     */
    getSnapshot(): WorkflowSnapshot {
        return this.machine.getSnapshot();
    }

    /**
     * Check if workflow is active
     */
    isActive(): boolean {
        return this.machine.isActive();
    }

    /**
     * Check if workflow is terminal
     */
    isTerminal(): boolean {
        return this.machine.isTerminal();
    }
}
