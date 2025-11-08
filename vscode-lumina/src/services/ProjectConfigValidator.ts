/**
 * ProjectConfigValidator: Manual validation for project configuration
 *
 * DESIGN DECISION: Manual validation without ajv dependency
 * WHY: Pattern-PUBLISH-003 forbids runtime npm dependencies
 * REASONING CHAIN:
 * 1. Need validation for project configuration
 * 2. ajv is a runtime npm dependency → Forbidden by Pattern-PUBLISH-003
 * 3. Alternative: Manual validation with TypeScript type guards
 * 4. Benefit: No npm dependencies, full control, better error messages
 *
 * VALIDATION APPROACH:
 * - Type guards for enum validation
 * - Range checks for numbers
 * - Pattern matching for paths and commands
 * - Required field validation
 * - Cross-field validation (e.g., file_extensions match language)
 *
 * PATTERN: Pattern-PUBLISH-003 (Avoid runtime npm dependencies)
 * PATTERN: Pattern-TDD-001 (95% test coverage required)
 * RELATED: ProjectConfig (interface), SELF-003 (schema definition)
 */

import {
    ProjectConfig,
    LanguageType,
    PackageManager,
    TestFramework,
    PackageRegistry,
    VersionFormat,
    CommitFormat,
    FrameworkType
} from './ProjectConfig';
import { MiddlewareLogger } from './MiddlewareLogger';

/**
 * Validation error with field path and message
 */
export interface ValidationError {
    field: string;
    message: string;
    value?: any;
}

/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}

/**
 * ProjectConfigValidator: Validates project configuration objects
 *
 * DESIGN DECISION: Pure validation service with detailed error reporting
 * WHY: Helps users understand what's wrong and how to fix it
 */
export class ProjectConfigValidator {
    private logger: MiddlewareLogger;

    constructor() {
        this.logger = MiddlewareLogger.getInstance();
    }

    /**
     * Validate complete project configuration
     *
     * @param config - Configuration object to validate
     * @returns Validation result with errors (if any)
     *
     * ALGORITHM:
     * 1. Validate schema version
     * 2. Validate each category (language, structure, etc.)
     * 3. Cross-field validation (e.g., extensions match language)
     * 4. Return accumulated errors
     */
    public validate(config: any): ValidationResult {
        const startTime = this.logger.startOperation('ProjectConfigValidator.validate', {
            hasConfig: !!config
        });

        const errors: ValidationError[] = [];

        try {
            // Basic structure validation
            if (!config || typeof config !== 'object') {
                errors.push({
                    field: 'config',
                    message: 'Configuration must be a non-null object'
                });
                return { valid: false, errors };
            }

            // Schema version
            this.validateSchemaVersion(config, errors);

            // Project name
            this.validateProjectName(config, errors);

            // Category validation
            this.validateLanguageConfig(config.language, errors);
            this.validateProjectStructure(config.structure, errors);
            this.validateIgnorePatterns(config.ignore, errors);
            this.validateTestingConfig(config.testing, errors);
            this.validatePerformanceConfig(config.performance, errors);
            this.validatePublishingConfig(config.publishing, errors);
            this.validateGitWorkflowConfig(config.git_workflow, errors);
            this.validateAetherLightConfig(config.aetherlight, errors);
            this.validateDocumentationConfig(config.documentation, errors);

            // Optional framework config
            if (config.framework) {
                this.validateFrameworkConfig(config.framework, errors);
            }

            // Cross-field validation
            this.validateCrossFields(config, errors);

            const result = { valid: errors.length === 0, errors };

            this.logger.endOperation('ProjectConfigValidator.validate', startTime, {
                valid: result.valid,
                errorCount: errors.length
            });

            return result;
        } catch (error) {
            this.logger.failOperation('ProjectConfigValidator.validate', startTime, error);
            errors.push({
                field: 'validation',
                message: 'Unexpected validation error: ' + (error as Error).message
            });
            return { valid: false, errors };
        }
    }

    // ==========================================================================
    // SCHEMA VERSION VALIDATION
    // ==========================================================================

    private validateSchemaVersion(config: any, errors: ValidationError[]): void {
        if (!config.schema_version || typeof config.schema_version !== 'string') {
            errors.push({
                field: 'schema_version',
                message: 'schema_version is required and must be a string',
                value: config.schema_version
            });
        } else if (!/^\d+\.\d+\.\d+$/.test(config.schema_version)) {
            errors.push({
                field: 'schema_version',
                message: 'schema_version must be in semver format (e.g., "1.0.0")',
                value: config.schema_version
            });
        }
    }

    // ==========================================================================
    // PROJECT NAME VALIDATION
    // ==========================================================================

    private validateProjectName(config: any, errors: ValidationError[]): void {
        if (!config.project_name || typeof config.project_name !== 'string') {
            errors.push({
                field: 'project_name',
                message: 'project_name is required and must be a string',
                value: config.project_name
            });
        } else if (config.project_name.trim().length === 0) {
            errors.push({
                field: 'project_name',
                message: 'project_name cannot be empty',
                value: config.project_name
            });
        }
    }

    // ==========================================================================
    // LANGUAGE CONFIG VALIDATION
    // ==========================================================================

    private validateLanguageConfig(language: any, errors: ValidationError[]): void {
        if (!language || typeof language !== 'object') {
            errors.push({
                field: 'language',
                message: 'language configuration is required and must be an object',
                value: language
            });
            return;
        }

        // Language type
        const validLanguages: LanguageType[] = [
            'typescript', 'javascript', 'rust', 'go', 'python', 'java', 'csharp', 'cpp', 'ruby', 'php'
        ];
        if (!validLanguages.includes(language.language)) {
            errors.push({
                field: 'language.language',
                message: 'language must be one of: ' + validLanguages.join(', '),
                value: language.language
            });
        }

        // File extensions
        if (!Array.isArray(language.file_extensions) || language.file_extensions.length === 0) {
            errors.push({
                field: 'language.file_extensions',
                message: 'file_extensions must be a non-empty array of strings',
                value: language.file_extensions
            });
        } else {
            language.file_extensions.forEach((ext: any, index: number) => {
                if (typeof ext !== 'string' || !ext.startsWith('.')) {
                    errors.push({
                        field: 'language.file_extensions[' + index + ']',
                        message: 'File extension must be a string starting with "." (e.g., ".ts")',
                        value: ext
                    });
                }
            });
        }

        // Build command
        this.validateCommand(language.build_command, 'language.build_command', errors);

        // Test command
        this.validateCommand(language.test_command, 'language.test_command', errors);

        // Package manager
        const validPackageManagers: PackageManager[] = [
            'npm', 'yarn', 'pnpm', 'cargo', 'go', 'pip', 'maven', 'gradle', 'bundler', 'composer'
        ];
        if (!validPackageManagers.includes(language.package_manager)) {
            errors.push({
                field: 'language.package_manager',
                message: 'package_manager must be one of: ' + validPackageManagers.join(', '),
                value: language.package_manager
            });
        }

        // Test framework
        const validTestFrameworks: TestFramework[] = [
            'mocha', 'jest', 'vitest', 'pytest', 'cargo-test', 'go-test', 'junit', 'nunit', 'rspec', 'phpunit'
        ];
        if (!validTestFrameworks.includes(language.test_framework)) {
            errors.push({
                field: 'language.test_framework',
                message: 'test_framework must be one of: ' + validTestFrameworks.join(', '),
                value: language.test_framework
            });
        }
    }

    // ==========================================================================
    // PROJECT STRUCTURE VALIDATION
    // ==========================================================================

    private validateProjectStructure(structure: any, errors: ValidationError[]): void {
        if (!structure || typeof structure !== 'object') {
            errors.push({
                field: 'structure',
                message: 'structure configuration is required and must be an object',
                value: structure
            });
            return;
        }

        // Required paths
        const requiredPaths = [
            'root_directory',
            'source_directory',
            'test_directory',
            'output_directory',
            'docs_directory',
            'scripts_directory'
        ];

        requiredPaths.forEach(pathKey => {
            this.validatePath(structure[pathKey], 'structure.' + pathKey, errors, true);
        });

        // Optional paths
        if (structure.internal_directory !== undefined) {
            this.validatePath(structure.internal_directory, 'structure.internal_directory', errors, false);
        }
        if (structure.packages_directory !== undefined) {
            this.validatePath(structure.packages_directory, 'structure.packages_directory', errors, false);
        }
    }

    // ==========================================================================
    // IGNORE PATTERNS VALIDATION
    // ==========================================================================

    private validateIgnorePatterns(ignore: any, errors: ValidationError[]): void {
        if (!ignore || typeof ignore !== 'object') {
            errors.push({
                field: 'ignore',
                message: 'ignore configuration is required and must be an object',
                value: ignore
            });
            return;
        }

        if (!Array.isArray(ignore.ignore_patterns)) {
            errors.push({
                field: 'ignore.ignore_patterns',
                message: 'ignore_patterns must be an array of strings',
                value: ignore.ignore_patterns
            });
        }

        if (!Array.isArray(ignore.search_file_patterns) || ignore.search_file_patterns.length === 0) {
            errors.push({
                field: 'ignore.search_file_patterns',
                message: 'search_file_patterns must be a non-empty array of strings',
                value: ignore.search_file_patterns
            });
        }
    }

    // ==========================================================================
    // TESTING CONFIG VALIDATION
    // ==========================================================================

    private validateTestingConfig(testing: any, errors: ValidationError[]): void {
        if (!testing || typeof testing !== 'object') {
            errors.push({
                field: 'testing',
                message: 'testing configuration is required and must be an object',
                value: testing
            });
            return;
        }

        // Coverage targets (0-100)
        this.validatePercentage(testing.coverage_infrastructure, 'testing.coverage_infrastructure', errors);
        this.validatePercentage(testing.coverage_api, 'testing.coverage_api', errors);
        this.validatePercentage(testing.coverage_ui, 'testing.coverage_ui', errors);

        // Coverage command
        this.validateCommand(testing.coverage_command, 'testing.coverage_command', errors);
    }

    // ==========================================================================
    // PERFORMANCE CONFIG VALIDATION
    // ==========================================================================

    private validatePerformanceConfig(performance: any, errors: ValidationError[]): void {
        if (!performance || typeof performance !== 'object') {
            errors.push({
                field: 'performance',
                message: 'performance configuration is required and must be an object',
                value: performance
            });
            return;
        }

        // Latency targets (milliseconds, > 0)
        this.validatePositiveNumber(performance.workflow_check_ms, 'performance.workflow_check_ms', errors);
        this.validatePositiveNumber(performance.agent_assignment_ms, 'performance.agent_assignment_ms', errors);
        this.validatePositiveNumber(performance.confidence_scoring_ms, 'performance.confidence_scoring_ms', errors);
        this.validatePositiveNumber(performance.test_validation_ms, 'performance.test_validation_ms', errors);
        this.validatePositiveNumber(performance.compile_time_s, 'performance.compile_time_s', errors);

        // Optional extension activation time
        if (performance.extension_activation_ms !== undefined) {
            this.validatePositiveNumber(performance.extension_activation_ms, 'performance.extension_activation_ms', errors);
        }
    }

    // ==========================================================================
    // PUBLISHING CONFIG VALIDATION
    // ==========================================================================

    private validatePublishingConfig(publishing: any, errors: ValidationError[]): void {
        if (!publishing || typeof publishing !== 'object') {
            errors.push({
                field: 'publishing',
                message: 'publishing configuration is required and must be an object',
                value: publishing
            });
            return;
        }

        // Package registry
        const validRegistries: PackageRegistry[] = ['npm', 'crates.io', 'pypi', 'maven-central', 'nuget', 'rubygems'];
        if (!validRegistries.includes(publishing.package_registry)) {
            errors.push({
                field: 'publishing.package_registry',
                message: 'package_registry must be one of: ' + validRegistries.join(', '),
                value: publishing.package_registry
            });
        }

        // Package names
        if (!Array.isArray(publishing.package_names)) {
            errors.push({
                field: 'publishing.package_names',
                message: 'package_names must be an array of strings',
                value: publishing.package_names
            });
        }

        // Version format
        const validVersionFormats: VersionFormat[] = ['semver', 'calver'];
        if (!validVersionFormats.includes(publishing.version_format)) {
            errors.push({
                field: 'publishing.version_format',
                message: 'version_format must be one of: ' + validVersionFormats.join(', '),
                value: publishing.version_format
            });
        }

        // Publish command
        this.validateCommand(publishing.publish_command, 'publishing.publish_command', errors);
    }

    // ==========================================================================
    // GIT WORKFLOW CONFIG VALIDATION
    // ==========================================================================

    private validateGitWorkflowConfig(gitWorkflow: any, errors: ValidationError[]): void {
        if (!gitWorkflow || typeof gitWorkflow !== 'object') {
            errors.push({
                field: 'git_workflow',
                message: 'git_workflow configuration is required and must be an object',
                value: gitWorkflow
            });
            return;
        }

        // Main branch
        if (!gitWorkflow.main_branch || typeof gitWorkflow.main_branch !== 'string') {
            errors.push({
                field: 'git_workflow.main_branch',
                message: 'main_branch is required and must be a non-empty string',
                value: gitWorkflow.main_branch
            });
        }

        // Commit format
        const validCommitFormats: CommitFormat[] = ['conventional', 'angular', 'custom'];
        if (!validCommitFormats.includes(gitWorkflow.commit_format)) {
            errors.push({
                field: 'git_workflow.commit_format',
                message: 'commit_format must be one of: ' + validCommitFormats.join(', '),
                value: gitWorkflow.commit_format
            });
        }

        // Boolean flags
        this.validateBoolean(gitWorkflow.enforce_tests_on_commit, 'git_workflow.enforce_tests_on_commit', errors);
        this.validateBoolean(gitWorkflow.enforce_compile_on_commit, 'git_workflow.enforce_compile_on_commit', errors);
    }

    // ==========================================================================
    // ÆTHERLIGHT CONFIG VALIDATION
    // ==========================================================================

    private validateAetherLightConfig(aetherlight: any, errors: ValidationError[]): void {
        if (!aetherlight || typeof aetherlight !== 'object') {
            errors.push({
                field: 'aetherlight',
                message: 'aetherlight configuration is required and must be an object',
                value: aetherlight
            });
            return;
        }

        // Required paths
        this.validatePath(aetherlight.agents_directory, 'aetherlight.agents_directory', errors, true);
        this.validatePath(aetherlight.sprints_directory, 'aetherlight.sprints_directory', errors, true);
        this.validatePath(aetherlight.patterns_directory, 'aetherlight.patterns_directory', errors, true);
        this.validatePath(aetherlight.skills_directory, 'aetherlight.skills_directory', errors, true);
        this.validatePath(aetherlight.claude_config_path, 'aetherlight.claude_config_path', errors, true);
    }

    // ==========================================================================
    // DOCUMENTATION CONFIG VALIDATION
    // ==========================================================================

    private validateDocumentationConfig(documentation: any, errors: ValidationError[]): void {
        if (!documentation || typeof documentation !== 'object') {
            errors.push({
                field: 'documentation',
                message: 'documentation configuration is required and must be an object',
                value: documentation
            });
            return;
        }

        // Required paths
        this.validatePath(documentation.changelog_path, 'documentation.changelog_path', errors, true);
        this.validatePath(documentation.readme_path, 'documentation.readme_path', errors, true);

        // Optional API docs
        if (documentation.api_docs_command !== undefined) {
            this.validateCommand(documentation.api_docs_command, 'documentation.api_docs_command', errors);
        }
        if (documentation.api_docs_output !== undefined) {
            this.validatePath(documentation.api_docs_output, 'documentation.api_docs_output', errors, false);
        }
    }

    // ==========================================================================
    // FRAMEWORK CONFIG VALIDATION
    // ==========================================================================

    private validateFrameworkConfig(framework: any, errors: ValidationError[]): void {
        if (!framework || typeof framework !== 'object') {
            errors.push({
                field: 'framework',
                message: 'framework configuration must be an object (or omit if not applicable)',
                value: framework
            });
            return;
        }

        // Framework type (optional)
        if (framework.framework_type !== undefined) {
            const validFrameworkTypes: FrameworkType[] = [
                'vscode-extension', 'tauri-app', 'react-app', 'vue-app', 'angular-app', 'express-server', 'library', 'cli-tool'
            ];
            if (!validFrameworkTypes.includes(framework.framework_type)) {
                errors.push({
                    field: 'framework.framework_type',
                    message: 'framework_type must be one of: ' + validFrameworkTypes.join(', '),
                    value: framework.framework_type
                });
            }
        }

        // Version strings (optional, must match semver pattern if present)
        const versionPattern = /^[><=^~]?\d+\.\d+\.\d+/;
        if (framework.vscode_api_version && !versionPattern.test(framework.vscode_api_version)) {
            errors.push({
                field: 'framework.vscode_api_version',
                message: 'vscode_api_version must be a valid semver string (e.g., "^1.80.0")',
                value: framework.vscode_api_version
            });
        }
        if (framework.nodejs_version && !/^>=?\d+\.\d+\.\d+/.test(framework.nodejs_version)) {
            errors.push({
                field: 'framework.nodejs_version',
                message: 'nodejs_version must be a valid version string (e.g., ">=18.0.0")',
                value: framework.nodejs_version
            });
        }
    }

    // ==========================================================================
    // CROSS-FIELD VALIDATION
    // ==========================================================================

    private validateCrossFields(config: any, errors: ValidationError[]): void {
        // Example: Rust projects should use cargo, TypeScript should use npm
        if (config.language && config.language.language === 'rust' && config.language.package_manager !== 'cargo') {
            errors.push({
                field: 'language.package_manager',
                message: 'Rust projects should use "cargo" as package_manager',
                value: config.language.package_manager
            });
        }

        if (config.language && config.language.language === 'typescript' && !['npm', 'yarn', 'pnpm'].includes(config.language.package_manager)) {
            errors.push({
                field: 'language.package_manager',
                message: 'TypeScript projects should use "npm", "yarn", or "pnpm" as package_manager',
                value: config.language.package_manager
            });
        }

        // VS Code extensions should have vscode_api_version
        if (config.framework && config.framework.framework_type === 'vscode-extension' && !config.framework.vscode_api_version) {
            errors.push({
                field: 'framework.vscode_api_version',
                message: 'VS Code extensions must specify vscode_api_version',
                value: config.framework.vscode_api_version
            });
        }
    }

    // ==========================================================================
    // HELPER VALIDATORS
    // ==========================================================================

    private validateCommand(command: any, field: string, errors: ValidationError[]): void {
        if (!command || typeof command !== 'string' || command.trim().length === 0) {
            errors.push({
                field,
                message: 'Must be a non-empty string command',
                value: command
            });
        }
    }

    private validatePath(path: any, field: string, errors: ValidationError[], required: boolean): void {
        if (required && (!path || typeof path !== 'string' || path.trim().length === 0)) {
            errors.push({
                field,
                message: 'Must be a non-empty string path',
                value: path
            });
        }
        if (path && typeof path === 'string' && (path.includes('\\\\') || path.includes('//'))) {
            errors.push({
                field,
                message: 'Path should not contain double slashes',
                value: path
            });
        }
    }

    private validatePercentage(value: any, field: string, errors: ValidationError[]): void {
        if (typeof value !== 'number' || value < 0 || value > 100) {
            errors.push({
                field,
                message: 'Must be a number between 0 and 100',
                value
            });
        }
    }

    private validatePositiveNumber(value: any, field: string, errors: ValidationError[]): void {
        if (typeof value !== 'number' || value <= 0) {
            errors.push({
                field,
                message: 'Must be a positive number',
                value
            });
        }
    }

    private validateBoolean(value: any, field: string, errors: ValidationError[]): void {
        if (typeof value !== 'boolean') {
            errors.push({
                field,
                message: 'Must be a boolean (true/false)',
                value
            });
        }
    }
}
