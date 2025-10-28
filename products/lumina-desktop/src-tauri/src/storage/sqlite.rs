/**
 * SQLite Metadata - Outcomes, calibration, sync state (Storage-003)
 *
 * DESIGN DECISION: SQLite for local-first metadata (not PostgreSQL)
 * WHY: Metadata small (<1MB), needs offline access, survives PostgreSQL migration
 *
 * REASONING CHAIN:
 * 1. Pattern outcomes tracked locally (thumbs up/down, time saved)
 * 2. Confidence calibration adjustments (per-pattern learning)
 * 3. Sync state tracking (which patterns downloaded, last sync time)
 * 4. SQLite perfect for local metadata (<50ms queries)
 * 5. Result: Local-first metadata survives network failures
 *
 * PATTERN: Pattern-STORAGE-004 (Local Metadata Storage)
 * RELATED: Storage-001 (PostgresStorage for patterns), Storage-002 (Code.NET sync)
 * PERFORMANCE: <50ms metadata queries, <10MB database size
 */

use rusqlite::{Connection, params, Result as SqliteResult};
use std::path::PathBuf;
use crate::storage::types::{OutcomeRecord, CalibrationRecord, SyncState};

/**
 * SqliteMetadata - Metadata storage for patterns
 *
 * DESIGN DECISION: Three tables (outcomes, calibration, sync_state)
 * WHY: Separate concerns, enable independent queries
 */
pub struct SqliteMetadata {
    conn: Connection,
}

impl SqliteMetadata {
    /**
     * Initialize metadata storage with three tables
     *
     * SCHEMA:
     *
     * outcomes table:
     * - id: TEXT PRIMARY KEY (UUID)
     * - pattern_id: TEXT (foreign key to patterns.id)
     * - timestamp: TEXT (ISO 8601)
     * - outcome: TEXT ("success", "partial", "failure")
     * - user_feedback: TEXT (nullable, optional comment)
     * - time_saved_minutes: INTEGER (nullable, estimated time saved)
     *
     * calibration table:
     * - pattern_id: TEXT PRIMARY KEY (one row per pattern)
     * - initial_confidence: REAL (original confidence score 0.0-1.0)
     * - adjusted_confidence: REAL (calibrated score based on outcomes)
     * - success_count: INTEGER (number of successful uses)
     * - failure_count: INTEGER (number of failed uses)
     * - last_updated: TEXT (ISO 8601)
     *
     * sync_state table:
     * - id: INTEGER PRIMARY KEY (single row)
     * - last_sync_timestamp: TEXT (ISO 8601)
     * - patterns_synced: INTEGER (total patterns downloaded)
     * - domains_synced: TEXT (comma-separated list)
     * - sync_status: TEXT ("idle", "syncing", "complete", "error")
     * - error_message: TEXT (nullable, last error if any)
     */
    pub fn new(db_path: &str) -> SqliteResult<Self> {
        // Create directory if not exists
        if let Some(parent) = PathBuf::from(db_path).parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| rusqlite::Error::InvalidPath(PathBuf::from(format!("Failed to create directory: {}", e))))?;
        }

        let conn = Connection::open(db_path)?;

        // Create outcomes table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS outcomes (
                id TEXT PRIMARY KEY,
                pattern_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                outcome TEXT NOT NULL,
                user_feedback TEXT,
                time_saved_minutes INTEGER,
                FOREIGN KEY (pattern_id) REFERENCES patterns(id)
            )",
            [],
        )?;

        // Create calibration table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS calibration (
                pattern_id TEXT PRIMARY KEY,
                initial_confidence REAL NOT NULL,
                adjusted_confidence REAL NOT NULL,
                success_count INTEGER DEFAULT 0,
                failure_count INTEGER DEFAULT 0,
                last_updated TEXT NOT NULL,
                FOREIGN KEY (pattern_id) REFERENCES patterns(id)
            )",
            [],
        )?;

        // Create sync_state table (single row)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS sync_state (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                last_sync_timestamp TEXT NOT NULL,
                patterns_synced INTEGER DEFAULT 0,
                domains_synced TEXT NOT NULL,
                sync_status TEXT NOT NULL,
                error_message TEXT
            )",
            [],
        )?;

        // Create indexes for common queries
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_outcomes_pattern ON outcomes(pattern_id)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_outcomes_timestamp ON outcomes(timestamp)",
            [],
        )?;

        println!("✅ Metadata storage initialized: {}", db_path);

        Ok(Self { conn })
    }

    /**
     * Record pattern usage outcome
     */
    pub fn insert_outcome(&self, outcome: &OutcomeRecord) -> SqliteResult<()> {
        self.conn.execute(
            "INSERT INTO outcomes (id, pattern_id, timestamp, outcome, user_feedback, time_saved_minutes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                &outcome.id,
                &outcome.pattern_id,
                &outcome.timestamp,
                &outcome.outcome,
                &outcome.user_feedback,
                &outcome.time_saved_minutes,
            ],
        )?;

        Ok(())
    }

    /**
     * Get all outcomes for a specific pattern
     */
    pub fn get_pattern_outcomes(&self, pattern_id: &str) -> SqliteResult<Vec<OutcomeRecord>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, pattern_id, timestamp, outcome, user_feedback, time_saved_minutes
             FROM outcomes
             WHERE pattern_id = ?1
             ORDER BY timestamp DESC"
        )?;

        let outcomes = stmt.query_map(params![pattern_id], |row| {
            Ok(OutcomeRecord {
                id: row.get(0)?,
                pattern_id: row.get(1)?,
                timestamp: row.get(2)?,
                outcome: row.get(3)?,
                user_feedback: row.get(4)?,
                time_saved_minutes: row.get(5)?,
            })
        })?;

        let mut result = Vec::new();
        for outcome in outcomes {
            result.push(outcome?);
        }

        Ok(result)
    }

    /**
     * Update calibration record (or insert if doesn't exist)
     */
    pub fn upsert_calibration(&self, calibration: &CalibrationRecord) -> SqliteResult<()> {
        self.conn.execute(
            "INSERT INTO calibration (pattern_id, initial_confidence, adjusted_confidence, success_count, failure_count, last_updated)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(pattern_id) DO UPDATE SET
                 adjusted_confidence = excluded.adjusted_confidence,
                 success_count = excluded.success_count,
                 failure_count = excluded.failure_count,
                 last_updated = excluded.last_updated",
            params![
                &calibration.pattern_id,
                &calibration.initial_confidence,
                &calibration.adjusted_confidence,
                &calibration.success_count,
                &calibration.failure_count,
                &calibration.last_updated,
            ],
        )?;

        Ok(())
    }

    /**
     * Get calibration record for pattern
     */
    pub fn get_calibration(&self, pattern_id: &str) -> SqliteResult<Option<CalibrationRecord>> {
        let mut stmt = self.conn.prepare(
            "SELECT pattern_id, initial_confidence, adjusted_confidence, success_count, failure_count, last_updated
             FROM calibration
             WHERE pattern_id = ?1"
        )?;

        let mut rows = stmt.query(params![pattern_id])?;

        if let Some(row) = rows.next()? {
            Ok(Some(CalibrationRecord {
                pattern_id: row.get(0)?,
                initial_confidence: row.get(1)?,
                adjusted_confidence: row.get(2)?,
                success_count: row.get(3)?,
                failure_count: row.get(4)?,
                last_updated: row.get(5)?,
            }))
        } else {
            Ok(None)
        }
    }

    /**
     * Update sync state (upsert single row)
     */
    pub fn update_sync_state(&self, state: &SyncState) -> SqliteResult<()> {
        self.conn.execute(
            "INSERT INTO sync_state (id, last_sync_timestamp, patterns_synced, domains_synced, sync_status, error_message)
             VALUES (1, ?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET
                 last_sync_timestamp = excluded.last_sync_timestamp,
                 patterns_synced = excluded.patterns_synced,
                 domains_synced = excluded.domains_synced,
                 sync_status = excluded.sync_status,
                 error_message = excluded.error_message",
            params![
                &state.last_sync_timestamp,
                &state.patterns_synced,
                &state.domains_synced.join(","),
                &state.sync_status,
                &state.error_message,
            ],
        )?;

        Ok(())
    }

    /**
     * Get current sync state
     */
    pub fn get_sync_state(&self) -> SqliteResult<Option<SyncState>> {
        let mut stmt = self.conn.prepare(
            "SELECT last_sync_timestamp, patterns_synced, domains_synced, sync_status, error_message
             FROM sync_state
             WHERE id = 1"
        )?;

        let mut rows = stmt.query([])?;

        if let Some(row) = rows.next()? {
            let domains_str: String = row.get(2)?;
            let domains_synced: Vec<String> = if domains_str.is_empty() {
                vec![]
            } else {
                domains_str.split(',').map(|s| s.trim().to_string()).collect()
            };

            Ok(Some(SyncState {
                last_sync_timestamp: row.get(0)?,
                patterns_synced: row.get(1)?,
                domains_synced,
                sync_status: row.get(3)?,
                error_message: row.get(4)?,
            }))
        } else {
            Ok(None)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sqlite_metadata_new() {
        let metadata = SqliteMetadata::new(":memory:").unwrap();
        assert!(metadata.get_sync_state().unwrap().is_none());
    }

    #[test]
    fn test_insert_outcome() {
        let metadata = SqliteMetadata::new(":memory:").unwrap();

        let outcome = OutcomeRecord {
            id: "outcome-001".to_string(),
            pattern_id: "pattern-001".to_string(),
            timestamp: "2025-10-14T00:00:00Z".to_string(),
            outcome: "success".to_string(),
            user_feedback: Some("Worked great!".to_string()),
            time_saved_minutes: Some(30),
        };

        metadata.insert_outcome(&outcome).unwrap();

        let outcomes = metadata.get_pattern_outcomes("pattern-001").unwrap();
        assert_eq!(outcomes.len(), 1);
        assert_eq!(outcomes[0].id, "outcome-001");
    }

    #[test]
    fn test_upsert_calibration() {
        let metadata = SqliteMetadata::new(":memory:").unwrap();

        let calibration = CalibrationRecord {
            pattern_id: "pattern-001".to_string(),
            initial_confidence: 0.85,
            adjusted_confidence: 0.92,
            success_count: 10,
            failure_count: 1,
            last_updated: "2025-10-14T00:00:00Z".to_string(),
        };

        metadata.upsert_calibration(&calibration).unwrap();

        let retrieved = metadata.get_calibration("pattern-001").unwrap().unwrap();
        assert_eq!(retrieved.adjusted_confidence, 0.92);
        assert_eq!(retrieved.success_count, 10);
    }

    #[test]
    fn test_sync_state() {
        let metadata = SqliteMetadata::new(":memory:").unwrap();

        let state = SyncState {
            last_sync_timestamp: "2025-10-14T00:00:00Z".to_string(),
            patterns_synced: 150,
            domains_synced: vec!["marketing".to_string(), "legal".to_string()],
            sync_status: "complete".to_string(),
            error_message: None,
        };

        metadata.update_sync_state(&state).unwrap();

        let retrieved = metadata.get_sync_state().unwrap().unwrap();
        assert_eq!(retrieved.patterns_synced, 150);
        assert_eq!(retrieved.domains_synced.len(), 2);
        assert_eq!(retrieved.sync_status, "complete");
    }
}
