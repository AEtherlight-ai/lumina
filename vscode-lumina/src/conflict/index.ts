/**
 * Conflict Module - File modification conflict detection and resolution
 *
 * DESIGN DECISION: Unified conflict module for detection, resolution, monitoring
 * WHY: Single interface for workflow controller
 *
 * EXPORTS:
 * - ConflictDetector: Detect file lock conflicts
 * - ConflictResolver: Resolve conflicts with multiple strategies
 * - ConflictMonitor: Proactive monitoring with automatic resolution
 * - ResolutionStrategy: Strategy enumeration (SEQUENTIAL, MERGE, MANUAL, CANCEL)
 * - ConflictDetection: Detection result type
 * - ResolutionResult: Resolution result type
 * - FileLock: Lock entry type
 * - FileOperationIntent: Operation intent type
 * - ConflictEventListener: Event listener interface
 *
 * PATTERN: Pattern-MODULE-001 (Unified Module Exports)
 * RELATED: AS-016 (Conflict Detection & Resolution)
 */

export {
    ConflictDetector,
    FileLock,
    ConflictDetection,
} from './detector';

export {
    ConflictResolver,
    ResolutionStrategy,
    ResolutionResult,
} from './resolver';

export {
    ConflictMonitor,
    FileOperationIntent,
    ConflictEventListener,
} from './monitor';
