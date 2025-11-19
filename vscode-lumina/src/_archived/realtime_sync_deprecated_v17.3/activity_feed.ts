/**
 * Real-Time Activity Feed UI
 *
 * DESIGN DECISION: TreeView sidebar panel with real-time updates
 * WHY: Non-intrusive, persistent visibility of team activity
 *
 * REASONING CHAIN:
 * 1. VS Code TreeView API = familiar UI pattern
 * 2. Real-time updates via WebSocket event listener
 * 3. Grouped by event type (Design Decisions, Blockers, Discoveries)
 * 4. Color coding: 🎨 Design (blue), 🚧 Blocker (red), 💡 Discovery (green)
 * 5. Click to open files + show context diff
 *
 * PATTERN: Pattern-UI-001 (Real-Time Activity Feed)
 * RELATED: client.ts, hooks.ts
 * PERFORMANCE: <200ms UI update, non-blocking
 */

import * as vscode from 'vscode';
import { SyncEvent, SyncEventType, ConnectionState } from './types';
import { RealtimeSyncClient } from './client';

/**
 * Activity Feed Tree Item
 *
 * DESIGN DECISION: Hierarchical structure (event type → events)
 * WHY: Groups related events together for easy scanning
 */
class ActivityFeedItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly event?: SyncEvent,
        public readonly eventType?: SyncEventType
    ) {
        super(label, collapsibleState);

        if (event) {
            // Event item (leaf node)
            this.tooltip = this.buildTooltip(event);
            this.description = this.buildDescription(event);
            this.contextValue = 'syncEvent';
            this.iconPath = this.getIcon(event.event_type);

            // Command to show event details on click
            this.command = {
                command: 'lumina.showEventDetails',
                title: 'Show Event Details',
                arguments: [event],
            };
        } else if (eventType) {
            // Group item (parent node)
            this.contextValue = 'eventTypeGroup';
            this.iconPath = this.getIcon(eventType);
        }
    }

    private buildTooltip(event: SyncEvent): string {
        const time = new Date(event.timestamp).toLocaleTimeString();
        return [
            `${event.title}`,
            ``,
            `User: ${event.user}`,
            `Time: ${time}`,
            `Terminal: ${event.terminal_id.substring(0, 8)}...`,
            event.project ? `Project: ${event.project}` : '',
            ``,
            `${event.description}`,
        ].filter(Boolean).join('\n');
    }

    private buildDescription(event: SyncEvent): string {
        const time = new Date(event.timestamp).toLocaleTimeString();
        return `${event.user} • ${time}`;
    }

    private getIcon(eventType: SyncEventType): vscode.ThemeIcon {
        switch (eventType) {
            case SyncEventType.DesignDecision:
                return new vscode.ThemeIcon('symbol-event', new vscode.ThemeColor('charts.blue'));
            case SyncEventType.Blocker:
                return new vscode.ThemeIcon('warning', new vscode.ThemeColor('charts.red'));
            case SyncEventType.Discovery:
                return new vscode.ThemeIcon('lightbulb', new vscode.ThemeColor('charts.green'));
            default:
                return new vscode.ThemeIcon('info');
        }
    }
}

/**
 * Activity Feed Tree Data Provider
 *
 * DESIGN DECISION: In-memory event store with 100-event limit
 * WHY: Balance memory usage vs history depth
 */
export class ActivityFeedProvider implements vscode.TreeDataProvider<ActivityFeedItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<ActivityFeedItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private events: SyncEvent[] = [];
    private readonly MAX_EVENTS = 100;

    constructor(private client: RealtimeSyncClient) {
        // Listen for incoming events
        this.client.on('event', (event) => {
            this.addEvent(event);
        });

        // Listen for state changes (show connection status)
        this.client.on('stateChange', (state) => {
            console.log(`[Activity Feed] Connection state: ${state}`);
            this.refresh();
        });
    }

    /**
     * Add event to feed
     *
     * DESIGN DECISION: Prepend new events (most recent first)
     * WHY: Users care about latest activity
     */
    private addEvent(event: SyncEvent): void {
        this.events.unshift(event); // Prepend (newest first)

        // Trim to max events
        if (this.events.length > this.MAX_EVENTS) {
            this.events = this.events.slice(0, this.MAX_EVENTS);
        }

        this.refresh();

        // Show notification for blockers (optional, can be disabled)
        if (event.event_type === SyncEventType.Blocker) {
            vscode.window.showWarningMessage(
                `🚧 Blocker: ${event.title} (${event.user})`,
                'View Details'
            ).then((selection) => {
                if (selection === 'View Details') {
                    vscode.commands.executeCommand('lumina.showEventDetails', event);
                }
            });
        }
    }

    /**
     * Refresh tree view
     */
    public refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Clear all events
     */
    public clear(): void {
        this.events = [];
        this.refresh();
    }

    /**
     * Get tree item
     */
    getTreeItem(element: ActivityFeedItem): vscode.TreeItem {
        return element;
    }

    /**
     * Get children (implements tree hierarchy)
     *
     * DESIGN DECISION: Group by event type → events
     * WHY: Easy scanning of related events
     */
    async getChildren(element?: ActivityFeedItem): Promise<ActivityFeedItem[]> {
        if (!element) {
            // Root level: Show connection status + event type groups
            const state = this.client.getState();

            if (state === ConnectionState.Disconnected || state === ConnectionState.Reconnecting) {
                return [
                    new ActivityFeedItem(
                        state === ConnectionState.Reconnecting ? '🔄 Reconnecting...' : '⚠️ Disconnected',
                        vscode.TreeItemCollapsibleState.None
                    ),
                ];
            }

            if (state === ConnectionState.Connecting) {
                return [
                    new ActivityFeedItem(
                        '🔄 Connecting...',
                        vscode.TreeItemCollapsibleState.None
                    ),
                ];
            }

            // Connected: Show event type groups
            const designDecisions = this.events.filter(e => e.event_type === SyncEventType.DesignDecision);
            const blockers = this.events.filter(e => e.event_type === SyncEventType.Blocker);
            const discoveries = this.events.filter(e => e.event_type === SyncEventType.Discovery);

            const groups: ActivityFeedItem[] = [];

            if (designDecisions.length > 0) {
                groups.push(new ActivityFeedItem(
                    `🎨 Design Decisions (${designDecisions.length})`,
                    vscode.TreeItemCollapsibleState.Expanded,
                    undefined,
                    SyncEventType.DesignDecision
                ));
            }

            if (blockers.length > 0) {
                groups.push(new ActivityFeedItem(
                    `🚧 Blockers (${blockers.length})`,
                    vscode.TreeItemCollapsibleState.Expanded,
                    undefined,
                    SyncEventType.Blocker
                ));
            }

            if (discoveries.length > 0) {
                groups.push(new ActivityFeedItem(
                    `💡 Discoveries (${discoveries.length})`,
                    vscode.TreeItemCollapsibleState.Expanded,
                    undefined,
                    SyncEventType.Discovery
                ));
            }

            if (groups.length === 0) {
                return [
                    new ActivityFeedItem(
                        '📭 No recent activity',
                        vscode.TreeItemCollapsibleState.None
                    ),
                ];
            }

            return groups;
        } else {
            // Child level: Show events for this type
            const eventType = element.eventType;
            if (!eventType) {
                return [];
            }

            const filtered = this.events.filter(e => e.event_type === eventType);
            return filtered.map(event =>
                new ActivityFeedItem(
                    event.title,
                    vscode.TreeItemCollapsibleState.None,
                    event
                )
            );
        }
    }

    /**
     * Get event count by type
     */
    public getEventCounts() {
        return {
            total: this.events.length,
            designDecisions: this.events.filter(e => e.event_type === SyncEventType.DesignDecision).length,
            blockers: this.events.filter(e => e.event_type === SyncEventType.Blocker).length,
            discoveries: this.events.filter(e => e.event_type === SyncEventType.Discovery).length,
        };
    }
}

/**
 * Event Details Webview Panel
 *
 * DESIGN DECISION: Webview panel with context diff viewer
 * WHY: Show full event context + file changes
 */
export class EventDetailsPanel {
    private static currentPanel: EventDetailsPanel | undefined;

    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];

    /**
     * Show event details (singleton pattern)
     */
    public static show(context: vscode.ExtensionContext, event: SyncEvent) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // Reuse existing panel if available
        if (EventDetailsPanel.currentPanel) {
            EventDetailsPanel.currentPanel.panel.reveal(column);
            EventDetailsPanel.currentPanel.update(event);
            return;
        }

        // Create new panel
        const panel = vscode.window.createWebviewPanel(
            'eventDetails',
            'Event Details',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [context.extensionUri],
            }
        );

        EventDetailsPanel.currentPanel = new EventDetailsPanel(panel, event);
    }

    private constructor(panel: vscode.WebviewPanel, event: SyncEvent) {
        this.panel = panel;
        this.update(event);

        // Listen for dispose
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    /**
     * Update webview with event data
     */
    private update(event: SyncEvent) {
        this.panel.title = `${event.event_type}: ${event.title}`;
        this.panel.webview.html = this.getHtmlContent(event);
    }

    /**
     * Generate HTML content
     *
     * DESIGN DECISION: Simple HTML with inline CSS
     * WHY: No external dependencies, works offline
     */
    private getHtmlContent(event: SyncEvent): string {
        const time = new Date(event.timestamp).toLocaleString();
        const iconMap = {
            [SyncEventType.DesignDecision]: '🎨',
            [SyncEventType.Blocker]: '🚧',
            [SyncEventType.Discovery]: '💡',
        };
        const icon = iconMap[event.event_type] || '📄';

        const filesHtml = event.files.length > 0
            ? `<h3>📁 Files</h3><ul>${event.files.map(f => `<li><code>${f}</code></li>`).join('')}</ul>`
            : '';

        const tagsHtml = event.tags.length > 0
            ? `<h3>🏷️ Tags</h3><p>${event.tags.map(t => `<span class="tag">${t}</span>`).join(' ')}</p>`
            : '';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Event Details</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        h1 { margin-top: 0; }
        .meta { color: var(--vscode-descriptionForeground); margin-bottom: 20px; }
        .meta div { margin: 5px 0; }
        .description {
            background-color: var(--vscode-textCodeBlock-background);
            border-left: 3px solid var(--vscode-textLink-foreground);
            padding: 15px;
            margin: 20px 0;
            white-space: pre-wrap;
        }
        code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
        }
        ul { padding-left: 20px; }
        .tag {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 3px 8px;
            border-radius: 3px;
            margin-right: 5px;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <h1>${icon} ${event.title}</h1>

    <div class="meta">
        <div><strong>Type:</strong> ${event.event_type}</div>
        <div><strong>User:</strong> ${event.user}</div>
        <div><strong>Time:</strong> ${time}</div>
        <div><strong>Terminal:</strong> <code>${event.terminal_id}</code></div>
        ${event.project ? `<div><strong>Project:</strong> ${event.project}</div>` : ''}
    </div>

    <h3>📝 Description</h3>
    <div class="description">${event.description}</div>

    ${filesHtml}
    ${tagsHtml}
</body>
</html>`;
    }

    private dispose() {
        EventDetailsPanel.currentPanel = undefined;

        this.panel.dispose();

        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
