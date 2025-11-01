/**
 * Agent Coordination View - Webview Provider
 *
 * DESIGN DECISION: VS Code Webview with Gantt chart visualization
 * WHY: User requirement "Gantt chart of task timeline" + "Task dependencies visualized"
 *
 * REASONING CHAIN:
 * 1. TreeView (UI-001) shows current state snapshot
 * 2. Webview (UI-002) shows timeline history + dependencies
 * 3. Gantt chart displays tasks as horizontal bars on timeline
 * 4. Arrows show dependencies (Task A → Task B)
 * 5. Handoff points highlighted when tasks transfer
 * 6. Result: Complete workflow visualization with dependency tracking
 *
 * PATTERN: Pattern-UI-002 (Gantt Chart Webview)
 * RELATED: SprintProgressPanel (UI-001), StatusBarManager (UI-003)
 * PERFORMANCE: <200ms to render 50 tasks
 */

import * as vscode from 'vscode';
import * as path from 'path';
import {
    CoordinationSnapshot,
    TaskTimelineItem,
    HandoffPoint,
    ActivityLogEntry,
    WebviewMessage,
    ExtensionMessage,
    DEFAULT_GANTT_CONFIG
} from './types';
import { SprintProgressSnapshot } from '../sprint_progress_panel/types';

/**
 * Webview provider for agent coordination view
 *
 * DESIGN DECISION: Persistent webview (not recreated on show)
 * WHY: Maintains state, faster to show/hide, preserves scroll position
 */
export class AgentCoordinationViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'luminaAgentCoordination';

    private _view?: vscode.WebviewView;
    private currentSnapshot: CoordinationSnapshot | null = null;
    private filterAgent: string | null = null;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext
    ) {}

    /**
     * Resolve webview view (called by VS Code when view becomes visible)
     */
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void | Thenable<void> {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'webview')
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage((message: ExtensionMessage) => {
            this._handleWebviewMessage(message);
        });

        // Send initial data if available
        if (this.currentSnapshot) {
            this._postMessage({
                type: 'update',
                snapshot: this.currentSnapshot
            });
        }
    }

    /**
     * Update coordination snapshot (called by IPC client)
     *
     * PERFORMANCE: <50ms to convert SprintProgressSnapshot to CoordinationSnapshot
     */
    public updateFromSprintSnapshot(sprintSnapshot: SprintProgressSnapshot): void {
        // Convert SprintProgressSnapshot to CoordinationSnapshot
        const coordinationSnapshot = this._convertToCoordinationSnapshot(sprintSnapshot);
        this.currentSnapshot = coordinationSnapshot;

        // Post to webview if visible
        if (this._view) {
            this._postMessage({
                type: 'update',
                snapshot: coordinationSnapshot
            });
        }
    }

    /**
     * Clear coordination view (called when sprint stops)
     */
    public clear(): void {
        this.currentSnapshot = null;
        this.filterAgent = null;

        if (this._view) {
            this._postMessage({
                type: 'update',
                snapshot: null as any // Webview will show "No sprint active"
            });
        }
    }

    /**
     * Handle messages from webview
     */
    private _handleWebviewMessage(message: ExtensionMessage): void {
        switch (message.type) {
            case 'ready':
                // Webview initialized, send current data
                if (this.currentSnapshot) {
                    this._postMessage({
                        type: 'update',
                        snapshot: this.currentSnapshot
                    });
                }
                break;

            case 'request_update':
                // Webview requesting fresh data
                if (this.currentSnapshot) {
                    this._postMessage({
                        type: 'update',
                        snapshot: this.currentSnapshot
                    });
                }
                break;

            case 'focus_terminal':
                // User clicked agent swimlane, focus terminal
                vscode.commands.executeCommand('lumina.focusAgentTerminal', message.agent);
                break;

            case 'open_task_detail':
                // User clicked task, show detail (future feature)
                vscode.window.showInformationMessage(
                    `Task detail: ${message.task_id} (Feature coming soon)`
                );
                break;
        }
    }

    /**
     * Post message to webview
     */
    private _postMessage(message: WebviewMessage): void {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }

    /**
     * Convert SprintProgressSnapshot to CoordinationSnapshot
     *
     * DESIGN DECISION: Bridge between TreeView model and Gantt chart model
     * WHY: TreeView shows current state, Gantt chart shows timeline history
     */
    private _convertToCoordinationSnapshot(
        sprintSnapshot: SprintProgressSnapshot
    ): CoordinationSnapshot {
        // Extract tasks from agents
        const tasks: TaskTimelineItem[] = [];
        const handoffs: HandoffPoint[] = [];
        const activityLog: ActivityLogEntry[] = [];

        // Parse sprint start time
        const sprintStart = new Date(sprintSnapshot.timestamp);
        sprintStart.setSeconds(sprintStart.getSeconds() - sprintSnapshot.sprint.elapsed_seconds);

        // Convert each agent's tasks
        for (const agent of sprintSnapshot.agents) {
            if (agent.current_task) {
                tasks.push({
                    id: agent.current_task.id,
                    name: agent.current_task.name,
                    agent: agent.type,
                    status: agent.status === 'running' ? 'running' : 'done',
                    start_time: null, // TODO: Track task start times in orchestrator
                    duration: agent.current_task.eta_seconds || 3600,
                    progress: agent.current_task.progress,
                    dependencies: [], // TODO: Extract from sprint plan
                    is_approval_gate: false
                });

                // Add activity log entry for running task
                if (agent.status === 'running') {
                    activityLog.push({
                        timestamp: sprintSnapshot.sprint.elapsed_seconds,
                        agent: agent.type,
                        event: 'task_started',
                        task_id: agent.current_task.id,
                        message: `${agent.type} started ${agent.current_task.name}`
                    });
                }
            }

            if (agent.next_task) {
                tasks.push({
                    id: agent.next_task.id,
                    name: agent.next_task.name,
                    agent: agent.type,
                    status: 'pending',
                    start_time: null,
                    duration: agent.next_task.eta_seconds || 3600,
                    progress: 0,
                    dependencies: [],
                    is_approval_gate: false
                });
            }
        }

        return {
            sprint_name: sprintSnapshot.sprint.name,
            sprint_start: sprintStart.toISOString(),
            current_time: sprintSnapshot.timestamp,
            elapsed_seconds: sprintSnapshot.sprint.elapsed_seconds,
            tasks,
            handoffs,
            activity_log: activityLog,
            overall_progress: sprintSnapshot.sprint.progress,
            eta_seconds: sprintSnapshot.sprint.eta_seconds
        };
    }

    /**
     * Get HTML for webview
     *
     * DESIGN DECISION: Inline HTML + CSS + JavaScript (not separate files)
     * WHY: Simpler deployment, no file loading issues, CSP easier to manage
     */
    private _getHtmlForWebview(webview: vscode.Webview): string {
        // Get VS Code theme colors
        const isDark = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline';">
    <title>Agent Coordination</title>
    <style>
        body {
            padding: 10px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
        }

        #header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        #sprint-name {
            font-size: 18px;
            font-weight: bold;
        }

        #sprint-progress {
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
        }

        #gantt-container {
            overflow-x: auto;
            overflow-y: auto;
            max-height: 500px;
            border: 1px solid var(--vscode-panel-border);
            margin-bottom: 20px;
        }

        #gantt-chart {
            position: relative;
            min-width: 1200px;
        }

        .swimlane {
            height: 60px;
            border-bottom: 1px solid var(--vscode-panel-border);
            position: relative;
            cursor: pointer;
        }

        .swimlane:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .swimlane-label {
            position: absolute;
            left: 10px;
            top: 20px;
            font-weight: bold;
            width: 150px;
        }

        .task-bar {
            position: absolute;
            top: 15px;
            height: 30px;
            border-radius: 4px;
            padding: 5px;
            color: white;
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            cursor: pointer;
            transition: opacity 0.2s;
        }

        .task-bar:hover {
            opacity: 0.8;
        }

        .task-bar.pending {
            background-color: #9E9E9E;
        }

        .task-bar.running {
            background-color: #2196F3;
            animation: pulse 2s infinite;
        }

        .task-bar.done {
            background-color: #4CAF50;
        }

        .task-bar.failed {
            background-color: #F44336;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }

        .dependency-arrow {
            position: absolute;
            stroke: var(--vscode-foreground);
            stroke-width: 2;
            fill: none;
            opacity: 0.5;
        }

        #activity-log {
            border: 1px solid var(--vscode-panel-border);
            max-height: 200px;
            overflow-y: auto;
            padding: 10px;
        }

        .activity-entry {
            padding: 5px;
            border-bottom: 1px solid var(--vscode-panel-border);
            font-size: 12px;
        }

        .activity-timestamp {
            color: var(--vscode-descriptionForeground);
            margin-right: 10px;
        }

        .activity-agent {
            font-weight: bold;
            margin-right: 10px;
        }

        .no-sprint {
            text-align: center;
            padding: 50px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div id="content">
        <div class="no-sprint">No sprint currently active. Start a sprint to see coordination view.</div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        // Request initial data
        vscode.postMessage({ type: 'ready' });

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;

            if (message.type === 'update') {
                if (message.snapshot) {
                    renderCoordinationView(message.snapshot);
                } else {
                    renderNoSprint();
                }
            }
        });

        function renderNoSprint() {
            document.getElementById('content').innerHTML =
                '<div class="no-sprint">No sprint currently active. Start a sprint to see coordination view.</div>';
        }

        function renderCoordinationView(snapshot) {
            const elapsed = formatDuration(snapshot.elapsed_seconds);
            const eta = snapshot.eta_seconds !== null ? formatDuration(snapshot.eta_seconds) : 'unknown';
            const progress = Math.round(snapshot.overall_progress * 100);

            let html = '<div id="header">' +
                '<div>' +
                '<div id="sprint-name">' + snapshot.sprint_name + '</div>' +
                '<div id="sprint-progress">Progress: ' + progress + '% | Elapsed: ' + elapsed + ' | ETA: ' + eta + '</div>' +
                '</div>' +
                '</div>' +
                '<div id="gantt-container">' +
                '<div id="gantt-chart">' +
                renderGanttChart(snapshot) +
                '</div>' +
                '</div>' +
                '<h3>Activity Log</h3>' +
                '<div id="activity-log">' +
                renderActivityLog(snapshot.activity_log) +
                '</div>';

            document.getElementById('content').innerHTML = html;

            // Add event listeners
            document.querySelectorAll('.swimlane').forEach(swimlane => {
                swimlane.addEventListener('click', (e) => {
                    const agent = swimlane.dataset.agent;
                    vscode.postMessage({ type: 'focus_terminal', agent });
                });
            });

            document.querySelectorAll('.task-bar').forEach(taskBar => {
                taskBar.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const taskId = taskBar.dataset.taskId;
                    vscode.postMessage({ type: 'open_task_detail', task_id: taskId });
                });
            });
        }

        function renderGanttChart(snapshot) {
            const agents = ['Database', 'UI', 'API', 'Infrastructure', 'Test', 'Docs', 'Review', 'Commit', 'Planning'];
            let html = '';

            agents.forEach((agent, index) => {
                const agentTasks = snapshot.tasks.filter(t => t.agent === agent);
                html += '<div class="swimlane" data-agent="' + agent + '">' +
                    '<div class="swimlane-label">' + getAgentIcon(agent) + ' ' + agent + '</div>' +
                    renderAgentTasks(agentTasks, snapshot.elapsed_seconds) +
                '</div>';
            });

            return html;
        }

        function renderAgentTasks(tasks, elapsedSeconds) {
            let html = '';
            tasks.forEach(task => {
                const startPos = task.start_time !== null ? task.start_time * 0.05 + 170 : 170;
                const width = task.duration * 0.05;
                const progressWidth = width * task.progress;

                html += '<div class="task-bar ' + task.status + '"' +
                    ' data-task-id="' + task.id + '"' +
                    ' style="left: ' + startPos + 'px; width: ' + width + 'px;"' +
                    ' title="' + task.id + ': ' + task.name + '">' +
                    task.id +
                '</div>';
            });
            return html;
        }

        function renderActivityLog(entries) {
            if (entries.length === 0) {
                return '<div class="activity-entry">No activity yet.</div>';
            }

            let html = '';
            // Show most recent first
            const sorted = entries.slice().reverse();
            sorted.forEach(entry => {
                const timestamp = formatDuration(entry.timestamp);
                html += '<div class="activity-entry">' +
                    '<span class="activity-timestamp">' + timestamp + '</span>' +
                    '<span class="activity-agent">' + entry.agent + '</span>' +
                    '<span>' + entry.message + '</span>' +
                '</div>';
            });

            return html;
        }

        function getAgentIcon(agent) {
            const icons = {
                'Database': '🗄️',
                'UI': '🎨',
                'API': '🔌',
                'Infrastructure': '⚙️',
                'Test': '🧪',
                'Docs': '📝',
                'Review': '👀',
                'Commit': '💾',
                'Planning': '🗓️'
            };
            return icons[agent] || '❓';
        }

        function formatDuration(seconds) {
            if (seconds < 60) {
                return Math.round(seconds) + 's';
            } else if (seconds < 3600) {
                const minutes = Math.floor(seconds / 60);
                const secs = Math.round(seconds % 60);
                return minutes + 'm ' + secs + 's';
            } else {
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                return hours + 'h ' + minutes + 'm';
            }
        }
    </script>
</body>
</html>`;
    }
}

/**
 * Register agent coordination view with VS Code
 */
export function registerAgentCoordinationView(
    context: vscode.ExtensionContext
): AgentCoordinationViewProvider {
    const provider = new AgentCoordinationViewProvider(
        context.extensionUri,
        context
    );

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            AgentCoordinationViewProvider.viewType,
            provider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true // Keep state when hidden
                }
            }
        )
    );

    return provider;
}
