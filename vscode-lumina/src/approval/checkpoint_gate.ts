/**
 * Checkpoint Approval Gate - Mid-sprint human review (AS-023)
 *
 * DESIGN DECISION: Approval gates after critical tasks complete
 * WHY: User validates critical changes before dependent tasks execute
 *
 * REASONING CHAIN:
 * 1. DB-001 (create tables) completes
 * 2. Checkpoint gate triggers (defined in sprint plan)
 * 3. Shows: Files changed, design decisions, next tasks
 * 4. User reviews database schema changes
 * 5. User approves → API-001 (depends on DB-001) starts
 * 6. User rejects → Sprint paused, user fixes issues
 * 7. Result: Catch errors early, before cascading to dependent tasks
 *
 * PATTERN: Pattern-APPROVAL-002 (Mid-Sprint Checkpoint)
 * RELATED: AS-023 (Mid-Sprint Checkpoints)
 */

import * as vscode from 'vscode';
import { ApprovalGate } from '../sprint_parser/types';
import { CompletionSignal } from '../ipc_dogfooding/types';

export interface CheckpointDecision {
    approved: boolean;
    reason?: string;
    action?: 'continue' | 'pause' | 'rollback';
}

export class CheckpointApprovalGate {
    /**
     * Show checkpoint gate
     *
     * @param gate - Approval gate definition
     * @param signal - Completion signal from task
     */
    async show(gate: ApprovalGate, signal: CompletionSignal): Promise<CheckpointDecision> {
        const message = this.formatCheckpointMessage(gate, signal);

        const choice = await vscode.window.showWarningMessage(
            `Checkpoint: ${gate.description}`,
            { modal: true, detail: message },
            'Continue',
            'Pause Sprint',
            'Rollback Changes'
        );

        switch (choice) {
            case 'Continue':
                return { approved: true, action: 'continue' };

            case 'Pause Sprint':
                const reason = await vscode.window.showInputBox({
                    prompt: 'Why are you pausing the sprint?',
                    placeHolder: 'e.g., Need to review changes manually',
                });

                return {
                    approved: false,
                    reason: reason || 'User paused sprint',
                    action: 'pause',
                };

            case 'Rollback Changes':
                return {
                    approved: false,
                    reason: 'User requested rollback',
                    action: 'rollback',
                };

            default:
                return {
                    approved: false,
                    reason: 'User canceled',
                    action: 'pause',
                };
        }
    }

    private formatCheckpointMessage(gate: ApprovalGate, signal: CompletionSignal): string {
        let message = `Task ${signal.task_id} completed.\n\n`;

        message += `Files Changed:\n`;
        if (signal.files_changed.length > 0) {
            signal.files_changed.forEach(file => {
                message += `  - ${file}\n`;
            });
        } else {
            message += `  (None)\n`;
        }

        message += `\nDesign Decisions:\n`;
        if (signal.design_decisions.length > 0) {
            signal.design_decisions.forEach(decision => {
                message += `  - ${decision}\n`;
            });
        } else {
            message += `  (None)\n`;
        }

        message += `\nReview changes before continuing?`;

        return message;
    }
}
