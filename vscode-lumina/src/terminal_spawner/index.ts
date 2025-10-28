/**
 * Terminal Spawner Module - Autonomous Agent Execution
 *
 * DESIGN DECISION: Programmatically spawn VS Code terminals for specialized agents
 * WHY: Each agent needs isolated terminal with own context and execution environment
 *
 * REASONING CHAIN:
 * 1. Phase 4 autonomous sprints require multiple agents running in parallel
 * 2. Each agent (DB, UI, API, etc.) needs isolated execution environment
 * 3. VS Code terminals provide isolation, visibility, and control
 * 4. Spawner creates terminal → Starts Claude Code → Injects agent context → Monitors completion
 * 5. Result: Parallel agent execution with full transparency and control
 *
 * PATTERN: Pattern-TERMINAL-SPAWNER-001 (Isolated Agent Execution)
 * RELATED: AS-003 (Task Scheduler), AS-005 (Context Loader), AS-014 (IPC System)
 * PHASE: Phase 4 Sprint 1 (Project Manager Foundation)
 *
 * # Module Organization
 *
 * - `spawner.ts`: Core terminal spawning logic (create, configure, start Claude Code)
 * - `context_injector.ts`: Agent context injection (specialized prompts, files, patterns)
 * - `monitor.ts`: Completion monitoring (watch for completion signals, handle errors)
 *
 * # Usage Example
 *
 * ```typescript
 * import { TerminalSpawner } from './terminal_spawner';
 *
 * const spawner = new TerminalSpawner(context.extensionUri);
 *
 * // Spawn Database Agent for task
 * const terminal = await spawner.spawnAgent('database', {
 *   id: 'DB-001',
 *   title: 'Create users table',
 *   agent: 'database',
 *   duration: '2 hours',
 *   dependencies: [],
 *   acceptanceCriteria: ['Table created', 'Migration reversible'],
 *   files: ['migrations/001_users.sql'],
 *   patterns: ['Pattern-DB-001']
 * });
 *
 * // Monitor for completion
 * const result = await spawner.waitForCompletion(terminal);
 * console.log(`Task ${result.taskId} completed in ${result.duration}ms`);
 * ```
 *
 * # Performance
 *
 * - Terminal spawn: <500ms (VS Code API overhead)
 * - Claude Code init: <2s (startup time)
 * - Context injection: <100ms (send text to terminal)
 * - Completion detection: <50ms (filesystem watcher)
 */

export { TerminalSpawner } from './spawner';
export { ContextInjector } from './context_injector';
export { CompletionMonitor } from './monitor';
export type { AgentTerminal, TaskResult, SpawnOptions } from './types';
