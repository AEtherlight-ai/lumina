/**
 * syncResources.ts
 *
 * Command Palette: "ÆtherLight: Sync Bundled Resources"
 *
 * FEATURE-002 (Sprint 18.2): Manual Resource Sync Command
 * Solves: Power users need manual control over resource syncing
 *
 * Usage:
 * 1. User opens Command Palette (Ctrl+Shift+P)
 * 2. Types "ÆtherLight: Sync"
 * 3. Selects command → Progress notification shown
 * 4. Resources copied → Success message with action buttons
 */

import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Command handler for manual resource sync
 * Registered as: aetherlight.syncResources
 */
export async function syncResourcesCommand(context: vscode.ExtensionContext): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    // Guard: No workspace open
    if (!workspaceRoot) {
        vscode.window.showErrorMessage(
            'No workspace folder open. Please open a folder first.'
        );
        return;
    }

    try {
        // Show progress notification (non-blocking, cancellable=false)
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'ÆtherLight: Syncing Resources',
                cancellable: false
            },
            async (progress) => {
                // Step 1: Copy bundled resources (skills, agents, patterns)
                progress.report({ message: 'Copying skills, agents, and patterns...' });

                // Import copyBundledResources from firstRunSetup
                // Note: This function is exported from firstRunSetup.ts (BUG-002)
                const { copyBundledResources } = await import('../firstRunSetup');
                await copyBundledResources(workspaceRoot, context.extensionPath);

                // Step 2: Update lastSyncedVersion to current extension version
                progress.report({ message: 'Updating version...' });
                const currentVersion = context.extension.packageJSON.version;
                const config = vscode.workspace.getConfiguration('aetherlight');
                await config.update(
                    'lastSyncedVersion',
                    currentVersion,
                    vscode.ConfigurationTarget.Workspace
                );
            }
        );

        // Success! Show message with action buttons
        const result = await vscode.window.showInformationMessage(
            '✅ Resources synced successfully! Skills, agents, and patterns are ready.',
            'View Skills',
            'View Agents',
            'View Patterns'
        );

        // Handle button clicks → Open corresponding directory
        if (result === 'View Skills') {
            const skillsPath = vscode.Uri.file(path.join(workspaceRoot, '.claude', 'skills'));
            await vscode.commands.executeCommand('revealInExplorer', skillsPath);
        } else if (result === 'View Agents') {
            const agentsPath = vscode.Uri.file(path.join(workspaceRoot, 'internal', 'agents'));
            await vscode.commands.executeCommand('revealInExplorer', agentsPath);
        } else if (result === 'View Patterns') {
            const patternsPath = vscode.Uri.file(path.join(workspaceRoot, 'docs', 'patterns'));
            await vscode.commands.executeCommand('revealInExplorer', patternsPath);
        }

    } catch (error: unknown) {
        // Error handling with Retry button
        const errorMessage = error instanceof Error ? error.message : String(error);

        console.error('[ÆtherLight] Resource sync failed:', errorMessage);

        const result = await vscode.window.showErrorMessage(
            `Failed to sync resources: ${errorMessage}`,
            'Retry',
            'Cancel'
        );

        // User clicked Retry → Run command again recursively
        if (result === 'Retry') {
            await syncResourcesCommand(context);
        }
    }
}
