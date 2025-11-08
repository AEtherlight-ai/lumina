/**
 * WorkflowDetector Tests
 *
 * PATTERN: Pattern-TDD-001 (RED-GREEN-REFACTOR)
 * COVERAGE TARGET: ≥85% (API task)
 * TASK: SELF-008 (Implement WorkflowDetector service)
 *
 * SERVICE TESTED: WorkflowDetector
 * PURPOSE: Auto-detect development workflows (TDD, Git Flow, CI/CD, pre-commit hooks)
 *
 * TEST STRATEGY:
 * - TDD detection: test directories, test scripts, coverage tools
 * - Git workflow detection: Git Flow, trunk-based, feature branches
 * - CI/CD detection: GitHub Actions, GitLab CI, CircleCI, Jenkins, Travis CI
 * - Pre-commit hooks: husky, lefthook, pre-commit
 * - Confidence scoring (0.0-1.0)
 * - Performance <100ms
 * - Edge cases (non-git repos, missing directories, inaccessible files)
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { WorkflowDetector, WorkflowDetectionResult } from '../../src/services/WorkflowDetector';

describe('WorkflowDetector', () => {
    let detector: WorkflowDetector;
    let tempDir: string;

    beforeEach(() => {
        detector = new WorkflowDetector();
        // Create temp directory for test fixtures
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-test-'));
    });

    afterEach(() => {
        // Clean up temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    // ==========================================================================
    // TEST SUITE 1: TDD Workflow Detection - Basic
    // ==========================================================================

    describe('TDD Workflow Detection: Basic', () => {
        it('should detect TDD from test directory', async () => {
            fs.mkdirSync(path.join(tempDir, 'test'));
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ scripts: { test: 'jest' } })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.tdd, true);
            assert.strictEqual(result.testDirectory, 'test');
        });

        it('should detect TDD from spec directory', async () => {
            fs.mkdirSync(path.join(tempDir, 'spec'));
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ scripts: { test: 'mocha' } })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.tdd, true);
            assert.strictEqual(result.testDirectory, 'spec');
        });

        it('should detect TDD from __tests__ directory', async () => {
            fs.mkdirSync(path.join(tempDir, '__tests__'));
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ scripts: { test: 'jest' } })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.tdd, true);
            assert.strictEqual(result.testDirectory, '__tests__');
        });

        it('should not detect TDD without test directory', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ scripts: { test: 'echo test' } })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.tdd, false);
        });
    });

    // ==========================================================================
    // TEST SUITE 2: TDD Workflow Detection - Coverage Tools
    // ==========================================================================

    describe('TDD Workflow Detection: Coverage Tools', () => {
        it('should detect TDD with high confidence when coverage tool present', async () => {
            fs.mkdirSync(path.join(tempDir, 'test'));
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    scripts: { test: 'jest --coverage' },
                    devDependencies: { jest: '^29.0.0', '@jest/coverage': '^29.0.0' }
                })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.tdd, true);
            assert.ok(result.hasCoverage, 'Should detect coverage tool');
            assert.ok(result.confidence >= 0.9, 'High confidence with coverage');
        });

        it('should detect nyc coverage tool', async () => {
            fs.mkdirSync(path.join(tempDir, 'test'));
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    scripts: { test: 'nyc mocha' },
                    devDependencies: { mocha: '^10.0.0', nyc: '^15.0.0' }
                })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.tdd, true);
            assert.ok(result.hasCoverage);
        });

        it('should detect c8 coverage tool', async () => {
            fs.mkdirSync(path.join(tempDir, 'test'));
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    scripts: { test: 'c8 mocha' },
                    devDependencies: { mocha: '^10.0.0', c8: '^7.0.0' }
                })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.tdd, true);
            assert.ok(result.hasCoverage);
        });
    });

    // ==========================================================================
    // TEST SUITE 3: Git Workflow Detection
    // ==========================================================================

    describe('Git Workflow Detection', () => {
        it('should detect Git Flow from .git/config', async () => {
            fs.mkdirSync(path.join(tempDir, '.git'));
            fs.writeFileSync(
                path.join(tempDir, '.git', 'config'),
                '[gitflow "branch"]\n\tmaster = master\n\tdevelop = develop'
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.gitWorkflow, 'git-flow');
        });

        it('should detect trunk-based from minimal branches', async () => {
            fs.mkdirSync(path.join(tempDir, '.git'));
            fs.mkdirSync(path.join(tempDir, '.git', 'refs'));
            fs.mkdirSync(path.join(tempDir, '.git', 'refs', 'heads'));
            fs.writeFileSync(path.join(tempDir, '.git', 'refs', 'heads', 'main'), '');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.gitWorkflow, 'trunk-based');
        });

        it('should detect feature-branch from multiple feature branches', async () => {
            fs.mkdirSync(path.join(tempDir, '.git'));
            fs.mkdirSync(path.join(tempDir, '.git', 'refs'));
            fs.mkdirSync(path.join(tempDir, '.git', 'refs', 'heads'));
            fs.mkdirSync(path.join(tempDir, '.git', 'refs', 'heads', 'feature'));
            fs.writeFileSync(path.join(tempDir, '.git', 'refs', 'heads', 'main'), '');
            fs.writeFileSync(path.join(tempDir, '.git', 'refs', 'heads', 'feature', 'auth'), '');
            fs.writeFileSync(path.join(tempDir, '.git', 'refs', 'heads', 'feature', 'api'), '');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.gitWorkflow, 'feature-branch');
        });

        it('should return unknown for non-git repositories', async () => {
            const result = await detector.detect(tempDir);

            assert.strictEqual(result.gitWorkflow, 'unknown');
        });
    });

    // ==========================================================================
    // TEST SUITE 4: CI/CD Detection - GitHub Actions
    // ==========================================================================

    describe('CI/CD Detection: GitHub Actions', () => {
        it('should detect GitHub Actions from .github/workflows', async () => {
            fs.mkdirSync(path.join(tempDir, '.github'));
            fs.mkdirSync(path.join(tempDir, '.github', 'workflows'));
            fs.writeFileSync(
                path.join(tempDir, '.github', 'workflows', 'ci.yml'),
                'name: CI\non: [push]'
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.cicd, 'github-actions');
            assert.ok(result.workflows);
            assert.ok(result.workflows.includes('ci.yml'));
        });

        it('should detect multiple GitHub Actions workflows', async () => {
            fs.mkdirSync(path.join(tempDir, '.github'));
            fs.mkdirSync(path.join(tempDir, '.github', 'workflows'));
            fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), '');
            fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'deploy.yml'), '');
            fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'release.yml'), '');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.cicd, 'github-actions');
            assert.strictEqual(result.workflows?.length, 3);
            assert.ok(result.workflows?.includes('ci.yml'));
            assert.ok(result.workflows?.includes('deploy.yml'));
            assert.ok(result.workflows?.includes('release.yml'));
        });
    });

    // ==========================================================================
    // TEST SUITE 5: CI/CD Detection - Other Platforms
    // ==========================================================================

    describe('CI/CD Detection: Other Platforms', () => {
        it('should detect GitLab CI from .gitlab-ci.yml', async () => {
            fs.writeFileSync(
                path.join(tempDir, '.gitlab-ci.yml'),
                'stages:\n  - test\n  - deploy'
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.cicd, 'gitlab-ci');
        });

        it('should detect CircleCI from .circleci/config.yml', async () => {
            fs.mkdirSync(path.join(tempDir, '.circleci'));
            fs.writeFileSync(
                path.join(tempDir, '.circleci', 'config.yml'),
                'version: 2.1'
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.cicd, 'circleci');
        });

        it('should detect Jenkins from Jenkinsfile', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'Jenkinsfile'),
                'pipeline { agent any }'
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.cicd, 'jenkins');
        });

        it('should detect Travis CI from .travis.yml', async () => {
            fs.writeFileSync(
                path.join(tempDir, '.travis.yml'),
                'language: node_js'
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.cicd, 'travis-ci');
        });

        it('should prioritize GitHub Actions over Travis CI if both present', async () => {
            fs.mkdirSync(path.join(tempDir, '.github'));
            fs.mkdirSync(path.join(tempDir, '.github', 'workflows'));
            fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), '');
            fs.writeFileSync(path.join(tempDir, '.travis.yml'), 'language: node_js');

            const result = await detector.detect(tempDir);

            // GitHub Actions is more modern, should be prioritized
            assert.strictEqual(result.cicd, 'github-actions');
        });
    });

    // ==========================================================================
    // TEST SUITE 6: Pre-commit Hooks Detection - husky
    // ==========================================================================

    describe('Pre-commit Hooks Detection: husky', () => {
        it('should detect husky from devDependencies', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    devDependencies: { husky: '^8.0.0' }
                })
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.preCommitHooks, true);
            assert.strictEqual(result.hookTool, 'husky');
        });

        it('should detect husky with .husky directory (higher confidence)', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ devDependencies: { husky: '^8.0.0' } })
            );
            fs.mkdirSync(path.join(tempDir, '.husky'));
            fs.writeFileSync(path.join(tempDir, '.husky', 'pre-commit'), '#!/bin/sh');

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.preCommitHooks, true);
            assert.strictEqual(result.hookTool, 'husky');
            assert.ok(result.confidence >= 0.9, 'Higher confidence with .husky directory');
        });
    });

    // ==========================================================================
    // TEST SUITE 7: Pre-commit Hooks Detection - Other Tools
    // ==========================================================================

    describe('Pre-commit Hooks Detection: Other Tools', () => {
        it('should detect lefthook from lefthook.yml', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'lefthook.yml'),
                'pre-commit:\n  commands:\n    lint:\n      run: npm run lint'
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.preCommitHooks, true);
            assert.strictEqual(result.hookTool, 'lefthook');
        });

        it('should detect pre-commit from .pre-commit-config.yaml', async () => {
            fs.writeFileSync(
                path.join(tempDir, '.pre-commit-config.yaml'),
                'repos:\n  - repo: local'
            );

            const result = await detector.detect(tempDir);

            assert.strictEqual(result.preCommitHooks, true);
            assert.strictEqual(result.hookTool, 'pre-commit');
        });

        it('should prioritize husky over lefthook if both present', async () => {
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ devDependencies: { husky: '^8.0.0' } })
            );
            fs.writeFileSync(path.join(tempDir, 'lefthook.yml'), 'pre-commit: {}');

            const result = await detector.detect(tempDir);

            // husky is more popular in Node.js ecosystem
            assert.strictEqual(result.hookTool, 'husky');
        });
    });

    // ==========================================================================
    // TEST SUITE 8: Comprehensive Workflow Detection
    // ==========================================================================

    describe('Comprehensive Workflow Detection', () => {
        it('should detect all workflows in a comprehensive project', async () => {
            // Create test directory structure
            fs.mkdirSync(path.join(tempDir, 'test'));
            fs.mkdirSync(path.join(tempDir, '.github'));
            fs.mkdirSync(path.join(tempDir, '.github', 'workflows'));
            fs.mkdirSync(path.join(tempDir, '.git'));
            fs.mkdirSync(path.join(tempDir, '.husky'));

            // Create package.json with test script and husky
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    scripts: { test: 'jest --coverage' },
                    devDependencies: {
                        jest: '^29.0.0',
                        husky: '^8.0.0',
                        '@jest/coverage': '^29.0.0'
                    }
                })
            );

            // Create GitHub Actions workflow
            fs.writeFileSync(
                path.join(tempDir, '.github', 'workflows', 'ci.yml'),
                'name: CI'
            );

            // Create .git/config for Git Flow
            fs.writeFileSync(
                path.join(tempDir, '.git', 'config'),
                '[gitflow "branch"]\n\tmaster = main'
            );

            const result = await detector.detect(tempDir);

            // Verify all workflows detected
            assert.strictEqual(result.tdd, true);
            assert.ok(result.hasCoverage);
            assert.strictEqual(result.gitWorkflow, 'git-flow');
            assert.strictEqual(result.cicd, 'github-actions');
            assert.strictEqual(result.preCommitHooks, true);
            assert.strictEqual(result.hookTool, 'husky');
            assert.ok(result.confidence >= 0.9, 'High confidence with all workflows');
        });
    });

    // ==========================================================================
    // TEST SUITE 9: Confidence Scoring
    // ==========================================================================

    describe('Confidence Scoring', () => {
        it('should return high confidence (≥0.9) with multiple indicators', async () => {
            fs.mkdirSync(path.join(tempDir, 'test'));
            fs.mkdirSync(path.join(tempDir, '.github'));
            fs.mkdirSync(path.join(tempDir, '.github', 'workflows'));
            fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), '');
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    scripts: { test: 'jest --coverage' },
                    devDependencies: { jest: '^29.0.0', husky: '^8.0.0' }
                })
            );

            const result = await detector.detect(tempDir);

            assert.ok(
                result.confidence >= 0.9,
                `Confidence ${result.confidence} should be ≥ 0.9 with multiple indicators`
            );
        });

        it('should return medium confidence (0.6-0.8) with single indicator', async () => {
            fs.mkdirSync(path.join(tempDir, 'test'));

            const result = await detector.detect(tempDir);

            assert.ok(
                result.confidence >= 0.5 && result.confidence < 0.9,
                `Confidence ${result.confidence} should be 0.5-0.8 with single indicator`
            );
        });

        it('should return low confidence (<0.5) with no indicators', async () => {
            const result = await detector.detect(tempDir);

            assert.ok(
                result.confidence < 0.5,
                `Confidence ${result.confidence} should be < 0.5 with no indicators`
            );
        });
    });

    // ==========================================================================
    // TEST SUITE 10: Performance
    // ==========================================================================

    describe('Performance', () => {
        it('should complete detection in < 100ms', async function() {
            // Create realistic project structure
            fs.mkdirSync(path.join(tempDir, 'test'));
            fs.mkdirSync(path.join(tempDir, '.github'));
            fs.mkdirSync(path.join(tempDir, '.github', 'workflows'));
            fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), '');
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    scripts: { test: 'jest' },
                    devDependencies: { jest: '^29.0.0', husky: '^8.0.0' }
                })
            );

            const startTime = Date.now();
            await detector.detect(tempDir);
            const duration = Date.now() - startTime;

            assert.ok(duration < 100, `Detection took ${duration}ms, should be < 100ms`);
        });

        it('should handle projects with many workflow files efficiently', async function() {
            this.timeout(5000);

            // Create many workflow files
            fs.mkdirSync(path.join(tempDir, '.github'));
            fs.mkdirSync(path.join(tempDir, '.github', 'workflows'));
            for (let i = 0; i < 20; i++) {
                fs.writeFileSync(
                    path.join(tempDir, '.github', 'workflows', `workflow${i}.yml`),
                    'name: Test'
                );
            }

            const startTime = Date.now();
            await detector.detect(tempDir);
            const duration = Date.now() - startTime;

            assert.ok(duration < 150, `Large project detection took ${duration}ms, should be < 150ms`);
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

        it('should handle non-git repository gracefully', async () => {
            const result = await detector.detect(tempDir);

            assert.ok(result);
            assert.strictEqual(result.gitWorkflow, 'unknown');
        });

        it('should handle .git directory without read permissions gracefully', async function() {
            // Skip on Windows (permission model different)
            if (process.platform === 'win32') {
                this.skip();
                return;
            }

            fs.mkdirSync(path.join(tempDir, '.git'));
            fs.chmodSync(path.join(tempDir, '.git'), 0o000);

            const result = await detector.detect(tempDir);

            // Cleanup
            fs.chmodSync(path.join(tempDir, '.git'), 0o755);

            assert.ok(result);
            assert.strictEqual(result.gitWorkflow, 'unknown');
        });

        it('should handle empty .github/workflows directory', async () => {
            fs.mkdirSync(path.join(tempDir, '.github'));
            fs.mkdirSync(path.join(tempDir, '.github', 'workflows'));

            const result = await detector.detect(tempDir);

            assert.ok(result);
            // Should not detect CI/CD with no workflow files
            assert.notStrictEqual(result.cicd, 'github-actions');
        });

        it('should handle malformed package.json gracefully', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), '{ invalid json }');

            const result = await detector.detect(tempDir);

            assert.ok(result);
            // Should still return a result, possibly with low confidence
        });
    });

    // ==========================================================================
    // TEST SUITE 12: Result Structure
    // ==========================================================================

    describe('Result Structure', () => {
        it('should return complete WorkflowDetectionResult with all fields', async () => {
            fs.mkdirSync(path.join(tempDir, 'test'));
            fs.mkdirSync(path.join(tempDir, '.github'));
            fs.mkdirSync(path.join(tempDir, '.github', 'workflows'));
            fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), '');
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    scripts: { test: 'jest' },
                    devDependencies: { jest: '^29.0.0', husky: '^8.0.0' }
                })
            );

            const result = await detector.detect(tempDir);

            // Required fields
            assert.ok(result.hasOwnProperty('confidence'), 'Result must have confidence field');

            // Optional fields (present if detected)
            assert.ok(result.hasOwnProperty('tdd'), 'Result should have tdd field');
            assert.ok(result.hasOwnProperty('gitWorkflow'), 'Result should have gitWorkflow field');
            assert.ok(result.hasOwnProperty('cicd'), 'Result should have cicd field');
            assert.ok(result.hasOwnProperty('preCommitHooks'), 'Result should have preCommitHooks field');

            // Value types
            assert.strictEqual(typeof result.confidence, 'number');
            assert.ok(result.confidence >= 0.0 && result.confidence <= 1.0, 'Confidence must be 0.0-1.0');
        });
    });
});
