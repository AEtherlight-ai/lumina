/**
 * UsageTracker - Record usage events and time saved
 *
 * DESIGN DECISION: Event-based tracking with SQLite persistence
 * WHY: Simple, reliable, query-able with standard SQL
 *
 * REASONING CHAIN:
 * 1. Need to persist usage data across app restarts
 * 2. SQLite provides ACID guarantees (no data loss)
 * 3. Event-based model allows flexible aggregation
 * 4. Single table design keeps queries simple (<50ms target)
 * 5. No pre-computation needed (aggregate on-demand)
 *
 * PATTERN: Pattern-ANALYTICS-001 (Usage tracking with privacy)
 * RELATED: vector_store::SqliteVectorStore (similar SQLite usage)
 * FUTURE: Batch inserts, async recording, custom time estimates
 *
 * # Example Usage
 *
 * ```rust
 * let tracker = UsageTracker::new("analytics.db")?;
 *
 * // Record events
 * tracker.record_voice_capture(None)?;
 * tracker.record_search(Some(r#"{"query": "pattern matching"}"#))?;
 * tracker.record_insertion(None)?;
 * tracker.record_pattern_match(Some(r#"{"pattern_id": "P-042"}"#))?;
 *
 * // Query totals
 * let total_events = tracker.count_events()?;
 * let total_time_saved = tracker.total_time_saved_minutes()?;
 * println!("Saved {} minutes from {} events", total_time_saved, total_events);
 * ```
 */

use crate::error::Error;
use crate::analytics::EventType;
use rusqlite::{Connection, params};
use std::path::Path;

/// Tracks usage events and calculates impact metrics
pub struct UsageTracker {
    pub(crate) conn: Connection,
}

impl UsageTracker {
    /**
     * Create a new UsageTracker with the specified database path.
     *
     * DESIGN DECISION: Single connection per tracker instance
     * WHY: Simplifies lifetime management, SQLite handles concurrency with WAL mode
     *
     * # Arguments
     *
     * * `db_path` - Path to SQLite database file (created if doesn't exist)
     *
     * # Errors
     *
     * Returns `Error::Internal` if database cannot be opened or initialized
     */
    pub fn new<P: AsRef<Path>>(db_path: P) -> Result<Self, Error> {
        let conn = Connection::open(db_path)?;

        // Enable WAL mode for better concurrency (query_row because PRAGMA returns results)
        let _: String = conn.query_row("PRAGMA journal_mode = WAL", [], |row| row.get(0))?;

        // Create table if not exists
        conn.execute(
            "CREATE TABLE IF NOT EXISTS usage_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL DEFAULT (datetime('now')),
                event_type TEXT NOT NULL,
                time_saved_minutes INTEGER NOT NULL,
                metadata TEXT
            )",
            [],
        )?;

        // Create indexes for fast queries
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_events_timestamp ON usage_events(timestamp)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_events_type ON usage_events(event_type)",
            [],
        )?;

        Ok(UsageTracker { conn })
    }

    /**
     * Record a usage event.
     *
     * DESIGN DECISION: Synchronous recording for simplicity
     * WHY: <10ms target easily achievable with SQLite, async adds complexity
     *
     * # Arguments
     *
     * * `event_type` - Type of event (voice_capture, search, etc.)
     * * `metadata` - Optional JSON metadata (non-PII context only)
     *
     * # Errors
     *
     * Returns `Error::Internal` if database write fails
     */
    fn record_event(&self, event_type: EventType, metadata: Option<&str>) -> Result<(), Error> {
        let time_saved = event_type.time_saved_minutes();
        self.conn.execute(
            "INSERT INTO usage_events (event_type, time_saved_minutes, metadata) VALUES (?1, ?2, ?3)",
            params![event_type.as_str(), time_saved, metadata],
        )?;
        Ok(())
    }

    /// Record a voice capture event (2 minutes saved)
    pub fn record_voice_capture(&self, metadata: Option<&str>) -> Result<(), Error> {
        self.record_event(EventType::VoiceCapture, metadata)
    }

    /// Record a semantic search event (5 minutes saved)
    pub fn record_search(&self, metadata: Option<&str>) -> Result<(), Error> {
        self.record_event(EventType::Search, metadata)
    }

    /// Record a code insertion event (2 minutes saved)
    pub fn record_insertion(&self, metadata: Option<&str>) -> Result<(), Error> {
        self.record_event(EventType::Insertion, metadata)
    }

    /// Record a pattern match event (10 minutes saved)
    pub fn record_pattern_match(&self, metadata: Option<&str>) -> Result<(), Error> {
        self.record_event(EventType::PatternMatch, metadata)
    }

    /**
     * Count total events recorded.
     *
     * # Errors
     *
     * Returns `Error::Internal` if database query fails
     */
    pub fn count_events(&self) -> Result<i64, Error> {
        let count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM usage_events",
            [],
            |row| row.get(0),
        )?;
        Ok(count)
    }

    /**
     * Calculate total time saved across all events (in minutes).
     *
     * # Errors
     *
     * Returns `Error::Internal` if database query fails
     */
    pub fn total_time_saved_minutes(&self) -> Result<i64, Error> {
        let total: i64 = self.conn.query_row(
            "SELECT COALESCE(SUM(time_saved_minutes), 0) FROM usage_events",
            [],
            |row| row.get(0),
        )?;
        Ok(total)
    }

    /**
     * Count events by type.
     *
     * # Arguments
     *
     * * `event_type` - Type of event to count
     *
     * # Errors
     *
     * Returns `Error::Internal` if database query fails
     */
    pub fn count_events_by_type(&self, event_type: EventType) -> Result<i64, Error> {
        let count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM usage_events WHERE event_type = ?1",
            params![event_type.as_str()],
            |row| row.get(0),
        )?;
        Ok(count)
    }

    /**
     * Calculate time saved by event type (in minutes).
     *
     * # Arguments
     *
     * * `event_type` - Type of event to calculate time for
     *
     * # Errors
     *
     * Returns `Error::Internal` if database query fails
     */
    pub fn time_saved_by_type(&self, event_type: EventType) -> Result<i64, Error> {
        let total: i64 = self.conn.query_row(
            "SELECT COALESCE(SUM(time_saved_minutes), 0) FROM usage_events WHERE event_type = ?1",
            params![event_type.as_str()],
            |row| row.get(0),
        )?;
        Ok(total)
    }

    /**
     * Get daily time saved for the last N days.
     *
     * DESIGN DECISION: Return structured data for chart visualization
     * WHY: Frontend needs time-series data grouped by date
     *
     * # Arguments
     *
     * * `days` - Number of days to query (e.g., 7, 30, 90)
     *
     * # Returns
     *
     * Vector of (date_string, minutes_saved) tuples, ordered by date ascending
     *
     * # Errors
     *
     * Returns `Error::Internal` if database query fails
     */
    pub fn get_daily_time_saved(&self, days: u32) -> Result<Vec<(String, i64)>, Error> {
        let mut stmt = self.conn.prepare(
            "SELECT DATE(timestamp) as date, SUM(time_saved_minutes) as minutes
             FROM usage_events
             WHERE timestamp >= datetime('now', '-' || ?1 || ' days')
             GROUP BY DATE(timestamp)
             ORDER BY date ASC"
        )?;

        let rows = stmt.query_map(params![days], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })?;

        let mut history = Vec::new();
        for row in rows {
            history.push(row?);
        }

        Ok(history)
    }

    /**
     * Delete all usage events (for testing or privacy reset).
     *
     * # Errors
     *
     * Returns `Error::Internal` if database operation fails
     */
    pub fn clear(&self) -> Result<(), Error> {
        self.conn.execute("DELETE FROM usage_events", [])?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Instant;

    #[test]
    fn test_tracker_new() {
        let tracker = UsageTracker::new(":memory:").expect("Failed to create tracker");
        let count = tracker.count_events().expect("Failed to count events");
        assert_eq!(count, 0);
    }

    #[test]
    fn test_record_voice_capture() {
        let tracker = UsageTracker::new(":memory:").expect("Failed to create tracker");
        tracker.record_voice_capture(None).expect("Failed to record event");

        let count = tracker.count_events().expect("Failed to count events");
        assert_eq!(count, 1);

        let time_saved = tracker.total_time_saved_minutes().expect("Failed to get time saved");
        assert_eq!(time_saved, 2); // Voice capture saves 2 minutes
    }

    #[test]
    fn test_record_search() {
        let tracker = UsageTracker::new(":memory:").expect("Failed to create tracker");
        tracker.record_search(Some(r#"{"query": "test"}"#)).expect("Failed to record event");

        let count = tracker.count_events_by_type(EventType::Search).expect("Failed to count");
        assert_eq!(count, 1);

        let time_saved = tracker.time_saved_by_type(EventType::Search).expect("Failed to get time");
        assert_eq!(time_saved, 5); // Search saves 5 minutes
    }

    #[test]
    fn test_multiple_events() {
        let tracker = UsageTracker::new(":memory:").expect("Failed to create tracker");

        tracker.record_voice_capture(None).expect("Failed to record");
        tracker.record_search(None).expect("Failed to record");
        tracker.record_insertion(None).expect("Failed to record");
        tracker.record_pattern_match(None).expect("Failed to record");

        let total_count = tracker.count_events().expect("Failed to count");
        assert_eq!(total_count, 4);

        let total_time = tracker.total_time_saved_minutes().expect("Failed to get time");
        assert_eq!(total_time, 2 + 5 + 2 + 10); // Sum of all events
    }

    #[test]
    fn test_clear() {
        let tracker = UsageTracker::new(":memory:").expect("Failed to create tracker");

        tracker.record_voice_capture(None).expect("Failed to record");
        tracker.record_search(None).expect("Failed to record");

        let before = tracker.count_events().expect("Failed to count");
        assert_eq!(before, 2);

        tracker.clear().expect("Failed to clear");

        let after = tracker.count_events().expect("Failed to count");
        assert_eq!(after, 0);
    }

    #[test]
    fn test_performance_record_event() {
        let tracker = UsageTracker::new(":memory:").expect("Failed to create tracker");

        let start = Instant::now();
        for _ in 0..100 {
            tracker.record_voice_capture(None).expect("Failed to record");
        }
        let elapsed = start.elapsed();

        let avg_time = elapsed.as_millis() / 100;
        println!("Average time per event: {}ms", avg_time);

        // Should be well under 10ms per event
        assert!(avg_time < 10, "Recording event took {}ms (target: <10ms)", avg_time);
    }

    #[test]
    fn test_performance_query_metrics() {
        let tracker = UsageTracker::new(":memory:").expect("Failed to create tracker");

        // Insert 1000 events
        for _ in 0..250 {
            tracker.record_voice_capture(None).expect("Failed to record");
            tracker.record_search(None).expect("Failed to record");
            tracker.record_insertion(None).expect("Failed to record");
            tracker.record_pattern_match(None).expect("Failed to record");
        }

        let start = Instant::now();
        let _ = tracker.total_time_saved_minutes().expect("Failed to query");
        let elapsed = start.elapsed();

        println!("Query time: {}ms", elapsed.as_millis());

        // Should be well under 50ms for aggregation
        assert!(elapsed.as_millis() < 50, "Query took {}ms (target: <50ms)", elapsed.as_millis());
    }
}
