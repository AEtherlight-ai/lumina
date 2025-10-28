/**
 * Status Bar Integration - Sprint status in VS Code status bar
 *
 * DESIGN DECISION: Bottom-right status bar item with progress indicator
 * WHY: Always visible, shows sprint state at a glance
 *
 * REASONING CHAIN:
 * 1. Sprint starts
 * 2. Status bar shows: "Sprint: IN_PROGRESS (3/10 tasks)"
 * 3. Task completes
 * 4. Status bar updates: "Sprint: IN_PROGRESS (4/10 tasks)"
 * 5. Sprint completes
 * 6. Status bar shows: "Sprint: COMPLETE (10/10 tasks) ✅"
 * 7. Result: User always knows sprint status without opening panel
 *
 * PATTERN: Pattern-UI-002 (Status Bar Integration)
 * RELATED: AS-017 (Progress Monitoring)
 */

import * as vscode from 'vscode';
import { WorkflowController, WorkflowState, WorkflowSnapshot } from '../workflow';
import { SprintMetrics, ProgressMonitor } from './monitor';

/**
 * Status bar integration
 */
export class SprintStatusBar {
    private statusBarItem: vscode.StatusBarItem;
    private workflow: WorkflowController | null = null;
    private monitor: ProgressMonitor | null = null;

    constructor() {
        // Create status bar item (right side, high priority)
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100  // Priority
        );

        // Click opens progress panel
        this.statusBarItem.command = 'lumina.showSprintProgress';
        this.statusBarItem.show();

        // Initial text
        this.updateText('No active sprint', '⏹');
    }

    /**
     * Set workflow controller
     */
    setWorkflow(workflow: WorkflowController, monitor: ProgressMonitor): void {
        this.workflow = workflow;
        this.monitor = monitor;

        // Subscribe to workflow events
        workflow.addListener({
            onStateChange: (state) => this.onStateChange(state),
            onTaskComplete: (taskId) => this.onTaskComplete(taskId),
        });

        // Initial update
        this.update();
    }

    /**
     * Clear workflow
     */
    clearWorkflow(): void {
        this.workflow = null;
        this.monitor = null;
        this.updateText('No active sprint', '⏹');
    }

    /**
     * Update status bar
     */
    private update(): void {
        if (!this.workflow || !this.monitor) {
            return;
        }

        const snapshot = this.workflow.getSnapshot();
        const icon = this.getStateIcon(snapshot.state);
        const text = this.formatStatus(snapshot);

        this.updateText(text, icon);
    }

    /**
     * Update status bar text
     */
    private updateText(text: string, icon: string): void {
        this.statusBarItem.text = `${icon} ${text}`;
    }

    /**
     * Format status text
     */
    private formatStatus(snapshot: WorkflowSnapshot): string {
        const progress = `${snapshot.tasksCompleted}/${snapshot.tasksCompleted + snapshot.tasksRemaining}`;

        switch (snapshot.state) {
            case WorkflowState.NOT_STARTED:
                return `Sprint: NOT_STARTED`;

            case WorkflowState.IN_PROGRESS:
                return `Sprint: IN_PROGRESS (${progress} tasks)`;

            case WorkflowState.PAUSED:
                return `Sprint: PAUSED (${progress} tasks)`;

            case WorkflowState.COMPLETE:
                return `Sprint: COMPLETE (${progress} tasks)`;

            case WorkflowState.FAILED:
                return `Sprint: FAILED (${progress} tasks)`;

            default:
                return `Sprint: UNKNOWN`;
        }
    }

    /**
     * Get state icon
     */
    private getStateIcon(state: WorkflowState): string {
        switch (state) {
            case WorkflowState.NOT_STARTED:
                return '⏹';
            case WorkflowState.IN_PROGRESS:
                return '🟢';
            case WorkflowState.PAUSED:
                return '⏸';
            case WorkflowState.COMPLETE:
                return '✅';
            case WorkflowState.FAILED:
                return '❌';
            default:
                return '❓';
        }
    }

    /**
     * Handle state change
     */
    private onStateChange(state: WorkflowState): void {
        this.update();
    }

    /**
     * Handle task completion
     */
    private onTaskComplete(taskId: string): void {
        this.update();
    }

    /**
     * Show progress panel (command handler)
     */
    static registerCommands(context: vscode.ExtensionContext): void {
        const command = vscode.commands.registerCommand('lumina.showSprintProgress', () => {
            // Focus on progress panel
            vscode.commands.executeCommand('workbench.view.extension.lumina-sprint-progress');
        });

        context.subscriptions.push(command);
    }

    /**
     * Dispose
     */
    dispose(): void {
        this.statusBarItem.dispose();
    }
}
