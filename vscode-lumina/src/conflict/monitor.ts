/**
 * Conflict Monitor - Real-time conflict monitoring for sprint execution
 *
 * DESIGN DECISION: Proactive monitoring before file operations
 * WHY: Detect conflicts BEFORE agents modify files, not after
 *
 * REASONING CHAIN:
 * 1. Agent announces intent: "I will modify src/api/users.ts"
 * 2. Monitor checks: Is users.ts locked?
 * 3. If locked: Detect conflict, pause agent, resolve
 * 4. If not locked: Grant lock, agent proceeds
 * 5. Result: Zero merge conflicts, clean sprint execution
 *
 * PATTERN: Pattern-CONFLICT-003 (Proactive Conflict Monitoring)
 * RELATED: AS-016 (Conflict Detection)
 */

import { ConflictDetector, ConflictDetection, FileLock } from './detector';
import { ConflictResolver, ResolutionStrategy, ResolutionResult } from './resolver';
import * as fs from 'fs';
import * as path from 'path';

/**
 * File operation intent
 */
export interface FileOperationIntent {
    /** Agent type */
    agentType: string;
    /** Task ID */
    taskId: string;
    /** File path */
    filePath: string;
    /** Operation type */
    operation: 'read' | 'write' | 'modify';
}

/**
 * Conflict event listener
 */
export interface ConflictEventListener {
    onConflictDetected?(conflict: ConflictDetection): void;
    onConflictResolved?(result: ResolutionResult): void;
}

/**
 * Conflict monitor
 *
 * DESIGN DECISION: Integrate detector + resolver with persistence
 * WHY: Single interface for workflow controller, automatic conflict handling
 */
export class ConflictMonitor {
    private detector: ConflictDetector;
    private resolver: ConflictResolver;
    private listeners: ConflictEventListener[] = [];
    private lockFile: string;

    constructor(workflowDir: string) {
        this.detector = new ConflictDetector();
        this.resolver = new ConflictResolver();
        this.lockFile = path.join(workflowDir, 'file-locks.json');

        // Load locks from disk (if exist)
        this.loadLocks();
    }

    /**
     * Add event listener
     */
    addListener(listener: ConflictEventListener): void {
        this.listeners.push(listener);
    }

    /**
     * Remove event listener
     */
    removeListener(listener: ConflictEventListener): void {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    /**
     * Notify listeners of conflict detection
     */
    private notifyConflictDetected(conflict: ConflictDetection): void {
        this.listeners.forEach(listener => {
            if (listener.onConflictDetected) {
                listener.onConflictDetected(conflict);
            }
        });
    }

    /**
     * Notify listeners of conflict resolution
     */
    private notifyConflictResolved(result: ResolutionResult): void {
        this.listeners.forEach(listener => {
            if (listener.onConflictResolved) {
                listener.onConflictResolved(result);
            }
        });
    }

    /**
     * Request file operation
     *
     * DESIGN DECISION: Blocking call - waits for lock acquisition or conflict resolution
     * WHY: Agent cannot proceed until conflict resolved
     *
     * @param intent - File operation intent
     * @param autoResolve - Automatically resolve conflicts (default: true)
     * @returns Conflict detection result
     */
    async requestFileOperation(
        intent: FileOperationIntent,
        autoResolve: boolean = true
    ): Promise<ConflictDetection> {
        // Try to acquire lock
        const detection = this.detector.acquireLock(
            intent.filePath,
            intent.agentType,
            intent.taskId,
            intent.operation
        );

        // No conflict - proceed
        if (!detection.hasConflict) {
            await this.saveLocks();
            return detection;
        }

        // Conflict detected - notify listeners
        this.notifyConflictDetected(detection);

        // Auto-resolve if enabled
        if (autoResolve) {
            const result = await this.resolver.resolve(detection);
            this.notifyConflictResolved(result);

            // If resolution succeeded, retry lock acquisition
            if (result.success && result.strategy === ResolutionStrategy.SEQUENTIAL) {
                // Wait for conflicting agent to release lock
                await this.waitForLockRelease(detection.filePath);

                // Retry lock acquisition
                return this.requestFileOperation(intent, false);  // Don't auto-resolve again
            }
        }

        return detection;
    }

    /**
     * Release file operation
     *
     * @param filePath - File path
     * @param agentType - Agent type
     */
    async releaseFileOperation(filePath: string, agentType: string): Promise<void> {
        this.detector.releaseLock(filePath, agentType);
        await this.saveLocks();
    }

    /**
     * Release all file operations for agent
     *
     * DESIGN DECISION: Called when agent completes task
     * WHY: Automatic cleanup, no stale locks
     */
    async releaseAllFileOperations(agentType: string): Promise<void> {
        this.detector.releaseAllLocks(agentType);
        await this.saveLocks();
    }

    /**
     * Clear all file operations
     *
     * DESIGN DECISION: Called when sprint completes or fails
     * WHY: Clean slate for next sprint
     */
    async clearAllFileOperations(): Promise<void> {
        this.detector.clearAllLocks();
        await this.saveLocks();
    }

    /**
     * Wait for lock release
     *
     * DESIGN DECISION: Poll every 500ms until lock released
     * WHY: Simple implementation, works across processes
     *
     * @param filePath - File path to wait for
     * @param timeout - Timeout in ms (default: 300000 = 5 minutes)
     */
    private async waitForLockRelease(filePath: string, timeout: number = 300000): Promise<void> {
        const start = Date.now();

        while (Date.now() - start < timeout) {
            const lock = this.detector.checkLock(filePath);
            if (!lock) {
                return;  // Lock released
            }

            // Wait 500ms before checking again
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        throw new Error(`Timeout waiting for lock release: ${filePath}`);
    }

    /**
     * Get all active locks
     */
    getAllLocks(): FileLock[] {
        return this.detector.getAllLocks();
    }

    /**
     * Get locks by agent
     */
    getLocksByAgent(agentType: string): FileLock[] {
        return this.detector.getLocksByAgent(agentType);
    }

    /**
     * Save locks to disk
     *
     * DESIGN DECISION: Atomic write (temp + rename)
     * WHY: Prevents corruption if VS Code crashes during write
     */
    private async saveLocks(): Promise<void> {
        const tempFile = `${this.lockFile}.tmp`;
        const locks = this.detector.toJSON();
        const json = JSON.stringify(locks, null, 2);

        fs.writeFileSync(tempFile, json, 'utf8');
        fs.renameSync(tempFile, this.lockFile);
    }

    /**
     * Load locks from disk
     */
    private loadLocks(): void {
        if (!fs.existsSync(this.lockFile)) {
            return;
        }

        try {
            const json = fs.readFileSync(this.lockFile, 'utf8');
            const locks = JSON.parse(json);
            this.detector.fromJSON(locks);
        } catch (error) {
            console.error('Failed to load file locks:', error);
        }
    }
}
