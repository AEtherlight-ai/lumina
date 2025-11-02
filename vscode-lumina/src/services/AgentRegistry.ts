/**
 * Agent Registry Service
 *
 * DESIGN DECISION: Central registry for loading, validating, and assigning agents to tasks
 * WHY: Pattern-AGENT-001 (Intelligent Agent Assignment) - Prevent 0% assignment errors
 *
 * REASONING CHAIN:
 * 1. Sprint tasks reference agents by ID string (e.g., 'infrastructure-agent')
 * 2. No validation that agent exists → runtime errors
 * 3. No logic for automatic agent assignment → manual work
 * 4. Agent-skill relationships unclear → wrong agent assigned to task
 * 5. AgentRegistry solves: load agents, validate existence, intelligent assignment
 *
 * PATTERN: Pattern-AGENT-001 (Intelligent Agent Assignment)
 * PATTERN: Pattern-CONTEXT-003 (Hierarchical Agent Contexts - 71% token reduction)
 * RELATED: MID-004 (Agent Registry sprint task)
 *
 * @module services/AgentRegistry
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

/**
 * Agent metadata extracted from agent context files
 */
export interface AgentMetadata {
	id: string;
	name: string;
	type: string;
	version: string;
	lastUpdated: string;
	responsibilities: string[];
	patterns: string[];
	performanceTargets: Record<string, string>;
	commonPitfalls: string[];
	relevantCode: string[];
}

/**
 * Agent with runtime tracking
 */
export interface Agent extends AgentMetadata {
	skills: string[];
	tokenBudget: number;
	currentTasks: string[];
	maxParallelTasks: number;
	filePath: string;
}

/**
 * Task context for agent assignment
 */
export interface TaskContext {
	id: string;
	name: string;
	category: string;
	description: string;
	patterns: string[];
	files: string[];
}

/**
 * Agent workload tracking
 */
export interface AgentWorkload {
	agentId: string;
	currentTasks: number;
	maxParallelTasks: number;
	availableCapacity: number;
}

/**
 * Agent Registry
 *
 * Loads agent definitions from internal/agents/*.md
 * Provides agent lookup, validation, and intelligent assignment
 */
export class AgentRegistry {
	private agents: Map<string, Agent> = new Map();
	private agentsPath: string;
	private assignmentListeners: Array<(log: string) => void> = [];

	constructor(agentsPath: string) {
		this.agentsPath = agentsPath;
	}

	/**
	 * Initialize registry by loading all agent files
	 *
	 * DESIGN DECISION: Pre-load all agents at initialization
	 * WHY: Fast assignment (<50ms) during sprint planning
	 */
	async initialize(): Promise<void> {
		try {
			// Check if directory exists
			if (!fs.existsSync(this.agentsPath)) {
				console.warn(`AgentRegistry: Directory not found: ${this.agentsPath}`);
				return;
			}

			// Find all agent context files
			const pattern = path.join(this.agentsPath, '*-agent-context.md').replace(/\\/g, '/');
			const agentFiles = await glob(pattern);

			// Load each agent
			for (const filePath of agentFiles) {
				try {
					const agent = await this.loadAgent(filePath);
					this.agents.set(agent.id, agent);
				} catch (error) {
					console.error(`AgentRegistry: Failed to load ${filePath}:`, error);
				}
			}

			console.log(`AgentRegistry: Loaded ${this.agents.size} agents`);
		} catch (error) {
			console.error('AgentRegistry: Initialization failed:', error);
			throw error;
		}
	}

	/**
	 * Load and parse a single agent file
	 *
	 * DESIGN DECISION: Parse markdown structure with metadata extraction
	 * WHY: Agent files follow consistent format (Pattern-CONTEXT-003)
	 */
	private async loadAgent(filePath: string): Promise<Agent> {
		const content = fs.readFileSync(filePath, 'utf-8');
		const fileName = path.basename(filePath, '-context.md');

		// Extract metadata from markdown
		const metadata = this.parseAgentMetadata(content, fileName);

		// Extract skills (from patterns, responsibilities, etc.)
		const skills = this.extractSkills(content, metadata);

		// Calculate token budget (approx: 7.5 tokens per line for markdown)
		const lineCount = content.split('\n').length;
		const tokenBudget = Math.ceil(lineCount * 7.5);

		return {
			...metadata,
			skills,
			tokenBudget,
			currentTasks: [],
			maxParallelTasks: 3, // Default: 3 parallel tasks per agent
			filePath
		};
	}

	/**
	 * Parse agent metadata from markdown content
	 *
	 * DESIGN DECISION: Extract structured metadata from markdown headers
	 * WHY: Type-safe agent definitions with validation
	 */
	private parseAgentMetadata(content: string, fileName: string): AgentMetadata {
		// Extract header metadata
		const typeMatch = content.match(/\*\*AGENT TYPE:\*\*\s*(.+)/);
		const versionMatch = content.match(/\*\*VERSION:\*\*\s*(.+)/);
		const dateMatch = content.match(/\*\*LAST UPDATED:\*\*\s*(.+)/);

		// Extract name from first heading
		const nameMatch = content.match(/^#\s+(.+?)\s+Context/m);

		// Extract responsibilities (bullet list under "Your responsibilities:" or "Your Role")
		const responsibilities = this.extractSection(content, /Your responsibilities:|Your Role/i);

		// Extract patterns (Pattern-XXX-NNN references)
		const patterns = this.extractPatterns(content);

		// Extract performance targets
		const performanceTargets = this.extractPerformanceTargets(content);

		// Extract common pitfalls
		const commonPitfalls = this.extractSection(content, /Common Pitfalls/i);

		// Extract relevant code paths
		const relevantCode = this.extractRelevantCode(content);

		return {
			id: fileName,
			name: nameMatch ? nameMatch[1].trim() : fileName,
			type: typeMatch ? typeMatch[1].trim() : 'Unknown',
			version: versionMatch ? versionMatch[1].trim() : '1.0',
			lastUpdated: dateMatch ? dateMatch[1].trim() : '',
			responsibilities,
			patterns,
			performanceTargets,
			commonPitfalls,
			relevantCode
		};
	}

	/**
	 * Extract skills from agent content
	 *
	 * DESIGN DECISION: Skills derived from capabilities and tools mentioned
	 * WHY: Many-to-many agent-skill relationship (Pattern-AGENT-001)
	 */
	private extractSkills(content: string, metadata: AgentMetadata): string[] {
		const skills: Set<string> = new Set();

		// Skill patterns to look for
		const skillPatterns = [
			/code-analyze/gi,
			/sprint-plan/gi,
			/publish/gi,
			/test/gi,
			/review/gi,
			/deploy/gi,
			/monitor/gi
		];

		for (const pattern of skillPatterns) {
			if (pattern.test(content)) {
				const skill = pattern.source.replace(/\\/g, '').toLowerCase();
				skills.add(skill);
			}
		}

		// Add type-specific base skill
		skills.add(`code-analyze:${metadata.type.toLowerCase()}`);

		return Array.from(skills);
	}

	/**
	 * Extract bullet list section from markdown
	 */
	private extractSection(content: string, heading: RegExp): string[] {
		const items: string[] = [];
		const match = content.match(new RegExp(`${heading.source}[\\s\\S]*?(?=\\n##|\\n---)`));

		if (match) {
			const section = match[0];
			const bulletPoints = section.match(/^[-*]\s+(.+)$/gm);
			if (bulletPoints) {
				items.push(...bulletPoints.map(bp => bp.replace(/^[-*]\s+/, '').trim()));
			}
		}

		return items;
	}

	/**
	 * Extract pattern references (Pattern-XXX-NNN)
	 */
	private extractPatterns(content: string): string[] {
		const patterns: Set<string> = new Set();
		const matches = content.matchAll(/Pattern-([A-Z]+)-(\d+)/g);

		for (const match of matches) {
			patterns.add(match[0]);
		}

		return Array.from(patterns);
	}

	/**
	 * Extract performance targets from markdown
	 */
	private extractPerformanceTargets(content: string): Record<string, string> {
		const targets: Record<string, string> = {};
		const section = content.match(/## Performance Targets[\s\S]*?(?=\n##|---)/);

		if (section) {
			const lines = section[0].split('\n');
			for (const line of lines) {
				const match = line.match(/\*\*(.+?):\*\*\s*(.+)/);
				if (match) {
					targets[match[1].trim()] = match[2].trim();
				}
			}
		}

		return targets;
	}

	/**
	 * Extract relevant code paths mentioned in agent context
	 */
	private extractRelevantCode(content: string): string[] {
		const codePaths: string[] = [];

		// Look for code paths in various formats
		const pathPatterns = [
			/[a-z_-]+\/[a-z_-]+\.[a-z]+/gi, // Simple paths like src/api.ts
			/vscode-lumina\/src\/[a-z/._-]+/gi, // Project-specific paths
			/packages\/[a-z-]+\/src\/[a-z/._-]+/gi // Package paths
		];

		for (const pattern of pathPatterns) {
			const matches = content.matchAll(pattern);
			for (const match of matches) {
				codePaths.push(match[0]);
			}
		}

		return [...new Set(codePaths)]; // Remove duplicates
	}

	/**
	 * Get all loaded agents
	 */
	getAllAgents(): Agent[] {
		return Array.from(this.agents.values());
	}

	/**
	 * Get agent by ID
	 *
	 * DESIGN DECISION: Throw error if agent not found
	 * WHY: Prevent silent failures with invalid agent IDs
	 */
	getAgentById(agentId: string): Agent {
		const agent = this.agents.get(agentId);
		if (!agent) {
			throw new Error(`Agent not found: ${agentId}`);
		}
		return agent;
	}

	/**
	 * Assign agent to task based on intelligent matching
	 *
	 * DESIGN DECISION: Match by category, patterns, and file paths
	 * WHY: Pattern-AGENT-001 - 0% assignment errors through intelligent matching
	 *
	 * Matching logic:
	 * 1. Category match (exact type match) - weight: 40%
	 * 2. Pattern overlap (agent patterns ∩ task patterns) - weight: 30%
	 * 3. File path analysis (file paths → code areas) - weight: 30%
	 */
	assignAgent(task: TaskContext): Agent {
		const candidates = this.getAllAgents();
		if (candidates.length === 0) {
			throw new Error('No agents available in registry');
		}

		let bestAgent: Agent | null = null;
		let bestScore = 0;

		for (const agent of candidates) {
			const score = this.calculateMatchScore(agent, task);

			if (score > bestScore) {
				bestScore = score;
				bestAgent = agent;
			}
		}

		if (!bestAgent) {
			// Fallback: return first agent
			bestAgent = candidates[0];
			this.logAssignment(task, bestAgent, 'Fallback assignment (no good matches)');
		} else {
			this.logAssignment(task, bestAgent, `Match score: ${bestScore.toFixed(2)}`);
		}

		return bestAgent;
	}

	/**
	 * Calculate match score between agent and task
	 *
	 * DESIGN DECISION: Weighted scoring (category 40%, patterns 30%, files 30%)
	 * WHY: Category is strongest signal, patterns and files refine selection
	 */
	private calculateMatchScore(agent: Agent, task: TaskContext): number {
		let score = 0;

		// Category match (40% weight)
		if (agent.type.toLowerCase() === task.category.toLowerCase()) {
			score += 0.4;
		}

		// Pattern overlap (30% weight)
		if (task.patterns.length > 0 && agent.patterns.length > 0) {
			const overlap = task.patterns.filter(p => agent.patterns.includes(p)).length;
			const patternScore = overlap / task.patterns.length;
			score += patternScore * 0.3;
		}

		// File path analysis (30% weight)
		if (task.files.length > 0 && agent.relevantCode.length > 0) {
			let fileMatches = 0;
			for (const taskFile of task.files) {
				for (const agentCode of agent.relevantCode) {
					if (taskFile.includes(agentCode) || agentCode.includes(taskFile)) {
						fileMatches++;
						break;
					}
				}
			}
			const fileScore = fileMatches / task.files.length;
			score += fileScore * 0.3;
		}

		return score;
	}

	/**
	 * Record task assignment for workload tracking
	 */
	recordTaskAssignment(agentId: string, taskId: string): void {
		const agent = this.agents.get(agentId);
		if (agent) {
			agent.currentTasks.push(taskId);
		}
	}

	/**
	 * Get agent workload (current and max tasks)
	 */
	getAgentWorkload(agentId: string): AgentWorkload {
		const agent = this.getAgentById(agentId);
		return {
			agentId: agent.id,
			currentTasks: agent.currentTasks.length,
			maxParallelTasks: agent.maxParallelTasks,
			availableCapacity: agent.maxParallelTasks - agent.currentTasks.length
		};
	}

	/**
	 * Register assignment listener for logging
	 */
	onAssignment(listener: (log: string) => void): void {
		this.assignmentListeners.push(listener);
	}

	/**
	 * Log assignment decision
	 */
	private logAssignment(task: TaskContext, agent: Agent, reasoning: string): void {
		const log = `Task ${task.id} → Agent ${agent.id}: ${reasoning}`;
		this.assignmentListeners.forEach(listener => listener(log));
	}
}
