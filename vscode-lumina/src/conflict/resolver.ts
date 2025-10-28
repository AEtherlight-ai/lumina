/**
 * Conflict Resolver - Resolve file modification conflicts
 *
 * DESIGN DECISION: Multiple resolution strategies (sequential, merge, manual)
 * WHY: Different conflicts need different solutions
 *
 * REASONING CHAIN:
 * 1. Conflict detected: Agent 1 and Agent 2 both modify users.ts
 * 2. Strategy selection:
 *    - Sequential: Agent 2 waits for Agent 1 to finish
 *    - Merge: Attempt automatic 3-way merge
 *    - Manual: Pause both, ask user to resolve
 * 3. Execute strategy, update scheduler
 * 4. Result: Conflict resolved, sprint continues
 *
 * PATTERN: Pattern-CONFLICT-002 (Conflict Resolution Strategies)
 * RELATED: AS-016 (Conflict Detection)
 */

import * as vscode from 'vscode';
import { FileLock, ConflictDetection } from './detector';

/**
 * Resolution strategy enumeration
 */
export enum ResolutionStrategy {
    /** Wait for first agent to finish */
    SEQUENTIAL = 'SEQUENTIAL',
    /** Attempt automatic 3-way merge */
    MERGE = 'MERGE',
    /** Pause and ask user */
    MANUAL = 'MANUAL',
    /** Cancel conflicting task */
    CANCEL = 'CANCEL',
}

/**
 * Resolution result
 */
export interface ResolutionResult {
    /** Strategy used */
    strategy: ResolutionStrategy;
    /** Resolution successful? */
    success: boolean;
    /** Error message (if failed) */
    error?: string;
    /** Action taken */
    action: string;
}

/**
 * Conflict resolver
 *
 * DESIGN DECISION: Strategy pattern for resolution methods
 * WHY: Easy to add new resolution strategies, testable in isolation
 */
export class ConflictResolver {
    /**
     * Resolve conflict
     *
     * @param conflict - Detected conflict
     * @param strategy - Resolution strategy (optional, will prompt if not provided)
     * @returns Resolution result
     */
    async resolve(
        conflict: ConflictDetection,
        strategy?: ResolutionStrategy
    ): Promise<ResolutionResult> {
        if (!conflict.hasConflict) {
            return {
                strategy: ResolutionStrategy.SEQUENTIAL,
                success: true,
                action: 'No conflict detected',
            };
        }

        // Prompt user for strategy if not provided
        if (!strategy) {
            strategy = await this.promptStrategy(conflict);
        }

        // Execute strategy
        switch (strategy) {
            case ResolutionStrategy.SEQUENTIAL:
                return this.resolveSequential(conflict);

            case ResolutionStrategy.MERGE:
                return this.resolveMerge(conflict);

            case ResolutionStrategy.MANUAL:
                return this.resolveManual(conflict);

            case ResolutionStrategy.CANCEL:
                return this.resolveCancel(conflict);

            default:
                return {
                    strategy,
                    success: false,
                    error: `Unknown strategy: ${strategy}`,
                    action: 'No action taken',
                };
        }
    }

    /**
     * Prompt user for resolution strategy
     */
    private async promptStrategy(conflict: ConflictDetection): Promise<ResolutionStrategy> {
        const conflictingAgent = conflict.conflicts[0].agentType;
        const requestingAgent = conflict.requestingAgent;
        const filePath = conflict.filePath;

        const choice = await vscode.window.showWarningMessage(
            `Conflict detected: ${requestingAgent} wants to modify ${filePath}, but ${conflictingAgent} is already modifying it.`,
            'Wait (Sequential)',
            'Try Merge',
            'I\'ll Fix It (Manual)',
            'Cancel Task'
        );

        switch (choice) {
            case 'Wait (Sequential)':
                return ResolutionStrategy.SEQUENTIAL;
            case 'Try Merge':
                return ResolutionStrategy.MERGE;
            case 'I\'ll Fix It (Manual)':
                return ResolutionStrategy.MANUAL;
            case 'Cancel Task':
                return ResolutionStrategy.CANCEL;
            default:
                return ResolutionStrategy.SEQUENTIAL;  // Default
        }
    }

    /**
     * Resolve conflict sequentially
     *
     * DESIGN DECISION: Requesting agent waits for conflicting agent to finish
     * WHY: Simplest strategy, preserves both agent's work
     *
     * REASONING CHAIN:
     * 1. Agent 2 paused (waiting)
     * 2. Agent 1 completes task
     * 3. Agent 1 releases lock
     * 4. Agent 2 resumes
     * 5. Result: No merge conflicts, both agents complete successfully
     */
    private async resolveSequential(conflict: ConflictDetection): Promise<ResolutionResult> {
        const conflictingAgent = conflict.conflicts[0].agentType;
        const conflictingTask = conflict.conflicts[0].taskId;

        vscode.window.showInformationMessage(
            `Task for ${conflict.requestingAgent} will wait until ${conflictingAgent} finishes ${conflictingTask}.`
        );

        return {
            strategy: ResolutionStrategy.SEQUENTIAL,
            success: true,
            action: `Paused ${conflict.requestingAgent} until ${conflictingAgent} completes`,
        };
    }

    /**
     * Resolve conflict with merge
     *
     * DESIGN DECISION: Attempt 3-way merge (base, theirs, ours)
     * WHY: Can auto-resolve non-overlapping changes
     *
     * REASONING CHAIN:
     * 1. Get file content before both agents started (base)
     * 2. Get Agent 1's changes (theirs)
     * 3. Get Agent 2's changes (ours)
     * 4. Run 3-way merge algorithm
     * 5. If no overlapping changes: Auto-merge success
     * 6. If overlapping changes: Fall back to manual
     *
     * FUTURE: Implement git-like 3-way merge algorithm
     * CURRENT: Placeholder (always falls back to manual)
     */
    private async resolveMerge(conflict: ConflictDetection): Promise<ResolutionResult> {
        vscode.window.showWarningMessage(
            'Automatic merge not yet implemented. Falling back to manual resolution.'
        );

        return this.resolveManual(conflict);
    }

    /**
     * Resolve conflict manually
     *
     * DESIGN DECISION: Pause both agents, user fixes manually
     * WHY: Safest option when auto-merge fails
     *
     * REASONING CHAIN:
     * 1. Pause Agent 1 (in-progress)
     * 2. Pause Agent 2 (blocked)
     * 3. Open file in VS Code editor
     * 4. Show diff (Agent 1's changes vs Agent 2's changes)
     * 5. User resolves manually
     * 6. User clicks "Resume" when done
     * 7. Result: User-validated resolution, sprint continues
     */
    private async resolveManual(conflict: ConflictDetection): Promise<ResolutionResult> {
        const conflictingAgent = conflict.conflicts[0].agentType;
        const requestingAgent = conflict.requestingAgent;
        const filePath = conflict.filePath;

        vscode.window.showWarningMessage(
            `Both ${conflictingAgent} and ${requestingAgent} are paused. ` +
            `Please manually resolve the conflict in ${filePath}, then click Resume Sprint.`,
            'Open File'
        ).then(choice => {
            if (choice === 'Open File') {
                // Open file in editor (VS Code will show unsaved changes if any)
                vscode.workspace.openTextDocument(filePath).then(doc => {
                    vscode.window.showTextDocument(doc);
                });
            }
        });

        return {
            strategy: ResolutionStrategy.MANUAL,
            success: true,
            action: `Paused ${conflictingAgent} and ${requestingAgent} for manual resolution`,
        };
    }

    /**
     * Resolve conflict by canceling task
     *
     * DESIGN DECISION: Cancel requesting agent's task
     * WHY: User decides conflicting task is unnecessary
     */
    private async resolveCancel(conflict: ConflictDetection): Promise<ResolutionResult> {
        vscode.window.showInformationMessage(
            `Task for ${conflict.requestingAgent} will be canceled.`
        );

        return {
            strategy: ResolutionStrategy.CANCEL,
            success: true,
            action: `Canceled task for ${conflict.requestingAgent}`,
        };
    }
}
