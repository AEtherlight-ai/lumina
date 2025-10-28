/**
 * Post-Sprint Review - Human review after sprint completion (AS-025)
 *
 * DESIGN DECISION: Show sprint summary with metrics and learnings
 * WHY: User learns what worked/failed, improves future sprint planning
 *
 * REASONING CHAIN:
 * 1. Sprint completes (all tasks done or failed)
 * 2. Post-sprint review shows:
 *    - Sprint metrics (duration, velocity, success rate)
 *    - Task outcomes (completed/failed/skipped)
 *    - Files changed summary
 *    - Lessons learned (extracted from agent signals)
 * 3. User reviews, provides feedback
 * 4. System records feedback for future planning improvements
 * 5. Result: Continuous improvement of sprint planning accuracy
 *
 * PATTERN: Pattern-APPROVAL-004 (Post-Sprint Retrospective)
 * RELATED: AS-025 (Post-Sprint Review)
 */

import * as vscode from 'vscode';
import { SprintPlan } from '../sprint_parser/types';
import { SprintMetrics } from '../progress/monitor';

export interface SprintReviewData {
    plan: SprintPlan;
    metrics: SprintMetrics;
    tasksCompleted: number;
    tasksFailed: number;
    tasksSkipped: number;
    filesChanged: string[];
    lessonsLearned: string[];
}

export interface SprintFeedback {
    rating: number;  // 1-5 stars
    comments: string;
    wouldUseAgain: boolean;
}

export class PostSprintReview {
    /**
     * Show post-sprint review
     *
     * @param data - Sprint review data
     */
    async show(data: SprintReviewData): Promise<SprintFeedback | null> {
        const message = this.formatReviewMessage(data);

        const choice = await vscode.window.showInformationMessage(
            `Sprint Complete: ${data.plan.metadata?.name || 'Unnamed Sprint'}`,
            { modal: true, detail: message },
            'Provide Feedback',
            'Close'
        );

        if (choice === 'Provide Feedback') {
            return this.collectFeedback(data);
        }

        return null;
    }

    private formatReviewMessage(data: SprintReviewData): string {
        let message = `Sprint: ${data.plan.metadata?.name || 'Unnamed Sprint'}\n\n`;

        // Metrics
        message += `Metrics:\n`;
        message += `  Duration: ${this.formatDuration(data.metrics.totalDuration || 0)}\n`;
        message += `  Velocity: ${data.metrics.velocity.toFixed(2)} tasks/hour\n`;
        message += `  Tasks Completed: ${data.tasksCompleted}\n`;
        message += `  Tasks Failed: ${data.tasksFailed}\n`;
        message += `  Tasks Skipped: ${data.tasksSkipped}\n\n`;

        // Success rate
        const total = data.tasksCompleted + data.tasksFailed + data.tasksSkipped;
        const successRate = total > 0 ? (data.tasksCompleted / total * 100).toFixed(1) : '0';
        message += `Success Rate: ${successRate}%\n\n`;

        // Files changed
        message += `Files Changed: ${data.filesChanged.length}\n\n`;

        // Lessons learned
        if (data.lessonsLearned.length > 0) {
            message += `Lessons Learned:\n`;
            data.lessonsLearned.forEach(lesson => {
                message += `  - ${lesson}\n`;
            });
        }

        return message;
    }

    private formatDuration(milliseconds: number): string {
        const hours = Math.floor(milliseconds / (1000 * 60 * 60));
        const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    private async collectFeedback(data: SprintReviewData): Promise<SprintFeedback | null> {
        // Rating
        const ratingChoice = await vscode.window.showQuickPick(
            ['5 - Excellent', '4 - Good', '3 - Average', '2 - Poor', '1 - Very Poor'],
            { placeHolder: 'How would you rate this sprint?' }
        );

        if (!ratingChoice) {
            return null;
        }

        const rating = parseInt(ratingChoice[0]);

        // Comments
        const comments = await vscode.window.showInputBox({
            prompt: 'Any additional feedback?',
            placeHolder: 'e.g., Agent was too slow, estimates were accurate, etc.',
        });

        // Would use again?
        const useAgainChoice = await vscode.window.showQuickPick(
            ['Yes', 'No'],
            { placeHolder: 'Would you use autonomous sprints again?' }
        );

        return {
            rating,
            comments: comments || '',
            wouldUseAgain: useAgainChoice === 'Yes',
        };
    }
}
