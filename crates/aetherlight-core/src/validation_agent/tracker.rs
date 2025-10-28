/**
 * Execution Tracker - Records agent executions for meta-learning
 *
 * DESIGN DECISION: SQLite persistence for execution history
 * WHY: Need queryable history for pattern analysis and experiments
 *
 * REASONING CHAIN:
 * 1. Agents complete tasks throughout sprints
 * 2. Each execution has metrics (duration, quality, success)
 * 3. Store in SQLite for efficient querying
 * 4. Analyzer queries history to find patterns
 * 5. Experimenter uses history to validate hypotheses
 *
 * PATTERN: Pattern-SQLITE-001 (Structured Data Persistence)
 * PERFORMANCE: <100ms for insert, <500ms for complex queries
 */

use crate::validation_agent::types::{AgentExecution, AgentType, TaskType};
use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension, Result as SqliteResult};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

/// Execution tracker
///
/// DESIGN DECISION: Thread-safe SQLite connection with Arc<Mutex>
/// WHY: Multiple agents may record executions concurrently
pub struct ExecutionTracker {
    conn: Arc<Mutex<Connection>>,
    db_path: PathBuf,
}

impl ExecutionTracker {
    /// Create new tracker
    ///
    /// DESIGN DECISION: Auto-create schema if not exists
    /// WHY: Zero-configuration setup for first run
    pub fn new(db_path: impl Into<PathBuf>) -> Result<Self, String> {
        let db_path = db_path.into();

        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        }

        let conn = Connection::open(&db_path)
            .map_err(|e| format!("Failed to open database: {}", e))?;

        let tracker = Self {
            conn: Arc::new(Mutex::new(conn)),
            db_path,
        };

        tracker.init_schema()?;

        Ok(tracker)
    }

    /// Initialize database schema
    ///
    /// DESIGN DECISION: Single executions table with JSON metadata
    /// WHY: Flexible schema, easy to query common fields, JSON for extensibility
    fn init_schema(&self) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "CREATE TABLE IF NOT EXISTS executions (
                id TEXT PRIMARY KEY,
                agent_type TEXT NOT NULL,
                task_id TEXT NOT NULL,
                task_type TEXT NOT NULL,

                pattern_used TEXT NOT NULL,
                sop_used TEXT NOT NULL,
                approach_variant TEXT NOT NULL,

                success BOOLEAN NOT NULL,
                duration_secs INTEGER NOT NULL,
                tokens_used INTEGER NOT NULL,
                errors_count INTEGER NOT NULL,
                iterations_count INTEGER NOT NULL,

                tests_passing INTEGER NOT NULL,
                tests_total INTEGER NOT NULL,
                test_coverage REAL NOT NULL,
                code_quality_score REAL NOT NULL,
                security_issues INTEGER NOT NULL,
                performance_degradation BOOLEAN NOT NULL,

                human_approved BOOLEAN,
                human_feedback TEXT,

                timestamp TEXT NOT NULL,
                git_commit TEXT,
                files_modified TEXT NOT NULL,

                metadata TEXT
            )",
            [],
        )
        .map_err(|e| format!("Failed to create executions table: {}", e))?;

        // Indexes for common queries
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_agent_type ON executions(agent_type)",
            [],
        )
        .map_err(|e| format!("Failed to create agent_type index: {}", e))?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_timestamp ON executions(timestamp DESC)",
            [],
        )
        .map_err(|e| format!("Failed to create timestamp index: {}", e))?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_success ON executions(success)",
            [],
        )
        .map_err(|e| format!("Failed to create success index: {}", e))?;

        Ok(())
    }

    /// Record agent execution
    ///
    /// DESIGN DECISION: Store in SQLite immediately (not batched)
    /// WHY: Ensures data persists even if process crashes
    pub fn record(&self, execution: &AgentExecution) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();

        let files_json = serde_json::to_string(&execution.files_modified)
            .map_err(|e| format!("Failed to serialize files: {}", e))?;

        conn.execute(
            "INSERT INTO executions (
                id, agent_type, task_id, task_type,
                pattern_used, sop_used, approach_variant,
                success, duration_secs, tokens_used, errors_count, iterations_count,
                tests_passing, tests_total, test_coverage, code_quality_score, security_issues, performance_degradation,
                human_approved, human_feedback,
                timestamp, git_commit, files_modified
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23)",
            params![
                execution.id,
                format!("{:?}", execution.agent_type),
                execution.task_id,
                format!("{:?}", execution.task_type),
                execution.pattern_used,
                execution.sop_used,
                execution.approach_variant,
                execution.success,
                execution.duration_secs as i64,
                execution.tokens_used as i64,
                execution.errors_count as i64,
                execution.iterations_count as i64,
                execution.tests_passing as i64,
                execution.tests_total as i64,
                execution.test_coverage,
                execution.code_quality_score,
                execution.security_issues as i64,
                execution.performance_degradation,
                execution.human_approved,
                execution.human_feedback,
                execution.timestamp.to_rfc3339(),
                execution.git_commit,
                files_json,
            ],
        )
        .map_err(|e| format!("Failed to insert execution: {}", e))?;

        Ok(())
    }

    /// Get execution by ID
    pub fn get(&self, id: &str) -> Result<Option<AgentExecution>, String> {
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn
            .prepare(
                "SELECT id, agent_type, task_id, task_type, pattern_used, sop_used, approach_variant,
                        success, duration_secs, tokens_used, errors_count, iterations_count,
                        tests_passing, tests_total, test_coverage, code_quality_score, security_issues, performance_degradation,
                        human_approved, human_feedback, timestamp, git_commit, files_modified
                 FROM executions WHERE id = ?1",
            )
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;

        let result = stmt
            .query_row(params![id], |row| {
                Ok(self.row_to_execution(row)?)
            })
            .optional()
            .map_err(|e| format!("Failed to query execution: {}", e))?;

        Ok(result)
    }

    /// Get executions for time period
    ///
    /// DESIGN DECISION: Time-based queries for trend analysis
    /// WHY: "Last 30 days" is primary query pattern for analysis
    pub fn get_recent(&self, since: DateTime<Utc>) -> Result<Vec<AgentExecution>, String> {
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn
            .prepare(
                "SELECT id, agent_type, task_id, task_type, pattern_used, sop_used, approach_variant,
                        success, duration_secs, tokens_used, errors_count, iterations_count,
                        tests_passing, tests_total, test_coverage, code_quality_score, security_issues, performance_degradation,
                        human_approved, human_feedback, timestamp, git_commit, files_modified
                 FROM executions WHERE timestamp >= ?1 ORDER BY timestamp DESC",
            )
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;

        let rows = stmt
            .query_map(params![since.to_rfc3339()], |row| {
                Ok(self.row_to_execution(row)?)
            })
            .map_err(|e| format!("Failed to query executions: {}", e))?;

        let mut executions = Vec::new();
        for row in rows {
            executions.push(row.map_err(|e| format!("Failed to parse row: {}", e))?);
        }

        Ok(executions)
    }

    /// Get executions by agent type
    pub fn get_by_agent(&self, agent_type: AgentType) -> Result<Vec<AgentExecution>, String> {
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn
            .prepare(
                "SELECT id, agent_type, task_id, task_type, pattern_used, sop_used, approach_variant,
                        success, duration_secs, tokens_used, errors_count, iterations_count,
                        tests_passing, tests_total, test_coverage, code_quality_score, security_issues, performance_degradation,
                        human_approved, human_feedback, timestamp, git_commit, files_modified
                 FROM executions WHERE agent_type = ?1 ORDER BY timestamp DESC",
            )
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;

        let agent_type_str = format!("{:?}", agent_type);
        let rows = stmt
            .query_map(params![agent_type_str], |row| {
                Ok(self.row_to_execution(row)?)
            })
            .map_err(|e| format!("Failed to query executions: {}", e))?;

        let mut executions = Vec::new();
        for row in rows {
            executions.push(row.map_err(|e| format!("Failed to parse row: {}", e))?);
        }

        Ok(executions)
    }

    /// Get execution statistics
    pub fn get_statistics(&self) -> Result<ExecutionStatistics, String> {
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn
            .prepare(
                "SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
                    AVG(duration_secs) as avg_duration,
                    AVG(tokens_used) as avg_tokens,
                    AVG(test_coverage) as avg_coverage
                 FROM executions",
            )
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;

        let stats = stmt
            .query_row([], |row| {
                Ok(ExecutionStatistics {
                    total_executions: row.get(0)?,
                    successful_executions: row.get(1)?,
                    avg_duration_secs: row.get(2)?,
                    avg_tokens_used: row.get(3)?,
                    avg_test_coverage: row.get(4)?,
                })
            })
            .map_err(|e| format!("Failed to query statistics: {}", e))?;

        Ok(stats)
    }

    /// Helper to convert SQLite row to AgentExecution
    fn row_to_execution(&self, row: &rusqlite::Row) -> SqliteResult<AgentExecution> {
        let agent_type_str: String = row.get(1)?;
        let task_type_str: String = row.get(3)?;
        let files_json: String = row.get(22)?;

        let agent_type = match agent_type_str.as_str() {
            "Implementation" => AgentType::Implementation,
            "Test" => AgentType::Test,
            "Review" => AgentType::Review,
            "Documentation" => AgentType::Documentation,
            "Database" => AgentType::Database,
            "UI" => AgentType::UI,
            "API" => AgentType::API,
            "Infrastructure" => AgentType::Infrastructure,
            "ProjectManager" => AgentType::ProjectManager,
            "Validation" => AgentType::Validation,
            _ => AgentType::Implementation, // Default fallback
        };

        let task_type = match task_type_str.as_str() {
            "Feature" => TaskType::Feature,
            "BugFix" => TaskType::BugFix,
            "Refactor" => TaskType::Refactor,
            "Documentation" => TaskType::Documentation,
            "Performance" => TaskType::Performance,
            "Security" => TaskType::Security,
            "Testing" => TaskType::Testing,
            _ => TaskType::Feature,
        };

        let files_modified: Vec<String> = serde_json::from_str(&files_json).unwrap_or_default();

        let timestamp_str: String = row.get(20)?;
        let timestamp = DateTime::parse_from_rfc3339(&timestamp_str)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or_else(|_| Utc::now());

        Ok(AgentExecution {
            id: row.get(0)?,
            agent_type,
            task_id: row.get(2)?,
            task_type,
            pattern_used: row.get(4)?,
            sop_used: row.get(5)?,
            approach_variant: row.get(6)?,
            success: row.get(7)?,
            duration_secs: row.get::<_, i64>(8)? as u64,
            tokens_used: row.get::<_, i64>(9)? as usize,
            errors_count: row.get::<_, i64>(10)? as usize,
            iterations_count: row.get::<_, i64>(11)? as usize,
            tests_passing: row.get::<_, i64>(12)? as usize,
            tests_total: row.get::<_, i64>(13)? as usize,
            test_coverage: row.get(14)?,
            code_quality_score: row.get(15)?,
            security_issues: row.get::<_, i64>(16)? as usize,
            performance_degradation: row.get(17)?,
            human_approved: row.get(18)?,
            human_feedback: row.get(19)?,
            timestamp,
            git_commit: row.get(21)?,
            files_modified,
        })
    }
}

/// Execution statistics
#[derive(Debug, Clone)]
pub struct ExecutionStatistics {
    pub total_executions: usize,
    pub successful_executions: usize,
    pub avg_duration_secs: f64,
    pub avg_tokens_used: f64,
    pub avg_test_coverage: f64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;
    use chrono::Duration;

    fn create_test_execution() -> AgentExecution {
        AgentExecution {
            id: "test-exec-001".to_string(),
            agent_type: AgentType::Implementation,
            task_id: "P4-001".to_string(),
            task_type: TaskType::Feature,
            pattern_used: "Pattern-TDD-001".to_string(),
            sop_used: "SOP-001".to_string(),
            approach_variant: "A".to_string(),
            success: true,
            duration_secs: 3600,
            tokens_used: 5000,
            errors_count: 2,
            iterations_count: 3,
            tests_passing: 12,
            tests_total: 12,
            test_coverage: 0.89,
            code_quality_score: 8.5,
            security_issues: 0,
            performance_degradation: false,
            human_approved: Some(true),
            human_feedback: Some("Good work".to_string()),
            timestamp: Utc::now(),
            git_commit: Some("abc123".to_string()),
            files_modified: vec!["src/main.rs".to_string()],
        }
    }

    #[test]
    fn test_tracker_creation() {
        let temp_file = NamedTempFile::new().unwrap();
        let tracker = ExecutionTracker::new(temp_file.path()).unwrap();
        assert!(tracker.db_path.exists());
    }

    #[test]
    fn test_record_and_retrieve() {
        let temp_file = NamedTempFile::new().unwrap();
        let tracker = ExecutionTracker::new(temp_file.path()).unwrap();

        let execution = create_test_execution();
        tracker.record(&execution).unwrap();

        let retrieved = tracker.get(&execution.id).unwrap();
        assert!(retrieved.is_some());

        let retrieved = retrieved.unwrap();
        assert_eq!(retrieved.id, execution.id);
        assert_eq!(retrieved.agent_type, execution.agent_type);
        assert_eq!(retrieved.task_id, execution.task_id);
        assert_eq!(retrieved.success, execution.success);
    }

    #[test]
    fn test_get_recent() {
        let temp_file = NamedTempFile::new().unwrap();
        let tracker = ExecutionTracker::new(temp_file.path()).unwrap();

        let execution = create_test_execution();
        tracker.record(&execution).unwrap();

        let since = Utc::now() - Duration::hours(1);
        let recent = tracker.get_recent(since).unwrap();

        assert_eq!(recent.len(), 1);
        assert_eq!(recent[0].id, execution.id);
    }

    #[test]
    fn test_statistics() {
        let temp_file = NamedTempFile::new().unwrap();
        let tracker = ExecutionTracker::new(temp_file.path()).unwrap();

        let execution = create_test_execution();
        tracker.record(&execution).unwrap();

        let stats = tracker.get_statistics().unwrap();
        assert_eq!(stats.total_executions, 1);
        assert_eq!(stats.successful_executions, 1);
        assert!(stats.avg_test_coverage > 0.0);
    }
}
