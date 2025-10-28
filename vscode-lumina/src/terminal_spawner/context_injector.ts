/**
 * Context Injector - Agent-Specific Prompt Generation
 *
 * DESIGN DECISION: Generate specialized prompts per agent type
 * WHY: Each agent (DB, UI, API) needs domain-specific context and instructions
 *
 * REASONING CHAIN:
 * 1. Terminal spawned → Claude Code ready → Need agent context
 * 2. Agent type determines: Skills, files to edit, patterns to use
 * 3. Task details provide: Requirements, acceptance criteria, dependencies
 * 4. Generate prompt: "You are {agent}. Your task: {task}. Files: {files}. Patterns: {patterns}."
 * 5. Inject via terminal.sendText() → Claude Code receives context
 * 6. Result: Agent starts with full context, zero manual setup
 *
 * PATTERN: Pattern-TERMINAL-SPAWNER-001 (Isolated Agent Execution)
 * PERFORMANCE: <100ms prompt generation, <50ms injection
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { AgentType, Task } from './types';

/**
 * Context injector for autonomous agents
 *
 * DESIGN DECISION: Template-based prompt generation per agent type
 * WHY: Consistent context structure, easy to extend with new agent types
 */
export class ContextInjector {
  private workspaceRoot: string;

  constructor(workspaceRoot?: string) {
    this.workspaceRoot = workspaceRoot || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
  }

  /**
   * Inject agent-specific context into terminal
   *
   * DESIGN DECISION: Multi-line prompt with task details, files, patterns
   * WHY: Claude Code needs full context to execute task autonomously
   *
   * REASONING CHAIN:
   * 1. Generate agent-specific prompt (role, capabilities, constraints)
   * 2. Add task details (title, description, acceptance criteria)
   * 3. Add file context (which files to edit/create)
   * 4. Add pattern references (proven solutions to apply)
   * 5. Add completion instructions (how to signal completion)
   * 6. Send to terminal → Claude Code processes
   *
   * PERFORMANCE: <100ms prompt generation
   *
   * @param terminal - VS Code terminal instance
   * @param agentType - Type of agent (database, ui, api, etc.)
   * @param task - Task to execute
   */
  async injectContext(terminal: vscode.Terminal, agentType: AgentType, task: Task): Promise<void> {
    const prompt = this.generatePrompt(agentType, task);

    // Send prompt to terminal (Claude Code will process)
    terminal.sendText(prompt);
  }

  /**
   * Generate agent-specific prompt
   *
   * DESIGN DECISION: Template method pattern for prompt generation
   * WHY: Each agent type has different capabilities and constraints
   *
   * @param agentType - Type of agent
   * @param task - Task to execute
   * @returns Multi-line prompt string
   */
  private generatePrompt(agentType: AgentType, task: Task): string {
    const roleDescription = this.getRoleDescription(agentType);
    const capabilities = this.getCapabilities(agentType);
    const constraints = this.getConstraints(agentType);

    const prompt = `
# Autonomous Agent Context

## Your Role
${roleDescription}

## Your Capabilities
${capabilities}

## Your Constraints
${constraints}

## Task: ${task.title}
**Task ID:** ${task.id}
**Estimated Duration:** ${task.duration}

## Acceptance Criteria
${task.acceptanceCriteria.map((criterion, i) => `${i + 1}. ${criterion}`).join('\n')}

## Files to Modify
${task.files.length > 0 ? task.files.map(file => `- ${file}`).join('\n') : '(No specific files - you determine based on task)'}

## Patterns to Apply
${task.patterns.length > 0 ? task.patterns.map(pattern => `- ${pattern}`).join('\n') : '(No specific patterns referenced)'}

## Dependencies
${task.dependencies.length > 0 ? `This task depends on: ${task.dependencies.join(', ')}` : '(No dependencies - you can start immediately)'}

## Completion Instructions
When you complete this task:
1. Create completion signal file: .lumina/workflow/${task.id}.complete.json
2. Format:
   {
     "taskId": "${task.id}",
     "agentType": "${agentType}",
     "status": "success" | "failed" | "blocked",
     "filesChanged": ["file1.ts", "file2.rs"],
     "designDecisions": ["Decision 1", "Decision 2"],
     "nextStages": ["Task ID if blocked"],
     "timestamp": <ISO 8601 timestamp>,
     "error": "Error message if failed"
   }
3. Exit terminal when done

## Start Now
Begin executing this task. Use your full capabilities as a ${agentType} agent.
`.trim();

    return prompt;
  }

  /**
   * Get role description for agent type
   *
   * DESIGN DECISION: Clear role definition per agent
   * WHY: Agent needs to understand their domain expertise and responsibilities
   */
  private getRoleDescription(agentType: AgentType): string {
    const roles: Record<AgentType, string> = {
      database: 'You are a Database Agent specializing in schema design, migrations, queries, and data integrity. Your expertise includes SQL, PostgreSQL, migrations, indexing, and performance optimization.',
      ui: 'You are a UI Agent specializing in user interface design and implementation. Your expertise includes React, TypeScript, CSS, component architecture, accessibility, and responsive design.',
      api: 'You are an API Agent specializing in backend services and REST/GraphQL APIs. Your expertise includes Rust (Actix-web), Node.js, API design, authentication, and microservices.',
      infrastructure: 'You are an Infrastructure Agent specializing in DevOps, deployment, and system architecture. Your expertise includes Docker, CI/CD, cloud platforms, monitoring, and scaling.',
      test: 'You are a Test Agent specializing in automated testing and quality assurance. Your expertise includes unit tests, integration tests, test coverage, and test-driven development.',
      docs: 'You are a Documentation Agent specializing in technical writing and documentation. Your expertise includes Chain of Thought documentation, API docs, user guides, and architecture documentation.',
      review: 'You are a Review Agent specializing in code review and quality assurance. Your expertise includes code quality, design patterns, security, performance, and best practices.',
      commit: 'You are a Commit Agent specializing in Git workflow and version control. Your expertise includes conventional commits, Chain of Thought commit messages, and Git best practices.',
      planning: 'You are a Planning Agent specializing in task breakdown and sprint planning. Your expertise includes dependency analysis, time estimation, and sprint organization.',
    };

    return roles[agentType];
  }

  /**
   * Get capabilities for agent type
   *
   * DESIGN DECISION: Explicit capability declaration
   * WHY: Agent knows what tools and actions are available
   */
  private getCapabilities(agentType: AgentType): string {
    const capabilities: Record<AgentType, string[]> = {
      database: [
        'Create and modify database schemas',
        'Write SQL migrations (forward and reverse)',
        'Design indexes for performance',
        'Write complex queries',
        'Implement data validation',
      ],
      ui: [
        'Create React components',
        'Implement responsive layouts',
        'Write TypeScript interfaces',
        'Style with CSS/Tailwind',
        'Ensure accessibility (WCAG)',
      ],
      api: [
        'Design REST/GraphQL APIs',
        'Implement Rust/Node.js endpoints',
        'Add authentication/authorization',
        'Write API documentation',
        'Handle errors gracefully',
      ],
      infrastructure: [
        'Configure Docker containers',
        'Write CI/CD pipelines',
        'Set up monitoring/logging',
        'Optimize deployment',
        'Scale infrastructure',
      ],
      test: [
        'Write unit tests',
        'Write integration tests',
        'Achieve >85% coverage',
        'Write benchmarks',
        'Validate edge cases',
      ],
      docs: [
        'Write Chain of Thought docs',
        'Create API documentation',
        'Write user guides',
        'Document architecture',
        'Create examples',
      ],
      review: [
        'Review code quality',
        'Check design patterns',
        'Validate security',
        'Check performance',
        'Enforce standards',
      ],
      commit: [
        'Write conventional commits',
        'Generate commit messages',
        'Include Chain of Thought',
        'Reference patterns',
        'Link task IDs',
      ],
      planning: [
        'Break down tasks',
        'Identify dependencies',
        'Estimate durations',
        'Assign agents',
        'Organize sprints',
      ],
    };

    return capabilities[agentType].map((cap, i) => `${i + 1}. ${cap}`).join('\n');
  }

  /**
   * Get constraints for agent type
   *
   * DESIGN DECISION: Explicit constraint declaration
   * WHY: Agent knows their boundaries and limitations
   */
  private getConstraints(agentType: AgentType): string {
    const constraints: Record<AgentType, string[]> = {
      database: [
        'Do NOT break existing migrations',
        'Do NOT delete data without explicit approval',
        'Always write reversible migrations',
        'Follow naming conventions',
      ],
      ui: [
        'Do NOT break accessibility',
        'Do NOT hardcode strings (use i18n)',
        'Follow design system',
        'Maintain responsive design',
      ],
      api: [
        'Do NOT expose secrets',
        'Do NOT skip authentication',
        'Follow REST/GraphQL conventions',
        'Validate all inputs',
      ],
      infrastructure: [
        'Do NOT commit secrets',
        'Do NOT skip health checks',
        'Follow security best practices',
        'Document all changes',
      ],
      test: [
        'Do NOT skip edge cases',
        'Do NOT commit failing tests',
        'Achieve >85% coverage',
        'Follow test naming conventions',
      ],
      docs: [
        'Do NOT skip Chain of Thought',
        'Do NOT write generic docs',
        'Include examples',
        'Keep docs synchronized with code',
      ],
      review: [
        'Do NOT approve without review',
        'Do NOT skip security checks',
        'Provide constructive feedback',
        'Check all acceptance criteria',
      ],
      commit: [
        'Do NOT skip Chain of Thought',
        'Do NOT commit secrets',
        'Follow conventional commits',
        'Link to task IDs',
      ],
      planning: [
        'Do NOT create circular dependencies',
        'Do NOT skip dependency analysis',
        'Estimate realistically',
        'Consider agent availability',
      ],
    };

    return constraints[agentType].map((con, i) => `${i + 1}. ${con}`).join('\n');
  }
}
