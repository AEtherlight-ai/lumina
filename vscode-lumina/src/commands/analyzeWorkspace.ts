/**
 * Analyze Workspace Command - Integrates @aetherlight/analyzer into VS Code
 *
 * DESIGN DECISION: Integrate analyzer as workspace command (not CLI)
 * WHY: Users can analyze their codebase directly from VS Code without switching to terminal
 *
 * REASONING CHAIN:
 * 1. User wants to analyze current workspace
 * 2. Run command from Command Palette: "ÆtherLight: Analyze Workspace"
 * 3. Analyzer scans TypeScript/JavaScript files → generates analysis.json
 * 4. Optionally generate sprint plans (Phase A/B/C)
 * 5. Show results in output panel with next steps
 * 6. Result: Zero-friction codebase analysis from VS Code
 *
 * PATTERN: Pattern-IDE-002 (Integrated Code Analysis)
 * RELATED: @aetherlight/analyzer (packages/aetherlight-analyzer)
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TypeScriptParser } from '@aetherlight/analyzer';
import { ArchitectureAnalyzer, ComplexityAnalyzer, TechnicalDebtAnalyzer } from '@aetherlight/analyzer';
import { SprintGenerator } from '@aetherlight/analyzer';
import type {
	ArchitectureAnalysis,
	ComplexityAnalysis,
	TechnicalDebtAnalysis
} from '@aetherlight/analyzer';

/**
 * Register analyze workspace commands
 *
 * DESIGN DECISION: Two commands - analyze only, and analyze + generate sprints
 * WHY: User might want quick analysis without sprint generation overhead
 *
 * Commands:
 * 1. aetherlight.analyzeWorkspace - Parse and analyze codebase only
 * 2. aetherlight.analyzeAndGenerateSprints - Full analysis + sprint plans
 */
export function registerAnalyzeWorkspaceCommands(context: vscode.ExtensionContext): void {
	// Command 1: Analyze workspace only
	const analyzeCommand = vscode.commands.registerCommand('aetherlight.analyzeWorkspace', async () => {
		await analyzeWorkspace(context, false);
	});
	context.subscriptions.push(analyzeCommand);

	// Command 2: Analyze + generate sprints
	const analyzeAndGenerateCommand = vscode.commands.registerCommand('aetherlight.analyzeAndGenerateSprints', async () => {
		await analyzeWorkspace(context, true);
	});
	context.subscriptions.push(analyzeAndGenerateCommand);
}

/**
 * Analyze workspace implementation
 *
 * DESIGN DECISION: Use workspace root as analysis target
 * WHY: Most common use case - analyze entire project
 *
 * @param context - Extension context for progress notifications
 * @param generateSprints - Whether to generate sprint plans after analysis
 */
async function analyzeWorkspace(context: vscode.ExtensionContext, generateSprints: boolean): Promise<void> {
	// Get workspace root
	const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (!workspaceRoot) {
		vscode.window.showErrorMessage('ÆtherLight: No workspace folder open');
		return;
	}

	// Create output channel for results
	const outputChannel = vscode.window.createOutputChannel('ÆtherLight Analyzer');
	outputChannel.show();

	// Create .aetherlight directory if it doesn't exist
	const aetherlightDir = path.join(workspaceRoot, '.aetherlight');
	if (!fs.existsSync(aetherlightDir)) {
		fs.mkdirSync(aetherlightDir, { recursive: true });
	}

	// Run analysis with progress indicator
	await vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: 'ÆtherLight: Analyzing workspace',
		cancellable: false
	}, async (progress) => {
		try {
			// Step 1: Parse TypeScript files
			outputChannel.appendLine('🔍 Parsing TypeScript/JavaScript files...');
			progress.report({ increment: 10, message: 'Parsing files...' });

			const parser = new TypeScriptParser();
			const parseResult = await parser.parse(workspaceRoot);

			outputChannel.appendLine(`✅ Parsed ${parseResult.totalFiles} files (${parseResult.totalLinesOfCode} LOC)`);

			// Step 2: Architecture analysis
			outputChannel.appendLine('🏗️  Analyzing architecture...');
			progress.report({ increment: 20, message: 'Analyzing architecture...' });

			const archAnalyzer = new ArchitectureAnalyzer();
			const archResult = archAnalyzer.analyze(parseResult);
			const archData = archResult.data as ArchitectureAnalysis;

			outputChannel.appendLine(`✅ Architecture: ${archData.pattern} (confidence: ${(archData.confidence * 100).toFixed(1)}%)`);

			// Step 3: Complexity analysis
			outputChannel.appendLine('📊 Analyzing complexity...');
			progress.report({ increment: 20, message: 'Analyzing complexity...' });

			const complexityAnalyzer = new ComplexityAnalyzer();
			const complexityResult = complexityAnalyzer.analyze(parseResult);
			const complexityData = complexityResult.data as ComplexityAnalysis;

			const highComplexityCount = complexityData.functionsOverThreshold.length;
			outputChannel.appendLine(`✅ Avg complexity: ${complexityData.averageComplexity.toFixed(1)}, ${highComplexityCount} functions need refactoring`);

			// Step 4: Technical debt analysis
			outputChannel.appendLine('⚠️  Analyzing technical debt...');
			progress.report({ increment: 20, message: 'Analyzing technical debt...' });

			const debtAnalyzer = new TechnicalDebtAnalyzer();
			const debtResult = debtAnalyzer.analyze(parseResult);
			const debtData = debtResult.data as TechnicalDebtAnalysis;

			outputChannel.appendLine(`✅ Debt score: ${debtData.score}/100, ${debtData.totalIssues} issues found`);

			// Save analysis results
			const analysisOutput = {
				parseResult: {
					totalFiles: parseResult.totalFiles,
					totalLinesOfCode: parseResult.totalLinesOfCode,
					parseErrors: parseResult.parseErrors.length
				},
				architecture: archData,
				complexity: complexityData,
				technicalDebt: debtData,
				timestamp: new Date().toISOString()
			};

			const analysisPath = path.join(aetherlightDir, 'analysis.json');
			fs.writeFileSync(analysisPath, JSON.stringify(analysisOutput, null, 2));
			outputChannel.appendLine(`\n💾 Analysis saved to: ${analysisPath}`);

			// Step 5: Generate sprint plans (optional)
			if (generateSprints) {
				outputChannel.appendLine('\n📋 Sprint generation...');
				outputChannel.appendLine('⚠️  Sprint generation not yet implemented in VS Code command');
				outputChannel.appendLine('💡 Use CLI for sprint generation: npx @aetherlight/analyzer generate-sprints');
				outputChannel.appendLine('   See: https://github.com/AEtherlight-ai/lumina/tree/main/packages/aetherlight-analyzer');
			}

			// Show summary
			outputChannel.appendLine('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
			outputChannel.appendLine('📊 Analysis Summary:');
			outputChannel.appendLine(`  Files analyzed: ${parseResult.totalFiles}`);
			outputChannel.appendLine(`  Lines of code: ${parseResult.totalLinesOfCode}`);
			outputChannel.appendLine(`  Architecture: ${archData.pattern}`);
			outputChannel.appendLine(`  Avg complexity: ${complexityData.averageComplexity.toFixed(1)}`);
			outputChannel.appendLine(`  Debt score: ${debtData.score}/100`);
			outputChannel.appendLine('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

			if (!generateSprints) {
				outputChannel.appendLine('\n📝 Next step:');
				outputChannel.appendLine('  Generate sprints: Run "ÆtherLight: Analyze Workspace and Generate Sprints"');
			}

			vscode.window.showInformationMessage('ÆtherLight: Analysis complete! Check output panel for results.');

		} catch (error: any) {
			outputChannel.appendLine(`\n❌ Analysis failed: ${error.message}`);
			outputChannel.appendLine(error.stack || '');
			vscode.window.showErrorMessage(`ÆtherLight: Analysis failed - ${error.message}`);
		}
	});
}
