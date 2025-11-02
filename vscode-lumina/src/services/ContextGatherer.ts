/**
 * Context Gatherer Service
 *
 * DESIGN DECISION: Automate context discovery for sprint tasks
 * WHY: Pattern-CONTEXT-002 (Auto-Context Gathering) - Manual context gathering is slow/error-prone
 *
 * REASONING CHAIN:
 * 1. Manual context gathering: Which files? Which patterns? Dependencies? (5-10 min)
 * 2. ContextGatherer automates: description → keywords → files → patterns → dependencies (<1s)
 * 3. File discovery: Glob (name patterns) + Grep (content search) → top 10 files
 * 4. Pattern identification: PatternLibrary semantic search → top 3-5 patterns
 * 5. Dependency analysis: File overlap + logical order → task dependencies
 * 6. Error handling injection: Category-specific requirements (API, DB, UI)
 * 7. Git context: branch, uncommitted changes, recent commits
 * 8. Complexity estimation: 1-10 scale based on task metadata
 *
 * PATTERN: Pattern-CONTEXT-002 (Auto-Context Gathering)
 * PATTERN: Pattern-ERROR-HANDLING-001 (Mandatory Error Coverage)
 * RELATED: MID-005 (Context Gatherer sprint task)
 *
 * @module services/ContextGatherer
 */

import * as fs from 'fs';
import * as path from 'path';
import { PatternLibrary } from './PatternLibrary';
import type { Pattern } from './PatternLibrary';

/**
 * Task input (minimal info from sprint TOML)
 */
export interface TaskInput {
	id: string;
	name: string;
	category: string;
	description: string;
	severity?: string;
}

/**
 * Git context for task
 */
export interface GitContext {
	branch: string;
	uncommittedChanges: string[];
	recentCommits: Array<{
		hash: string;
		message: string;
		author: string;
		date: string;
	}>;
}

/**
 * Complete task context (output)
 */
export interface TaskContext {
	id: string;
	name: string;
	category: string;
	description: string;
	files: string[];
	patterns: Array<{
		id: string;
		description: string;
		relevance: number;
	}>;
	dependencies: string[]; // Task IDs this task depends on
	errorHandling: string[];
	gitContext: GitContext;
	complexity: number; // 1-10 scale
}

/**
 * ContextGatherer
 *
 * Gathers complete context for tasks automatically
 */
export class ContextGatherer {
	private patternLibrary: PatternLibrary;
	private projectRoot: string;

	constructor(patternLibrary: PatternLibrary, projectRoot: string) {
		this.patternLibrary = patternLibrary;
		this.projectRoot = projectRoot;
	}

	/**
	 * Extract keywords from task description
	 *
	 * DESIGN DECISION: Extract keywords for file/content search
	 * WHY: Keywords drive Glob/Grep searches
	 */
	extractKeywords(description: string): string[] {
		// Remove common stop words and extract meaningful terms
		const stopWords = new Set([
			'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
			'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
			'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
			'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
			'that', 'these', 'those', 'it', 'its', 'create', 'implement', 'add'
		]);

		// Tokenize and filter
		const tokens = description
			.toLowerCase()
			.replace(/[^\w\s-]/g, ' ')
			.split(/\s+/)
			.filter(token => token.length > 2 && !stopWords.has(token));

		// Remove duplicates and return
		return Array.from(new Set(tokens));
	}

	/**
	 * Discover relevant files via Glob and Grep
	 *
	 * DESIGN DECISION: Combine Glob (pattern-based) and Grep (content-based)
	 * WHY: Glob finds files by name, Grep finds by content
	 */
	async discoverFiles(keywords: string[]): Promise<string[]> {
		const { glob } = require('glob');
		const fileSet = new Set<string>();

		try {
			// Strategy 1: Find files by name pattern
			for (const keyword of keywords.slice(0, 3)) { // Top 3 keywords only
				try {
					// Search for files with keyword in name
					const pattern = `**/*${keyword}*.{ts,js,tsx,jsx,md}`;
					const matches = await glob(pattern, {
						cwd: this.projectRoot,
						ignore: ['**/node_modules/**', '**/out/**', '**/dist/**', '**/.git/**'],
						nodir: true
					});

					matches.slice(0, 5).forEach((file: string) => fileSet.add(file));
				} catch (error) {
					// Continue with next keyword
				}
			}

			// Limit to top 10 files
			const files = Array.from(fileSet).slice(0, 10);

			// Validate files exist
			return files.filter(file => {
				const fullPath = path.join(this.projectRoot, file);
				return fs.existsSync(fullPath);
			});
		} catch (error) {
			console.warn('ContextGatherer: File discovery failed:', error);
			return [];
		}
	}

	/**
	 * Identify relevant patterns via PatternLibrary
	 *
	 * DESIGN DECISION: Use PatternLibrary semantic search for top 3-5 patterns
	 * WHY: Patterns provide context and best practices
	 */
	async identifyPatterns(task: TaskInput): Promise<Array<{ id: string; description: string; relevance: number }>> {
		try {
			// Use PatternLibrary to search for patterns
			const query = `${task.name} ${task.description} ${task.category}`;
			const searchResults = this.patternLibrary.searchPatterns(query, 5);

			return searchResults.map(result => ({
				id: result.pattern.id,
				description: result.pattern.description || '',
				relevance: result.relevance
			}));
		} catch (error) {
			console.warn('ContextGatherer: Pattern identification failed:', error);

			// Fallback: Find patterns by category
			const categoryPatterns = this.patternLibrary.getAllPatterns()
				.filter((p: Pattern) => p.id.includes(task.category.toUpperCase()))
				.slice(0, 3);

			return categoryPatterns.map((pattern: Pattern) => ({
				id: pattern.id,
				description: pattern.description || '',
				relevance: 0.5
			}));
		}
	}

	/**
	 * Analyze dependencies between tasks
	 *
	 * DESIGN DECISION: Detect dependencies via file overlap and logical order
	 * WHY: Tasks modifying same files likely have dependencies
	 */
	analyzeDependencies(contexts: TaskContext[]): Array<{ taskId: string; dependsOn: string[] }> {
		const dependencies: Array<{ taskId: string; dependsOn: string[] }> = [];

		for (const context of contexts) {
			const dependsOn: string[] = [];

			// Check for file overlap with other tasks
			for (const otherContext of contexts) {
				if (context.id === otherContext.id) {
					continue;
				}

				// Check if files overlap
				const overlap = context.files.some(file =>
					otherContext.files.includes(file)
				);

				if (overlap) {
					// Logical dependency: Database before API, API before UI
					if (this.shouldDependOn(context.category, otherContext.category)) {
						dependsOn.push(otherContext.id);
					}
				}
			}

			dependencies.push({
				taskId: context.id,
				dependsOn
			});
		}

		return dependencies;
	}

	/**
	 * Determine if task A should depend on task B based on categories
	 */
	private shouldDependOn(categoryA: string, categoryB: string): boolean {
		const dependencyOrder: Record<string, number> = {
			'Database': 1,
			'API': 2,
			'UI': 3,
			'Infrastructure': 0,
			'Test': 4
		};

		const orderA = dependencyOrder[categoryA] || 99;
		const orderB = dependencyOrder[categoryB] || 99;

		return orderA > orderB;
	}

	/**
	 * Inject error handling requirements by category
	 *
	 * DESIGN DECISION: Category-specific error handling requirements
	 * WHY: Pattern-ERROR-HANDLING-001 - Mandatory error coverage per category
	 */
	private injectErrorHandling(category: string): string[] {
		const errorHandlingByCategory: Record<string, string[]> = {
			'API': [
				'Input validation (validate all request parameters)',
				'Authentication errors (401 Unauthorized)',
				'Authorization errors (403 Forbidden)',
				'Rate limiting (429 Too Many Requests)',
				'Bad request handling (400 Bad Request)',
				'Server errors (500 Internal Server Error)',
				'Timeout handling (503 Service Unavailable)'
			],
			'Database': [
				'Connection errors (retry with exponential backoff)',
				'Transaction rollback on failure',
				'Constraint violation handling',
				'Deadlock detection and retry',
				'Query timeout handling',
				'Connection pool exhaustion'
			],
			'UI': [
				'Loading states (show spinner during async operations)',
				'Error boundaries (catch component errors)',
				'Empty states (no data to display)',
				'Accessibility (ARIA labels, keyboard navigation)',
				'Network errors (show retry button)',
				'Form validation errors (inline messages)'
			],
			'Infrastructure': [
				'Resource limits (CPU, memory, disk)',
				'Timeout handling (connection, request)',
				'Circuit breaker pattern (prevent cascade failures)',
				'Health checks (readiness, liveness)',
				'Graceful shutdown (drain connections)',
				'Retry logic with exponential backoff'
			],
			'Test': [
				'Assertion failures (clear error messages)',
				'Mock failures (verify mock setup)',
				'Cleanup on error (release resources)',
				'Timeout handling (slow tests)',
				'Setup/teardown errors'
			]
		};

		return errorHandlingByCategory[category] || [
			'Handle errors gracefully',
			'Log errors with context',
			'Show user-friendly error messages',
			'Prevent error propagation'
		];
	}

	/**
	 * Gather git context
	 *
	 * DESIGN DECISION: Include branch, uncommitted changes, recent commits
	 * WHY: Git context helps understand current work
	 */
	private async gatherGitContext(): Promise<GitContext> {
		const { execSync } = require('child_process');

		try {
			// Get current branch
			const branch = execSync('git branch --show-current', {
				cwd: this.projectRoot,
				encoding: 'utf-8'
			}).trim();

			// Get uncommitted changes
			const statusOutput = execSync('git status --porcelain', {
				cwd: this.projectRoot,
				encoding: 'utf-8'
			});

			const uncommittedChanges = statusOutput
				.split('\n')
				.filter((line: string) => line.trim())
				.map((line: string) => line.substring(3)); // Remove status prefix

			// Get recent commits (last 5)
			const logOutput = execSync('git log -5 --format=%H|%s|%an|%ai', {
				cwd: this.projectRoot,
				encoding: 'utf-8'
			});

			const recentCommits = logOutput
				.split('\n')
				.filter((line: string) => line.trim())
				.map((line: string) => {
					const [hash, message, author, date] = line.split('|');
					return { hash, message, author, date };
				});

			return {
				branch,
				uncommittedChanges,
				recentCommits
			};
		} catch (error) {
			// Not in git repo or git command failed
			return {
				branch: 'unknown',
				uncommittedChanges: [],
				recentCommits: []
			};
		}
	}

	/**
	 * Estimate task complexity
	 *
	 * DESIGN DECISION: 1-10 scale based on task metadata
	 * WHY: Helps prioritize and estimate effort
	 */
	private estimateComplexity(task: TaskInput, patterns: any[], files: string[]): number {
		let complexity = 5; // Base complexity

		// Factor 1: Severity
		const severityWeight: Record<string, number> = {
			'critical': 3,
			'high': 2,
			'medium': 0,
			'low': -1
		};
		complexity += severityWeight[task.severity || 'medium'] || 0;

		// Factor 2: Number of patterns (more patterns = more complex)
		complexity += Math.min(patterns.length * 0.5, 2);

		// Factor 3: Number of files (more files = more complex)
		complexity += Math.min(files.length * 0.3, 2);

		// Factor 4: Keywords indicating complexity
		const description = task.description.toLowerCase();
		const complexKeywords = ['security', 'authentication', 'oauth', 'encryption', 'performance', 'scalability'];
		const hasComplexKeywords = complexKeywords.some(keyword => description.includes(keyword));
		if (hasComplexKeywords) {
			complexity += 2;
		}

		// Clamp to 1-10 range
		return Math.max(1, Math.min(10, Math.round(complexity)));
	}

	/**
	 * Gather complete context for a task
	 *
	 * DESIGN DECISION: Single method returns complete TaskContext
	 * WHY: Orchestrator needs all context at once
	 */
	async gatherContext(task: TaskInput): Promise<TaskContext> {
		try {
			// Step 1: Extract keywords
			const keywords = this.extractKeywords(task.description);

			// Step 2: Discover files
			const files = await this.discoverFiles(keywords);

			// Step 3: Identify patterns
			const patterns = await this.identifyPatterns(task);

			// Step 4: Inject error handling
			const errorHandling = this.injectErrorHandling(task.category);

			// Step 5: Gather git context
			const gitContext = await this.gatherGitContext();

			// Step 6: Estimate complexity
			const complexity = this.estimateComplexity(task, patterns, files);

			return {
				id: task.id,
				name: task.name,
				category: task.category,
				description: task.description,
				files,
				patterns,
				dependencies: [], // Populated by analyzeDependencies()
				errorHandling,
				gitContext,
				complexity
			};
		} catch (error) {
			console.error(`ContextGatherer: Failed to gather context for ${task.id}:`, error);

			// Return minimal context on error
			return {
				id: task.id,
				name: task.name,
				category: task.category,
				description: task.description,
				files: [],
				patterns: [],
				dependencies: [],
				errorHandling: this.injectErrorHandling(task.category),
				gitContext: {
					branch: 'unknown',
					uncommittedChanges: [],
					recentCommits: []
				},
				complexity: 5
			};
		}
	}
}
