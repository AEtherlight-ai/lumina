/**
 * ProjectConfig: Type-safe project configuration interface for ÆtherLight
 *
 * DESIGN DECISION: Complete type system for project-agnostic configuration
 * WHY: ÆtherLight must work with ANY project type (TypeScript, Rust, Go, Python, etc.)
 *
 * REASONING CHAIN:
 * 1. Problem: ÆtherLight currently hard-codes TypeScript/npm-specific values
 * 2. Goal: Make ÆtherLight project-agnostic but customizable
 * 3. Solution: Comprehensive configuration schema with 70+ variables across 10 categories
 * 4. Usage: Code Analyzer detects values, InterviewEngine collects missing values
 * 5. Result: Single ÆtherLight installation works for TypeScript, Rust, Go, Python, etc.
 *
 * VARIABLE CATEGORIES (10 categories, 70+ variables):
 * 1. Language & Build System (7 variables)
 * 2. Project Structure & Paths (8 variables)
 * 3. Ignore Patterns (2 variables)
 * 4. Testing & Quality (4 variables)
 * 5. Performance Targets (6 variables)
 * 6. Publishing & Versioning (6 variables)
 * 7. Git & Workflow (5 variables)
 * 8. ÆtherLight Agent Configuration (5 variables)
 * 9. Documentation Commands (4 variables)
 * 10. Framework Specific (6 variables)
 *
 * PATTERN: Pattern-CONFIG-001 (Project Configuration Schema)
 * PATTERN: Pattern-TDD-001 (95% test coverage required for infrastructure)
 * RELATED: SELF-001 (VariableResolver), SELF-002 (ProjectConfigGenerator), SELF-004 (InterviewEngine)
 */

// ==============================================================================
// 1. LANGUAGE & BUILD SYSTEM
// ==============================================================================

/**
 * Supported programming languages
 *
 * DESIGN DECISION: Enum for type safety and autocomplete
 * WHY: Prevents typos, enables validation, provides IDE support
 */
export type LanguageType =
    | 'typescript'
    | 'javascript'
    | 'rust'
    | 'go'
    | 'python'
    | 'java'
    | 'csharp'
    | 'cpp'
    | 'ruby'
    | 'php';

/**
 * Package managers for dependency management
 */
export type PackageManager =
    | 'npm'
    | 'yarn'
    | 'pnpm'
    | 'cargo'
    | 'go'
    | 'pip'
    | 'maven'
    | 'gradle'
    | 'bundler'
    | 'composer';

/**
 * Test frameworks
 */
export type TestFramework =
    | 'mocha'
    | 'jest'
    | 'vitest'
    | 'pytest'
    | 'cargo-test'
    | 'go-test'
    | 'junit'
    | 'nunit'
    | 'rspec'
    | 'phpunit';

/**
 * Language and build system configuration
 */
export interface LanguageConfig {
    /** Primary programming language */
    language: LanguageType;

    /** File extensions to analyze (e.g., ['.ts', '.tsx', '.js', '.jsx']) */
    file_extensions: string[];

    /** Build command (e.g., 'npm run build', 'cargo build', 'go build') */
    build_command: string;

    /** Compile command if separate from build (e.g., 'npm run compile', 'tsc') */
    compile_command?: string;

    /** Test command (e.g., 'npm test', 'cargo test', 'pytest') */
    test_command: string;

    /** Package manager */
    package_manager: PackageManager;

    /** Test framework */
    test_framework: TestFramework;
}

// ==============================================================================
// 2. PROJECT STRUCTURE & PATHS
// ==============================================================================

/**
 * Project directory structure
 *
 * DESIGN DECISION: Relative paths from project root
 * WHY: Portable across different machines and OS
 */
export interface ProjectStructure {
    /** Workspace root directory (usually '.') */
    root_directory: string;

    /** Source code directory (e.g., 'src/', 'lib/', 'app/') */
    source_directory: string;

    /** Test directory (e.g., 'test/', 'tests/', '__tests__', 'spec/') */
    test_directory: string;

    /** Build output directory (e.g., 'out/', 'dist/', 'target/', 'build/') */
    output_directory: string;

    /** Documentation directory (e.g., 'docs/') */
    docs_directory: string;

    /** Scripts directory (e.g., 'scripts/') */
    scripts_directory: string;

    /** Internal ÆtherLight directory (default: 'internal/') */
    internal_directory?: string;

    /** Packages directory for monorepos (e.g., 'packages/', 'crates/') */
    packages_directory?: string;
}

// ==============================================================================
// 3. IGNORE PATTERNS
// ==============================================================================

/**
 * File patterns for search and analysis
 */
export interface IgnorePatterns {
    /** Directories/files to ignore during analysis */
    ignore_patterns: string[];

    /** File glob patterns to include in search (e.g., file patterns for TypeScript/JavaScript) */
    search_file_patterns: string[];
}

// ==============================================================================
// 4. TESTING & QUALITY
// ==============================================================================

/**
 * Test coverage and quality requirements
 *
 * DESIGN DECISION: Different coverage targets by code type
 * WHY: Infrastructure needs higher coverage (90%) than UI (70%)
 * REFERENCE: infrastructure-agent-context.md, Pattern-TDD-001
 */
export interface TestingConfig {
    /** Infrastructure code coverage target (default: 90%) */
    coverage_infrastructure: number;

    /** API code coverage target (default: 85%) */
    coverage_api: number;

    /** UI code coverage target (default: 70%) */
    coverage_ui: number;

    /** Coverage measurement command (e.g., 'npm run coverage', 'cargo tarpaulin') */
    coverage_command: string;
}

// ==============================================================================
// 5. PERFORMANCE TARGETS
// ==============================================================================

/**
 * Performance requirements in milliseconds
 *
 * DESIGN DECISION: Performance targets from infrastructure-agent-context.md
 * WHY: Ensures responsive user experience, enforces quality
 */
export interface PerformanceConfig {
    /** Workflow check latency target (default: 500ms) */
    workflow_check_ms: number;

    /** Agent assignment latency target (default: 50ms) */
    agent_assignment_ms: number;

    /** Confidence scoring latency target (default: 100ms) */
    confidence_scoring_ms: number;

    /** Test validation latency target (default: 200ms) */
    test_validation_ms: number;

    /** Extension activation time (VS Code requirement, default: 200ms) */
    extension_activation_ms?: number;

    /** Full compile time target in seconds (default: 10s) */
    compile_time_s: number;
}

// ==============================================================================
// 6. PUBLISHING & VERSIONING
// ==============================================================================

/**
 * Package registry types
 */
export type PackageRegistry = 'npm' | 'crates.io' | 'pypi' | 'maven-central' | 'nuget' | 'rubygems';

/**
 * Version format types
 */
export type VersionFormat = 'semver' | 'calver';

/**
 * Publishing and version management
 *
 * DESIGN DECISION: Support for multi-package projects (monorepos)
 * WHY: ÆtherLight itself has 4 packages, many projects use monorepos
 */
export interface PublishingConfig {
    /** Package registry */
    package_registry: PackageRegistry;

    /** Package names (for multi-package projects) */
    package_names: string[];

    /** Version format */
    version_format: VersionFormat;

    /** Publish command (e.g., 'npm publish', 'cargo publish') */
    publish_command: string;

    /** Version bump script path (e.g., 'scripts/bump-version.js') */
    version_bump_script?: string;

    /** Automated publish script path (e.g., 'scripts/publish-release.js') */
    publish_script?: string;
}

// ==============================================================================
// 7. GIT & WORKFLOW
// ==============================================================================

/**
 * Commit message formats
 */
export type CommitFormat = 'conventional' | 'angular' | 'custom';

/**
 * Git workflow configuration
 */
export interface GitWorkflowConfig {
    /** Main branch name (e.g., 'main', 'master') */
    main_branch: string;

    /** Commit message format */
    commit_format: CommitFormat;

    /** Pre-commit hook script path (e.g., '.git/hooks/pre-commit') */
    pre_commit_hook?: string;

    /** Enforce tests pass before commit (default: true) */
    enforce_tests_on_commit: boolean;

    /** Enforce code compiles before commit (default: true) */
    enforce_compile_on_commit: boolean;
}

// ==============================================================================
// 8. ÆTHERLIGHT AGENT CONFIGURATION
// ==============================================================================

/**
 * ÆtherLight-specific directory structure
 *
 * DESIGN DECISION: Allow customization of ÆtherLight directories
 * WHY: Some projects may want different structure, avoid conflicts
 */
export interface AetherLightConfig {
    /** Agent context files directory (default: 'internal/agents') */
    agents_directory: string;

    /** Sprint TOML files directory (default: 'internal/sprints') */
    sprints_directory: string;

    /** Pattern library directory (default: 'docs/patterns') */
    patterns_directory: string;

    /** Skills directory (default: '.claude/skills') */
    skills_directory: string;

    /** Claude configuration file path (default: '.claude/CLAUDE.md') */
    claude_config_path: string;
}

// ==============================================================================
// 9. DOCUMENTATION COMMANDS
// ==============================================================================

/**
 * Documentation paths and commands
 */
export interface DocumentationConfig {
    /** CHANGELOG.md file path (default: 'CHANGELOG.md') */
    changelog_path: string;

    /** README.md file path (default: 'README.md') */
    readme_path: string;

    /** API documentation generation command (e.g., 'cargo doc', 'typedoc') */
    api_docs_command?: string;

    /** API documentation output directory (e.g., 'target/doc', 'docs/api') */
    api_docs_output?: string;
}

// ==============================================================================
// 10. FRAMEWORK SPECIFIC
// ==============================================================================

/**
 * Project framework types
 */
export type FrameworkType =
    | 'vscode-extension'
    | 'tauri-app'
    | 'react-app'
    | 'vue-app'
    | 'angular-app'
    | 'express-server'
    | 'library'
    | 'cli-tool';

/**
 * Framework-specific configuration
 *
 * DESIGN DECISION: Optional fields for framework-specific metadata
 * WHY: Not all projects use frameworks, avoid unnecessary fields
 */
export interface FrameworkConfig {
    /** Framework type (if applicable) */
    framework_type?: FrameworkType;

    /** VS Code API version (for extensions, e.g., '^1.80.0') */
    vscode_api_version?: string;

    /** Node.js version requirement (e.g., '>=18.0.0') */
    nodejs_version?: string;

    /** Tauri version (for Tauri apps) */
    tauri_version?: string;

    /** React version (for React apps) */
    react_version?: string;

    /** Vue version (for Vue apps) */
    vue_version?: string;
}

// ==============================================================================
// COMPLETE PROJECT CONFIGURATION
// ==============================================================================

/**
 * Complete project configuration interface
 *
 * USAGE:
 * 1. Code Analyzer detects and populates values from existing project
 * 2. InterviewEngine collects missing values from user
 * 3. ProjectConfigGenerator writes .aetherlight/project-config.json
 * 4. VariableResolver uses config to replace {{VARIABLES}} in templates
 *
 * EXAMPLE:
 * ```typescript
 * const config: ProjectConfig = {
 *   language: {
 *     language: 'rust',
 *     file_extensions: ['.rs'],
 *     build_command: 'cargo build',
 *     test_command: 'cargo test',
 *     package_manager: 'cargo',
 *     test_framework: 'cargo-test'
 *   },
 *   structure: {
 *     root_directory: '.',
 *     source_directory: 'src/',
 *     test_directory: 'tests/',
 *     output_directory: 'target/',
 *     // ...
 *   },
 *   // ... other categories
 * };
 * ```
 */
export interface ProjectConfig {
    /** Configuration schema version (for future migrations) */
    schema_version: string;

    /** Project name */
    project_name: string;

    /** Language and build system configuration */
    language: LanguageConfig;

    /** Project directory structure */
    structure: ProjectStructure;

    /** File patterns for search and analysis */
    ignore: IgnorePatterns;

    /** Testing and quality requirements */
    testing: TestingConfig;

    /** Performance targets */
    performance: PerformanceConfig;

    /** Publishing and versioning */
    publishing: PublishingConfig;

    /** Git workflow configuration */
    git_workflow: GitWorkflowConfig;

    /** ÆtherLight-specific configuration */
    aetherlight: AetherLightConfig;

    /** Documentation paths and commands */
    documentation: DocumentationConfig;

    /** Framework-specific configuration (optional) */
    framework?: FrameworkConfig;
}

/**
 * Default configuration values
 *
 * DESIGN DECISION: Sensible defaults for TypeScript/npm projects
 * WHY: ÆtherLight is currently TypeScript-based, most users will be TypeScript
 */
export const DEFAULT_CONFIG: ProjectConfig = {
    schema_version: '1.0.0',
    project_name: 'unknown-project',
    language: {
        language: 'typescript',
        file_extensions: ['.ts', '.tsx', '.js', '.jsx'],
        build_command: 'npm run build',
        compile_command: 'npm run compile',
        test_command: 'npm test',
        package_manager: 'npm',
        test_framework: 'mocha'
    },
    structure: {
        root_directory: '.',
        source_directory: 'src/',
        test_directory: 'test/',
        output_directory: 'out/',
        docs_directory: 'docs/',
        scripts_directory: 'scripts/',
        internal_directory: 'internal/',
        packages_directory: 'packages/'
    },
    ignore: {
        ignore_patterns: ['node_modules', '.git', 'out', 'dist', '.vscode-test'],
        search_file_patterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.md']
    },
    testing: {
        coverage_infrastructure: 90,
        coverage_api: 85,
        coverage_ui: 70,
        coverage_command: 'npm run coverage'
    },
    performance: {
        workflow_check_ms: 500,
        agent_assignment_ms: 50,
        confidence_scoring_ms: 100,
        test_validation_ms: 200,
        extension_activation_ms: 200,
        compile_time_s: 10
    },
    publishing: {
        package_registry: 'npm',
        package_names: [],
        version_format: 'semver',
        publish_command: 'npm publish',
        version_bump_script: 'scripts/bump-version.js',
        publish_script: 'scripts/publish-release.js'
    },
    git_workflow: {
        main_branch: 'main',
        commit_format: 'conventional',
        enforce_tests_on_commit: true,
        enforce_compile_on_commit: true
    },
    aetherlight: {
        agents_directory: 'internal/agents',
        sprints_directory: 'internal/sprints',
        patterns_directory: 'docs/patterns',
        skills_directory: '.claude/skills',
        claude_config_path: '.claude/CLAUDE.md'
    },
    documentation: {
        changelog_path: 'CHANGELOG.md',
        readme_path: 'README.md',
        api_docs_command: 'typedoc',
        api_docs_output: 'docs/api'
    },
    framework: {
        framework_type: 'library',
        nodejs_version: '>=18.0.0'
    }
};
