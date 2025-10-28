/**
 * Escalation Manager - 4-Tier Confidence Threshold System
 *
 * DESIGN DECISION: Centralized escalation logic with pluggable decision handlers
 * WHY: Single source of truth for thresholds, easy to test, configurable
 *
 * REASONING CHAIN:
 * 1. Agent proposes action with confidence score
 * 2. EscalationManager checks thresholds (autonomous/suggest/approval/blocked)
 * 3. If autonomous (>0.85): Execute immediately, no UI
 * 4. If suggest (0.70-0.85): Show notification with disclaimer
 * 5. If approval (0.50-0.70): Show approval dialog, wait for decision
 * 6. If blocked (<0.50): Show error notification, require manual intervention
 * 7. Result: 87% autonomous, 10% suggested, 2% approved, 1% blocked
 *
 * PATTERN: Pattern-ESCALATION-001 (4-Tier Confidence Thresholds)
 * RELATED: HumanEscalation UI (Escalation-002), Phase 4 orchestrator
 * PERFORMANCE: <5ms threshold check, <200ms UI rendering
 */

import * as vscode from 'vscode';
import {
    EscalationTier,
    EscalationReason,
    HumanEscalation,
    EscalationConfig,
    EscalationStats,
    DEFAULT_ESCALATION_CONFIG
} from './types';

/**
 * Escalation decision (returned to caller)
 */
export interface EscalationDecision {
    /** Whether to proceed with action */
    approved: boolean;

    /** Escalation tier that was applied */
    tier: EscalationTier;

    /** Human-readable message (for logging/UI) */
    message: string;

    /** If approval required, this is the escalation request */
    escalation?: HumanEscalation;
}

/**
 * Escalation Manager - 4-tier confidence-based escalation
 *
 * DESIGN DECISION: Singleton pattern with configuration
 * WHY: Single threshold configuration, shared across all agents
 */
export class EscalationManager {
    private config: EscalationConfig;
    private stats: EscalationStats;
    private escalationHistory: HumanEscalation[] = [];

    constructor(config?: Partial<EscalationConfig>) {
        this.config = { ...DEFAULT_ESCALATION_CONFIG, ...config };
        this.stats = {
            total_tasks: 0,
            autonomous_count: 0,
            suggest_count: 0,
            approval_count: 0,
            blocked_count: 0,
            average_confidence: 0.0,
            approval_rate: 0.0,
            false_positive_rate: 0.0
        };
    }

    /**
     * Check if action should be escalated to human
     *
     * PERFORMANCE: <5ms (threshold check + risk analysis)
     *
     * DESIGN DECISION: Return tier + reasoning, don't block here
     * WHY: Caller decides how to handle UI (async dialog vs sync check)
     */
    public checkEscalation(
        taskId: string,
        agent: string,
        confidence: number,
        patternId?: string,
        actionDescription?: string
    ): EscalationDecision {
        this.stats.total_tasks++;
        this.stats.average_confidence =
            (this.stats.average_confidence * (this.stats.total_tasks - 1) + confidence) /
            this.stats.total_tasks;

        // Check for always-block patterns
        if (actionDescription && this._containsBlockedPattern(actionDescription)) {
            this.stats.blocked_count++;
            return {
                approved: false,
                tier: EscalationTier.BLOCKED,
                message: `Action blocked: Contains dangerous operation (${actionDescription})`,
                escalation: this._createEscalation(
                    taskId,
                    agent,
                    confidence,
                    EscalationTier.BLOCKED,
                    EscalationReason.SECURITY_RISK,
                    `Action contains always-blocked pattern: ${actionDescription}`
                )
            };
        }

        // Check for always-require-approval patterns
        if (actionDescription && this._requiresApproval(actionDescription)) {
            this.stats.approval_count++;
            return {
                approved: false, // Requires explicit approval
                tier: EscalationTier.APPROVAL_REQUIRED,
                message: `Approval required: Destructive operation (${actionDescription})`,
                escalation: this._createEscalation(
                    taskId,
                    agent,
                    confidence,
                    EscalationTier.APPROVAL_REQUIRED,
                    EscalationReason.DATA_LOSS_RISK,
                    `Action requires approval: ${actionDescription}`
                )
            };
        }

        // Check confidence thresholds
        if (confidence >= this.config.autonomous_threshold) {
            // Autonomous: Execute immediately
            this.stats.autonomous_count++;
            return {
                approved: true,
                tier: EscalationTier.AUTONOMOUS,
                message: `Autonomous execution (confidence: ${(confidence * 100).toFixed(1)}%)`
            };
        } else if (confidence >= this.config.suggest_threshold) {
            // Suggest: Show with disclaimer
            this.stats.suggest_count++;
            return {
                approved: true, // Can proceed, but with warning
                tier: EscalationTier.SUGGEST,
                message: `Suggested with disclaimer (confidence: ${(confidence * 100).toFixed(1)}%)`,
                escalation: this._createEscalation(
                    taskId,
                    agent,
                    confidence,
                    EscalationTier.SUGGEST,
                    EscalationReason.LOW_CONFIDENCE,
                    `Confidence below autonomous threshold (${(confidence * 100).toFixed(1)}% < 85%)`
                )
            };
        } else if (confidence >= this.config.approval_threshold) {
            // Approval: Wait for human decision
            this.stats.approval_count++;
            return {
                approved: false, // Requires explicit approval
                tier: EscalationTier.APPROVAL_REQUIRED,
                message: `Approval required (confidence: ${(confidence * 100).toFixed(1)}%)`,
                escalation: this._createEscalation(
                    taskId,
                    agent,
                    confidence,
                    EscalationTier.APPROVAL_REQUIRED,
                    EscalationReason.LOW_CONFIDENCE,
                    `Confidence below suggest threshold (${(confidence * 100).toFixed(1)}% < 70%)`
                )
            };
        } else {
            // Blocked: Require manual intervention
            this.stats.blocked_count++;
            return {
                approved: false,
                tier: EscalationTier.BLOCKED,
                message: `Blocked (confidence too low: ${(confidence * 100).toFixed(1)}%)`,
                escalation: this._createEscalation(
                    taskId,
                    agent,
                    confidence,
                    EscalationTier.BLOCKED,
                    EscalationReason.LOW_CONFIDENCE,
                    `Confidence below approval threshold (${(confidence * 100).toFixed(1)}% < 50%)`
                )
            };
        }
    }

    /**
     * Record human decision (approve/reject)
     *
     * DESIGN DECISION: Track decisions for learning
     * WHY: Approval rate and false positive rate improve threshold tuning
     */
    public recordDecision(
        escalationId: string,
        approved: boolean,
        notes?: string
    ): void {
        const escalation = this.escalationHistory.find(e => e.id === escalationId);
        if (!escalation) {
            console.warn(`Escalation ${escalationId} not found`);
            return;
        }

        escalation.decision = {
            approved,
            timestamp: new Date().toISOString(),
            notes
        };

        // Update approval rate
        const approvalDecisions = this.escalationHistory.filter(
            e => e.tier === EscalationTier.APPROVAL_REQUIRED && e.decision
        );
        const approvedCount = approvalDecisions.filter(e => e.decision!.approved).length;
        this.stats.approval_rate =
            approvalDecisions.length > 0 ? approvedCount / approvalDecisions.length : 0.0;
    }

    /**
     * Get escalation statistics
     */
    public getStats(): EscalationStats {
        return { ...this.stats };
    }

    /**
     * Get escalation history
     */
    public getHistory(): HumanEscalation[] {
        return [...this.escalationHistory];
    }

    /**
     * Update configuration
     */
    public updateConfig(config: Partial<EscalationConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Reset statistics (for testing)
     */
    public resetStats(): void {
        this.stats = {
            total_tasks: 0,
            autonomous_count: 0,
            suggest_count: 0,
            approval_count: 0,
            blocked_count: 0,
            average_confidence: 0.0,
            approval_rate: 0.0,
            false_positive_rate: 0.0
        };
        this.escalationHistory = [];
    }

    /**
     * Check if action contains blocked pattern
     */
    private _containsBlockedPattern(action: string): boolean {
        const lowerAction = action.toLowerCase();
        return this.config.always_block.some(pattern =>
            lowerAction.includes(pattern.toLowerCase())
        );
    }

    /**
     * Check if action requires approval
     */
    private _requiresApproval(action: string): boolean {
        const upperAction = action.toUpperCase();
        return this.config.always_require_approval.some(pattern =>
            upperAction.includes(pattern.toUpperCase())
        );
    }

    /**
     * Create escalation request
     */
    private _createEscalation(
        taskId: string,
        agent: string,
        confidence: number,
        tier: EscalationTier,
        reason: EscalationReason,
        explanation: string
    ): HumanEscalation {
        const escalation: HumanEscalation = {
            id: `escalation-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            tier,
            task_id: taskId,
            agent,
            timestamp: new Date().toISOString(),
            confidence,
            reason,
            explanation
        };

        this.escalationHistory.push(escalation);
        return escalation;
    }
}
