/**
 * Init Command: Full self-configuration pipeline orchestration
 *
 * DESIGN DECISION: Orchestrates Phase 3 detection + Phase 4 interview + config generation
 * WHY: Single entry point for complete self-configuration setup
 *
 * REASONING CHAIN:
 * 1. User runs `lumina init` command
 * 2. Phase 3: Run detection services (TechStack, Tool, Workflow, Domain)
 * 3. Phase 4: Run interview flow (conditional questions based on detection)
 * 4. Merge: Interview answers override detection results
 * 5. Generate: Create validated ProjectConfig using ProjectConfigGenerator
 * 6. Persist: Write config to .aetherlight/project-config.json
 * 7. Result: Self-configuration complete, ready for VariableResolver
 *
 * ALGORITHM:
 * - InterviewFlowCommand handles detection + interview + merge
 * - ProjectConfigGenerator converts interview answers to ProjectConfig
 * - InitCommand handles persistence and error recovery
 *
 * PATTERN: Pattern-TDD-001 (90% coverage for infrastructure)
 * PATTERN: Pattern-PUBLISH-003 (No runtime npm dependencies)
 * RELATED: SELF-011 (InterviewFlowCommand), SELF-002 (ProjectConfigGenerator)
 */

import * as fs from 'fs';
import * as path from 'path';
import { InterviewFlowCommand } from './interviewFlow';
import { ProjectConfigGenerator, InterviewAnswers, DetectionResults } from '../services/ProjectConfigGenerator';
import { ProjectConfig } from '../services/ProjectConfig';
import { MiddlewareLogger } from '../services/MiddlewareLogger';

/**
 * InitCommand: Orchestrates complete self-configuration pipeline
 *
 * DESIGN DECISION: Command class with dependency injection
 * WHY: Testable (inject mocked services), single responsibility
 */
export class InitCommand {
    private logger: MiddlewareLogger;

    constructor(
        private interviewFlowCommand: InterviewFlowCommand,
        private projectConfigGenerator: ProjectConfigGenerator
    ) {
        this.logger = MiddlewareLogger.getInstance();
    }

    /**
     * Run complete self-configuration pipeline
     *
     * @param projectRoot - Absolute path to project root
     * @returns Path to written config file (.aetherlight/project-config.json)
     *
     * ALGORITHM:
     * 1. Run InterviewFlowCommand (detection + interview + merge)
     * 2. Convert interview answers to detection format
     * 3. Generate validated ProjectConfig
     * 4. Ensure .aetherlight directory exists
     * 5. Write config to .aetherlight/project-config.json
     * 6. Return config file path
     *
     * PERFORMANCE TARGET: <5s total (detection + interview + generation + write)
     * COVERAGE TARGET: 90% (infrastructure code)
     */
    public async run(projectRoot: string): Promise<string> {
        const startTime = this.logger.startOperation('InitCommand.run', {
            projectRoot
        });

        try {
            // Step 1: Run interview flow (detection + interview + merge)
            this.logger.info('Running interview flow (detection + interview)');
            const templatePath = this.interviewFlowCommand.getDefaultTemplatePath();
            const interviewAnswers = await this.interviewFlowCommand.runInterviewFlow(
                projectRoot,
                templatePath
            );

            // Step 2: Convert interview answers to detection format for config generator
            const detectionResults = this.convertInterviewToDetection(interviewAnswers, projectRoot);

            // Step 3: Generate validated ProjectConfig
            this.logger.info('Generating project configuration');
            const config = this.projectConfigGenerator.generate(detectionResults, interviewAnswers);

            // Step 4: Ensure .aetherlight directory exists
            const aetherlightDir = path.join(projectRoot, '.aetherlight');
            if (!fs.existsSync(aetherlightDir)) {
                this.logger.info('Creating .aetherlight directory', { aetherlightDir });
                fs.mkdirSync(aetherlightDir, { recursive: true });
            }

            // Step 5: Write config to .aetherlight/project-config.json
            const configPath = path.join(aetherlightDir, 'project-config.json');
            this.logger.info('Writing config file', { configPath });

            try {
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
            } catch (writeError) {
                throw new Error(`Failed to write config file: ${(writeError as Error).message}`);
            }

            this.logger.endOperation('InitCommand.run', startTime, {
                configPath,
                projectName: config.project_name,
                language: config.language.language
            });

            // Step 6: Return config file path
            return configPath;
        } catch (error) {
            this.logger.failOperation('InitCommand.run', startTime, error);
            throw error;
        }
    }

    /**
     * Convert interview answers to detection format
     *
     * @param interviewAnswers - Answers from InterviewEngine
     * @param projectRoot - Project root path
     * @returns DetectionResults compatible with ProjectConfigGenerator
     *
     * DESIGN DECISION: Adapter pattern to bridge interview answers → detection results
     * WHY: ProjectConfigGenerator expects DetectionResults, but we have InterviewAnswers
     *
     * ALGORITHM:
     * - Map LANGUAGE → language
     * - Map PACKAGE_MANAGER → package_manager
     * - Map TEST_FRAMEWORK → test_framework
     * - Map BUILD_COMMAND → build_command
     * - Map TEST_COMMAND → test_command
     * - Add project_root from parameter
     */
    private convertInterviewToDetection(
        interviewAnswers: InterviewAnswers,
        projectRoot: string
    ): DetectionResults {
        const detection: DetectionResults = {
            project_root: projectRoot
        };

        // Map interview field names to detection field names
        if (interviewAnswers.LANGUAGE) {
            detection.language = interviewAnswers.LANGUAGE as any;
        }

        if (interviewAnswers.PACKAGE_MANAGER) {
            detection.package_manager = interviewAnswers.PACKAGE_MANAGER as any;
        }

        if (interviewAnswers.TEST_FRAMEWORK) {
            detection.test_framework = interviewAnswers.TEST_FRAMEWORK as any;
        }

        if (interviewAnswers.BUILD_COMMAND) {
            detection.build_command = interviewAnswers.BUILD_COMMAND;
        }

        if (interviewAnswers.TEST_COMMAND) {
            detection.test_command = interviewAnswers.TEST_COMMAND;
        }

        if (interviewAnswers.source_directory) {
            detection.source_directory = interviewAnswers.source_directory;
        }

        if (interviewAnswers.test_directory) {
            detection.test_directory = interviewAnswers.test_directory;
        }

        if (interviewAnswers.output_directory) {
            detection.output_directory = interviewAnswers.output_directory;
        }

        return detection;
    }

    /**
     * Get default config path for project
     *
     * @param projectRoot - Project root directory
     * @returns Absolute path to project-config.json
     */
    public getConfigPath(projectRoot: string): string {
        return path.join(projectRoot, '.aetherlight', 'project-config.json');
    }
}
