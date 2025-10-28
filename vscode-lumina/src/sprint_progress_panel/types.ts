/**
 * Sprint Progress Panel - Type Definitions
 *
 * DESIGN DECISION: Strongly typed agent status model
 * WHY: Ensures type safety across TreeView, IPC, and orchestrator
 *
 * REASONING CHAIN:
 * 1. Need to track 9 specialized agents (Database, UI, API, etc.)
 * 2. Each agent has status (idle/running/done/failed)
 * 3. Each agent has current task with progress percentage
 * 4. TreeView needs structured data for real-time updates
 * 5. Result: Strongly typed AgentStatus model with clear state machine
 *
 * PATTERN: Pattern-UI-001 (Agent Status Model)
 * RELATED: SprintProgressPanel, AgentCoordinationView, status_bar_manager
 * PERFORMANCE: <10ms type checking, zero runtime overhead
 */

/**
 * Agent types in Phase 4 autonomous sprints
 */
export enum AgentType {
    Database = 'Database',
    UI = 'UI',
    API = 'API',
    Infrastructure = 'Infrastructure',
    Test = 'Test',
    Docs = 'Docs',
    Review = 'Review',
    Commit = 'Commit',
    Planning = 'Planning'
}

/**
 * Agent execution status
 *
 * DESIGN DECISION: 4-state model (not 3, not 5)
 * WHY: Covers all meaningful states without over-complexity
 *
 * State machine:
 * idle → running → done (success path)
 * idle → running → failed (error path)
 * running → idle (sprint paused)
 */
export enum AgentStatus {
    /** Agent has no active task */
    Idle = 'idle',
    /** Agent is executing a task */
    Running = 'running',
    /** Agent completed task successfully */
    Done = 'done',
    /** Agent failed task (needs human intervention) */
    Failed = 'failed'
}

/**
 * Task information for an agent
 */
export interface AgentTask {
    /** Task ID (e.g., "DB-001", "UI-001") */
    id: string;
    /** Human-readable task name */
    name: string;
    /** Progress percentage (0.0 to 1.0) */
    progress: number;
    /** Estimated time remaining in seconds (null if unknown) */
    eta_seconds: number | null;
}

/**
 * Complete status for a single agent
 *
 * DESIGN DECISION: Include next_task for visibility
 * WHY: User requirement "Next-In-Line Visibility" (TECHNOLOGY_GAP_AUDIT.md line 303)
 */
export interface AgentStatusInfo {
    /** Agent type */
    type: AgentType;
    /** Current execution status */
    status: AgentStatus;
    /** Current task (null if idle) */
    current_task: AgentTask | null;
    /** Next task in queue (null if queue empty) */
    next_task: AgentTask | null;
    /** Terminal ID for click-to-focus */
    terminal_id: string | null;
}

/**
 * Overall sprint status
 */
export interface SprintStatus {
    /** Sprint name (e.g., "OAuth2 Authentication") */
    name: string;
    /** Total tasks in sprint */
    total_tasks: number;
    /** Completed tasks */
    completed_tasks: number;
    /** Failed tasks */
    failed_tasks: number;
    /** Overall progress (0.0 to 1.0) */
    progress: number;
    /** Elapsed time in seconds */
    elapsed_seconds: number;
    /** Estimated time remaining in seconds (null if unknown) */
    eta_seconds: number | null;
    /** Sprint state (running/paused/complete/failed) */
    state: 'running' | 'paused' | 'complete' | 'failed';
}

/**
 * Complete sprint progress snapshot
 *
 * This is the top-level data structure sent via IPC from orchestrator to TreeView
 */
export interface SprintProgressSnapshot {
    /** Overall sprint status */
    sprint: SprintStatus;
    /** Status for all 9 agents */
    agents: AgentStatusInfo[];
    /** Last update timestamp (ISO 8601) */
    timestamp: string;
}

/**
 * Visual indicator icons for TreeView
 *
 * DESIGN DECISION: Unicode emoji icons (not custom SVGs)
 * WHY: Works in all VS Code themes, zero asset loading, immediately recognizable
 */
export const STATUS_ICONS = {
    [AgentStatus.Idle]: '⏸️',      // Paused/waiting
    [AgentStatus.Running]: '🔄',   // Running/in-progress
    [AgentStatus.Done]: '✅',      // Completed successfully
    [AgentStatus.Failed]: '❌'     // Failed (needs attention)
} as const;

/**
 * Agent type icons for TreeView
 *
 * DESIGN DECISION: Semantic emoji icons matching agent purpose
 * WHY: Instant visual recognition without reading labels
 */
export const AGENT_ICONS = {
    [AgentType.Database]: '🗄️',
    [AgentType.UI]: '🎨',
    [AgentType.API]: '🔌',
    [AgentType.Infrastructure]: '⚙️',
    [AgentType.Test]: '🧪',
    [AgentType.Docs]: '📝',
    [AgentType.Review]: '👀',
    [AgentType.Commit]: '💾',
    [AgentType.Planning]: '🗓️'
} as const;
