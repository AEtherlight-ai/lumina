/**
 * Status Bar Manager - Sprint Status Indicator
 *
 * DESIGN DECISION: Single status bar item with click-to-expand
 * WHY: Minimal UI footprint, always visible, one click to details
 *
 * REASONING CHAIN:
 * 1. Status bar is always visible at bottom of VS Code
 * 2. Sprint status should be immediately glanceable
 * 3. Color codes provide instant recognition (🟢/🟡/🔴/⚪)
 * 4. Text shows progress (e.g., "Sprint: OAuth2 (3/8) 40%")
 * 5. Click → opens AgentCoordinationView webview
 * 6. Result: Sprint status always visible, details one click away
 *
 * PATTERN: Pattern-UI-003 (Status Bar Sprint Indicator)
 * RELATED: SprintProgressPanel (UI-001), AgentCoordinationView (UI-002)
 * PERFORMANCE: <10ms to update status bar
 */

import * as vscode from 'vscode';
import {
    StatusBarInfo,
    SprintStatusBarState,
    StatusBarConfig,
    DEFAULT_STATUS_BAR_CONFIG,
    STATUS_BAR_ICONS,
    STATUS_BAR_COLORS,
    STATUS_BAR_TOOLTIPS
} from './types';
import { SprintProgressSnapshot } from '../sprint_progress_panel/types';

/**
 * Status bar manager for sprint status indicator
 *
 * DESIGN DECISION: Singleton manager with VS Code StatusBarItem
 * WHY: Single status bar item, needs lifecycle management
 */
export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;
    private config: StatusBarConfig;
    private currentInfo: StatusBarInfo | null = null;

    constructor(config: StatusBarConfig = DEFAULT_STATUS_BAR_CONFIG) {
        this.config = config;

        // Create status bar item
        const alignment = config.alignment === 'left'
            ? vscode.StatusBarAlignment.Left
            : vscode.StatusBarAlignment.Right;

        this.statusBarItem = vscode.window.createStatusBarItem(
            alignment,
            config.priority
        );

        // Command: Open AgentCoordinationView when clicked
        this.statusBarItem.command = 'lumina.openAgentCoordination';

        // Initially hidden (no sprint active)
        this.statusBarItem.hide();
    }

    /**
     * Update status bar from sprint progress snapshot
     *
     * PERFORMANCE: <10ms to update text + color
     */
    public updateFromSprintSnapshot(snapshot: SprintProgressSnapshot): void {
        // Convert SprintProgressSnapshot to StatusBarInfo
        const info = this._convertToStatusBarInfo(snapshot);
        this.currentInfo = info;

        // Update status bar display
        this._updateDisplay(info);

        // Show status bar (if hidden)
        this.statusBarItem.show();
    }

    /**
     * Update status bar with explicit state
     *
     * DESIGN DECISION: Allow manual state updates (not just from snapshot)
     * WHY: Sprint pause/resume may not trigger snapshot update immediately
     */
    public updateState(state: SprintStatusBarState, info?: Partial<StatusBarInfo>): void {
        if (this.currentInfo) {
            this.currentInfo.state = state;
            if (info) {
                Object.assign(this.currentInfo, info);
            }
            this._updateDisplay(this.currentInfo);
        } else if (info && 'sprint_name' in info && 'total_tasks' in info) {
            // Create new info if none exists
            this.currentInfo = {
                state,
                sprint_name: info.sprint_name!,
                completed_tasks: info.completed_tasks ?? 0,
                total_tasks: info.total_tasks!,
                progress: info.progress ?? 0
            };
            this._updateDisplay(this.currentInfo);
            this.statusBarItem.show();
        }
    }

    /**
     * Clear status bar (called when sprint stops/completes)
     */
    public clear(): void {
        this.currentInfo = null;
        this.statusBarItem.hide();
    }

    /**
     * Dispose status bar item (cleanup)
     */
    public dispose(): void {
        this.statusBarItem.dispose();
    }

    /**
     * Convert SprintProgressSnapshot to StatusBarInfo
     */
    private _convertToStatusBarInfo(snapshot: SprintProgressSnapshot): StatusBarInfo {
        // Map sprint.state to StatusBarState
        let state: SprintStatusBarState;
        switch (snapshot.sprint.state) {
            case 'running':
                state = SprintStatusBarState.Running;
                break;
            case 'paused':
                state = SprintStatusBarState.Paused;
                break;
            case 'complete':
                state = SprintStatusBarState.Complete;
                break;
            case 'failed':
                state = SprintStatusBarState.Failed;
                break;
            default:
                state = SprintStatusBarState.Idle;
        }

        return {
            state,
            sprint_name: snapshot.sprint.name,
            completed_tasks: snapshot.sprint.completed_tasks,
            total_tasks: snapshot.sprint.total_tasks,
            progress: snapshot.sprint.progress
        };
    }

    /**
     * Update status bar display
     *
     * DESIGN DECISION: Compose text from config options
     * WHY: Users can customize what info to show
     */
    private _updateDisplay(info: StatusBarInfo): void {
        // Get icon for current state
        const icon = STATUS_BAR_ICONS[info.state];

        // Build text based on config
        const parts: string[] = [icon];

        if (this.config.show_sprint_name) {
            // Truncate sprint name if too long
            const maxLength = 20;
            const sprintName = info.sprint_name.length > maxLength
                ? info.sprint_name.substring(0, maxLength) + '...'
                : info.sprint_name;
            parts.push(sprintName);
        }

        if (this.config.show_task_count) {
            parts.push(`(${info.completed_tasks}/${info.total_tasks})`);
        }

        if (this.config.show_percentage) {
            const percentage = Math.round(info.progress * 100);
            parts.push(`${percentage}%`);
        }

        // Join parts with space
        this.statusBarItem.text = parts.join(' ');

        // Set color based on state
        const color = STATUS_BAR_COLORS[info.state];
        this.statusBarItem.color = color;

        // Set tooltip
        const baseTooltip = STATUS_BAR_TOOLTIPS[info.state];
        if (info.state === SprintStatusBarState.Running) {
            // Add progress info to tooltip
            const percentage = Math.round(info.progress * 100);
            this.statusBarItem.tooltip = `${baseTooltip}\n\n${info.sprint_name}\nProgress: ${info.completed_tasks}/${info.total_tasks} tasks (${percentage}%)`;
        } else {
            this.statusBarItem.tooltip = baseTooltip;
        }
    }
}

/**
 * Register status bar manager with VS Code
 *
 * DESIGN DECISION: Separate registration function
 * WHY: Allows extension.ts to manage lifecycle, enables testing
 */
export function registerStatusBarManager(
    context: vscode.ExtensionContext,
    config?: StatusBarConfig
): StatusBarManager {
    const manager = new StatusBarManager(config);

    // Register command: Open AgentCoordinationView
    const openCoordinationCommand = vscode.commands.registerCommand(
        'lumina.openAgentCoordination',
        () => {
            // Focus AgentCoordinationView webview
            vscode.commands.executeCommand('luminaAgentCoordination.focus');
        }
    );

    context.subscriptions.push(openCoordinationCommand);
    context.subscriptions.push(manager);

    return manager;
}
