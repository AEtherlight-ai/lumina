/**
 * Dependency Graph for Sprint Execution
 *
 * DESIGN DECISION: Explicit dependency graph separate from ExecutableSprintPlan
 * WHY: Graph operations (mark_complete, ready_tasks) need mutable state tracking
 *
 * REASONING CHAIN:
 * 1. ExecutableSprintPlan: Immutable sprint definition (what to execute)
 * 2. DependencyGraph: Mutable execution state (what's running, what's done)
 * 3. Scheduler creates graph from plan, updates as tasks complete
 * 4. Graph tracks in-degree (dependencies remaining) for each task
 * 5. ready_tasks() returns tasks with in-degree 0 (all deps satisfied)
 * 6. Result: Clean separation of definition (plan) vs execution (graph)
 *
 * PATTERN: Pattern-DEPENDENCY-GRAPH-001 (Stateful Execution Tracking)
 * RELATED: AS-003 (Task Scheduler uses this for execution)
 * PERFORMANCE: O(V+E) construction, O(1) mark_complete, O(V) ready_tasks
 */

use crate::error::{Error, Result};
use crate::sprint_parser::types::{ExecutableSprintPlan, TaskId};
use std::collections::{HashMap, HashSet, VecDeque};

/**
 * Task node in dependency graph
 *
 * DESIGN DECISION: Track in-degree and dependents for efficient updates
 * WHY: When task completes, need to update all dependents' in-degrees
 *
 * REASONING CHAIN:
 * 1. in_degree: Number of incomplete dependencies
 * 2. dependents: Tasks waiting for this task
 * 3. When task completes: Decrement in_degree of all dependents
 * 4. If dependent's in_degree becomes 0: Add to ready queue
 * 5. Result: O(1) updates per task completion
 *
 * PERFORMANCE: O(1) space per task, O(dependents) update time
 */
#[derive(Debug, Clone)]
pub struct TaskNode {
    /// Task ID
    pub id: TaskId,
    /// Number of incomplete dependencies
    pub in_degree: usize,
    /// Tasks that depend on this task
    pub dependents: Vec<TaskId>,
    /// Whether task has completed
    pub completed: bool,
}

/**
 * Dependency graph (DAG) for sprint execution
 *
 * DESIGN DECISION: Mutable graph with state tracking
 * WHY: Scheduler needs to track execution progress and find ready tasks
 *
 * REASONING CHAIN:
 * 1. Build graph from ExecutableSprintPlan
 * 2. Track completed tasks as execution progresses
 * 3. Update in-degrees when tasks complete
 * 4. Return ready tasks (in-degree 0) to scheduler
 * 5. Result: Scheduler focuses on assignment, graph tracks dependencies
 *
 * PATTERN: Pattern-DEPENDENCY-GRAPH-001
 * PERFORMANCE: O(V+E) build, O(1) mark_complete, O(V) ready_tasks
 */
#[derive(Debug, Clone)]
pub struct DependencyGraph {
    /// Task nodes indexed by TaskId
    nodes: HashMap<TaskId, TaskNode>,
    /// Set of completed task IDs (for fast lookup)
    completed: HashSet<TaskId>,
}

impl DependencyGraph {
    /**
     * Build dependency graph from sprint plan
     *
     * DESIGN DECISION: Static method takes immutable plan reference
     * WHY: Plan is definition, graph is execution state (separate concerns)
     *
     * REASONING CHAIN:
     * 1. Create node for each task in plan
     * 2. Calculate in-degree (number of dependencies)
     * 3. Build dependents list (reverse dependencies)
     * 4. Initialize all tasks as incomplete
     * 5. Result: Graph ready for execution tracking
     *
     * # Examples
     *
     * ```rust
     * use aetherlight_core::sprint_parser::{parse_sprint_file, DependencyGraph};
     *
     * let plan = parse_sprint_file("sprints/my-sprint.yaml")?;
     * let mut graph = DependencyGraph::build(&plan)?;
     *
     * // Find tasks ready to start
     * let ready = graph.ready_tasks();
     * println!("Can start: {:?}", ready);
     * ```
     *
     * # Errors
     *
     * Returns error if plan contains invalid references (should not happen if validated)
     */
    pub fn build(plan: &ExecutableSprintPlan) -> Result<Self> {
        let mut nodes = HashMap::new();

        // Create nodes for all tasks
        for (task_id, _task) in &plan.tasks {
            let in_degree = plan.dependencies.get(task_id).map(|deps| deps.len()).unwrap_or(0);
            let dependents = plan.dependents.get(task_id).cloned().unwrap_or_default();

            nodes.insert(
                task_id.clone(),
                TaskNode {
                    id: task_id.clone(),
                    in_degree,
                    dependents,
                    completed: false,
                },
            );
        }

        Ok(Self {
            nodes,
            completed: HashSet::new(),
        })
    }

    /**
     * Get tasks ready to execute (all dependencies satisfied)
     *
     * DESIGN DECISION: Return Vec of TaskIds, not references
     * WHY: Scheduler needs owned TaskIds to spawn agents
     *
     * REASONING CHAIN:
     * 1. Filter nodes: in_degree == 0 && !completed
     * 2. in_degree 0: All dependencies done
     * 3. !completed: Not already executed
     * 4. Return cloned TaskIds for scheduler
     * 5. Result: Scheduler can spawn agents for these tasks
     *
     * PERFORMANCE: O(V) where V = number of tasks
     */
    pub fn ready_tasks(&self) -> Vec<TaskId> {
        self.nodes
            .values()
            .filter(|node| node.in_degree == 0 && !node.completed)
            .map(|node| node.id.clone())
            .collect()
    }

    /**
     * Mark task as complete and update dependent tasks
     *
     * DESIGN DECISION: Update in-degrees of dependents immediately
     * WHY: Enables ready_tasks() to return newly-ready tasks
     *
     * REASONING CHAIN:
     * 1. Mark task as completed
     * 2. Add to completed set
     * 3. For each dependent: Decrement in_degree
     * 4. If dependent's in_degree becomes 0: Now ready to execute
     * 5. Result: Scheduler can immediately find next tasks
     *
     * # Examples
     *
     * ```rust
     * // Task DB-001 completes
     * graph.mark_complete("DB-001".to_string());
     *
     * // Now API-001 (which depends on DB-001) might be ready
     * let ready = graph.ready_tasks();
     * assert!(ready.contains(&"API-001".to_string()));
     * ```
     *
     * # Errors
     *
     * Returns error if task_id not found in graph
     */
    pub fn mark_complete(&mut self, task_id: TaskId) -> Result<()> {
        // Get node (error if not found)
        let node = self
            .nodes
            .get_mut(&task_id)
            .ok_or_else(|| Error::Configuration(format!("Task not found in graph: {}", task_id)))?;

        // Mark as completed
        node.completed = true;
        self.completed.insert(task_id.clone());

        // Update dependents' in-degrees
        let dependents = node.dependents.clone(); // Clone to avoid borrow checker issues
        for dependent_id in dependents {
            if let Some(dependent_node) = self.nodes.get_mut(&dependent_id) {
                if dependent_node.in_degree > 0 {
                    dependent_node.in_degree -= 1;
                }
            }
        }

        Ok(())
    }

    /**
     * Check if all tasks complete
     *
     * DESIGN DECISION: Compare completed set size to nodes size
     * WHY: O(1) check vs O(V) iteration
     */
    pub fn is_complete(&self) -> bool {
        self.completed.len() == self.nodes.len()
    }

    /**
     * Get task node by ID
     */
    pub fn get_node(&self, task_id: &TaskId) -> Option<&TaskNode> {
        self.nodes.get(task_id)
    }

    /**
     * Get set of completed task IDs
     */
    pub fn completed_tasks(&self) -> &HashSet<TaskId> {
        &self.completed
    }

    /**
     * Get total number of tasks
     */
    pub fn task_count(&self) -> usize {
        self.nodes.len()
    }

    /**
     * Get number of completed tasks
     */
    pub fn completed_count(&self) -> usize {
        self.completed.len()
    }

    /**
     * Export to Graphviz DOT format for visualization
     *
     * DESIGN DECISION: Export DOT format for visualization tools
     * WHY: Graphviz renders dependency graphs, useful for debugging sprints
     *
     * REASONING CHAIN:
     * 1. DOT format: Standard graph description language
     * 2. Graphviz tools render DOT → SVG/PNG
     * 3. Nodes: Tasks (colored by state: ready=green, running=yellow, done=blue)
     * 4. Edges: Dependencies (A → B means "B depends on A")
     * 5. Result: Visual sprint plan for debugging/presentation
     *
     * # Examples
     *
     * ```rust
     * let dot = graph.to_dot();
     * std::fs::write("sprint.dot", dot)?;
     * // Run: dot -Tsvg sprint.dot -o sprint.svg
     * ```
     */
    pub fn to_dot(&self) -> String {
        let mut dot = String::from("digraph SprintDependencies {\n");
        dot.push_str("  rankdir=LR;\n"); // Left-to-right layout
        dot.push_str("  node [shape=box, style=rounded];\n\n");

        // Add nodes with colors based on state
        for node in self.nodes.values() {
            let color = if node.completed {
                "lightblue"
            } else if node.in_degree == 0 {
                "lightgreen" // Ready to execute
            } else {
                "lightgray" // Waiting for dependencies
            };

            dot.push_str(&format!(
                "  \"{}\" [label=\"{}\\nin_degree: {}\" fillcolor={} style=\"rounded,filled\"];\n",
                node.id, node.id, node.in_degree, color
            ));
        }

        dot.push_str("\n");

        // Add edges (dependencies)
        for node in self.nodes.values() {
            for dependent_id in &node.dependents {
                // Edge: node → dependent (dependent depends on node)
                dot.push_str(&format!("  \"{}\" -> \"{}\";\n", node.id, dependent_id));
            }
        }

        dot.push_str("}\n");
        dot
    }

    /**
     * Perform topological sort (BFS-based Kahn's algorithm)
     *
     * DESIGN DECISION: BFS-based topological sort
     * WHY: Produces level-order traversal (useful for parallel execution planning)
     *
     * REASONING CHAIN:
     * 1. Start with nodes having in-degree 0
     * 2. Process in BFS order (queue)
     * 3. For each processed node: Decrement dependents' in-degrees
     * 4. Add newly-ready nodes to queue
     * 5. Result: Valid execution order (dependencies before dependents)
     *
     * PERFORMANCE: O(V+E) where V=tasks, E=dependencies
     *
     * # Errors
     *
     * Returns error if cycle detected (should not happen if plan validated)
     */
    pub fn topological_sort(&self) -> Result<Vec<TaskId>> {
        let mut in_degree = HashMap::new();
        for node in self.nodes.values() {
            in_degree.insert(node.id.clone(), node.in_degree);
        }

        let mut queue: VecDeque<TaskId> = self
            .nodes
            .values()
            .filter(|node| node.in_degree == 0)
            .map(|node| node.id.clone())
            .collect();

        let mut sorted = Vec::new();

        while let Some(task_id) = queue.pop_front() {
            sorted.push(task_id.clone());

            // Update dependents
            if let Some(node) = self.nodes.get(&task_id) {
                for dependent_id in &node.dependents {
                    if let Some(degree) = in_degree.get_mut(dependent_id) {
                        *degree -= 1;
                        if *degree == 0 {
                            queue.push_back(dependent_id.clone());
                        }
                    }
                }
            }
        }

        // Check for cycles
        if sorted.len() != self.nodes.len() {
            return Err(Error::Configuration(
                "Circular dependency detected in sprint plan".to_string(),
            ));
        }

        Ok(sorted)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sprint_parser::types::{AgentType, Task};

    fn create_test_plan() -> ExecutableSprintPlan {
        let mut tasks = HashMap::new();
        tasks.insert(
            "DB-001".to_string(),
            Task {
                id: "DB-001".to_string(),
                title: "Create DB".to_string(),
                agent: AgentType::Database,
                duration: "2 hours".to_string(),
                dependencies: vec![],
                acceptance_criteria: vec![],
                files: vec![],
                patterns: vec![],
            },
        );
        tasks.insert(
            "UI-001".to_string(),
            Task {
                id: "UI-001".to_string(),
                title: "Create UI".to_string(),
                agent: AgentType::Ui,
                duration: "3 hours".to_string(),
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
                title: "Create API".to_string(),
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

        let mut dependents = HashMap::new();
        dependents.insert("DB-001".to_string(), vec!["API-001".to_string()]);

        ExecutableSprintPlan {
            name: "Test Sprint".to_string(),
            duration: "1 week".to_string(),
            goals: vec![],
            tasks,
            dependencies,
            dependents,
            approval_gates: vec![],
            parallel_groups: vec![],
            execution_order: vec!["DB-001".to_string(), "UI-001".to_string(), "API-001".to_string()],
        }
    }

    #[test]
    fn test_build_graph() {
        let plan = create_test_plan();
        let graph = DependencyGraph::build(&plan).unwrap();

        assert_eq!(graph.task_count(), 3);
        assert_eq!(graph.completed_count(), 0);

        // Check in-degrees
        assert_eq!(graph.get_node(&"DB-001".to_string()).unwrap().in_degree, 0);
        assert_eq!(graph.get_node(&"UI-001".to_string()).unwrap().in_degree, 0);
        assert_eq!(graph.get_node(&"API-001".to_string()).unwrap().in_degree, 1);
    }

    #[test]
    fn test_ready_tasks() {
        let plan = create_test_plan();
        let graph = DependencyGraph::build(&plan).unwrap();

        let ready = graph.ready_tasks();
        assert_eq!(ready.len(), 2);
        assert!(ready.contains(&"DB-001".to_string()));
        assert!(ready.contains(&"UI-001".to_string()));
    }

    #[test]
    fn test_mark_complete() {
        let plan = create_test_plan();
        let mut graph = DependencyGraph::build(&plan).unwrap();

        // Initially, API-001 not ready
        let ready = graph.ready_tasks();
        assert!(!ready.contains(&"API-001".to_string()));

        // Complete DB-001
        graph.mark_complete("DB-001".to_string()).unwrap();

        // Now API-001 should be ready
        let ready = graph.ready_tasks();
        assert!(ready.contains(&"API-001".to_string()));

        // DB-001 should not be in ready (already completed)
        assert!(!ready.contains(&"DB-001".to_string()));
    }

    #[test]
    fn test_is_complete() {
        let plan = create_test_plan();
        let mut graph = DependencyGraph::build(&plan).unwrap();

        assert!(!graph.is_complete());

        graph.mark_complete("DB-001".to_string()).unwrap();
        assert!(!graph.is_complete());

        graph.mark_complete("UI-001".to_string()).unwrap();
        assert!(!graph.is_complete());

        graph.mark_complete("API-001".to_string()).unwrap();
        assert!(graph.is_complete());
    }

    #[test]
    fn test_topological_sort() {
        let plan = create_test_plan();
        let graph = DependencyGraph::build(&plan).unwrap();

        let sorted = graph.topological_sort().unwrap();
        assert_eq!(sorted.len(), 3);

        // DB-001 must come before API-001
        let db_pos = sorted.iter().position(|id| id == "DB-001").unwrap();
        let api_pos = sorted.iter().position(|id| id == "API-001").unwrap();
        assert!(db_pos < api_pos);
    }

    #[test]
    fn test_to_dot() {
        let plan = create_test_plan();
        let graph = DependencyGraph::build(&plan).unwrap();

        let dot = graph.to_dot();
        assert!(dot.contains("digraph SprintDependencies"));
        assert!(dot.contains("DB-001"));
        assert!(dot.contains("API-001"));
        assert!(dot.contains("UI-001"));
        assert!(dot.contains("->"));
    }
}
