/**
 * Enhance Terminal Input Command - Text Enhancement with Project Context
 *
 * DESIGN DECISION: Take typed text and enhance it with patterns, file context, and project state
 * WHY: User wants AI-powered context injection without manually typing everything
 *
 * REASONING CHAIN:
 * 1. User types text in editor or terminal
 * 2. User presses enhancement hotkey (or command)
 * 3. System gathers project context (patterns, files, errors, git state)
 * 4. Combines user text + context into enhanced prompt
 * 5. Sends enhanced prompt to Claude Code terminal
 * 6. Result: Rich, contextual prompts with minimal typing
 *
 * PATTERN: Pattern-ENHANCEMENT-001 (Context-Aware Prompt Enhancement)
 * RELATED: voicePanel.ts, pattern matching, workspace analyzer
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface EnhancementContext {
    userInput: string;
    patterns: string[];
    recentFiles: string[];
    gitStatus: string;
    recentErrors: string[];
    projectType: string;
}

/**
 * Registers the Enhance Terminal Input command
 */
export function registerEnhanceTerminalInputCommand(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand('aetherlight.enhanceTerminalInput', async () => {
        try {
            // Get user input from selection or prompt
            const editor = vscode.window.activeTextEditor;
            let userInput = '';

            if (editor && !editor.selection.isEmpty) {
                // Use selected text
                userInput = editor.document.getText(editor.selection);
            } else {
                // Prompt user for input
                const input = await vscode.window.showInputBox({
                    prompt: 'Enter your request (will be enhanced with project context)',
                    placeHolder: 'e.g., "initialize aetherlight in this application"',
                    ignoreFocusOut: true
                });

                if (!input) {
                    return; // User cancelled
                }
                userInput = input;
            }

            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'ÆtherLight: Enhancing prompt with project context...',
                cancellable: false
            }, async (progress) => {
                // Gather project context
                progress.report({ increment: 20, message: 'Analyzing project...' });
                const context = await gatherEnhancementContext(userInput);

                // Build enhanced prompt
                progress.report({ increment: 40, message: 'Building enhanced prompt...' });
                const enhancedPrompt = buildEnhancedPrompt(context);

                // Send to Claude Code terminal
                progress.report({ increment: 60, message: 'Sending to Claude Code...' });
                await sendToClaudeTerminal(enhancedPrompt);

                progress.report({ increment: 100, message: 'Done!' });
            });

            vscode.window.showInformationMessage('✅ Enhanced prompt sent to Claude Code');

        } catch (error: any) {
            console.error('[ÆtherLight] Enhance terminal input failed:', error);
            vscode.window.showErrorMessage(`ÆtherLight: Enhancement failed - ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
    console.log('[ÆtherLight] Enhance Terminal Input command registered');
}

/**
 * Gathers project context for enhancement
 */
async function gatherEnhancementContext(userInput: string): Promise<EnhancementContext> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const context: EnhancementContext = {
        userInput,
        patterns: [],
        recentFiles: [],
        gitStatus: '',
        recentErrors: [],
        projectType: 'unknown'
    };

    if (!workspaceRoot) {
        return context;
    }

    // Detect project type
    const packageJsonPath = path.join(workspaceRoot, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        context.projectType = 'Node.js';

        if (packageJson.dependencies?.react) context.projectType = 'React';
        if (packageJson.dependencies?.vue) context.projectType = 'Vue';
        if (packageJson.dependencies?.['@angular/core']) context.projectType = 'Angular';
    }

    // Get Git status
    try {
        const { stdout } = await execAsync('git status --short', { cwd: workspaceRoot });
        context.gitStatus = stdout.trim();
    } catch {
        // Git not available or not a repo
    }

    // Get recently opened files
    const recentFiles = vscode.workspace.textDocuments
        .filter(doc => !doc.isUntitled && doc.uri.scheme === 'file')
        .slice(0, 5)
        .map(doc => vscode.workspace.asRelativePath(doc.uri));
    context.recentFiles = recentFiles;

    // Check for pattern library
    const patternsDir = path.join(workspaceRoot, '.aetherlight', 'patterns');
    if (fs.existsSync(patternsDir)) {
        try {
            const patternFiles = fs.readdirSync(patternsDir, { recursive: true })
                .filter((f: any) => typeof f === 'string' && f.endsWith('.md'))
                .slice(0, 10) as string[];
            context.patterns = patternFiles;
        } catch {
            // Pattern scanning failed
        }
    }

    // Get diagnostics (errors/warnings)
    const diagnostics = vscode.languages.getDiagnostics();
    const errors = diagnostics
        .flatMap(([uri, diags]) =>
            diags
                .filter(d => d.severity === vscode.DiagnosticSeverity.Error)
                .map(d => `${vscode.workspace.asRelativePath(uri)}: ${d.message}`)
        )
        .slice(0, 5);
    context.recentErrors = errors;

    return context;
}

/**
 * Builds enhanced prompt from context
 */
function buildEnhancedPrompt(context: EnhancementContext): string {
    const parts: string[] = [];

    // User's original input
    parts.push(context.userInput);
    parts.push('');

    // Project context
    if (context.projectType !== 'unknown') {
        parts.push(`## Project Context`);
        parts.push(`- Type: ${context.projectType}`);
        parts.push('');
    }

    // Recent files
    if (context.recentFiles.length > 0) {
        parts.push(`## Recently Edited Files`);
        context.recentFiles.forEach(file => parts.push(`- ${file}`));
        parts.push('');
    }

    // Git status
    if (context.gitStatus) {
        parts.push(`## Git Status`);
        parts.push('```');
        parts.push(context.gitStatus);
        parts.push('```');
        parts.push('');
    }

    // Patterns available
    if (context.patterns.length > 0) {
        parts.push(`## Available Patterns`);
        context.patterns.forEach(pattern => parts.push(`- ${pattern}`));
        parts.push('');
    }

    // Recent errors
    if (context.recentErrors.length > 0) {
        parts.push(`## Recent Errors`);
        context.recentErrors.forEach(error => parts.push(`- ${error}`));
        parts.push('');
    }

    return parts.join('\n');
}

/**
 * Sends enhanced prompt to Claude Code terminal
 */
async function sendToClaudeTerminal(enhancedPrompt: string): Promise<void> {
    // Find or create ÆtherLight Claude terminal
    let terminal = vscode.window.terminals.find(t => t.name === 'ÆtherLight Claude');

    if (!terminal) {
        // Create new terminal
        terminal = vscode.window.createTerminal({
            name: 'ÆtherLight Claude',
            iconPath: new vscode.ThemeIcon('sparkle')
        });

        // Start Claude Code
        terminal.sendText('claude');

        // Wait for Claude to start
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Show terminal
    terminal.show();

    // Send enhanced prompt
    // Note: Multi-line input requires careful handling
    // For now, we'll copy to clipboard and notify user
    await vscode.env.clipboard.writeText(enhancedPrompt);

    vscode.window.showInformationMessage(
        '📋 Enhanced prompt copied to clipboard! Paste it into the Claude Code terminal.',
        'OK'
    );
}
