/**
 * TypeScript type definitions for Rust sprint_parser module
 *
 * DESIGN DECISION: Manual type definitions for Rust FFI integration
 * WHY: NAPI-RS auto-generation requires build step, provide types immediately for development
 *
 * REASONING CHAIN:
 * 1. vscode-lumina TypeScript code imports sprint_parser types
 * 2. sprint_parser is Rust module in aetherlight-core
 * 3. Need TypeScript definitions for IDE support and compilation
 * 4. Manual definitions match Rust types in crates/aetherlight-core/src/sprint_parser/types.rs
 * 5. Result: TypeScript compiles without errors
 *
 * PATTERN: Pattern-NAPI-001 (Language Bindings via NAPI)
 * RELATED: crates/aetherlight-core/src/sprint_parser/types.rs
 * FUTURE: Auto-generate these types from Rust using NAPI-RS build step
 */

export type TaskId = string;
export type AgentType =
  | 'Database'
  | 'UI'
  | 'API'
  | 'Infrastructure'
  | 'Test'
  | 'Docs'
  | 'Review'
  | 'Commit'
  | 'Planning';

// AgentType constants for use as values
export const AgentType = {
  Database: 'Database' as const,
  UI: 'UI' as const,
  API: 'API' as const,
  Infrastructure: 'Infrastructure' as const,
  Test: 'Test' as const,
  Docs: 'Docs' as const,
  Review: 'Review' as const,
  Commit: 'Commit' as const,
  Planning: 'Planning' as const,
};

export interface Task {
  id: TaskId;
  name?: string; // Optional (can be derived from description)
  description: string;
  agent: AgentType;
  dependencies: TaskId[];
  estimated_duration: string;
  estimatedDuration?: string; // Alias for compatibility (deprecated, use estimated_duration)
  acceptance_criteria?: string[]; // Optional (can be empty for generated tasks)
  approval_required?: boolean;
}

export interface ExecutableSprintPlan {
  name: string;
  description: string;
  tasks: Task[];
  total_estimated_duration: string;
  metadata?: Record<string, unknown>;
  approvalGates?: ApprovalGate[];
}

// Alias for compatibility with Phase 4 code
export type SprintPlan = ExecutableSprintPlan;

export interface ApprovalGate {
  task_id: TaskId;
  gate_type: 'pre_sprint' | 'mid_sprint' | 'post_sprint' | 'error_recovery';
  required_approvers: string[];
  description: string;
  metadata?: Record<string, unknown>;
}

export interface ParallelGroup {
  level: number;
  tasks: TaskId[];
}

export interface DependencyGraph {
  ready_tasks(): TaskId[];
  mark_complete(taskId: TaskId): void;
  is_complete(): boolean;
}

/**
 * Parse sprint plan from YAML file
 */
export function parse_sprint_file(filePath: string): ExecutableSprintPlan;

/**
 * Parse sprint plan from YAML string
 */
export function parse_sprint_str(yamlContent: string): ExecutableSprintPlan;

/**
 * Get parallel execution groups from sprint plan
 */
export function get_parallel_groups(plan: ExecutableSprintPlan): ParallelGroup[];

/**
 * Create dependency graph for execution tracking
 */
export function create_dependency_graph(plan: ExecutableSprintPlan): DependencyGraph;
