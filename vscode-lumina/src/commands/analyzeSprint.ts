/**
 * Analyze Sprint Command
 *
 * DESIGN DECISION: Integrate SkillOrchestrator to analyze sprint confidence
 * WHY: Users need visibility into task completeness and gaps before execution
 *
 * REASONING CHAIN:
 * 1. Load ACTIVE_SPRINT.toml
 * 2. Score confidence via SkillOrchestrator.scoreSprint()
 * 3. Display confidence report modal with:
 *    - Overall confidence percentage
 *    - Task breakdown (high/medium/low)
 *    - Identified gaps
 * 4. Provide action buttons: 'Fill Gaps', 'Regenerate Low Confidence', 'Cancel'
 * 5. Performance: <5s for analysis
 *
 * PATTERN: Pattern-ORCHESTRATION-001 (Smart Skill Chaining)
 * PATTERN: Pattern-INCREMENTAL-001 (Smart Gap Filling)
 * RELATED: MID-009 (Sprint UI Analyze Button)
 *
 * @module commands/analyzeSprint
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { SkillOrchestrator, OrchestratorConfig } from '../services/SkillOrchestrator';
import { MultiFormatParser } from '../services/MultiFormatParser';
import { ConfidenceScorer } from '../services/ConfidenceScorer';
import { PatternLibrary } from '../services/PatternLibrary';
import { AgentRegistry } from '../services/AgentRegistry';
import { ContextGatherer } from '../services/ContextGatherer';

/**
 * Confidence report result
 */
export interface ConfidenceReport {
	average: number;
	highConfidenceTasks: string[];
	mediumConfidenceTasks: string[];
	lowConfidenceTasks: string[];
	gaps: string[];
}

/**
 * Analyze sprint and show confidence report
 *
 * DESIGN DECISION: Single command with modal UI
 * WHY: User-initiated analysis, not automatic
 */
export async function analyzeSprint(): Promise<ConfidenceReport | null> {
	try {
		// 1. Find workspace root
		const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
		if (!workspaceRoot) {
			vscode.window.showErrorMessage('No workspace folder open');
			return null;
		}

		// 2. Find ACTIVE_SPRINT.toml
		const sprintPath = path.join(workspaceRoot, 'internal', 'sprints', 'ACTIVE_SPRINT.toml');

		// 3. Initialize middleware components
		const parser = new MultiFormatParser();
		const scorer = new ConfidenceScorer();
		const patternLibrary = new PatternLibrary();
		const agentsPath = path.join(workspaceRoot, 'internal', 'agents');
		const agentRegistry = new AgentRegistry(agentsPath);
		await agentRegistry.initialize();
		const contextGatherer = new ContextGatherer(patternLibrary, workspaceRoot);

		const config: OrchestratorConfig = {
			parser,
			scorer,
			patternLibrary,
			agentRegistry,
			contextGatherer,
			projectRoot: workspaceRoot
		};

		const orchestrator = new SkillOrchestrator(config);

		// 4. Load and score sprint
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Analyzing Sprint',
			cancellable: false
		}, async (progress) => {
			progress.report({ message: 'Loading sprint...' });
			const sprint = await orchestrator.loadSprint(sprintPath);

			progress.report({ message: 'Scoring confidence...' });
			const confidence = await orchestrator.scoreSprint(sprint);

			return confidence;
		}).then(async (confidence) => {
			if (!confidence) {
				return null;
			}

			// 5. Build confidence report
			const report = buildConfidenceReport(confidence);

			// 6. Show confidence report modal
			await showConfidenceReportModal(report);

			return report;
		});

		return null;
	} catch (error: any) {
		// Handle TOML parse errors specially (MID-018)
		if (error.details?.file && error.details?.line) {
			// TOML parse error with line number - show helpful message with action buttons
			const action = await vscode.window.showErrorMessage(
				`❌ TOML Parse Error at line ${error.details.line}\n\n${error.details.message}\n\nFile: ${path.basename(error.details.file)}`,
				'Open File',
				'Validate TOML'
			);

			if (action === 'Open File') {
				// Open file and jump to error line
				const doc = await vscode.workspace.openTextDocument(error.details.file);
				const editor = await vscode.window.showTextDocument(doc);

				// Jump to error line (line numbers are 0-indexed in VS Code API)
				const line = Math.max(0, error.details.line - 1);
				const position = new vscode.Position(line, error.details.column || 0);
				editor.selection = new vscode.Selection(position, position);
				editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
			} else if (action === 'Validate TOML') {
				// Open TOML validator in browser
				vscode.env.openExternal(vscode.Uri.parse('https://www.toml-lint.com/'));
			}
		} else {
			// Generic error
			vscode.window.showErrorMessage(`Failed to analyze sprint: ${error.message}`);
		}
		return null;
	}
}

/**
 * Build confidence report from scorer results
 *
 * DESIGN DECISION: Categorize tasks by confidence thresholds
 * WHY: High (≥0.8), Medium (0.5-0.8), Low (<0.5)
 */
function buildConfidenceReport(confidence: any): ConfidenceReport {
	const gaps: string[] = [];

	// Identify gaps (low confidence tasks)
	if (confidence.lowConfidenceTasks.length > 0) {
		gaps.push(`${confidence.lowConfidenceTasks.length} tasks with low confidence (<0.5)`);
	}

	// Calculate medium confidence tasks (between 0.5 and 0.8)
	// Note: We don't have direct access to individual scores here, so we infer
	const totalTasks = confidence.lowConfidenceTasks.length + confidence.highConfidenceTasks.length;
	const mediumConfidenceTasks: string[] = []; // Would need to calculate from full task list

	return {
		average: confidence.average,
		highConfidenceTasks: confidence.highConfidenceTasks,
		mediumConfidenceTasks,
		lowConfidenceTasks: confidence.lowConfidenceTasks,
		gaps
	};
}

/**
 * Show confidence report in modal dialog
 *
 * DESIGN DECISION: Use VS Code QuickPick for interactive UI
 * WHY: Native VS Code UI, keyboard navigation, action buttons
 */
async function showConfidenceReportModal(report: ConfidenceReport): Promise<void> {
	const percentage = Math.round(report.average * 100);
	const icon = percentage >= 80 ? '✅' : percentage >= 50 ? '⚠️' : '❌';

	const message = `${icon} Sprint Confidence: ${percentage}%\n\n` +
		`High Confidence: ${report.highConfidenceTasks.length} tasks\n` +
		`Low Confidence: ${report.lowConfidenceTasks.length} tasks\n\n` +
		`Gaps:\n${report.gaps.map(g => `  • ${g}`).join('\n')}`;

	// Show modal with action buttons
	const action = await vscode.window.showInformationMessage(
		message,
		{ modal: true },
		'Fill Gaps',
		'Regenerate Low Confidence',
		'Close'
	);

	if (action === 'Fill Gaps') {
		await fillGaps(report);
	} else if (action === 'Regenerate Low Confidence') {
		await regenerateLowConfidence(report);
	}
}

/**
 * Fill gaps in low confidence tasks
 *
 * DESIGN DECISION: Use ContextGatherer to enrich tasks
 * WHY: Low confidence often due to missing context (files, patterns)
 */
async function fillGaps(report: ConfidenceReport): Promise<void> {
	vscode.window.showInformationMessage(
		`Filling gaps for ${report.lowConfidenceTasks.length} tasks...`
	);

	// TODO: Implement gap filling logic
	// 1. Load tasks from sprint
	// 2. Run ContextGatherer for low confidence tasks
	// 3. Update sprint file with enriched context
	// 4. Show completion message
}

/**
 * Regenerate low confidence tasks
 *
 * DESIGN DECISION: Re-run code-analyze for low confidence tasks only
 * WHY: Pattern-INCREMENTAL-001 (60% token savings vs full re-analysis)
 */
async function regenerateLowConfidence(report: ConfidenceReport): Promise<void> {
	vscode.window.showInformationMessage(
		`Regenerating ${report.lowConfidenceTasks.length} low confidence tasks...`
	);

	// TODO: Implement regeneration logic
	// 1. Filter sprint to low confidence tasks
	// 2. Run code-analyze skill (incremental mode)
	// 3. Parse results and update sprint file
	// 4. Show completion message
}

/**
 * Register analyze sprint command
 *
 * DESIGN DECISION: Register as aetherlight.analyzeSprint
 * WHY: Consistent with other aetherlight.* commands
 */
export function registerAnalyzeSprintCommand(context: vscode.ExtensionContext): void {
	const disposable = vscode.commands.registerCommand('aetherlight.analyzeSprint', analyzeSprint);
	context.subscriptions.push(disposable);
}
