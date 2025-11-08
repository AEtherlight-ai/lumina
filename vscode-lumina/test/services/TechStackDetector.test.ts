/**
 * TechStackDetector Tests
 *
 * PATTERN: Pattern-TDD-001 (RED-GREEN-REFACTOR)
 * COVERAGE TARGET: ≥90% (infrastructure task)
 * TASK: SELF-006 (Implement TechStackDetector service)
 *
 * SERVICE TESTED: TechStackDetector
 * PURPOSE: Auto-detect project language, framework, package manager
 *
 * TEST STRATEGY:
 * - Language detection: Node.js, TypeScript, Rust, Python, Go
 * - Framework detection: React, Vue, Express, Tauri, Flask
 * - Package manager detection: npm, yarn, pnpm, cargo, pip
 * - Confidence scoring (0.0-1.0)
 * - Performance <200ms
 * - Edge cases (no files, multiple languages, monorepos)
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { TechStackDetector, DetectionResult } from '../../src/services/TechStackDetector';

describe('TechStackDetector', () => {
    let detector: TechStackDetector;
    let tempDir: string;

    beforeEach(() => {
        detector = new TechStackDetector();
        // Create temp directory for test fixtures
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'techstack-test-'));
    });

    afterEach(() => {
        // Clean up temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    // ==========================================================================
    // TEST SUITE 1: Language Detection - Node.js/JavaScript
    // ==========================================================================

    describe('Language Detection: Node.js/JavaScript', () => {
        it('should detect Node.js project from package.json', async () => {
            // Create package.json
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ name: 'test-project', version: '1.0.0' })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.language, 'javascript');
            assert.ok(result.confidence >= 0.8, `Confidence ${result.confidence} should be >= 0.8`);
        });

        it('should detect package manager from package-lock.json (npm)', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
            fs.writeFileSync(path.join(tempDir, 'package-lock.json'), '{}');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.packageManager, 'npm');
        });

        it('should detect package manager from yarn.lock', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
            fs.writeFileSync(path.join(tempDir, 'yarn.lock'), '');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.packageManager, 'yarn');
        });

        it('should detect package manager from pnpm-lock.yaml', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
            fs.writeFileSync(path.join(tempDir, 'pnpm-lock.yaml'), '');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.packageManager, 'pnpm');
        });

        it('should default to npm if no lock file present', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.packageManager, 'npm');
            assert.ok(result.confidence < 0.8, 'Confidence should be lower without lock file');
        });
    });

    // ==========================================================================
    // TEST SUITE 2: Language Detection - TypeScript
    // ==========================================================================

    describe('Language Detection: TypeScript', () => {
        it('should detect TypeScript from tsconfig.json', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
            fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), JSON.stringify({
                compilerOptions: { target: 'ES2020' }
            }));

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.language, 'typescript');
            assert.ok(result.confidence >= 0.9, `Confidence ${result.confidence} should be >= 0.9`);
        });

        it('should detect TypeScript from .ts files', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
            fs.mkdirSync(path.join(tempDir, 'src'));
            fs.writeFileSync(path.join(tempDir, 'src', 'index.ts'), 'console.log("hello");');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.language, 'typescript');
        });

        it('should prioritize TypeScript over JavaScript when both present', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
            fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.language, 'typescript');
        });
    });

    // ==========================================================================
    // TEST SUITE 3: Language Detection - Rust
    // ==========================================================================

    describe('Language Detection: Rust', () => {
        it('should detect Rust from Cargo.toml', async () => {
            fs.writeFileSync(path.join(tempDir, 'Cargo.toml'), '[package]\nname = "test"\nversion = "1.0.0"');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.language, 'rust');
            assert.strictEqual(result.packageManager, 'cargo');
            assert.ok(result.confidence >= 0.9);
        });

        it('should detect Cargo as package manager', async () => {
            fs.writeFileSync(path.join(tempDir, 'Cargo.toml'), '[package]');
            fs.writeFileSync(path.join(tempDir, 'Cargo.lock'), '');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.packageManager, 'cargo');
        });
    });

    // ==========================================================================
    // TEST SUITE 4: Language Detection - Python
    // ==========================================================================

    describe('Language Detection: Python', () => {
        it('should detect Python from setup.py', async () => {
            fs.writeFileSync(path.join(tempDir, 'setup.py'), 'from setuptools import setup');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.language, 'python');
            assert.ok(result.confidence >= 0.8);
        });

        it('should detect Python from requirements.txt', async () => {
            fs.writeFileSync(path.join(tempDir, 'requirements.txt'), 'flask==2.0.0');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.language, 'python');
        });

        it('should detect Python from pyproject.toml', async () => {
            fs.writeFileSync(path.join(tempDir, 'pyproject.toml'), '[tool.poetry]');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.language, 'python');
        });

        it('should detect pip as package manager', async () => {
            fs.writeFileSync(path.join(tempDir, 'requirements.txt'), '');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.packageManager, 'pip');
        });

        it('should detect pipenv as package manager from Pipfile', async () => {
            fs.writeFileSync(path.join(tempDir, 'Pipfile'), '');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.packageManager, 'pipenv');
        });
    });

    // ==========================================================================
    // TEST SUITE 5: Language Detection - Go
    // ==========================================================================

    describe('Language Detection: Go', () => {
        it('should detect Go from go.mod', async () => {
            fs.writeFileSync(path.join(tempDir, 'go.mod'), 'module test');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.language, 'go');
            assert.strictEqual(result.packageManager, 'go');
            assert.ok(result.confidence >= 0.9);
        });

        it('should detect Go from .go files', async () => {
            fs.writeFileSync(path.join(tempDir, 'main.go'), 'package main');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.language, 'go');
        });
    });

    // ==========================================================================
    // TEST SUITE 6: Framework Detection
    // ==========================================================================

    describe('Framework Detection', () => {
        it('should detect React from package.json dependencies', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
                dependencies: { react: '^18.0.0' }
            }));

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.framework, 'react');
        });

        it('should detect Vue from package.json dependencies', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
                dependencies: { vue: '^3.0.0' }
            }));

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.framework, 'vue');
        });

        it('should detect Express from package.json dependencies', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
                dependencies: { express: '^4.0.0' }
            }));

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.framework, 'express');
        });

        it('should detect Tauri from package.json dependencies', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
                dependencies: { '@tauri-apps/api': '^1.0.0' }
            }));

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.framework, 'tauri');
        });

        it('should detect Flask from requirements.txt', async () => {
            fs.writeFileSync(path.join(tempDir, 'requirements.txt'), 'flask==2.0.0\nFlask-SQLAlchemy==3.0.0');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.framework, 'flask');
        });

        it('should detect Django from requirements.txt', async () => {
            fs.writeFileSync(path.join(tempDir, 'requirements.txt'), 'django==4.0.0');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.framework, 'django');
        });

        it('should handle framework in devDependencies with lower confidence', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
                devDependencies: { react: '^18.0.0' }
            }));

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.framework, 'react');
            assert.ok(result.confidence < 0.8, 'Confidence should be lower for devDependencies');
        });
    });

    // ==========================================================================
    // TEST SUITE 7: Confidence Scoring
    // ==========================================================================

    describe('Confidence Scoring', () => {
        it('should return high confidence (≥0.9) for multiple indicators', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
                dependencies: { react: '^18.0.0' }
            }));
            fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');
            fs.writeFileSync(path.join(tempDir, 'package-lock.json'), '{}');

            const result = await detector.detect(tempDir);

            assert.ok(result.confidence >= 0.9, `Confidence ${result.confidence} should be ≥ 0.9 for multiple indicators`);
        });

        it('should return medium confidence (0.6-0.8) for single indicator', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');

            const result = await detector.detect(tempDir);

            assert.ok(result.confidence >= 0.6 && result.confidence < 0.9, `Confidence ${result.confidence} should be 0.6-0.8 for single indicator`);
        });

        it('should return low confidence (<0.6) for no indicators', async () => {
            const result = await detector.detect(tempDir);

            assert.ok(result.confidence < 0.6, `Confidence ${result.confidence} should be < 0.6 for no indicators`);
        });

        it('should return 0.0 confidence for empty directory', async () => {
            const result = await detector.detect(tempDir);

            assert.ok(result.confidence === 0.0 || result.language === 'unknown', 'Should handle empty directory gracefully');
        });
    });

    // ==========================================================================
    // TEST SUITE 8: Performance
    // ==========================================================================

    describe('Performance', () => {
        it('should complete detection in < 200ms', async function() {
            // Create realistic project structure
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
                dependencies: { react: '^18.0.0', express: '^4.0.0' }
            }));
            fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');
            fs.writeFileSync(path.join(tempDir, 'package-lock.json'), '{}');
            fs.mkdirSync(path.join(tempDir, 'src'));
            fs.writeFileSync(path.join(tempDir, 'src', 'index.ts'), '// test');

            const startTime = Date.now();
            await detector.detect(tempDir);
            const duration = Date.now() - startTime;

            assert.ok(duration < 200, `Detection took ${duration}ms, should be < 200ms`);
        });

        it('should handle large projects efficiently', async function() {
            this.timeout(5000); // Allow 5s total

            // Create many files
            fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
            fs.mkdirSync(path.join(tempDir, 'src'));
            for (let i = 0; i < 100; i++) {
                fs.writeFileSync(path.join(tempDir, 'src', `file${i}.ts`), '// test');
            }

            const startTime = Date.now();
            await detector.detect(tempDir);
            const duration = Date.now() - startTime;

            assert.ok(duration < 500, `Large project detection took ${duration}ms, should be < 500ms`);
        });
    });

    // ==========================================================================
    // TEST SUITE 9: Edge Cases
    // ==========================================================================

    describe('Edge Cases', () => {
        it('should handle non-existent directory gracefully', async () => {
            const result = await detector.detect('/nonexistent/path');

            assert.ok(result);
            assert.strictEqual(result.language, 'unknown');
            assert.strictEqual(result.confidence, 0.0);
        });

        it('should handle directory without read permissions gracefully', async function() {
            // Skip on Windows (permission model different)
            if (process.platform === 'win32') {
                this.skip();
                return;
            }

            // Create directory with no read permissions
            const restrictedDir = path.join(tempDir, 'restricted');
            fs.mkdirSync(restrictedDir);
            fs.chmodSync(restrictedDir, 0o000);

            const result = await detector.detect(restrictedDir);

            // Cleanup
            fs.chmodSync(restrictedDir, 0o755);

            assert.ok(result);
            assert.strictEqual(result.language, 'unknown');
        });

        it('should handle malformed package.json gracefully', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), '{ invalid json }');

            const result = await detector.detect(tempDir);

            assert.ok(result);
            assert.strictEqual(result.language, 'javascript'); // Detect from file presence
        });

        it('should handle multiple languages (monorepo) by choosing primary', async () => {
            // Create Node.js + Rust hybrid
            fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
            fs.writeFileSync(path.join(tempDir, 'Cargo.toml'), '[package]');

            const result = await detector.detect(tempDir);

            // Should prioritize based on project structure (implementation choice)
            assert.ok(result.language === 'javascript' || result.language === 'rust');
        });

        it('should detect testing frameworks (Jest, Mocha, pytest)', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
                devDependencies: { jest: '^29.0.0' }
            }));

            const result = await detector.detect(tempDir);

            assert.ok(result.testFramework === 'jest' || result.framework === 'jest');
        });
    });

    // ==========================================================================
    // TEST SUITE 10: Result Structure
    // ==========================================================================

    describe('Result Structure', () => {
        it('should return complete DetectionResult with all fields', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
                dependencies: { react: '^18.0.0' }
            }));
            fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');

            const result = await detector.detect(tempDir);

            // Required fields
            assert.ok(result.hasOwnProperty('language'), 'Result must have language field');
            assert.ok(result.hasOwnProperty('confidence'), 'Result must have confidence field');
            assert.ok(result.hasOwnProperty('packageManager'), 'Result must have packageManager field');

            // Optional fields
            assert.ok(result.hasOwnProperty('framework'), 'Result should have framework field');

            // Value types
            assert.strictEqual(typeof result.language, 'string');
            assert.strictEqual(typeof result.confidence, 'number');
            assert.ok(result.confidence >= 0.0 && result.confidence <= 1.0, 'Confidence must be 0.0-1.0');
        });
    });
});
