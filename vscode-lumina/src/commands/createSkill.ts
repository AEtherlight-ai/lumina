/**
 * Create Skill Command
 *
 * DESIGN DECISION: Interactive wizard for skill creation with validation
 * WHY: Users need guided workflow to create consistent skill files
 *
 * REASONING CHAIN:
 * 1. User runs command: aetherlight.createSkill
 * 2. Wizard prompts for: name, description, author, tags
 * 3. Validates inputs (name unique, required fields)
 * 4. Loads template from .claude/templates/skill-template.md
 * 5. Replaces placeholders with user input
 * 6. Writes .claude/skills/[name]/SKILL.md
 * 7. Shows success message with file path
 *
 * PATTERN: Pattern-TEMPLATE-001 (Template-Based Code Generation)
 * RELATED: MID-006 (Skill Builder)
 *
 * @module commands/createSkill
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { SkillBuilder, SkillInput } from '../services/SkillBuilder';

/**
 * Create new skill via interactive wizard
 *
 * DESIGN DECISION: Single command with step-by-step prompts
 * WHY: User-friendly workflow, validates at each step
 */
export async function createSkill(): Promise<void> {
	try {
		// 1. Find workspace root
		const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
		if (!workspaceRoot) {
			vscode.window.showErrorMessage('No workspace folder open');
			return;
		}

		// 2. Prompt for skill name
		const name = await vscode.window.showInputBox({
			prompt: 'Enter skill name (e.g., "code-review", "test-runner")',
			placeHolder: 'my-skill',
			validateInput: (value) => {
				if (!value || value.trim() === '') {
					return 'Skill name is required';
				}
				if (!/^[a-z0-9-]+$/.test(value)) {
					return 'Skill name must be lowercase with hyphens (e.g., "my-skill")';
				}
				return null;
			}
		});

		if (!name) {
			return; // User cancelled
		}

		// 3. Prompt for description
		const description = await vscode.window.showInputBox({
			prompt: 'Enter skill description',
			placeHolder: 'Analyzes code and generates review comments',
			validateInput: (value) => {
				if (!value || value.trim() === '') {
					return 'Description is required';
				}
				return null;
			}
		});

		if (!description) {
			return; // User cancelled
		}

		// 4. Prompt for author
		const author = await vscode.window.showInputBox({
			prompt: 'Enter author name',
			placeHolder: 'Your Name',
			value: 'ÆtherLight User'
		});

		if (!author) {
			return; // User cancelled
		}

		// 5. Prompt for tags (comma-separated)
		const tagsInput = await vscode.window.showInputBox({
			prompt: 'Enter tags (comma-separated)',
			placeHolder: 'automation, testing, ci-cd',
			value: ''
		});

		const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];

		// 6. Create SkillBuilder
		const templatesPath = path.join(workspaceRoot, '.claude', 'templates');
		const skillsPath = path.join(workspaceRoot, '.claude', 'skills');
		const builder = new SkillBuilder(templatesPath, skillsPath);

		// 7. Build skill input
		const input: SkillInput = {
			name,
			description,
			author,
			tags
		};

		// 8. Create skill
		const result = await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Creating Skill',
			cancellable: false
		}, async (progress) => {
			progress.report({ message: 'Generating skill file...' });
			return await builder.createSkill(input);
		});

		// 9. Show result
		if (result.success) {
			const action = await vscode.window.showInformationMessage(
				`✅ Skill "${result.skillName}" created successfully!`,
				'Open File'
			);

			if (action === 'Open File' && result.skillPath) {
				const skillFile = path.join(result.skillPath, 'SKILL.md');
				const doc = await vscode.workspace.openTextDocument(skillFile);
				await vscode.window.showTextDocument(doc);
			}
		} else {
			vscode.window.showErrorMessage(`Failed to create skill: ${result.error}`);
		}

	} catch (error: any) {
		vscode.window.showErrorMessage(`Failed to create skill: ${error.message}`);
	}
}

/**
 * Register create skill command
 *
 * DESIGN DECISION: Register as aetherlight.createSkill
 * WHY: Consistent with other aetherlight.* commands
 */
export function registerCreateSkillCommand(context: vscode.ExtensionContext): void {
	const disposable = vscode.commands.registerCommand('aetherlight.createSkill', createSkill);
	context.subscriptions.push(disposable);
}
