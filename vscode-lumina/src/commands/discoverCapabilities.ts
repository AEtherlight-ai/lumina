/**
 * Discover Capabilities Command - Manual capability scanning for debugging
 *
 * DESIGN DECISION: Provide manual command for capability discovery
 * WHY: Allows users to refresh discovered capabilities on-demand
 *
 * REASONING CHAIN:
 * 1. User adds new skills/agents/patterns to workspace
 * 2. Run command: "ÆtherLight: Discover Capabilities"
 * 3. DiscoveryService scans filesystem for new capabilities
 * 4. Updates config.json v2.0 with discovered data
 * 5. Shows notification with summary (X skills, Y agents, Z patterns)
 * 6. Result: Config stays in sync with workspace capabilities
 *
 * PATTERN: Pattern-DISCOVERY-001 (Capability Discovery)
 * RELATED: DiscoveryService.ts (SELF-005A), config.json v2.0 (SELF-003B)
 *
 * @since SELF-005A
 */

import * as vscode from 'vscode';
import { DiscoveryService } from '../services/DiscoveryService';

/**
 * Register discover capabilities command
 *
 * Command: aetherlight.discoverCapabilities
 * Title: "ÆtherLight: Discover Capabilities"
 *
 * @param context - VS Code extension context
 */
export function registerDiscoverCapabilitiesCommand(context: vscode.ExtensionContext): void {
    const command = vscode.commands.registerCommand('aetherlight.discoverCapabilities', async () => {
        await discoverCapabilities();
    });
    context.subscriptions.push(command);
}

/**
 * Discover capabilities implementation
 *
 * DESIGN DECISION: Run discovery in background with progress notification
 * WHY: Discovery can take 100-500ms, show user progress feedback
 *
 * @returns Promise<void>
 */
async function discoverCapabilities(): Promise<void> {
    // Get workspace root
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('ÆtherLight: No workspace folder open. Please open a workspace to discover capabilities.');
        return;
    }

    // Show progress notification while scanning
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'ÆtherLight: Discovering capabilities...',
            cancellable: false
        },
        async (progress) => {
            try {
                // Run discovery
                const discoveryService = new DiscoveryService();
                const result = await discoveryService.discoverCapabilities(workspaceRoot);

                if (result.success) {
                    // Show success notification with summary
                    const message = `✅ Discovery complete! Found ${result.summary.skillsCount} skills, ${result.summary.agentsCount} agents, ${result.summary.patternsCount} patterns. Config updated.`;
                    vscode.window.showInformationMessage(message);

                    // Log details to output channel for debugging
                    const outputChannel = vscode.window.createOutputChannel('ÆtherLight Discovery');
                    outputChannel.appendLine('=== ÆtherLight Capability Discovery ===');
                    outputChannel.appendLine(`Workspace: ${result.summary.workspace}`);
                    outputChannel.appendLine(`Skills: ${result.summary.skillsCount}`);
                    outputChannel.appendLine(`Agents: ${result.summary.agentsCount}`);
                    outputChannel.appendLine(`Patterns: ${result.summary.patternsCount}`);
                    outputChannel.appendLine(`Config: ${result.summary.configUpdated ? 'Updated' : 'Not updated'}`);
                    outputChannel.appendLine('');
                    outputChannel.appendLine('Config updated at: .aetherlight/config.json');
                    outputChannel.appendLine('');
                    outputChannel.appendLine('You can now use discovered capabilities in MVP templates and enhancement buttons.');
                } else {
                    // Show error notification
                    const errorMessage = result.errors?.join('\n') || 'Unknown error';
                    vscode.window.showErrorMessage(`ÆtherLight: Discovery failed - ${errorMessage}`);
                }
            } catch (error) {
                // Handle unexpected errors
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`ÆtherLight: Discovery failed - ${errorMessage}`);
                console.error('[ÆtherLight] Discovery error:', error);
            }
        }
    );
}
