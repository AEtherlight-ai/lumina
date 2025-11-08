/**
 * TemplateCustomizer: Template customization service with variable substitution
 *
 * DESIGN DECISION: Load templates, substitute variables, write customized files
 * WHY: Makes generic templates project-specific for self-configuration
 *
 * REASONING CHAIN:
 * 1. Problem: Templates are generic ({{BUILD_COMMAND}}, {{LANGUAGE}})
 * 2. Goal: Customize templates for specific project (npm run build, typescript)
 * 3. Solution: Load template → resolve variables → write customized file
 * 4. Result: Project-specific CLAUDE.md, skills, agent contexts
 *
 * WORKFLOW:
 * 1. Load template from .aetherlight/templates/
 * 2. Convert ProjectConfig to flat variable dictionary
 * 3. Call VariableResolver.resolve() to substitute {{VARIABLES}}
 * 4. Write customized content to output path
 *
 * PATTERN: Pattern-TDD-001 (90% coverage for infrastructure)
 * PATTERN: Pattern-PUBLISH-003 (No runtime npm dependencies)
 * RELATED: SELF-001 (VariableResolver), SELF-002 (ProjectConfigGenerator)
 */

import * as fs from 'fs';
import * as path from 'path';
import { VariableResolver, VariableNotFoundError } from './VariableResolver';
import { ProjectConfig } from './ProjectConfig';
import { MiddlewareLogger } from './MiddlewareLogger';

/**
 * Error: Template customization failed
 */
export class TemplateCustomizationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TemplateCustomizationError';
    }
}

/**
 * Template customization mapping (template → output)
 */
export interface TemplateMapping {
    /** Path to template file (.aetherlight/templates/*.template) */
    templatePath: string;

    /** Path to output file (e.g., .claude/CLAUDE.md) */
    outputPath: string;
}

/**
 * Batch customization result
 */
export interface CustomizationResult {
    /** Template path */
    templatePath: string;

    /** Output path */
    outputPath: string;

    /** Success flag */
    success: boolean;

    /** Error message (if failed) */
    error?: string;
}

/**
 * TemplateCustomizer: Service for customizing templates with variable substitution
 *
 * DESIGN DECISION: Pure service with dependency injection
 * WHY: Testable (inject mocked VariableResolver), single responsibility
 */
export class TemplateCustomizer {
    private logger: MiddlewareLogger;

    constructor(private variableResolver: VariableResolver) {
        this.logger = MiddlewareLogger.getInstance();
    }

    /**
     * Customize single template with variable substitution
     *
     * @param templatePath - Path to template file
     * @param outputPath - Path to output file
     * @param projectConfig - Project configuration for variable values
     *
     * ALGORITHM:
     * 1. Load template content from file
     * 2. Convert ProjectConfig to variable dictionary
     * 3. Resolve variables using VariableResolver
     * 4. Ensure output directory exists
     * 5. Write customized content to output file
     *
     * PERFORMANCE TARGET: <50ms per template
     */
    public async customizeTemplate(
        templatePath: string,
        outputPath: string,
        projectConfig: ProjectConfig
    ): Promise<void> {
        const startTime = this.logger.startOperation('TemplateCustomizer.customizeTemplate', {
            templatePath,
            outputPath
        });

        try {
            // Step 1: Load template content
            if (!fs.existsSync(templatePath)) {
                throw new TemplateCustomizationError(`Template file not found: ${templatePath}`);
            }

            const templateContent = fs.readFileSync(templatePath, 'utf-8');

            // Step 2: Convert ProjectConfig to variable dictionary
            const variables = this.convertConfigToVariables(projectConfig);

            // Step 3: Resolve variables
            let customizedContent: string;
            try {
                customizedContent = this.variableResolver.resolve(templateContent, variables);
            } catch (error) {
                if (error instanceof VariableNotFoundError) {
                    throw new TemplateCustomizationError(
                        `Variable resolution failed in template ${templatePath}: ${error.message}`
                    );
                }
                throw error;
            }

            // Step 4: Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // Step 5: Write customized content to output file
            try {
                fs.writeFileSync(outputPath, customizedContent, 'utf-8');
            } catch (writeError) {
                throw new TemplateCustomizationError(
                    `Failed to write customized file to ${outputPath}: ${(writeError as Error).message}`
                );
            }

            this.logger.endOperation('TemplateCustomizer.customizeTemplate', startTime, {
                templateLength: templateContent.length,
                outputLength: customizedContent.length
            });
        } catch (error) {
            this.logger.failOperation('TemplateCustomizer.customizeTemplate', startTime, error);
            throw error;
        }
    }

    /**
     * Customize multiple templates in batch
     *
     * @param mappings - Array of template → output mappings
     * @param projectConfig - Project configuration for variable values
     * @returns Array of customization results
     *
     * ALGORITHM:
     * - Process each template independently
     * - Continue on errors (don't stop batch on single failure)
     * - Return results for all templates (success + failures)
     *
     * PERFORMANCE TARGET: <50ms per template
     */
    public async customizeBatch(
        mappings: TemplateMapping[],
        projectConfig: ProjectConfig
    ): Promise<CustomizationResult[]> {
        const startTime = this.logger.startOperation('TemplateCustomizer.customizeBatch', {
            templateCount: mappings.length
        });

        const results: CustomizationResult[] = [];

        try {
            for (const mapping of mappings) {
                try {
                    await this.customizeTemplate(
                        mapping.templatePath,
                        mapping.outputPath,
                        projectConfig
                    );

                    results.push({
                        templatePath: mapping.templatePath,
                        outputPath: mapping.outputPath,
                        success: true
                    });
                } catch (error) {
                    results.push({
                        templatePath: mapping.templatePath,
                        outputPath: mapping.outputPath,
                        success: false,
                        error: (error as Error).message
                    });
                }
            }

            this.logger.endOperation('TemplateCustomizer.customizeBatch', startTime, {
                successCount: results.filter(r => r.success).length,
                failureCount: results.filter(r => !r.success).length
            });

            return results;
        } catch (error) {
            this.logger.failOperation('TemplateCustomizer.customizeBatch', startTime, error);
            throw error;
        }
    }

    /**
     * Convert ProjectConfig to flat variable dictionary
     *
     * @param config - Project configuration
     * @returns Flat variable dictionary for VariableResolver
     *
     * ALGORITHM:
     * - Extract values from nested ProjectConfig structure
     * - Convert to uppercase variable names (BUILD_COMMAND, TEST_COMMAND, etc.)
     * - Handle optional fields gracefully
     *
     * DESIGN DECISION: Uppercase variable names
     * WHY: Template convention is {{BUILD_COMMAND}} not {{build_command}}
     */
    public convertConfigToVariables(config: ProjectConfig): Record<string, any> {
        const variables: Record<string, any> = {};

        // Project name
        variables.PROJECT_NAME = config.project_name;

        // Language configuration
        if (config.language) {
            variables.LANGUAGE = config.language.language;
            variables.BUILD_COMMAND = config.language.build_command;
            variables.TEST_COMMAND = config.language.test_command;
            variables.PACKAGE_MANAGER = config.language.package_manager;
            variables.TEST_FRAMEWORK = config.language.test_framework;

            if (config.language.compile_command) {
                variables.COMPILE_COMMAND = config.language.compile_command;
            }

            if (config.language.file_extensions) {
                variables.FILE_EXTENSIONS = config.language.file_extensions.join(', ');
                // Also provide single extension (most common case)
                variables.FILE_EXTENSION = config.language.file_extensions[0] || '';
            }
        }

        // Project structure (paths)
        if (config.structure) {
            variables.PROJECT_ROOT = config.structure.root_directory;
            variables.SOURCE_DIRECTORY = config.structure.source_directory;
            variables.TEST_DIRECTORY = config.structure.test_directory;
            variables.OUTPUT_DIRECTORY = config.structure.output_directory;
            variables.DOCS_DIRECTORY = config.structure.docs_directory;
            variables.SCRIPTS_DIRECTORY = config.structure.scripts_directory;

            if (config.structure.internal_directory) {
                variables.INTERNAL_DIRECTORY = config.structure.internal_directory;
            }

            if (config.structure.packages_directory) {
                variables.PACKAGES_DIRECTORY = config.structure.packages_directory;
            }
        }

        // Testing configuration (coverage targets)
        if (config.testing) {
            variables.COVERAGE_INFRASTRUCTURE = config.testing.coverage_infrastructure;
            variables.COVERAGE_API = config.testing.coverage_api;
            variables.COVERAGE_UI = config.testing.coverage_ui;
            variables.COVERAGE_COMMAND = config.testing.coverage_command;
        }

        // Git workflow
        if (config.git_workflow) {
            variables.MAIN_BRANCH = config.git_workflow.main_branch;
            variables.COMMIT_FORMAT = config.git_workflow.commit_format;
        }

        // ÆtherLight configuration
        if (config.aetherlight) {
            variables.AGENTS_DIRECTORY = config.aetherlight.agents_directory;
            variables.SPRINTS_DIRECTORY = config.aetherlight.sprints_directory;
            variables.PATTERNS_DIRECTORY = config.aetherlight.patterns_directory;
            variables.SKILLS_DIRECTORY = config.aetherlight.skills_directory;
            variables.CLAUDE_CONFIG_PATH = config.aetherlight.claude_config_path;
        }

        // Documentation
        if (config.documentation) {
            variables.CHANGELOG_PATH = config.documentation.changelog_path;
            variables.README_PATH = config.documentation.readme_path;

            if (config.documentation.api_docs_command) {
                variables.API_DOCS_COMMAND = config.documentation.api_docs_command;
            }

            if (config.documentation.api_docs_output) {
                variables.API_DOCS_OUTPUT = config.documentation.api_docs_output;
            }
        }

        return variables;
    }
}
