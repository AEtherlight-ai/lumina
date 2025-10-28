/**
 * IPC Type Definitions
 *
 * DESIGN DECISION: JSON format for completion signals
 * WHY: Human-readable, easily parseable, extensible
 */

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use chrono::{DateTime, Utc};

/**
 * Task completion status
 */
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TaskStatus {
    /// Task completed successfully
    Success,
    /// Task failed with error
    Failed,
    /// Task blocked waiting for dependencies or human input
    Blocked,
}

/**
 * Completion signal written by agents
 *
 * DESIGN DECISION: Rich metadata in completion signal
 * WHY: Project Manager needs full context to update graph and spawn next tasks
 *
 * REASONING CHAIN:
 * 1. Agent completes task
 * 2. Writes signal with: status, files changed, design decisions
 * 3. Project Manager reads signal
 * 4. Updates dependency graph (mark task complete)
 * 5. Spawns next tasks (dependencies satisfied)
 * 6. Result: Automatic workflow progression
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionSignal {
    /// Task ID that completed
    pub task_id: String,
    
    /// Agent type that executed task
    pub agent_type: String,
    
    /// Task completion status
    pub status: TaskStatus,
    
    /// Files that were created or modified
    pub files_changed: Vec<PathBuf>,
    
    /// Design decisions made during implementation
    pub design_decisions: Vec<String>,
    
    /// Next tasks that should be triggered (optional)
    pub next_stages: Vec<String>,
    
    /// Completion timestamp (ISO 8601)
    #[serde(with = "chrono::serde::ts_milliseconds")]
    pub timestamp: DateTime<Utc>,
    
    /// Error message if status == Failed
    pub error: Option<String>,
}

impl CompletionSignal {
    /// Create success signal
    pub fn success(
        task_id: impl Into<String>,
        agent_type: impl Into<String>,
        files_changed: Vec<PathBuf>,
        design_decisions: Vec<String>,
    ) -> Self {
        Self {
            task_id: task_id.into(),
            agent_type: agent_type.into(),
            status: TaskStatus::Success,
            files_changed,
            design_decisions,
            next_stages: Vec::new(),
            timestamp: Utc::now(),
            error: None,
        }
    }

    /// Create failed signal
    pub fn failed(
        task_id: impl Into<String>,
        agent_type: impl Into<String>,
        error: impl Into<String>,
    ) -> Self {
        Self {
            task_id: task_id.into(),
            agent_type: agent_type.into(),
            status: TaskStatus::Failed,
            files_changed: Vec::new(),
            design_decisions: Vec::new(),
            next_stages: Vec::new(),
            timestamp: Utc::now(),
            error: Some(error.into()),
        }
    }

    /// Create blocked signal
    pub fn blocked(
        task_id: impl Into<String>,
        agent_type: impl Into<String>,
        reason: impl Into<String>,
    ) -> Self {
        Self {
            task_id: task_id.into(),
            agent_type: agent_type.into(),
            status: TaskStatus::Blocked,
            files_changed: Vec::new(),
            design_decisions: Vec::new(),
            next_stages: Vec::new(),
            timestamp: Utc::now(),
            error: Some(reason.into()),
        }
    }
}
