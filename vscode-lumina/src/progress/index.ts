/**
 * Progress Module - Sprint execution progress monitoring
 *
 * DESIGN DECISION: Unified progress module for webview, metrics, status bar
 * WHY: Single interface for all progress monitoring components
 *
 * EXPORTS:
 * - ProgressWebviewProvider: TreeView side panel for detailed progress
 * - ProgressMonitor: Sprint execution metrics (velocity, ETA)
 * - SprintStatusBar: Bottom-right status bar integration
 * - SprintMetrics: Metrics type
 * - TaskExecution: Task execution record type
 *
 * PATTERN: Pattern-MODULE-001 (Unified Module Exports)
 * RELATED: AS-017 (Progress Monitoring UI)
 */

export {
    ProgressWebviewProvider,
    ProgressTreeItem,
} from './webview_provider';

export {
    ProgressMonitor,
    SprintMetrics,
    TaskExecution,
} from './monitor';

export {
    SprintStatusBar,
} from './status_bar';
