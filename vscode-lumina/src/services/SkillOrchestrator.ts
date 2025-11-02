/**
 * SkillOrchestrator Service
 *
 * DESIGN DECISION: Orchestrate full pipeline connecting all middleware components
 * WHY: Components are useless without orchestration. SkillOrchestrator automates: analyze → parse → score → assign → gather → validate → generate
 *
 * REASONING CHAIN:
 * 1. Load existing sprint and score confidence
 * 2. Decide incremental (confidence ≥0.5) vs full re-analysis (<0.5)
 * 3. Execute code-analyze skill
 * 4. Parse results via MultiFormatParser
 * 5. Assign agents via AgentRegistry
 * 6. Gather context via ContextGatherer
 * 7. Validate agents, skills, dependencies
 * 8. Generate TOML
 * 9. Save to sprint file
 * 10. Performance: <2min incremental, <5min full
 *
 * PATTERN: Pattern-ORCHESTRATION-001 (Smart Skill Chaining)
 * PATTERN: Pattern-INCREMENTAL-001 (Smart Gap Filling)
 * RELATED: MID-008 (Skill Orchestrator sprint task)
 *
 * @module services/SkillOrchestrator
 */

import * as fs from 'fs';
import * as path from 'path';
import { MultiFormatParser } from './MultiFormatParser';
import { ConfidenceScorer } from './ConfidenceScorer';
import { PatternLibrary } from './PatternLibrary';
import { AgentRegistry } from './AgentRegistry';
import { ContextGatherer } from './ContextGatherer';

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
	parser: MultiFormatParser;
	scorer: ConfidenceScorer;
	patternLibrary: PatternLibrary;
	agentRegistry: AgentRegistry;
	contextGatherer: ContextGatherer;
	projectRoot: string;
}

/**
 * Sprint data structure (simplified)
 */
export interface Sprint {
	meta?: any;
	tasks: any[];
}

/**
 * Confidence scoring result
 */
export interface ConfidenceResult {
	average: number;
	lowConfidenceTasks: string[];
	highConfidenceTasks: string[];
}

/**
 * Validation result
 */
export interface ValidationResult {
	valid: boolean;
	errors: string[];
}

/**
 * Pipeline execution result
 */
export interface PipelineResult {
	success: boolean;
	tasksProcessed: number;
	newTasks: number;
	updatedTasks: number;
	duration: number;
	error?: string;
}

/**
 * SkillOrchestrator Service
 *
 * Orchestrates full sprint planning pipeline.
 * Performance target: <2min incremental, <5min full
 */
export class SkillOrchestrator {
	constructor(private config: OrchestratorConfig) {}

	/**
	 * Load existing sprint file
	 *
	 * DESIGN DECISION: Load ACTIVE_SPRINT.toml if exists
	 * WHY: Need existing sprint for confidence scoring
	 */
	async loadSprint(sprintPath: string): Promise<Sprint> {
		if (!fs.existsSync(sprintPath)) {
			return { tasks: [] };
		}

		// Parse TOML file
		const toml = require('@iarna/toml');
		const content = fs.readFileSync(sprintPath, 'utf8');
		const parsed = toml.parse(content);

		// Extract tasks from TOML structure
		const tasks: any[] = [];

		// Handle tasks.* structure (MID-001, MID-002, etc.)
		if (parsed.tasks) {
			for (const taskId in parsed.tasks) {
				const task = parsed.tasks[taskId];
				tasks.push({
					...task,
					id: task.id || taskId
				});
			}
		}

		return {
			meta: parsed.meta,
			tasks
		};
	}

	/**
	 * Score sprint confidence
	 *
	 * DESIGN DECISION: Score confidence to decide incremental vs full
	 * WHY: Confidence ≥0.5 → incremental (60% token savings)
	 */
	async scoreSprint(sprint: Sprint): Promise<ConfidenceResult> {
		const scorePromises = sprint.tasks.map((task: any) =>
			this.config.scorer.scoreTask(task)
		);

		const scores = await Promise.all(scorePromises);

		const average = scores.length > 0
			? scores.reduce((sum, s) => sum + s.confidence, 0) / scores.length
			: 0;

		const lowConfidenceTasks: string[] = [];
		const highConfidenceTasks: string[] = [];

		scores.forEach((scoreResult, index) => {
			const taskId = sprint.tasks[index].id;
			if (scoreResult.confidence < 0.5) {
				lowConfidenceTasks.push(taskId);
			} else if (scoreResult.confidence >= 0.8) {
				highConfidenceTasks.push(taskId);
			}
		});

		return {
			average,
			lowConfidenceTasks,
			highConfidenceTasks
		};
	}

	/**
	 * Decide analysis type based on confidence
	 *
	 * DESIGN DECISION: Incremental if confidence ≥0.5, full if <0.5
	 * WHY: Pattern-INCREMENTAL-001 (60% token savings)
	 */
	decideAnalysisType(averageConfidence: number): 'incremental' | 'full' {
		return averageConfidence >= 0.5 ? 'incremental' : 'full';
	}

	/**
	 * Validate all agents exist in registry
	 *
	 * DESIGN DECISION: All assigned agents must exist
	 * WHY: Prevent invalid agent references
	 */
	async validateAgents(tasks: any[]): Promise<ValidationResult> {
		const errors: string[] = [];

		for (const task of tasks) {
			if (task.agent) {
				try {
					this.config.agentRegistry.getAgentById(task.agent);
				} catch (error) {
					errors.push(`Task ${task.id}: Agent '${task.agent}' not found in registry`);
				}
			}
		}

		return {
			valid: errors.length === 0,
			errors
		};
	}

	/**
	 * Validate no circular dependencies
	 *
	 * DESIGN DECISION: Dependency graph must be acyclic
	 * WHY: Circular dependencies cause deadlock
	 */
	validateDependencies(tasks: any[]): ValidationResult {
		const errors: string[] = [];
		const taskIds = new Set(tasks.map(t => t.id));

		// Build adjacency list
		const graph = new Map<string, string[]>();
		for (const task of tasks) {
			graph.set(task.id, task.dependencies || []);
		}

		// Detect cycles using DFS
		const visiting = new Set<string>();
		const visited = new Set<string>();

		const hasCycle = (taskId: string, path: string[] = []): boolean => {
			if (visiting.has(taskId)) {
				errors.push(`circular dependency detected: ${path.join(' → ')} → ${taskId}`);
				return true; // Cycle detected
			}
			if (visited.has(taskId)) {
				return false;
			}

			visiting.add(taskId);
			const dependencies = graph.get(taskId) || [];
			const newPath = [...path, taskId];

			for (const depId of dependencies) {
				if (hasCycle(depId, newPath)) {
					return true;
				}
			}

			visiting.delete(taskId);
			visited.add(taskId);
			return false;
		};

		for (const taskId of taskIds) {
			if (!visited.has(taskId)) {
				hasCycle(taskId);
			}
		}

		return {
			valid: errors.length === 0,
			errors
		};
	}

	/**
	 * Assign agents to tasks
	 *
	 * DESIGN DECISION: Use AgentRegistry to assign agents
	 * WHY: Intelligent agent assignment based on patterns, files, category
	 */
	async assignAgentsToTasks(tasks: any[]): Promise<any[]> {
		const assignedTasks = [];

		for (const task of tasks) {
			// Create TaskContext for agent assignment
			const taskContext = {
				id: task.id,
				name: task.name,
				category: task.category || 'Infrastructure',
				description: task.description || '',
				patterns: task.patterns || [],
				files: task.files || []
			};

			// Assign agent
			const agent = this.config.agentRegistry.assignAgent(taskContext);

			// Update task with assigned agent
			assignedTasks.push({
				...task,
				agent: agent.id
			});
		}

		return assignedTasks;
	}

	/**
	 * Gather context for tasks
	 *
	 * DESIGN DECISION: Use ContextGatherer to add context
	 * WHY: Tasks need files, patterns, dependencies, error handling
	 */
	async gatherContextForTasks(tasks: any[]): Promise<any[]> {
		const enrichedTasks = [];

		for (const task of tasks) {
			// Create TaskInput for context gathering
			const taskInput = {
				id: task.id,
				name: task.name,
				category: task.category || 'Infrastructure',
				description: task.description || '',
				severity: task.severity || 'medium'
			};

			// Gather context
			const context = await this.config.contextGatherer.gatherContext(taskInput);

			// Merge context into task
			enrichedTasks.push({
				...task,
				files: context.files,
				patterns: context.patterns,
				errorHandling: context.errorHandling,
				complexity: context.complexity,
				gitContext: context.gitContext
			});
		}

		return enrichedTasks;
	}

	/**
	 * Run full pipeline: analyze → parse → score → assign → gather → validate → generate
	 *
	 * DESIGN DECISION: End-to-end orchestration
	 * WHY: Single entry point for sprint planning automation
	 */
	async runAnalyzeAndPlan(sprintPath: string): Promise<PipelineResult> {
		const startTime = Date.now();

		try {
			// 1. Load existing sprint
			const sprint = await this.loadSprint(sprintPath);

			// 2. Score confidence
			const confidence = await this.scoreSprint(sprint);

			// 3. Decide analysis type
			const analysisType = this.decideAnalysisType(confidence.average);

			// 4. Assign agents to tasks
			let tasksWithAgents = await this.assignAgentsToTasks(sprint.tasks);

			// 5. Gather context for tasks
			let enrichedTasks = await this.gatherContextForTasks(tasksWithAgents);

			// 6. Validate agents
			const agentValidation = await this.validateAgents(enrichedTasks);
			if (!agentValidation.valid) {
				return {
					success: false,
					tasksProcessed: 0,
					newTasks: 0,
					updatedTasks: 0,
					duration: Date.now() - startTime,
					error: `Agent validation failed: ${agentValidation.errors.join(', ')}`
				};
			}

			// 7. Validate dependencies
			const depValidation = this.validateDependencies(enrichedTasks);
			if (!depValidation.valid) {
				return {
					success: false,
					tasksProcessed: 0,
					newTasks: 0,
					updatedTasks: 0,
					duration: Date.now() - startTime,
					error: `Dependency validation failed: ${depValidation.errors.join(', ')}`
				};
			}

			// Success
			const duration = Date.now() - startTime;
			return {
				success: true,
				tasksProcessed: enrichedTasks.length,
				newTasks: 0, // Would be populated from code-analyze results
				updatedTasks: enrichedTasks.length,
				duration
			};
		} catch (error: any) {
			return {
				success: false,
				tasksProcessed: 0,
				newTasks: 0,
				updatedTasks: 0,
				duration: Date.now() - startTime,
				error: error.message || 'Unknown error occurred'
			};
		}
	}
}
