/**
 * Progress Webview Provider - VS Code webview for sprint monitoring
 *
 * DESIGN DECISION: TreeView-style side panel with real-time updates
 * WHY: Non-intrusive, always visible, auto-updates with workflow events
 *
 * REASONING CHAIN:
 * 1. User starts sprint
 * 2. Webview opens in side panel (Activity Bar)
 * 3. Shows: Sprint name, state, tasks (pending/running/complete), active agents
 * 4. Workflow controller emits events (task complete, agent spawned, etc.)
 * 5. Webview updates in real-time (<100ms)
 * 6. Result: User sees progress without switching windows
 *
 * PATTERN: Pattern-UI-001 (Real-Time Progress Webview)
 * RELATED: AS-015 (Workflow State Machine), AS-017 (Progress Monitoring)
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as toml from '@iarna/toml';
import { WorkflowController, WorkflowState, WorkflowSnapshot } from '../workflow';
import { SprintPlan } from '../sprint_parser/types';
import { SprintTask, TaskStatus } from '../commands/SprintLoader';

/**
 * Progress webview provider
 *
 * DESIGN DECISION: VS Code TreeView for hierarchical display
 * WHY: Native VS Code UI, integrates with Activity Bar, expandable/collapsible
 */
export class ProgressWebviewProvider implements vscode.TreeDataProvider<ProgressTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<ProgressTreeItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private workflow: WorkflowController | null = null;
    private sprint: SprintPlan | null = null;
    private snapshot: WorkflowSnapshot | null = null;
    private taskStatusMap: Map<string, TaskStatus> = new Map();

    constructor() {
        // Register tree view
        vscode.window.createTreeView('luminaSprintProgress', {
            treeDataProvider: this,
            showCollapseAll: true,
        });
    }

    /**
     * Set workflow controller
     *
     * DESIGN DECISION: Subscribe to workflow events for real-time updates
     * WHY: Auto-refresh UI when tasks complete or state changes
     */
    setWorkflow(workflow: WorkflowController, sprint: SprintPlan): void {
        this.workflow = workflow;
        this.sprint = sprint;

        // Subscribe to workflow events
        workflow.addListener({
            onStateChange: (state) => this.onStateChange(state),
            onTaskComplete: (taskId) => this.onTaskComplete(taskId),
            onTaskFailed: (taskId, error) => this.onTaskFailed(taskId, error),
        });

        // Initial refresh
        this.refresh();
    }

    /**
     * Clear workflow
     */
    clearWorkflow(): void {
        this.workflow = null;
        this.sprint = null;
        this.snapshot = null;
        this.refresh();
    }

    /**
     * Refresh tree view
     */
    private refresh(): void {
        if (this.workflow) {
            this.snapshot = this.workflow.getSnapshot();
        }
        // Reload task statuses from TOML file
        this.loadTaskStatuses();
        this._onDidChangeTreeData.fire();
    }

    /**
     * Load task statuses from sprint TOML file
     *
     * DESIGN DECISION: Direct TOML parsing for real-time status
     * WHY: Webview needs to show current task statuses from file
     */
    private loadTaskStatuses(): void {
        try {
            // Find workspace root
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            if (!workspaceRoot) {
                return;
            }

            // Find sprint file
            const sprintPath = path.join(workspaceRoot, 'internal', 'sprints', 'ACTIVE_SPRINT.toml');
            if (!fs.existsSync(sprintPath)) {
                return;
            }

            // Parse TOML
            const tomlContent = fs.readFileSync(sprintPath, 'utf-8');
            const parsed = toml.parse(tomlContent) as any;

            // Extract task statuses
            this.taskStatusMap.clear();
            if (parsed.tasks) {
                for (const taskId in parsed.tasks) {
                    const task = parsed.tasks[taskId];
                    if (task.status) {
                        this.taskStatusMap.set(taskId, task.status as TaskStatus);
                    }
                }
            }
        } catch (error) {
            // Silently ignore errors - task statuses are optional
            console.log('[ÆtherLight] Failed to load task statuses:', error);
        }
    }

    /**
     * Handle state change
     */
    private onStateChange(state: WorkflowState): void {
        this.refresh();

        // Show notification for terminal states
        if (state === WorkflowState.COMPLETE) {
            vscode.window.showInformationMessage('✅ Sprint completed successfully!');
        } else if (state === WorkflowState.FAILED) {
            vscode.window.showErrorMessage('❌ Sprint failed!');
        }
    }

    /**
     * Handle task completion
     */
    private onTaskComplete(taskId: string): void {
        this.refresh();
        vscode.window.showInformationMessage(`✅ Task ${taskId} completed`);
    }

    /**
     * Handle task failure
     */
    private onTaskFailed(taskId: string, error: string): void {
        this.refresh();
        vscode.window.showErrorMessage(`❌ Task ${taskId} failed: ${error}`);
    }

    /**
     * Get tree item
     */
    getTreeItem(element: ProgressTreeItem): vscode.TreeItem {
        return element;
    }

    /**
     * Get children
     *
     * DESIGN DECISION: Hierarchical tree structure
     * WHY: Sprint → Summary → Tasks → Agents
     *
     * Tree Structure:
     * - Sprint Name
     *   - Summary (state, progress, active agents)
     *   - Tasks
     *     - Task 1 (✅/🟡/⏸/❌)
     *     - Task 2 (✅/🟡/⏸/❌)
     *   - Active Agents
     *     - Agent 1 (task ID)
     *     - Agent 2 (task ID)
     */
    getChildren(element?: ProgressTreeItem): Thenable<ProgressTreeItem[]> {
        if (!this.sprint || !this.snapshot) {
            return Promise.resolve([
                new ProgressTreeItem('No active sprint', '', vscode.TreeItemCollapsibleState.None, 'info'),
            ]);
        }

        // Root level: Sprint name
        if (!element) {
            const sprintName = (this.sprint.metadata?.name as string) || 'Unnamed Sprint';
            return Promise.resolve([
                new ProgressTreeItem(
                    `Sprint: ${sprintName}`,
                    sprintName,
                    vscode.TreeItemCollapsibleState.Expanded,
                    'sprint'
                ),
            ]);
        }

        // Level 1: Summary, Tasks, Active Agents
        if (element.contextValue === 'sprint') {
            return Promise.resolve([
                new ProgressTreeItem('Summary', 'summary', vscode.TreeItemCollapsibleState.Expanded, 'summary'),
                new ProgressTreeItem('Tasks', 'tasks', vscode.TreeItemCollapsibleState.Expanded, 'tasks'),
                new ProgressTreeItem('Active Agents', 'agents', vscode.TreeItemCollapsibleState.Expanded, 'agents'),
            ]);
        }

        // Level 2: Summary details
        if (element.contextValue === 'summary') {
            const state = this.getStateIcon(this.snapshot.state);
            return Promise.resolve([
                new ProgressTreeItem(`State: ${state} ${this.snapshot.state}`, '', vscode.TreeItemCollapsibleState.None, 'info'),
                new ProgressTreeItem(`Progress: ${this.snapshot.tasksCompleted}/${this.snapshot.tasksCompleted + this.snapshot.tasksRemaining}`, '', vscode.TreeItemCollapsibleState.None, 'info'),
                new ProgressTreeItem(`Active Agents: ${this.snapshot.activeAgents}`, '', vscode.TreeItemCollapsibleState.None, 'info'),
            ]);
        }

        // Level 2: Task list
        if (element.contextValue === 'tasks') {
            return Promise.resolve(
                this.sprint!.tasks.map(task => {
                    const status = this.getTaskStatus(task.id);
                    const icon = this.getTaskIcon(status);
                    return new ProgressTreeItem(
                        `${icon} ${task.id}: ${task.description}`,
                        task.id,
                        vscode.TreeItemCollapsibleState.None,
                        'task'
                    );
                })
            );
        }

        // Level 2: Active agents
        if (element.contextValue === 'agents') {
            // TODO: Get active agents from scheduler
            return Promise.resolve([
                new ProgressTreeItem('(No active agents)', '', vscode.TreeItemCollapsibleState.None, 'info'),
            ]);
        }

        return Promise.resolve([]);
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
     * Get task status from loaded sprint TOML file
     *
     * DESIGN DECISION: Look up status from taskStatusMap
     * WHY: Shows real-time task statuses from sprint file
     */
    private getTaskStatus(taskId: string): 'pending' | 'running' | 'complete' | 'failed' {
        const status = this.taskStatusMap.get(taskId);

        // Map TaskStatus to webview status format
        if (status === 'in_progress') {
            return 'running';
        } else if (status === 'completed') {
            return 'complete';
        } else if (status === 'pending') {
            return 'pending';
        }

        // Default to pending if not found
        return 'pending';
    }

    /**
     * Get task icon
     */
    private getTaskIcon(status: 'pending' | 'running' | 'complete' | 'failed'): string {
        switch (status) {
            case 'pending':
                return '⏸';
            case 'running':
                return '🟡';
            case 'complete':
                return '✅';
            case 'failed':
                return '❌';
            default:
                return '❓';
        }
    }
}

/**
 * Progress tree item
 */
export class ProgressTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly id: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string
    ) {
        super(label, collapsibleState);
        this.id = id;
        this.contextValue = contextValue;
    }
}
