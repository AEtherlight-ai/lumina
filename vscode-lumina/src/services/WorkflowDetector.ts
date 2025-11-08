/**
 * WorkflowDetector - Auto-detect development workflows
 *
 * @maintainable
 * Created: 2025-11-07 (SELF-008 - Phase 3 Detection)
 * Test: test/services/WorkflowDetector.test.ts
 * Pattern: Pattern-TDD-001 (RED-GREEN-REFACTOR)
 *
 * PURPOSE:
 * Automatically detect development workflows from project structure:
 * - TDD workflow (test directories, test scripts, coverage tools)
 * - Git workflow (Git Flow, trunk-based, feature branches)
 * - CI/CD (GitHub Actions, GitLab CI, CircleCI, Jenkins, Travis CI)
 * - Pre-commit hooks (husky, lefthook, pre-commit)
 *
 * DETECTION STRATEGY:
 * - TDD: Check test directories (test/, spec/, __tests__), test scripts, coverage tools
 * - Git: Read .git/config for gitflow, analyze branch structure
 * - CI/CD: Check for workflow config files (.github/workflows/, .gitlab-ci.yml, etc.)
 * - Pre-commit hooks: Check devDependencies and hook directories
 * - Confidence: Multiple indicators = higher confidence
 *
 * PERFORMANCE TARGET: <100ms for typical projects
 *
 * DESIGN DECISIONS:
 * - Synchronous file I/O for performance (no async overhead)
 * - Avoid git commands (too slow, filesystem checks only)
 * - Graceful degradation for non-git repositories
 * - Prioritize modern tools (GitHub Actions > Travis CI)
 *
 * RELATED: TechStackDetector.ts (SELF-006), ToolDetector.ts (SELF-007)
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Git workflow types
 */
export type GitWorkflowType = 'git-flow' | 'trunk-based' | 'feature-branch' | 'unknown';

/**
 * CI/CD platform types
 */
export type CICDType = 'github-actions' | 'gitlab-ci' | 'circleci' | 'jenkins' | 'travis-ci' | 'unknown';

/**
 * Pre-commit hook tool types
 */
export type HookToolType = 'husky' | 'lefthook' | 'pre-commit' | 'unknown';

/**
 * Workflow detection result with confidence score
 */
export interface WorkflowDetectionResult {
    tdd?: boolean;
    testDirectory?: string;
    hasCoverage?: boolean;
    gitWorkflow?: GitWorkflowType;
    cicd?: CICDType;
    workflows?: string[];
    preCommitHooks?: boolean;
    hookTool?: HookToolType;
    confidence: number; // 0.0 (no confidence) to 1.0 (very high confidence)
}

/**
 * WorkflowDetector - Main detection service
 */
export class WorkflowDetector {
    /**
     * Detect development workflows from project directory
     *
     * @param projectRoot - Absolute path to project root
     * @returns WorkflowDetectionResult with detected workflows and confidence
     *
     * PERFORMANCE: Target <100ms for typical projects
     * ERROR HANDLING: Returns default values + 0.0 confidence on errors
     */
    public async detect(projectRoot: string): Promise<WorkflowDetectionResult> {
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

        // Detect TDD workflow
        const tddResult = this.detectTDD(projectRoot);
        if (tddResult.tdd) {
            confidence += tddResult.confidence;
            indicators++;
        }

        // Detect Git workflow
        const gitWorkflowResult = this.detectGitWorkflow(projectRoot);
        const gitWorkflow = gitWorkflowResult.workflow !== 'unknown' ? gitWorkflowResult.workflow : undefined;
        if (gitWorkflowResult.workflow !== 'unknown') {
            confidence += gitWorkflowResult.confidence;
            indicators++;
        }

        // Detect CI/CD
        const cicdResult = this.detectCICD(projectRoot);
        const cicd = cicdResult.cicd !== 'unknown' ? cicdResult.cicd : undefined;
        const workflows = cicdResult.workflows;
        if (cicdResult.cicd !== 'unknown') {
            confidence += cicdResult.confidence;
            indicators++;
        }

        // Detect pre-commit hooks
        const hooksResult = this.detectPreCommitHooks(projectRoot);
        const preCommitHooks = hooksResult.detected;
        const hookTool = hooksResult.tool !== 'unknown' ? hooksResult.tool : undefined;
        if (hooksResult.detected) {
            confidence += hooksResult.confidence;
            indicators++;
        }

        // Normalize confidence (average of all indicators)
        if (indicators > 0) {
            confidence = confidence / indicators;
        }

        return {
            tdd: tddResult.tdd,
            testDirectory: tddResult.testDirectory,
            hasCoverage: tddResult.hasCoverage,
            gitWorkflow,
            cicd,
            workflows,
            preCommitHooks,
            hookTool,
            confidence: Math.min(1.0, confidence)
        };
    }

    /**
     * Detect TDD workflow from test directories and scripts
     *
     * TDD INDICATORS:
     * - Test directory exists (test/, spec/, __tests__)
     * - Test script in package.json
     * - Coverage tool present (jest coverage, nyc, c8)
     *
     * CONFIDENCE:
     * - High (0.9+): Test directory + test script + coverage tool
     * - Medium (0.7): Test directory + test script
     * - Low (0.5): Test directory only
     */
    private detectTDD(projectRoot: string): {
        tdd: boolean;
        testDirectory?: string;
        hasCoverage?: boolean;
        confidence: number;
    } {
        // Check for test directories
        const testDirs = ['test', 'spec', '__tests__', 'tests'];
        let testDirectory: string | undefined;

        for (const dir of testDirs) {
            if (fs.existsSync(path.join(projectRoot, dir))) {
                const stats = fs.statSync(path.join(projectRoot, dir));
                if (stats.isDirectory()) {
                    testDirectory = dir;
                    break;
                }
            }
        }

        // No test directory = not TDD
        if (!testDirectory) {
            return { tdd: false, confidence: 0.0 };
        }

        let confidence = 0.5; // Base confidence for test directory
        let hasTestScript = false;
        let hasCoverage = false;

        // Check for test script in package.json
        const packageJsonPath = path.join(projectRoot, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                const scripts = packageJson.scripts || {};
                const devDeps = packageJson.devDependencies || {};

                // Check for test script
                if (scripts['test'] && scripts['test'] !== 'echo "Error: no test specified" && exit 1') {
                    hasTestScript = true;
                    confidence += 0.2;
                }

                // Check for coverage tools
                const coverageTools = ['jest', '@jest/coverage', 'nyc', 'c8', 'istanbul'];
                const hasCoverageTool = coverageTools.some(tool => devDeps[tool]);
                const hasCoverageScript = scripts['test']?.includes('--coverage') ||
                                          scripts['test']?.includes('nyc') ||
                                          scripts['test']?.includes('c8');

                if (hasCoverageTool || hasCoverageScript) {
                    hasCoverage = true;
                    confidence += 0.2;
                }
            } catch (error) {
                // Malformed package.json - ignore
            }
        }

        return {
            tdd: true,
            testDirectory,
            hasCoverage,
            confidence: Math.min(1.0, confidence)
        };
    }

    /**
     * Detect Git workflow from .git/config and branch structure
     *
     * GIT WORKFLOW TYPES:
     * - Git Flow: .git/config contains [gitflow "branch"]
     * - Trunk-based: Single main/master branch only
     * - Feature branch: Multiple feature/* branches
     */
    private detectGitWorkflow(projectRoot: string): { workflow: GitWorkflowType; confidence: number } {
        const gitDir = path.join(projectRoot, '.git');

        // Check if .git directory exists
        if (!fs.existsSync(gitDir)) {
            return { workflow: 'unknown', confidence: 0.0 };
        }

        try {
            // Check for Git Flow in .git/config
            const gitConfigPath = path.join(gitDir, 'config');
            if (fs.existsSync(gitConfigPath)) {
                const gitConfig = fs.readFileSync(gitConfigPath, 'utf-8');
                if (gitConfig.includes('[gitflow "branch"]') || gitConfig.includes('gitflow')) {
                    return { workflow: 'git-flow', confidence: 0.95 };
                }
            }

            // Analyze branch structure
            const headsDir = path.join(gitDir, 'refs', 'heads');
            if (fs.existsSync(headsDir)) {
                const branches = this.listBranches(headsDir);

                // Check for feature branches
                const featureBranches = branches.filter(b => b.includes('feature/') || b.includes('feature'));
                if (featureBranches.length >= 2) {
                    return { workflow: 'feature-branch', confidence: 0.85 };
                }

                // Check for trunk-based (single main branch)
                if (branches.length === 1 && (branches[0] === 'main' || branches[0] === 'master')) {
                    return { workflow: 'trunk-based', confidence: 0.8 };
                }
            }
        } catch (error) {
            // Permission denied or other error - return unknown
            return { workflow: 'unknown', confidence: 0.0 };
        }

        return { workflow: 'unknown', confidence: 0.0 };
    }

    /**
     * Recursively list branches from .git/refs/heads
     */
    private listBranches(headsDir: string, prefix: string = ''): string[] {
        const branches: string[] = [];

        try {
            const entries = fs.readdirSync(headsDir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(headsDir, entry.name);
                if (entry.isDirectory()) {
                    // Recursively list branches in subdirectories (e.g., feature/)
                    const subBranches = this.listBranches(fullPath, prefix + entry.name + '/');
                    branches.push(...subBranches);
                } else {
                    // File = branch ref
                    branches.push(prefix + entry.name);
                }
            }
        } catch (error) {
            // Permission denied or other error - return empty
        }

        return branches;
    }

    /**
     * Detect CI/CD platform from config files
     *
     * CI/CD PLATFORMS:
     * - GitHub Actions: .github/workflows/*.yml
     * - GitLab CI: .gitlab-ci.yml
     * - CircleCI: .circleci/config.yml
     * - Jenkins: Jenkinsfile
     * - Travis CI: .travis.yml
     *
     * PRIORITY: GitHub Actions > GitLab CI > CircleCI > Jenkins > Travis CI
     */
    private detectCICD(projectRoot: string): {
        cicd: CICDType;
        workflows?: string[];
        confidence: number;
    } {
        // Check for GitHub Actions (highest priority)
        const githubWorkflowsDir = path.join(projectRoot, '.github', 'workflows');
        if (fs.existsSync(githubWorkflowsDir)) {
            try {
                const workflowFiles = fs.readdirSync(githubWorkflowsDir)
                    .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

                if (workflowFiles.length > 0) {
                    return {
                        cicd: 'github-actions',
                        workflows: workflowFiles,
                        confidence: 0.95
                    };
                }
            } catch (error) {
                // Permission denied - ignore
            }
        }

        // Check for GitLab CI
        if (fs.existsSync(path.join(projectRoot, '.gitlab-ci.yml'))) {
            return { cicd: 'gitlab-ci', confidence: 0.95 };
        }

        // Check for CircleCI
        if (fs.existsSync(path.join(projectRoot, '.circleci', 'config.yml'))) {
            return { cicd: 'circleci', confidence: 0.95 };
        }

        // Check for Jenkins
        if (fs.existsSync(path.join(projectRoot, 'Jenkinsfile'))) {
            return { cicd: 'jenkins', confidence: 0.9 };
        }

        // Check for Travis CI
        if (fs.existsSync(path.join(projectRoot, '.travis.yml'))) {
            return { cicd: 'travis-ci', confidence: 0.85 };
        }

        return { cicd: 'unknown', confidence: 0.0 };
    }

    /**
     * Detect pre-commit hooks from tool configuration
     *
     * PRE-COMMIT HOOK TOOLS:
     * - husky: package.json devDeps + .husky/ directory
     * - lefthook: lefthook.yml present
     * - pre-commit: .pre-commit-config.yaml present (Python)
     *
     * PRIORITY: husky > lefthook > pre-commit
     */
    private detectPreCommitHooks(projectRoot: string): {
        detected: boolean;
        tool: HookToolType;
        confidence: number;
    } {
        // Check for husky (Node.js ecosystem)
        const packageJsonPath = path.join(projectRoot, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                const devDeps = packageJson.devDependencies || {};

                if (devDeps['husky']) {
                    // Check for .husky directory (higher confidence)
                    const huskyDir = path.join(projectRoot, '.husky');
                    const hasHuskyDir = fs.existsSync(huskyDir);

                    return {
                        detected: true,
                        tool: 'husky',
                        confidence: hasHuskyDir ? 0.95 : 0.8
                    };
                }
            } catch (error) {
                // Malformed package.json - ignore
            }
        }

        // Check for lefthook
        if (fs.existsSync(path.join(projectRoot, 'lefthook.yml'))) {
            return { detected: true, tool: 'lefthook', confidence: 0.9 };
        }

        // Check for pre-commit (Python)
        if (fs.existsSync(path.join(projectRoot, '.pre-commit-config.yaml'))) {
            return { detected: true, tool: 'pre-commit', confidence: 0.9 };
        }

        return { detected: false, tool: 'unknown', confidence: 0.0 };
    }
}
