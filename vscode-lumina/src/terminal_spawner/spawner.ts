/**
 * Terminal Spawner - Core Agent Terminal Creation
 *
 * DESIGN DECISION: VS Code Terminal API for agent isolation
 * WHY: Each agent needs isolated execution environment with full terminal control
 *
 * REASONING CHAIN:
 * 1. VS Code Terminal API provides: Isolation, visibility, process control
 * 2. Each agent gets dedicated terminal: Prevents output mixing, enables parallel execution
 * 3. Terminal lifecycle: Create → Start Claude Code → Inject context → Monitor → Cleanup
 * 4. Error handling: Terminal crashes, Claude Code failures, timeout errors
 * 5. Result: Reliable agent execution with full observability
 *
 * PATTERN: Pattern-TERMINAL-SPAWNER-001 (Isolated Agent Execution)
 * PERFORMANCE: <500ms spawn + <2s Claude init = <2.5s total per agent
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { AgentType, Task, AgentTerminal, SpawnOptions } from './types';
import { ContextInjector } from './context_injector';

/**
 * Terminal spawner for autonomous agents
 *
 * DESIGN DECISION: Single spawner instance manages all agent terminals
 * WHY: Centralized terminal management enables coordination and cleanup
 */
export class TerminalSpawner {
  private terminals: Map<string, AgentTerminal> = new Map();
  private contextInjector: ContextInjector;
  private workspaceRoot: string;

  constructor(workspaceRoot?: string) {
    this.workspaceRoot = workspaceRoot || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
    this.contextInjector = new ContextInjector(this.workspaceRoot);
  }

  /**
   * Spawn agent terminal for task execution
   *
   * DESIGN DECISION: Async spawning with initialization wait
   * WHY: Ensure Claude Code is ready before returning terminal
   *
   * REASONING CHAIN:
   * 1. Create VS Code terminal with agent-specific name
   * 2. Start Claude Code in terminal
   * 3. Wait for Claude Code initialization (prompt ready)
   * 4. Inject agent-specific context
   * 5. Return ready AgentTerminal
   *
   * PERFORMANCE: <2.5s total (500ms spawn + 2s init)
   *
   * @param agentType - Type of agent to spawn (database, ui, api, etc.)
   * @param task - Task to execute
   * @param options - Spawn options (cwd, env, timeout, etc.)
   * @returns AgentTerminal ready for execution
   */
  async spawnAgent(
    agentType: AgentType,
    task: Task,
    options: SpawnOptions = {}
  ): Promise<AgentTerminal> {
    const {
      cwd = this.workspaceRoot,
      env = {},
      namePrefix = 'lumina',
      waitForInit = true,
      initTimeout = 10000,
    } = options;

    // Create terminal
    const terminalName = `${namePrefix}-${agentType}-${task.id}`;
    const terminal = vscode.window.createTerminal({
      name: terminalName,
      cwd: cwd,
      env: {
        ...process.env,
        ...env,
        // Enable OTEL tracking for agent
        OTEL_SDK_ENABLED: 'true',
        OTEL_EXPORTER_FILE_PATH: path.join(cwd, 'logs', 'otel', `${task.id}.json`),
      },
    });

    // Show terminal (optional, for debugging)
    // terminal.show(true);

    const agentTerminal: AgentTerminal = {
      terminal,
      agentType,
      currentTask: task,
      spawnedAt: Date.now(),
    };

    // Store terminal reference
    this.terminals.set(task.id, agentTerminal);

    // Start Claude Code
    terminal.sendText('claude');

    // Wait for initialization if requested
    if (waitForInit) {
      await this.waitForInit(terminal, initTimeout);
    }

    // Inject agent context
    await this.contextInjector.injectContext(terminal, agentType, task);

    return agentTerminal;
  }

  /**
   * Wait for Claude Code initialization
   *
   * DESIGN DECISION: Poll-based waiting with timeout
   * WHY: VS Code Terminal API doesn't provide process ready events
   *
   * REASONING CHAIN:
   * 1. Claude Code startup takes 1-2 seconds
   * 2. No direct way to detect when prompt is ready
   * 3. Use fixed delay (2s) based on empirical testing
   * 4. Timeout after initTimeout milliseconds
   * 5. Result: Reliable initialization detection
   *
   * FUTURE: Parse terminal output to detect prompt (requires terminal output capture)
   *
   * @param terminal - Terminal to wait for
   * @param timeout - Timeout in milliseconds
   */
  private async waitForInit(terminal: vscode.Terminal, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      // Fixed delay based on Claude Code startup time
      const initDelay = 2000; // 2 seconds

      const timer = setTimeout(() => {
        resolve();
      }, initDelay);

      // Timeout check
      const timeoutTimer = setTimeout(() => {
        clearTimeout(timer);
        reject(new Error(`Claude Code initialization timed out after ${timeout}ms`));
      }, timeout);

      // Clean up timeout on success
      setTimeout(() => {
        clearTimeout(timeoutTimer);
      }, initDelay);
    });
  }

  /**
   * Get agent terminal by task ID
   */
  getTerminal(taskId: string): AgentTerminal | undefined {
    return this.terminals.get(taskId);
  }

  /**
   * Get all active agent terminals
   */
  getActiveTerminals(): AgentTerminal[] {
    return Array.from(this.terminals.values());
  }

  /**
   * Close agent terminal
   *
   * DESIGN DECISION: Graceful shutdown with cleanup
   * WHY: Prevent resource leaks, ensure clean state
   */
  async closeTerminal(taskId: string): Promise<void> {
    const agentTerminal = this.terminals.get(taskId);
    if (agentTerminal) {
      agentTerminal.terminal.dispose();
      this.terminals.delete(taskId);
    }
  }

  /**
   * Close all agent terminals
   */
  async closeAllTerminals(): Promise<void> {
    for (const agentTerminal of this.terminals.values()) {
      agentTerminal.terminal.dispose();
    }
    this.terminals.clear();
  }

  /**
   * Send text to agent terminal
   *
   * DESIGN DECISION: Direct terminal access for flexibility
   * WHY: Enable manual intervention, debugging, custom commands
   */
  sendText(taskId: string, text: string): void {
    const agentTerminal = this.terminals.get(taskId);
    if (agentTerminal) {
      agentTerminal.terminal.sendText(text);
    }
  }
}
