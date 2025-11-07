/**
 * Config Generator Service
 *
 * DESIGN DECISION: Auto-generate .aetherlight/config.json for ANY project
 * WHY: Makes ÆtherLight generic - works for ANY project, not just ÆtherLight itself
 *
 * REASONING CHAIN:
 * 1. User runs analyze workspace or initializes ÆtherLight in new project
 * 2. ConfigGenerator scans project structure (package.json, directories, files)
 * 3. Auto-detects: project type, tech stack, file structure, testing framework
 * 4. Prompts user for preferences: coverage targets, TDD requirement, sprint directory
 * 5. Merges detected values + user preferences + sensible defaults
 * 6. Generates .aetherlight/config.json
 * 7. TaskAnalyzer (PROTECT-000A) can now use config for prompts
 * 8. Result: ENTIRE system works for ANY project (generic platform)
 *
 * PATTERN: Pattern-CODE-001
 * RELATED: PROTECT-000E (Config Generator task)
 * DEPENDENCY: PROTECT-000A (TaskAnalyzer depends on config.json)
 *
 * @module services/ConfigGenerator
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Package.json structure (minimal fields needed)
 */
export interface PackageJson {
    name?: string;
    version?: string;
    description?: string;
    main?: string;
    types?: string;
    bin?: Record<string, string> | string;
    engines?: Record<string, string>;
    contributes?: any;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
}

/**
 * Testing framework detection result
 */
export interface TestingFrameworkResult {
    framework: string;
    runner: string;
}

/**
 * File structure detection result
 */
export interface FileStructureResult {
    sourceDir: string;
    testsDir: string;
    docsDir?: string;
    sprintDir?: string;
}

/**
 * Config generation options
 */
export interface ConfigGenerationOptions {
    projectType: string;
    framework: string;
    sourceDir: string;
    testsDir: string;
    docsDir?: string;
    coverageTargets: 'default' | 'custom';
    customCoverage?: {
        infrastructure: number;
        api: number;
        ui: number;
    };
    requireTDD: boolean;
    sprintDir: string;
}

/**
 * Generated config structure
 */
export interface AetherlightConfig {
    $schema: string;
    version: string;
    project: {
        name: string;
        type: string;
        description: string;
    };
    structure: {
        sprintDir: string;
        activeSprint: string;
        patternsDir: string;
        testsDir: string;
        sourceDir: string;
        docsDir?: string;
    };
    testing: {
        framework: string;
        runner: string;
        coverage: {
            infrastructure: number;
            api: number;
            ui: number;
        };
        manualTestingRequired: boolean;
        reason?: string;
    };
    workflows: {
        preFlightChecklistPath: string;
        preFlightSections: string[];
        patternsDir: string;
        requiredPatterns: string[];
    };
    git: {
        mainBranch: string;
        commitMessageFormat: string;
        preCommitHooks: boolean;
    };
}

/**
 * ConfigGenerator
 *
 * Generates .aetherlight/config.json for ANY project
 */
export class ConfigGenerator {
    private workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
    }

    /**
     * Detect project type from package.json
     *
     * DESIGN DECISION: Use package.json markers to identify project type
     * WHY: Most reliable source of project metadata
     *
     * Detection logic:
     * - VS Code extension: engines.vscode + contributes
     * - CLI tool: bin field
     * - Web app: React/Vue/Angular/Next.js dependencies
     * - Library: main + types fields (no bin, no engines.vscode)
     */
    async detectProjectType(packageJson: PackageJson): Promise<string> {
        // VS Code extension
        if (packageJson.engines?.vscode && packageJson.contributes) {
            return 'vscode-extension';
        }

        // CLI tool
        if (packageJson.bin) {
            return 'cli-tool';
        }

        // Web app (check for frontend frameworks)
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        const webFrameworks = ['react', 'vue', 'angular', 'next', 'svelte', 'solid-js'];
        const hasWebFramework = webFrameworks.some(fw =>
            Object.keys(deps).some(dep => dep.includes(fw))
        );
        if (hasWebFramework) {
            return 'web-app';
        }

        // Library (default if has main/types)
        if (packageJson.main || packageJson.types) {
            return 'library';
        }

        // Fallback
        return 'library';
    }

    /**
     * Detect testing framework from package.json and workspace files
     *
     * DESIGN DECISION: Check devDependencies and test script
     * WHY: Test framework always in devDependencies
     *
     * Supported frameworks: mocha, jest, vitest, pytest, cargo test
     */
    async detectTestingFramework(packageJson: PackageJson, workspaceRoot: string): Promise<TestingFrameworkResult> {
        const devDeps = packageJson.devDependencies || {};
        const scripts = packageJson.scripts || {};

        // Mocha
        if (devDeps.mocha || scripts.test?.includes('mocha')) {
            return {
                framework: 'mocha',
                runner: 'npm test'
            };
        }

        // Jest
        if (devDeps.jest || scripts.test?.includes('jest')) {
            return {
                framework: 'jest',
                runner: 'npm test'
            };
        }

        // Vitest
        if (devDeps.vitest || scripts.test?.includes('vitest')) {
            return {
                framework: 'vitest',
                runner: 'npm test'
            };
        }

        // Check for Python projects (pytest)
        const hasPytest = fs.existsSync(path.join(workspaceRoot, 'pytest.ini')) ||
                          fs.existsSync(path.join(workspaceRoot, 'pyproject.toml'));
        if (hasPytest) {
            return {
                framework: 'pytest',
                runner: 'pytest'
            };
        }

        // Check for Rust projects (cargo test)
        const hasCargoToml = fs.existsSync(path.join(workspaceRoot, 'Cargo.toml'));
        if (hasCargoToml) {
            return {
                framework: 'cargo-test',
                runner: 'cargo test'
            };
        }

        // Default
        return {
            framework: 'unknown',
            runner: 'npm test'
        };
    }

    /**
     * Detect file structure (source, tests, docs directories)
     *
     * DESIGN DECISION: Check common directory names
     * WHY: Most projects follow standard conventions
     *
     * Common patterns:
     * - Source: src/, lib/, app/, source/
     * - Tests: test/, tests/, spec/, __tests__/
     * - Docs: docs/, documentation/, doc/
     * - Sprints: sprints/, internal/sprints/
     */
    async detectFileStructure(workspaceRoot: string): Promise<FileStructureResult> {
        const result: FileStructureResult = {
            sourceDir: 'src',
            testsDir: 'test'
        };

        // Detect source directory
        const sourceDirCandidates = ['src', 'lib', 'app', 'source'];
        for (const dir of sourceDirCandidates) {
            if (fs.existsSync(path.join(workspaceRoot, dir))) {
                result.sourceDir = dir;
                break;
            }
        }

        // Detect tests directory
        const testsDirCandidates = ['test', 'tests', 'spec', '__tests__'];
        for (const dir of testsDirCandidates) {
            if (fs.existsSync(path.join(workspaceRoot, dir))) {
                result.testsDir = dir;
                break;
            }
        }

        // Detect docs directory (optional)
        const docsDirCandidates = ['docs', 'documentation', 'doc'];
        for (const dir of docsDirCandidates) {
            if (fs.existsSync(path.join(workspaceRoot, dir))) {
                result.docsDir = dir;
                break;
            }
        }

        // Detect sprint directory (optional)
        const sprintDirCandidates = ['sprints', 'internal/sprints', '.aetherlight/sprints'];
        for (const dir of sprintDirCandidates) {
            if (fs.existsSync(path.join(workspaceRoot, dir))) {
                result.sprintDir = dir;
                break;
            }
        }

        return result;
    }

    /**
     * Generate config.json with detected values + user preferences + defaults
     *
     * DESIGN DECISION: Merge three sources of config data
     * WHY: Auto-detection (fast), user preferences (control), defaults (fallback)
     *
     * @param options - Detected values + user preferences
     * @returns Complete config object ready to save
     */
    async generateConfig(options: ConfigGenerationOptions): Promise<AetherlightConfig> {
        // Default coverage targets by project type
        const defaultCoverage = {
            infrastructure: 90,
            api: 85,
            ui: 70
        };

        // Use custom coverage if specified
        const coverage = options.coverageTargets === 'custom' && options.customCoverage
            ? options.customCoverage
            : defaultCoverage;

        // Manual testing requirements by project type
        const requiresManualTesting = [
            'vscode-extension',
            'web-app',
            'mobile-app',
            'desktop-app'
        ].includes(options.projectType);

        const manualTestingReasons: Record<string, string> = {
            'vscode-extension': 'VS Code extensions require manual testing after publish',
            'web-app': 'UI/UX requires visual testing across browsers',
            'mobile-app': 'Device-specific testing required',
            'desktop-app': 'Platform-specific testing required'
        };

        // Generate config
        const config: AetherlightConfig = {
            $schema: 'https://aetherlight.dev/schema/config.json',
            version: '1.0.0',
            project: {
                name: path.basename(this.workspaceRoot),
                type: options.projectType,
                description: `${options.projectType} project`
            },
            structure: {
                sprintDir: options.sprintDir,
                activeSprint: 'ACTIVE_SPRINT.toml',
                patternsDir: options.docsDir ? `${options.docsDir}/patterns` : 'docs/patterns',
                testsDir: options.testsDir,
                sourceDir: options.sourceDir
            },
            testing: {
                framework: options.framework,
                runner: options.framework === 'pytest' ? 'pytest' :
                        options.framework === 'cargo-test' ? 'cargo test' :
                        'npm test',
                coverage,
                manualTestingRequired: requiresManualTesting,
                reason: requiresManualTesting ? manualTestingReasons[options.projectType] : undefined
            },
            workflows: {
                preFlightChecklistPath: '.claude/CLAUDE.md',
                preFlightSections: [
                    'Before Modifying ACTIVE_SPRINT.toml',
                    'Before Adding Dependencies to package.json',
                    'Before Using Edit/Write Tools'
                ],
                patternsDir: options.docsDir ? `${options.docsDir}/patterns` : 'docs/patterns',
                requiredPatterns: options.requireTDD
                    ? ['Pattern-TASK-ANALYSIS-001', 'Pattern-CODE-001', 'Pattern-TDD-001', 'Pattern-TRACKING-001']
                    : ['Pattern-TASK-ANALYSIS-001', 'Pattern-CODE-001', 'Pattern-TRACKING-001']
            },
            git: {
                mainBranch: 'main',
                commitMessageFormat: 'conventional',
                preCommitHooks: true
            }
        };

        // Add docsDir if detected
        if (options.docsDir) {
            config.structure.docsDir = options.docsDir;
        }

        return config;
    }

    /**
     * Save config to .aetherlight/config.json
     *
     * DESIGN DECISION: Always create .aetherlight/ directory
     * WHY: Centralizes all ÆtherLight metadata
     */
    async saveConfig(config: AetherlightConfig): Promise<string> {
        const aetherlightDir = path.join(this.workspaceRoot, '.aetherlight');
        if (!fs.existsSync(aetherlightDir)) {
            fs.mkdirSync(aetherlightDir, { recursive: true });
        }

        const configPath = path.join(aetherlightDir, 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

        return configPath;
    }

    /**
     * Check if config already exists
     *
     * DESIGN DECISION: Skip generation if config exists
     * WHY: Don't overwrite user customizations
     */
    configExists(): boolean {
        const configPath = path.join(this.workspaceRoot, '.aetherlight', 'config.json');
        return fs.existsSync(configPath);
    }
}
