/**
 * IPC Sender - Send Dogfooding Messages via File-Based IPC
 *
 * DESIGN DECISION: File-based IPC for Phase 4 orchestrator communication
 * WHY: Simple, reliable, no WebSocket complexity, works with multiple terminals
 *
 * REASONING CHAIN:
 * 1. Phase 4 orchestrator spawns multiple agent terminals
 * 2. Each terminal is isolated (cannot share memory)
 * 3. File-based IPC: Write JSON files, watch for changes
 * 4. .lumina/ipc/ directory: Central message exchange
 * 5. Result: All agents + orchestrator coordinate via filesystem
 *
 * PATTERN: Pattern-IPC-001 (File-Based IPC Protocol)
 * RELATED: Phase 4 orchestrator, AS-014 (IPC System)
 * PERFORMANCE: <10ms to write message file
 */

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DogfoodingIPCMessage } from './types';

/**
 * IPC Sender - Write dogfooding messages to filesystem
 *
 * DESIGN DECISION: Atomic writes with temp + rename
 * WHY: Prevent partial reads (write temp file, then atomic rename)
 */
export class IPCSender {
    private readonly ipcDir: string;

    constructor(private readonly workspaceRoot: string) {
        this.ipcDir = path.join(workspaceRoot, '.lumina', 'ipc');
    }

    /**
     * Initialize IPC directory
     *
     * DESIGN DECISION: Create .lumina/ipc/ on first use
     * WHY: Lazy initialization, no setup required
     */
    public async initialize(): Promise<void> {
        try {
            await fs.mkdir(this.ipcDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create IPC directory:', error);
            throw new Error(`Failed to initialize IPC directory: ${error}`);
        }
    }

    /**
     * Send dogfooding IPC message
     *
     * PERFORMANCE: <10ms (atomic write)
     *
     * DESIGN DECISION: Filename = {timestamp}-{agent}-{message_type}.json
     * WHY: Sortable by time, filterable by agent/type, unique per message
     */
    public async sendMessage(message: DogfoodingIPCMessage): Promise<string> {
        // Ensure IPC directory exists
        await this.initialize();

        // Generate unique filename
        const timestamp = Date.now();
        const agent = message.agent.toLowerCase().replace(/\s+/g, '-');
        const messageType = message.message_type;
        const filename = `${timestamp}-${agent}-${messageType}.json`;
        const filepath = path.join(this.ipcDir, filename);

        // Atomic write: temp file + rename
        const tempFilepath = `${filepath}.tmp`;
        try {
            await fs.writeFile(tempFilepath, JSON.stringify(message, null, 2), 'utf-8');
            await fs.rename(tempFilepath, filepath);
            console.log(`Sent IPC message: ${filename}`);
            return filepath;
        } catch (error) {
            // Cleanup temp file if rename failed
            try {
                await fs.unlink(tempFilepath);
            } catch {
                // Ignore cleanup errors
            }
            throw new Error(`Failed to send IPC message: ${error}`);
        }
    }

    /**
     * Read IPC messages (for testing/debugging)
     *
     * DESIGN DECISION: Return all messages sorted by timestamp
     * WHY: Chronological order for orchestrator processing
     */
    public async readAllMessages(): Promise<DogfoodingIPCMessage[]> {
        await this.initialize();

        const files = await fs.readdir(this.ipcDir);
        const messages: DogfoodingIPCMessage[] = [];

        for (const file of files) {
            if (file.endsWith('.json') && !file.endsWith('.tmp')) {
                const filepath = path.join(this.ipcDir, file);
                try {
                    const content = await fs.readFile(filepath, 'utf-8');
                    const message = JSON.parse(content) as DogfoodingIPCMessage;
                    messages.push(message);
                } catch (error) {
                    console.error(`Failed to read IPC message ${file}:`, error);
                }
            }
        }

        // Sort by timestamp (oldest first)
        messages.sort((a, b) => {
            return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        });

        return messages;
    }

    /**
     * Clear all IPC messages (for testing/sprint reset)
     */
    public async clearAllMessages(): Promise<void> {
        await this.initialize();

        const files = await fs.readdir(this.ipcDir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filepath = path.join(this.ipcDir, file);
                await fs.unlink(filepath);
            }
        }
        console.log('Cleared all IPC messages');
    }

    /**
     * Watch IPC directory for new messages
     *
     * DESIGN DECISION: VS Code FileSystemWatcher for real-time updates
     * WHY: Efficient, cross-platform, integrates with VS Code
     *
     * @param callback - Called when new message arrives
     * @returns Disposable to stop watching
     */
    public watchMessages(
        callback: (message: DogfoodingIPCMessage) => void
    ): vscode.Disposable {
        const pattern = new vscode.RelativePattern(this.ipcDir, '*.json');
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);

        watcher.onDidCreate(async (uri) => {
            // Ignore temp files
            if (uri.fsPath.endsWith('.tmp')) {
                return;
            }

            try {
                const content = await fs.readFile(uri.fsPath, 'utf-8');
                const message = JSON.parse(content) as DogfoodingIPCMessage;
                callback(message);
            } catch (error) {
                console.error(`Failed to read new IPC message ${uri.fsPath}:`, error);
            }
        });

        return watcher;
    }
}
