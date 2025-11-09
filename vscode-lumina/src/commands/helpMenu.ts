/**
 * Help & Getting Started Menu Command
 *
 * DESIGN DECISION: QuickPick menu for centralized help access
 * WHY: Improve discoverability of learning resources and features
 *
 * REASONING CHAIN:
 * 1. Problem: Walkthrough only accessible via Command Palette (low discoverability)
 * 2. Problem: No central location for help, docs, troubleshooting
 * 3. Solution: Unified help menu in Sprint Progress toolbar
 * 4. Solution: QuickPick menu (VS Code native pattern, supports categories)
 * 5. Result: One-click access to all help resources, easy to extend
 *
 * MENU STRUCTURE (Phase 1):
 * - Getting Started Walkthrough
 * - Open Project Configuration
 * - Extension Settings
 * - About ÆtherLight
 *
 * FUTURE: Documentation links, troubleshooting tools, tutorials, community
 *
 * PATTERN: Pattern-UX-001 (Discoverability)
 * RELATED: walkthrough.ts, extension.ts
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { MiddlewareLogger } from '../services/MiddlewareLogger';

/**
 * QuickPick item for help menu
 */
interface HelpMenuItem extends vscode.QuickPickItem {
    command: string;
    args?: any;
}

/**
 * Show Help & Getting Started menu
 *
 * ALGORITHM:
 * 1. Build menu items array
 * 2. Show QuickPick with items
 * 3. Execute selected command
 * 4. Log usage for analytics
 *
 * @param context - Extension context (for version info)
 * @returns Promise<void>
 */
export async function showHelpMenu(context: vscode.ExtensionContext): Promise<void> {
    const logger = MiddlewareLogger.getInstance();
    const startTime = logger.startOperation('command.helpMenu', {});

    try {
        // Build menu items
        const items: HelpMenuItem[] = [
            {
                label: '$(file-text) Open Project Configuration',
                description: '.aetherlight/project-config.json',
                detail: 'View and edit your project configuration',
                command: 'aetherlight.openConfig'
            },
            {
                label: '$(gear) Extension Settings',
                description: 'Configure ÆtherLight preferences',
                detail: 'Voice capture, sync, privacy settings',
                command: 'workbench.action.openSettings',
                args: '@ext:aetherlight.aetherlight'
            },
            {
                label: '$(info) About ÆtherLight',
                description: 'Version and system information',
                detail: 'View version, changelog, and report issues',
                command: 'aetherlight.showAbout'
            }
        ];

        // Show QuickPick
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Help & Getting Started - Choose an option',
            matchOnDescription: true,
            matchOnDetail: true
        });

        // Execute selected command
        if (selected) {
            logger.info('help-menu-item-selected', { item: selected.label });

            if (selected.args) {
                await vscode.commands.executeCommand(selected.command, selected.args);
            } else {
                await vscode.commands.executeCommand(selected.command);
            }
        }

        logger.endOperation('command.helpMenu', startTime, {
            itemSelected: !!selected
        });
    } catch (error) {
        logger.failOperation('command.helpMenu', startTime, error);
        vscode.window.showErrorMessage(
            `Help menu failed: ${(error as Error).message}`
        );
    }
}

/**
 * Show About ÆtherLight dialog
 *
 * ALGORITHM:
 * 1. Get version from package.json
 * 2. Get system info (Node.js, platform)
 * 3. Build markdown document
 * 4. Show in editor
 *
 * @param context - Extension context (for version info)
 * @returns Promise<void>
 */
export async function showAbout(context: vscode.ExtensionContext): Promise<void> {
    const logger = MiddlewareLogger.getInstance();
    const startTime = logger.startOperation('command.showAbout', {});

    try {
        // Get version info
        const packageJson = context.extension.packageJSON;
        const version = packageJson.version;
        const name = packageJson.displayName || packageJson.name;
        const description = packageJson.description;

        // Get workspace info
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const hasWorkspace = workspaceFolders && workspaceFolders.length > 0;
        const workspacePath = hasWorkspace ? workspaceFolders[0].uri.fsPath : 'None';

        // Check if config exists
        let configExists = false;
        let configPath = 'Not configured';
        if (hasWorkspace) {
            configPath = path.join(workspacePath, '.aetherlight', 'project-config.json');
            configExists = fs.existsSync(configPath);
        }

        // Build about content
        const content = [
            `# ${name}`,
            '',
            `**${description}**`,
            '',
            '---',
            '',
            '## Version Information',
            '',
            `- **Version:** ${version}`,
            `- **Node.js:** ${process.version}`,
            `- **Platform:** ${process.platform} (${process.arch})`,
            `- **VS Code:** ${vscode.version}`,
            '',
            '## Workspace',
            '',
            `- **Workspace:** ${hasWorkspace ? workspaceFolders[0].name : 'No workspace open'}`,
            `- **Configuration:** ${configExists ? '✅ Configured' : '⚠️ Not configured'}`,
            configExists ? `- **Config Path:** ${configPath}` : '',
            '',
            '## Quick Actions',
            '',
            '- [Open Configuration](command:aetherlight.openConfig)',
            '- [Extension Settings](command:workbench.action.openSettings?%5B%22%40ext%3Aaetherlight.aetherlight%22%5D)',
            '',
            '## Resources',
            '',
            '- [View Changelog](command:aetherlight.openChangelog)',
            '- [Report Issue on GitHub](https://github.com/anthropics/aetherlight/issues)',
            '- [Documentation](https://docs.aetherlight.com)',
            '',
            '---',
            '',
            '**ÆtherLight** - Voice-to-Intelligence Platform for Developers',
            ''
        ].filter(line => line !== '').join('\n');

        // Open as untitled markdown document
        const doc = await vscode.workspace.openTextDocument({
            content: content,
            language: 'markdown'
        });

        await vscode.window.showTextDocument(doc, {
            preview: false,
            viewColumn: vscode.ViewColumn.Active
        });

        logger.endOperation('command.showAbout', startTime, {});
    } catch (error) {
        logger.failOperation('command.showAbout', startTime, error);
        vscode.window.showErrorMessage(
            `Failed to show about dialog: ${(error as Error).message}`
        );
    }
}

/**
 * Open changelog in editor
 *
 * ALGORITHM:
 * 1. Find CHANGELOG.md in workspace root
 * 2. Open in editor
 * 3. Fallback to GitHub if not found locally
 *
 * @returns Promise<void>
 */
export async function openChangelog(): Promise<void> {
    const logger = MiddlewareLogger.getInstance();
    const startTime = logger.startOperation('command.openChangelog', {});

    try {
        // Try to find CHANGELOG.md in workspace
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (workspaceFolders && workspaceFolders.length > 0) {
            const changelogPath = path.join(workspaceFolders[0].uri.fsPath, 'CHANGELOG.md');

            if (fs.existsSync(changelogPath)) {
                const doc = await vscode.workspace.openTextDocument(changelogPath);
                await vscode.window.showTextDocument(doc, {
                    preview: false,
                    viewColumn: vscode.ViewColumn.Active
                });

                logger.endOperation('command.openChangelog', startTime, {
                    source: 'local'
                });
                return;
            }
        }

        // Fallback: Open GitHub changelog
        await vscode.env.openExternal(
            vscode.Uri.parse('https://github.com/anthropics/aetherlight/blob/main/CHANGELOG.md')
        );

        logger.endOperation('command.openChangelog', startTime, {
            source: 'github'
        });
    } catch (error) {
        logger.failOperation('command.openChangelog', startTime, error);
        vscode.window.showErrorMessage(
            `Failed to open changelog: ${(error as Error).message}`
        );
    }
}
