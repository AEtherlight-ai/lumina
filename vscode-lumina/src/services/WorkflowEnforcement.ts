/**
 * Workflow Enforcement Service
 *
 * DESIGN DECISION: Proactive workflow guidance to teach users about middleware features
 * WHY: Users don't know about analyzeAndPlan when manually creating tasks
 *
 * REASONING CHAIN:
 * 1. User manually creates 3+ tasks in ACTIVE_SPRINT.toml
 * 2. This is tedious and error-prone (no agent assignment, patterns, validation)
 * 3. WorkflowEnforcement detects this pattern
 * 4. Shows suggestion: "Try Analyze & Plan to auto-generate tasks!"
 * 5. User learns about middleware at the perfect moment
 *
 * PATTERN: Pattern-WORKFLOW-INTEGRATION-001
 * PATTERN: Pattern-USER-FEEDBACK-001
 * RELATED: MID-026 (File Watcher for Manual Task Detection)
 *
 * @module services/WorkflowEnforcement
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { MiddlewareLogger } from './MiddlewareLogger';

/**
 * Workflow Enforcement Service
 *
 * Detects workflow anti-patterns and suggests better alternatives.
 */
export class WorkflowEnforcement {
	private logger: MiddlewareLogger;
	private debounceTimer: NodeJS.Timeout | null = null;
	private lastTaskCount: number = 0;
	private context: vscode.ExtensionContext;

	constructor(context: vscode.ExtensionContext) {
		this.context = context;
		this.logger = MiddlewareLogger.getInstance();
	}

	/**
	 * Initialize file watchers
	 *
	 * DESIGN DECISION: Watch ACTIVE_SPRINT.toml for manual task creation + analysis documents for suggestions
	 * WHY: Detect when user is creating tasks manually OR saving analysis docs that could become tasks
	 */
	public initialize(workspaceRoot: string): vscode.Disposable[] {
		const sprintPath = path.join(workspaceRoot, 'internal', 'sprints', 'ACTIVE_SPRINT.toml');

		this.logger.info('WorkflowEnforcement: Initializing file watchers');

		// Watch for text document changes (manual task creation - MID-026)
		const changeWatcher = vscode.workspace.onDidChangeTextDocument(async (event) => {
			// Check if the changed document is ACTIVE_SPRINT.toml
			if (event.document.uri.fsPath.includes('ACTIVE_SPRINT.toml')) {
				this.onSprintFileChanged(event.document);
			}
		});

		// Watch for document saves (analysis document detection - MID-027)
		const saveWatcher = vscode.workspace.onDidSaveTextDocument(async (document) => {
			await this.onDocumentSaved(document);
		});

		return [changeWatcher, saveWatcher];
	}

	/**
	 * Handle sprint file changes (MID-026)
	 *
	 * DESIGN DECISION: Debounced detection with 3-second delay
	 * WHY: Don't spam suggestions on every keystroke
	 */
	private onSprintFileChanged(document: vscode.TextDocument): void {
		// Clear existing debounce timer
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		// Debounce: Wait 3 seconds after last change before checking
		this.debounceTimer = setTimeout(() => {
			this.detectManualTaskCreation(document);
		}, 3000);
	}

	/**
	 * Detect manual task creation (MID-026)
	 *
	 * DESIGN DECISION: Count [tasks.XXX] sections, suggest after 3+
	 * WHY: 1-2 tasks = minor edits, 3+ = user is creating lots of tasks manually
	 */
	private async detectManualTaskCreation(document: vscode.TextDocument): Promise<void> {
		// Check if user has disabled suggestions
		const dontShow = this.context.workspaceState.get<boolean>('workflowEnforcement.dontShowManualTaskSuggestion', false);
		if (dontShow) {
			return;
		}

		// Count task sections
		const content = document.getText();
		const taskMatches = content.match(/\[tasks\.[A-Z]+-\d+\]/g);
		const currentTaskCount = taskMatches ? taskMatches.length : 0;

		// Check if user added 3+ tasks since last check
		const addedTasks = currentTaskCount - this.lastTaskCount;

		if (addedTasks >= 3) {
			this.logger.info(`WorkflowEnforcement: Detected ${addedTasks} new tasks created manually`);

			// Show suggestion
			const action = await vscode.window.showInformationMessage(
				`💡 Creating tasks manually?\n\n` +
				`You just added ${addedTasks} tasks. Try "Analyze & Plan" to auto-generate tasks with:\n` +
				`• Agent assignments\n` +
				`• Pattern recommendations\n` +
				`• File context\n` +
				`• Validation criteria`,
				'Show Me',
				'Continue',
				'Don\'t Show Again'
			);

			if (action === 'Show Me') {
				// Open documentation
				vscode.env.openExternal(vscode.Uri.parse('https://docs.aetherlight.dev/analyze-and-plan'));
			} else if (action === 'Don\'t Show Again') {
				// Store preference
				await this.context.workspaceState.update('workflowEnforcement.dontShowManualTaskSuggestion', true);
				this.logger.info('WorkflowEnforcement: User disabled manual task creation suggestions');
			}
		}

		// Update last count
		this.lastTaskCount = currentTaskCount;
	}

	/**
	 * Handle document saved (MID-027)
	 *
	 * DESIGN DECISION: Detect analysis/requirements documents and suggest analyzeAndPlan
	 * WHY: Users save gap analysis, don't know they can auto-generate tasks from it
	 *
	 * Detection criteria:
	 * - Filename contains: 'analysis', 'gaps', 'requirements', 'planning'
	 * - OR content contains headers: '## Tasks', '## Issues', '## Requirements'
	 */
	private async onDocumentSaved(document: vscode.TextDocument): Promise<void> {
		// Only check markdown files
		if (document.languageId !== 'markdown') {
			return;
		}

		// Check if suggestion disabled for this file
		const ignoredFiles = this.context.workspaceState.get<string[]>('workflowEnforcement.ignoredAnalysisFiles', []);
		if (ignoredFiles.includes(document.uri.fsPath)) {
			return;
		}

		// Check if this looks like an analysis document
		const filename = path.basename(document.uri.fsPath).toLowerCase();
		const content = document.getText();

		const hasAnalysisFilename =
			filename.includes('analysis') ||
			filename.includes('gaps') ||
			filename.includes('requirements') ||
			filename.includes('planning');

		const hasAnalysisHeaders =
			content.includes('## Tasks') ||
			content.includes('## Issues') ||
			content.includes('## Requirements') ||
			content.includes('## Problems');

		if (hasAnalysisFilename || hasAnalysisHeaders) {
			this.logger.info(`WorkflowEnforcement: Detected analysis document saved: ${filename}`);

			// Show proactive suggestion
			const action = await vscode.window.showInformationMessage(
				`📋 Analysis Document Saved\n\n` +
				`"${path.basename(document.uri.fsPath)}" looks like an analysis document.\n\n` +
				`Generate sprint tasks from it automatically?`,
				'Analyze & Plan',
				'Later',
				'Don\'t Suggest for This File'
			);

			if (action === 'Analyze & Plan') {
				// Run analyzeAndPlan command
				await vscode.commands.executeCommand('aetherlight.analyzeAndPlan');
			} else if (action === 'Don\'t Suggest for This File') {
				// Add file to ignored list
				const updated = [...ignoredFiles, document.uri.fsPath];
				await this.context.workspaceState.update('workflowEnforcement.ignoredAnalysisFiles', updated);
				this.logger.info(`WorkflowEnforcement: Added ${filename} to ignored list`);
			}
		}
	}

	/**
	 * Reset suggestion state (for testing)
	 */
	public async resetSuggestionState(): Promise<void> {
		await this.context.workspaceState.update('workflowEnforcement.dontShowManualTaskSuggestion', false);
		await this.context.workspaceState.update('workflowEnforcement.ignoredAnalysisFiles', []);
		this.lastTaskCount = 0;
	}
}
