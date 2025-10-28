/**
 * Error Recovery Prompts - Handle task failures (AS-024)
 *
 * DESIGN DECISION: Offer recovery options when tasks fail
 * WHY: Agent failures shouldn't halt entire sprint, user can intervene
 *
 * REASONING CHAIN:
 * 1. API-001 task fails (agent encounters error)
 * 2. Error recovery prompt shows:
 *    - Error message
 *    - Files that were being modified
 *    - Recovery options (retry, skip, manual fix, abort)
 * 3. User chooses "Manual Fix"
 * 4. Sprint pauses, user fixes issue manually
 * 5. User resumes → Task marked complete, dependent tasks start
 * 6. Result: Sprint recovers from failures without full restart
 *
 * PATTERN: Pattern-APPROVAL-003 (Error Recovery)
 * RELATED: AS-024 (Error Recovery Prompts)
 */

import * as vscode from 'vscode';
import { CompletionSignal } from '../ipc_dogfooding/types';

export enum RecoveryAction {
    RETRY = 'RETRY',
    SKIP = 'SKIP',
    MANUAL_FIX = 'MANUAL_FIX',
    ABORT = 'ABORT',
}

export interface RecoveryDecision {
    action: RecoveryAction;
    reason?: string;
}

export class ErrorRecoveryPrompt {
    /**
     * Show error recovery prompt
     *
     * @param signal - Failed task completion signal
     */
    async show(signal: CompletionSignal): Promise<RecoveryDecision> {
        const message = this.formatErrorMessage(signal);

        const choice = await vscode.window.showErrorMessage(
            `Task ${signal.task_id} Failed`,
            { modal: true, detail: message },
            'Retry',
            'Skip Task',
            'Fix Manually',
            'Abort Sprint'
        );

        switch (choice) {
            case 'Retry':
                return { action: RecoveryAction.RETRY };

            case 'Skip Task':
                const skipReason = await vscode.window.showInputBox({
                    prompt: 'Why are you skipping this task?',
                    placeHolder: 'e.g., Not critical, will fix later',
                });

                return {
                    action: RecoveryAction.SKIP,
                    reason: skipReason || 'User skipped',
                };

            case 'Fix Manually':
                vscode.window.showInformationMessage(
                    'Sprint paused. Fix the issue manually, then click Resume Sprint.'
                );

                return { action: RecoveryAction.MANUAL_FIX };

            case 'Abort Sprint':
                return {
                    action: RecoveryAction.ABORT,
                    reason: 'User aborted sprint',
                };

            default:
                return {
                    action: RecoveryAction.ABORT,
                    reason: 'User canceled',
                };
        }
    }

    private formatErrorMessage(signal: CompletionSignal): string {
        let message = `Error: ${signal.error || 'Unknown error'}\n\n`;

        message += `Agent: ${signal.agent_type}\n`;
        message += `Task: ${signal.task_id}\n\n`;

        if (signal.files_changed.length > 0) {
            message += `Files Modified Before Failure:\n`;
            signal.files_changed.forEach(file => {
                message += `  - ${file}\n`;
            });
            message += `\n`;
        }

        message += `How would you like to proceed?`;

        return message;
    }
}
