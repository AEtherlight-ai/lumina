/**
 * Status Bar Manager - Type Definitions
 *
 * DESIGN DECISION: Minimal status indicator with color codes
 * WHY: Glanceable sprint status without taking editor space
 *
 * REASONING CHAIN:
 * 1. Status bar is always visible (bottom of VS Code)
 * 2. Sprint status should be immediately recognizable
 * 3. Color codes: 🟢 (running), 🟡 (paused), 🔴 (failed), ⚪ (idle)
 * 4. Click status bar → opens AgentCoordinationView
 * 5. Result: Sprint status always visible, one click to details
 *
 * PATTERN: Pattern-UI-003 (Status Bar Sprint Indicator)
 * RELATED: SprintProgressPanel, AgentCoordinationView
 */

/**
 * Sprint status for status bar display
 *
 * DESIGN DECISION: 4-state model matching sprint execution states
 * WHY: Aligns with sprint lifecycle (idle → running → paused/failed → complete)
 */
export enum SprintStatusBarState {
    /** No sprint active */
    Idle = 'idle',
    /** Sprint is running */
    Running = 'running',
    /** Sprint is paused by user */
    Paused = 'paused',
    /** Sprint failed (task failed, approval rejected) */
    Failed = 'failed',
    /** Sprint completed successfully */
    Complete = 'complete'
}

/**
 * Status bar display information
 */
export interface StatusBarInfo {
    /** Current sprint state */
    state: SprintStatusBarState;
    /** Sprint name (e.g., "OAuth2 Authentication") */
    sprint_name: string;
    /** Completed tasks count */
    completed_tasks: number;
    /** Total tasks count */
    total_tasks: number;
    /** Overall progress (0.0 to 1.0) */
    progress: number;
}

/**
 * Status bar configuration
 */
export interface StatusBarConfig {
    /** Status bar alignment (left or right) */
    alignment: 'left' | 'right';
    /** Status bar priority (higher = more left/right) */
    priority: number;
    /** Show progress percentage (true) or just icon (false) */
    show_percentage: boolean;
    /** Show task count (e.g., "3/8") */
    show_task_count: boolean;
    /** Show sprint name (truncate if too long) */
    show_sprint_name: boolean;
}

/**
 * Default status bar configuration
 *
 * DESIGN DECISION: Right-aligned with progress + task count
 * WHY: Right side less cluttered, progress is most important info
 */
export const DEFAULT_STATUS_BAR_CONFIG: StatusBarConfig = {
    alignment: 'right',
    priority: 100, // High priority (left-most on right side)
    show_percentage: true,
    show_task_count: true,
    show_sprint_name: true
};

/**
 * Status bar icons for each state
 *
 * DESIGN DECISION: Circle icons with color codes
 * WHY: Instantly recognizable status without reading text
 */
export const STATUS_BAR_ICONS = {
    [SprintStatusBarState.Idle]: '⚪',       // White circle (no sprint)
    [SprintStatusBarState.Running]: '🟢',   // Green circle (running)
    [SprintStatusBarState.Paused]: '🟡',    // Yellow circle (paused)
    [SprintStatusBarState.Failed]: '🔴',    // Red circle (failed)
    [SprintStatusBarState.Complete]: '✅'   // Checkmark (complete)
} as const;

/**
 * Status bar colors (VS Code StatusBarItem.color)
 *
 * DESIGN DECISION: Use VS Code theme colors for consistency
 * WHY: Matches VS Code theme, doesn't look out of place
 */
export const STATUS_BAR_COLORS = {
    [SprintStatusBarState.Idle]: undefined, // Default foreground
    [SprintStatusBarState.Running]: undefined, // Default foreground (icon provides color)
    [SprintStatusBarState.Paused]: 'statusBarItem.warningForeground',
    [SprintStatusBarState.Failed]: 'statusBarItem.errorForeground',
    [SprintStatusBarState.Complete]: undefined
} as const;

/**
 * Status bar tooltips for each state
 *
 * DESIGN DECISION: Informative tooltips with action hint
 * WHY: Users may not know clicking opens coordination view
 */
export const STATUS_BAR_TOOLTIPS = {
    [SprintStatusBarState.Idle]: 'No sprint active. Click to start sprint planning.',
    [SprintStatusBarState.Running]: 'Sprint running. Click to view agent coordination.',
    [SprintStatusBarState.Paused]: 'Sprint paused. Click to view details or resume.',
    [SprintStatusBarState.Failed]: 'Sprint failed. Click to view error details.',
    [SprintStatusBarState.Complete]: 'Sprint complete. Click to view summary.'
} as const;
