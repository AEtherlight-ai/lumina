/**
 * Workflow Module - Sprint execution and state management
 *
 * DESIGN DECISION: Unified workflow module for all sprint lifecycle management
 * WHY: Central location for state machine, persistence, controller
 *
 * EXPORTS:
 * - WorkflowStateMachine: State transitions (NOT_STARTED → IN_PROGRESS → COMPLETE)
 * - WorkflowPersistence: Save/load state (survives VS Code restarts)
 * - WorkflowController: Orchestrate sprint execution
 * - WorkflowState: State enum
 * - WorkflowSnapshot: Lightweight state representation
 * - WorkflowEventListener: Subscribe to workflow events
 *
 * PATTERN: Pattern-MODULE-001 (Unified Module Exports)
 * RELATED: AS-015 (Workflow State Machine)
 */

export {
    WorkflowStateMachine,
    WorkflowState,
    WorkflowSnapshot,
    StateTransition,
} from './state_machine';

export { WorkflowPersistence } from './persistence';

export {
    WorkflowController,
    WorkflowEventListener,
} from './controller';
