/**
 * DomainDetector Tests
 *
 * PATTERN: Pattern-TDD-001 (RED-GREEN-REFACTOR)
 * COVERAGE TARGET: ≥85% (API task)
 * TASK: SELF-009 (Implement DomainDetector service)
 *
 * SERVICE TESTED: DomainDetector
 * PURPOSE: Auto-detect project domain and sub-type from keywords and structure
 *
 * TEST STRATEGY:
 * - CLI domain detection: bin field, keywords, no web dependencies
 * - Web domain detection: react/vue/express, public/ directory
 * - Desktop domain detection: tauri/electron, src-tauri/
 * - Library domain detection: minimal dependencies, only devDeps
 * - Keyword analysis: package.json keywords, README.md
 * - Structure analysis: directories (public/, src-tauri/, bin/)
 * - Confidence scoring (0.0-1.0)
 * - Performance <100ms
 * - Edge cases (hybrid projects, missing files, malformed JSON)
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { DomainDetector, DomainDetectionResult } from '../../src/services/DomainDetector';

describe('DomainDetector', () => {
    let detector: DomainDetector;
    let tempDir: string;

    beforeEach(() => {
        detector = new DomainDetector();
        // Create temp directory for test fixtures
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'domain-test-'));
    });

    afterEach(() => {
        // Clean up temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    // ==========================================================================
    // TEST SUITE 1: CLI Domain Detection
    // ==========================================================================

    describe('CLI Domain Detection', () => {
        it('should detect CLI from bin field in package.json', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    name: 'my-cli',
                    bin: { mycli: './bin/cli.js' }
                })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.domain, 'software-dev');
            assert.strictEqual(result.subType, 'cli');
            assert.ok(result.confidence >= 0.8, `Confidence ${result.confidence} should be >= 0.8`);
        });

        it('should detect CLI from bin string (single executable)', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    name: 'my-cli',
                    bin: './cli.js'
                })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.domain, 'software-dev');
            assert.strictEqual(result.subType, 'cli');
        });

        it('should detect CLI from keywords', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    name: 'my-tool',
                    keywords: ['cli', 'command-line', 'tool']
                })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.domain, 'software-dev');
            assert.strictEqual(result.subType, 'cli');
        });

        it('should detect CLI from bin directory', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'test' }));
            fs.mkdirSync(path.join(tempDir, 'bin'));
            fs.writeFileSync(path.join(tempDir, 'bin', 'cli.js'), '#!/usr/bin/env node');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.subType, 'cli');
        });

        it('should have high confidence with multiple CLI indicators', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    bin: './cli.js',
                    keywords: ['cli', 'command-line']
                })
            );
            fs.mkdirSync(path.join(tempDir, 'bin'));

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.subType, 'cli');
            assert.ok(result.confidence >= 0.9, 'Multiple indicators = high confidence');
        });
    });

    // ==========================================================================
    // TEST SUITE 2: Web Domain Detection
    // ==========================================================================

    describe('Web Domain Detection', () => {
        it('should detect web from React dependency', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    dependencies: { react: '^18.0.0' }
                })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.domain, 'software-dev');
            assert.strictEqual(result.subType, 'web');
        });

        it('should detect web from Vue dependency', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    dependencies: { vue: '^3.0.0' }
                })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.subType, 'web');
        });

        it('should detect web from Express dependency', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    dependencies: { express: '^4.0.0' }
                })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.subType, 'web');
        });

        it('should detect web from Next.js dependency', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    dependencies: { next: '^13.0.0' }
                })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.subType, 'web');
        });

        it('should detect web from Angular dependency', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    dependencies: { '@angular/core': '^15.0.0' }
                })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.subType, 'web');
        });

        it('should detect web from public directory', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'test' }));
            fs.mkdirSync(path.join(tempDir, 'public'));
            fs.writeFileSync(path.join(tempDir, 'public', 'index.html'), '');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.subType, 'web');
        });

        it('should detect web from static directory', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'test' }));
            fs.mkdirSync(path.join(tempDir, 'static'));

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.subType, 'web');
        });

        it('should detect web from keywords', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    keywords: ['web', 'webapp', 'frontend']
                })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.subType, 'web');
        });
    });

    // ==========================================================================
    // TEST SUITE 3: Desktop Domain Detection
    // ==========================================================================

    describe('Desktop Domain Detection', () => {
        it('should detect desktop from Tauri dependency', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    dependencies: { '@tauri-apps/api': '^1.0.0' }
                })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.domain, 'software-dev');
            assert.strictEqual(result.subType, 'desktop');
        });

        it('should detect desktop from Electron dependency', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    dependencies: { electron: '^24.0.0' }
                })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.subType, 'desktop');
        });

        it('should detect desktop from NW.js dependency', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    dependencies: { nw: '^0.70.0' }
                })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.subType, 'desktop');
        });

        it('should detect desktop from src-tauri directory', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'test' }));
            fs.mkdirSync(path.join(tempDir, 'src-tauri'));
            fs.writeFileSync(path.join(tempDir, 'src-tauri', 'Cargo.toml'), '');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.subType, 'desktop');
        });

        it('should detect desktop from keywords', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    keywords: ['desktop', 'app', 'gui']
                })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.subType, 'desktop');
        });
    });

    // ==========================================================================
    // TEST SUITE 4: Library Domain Detection
    // ==========================================================================

    describe('Library Domain Detection', () => {
        it('should detect library from no dependencies + devDependencies only', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    devDependencies: { typescript: '^5.0.0' }
                })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.domain, 'software-dev');
            assert.strictEqual(result.subType, 'library');
        });

        it('should detect library from minimal dependencies', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    dependencies: { lodash: '^4.0.0' },
                    devDependencies: { typescript: '^5.0.0', jest: '^29.0.0' }
                })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.subType, 'library');
        });

        it('should detect library from keywords', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    keywords: ['library', 'module', 'package', 'sdk']
                })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.subType, 'library');
        });

        it('should not detect library if web framework present', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    keywords: ['library'],
                    dependencies: { react: '^18.0.0' }
                })
            );

            const result = await detector.detect(tempDir);

            // Web takes priority over library
            assert.strictEqual(result.subType, 'web');
        });
    });

    // ==========================================================================
    // TEST SUITE 5: Keyword Analysis from README.md
    // ==========================================================================

    describe('Keyword Analysis: README.md', () => {
        it('should detect CLI from README keywords', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'test' }));
            fs.writeFileSync(
                path.join(tempDir, 'README.md'),
                '# My CLI Tool\n\nA command-line interface for testing.'
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.subType, 'cli');
        });

        it('should detect web from README keywords', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'test' }));
            fs.writeFileSync(
                path.join(tempDir, 'README.md'),
                '# My Web App\n\nA modern web application built with React.'
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.subType, 'web');
        });

        it('should detect desktop from README keywords', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'test' }));
            fs.writeFileSync(
                path.join(tempDir, 'README.md'),
                '# Desktop App\n\nA cross-platform desktop application.'
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.subType, 'desktop');
        });

        it('should handle malformed README gracefully', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'test' }));
            // Create binary file as README
            fs.writeFileSync(path.join(tempDir, 'README.md'), Buffer.from([0xff, 0xfe]));

            const result = await detector.detect(tempDir);

            assert.ok(result);
            // Should still return a result
        });
    });

    // ==========================================================================
    // TEST SUITE 6: Priority and Conflict Resolution
    // ==========================================================================

    describe('Priority and Conflict Resolution', () => {
        it('should prioritize CLI over library', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    bin: './cli.js',
                    devDependencies: { typescript: '^5.0.0' }
                })
            );

            const result = await detector.detect(tempDir);

            // CLI takes priority
            assert.strictEqual(result.subType, 'cli');
        });

        it('should prioritize desktop over web', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    dependencies: {
                        '@tauri-apps/api': '^1.0.0',
                        react: '^18.0.0'
                    }
                })
            );

            const result = await detector.detect(tempDir);

            // Desktop takes priority (Tauri uses React for UI)
            assert.strictEqual(result.subType, 'desktop');
        });

        it('should prioritize web over library', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    dependencies: { vue: '^3.0.0' },
                    keywords: ['library']
                })
            );

            const result = await detector.detect(tempDir);

            // Web takes priority
            assert.strictEqual(result.subType, 'web');
        });
    });

    // ==========================================================================
    // TEST SUITE 7: Confidence Scoring
    // ==========================================================================

    describe('Confidence Scoring', () => {
        it('should return high confidence (≥0.9) with multiple strong indicators', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    bin: './cli.js',
                    keywords: ['cli', 'command-line']
                })
            );
            fs.mkdirSync(path.join(tempDir, 'bin'));

            const result = await detector.detect(tempDir);

            assert.ok(
                result.confidence >= 0.9,
                `Confidence ${result.confidence} should be ≥ 0.9 with multiple indicators`
            );
        });

        it('should return medium confidence (0.7-0.8) with single strong indicator', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    dependencies: { react: '^18.0.0' }
                })
            );

            const result = await detector.detect(tempDir);

            assert.ok(
                result.confidence >= 0.7 && result.confidence < 0.9,
                `Confidence ${result.confidence} should be 0.7-0.8 with single indicator`
            );
        });

        it('should return low confidence (<0.7) with weak indicators', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'test' }));
            fs.mkdirSync(path.join(tempDir, 'public'));

            const result = await detector.detect(tempDir);

            assert.ok(
                result.confidence < 0.7,
                `Confidence ${result.confidence} should be < 0.7 with weak indicators`
            );
        });

        it('should return 0.0 confidence for empty project', async () => {
            const result = await detector.detect(tempDir);

            assert.strictEqual(result.confidence, 0.0);
        });
    });

    // ==========================================================================
    // TEST SUITE 8: Performance
    // ==========================================================================

    describe('Performance', () => {
        it('should complete detection in < 100ms', async function() {
            // Create realistic project structure
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    dependencies: { react: '^18.0.0' },
                    keywords: ['web', 'react']
                })
            );
            fs.mkdirSync(path.join(tempDir, 'public'));
            fs.writeFileSync(
                path.join(tempDir, 'README.md'),
                '# My Web App\n\nA modern web application.'
            );

            const startTime = Date.now();
            await detector.detect(tempDir);
            const duration = Date.now() - startTime;

            assert.ok(duration < 100, `Detection took ${duration}ms, should be < 100ms`);
        });

        it('should handle large README files efficiently', async function() {
            this.timeout(5000);

            // Create large README
            let largeContent = '# Project\n\n';
            for (let i = 0; i < 1000; i++) {
                largeContent += 'This is a web application. ';
            }

            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'test' }));
            fs.writeFileSync(path.join(tempDir, 'README.md'), largeContent);

            const startTime = Date.now();
            await detector.detect(tempDir);
            const duration = Date.now() - startTime;

            assert.ok(duration < 150, `Large README detection took ${duration}ms, should be < 150ms`);
        });
    });

    // ==========================================================================
    // TEST SUITE 9: Edge Cases
    // ==========================================================================

    describe('Edge Cases', () => {
        it('should handle non-existent directory gracefully', async () => {
            const result = await detector.detect('/nonexistent/path');

            assert.ok(result);
            assert.strictEqual(result.domain, 'unknown');
            assert.strictEqual(result.confidence, 0.0);
        });

        it('should handle missing package.json gracefully', async () => {
            const result = await detector.detect(tempDir);

            assert.ok(result);
            assert.strictEqual(result.domain, 'unknown');
        });

        it('should handle malformed package.json gracefully', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), '{ invalid json }');

            const result = await detector.detect(tempDir);

            assert.ok(result);
            // Should still attempt detection from other sources
        });

        it('should handle empty package.json', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');

            const result = await detector.detect(tempDir);

            assert.ok(result);
            // Library is default for empty dependencies
            assert.strictEqual(result.subType, 'library');
        });

        it('should handle project with no clear domain', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    dependencies: { lodash: '^4.0.0' }
                })
            );

            const result = await detector.detect(tempDir);

            assert.ok(result);
            // Should default to library
            assert.strictEqual(result.subType, 'library');
        });
    });

    // ==========================================================================
    // TEST SUITE 10: Result Structure
    // ==========================================================================

    describe('Result Structure', () => {
        it('should return complete DomainDetectionResult with all fields', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    dependencies: { react: '^18.0.0' },
                    keywords: ['web']
                })
            );

            const result = await detector.detect(tempDir);

            // Required fields
            assert.ok(result.hasOwnProperty('domain'), 'Result must have domain field');
            assert.ok(result.hasOwnProperty('confidence'), 'Result must have confidence field');

            // Optional fields
            assert.ok(result.hasOwnProperty('subType'), 'Result should have subType field');

            // Value types
            assert.strictEqual(typeof result.domain, 'string');
            assert.strictEqual(typeof result.confidence, 'number');
            assert.ok(result.confidence >= 0.0 && result.confidence <= 1.0, 'Confidence must be 0.0-1.0');
        });

        it('should always set domain to "software-dev" for Phase 1', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ bin: './cli.js' })
            );

            const result = await detector.detect(tempDir);

            // Phase 1 only supports software-dev
            assert.strictEqual(result.domain, 'software-dev');
        });
    });
});
