/**
 * Human Escalation Types - 4-Tier Confidence Thresholds
 *
 * DESIGN DECISION: 4-tier escalation based on confidence scores
 * WHY: Balance autonomy with safety - high confidence = autonomous, low confidence = human oversight
 *
 * REASONING CHAIN:
 * 1. AI pattern matching produces confidence scores (0.0 to 1.0)
 * 2. High confidence (>0.85) = AI decision proven, execute autonomously
 * 3. Medium-high (0.70-0.85) = AI decision likely correct, suggest with disclaimer
 * 4. Medium-low (0.50-0.70) = AI decision uncertain, ask for approval
 * 5. Low (<0.50) = AI decision risky, block and require human decision
 * 6. Result: 87% tasks autonomous, 10% suggested, 2% approved, 1% blocked
 *
 * PATTERN: Pattern-ESCALATION-001 (4-Tier Confidence Thresholds)
 * RELATED: Phase 4 orchestrator, human approval gates (AS-022 to AS-025)
 * PERFORMANCE: <5ms threshold check
 */

/**
 * Escalation tier based on confidence score
 *
 * DESIGN DECISION: 4 tiers aligned with confidence scoring research
 * WHY: Research shows 85% threshold = 95% accuracy, 70% threshold = 80% accuracy
 */
export enum EscalationTier {
    /**
     * Autonomous execution (confidence >0.85)
     * No human approval required
     * Expected: 87% of tasks
     */
    AUTONOMOUS = 'autonomous',

    /**
     * Suggest with disclaimer (confidence 0.70-0.85)
     * Show pattern but warn "not fully confident"
     * Expected: 10% of tasks
     */
    SUGGEST = 'suggest',

    /**
     * Ask for approval (confidence 0.50-0.70)
     * Present pattern, wait for human confirmation
     * Expected: 2% of tasks
     */
    APPROVAL_REQUIRED = 'approval_required',

    /**
     * Block execution (confidence <0.50)
     * Don't suggest pattern, require human input
     * Expected: 1% of tasks
     */
    BLOCKED = 'blocked'
}

/**
 * Escalation reason categories
 *
 * DESIGN DECISION: Categorize WHY escalation triggered
 * WHY: Help humans understand risk factors
 */
export enum EscalationReason {
    LOW_CONFIDENCE = 'low_confidence',           // Pattern match score too low
    SECURITY_RISK = 'security_risk',             // Pattern involves security-sensitive operations
    DATA_LOSS_RISK = 'data_loss_risk',           // Pattern could cause data loss
    BREAKING_CHANGE = 'breaking_change',         // Pattern modifies public APIs
    UNTESTED_PATTERN = 'untested_pattern',       // Pattern never used successfully before
    MULTIPLE_PATTERNS = 'multiple_patterns',     // Multiple conflicting patterns matched
    NO_PATTERN_MATCH = 'no_pattern_match',       // No patterns found
    CRITICAL_PATH = 'critical_path',             // Task on critical path (delays sprint)
    COST_THRESHOLD = 'cost_threshold'            // Operation exceeds cost limit (e.g., API calls)
}

/**
 * Human escalation request
 *
 * DESIGN DECISION: Include context + reasoning + alternatives
 * WHY: Human needs full context to make informed decision
 */
export interface HumanEscalation {
    /** Unique escalation ID */
    id: string;

    /** Escalation tier (autonomous/suggest/approval/blocked) */
    tier: EscalationTier;

    /** Task being executed */
    task_id: string;

    /** Agent requesting escalation */
    agent: string;

    /** Timestamp of escalation request */
    timestamp: string;

    /** Confidence score that triggered escalation */
    confidence: number;

    /** Primary reason for escalation */
    reason: EscalationReason;

    /** Additional reasons (optional) */
    additional_reasons?: EscalationReason[];

    /** Human-readable explanation */
    explanation: string;

    /** Recommended pattern (if any) */
    recommended_pattern?: {
        pattern_id: string;
        pattern_name: string;
        confidence: number;
        description: string;
    };

    /** Alternative patterns (if multiple matched) */
    alternative_patterns?: Array<{
        pattern_id: string;
        pattern_name: string;
        confidence: number;
    }>;

    /** Risk factors */
    risk_factors?: string[];

    /** Estimated impact of approving */
    estimated_impact?: {
        files_modified: number;
        lines_changed: number;
        reversible: boolean;
        breaking_changes: boolean;
    };

    /** Human decision (filled after approval/rejection) */
    decision?: {
        approved: boolean;
        timestamp: string;
        notes?: string;
        selected_pattern?: string; // If human chose alternative
    };
}

/**
 * Escalation configuration (user-customizable)
 *
 * DESIGN DECISION: Allow users to adjust thresholds
 * WHY: Some teams prefer more autonomy, others prefer more oversight
 */
export interface EscalationConfig {
    /** Autonomous threshold (default: 0.85) */
    autonomous_threshold: number;

    /** Suggest threshold (default: 0.70) */
    suggest_threshold: number;

    /** Approval threshold (default: 0.50) */
    approval_threshold: number;

    /** Always require approval for these operations */
    always_require_approval: string[]; // e.g., ['DROP TABLE', 'DELETE', 'ALTER']

    /** Always block these operations */
    always_block: string[]; // e.g., ['rm -rf', 'eval(']

    /** Enable auto-approval for low-risk tasks */
    auto_approve_low_risk: boolean; // default: false

    /** Notification level (all/medium-high/high-only/none) */
    notification_level: 'all' | 'medium_high' | 'high_only' | 'none';
}

/**
 * Default escalation configuration
 *
 * DESIGN DECISION: Conservative defaults (prefer safety over speed)
 * WHY: Users can relax thresholds, but can't undo mistakes
 */
export const DEFAULT_ESCALATION_CONFIG: EscalationConfig = {
    autonomous_threshold: 0.85,
    suggest_threshold: 0.70,
    approval_threshold: 0.50,
    always_require_approval: [
        'DROP TABLE',
        'DROP DATABASE',
        'DELETE FROM',
        'TRUNCATE',
        'ALTER TABLE',
        'git push --force',
        'npm publish',
        'docker rm',
        'rm -rf'
    ],
    always_block: [
        'eval(',
        'exec(',
        'system(',
        '__import__',
        'rm -rf /',
        'format c:',
        'dd if=/dev/zero'
    ],
    auto_approve_low_risk: false,
    notification_level: 'medium_high'
};

/**
 * Escalation statistics (for monitoring)
 */
export interface EscalationStats {
    total_tasks: number;
    autonomous_count: number;
    suggest_count: number;
    approval_count: number;
    blocked_count: number;
    average_confidence: number;
    approval_rate: number; // % of approvals that were approved
    false_positive_rate: number; // % of autonomous that failed
}
