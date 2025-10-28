/**
 * Extension Integration - VS Code commands for autonomous sprints
 *
 * DESIGN DECISION: Register commands in extension activation
 * WHY: User can trigger sprints from Command Palette
 *
 * PATTERN: Pattern-VSCODE-001 (Extension Integration)
 * RELATED: AS-027 (Component Integration)
 */

import * as vscode from 'vscode';
import { SprintOrchestrator } from './orchestrator';
import { PlanningChatInterface } from '../planning';
import { ProgressWebviewProvider } from '../progress/webview_provider';
import { SprintStatusBar } from '../progress/status_bar';
// TODO Phase 4: Uncomment when sprint_parser module implemented
// import { parse_sprint_file } from '../../../crates/aetherlight-core/src/sprint_parser';

// Temporary stub for Phase 4 compilation
const parse_sprint_file = (path: string): any => {
    throw new Error('Phase 4 sprint parser not yet implemented');
};

/**
 * Register autonomous sprint commands
 */
export function registerSprintCommands(context: vscode.ExtensionContext): void {
    const workflowDir = vscode.workspace.rootPath + '/.lumina/workflow';
    const orchestrator = new SprintOrchestrator(workflowDir);
    const planningChat = new PlanningChatInterface();
    const progressProvider = new ProgressWebviewProvider();
    const statusBar = new SprintStatusBar();

    // Command: Start planning
    const startPlanning = vscode.commands.registerCommand('lumina.startSprintPlanning', async () => {
        planningChat.show(context);
        const initialPrompt = await vscode.window.showInputBox({
            prompt: 'What feature would you like to implement?',
            placeHolder: 'e.g., Add OAuth2 authentication',
        });

        if (initialPrompt) {
            planningChat.startSession(initialPrompt);
        }
    });

    // Command: Execute sprint from YAML file
    const executeSprint = vscode.commands.registerCommand('lumina.executeSprint', async () => {
        // Show file picker
        const files = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: { 'Sprint Plans': ['yaml', 'yml'] },
            openLabel: 'Select Sprint Plan',
        });

        if (!files || files.length === 0) {
            return;
        }

        const sprintFile = files[0].fsPath;

        // Parse sprint plan
        const sprint = parse_sprint_file(sprintFile);

        // Execute
        await orchestrator.execute(sprint);
    });

    // Command: Pause sprint
    const pauseSprint = vscode.commands.registerCommand('lumina.pauseSprint', async () => {
        await orchestrator.pause();
        vscode.window.showInformationMessage('Sprint paused');
    });

    // Command: Resume sprint
    const resumeSprint = vscode.commands.registerCommand('lumina.resumeSprint', async () => {
        await orchestrator.resume();
        vscode.window.showInformationMessage('Sprint resumed');
    });

    // Command: Stop sprint
    const stopSprint = vscode.commands.registerCommand('lumina.stopSprint', async () => {
        await orchestrator.stop();
        vscode.window.showInformationMessage('Sprint stopped');
    });

    // Command: Show progress
    const showProgress = vscode.commands.registerCommand('lumina.showSprintProgress', () => {
        // Focus on progress panel
        vscode.commands.executeCommand('workbench.view.extension.lumina-sprint-progress');
    });

    // Register commands
    context.subscriptions.push(
        startPlanning,
        executeSprint,
        pauseSprint,
        resumeSprint,
        stopSprint,
        showProgress,
        statusBar
    );

    // Register status bar commands
    SprintStatusBar.registerCommands(context);
}
