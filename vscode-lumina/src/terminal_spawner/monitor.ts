/**
 * Completion Monitor - Agent Task Completion Detection
 *
 * DESIGN DECISION: Filesystem-based completion signaling
 * WHY: Terminal output capture unreliable, filesystem provides guaranteed delivery
 *
 * REASONING CHAIN:
 * 1. Agent completes task → Writes .lumina/workflow/{task_id}.complete.json
 * 2. Monitor watches filesystem → Detects file creation
 * 3. Parse JSON → Extract status, files changed, design decisions
 * 4. Return TaskResult → Project Manager updates dependency graph
 * 5. Cleanup terminal → Free resources
 * 6. Result: Reliable completion detection with full metadata
 *
 * PATTERN: Pattern-TERMINAL-SPAWNER-001 (Isolated Agent Execution)
 * PERFORMANCE: <50ms completion detection (filesystem watcher)
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AgentTerminal, TaskResult, CompletionSignal } from './types';

/**
 * Completion monitor for autonomous agents
 *
 * DESIGN DECISION: FileSystemWatcher for completion detection
 * WHY: VS Code Terminal API doesn't expose process output reliably
 */
export class CompletionMonitor {
  private workspaceRoot: string;
  private workflowDir: string;

  constructor(workspaceRoot?: string) {
    this.workspaceRoot = workspaceRoot || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
    this.workflowDir = path.join(this.workspaceRoot, '.lumina', 'workflow');

    // Ensure workflow directory exists
    if (!fs.existsSync(this.workflowDir)) {
      fs.mkdirSync(this.workflowDir, { recursive: true });
    }
  }

  /**
   * Wait for agent task completion
   *
   * DESIGN DECISION: Promise-based async waiting with filesystem watcher
   * WHY: Non-blocking wait, enables parallel agent execution
   *
   * REASONING CHAIN:
   * 1. Create FileSystemWatcher for completion signal file
   * 2. Agent writes {task_id}.complete.json when done
   * 3. Watcher fires → Read file → Parse JSON
   * 4. Validate completion signal format
   * 5. Convert to TaskResult → Return to caller
   * 6. Cleanup watcher and signal file
   *
   * PERFORMANCE: <50ms detection (filesystem event)
   *
   * @param agentTerminal - Agent terminal to monitor
   * @param timeout - Timeout in milliseconds (default: 1 hour)
   * @returns TaskResult when agent completes
   */
  async waitForCompletion(agentTerminal: AgentTerminal, timeout: number = 3600000): Promise<TaskResult> {
    const taskId = agentTerminal.currentTask.id;
    const signalFile = path.join(this.workflowDir, `${taskId}.complete.json`);

    return new Promise((resolve, reject) => {
      // Check if completion signal already exists (agent completed before we started monitoring)
      if (fs.existsSync(signalFile)) {
        const result = this.parseCompletionSignal(signalFile, agentTerminal);
        resolve(result);
        return;
      }

      // Create filesystem watcher
      const watcher = vscode.workspace.createFileSystemWatcher(signalFile);

      // Timeout handler
      const timeoutTimer = setTimeout(() => {
        watcher.dispose();
        reject(new Error(`Task ${taskId} timed out after ${timeout}ms`));
      }, timeout);

      // Completion handler
      watcher.onDidCreate((uri) => {
        clearTimeout(timeoutTimer);
        watcher.dispose();

        try {
          const result = this.parseCompletionSignal(uri.fsPath, agentTerminal);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Parse completion signal file
   *
   * DESIGN DECISION: JSON format for structured completion data
   * WHY: Easy to parse, extensible, human-readable
   *
   * REASONING CHAIN:
   * 1. Read JSON file from filesystem
   * 2. Parse into CompletionSignal interface
   * 3. Validate required fields (taskId, status, timestamp)
   * 4. Calculate execution duration (now - spawnedAt)
   * 5. Convert to TaskResult → Return
   *
   * PERFORMANCE: <10ms file read + parse
   *
   * @param signalFilePath - Path to completion signal file
   * @param agentTerminal - Agent terminal that completed
   * @returns TaskResult with completion data
   */
  private parseCompletionSignal(signalFilePath: string, agentTerminal: AgentTerminal): TaskResult {
    // Read and parse JSON
    const fileContent = fs.readFileSync(signalFilePath, 'utf-8');
    const signal: CompletionSignal = JSON.parse(fileContent);

    // Validate signal format
    if (!signal.taskId || !signal.status || !signal.timestamp) {
      throw new Error(`Invalid completion signal format: ${signalFilePath}`);
    }

    // Validate task ID matches
    if (signal.taskId !== agentTerminal.currentTask.id) {
      throw new Error(`Task ID mismatch: expected ${agentTerminal.currentTask.id}, got ${signal.taskId}`);
    }

    // Calculate execution duration
    const duration = signal.timestamp - agentTerminal.spawnedAt;

    // Convert to TaskResult
    const result: TaskResult = {
      taskId: signal.taskId,
      agentType: signal.agentType,
      success: signal.status === 'success',
      error: signal.error,
      duration: duration,
      filesChanged: signal.filesChanged,
      designDecisions: signal.designDecisions,
      timestamp: signal.timestamp,
    };

    // Cleanup signal file (optional - keep for debugging)
    // fs.unlinkSync(signalFilePath);

    return result;
  }

  /**
   * Monitor multiple agents in parallel
   *
   * DESIGN DECISION: Promise.all for parallel monitoring
   * WHY: Multiple agents execute simultaneously, need concurrent monitoring
   *
   * REASONING CHAIN:
   * 1. Spawn multiple agents (DB, UI, API) in parallel
   * 2. Start monitoring all agents simultaneously
   * 3. Each agent completes independently
   * 4. Promise.all waits for ALL completions
   * 5. Return array of TaskResults
   * 6. Result: Full sprint execution with parallel monitoring
   *
   * PERFORMANCE: No overhead (filesystem watchers are async)
   *
   * @param agentTerminals - Array of agent terminals to monitor
   * @param timeout - Timeout per agent (default: 1 hour)
   * @returns Array of TaskResults when all agents complete
   */
  async waitForMultipleCompletions(
    agentTerminals: AgentTerminal[],
    timeout: number = 3600000
  ): Promise<TaskResult[]> {
    const promises = agentTerminals.map((terminal) => this.waitForCompletion(terminal, timeout));
    return Promise.all(promises);
  }

  /**
   * Monitor agents with race condition (any agent completes)
   *
   * DESIGN DECISION: Promise.race for "any agent done" detection
   * WHY: Useful for blocking tasks (wait for ANY dependency to complete)
   *
   * @param agentTerminals - Array of agent terminals to monitor
   * @param timeout - Timeout per agent (default: 1 hour)
   * @returns First TaskResult when any agent completes
   */
  async waitForAnyCompletion(
    agentTerminals: AgentTerminal[],
    timeout: number = 3600000
  ): Promise<TaskResult> {
    const promises = agentTerminals.map((terminal) => this.waitForCompletion(terminal, timeout));
    return Promise.race(promises);
  }

  /**
   * Check if agent is still running
   *
   * DESIGN DECISION: Check if terminal is alive and no completion signal exists
   * WHY: Detect crashed/hung agents
   *
   * @param agentTerminal - Agent terminal to check
   * @returns True if agent is still running, false if completed or crashed
   */
  isRunning(agentTerminal: AgentTerminal): boolean {
    const taskId = agentTerminal.currentTask.id;
    const signalFile = path.join(this.workflowDir, `${taskId}.complete.json`);

    // Check if completion signal exists
    if (fs.existsSync(signalFile)) {
      return false; // Completed
    }

    // Check if terminal is alive (VS Code Terminal API limitation: no reliable process status)
    // Assume running if no completion signal and terminal exists
    return true;
  }

  /**
   * Get elapsed time for running agent
   *
   * @param agentTerminal - Agent terminal
   * @returns Elapsed time in milliseconds
   */
  getElapsedTime(agentTerminal: AgentTerminal): number {
    return Date.now() - agentTerminal.spawnedAt;
  }

  /**
   * List all running agents
   *
   * @param agentTerminals - All agent terminals
   * @returns Array of running agent terminals
   */
  getRunningAgents(agentTerminals: AgentTerminal[]): AgentTerminal[] {
    return agentTerminals.filter((terminal) => this.isRunning(terminal));
  }

  /**
   * List all completed agents
   *
   * @param agentTerminals - All agent terminals
   * @returns Array of completed agent terminals
   */
  getCompletedAgents(agentTerminals: AgentTerminal[]): AgentTerminal[] {
    return agentTerminals.filter((terminal) => !this.isRunning(terminal));
  }

  /**
   * Clean up old completion signal files
   *
   * DESIGN DECISION: Manual cleanup (keep for debugging by default)
   * WHY: Completion signals useful for post-mortem analysis
   *
   * @param olderThanMs - Delete signals older than this (default: 24 hours)
   */
  async cleanupCompletionSignals(olderThanMs: number = 86400000): Promise<void> {
    const files = fs.readdirSync(this.workflowDir);
    const now = Date.now();

    for (const file of files) {
      if (!file.endsWith('.complete.json')) {
        continue;
      }

      const filePath = path.join(this.workflowDir, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;

      if (age > olderThanMs) {
        fs.unlinkSync(filePath);
      }
    }
  }
}
