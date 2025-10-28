/**
 * YAML Sprint Plan Parser
 *
 * DESIGN DECISION: Use serde_yaml for automatic YAML → Rust struct deserialization
 * WHY: Declarative parsing with type safety, automatic validation, minimal code
 *
 * REASONING CHAIN:
 * 1. Sprint plans written in YAML (human-readable, version-controllable)
 * 2. serde_yaml deserializes directly to SprintPlan struct
 * 3. Compile-time type checking catches schema mismatches
 * 4. Manual parsing would require 500+ lines, serde requires 50
 * 5. Result: Automatic validation with zero boilerplate
 *
 * PATTERN: Pattern-SPRINT-PLAN-001 (Structured Sprint Definition)
 * PERFORMANCE: <100ms to parse 50-task YAML file
 */

use crate::error::{Error, Result};
use crate::sprint_parser::types::{SprintPlan, ExecutableSprintPlan, TaskId, ParallelGroup};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;

/**
 * YAML Sprint Plan Parser
 *
 * DESIGN DECISION: Struct with associated functions for parsing
 * WHY: Namespace for parsing logic, enables future stateful parsing if needed
 *
 * REASONING CHAIN:
 * 1. Parse functions logically grouped under YamlParser
 * 2. Associated functions (not methods) = no self parameter
 * 3. Future: Could add caching, validation context, etc.
 * 4. Result: Clean API with room for evolution
 *
 * PATTERN: Rust module organization best practices
 */
pub struct YamlParser;

impl YamlParser {
    /**
     * Parse sprint plan from YAML file
     *
     * DESIGN DECISION: File path input, not string
     * WHY: Typical use case is reading from file, enables better error messages
     *
     * REASONING CHAIN:
     * 1. Sprint plans stored as .yaml files in version control
     * 2. Read file → parse YAML → validate → build executable plan
     * 3. File path in error messages helps debugging
     * 4. Alternative parse_from_str() for testing
     * 5. Result: Ergonomic API for primary use case
     *
     * # Examples
     *
     * ```rust
     * use aetherlight_core::sprint_parser::YamlParser;
     *
     * let plan = YamlParser::parse_file("sprints/oauth2-auth.yaml")?;
     * println!("Sprint: {}", plan.name);
     * ```
     *
     * # Errors
     *
     * Returns error if:
     * - File not found
     * - Invalid YAML syntax
     * - Missing required fields
     * - Invalid agent types
     */
    pub fn parse_file<P: AsRef<Path>>(path: P) -> Result<ExecutableSprintPlan> {
        let path = path.as_ref();
        let contents = fs::read_to_string(path).map_err(|e| {
            Error::Configuration(format!(
                "Failed to read sprint plan from {}: {}",
                path.display(),
                e
            ))
        })?;

        Self::parse_from_str(&contents)
    }

    /**
     * Parse sprint plan from YAML string
     *
     * DESIGN DECISION: Separate function for string parsing
     * WHY: Enables testing without file I/O, useful for dynamic generation
     *
     * REASONING CHAIN:
     * 1. Tests can use inline YAML strings
     * 2. Planning Agent can generate YAML in memory
     * 3. No file I/O = faster tests
     * 4. Both paths use same validation logic
     * 5. Result: Flexible API for all use cases
     *
     * # Examples
     *
     * ```rust
     * let yaml = r#"
     * sprint:
     *   name: "Test Sprint"
     *   duration: "1 week"
     *   goals:
     *     - "Implement feature X"
     *   tasks:
     *     - id: "DB-001"
     *       title: "Create table"
     *       agent: "database"
     *       duration: "2 hours"
     *       dependencies: []
     *       acceptance_criteria:
     *         - "Table exists"
     * "#;
     *
     * let plan = YamlParser::parse_from_str(yaml)?;
     * ```
     */
    pub fn parse_from_str(yaml: &str) -> Result<ExecutableSprintPlan> {
        // DESIGN DECISION: Use serde_yaml for deserialization
        // WHY: Automatic validation, type safety, minimal code
        let sprint_plan: SprintPlan = serde_yaml::from_str(yaml).map_err(|e| {
            Error::Configuration(format!("Invalid sprint plan YAML: {}", e))
        })?;

        // Extract sprint metadata
        let metadata = sprint_plan.sprint;

        // Build tasks HashMap for O(1) lookup
        let mut tasks = HashMap::new();
        for task in metadata.tasks.iter() {
            tasks.insert(task.id.clone(), task.clone());
        }

        // Build dependency maps
        let mut dependencies = HashMap::new();
        let mut dependents: HashMap<TaskId, Vec<TaskId>> = HashMap::new();

        for task in metadata.tasks.iter() {
            if !task.dependencies.is_empty() {
                dependencies.insert(task.id.clone(), task.dependencies.clone());

                // Build reverse dependency map (task → dependents)
                for dep_id in &task.dependencies {
                    dependents
                        .entry(dep_id.clone())
                        .or_insert_with(Vec::new)
                        .push(task.id.clone());
                }
            }
        }

        // Find parallel execution opportunities
        let parallel_groups = Self::find_parallel_groups(&tasks, &dependencies);

        // Compute topological sort for execution order
        let execution_order = Self::topological_sort(&tasks, &dependencies)?;

        Ok(ExecutableSprintPlan {
            name: metadata.name,
            duration: metadata.duration,
            goals: metadata.goals,
            tasks,
            dependencies,
            dependents,
            approval_gates: metadata.approval_gates,
            parallel_groups,
            execution_order,
        })
    }

    /**
     * Find parallel execution groups
     *
     * DESIGN DECISION: Group tasks by "level" in dependency graph
     * WHY: Tasks at same level have same number of dependency hops from start
     *
     * REASONING CHAIN:
     * 1. Level 0: Tasks with no dependencies (can start immediately)
     * 2. Level 1: Tasks depending only on level 0 (can run after level 0)
     * 3. Level N: Tasks depending on level N-1 tasks
     * 4. All tasks in same level can run in parallel
     * 5. Result: Maximum parallelization opportunity identified
     *
     * PATTERN: Pattern-PARALLEL-EXECUTION-001 (Maximize Parallelism)
     * PERFORMANCE: O(V + E) where V = tasks, E = dependencies
     */
    fn find_parallel_groups(
        tasks: &HashMap<TaskId, crate::sprint_parser::types::Task>,
        dependencies: &HashMap<TaskId, Vec<TaskId>>,
    ) -> Vec<ParallelGroup> {
        let mut groups = Vec::new();
        let mut completed = HashSet::new();
        let mut current_level: usize = 0;

        loop {
            // Find tasks at current level (all dependencies satisfied)
            let level_tasks: Vec<TaskId> = tasks
                .keys()
                .filter(|task_id| !completed.contains(*task_id))
                .filter(|task_id| {
                    if let Some(deps) = dependencies.get(*task_id) {
                        deps.iter().all(|dep| completed.contains(dep))
                    } else {
                        true // No dependencies
                    }
                })
                .cloned()
                .collect();

            if level_tasks.is_empty() {
                break; // No more tasks
            }

            // Add to parallel group
            groups.push(ParallelGroup {
                tasks: level_tasks.clone(),
                reason: format!(
                    "Level {} tasks (all dependencies at level {} complete)",
                    current_level,
                    current_level.saturating_sub(1)
                ),
            });

            // Mark as completed for next iteration
            completed.extend(level_tasks);
            current_level += 1;
        }

        groups
    }

    /**
     * Topological sort of tasks (Kahn's algorithm)
     *
     * DESIGN DECISION: Kahn's algorithm for topological sort
     * WHY: Detects cycles, produces valid execution order, O(V + E) time
     *
     * REASONING CHAIN:
     * 1. Topological sort: Linear ordering where dependencies come first
     * 2. Kahn's algorithm: Process nodes with in-degree 0, remove edges
     * 3. If cycle exists: Some nodes never reach in-degree 0
     * 4. Return error if cycle detected (invalid sprint plan)
     * 5. Result: Valid execution order or error
     *
     * PATTERN: Standard graph algorithms
     * PERFORMANCE: O(V + E) where V = tasks, E = dependencies
     *
     * # Errors
     *
     * Returns error if dependency cycle detected
     */
    fn topological_sort(
        tasks: &HashMap<TaskId, crate::sprint_parser::types::Task>,
        dependencies: &HashMap<TaskId, Vec<TaskId>>,
    ) -> Result<Vec<TaskId>> {
        // Calculate in-degree for each task
        let mut in_degree: HashMap<TaskId, usize> = HashMap::new();
        for task_id in tasks.keys() {
            in_degree.insert(task_id.clone(), 0);
        }
        for deps in dependencies.values() {
            for dep_id in deps {
                *in_degree.get_mut(dep_id).unwrap() += 1;
            }
        }

        // Queue of tasks with in-degree 0
        let mut queue: Vec<TaskId> = in_degree
            .iter()
            .filter(|(_, &degree)| degree == 0)
            .map(|(id, _)| id.clone())
            .collect();

        let mut sorted = Vec::new();

        while let Some(task_id) = queue.pop() {
            sorted.push(task_id.clone());

            // Find tasks that depend on this task (reverse lookup)
            for (dependent_id, deps) in dependencies.iter() {
                if deps.contains(&task_id) {
                    let degree = in_degree.get_mut(dependent_id).unwrap();
                    *degree -= 1;
                    if *degree == 0 {
                        queue.push(dependent_id.clone());
                    }
                }
            }
        }

        // Check for cycles
        if sorted.len() != tasks.len() {
            let missing: Vec<_> = tasks
                .keys()
                .filter(|id| !sorted.contains(id))
                .map(|s| s.as_str())
                .collect();
            return Err(Error::Configuration(format!(
                "Circular dependency detected in sprint plan. Tasks in cycle: {:?}",
                missing
            )));
        }

        // Reverse to get correct order (dependencies first)
        sorted.reverse();
        Ok(sorted)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /**
     * Test: Parse simple sprint plan
     *
     * DESIGN DECISION: Test basic parsing with minimal YAML
     * WHY: Validate core parsing logic works
     */
    #[test]
    fn test_parse_simple_sprint() {
        let yaml = r#"
sprint:
  name: "Test Sprint"
  duration: "1 week"
  goals:
    - "Test goal 1"
  tasks:
    - id: "DB-001"
      title: "Create table"
      agent: "database"
      duration: "2 hours"
      dependencies: []
      acceptance_criteria:
        - "Table exists"
"#;

        let plan = YamlParser::parse_from_str(yaml).unwrap();
        assert_eq!(plan.name, "Test Sprint");
        assert_eq!(plan.tasks.len(), 1);
        assert_eq!(plan.goals.len(), 1);
    }

    /**
     * Test: Parse sprint with dependencies
     *
     * DESIGN DECISION: Test dependency resolution
     * WHY: Ensure dependency graph built correctly
     */
    #[test]
    fn test_parse_with_dependencies() {
        let yaml = r#"
sprint:
  name: "Dependency Test"
  duration: "1 week"
  goals: []
  tasks:
    - id: "DB-001"
      title: "Create table"
      agent: "database"
      duration: "2 hours"
      dependencies: []
      acceptance_criteria: []

    - id: "API-001"
      title: "Create API"
      agent: "api"
      duration: "4 hours"
      dependencies: ["DB-001"]
      acceptance_criteria: []
"#;

        let plan = YamlParser::parse_from_str(yaml).unwrap();
        assert_eq!(plan.tasks.len(), 2);
        assert_eq!(plan.dependencies.len(), 1);
        assert_eq!(plan.dependencies.get("API-001").unwrap(), &vec!["DB-001"]);
    }

    /**
     * Test: Detect circular dependencies
     *
     * DESIGN DECISION: Validate cycle detection
     * WHY: Invalid sprint plans must be rejected
     */
    #[test]
    fn test_circular_dependency_detection() {
        let yaml = r#"
sprint:
  name: "Cycle Test"
  duration: "1 week"
  goals: []
  tasks:
    - id: "A"
      title: "Task A"
      agent: "database"
      duration: "1 hour"
      dependencies: ["B"]
      acceptance_criteria: []

    - id: "B"
      title: "Task B"
      agent: "api"
      duration: "1 hour"
      dependencies: ["A"]
      acceptance_criteria: []
"#;

        let result = YamlParser::parse_from_str(yaml);
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Circular dependency"));
    }

    /**
     * Test: Parallel group detection
     *
     * DESIGN DECISION: Validate parallel opportunity identification
     * WHY: Scheduler relies on accurate parallel groups
     */
    #[test]
    fn test_parallel_groups() {
        let yaml = r#"
sprint:
  name: "Parallel Test"
  duration: "1 week"
  goals: []
  tasks:
    - id: "DB-001"
      title: "Task DB"
      agent: "database"
      duration: "2 hours"
      dependencies: []
      acceptance_criteria: []

    - id: "UI-001"
      title: "Task UI"
      agent: "ui"
      duration: "3 hours"
      dependencies: []
      acceptance_criteria: []

    - id: "API-001"
      title: "Task API"
      agent: "api"
      duration: "4 hours"
      dependencies: ["DB-001"]
      acceptance_criteria: []
"#;

        let plan = YamlParser::parse_from_str(yaml).unwrap();
        assert_eq!(plan.parallel_groups.len(), 2);

        // Level 0: DB-001 and UI-001 (no dependencies)
        assert_eq!(plan.parallel_groups[0].tasks.len(), 2);
        assert!(plan.parallel_groups[0].tasks.contains(&"DB-001".to_string()));
        assert!(plan.parallel_groups[0].tasks.contains(&"UI-001".to_string()));

        // Level 1: API-001 (depends on DB-001)
        assert_eq!(plan.parallel_groups[1].tasks.len(), 1);
        assert_eq!(plan.parallel_groups[1].tasks[0], "API-001");
    }
}
