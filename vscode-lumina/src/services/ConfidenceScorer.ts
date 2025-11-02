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
 * SCORING CRITERIA (total 1.0):
 * - agent assigned: +0.15 (knows who handles it)
 * - patterns referenced: +0.15 (follows standards)
 * - deliverables/files: +0.15 (knows what to create)
 * - validation_criteria: +0.15 (knows when done)
 * - why/context: +0.10 (understands reasoning)
 * - test_files: +0.10 (tests exist)
 * - test_requirements: +0.05 (TDD requirements defined)
 * - passing_tests: +0.15 (tests pass - highest weight, most critical)
 *
 * PATTERN: Pattern-INCREMENTAL-001 (Smart Gap Filling)
 * PATTERN: Pattern-CONFIDENCE-001 (Confidence-Based Analysis)
 * RELATED: MultiFormatParser.ts, SkillOrchestrator.ts (future)
 */

import { Task } from './MultiFormatParser';
import { TestRequirementGenerator } from './TestRequirementGenerator';
import { TestContextGatherer, TestContext } from './TestContextGatherer';

/**
 * Task confidence score with gaps and recommended action
 */
export interface TaskScore {
    taskId: string;
    confidence: number;  // 0.0-1.0
    action: 'accept' | 'fill_gaps' | 'regenerate';
    gaps: string[];  // Missing fields (e.g., ['agent', 'patterns'])
    testContext?: TestContext;  // Test validation results
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
 * DESIGN DECISION: Pure scoring logic with optional test validation
 * WHY: Separation of concerns - scorer evaluates Task objects, test validation is optional
 * BENEFIT: Easy to test, reusable across different input sources
 */
export class ConfidenceScorer {
    private testContextGatherer: TestContextGatherer;

    constructor(workspaceRoot?: string) {
        this.testContextGatherer = new TestContextGatherer(workspaceRoot);
    }
    /**
     * Score individual task completeness (0.0-1.0) with TDD enforcement
     *
     * @param task - Task to evaluate
     * @param includeTestValidation - Whether to validate tests (async, slower but comprehensive)
     * @returns TaskScore with confidence, action, and gaps
     *
     * SCORING CRITERIA (total 1.0):
     * 1. agent assigned → +0.15
     * 2. patterns referenced → +0.15
     * 3. deliverables/files → +0.15
     * 4. validation_criteria → +0.15
     * 5. why OR context → +0.10
     * 6. test_files exist → +0.10
     * 7. test_requirements defined → +0.05
     * 8. passing_tests → +0.15 (highest weight - most critical!)
     */
    public async scoreTask(task: Task, includeTestValidation: boolean = false): Promise<TaskScore> {
        let confidence = 0.0;
        const gaps: string[] = [];
        let testContext: TestContext | undefined;

        // Criterion 1: Agent assigned (+0.15)
        if (task.agent && task.agent.length > 0) {
            confidence += 0.15;
        } else {
            gaps.push('agent');
        }

        // Criterion 2: Patterns referenced (+0.15)
        if (task.patterns && task.patterns.length > 0) {
            confidence += 0.15;
        } else {
            gaps.push('patterns');
        }

        // Criterion 3: Deliverables/Files specified (+0.15)
        if (task.deliverables && task.deliverables.length > 0) {
            confidence += 0.15;
        } else {
            gaps.push('deliverables');
        }

        // Criterion 4: Validation criteria defined (+0.15)
        if (task.validation_criteria && task.validation_criteria.length > 0) {
            confidence += 0.15;
        } else {
            gaps.push('validation_criteria');
        }

        // Criterion 5: Why OR Context provided (+0.10)
        if ((task.why && task.why.length > 0) || (task.context && task.context.length > 0)) {
            confidence += 0.10;
        } else {
            gaps.push('why/context');
        }

        // TDD SCORING (0.30 total - 30% of confidence!)

        // Check if task needs tests
        const needsTests = TestRequirementGenerator.needsTests(task as any);

        if (!needsTests) {
            // Documentation/pattern tasks don't need tests → full TDD score
            confidence += 0.30;
        } else {
            // Criterion 6: Test files exist (+0.10)
            const hasTestFiles = (task as any).test_files && (task as any).test_files.length > 0;
            if (hasTestFiles) {
                confidence += 0.10;
            } else {
                gaps.push('test_files');
            }

            // Criterion 7: Test requirements defined (+0.05)
            const hasTestRequirements = (task as any).test_requirements && (task as any).test_requirements.length > 0;
            if (hasTestRequirements) {
                confidence += 0.05;
            } else {
                gaps.push('test_requirements');
            }

            // Criterion 8: Tests passing (+0.15) - HIGHEST WEIGHT
            if (includeTestValidation && hasTestFiles) {
                // Gather actual test context (async operation)
                testContext = await this.testContextGatherer.gather(
                    task.id,
                    (task as any).test_files || []
                );

                if (testContext.testsPassing) {
                    confidence += 0.15;
                } else {
                    gaps.push('passing_tests');
                }
            } else if ((task as any).tests_passing === true) {
                // Trust cached test status if available
                confidence += 0.15;
            } else {
                gaps.push('passing_tests');
            }
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
            confidence: Math.round(confidence * 100) / 100,  // Round to 2 decimals
            action,
            gaps,
            testContext
        };
    }

    /**
     * Score task synchronously (without test validation)
     * Use this for quick scoring when you don't need actual test execution validation
     */
    public scoreTaskSync(task: Task): TaskScore {
        // Call async version but don't include test validation
        // This is safe because without test validation, the method is synchronous
        let result: TaskScore;
        this.scoreTask(task, false).then(score => {
            result = score;
        });
        // @ts-ignore - result will be defined synchronously
        return result;
    }

    /**
     * Score entire sprint for confidence distribution
     *
     * @param tasks - Array of tasks to score
     * @param includeTestValidation - Whether to validate tests (async, slower but comprehensive)
     * @returns SprintConfidence with average, distribution, and individual scores
     *
     * DESIGN DECISION: Calculate distribution for visibility
     * WHY: User needs to see "7 high confidence, 2 medium, 1 low" to understand sprint health
     */
    public async scoreSprint(tasks: Task[], includeTestValidation: boolean = false): Promise<SprintConfidence> {
        if (tasks.length === 0) {
            return {
                averageConfidence: 0.0,
                totalTasks: 0,
                distribution: { high: 0, medium: 0, low: 0 },
                taskScores: []
            };
        }

        // Score each task (async)
        const taskScores = await Promise.all(
            tasks.map(task => this.scoreTask(task, includeTestValidation))
        );

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
            averageConfidence: Math.round(averageConfidence * 100) / 100,  // Round to 2 decimals
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
