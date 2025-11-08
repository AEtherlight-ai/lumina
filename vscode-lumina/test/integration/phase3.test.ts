/**
 * Phase 3 Detection Integration Tests
 *
 * PATTERN: Pattern-TDD-001 (Integration Testing)
 * COVERAGE TARGET: ≥90% (infrastructure task)
 * TASK: SELF-010 (Phase 3 integration tests)
 *
 * SERVICES TESTED: Full Phase 3 Detection Pipeline
 * - TechStackDetector (SELF-006)
 * - ToolDetector (SELF-007)
 * - WorkflowDetector (SELF-008)
 * - DomainDetector (SELF-009)
 *
 * TEST STRATEGY:
 * - Real project examples: Node.js + TypeScript, Rust, Python
 * - Full pipeline validation (all 4 detectors working together)
 * - Error case handling (missing files, invalid structure)
 * - Performance validation (<500ms for full pipeline)
 * - Result consistency and merging
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { TechStackDetector } from '../../src/services/TechStackDetector';
import { ToolDetector } from '../../src/services/ToolDetector';
import { WorkflowDetector } from '../../src/services/WorkflowDetector';
import { DomainDetector } from '../../src/services/DomainDetector';

describe('Phase 3 Detection Integration Tests', () => {
    let techStackDetector: TechStackDetector;
    let toolDetector: ToolDetector;
    let workflowDetector: WorkflowDetector;
    let domainDetector: DomainDetector;
    let tempDir: string;

    beforeEach(() => {
        techStackDetector = new TechStackDetector();
        toolDetector = new ToolDetector();
        workflowDetector = new WorkflowDetector();
        domainDetector = new DomainDetector();
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase3-integration-'));
    });

    afterEach(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    // ==========================================================================
    // TEST SUITE 1: Node.js + TypeScript Web Project (Full Pipeline)
    // ==========================================================================

    describe('Node.js + TypeScript Web Project (Full Pipeline)', () => {
        it('should detect complete Node.js + TypeScript + React + Jest + GitHub Actions stack', async () => {
            // Create realistic Node.js + TypeScript project structure
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    name: 'my-web-app',
                    version: '1.0.0',
                    scripts: {
                        build: 'webpack',
                        test: 'jest --coverage',
                        lint: 'eslint .'
                    },
                    dependencies: {
                        react: '^18.0.0',
                        'react-dom': '^18.0.0'
                    },
                    devDependencies: {
                        typescript: '^5.0.0',
                        webpack: '^5.0.0',
                        jest: '^29.0.0',
                        eslint: '^8.0.0',
                        husky: '^8.0.0'
                    },
                    keywords: ['web', 'react']
                })
            );
            fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), JSON.stringify({
                compilerOptions: { target: 'ES2020' }
            }));
            fs.writeFileSync(path.join(tempDir, 'webpack.config.js'), 'module.exports = {}');
            fs.writeFileSync(path.join(tempDir, '.eslintrc.js'), 'module.exports = {}');
            fs.mkdirSync(path.join(tempDir, 'test'));
            fs.mkdirSync(path.join(tempDir, 'public'));
            fs.mkdirSync(path.join(tempDir, '.github'));
            fs.mkdirSync(path.join(tempDir, '.github', 'workflows'));
            fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: CI');
            fs.mkdirSync(path.join(tempDir, '.husky'));

            // Run full detection pipeline
            const techStack = await techStackDetector.detect(tempDir);
            const tools = await toolDetector.detect(tempDir);
            const workflow = await workflowDetector.detect(tempDir);
            const domain = await domainDetector.detect(tempDir);

            // Verify TechStackDetector results
            assert.strictEqual(techStack.language, 'typescript');
            assert.strictEqual(techStack.framework, 'react');
            assert.strictEqual(techStack.packageManager, 'npm');
            assert.ok(techStack.confidence >= 0.8, 'TechStack confidence should be high');

            // Verify ToolDetector results
            assert.strictEqual(tools.buildTool, 'webpack');
            assert.strictEqual(tools.testFramework, 'jest');
            assert.strictEqual(tools.linter, 'eslint');
            assert.strictEqual(tools.buildCommand, 'npm run build');
            assert.strictEqual(tools.testCommand, 'npm test');
            assert.strictEqual(tools.lintCommand, 'npm run lint');
            assert.ok(tools.confidence >= 0.8, 'Tools confidence should be high');

            // Verify WorkflowDetector results
            assert.strictEqual(workflow.tdd, true);
            assert.ok(workflow.hasCoverage, 'Should detect coverage tool');
            assert.strictEqual(workflow.cicd, 'github-actions');
            assert.ok(workflow.workflows);
            assert.ok(workflow.workflows.includes('ci.yml'));
            assert.strictEqual(workflow.preCommitHooks, true);
            assert.strictEqual(workflow.hookTool, 'husky');
            assert.ok(workflow.confidence >= 0.8, 'Workflow confidence should be high');

            // Verify DomainDetector results
            assert.strictEqual(domain.domain, 'software-dev');
            assert.strictEqual(domain.subType, 'web');
            assert.ok(domain.confidence >= 0.7, 'Domain confidence should be decent');

            console.log('✅ Full Node.js + TypeScript pipeline detected correctly');
        });
    });

    // ==========================================================================
    // TEST SUITE 2: Rust CLI Project (Full Pipeline)
    // ==========================================================================

    describe('Rust CLI Project (Full Pipeline)', () => {
        it('should detect complete Rust + Cargo + cargo-test + GitHub Actions stack', async () => {
            // Create realistic Rust CLI project structure
            fs.writeFileSync(
                path.join(tempDir, 'Cargo.toml'),
                '[package]\nname = "my-cli"\nversion = "1.0.0"\n\n[dependencies]\nclap = "4.0"\n\n[dev-dependencies]\ncriterion = "0.4"'
            );
            fs.writeFileSync(path.join(tempDir, 'rust-toolchain'), 'stable');
            fs.mkdirSync(path.join(tempDir, 'src'));
            fs.writeFileSync(path.join(tempDir, 'src', 'main.rs'), 'fn main() {}');
            fs.mkdirSync(path.join(tempDir, 'tests'));
            fs.writeFileSync(path.join(tempDir, 'tests', 'integration.rs'), '#[test] fn test() {}');
            fs.mkdirSync(path.join(tempDir, 'bin'));
            fs.mkdirSync(path.join(tempDir, '.github'));
            fs.mkdirSync(path.join(tempDir, '.github', 'workflows'));
            fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: CI');
            fs.writeFileSync(
                path.join(tempDir, 'README.md'),
                '# My CLI Tool\n\nA command-line tool written in Rust.'
            );

            // Run full detection pipeline
            const techStack = await techStackDetector.detect(tempDir);
            const tools = await toolDetector.detect(tempDir);
            const workflow = await workflowDetector.detect(tempDir);
            const domain = await domainDetector.detect(tempDir);

            // Verify TechStackDetector results
            assert.strictEqual(techStack.language, 'rust');
            assert.strictEqual(techStack.packageManager, 'cargo');
            assert.ok(techStack.confidence >= 0.9, 'Rust detection should be very confident');

            // Verify ToolDetector results
            assert.strictEqual(tools.buildTool, 'cargo');
            assert.strictEqual(tools.testFramework, 'cargo-test');
            assert.strictEqual(tools.linter, 'clippy');
            assert.strictEqual(tools.buildCommand, 'cargo build');
            assert.strictEqual(tools.testCommand, 'cargo test');
            assert.ok(tools.confidence >= 0.8, 'Tools confidence should be high');

            // Verify WorkflowDetector results
            assert.strictEqual(workflow.tdd, true, 'Should detect TDD from tests directory');
            assert.strictEqual(workflow.cicd, 'github-actions');
            assert.ok(workflow.confidence >= 0.7);

            // Verify DomainDetector results
            assert.strictEqual(domain.domain, 'software-dev');
            assert.strictEqual(domain.subType, 'cli');
            assert.ok(domain.confidence >= 0.7);

            console.log('✅ Full Rust CLI pipeline detected correctly');
        });
    });

    // ==========================================================================
    // TEST SUITE 3: Python Library Project (Full Pipeline)
    // ==========================================================================

    describe('Python Library Project (Full Pipeline)', () => {
        it('should detect complete Python + pip + pytest + GitLab CI stack', async () => {
            // Create realistic Python library project structure
            fs.writeFileSync(
                path.join(tempDir, 'setup.py'),
                'from setuptools import setup\nsetup(name="mylib", version="1.0.0")'
            );
            fs.writeFileSync(
                path.join(tempDir, 'requirements.txt'),
                'pytest==7.0.0\npytest-cov==3.0.0\npylint==2.15.0'
            );
            fs.writeFileSync(
                path.join(tempDir, '.gitlab-ci.yml'),
                'stages:\n  - test\n  - deploy'
            );
            fs.writeFileSync(
                path.join(tempDir, '.pre-commit-config.yaml'),
                'repos:\n  - repo: local'
            );
            fs.mkdirSync(path.join(tempDir, 'tests'));
            fs.writeFileSync(path.join(tempDir, 'tests', 'test_main.py'), 'def test(): pass');
            fs.writeFileSync(
                path.join(tempDir, 'README.md'),
                '# My Python Library\n\nA reusable Python package.'
            );

            // Run full detection pipeline
            const techStack = await techStackDetector.detect(tempDir);
            const tools = await toolDetector.detect(tempDir);
            const workflow = await workflowDetector.detect(tempDir);
            const domain = await domainDetector.detect(tempDir);

            // Verify TechStackDetector results
            assert.strictEqual(techStack.language, 'python');
            assert.strictEqual(techStack.packageManager, 'pip');
            assert.ok(techStack.confidence >= 0.8);

            // Verify ToolDetector results
            assert.strictEqual(tools.testFramework, 'pytest');
            assert.strictEqual(tools.linter, 'pylint');
            assert.ok(tools.testCommand);
            assert.ok(tools.confidence >= 0.7);

            // Verify WorkflowDetector results
            assert.strictEqual(workflow.tdd, true);
            assert.ok(workflow.hasCoverage, 'Should detect pytest-cov');
            assert.strictEqual(workflow.cicd, 'gitlab-ci');
            assert.strictEqual(workflow.preCommitHooks, true);
            assert.strictEqual(workflow.hookTool, 'pre-commit');
            assert.ok(workflow.confidence >= 0.7);

            // Verify DomainDetector results
            assert.strictEqual(domain.domain, 'software-dev');
            assert.strictEqual(domain.subType, 'library');
            assert.ok(domain.confidence >= 0.6);

            console.log('✅ Full Python library pipeline detected correctly');
        });
    });

    // ==========================================================================
    // TEST SUITE 4: Error Cases and Edge Cases
    // ==========================================================================

    describe('Error Cases and Edge Cases', () => {
        it('should handle missing package.json gracefully', async () => {
            // Run detectors on empty directory
            const techStack = await techStackDetector.detect(tempDir);
            const tools = await toolDetector.detect(tempDir);
            const workflow = await workflowDetector.detect(tempDir);
            const domain = await domainDetector.detect(tempDir);

            // All should return graceful fallbacks
            assert.strictEqual(techStack.language, 'unknown');
            assert.strictEqual(techStack.confidence, 0.0);
            assert.strictEqual(tools.confidence, 0.0);
            assert.strictEqual(workflow.confidence, 0.0);
            assert.strictEqual(domain.domain, 'unknown');
            assert.strictEqual(domain.confidence, 0.0);

            console.log('✅ Empty directory handled gracefully');
        });

        it('should handle malformed JSON files gracefully', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), '{ invalid json }');
            fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{ bad }');

            const techStack = await techStackDetector.detect(tempDir);
            const tools = await toolDetector.detect(tempDir);

            // Should still return results (possibly detected from file presence)
            assert.ok(techStack);
            assert.ok(tools);
            assert.strictEqual(techStack.language, 'javascript'); // Detected from file presence

            console.log('✅ Malformed JSON handled gracefully');
        });

        it('should handle project without tests (no TDD)', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    dependencies: { react: '^18.0.0' }
                })
            );

            const workflow = await workflowDetector.detect(tempDir);

            assert.strictEqual(workflow.tdd, undefined, 'Should not detect TDD without test directory');
            assert.ok(workflow.confidence < 0.5);

            console.log('✅ Non-TDD project handled correctly');
        });

        it('should handle hybrid project (CLI + web)', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    bin: './cli.js',
                    dependencies: { react: '^18.0.0' }
                })
            );

            const domain = await domainDetector.detect(tempDir);

            // CLI should take priority
            assert.strictEqual(domain.subType, 'cli');

            console.log('✅ Hybrid project prioritization works correctly');
        });

        it('should handle non-existent directory', async () => {
            const techStack = await techStackDetector.detect('/nonexistent/path');
            const tools = await toolDetector.detect('/nonexistent/path');
            const workflow = await workflowDetector.detect('/nonexistent/path');
            const domain = await domainDetector.detect('/nonexistent/path');

            assert.strictEqual(techStack.language, 'unknown');
            assert.strictEqual(techStack.confidence, 0.0);
            assert.strictEqual(tools.confidence, 0.0);
            assert.strictEqual(workflow.confidence, 0.0);
            assert.strictEqual(domain.confidence, 0.0);

            console.log('✅ Non-existent directory handled gracefully');
        });
    });

    // ==========================================================================
    // TEST SUITE 5: Performance Tests
    // ==========================================================================

    describe('Performance Tests', () => {
        it('should complete full detection pipeline in < 500ms', async function() {
            // Create comprehensive project structure
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    scripts: { build: 'webpack', test: 'jest', lint: 'eslint .' },
                    dependencies: { react: '^18.0.0' },
                    devDependencies: {
                        typescript: '^5.0.0',
                        webpack: '^5.0.0',
                        jest: '^29.0.0',
                        eslint: '^8.0.0',
                        husky: '^8.0.0'
                    }
                })
            );
            fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');
            fs.mkdirSync(path.join(tempDir, 'test'));
            fs.mkdirSync(path.join(tempDir, '.github'));
            fs.mkdirSync(path.join(tempDir, '.github', 'workflows'));
            fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), '');

            const startTime = Date.now();

            // Run all 4 detectors sequentially
            await techStackDetector.detect(tempDir);
            await toolDetector.detect(tempDir);
            await workflowDetector.detect(tempDir);
            await domainDetector.detect(tempDir);

            const duration = Date.now() - startTime;

            assert.ok(duration < 500, `Full pipeline took ${duration}ms, should be < 500ms`);
            console.log(`✅ Full pipeline completed in ${duration}ms`);
        });

        it('should handle parallel detection efficiently', async function() {
            // Create project structure
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ dependencies: { react: '^18.0.0' } })
            );
            fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');

            const startTime = Date.now();

            // Run all 4 detectors in parallel
            await Promise.all([
                techStackDetector.detect(tempDir),
                toolDetector.detect(tempDir),
                workflowDetector.detect(tempDir),
                domainDetector.detect(tempDir)
            ]);

            const duration = Date.now() - startTime;

            // Parallel should be faster than sequential
            assert.ok(duration < 300, `Parallel pipeline took ${duration}ms, should be < 300ms`);
            console.log(`✅ Parallel pipeline completed in ${duration}ms`);
        });
    });

    // ==========================================================================
    // TEST SUITE 6: Result Consistency
    // ==========================================================================

    describe('Result Consistency', () => {
        it('should provide consistent results across multiple runs', async () => {
            // Create project structure
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    dependencies: { react: '^18.0.0' },
                    devDependencies: { jest: '^29.0.0' }
                })
            );
            fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');
            fs.mkdirSync(path.join(tempDir, 'test'));

            // Run pipeline multiple times
            const results = [];
            for (let i = 0; i < 5; i++) {
                const techStack = await techStackDetector.detect(tempDir);
                const tools = await toolDetector.detect(tempDir);
                const workflow = await workflowDetector.detect(tempDir);
                const domain = await domainDetector.detect(tempDir);

                results.push({ techStack, tools, workflow, domain });
            }

            // Verify all runs produce identical results
            for (let i = 1; i < results.length; i++) {
                assert.strictEqual(results[i].techStack.language, results[0].techStack.language);
                assert.strictEqual(results[i].tools.testFramework, results[0].tools.testFramework);
                assert.strictEqual(results[i].workflow.tdd, results[0].workflow.tdd);
                assert.strictEqual(results[i].domain.subType, results[0].domain.subType);
            }

            console.log('✅ Detection results are consistent across multiple runs');
        });

        it('should have confidence scores correlate with indicator count', async () => {
            // Minimal indicators
            fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
            const minimal = await techStackDetector.detect(tempDir);

            // Multiple indicators
            fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');
            fs.writeFileSync(path.join(tempDir, 'package-lock.json'), '{}');
            const multiple = await techStackDetector.detect(tempDir);

            assert.ok(multiple.confidence > minimal.confidence, 'More indicators should increase confidence');

            console.log('✅ Confidence scores correlate with indicator count');
        });
    });
});
