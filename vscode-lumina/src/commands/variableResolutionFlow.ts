/**
 * VariableResolutionFlow Command: Interactive variable resolution for template customization
 *
 * DESIGN DECISION: Feedback loop for template customization
 * WHY: Templates may have domain-specific variables not in initial config
 *
 * REASONING CHAIN:
 * 1. Problem: Template customization fails on missing variables ({{VAR}} not in config)
 * 2. Bad UX: User sees error, must manually edit config, retry
 * 3. Solution: Detect missing variables → ask user via interview → update config → retry
 * 4. Result: Iterative, user-friendly configuration experience
 *
 * WORKFLOW:
 * 1. Try template customization
 * 2. If VariableNotFoundError → extract missing variable name
 * 3. Generate dynamic question for missing variable
 * 4. Run interview to collect value from user
 * 5. Update project-config.json with resolved value
 * 6. Retry template customization
 * 7. Repeat until all variables resolved or max retries reached
 *
 * PATTERN: Pattern-TDD-001 (85% coverage for API code)
 * PATTERN: Pattern-PUBLISH-003 (No runtime npm dependencies)
 * RELATED: SELF-001 (VariableResolver), SELF-013 (TemplateCustomizer), SELF-011 (InterviewEngine)
 */

import * as fs from 'fs';
import * as path from 'path';
import { TemplateCustomizer, TemplateCustomizationError } from '../services/TemplateCustomizer';
import { VariableResolver, VariableNotFoundError } from '../services/VariableResolver';
import { InterviewEngine, InterviewQuestion, InterviewTemplate } from '../services/InterviewEngine';
import { ProjectConfig } from '../services/ProjectConfig';
import { ProjectConfigValidator } from '../services/ProjectConfigValidator';
import { InterviewAnswers } from '../services/ProjectConfigGenerator';
import { MiddlewareLogger } from '../services/MiddlewareLogger';

/**
 * Resolution flow result
 */
export interface ResolutionFlowResult {
    /** Success flag */
    success: boolean;

    /** Resolved variable names */
    resolvedVariables: string[];

    /** Error message (if failed) */
    error?: string;
}

/**
 * VariableResolutionFlowCommand: Orchestrates interactive variable resolution
 *
 * DESIGN DECISION: Command class with dependency injection
 * WHY: Testable (inject mocked services), single responsibility
 */
export class VariableResolutionFlowCommand {
    private logger: MiddlewareLogger;
    private readonly MAX_RETRIES = 5; // Prevent infinite loops

    constructor(
        private templateCustomizer: TemplateCustomizer,
        private variableResolver: VariableResolver,
        private interviewEngine: InterviewEngine,
        private configValidator: ProjectConfigValidator
    ) {
        this.logger = MiddlewareLogger.getInstance();
    }

    /**
     * Detect missing variables during template customization
     *
     * @param templatePath - Path to template file
     * @param outputPath - Path to output file
     * @param configPath - Path to project-config.json
     * @returns Array of missing variable names
     *
     * ALGORITHM:
     * 1. Load project config
     * 2. Try template customization
     * 3. If TemplateCustomizationError → extract missing variable name
     * 4. Return list of missing variables
     *
     * ERROR EXTRACTION:
     * - Error message format: "Variable resolution failed in template X: Variable not found: VAR_NAME"
     * - Parse error message to extract "VAR_NAME"
     */
    public async detectMissingVariables(
        templatePath: string,
        outputPath: string,
        configPath: string
    ): Promise<string[]> {
        const startTime = this.logger.startOperation('VariableResolutionFlowCommand.detectMissingVariables', {
            templatePath,
            configPath
        });

        const missingVars: string[] = [];

        try {
            // Load project config
            const config = this.loadProjectConfig(configPath);

            // Try template customization
            try {
                await this.templateCustomizer.customizeTemplate(templatePath, outputPath, config);
                // Success - no missing variables
                this.logger.endOperation('VariableResolutionFlowCommand.detectMissingVariables', startTime, {
                    missingCount: 0
                });
                return [];
            } catch (error) {
                // Extract missing variable name from error
                if (error instanceof TemplateCustomizationError) {
                    const match = error.message.match(/Variable not found: ([A-Z0-9_]+)/);
                    if (match && match[1]) {
                        missingVars.push(match[1]);
                    }
                } else {
                    // Re-throw non-customization errors
                    throw error;
                }
            }

            this.logger.endOperation('VariableResolutionFlowCommand.detectMissingVariables', startTime, {
                missingCount: missingVars.length,
                missingVars
            });

            return missingVars;
        } catch (error) {
            this.logger.failOperation('VariableResolutionFlowCommand.detectMissingVariables', startTime, error);
            throw error;
        }
    }

    /**
     * Generate dynamic questions for missing variables
     *
     * @param missingVars - Array of missing variable names
     * @returns Array of interview questions
     *
     * ALGORITHM:
     * - Parse variable name (DEPLOY_TARGET → "Where will you deploy?")
     * - Infer question type from name patterns:
     *   - *_TARGET, *_TYPE, *_MODE → list (multiple choice)
     *   - USE_*, ENABLE_*, IS_* → confirm (yes/no)
     *   - *_URL, *_HOST, *_PORT, *_KEY → input (text)
     *   - Default → input
     * - Provide sensible defaults and choices
     *
     * EXAMPLE TRANSFORMATIONS:
     * - DEPLOY_TARGET → "Where will you deploy?" (list: aws, azure, gcp, etc.)
     * - API_KEY → "What is your API key?" (input)
     * - USE_CACHE → "Enable caching?" (confirm)
     */
    public generateQuestionsForVariables(missingVars: string[]): InterviewQuestion[] {
        const startTime = this.logger.startOperation('VariableResolutionFlowCommand.generateQuestionsForVariables', {
            missingCount: missingVars.length
        });

        const questions: InterviewQuestion[] = [];

        for (const varName of missingVars) {
            const question = this.createQuestionFromVariableName(varName);
            questions.push(question);
        }

        this.logger.endOperation('VariableResolutionFlowCommand.generateQuestionsForVariables', startTime, {
            questionCount: questions.length
        });

        return questions;
    }

    /**
     * Create interview question from variable name
     *
     * @param varName - Variable name (e.g., "DEPLOY_TARGET")
     * @returns Interview question
     *
     * DESIGN DECISION: Heuristic-based question generation
     * WHY: Simple, fast, works for 90% of cases
     * FUTURE: Could use AI to generate better questions
     */
    private createQuestionFromVariableName(varName: string): InterviewQuestion {
        // Convert DEPLOY_TARGET → "deploy target"
        const humanReadable = varName.toLowerCase().replace(/_/g, ' ');

        // Infer question type from variable name pattern
        if (varName.endsWith('_TARGET') || varName.endsWith('_TYPE') || varName.endsWith('_MODE')) {
            // List question (multiple choice)
            return {
                name: varName,
                type: 'list',
                message: this.generateMessage(varName, 'list'),
                choices: this.generateChoices(varName),
                default: this.generateDefault(varName, 'list')
            };
        } else if (varName.startsWith('USE_') || varName.startsWith('ENABLE_') || varName.startsWith('IS_')) {
            // Confirm question (yes/no)
            return {
                name: varName,
                type: 'confirm',
                message: this.generateMessage(varName, 'confirm'),
                default: false
            };
        } else {
            // Input question (text)
            return {
                name: varName,
                type: 'input',
                message: this.generateMessage(varName, 'input'),
                default: this.generateDefault(varName, 'input'),
                validate: 'value && value.length > 0'
            };
        }
    }

    /**
     * Generate human-readable message from variable name
     *
     * @param varName - Variable name
     * @param type - Question type
     * @returns Question message
     */
    private generateMessage(varName: string, type: string): string {
        const humanReadable = varName.toLowerCase().replace(/_/g, ' ');

        if (type === 'list') {
            if (varName.includes('DEPLOY')) {
                return 'Where will you deploy this project?';
            } else if (varName.includes('TARGET')) {
                return `What is the ${humanReadable}?`;
            } else if (varName.includes('TYPE')) {
                return `What ${humanReadable} do you want?`;
            } else if (varName.includes('MODE')) {
                return `Which ${humanReadable} do you want?`;
            } else {
                return `Select ${humanReadable}:`;
            }
        } else if (type === 'confirm') {
            return `Enable ${humanReadable.replace(/^(use|enable|is) /, '')}?`;
        } else {
            // input
            if (varName.includes('KEY') || varName.includes('SECRET') || varName.includes('TOKEN')) {
                return `Enter ${humanReadable}:`;
            } else if (varName.includes('URL') || varName.includes('HOST') || varName.includes('PORT')) {
                return `Enter ${humanReadable}:`;
            } else {
                return `What is the ${humanReadable}?`;
            }
        }
    }

    /**
     * Generate default choices for list questions
     *
     * @param varName - Variable name
     * @returns Array of choices
     */
    private generateChoices(varName: string): string[] {
        if (varName.includes('DEPLOY')) {
            return ['aws', 'azure', 'gcp', 'heroku', 'vercel', 'netlify', 'docker', 'local', 'other'];
        } else if (varName.includes('DATABASE')) {
            return ['postgresql', 'mysql', 'mongodb', 'sqlite', 'redis', 'other'];
        } else if (varName.includes('ENVIRONMENT') || varName.includes('ENV')) {
            return ['development', 'staging', 'production', 'test'];
        } else {
            // Generic choices
            return ['option1', 'option2', 'option3', 'other'];
        }
    }

    /**
     * Generate default value for question
     *
     * @param varName - Variable name
     * @param type - Question type
     * @returns Default value
     */
    private generateDefault(varName: string, type: string): string | undefined {
        if (type === 'list') {
            if (varName.includes('DEPLOY')) {
                return 'local';
            } else if (varName.includes('DATABASE')) {
                return 'postgresql';
            } else if (varName.includes('ENV')) {
                return 'development';
            } else {
                return undefined;
            }
        } else {
            // input
            if (varName.includes('PORT')) {
                return '3000';
            } else if (varName.includes('HOST')) {
                return 'localhost';
            } else {
                return undefined;
            }
        }
    }

    /**
     * Run resolution interview to collect missing variable values
     *
     * @param missingVars - Array of missing variable names
     * @returns Interview answers
     *
     * ALGORITHM:
     * 1. Generate questions for missing variables
     * 2. Create interview template with generated questions
     * 3. Run interview using InterviewEngine
     * 4. Return answers
     */
    public async runResolutionInterview(missingVars: string[]): Promise<InterviewAnswers> {
        const startTime = this.logger.startOperation('VariableResolutionFlowCommand.runResolutionInterview', {
            missingCount: missingVars.length
        });

        try {
            // Generate questions
            const questions = this.generateQuestionsForVariables(missingVars);

            // Create interview template
            const template: InterviewTemplate = {
                name: 'variable-resolution',
                description: 'Resolve missing variables for template customization',
                questions
            };

            // Run interview
            const answers = await this.interviewEngine.runInterview(template, {});

            // Check if user cancelled
            if (!answers) {
                throw new Error('Interview cancelled by user');
            }

            this.logger.endOperation('VariableResolutionFlowCommand.runResolutionInterview', startTime, {
                answerCount: Object.keys(answers).length
            });

            return answers;
        } catch (error) {
            this.logger.failOperation('VariableResolutionFlowCommand.runResolutionInterview', startTime, error);
            throw error;
        }
    }

    /**
     * Update project config with resolved variable values
     *
     * @param configPath - Path to project-config.json
     * @param resolvedValues - Resolved variable values
     *
     * ALGORITHM:
     * 1. Load existing config
     * 2. Merge resolved values into config structure
     * 3. Validate merged config
     * 4. Write updated config to file
     *
     * MERGE STRATEGY:
     * - Resolved values are added to appropriate config sections
     * - DEPLOY_TARGET → config.deployment.deploy_target
     * - API_KEY → config.api.api_key
     * - DATABASE_URL → config.database.url
     * - Generic variables → config.custom[VARIABLE_NAME]
     */
    public async updateProjectConfig(
        configPath: string,
        resolvedValues: InterviewAnswers
    ): Promise<void> {
        const startTime = this.logger.startOperation('VariableResolutionFlowCommand.updateProjectConfig', {
            configPath,
            resolvedCount: Object.keys(resolvedValues).length
        });

        try {
            // Load existing config
            const config = this.loadProjectConfig(configPath);

            // Merge resolved values
            this.mergeResolvedValues(config, resolvedValues);

            // Validate updated config
            const validation = this.configValidator.validate(config);
            if (!validation.valid) {
                throw new Error(`Config validation failed: ${validation.errors.join(', ')}`);
            }

            // Write updated config
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

            this.logger.endOperation('VariableResolutionFlowCommand.updateProjectConfig', startTime, {
                configPath
            });
        } catch (error) {
            this.logger.failOperation('VariableResolutionFlowCommand.updateProjectConfig', startTime, error);
            throw error;
        }
    }

    /**
     * Merge resolved values into project config
     *
     * @param config - Project config (mutated)
     * @param resolvedValues - Resolved values
     *
     * DESIGN DECISION: Heuristic-based mapping to config structure
     * WHY: Simple, covers common cases
     */
    private mergeResolvedValues(config: any, resolvedValues: InterviewAnswers): void {
        for (const [key, value] of Object.entries(resolvedValues)) {
            // Map variable name to config section
            if (key.includes('DEPLOY')) {
                if (!config.deployment) {
                    config.deployment = {};
                }
                config.deployment.deploy_target = value;
            } else if (key.includes('API')) {
                if (!config.api) {
                    config.api = {};
                }
                config.api.api_key = value;
            } else if (key.includes('DATABASE')) {
                if (!config.database) {
                    config.database = {};
                }
                if (key.includes('URL')) {
                    config.database.url = value;
                } else if (key.includes('HOST')) {
                    config.database.host = value;
                } else {
                    config.database[key.toLowerCase()] = value;
                }
            } else {
                // Generic custom variables
                if (!config.custom) {
                    config.custom = {};
                }
                config.custom[key] = value;
            }
        }
    }

    /**
     * Run full resolution flow: detect → interview → update → retry
     *
     * @param templatePath - Path to template file
     * @param outputPath - Path to output file
     * @param configPath - Path to project-config.json
     * @returns Resolution flow result
     *
     * ALGORITHM:
     * 1. Detect missing variables (try customization)
     * 2. If missing variables found:
     *    a. Run interview to collect values
     *    b. Update config with resolved values
     *    c. Retry customization
     *    d. Repeat until success or max retries
     * 3. Return result
     *
     * MAX RETRIES: 5 (prevent infinite loops)
     */
    public async runFullResolutionFlow(
        templatePath: string,
        outputPath: string,
        configPath: string
    ): Promise<ResolutionFlowResult> {
        const startTime = this.logger.startOperation('VariableResolutionFlowCommand.runFullResolutionFlow', {
            templatePath,
            configPath
        });

        const allResolvedVars: string[] = [];
        let retryCount = 0;

        try {
            while (retryCount < this.MAX_RETRIES) {
                // Detect missing variables
                const missingVars = await this.detectMissingVariables(templatePath, outputPath, configPath);

                if (missingVars.length === 0) {
                    // Success - no more missing variables
                    this.logger.endOperation('VariableResolutionFlowCommand.runFullResolutionFlow', startTime, {
                        success: true,
                        resolvedCount: allResolvedVars.length,
                        retries: retryCount
                    });

                    return {
                        success: true,
                        resolvedVariables: allResolvedVars
                    };
                }

                // Run interview to collect values
                const resolvedValues = await this.runResolutionInterview(missingVars);

                // Update config with resolved values
                await this.updateProjectConfig(configPath, resolvedValues);

                // Track resolved variables
                allResolvedVars.push(...missingVars);

                retryCount++;
            }

            // Max retries reached
            throw new Error(`Maximum retries (${this.MAX_RETRIES}) reached. Unable to resolve all variables.`);
        } catch (error) {
            this.logger.failOperation('VariableResolutionFlowCommand.runFullResolutionFlow', startTime, error);

            return {
                success: false,
                resolvedVariables: allResolvedVars,
                error: (error as Error).message
            };
        }
    }

    /**
     * Load project config from file
     *
     * @param configPath - Path to project-config.json
     * @returns Project config
     */
    private loadProjectConfig(configPath: string): ProjectConfig {
        if (!fs.existsSync(configPath)) {
            throw new Error(`Config file not found: ${configPath}`);
        }

        const content = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(content) as ProjectConfig;
    }

    /**
     * Get default template path for variable resolution interview
     *
     * @returns Absolute path to variable-resolution.json
     */
    public getDefaultTemplatePath(): string {
        return path.join(__dirname, '..', 'templates', 'interview-flows', 'variable-resolution.json');
    }
}
