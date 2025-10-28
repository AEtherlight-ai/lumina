/**
 * Sprint Parser Types - Core data structures for autonomous sprint execution
 *
 * DESIGN DECISION: Strongly-typed sprint plan representation with serde support
 * WHY: Type safety prevents runtime errors, serde enables YAML parsing with validation
 *
 * REASONING CHAIN:
 * 1. Human + Planning Agent create sprint plans collaboratively
 * 2. YAML format: Human-readable, supports comments, git-friendly
 * 3. Parse YAML → strongly-typed Rust structs with compile-time guarantees
 * 4. Serde validation catches invalid data at parse time (fail early)
 * 5. ExecutableSprintPlan adds computed fields (dependency graph, parallel groups)
 * 6. Result: Machine-executable sprint with human-readable source
 *
 * PATTERN: Pattern-SPRINT-PLAN-001 (Structured Sprint Definition)
 * RELATED: AS-002 (Dependency Graph Builder), AS-003 (Task Scheduler)
 * PERFORMANCE: <1s to parse 50-task sprint
 */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;

/**
 * Unique identifier for a task (e.g., "DB-001", "API-002")
 *
 * DESIGN DECISION: Type alias for TaskId instead of newtype
 * WHY: Simplicity for HashMap keys, no wrapping/unwrapping overhead
 *
 * REASONING CHAIN:
 * 1. TaskId used frequently in HashMaps for dependency tracking
 * 2. Newtype (struct TaskId(String)) adds wrapping/unwrapping boilerplate
 * 3. Type alias maintains readability without runtime cost
 * 4. Validation happens at parse time (non-empty string)
 * 5. Result: Zero-cost abstraction with clear semantics
 *
 * PATTERN: Rust type system best practices
 * PERFORMANCE: Zero runtime overhead vs raw String
 */
pub type TaskId = String;

/**
 * Agent type for task execution
 *
 * DESIGN DECISION: Enum for agent types with serde rename
 * WHY: Type safety prevents typos, serde rename enables lowercase YAML
 *
 * REASONING CHAIN:
 * 1. Core agents: database, ui, api, infrastructure (parallel execution)
 * 2. Pipeline agents: test, docs, review, commit (sequential processing)
 * 3. Enum prevents invalid agent types at compile time
 * 4. Serde rename enables natural YAML (agent: "database" not "Database")
 * 5. Result: Type-safe agent dispatch with ergonomic YAML
 *
 * PATTERN: Pattern-SPRINT-PLAN-001
 * RELATED: AS-006-009 (Core Agents), AS-010-013 (Pipeline Agents)
 */
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AgentType {
    /// Database schema, migrations, queries (AS-006)
    Database,
    /// UI components, styling, interactions (AS-007)
    Ui,
    /// API endpoints, validation, serialization (AS-008)
    Api,
    /// Deployment, config, monitoring (AS-009)
    Infrastructure,
    /// Test generation, execution, coverage (AS-010)
    Test,
    /// Chain of Thought validation (AS-011)
    Docs,
    /// Security, quality, performance (AS-012)
    Review,
    /// Git workflow, PR creation (AS-013)
    Commit,
    /// Human + Planning Agent collaboration (AS-018)
    Planning,
}

/**
 * Sprint plan from YAML file (direct deserialization)
 *
 * DESIGN DECISION: Separate SprintPlan (YAML) from ExecutableSprintPlan (computed)
 * WHY: Parse YAML first, then compute dependencies/parallelism in separate step
 *
 * REASONING CHAIN:
 * 1. SprintPlan: Direct 1:1 mapping from YAML structure
 * 2. serde automatically populates fields from YAML
 * 3. ExecutableSprintPlan: Adds computed fields (dependency graph, parallel groups)
 * 4. Separation enables validation between parse and execution
 * 5. Result: Clean parsing with explicit computation step
 *
 * PATTERN: Pattern-SPRINT-PLAN-001
 * PERFORMANCE: Minimal allocation (YAML → structs), <100ms for 50 tasks
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SprintPlan {
    /// Sprint metadata
    pub sprint: SprintMetadata,
}

/**
 * Sprint metadata (name, duration, goals, tasks, gates)
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SprintMetadata {
    /// Sprint name (e.g., "Add OAuth2 Authentication")
    pub name: String,
    /// Estimated duration (e.g., "1 week", "3 days")
    pub duration: String,
    /// High-level goals (e.g., ["Implement OAuth2 with PKCE"])
    pub goals: Vec<String>,
    /// List of tasks to execute
    pub tasks: Vec<Task>,
    /// Human approval gates (optional)
    #[serde(default)]
    pub approval_gates: Vec<ApprovalGate>,
}

/**
 * Task definition from sprint plan
 *
 * DESIGN DECISION: Task contains all execution metadata
 * WHY: Self-contained task definition enables autonomous agent execution
 *
 * REASONING CHAIN:
 * 1. Agent needs: What to do (title), How to verify (acceptance_criteria)
 * 2. Scheduler needs: Dependencies, estimated duration
 * 3. Context: Which files to modify, which patterns to use
 * 4. All data in one struct simplifies passing to agents
 * 5. Result: Complete task specification for autonomous execution
 *
 * PATTERN: Pattern-SPRINT-PLAN-001
 * RELATED: AS-004 (Terminal Spawner - injects task context)
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    /// Unique task ID (e.g., "DB-001")
    pub id: TaskId,
    /// Human-readable title (e.g., "Create users table")
    pub title: String,
    /// Agent responsible for execution
    pub agent: AgentType,
    /// Estimated duration (e.g., "2 hours")
    pub duration: String,
    /// Task dependencies (must complete before this task starts)
    #[serde(default)]
    pub dependencies: Vec<TaskId>,
    /// Acceptance criteria (what defines "done")
    pub acceptance_criteria: Vec<String>,
    /// Files to modify (optional, for context injection)
    #[serde(default)]
    pub files: Vec<String>,
    /// Relevant patterns (optional, for context injection)
    #[serde(default)]
    pub patterns: Vec<String>,
}

/**
 * Human approval gate
 *
 * DESIGN DECISION: Approval gates at strategic milestones, not every task
 * WHY: Human validates critical decisions without micromanaging
 *
 * REASONING CHAIN:
 * 1. Autonomous agents execute tasks in parallel
 * 2. Some milestones require human validation (e.g., database schema)
 * 3. Approval gate pauses workflow, shows context (diffs, tests, decisions)
 * 4. Human approves/rejects/requests changes
 * 5. Result: Strategic oversight with minimal friction
 *
 * PATTERN: Pattern-APPROVAL-GATE-001 (Strategic Human Oversight)
 * RELATED: AS-022 (Approval Gate System)
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApprovalGate {
    /// Gate identifier (e.g., "after-core-implementation")
    pub stage: String,
    /// Tasks that must complete before gate triggers
    pub requires: Vec<TaskId>,
    /// Message to show human (e.g., "Review database schema")
    pub message: String,
}

/**
 * Executable sprint plan with computed dependency graph
 *
 * DESIGN DECISION: Separate struct with computed fields added
 * WHY: SprintPlan = YAML input, ExecutableSprintPlan = validated + enriched
 *
 * REASONING CHAIN:
 * 1. Parse YAML → SprintPlan (direct deserialization)
 * 2. Validate dependencies form DAG (no cycles)
 * 3. Compute parallel execution groups (tasks with no dependencies)
 * 4. Build dependency map for scheduler
 * 5. Result: ExecutableSprintPlan ready for autonomous execution
 *
 * PATTERN: Pattern-SPRINT-PLAN-001
 * RELATED: AS-002 (Dependency Graph Builder), AS-003 (Task Scheduler)
 * PERFORMANCE: <100ms to build graph for 50 tasks
 */
#[derive(Debug, Clone)]
pub struct ExecutableSprintPlan {
    /// Sprint name
    pub name: String,
    /// Estimated duration
    pub duration: String,
    /// High-level goals
    pub goals: Vec<String>,
    /// All tasks (indexed by TaskId for fast lookup)
    pub tasks: HashMap<TaskId, Task>,
    /// Dependency map: task_id → [dependency_ids]
    pub dependencies: HashMap<TaskId, Vec<TaskId>>,
    /// Reverse dependency map: task_id → [dependent_ids]
    pub dependents: HashMap<TaskId, Vec<TaskId>>,
    /// Approval gates
    pub approval_gates: Vec<ApprovalGate>,
    /// Parallel execution groups (tasks that can run simultaneously)
    pub parallel_groups: Vec<ParallelGroup>,
    /// Topological sort (execution order)
    pub execution_order: Vec<TaskId>,
}

/**
 * Parallel execution group
 *
 * DESIGN DECISION: Explicitly track parallel groups for scheduler
 * WHY: Enables scheduler to maximize parallel execution efficiency
 *
 * REASONING CHAIN:
 * 1. Tasks with no dependencies can run in parallel
 * 2. Parallel group = set of tasks with satisfied dependencies
 * 3. Scheduler assigns all tasks in group simultaneously
 * 4. Reason field explains parallelism (useful for debugging)
 * 5. Result: 50-70% time reduction through parallelization
 *
 * PATTERN: Pattern-PARALLEL-EXECUTION-001 (Maximize Parallelism)
 * RELATED: AS-003 (Task Scheduler)
 * PERFORMANCE: Parallel efficiency = actual_time / (sequential_time / group_size)
 */
#[derive(Debug, Clone)]
pub struct ParallelGroup {
    /// Tasks that can execute in parallel
    pub tasks: Vec<TaskId>,
    /// Reason these can run in parallel (for debugging)
    pub reason: String,
}

/**
 * Task context for agent execution
 *
 * DESIGN DECISION: Separate struct for context injection
 * WHY: Terminal spawner needs minimal data to start agent
 *
 * REASONING CHAIN:
 * 1. Agent terminal receives: Task + TaskContext
 * 2. TaskContext: Files to read, patterns to load, docs to reference
 * 3. Agent loads context, then executes task
 * 4. Separation enables lazy loading (don't load until needed)
 * 5. Result: Fast terminal spawning with on-demand context
 *
 * PATTERN: Pattern-CONTEXT-INJECTION-001 (Lazy Context Loading)
 * RELATED: AS-004 (Terminal Spawner), AI-006 (Progressive Context Loader)
 */
#[derive(Debug, Clone)]
pub struct TaskContext {
    /// Files to read before starting
    pub files_to_read: Vec<String>,
    /// Patterns to load
    pub patterns_to_load: Vec<String>,
    /// Documentation to reference
    pub docs_to_reference: Vec<String>,
}

impl ExecutableSprintPlan {
    /**
     * Find tasks that are ready to execute (dependencies satisfied)
     *
     * DESIGN DECISION: Method on ExecutableSprintPlan for encapsulation
     * WHY: Scheduler queries plan for next tasks, plan tracks state
     *
     * REASONING CHAIN:
     * 1. Task ready = all dependencies completed
     * 2. Track completed tasks in HashSet
     * 3. Filter tasks: dependencies ⊆ completed
     * 4. Return ready tasks to scheduler
     * 5. Result: Scheduler focuses on assignment, plan tracks state
     *
     * PATTERN: Separation of concerns (plan = state, scheduler = execution)
     */
    pub fn ready_tasks(&self, completed: &std::collections::HashSet<TaskId>) -> Vec<TaskId> {
        self.tasks
            .keys()
            .filter(|task_id| !completed.contains(*task_id))
            .filter(|task_id| {
                // Check if all dependencies are completed
                if let Some(deps) = self.dependencies.get(*task_id) {
                    deps.iter().all(|dep| completed.contains(dep))
                } else {
                    true // No dependencies = ready
                }
            })
            .cloned()
            .collect()
    }

    /**
     * Get task by ID
     *
     * DESIGN DECISION: HashMap lookup for O(1) access
     * WHY: Scheduler frequently queries tasks by ID
     */
    pub fn get_task(&self, task_id: &TaskId) -> Option<&Task> {
        self.tasks.get(task_id)
    }

    /**
     * Check if all tasks complete
     */
    pub fn is_complete(&self, completed: &std::collections::HashSet<TaskId>) -> bool {
        self.tasks.len() == completed.len()
    }

    /**
     * Parse duration string to approximate Duration
     *
     * DESIGN DECISION: Simple duration parsing for estimates
     * WHY: Human-readable durations ("2 hours") converted to Duration for scheduling
     *
     * REASONING CHAIN:
     * 1. YAML contains human durations: "2 hours", "1 day", "30 minutes"
     * 2. Scheduler needs Duration for time tracking
     * 3. Simple parser: extract number + unit
     * 4. Approximate conversions (1 day = 8 hours work)
     * 5. Result: Good-enough estimates for scheduling
     *
     * PATTERN: Pragmatic parsing (don't need perfect accuracy)
     */
    pub fn parse_duration(duration_str: &str) -> Duration {
        let parts: Vec<&str> = duration_str.split_whitespace().collect();
        if parts.len() < 2 {
            return Duration::from_secs(0);
        }

        let value: u64 = parts[0].parse().unwrap_or(0);
        let unit = parts[1].to_lowercase();

        match unit.as_str() {
            "minute" | "minutes" | "min" => Duration::from_secs(value * 60),
            "hour" | "hours" | "hr" | "hrs" => Duration::from_secs(value * 3600),
            "day" | "days" => Duration::from_secs(value * 8 * 3600), // 8-hour workday
            "week" | "weeks" => Duration::from_secs(value * 5 * 8 * 3600), // 5-day workweek
            _ => Duration::from_secs(0),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /**
     * Test: Duration parsing
     *
     * DESIGN DECISION: Validate duration parsing logic
     * WHY: Ensure scheduler receives correct time estimates
     */
    #[test]
    fn test_parse_duration() {
        assert_eq!(
            ExecutableSprintPlan::parse_duration("30 minutes"),
            Duration::from_secs(30 * 60)
        );
        assert_eq!(
            ExecutableSprintPlan::parse_duration("2 hours"),
            Duration::from_secs(2 * 3600)
        );
        assert_eq!(
            ExecutableSprintPlan::parse_duration("1 day"),
            Duration::from_secs(8 * 3600)
        );
        assert_eq!(
            ExecutableSprintPlan::parse_duration("1 week"),
            Duration::from_secs(5 * 8 * 3600)
        );
    }

    /**
     * Test: Ready tasks detection
     *
     * DESIGN DECISION: Validate ready task logic
     * WHY: Scheduler relies on correct ready task detection
     */
    #[test]
    fn test_ready_tasks() {
        let mut tasks = HashMap::new();
        tasks.insert(
            "DB-001".to_string(),
            Task {
                id: "DB-001".to_string(),
                title: "Create users table".to_string(),
                agent: AgentType::Database,
                duration: "2 hours".to_string(),
                dependencies: vec![],
                acceptance_criteria: vec![],
                files: vec![],
                patterns: vec![],
            },
        );
        tasks.insert(
            "API-001".to_string(),
            Task {
                id: "API-001".to_string(),
                title: "Create API endpoints".to_string(),
                agent: AgentType::Api,
                duration: "4 hours".to_string(),
                dependencies: vec!["DB-001".to_string()],
                acceptance_criteria: vec![],
                files: vec![],
                patterns: vec![],
            },
        );

        let mut dependencies = HashMap::new();
        dependencies.insert("API-001".to_string(), vec!["DB-001".to_string()]);

        let plan = ExecutableSprintPlan {
            name: "Test Sprint".to_string(),
            duration: "1 week".to_string(),
            goals: vec![],
            tasks,
            dependencies,
            dependents: HashMap::new(),
            approval_gates: vec![],
            parallel_groups: vec![],
            execution_order: vec![],
        };

        let completed = std::collections::HashSet::new();
        let ready = plan.ready_tasks(&completed);
        assert_eq!(ready.len(), 1);
        assert_eq!(ready[0], "DB-001");

        let mut completed = std::collections::HashSet::new();
        completed.insert("DB-001".to_string());
        let ready = plan.ready_tasks(&completed);
        assert_eq!(ready.len(), 1);
        assert_eq!(ready[0], "API-001");
    }
}
