/**
 * Conflict Detector - Detect file modification conflicts between agents
 *
 * DESIGN DECISION: Track file locks with timestamps, detect concurrent modifications
 * WHY: Multiple agents may try to modify same file, must detect conflicts early
 *
 * REASONING CHAIN:
 * 1. Agent 1 modifies src/api/users.ts
 * 2. Conflict detector records: users.ts locked by Agent 1 at T1
 * 3. Agent 2 tries to modify src/api/users.ts at T2
 * 4. Detector sees: users.ts locked by Agent 1, conflict detected
 * 5. Pause Agent 2, notify user, offer resolution strategies
 * 6. Result: Prevents merge conflicts, ensures clean sprint execution
 *
 * PATTERN: Pattern-CONFLICT-001 (File Lock Detection)
 * RELATED: AS-003 (Task Scheduler), AS-014 (File-Based IPC)
 */

/**
 * File lock entry
 */
export interface FileLock {
    /** File path (normalized) */
    filePath: string;
    /** Agent holding lock */
    agentType: string;
    /** Task ID */
    taskId: string;
    /** Lock acquired timestamp */
    acquiredAt: string;
    /** Lock operation (read, write, modify) */
    operation: 'read' | 'write' | 'modify';
}

/**
 * Conflict detection result
 */
export interface ConflictDetection {
    /** Conflict detected? */
    hasConflict: boolean;
    /** Conflicting locks (if any) */
    conflicts: FileLock[];
    /** Requested file path */
    filePath: string;
    /** Requesting agent */
    requestingAgent: string;
}

/**
 * Conflict detector
 *
 * DESIGN DECISION: In-memory lock registry with persistence
 * WHY: Fast conflict checks (<5ms), survives VS Code restarts
 */
export class ConflictDetector {
    private locks: Map<string, FileLock> = new Map();

    /**
     * Normalize file path (cross-platform)
     *
     * DESIGN DECISION: Forward slashes, lowercase on Windows
     * WHY: Consistent conflict detection across Windows/Mac/Linux
     */
    private normalizePath(filePath: string): string {
        return filePath.replace(/\\/g, '/').toLowerCase();
    }

    /**
     * Acquire file lock
     *
     * @param filePath - File to lock
     * @param agentType - Agent requesting lock
     * @param taskId - Task ID
     * @param operation - Lock operation (read, write, modify)
     * @returns Conflict detection result
     */
    acquireLock(
        filePath: string,
        agentType: string,
        taskId: string,
        operation: 'read' | 'write' | 'modify'
    ): ConflictDetection {
        const normalized = this.normalizePath(filePath);
        const existing = this.locks.get(normalized);

        // Check for conflicts
        if (existing) {
            // Read locks don't conflict with other reads
            if (operation === 'read' && existing.operation === 'read') {
                return {
                    hasConflict: false,
                    conflicts: [],
                    filePath: normalized,
                    requestingAgent: agentType,
                };
            }

            // Write/modify locks conflict with everything
            return {
                hasConflict: true,
                conflicts: [existing],
                filePath: normalized,
                requestingAgent: agentType,
            };
        }

        // No conflict, acquire lock
        const lock: FileLock = {
            filePath: normalized,
            agentType,
            taskId,
            acquiredAt: new Date().toISOString(),
            operation,
        };

        this.locks.set(normalized, lock);

        return {
            hasConflict: false,
            conflicts: [],
            filePath: normalized,
            requestingAgent: agentType,
        };
    }

    /**
     * Release file lock
     *
     * @param filePath - File to unlock
     * @param agentType - Agent releasing lock
     */
    releaseLock(filePath: string, agentType: string): void {
        const normalized = this.normalizePath(filePath);
        const lock = this.locks.get(normalized);

        if (lock && lock.agentType === agentType) {
            this.locks.delete(normalized);
        }
    }

    /**
     * Check if file is locked
     *
     * @param filePath - File to check
     * @returns Lock if exists, null otherwise
     */
    checkLock(filePath: string): FileLock | null {
        const normalized = this.normalizePath(filePath);
        return this.locks.get(normalized) || null;
    }

    /**
     * Get all locks
     */
    getAllLocks(): FileLock[] {
        return Array.from(this.locks.values());
    }

    /**
     * Get locks by agent
     */
    getLocksByAgent(agentType: string): FileLock[] {
        return Array.from(this.locks.values()).filter(
            lock => lock.agentType === agentType
        );
    }

    /**
     * Release all locks for agent
     *
     * DESIGN DECISION: Called when agent completes task
     * WHY: Automatic lock cleanup prevents stale locks
     */
    releaseAllLocks(agentType: string): void {
        const agentLocks = this.getLocksByAgent(agentType);
        agentLocks.forEach(lock => {
            this.locks.delete(lock.filePath);
        });
    }

    /**
     * Clear all locks
     *
     * DESIGN DECISION: Called when sprint completes or fails
     * WHY: Clean slate for next sprint
     */
    clearAllLocks(): void {
        this.locks.clear();
    }

    /**
     * Export locks to JSON (for persistence)
     */
    toJSON(): FileLock[] {
        return Array.from(this.locks.values());
    }

    /**
     * Import locks from JSON (for recovery)
     */
    fromJSON(locks: FileLock[]): void {
        this.locks.clear();
        locks.forEach(lock => {
            this.locks.set(lock.filePath, lock);
        });
    }
}
