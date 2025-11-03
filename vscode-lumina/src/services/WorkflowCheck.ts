/**
 * WorkflowCheck Service - Universal Workflow Validation System
 *
 * DESIGN DECISION: Centralized prerequisite checking for ALL workflows
 * WHY: Pattern-COMM-001 (Universal Communication Protocol) - Users need visibility
 *
 * REASONING CHAIN:
 * 1. User clicks workflow button (🚀 Publish) OR Claude starts coding
 * 2. WorkflowCheck.checkWorkflow('publish', context) called
 * 3. Check prerequisites based on workflow type:
 *    - For 'publish': tests passing, git clean, compilation succeeds
 *    - For 'code': sprint task exists, tests written first (TDD), confidence ≥ 0.80
 *    - For 'sprint': workspace analyzed, git status clean, skills available
 * 4. Calculate confidence score (integrate ConfidenceScorer logic)
 * 5. Identify gaps (missing patterns, skills, agents, tests)
 * 6. Determine if critical junction (confidence < 0.80 OR high-impact operation)
 * 7. Generate plan (step-by-step workflow)
 * 8. Return WorkflowCheckResult with all data
 *
 * PATTERN: Pattern-COMM-001 (Universal Communication Protocol)
 * PATTERN: Pattern-SERVICE-001 (Service Integration with MiddlewareLogger)
 * PATTERN: Pattern-INTEGRATION-001 (Multi-Service Orchestration)
 * PATTERN: Pattern-TASK-ANALYSIS-001 (Pre-Task Analysis Protocol)
 * RELATED: PROTO-001 (Universal Workflow Check System)
 *
 * @module services/WorkflowCheck
 */

import * as child_process from 'child_process';
import { promisify } from 'util';
import { ConfidenceScorer, TaskScore } from './ConfidenceScorer';
import { TestValidator, ValidationResult } from './TestValidator';
import { MiddlewareLogger } from './MiddlewareLogger';

const exec = promisify(child_process.exec);

/**
 * Workflow types supported by the system
 */
export type WorkflowType = 'code' | 'sprint' | 'publish' | 'test' | 'docs' | 'git';

/**
 * Prerequisite status with rich context
 *
 * DESIGN DECISION: Rich status objects instead of simple booleans
 * WHY: Vibe coders need context, engineers need transparency
 * USER DECISION: Option 2 (Rich) chosen for better UX and trust-building
 */
export interface PrerequisiteStatus {
	name: string;
	status: '✅' | '❌' | '⚠️';
	details: string;
	remediation: string | null;  // How to fix if failing
	impact: 'blocking' | 'degraded' | 'suboptimal';  // Severity of failure
}

/**
 * Workflow check result
 *
 * DESIGN DECISION: Comprehensive result object with all context
 * WHY: UI can display full workflow state, Claude can explain reasoning
 */
export interface WorkflowCheckResult {
	workflowType: WorkflowType;
	prerequisites: PrerequisiteStatus[];
	confidence: number;  // 0.0-1.0 overall confidence
	gaps: string[];  // Missing items (patterns, skills, tests, etc.)
	criticalJunction: boolean;  // Requires user approval?
	plan: string[];  // Step-by-step execution plan
	timestamp: number;  // When check was performed
	cacheKey: string;  // For caching results
}

/**
 * Workflow context - inputs for checking prerequisites
 *
 * Different workflow types use different fields
 */
export interface WorkflowContext {
	// Code workflow
	taskId?: string;
	taskName?: string;
	testFilesExist?: boolean;
	gitClean?: boolean;

	// Sprint workflow
	workspaceAnalyzed?: boolean;
	skillsAvailable?: boolean;

	// Publish workflow
	testsPassing?: boolean;
	artifactsCompiled?: boolean;
	gitTagReady?: boolean;

	// Test workflow
	testRunnerConfigured?: boolean;
	coverageToolAvailable?: boolean;

	// Documentation workflow
	reusability?: 'high' | 'medium' | 'low' | 'ephemeral';
	patternTemplateExists?: boolean;

	// Git workflow
	currentBranch?: string;
	isMainBranch?: boolean;
	hasUncommittedChanges?: boolean;
	operation?: 'commit' | 'push' | 'merge' | 'rebase';

	// Testing
	forceGitError?: boolean;  // For testing error handling
}

/**
 * Git Status Interface - Complete git repository state
 *
 * PROTO-004: Git Workflow Integration
 * DESIGN DECISION: Comprehensive git status for all workflow types
 * WHY: Every workflow needs git visibility (commit state, branch, conflicts)
 *
 * REASONING CHAIN:
 * 1. User starts workflow (code, publish, sprint, etc.)
 * 2. WorkflowCheck.checkGitStatus() executes git commands
 * 3. Parse output into structured GitStatus
 * 4. Cache for 30 seconds (git doesn't change that fast)
 * 5. Include in workflow prerequisites with appropriate severity
 * 6. Code workflow: warn if dirty (⚠️), Publish workflow: block if dirty (❌)
 */
export interface GitStatus {
	uncommittedFiles: string[];  // List of modified/untracked files
	currentBranch: string;  // Branch name (e.g., "master", "feature/proto-004")
	isMainBranch: boolean;  // true if master/main
	hasUnpushedCommits: boolean;  // Local commits not pushed to remote
	unpushedCommitCount: number;  // Number of commits ahead of remote
	hasMergeConflicts: boolean;  // Merge conflicts present
	conflictFiles: string[];  // Files with conflicts (UU status)
	isClean: boolean;  // No uncommitted changes
	ahead: number;  // Commits ahead of remote
	behind: number;  // Commits behind remote
}

/**
 * WorkflowCheck Service
 *
 * DESIGN DECISION: Orchestrates multiple services (ConfidenceScorer, TestValidator, Git)
 * WHY: Pattern-INTEGRATION-001 - Multi-service orchestration with graceful degradation
 */
export class WorkflowCheck {
	private confidenceScorer: ConfidenceScorer;
	private testValidator: TestValidator;
	private logger: MiddlewareLogger;
	private cache: Map<string, WorkflowCheckResult>;
	private gitStatusCache: { status: GitStatus; timestamp: number } | null = null;
	private readonly GIT_CACHE_TTL = 30000; // 30 seconds

	constructor(
		confidenceScorer?: ConfidenceScorer,
		testValidator?: TestValidator,
		logger?: MiddlewareLogger
	) {
		this.confidenceScorer = confidenceScorer || new ConfidenceScorer();
		this.testValidator = testValidator || new TestValidator();
		this.logger = logger || MiddlewareLogger.getInstance();
		this.cache = new Map();
	}

	/**
	 * Check workflow prerequisites
	 *
	 * DESIGN DECISION: <500ms target, caching for repeated checks
	 * WHY: Pattern-COMM-001 performance requirement
	 *
	 * @param workflowType - Type of workflow to check
	 * @param context - Context for checking (varies by workflow type)
	 * @returns WorkflowCheckResult with prerequisites, confidence, gaps, plan
	 */
	public async checkWorkflow(
		workflowType: WorkflowType,
		context: WorkflowContext
	): Promise<WorkflowCheckResult> {
		const startTime = this.logger.startOperation('WorkflowCheck.checkWorkflow', {
			workflowType,
			context
		});

		try {
			// Check cache first (>80% hit rate target)
			const cacheKey = this.generateCacheKey(workflowType, context);
			const cached = this.cache.get(cacheKey);
			if (cached) {
				this.logger.info(`Cache hit for workflow check: ${workflowType}`);
				return cached;
			}

			// Perform check with timeout protection (10s max)
			const result = await this.executeWithTimeout(
				this.performCheck(workflowType, context, cacheKey),
				10000
			);

			// Cache result
			this.cache.set(cacheKey, result);

			this.logger.endOperation('WorkflowCheck.checkWorkflow', startTime, {
				workflowType,
				confidence: result.confidence,
				criticalJunction: result.criticalJunction
			});

			return result;
		} catch (error) {
			this.logger.failOperation('WorkflowCheck.checkWorkflow', startTime, error);

			// Return partial result on error (graceful degradation)
			return this.createPartialResult(workflowType, context, error as Error);
		}
	}

	/**
	 * Check Git Status - Get comprehensive git repository state
	 *
	 * PROTO-004: Git Workflow Integration
	 * DESIGN DECISION: Cache for 30s, execute git commands in sequence
	 * WHY: Git commands can be slow (200-400ms total), caching improves performance
	 *
	 * REASONING CHAIN:
	 * 1. Check cache first (30s TTL)
	 * 2. Execute git commands: status, branch, log, rev-list
	 * 3. Parse output into structured GitStatus
	 * 4. Handle errors gracefully (not in repo, command failures)
	 * 5. Log performance (target <500ms)
	 * 6. Cache result and return
	 *
	 * @returns GitStatus with all repository state
	 */
	public async checkGitStatus(): Promise<GitStatus> {
		const startTime = this.logger.startOperation('WorkflowCheck.checkGitStatus', {});

		try {
			// Check cache first
			const now = Date.now();
			if (this.gitStatusCache && (now - this.gitStatusCache.timestamp < this.GIT_CACHE_TTL)) {
				this.logger.info('Git status cache hit');
				return this.gitStatusCache.status;
			}

			// Execute git commands
			const [uncommittedFiles, currentBranch, conflictFiles, aheadBehind] = await Promise.all([
				this.getUncommittedFiles(),
				this.getCurrentBranch(),
				this.getConflictFiles(),
				this.getAheadBehindCount()
			]);

			// Build GitStatus object
			const gitStatus: GitStatus = {
				uncommittedFiles,
				currentBranch,
				isMainBranch: currentBranch === 'master' || currentBranch === 'main',
				hasUnpushedCommits: aheadBehind.ahead > 0,
				unpushedCommitCount: aheadBehind.ahead,
				hasMergeConflicts: conflictFiles.length > 0,
				conflictFiles,
				isClean: uncommittedFiles.length === 0 && conflictFiles.length === 0,
				ahead: aheadBehind.ahead,
				behind: aheadBehind.behind
			};

			// Cache result
			this.gitStatusCache = {
				status: gitStatus,
				timestamp: now
			};

			this.logger.endOperation('WorkflowCheck.checkGitStatus', startTime, {
				isClean: gitStatus.isClean,
				currentBranch: gitStatus.currentBranch,
				uncommittedCount: gitStatus.uncommittedFiles.length
			});

			return gitStatus;
		} catch (error) {
			this.logger.failOperation('WorkflowCheck.checkGitStatus', startTime, error);

			// Return safe defaults on error
			return {
				uncommittedFiles: [],
				currentBranch: 'unknown',
				isMainBranch: false,
				hasUnpushedCommits: false,
				unpushedCommitCount: 0,
				hasMergeConflicts: false,
				conflictFiles: [],
				isClean: true,
				ahead: 0,
				behind: 0
			};
		}
	}

	/**
	 * Get list of uncommitted files from git status
	 */
	private async getUncommittedFiles(): Promise<string[]> {
		try {
			const { stdout } = await exec('git status --porcelain');
			if (!stdout.trim()) {
				return [];
			}

			// Parse git status --porcelain output
			// Format: XY file_path (XY = status codes)
			return stdout
				.trim()
				.split('\n')
				.map(line => line.substring(3).trim())  // Remove status codes
				.filter(file => file.length > 0);
		} catch (error) {
			// Not in git repo or git not installed
			return [];
		}
	}

	/**
	 * Get current git branch name
	 */
	private async getCurrentBranch(): Promise<string> {
		try {
			const { stdout } = await exec('git rev-parse --abbrev-ref HEAD');
			return stdout.trim();
		} catch (error) {
			return 'unknown';
		}
	}

	/**
	 * Get files with merge conflicts (UU status)
	 */
	private async getConflictFiles(): Promise<string[]> {
		try {
			const { stdout } = await exec('git status --porcelain');
			if (!stdout.trim()) {
				return [];
			}

			// Parse for conflict markers: UU, AA, DD, AU, UA, DU, UD
			return stdout
				.trim()
				.split('\n')
				.filter(line => {
					const status = line.substring(0, 2);
					return status === 'UU' || status === 'AA' || status === 'DD' ||
					       status === 'AU' || status === 'UA' || status === 'DU' || status === 'UD';
				})
				.map(line => line.substring(3).trim());
		} catch (error) {
			return [];
		}
	}

	/**
	 * Get commits ahead/behind remote
	 */
	private async getAheadBehindCount(): Promise<{ ahead: number; behind: number }> {
		try {
			// Try to get ahead/behind from git rev-list
			const { stdout } = await exec('git rev-list --left-right --count HEAD...@{u}');
			const parts = stdout.trim().split('\t');

			if (parts.length === 2) {
				return {
					ahead: parseInt(parts[0], 10) || 0,
					behind: parseInt(parts[1], 10) || 0
				};
			}

			return { ahead: 0, behind: 0 };
		} catch (error) {
			// No upstream or not in git repo
			return { ahead: 0, behind: 0 };
		}
	}

	/**
	 * Perform actual workflow check (separated for timeout wrapping)
	 */
	private async performCheck(
		workflowType: WorkflowType,
		context: WorkflowContext,
		cacheKey: string
	): Promise<WorkflowCheckResult> {
		const prerequisites: PrerequisiteStatus[] = [];
		let confidence = 0.5;  // Default confidence
		const gaps: string[] = [];
		let criticalJunction = false;

		// Check prerequisites based on workflow type
		switch (workflowType) {
			case 'code':
				await this.checkCodeWorkflow(context, prerequisites, gaps);
				confidence = await this.calculateConfidence(context);
				criticalJunction = confidence < 0.80;  // Low confidence = critical
				break;

			case 'sprint':
				await this.checkSprintWorkflow(context, prerequisites, gaps);
				confidence = 0.85;  // Sprint planning is straightforward
				criticalJunction = false;
				break;

			case 'publish':
				await this.checkPublishWorkflow(context, prerequisites, gaps);
				confidence = await this.calculateConfidence(context);
				criticalJunction = true;  // Publish ALWAYS critical (high-impact)
				break;

			case 'test':
				await this.checkTestWorkflow(context, prerequisites, gaps);
				confidence = 0.90;  // Test workflow is straightforward
				criticalJunction = false;
				break;

			case 'docs':
				await this.checkDocsWorkflow(context, prerequisites, gaps);
				confidence = 0.85;  // Documentation straightforward
				criticalJunction = false;
				break;

			case 'git':
				await this.checkGitWorkflow(context, prerequisites, gaps);
				confidence = 0.90;  // Git workflow straightforward
				criticalJunction = context.isMainBranch || false;  // Main branch = critical
				break;
		}

		// Generate execution plan
		const plan = this.generatePlan(workflowType, prerequisites, gaps);

		return {
			workflowType,
			prerequisites,
			confidence,
			gaps,
			criticalJunction,
			plan,
			timestamp: Date.now(),
			cacheKey
		};
	}

	/**
	 * Check code workflow prerequisites
	 *
	 * DESIGN DECISION: Validate TDD, tests, sprint task, confidence
	 * WHY: Most common workflow - code development
	 */
	private async checkCodeWorkflow(
		context: WorkflowContext,
		prerequisites: PrerequisiteStatus[],
		gaps: string[]
	): Promise<void> {
		// Prerequisite 1: Sprint task exists
		if (context.taskId) {
			prerequisites.push({
				name: 'Sprint task assigned',
				status: '✅',
				details: `Task ${context.taskId}: ${context.taskName || 'Unknown'}`,
				remediation: null,
				impact: 'blocking'
			});
		} else {
			prerequisites.push({
				name: 'Sprint task assigned',
				status: '❌',
				details: 'No sprint task associated with this work',
				remediation: 'Create task in ACTIVE_SPRINT.toml or work without sprint tracking',
				impact: 'suboptimal'
			});
			gaps.push('No sprint task');
		}

		// Prerequisite 2: Tests exist (TDD requirement)
		if (context.testFilesExist) {
			// Validate tests with TestValidator (graceful degradation)
			try {
				const validation = await this.testValidator.validate({
					id: context.taskId || 'unknown',
					name: context.taskName || 'Unknown',
					category: 'infrastructure'
				} as any);

				if (validation.valid) {
					prerequisites.push({
						name: 'Tests exist and pass (TDD)',
						status: '✅',
						details: 'All tests passing',
						remediation: null,
						impact: 'blocking'
					});
				} else {
					prerequisites.push({
						name: 'Tests exist and pass (TDD)',
						status: '❌',
						details: `Tests failing: ${validation.errors.join(', ')}`,
						remediation: 'Fix failing tests before proceeding. Run: npm test',
						impact: 'blocking'
					});
					gaps.push('Tests failing');
				}
			} catch (error) {
				// TestValidator failed - graceful degradation
				prerequisites.push({
					name: 'Tests exist and pass (TDD)',
					status: '❌',
					details: `Test validation failed: ${(error as Error).message}`,
					remediation: 'Manually verify tests pass with: npm test',
					impact: 'degraded'
				});
				gaps.push('Test validation unavailable');
			}
		} else {
			prerequisites.push({
				name: 'Tests exist and pass (TDD)',
				status: '❌',
				details: 'No test files found',
				remediation: 'Write tests FIRST (TDD RED phase), then implement',
				impact: 'blocking'
			});
			gaps.push('No tests');
		}

		// Prerequisite 3: Git working directory clean
		await this.addGitStatusToPrerequisites(context, prerequisites, gaps);

		// Prerequisite 4: Confidence check
		await this.checkConfidence(context, prerequisites, gaps);
	}

	/**
	 * Check sprint workflow prerequisites
	 */
	private async checkSprintWorkflow(
		context: WorkflowContext,
		prerequisites: PrerequisiteStatus[],
		gaps: string[]
	): Promise<void> {
		// Prerequisite 1: Workspace analyzed
		if (context.workspaceAnalyzed) {
			prerequisites.push({
				name: 'Workspace analyzed',
				status: '✅',
				details: 'Workspace context gathered successfully',
				remediation: null,
				impact: 'blocking'
			});
		} else {
			prerequisites.push({
				name: 'Workspace analyzed',
				status: '❌',
				details: 'Workspace not analyzed',
				remediation: 'Run workspace analysis before sprint planning',
				impact: 'blocking'
			});
			gaps.push('Workspace not analyzed');
		}

		// Prerequisite 2: Git status clean
		await this.addGitStatusToPrerequisites(context, prerequisites, gaps);

		// Prerequisite 3: Skills available
		if (context.skillsAvailable) {
			prerequisites.push({
				name: 'Skills available',
				status: '✅',
				details: 'AgentRegistry loaded with available agents',
				remediation: null,
				impact: 'blocking'
			});
		} else {
			prerequisites.push({
				name: 'Skills available',
				status: '❌',
				details: 'AgentRegistry not initialized',
				remediation: 'Ensure agents loaded from internal/agents/',
				impact: 'blocking'
			});
			gaps.push('Skills unavailable');
		}
	}

	/**
	 * Check publish workflow prerequisites
	 */
	private async checkPublishWorkflow(
		context: WorkflowContext,
		prerequisites: PrerequisiteStatus[],
		gaps: string[]
	): Promise<void> {
		// Prerequisite 1: Tests passing
		if (context.testsPassing) {
			prerequisites.push({
				name: 'All tests passing',
				status: '✅',
				details: 'Test suite passed',
				remediation: null,
				impact: 'blocking'
			});
		} else {
			prerequisites.push({
				name: 'All tests passing',
				status: '❌',
				details: 'Tests not passing or not run',
				remediation: 'Run: npm test and fix all failures',
				impact: 'blocking'
			});
			gaps.push('Tests not passing');
		}

		// Prerequisite 2: Artifacts compiled
		if (context.artifactsCompiled) {
			prerequisites.push({
				name: 'Artifacts compiled',
				status: '✅',
				details: 'TypeScript compiled successfully',
				remediation: null,
				impact: 'blocking'
			});
		} else {
			prerequisites.push({
				name: 'Artifacts compiled',
				status: '❌',
				details: 'Compilation not verified',
				remediation: 'Run: npm run compile and fix errors',
				impact: 'blocking'
			});
			gaps.push('Compilation not verified');
		}

		// Prerequisite 3: Git tag ready
		if (context.gitTagReady) {
			prerequisites.push({
				name: 'Git tag ready',
				status: '✅',
				details: 'Version tag prepared',
				remediation: null,
				impact: 'blocking'
			});
		} else {
			prerequisites.push({
				name: 'Git tag ready',
				status: '❌',
				details: 'Git tag not created',
				remediation: 'Create version tag: git tag v0.x.x',
				impact: 'blocking'
			});
			gaps.push('Git tag not ready');
		}
	}

	/**
	 * Check test workflow prerequisites
	 */
	private async checkTestWorkflow(
		context: WorkflowContext,
		prerequisites: PrerequisiteStatus[],
		gaps: string[]
	): Promise<void> {
		// Prerequisite 1: Test runner configured
		if (context.testRunnerConfigured) {
			prerequisites.push({
				name: 'Test runner configured',
				status: '✅',
				details: 'Test runner (Mocha) configured',
				remediation: null,
				impact: 'blocking'
			});
		} else {
			prerequisites.push({
				name: 'Test runner configured',
				status: '❌',
				details: 'Test runner not configured',
				remediation: 'Configure Mocha in package.json',
				impact: 'blocking'
			});
			gaps.push('Test runner not configured');
		}

		// Prerequisite 2: Test files exist
		if (context.testFilesExist) {
			prerequisites.push({
				name: 'Test files exist',
				status: '✅',
				details: 'Test files found',
				remediation: null,
				impact: 'blocking'
			});
		} else {
			prerequisites.push({
				name: 'Test files exist',
				status: '❌',
				details: 'No test files found',
				remediation: 'Create test files in test/ directory',
				impact: 'blocking'
			});
			gaps.push('No test files');
		}

		// Prerequisite 3: Coverage tool available
		if (context.coverageToolAvailable) {
			prerequisites.push({
				name: 'Coverage tool available',
				status: '✅',
				details: 'Coverage tool configured',
				remediation: null,
				impact: 'suboptimal'
			});
		} else {
			prerequisites.push({
				name: 'Coverage tool available',
				status: '⚠️',
				details: 'Coverage tool not configured',
				remediation: 'Optional: Configure c8 or nyc for coverage',
				impact: 'suboptimal'
			});
		}
	}

	/**
	 * Check documentation workflow prerequisites
	 */
	private async checkDocsWorkflow(
		context: WorkflowContext,
		prerequisites: PrerequisiteStatus[],
		gaps: string[]
	): Promise<void> {
		// Prerequisite 1: Reusability assessed
		if (context.reusability) {
			const shouldCreatePattern = context.reusability === 'high';
			prerequisites.push({
				name: 'Reusability assessed',
				status: '✅',
				details: `Reusability: ${context.reusability}${shouldCreatePattern ? ' → Create pattern' : ' → Chat explanation'}`,
				remediation: null,
				impact: 'suboptimal'
			});
		} else {
			prerequisites.push({
				name: 'Reusability assessed',
				status: '❌',
				details: 'Reusability not assessed',
				remediation: 'Assess: High (pattern), Medium (ask user), Low/Ephemeral (chat)',
				impact: 'suboptimal'
			});
			gaps.push('Reusability not assessed');
		}

		// Prerequisite 2: Pattern template (if high reusability)
		if (context.reusability === 'high') {
			if (context.patternTemplateExists) {
				prerequisites.push({
					name: 'Pattern template available',
					status: '✅',
					details: 'Pattern template exists',
					remediation: null,
					impact: 'suboptimal'
				});
			} else {
				prerequisites.push({
					name: 'Pattern template available',
					status: '⚠️',
					details: 'Pattern template not found',
					remediation: 'Create pattern in docs/patterns/',
					impact: 'suboptimal'
				});
			}
		}
	}

	/**
	 * Check git workflow prerequisites
	 */
	private async checkGitWorkflow(
		context: WorkflowContext,
		prerequisites: PrerequisiteStatus[],
		gaps: string[]
	): Promise<void> {
		// Prerequisite 1: Not on main branch (if pushing)
		if (context.operation === 'push') {
			if (context.isMainBranch) {
				prerequisites.push({
					name: 'Branch safety',
					status: '⚠️',
					details: 'Pushing to main/master branch',
					remediation: 'Consider using feature branch instead',
					impact: 'degraded'
				});
			} else {
				prerequisites.push({
					name: 'Branch safety',
					status: '✅',
					details: `On feature branch: ${context.currentBranch}`,
					remediation: null,
					impact: 'blocking'
				});
			}
		}

		// Prerequisite 2: No uncommitted changes (if applicable)
		if (context.hasUncommittedChanges && (context.operation === 'merge' || context.operation === 'rebase')) {
			prerequisites.push({
				name: 'Uncommitted changes',
				status: '❌',
				details: 'Uncommitted changes detected',
				remediation: 'Commit or stash changes before merge/rebase',
				impact: 'blocking'
			});
			gaps.push('Uncommitted changes');
		}
	}

	/**
	 * Add git status to prerequisites (helper for workflow checks)
	 *
	 * PROTO-004: Enhanced with comprehensive git integration
	 * Uses public checkGitStatus() method for rich git visibility
	 */
	private async addGitStatusToPrerequisites(
		context: WorkflowContext,
		prerequisites: PrerequisiteStatus[],
		gaps: string[]
	): Promise<void> {
		// Test mode: force error
		if (context.forceGitError) {
			prerequisites.push({
				name: 'Git repository status',
				status: '❌',
				details: 'Git command failed: Simulated error',
				remediation: 'Check git installation and repository status',
				impact: 'degraded'
			});
			gaps.push('Git error');
			return;
		}

		// Get comprehensive git status using new PROTO-004 integration
		const gitStatus = await this.checkGitStatus();

		// Build detailed status message
		const details: string[] = [];
		details.push(`Branch: ${gitStatus.currentBranch}${gitStatus.isMainBranch ? ' (main)' : ''}`);

		if (!gitStatus.isClean) {
			details.push(`${gitStatus.uncommittedFiles.length} uncommitted file(s)`);
			// Show first 3 files
			const filesToShow = gitStatus.uncommittedFiles.slice(0, 3);
			filesToShow.forEach(file => details.push(`  - ${file}`));
			if (gitStatus.uncommittedFiles.length > 3) {
				details.push(`  ... and ${gitStatus.uncommittedFiles.length - 3} more`);
			}
		} else {
			details.push('Working directory clean');
		}

		if (gitStatus.hasMergeConflicts) {
			details.push(`⚠️ ${gitStatus.conflictFiles.length} merge conflict(s)`);
		}

		if (gitStatus.hasUnpushedCommits) {
			details.push(`${gitStatus.unpushedCommitCount} unpushed commit(s)`);
		}

		if (gitStatus.behind > 0) {
			details.push(`${gitStatus.behind} commit(s) behind remote`);
		}

		// Determine status and impact
		let status: '✅' | '❌' | '⚠️' = '✅';
		let impact: 'blocking' | 'degraded' | 'suboptimal' = 'suboptimal';
		let remediation: string | null = null;

		if (gitStatus.hasMergeConflicts) {
			status = '❌';
			impact = 'blocking';
			remediation = 'Resolve merge conflicts before proceeding: git status';
			gaps.push('Merge conflicts');
		} else if (!gitStatus.isClean) {
			status = '⚠️';
			impact = 'suboptimal';
			remediation = 'Consider committing changes: git add . && git commit -m "..."';
		}

		prerequisites.push({
			name: 'Git repository status',
			status,
			details: details.join('\n'),
			remediation,
			impact
		});
	}

	/**
	 * Check confidence using ConfidenceScorer (with graceful degradation)
	 */
	private async checkConfidence(
		context: WorkflowContext,
		prerequisites: PrerequisiteStatus[],
		gaps: string[]
	): Promise<void> {
		if (!context.taskId) {
			// No task = can't score confidence
			return;
		}

		try {
			const taskScore = await this.confidenceScorer.scoreTask({
				id: context.taskId,
				name: context.taskName || 'Unknown',
				category: 'infrastructure'
			} as any, false);

			if (taskScore.confidence >= 0.80) {
				prerequisites.push({
					name: 'Confidence score',
					status: '✅',
					details: `Confidence: ${(taskScore.confidence * 100).toFixed(0)}% (HIGH)`,
					remediation: null,
					impact: 'suboptimal'
				});
			} else if (taskScore.confidence >= 0.50) {
				prerequisites.push({
					name: 'Confidence score',
					status: '⚠️',
					details: `Confidence: ${(taskScore.confidence * 100).toFixed(0)}% (MEDIUM). Gaps: ${taskScore.gaps.join(', ')}`,
					remediation: 'Fill gaps before proceeding',
					impact: 'degraded'
				});
				gaps.push(...taskScore.gaps);
			} else {
				prerequisites.push({
					name: 'Confidence score',
					status: '❌',
					details: `Confidence: ${(taskScore.confidence * 100).toFixed(0)}% (LOW). Gaps: ${taskScore.gaps.join(', ')}`,
					remediation: 'Regenerate task with complete information',
					impact: 'blocking'
				});
				gaps.push(...taskScore.gaps);
			}
		} catch (error) {
			// ConfidenceScorer failed - graceful degradation
			prerequisites.push({
				name: 'Confidence score',
				status: '⚠️',
				details: `ConfidenceScorer unavailable: ${(error as Error).message}`,
				remediation: 'Manually verify task completeness',
				impact: 'degraded'
			});
		}
	}

	/**
	 * Calculate overall confidence for workflow
	 */
	private async calculateConfidence(context: WorkflowContext): Promise<number> {
		if (!context.taskId) {
			return 0.5;  // Default confidence without task
		}

		try {
			const taskScore = await this.confidenceScorer.scoreTask({
				id: context.taskId,
				name: context.taskName || 'Unknown',
				category: 'infrastructure'
			} as any, false);

			return taskScore.confidence;
		} catch (error) {
			// ConfidenceScorer failed - default confidence
			this.logger.warn(`ConfidenceScorer failed: ${(error as Error).message}`);
			return 0.5;
		}
	}

	/**
	 * Generate execution plan based on workflow type
	 */
	private generatePlan(
		workflowType: WorkflowType,
		prerequisites: PrerequisiteStatus[],
		gaps: string[]
	): string[] {
		const plan: string[] = [];

		// Add gap filling steps
		if (gaps.length > 0) {
			plan.push(`Fix gaps: ${gaps.join(', ')}`);
		}

		// Add workflow-specific steps
		switch (workflowType) {
			case 'code':
				plan.push('1. Write tests (TDD RED phase)');
				plan.push('2. Implement code (TDD GREEN phase)');
				plan.push('3. Refactor and optimize (TDD REFACTOR phase)');
				plan.push('4. Compile TypeScript');
				plan.push('5. Run tests and verify passing');
				plan.push('6. Commit changes');
				break;

			case 'sprint':
				plan.push('1. Analyze workspace context');
				plan.push('2. Load agent registry');
				plan.push('3. Generate sprint TOML');
				plan.push('4. Create feature branch');
				plan.push('5. Commit sprint file');
				break;

			case 'publish':
				plan.push('1. Run full test suite');
				plan.push('2. Compile all packages');
				plan.push('3. Create git tag');
				plan.push('4. Publish to npm');
				plan.push('5. Create GitHub release');
				plan.push('6. Upload artifacts');
				break;

			case 'test':
				plan.push('1. Configure test runner');
				plan.push('2. Write test cases');
				plan.push('3. Run tests');
				plan.push('4. Check coverage');
				break;

			case 'docs':
				plan.push('1. Assess reusability');
				plan.push('2. Create pattern document (if high reusability)');
				plan.push('3. Add cross-references');
				plan.push('4. Update index');
				break;

			case 'git':
				plan.push('1. Verify branch');
				plan.push('2. Check uncommitted changes');
				plan.push('3. Execute git operation');
				plan.push('4. Verify result');
				break;
		}

		return plan;
	}

	/**
	 * Generate cache key from workflow type and context
	 */
	private generateCacheKey(workflowType: WorkflowType, context: WorkflowContext): string {
		const contextStr = JSON.stringify(context);
		const hash = this.simpleHash(contextStr);
		return `${workflowType}:${hash}`;
	}

	/**
	 * Simple hash function for cache keys
	 */
	private simpleHash(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash;  // Convert to 32-bit integer
		}
		return Math.abs(hash).toString(36);
	}

	/**
	 * Execute with timeout protection
	 *
	 * DESIGN DECISION: 10s max per workflow check
	 * WHY: Prevent hanging operations, provide partial results
	 */
	private async executeWithTimeout<T>(
		promise: Promise<T>,
		timeoutMs: number
	): Promise<T> {
		return Promise.race([
			promise,
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
			)
		]);
	}

	/**
	 * Create partial result on error
	 *
	 * DESIGN DECISION: Graceful degradation on failure
	 * WHY: Always return something useful, never crash workflow
	 */
	private createPartialResult(
		workflowType: WorkflowType,
		context: WorkflowContext,
		error: Error
	): WorkflowCheckResult {
		return {
			workflowType,
			prerequisites: [
				{
					name: 'Workflow check',
					status: '❌',
					details: `Workflow check failed: ${error.message}`,
					remediation: 'Check logs and retry',
					impact: 'degraded'
				}
			],
			confidence: 0.3,  // Low confidence on error
			gaps: ['Workflow check failed'],
			criticalJunction: true,  // Treat as critical when failing
			plan: ['Fix workflow check error', 'Retry operation'],
			timestamp: Date.now(),
			cacheKey: this.generateCacheKey(workflowType, context)
		};
	}
}
