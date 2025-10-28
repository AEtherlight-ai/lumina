/**
 * Agent Coordination View - Type Definitions
 *
 * DESIGN DECISION: Gantt chart timeline with task dependencies
 * WHY: User requirement "Workflow Flow: Visual representation of sprint progress"
 *
 * REASONING CHAIN:
 * 1. Gantt chart shows task timeline horizontally (time axis)
 * 2. Each agent has swimlane showing its tasks
 * 3. Task dependencies visualized with arrows (Task A → Task B)
 * 4. Handoff points highlighted (when Task A completes, Task B can start)
 * 5. Result: Complete workflow visibility with dependency tracking
 *
 * PATTERN: Pattern-UI-002 (Gantt Chart Visualization)
 * RELATED: SprintProgressPanel, StatusBarManager, orchestrator IPC
 * PERFORMANCE: <200ms to render 50 tasks
 */

import { AgentType, AgentStatus } from '../sprint_progress_panel/types';

/**
 * Task timeline item for Gantt chart
 *
 * DESIGN DECISION: Task as time interval with dependencies
 * WHY: Gantt chart requires start time, duration, and dependency links
 */
export interface TaskTimelineItem {
    /** Task ID (e.g., "DB-001", "UI-001") */
    id: string;
    /** Human-readable task name */
    name: string;
    /** Agent assigned to this task */
    agent: AgentType;
    /** Task status */
    status: 'pending' | 'running' | 'done' | 'failed';
    /** Start time in seconds since sprint start (null if not started) */
    start_time: number | null;
    /** Duration in seconds */
    duration: number;
    /** Progress percentage (0.0 to 1.0) */
    progress: number;
    /** Task IDs this task depends on */
    dependencies: string[];
    /** Whether this is an approval gate task */
    is_approval_gate: boolean;
}

/**
 * Handoff point between tasks
 *
 * DESIGN DECISION: Explicit handoff tracking
 * WHY: User requirement "Handoff Visualization: See when Task A → Task B handoff occurs"
 */
export interface HandoffPoint {
    /** Source task ID (completes first) */
    from_task: string;
    /** Target task ID (starts after) */
    to_task: string;
    /** Handoff time in seconds since sprint start (null if not occurred) */
    time: number | null;
    /** Whether handoff has occurred */
    completed: boolean;
}

/**
 * Activity log entry
 *
 * DESIGN DECISION: Timestamped event log
 * WHY: User requirement "Recent activity log (scrollable, timestamped)"
 */
export interface ActivityLogEntry {
    /** Timestamp in seconds since sprint start */
    timestamp: number;
    /** Agent that generated this activity */
    agent: AgentType;
    /** Event type */
    event: 'task_started' | 'task_completed' | 'task_failed' | 'handoff' | 'approval_requested' | 'approval_granted';
    /** Task ID related to this activity */
    task_id: string;
    /** Human-readable message */
    message: string;
}

/**
 * Complete coordination snapshot for webview
 *
 * This is the data structure sent via postMessage to webview
 */
export interface CoordinationSnapshot {
    /** Sprint name */
    sprint_name: string;
    /** Sprint start time (ISO 8601) */
    sprint_start: string;
    /** Current time (ISO 8601) */
    current_time: string;
    /** Elapsed time in seconds */
    elapsed_seconds: number;
    /** All tasks in sprint */
    tasks: TaskTimelineItem[];
    /** All handoff points */
    handoffs: HandoffPoint[];
    /** Recent activity log (last 50 entries) */
    activity_log: ActivityLogEntry[];
    /** Overall sprint progress (0.0 to 1.0) */
    overall_progress: number;
    /** Estimated time to completion in seconds (null if unknown) */
    eta_seconds: number | null;
}

/**
 * Gantt chart visual configuration
 */
export interface GanttChartConfig {
    /** Width of timeline in pixels */
    timeline_width: number;
    /** Height per swimlane in pixels */
    swimlane_height: number;
    /** Pixels per second on timeline */
    pixels_per_second: number;
    /** Color scheme for agents */
    agent_colors: Record<AgentType, string>;
    /** Color scheme for task status */
    status_colors: {
        pending: string;
        running: string;
        done: string;
        failed: string;
    };
}

/**
 * Default Gantt chart configuration
 *
 * DESIGN DECISION: Hardcoded defaults with user customization later
 * WHY: MVP needs working chart, user customization is Phase 5 feature
 */
export const DEFAULT_GANTT_CONFIG: GanttChartConfig = {
    timeline_width: 1200,
    swimlane_height: 60,
    pixels_per_second: 0.05, // 1 pixel = 20 seconds
    agent_colors: {
        [AgentType.Database]: '#4CAF50',      // Green
        [AgentType.UI]: '#2196F3',            // Blue
        [AgentType.API]: '#FF9800',           // Orange
        [AgentType.Infrastructure]: '#9C27B0',// Purple
        [AgentType.Test]: '#F44336',          // Red
        [AgentType.Docs]: '#00BCD4',          // Cyan
        [AgentType.Review]: '#FFEB3B',        // Yellow
        [AgentType.Commit]: '#795548',        // Brown
        [AgentType.Planning]: '#607D8B'       // Blue Grey
    },
    status_colors: {
        pending: '#9E9E9E',   // Grey
        running: '#2196F3',   // Blue
        done: '#4CAF50',      // Green
        failed: '#F44336'     // Red
    }
};

/**
 * Message types for webview communication
 *
 * DESIGN DECISION: Typed message protocol
 * WHY: Type safety across extension ↔ webview boundary
 */
export type WebviewMessage =
    | { type: 'update'; snapshot: CoordinationSnapshot }
    | { type: 'filter'; agent: AgentType | null }
    | { type: 'focus_task'; task_id: string }
    | { type: 'focus_agent'; agent: AgentType };

/**
 * Webview to extension messages
 */
export type ExtensionMessage =
    | { type: 'ready' }
    | { type: 'request_update' }
    | { type: 'focus_terminal'; agent: AgentType }
    | { type: 'open_task_detail'; task_id: string };
