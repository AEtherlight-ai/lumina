/**
 * Workflow State Persistence - Save/load workflow state
 *
 * DESIGN DECISION: File-based persistence with atomic writes
 * WHY: Survives VS Code restarts, enables workflow recovery
 *
 * REASONING CHAIN:
 * 1. Workflow state serialized to JSON
 * 2. Write to temp file (.tmp)
 * 3. Atomic rename (temp → final)
 * 4. On VS Code restart: Read state file
 * 5. Reconstruct state machine from JSON
 * 6. Result: Workflow resumes exactly where it left off
 *
 * PATTERN: Pattern-PERSISTENCE-001 (Atomic File Persistence)
 * RELATED: AS-014 (File-Based IPC), AS-015 (Workflow State Machine)
 */

import * as fs from 'fs';
import * as path from 'path';
import { WorkflowStateMachine, WorkflowSnapshot } from './state_machine';

/**
 * Workflow state persistence manager
 */
export class WorkflowPersistence {
    private stateFile: string;

    /**
     * Create persistence manager
     *
     * @param workflowDir - Directory for workflow files (default: .lumina/workflow)
     */
    constructor(workflowDir: string) {
        this.stateFile = path.join(workflowDir, 'workflow-state.json');

        // Ensure directory exists
        if (!fs.existsSync(workflowDir)) {
            fs.mkdirSync(workflowDir, { recursive: true });
        }
    }

    /**
     * Save workflow state
     *
     * DESIGN DECISION: Atomic write (temp + rename)
     * WHY: Prevents corruption if VS Code crashes during write
     */
    async save(machine: WorkflowStateMachine): Promise<void> {
        const tempFile = `${this.stateFile}.tmp`;

        // Serialize to JSON (pretty for debugging)
        const json = JSON.stringify(machine.toJSON(), null, 2);

        // Write to temp file
        fs.writeFileSync(tempFile, json, 'utf8');

        // Atomic rename
        fs.renameSync(tempFile, this.stateFile);
    }

    /**
     * Load workflow state
     *
     * @returns Workflow state machine or null if no saved state
     */
    async load(): Promise<WorkflowStateMachine | null> {
        if (!fs.existsSync(this.stateFile)) {
            return null;
        }

        try {
            const json = fs.readFileSync(this.stateFile, 'utf8');
            const data = JSON.parse(json);
            return WorkflowStateMachine.fromJSON(data);
        } catch (error) {
            console.error('Failed to load workflow state:', error);
            return null;
        }
    }

    /**
     * Check if saved state exists
     */
    exists(): boolean {
        return fs.existsSync(this.stateFile);
    }

    /**
     * Delete saved state
     *
     * DESIGN DECISION: Manual cleanup after workflow complete
     * WHY: Prevents stale state from interfering with new sprints
     */
    async delete(): Promise<void> {
        if (fs.existsSync(this.stateFile)) {
            fs.unlinkSync(this.stateFile);
        }
    }

    /**
     * Save workflow snapshot (lightweight alternative)
     *
     * DESIGN DECISION: Separate snapshot file for quick reads
     * WHY: UI can read snapshot without deserializing full state machine
     *
     * @param snapshot - Workflow snapshot
     */
    async saveSnapshot(snapshot: WorkflowSnapshot): Promise<void> {
        const snapshotFile = path.join(path.dirname(this.stateFile), 'workflow-snapshot.json');
        const tempFile = `${snapshotFile}.tmp`;

        const json = JSON.stringify(snapshot, null, 2);
        fs.writeFileSync(tempFile, json, 'utf8');
        fs.renameSync(tempFile, snapshotFile);
    }

    /**
     * Load workflow snapshot
     *
     * @returns Workflow snapshot or null if not found
     */
    async loadSnapshot(): Promise<WorkflowSnapshot | null> {
        const snapshotFile = path.join(path.dirname(this.stateFile), 'workflow-snapshot.json');

        if (!fs.existsSync(snapshotFile)) {
            return null;
        }

        try {
            const json = fs.readFileSync(snapshotFile, 'utf8');
            return JSON.parse(json);
        } catch (error) {
            console.error('Failed to load workflow snapshot:', error);
            return null;
        }
    }
}
