/**
 * ToolDetector - Auto-detect development tools and extract commands
 *
 * @maintainable
 * Created: 2025-11-07 (SELF-007 - Phase 3 Detection)
 * Test: test/services/ToolDetector.test.ts
 * Pattern: Pattern-TDD-001 (RED-GREEN-REFACTOR)
 *
 * PURPOSE:
 * Automatically detect development tools from project configuration:
 * - Build tools (webpack, vite, rollup, cargo, maven)
 * - Test frameworks (Jest, Mocha, Vitest, pytest, cargo test)
 * - Linters (ESLint, Prettier, Clippy, pylint)
 * - Extract commands from package.json scripts
 *
 * DETECTION STRATEGY:
 * - Build tools: Check devDependencies + config files (webpack.config.js, vite.config.ts)
 * - Test frameworks: Check devDependencies + requirements.txt
 * - Linters: Check devDependencies + config files (.eslintrc.*, .prettierrc)
 * - Commands: Extract from package.json scripts section
 * - Confidence: Config file presence increases confidence
 *
 * PERFORMANCE TARGET: <150ms for typical projects
 *
 * DESIGN DECISIONS:
 * - Synchronous file I/O for performance (no async overhead)
 * - Prioritize modern tools (vite > webpack, Jest > Mocha)
 * - Config file presence = higher confidence
 * - Graceful degradation (return 'unknown' + 0.0 confidence on errors)
 *
 * RELATED: TechStackDetector.ts (SELF-006), ProjectConfigGenerator.ts (SELF-002)
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Detected build tool types
 */
export type BuildToolType = 'webpack' | 'vite' | 'rollup' | 'cargo' | 'maven' | 'unknown';

/**
 * Detected test framework types
 */
export type TestFrameworkType = 'jest' | 'mocha' | 'vitest' | 'pytest' | 'cargo-test' | 'unknown';

/**
 * Detected linter types
 */
export type LinterType = 'eslint' | 'prettier' | 'clippy' | 'pylint' | 'unknown';

/**
 * Tool detection result with confidence score
 */
export interface ToolDetectionResult {
    buildTool?: BuildToolType;
    testFramework?: TestFrameworkType;
    linter?: LinterType;
    buildCommand?: string;
    testCommand?: string;
    lintCommand?: string;
    confidence: number; // 0.0 (no confidence) to 1.0 (very high confidence)
}

/**
 * ToolDetector - Main detection service
 */
export class ToolDetector {
    /**
     * Detect development tools from project directory
     *
     * @param projectRoot - Absolute path to project root
     * @returns ToolDetectionResult with detected tools, commands, and confidence
     *
     * PERFORMANCE: Target <150ms for typical projects
     * ERROR HANDLING: Returns 'unknown' + 0.0 confidence on errors
     */
    public async detect(projectRoot: string): Promise<ToolDetectionResult> {
        // Handle non-existent or inaccessible directories gracefully
        if (!fs.existsSync(projectRoot)) {
            return { confidence: 0.0 };
        }

        try {
            fs.accessSync(projectRoot, fs.constants.R_OK);
        } catch (error) {
            return { confidence: 0.0 };
        }

        let confidence = 0.0;
        let indicators = 0;

        // Detect build tool
        const buildToolResult = this.detectBuildTool(projectRoot);
        const buildTool = buildToolResult.buildTool !== 'unknown' ? buildToolResult.buildTool : undefined;
        if (buildToolResult.buildTool !== 'unknown') {
            confidence += buildToolResult.confidence;
            indicators++;
        }

        // Detect test framework
        const testFrameworkResult = this.detectTestFramework(projectRoot);
        const testFramework = testFrameworkResult.testFramework !== 'unknown' ? testFrameworkResult.testFramework : undefined;
        if (testFrameworkResult.testFramework !== 'unknown') {
            confidence += testFrameworkResult.confidence;
            indicators++;
        }

        // Detect linter
        const linterResult = this.detectLinter(projectRoot);
        const linter = linterResult.linter !== 'unknown' ? linterResult.linter : undefined;
        if (linterResult.linter !== 'unknown') {
            confidence += linterResult.confidence;
            indicators++;
        }

        // Extract commands
        const commands = this.extractCommands(projectRoot, buildTool, testFramework, linter);

        // Normalize confidence (average of all indicators)
        if (indicators > 0) {
            confidence = confidence / indicators;
        }

        return {
            buildTool,
            testFramework,
            linter,
            buildCommand: commands.buildCommand,
            testCommand: commands.testCommand,
            lintCommand: commands.lintCommand,
            confidence: Math.min(1.0, confidence)
        };
    }

    /**
     * Detect build tool from dependencies and config files
     *
     * PRIORITY ORDER (modern tools first):
     * 1. vite (modern, fast)
     * 2. webpack (popular)
     * 3. rollup (library bundling)
     * 4. cargo (Rust)
     * 5. maven (Java)
     */
    private detectBuildTool(projectRoot: string): { buildTool: BuildToolType; confidence: number } {
        // Check for Cargo.toml (Rust)
        if (fs.existsSync(path.join(projectRoot, 'Cargo.toml'))) {
            return { buildTool: 'cargo', confidence: 0.95 };
        }

        // Check for pom.xml (Maven/Java)
        if (fs.existsSync(path.join(projectRoot, 'pom.xml'))) {
            return { buildTool: 'maven', confidence: 0.95 };
        }

        // Check Node.js build tools (package.json)
        const packageJsonPath = path.join(projectRoot, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                const devDeps = packageJson.devDependencies || {};

                // Check for vite (prioritize modern tools)
                if (devDeps['vite']) {
                    const hasConfig = fs.existsSync(path.join(projectRoot, 'vite.config.ts')) ||
                                      fs.existsSync(path.join(projectRoot, 'vite.config.js'));
                    return { buildTool: 'vite', confidence: hasConfig ? 0.95 : 0.75 };
                }

                // Check for webpack
                if (devDeps['webpack']) {
                    const hasConfig = fs.existsSync(path.join(projectRoot, 'webpack.config.js')) ||
                                      fs.existsSync(path.join(projectRoot, 'webpack.config.ts'));
                    return { buildTool: 'webpack', confidence: hasConfig ? 0.95 : 0.75 };
                }

                // Check for rollup
                if (devDeps['rollup']) {
                    const hasConfig = fs.existsSync(path.join(projectRoot, 'rollup.config.js')) ||
                                      fs.existsSync(path.join(projectRoot, 'rollup.config.ts'));
                    return { buildTool: 'rollup', confidence: hasConfig ? 0.95 : 0.75 };
                }
            } catch (error) {
                // Malformed package.json - ignore
            }
        }

        return { buildTool: 'unknown', confidence: 0.0 };
    }

    /**
     * Detect test framework from dependencies
     *
     * PRIORITY ORDER:
     * 1. Jest (most popular)
     * 2. Vitest (modern, Vite ecosystem)
     * 3. Mocha (classic)
     * 4. pytest (Python)
     * 5. cargo test (Rust)
     */
    private detectTestFramework(projectRoot: string): { testFramework: TestFrameworkType; confidence: number } {
        // Check for Cargo.toml with dev-dependencies (Rust)
        const cargoTomlPath = path.join(projectRoot, 'Cargo.toml');
        if (fs.existsSync(cargoTomlPath)) {
            try {
                const cargoToml = fs.readFileSync(cargoTomlPath, 'utf-8');
                if (cargoToml.includes('[dev-dependencies]')) {
                    return { testFramework: 'cargo-test', confidence: 0.9 };
                }
            } catch (error) {
                // Ignore read errors
            }
        }

        // Check for pytest (Python)
        const requirementsPath = path.join(projectRoot, 'requirements.txt');
        if (fs.existsSync(requirementsPath)) {
            try {
                const requirements = fs.readFileSync(requirementsPath, 'utf-8').toLowerCase();
                if (requirements.includes('pytest')) {
                    return { testFramework: 'pytest', confidence: 0.9 };
                }
            } catch (error) {
                // Ignore read errors
            }
        }

        // Check Node.js test frameworks (package.json)
        const packageJsonPath = path.join(projectRoot, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                const devDeps = packageJson.devDependencies || {};

                // Priority order: Jest > Vitest > Mocha
                if (devDeps['jest']) {
                    return { testFramework: 'jest', confidence: 0.85 };
                }
                if (devDeps['vitest']) {
                    return { testFramework: 'vitest', confidence: 0.85 };
                }
                if (devDeps['mocha']) {
                    return { testFramework: 'mocha', confidence: 0.85 };
                }
            } catch (error) {
                // Malformed package.json - ignore
            }
        }

        return { testFramework: 'unknown', confidence: 0.0 };
    }

    /**
     * Detect linter from dependencies and config files
     *
     * PRIORITY ORDER:
     * 1. ESLint (primary linter)
     * 2. Prettier (code formatter)
     * 3. Clippy (Rust)
     * 4. pylint (Python)
     */
    private detectLinter(projectRoot: string): { linter: LinterType; confidence: number } {
        // Check for rust-toolchain (Clippy)
        if (fs.existsSync(path.join(projectRoot, 'rust-toolchain'))) {
            return { linter: 'clippy', confidence: 0.9 };
        }

        // Check for pylint (Python)
        const requirementsPath = path.join(projectRoot, 'requirements.txt');
        if (fs.existsSync(requirementsPath)) {
            try {
                const requirements = fs.readFileSync(requirementsPath, 'utf-8').toLowerCase();
                if (requirements.includes('pylint')) {
                    return { linter: 'pylint', confidence: 0.85 };
                }
            } catch (error) {
                // Ignore read errors
            }
        }

        // Check Node.js linters (package.json)
        const packageJsonPath = path.join(projectRoot, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                const devDeps = packageJson.devDependencies || {};

                // ESLint (primary linter)
                if (devDeps['eslint']) {
                    const hasConfig = this.hasEslintConfig(projectRoot);
                    return { linter: 'eslint', confidence: hasConfig ? 0.95 : 0.75 };
                }

                // Prettier (code formatter)
                if (devDeps['prettier']) {
                    const hasConfig = fs.existsSync(path.join(projectRoot, '.prettierrc')) ||
                                      fs.existsSync(path.join(projectRoot, '.prettierrc.js')) ||
                                      fs.existsSync(path.join(projectRoot, '.prettierrc.json'));
                    return { linter: 'prettier', confidence: hasConfig ? 0.95 : 0.75 };
                }
            } catch (error) {
                // Malformed package.json - ignore
            }
        }

        return { linter: 'unknown', confidence: 0.0 };
    }

    /**
     * Check if ESLint config exists
     */
    private hasEslintConfig(projectRoot: string): boolean {
        const configFiles = [
            '.eslintrc.js',
            '.eslintrc.cjs',
            '.eslintrc.json',
            '.eslintrc.yml',
            '.eslintrc.yaml',
            'eslint.config.js'
        ];

        for (const configFile of configFiles) {
            if (fs.existsSync(path.join(projectRoot, configFile))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Extract commands from package.json scripts or use defaults
     *
     * COMMAND EXTRACTION RULES:
     * - scripts.build → "npm run build"
     * - scripts.test → "npm test"
     * - scripts.lint → "npm run lint"
     * - Custom scripts (build:prod) → detect and use
     * - Fallback to tool-specific defaults (cargo build, pytest, etc.)
     */
    private extractCommands(
        projectRoot: string,
        buildTool?: BuildToolType,
        testFramework?: TestFrameworkType,
        linter?: LinterType
    ): { buildCommand?: string; testCommand?: string; lintCommand?: string } {
        const result: { buildCommand?: string; testCommand?: string; lintCommand?: string } = {};

        // Extract from package.json scripts (Node.js projects)
        const packageJsonPath = path.join(projectRoot, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                const scripts = packageJson.scripts || {};

                // Build command
                if (scripts['build']) {
                    result.buildCommand = 'npm run build';
                } else if (scripts['build:prod']) {
                    result.buildCommand = 'npm run build:prod';
                }

                // Test command
                if (scripts['test']) {
                    result.testCommand = 'npm test';
                } else if (scripts['test:unit']) {
                    result.testCommand = 'npm run test:unit';
                }

                // Lint command
                if (scripts['lint']) {
                    result.lintCommand = 'npm run lint';
                }
            } catch (error) {
                // Malformed package.json - use defaults
            }
        }

        // Default commands based on detected tools (if no scripts found)
        if (!result.buildCommand && buildTool === 'cargo') {
            result.buildCommand = 'cargo build';
        }

        if (!result.testCommand) {
            if (testFramework === 'cargo-test') {
                result.testCommand = 'cargo test';
            } else if (testFramework === 'pytest') {
                result.testCommand = 'pytest';
            }
        }

        return result;
    }
}
