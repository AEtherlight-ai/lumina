/**
 * Approval Module - Human oversight gates for autonomous sprints
 *
 * DESIGN DECISION: Unified approval module for all human review points
 * WHY: Single interface for pre-sprint, mid-sprint, error, and post-sprint gates
 *
 * EXPORTS:
 * - PreSprintApprovalGate: Review before sprint execution
 * - CheckpointApprovalGate: Review after critical tasks
 * - ErrorRecoveryPrompt: Handle task failures
 * - PostSprintReview: Review after sprint completion
 * - ApprovalDecision: Approval decision enum
 * - ApprovalResult: Approval result type
 * - CheckpointDecision: Checkpoint decision type
 * - RecoveryAction: Recovery action enum
 * - RecoveryDecision: Recovery decision type
 * - SprintReviewData: Sprint review data type
 * - SprintFeedback: User feedback type
 *
 * PATTERN: Pattern-MODULE-001 (Unified Module Exports)
 * RELATED: AS-022 through AS-025 (Human Approval Gates)
 */

export {
    PreSprintApprovalGate,
    ApprovalDecision,
    ApprovalResult,
    SprintRisk,
} from './pre_sprint_gate';

export {
    CheckpointApprovalGate,
    CheckpointDecision,
} from './checkpoint_gate';

export {
    ErrorRecoveryPrompt,
    RecoveryAction,
    RecoveryDecision,
} from './error_recovery';

export {
    PostSprintReview,
    SprintReviewData,
    SprintFeedback,
} from './post_sprint_review';
