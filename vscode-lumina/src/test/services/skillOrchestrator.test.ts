/**
 * SkillOrchestrator Tests
 *
 * DESIGN DECISION: Test-Driven Development (TDD) for orchestration pipeline
 * WHY: Ensures correct integration of all middleware components
 *
 * REASONING CHAIN:
 * 1. SkillOrchestrator orchestrates full pipeline: analyze → parse → score → assign → gather → validate → generate
 * 2. Loads existing sprint and scores confidence
 * 3. Decides incremental (confidence ≥0.5) vs full re-analysis (<0.5)
 * 4. Executes code-analyze skill
 * 5. Parses results via MultiFormatParser
 * 6. Assigns agents via AgentRegistry
 * 7. Gathers context via ContextGatherer
 * 8. Validates agents, skills, dependencies
 * 9. Generates TOML
 * 10. Saves to sprint file
 * 11. Performance: <2min incremental, <5min full
 *
 * PATTERN: Pattern-ORCHESTRATION-001 (Smart Skill Chaining)
 * PATTERN: Pattern-INCREMENTAL-001 (Smart Gap Filling)
 * RELATED: MID-008 (Skill Orchestrator sprint task)
 *
 * @module test/services/skillOrchestrator.test
 */

import * as assert from 'assert';
import * as path from 'path';
import { SkillOrchestrator, OrchestratorConfig, PipelineResult } from '../../services/SkillOrchestrator';
import { MultiFormatParser } from '../../services/MultiFormatParser';
import { ConfidenceScorer } from '../../services/ConfidenceScorer';
import { PatternLibrary } from '../../services/PatternLibrary';
import { AgentRegistry } from '../../services/AgentRegistry';
import { ContextGatherer } from '../../services/ContextGatherer';

suite('SkillOrchestrator Test Suite', () => {
	let orchestrator: SkillOrchestrator;
	const projectRoot = path.join(__dirname, '../../../..');
	const agentsPath = path.join(projectRoot, 'internal/agents');
	const patternsPath = path.join(projectRoot, 'docs/patterns');

	/**
	 * Test: Initialize orchestrator
	 *
	 * DESIGN DECISION: Initialize with all middleware components
	 * WHY: Orchestrator needs parser, scorer, agent registry, context gatherer
	 */
	test('Should initialize with all middleware components', () => {
		const parser = new MultiFormatParser();
		const scorer = new ConfidenceScorer();
		const patternLibrary = new PatternLibrary();
		const agentRegistry = new AgentRegistry(agentsPath);
		const contextGatherer = new ContextGatherer(patternLibrary, projectRoot);

		const config: OrchestratorConfig = {
			parser,
			scorer,
			patternLibrary,
			agentRegistry,
			contextGatherer,
			projectRoot
		};

		orchestrator = new SkillOrchestrator(config);
		assert.ok(orchestrator, 'SkillOrchestrator should initialize');
	});

	/**
	 * Test: Load existing sprint file
	 *
	 * DESIGN DECISION: Load ACTIVE_SPRINT.toml if exists
	 * WHY: Need existing sprint for confidence scoring
	 */
	test('Should load existing sprint file', async () => {
		const parser = new MultiFormatParser();
		const scorer = new ConfidenceScorer();
		const patternLibrary = new PatternLibrary();
		const agentRegistry = new AgentRegistry(agentsPath);
		const contextGatherer = new ContextGatherer(patternLibrary, projectRoot);

		const config: OrchestratorConfig = {
			parser,
			scorer,
			patternLibrary,
			agentRegistry,
			contextGatherer,
			projectRoot
		};

		orchestrator = new SkillOrchestrator(config);

		const sprintPath = path.join(projectRoot, 'internal/sprints/ACTIVE_SPRINT.toml');
		const sprint = await orchestrator.loadSprint(sprintPath);

		assert.ok(sprint, 'Should load sprint');
		assert.ok(sprint.tasks, 'Sprint should have tasks');
	});

	/**
	 * Test: Score sprint confidence
	 *
	 * DESIGN DECISION: Score confidence to decide incremental vs full
	 * WHY: Confidence ≥0.5 → incremental (60% token savings)
	 */
	test('Should score sprint confidence', async () => {
		const parser = new MultiFormatParser();
		const scorer = new ConfidenceScorer();
		const patternLibrary = new PatternLibrary();
		const agentRegistry = new AgentRegistry(agentsPath);
		await agentRegistry.initialize();
		const contextGatherer = new ContextGatherer(patternLibrary, projectRoot);

		const config: OrchestratorConfig = {
			parser,
			scorer,
			patternLibrary,
			agentRegistry,
			contextGatherer,
			projectRoot
		};

		orchestrator = new SkillOrchestrator(config);

		const sprintPath = path.join(projectRoot, 'internal/sprints/ACTIVE_SPRINT.toml');
		const sprint = await orchestrator.loadSprint(sprintPath);
		const confidence = orchestrator.scoreSprint(sprint);

		assert.ok(confidence, 'Should score sprint');
		assert.ok(typeof confidence.average === 'number', 'Should have average score');
		assert.ok(confidence.average >= 0 && confidence.average <= 1, 'Average should be 0-1');
		assert.ok(Array.isArray(confidence.lowConfidenceTasks), 'Should have low confidence tasks');
		assert.ok(Array.isArray(confidence.highConfidenceTasks), 'Should have high confidence tasks');
	});

	/**
	 * Test: Decide incremental vs full analysis
	 *
	 * DESIGN DECISION: Incremental if confidence ≥0.5, full if <0.5
	 * WHY: Pattern-INCREMENTAL-001 (60% token savings)
	 */
	test('Should decide incremental analysis when confidence ≥0.5', () => {
		const parser = new MultiFormatParser();
		const scorer = new ConfidenceScorer();
		const patternLibrary = new PatternLibrary();
		const agentRegistry = new AgentRegistry(agentsPath);
		const contextGatherer = new ContextGatherer(patternLibrary, projectRoot);

		const config: OrchestratorConfig = {
			parser,
			scorer,
			patternLibrary,
			agentRegistry,
			contextGatherer,
			projectRoot
		};

		orchestrator = new SkillOrchestrator(config);

		const decision1 = orchestrator.decideAnalysisType(0.75);
		assert.strictEqual(decision1, 'incremental', 'Should decide incremental for 0.75');

		const decision2 = orchestrator.decideAnalysisType(0.5);
		assert.strictEqual(decision2, 'incremental', 'Should decide incremental for 0.5');

		const decision3 = orchestrator.decideAnalysisType(0.4);
		assert.strictEqual(decision3, 'full', 'Should decide full for 0.4');
	});

	/**
	 * Test: Validate agents exist
	 *
	 * DESIGN DECISION: All assigned agents must exist in registry
	 * WHY: Prevent invalid agent references
	 */
	test('Should validate all agents exist in registry', async () => {
		const parser = new MultiFormatParser();
		const scorer = new ConfidenceScorer();
		const patternLibrary = new PatternLibrary();
		const agentRegistry = new AgentRegistry(agentsPath);
		await agentRegistry.initialize();
		const contextGatherer = new ContextGatherer(patternLibrary, projectRoot);

		const config: OrchestratorConfig = {
			parser,
			scorer,
			patternLibrary,
			agentRegistry,
			contextGatherer,
			projectRoot
		};

		orchestrator = new SkillOrchestrator(config);

		const tasks = [
			{ id: 'TASK-001', agent: 'api-agent' },
			{ id: 'TASK-002', agent: 'database-agent' }
		];

		const validation = await orchestrator.validateAgents(tasks);
		assert.strictEqual(validation.valid, true, 'Valid agents should pass');
		assert.strictEqual(validation.errors.length, 0, 'Should have no errors');
	});

	/**
	 * Test: Validate agents - fail on invalid agent
	 *
	 * DESIGN DECISION: Validation fails if agent doesn't exist
	 * WHY: Prevent invalid agent references
	 */
	test('Should fail validation for non-existent agents', async () => {
		const parser = new MultiFormatParser();
		const scorer = new ConfidenceScorer();
		const patternLibrary = new PatternLibrary();
		const agentRegistry = new AgentRegistry(agentsPath);
		await agentRegistry.initialize();
		const contextGatherer = new ContextGatherer(patternLibrary, projectRoot);

		const config: OrchestratorConfig = {
			parser,
			scorer,
			patternLibrary,
			agentRegistry,
			contextGatherer,
			projectRoot
		};

		orchestrator = new SkillOrchestrator(config);

		const tasks = [
			{ id: 'TASK-001', agent: 'api-agent' },
			{ id: 'TASK-002', agent: 'nonexistent-agent' }
		];

		const validation = await orchestrator.validateAgents(tasks);
		assert.strictEqual(validation.valid, false, 'Should fail for invalid agent');
		assert.ok(validation.errors.length > 0, 'Should have errors');
		assert.ok(validation.errors.some((e: string) => e.includes('nonexistent-agent')), 'Should mention invalid agent');
	});

	/**
	 * Test: Validate no circular dependencies
	 *
	 * DESIGN DECISION: Dependency graph must be acyclic
	 * WHY: Circular dependencies cause deadlock
	 */
	test('Should validate no circular dependencies', () => {
		const parser = new MultiFormatParser();
		const scorer = new ConfidenceScorer();
		const patternLibrary = new PatternLibrary();
		const agentRegistry = new AgentRegistry(agentsPath);
		const contextGatherer = new ContextGatherer(patternLibrary, projectRoot);

		const config: OrchestratorConfig = {
			parser,
			scorer,
			patternLibrary,
			agentRegistry,
			contextGatherer,
			projectRoot
		};

		orchestrator = new SkillOrchestrator(config);

		// Valid DAG
		const validTasks = [
			{ id: 'TASK-001', dependencies: [] },
			{ id: 'TASK-002', dependencies: ['TASK-001'] },
			{ id: 'TASK-003', dependencies: ['TASK-002'] }
		];

		const validation1 = orchestrator.validateDependencies(validTasks);
		assert.strictEqual(validation1.valid, true, 'Valid DAG should pass');

		// Circular dependency
		const circularTasks = [
			{ id: 'TASK-001', dependencies: ['TASK-002'] },
			{ id: 'TASK-002', dependencies: ['TASK-001'] }
		];

		const validation2 = orchestrator.validateDependencies(circularTasks);
		assert.strictEqual(validation2.valid, false, 'Circular dependency should fail');
		assert.ok(validation2.errors.some((e: string) => e.includes('circular')), 'Should mention circular dependency');
	});

	/**
	 * Test: Assign agents to tasks
	 *
	 * DESIGN DECISION: Use AgentRegistry to assign agents based on task context
	 * WHY: Intelligent agent assignment based on patterns, files, category
	 */
	test('Should assign agents to tasks based on context', async () => {
		const parser = new MultiFormatParser();
		const scorer = new ConfidenceScorer();
		const patternLibrary = new PatternLibrary();
		const agentRegistry = new AgentRegistry(agentsPath);
		await agentRegistry.initialize();
		const contextGatherer = new ContextGatherer(patternLibrary, projectRoot);

		const config: OrchestratorConfig = {
			parser,
			scorer,
			patternLibrary,
			agentRegistry,
			contextGatherer,
			projectRoot
		};

		orchestrator = new SkillOrchestrator(config);

		const tasks = [
			{ id: 'TASK-001', name: 'Create API endpoint', category: 'API', description: 'REST endpoint for users' },
			{ id: 'TASK-002', name: 'Database migration', category: 'Database', description: 'Add users table' }
		];

		const assignedTasks = await orchestrator.assignAgentsToTasks(tasks);

		assert.ok(assignedTasks.length === 2, 'Should assign agents to all tasks');
		assert.ok(assignedTasks[0].agent, 'Task 1 should have agent');
		assert.ok(assignedTasks[1].agent, 'Task 2 should have agent');
		assert.strictEqual(assignedTasks[0].agent, 'api-agent', 'API task should get api-agent');
		assert.strictEqual(assignedTasks[1].agent, 'database-agent', 'Database task should get database-agent');
	});

	/**
	 * Test: Gather context for tasks
	 *
	 * DESIGN DECISION: Use ContextGatherer to add context to each task
	 * WHY: Tasks need files, patterns, dependencies, error handling
	 */
	test('Should gather context for tasks', async () => {
		const parser = new MultiFormatParser();
		const scorer = new ConfidenceScorer();
		const patternLibrary = new PatternLibrary();
		const agentRegistry = new AgentRegistry(agentsPath);
		await agentRegistry.initialize();
		const contextGatherer = new ContextGatherer(patternLibrary, projectRoot);

		const config: OrchestratorConfig = {
			parser,
			scorer,
			patternLibrary,
			agentRegistry,
			contextGatherer,
			projectRoot
		};

		orchestrator = new SkillOrchestrator(config);

		const tasks = [
			{ id: 'TASK-001', name: 'Create API endpoint', category: 'API', description: 'REST endpoint for users' }
		];

		const enrichedTasks = await orchestrator.gatherContextForTasks(tasks);

		assert.ok(enrichedTasks.length === 1, 'Should enrich all tasks');
		assert.ok(enrichedTasks[0].files !== undefined, 'Task should have files');
		assert.ok(enrichedTasks[0].patterns !== undefined, 'Task should have patterns');
		assert.ok(enrichedTasks[0].errorHandling !== undefined, 'Task should have error handling');
	});

	/**
	 * Test: Performance target <2min for incremental
	 *
	 * DESIGN DECISION: Incremental analysis should complete quickly
	 * WHY: User experience - fast feedback
	 * NOTE: This is a unit test, actual performance depends on sprint size
	 */
	test('Should complete orchestration steps in reasonable time', async () => {
		const parser = new MultiFormatParser();
		const scorer = new ConfidenceScorer();
		const patternLibrary = new PatternLibrary();
		const agentRegistry = new AgentRegistry(agentsPath);
		await agentRegistry.initialize();
		const contextGatherer = new ContextGatherer(patternLibrary, projectRoot);

		const config: OrchestratorConfig = {
			parser,
			scorer,
			patternLibrary,
			agentRegistry,
			contextGatherer,
			projectRoot
		};

		orchestrator = new SkillOrchestrator(config);

		const tasks = [
			{ id: 'TASK-001', name: 'Test task', category: 'API', description: 'Test' }
		];

		const startTime = Date.now();
		await orchestrator.assignAgentsToTasks(tasks);
		await orchestrator.gatherContextForTasks(tasks);
		await orchestrator.validateAgents(tasks);
		orchestrator.validateDependencies(tasks);
		const duration = Date.now() - startTime;

		// Individual operations should be fast (<5s for unit test with 1 task)
		assert.ok(duration < 5000, `Orchestration steps took ${duration}ms (should be <5s for unit test)`);
	});
});
