/**
 * Escalation UI - Notifications and Approval Prompts
 *
 * DESIGN DECISION: VS Code native UI (notifications + Quick Pick dialogs)
 * WHY: Familiar UX, no custom webview needed, fast implementation
 *
 * REASONING CHAIN:
 * 1. Escalation tier determines UI approach:
 *    - AUTONOMOUS: No UI (silent execution)
 *    - SUGGEST: Info notification with "View Details" button
 *    - APPROVAL_REQUIRED: Modal Quick Pick (blocks until decision)
 *    - BLOCKED: Error notification with "Manual Fix" button
 * 2. Quick Pick shows: Pattern name, confidence, risk factors
 * 3. User selects: Approve / Reject / View Pattern / Cancel
 * 4. Result: Minimal UI disruption, clear decision path
 *
 * PATTERN: Pattern-ESCALATION-002 (Human Escalation UI)
 * RELATED: EscalationManager (Escalation-001), Phase 4 orchestrator
 * PERFORMANCE: <200ms UI render, <1s user decision time
 */

import * as vscode from 'vscode';
import {
    EscalationTier,
    EscalationReason,
    HumanEscalation
} from './types';
import { EscalationManager, EscalationDecision } from './EscalationManager';

/**
 * Escalation UI - VS Code notifications and dialogs
 *
 * DESIGN DECISION: Static methods (no state, pure UI functions)
 * WHY: Easy to test, no lifecycle management, composable
 */
export class EscalationUI {
    /**
     * Show escalation UI based on tier
     *
     * PERFORMANCE: <200ms UI render
     *
     * DESIGN DECISION: Switch on tier, different UI for each
     * WHY: Each tier has different urgency/complexity
     *
     * @param decision - Escalation decision from EscalationManager
     * @param manager - EscalationManager instance (for recording decision)
     * @returns Promise<boolean> - true if approved, false if rejected
     */
    public static async showEscalation(
        decision: EscalationDecision,
        manager: EscalationManager
    ): Promise<boolean> {
        switch (decision.tier) {
            case EscalationTier.AUTONOMOUS:
                // No UI needed - silent execution
                return true;

            case EscalationTier.SUGGEST:
                // Info notification with disclaimer
                return await this._showSuggestNotification(decision, manager);

            case EscalationTier.APPROVAL_REQUIRED:
                // Modal approval dialog
                return await this._showApprovalDialog(decision, manager);

            case EscalationTier.BLOCKED:
                // Error notification with manual fix prompt
                return await this._showBlockedNotification(decision, manager);

            default:
                console.warn(`Unknown escalation tier: ${decision.tier}`);
                return false;
        }
    }

    /**
     * Show suggest notification (info level)
     *
     * DESIGN DECISION: Non-blocking info message with "View Details" button
     * WHY: User can proceed but has option to see reasoning
     */
    private static async _showSuggestNotification(
        decision: EscalationDecision,
        manager: EscalationManager
    ): Promise<boolean> {
        if (!decision.escalation) {
            return true; // No escalation details, proceed
        }

        const escalation = decision.escalation;
        const confidencePercent = (escalation.confidence * 100).toFixed(1);

        const message = `Suggested pattern (${confidencePercent}% confidence): ${escalation.recommended_pattern?.pattern_name || 'Unknown'}. Not fully confident, proceed with caution.`;

        const choice = await vscode.window.showInformationMessage(
            message,
            'View Details',
            'Proceed',
            'Cancel'
        );

        if (choice === 'View Details') {
            await this._showEscalationDetails(escalation);
            // After viewing details, ask again
            return await this._showSuggestNotification(decision, manager);
        } else if (choice === 'Cancel') {
            manager.recordDecision(escalation.id, false, 'User cancelled suggest');
            return false;
        }

        // 'Proceed' or dismissed - allow execution
        manager.recordDecision(escalation.id, true, 'User proceeded with suggest');
        return true;
    }

    /**
     * Show approval dialog (modal Quick Pick)
     *
     * DESIGN DECISION: Blocking modal dialog with Approve/Reject/View options
     * WHY: Requires explicit user decision before proceeding
     */
    private static async _showApprovalDialog(
        decision: EscalationDecision,
        manager: EscalationManager
    ): Promise<boolean> {
        if (!decision.escalation) {
            return false; // No escalation details, block
        }

        const escalation = decision.escalation;
        const confidencePercent = (escalation.confidence * 100).toFixed(1);

        // Build Quick Pick items
        interface EscalationQuickPickItem extends vscode.QuickPickItem {
            action: 'approve' | 'reject' | 'view' | 'cancel';
        }

        const items: EscalationQuickPickItem[] = [
            {
                label: '✅ Approve',
                description: `Proceed with pattern (${confidencePercent}% confidence)`,
                action: 'approve'
            },
            {
                label: '❌ Reject',
                description: 'Block execution, require manual intervention',
                action: 'reject'
            },
            {
                label: '📄 View Details',
                description: 'See pattern details and risk factors',
                action: 'view'
            },
            {
                label: '🚫 Cancel',
                description: 'Cancel sprint execution',
                action: 'cancel'
            }
        ];

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: `Approval Required: ${escalation.recommended_pattern?.pattern_name || 'Unknown Pattern'}`,
            title: `Task ${escalation.task_id} - ${escalation.agent} Agent`,
            ignoreFocusOut: true // Don't dismiss if user switches windows
        });

        if (!selected || selected.action === 'cancel') {
            manager.recordDecision(escalation.id, false, 'User cancelled approval');
            return false;
        }

        if (selected.action === 'view') {
            await this._showEscalationDetails(escalation);
            // After viewing details, show approval dialog again
            return await this._showApprovalDialog(decision, manager);
        }

        const approved = selected.action === 'approve';
        manager.recordDecision(
            escalation.id,
            approved,
            approved ? 'User approved' : 'User rejected'
        );
        return approved;
    }

    /**
     * Show blocked notification (error level)
     *
     * DESIGN DECISION: Error message with "Manual Fix" button
     * WHY: Action is too risky, require human to manually implement
     */
    private static async _showBlockedNotification(
        decision: EscalationDecision,
        manager: EscalationManager
    ): Promise<boolean> {
        if (!decision.escalation) {
            return false; // No escalation details, block
        }

        const escalation = decision.escalation;
        const confidencePercent = (escalation.confidence * 100).toFixed(1);

        const message = `Blocked: ${escalation.explanation} (${confidencePercent}% confidence). Manual intervention required.`;

        const choice = await vscode.window.showErrorMessage(
            message,
            'View Details',
            'Manual Fix',
            'Cancel Sprint'
        );

        if (choice === 'View Details') {
            await this._showEscalationDetails(escalation);
            // After viewing details, show blocked notification again
            return await this._showBlockedNotification(decision, manager);
        } else if (choice === 'Manual Fix') {
            // Open task in terminal for manual implementation
            vscode.window.showInformationMessage(
                `Opening terminal for manual fix of task ${escalation.task_id}`
            );
            // TODO: Integrate with Phase 4 terminal spawner
        }

        // Always block (cannot auto-approve BLOCKED tier)
        manager.recordDecision(escalation.id, false, 'Blocked by confidence threshold');
        return false;
    }

    /**
     * Show escalation details (info panel)
     *
     * DESIGN DECISION: Use VS Code Quick Pick with multiline description
     * WHY: Simple, no webview needed, shows all context
     */
    private static async _showEscalationDetails(escalation: HumanEscalation): Promise<void> {
        interface DetailQuickPickItem extends vscode.QuickPickItem {
            type: 'header' | 'detail';
        }

        const items: DetailQuickPickItem[] = [];

        // Header
        items.push({
            label: `Task: ${escalation.task_id}`,
            description: `Agent: ${escalation.agent}`,
            type: 'header'
        });

        // Confidence
        const confidencePercent = (escalation.confidence * 100).toFixed(1);
        items.push({
            label: `Confidence: ${confidencePercent}%`,
            description: `Tier: ${escalation.tier}`,
            type: 'detail'
        });

        // Reason
        items.push({
            label: `Reason: ${escalation.reason}`,
            description: escalation.explanation,
            type: 'detail'
        });

        // Recommended pattern
        if (escalation.recommended_pattern) {
            items.push({
                label: `Pattern: ${escalation.recommended_pattern.pattern_id}`,
                description: escalation.recommended_pattern.pattern_name,
                detail: escalation.recommended_pattern.description,
                type: 'detail'
            });
        }

        // Risk factors
        if (escalation.risk_factors && escalation.risk_factors.length > 0) {
            items.push({
                label: 'Risk Factors:',
                description: escalation.risk_factors.join(', '),
                type: 'detail'
            });
        }

        // Alternative patterns
        if (escalation.alternative_patterns && escalation.alternative_patterns.length > 0) {
            items.push({
                label: `Alternatives: ${escalation.alternative_patterns.length} patterns`,
                description: escalation.alternative_patterns
                    .map(p => `${p.pattern_name} (${(p.confidence * 100).toFixed(1)}%)`)
                    .join(', '),
                type: 'detail'
            });
        }

        // Estimated impact
        if (escalation.estimated_impact) {
            const impact = escalation.estimated_impact;
            items.push({
                label: 'Estimated Impact:',
                description: `${impact.files_modified} files, ${impact.lines_changed} lines, ${impact.reversible ? 'reversible' : 'NOT reversible'}`,
                type: 'detail'
            });
        }

        await vscode.window.showQuickPick(items, {
            placeHolder: 'Escalation Details',
            title: 'Pattern Recommendation Details',
            matchOnDescription: true,
            matchOnDetail: true
        });
    }

    /**
     * Show confidence alert (inline notification)
     *
     * DESIGN DECISION: Status bar item with color coding
     * WHY: Always visible, doesn't interrupt flow
     *
     * @param confidence - Confidence score (0.0 to 1.0)
     * @returns StatusBarItem that caller can manage
     */
    public static createConfidenceAlert(confidence: number): vscode.StatusBarItem {
        const confidencePercent = (confidence * 100).toFixed(1);
        const statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );

        // Color coding
        if (confidence >= 0.85) {
            statusBarItem.text = `🟢 ${confidencePercent}%`;
            statusBarItem.color = new vscode.ThemeColor('statusBarItem.prominentForeground');
        } else if (confidence >= 0.70) {
            statusBarItem.text = `🟡 ${confidencePercent}%`;
            statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
        } else if (confidence >= 0.50) {
            statusBarItem.text = `🟠 ${confidencePercent}%`;
            statusBarItem.color = new vscode.ThemeColor('statusBarItem.errorForeground');
        } else {
            statusBarItem.text = `🔴 ${confidencePercent}%`;
            statusBarItem.color = new vscode.ThemeColor('statusBarItem.errorForeground');
        }

        statusBarItem.tooltip = `Pattern confidence: ${confidencePercent}%`;
        statusBarItem.show();

        return statusBarItem;
    }
}
