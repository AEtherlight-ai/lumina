/**
 * Walkthrough Commands: Handler functions for getting started walkthrough
 *
 * DESIGN DECISION: Thin command layer that delegates to services
 * WHY: Commands are UI entry points, business logic lives in services
 *
 * REASONING CHAIN:
 * 1. Problem: Walkthrough buttons need command handlers
 * 2. Problem: Commands need to coordinate detection, interview, config generation
 * 3. Solution: Each command delegates to appropriate service
 * 4. Solution: WalkthroughManager tracks progress across commands
 * 5. Result: Clean separation of concerns, testable business logic
 *
 * COMMANDS (5):
 * 1. startGettingStarted → Opens walkthrough UI
 * 2. confirmBackup → Completes welcome step, user confirmed backup
 * 3. analyzeProject → Runs Phase 3 detection, shows results
 * 4. init → Runs Phase 4 init (detection + interview + config generation)
 * 5. openConfig → Opens .aetherlight/project-config.json in editor
 *
 * PATTERN: Pattern-TDD-001 (85% coverage for command layer)
 * RELATED: WalkthroughManager, Phase 3 (Detection), Phase 4 (Init)
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { WalkthroughManager, WalkthroughStep } from '../services/WalkthroughManager';
import { TechStackDetector } from '../services/TechStackDetector';
import { ToolDetector } from '../services/ToolDetector';
import { WorkflowDetector } from '../services/WorkflowDetector';
import { DomainDetector } from '../services/DomainDetector';
import { InitCommand } from './init';
import { InterviewFlowCommand } from './interviewFlow';
import { ProjectConfigGenerator } from '../services/ProjectConfigGenerator';
import { InterviewEngine } from '../services/InterviewEngine';
import { MiddlewareLogger } from '../services/MiddlewareLogger';

/**
 * Get workspace root or show error
 *
 * REFACTORING: Extracted from duplicated code (QA-001)
 * WHY: Reduce code duplication (3 occurrences → 1 function)
 *
 * @returns Workspace root path or undefined if no workspace
 */
function getWorkspaceRoot(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage(
            'No workspace folder open. Please open a project folder first.'
        );
        return undefined;
    }
    return workspaceFolders[0].uri.fsPath;
}

/**
 * Register all walkthrough commands
 *
 * @param context - VS Code extension context
 * @returns Disposable array (for cleanup)
 */
export function registerWalkthroughCommands(
    context: vscode.ExtensionContext
): vscode.Disposable[] {
    const logger = MiddlewareLogger.getInstance();
    const walkthroughManager = new WalkthroughManager(context);

    const disposables: vscode.Disposable[] = [];

    // Command 1: Start Getting Started Walkthrough
    disposables.push(
        vscode.commands.registerCommand('aetherlight.startGettingStarted', async () => {
            const startTime = logger.startOperation('command.startGettingStarted', {});

            try {
                await walkthroughManager.showWalkthrough();
                await walkthroughManager.startWalkthrough();

                logger.endOperation('command.startGettingStarted', startTime, {});
            } catch (error) {
                logger.failOperation('command.startGettingStarted', startTime, error);
                vscode.window.showErrorMessage(
                    `Failed to start walkthrough: ${(error as Error).message}`
                );
            }
        })
    );

    // Command 2: Confirm Backup (Complete Welcome Step)
    disposables.push(
        vscode.commands.registerCommand('aetherlight.confirmBackup', async () => {
            const startTime = logger.startOperation('command.confirmBackup', {});

            try {
                // Show confirmation message
                const result = await vscode.window.showInformationMessage(
                    'Have you backed up your project?',
                    { modal: true },
                    'Yes, I\'ve backed up',
                    'No, not yet'
                );

                if (result === 'Yes, I\'ve backed up') {
                    await walkthroughManager.completeStep(WalkthroughStep.Welcome);

                    vscode.window.showInformationMessage(
                        '✅ Great! Now let\'s analyze your project.'
                    );

                    logger.endOperation('command.confirmBackup', startTime, {
                        confirmed: true
                    });
                } else {
                    vscode.window.showWarningMessage(
                        'Please backup your project before continuing. You can use:\n' +
                        '• git commit -am "Pre-ÆtherLight backup"\n' +
                        '• git branch backup-$(date +%Y%m%d)\n' +
                        '• Or copy your project folder'
                    );

                    logger.endOperation('command.confirmBackup', startTime, {
                        confirmed: false
                    });
                }
            } catch (error) {
                logger.failOperation('command.confirmBackup', startTime, error);
                vscode.window.showErrorMessage(
                    `Backup confirmation failed: ${(error as Error).message}`
                );
            }
        })
    );

    // Command 3: Analyze Project (Run Detection)
    disposables.push(
        vscode.commands.registerCommand('aetherlight.analyzeProject', async () => {
            const startTime = logger.startOperation('command.analyzeProject', {});

            try {
                const projectRoot = getWorkspaceRoot();
                if (!projectRoot) {
                    return;
                }

                // Show progress indicator
                await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: 'Analyzing your project...',
                        cancellable: false
                    },
                    async (progress) => {
                        // Run detection services
                        progress.report({ message: 'Detecting language and runtime...' });
                        const techStackDetector = new TechStackDetector();
                        const techStack = await techStackDetector.detect(projectRoot);

                        progress.report({ message: 'Detecting tools...' });
                        const toolDetector = new ToolDetector();
                        const tools = await toolDetector.detect(projectRoot);

                        progress.report({ message: 'Detecting workflows...' });
                        const workflowDetector = new WorkflowDetector();
                        const workflows = await workflowDetector.detect(projectRoot);

                        progress.report({ message: 'Detecting project domain...' });
                        const domainDetector = new DomainDetector();
                        const domain = await domainDetector.detect(projectRoot);

                        // Build results summary
                        const summary = [
                            '## Detection Results',
                            '',
                            '### Language & Tech Stack',
                            `- Language: **${techStack.language || 'Not detected'}**`,
                            `- Package Manager: **${techStack.packageManager || 'Not detected'}**`,
                            `- Framework: ${techStack.framework || 'None detected'}`,
                            `- Test Framework: ${techStack.testFramework || 'None detected'}`,
                            '',
                            '### Tools',
                            `- Build Tool: **${tools.buildTool || 'Not detected'}**`,
                            `- Build Command: **${tools.buildCommand || 'Not detected'}**`,
                            `- Test Command: **${tools.testCommand || 'Not detected'}**`,
                            `- Linter: **${tools.linter || 'None'}**`,
                            '',
                            '### Workflows',
                            `- Git Workflow: **${workflows.gitWorkflow || 'Not detected'}**`,
                            `- CI/CD: **${workflows.cicd || 'None'}**`,
                            `- Pre-commit Hooks: **${workflows.preCommitHooks ? 'Yes' : 'No'}**`,
                            '',
                            '### Project Domain',
                            `- Domain: **${domain.domain || 'Not detected'}**`,
                            `- Sub-Type: **${domain.subType || 'Not detected'}**`
                        ].join('\n');

                        // Show results in new document
                        const doc = await vscode.workspace.openTextDocument({
                            content: summary,
                            language: 'markdown'
                        });
                        await vscode.window.showTextDocument(doc, {
                            preview: false,
                            viewColumn: vscode.ViewColumn.Beside
                        });

                        // Mark step complete
                        await walkthroughManager.completeStep(WalkthroughStep.Analyze);
                        await walkthroughManager.markProjectAnalyzed();

                        vscode.window.showInformationMessage(
                            '✅ Analysis complete! Next: Fill in the gaps with interactive configuration.'
                        );
                    }
                );

                logger.endOperation('command.analyzeProject', startTime, {});
            } catch (error) {
                logger.failOperation('command.analyzeProject', startTime, error);
                vscode.window.showErrorMessage(
                    `Project analysis failed: ${(error as Error).message}`
                );
            }
        })
    );

    // Command 4: Initialize Self-Configuration (Run Full Init Flow)
    disposables.push(
        vscode.commands.registerCommand('aetherlight.init', async () => {
            const startTime = logger.startOperation('command.init', {});

            try {
                const projectRoot = getWorkspaceRoot();
                if (!projectRoot) {
                    return;
                }

                // Check if config already exists
                const configPath = path.join(projectRoot, '.aetherlight', 'project-config.json');
                if (fs.existsSync(configPath)) {
                    const result = await vscode.window.showWarningMessage(
                        'ÆtherLight configuration already exists. Do you want to regenerate it?',
                        { modal: true },
                        'Yes, regenerate',
                        'No, keep existing'
                    );

                    if (result !== 'Yes, regenerate') {
                        // Skip to review step
                        await walkthroughManager.completeStep(WalkthroughStep.Configure);
                        vscode.window.showInformationMessage(
                            'Using existing configuration. You can review it in the next step.'
                        );
                        return;
                    }
                }

                // Run InitCommand (Phase 4 - Detection + Interview + Generation)
                // Create all required dependencies
                const techStackDetector = new TechStackDetector();
                const toolDetector = new ToolDetector();
                const workflowDetector = new WorkflowDetector();
                const domainDetector = new DomainDetector();
                const interviewEngine = new InterviewEngine();
                const interviewFlow = new InterviewFlowCommand(
                    techStackDetector,
                    toolDetector,
                    workflowDetector,
                    domainDetector,
                    interviewEngine
                );
                const configGenerator = new ProjectConfigGenerator();
                const initCommand = new InitCommand(interviewFlow, configGenerator);
                const generatedConfigPath = await initCommand.run(projectRoot);

                // Success - generatedConfigPath is the path to the generated config file
                await walkthroughManager.completeStep(WalkthroughStep.Configure);
                await walkthroughManager.markConfigGenerated();

                vscode.window.showInformationMessage(
                    `✅ Configuration generated at: ${generatedConfigPath}\n\nNext: Review your configuration.`
                );

                logger.endOperation('command.init', startTime, {
                    success: true,
                    configPath: generatedConfigPath
                });
            } catch (error) {
                logger.failOperation('command.init', startTime, error);
                vscode.window.showErrorMessage(
                    `Initialization failed: ${(error as Error).message}`
                );
            }
        })
    );

    // Command 5: Open Project Configuration
    disposables.push(
        vscode.commands.registerCommand('aetherlight.openConfig', async () => {
            const startTime = logger.startOperation('command.openConfig', {});

            try {
                const projectRoot = getWorkspaceRoot();
                if (!projectRoot) {
                    return;
                }
                const projectConfigPath = path.join(projectRoot, '.aetherlight', 'project-config.json');

                if (!fs.existsSync(projectConfigPath)) {
                    const result = await vscode.window.showWarningMessage(
                        'Configuration file not found. Would you like to generate it now?',
                        'Yes, generate',
                        'No'
                    );

                    if (result === 'Yes, generate') {
                        // Trigger init command
                        await vscode.commands.executeCommand('aetherlight.init');
                    }
                    return;
                }

                // Open config file
                const doc = await vscode.workspace.openTextDocument(projectConfigPath);
                await vscode.window.showTextDocument(doc, {
                    preview: false,
                    viewColumn: vscode.ViewColumn.Active
                });

                // Mark step complete
                await walkthroughManager.completeStep(WalkthroughStep.Review);

                vscode.window.showInformationMessage(
                    '✅ Configuration opened! You can customize any section. Changes take effect immediately.'
                );

                logger.endOperation('command.openConfig', startTime, {});
            } catch (error) {
                logger.failOperation('command.openConfig', startTime, error);
                vscode.window.showErrorMessage(
                    `Failed to open configuration: ${(error as Error).message}`
                );
            }
        })
    );

    return disposables;
}
