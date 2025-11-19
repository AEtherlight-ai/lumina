/**
 * Real-Time Context Sync - Main Integration Module
 *
 * DESIGN DECISION: Export unified API for VS Code extension integration
 * WHY: Single import point for all real-time sync functionality
 *
 * REASONING CHAIN:
 * 1. Extension activates → initialize RealtimeSyncManager
 * 2. Manager creates WebSocket client + hooks + activity feed
 * 3. Hooks detect events from tool usage → emit to network
 * 4. Activity feed displays real-time updates in sidebar
 * 5. Result: Zero-config real-time collaboration
 *
 * PATTERN: Pattern-INTEGRATION-001 (Unified Module Export)
 * RELATED: client.ts, hooks.ts, activity_feed.ts
 * PERFORMANCE: <100ms initialization, <5MB memory overhead
 */

import * as vscode from 'vscode';
import { RealtimeSyncClient } from './client';
import { EventEmissionHooks } from './hooks';
import { ActivityFeedProvider, EventDetailsPanel } from './activity_feed';
import { RealtimeSyncConfig } from './types';

/**
 * Real-Time Sync Manager
 *
 * DESIGN DECISION: Singleton pattern for extension lifecycle management
 * WHY: VS Code extensions should have one manager per workspace
 */
export class RealtimeSyncManager {
    private static instance: RealtimeSyncManager | undefined;

    private client: RealtimeSyncClient;
    private hooks: EventEmissionHooks;
    private activityFeedProvider: ActivityFeedProvider;
    private treeView: vscode.TreeView<any>;
    private disposables: vscode.Disposable[] = [];

    private constructor(context: vscode.ExtensionContext, config: RealtimeSyncConfig) {
        // Create WebSocket client
        this.client = new RealtimeSyncClient(config);

        // Create event hooks
        this.hooks = new EventEmissionHooks(
            this.client,
            config.user,
            config.terminalId,
            config.project
        );

        // Create activity feed provider
        this.activityFeedProvider = new ActivityFeedProvider(this.client);

        // Register tree view
        this.treeView = vscode.window.createTreeView('luminaActivityFeed', {
            treeDataProvider: this.activityFeedProvider,
        });
        this.disposables.push(this.treeView);

        // Register commands
        this.registerCommands(context);

        // Connect to server
        this.connect();
    }

    /**
     * Initialize manager (singleton)
     *
     * DESIGN DECISION: Read config from VS Code settings
     * WHY: Users configure via Settings UI (no manual config files)
     */
    public static async initialize(context: vscode.ExtensionContext): Promise<RealtimeSyncManager> {
        if (RealtimeSyncManager.instance) {
            return RealtimeSyncManager.instance;
        }

        // Read config from VS Code settings (use aetherlight.sync namespace to match package.json)
        const config = vscode.workspace.getConfiguration('aetherlight.sync');
        const enabled = config.get<boolean>('enabled', false);

        if (!enabled) {
            throw new Error('Real-time sync is disabled. Enable in Settings: aetherlight.sync.enabled');
        }

        const serverUrl = config.get<string>('serverUrl', 'ws://localhost:43216');
        const token = config.get<string>('token', ''); // Token is now optional (empty string = no auth)
        const user = config.get<string>('user', process.env.USER || 'unknown');
        const terminalId = config.get<string>('terminalId') || this.generateTerminalId();
        const project = vscode.workspace.workspaceFolders?.[0]?.name;

        // Token is optional - can be empty for local development
        // if (!token) {
        //     throw new Error('Real-time sync token not configured. Set in Settings: aetherlight.sync.token');
        // }

        const syncConfig: RealtimeSyncConfig = {
            serverUrl,
            token,
            user,
            terminalId,
            project,
            autoReconnect: config.get<boolean>('autoReconnect', true),
            reconnectDelay: config.get<number>('reconnectDelayMs', 1000),
            maxReconnectAttempts: config.get<number>('maxReconnectAttempts', 0), // 0 = infinite
        };

        RealtimeSyncManager.instance = new RealtimeSyncManager(context, syncConfig);
        return RealtimeSyncManager.instance;
    }

    /**
     * Generate unique terminal ID
     */
    private static generateTerminalId(): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 7);
        return `term-${timestamp}-${random}`;
    }

    /**
     * Connect to server
     */
    private async connect(): Promise<void> {
        try {
            await this.client.connect();
            vscode.window.showInformationMessage('✅ Real-time sync connected');
        } catch (error) {
            vscode.window.showErrorMessage(`❌ Real-time sync connection failed: ${error}`);
        }
    }

    /**
     * Register VS Code commands
     */
    private registerCommands(context: vscode.ExtensionContext): void {
        // Command: Show event details
        this.disposables.push(
            vscode.commands.registerCommand('lumina.showEventDetails', (event) => {
                EventDetailsPanel.show(context, event);
            })
        );

        // Command: Refresh activity feed
        this.disposables.push(
            vscode.commands.registerCommand('lumina.refreshActivityFeed', () => {
                this.activityFeedProvider.refresh();
                vscode.window.showInformationMessage('🔄 Activity feed refreshed');
            })
        );

        // Command: Clear activity feed
        this.disposables.push(
            vscode.commands.registerCommand('lumina.clearActivityFeed', () => {
                this.activityFeedProvider.clear();
                vscode.window.showInformationMessage('🗑️ Activity feed cleared');
            })
        );

        // Command: Disconnect real-time sync
        this.disposables.push(
            vscode.commands.registerCommand('lumina.disconnectRealtimeSync', () => {
                this.client.disconnect();
                vscode.window.showInformationMessage('⏸️ Real-time sync disconnected');
            })
        );

        // Command: Reconnect real-time sync
        this.disposables.push(
            vscode.commands.registerCommand('lumina.reconnectRealtimeSync', async () => {
                await this.connect();
            })
        );

        // Command: Show sync status
        this.disposables.push(
            vscode.commands.registerCommand('lumina.showRealtimeSyncStatus', () => {
                const state = this.client.getState();
                const metrics = this.client.getMetrics();
                const counts = this.activityFeedProvider.getEventCounts();

                const message = [
                    `📊 Real-Time Sync Status`,
                    ``,
                    `Connection: ${state}`,
                    `Total Reconnects: ${metrics.totalReconnects}`,
                    `Events Received: ${metrics.totalEventsReceived}`,
                    `Events Sent: ${metrics.totalEventsSent}`,
                    ``,
                    `Activity Feed:`,
                    `  Total Events: ${counts.total}`,
                    `  Design Decisions: ${counts.designDecisions}`,
                    `  Blockers: ${counts.blockers}`,
                    `  Discoveries: ${counts.discoveries}`,
                ].join('\n');

                vscode.window.showInformationMessage(message, { modal: true });
            })
        );
    }

    /**
     * Hook: TodoWrite tool usage
     *
     * USAGE (from extension.ts):
     * ```typescript
     * realtimeSync.onTodoWrite(todoContent, affectedFiles);
     * ```
     */
    public onTodoWrite(content: string, files: string[]): void {
        this.hooks.onTodoWrite(content, files);
    }

    /**
     * Hook: Bash tool execution result
     *
     * USAGE (from extension.ts):
     * ```typescript
     * realtimeSync.onBashResult(command, exitCode, stdout, stderr, affectedFiles);
     * ```
     */
    public onBashResult(
        command: string,
        exitCode: number,
        stdout: string,
        stderr: string,
        files: string[]
    ): void {
        this.hooks.onBashResult(command, exitCode, stdout, stderr, files);
    }

    /**
     * Hook: Pattern extraction
     *
     * USAGE (from extension.ts):
     * ```typescript
     * realtimeSync.onPatternExtraction(patternId, patternContent, sourceFiles);
     * ```
     */
    public onPatternExtraction(patternId: string, patternContent: string, files: string[]): void {
        this.hooks.onPatternExtraction(patternId, patternContent, files);
    }

    /**
     * Hook: File save (manual event emission)
     *
     * USAGE (from extension.ts):
     * ```typescript
     * realtimeSync.onFileSave('feat: Add OAuth2', 'Implemented OAuth2 authentication', ['auth.ts']);
     * ```
     */
    public onFileSave(title: string, description: string, files: string[]): void {
        this.hooks.onFileSave(title, description, files);
    }

    /**
     * Get WebSocket client (for advanced usage)
     */
    public getClient(): RealtimeSyncClient {
        return this.client;
    }

    /**
     * Get activity feed provider (for advanced usage)
     */
    public getActivityFeedProvider(): ActivityFeedProvider {
        return this.activityFeedProvider;
    }

    /**
     * Dispose resources
     */
    public dispose(): void {
        this.client.disconnect();

        for (const disposable of this.disposables) {
            disposable.dispose();
        }

        RealtimeSyncManager.instance = undefined;
    }
}

// Re-export types for external usage
export * from './types';
export { RealtimeSyncClient } from './client';
export { EventEmissionHooks } from './hooks';
export { ActivityFeedProvider, EventDetailsPanel } from './activity_feed';
