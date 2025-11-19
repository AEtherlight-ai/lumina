/**
 * ResourceSyncManager
 *
 * Auto-detects missing or outdated bundled resources and prompts user to sync.
 *
 * FEATURE-001 (Sprint 18.2): Resource Discovery
 * Solves: Users have no idea bundled resources exist
 *
 * Trigger Conditions:
 * 1. Extension activates in workspace
 * 2. Check: Are resources missing or outdated?
 * 3. If YES → Show notification
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class ResourceSyncManager {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Check if resources need syncing
     * Returns: { needed: boolean, reason: string }
     */
    public checkSyncNeeded(): { needed: boolean; reason: string } {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            return { needed: false, reason: 'No workspace open' };
        }

        const currentVersion = this.context.extension.packageJSON.version;
        const config = vscode.workspace.getConfiguration('aetherlight');
        const lastSyncedVersion = config.get<string>('lastSyncedVersion');

        // Check 1: Version mismatch (upgrade detected)
        if (!lastSyncedVersion || lastSyncedVersion !== currentVersion) {
            return {
                needed: true,
                reason: `Version upgrade (v${lastSyncedVersion || 'none'} → v${currentVersion})`
            };
        }

        // Check 2: Missing directories (resources deleted or not synced)
        const requiredDirs = [
            path.join(workspaceRoot, '.claude', 'skills'),
            path.join(workspaceRoot, 'internal', 'agents'),
            path.join(workspaceRoot, 'docs', 'patterns')
        ];

        for (const dir of requiredDirs) {
            if (!fs.existsSync(dir)) {
                const displayPath = `${path.basename(path.dirname(dir))}/${path.basename(dir)}`;
                return {
                    needed: true,
                    reason: `Missing directory: ${displayPath}`
                };
            }
        }

        return { needed: false, reason: 'Resources up to date' };
    }

    /**
     * Show notification prompting user to sync
     * Returns: true if sync triggered, false otherwise
     */
    public async promptSync(): Promise<boolean> {
        const currentVersion = this.context.extension.packageJSON.version;

        const result = await vscode.window.showInformationMessage(
            `🎨 ÆtherLight v${currentVersion} Resources Available`,
            {
                modal: false,
                detail: 'New skills, agents, and patterns are ready to sync to your workspace.'
            },
            'Sync Now',
            'Later',
            'Learn More'
        );

        if (result === 'Sync Now') {
            // Trigger sync command (will be implemented in FEATURE-002)
            try {
                await vscode.commands.executeCommand('aetherlight.syncResources');
                return true;
            } catch (error) {
                // Command might not exist yet (FEATURE-002 not implemented)
                vscode.window.showWarningMessage(
                    'Sync command not available. Please use "ÆtherLight: Sync Bundled Resources" from Command Palette.'
                );
                return false;
            }
        } else if (result === 'Learn More') {
            vscode.env.openExternal(
                vscode.Uri.parse('https://github.com/AEtherlight-ai/lumina#bundled-resources')
            );
        }

        return false;
    }

    /**
     * Called on extension activation
     * Checks if sync needed and prompts user if necessary
     */
    public static async checkAndPrompt(context: vscode.ExtensionContext): Promise<void> {
        const manager = new ResourceSyncManager(context);
        const check = manager.checkSyncNeeded();

        if (check.needed) {
            console.log(`[ÆtherLight] Resource sync needed: ${check.reason}`);

            // Wait 2 seconds after activation to show notification
            // (gives user time to see other activation messages first)
            setTimeout(() => {
                manager.promptSync();
            }, 2000);
        } else {
            console.log(`[ÆtherLight] ${check.reason}`);
        }
    }

    /**
     * FEATURE-004: Show first-launch welcome message
     *
     * WHY: Guide new users through resource sync process
     * WHEN: Called once during extension activation (after checkAndPrompt)
     * HOW: Checks 'hasSeenWelcome' flag, executes command if false
     *
     * DESIGN DECISIONS:
     * - Only shows if hasSeenWelcome flag not set (one-time display)
     * - Uses command-based approach (no direct voice panel coupling)
     * - Content matches TOML spec (18.2-RESOURCE-BUNDLING-BUGS FEATURE-004)
     * - Flag persists in workspace settings (not global)
     *
     * Pattern-UX-001: Non-modal, one-time guidance
     */
    public static async showFirstLaunchWelcome(context: vscode.ExtensionContext): Promise<void> {
        const config = vscode.workspace.getConfiguration('aetherlight');
        const hasSeenWelcome = config.get<boolean>('hasSeenWelcome', false);

        // Check: Already seen welcome message
        if (hasSeenWelcome) {
            console.log('[ÆtherLight] Skipped welcome message (already seen)');
            return;
        }

        // Get current extension version
        const currentVersion = context.extension.packageJSON.version;

        // Build welcome message template
        const welcomeContent = `# 🚀 Welcome to ÆtherLight v${currentVersion}!

## ✨ What's New
- 16 reusable skills (protect, publish, sprint-plan, etc.)
- 14 agent contexts (planning, infrastructure, docs, etc.)
- 86 patterns for consistent development

## 📥 Getting Started
Your workspace needs these resources to work properly.

**👉 Run this command now:**
1. Open Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
2. Type: "ÆtherLight: Sync Bundled Resources"
3. Press Enter

Or click the "Sync Now" button in the notification above.

## 🔍 Verify Installation
After syncing, you should see:
- \`.claude/skills/\` - 16 skill directories
- \`internal/agents/\` - 14 agent markdown files
- \`docs/patterns/\` - 86 pattern markdown files
`;

        // Execute command to insert welcome text (voice panel will handle)
        // Wait 3 seconds after activation to ensure voice panel is ready
        setTimeout(async () => {
            try {
                await vscode.commands.executeCommand('aetherlight.insertWelcomeText', welcomeContent);

                // Mark as seen (only after successful execution)
                await config.update('hasSeenWelcome', true, vscode.ConfigurationTarget.Workspace);
                console.log('[ÆtherLight] First-launch welcome message sent');
            } catch (error) {
                console.log('[ÆtherLight] Could not send welcome message (voice panel not ready):', error);
                // Don't set flag if message wasn't sent successfully
            }
        }, 3000);
    }
}
