/**
 * TechStackDetector - Auto-detect project language, framework, and package manager
 *
 * @maintainable
 * Created: 2025-11-07 (SELF-006 - Phase 3 Detection)
 * Test: test/services/TechStackDetector.test.ts
 * Pattern: Pattern-TDD-001 (RED-GREEN-REFACTOR)
 *
 * PURPOSE:
 * Automatically detect project tech stack from filesystem patterns to enable:
 * - Self-configuration (reduce interview questions from 10+ to 2-3)
 * - Smart defaults (language, framework, package manager)
 * - Confidence scoring (0.0-1.0) to determine if manual override needed
 *
 * DETECTION STRATEGY:
 * - Language: Check for manifest files (package.json, Cargo.toml, setup.py, go.mod)
 * - Framework: Parse dependencies in manifest files
 * - Package Manager: Check for lock files (package-lock.json, yarn.lock, Cargo.lock)
 * - Confidence: Multiple indicators = higher confidence
 *
 * PERFORMANCE TARGET: <200ms for typical projects
 *
 * DESIGN DECISIONS:
 * - Synchronous file I/O for performance (no async overhead)
 * - Early returns to minimize filesystem access
 * - Whitelist-based detection (explicit patterns only)
 * - Graceful degradation (return 'unknown' + 0.0 confidence on errors)
 *
 * RELATED: DiscoveryService.ts (filesystem scanning patterns)
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Detected language types
 */
export type LanguageType = 'javascript' | 'typescript' | 'rust' | 'python' | 'go' | 'unknown';

/**
 * Detected framework types
 */
export type FrameworkType = 'react' | 'vue' | 'express' | 'tauri' | 'flask' | 'django' | 'unknown';

/**
 * Detected package manager types
 */
export type PackageManagerType = 'npm' | 'yarn' | 'pnpm' | 'cargo' | 'pip' | 'pipenv' | 'go' | 'unknown';

/**
 * Detected test framework types
 */
export type TestFrameworkType = 'jest' | 'mocha' | 'pytest' | 'unknown';

/**
 * Detection result with confidence score
 */
export interface DetectionResult {
    language: LanguageType;
    framework?: FrameworkType;
    packageManager: PackageManagerType;
    testFramework?: TestFrameworkType;
    confidence: number; // 0.0 (no confidence) to 1.0 (very high confidence)
}

/**
 * TechStackDetector - Main detection service
 */
export class TechStackDetector {
    /**
     * Detect tech stack from project directory
     *
     * @param projectRoot - Absolute path to project root
     * @returns DetectionResult with language, framework, package manager, and confidence
     *
     * PERFORMANCE: Target <200ms for typical projects
     * ERROR HANDLING: Returns 'unknown' + 0.0 confidence on errors
     */
    public async detect(projectRoot: string): Promise<DetectionResult> {
        // Handle non-existent or inaccessible directories gracefully
        if (!fs.existsSync(projectRoot)) {
            return {
                language: 'unknown',
                packageManager: 'unknown',
                confidence: 0.0
            };
        }

        try {
            // Check directory permissions
            fs.accessSync(projectRoot, fs.constants.R_OK);
        } catch (error) {
            // No read permissions
            return {
                language: 'unknown',
                packageManager: 'unknown',
                confidence: 0.0
            };
        }

        let confidence = 0.0;
        let indicators = 0; // Track number of detected indicators

        // Detect language (primary indicator)
        const languageResult = this.detectLanguage(projectRoot);
        let language = languageResult.language;
        confidence += languageResult.confidence;
        if (languageResult.language !== 'unknown') {
            indicators++;
        }

        // Detect package manager (secondary indicator)
        const packageManagerResult = this.detectPackageManager(projectRoot, language);
        const packageManager = packageManagerResult.packageManager;
        confidence += packageManagerResult.confidence;
        if (packageManagerResult.packageManager !== 'unknown') {
            indicators++;
        }

        // Detect framework (tertiary indicator)
        const frameworkResult = this.detectFramework(projectRoot, language);
        const framework = frameworkResult.framework !== 'unknown' ? frameworkResult.framework : undefined;
        if (frameworkResult.framework !== 'unknown') {
            confidence += frameworkResult.confidence;
            indicators++;
        }

        // Detect test framework (optional indicator)
        const testFrameworkResult = this.detectTestFramework(projectRoot, language);
        const testFramework = testFrameworkResult.framework !== 'unknown' ? testFrameworkResult.framework : undefined;
        if (testFrameworkResult.framework !== 'unknown') {
            confidence += testFrameworkResult.confidence;
            indicators++;
        }

        // Normalize confidence (average of all indicators)
        if (indicators > 0) {
            confidence = confidence / indicators;
        }

        return {
            language,
            framework,
            packageManager,
            testFramework,
            confidence: Math.min(1.0, confidence) // Cap at 1.0
        };
    }

    /**
     * Detect programming language from manifest files
     *
     * PRIORITY ORDER:
     * 1. TypeScript (tsconfig.json or .ts files) - highest confidence
     * 2. Rust (Cargo.toml)
     * 3. Go (go.mod)
     * 4. Python (setup.py, requirements.txt, pyproject.toml)
     * 5. JavaScript (package.json)
     *
     * REASONING: TypeScript is a superset of JavaScript, so prioritize it.
     */
    private detectLanguage(projectRoot: string): { language: LanguageType; confidence: number } {
        // Check for TypeScript first (highest priority if present)
        if (fs.existsSync(path.join(projectRoot, 'tsconfig.json'))) {
            return { language: 'typescript', confidence: 0.9 };
        }

        // Check for .ts files in src/ or root
        if (this.hasFiles(projectRoot, '.ts', ['src', '.'])) {
            return { language: 'typescript', confidence: 0.85 };
        }

        // Check for Rust
        if (fs.existsSync(path.join(projectRoot, 'Cargo.toml'))) {
            return { language: 'rust', confidence: 0.95 };
        }

        // Check for Go
        if (fs.existsSync(path.join(projectRoot, 'go.mod'))) {
            return { language: 'go', confidence: 0.95 };
        }

        // Check for .go files
        if (this.hasFiles(projectRoot, '.go', ['.'])) {
            return { language: 'go', confidence: 0.85 };
        }

        // Check for Python
        if (fs.existsSync(path.join(projectRoot, 'setup.py'))) {
            return { language: 'python', confidence: 0.9 };
        }

        if (fs.existsSync(path.join(projectRoot, 'requirements.txt'))) {
            return { language: 'python', confidence: 0.85 };
        }

        if (fs.existsSync(path.join(projectRoot, 'pyproject.toml'))) {
            return { language: 'python', confidence: 0.9 };
        }

        // Check for JavaScript (check if package.json is well-formed)
        const packageJsonPath = path.join(projectRoot, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                // Well-formed package.json (has name or version) = higher confidence
                if (packageJson.name || packageJson.version) {
                    return { language: 'javascript', confidence: 0.9 };
                }
                // Minimal/empty package.json = lower confidence
                return { language: 'javascript', confidence: 0.6 };
            } catch (error) {
                // Malformed JSON - still detect as JavaScript (file presence)
                return { language: 'javascript', confidence: 0.5 };
            }
        }

        // No language detected
        return { language: 'unknown', confidence: 0.0 };
    }

    /**
     * Detect package manager from lock files
     *
     * PRIORITY ORDER:
     * 1. Lock files (high confidence): package-lock.json, yarn.lock, pnpm-lock.yaml, Cargo.lock
     * 2. Manifest only (medium confidence): Fallback to language default
     */
    private detectPackageManager(projectRoot: string, language: LanguageType): { packageManager: PackageManagerType; confidence: number } {
        // Node.js ecosystem
        if (language === 'javascript' || language === 'typescript') {
            if (fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) {
                return { packageManager: 'pnpm', confidence: 0.95 };
            }
            if (fs.existsSync(path.join(projectRoot, 'yarn.lock'))) {
                return { packageManager: 'yarn', confidence: 0.95 };
            }
            if (fs.existsSync(path.join(projectRoot, 'package-lock.json'))) {
                return { packageManager: 'npm', confidence: 0.95 };
            }
            if (fs.existsSync(path.join(projectRoot, 'package.json'))) {
                // Default to npm if no lock file (medium confidence)
                return { packageManager: 'npm', confidence: 0.7 };
            }
        }

        // Rust
        if (language === 'rust') {
            return { packageManager: 'cargo', confidence: 0.95 };
        }

        // Go
        if (language === 'go') {
            return { packageManager: 'go', confidence: 0.95 };
        }

        // Python
        if (language === 'python') {
            if (fs.existsSync(path.join(projectRoot, 'Pipfile'))) {
                return { packageManager: 'pipenv', confidence: 0.9 };
            }
            if (fs.existsSync(path.join(projectRoot, 'requirements.txt'))) {
                return { packageManager: 'pip', confidence: 0.85 };
            }
            // Default to pip
            return { packageManager: 'pip', confidence: 0.7 };
        }

        return { packageManager: 'unknown', confidence: 0.0 };
    }

    /**
     * Detect framework from dependencies
     *
     * SUPPORTED FRAMEWORKS:
     * - Node.js: React, Vue, Express, Tauri
     * - Python: Flask, Django
     */
    private detectFramework(projectRoot: string, language: LanguageType): { framework: FrameworkType; confidence: number } {
        // Node.js frameworks
        if (language === 'javascript' || language === 'typescript') {
            const packageJsonPath = path.join(projectRoot, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                try {
                    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                    const dependencies = packageJson.dependencies || {};
                    const devDependencies = packageJson.devDependencies || {};

                    // Check dependencies (higher confidence)
                    if (dependencies['react']) {
                        return { framework: 'react', confidence: 0.9 };
                    }
                    if (dependencies['vue']) {
                        return { framework: 'vue', confidence: 0.9 };
                    }
                    if (dependencies['express']) {
                        return { framework: 'express', confidence: 0.9 };
                    }
                    if (dependencies['@tauri-apps/api']) {
                        return { framework: 'tauri', confidence: 0.9 };
                    }

                    // Check devDependencies (lower confidence)
                    if (devDependencies['react']) {
                        return { framework: 'react', confidence: 0.7 };
                    }
                    if (devDependencies['vue']) {
                        return { framework: 'vue', confidence: 0.7 };
                    }
                } catch (error) {
                    // Malformed package.json - ignore and continue
                }
            }
        }

        // Python frameworks
        if (language === 'python') {
            const requirementsPath = path.join(projectRoot, 'requirements.txt');
            if (fs.existsSync(requirementsPath)) {
                try {
                    const requirements = fs.readFileSync(requirementsPath, 'utf-8').toLowerCase();
                    if (requirements.includes('flask')) {
                        return { framework: 'flask', confidence: 0.9 };
                    }
                    if (requirements.includes('django')) {
                        return { framework: 'django', confidence: 0.9 };
                    }
                } catch (error) {
                    // Ignore read errors
                }
            }
        }

        return { framework: 'unknown', confidence: 0.0 };
    }

    /**
     * Detect test framework from dependencies
     */
    private detectTestFramework(projectRoot: string, language: LanguageType): { framework: TestFrameworkType; confidence: number } {
        // Node.js test frameworks
        if (language === 'javascript' || language === 'typescript') {
            const packageJsonPath = path.join(projectRoot, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                try {
                    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                    const devDependencies = packageJson.devDependencies || {};

                    if (devDependencies['jest']) {
                        return { framework: 'jest', confidence: 0.85 };
                    }
                    if (devDependencies['mocha']) {
                        return { framework: 'mocha', confidence: 0.85 };
                    }
                } catch (error) {
                    // Malformed package.json - ignore
                }
            }
        }

        // Python test frameworks
        if (language === 'python') {
            const requirementsPath = path.join(projectRoot, 'requirements.txt');
            if (fs.existsSync(requirementsPath)) {
                try {
                    const requirements = fs.readFileSync(requirementsPath, 'utf-8').toLowerCase();
                    if (requirements.includes('pytest')) {
                        return { framework: 'pytest', confidence: 0.85 };
                    }
                } catch (error) {
                    // Ignore
                }
            }
        }

        return { framework: 'unknown', confidence: 0.0 };
    }

    /**
     * Check if directory contains files with specific extension
     *
     * @param projectRoot - Project root directory
     * @param extension - File extension to search for (e.g., '.ts')
     * @param searchDirs - Subdirectories to search (e.g., ['src', '.'])
     * @returns true if files found
     */
    private hasFiles(projectRoot: string, extension: string, searchDirs: string[]): boolean {
        for (const dir of searchDirs) {
            const searchPath = dir === '.' ? projectRoot : path.join(projectRoot, dir);
            if (!fs.existsSync(searchPath)) {
                continue;
            }

            try {
                const entries = fs.readdirSync(searchPath);
                for (const entry of entries) {
                    if (entry.endsWith(extension)) {
                        return true;
                    }
                }
            } catch (error) {
                // Permission denied or other error - continue to next directory
                continue;
            }
        }

        return false;
    }
}
