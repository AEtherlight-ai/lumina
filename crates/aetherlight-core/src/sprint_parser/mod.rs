/**
 * Sprint Parser Module - Autonomous Sprint Execution Foundation
 *
 * DESIGN DECISION: Sprint parser as first Phase 4 component
 * WHY: Foundation for multi-agent orchestration, enables autonomous execution
 *
 * REASONING CHAIN:
 * 1. Phase 4 Goal: Autonomous multi-agent sprint execution
 * 2. Sprint parser: Convert human YAML → machine-executable plan
 * 3. Enables: Human + Planning Agent → Collaborative sprint design
 * 4. Enables: Project Manager Agent → Autonomous execution
 * 5. Result: 50-70% faster development with perfect quality
 *
 * PATTERN: Pattern-SPRINT-PLAN-001 (Structured Sprint Definition)
 * RELATED: AS-002 (Dependency Graph Builder), AS-003 (Task Scheduler)
 * PHASE: Phase 4 Sprint 1 (Project Manager Foundation)
 *
 * # Module Organization
 *
 * - `types.rs`: Core data structures (SprintPlan, ExecutableSprintPlan, Task, etc.)
 * - `yaml_parser.rs`: YAML → Rust struct parsing with serde
 * - `validator.rs`: Business logic validation (DAG property, valid references, etc.)
 *
 * # Usage Example
 *
 * ```rust
 * use aetherlight_core::sprint_parser::{YamlParser, Validator};
 *
 * // Parse sprint plan from YAML
 * let plan = YamlParser::parse_file("sprints/oauth2-auth.yaml")?;
 *
 * // Validate plan
 * Validator::validate(&plan)?;
 *
 * // Use plan for execution
 * println!("Sprint: {}", plan.name);
 * println!("Tasks: {}", plan.tasks.len());
 * println!("Parallel groups: {}", plan.parallel_groups.len());
 *
 * // Find ready tasks
 * let completed = std::collections::HashSet::new();
 * let ready = plan.ready_tasks(&completed);
 * println!("Ready to start: {:?}", ready);
 * ```
 *
 * # Performance
 *
 * - Parse 50-task sprint: <100ms
 * - Validate plan: <10ms
 * - Find ready tasks: <1ms (O(n) where n = task count)
 *
 * # Error Handling
 *
 * All functions return `Result<T, Error>`:
 * - Parse errors: Invalid YAML syntax, missing fields
 * - Validation errors: Circular dependencies, invalid references
 * - File errors: File not found, read permission denied
 */

pub mod types;
pub mod yaml_parser;
pub mod validator;
pub mod dependency_graph;

// Re-export primary types for ergonomic imports
pub use types::{
    SprintPlan, SprintMetadata, ExecutableSprintPlan, Task, TaskId, AgentType,
    ApprovalGate, ParallelGroup, TaskContext
};
pub use yaml_parser::YamlParser;
pub use validator::Validator;
pub use dependency_graph::{DependencyGraph as SprintDependencyGraph, TaskNode};

/**
 * Parse and validate sprint plan from YAML file
 *
 * DESIGN DECISION: Convenience function for common use case
 * WHY: Parse + validate in one call, reduces boilerplate
 *
 * REASONING CHAIN:
 * 1. Most callers want: Parse YAML → Validate → Use
 * 2. Separate functions enable: Parse only (for debugging)
 * 3. This function combines both for convenience
 * 4. Returns validated ExecutableSprintPlan ready for execution
 * 5. Result: Ergonomic API with flexibility
 *
 * # Examples
 *
 * ```rust
 * use aetherlight_core::sprint_parser::parse_sprint_file;
 *
 * let plan = parse_sprint_file("sprints/oauth2-auth.yaml")?;
 * // Plan is parsed AND validated, ready to execute
 * ```
 *
 * # Errors
 *
 * Returns error if parsing or validation fails
 */
pub fn parse_sprint_file<P: AsRef<std::path::Path>>(
    path: P,
) -> crate::error::Result<ExecutableSprintPlan> {
    let plan = YamlParser::parse_file(path)?;
    Validator::validate(&plan)?;
    Ok(plan)
}

/**
 * Parse and validate sprint plan from YAML string
 *
 * DESIGN DECISION: Convenience function for string input
 * WHY: Enables testing, dynamic generation without file I/O
 *
 * # Examples
 *
 * ```rust
 * use aetherlight_core::sprint_parser::parse_sprint_str;
 *
 * let yaml = r#"
 * sprint:
 *   name: "Test Sprint"
 *   duration: "1 week"
 *   goals: ["Test goal"]
 *   tasks:
 *     - id: "DB-001"
 *       title: "Create table"
 *       agent: "database"
 *       duration: "2 hours"
 *       dependencies: []
 *       acceptance_criteria: ["Table exists"]
 * "#;
 *
 * let plan = parse_sprint_str(yaml)?;
 * ```
 */
pub fn parse_sprint_str(yaml: &str) -> crate::error::Result<ExecutableSprintPlan> {
    let plan = YamlParser::parse_from_str(yaml)?;
    Validator::validate(&plan)?;
    Ok(plan)
}

#[cfg(test)]
mod tests {
    use super::*;

    /**
     * Test: Integration test (parse + validate)
     *
     * DESIGN DECISION: Test full pipeline with valid YAML
     * WHY: Ensure parse + validate work together
     */
    #[test]
    fn test_parse_and_validate() {
        let yaml = r#"
sprint:
  name: "Integration Test Sprint"
  duration: "1 week"
  goals:
    - "Test full pipeline"
  tasks:
    - id: "DB-001"
      title: "Create users table"
      agent: "database"
      duration: "2 hours"
      dependencies: []
      acceptance_criteria:
        - "Table exists with correct schema"
        - "Migration reversible"

    - id: "API-001"
      title: "Create API endpoints"
      agent: "api"
      duration: "4 hours"
      dependencies: ["DB-001"]
      acceptance_criteria:
        - "Endpoints functional"
        - "Validation works"

  approval_gates:
    - stage: "after-implementation"
      requires: ["DB-001", "API-001"]
      message: "Review implementation before testing"
"#;

        let plan = parse_sprint_str(yaml).unwrap();
        assert_eq!(plan.name, "Integration Test Sprint");
        assert_eq!(plan.tasks.len(), 2);
        assert_eq!(plan.approval_gates.len(), 1);
        assert_eq!(plan.parallel_groups.len(), 2); // Level 0: DB-001, Level 1: API-001
    }

    /**
     * Test: Convenience functions match manual flow
     *
     * DESIGN DECISION: Test convenience functions equivalent to manual
     * WHY: Ensure no behavior difference
     */
    #[test]
    fn test_convenience_functions() {
        let yaml = r#"
sprint:
  name: "Test"
  duration: "1 day"
  goals: []
  tasks:
    - id: "T-001"
      title: "Task"
      agent: "database"
      duration: "1 hour"
      dependencies: []
      acceptance_criteria: []
"#;

        // Manual flow
        let plan1 = YamlParser::parse_from_str(yaml).unwrap();
        Validator::validate(&plan1).unwrap();

        // Convenience function
        let plan2 = parse_sprint_str(yaml).unwrap();

        // Should be equivalent
        assert_eq!(plan1.name, plan2.name);
        assert_eq!(plan1.tasks.len(), plan2.tasks.len());
    }
}
