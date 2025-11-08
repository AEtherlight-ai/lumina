/**
 * DomainDetector - Auto-detect project domain and sub-type
 *
 * @maintainable
 * Created: 2025-11-07 (SELF-009 - Phase 3 Detection)
 * Test: test/services/DomainDetector.test.ts
 * Pattern: Pattern-TDD-001 (RED-GREEN-REFACTOR)
 *
 * PURPOSE:
 * Automatically detect project domain from keywords and structure.
 * Phase 1: software-dev domain only (CLI, web, desktop, library sub-types)
 * Future: Extensible for healthcare, legal, SEO domains
 *
 * DETECTION STRATEGY:
 * - CLI: package.json "bin" field, keywords (cli, command-line), bin/ directory
 * - Web: Dependencies (react, vue, express, next, angular), public/static directories
 * - Desktop: Dependencies (tauri, electron, nw), src-tauri/ directory
 * - Library: Minimal dependencies (only devDependencies)
 * - README.md keyword analysis for additional context
 * - Confidence: Multiple indicators = higher confidence
 *
 * PERFORMANCE TARGET: <100ms for typical projects
 *
 * DESIGN DECISIONS:
 * - Synchronous file I/O for performance
 * - Priority order: CLI > Desktop > Web > Library
 * - Graceful degradation (return 'unknown' + 0.0 confidence on errors)
 * - Extensible design: Future domains can be added via registry pattern
 *
 * RELATED: TechStackDetector.ts (SELF-006), ProjectConfigGenerator.ts (SELF-002)
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Domain types (Phase 1: software-dev only)
 */
export type DomainType = 'software-dev' | 'unknown';

/**
 * Software development sub-types
 */
export type SoftwareDevSubType = 'cli' | 'web' | 'desktop' | 'library' | 'unknown';

/**
 * Domain detection result with confidence score
 */
export interface DomainDetectionResult {
    domain: DomainType;
    subType?: SoftwareDevSubType;
    confidence: number; // 0.0 (no confidence) to 1.0 (very high confidence)
}

/**
 * DomainDetector - Main detection service
 */
export class DomainDetector {
    /**
     * Detect project domain from directory
     *
     * @param projectRoot - Absolute path to project root
     * @returns DomainDetectionResult with domain, sub-type, and confidence
     *
     * PERFORMANCE: Target <100ms for typical projects
     * ERROR HANDLING: Returns 'unknown' + 0.0 confidence on errors
     */
    public async detect(projectRoot: string): Promise<DomainDetectionResult> {
        // Handle non-existent or inaccessible directories gracefully
        if (!fs.existsSync(projectRoot)) {
            return { domain: 'unknown', confidence: 0.0 };
        }

        try {
            fs.accessSync(projectRoot, fs.constants.R_OK);
        } catch (error) {
            return { domain: 'unknown', confidence: 0.0 };
        }

        // Detect sub-type (CLI, web, desktop, library)
        const cliIndicators = this.detectCLI(projectRoot);
        const webIndicators = this.detectWeb(projectRoot);
        const desktopIndicators = this.detectDesktop(projectRoot);
        const libraryIndicators = this.detectLibrary(projectRoot);

        // Priority order: CLI > Desktop > Web > Library
        let subType: SoftwareDevSubType = 'unknown';
        let confidence = 0.0;

        if (cliIndicators.count > 0) {
            subType = 'cli';
            confidence = this.calculateConfidence(cliIndicators.count, cliIndicators.strong);
        } else if (desktopIndicators.count > 0) {
            subType = 'desktop';
            confidence = this.calculateConfidence(desktopIndicators.count, desktopIndicators.strong);
        } else if (webIndicators.count > 0) {
            subType = 'web';
            confidence = this.calculateConfidence(webIndicators.count, webIndicators.strong);
        } else if (libraryIndicators.count > 0) {
            subType = 'library';
            confidence = this.calculateConfidence(libraryIndicators.count, libraryIndicators.strong);
        }

        // Phase 1: Always software-dev domain
        const domain: DomainType = subType !== 'unknown' ? 'software-dev' : 'unknown';

        return {
            domain,
            subType: subType !== 'unknown' ? subType : undefined,
            confidence
        };
    }

    /**
     * Detect CLI indicators
     *
     * CLI INDICATORS:
     * - Strong: package.json "bin" field (object or string)
     * - Medium: keywords (cli, command-line, tool, terminal)
     * - Weak: bin/ directory, cli/ directory
     * - README: keywords (CLI, command-line, command line)
     */
    private detectCLI(projectRoot: string): { count: number; strong: number } {
        let count = 0;
        let strong = 0;

        // Check package.json for bin field (strong indicator)
        const packageJsonPath = path.join(projectRoot, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

                // Check bin field
                if (packageJson.bin) {
                    count++;
                    strong++;
                }

                // Check keywords
                if (packageJson.keywords && Array.isArray(packageJson.keywords)) {
                    const cliKeywords = ['cli', 'command-line', 'tool', 'terminal', 'console'];
                    const hasKeyword = packageJson.keywords.some((kw: string) =>
                        cliKeywords.includes(kw.toLowerCase())
                    );
                    if (hasKeyword) {
                        count++;
                    }
                }
            } catch (error) {
                // Malformed package.json - ignore
            }
        }

        // Check for bin/ or cli/ directory (weak indicator)
        if (fs.existsSync(path.join(projectRoot, 'bin')) ||
            fs.existsSync(path.join(projectRoot, 'cli'))) {
            count++;
        }

        // Check README for CLI keywords
        if (this.hasREADMEKeywords(projectRoot, ['cli', 'command-line', 'command line', 'terminal'])) {
            count++;
        }

        return { count, strong };
    }

    /**
     * Detect web indicators
     *
     * WEB INDICATORS:
     * - Strong: react, vue, angular, express, next dependencies
     * - Medium: keywords (web, webapp, frontend, backend)
     * - Weak: public/ or static/ directory
     * - README: keywords (web, webapp, website, frontend, backend)
     */
    private detectWeb(projectRoot: string): { count: number; strong: number } {
        let count = 0;
        let strong = 0;

        // Check package.json for web frameworks (strong indicator)
        const packageJsonPath = path.join(projectRoot, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                const deps = packageJson.dependencies || {};

                // Check for web frameworks
                const webFrameworks = ['react', 'vue', 'angular', '@angular/core', 'express', 'next', 'nuxt', 'svelte'];
                const hasFramework = webFrameworks.some(fw => deps[fw]);
                if (hasFramework) {
                    count++;
                    strong++;
                }

                // Check keywords
                if (packageJson.keywords && Array.isArray(packageJson.keywords)) {
                    const webKeywords = ['web', 'webapp', 'frontend', 'backend', 'website'];
                    const hasKeyword = packageJson.keywords.some((kw: string) =>
                        webKeywords.includes(kw.toLowerCase())
                    );
                    if (hasKeyword) {
                        count++;
                    }
                }
            } catch (error) {
                // Malformed package.json - ignore
            }
        }

        // Check for public/ or static/ directory (weak indicator)
        if (fs.existsSync(path.join(projectRoot, 'public')) ||
            fs.existsSync(path.join(projectRoot, 'static'))) {
            count++;
        }

        // Check README for web keywords
        if (this.hasREADMEKeywords(projectRoot, ['web', 'webapp', 'website', 'frontend', 'backend'])) {
            count++;
        }

        return { count, strong };
    }

    /**
     * Detect desktop indicators
     *
     * DESKTOP INDICATORS:
     * - Strong: tauri, electron, nw dependencies
     * - Medium: keywords (desktop, app, gui)
     * - Weak: src-tauri/ directory
     * - README: keywords (desktop, electron, tauri)
     */
    private detectDesktop(projectRoot: string): { count: number; strong: number } {
        let count = 0;
        let strong = 0;

        // Check package.json for desktop frameworks (strong indicator)
        const packageJsonPath = path.join(projectRoot, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                const deps = packageJson.dependencies || {};

                // Check for desktop frameworks
                const desktopFrameworks = ['@tauri-apps/api', '@tauri-apps/cli', 'electron', 'nw'];
                const hasFramework = desktopFrameworks.some(fw => deps[fw]);
                if (hasFramework) {
                    count++;
                    strong++;
                }

                // Check keywords
                if (packageJson.keywords && Array.isArray(packageJson.keywords)) {
                    const desktopKeywords = ['desktop', 'app', 'gui', 'electron', 'tauri'];
                    const hasKeyword = packageJson.keywords.some((kw: string) =>
                        desktopKeywords.includes(kw.toLowerCase())
                    );
                    if (hasKeyword) {
                        count++;
                    }
                }
            } catch (error) {
                // Malformed package.json - ignore
            }
        }

        // Check for src-tauri/ directory (weak indicator)
        if (fs.existsSync(path.join(projectRoot, 'src-tauri'))) {
            count++;
        }

        // Check README for desktop keywords
        if (this.hasREADMEKeywords(projectRoot, ['desktop', 'electron', 'tauri', 'cross-platform'])) {
            count++;
        }

        return { count, strong };
    }

    /**
     * Detect library indicators
     *
     * LIBRARY INDICATORS:
     * - Strong: no dependencies (only devDependencies)
     * - Medium: keywords (library, module, package, sdk)
     * - Weak: minimal dependencies (1-2 utilities)
     * - README: keywords (library, module, package, sdk, npm package)
     */
    private detectLibrary(projectRoot: string): { count: number; strong: number } {
        let count = 0;
        let strong = 0;

        // Check package.json for library characteristics
        const packageJsonPath = path.join(projectRoot, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                const deps = packageJson.dependencies || {};
                const devDeps = packageJson.devDependencies || {};

                // Strong indicator: no dependencies or minimal dependencies
                const depCount = Object.keys(deps).length;
                const devDepCount = Object.keys(devDeps).length;

                if (depCount === 0 && devDepCount > 0) {
                    // Only devDependencies = library
                    count++;
                    strong++;
                } else if (depCount <= 2 && devDepCount >= depCount) {
                    // Minimal dependencies = likely library
                    count++;
                }

                // Check keywords
                if (packageJson.keywords && Array.isArray(packageJson.keywords)) {
                    const libraryKeywords = ['library', 'module', 'package', 'sdk', 'util', 'utility'];
                    const hasKeyword = packageJson.keywords.some((kw: string) =>
                        libraryKeywords.includes(kw.toLowerCase())
                    );
                    if (hasKeyword) {
                        count++;
                    }
                }
            } catch (error) {
                // Malformed package.json - ignore
            }
        }

        // Check README for library keywords
        if (this.hasREADMEKeywords(projectRoot, ['library', 'module', 'package', 'sdk', 'npm package'])) {
            count++;
        }

        return { count, strong };
    }

    /**
     * Check if README.md contains any of the given keywords
     *
     * @param projectRoot - Project root directory
     * @param keywords - Keywords to search for (case-insensitive)
     * @returns true if README contains any keyword
     */
    private hasREADMEKeywords(projectRoot: string, keywords: string[]): boolean {
        const readmePaths = ['README.md', 'readme.md', 'Readme.md', 'README.MD'];

        for (const readmePath of readmePaths) {
            const fullPath = path.join(projectRoot, readmePath);
            if (fs.existsSync(fullPath)) {
                try {
                    const content = fs.readFileSync(fullPath, 'utf-8').toLowerCase();
                    return keywords.some(kw => content.includes(kw.toLowerCase()));
                } catch (error) {
                    // Binary file or read error - ignore
                    return false;
                }
            }
        }

        return false;
    }

    /**
     * Calculate confidence score based on indicator count
     *
     * CONFIDENCE LEVELS:
     * - High (≥0.9): 3+ indicators OR 2+ strong indicators
     * - Medium (0.7-0.8): 2 indicators OR 1 strong indicator
     * - Low (0.5-0.6): 1 indicator
     * - None (0.0): 0 indicators
     *
     * @param count - Total number of indicators
     * @param strong - Number of strong indicators
     * @returns Confidence score (0.0-1.0)
     */
    private calculateConfidence(count: number, strong: number): number {
        // Multiple strong indicators = very high confidence
        if (strong >= 2) {
            return 0.95;
        }

        // Three or more indicators = high confidence
        if (count >= 3) {
            return 0.9;
        }

        // Single strong indicator or 2 indicators = medium confidence
        if (strong >= 1 || count >= 2) {
            return 0.75;
        }

        // Single weak indicator = low confidence
        if (count >= 1) {
            return 0.6;
        }

        // No indicators
        return 0.0;
    }
}
