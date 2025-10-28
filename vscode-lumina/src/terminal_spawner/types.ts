/**
 * Type Definitions for Terminal Spawner
 *
 * DESIGN DECISION: Strong typing for agent terminals and task execution
 * WHY: Type safety prevents runtime errors in multi-agent coordination
 */

import * as vscode from 'vscode';

/**
 * Agent types supported by the spawner
 */
export type AgentType =
  | 'database'
  | 'ui'
  | 'api'
  | 'infrastructure'
  | 'test'
  | 'docs'
  | 'review'
  | 'commit'
  | 'planning';

/**
 * Task definition for agent execution
 *
 * DESIGN DECISION: Mirror Rust Task struct for consistency
 * WHY: Enable seamless data transfer between Rust core and TypeScript extension
 */
export interface Task {
  id: string;
  title: string;
  agent: AgentType;
  duration: string;
  dependencies: string[];
  acceptanceCriteria: string[];
  files: string[];
  patterns: string[];
}

/**
 * Agent terminal wrapper
 *
 * DESIGN DECISION: Wrap VS Code Terminal with agent metadata
 * WHY: Track which agent is executing which task in which terminal
 */
export interface AgentTerminal {
  /** VS Code terminal instance */
  terminal: vscode.Terminal;
  /** Agent type */
  agentType: AgentType;
  /** Current task being executed */
  currentTask: Task;
  /** Terminal spawn time */
  spawnedAt: number;
  /** Process ID (if available) */
  pid?: number;
}

/**
 * Task execution result
 *
 * DESIGN DECISION: Structured result with success/failure details
 * WHY: Enable error recovery, metrics collection, and progress tracking
 */
export interface TaskResult {
  /** Task ID */
  taskId: string;
  /** Agent type that executed task */
  agentType: AgentType;
  /** Success status */
  success: boolean;
  /** Error message (if failed) */
  error?: string;
  /** Execution duration (milliseconds) */
  duration: number;
  /** Files changed */
  filesChanged: string[];
  /** Design decisions made */
  designDecisions: string[];
  /** Timestamp */
  timestamp: number;
}

/**
 * Spawn options for customizing agent behavior
 */
export interface SpawnOptions {
  /** Working directory (defaults to workspace root) */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Terminal name prefix (defaults to 'lumina-{agent}') */
  namePrefix?: string;
  /** Wait for Claude Code initialization (default: true) */
  waitForInit?: boolean;
  /** Timeout for initialization (milliseconds, default: 10000) */
  initTimeout?: number;
}

/**
 * Completion signal file format
 *
 * DESIGN DECISION: JSON format for completion signals
 * WHY: Human-readable, easily parseable, supports rich metadata
 */
export interface CompletionSignal {
  taskId: string;
  agentType: AgentType;
  status: 'success' | 'failed' | 'blocked';
  filesChanged: string[];
  designDecisions: string[];
  nextStages: string[];
  timestamp: number;
  error?: string;
}
