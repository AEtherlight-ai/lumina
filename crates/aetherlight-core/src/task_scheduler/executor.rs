/**
 * Execution State Management
 *
 * DESIGN DECISION: Track task lifecycle states (pending, running, completed, failed)
 * WHY: Enable monitoring, error recovery, and progress reporting
 *
 * REASONING CHAIN:
 * 1. Tasks transition: Pending → Running → Completed/Failed
 * 2. Scheduler needs to know: What's running? What's done? What failed?
 * 3. ExecutionState maintains this information in real-time
 * 4. Enables: Progress UI, error recovery, metrics collection
 * 5. Result: Transparent sprint execution with full visibility
 *
 * PATTERN: Pattern-EXECUTOR-001 (State Machine for Task Lifecycle)
 * PERFORMANCE: O(1) state lookups, O(1) state updates
 */

use crate::error::{Error, Result};
use crate::sprint_parser::types::{TaskId, AgentType, Task};
use std::collections::{HashMap, HashSet};
use std::time::{Duration, Instant};

/**
 * Task execution status
 *
 * DESIGN DECISION: Enum representing task lifecycle
 * WHY: Type-safe state transitions, prevents invalid states
 *
 * REASONING CHAIN:
 * 1. Pending: Task exists but dependencies not satisfied
 * 2. Ready: Dependencies satisfied, waiting for agent assignment
 * 3. Running: Assigned to agent, execution in progress
 * 4. Completed: Execution successful, dependents can proceed
 * 5. Failed: Execution failed, blocks dependents
 * 6. Result: Clear state machine with explicit transitions
 */
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TaskStatus {
    /// Task waiting for dependencies
    Pending,
    /// Dependencies satisfied, ready to execute
    Ready,
    /// Currently executing
    Running { agent: AgentType, started_at: Instant },
    /// Execution completed successfully
    Completed { duration: Duration },
    /// Execution failed
    Failed { error: String },
}

/**
 * Agent assignment tracking
 *
 * DESIGN DECISION: Track which agent is executing which task
 * WHY: Enable agent capacity management and task routing
 *
 * REASONING CHAIN:
 * 1. Multiple agents can run concurrently (DB, UI, API)
 * 2. Each agent can only execute one task at a time
 * 3. Scheduler needs to know: Is this agent available?
 * 4. AgentAssignment maintains agent → task mapping
 * 5. Result: Efficient agent utilization, no double-assignment
 */
#[derive(Debug, Clone)]
pub struct AgentAssignment {
    /// Agent type (Database, UI, API, etc.)
    pub agent_type: AgentType,
    /// Currently executing task (None if idle)
    pub current_task: Option<TaskId>,
    /// When agent started current task
    pub started_at: Option<Instant>,
}

impl AgentAssignment {
    pub fn new(agent_type: AgentType) -> Self {
        Self {
            agent_type,
            current_task: None,
            started_at: None,
        }
    }

    pub fn is_idle(&self) -> bool {
        self.current_task.is_none()
    }

    pub fn assign(&mut self, task_id: TaskId) {
        self.current_task = Some(task_id);
        self.started_at = Some(Instant::now());
    }

    pub fn complete(&mut self) {
        self.current_task = None;
        self.started_at = None;
    }
}

/**
 * Execution state for entire sprint
 *
 * DESIGN DECISION: Centralized state tracking for all tasks and agents
 * WHY: Single source of truth for sprint execution progress
 *
 * REASONING CHAIN:
 * 1. Scheduler needs to answer: What tasks are ready? What's running? What's done?
 * 2. ExecutionState maintains task statuses and agent assignments
 * 3. Provides queries: ready_tasks(), running_tasks(), completed_tasks()
 * 4. Updates state on: task_start(), task_complete(), task_fail()
 * 5. Result: O(1) queries, consistent state, easy monitoring
 *
 * PERFORMANCE:
 * - State queries: O(1) for counts, O(n) for lists (where n = task count)
 * - State updates: O(1) per task
 * - Memory: O(tasks + agents) - one entry per task, one per agent
 */
#[derive(Debug)]
pub struct ExecutionState {
    /// Task ID → Status mapping
    tasks: HashMap<TaskId, TaskStatus>,
    /// Agent type → Assignment mapping
    agents: HashMap<AgentType, AgentAssignment>,
    /// Set of completed task IDs (for fast lookup)
    completed: HashSet<TaskId>,
    /// Set of failed task IDs
    failed: HashSet<TaskId>,
    /// Sprint start time
    started_at: Option<Instant>,
}

impl ExecutionState {
    /**
     * Create new execution state
     *
     * DESIGN DECISION: Initialize from sprint plan tasks
     * WHY: Ensures all tasks tracked from start
     */
    pub fn new(tasks: &HashMap<TaskId, Task>) -> Self {
        let mut task_statuses = HashMap::new();
        for task_id in tasks.keys() {
            task_statuses.insert(task_id.clone(), TaskStatus::Pending);
        }

        // Initialize agent assignments
        let mut agents = HashMap::new();
        for agent_type in &[
            AgentType::Database,
            AgentType::Ui,
            AgentType::Api,
            AgentType::Infrastructure,
            AgentType::Test,
            AgentType::Docs,
            AgentType::Review,
            AgentType::Commit,
        ] {
            agents.insert(agent_type.clone(), AgentAssignment::new(agent_type.clone()));
        }

        Self {
            tasks: task_statuses,
            agents,
            completed: HashSet::new(),
            failed: HashSet::new(),
            started_at: None,
        }
    }

    /**
     * Start sprint execution (record start time)
     */
    pub fn start_sprint(&mut self) {
        self.started_at = Some(Instant::now());
    }

    /**
     * Get sprint duration so far
     */
    pub fn elapsed(&self) -> Option<Duration> {
        self.started_at.map(|start| start.elapsed())
    }

    /**
     * Mark task as ready (dependencies satisfied)
     */
    pub fn mark_ready(&mut self, task_id: &TaskId) -> Result<()> {
        let status = self.tasks.get_mut(task_id)
            .ok_or_else(|| Error::Configuration(format!("Task not found: {}", task_id)))?;

        match status {
            TaskStatus::Pending => {
                *status = TaskStatus::Ready;
                Ok(())
            }
            _ => Err(Error::Configuration(format!(
                "Task {} cannot transition to Ready from {:?}",
                task_id, status
            ))),
        }
    }

    /**
     * Start task execution (assign to agent)
     */
    pub fn start_task(&mut self, task_id: &TaskId, agent_type: AgentType) -> Result<()> {
        // Update task status
        let status = self.tasks.get_mut(task_id)
            .ok_or_else(|| Error::Configuration(format!("Task not found: {}", task_id)))?;

        match status {
            TaskStatus::Ready | TaskStatus::Pending => {
                *status = TaskStatus::Running {
                    agent: agent_type.clone(),
                    started_at: Instant::now(),
                };
            }
            _ => {
                return Err(Error::Configuration(format!(
                    "Task {} cannot start from status {:?}",
                    task_id, status
                )));
            }
        }

        // Assign to agent
        let agent = self.agents.get_mut(&agent_type)
            .ok_or_else(|| Error::Configuration(format!("Agent not found: {:?}", agent_type)))?;

        if !agent.is_idle() {
            return Err(Error::Configuration(format!(
                "Agent {:?} is already executing task {:?}",
                agent_type, agent.current_task
            )));
        }

        agent.assign(task_id.clone());
        Ok(())
    }

    /**
     * Complete task execution successfully
     */
    pub fn complete_task(&mut self, task_id: &TaskId) -> Result<Duration> {
        // Update task status
        let status = self.tasks.get_mut(task_id)
            .ok_or_else(|| Error::Configuration(format!("Task not found: {}", task_id)))?;

        let (agent_type, duration) = match status {
            TaskStatus::Running { agent, started_at } => {
                let duration = started_at.elapsed();
                let agent_type = agent.clone();
                *status = TaskStatus::Completed { duration };
                (agent_type, duration)
            }
            _ => {
                return Err(Error::Configuration(format!(
                    "Task {} cannot complete from status {:?}",
                    task_id, status
                )));
            }
        };

        // Release agent
        if let Some(agent) = self.agents.get_mut(&agent_type) {
            agent.complete();
        }

        // Add to completed set
        self.completed.insert(task_id.clone());

        Ok(duration)
    }

    /**
     * Mark task as failed
     */
    pub fn fail_task(&mut self, task_id: &TaskId, error: String) -> Result<()> {
        // Update task status
        let status = self.tasks.get_mut(task_id)
            .ok_or_else(|| Error::Configuration(format!("Task not found: {}", task_id)))?;

        let agent_type = match status {
            TaskStatus::Running { agent, .. } => {
                let agent_type = agent.clone();
                *status = TaskStatus::Failed { error };
                agent_type
            }
            _ => {
                return Err(Error::Configuration(format!(
                    "Task {} cannot fail from status {:?}",
                    task_id, status
                )));
            }
        };

        // Release agent
        if let Some(agent) = self.agents.get_mut(&agent_type) {
            agent.complete();
        }

        // Add to failed set
        self.failed.insert(task_id.clone());

        Ok(())
    }

    /**
     * Get task status
     */
    pub fn get_status(&self, task_id: &TaskId) -> Option<&TaskStatus> {
        self.tasks.get(task_id)
    }

    /**
     * Check if task is completed
     */
    pub fn is_completed(&self, task_id: &TaskId) -> bool {
        self.completed.contains(task_id)
    }

    /**
     * Check if task has failed
     */
    pub fn is_failed(&self, task_id: &TaskId) -> bool {
        self.failed.contains(task_id)
    }

    /**
     * Get list of running tasks
     */
    pub fn running_tasks(&self) -> Vec<TaskId> {
        self.tasks
            .iter()
            .filter_map(|(id, status)| match status {
                TaskStatus::Running { .. } => Some(id.clone()),
                _ => None,
            })
            .collect()
    }

    /**
     * Get list of completed tasks
     */
    pub fn completed_tasks(&self) -> &HashSet<TaskId> {
        &self.completed
    }

    /**
     * Get list of failed tasks
     */
    pub fn failed_tasks(&self) -> &HashSet<TaskId> {
        &self.failed
    }

    /**
     * Find available agent of given type
     */
    pub fn find_idle_agent(&self, agent_type: &AgentType) -> Option<&AgentAssignment> {
        self.agents.get(agent_type).filter(|a| a.is_idle())
    }

    /**
     * Check if all tasks complete (success or failure)
     */
    pub fn is_complete(&self) -> bool {
        self.tasks.iter().all(|(_, status)| {
            matches!(status, TaskStatus::Completed { .. } | TaskStatus::Failed { .. })
        })
    }

    /**
     * Get completion statistics
     */
    pub fn statistics(&self) -> ExecutionStatistics {
        let mut stats = ExecutionStatistics {
            total_tasks: self.tasks.len(),
            completed: self.completed.len(),
            failed: self.failed.len(),
            running: 0,
            pending: 0,
            total_duration: Duration::ZERO,
        };

        for status in self.tasks.values() {
            match status {
                TaskStatus::Running { .. } => stats.running += 1,
                TaskStatus::Pending | TaskStatus::Ready => stats.pending += 1,
                TaskStatus::Completed { duration } => {
                    stats.total_duration += *duration;
                }
                TaskStatus::Failed { .. } => {}
            }
        }

        stats
    }
}

/**
 * Execution statistics
 */
#[derive(Debug, Clone)]
pub struct ExecutionStatistics {
    pub total_tasks: usize,
    pub completed: usize,
    pub failed: usize,
    pub running: usize,
    pub pending: usize,
    pub total_duration: Duration,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_tasks() -> HashMap<TaskId, Task> {
        let mut tasks = HashMap::new();
        tasks.insert(
            "DB-001".to_string(),
            Task {
                id: "DB-001".to_string(),
                title: "Create schema".to_string(),
                agent: AgentType::Database,
                duration: "2h".to_string(),
                dependencies: vec![],
                acceptance_criteria: vec![],
                files: vec![],
                patterns: vec![],
            },
        );
        tasks
    }

    #[test]
    fn test_state_initialization() {
        let tasks = create_test_tasks();
        let state = ExecutionState::new(&tasks);

        assert_eq!(state.tasks.len(), 1);
        assert!(!state.is_complete());
    }

    #[test]
    fn test_task_lifecycle() {
        let tasks = create_test_tasks();
        let mut state = ExecutionState::new(&tasks);
        let task_id = "DB-001".to_string();

        // Mark ready
        state.mark_ready(&task_id).unwrap();
        assert!(matches!(
            state.get_status(&task_id),
            Some(TaskStatus::Ready)
        ));

        // Start task
        state.start_task(&task_id, AgentType::Database).unwrap();
        assert!(matches!(
            state.get_status(&task_id),
            Some(TaskStatus::Running { .. })
        ));
        assert_eq!(state.running_tasks().len(), 1);

        // Complete task
        let duration = state.complete_task(&task_id).unwrap();
        assert!(duration > Duration::ZERO);
        assert!(state.is_completed(&task_id));
        assert_eq!(state.running_tasks().len(), 0);
    }

    #[test]
    fn test_agent_assignment() {
        let tasks = create_test_tasks();
        let mut state = ExecutionState::new(&tasks);
        let task_id = "DB-001".to_string();

        // Agent initially idle
        assert!(state.find_idle_agent(&AgentType::Database).is_some());

        // Start task
        state.mark_ready(&task_id).unwrap();
        state.start_task(&task_id, AgentType::Database).unwrap();

        // Agent now busy
        assert!(state.find_idle_agent(&AgentType::Database).is_none());

        // Complete task
        state.complete_task(&task_id).unwrap();

        // Agent idle again
        assert!(state.find_idle_agent(&AgentType::Database).is_some());
    }
}
