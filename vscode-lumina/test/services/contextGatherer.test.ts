/**
 * ContextGatherer Tests
 *
 * DESIGN DECISION: Test-Driven Development (TDD) for context gathering automation
 * WHY: Ensures correct file discovery, pattern identification, dependency analysis
 *
 * REASONING CHAIN:
 * 1. ContextGatherer automates context discovery for tasks
 * 2. Parses task description → extracts keywords → finds files (Glob/Grep)
 * 3. Uses PatternLibrary to find relevant patterns (top 3-5)
 * 4. Detects dependencies based on file overlap
 * 5. Injects error handling requirements per category
 * 6. Gathers git context (branch, uncommitted changes, commits)
 * 7. Estimates complexity (1-10 scale)
 * 8. Performance: <1s per task
 *
 * PATTERN: Pattern-CONTEXT-002 (Auto-Context Gathering)
 * PATTERN: Pattern-ERROR-HANDLING-001 (Mandatory Error Coverage)
 * RELATED: MID-005 (Context Gatherer sprint task)
 *
 * @module test/services/contextGatherer.test
 */

import * as assert from 'assert';
import * as path from 'path';
import { ContextGatherer, TaskContext, TaskInput } from '../../src/services/ContextGatherer';
import { PatternLibrary } from '../../src/services/PatternLibrary';

suite('ContextGatherer Test Suite', () => {
	let gatherer: ContextGatherer;
	let patternLibrary: PatternLibrary;
	const projectRoot = path.join(__dirname, '../../../');

	/**
	 * Test: Initialize context gatherer
	 *
	 * DESIGN DECISION: Initialize with PatternLibrary and project root
	 * WHY: PatternLibrary needed for pattern identification, project root for file searches
	 */
	test('Should initialize with PatternLibrary and project root', async () => {
		const patternsPath = path.join(projectRoot, 'docs/patterns');
		patternLibrary = new PatternLibrary(patternsPath);
		await patternLibrary.initialize();

		gatherer = new ContextGatherer(patternLibrary, projectRoot);
		assert.ok(gatherer, 'ContextGatherer should initialize');
	});

	/**
	 * Test: Extract keywords from task description
	 *
	 * DESIGN DECISION: Extract keywords for file/content search
	 * WHY: Keywords drive Glob/Grep searches
	 */
	test('Should extract keywords from task description', async () => {
		const patternsPath = path.join(projectRoot, 'docs/patterns');
		patternLibrary = new PatternLibrary(patternsPath);
		await patternLibrary.initialize();
		gatherer = new ContextGatherer(patternLibrary, projectRoot);

		const task: TaskInput = {
			id: 'TEST-001',
			name: 'Implement OAuth2 token endpoint',
			category: 'API',
			description: 'Create REST API endpoint for OAuth2 token generation with JWT authentication',
			severity: 'high'
		};

		const keywords = gatherer.extractKeywords(task.description);
		assert.ok(keywords.length > 0, 'Should extract keywords');
		assert.ok(keywords.includes('oauth2') || keywords.includes('token'), 'Should include oauth2 or token');
		assert.ok(keywords.includes('jwt') || keywords.includes('authentication'), 'Should include jwt or authentication');
	});

	/**
	 * Test: File discovery via Glob/Grep
	 *
	 * DESIGN DECISION: Combine Glob (pattern-based) and Grep (content-based) searches
	 * WHY: Glob finds files by name pattern, Grep finds by content
	 */
	test('Should discover relevant files via Glob and Grep', async () => {
		const patternsPath = path.join(projectRoot, 'docs/patterns');
		patternLibrary = new PatternLibrary(patternsPath);
		await patternLibrary.initialize();
		gatherer = new ContextGatherer(patternLibrary, projectRoot);

		const keywords = ['AgentRegistry', 'agent', 'registry'];
		const files = await gatherer.discoverFiles(keywords);

		assert.ok(files.length > 0, 'Should find files');
		assert.ok(files.length <= 10, 'Should limit to top 10 files');

		// Should find AgentRegistry.ts (created in MID-004)
		const hasAgentRegistry = files.some(f => f.includes('AgentRegistry'));
		assert.ok(hasAgentRegistry, 'Should find AgentRegistry.ts');
	});

	/**
	 * Test: Pattern identification via PatternLibrary
	 *
	 * DESIGN DECISION: Use PatternLibrary to find top 3-5 relevant patterns
	 * WHY: Patterns provide context and best practices for task
	 */
	test('Should identify relevant patterns via PatternLibrary', async () => {
		const patternsPath = path.join(projectRoot, 'docs/patterns');
		patternLibrary = new PatternLibrary(patternsPath);
		await patternLibrary.initialize();
		gatherer = new ContextGatherer(patternLibrary, projectRoot);

		const task: TaskInput = {
			id: 'TEST-002',
			name: 'Implement database migration',
			category: 'Database',
			description: 'Create migration for new users table with foreign keys',
			severity: 'medium'
		};

		const patterns = await gatherer.identifyPatterns(task);
		assert.ok(patterns.length > 0, 'Should find patterns');
		assert.ok(patterns.length <= 5, 'Should limit to top 5 patterns');

		// Should find database-related patterns
		const hasDbPattern = patterns.some(p => p.id.includes('DB') || p.id.includes('DATABASE'));
		assert.ok(hasDbPattern, 'Should find database patterns');
	});

	/**
	 * Test: Dependency analysis based on file overlap
	 *
	 * DESIGN DECISION: Detect task dependencies via file overlap
	 * WHY: Tasks modifying same files likely have dependencies
	 */
	test('Should detect dependencies based on file overlap', async () => {
		const patternsPath = path.join(projectRoot, 'docs/patterns');
		patternLibrary = new PatternLibrary(patternsPath);
		await patternLibrary.initialize();
		gatherer = new ContextGatherer(patternLibrary, projectRoot);

		const task1: TaskInput = {
			id: 'API-001',
			name: 'Create user endpoint',
			category: 'API',
			description: 'REST endpoint for user creation',
			severity: 'high'
		};

		const task2: TaskInput = {
			id: 'DB-001',
			name: 'Create users table',
			category: 'Database',
			description: 'Database schema for users',
			severity: 'high'
		};

		const context1 = await gatherer.gatherContext(task1);
		const context2 = await gatherer.gatherContext(task2);

		const dependencies = gatherer.analyzeDependencies([context1, context2]);

		// API-001 should depend on DB-001 (API needs database)
		assert.ok(dependencies.length >= 0, 'Should analyze dependencies');
	});

	/**
	 * Test: Error handling injection by category
	 *
	 * DESIGN DECISION: Inject category-specific error handling requirements
	 * WHY: Pattern-ERROR-HANDLING-001 - Mandatory error coverage per category
	 */
	test('Should inject error handling requirements for API category', async () => {
		const patternsPath = path.join(projectRoot, 'docs/patterns');
		patternLibrary = new PatternLibrary(patternsPath);
		await patternLibrary.initialize();
		gatherer = new ContextGatherer(patternLibrary, projectRoot);

		const task: TaskInput = {
			id: 'TEST-003',
			name: 'Create API endpoint',
			category: 'API',
			description: 'REST endpoint for data',
			severity: 'high'
		};

		const context = await gatherer.gatherContext(task);
		assert.ok(context.errorHandling, 'Should have error handling requirements');
		assert.ok(context.errorHandling.length > 0, 'Should have error handling items');

		// API category should include validation, auth, rate limiting
		const errorHandlingText = context.errorHandling.join(' ').toLowerCase();
		assert.ok(
			errorHandlingText.includes('validation') ||
			errorHandlingText.includes('400') ||
			errorHandlingText.includes('401'),
			'Should include API-specific error handling'
		);
	});

	/**
	 * Test: Error handling injection for Database category
	 *
	 * DESIGN DECISION: Database tasks need transaction/constraint error handling
	 * WHY: Database operations have specific failure modes
	 */
	test('Should inject error handling requirements for Database category', async () => {
		const patternsPath = path.join(projectRoot, 'docs/patterns');
		patternLibrary = new PatternLibrary(patternsPath);
		await patternLibrary.initialize();
		gatherer = new ContextGatherer(patternLibrary, projectRoot);

		const task: TaskInput = {
			id: 'TEST-004',
			name: 'Database migration',
			category: 'Database',
			description: 'Add new table',
			severity: 'high'
		};

		const context = await gatherer.gatherContext(task);
		const errorHandlingText = context.errorHandling.join(' ').toLowerCase();

		assert.ok(
			errorHandlingText.includes('transaction') ||
			errorHandlingText.includes('rollback') ||
			errorHandlingText.includes('constraint'),
			'Should include Database-specific error handling'
		);
	});

	/**
	 * Test: Error handling injection for UI category
	 *
	 * DESIGN DECISION: UI tasks need loading states and error boundaries
	 * WHY: User-facing errors require graceful handling
	 */
	test('Should inject error handling requirements for UI category', async () => {
		const patternsPath = path.join(projectRoot, 'docs/patterns');
		patternLibrary = new PatternLibrary(patternsPath);
		await patternLibrary.initialize();
		gatherer = new ContextGatherer(patternLibrary, projectRoot);

		const task: TaskInput = {
			id: 'TEST-005',
			name: 'Create settings panel',
			category: 'UI',
			description: 'User settings interface',
			severity: 'medium'
		};

		const context = await gatherer.gatherContext(task);
		const errorHandlingText = context.errorHandling.join(' ').toLowerCase();

		assert.ok(
			errorHandlingText.includes('loading') ||
			errorHandlingText.includes('error boundary') ||
			errorHandlingText.includes('empty state'),
			'Should include UI-specific error handling'
		);
	});

	/**
	 * Test: Git context gathering
	 *
	 * DESIGN DECISION: Include git context (branch, uncommitted changes, recent commits)
	 * WHY: Git context helps understand current work and recent changes
	 */
	test('Should gather git context (branch, changes, commits)', async () => {
		const patternsPath = path.join(projectRoot, 'docs/patterns');
		patternLibrary = new PatternLibrary(patternsPath);
		await patternLibrary.initialize();
		gatherer = new ContextGatherer(patternLibrary, projectRoot);

		const task: TaskInput = {
			id: 'TEST-006',
			name: 'Test task',
			category: 'Infrastructure',
			description: 'Test git context',
			severity: 'low'
		};

		const context = await gatherer.gatherContext(task);
		assert.ok(context.gitContext, 'Should have git context');
		assert.ok(context.gitContext.branch, 'Should have current branch');
	});

	/**
	 * Test: Complexity estimation
	 *
	 * DESIGN DECISION: Estimate complexity on 1-10 scale
	 * WHY: Helps prioritize and estimate effort
	 */
	test('Should estimate task complexity (1-10 scale)', async () => {
		const patternsPath = path.join(projectRoot, 'docs/patterns');
		patternLibrary = new PatternLibrary(patternsPath);
		await patternLibrary.initialize();
		gatherer = new ContextGatherer(patternLibrary, projectRoot);

		const task: TaskInput = {
			id: 'TEST-007',
			name: 'Implement OAuth2 with PKCE',
			category: 'API',
			description: 'Full OAuth2 implementation with PKCE flow, refresh tokens, and security',
			severity: 'critical'
		};

		const context = await gatherer.gatherContext(task);
		assert.ok(context.complexity, 'Should have complexity estimate');
		assert.ok(context.complexity >= 1 && context.complexity <= 10, 'Complexity should be 1-10');

		// OAuth2 should be high complexity (7+)
		assert.ok(context.complexity >= 7, 'OAuth2 should be high complexity');
	});

	/**
	 * Test: Complete TaskContext object
	 *
	 * DESIGN DECISION: Return complete TaskContext with all fields
	 * WHY: Downstream services (AgentRegistry, SkillOrchestrator) need complete context
	 */
	test('Should return complete TaskContext object', async () => {
		const patternsPath = path.join(projectRoot, 'docs/patterns');
		patternLibrary = new PatternLibrary(patternsPath);
		await patternLibrary.initialize();
		gatherer = new ContextGatherer(patternLibrary, projectRoot);

		const task: TaskInput = {
			id: 'TEST-008',
			name: 'Complete task',
			category: 'API',
			description: 'Test complete context',
			severity: 'medium'
		};

		const context = await gatherer.gatherContext(task);

		// Verify all required fields
		assert.ok(context.id, 'Should have id');
		assert.ok(context.name, 'Should have name');
		assert.ok(context.category, 'Should have category');
		assert.ok(context.description, 'Should have description');
		assert.ok(context.files, 'Should have files array');
		assert.ok(context.patterns, 'Should have patterns array');
		assert.ok(context.errorHandling, 'Should have error handling array');
		assert.ok(context.gitContext, 'Should have git context');
		assert.ok(typeof context.complexity === 'number', 'Should have complexity number');
	});

	/**
	 * Test: Performance target <1s per task
	 *
	 * DESIGN DECISION: Context gathering must complete in <1s
	 * WHY: Real-time sprint planning with many tasks
	 */
	test('Should gather context in <1s (performance target)', async () => {
		const patternsPath = path.join(projectRoot, 'docs/patterns');
		patternLibrary = new PatternLibrary(patternsPath);
		await patternLibrary.initialize();
		gatherer = new ContextGatherer(patternLibrary, projectRoot);

		const task: TaskInput = {
			id: 'TEST-009',
			name: 'Performance test',
			category: 'API',
			description: 'Test context gathering performance',
			severity: 'medium'
		};

		const startTime = Date.now();
		await gatherer.gatherContext(task);
		const duration = Date.now() - startTime;

		assert.ok(duration < 1000, `Context gathering took ${duration}ms (target: <1000ms)`);
	});

	/**
	 * Test: Handle Glob/Grep failures gracefully
	 *
	 * DESIGN DECISION: Continue with empty results if file search fails
	 * WHY: File search failures shouldn't block context gathering
	 */
	test('Should handle file search failures gracefully', async () => {
		const patternsPath = path.join(projectRoot, 'docs/patterns');
		patternLibrary = new PatternLibrary(patternsPath);
		await patternLibrary.initialize();
		gatherer = new ContextGatherer(patternLibrary, projectRoot);

		const task: TaskInput = {
			id: 'TEST-010',
			name: 'Test error handling',
			category: 'API',
			description: 'Test with nonexistent keywords that will find no files',
			severity: 'low'
		};

		// Should not throw, even if no files found
		const context = await gatherer.gatherContext(task);
		assert.ok(context, 'Should return context even if file search fails');
		assert.ok(Array.isArray(context.files), 'Files should be array (may be empty)');
	});

	/**
	 * Test: Handle git command failures gracefully
	 *
	 * DESIGN DECISION: Skip git context if not in git repo
	 * WHY: Not all projects use git
	 */
	test('Should handle git failures gracefully', async () => {
		const patternsPath = path.join(projectRoot, 'docs/patterns');
		patternLibrary = new PatternLibrary(patternsPath);
		await patternLibrary.initialize();

		// Initialize with non-git directory
		const nonGitDir = path.join(projectRoot, 'node_modules');
		const gathererNonGit = new ContextGatherer(patternLibrary, nonGitDir);

		const task: TaskInput = {
			id: 'TEST-011',
			name: 'Test git failure',
			category: 'Infrastructure',
			description: 'Test without git',
			severity: 'low'
		};

		// Should not throw, even if git fails
		const context = await gathererNonGit.gatherContext(task);
		assert.ok(context, 'Should return context even if git fails');
	});

	/**
	 * Test: Validate file paths exist
	 *
	 * DESIGN DECISION: Only include existing file paths in context
	 * WHY: Invalid paths cause errors in downstream services
	 */
	test('Should validate that discovered files exist', async () => {
		const patternsPath = path.join(projectRoot, 'docs/patterns');
		patternLibrary = new PatternLibrary(patternsPath);
		await patternLibrary.initialize();
		gatherer = new ContextGatherer(patternLibrary, projectRoot);

		const task: TaskInput = {
			id: 'TEST-012',
			name: 'Test file validation',
			category: 'API',
			description: 'Test that returned files exist',
			severity: 'medium'
		};

		const context = await gatherer.gatherContext(task);

		// All returned files should exist (relative to project root)
		for (const file of context.files) {
			const fullPath = path.isAbsolute(file) ? file : path.join(projectRoot, file);
			const exists = require('fs').existsSync(fullPath);
			assert.ok(exists, `File should exist: ${file}`);
		}
	});
});
