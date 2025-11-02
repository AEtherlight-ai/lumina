/**
 * AgentRegistry Tests
 *
 * DESIGN DECISION: Test-Driven Development (TDD) for agent registry
 * WHY: Ensures correct parsing, validation, and assignment of agents to tasks
 *
 * REASONING CHAIN:
 * 1. AgentRegistry loads agent definitions from internal/agents/*.md
 * 2. Parses metadata: id, name, type, expertise, responsibilities, patterns
 * 3. Extracts agent-skill relationships (many-to-many)
 * 4. Implements assignAgent() with intelligent matching
 * 5. Validates agents exist before assignment
 * 6. Tracks token budget per agent (<10,000 tokens default)
 * 7. Performance: <50ms per assignment
 *
 * PATTERN: Pattern-AGENT-001 (Intelligent Agent Assignment)
 * RELATED: MID-004 (Agent Registry sprint task)
 *
 * @module test/services/agentRegistry.test
 */

import * as assert from 'assert';
import * as path from 'path';
import { AgentRegistry, Agent, AgentMetadata, TaskContext } from '../../services/AgentRegistry';

suite('AgentRegistry Test Suite', () => {
	let registry: AgentRegistry;
	const testAgentsPath = path.join(__dirname, '../../../../internal/agents');

	/**
	 * Test: Initialize registry
	 *
	 * DESIGN DECISION: Registry loads all agent files at initialization
	 * WHY: Pre-load for fast assignment (<50ms)
	 */
	test('Should initialize and load all agents from internal/agents/*.md', async () => {
		registry = new AgentRegistry(testAgentsPath);
		await registry.initialize();

		const agents = registry.getAllAgents();
		assert.ok(agents.length > 0, 'No agents loaded');
		assert.ok(agents.length >= 10, 'Expected at least 10 agent files'); // Based on glob results
	});

	/**
	 * Test: Parse agent metadata correctly
	 *
	 * DESIGN DECISION: Extract structured metadata from markdown headers
	 * WHY: Type-safe agent definitions with validation
	 */
	test('Should parse agent metadata correctly from markdown', async () => {
		registry = new AgentRegistry(testAgentsPath);
		await registry.initialize();

		const apiAgent = registry.getAgentById('api-agent');
		assert.ok(apiAgent, 'API agent not found');
		assert.strictEqual(apiAgent.type, 'API', 'Agent type incorrect');
		assert.ok(apiAgent.responsibilities.length > 0, 'No responsibilities parsed');
		assert.ok(apiAgent.patterns.length > 0, 'No patterns parsed');
	});

	/**
	 * Test: Extract agent skills (many-to-many)
	 *
	 * DESIGN DECISION: Agent can have multiple skills, skills used by multiple agents
	 * WHY: API agent can use: code-analyze:api, sprint-plan, publish
	 */
	test('Should extract agent skills (many-to-many relationship)', async () => {
		registry = new AgentRegistry(testAgentsPath);
		await registry.initialize();

		const infraAgent = registry.getAgentById('infrastructure-agent');
		assert.ok(infraAgent, 'Infrastructure agent not found');
		assert.ok(infraAgent.skills.length > 0, 'No skills extracted');

		// Skills should include code-analyze, potentially others
		const hasCodeAnalyze = infraAgent.skills.some(s => s.includes('code-analyze'));
		assert.ok(hasCodeAnalyze, 'infrastructure-agent should have code-analyze skill');
	});

	/**
	 * Test: assignAgent() returns correct agent for task
	 *
	 * DESIGN DECISION: Match by category, patterns, and file paths
	 * WHY: Intelligent matching prevents assignment errors
	 */
	test('Should assign correct agent based on task category', async () => {
		registry = new AgentRegistry(testAgentsPath);
		await registry.initialize();

		const apiTask: TaskContext = {
			id: 'TEST-001',
			name: 'Implement REST endpoint',
			category: 'API',
			description: 'Create new REST API endpoint for user management',
			patterns: ['Pattern-API-001'],
			files: ['src/api/users.ts']
		};

		const assignedAgent = registry.assignAgent(apiTask);
		assert.ok(assignedAgent, 'No agent assigned');
		assert.strictEqual(assignedAgent.type, 'API', 'Wrong agent type assigned');
	});

	/**
	 * Test: assignAgent() considers patterns in matching
	 *
	 * DESIGN DECISION: Pattern matching increases assignment accuracy
	 * WHY: Database patterns → database agent
	 */
	test('Should assign agent based on pattern matching', async () => {
		registry = new AgentRegistry(testAgentsPath);
		await registry.initialize();

		const dbTask: TaskContext = {
			id: 'TEST-002',
			name: 'Add database migration',
			category: 'Database',
			description: 'Create migration for new user table',
			patterns: ['Pattern-DB-001', 'Pattern-DB-002'],
			files: ['migrations/001_users.sql']
		};

		const assignedAgent = registry.assignAgent(dbTask);
		assert.ok(assignedAgent, 'No agent assigned');
		assert.strictEqual(assignedAgent.type, 'Database', 'Wrong agent type for DB patterns');
	});

	/**
	 * Test: assignAgent() considers file paths in matching
	 *
	 * DESIGN DECISION: File path analysis improves matching
	 * WHY: UI files → UI agent, API files → API agent
	 */
	test('Should assign agent based on file path analysis', async () => {
		registry = new AgentRegistry(testAgentsPath);
		await registry.initialize();

		const uiTask: TaskContext = {
			id: 'TEST-003',
			name: 'Create React component',
			category: 'UI',
			description: 'Build settings panel component',
			patterns: [],
			files: ['vscode-lumina/src/components/SettingsPanel.tsx']
		};

		const assignedAgent = registry.assignAgent(uiTask);
		assert.ok(assignedAgent, 'No agent assigned');
		assert.strictEqual(assignedAgent.type, 'UI', 'Wrong agent type for UI files');
	});

	/**
	 * Test: Validate agent exists before assignment
	 *
	 * DESIGN DECISION: Throw error if requested agent doesn't exist
	 * WHY: Prevent silent failures with invalid agent IDs
	 */
	test('Should throw error when requesting non-existent agent', async () => {
		registry = new AgentRegistry(testAgentsPath);
		await registry.initialize();

		assert.throws(
			() => registry.getAgentById('non-existent-agent'),
			/Agent not found/,
			'Should throw error for non-existent agent'
		);
	});

	/**
	 * Test: Handle missing agent files gracefully
	 *
	 * DESIGN DECISION: Log warning but continue loading other agents
	 * WHY: One bad file shouldn't break entire registry
	 */
	test('Should handle missing/malformed agent files gracefully', async () => {
		const emptyPath = path.join(__dirname, '../fixtures/empty-agents');
		registry = new AgentRegistry(emptyPath);

		// Should not throw, just return empty registry
		await registry.initialize();
		const agents = registry.getAllAgents();
		assert.strictEqual(agents.length, 0, 'Should handle missing directory gracefully');
	});

	/**
	 * Test: Token budget tracked per agent
	 *
	 * DESIGN DECISION: Default 10,000 tokens per agent
	 * WHY: Pattern-CONTEXT-003 optimization (71% token reduction)
	 */
	test('Should track token budget per agent', async () => {
		registry = new AgentRegistry(testAgentsPath);
		await registry.initialize();

		const agent = registry.getAgentById('api-agent');
		assert.ok(agent, 'Agent not found');
		assert.ok(agent.tokenBudget <= 10000, 'Token budget exceeds 10k tokens');
		assert.ok(agent.tokenBudget > 0, 'Token budget not calculated');
	});

	/**
	 * Test: Agent workload tracking
	 *
	 * DESIGN DECISION: Track currentTasks and maxParallelTasks
	 * WHY: Prevent agent overload, enable parallel execution
	 */
	test('Should track agent workload (current and max tasks)', async () => {
		registry = new AgentRegistry(testAgentsPath);
		await registry.initialize();

		const task: TaskContext = {
			id: 'TEST-004',
			name: 'Test task',
			category: 'API',
			description: 'Test',
			patterns: [],
			files: []
		};

		const agent = registry.assignAgent(task);
		registry.recordTaskAssignment(agent.id, task.id);

		const workload = registry.getAgentWorkload(agent.id);
		assert.strictEqual(workload.currentTasks, 1, 'Workload not tracked');
		assert.ok(workload.maxParallelTasks > 0, 'Max parallel tasks not set');
	});

	/**
	 * Test: Performance target <50ms per assignment
	 *
	 * DESIGN DECISION: Pre-loaded registry for fast lookups
	 * WHY: Real-time assignment during sprint planning
	 */
	test('Should assign agent in <50ms (performance target)', async () => {
		registry = new AgentRegistry(testAgentsPath);
		await registry.initialize();

		const task: TaskContext = {
			id: 'TEST-005',
			name: 'Performance test',
			category: 'API',
			description: 'Test assignment performance',
			patterns: ['Pattern-API-001'],
			files: ['src/api/test.ts']
		};

		const startTime = Date.now();
		registry.assignAgent(task);
		const duration = Date.now() - startTime;

		assert.ok(duration < 50, `Assignment took ${duration}ms (target: <50ms)`);
	});

	/**
	 * Test: Fallback for unmatched tasks
	 *
	 * DESIGN DECISION: Assign default agent or return null
	 * WHY: Handle edge cases gracefully
	 */
	test('Should handle unmatched tasks with fallback', async () => {
		registry = new AgentRegistry(testAgentsPath);
		await registry.initialize();

		const unknownTask: TaskContext = {
			id: 'TEST-006',
			name: 'Unknown task',
			category: 'UnknownCategory',
			description: 'Task with no matching agent',
			patterns: [],
			files: []
		};

		const agent = registry.assignAgent(unknownTask);
		// Should either return a default agent or throw clear error
		assert.ok(
			agent !== undefined || agent === null,
			'assignAgent should return agent or null, not undefined'
		);
	});

	/**
	 * Test: Agent assignment logging
	 *
	 * DESIGN DECISION: Log assignment decisions with reasoning
	 * WHY: Debugging and auditing agent selection
	 */
	test('Should log agent assignment decisions', async () => {
		registry = new AgentRegistry(testAgentsPath);
		await registry.initialize();

		const logs: string[] = [];
		registry.onAssignment((log) => logs.push(log));

		const task: TaskContext = {
			id: 'TEST-007',
			name: 'Logging test',
			category: 'API',
			description: 'Test assignment logging',
			patterns: [],
			files: []
		};

		registry.assignAgent(task);
		assert.ok(logs.length > 0, 'No assignment logs generated');
		assert.ok(logs[0].includes('TEST-007'), 'Log should include task ID');
	});
});
