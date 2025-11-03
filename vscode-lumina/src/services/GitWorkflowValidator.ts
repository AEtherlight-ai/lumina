/**
 * GitWorkflowValidator - Validates git repository state and workflow
 *
 * DESIGN DECISION: Check git state before publishing/committing
 * WHY: Prevents accidental commits to main, detects conflicts early
 *
 * REASONING CHAIN:
 * 1. Uncommitted changes can cause issues during publish
 * 2. Publishing from main branch is dangerous (should use feature branches)
 * 3. Merge conflicts must be resolved before proceeding
 * 4. Unpushed commits indicate work not backed up
 * 5. Result: Git workflow validation catches issues before they cause problems
 *
 * PATTERN: Pattern-VALIDATION-001 (Comprehensive System Validation)
 * RELATED: VAL-006
 *
 * PERFORMANCE REQUIREMENT: <500ms validation time
 */

import * as child_process from 'child_process';
import * as path from 'path';

/**
 * Validation result
 */
export interface GitWorkflowResult {
	valid: boolean;
	hasUncommittedChanges: boolean;
	currentBranch: string;
	hasMergeConflicts: boolean;
	unpushedCommitsCount: number;
	issues: GitWorkflowIssue[];
}

/**
 * Git workflow issue detected
 */
export interface GitWorkflowIssue {
	type: 'uncommitted_changes' | 'merge_conflicts' | 'on_main_branch' | 'git_unavailable' | 'detached_head';
	severity: 'warning' | 'error' | 'critical';
	message: string;
	suggestion?: string;
}

/**
 * GitWorkflowValidator
 *
 * DESIGN DECISION: Use git CLI commands via child_process
 * WHY: Git CLI is standard, no npm dependencies needed (Pattern-PUBLISH-003)
 */
export class GitWorkflowValidator {
	/**
	 * Maximum time to wait for git commands (5 seconds)
	 */
	private readonly GIT_TIMEOUT_MS = 5000;

	/**
	 * Validate git workflow state
	 *
	 * DESIGN DECISION: Check multiple git states in parallel where possible
	 * WHY: Faster validation (<500ms target)
	 *
	 * @param projectPath - Absolute path to project directory (git repository root)
	 * @returns GitWorkflowResult with workflow state information
	 */
	validate(projectPath: string): GitWorkflowResult {
		const startTime = Date.now();
		const issues: GitWorkflowIssue[] = [];

		try {
			// Check git availability
			try {
				this.execGit('git --version', projectPath);
			} catch (error) {
				return {
					valid: false,
					hasUncommittedChanges: false,
					currentBranch: 'unknown',
					hasMergeConflicts: false,
					unpushedCommitsCount: 0,
					issues: [{
						type: 'git_unavailable',
						severity: 'error',
						message: 'Git not available or not a git repository',
						suggestion: 'Check git installation and repository status'
					}]
				};
			}

			// 1. Check uncommitted changes (git status --porcelain)
			let hasUncommittedChanges = false;
			try {
				const statusOutput = this.execGit('git status --porcelain', projectPath);
				hasUncommittedChanges = statusOutput.trim().length > 0;

				if (hasUncommittedChanges) {
					issues.push({
						type: 'uncommitted_changes',
						severity: 'warning',
						message: 'Working directory has uncommitted changes',
						suggestion: 'Commit changes: git add . && git commit'
					});
				}
			} catch (error: any) {
				// Git status failed - repository might be corrupt
				issues.push({
					type: 'git_unavailable',
					severity: 'error',
					message: `Git status failed: ${error.message}`,
					suggestion: 'Check repository integrity'
				});
			}

			// 2. Check current branch (git rev-parse --abbrev-ref HEAD)
			let currentBranch = 'unknown';
			try {
				currentBranch = this.execGit('git rev-parse --abbrev-ref HEAD', projectPath).trim();

				// Warn if on main/master branch
				if (currentBranch === 'main' || currentBranch === 'master') {
					issues.push({
						type: 'on_main_branch',
						severity: 'critical',
						message: `Currently on ${currentBranch} branch`,
						suggestion: 'Consider creating feature branch: git checkout -b feature/name'
					});
				}

				// Warn if in detached HEAD state
				if (currentBranch === 'HEAD') {
					issues.push({
						type: 'detached_head',
						severity: 'warning',
						message: 'Repository in detached HEAD state',
						suggestion: 'Checkout a branch: git checkout <branch-name>'
					});
				}
			} catch (error: any) {
				// Branch detection failed
				issues.push({
					type: 'git_unavailable',
					severity: 'error',
					message: `Git branch detection failed: ${error.message}`
				});
			}

			// 3. Check merge conflicts (git ls-files -u)
			let hasMergeConflicts = false;
			try {
				const conflictOutput = this.execGit('git ls-files -u', projectPath);
				hasMergeConflicts = conflictOutput.trim().length > 0;

				if (hasMergeConflicts) {
					issues.push({
						type: 'merge_conflicts',
						severity: 'error',
						message: 'Unresolved merge conflicts detected',
						suggestion: 'Resolve conflicts before proceeding'
					});
				}
			} catch (error: any) {
				// Merge conflict check failed - not critical
				// Don't add issue, just assume no conflicts
			}

			// 4. Check unpushed commits (git log origin/HEAD..HEAD)
			let unpushedCommitsCount = 0;
			try {
				const logOutput = this.execGit('git log origin/HEAD..HEAD --oneline', projectPath);
				const lines = logOutput.trim().split('\n').filter(line => line.length > 0);
				unpushedCommitsCount = lines.length;
			} catch (error: any) {
				// Unpushed commits check failed - not critical
				// Might be no remote configured, which is fine
			}

			// Performance check
			const elapsedTime = Date.now() - startTime;
			if (elapsedTime > 500) {
				console.warn(`[GitWorkflowValidator] Validation took ${elapsedTime}ms (target: <500ms)`);
			}

			// Determine if valid (only errors block, warnings don't)
			const hasErrors = issues.some(issue => issue.severity === 'error');

			return {
				valid: !hasErrors,
				hasUncommittedChanges,
				currentBranch,
				hasMergeConflicts,
				unpushedCommitsCount,
				issues
			};

		} catch (error: any) {
			return {
				valid: false,
				hasUncommittedChanges: false,
				currentBranch: 'unknown',
				hasMergeConflicts: false,
				unpushedCommitsCount: 0,
				issues: [{
					type: 'git_unavailable',
					severity: 'error',
					message: `Git validation failed: ${error.message}`,
					suggestion: 'Check git installation and repository status'
				}]
			};
		}
	}

	/**
	 * Execute git command
	 *
	 * DESIGN DECISION: Use child_process.execSync for simplicity
	 * WHY: Synchronous execution is fine for fast git commands (<500ms)
	 *
	 * @param command - Git command to execute
	 * @param cwd - Working directory (project path)
	 * @returns Command stdout output
	 * @throws Error if command fails
	 */
	private execGit(command: string, cwd: string): string {
		try {
			const result = child_process.execSync(command, {
				cwd,
				encoding: 'utf8',
				timeout: this.GIT_TIMEOUT_MS,
				stdio: 'pipe'
			});
			return result;
		} catch (error: any) {
			throw new Error(`Git command failed: ${command} - ${error.message}`);
		}
	}
}
