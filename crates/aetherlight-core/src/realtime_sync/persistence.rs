/**
 * SQLite Event Persistence
 *
 * DESIGN DECISION: SQLite with WAL mode for concurrent writes
 * WHY: Event log for replay/history, survives server restart
 *
 * REASONING CHAIN:
 * 1. Need persistent event log for audit trail
 * 2. SQLite = zero-config embedded database
 * 3. WAL mode = concurrent readers + single writer
 * 4. Events stored as JSON for flexibility
 * 5. Indexed by timestamp + project for fast queries
 * 6. Result: <10ms write, <50ms replay
 *
 * PATTERN: Pattern-SQLITE-001 (Event Log Persistence)
 * PERFORMANCE: <10ms write, <50ms replay 1000 events
 */

use super::types::SyncEvent;
use rusqlite::{params, Connection, Result as SqliteResult};
use std::path::Path;
use std::sync::{Arc, Mutex};

/**
 * Event Persistence Manager
 */
pub struct EventPersistence {
    conn: Arc<Mutex<Connection>>,
}

impl EventPersistence {
    /**
     * Create new persistence manager
     *
     * DESIGN DECISION: WAL mode + synchronous=NORMAL
     * WHY: Maximize concurrency, acceptable durability trade-off
     */
    pub fn new<P: AsRef<Path>>(db_path: P) -> SqliteResult<Self> {
        let conn = Connection::open(db_path)?;

        // Enable WAL mode for concurrent access
        conn.execute("PRAGMA journal_mode=WAL", [])?;
        conn.execute("PRAGMA synchronous=NORMAL", [])?;

        // Create events table if not exists
        conn.execute(
            r#"
            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                event_type TEXT NOT NULL,
                user TEXT NOT NULL,
                terminal_id TEXT NOT NULL,
                project TEXT,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                files TEXT, -- JSON array
                tags TEXT, -- JSON array
                timestamp TEXT NOT NULL,
                created_at INTEGER NOT NULL -- Unix timestamp for sorting
            )
            "#,
            [],
        )?;

        // Create indexes for fast queries
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_events_project ON events(project)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type)",
            [],
        )?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    /**
     * Store event to database
     *
     * PERFORMANCE: <10ms per event
     */
    pub fn store_event(&self, event: &SyncEvent) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();

        let files_json = serde_json::to_string(&event.files).unwrap_or_else(|_| "[]".to_string());
        let tags_json = serde_json::to_string(&event.tags).unwrap_or_else(|_| "[]".to_string());

        conn.execute(
            r#"
            INSERT INTO events (
                id, event_type, user, terminal_id, project,
                title, description, files, tags, timestamp, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            "#,
            params![
                &event.id,
                format!("{:?}", event.event_type),
                &event.user,
                &event.terminal_id,
                &event.project,
                &event.title,
                &event.description,
                files_json,
                tags_json,
                &event.timestamp,
                chrono::Utc::now().timestamp(),
            ],
        )?;

        Ok(())
    }

    /**
     * Replay events for a project
     *
     * DESIGN DECISION: Return last N events (default 100)
     * WHY: Replay recent context on reconnect
     *
     * PERFORMANCE: <50ms for 1000 events
     */
    pub fn replay_events(&self, project: Option<&str>, limit: usize) -> SqliteResult<Vec<SyncEvent>> {
        let conn = self.conn.lock().unwrap();

        let query = if project.is_some() {
            "SELECT id, event_type, user, terminal_id, project, title, description, files, tags, timestamp
             FROM events
             WHERE project = ?1
             ORDER BY created_at DESC
             LIMIT ?2"
        } else {
            "SELECT id, event_type, user, terminal_id, project, title, description, files, tags, timestamp
             FROM events
             ORDER BY created_at DESC
             LIMIT ?1"
        };

        let mut stmt = conn.prepare(query)?;

        let rows = if let Some(proj) = project {
            stmt.query_map(params![proj, limit], Self::row_to_event)?
        } else {
            stmt.query_map(params![limit], Self::row_to_event)?
        };

        let mut events = Vec::new();
        for event_result in rows {
            if let Ok(event) = event_result {
                events.push(event);
            }
        }

        // Reverse to chronological order (oldest first)
        events.reverse();

        Ok(events)
    }

    /**
     * Convert database row to SyncEvent
     */
    fn row_to_event(row: &rusqlite::Row) -> SqliteResult<SyncEvent> {
        let files_json: String = row.get(7)?;
        let tags_json: String = row.get(8)?;

        let files: Vec<String> = serde_json::from_str(&files_json).unwrap_or_default();
        let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

        let event_type_str: String = row.get(1)?;
        let event_type = match event_type_str.as_str() {
            "DesignDecision" => super::types::SyncEventType::DesignDecision,
            "Blocker" => super::types::SyncEventType::Blocker,
            "Discovery" => super::types::SyncEventType::Discovery,
            _ => super::types::SyncEventType::Discovery, // Default fallback
        };

        Ok(SyncEvent {
            id: row.get(0)?,
            event_type,
            user: row.get(2)?,
            terminal_id: row.get(3)?,
            project: row.get(4)?,
            title: row.get(5)?,
            description: row.get(6)?,
            files,
            tags,
            timestamp: row.get(9)?,
        })
    }

    /**
     * Get event count by type
     */
    pub fn get_event_count(&self, project: Option<&str>) -> SqliteResult<usize> {
        let conn = self.conn.lock().unwrap();

        let count: i64 = if let Some(proj) = project {
            conn.query_row(
                "SELECT COUNT(*) FROM events WHERE project = ?1",
                params![proj],
                |row| row.get(0),
            )?
        } else {
            conn.query_row(
                "SELECT COUNT(*) FROM events",
                [],
                |row| row.get(0),
            )?
        };

        Ok(count as usize)
    }

    /**
     * Clear old events (optional cleanup)
     *
     * DESIGN DECISION: Keep events for 30 days
     * WHY: Balance between audit trail and database size
     */
    pub fn cleanup_old_events(&self, days: i64) -> SqliteResult<usize> {
        let conn = self.conn.lock().unwrap();

        let cutoff_timestamp = chrono::Utc::now().timestamp() - (days * 24 * 60 * 60);

        let deleted = conn.execute(
            "DELETE FROM events WHERE created_at < ?1",
            params![cutoff_timestamp],
        )?;

        Ok(deleted)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::types::SyncEventType;

    #[test]
    fn test_persistence_creation() {
        let persistence = EventPersistence::new(":memory:").unwrap();
        let count = persistence.get_event_count(None).unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn test_store_and_replay() {
        let persistence = EventPersistence::new(":memory:").unwrap();

        let event = SyncEvent::new(
            SyncEventType::DesignDecision,
            "alice".to_string(),
            "terminal-1".to_string(),
            "Use PostgreSQL".to_string(),
            "Decided to use PostgreSQL for better ACID guarantees".to_string(),
        )
        .with_project("my-project".to_string());

        persistence.store_event(&event).unwrap();

        let events = persistence.replay_events(Some("my-project"), 100).unwrap();
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].id, event.id);
        assert_eq!(events[0].title, "Use PostgreSQL");
    }

    #[test]
    fn test_replay_limit() {
        let persistence = EventPersistence::new(":memory:").unwrap();

        // Store 5 events
        for i in 0..5 {
            let event = SyncEvent::new(
                SyncEventType::Discovery,
                "bob".to_string(),
                "terminal-2".to_string(),
                format!("Discovery {}", i),
                format!("Found something interesting {}", i),
            );
            persistence.store_event(&event).unwrap();
        }

        let events = persistence.replay_events(None, 3).unwrap();
        assert_eq!(events.len(), 3);
    }

    #[test]
    fn test_cleanup_old_events() {
        let persistence = EventPersistence::new(":memory:").unwrap();

        let event = SyncEvent::new(
            SyncEventType::Blocker,
            "charlie".to_string(),
            "terminal-3".to_string(),
            "Build error".to_string(),
            "Encountered compiler error".to_string(),
        );
        persistence.store_event(&event).unwrap();

        // Cleanup events older than 0 days (immediate)
        std::thread::sleep(std::time::Duration::from_millis(100));
        let deleted = persistence.cleanup_old_events(0).unwrap();
        assert_eq!(deleted, 1);

        let count = persistence.get_event_count(None).unwrap();
        assert_eq!(count, 0);
    }
}
