/**
 * ToolDetector Tests
 *
 * PATTERN: Pattern-TDD-001 (RED-GREEN-REFACTOR)
 * COVERAGE TARGET: ≥90% (infrastructure task)
 * TASK: SELF-007 (Implement ToolDetector service)
 *
 * SERVICE TESTED: ToolDetector
 * PURPOSE: Auto-detect build tools, test frameworks, linters, and extract commands
 *
 * TEST STRATEGY:
 * - Build tool detection: webpack, vite, rollup, cargo, maven
 * - Test framework detection: Jest, Mocha, Vitest, pytest, cargo test
 * - Linter detection: ESLint, Prettier, Clippy, pylint
 * - Command extraction from package.json scripts
 * - Confidence scoring (0.0-1.0)
 * - Performance <150ms
 * - Edge cases (malformed JSON, missing scripts, custom script names)
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { ToolDetector, ToolDetectionResult } from '../../src/services/ToolDetector';

describe('ToolDetector', () => {
    let detector: ToolDetector;
    let tempDir: string;

    beforeEach(() => {
        detector = new ToolDetector();
        // Create temp directory for test fixtures
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tooldetector-test-'));
    });

    afterEach(() => {
        // Clean up temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    // ==========================================================================
    // TEST SUITE 1: Build Tool Detection - Node.js Ecosystem
    // ==========================================================================

    describe('Build Tool Detection: Node.js', () => {
        it('should detect webpack from devDependencies', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    devDependencies: { webpack: '^5.0.0' }
                })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.buildTool, 'webpack');
            assert.ok(result.confidence >= 0.7, `Confidence ${result.confidence} should be >= 0.7`);
        });

        it('should detect webpack with config file (higher confidence)', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ devDependencies: { webpack: '^5.0.0' } })
            );
            fs.writeFileSync(path.join(tempDir, 'webpack.config.js'), 'module.exports = {}');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.buildTool, 'webpack');
            assert.ok(result.confidence >= 0.9, 'Config file should increase confidence');
        });

        it('should detect vite from devDependencies', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ devDependencies: { vite: '^4.0.0' } })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.buildTool, 'vite');
        });

        it('should detect vite with config file', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ devDependencies: { vite: '^4.0.0' } })
            );
            fs.writeFileSync(path.join(tempDir, 'vite.config.ts'), 'export default {}');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.buildTool, 'vite');
            assert.ok(result.confidence >= 0.9);
        });

        it('should detect rollup from devDependencies', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ devDependencies: { rollup: '^3.0.0' } })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.buildTool, 'rollup');
        });

        it('should prioritize vite over webpack if both present', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    devDependencies: { webpack: '^5.0.0', vite: '^4.0.0' }
                })
            );

            const result = await detector.detect(tempDir);

            // Vite is more modern, should be prioritized
            assert.strictEqual(result.buildTool, 'vite');
        });
    });

    // ==========================================================================
    // TEST SUITE 2: Build Tool Detection - Rust & Java
    // ==========================================================================

    describe('Build Tool Detection: Rust & Java', () => {
        it('should detect cargo from Cargo.toml', async () => {
            fs.writeFileSync(path.join(tempDir, 'Cargo.toml'), '[package]\nname = "test"');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.buildTool, 'cargo');
            assert.ok(result.confidence >= 0.95, 'Cargo.toml is strong indicator');
        });

        it('should detect maven from pom.xml', async () => {
            fs.writeFileSync(path.join(tempDir, 'pom.xml'), '<project></project>');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.buildTool, 'maven');
            assert.ok(result.confidence >= 0.95);
        });
    });

    // ==========================================================================
    // TEST SUITE 3: Test Framework Detection - Node.js
    // ==========================================================================

    describe('Test Framework Detection: Node.js', () => {
        it('should detect Jest from devDependencies', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ devDependencies: { jest: '^29.0.0' } })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.testFramework, 'jest');
        });

        it('should detect Mocha from devDependencies', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ devDependencies: { mocha: '^10.0.0' } })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.testFramework, 'mocha');
        });

        it('should detect Vitest from devDependencies', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ devDependencies: { vitest: '^0.30.0' } })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.testFramework, 'vitest');
        });

        it('should prioritize Jest over Mocha if both present', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    devDependencies: { jest: '^29.0.0', mocha: '^10.0.0' }
                })
            );

            const result = await detector.detect(tempDir);

            // Jest is more popular, should be prioritized
            assert.strictEqual(result.testFramework, 'jest');
        });
    });

    // ==========================================================================
    // TEST SUITE 4: Test Framework Detection - Python & Rust
    // ==========================================================================

    describe('Test Framework Detection: Python & Rust', () => {
        it('should detect pytest from requirements.txt', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'requirements.txt'),
                'pytest==7.0.0\npytest-cov==3.0.0'
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.testFramework, 'pytest');
        });

        it('should detect cargo test from Cargo.toml with dev-dependencies', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'Cargo.toml'),
                '[package]\nname = "test"\n\n[dev-dependencies]\ncriterion = "0.4"'
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.testFramework, 'cargo-test');
        });
    });

    // ==========================================================================
    // TEST SUITE 5: Linter Detection - Node.js
    // ==========================================================================

    describe('Linter Detection: Node.js', () => {
        it('should detect ESLint from devDependencies', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ devDependencies: { eslint: '^8.0.0' } })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.linter, 'eslint');
        });

        it('should detect ESLint with config file (higher confidence)', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ devDependencies: { eslint: '^8.0.0' } })
            );
            fs.writeFileSync(path.join(tempDir, '.eslintrc.js'), 'module.exports = {}');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.linter, 'eslint');
            assert.ok(result.confidence >= 0.9, 'Config file should increase confidence');
        });

        it('should detect Prettier from devDependencies', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ devDependencies: { prettier: '^2.0.0' } })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.linter, 'prettier');
        });

        it('should detect Prettier with config file', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ devDependencies: { prettier: '^2.0.0' } })
            );
            fs.writeFileSync(path.join(tempDir, '.prettierrc'), '{}');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.linter, 'prettier');
            assert.ok(result.confidence >= 0.9);
        });

        it('should prioritize ESLint over Prettier if both present', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    devDependencies: { eslint: '^8.0.0', prettier: '^2.0.0' }
                })
            );

            const result = await detector.detect(tempDir);

            // ESLint is primary linter, Prettier is formatter
            assert.strictEqual(result.linter, 'eslint');
        });
    });

    // ==========================================================================
    // TEST SUITE 6: Linter Detection - Rust & Python
    // ==========================================================================

    describe('Linter Detection: Rust & Python', () => {
        it('should detect Clippy from rust-toolchain file', async () => {
            fs.writeFileSync(path.join(tempDir, 'rust-toolchain'), 'stable');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.linter, 'clippy');
        });

        it('should detect pylint from requirements.txt', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'requirements.txt'),
                'pylint==2.15.0\npytest==7.0.0'
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.linter, 'pylint');
        });
    });

    // ==========================================================================
    // TEST SUITE 7: Command Extraction from package.json scripts
    // ==========================================================================

    describe('Command Extraction', () => {
        it('should extract build command from scripts.build', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    scripts: { build: 'tsc' }
                })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.buildCommand, 'npm run build');
        });

        it('should extract test command from scripts.test', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    scripts: { test: 'jest' }
                })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.testCommand, 'npm test');
        });

        it('should extract lint command from scripts.lint', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    scripts: { lint: 'eslint .' }
                })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.lintCommand, 'npm run lint');
        });

        it('should extract custom build script (build:prod)', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    scripts: { 'build:prod': 'tsc && webpack --mode production' }
                })
            );

            const result = await detector.detect(tempDir);

            // Should detect custom script
            assert.ok(
                result.buildCommand === 'npm run build:prod' || result.buildCommand === 'npm run build',
                'Should detect custom build script'
            );
        });

        it('should extract all commands from comprehensive scripts', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    scripts: {
                        build: 'tsc',
                        test: 'jest --coverage',
                        lint: 'eslint . --fix'
                    },
                    devDependencies: {
                        typescript: '^5.0.0',
                        jest: '^29.0.0',
                        eslint: '^8.0.0'
                    }
                })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.buildCommand, 'npm run build');
            assert.strictEqual(result.testCommand, 'npm test');
            assert.strictEqual(result.lintCommand, 'npm run lint');
            assert.strictEqual(result.testFramework, 'jest');
            assert.strictEqual(result.linter, 'eslint');
        });
    });

    // ==========================================================================
    // TEST SUITE 8: Command Extraction - Rust & Python
    // ==========================================================================

    describe('Command Extraction: Rust & Python', () => {
        it('should default to cargo commands for Rust projects', async () => {
            fs.writeFileSync(path.join(tempDir, 'Cargo.toml'), '[package]\nname = "test"');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.buildCommand, 'cargo build');
            assert.strictEqual(result.testCommand, 'cargo test');
        });

        it('should default to Python commands for Python projects', async () => {
            fs.writeFileSync(path.join(tempDir, 'setup.py'), 'from setuptools import setup');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.testCommand, 'pytest' || 'python -m pytest');
        });
    });

    // ==========================================================================
    // TEST SUITE 9: Confidence Scoring
    // ==========================================================================

    describe('Confidence Scoring', () => {
        it('should return high confidence (≥0.9) with config files', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    devDependencies: { webpack: '^5.0.0', jest: '^29.0.0', eslint: '^8.0.0' }
                })
            );
            fs.writeFileSync(path.join(tempDir, 'webpack.config.js'), '');
            fs.writeFileSync(path.join(tempDir, '.eslintrc.js'), '');

            const result = await detector.detect(tempDir);

            assert.ok(
                result.confidence >= 0.9,
                `Confidence ${result.confidence} should be ≥ 0.9 with config files`
            );
        });

        it('should return medium confidence (0.6-0.8) with only dependencies', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    devDependencies: { jest: '^29.0.0' }
                })
            );

            const result = await detector.detect(tempDir);

            assert.ok(
                result.confidence >= 0.6 && result.confidence < 0.9,
                `Confidence ${result.confidence} should be 0.6-0.8 without config files`
            );
        });

        it('should return low confidence (<0.6) for minimal detection', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ scripts: { test: 'echo test' } })
            );

            const result = await detector.detect(tempDir);

            assert.ok(result.confidence < 0.6 || result.confidence === 0.0, 'Minimal detection should have low confidence');
        });
    });

    // ==========================================================================
    // TEST SUITE 10: Performance
    // ==========================================================================

    describe('Performance', () => {
        it('should complete detection in < 150ms', async function() {
            // Create realistic project structure
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    scripts: { build: 'tsc', test: 'jest', lint: 'eslint .' },
                    devDependencies: {
                        webpack: '^5.0.0',
                        jest: '^29.0.0',
                        eslint: '^8.0.0'
                    }
                })
            );
            fs.writeFileSync(path.join(tempDir, 'webpack.config.js'), '');
            fs.writeFileSync(path.join(tempDir, '.eslintrc.js'), '');

            const startTime = Date.now();
            await detector.detect(tempDir);
            const duration = Date.now() - startTime;

            assert.ok(duration < 150, `Detection took ${duration}ms, should be < 150ms`);
        });

        it('should handle projects with many dependencies efficiently', async function() {
            this.timeout(5000);

            // Create package.json with many dependencies
            const largeDeps: Record<string, string> = {};
            for (let i = 0; i < 50; i++) {
                largeDeps[`package-${i}`] = '^1.0.0';
            }

            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ devDependencies: largeDeps })
            );

            const startTime = Date.now();
            await detector.detect(tempDir);
            const duration = Date.now() - startTime;

            assert.ok(duration < 200, `Large project detection took ${duration}ms, should be < 200ms`);
        });
    });

    // ==========================================================================
    // TEST SUITE 11: Edge Cases
    // ==========================================================================

    describe('Edge Cases', () => {
        it('should handle non-existent directory gracefully', async () => {
            const result = await detector.detect('/nonexistent/path');

            assert.ok(result);
            assert.strictEqual(result.confidence, 0.0);
        });

        it('should handle malformed package.json gracefully', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), '{ invalid json }');

            const result = await detector.detect(tempDir);

            assert.ok(result);
            // Should still return result, possibly with low confidence
        });

        it('should handle package.json without scripts section', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    devDependencies: { jest: '^29.0.0' }
                })
            );

            const result = await detector.detect(tempDir);

            assert.ok(result);
            assert.strictEqual(result.testFramework, 'jest');
            // Commands should use defaults
        });

        it('should handle package.json without devDependencies', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    scripts: { test: 'jest' }
                })
            );

            const result = await detector.detect(tempDir);

            assert.ok(result);
            // Should still extract commands
            assert.strictEqual(result.testCommand, 'npm test');
        });

        it('should handle empty project directory', async () => {
            const result = await detector.detect(tempDir);

            assert.ok(result);
            assert.strictEqual(result.confidence, 0.0);
        });
    });

    // ==========================================================================
    // TEST SUITE 12: Result Structure
    // ==========================================================================

    describe('Result Structure', () => {
        it('should return complete ToolDetectionResult with all fields', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    scripts: { build: 'tsc', test: 'jest', lint: 'eslint .' },
                    devDependencies: {
                        webpack: '^5.0.0',
                        jest: '^29.0.0',
                        eslint: '^8.0.0'
                    }
                })
            );

            const result = await detector.detect(tempDir);

            // Required fields
            assert.ok(result.hasOwnProperty('confidence'), 'Result must have confidence field');

            // Optional fields (present if detected)
            assert.ok(result.hasOwnProperty('buildTool'), 'Result should have buildTool field');
            assert.ok(result.hasOwnProperty('testFramework'), 'Result should have testFramework field');
            assert.ok(result.hasOwnProperty('linter'), 'Result should have linter field');
            assert.ok(result.hasOwnProperty('buildCommand'), 'Result should have buildCommand field');
            assert.ok(result.hasOwnProperty('testCommand'), 'Result should have testCommand field');
            assert.ok(result.hasOwnProperty('lintCommand'), 'Result should have lintCommand field');

            // Value types
            assert.strictEqual(typeof result.confidence, 'number');
            assert.ok(result.confidence >= 0.0 && result.confidence <= 1.0, 'Confidence must be 0.0-1.0');
        });
    });
});
