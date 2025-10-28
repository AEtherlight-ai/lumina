/**
 * IPC Dogfooding Schema - Type Definitions
 *
 * DESIGN DECISION: Extend IPC protocol with pattern references, Chain of Thought, and breadcrumbs
 * WHY: Enable agents to share reasoning and pattern knowledge via IPC (not just task completion)
 *
 * REASONING CHAIN:
 * 1. Phase 4 agents coordinate via IPC (file-based message passing)
 * 2. Current IPC: Task status updates only (task_id, status, progress)
 * 3. Problem: Agents work in isolation, can't learn from each other's reasoning
 * 4. Solution: Add pattern references, Chain of Thought reasoning, breadcrumbs to IPC
 * 5. Result: Agents share WHY they made decisions, not just WHAT they did
 *
 * PATTERN: Pattern-IPC-002 (IPC Dogfooding - Reasoning in Messages)
 * RELATED: Phase 4 orchestrator, multi-agent coordination, Pattern Index (AI-005)
 * FUTURE: Cross-agent learning, pattern discovery from agent reasoning
 */

/**
 * Pattern reference in IPC message
 *
 * DESIGN DECISION: Lightweight pattern metadata (not full pattern content)
 * WHY: IPC messages should be small (<1KB), patterns stored in Pattern Index
 */
export interface PatternReference {
    /** Pattern ID (e.g., "Pattern-RUST-007", "Pattern-API-001") */
    pattern_id: string;
    /** Pattern name (e.g., "Multi-factor confidence calculation") */
    pattern_name: string;
    /** Confidence score (0.0 to 1.0) - how well pattern matched */
    confidence: number;
    /** Why this pattern was chosen (1 sentence) */
    rationale: string;
}

/**
 * Chain of Thought reasoning in IPC message
 *
 * DESIGN DECISION: Structured reasoning chain (not free-form text)
 * WHY: Parseable by other agents, enables automated reasoning analysis
 */
export interface ChainOfThought {
    /** Design decision made (1 sentence) */
    design_decision: string;
    /** Why this decision was made (1-2 sentences) */
    why: string;
    /** Numbered reasoning steps (3-5 steps) */
    reasoning_chain: string[];
    /** Alternative approaches considered (optional) */
    alternatives_considered?: string[];
    /** Trade-offs made (optional) */
    tradeoffs?: string[];
}

/**
 * Breadcrumb for context recovery
 *
 * DESIGN DECISION: 200-500 char citations with file references
 * WHY: Enable agents to recover context from previous work without re-reading entire codebase
 *
 * REASONING CHAIN:
 * 1. Agent A implements database schema in schema.sql
 * 2. Agent B needs to implement API using that schema
 * 3. Without breadcrumbs: Agent B must search codebase, find schema.sql, read it
 * 4. With breadcrumbs: Agent A leaves citation "Schema: users table with id, email, password_hash"
 * 5. Result: Agent B instantly knows schema structure, no search needed
 */
export interface Breadcrumb {
    /** Breadcrumb ID (for referencing) */
    id: string;
    /** Agent that left this breadcrumb */
    agent: string;
    /** Task that created this breadcrumb */
    task_id: string;
    /** Timestamp (ISO 8601) */
    timestamp: string;
    /** Citation text (200-500 characters) */
    citation: string;
    /** File references (optional) */
    file_references?: FileCitation[];
    /** Tags for categorization */
    tags: string[];
}

/**
 * File citation within breadcrumb
 */
export interface FileCitation {
    /** File path (relative to workspace root) */
    file_path: string;
    /** Line numbers (optional, for precise references) */
    line_start?: number;
    line_end?: number;
    /** Brief description of what's in this file section */
    description: string;
}

/**
 * Enhanced IPC message with dogfooding fields
 *
 * DESIGN DECISION: Extend existing IPC message schema (not replace)
 * WHY: Backward compatible, optional fields don't break existing agents
 */
export interface DogfoodingIPCMessage {
    /** Standard IPC fields */
    message_type: 'task_update' | 'task_complete' | 'task_failed' | 'handoff' | 'approval_request';
    task_id: string;
    agent: string;
    timestamp: string;

    /** Status (for task_update/task_complete/task_failed) */
    status?: 'pending' | 'running' | 'done' | 'failed';
    progress?: number;

    /** Dogfooding fields (optional, for enhanced coordination) */
    recommended_patterns?: PatternReference[];
    chain_of_thought?: ChainOfThought;
    breadcrumbs?: Breadcrumb[];

    /** Additional context (optional) */
    error_message?: string; // For task_failed
    next_agent?: string; // For handoff
    approval_required?: boolean; // For approval_request
}

/**
 * Breadcrumb query interface
 *
 * DESIGN DECISION: Searchable breadcrumb database
 * WHY: Agents need to query breadcrumbs by tag, agent, file path
 */
export interface BreadcrumbQuery {
    /** Filter by tags (AND logic - all tags must match) */
    tags?: string[];
    /** Filter by agent */
    agent?: string;
    /** Filter by task ID */
    task_id?: string;
    /** Filter by file path (exact or prefix match) */
    file_path?: string;
    /** Limit results */
    limit?: number;
}

/**
 * Pattern recommendation context
 *
 * DESIGN DECISION: Context for pattern matching (not just query string)
 * WHY: Better pattern recommendations when context is rich
 */
export interface PatternRecommendationContext {
    /** Current task description */
    task_description: string;
    /** Files being modified */
    files_modified?: string[];
    /** Previous breadcrumbs (context from earlier work) */
    breadcrumbs?: Breadcrumb[];
    /** Agent type (Database, UI, API, etc.) */
    agent_type: string;
    /** Technologies in use (e.g., ["Rust", "PostgreSQL", "Actix-web"]) */
    tech_stack?: string[];
}

/**
 * Pattern recommendation result
 */
export interface PatternRecommendationResult {
    /** Recommended patterns (sorted by confidence descending) */
    patterns: PatternReference[];
    /** Total patterns searched */
    total_searched: number;
    /** Query time in milliseconds */
    query_time_ms: number;
}

/**
 * Completion signal from agent task
 *
 * DESIGN DECISION: Structured completion signal with metadata
 * WHY: Enable approval gates to review changes, decisions, outcomes
 */
export interface CompletionSignal {
    /** Task ID */
    task_id: string;
    /** Agent type */
    agent_type: string;
    /** Completion status */
    status: 'success' | 'failed';
    /** Error message if failed */
    error?: string;
    /** Files changed during execution */
    files_changed: string[];
    /** Design decisions made */
    design_decisions: string[];
    /** Timestamp */
    timestamp: string;
}
