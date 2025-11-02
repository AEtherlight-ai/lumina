/**
 * AgentBuilder Service
 *
 * DESIGN DECISION: Interactive wizard for agent creation following Pattern-CONTEXT-003
 * WHY: Manual agent creation is complex (15-30min) and error-prone. Wizard guides user, validates inputs, ensures Pattern-CONTEXT-003 compliance.
 *
 * REASONING CHAIN:
 * 1. User runs aetherlight.createAgent command
 * 2. Wizard prompts for: name, type, role, responsibilities, expertise, patterns, skills, performance targets, pitfalls
 * 3. Validates: agent name uniqueness, required fields, token budget (<4k recommended, <10k max)
 * 4. Loads template from .claude/templates/agent-context-template.md
 * 5. Replaces placeholders: {{name}}, {{type}}, {{role}}, etc.
 * 6. Writes internal/agents/[agent-name]-context.md
 * 7. Adds to AgentRegistry via refresh()
 * 8. Performance: <60s user interaction time
 *
 * PATTERN: Pattern-CONTEXT-003 (Hierarchical Agent Contexts)
 * PATTERN: Pattern-AGENT-001 (Intelligent Agent Assignment)
 * RELATED: MID-007 (Agent Builder sprint task)
 *
 * @module services/AgentBuilder
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Performance target for agent
 */
export interface PerformanceTarget {
	metric: string;
	target: string;
}

/**
 * Common pitfall example
 */
export interface Pitfall {
	title: string;
	bad: string;
	good: string;
	explanation: string;
}

/**
 * Input for agent creation
 */
export interface AgentInput {
	name: string;
	type: string;
	role: string;
	responsibilities: string[];
	expertise: string[];
	patterns: string[];
	skills: string[];
	performanceTargets: PerformanceTarget[];
	pitfalls: Pitfall[];
}

/**
 * Result of agent creation
 */
export interface AgentCreationResult {
	success: boolean;
	agentName?: string;
	agentFilePath?: string;
	tokenBudget?: number;
	error?: string;
}

/**
 * Validation result for agent input
 */
export interface ValidationResult {
	valid: boolean;
	errors: string[];
}

/**
 * Token budget validation result
 */
export interface TokenBudgetValidation {
	valid: boolean;
	warning: boolean;
	message?: string;
}

/**
 * AgentBuilder Service
 *
 * Creates agents via interactive wizard with Pattern-CONTEXT-003 template generation.
 * Performance target: <60s user interaction time
 */
export class AgentBuilder {
	constructor(
		private templatesPath: string,
		private agentsPath: string
	) {}

	/**
	 * Load agent template from file
	 *
	 * DESIGN DECISION: Load from .claude/templates/agent-context-template.md
	 * WHY: Template provides consistent Pattern-CONTEXT-003 structure
	 */
	async loadTemplate(): Promise<string> {
		const templatePath = path.join(this.templatesPath, 'agent-context-template.md');

		if (!fs.existsSync(templatePath)) {
			throw new Error(`Template file not found: ${templatePath}`);
		}

		return fs.readFileSync(templatePath, 'utf8');
	}

	/**
	 * Check if agent name is unique
	 *
	 * DESIGN DECISION: Check internal/agents/ directory
	 * WHY: Prevent overwriting existing agents
	 */
	async isAgentNameUnique(name: string): Promise<boolean> {
		const agentFile = this.getAgentFilePath(name);
		return !fs.existsSync(agentFile);
	}

	/**
	 * Validate agent input
	 *
	 * DESIGN DECISION: Name, type, role are required
	 * WHY: Agents without these fields are invalid
	 */
	validateInput(input: AgentInput): ValidationResult {
		const errors: string[] = [];

		if (!input.name || input.name.trim() === '') {
			errors.push('name');
		}

		if (!input.type || input.type.trim() === '') {
			errors.push('type');
		}

		if (!input.role || input.role.trim() === '') {
			errors.push('role');
		}

		return {
			valid: errors.length === 0,
			errors
		};
	}

	/**
	 * Estimate token budget for agent content
	 *
	 * DESIGN DECISION: Rough estimate based on content length
	 * WHY: Pattern-CONTEXT-003 requires <4k tokens recommended, <10k max
	 * FORMULA: ~0.75 tokens per character (average for English text)
	 */
	estimateTokens(input: AgentInput): number {
		// Calculate total content length
		let totalLength = 0;

		totalLength += input.name.length;
		totalLength += input.type.length;
		totalLength += input.role.length;
		totalLength += input.responsibilities.join(' ').length;
		totalLength += input.expertise.join(' ').length;
		totalLength += input.patterns.join(' ').length;
		totalLength += input.skills.join(' ').length;

		// Performance targets
		for (const target of input.performanceTargets) {
			totalLength += target.metric.length + target.target.length;
		}

		// Pitfalls
		for (const pitfall of input.pitfalls) {
			totalLength += pitfall.title.length + pitfall.bad.length + pitfall.good.length + pitfall.explanation.length;
		}

		// Estimate tokens: ~0.75 tokens per character
		return Math.ceil(totalLength * 0.75);
	}

	/**
	 * Validate token budget
	 *
	 * DESIGN DECISION: Warn if >4k, error if >10k
	 * WHY: Pattern-CONTEXT-003 optimization target
	 */
	validateTokenBudget(tokens: number): TokenBudgetValidation {
		if (tokens > 10000) {
			return {
				valid: false,
				warning: false,
				message: `Token budget ${tokens} exceeds maximum of 10,000 tokens`
			};
		}

		if (tokens > 4000) {
			return {
				valid: true,
				warning: true,
				message: `Token budget ${tokens} exceeds recommended 4,000 tokens`
			};
		}

		return {
			valid: true,
			warning: false
		};
	}

	/**
	 * Replace template placeholders with user input
	 *
	 * DESIGN DECISION: Replace all agent-specific placeholders
	 * WHY: Template placeholders must be replaced with user input
	 */
	replacePlaceholders(template: string, input: AgentInput): string {
		const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

		let result = template;

		// Basic fields
		result = result.replace(/\{\{name\}\}/g, input.name);
		result = result.replace(/\{\{type\}\}/g, input.type);
		result = result.replace(/\{\{date\}\}/g, now);
		result = result.replace(/\{\{role\}\}/g, input.role);

		// Arrays (simple comma-separated for now; in real wizard, would use Handlebars)
		result = result.replace(/\{\{#each responsibilities\}\}[\s\S]*?\{\{\/each\}\}/g,
			input.responsibilities.map(r => `- ${r}`).join('\n'));
		result = result.replace(/\{\{#each expertise\}\}[\s\S]*?\{\{\/each\}\}/g,
			input.expertise.map(e => `- ${e}`).join('\n'));
		result = result.replace(/\{\{#each patterns\}\}[\s\S]*?\{\{\/each\}\}/g,
			input.patterns.map(p => `- ${p}`).join('\n'));
		result = result.replace(/\{\{#each skills\}\}[\s\S]*?\{\{\/each\}\}/g,
			input.skills.map(s => `- **${s}**`).join('\n'));

		// Performance targets
		result = result.replace(/\{\{#each performance_targets\}\}[\s\S]*?\{\{\/each\}\}/g,
			input.performanceTargets.map(t => `- **${t.metric}:** ${t.target}`).join('\n'));

		// Pitfalls
		const pitfallsText = input.pitfalls.map((p, i) =>
			`### Pitfall #${i+1}: ${p.title}\n**Bad:**\n\`\`\`\n${p.bad}\n\`\`\`\n\n**Good:**\n\`\`\`\n${p.good}\n\`\`\`\n\n**Why:** ${p.explanation}`
		).join('\n\n');
		result = result.replace(/\{\{#each pitfalls\}\}[\s\S]*?\{\{\/each\}\}/g, pitfallsText);

		return result;
	}

	/**
	 * Get agent file path
	 *
	 * DESIGN DECISION: Agents stored in internal/agents/[agent-name]-context.md
	 * WHY: Consistent naming convention for agent discovery
	 */
	getAgentFilePath(agentName: string): string {
		// Convert agent name to filename format (lowercase with hyphens)
		const fileName = agentName.toLowerCase().replace(/\s+/g, '-');
		return path.join(this.agentsPath, `${fileName}-context.md`);
	}

	/**
	 * Write agent context file
	 *
	 * DESIGN DECISION: Write to internal/agents/[agent-name]-context.md
	 * WHY: Standard location for agent definitions
	 */
	async writeAgentFile(agentName: string, content: string): Promise<void> {
		const agentFile = this.getAgentFilePath(agentName);
		fs.writeFileSync(agentFile, content, 'utf8');
	}

	/**
	 * Create agent with complete workflow
	 *
	 * DESIGN DECISION: End-to-end agent creation
	 * WHY: Single entry point for agent creation
	 *
	 * WORKFLOW:
	 * 1. Validate input
	 * 2. Check agent name uniqueness
	 * 3. Load template
	 * 4. Replace placeholders
	 * 5. Estimate token budget
	 * 6. Validate token budget
	 * 7. Write agent context file
	 * 8. Rollback on error
	 */
	async createAgent(input: AgentInput): Promise<AgentCreationResult> {
		try {
			// Step 1: Validate input
			const validation = this.validateInput(input);
			if (!validation.valid) {
				return {
					success: false,
					error: `Validation failed: ${validation.errors.join(', ')} are required`
				};
			}

			// Step 2: Check agent name uniqueness
			const isUnique = await this.isAgentNameUnique(input.name);
			if (!isUnique) {
				return {
					success: false,
					error: `Agent '${input.name}' already exists`
				};
			}

			// Step 3: Load template
			const template = await this.loadTemplate();

			// Step 4: Replace placeholders
			const content = this.replacePlaceholders(template, input);

			// Step 5: Estimate token budget
			const tokenBudget = this.estimateTokens(input);

			// Step 6: Validate token budget
			const budgetValidation = this.validateTokenBudget(tokenBudget);
			if (!budgetValidation.valid) {
				return {
					success: false,
					error: budgetValidation.message || 'Token budget exceeded'
				};
			}

			// Step 7: Write agent context file
			await this.writeAgentFile(input.name, content);

			// Success
			return {
				success: true,
				agentName: input.name,
				agentFilePath: this.getAgentFilePath(input.name),
				tokenBudget
			};
		} catch (error: any) {
			// Step 8: Rollback on error
			const agentFile = this.getAgentFilePath(input.name);
			if (fs.existsSync(agentFile)) {
				try {
					fs.rmSync(agentFile);
				} catch (rollbackError) {
					// Ignore rollback errors
				}
			}

			return {
				success: false,
				error: error.message || 'Unknown error occurred'
			};
		}
	}
}
