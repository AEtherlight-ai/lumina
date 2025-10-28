/**
 * DESIGN DECISION: Structured session handoff types for zero-loss context transfer
 * WHY: Natural language summaries lose critical details; structured data preserves everything
 *
 * REASONING CHAIN:
 * 1. Natural language summaries like "we discussed embeddings" lose precision
 * 2. Next session needs EXACT decisions, reasoning, file changes
 * 3. Structured types capture: decisions (with alternatives), files (with line numbers), patterns (with IDs)
 * 4. Machine-readable JSON enables precise context recovery
 * 5. Agent loads handoff → has COMPLETE context, zero information loss
 *
 * PATTERN: Pattern-HANDOFF-001 (Structured Session Transfer)
 * PERFORMANCE: Serialization/deserialization <100ms
 * RELATED: AI-003 (agent integration), AI-009 (agent context architecture)
 */

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Session handoff data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionHandoff {
    /// Unique session identifier
    pub session_id: String,

    /// Session start time
    pub start_time: DateTime<Utc>,

    /// Session end time
    pub end_time: DateTime<Utc>,

    /// Duration in seconds
    pub duration_secs: u64,

    // ===== What was accomplished =====
    /// Tasks completed during session
    pub tasks_completed: Vec<Task>,

    /// Files modified with changes
    pub files_modified: Vec<FileChange>,

    /// Patterns applied
    pub patterns_applied: Vec<PatternReference>,

    /// Decisions made with reasoning
    pub decisions_made: Vec<Decision>,

    // ===== Current state =====
    /// Work in progress (not yet completed)
    pub work_in_progress: Vec<Task>,

    /// Blockers encountered
    pub blockers: Vec<Blocker>,

    /// Open questions needing answers
    pub open_questions: Vec<Question>,

    // ===== Next session =====
    /// Recommended next steps
    pub next_steps: Vec<String>,

    /// Context files to load in next session
    pub context_to_load: Vec<ContextReference>,

    // ===== Knowledge gained =====
    /// Learnings and insights
    pub learnings: Vec<Learning>,

    /// Patterns extracted (new patterns identified)
    pub patterns_extracted: Vec<PatternExtraction>,

    // ===== Metadata =====
    /// Total token count used
    pub tokens_used: Option<usize>,

    /// Number of tool calls made
    pub tool_calls: Option<usize>,

    /// Verification results
    pub verifications: Vec<VerificationRecord>,
}

/// Task information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    /// Task ID (e.g., "P3.5-002", "AI-004")
    pub id: String,

    /// Task title
    pub title: String,

    /// Task status
    pub status: TaskStatus,

    /// Files modified for this task
    pub files_modified: Vec<PathBuf>,

    /// Patterns applied
    pub patterns_applied: Vec<String>,

    /// Start time
    pub start_time: Option<DateTime<Utc>>,

    /// End time (if completed)
    pub end_time: Option<DateTime<Utc>>,

    /// Duration in seconds
    pub duration_secs: Option<u64>,
}

/// Task status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum TaskStatus {
    #[serde(rename = "not-started")]
    NotStarted,
    #[serde(rename = "in-progress")]
    InProgress,
    #[serde(rename = "blocked")]
    Blocked,
    #[serde(rename = "complete")]
    Complete,
}

/// File change record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileChange {
    /// File path
    pub path: PathBuf,

    /// Change type
    pub change_type: ChangeType,

    /// Lines added
    pub lines_added: usize,

    /// Lines removed
    pub lines_removed: usize,

    /// Line numbers affected (for precise reference)
    pub line_numbers: Option<Vec<usize>>,

    /// Brief description of changes
    pub description: String,
}

/// Type of file change
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ChangeType {
    #[serde(rename = "created")]
    Created,
    #[serde(rename = "modified")]
    Modified,
    #[serde(rename = "deleted")]
    Deleted,
}

/// Pattern reference
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternReference {
    /// Pattern ID (e.g., "Pattern-DOMAIN-001")
    pub id: String,

    /// Pattern name
    pub name: String,

    /// Where applied (file:line)
    pub applied_at: String,

    /// Why this pattern was chosen
    pub rationale: String,
}

/// Decision made during session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Decision {
    /// The decision made
    pub decision: String,

    /// Reasoning behind the decision
    pub reasoning: String,

    /// Alternatives considered
    pub alternatives: Vec<String>,

    /// When decision was made
    pub timestamp: DateTime<Utc>,

    /// Related files/code
    pub related_files: Vec<PathBuf>,

    /// Confidence level (0.0-1.0)
    pub confidence: Option<f64>,
}

/// Blocker encountered
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Blocker {
    /// Description of blocker
    pub description: String,

    /// Severity
    pub severity: BlockerSeverity,

    /// When encountered
    pub encountered_at: DateTime<Utc>,

    /// Potential solutions
    pub potential_solutions: Vec<String>,

    /// Files affected
    pub affected_files: Vec<PathBuf>,
}

/// Blocker severity
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum BlockerSeverity {
    #[serde(rename = "low")]
    Low,
    #[serde(rename = "medium")]
    Medium,
    #[serde(rename = "high")]
    High,
    #[serde(rename = "critical")]
    Critical,
}

/// Open question
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Question {
    /// The question
    pub question: String,

    /// Context around the question
    pub context: String,

    /// Why this matters
    pub importance: String,

    /// Possible answers considered
    pub possible_answers: Vec<String>,
}

/// Context reference for next session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextReference {
    /// File path to load
    pub path: PathBuf,

    /// Specific sections to focus on
    pub sections: Vec<String>,

    /// Why this context is needed
    pub reason: String,
}

/// Learning or insight gained
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Learning {
    /// The learning
    pub learning: String,

    /// How discovered
    pub discovered_through: String,

    /// Related code/files
    pub related_to: Vec<PathBuf>,

    /// Impact (how this changes understanding)
    pub impact: String,
}

/// Pattern extraction (new pattern identified)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternExtraction {
    /// Pattern ID (to be assigned)
    pub id: Option<String>,

    /// Pattern name
    pub name: String,

    /// Pattern description
    pub description: String,

    /// Problem solved
    pub problem: String,

    /// Solution approach
    pub solution: String,

    /// Where found
    pub found_in: Vec<PathBuf>,

    /// Reusability score (0.0-1.0)
    pub reusability: f64,
}

/// Verification record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerificationRecord {
    /// Claim that was verified
    pub claim: String,

    /// Verification result
    pub verified: bool,

    /// Actual value (if different from claim)
    pub actual_value: Option<String>,

    /// Verification duration in milliseconds
    pub duration_ms: u64,

    /// When verified
    pub timestamp: DateTime<Utc>,
}

impl SessionHandoff {
    /// Create a new session handoff
    pub fn new(session_id: String) -> Self {
        let now = Utc::now();
        Self {
            session_id,
            start_time: now,
            end_time: now,
            duration_secs: 0,
            tasks_completed: Vec::new(),
            files_modified: Vec::new(),
            patterns_applied: Vec::new(),
            decisions_made: Vec::new(),
            work_in_progress: Vec::new(),
            blockers: Vec::new(),
            open_questions: Vec::new(),
            next_steps: Vec::new(),
            context_to_load: Vec::new(),
            learnings: Vec::new(),
            patterns_extracted: Vec::new(),
            tokens_used: None,
            tool_calls: None,
            verifications: Vec::new(),
        }
    }

    /// Finalize session with end time
    pub fn finalize(&mut self) {
        self.end_time = Utc::now();
        self.duration_secs = (self.end_time - self.start_time).num_seconds() as u64;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_session_handoff_creation() {
        let handoff = SessionHandoff::new("2025-10-12-session-001".to_string());
        assert_eq!(handoff.session_id, "2025-10-12-session-001");
        assert_eq!(handoff.tasks_completed.len(), 0);
        assert_eq!(handoff.duration_secs, 0);
    }

    #[test]
    fn test_session_handoff_finalize() {
        let mut handoff = SessionHandoff::new("test-session".to_string());
        std::thread::sleep(std::time::Duration::from_millis(100));
        handoff.finalize();
        assert!(handoff.duration_secs > 0);
        assert!(handoff.end_time > handoff.start_time);
    }

    #[test]
    fn test_task_status_serialization() {
        let task = Task {
            id: "AI-004".to_string(),
            title: "Session Handoff".to_string(),
            status: TaskStatus::InProgress,
            files_modified: vec![],
            patterns_applied: vec![],
            start_time: None,
            end_time: None,
            duration_secs: None,
        };

        let json = serde_json::to_string(&task).unwrap();
        assert!(json.contains("in-progress"));

        let deserialized: Task = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.status, TaskStatus::InProgress);
    }

    #[test]
    fn test_decision_structure() {
        let decision = Decision {
            decision: "Use JSON for storage".to_string(),
            reasoning: "Human-readable, git-friendly".to_string(),
            alternatives: vec!["SQLite".to_string(), "YAML".to_string()],
            timestamp: Utc::now(),
            related_files: vec![PathBuf::from("src/storage.rs")],
            confidence: Some(0.85),
        };

        assert_eq!(decision.alternatives.len(), 2);
        assert!(decision.confidence.is_some());
    }
}
