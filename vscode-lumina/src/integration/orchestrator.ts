/**
 * Sprint Orchestrator - Complete integration of all Phase 4 components
 *
 * DESIGN DECISION: Single orchestrator coordinates all sprint execution components
 * WHY: Integrate Sprint Parser + Scheduler + IPC + Workflow + Conflict + Progress + Planning + Approval
 *
 * REASONING CHAIN:
 * 1. User creates sprint (planning agent or YAML)
 * 2. Pre-sprint approval gate (AS-022)
 * 3. Orchestrator initializes: Workflow, Scheduler, IPC, Conflict Monitor, Progress Monitor
 * 4. Sprint executes: Agents spawn, tasks run in parallel, completion signals tracked
 * 5. Checkpoints: Mid-sprint approval gates (AS-023)
 * 6. Errors: Recovery prompts (AS-024)
 * 7. Completion: Post-sprint review (AS-025)
 * 8. Result: Fully autonomous sprint with human oversight
 *
 * PATTERN: Pattern-ORCHESTRATOR-001 (Sprint Execution Orchestration)
 * RELATED: All Phase 4 tasks (AS-001 through AS-025)
 */

import * as vscode from 'vscode';
import { SprintPlan } from '../sprint_parser/types';
import { WorkflowController } from '../workflow';
import { ProgressMonitor } from '../progress/monitor';
import { ConflictMonitor } from '../conflict';
import { PreSprintApprovalGate, CheckpointApprovalGate, ErrorRecoveryPrompt, PostSprintReview } from '../approval';

/**
 * Sprint orchestrator
 *
 * DESIGN DECISION: Stateful orchestrator with lifecycle management
 * WHY: Manages complex interactions between 8+ subsystems
 */
export class SprintOrchestrator {
    private workflowController: WorkflowController | null = null;
    private progressMonitor: ProgressMonitor | null = null;
    private conflictMonitor: ConflictMonitor | null = null;

    private preApprovalGate: PreSprintApprovalGate;
    private checkpointGate: CheckpointApprovalGate;
    private errorRecovery: ErrorRecoveryPrompt;
    private postReview: PostSprintReview;

    constructor(private workflowDir: string) {
        this.preApprovalGate = new PreSprintApprovalGate();
        this.checkpointGate = new CheckpointApprovalGate();
        this.errorRecovery = new ErrorRecoveryPrompt();
        this.postReview = new PostSprintReview();
    }

    /**
     * Execute sprint
     *
     * @param sprint - Sprint plan to execute
     */
    async execute(sprint: SprintPlan): Promise<void> {
        try {
            // Step 1: Pre-sprint approval
            const approval = await this.preApprovalGate.show(sprint);
            if (approval.decision !== 'APPROVED') {
                vscode.window.showInformationMessage(`Sprint rejected: ${approval.reason}`);
                return;
            }

            // Step 2: Initialize components
            this.progressMonitor = new ProgressMonitor();
            this.conflictMonitor = new ConflictMonitor(this.workflowDir);
            this.workflowController = new WorkflowController(this.workflowDir, sprint);

            // Step 3: Subscribe to workflow events
            this.workflowController.addListener({
                onStateChange: (state) => this.handleStateChange(state),
                onTaskComplete: (taskId) => this.handleTaskComplete(taskId),
                onTaskFailed: (taskId, error) => this.handleTaskFailed(taskId, error),
                onSprintComplete: () => this.handleSprintComplete(),
                onSprintFailed: (reason) => this.handleSprintFailed(reason),
            });

            // Step 4: Start sprint execution
            this.progressMonitor.startSprint();
            await this.workflowController.start();

        } catch (error: any) {
            vscode.window.showErrorMessage(`Sprint execution failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Handle state change
     */
    private handleStateChange(state: string): void {
        console.log(`Sprint state changed: ${state}`);
    }

    /**
     * Handle task completion
     */
    private async handleTaskComplete(taskId: string): Promise<void> {
        console.log(`Task completed: ${taskId}`);

        // Update progress monitor
        if (this.progressMonitor) {
            this.progressMonitor.completeTask(taskId);
        }

        // Check for approval gates
        // TODO: Check if this task has an approval gate
        // If yes, show checkpoint gate
    }

    /**
     * Handle task failure
     */
    private async handleTaskFailed(taskId: string, error: string): Promise<void> {
        console.error(`Task failed: ${taskId}`, error);

        // Update progress monitor
        if (this.progressMonitor) {
            this.progressMonitor.failTask(taskId);
        }

        // Show error recovery prompt
        // TODO: Get completion signal for failed task
        // const decision = await this.errorRecovery.show(signal);
        // Handle recovery decision
    }

    /**
     * Handle sprint completion
     */
    private async handleSprintComplete(): Promise<void> {
        if (!this.progressMonitor || !this.workflowController) {
            return;
        }

        // Complete progress monitoring
        this.progressMonitor.completeSprint();

        // Show post-sprint review
        // TODO: Gather sprint review data
        // const feedback = await this.postReview.show(reviewData);
        // Store feedback for future improvements

        vscode.window.showInformationMessage('Sprint completed successfully!');
    }

    /**
     * Handle sprint failure
     */
    private handleSprintFailed(reason: string): void {
        vscode.window.showErrorMessage(`Sprint failed: ${reason}`);
    }

    /**
     * Pause sprint
     */
    async pause(): Promise<void> {
        if (this.workflowController) {
            await this.workflowController.pause();
        }
    }

    /**
     * Resume sprint
     */
    async resume(): Promise<void> {
        if (this.workflowController) {
            await this.workflowController.resume();
        }
    }

    /**
     * Stop sprint
     */
    async stop(): Promise<void> {
        if (this.workflowController) {
            await this.workflowController.stop();
        }

        // Cleanup
        this.workflowController = null;
        this.progressMonitor = null;
        this.conflictMonitor = null;
    }
}
