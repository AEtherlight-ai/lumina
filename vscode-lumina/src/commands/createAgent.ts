/**
 * Create Agent Command
 *
 * DESIGN DECISION: Interactive wizard for agent creation with validation
 * WHY: Users need guided workflow to create consistent agent context files
 *
 * REASONING CHAIN:
 * 1. User runs command: aetherlight.createAgent
 * 2. Wizard prompts for: name, type, role, responsibilities, expertise, patterns, skills, performance targets
 * 3. Validates inputs (name unique, required fields, token budget)
 * 4. Loads template from .claude/templates/agent-context-template.md
 * 5. Replaces placeholders with user input
 * 6. Writes internal/agents/[agent-name]-context.md
 * 7. Shows success message with file path
 *
 * PATTERN: Pattern-TEMPLATE-001 (Template-Based Code Generation)
 * PATTERN: Pattern-CONTEXT-003 (Hierarchical Agent Contexts)
 * RELATED: MID-007 (Agent Builder), MID-011 (Integration)
 *
 * @module commands/createAgent
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { AgentBuilder, AgentInput } from '../services/AgentBuilder';

/**
 * Create new agent via interactive wizard
 *
 * DESIGN DECISION: Single command with step-by-step prompts
 * WHY: User-friendly workflow, validates at each step
 */
export async function createAgent(): Promise<void> {
	try {
		// 1. Find workspace root
		const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
		if (!workspaceRoot) {
			// MID-023: Enhanced error message
			const action = await vscode.window.showErrorMessage(
				'❌ No Workspace Folder Open\n\n' +
				'Why this matters: Agents must be created within a project workspace at internal/agents/.\n\n' +
				'What to do: Open your project folder first.',
				'Open Folder'
			);

			if (action === 'Open Folder') {
				await vscode.commands.executeCommand('vscode.openFolder');
			}
			return;
		}

		// 2. Prompt for agent name
		const name = await vscode.window.showInputBox({
			prompt: 'Enter agent name (e.g., "infrastructure-agent", "ui-agent")',
			placeHolder: 'my-agent',
			validateInput: (value) => {
				if (!value || value.trim() === '') {
					return 'Agent name is required';
				}
				if (!/^[a-z0-9-]+$/.test(value)) {
					return 'Agent name must be lowercase with hyphens (e.g., "my-agent")';
				}
				return null;
			}
		});

		if (!name) {
			return; // User cancelled
		}

		// 3. Prompt for agent type
		const type = await vscode.window.showQuickPick([
			{ label: 'infrastructure-agent', description: 'Core services, APIs, build systems' },
			{ label: 'ui-agent', description: 'Frontend components, layouts, styling' },
			{ label: 'data-agent', description: 'Database schemas, migrations, queries' },
			{ label: 'testing-agent', description: 'Test suites, coverage, CI/CD' },
			{ label: 'documentation-agent', description: 'Technical docs, guides, READMEs' },
			{ label: 'custom', description: 'Create a custom agent type' }
		], {
			placeHolder: 'Select agent type or choose custom',
			canPickMany: false
		});

		if (!type) {
			return; // User cancelled
		}

		let agentType = type.label;
		if (type.label === 'custom') {
			const customType = await vscode.window.showInputBox({
				prompt: 'Enter custom agent type',
				placeHolder: 'integration-agent',
				validateInput: (value) => {
					if (!value || value.trim() === '') {
						return 'Agent type is required';
					}
					return null;
				}
			});
			if (!customType) {
				return;
			}
			agentType = customType;
		}

		// 4. Prompt for role
		const role = await vscode.window.showInputBox({
			prompt: 'Enter agent role (single line)',
			placeHolder: 'Handles backend infrastructure, APIs, and service integrations',
			validateInput: (value) => {
				if (!value || value.trim() === '') {
					return 'Role is required';
				}
				return null;
			}
		});

		if (!role) {
			return; // User cancelled
		}

		// 5. Prompt for responsibilities (comma-separated)
		const responsibilitiesInput = await vscode.window.showInputBox({
			prompt: 'Enter responsibilities (comma-separated)',
			placeHolder: 'Build APIs, Create services, Design schemas',
			validateInput: (value) => {
				if (!value || value.trim() === '') {
					return 'At least one responsibility is required';
				}
				return null;
			}
		});

		if (!responsibilitiesInput) {
			return; // User cancelled
		}

		const responsibilities = responsibilitiesInput.split(',').map(r => r.trim()).filter(r => r.length > 0);

		// 6. Prompt for expertise (comma-separated)
		const expertiseInput = await vscode.window.showInputBox({
			prompt: 'Enter areas of expertise (comma-separated)',
			placeHolder: 'Node.js, TypeScript, REST APIs, Database design',
			validateInput: (value) => {
				if (!value || value.trim() === '') {
					return 'At least one area of expertise is required';
				}
				return null;
			}
		});

		if (!expertiseInput) {
			return; // User cancelled
		}

		const expertise = expertiseInput.split(',').map(e => e.trim()).filter(e => e.length > 0);

		// 7. Prompt for patterns (comma-separated, optional)
		const patternsInput = await vscode.window.showInputBox({
			prompt: 'Enter pattern IDs to reference (comma-separated, optional)',
			placeHolder: 'Pattern-API-001, Pattern-SERVICE-001',
			value: ''
		});

		const patterns = patternsInput ? patternsInput.split(',').map(p => p.trim()).filter(p => p.length > 0) : [];

		// 8. Prompt for skills (comma-separated, optional)
		const skillsInput = await vscode.window.showInputBox({
			prompt: 'Enter skill names to reference (comma-separated, optional)',
			placeHolder: 'api-builder, database-designer',
			value: ''
		});

		const skills = skillsInput ? skillsInput.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];

		// 9. Prompt for performance targets (optional, simplified)
		const addPerformance = await vscode.window.showQuickPick(['Yes', 'No'], {
			placeHolder: 'Add performance targets? (optional)'
		});

		const performanceTargets = [];
		if (addPerformance === 'Yes') {
			const perfInput = await vscode.window.showInputBox({
				prompt: 'Enter performance target (e.g., "API response time: <200ms")',
				placeHolder: 'metric: target'
			});
			if (perfInput) {
				const [metric, target] = perfInput.split(':').map(s => s.trim());
				if (metric && target) {
					performanceTargets.push({ metric, target });
				}
			}
		}

		// 10. Skip pitfalls for now (complex, can be added manually later)
		const pitfalls: any[] = [];

		// 11. Create AgentBuilder
		const templatesPath = path.join(workspaceRoot, '.claude', 'templates');
		const agentsPath = path.join(workspaceRoot, 'internal', 'agents');
		const builder = new AgentBuilder(templatesPath, agentsPath);

		// 12. Build agent input
		const input: AgentInput = {
			name,
			type: agentType,
			role,
			responsibilities,
			expertise,
			patterns,
			skills,
			performanceTargets,
			pitfalls
		};

		// 13. Create agent
		const result = await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Creating Agent',
			cancellable: false
		}, async (progress) => {
			progress.report({ message: 'Generating agent context file...' });
			return await builder.createAgent(input);
		});

		// 14. Show result
		if (result.success) {
			const message = result.tokenBudget
				? `✅ Agent "${result.agentName}" created successfully! (Token budget: ${result.tokenBudget} tokens)`
				: `✅ Agent "${result.agentName}" created successfully!`;

			const action = await vscode.window.showInformationMessage(
				message,
				'Open File'
			);

			if (action === 'Open File' && result.agentFilePath) {
				const doc = await vscode.workspace.openTextDocument(result.agentFilePath);
				await vscode.window.showTextDocument(doc);
			}
		} else {
			// MID-023: Enhanced error message
			const action = await vscode.window.showErrorMessage(
				`❌ Agent Creation Failed\n\n` +
				`Error: ${result.error}\n\n` +
				`Why this matters: Agent files are required for intelligent task assignment.\n\n` +
				`Common issues:\n` +
				`• Permission issues writing to internal/agents/\n` +
				`• Invalid agent configuration\n` +
				`• Duplicate agent ID`,
				'Retry',
				'View Documentation'
			);

			if (action === 'Retry') {
				await createAgent();
			} else if (action === 'View Documentation') {
				vscode.env.openExternal(vscode.Uri.parse('https://docs.aetherlight.dev/agents'));
			}
		}

	} catch (error: any) {
		// MID-023: Enhanced error message
		const action = await vscode.window.showErrorMessage(
			`❌ Agent Creation Failed\n\n` +
			`Unexpected error: ${error.message}\n\n` +
			`Why this matters: The agent wizard encountered an error.`,
			'Retry',
			'Report Issue'
		);

		if (action === 'Retry') {
			await createAgent();
		} else if (action === 'Report Issue') {
			vscode.env.openExternal(vscode.Uri.parse('https://github.com/anthropics/aetherlight/issues/new'));
		}
	}
}

/**
 * Register create agent command
 *
 * DESIGN DECISION: Register as aetherlight.createAgent
 * WHY: Consistent with other aetherlight.* commands
 */
export function registerCreateAgentCommand(context: vscode.ExtensionContext): void {
	const disposable = vscode.commands.registerCommand('aetherlight.createAgent', createAgent);
	context.subscriptions.push(disposable);
}
