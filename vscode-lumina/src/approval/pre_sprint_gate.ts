/**
 * Pre-Sprint Approval Gate - Human review before sprint execution
 *
 * DESIGN DECISION: Show sprint summary with approval/rejection buttons
 * WHY: User must understand what will be executed before agents start work
 *
 * REASONING CHAIN:
 * 1. User creates sprint plan (via planning agent or manual YAML)
 * 2. Pre-sprint gate shows summary:
 *    - Sprint name, description, estimated duration
 *    - Task list with dependencies
 *    - Parallel execution opportunities
 *    - Risk assessment (breaking changes, database migrations)
 * 3. User reviews, asks questions
 * 4. User approves → Sprint execution begins
 * 5. User rejects → Sprint canceled, back to planning
 * 6. Result: User maintains strategic control, agents execute tactically
 *
 * PATTERN: Pattern-APPROVAL-001 (Pre-Execution Human Review)
 * RELATED: AS-022 (Pre-Sprint Approval Gate)
 */

import * as vscode from 'vscode';
import { SprintPlan, Task } from '../sprint_parser/types';

/**
 * Approval decision
 */
export enum ApprovalDecision {
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    DEFERRED = 'DEFERRED',
}

/**
 * Approval result
 */
export interface ApprovalResult {
    /** Decision */
    decision: ApprovalDecision;
    /** Reason (if rejected/deferred) */
    reason?: string;
    /** Modifications requested (if deferred) */
    modifications?: string[];
}

/**
 * Sprint risk assessment
 */
export interface SprintRisk {
    /** Risk level */
    level: 'low' | 'medium' | 'high';
    /** Risk factors */
    factors: string[];
    /** Mitigation suggestions */
    mitigations: string[];
}

/**
 * Pre-sprint approval gate
 */
export class PreSprintApprovalGate {
    /**
     * Show approval gate
     *
     * @param sprint - Sprint plan to review
     * @returns Approval result (user decision)
     */
    async show(sprint: SprintPlan): Promise<ApprovalResult> {
        // Generate sprint summary
        const summary = this.generateSummary(sprint);

        // Assess risks
        const risks = this.assessRisks(sprint);

        // Show approval dialog
        const choice = await vscode.window.showInformationMessage(
            `Review Sprint: ${sprint.metadata?.name || 'Unnamed Sprint'}`,
            {
                modal: true,
                detail: this.formatApprovalDialog(sprint, summary, risks),
            },
            'Approve',
            'Reject',
            'Defer'
        );

        switch (choice) {
            case 'Approve':
                return {
                    decision: ApprovalDecision.APPROVED,
                };

            case 'Reject':
                const reason = await vscode.window.showInputBox({
                    prompt: 'Why are you rejecting this sprint?',
                    placeHolder: 'e.g., Tasks unclear, missing dependencies',
                });

                return {
                    decision: ApprovalDecision.REJECTED,
                    reason: reason || 'User rejected',
                };

            case 'Defer':
                const modifications = await vscode.window.showInputBox({
                    prompt: 'What modifications do you need?',
                    placeHolder: 'e.g., Add database migration task',
                });

                return {
                    decision: ApprovalDecision.DEFERRED,
                    modifications: modifications ? [modifications] : [],
                };

            default:
                return {
                    decision: ApprovalDecision.REJECTED,
                    reason: 'User canceled',
                };
        }
    }

    /**
     * Generate sprint summary
     */
    private generateSummary(sprint: SprintPlan): string {
        let summary = `Sprint: ${sprint.metadata?.name || 'Unnamed Sprint'}\n`;
        summary += `Description: ${sprint.metadata?.description || 'No description'}\n\n`;

        // Task count
        summary += `Total Tasks: ${sprint.tasks.length}\n`;

        // Parallel tasks
        const parallelTasks = sprint.tasks.filter(t => t.dependencies.length === 0);
        summary += `Parallel Tasks: ${parallelTasks.length} (can start immediately)\n`;

        // Estimated duration
        const totalHours = this.estimateTotalDuration(sprint);
        summary += `Estimated Duration: ${totalHours} hours\n\n`;

        // Task breakdown by agent
        const byAgent = this.groupByAgent(sprint.tasks);
        summary += `Tasks by Agent:\n`;
        Object.entries(byAgent).forEach(([agent, tasks]) => {
            summary += `  - ${agent}: ${tasks.length} tasks\n`;
        });

        return summary;
    }

    /**
     * Estimate total duration
     *
     * DESIGN DECISION: Critical path calculation
     * WHY: User needs realistic time estimate, not sum of all tasks
     */
    private estimateTotalDuration(sprint: SprintPlan): number {
        // TODO: Implement critical path algorithm
        // For MVP: Sum all task durations (conservative estimate)

        let totalHours = 0;
        sprint.tasks.forEach(task => {
            const duration = task.estimated_duration || task.estimatedDuration || '';
            const match = duration.match(/(\d+)\s*(hour|h)/i);
            if (match) {
                totalHours += parseInt(match[1]);
            }
        });

        return totalHours;
    }

    /**
     * Group tasks by agent
     */
    private groupByAgent(tasks: Task[]): { [agent: string]: Task[] } {
        const grouped: { [agent: string]: Task[] } = {};

        tasks.forEach(task => {
            if (!grouped[task.agent]) {
                grouped[task.agent] = [];
            }
            grouped[task.agent].push(task);
        });

        return grouped;
    }

    /**
     * Assess sprint risks
     *
     * DESIGN DECISION: Heuristic-based risk assessment
     * WHY: Warn user about potentially dangerous operations
     */
    private assessRisks(sprint: SprintPlan): SprintRisk {
        const factors: string[] = [];
        const mitigations: string[] = [];

        // Check for database tasks
        const hasDatabaseTasks = sprint.tasks.some(t => t.agent === 'Database');
        if (hasDatabaseTasks) {
            factors.push('Database schema changes (potential data loss)');
            mitigations.push('Ensure database backups before execution');
        }

        // Check for infrastructure tasks
        const hasInfraTasks = sprint.tasks.some(t => t.agent === 'Infrastructure');
        if (hasInfraTasks) {
            factors.push('Infrastructure changes (potential downtime)');
            mitigations.push('Review infrastructure changes carefully');
        }

        // Check for API tasks
        const hasAPITasks = sprint.tasks.some(t => t.agent === 'API');
        if (hasAPITasks) {
            factors.push('API changes (potential breaking changes)');
            mitigations.push('Ensure API versioning strategy');
        }

        // Determine risk level
        let level: 'low' | 'medium' | 'high' = 'low';
        if (factors.length >= 2) {
            level = 'medium';
        }
        if (hasDatabaseTasks && hasAPITasks) {
            level = 'high';
        }

        return {
            level,
            factors: factors.length > 0 ? factors : ['No significant risks detected'],
            mitigations,
        };
    }

    /**
     * Format approval dialog
     */
    private formatApprovalDialog(
        sprint: SprintPlan,
        summary: string,
        risks: SprintRisk
    ): string {
        let message = summary;

        message += `\nRisk Assessment: ${risks.level.toUpperCase()}\n`;
        message += `Risk Factors:\n`;
        risks.factors.forEach(factor => {
            message += `  - ${factor}\n`;
        });

        if (risks.mitigations.length > 0) {
            message += `\nMitigations:\n`;
            risks.mitigations.forEach(mitigation => {
                message += `  - ${mitigation}\n`;
            });
        }

        message += `\nApprove this sprint to begin execution?`;

        return message;
    }
}
