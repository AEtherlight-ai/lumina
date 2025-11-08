/**
 * InterviewFlow Command: Orchestrates detection + interview for project initialization
 *
 * DESIGN DECISION: Command pattern with detection integration
 * WHY: Bridges Phase 3 (detection) and Phase 4 (interview) for self-configuration
 *
 * REASONING CHAIN:
 * 1. Run all detection services (TechStack, Tool, Workflow, Domain)
 * 2. Convert detection results to initial interview answers
 * 3. Load interview template (project-initialization.json)
 * 4. Run InterviewEngine with initial answers (conditionals skip detected fields)
 * 5. Return final answers to ProjectConfigGenerator
 *
 * ALGORITHM:
 * - High confidence detection (≥0.8) → Question skipped (conditional evaluates to false)
 * - Low confidence detection (<0.8) → Question asked (conditional evaluates to true)
 * - Always ask: DEPLOY_TARGET (not detectable)
 *
 * PATTERN: Pattern-TDD-001 (85% coverage for API code)
 * PATTERN: Pattern-PUBLISH-003 (No runtime npm dependencies, use VS Code APIs)
 * RELATED: SELF-002 (ProjectConfigGenerator), SELF-004 (InterviewEngine), SELF-006-009 (Detection services)
 */

import * as path from 'path';
import { TechStackDetector, DetectionResult as TechStackDetectionResult } from '../services/TechStackDetector';
import { ToolDetector, ToolDetectionResult } from '../services/ToolDetector';
import { WorkflowDetector, WorkflowDetectionResult } from '../services/WorkflowDetector';
import { DomainDetector, DomainDetectionResult } from '../services/DomainDetector';
import { InterviewEngine, InterviewTemplate } from '../services/InterviewEngine';
import { InterviewAnswers } from '../services/ProjectConfigGenerator';
import { MiddlewareLogger } from '../services/MiddlewareLogger';

/**
 * Detection results from all Phase 3 detectors
 */
export interface DetectionResults {
    techStack: TechStackDetectionResult;
    tools: ToolDetectionResult;
    workflow: WorkflowDetectionResult;
    domain: DomainDetectionResult;
}

/**
 * Detection metadata for conditional logic in interview questions
 *
 * DESIGN DECISION: Store confidence scores in _detection field
 * WHY: Interview template conditionals can check confidence (e.g., "answers._detection.language.confidence < 0.8")
 */
interface DetectionMetadata {
    [key: string]: {
        value: any;
        confidence: number;
    };
}

/**
 * InterviewFlow Command: Orchestrates detection + interview
 *
 * DESIGN DECISION: Command class with dependency injection
 * WHY: Testable (inject mocked detectors), single responsibility
 */
export class InterviewFlowCommand {
    private logger: MiddlewareLogger;

    constructor(
        private techStackDetector: TechStackDetector,
        private toolDetector: ToolDetector,
        private workflowDetector: WorkflowDetector,
        private domainDetector: DomainDetector,
        private interviewEngine: InterviewEngine
    ) {
        this.logger = MiddlewareLogger.getInstance();
    }

    /**
     * Run all detection services in parallel
     *
     * @param projectRoot - Absolute path to project root
     * @returns Detection results from all Phase 3 detectors
     *
     * PERFORMANCE: Runs detectors in parallel (<500ms for all)
     */
    public async runDetection(projectRoot: string): Promise<DetectionResults> {
        const startTime = this.logger.startOperation('InterviewFlowCommand.runDetection', {
            projectRoot
        });

        try {
            // Run all detectors in parallel for performance
            const [techStack, tools, workflow, domain] = await Promise.all([
                this.techStackDetector.detect(projectRoot),
                this.toolDetector.detect(projectRoot),
                this.workflowDetector.detect(projectRoot),
                this.domainDetector.detect(projectRoot)
            ]);

            this.logger.endOperation('InterviewFlowCommand.runDetection', startTime, {
                techStackConfidence: techStack.confidence,
                toolsConfidence: tools.confidence,
                workflowConfidence: workflow.confidence,
                domainConfidence: domain.confidence
            });

            return {
                techStack,
                tools,
                workflow,
                domain
            };
        } catch (error) {
            this.logger.failOperation('InterviewFlowCommand.runDetection', startTime, error);
            throw error;
        }
    }

    /**
     * Convert detection results to initial interview answers
     *
     * @param detectionResults - Detection results from Phase 3 detectors
     * @returns Initial answers object for InterviewEngine
     *
     * ALGORITHM:
     * 1. Extract values from detection results
     * 2. Store confidence scores in _detection metadata
     * 3. InterviewEngine conditionals check confidence to skip questions
     *
     * DESIGN DECISION: Use _detection field for metadata
     * WHY: Keeps detection metadata separate from user answers, prevents conflicts
     */
    public prepareInitialAnswers(detectionResults: DetectionResults): Partial<InterviewAnswers> {
        const answers: Partial<InterviewAnswers> = {};
        const detectionMetadata: DetectionMetadata = {};

        // TechStackDetector results
        if (detectionResults.techStack.language) {
            answers.LANGUAGE = detectionResults.techStack.language;
            detectionMetadata.language = {
                value: detectionResults.techStack.language,
                confidence: detectionResults.techStack.confidence
            };
        }

        if (detectionResults.techStack.packageManager) {
            answers.PACKAGE_MANAGER = detectionResults.techStack.packageManager;
            detectionMetadata.packageManager = {
                value: detectionResults.techStack.packageManager,
                confidence: detectionResults.techStack.confidence
            };
        }

        // ToolDetector results
        if (detectionResults.tools.testFramework) {
            answers.TEST_FRAMEWORK = detectionResults.tools.testFramework;
            detectionMetadata.testFramework = {
                value: detectionResults.tools.testFramework,
                confidence: detectionResults.tools.confidence
            };
        }

        if (detectionResults.tools.buildCommand) {
            answers.BUILD_COMMAND = detectionResults.tools.buildCommand;
            detectionMetadata.buildCommand = {
                value: detectionResults.tools.buildCommand,
                confidence: detectionResults.tools.confidence
            };
        }

        // Store detection metadata for conditional logic
        (answers as any)._detection = detectionMetadata;

        return answers;
    }

    /**
     * Run full interview flow: detection → interview → answers
     *
     * @param projectRoot - Absolute path to project root
     * @param templatePath - Path to interview template JSON
     * @returns Final interview answers (ready for ProjectConfigGenerator)
     *
     * ALGORITHM:
     * 1. Run detection services in parallel
     * 2. Convert detection results to initial answers
     * 3. Load interview template
     * 4. Run InterviewEngine with initial answers
     * 5. Return final answers
     *
     * PERFORMANCE TARGET: <200ms (excluding user interaction time)
     * COVERAGE TARGET: 85% (API code)
     */
    public async runInterviewFlow(
        projectRoot: string,
        templatePath: string
    ): Promise<InterviewAnswers> {
        const startTime = this.logger.startOperation('InterviewFlowCommand.runInterviewFlow', {
            projectRoot,
            templatePath
        });

        try {
            // Step 1: Run detection services
            const detectionResults = await this.runDetection(projectRoot);

            // Step 2: Convert detection results to initial answers
            const initialAnswers = this.prepareInitialAnswers(detectionResults);

            this.logger.info('Initial answers from detection', {
                hasLanguage: !!initialAnswers.LANGUAGE,
                hasPackageManager: !!initialAnswers.PACKAGE_MANAGER,
                hasTestFramework: !!initialAnswers.TEST_FRAMEWORK,
                hasBuildCommand: !!initialAnswers.BUILD_COMMAND,
                detectionCount: Object.keys((initialAnswers as any)._detection || {}).length
            });

            // Step 3: Load interview template
            const template = await this.interviewEngine.loadTemplate(templatePath);

            // Step 4: Run interview with initial answers
            const finalAnswers = await this.interviewEngine.runInterview(template, initialAnswers);

            // Handle cancellation
            if (!finalAnswers) {
                throw new Error('Interview cancelled by user');
            }

            // Step 5: Remove detection metadata from final answers
            delete (finalAnswers as any)._detection;

            this.logger.endOperation('InterviewFlowCommand.runInterviewFlow', startTime, {
                finalAnswerCount: Object.keys(finalAnswers).length
            });

            return finalAnswers;
        } catch (error) {
            this.logger.failOperation('InterviewFlowCommand.runInterviewFlow', startTime, error);
            throw error;
        }
    }

    /**
     * Get default template path for project initialization
     *
     * @returns Absolute path to project-initialization.json template
     */
    public getDefaultTemplatePath(): string {
        return path.join(__dirname, '../templates/interview-flows/project-initialization.json');
    }
}
