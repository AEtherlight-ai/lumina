/**
 * ProjectConfigGenerator: Generates project-config.json from detection + interview
 *
 * DESIGN DECISION: Merge detection results with user interview, validate, apply defaults
 * WHY: Central configuration drives all ÆtherLight customization
 *
 * REASONING CHAIN:
 * 1. Problem: Detection provides partial data, interview provides overrides
 * 2. Goal: Generate complete, valid project-config.json
 * 3. Solution: Merge detection + interview (interview wins), apply defaults, validate
 * 4. Output: .aetherlight/project-config.json ready for VariableResolver
 * 5. Result: Single source of truth for all project customization
 *
 * MERGE STRATEGY:
 * - Interview overrides detection (user preference wins)
 * - Detection fills gaps (user doesn't need to answer everything)
 * - Defaults fill remaining gaps (from DEFAULT_CONFIG)
 *
 * VALIDATION:
 * - Use ProjectConfigValidator (manual validation, no ajv)
 * - Pattern-PUBLISH-003 compliant (no runtime npm dependencies)
 *
 * PATTERN: Pattern-TDD-001 (90% coverage required for infrastructure)
 * PATTERN: Pattern-PUBLISH-003 (No runtime npm dependencies)
 * RELATED: SELF-001 (VariableResolver), SELF-003 (ProjectConfig schema)
 */

import * as fs from 'fs';
import * as path from 'path';
import { ProjectConfig, DEFAULT_CONFIG, LanguageType, PackageManager, TestFramework } from './ProjectConfig';
import { ProjectConfigValidator } from './ProjectConfigValidator';
import { MiddlewareLogger } from './MiddlewareLogger';

/**
 * Detection results from Phase 3 detectors
 *
 * DESIGN DECISION: Simple interface for detection phase
 * WHY: Detectors haven't been built yet (Phase 3), need flexible structure
 */
export interface DetectionResults {
    /** Detected programming language */
    language?: LanguageType;

    /** Detected package manager */
    package_manager?: PackageManager;

    /** Detected test framework */
    test_framework?: TestFramework;

    /** Detected file extensions */
    file_extensions?: string[];

    /** Detected build command */
    build_command?: string;

    /** Detected compile command (if separate) */
    compile_command?: string;

    /** Detected test command */
    test_command?: string;

    /** Detected project root directory */
    project_root?: string;

    /** Detected source directory */
    source_directory?: string;

    /** Detected test directory */
    test_directory?: string;

    /** Detected output directory */
    output_directory?: string;

    /** Any additional detected fields */
    [key: string]: any;
}

/**
 * Interview answers from InterviewEngine (SELF-004)
 *
 * DESIGN DECISION: Allow any field to be overridden by interview
 * WHY: User preferences should always take precedence over detection
 */
export interface InterviewAnswers {
    /** User-specified project name */
    project_name?: string;

    /** Override detected language */
    language?: LanguageType;

    /** Override detected package manager */
    package_manager?: PackageManager;

    /** Override detected test framework */
    test_framework?: TestFramework;

    /** Override build command */
    build_command?: string;

    /** Override test command */
    test_command?: string;

    /** Override source directory */
    source_directory?: string;

    /** Override test directory */
    test_directory?: string;

    /** Override coverage targets */
    coverage_infrastructure?: number;
    coverage_api?: number;
    coverage_ui?: number;

    /** Any additional interview answers */
    [key: string]: any;
}

/**
 * ProjectConfigGenerator: Generates validated project configuration
 *
 * DESIGN DECISION: Pure service with no state, uses ProjectConfigValidator
 * WHY: Simple, testable, follows single responsibility principle
 */
export class ProjectConfigGenerator {
    private logger: MiddlewareLogger;
    private validator: ProjectConfigValidator;

    constructor() {
        this.logger = MiddlewareLogger.getInstance();
        this.validator = new ProjectConfigValidator();
    }

    /**
     * Generate project configuration from detection + interview results
     *
     * @param detection - Detection results from Phase 3 detectors
     * @param interview - Interview answers from InterviewEngine
     * @returns Complete, validated ProjectConfig
     *
     * ALGORITHM:
     * 1. Start with DEFAULT_CONFIG as base
     * 2. Apply detection results (overrides defaults)
     * 3. Apply interview answers (overrides detection)
     * 4. Validate using ProjectConfigValidator
     * 5. Return validated config
     *
     * PERFORMANCE: <50ms generation time (target from sprint)
     */
    public generate(detection: DetectionResults, interview: InterviewAnswers): ProjectConfig {
        const startTime = this.logger.startOperation('ProjectConfigGenerator.generate', {
            hasDetection: !!detection,
            hasInterview: !!interview
        });

        try {
            // Step 1: Start with default config
            const config: ProjectConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

            // Step 2: Apply detection results
            this.applyDetection(config, detection);

            // Step 3: Apply interview answers (overrides detection)
            this.applyInterview(config, interview);

            // Step 4: Derive project name if not provided
            if (config.project_name === 'unknown-project') {
                config.project_name = this.deriveProjectName(detection);
            }

            // Step 5: Validate configuration
            const validationResult = this.validator.validate(config);
            if (!validationResult.valid) {
                const errorMessages = validationResult.errors.map(e => e.field + ': ' + e.message).join(', ');
                throw new Error('Invalid configuration: ' + errorMessages);
            }

            this.logger.endOperation('ProjectConfigGenerator.generate', startTime, {
                projectName: config.project_name,
                language: config.language.language
            });

            return config;
        } catch (error) {
            this.logger.failOperation('ProjectConfigGenerator.generate', startTime, error);
            throw error;
        }
    }

    /**
     * Apply detection results to configuration
     *
     * @param config - Configuration to modify (in-place)
     * @param detection - Detection results
     *
     * DESIGN DECISION: Modify config in-place for performance
     * WHY: Avoid unnecessary object copying (<50ms target)
     */
    private applyDetection(config: ProjectConfig, detection: DetectionResults): void {
        if (!detection) {
            return;
        }

        // Language configuration
        if (detection.language) {
            config.language.language = detection.language;
        }
        if (detection.package_manager) {
            config.language.package_manager = detection.package_manager;
        }
        if (detection.test_framework) {
            config.language.test_framework = detection.test_framework;
        }
        if (detection.file_extensions) {
            config.language.file_extensions = detection.file_extensions;
        }
        if (detection.build_command) {
            config.language.build_command = detection.build_command;
        }
        if (detection.compile_command) {
            config.language.compile_command = detection.compile_command;
        }
        if (detection.test_command) {
            config.language.test_command = detection.test_command;
        }

        // Project structure
        if (detection.source_directory) {
            config.structure.source_directory = detection.source_directory;
        }
        if (detection.test_directory) {
            config.structure.test_directory = detection.test_directory;
        }
        if (detection.output_directory) {
            config.structure.output_directory = detection.output_directory;
        }
    }

    /**
     * Apply interview answers to configuration (overrides detection)
     *
     * @param config - Configuration to modify (in-place)
     * @param interview - Interview answers
     *
     * DESIGN DECISION: Interview answers take precedence over detection
     * WHY: User preferences are authoritative
     */
    private applyInterview(config: ProjectConfig, interview: InterviewAnswers): void {
        if (!interview) {
            return;
        }

        // Project metadata
        if (interview.project_name) {
            config.project_name = interview.project_name;
        }

        // Language configuration (overrides detection)
        if (interview.language) {
            config.language.language = interview.language;
        }
        if (interview.package_manager) {
            config.language.package_manager = interview.package_manager;
        }
        if (interview.test_framework) {
            config.language.test_framework = interview.test_framework;
        }
        if (interview.build_command) {
            config.language.build_command = interview.build_command;
        }
        if (interview.test_command) {
            config.language.test_command = interview.test_command;
        }

        // Project structure (overrides detection)
        if (interview.source_directory) {
            config.structure.source_directory = interview.source_directory;
        }
        if (interview.test_directory) {
            config.structure.test_directory = interview.test_directory;
        }

        // Testing configuration
        if (interview.coverage_infrastructure !== undefined) {
            config.testing.coverage_infrastructure = interview.coverage_infrastructure;
        }
        if (interview.coverage_api !== undefined) {
            config.testing.coverage_api = interview.coverage_api;
        }
        if (interview.coverage_ui !== undefined) {
            config.testing.coverage_ui = interview.coverage_ui;
        }
    }

    /**
     * Derive project name from detection results
     *
     * @param detection - Detection results
     * @returns Derived project name
     *
     * DESIGN DECISION: Extract project name from directory path
     * WHY: Better UX than "unknown-project" default
     */
    private deriveProjectName(detection: DetectionResults): string {
        if (detection.project_root) {
            // Extract directory name from path
            const parts = detection.project_root.split(/[/\\]/);
            const lastPart = parts[parts.length - 1];
            if (lastPart && lastPart.length > 0) {
                return lastPart;
            }
        }

        return 'unknown-project';
    }

    /**
     * Serialize configuration to JSON string
     *
     * @param config - Configuration to serialize
     * @returns JSON string (pretty-printed with 2-space indent)
     *
     * DESIGN DECISION: Pretty-print JSON for human readability
     * WHY: Users may manually edit project-config.json
     */
    public toJSON(config: ProjectConfig): string {
        return JSON.stringify(config, null, 2);
    }

    /**
     * Write configuration to .aetherlight/project-config.json
     *
     * @param config - Configuration to write
     * @param rootPath - Project root directory
     *
     * DESIGN DECISION: Create .aetherlight/ directory if missing
     * WHY: First-time setup should "just work"
     *
     * PERFORMANCE: <25ms for file write (part of <50ms total)
     */
    public writeToFile(config: ProjectConfig, rootPath: string): void {
        const startTime = this.logger.startOperation('ProjectConfigGenerator.writeToFile', {
            rootPath,
            projectName: config.project_name
        });

        try {
            // Create .aetherlight directory if missing
            const aetherlightDir = path.join(rootPath, '.aetherlight');
            if (!fs.existsSync(aetherlightDir)) {
                fs.mkdirSync(aetherlightDir, { recursive: true });
            }

            // Write project-config.json
            const configPath = path.join(aetherlightDir, 'project-config.json');
            const json = this.toJSON(config);
            fs.writeFileSync(configPath, json, 'utf-8');

            this.logger.endOperation('ProjectConfigGenerator.writeToFile', startTime, {
                configPath,
                size: json.length
            });
        } catch (error) {
            this.logger.failOperation('ProjectConfigGenerator.writeToFile', startTime, error);
            throw error;
        }
    }
}
