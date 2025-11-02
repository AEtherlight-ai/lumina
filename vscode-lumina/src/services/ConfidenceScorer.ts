/**
 * ConfidenceScorer: Scores sprint task completeness for incremental analysis
 *
 * DESIGN DECISION: Confidence-based gap detection
 * WHY: Re-analyzing complete tasks wastes tokens (60%+ savings by skipping high-confidence)
 *
 * REASONING CHAIN:
 * 1. Sprint has 10 tasks, 7 complete (agent, patterns, files, validation, why/context)
 * 2. Why re-analyze those 7 complete tasks? They have all context needed.
 * 3. ConfidenceScorer evaluates completeness (0.0-1.0)
 * 4. High confidence (≥0.8) → ACCEPT, don't re-analyze
 * 5. Medium confidence (0.5-0.8) → FILL GAPS only
 * 6. Low confidence (<0.5) → REGENERATE completely
 * 7. Result: Only analyze what's needed, save 60% tokens
 *
 * SCORING CRITERIA (each worth 0.2, total 1.0):
 * - agent assigned: +0.2 (knows who handles it)
 * - patterns referenced: +0.2 (follows standards)
 * - deliverables/files: +0.2 (knows what to create)
 * - validation_criteria: +0.2 (knows when done)
 * - why/context: +0.2 (understands reasoning)
 *
 * PATTERN: Pattern-INCREMENTAL-001 (Smart Gap Filling)
 * PATTERN: Pattern-CONFIDENCE-001 (Confidence-Based Analysis)
 * RELATED: MultiFormatParser.ts, SkillOrchestrator.ts (future)
 */

import { Task } from './MultiFormatParser';

/**
 * Task confidence score with gaps and recommended action
 */
export interface TaskScore {
    taskId: string;
    confidence: number;  // 0.0-1.0
    action: 'accept' | 'fill_gaps' | 'regenerate';
    gaps: string[];  // Missing fields (e.g., ['agent', 'patterns'])
}

/**
 * Sprint-level confidence aggregation
 */
export interface SprintConfidence {
    averageConfidence: number;  // Mean confidence across all tasks
    totalTasks: number;
    distribution: {
        high: number;    // Count of tasks ≥0.8 confidence
        medium: number;  // Count of tasks 0.5-0.79 confidence
        low: number;     // Count of tasks <0.5 confidence
    };
    taskScores: TaskScore[];  // Individual task scores
}

/**
 * Confidence scorer for sprint task completeness
 *
 * DESIGN DECISION: Pure scoring logic, no file I/O
 * WHY: Separation of concerns - scorer evaluates Task objects, caller handles file loading
 * BENEFIT: Easy to test, reusable across different input sources
 */
export class ConfidenceScorer {
    /**
     * Score individual task completeness (0.0-1.0)
     *
     * @param task - Task to evaluate
     * @returns TaskScore with confidence, action, and gaps
     *
     * SCORING CRITERIA (each +0.2):
     * 1. agent assigned → knows who handles it
     * 2. patterns referenced → follows standards
     * 3. deliverables/files → knows what to create
     * 4. validation_criteria → knows when done
     * 5. why OR context → understands reasoning
     */
    public scoreTask(task: Task): TaskScore {
        let confidence = 0.0;
        const gaps: string[] = [];

        // Criterion 1: Agent assigned (+0.2)
        if (task.agent && task.agent.length > 0) {
            confidence += 0.2;
        } else {
            gaps.push('agent');
        }

        // Criterion 2: Patterns referenced (+0.2)
        if (task.patterns && task.patterns.length > 0) {
            confidence += 0.2;
        } else {
            gaps.push('patterns');
        }

        // Criterion 3: Deliverables/Files specified (+0.2)
        if (task.deliverables && task.deliverables.length > 0) {
            confidence += 0.2;
        } else {
            gaps.push('deliverables');
        }

        // Criterion 4: Validation criteria defined (+0.2)
        if (task.validation_criteria && task.validation_criteria.length > 0) {
            confidence += 0.2;
        } else {
            gaps.push('validation_criteria');
        }

        // Criterion 5: Why OR Context provided (+0.2)
        if ((task.why && task.why.length > 0) || (task.context && task.context.length > 0)) {
            confidence += 0.2;
        } else {
            gaps.push('why/context');
        }

        // Determine action based on confidence threshold
        let action: 'accept' | 'fill_gaps' | 'regenerate';
        if (confidence >= 0.8) {
            action = 'accept';  // High confidence, don't re-analyze
        } else if (confidence >= 0.5) {
            action = 'fill_gaps';  // Medium confidence, fill missing fields only
        } else {
            action = 'regenerate';  // Low confidence, regenerate completely
        }

        return {
            taskId: task.id,
            confidence: Math.round(confidence * 10) / 10,  // Round to 1 decimal to avoid floating-point issues
            action,
            gaps
        };
    }

    /**
     * Score entire sprint for confidence distribution
     *
     * @param tasks - Array of tasks to score
     * @returns SprintConfidence with average, distribution, and individual scores
     *
     * DESIGN DECISION: Calculate distribution for visibility
     * WHY: User needs to see "7 high confidence, 2 medium, 1 low" to understand sprint health
     */
    public scoreSprint(tasks: Task[]): SprintConfidence {
        if (tasks.length === 0) {
            return {
                averageConfidence: 0.0,
                totalTasks: 0,
                distribution: { high: 0, medium: 0, low: 0 },
                taskScores: []
            };
        }

        // Score each task
        const taskScores = tasks.map(task => this.scoreTask(task));

        // Calculate average confidence
        const totalConfidence = taskScores.reduce((sum, score) => sum + score.confidence, 0);
        const averageConfidence = totalConfidence / tasks.length;

        // Calculate distribution
        const distribution = {
            high: taskScores.filter(s => s.confidence >= 0.8).length,
            medium: taskScores.filter(s => s.confidence >= 0.5 && s.confidence < 0.8).length,
            low: taskScores.filter(s => s.confidence < 0.5).length
        };

        return {
            averageConfidence: Math.round(averageConfidence * 10) / 10,  // Round to 1 decimal
            totalTasks: tasks.length,
            distribution,
            taskScores
        };
    }

    /**
     * Get human-readable confidence report for sprint
     *
     * @param sprintConfidence - Sprint confidence data
     * @returns Formatted string report
     *
     * DESIGN DECISION: Provide human-readable output
     * WHY: User (and orchestrator) need clear summary of sprint health
     */
    public getConfidenceReport(sprintConfidence: SprintConfidence): string {
        const { averageConfidence, totalTasks, distribution } = sprintConfidence;

        const lines = [
            `Sprint Confidence Report`,
            `========================`,
            `Total Tasks: ${totalTasks}`,
            `Average Confidence: ${averageConfidence.toFixed(1)} / 1.0`,
            ``,
            `Distribution:`,
            `  High (≥0.8):   ${distribution.high} tasks (ACCEPT - don't re-analyze)`,
            `  Medium (0.5-0.79): ${distribution.medium} tasks (FILL GAPS only)`,
            `  Low (<0.5):    ${distribution.low} tasks (REGENERATE completely)`,
            ``,
            `Token Savings: ~${Math.round((distribution.high / totalTasks) * 100)}% (skip high-confidence tasks)`
        ];

        return lines.join('\n');
    }
}
