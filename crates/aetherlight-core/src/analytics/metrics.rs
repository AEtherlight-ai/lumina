/**
 * UsageMetrics - Aggregated statistics for time periods
 *
 * DESIGN DECISION: On-demand aggregation from events table
 * WHY: Flexible (any date range), accurate (no stale pre-computed data)
 *
 * REASONING CHAIN:
 * 1. Users want metrics by day/week/month/all-time
 * 2. Pre-computing metrics requires background jobs (complexity)
 * 3. SQLite can aggregate 10k+ events in <50ms (fast enough)
 * 4. On-demand calculation always returns current data
 * 5. Date range flexibility enables custom reports
 *
 * PATTERN: Pattern-ANALYTICS-001 (Usage tracking with privacy)
 * RELATED: UsageTracker (provides raw events)
 * FUTURE: Cache recent metrics, custom date ranges, export to CSV/JSON
 *
 * # Example Usage
 *
 * ```rust
 * let tracker = UsageTracker::new("analytics.db")?;
 * let metrics = UsageMetrics::new(&tracker);
 *
 * // Get daily metrics
 * let daily = metrics.get_daily_metrics()?;
 * println!("Today: {} events, {} minutes saved", daily.total_events, daily.total_time_saved_minutes);
 *
 * // Get weekly metrics
 * let weekly = metrics.get_weekly_metrics()?;
 * println!("This week: {} events, {:.1} hours saved",
 *          weekly.total_events, weekly.total_time_saved_minutes as f64 / 60.0);
 *
 * // Get all-time metrics
 * let all_time = metrics.get_all_time_metrics()?;
 * println!("All time: {} events, {:.1} hours saved",
 *          all_time.total_events, all_time.total_time_saved_minutes as f64 / 60.0);
 * ```
 */

use crate::error::Error;
use crate::analytics::{UsageTracker, EventType};
use rusqlite::params;

/// Time period for metrics aggregation
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MetricsPeriod {
    /// Last 24 hours
    Daily,
    /// Last 7 days
    Weekly,
    /// Last 30 days
    Monthly,
    /// All recorded events
    AllTime,
}

/// Aggregated usage metrics for a time period
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Metrics {
    /// Period these metrics cover
    pub period: MetricsPeriod,
    /// Total number of events
    pub total_events: i64,
    /// Total time saved (in minutes)
    pub total_time_saved_minutes: i64,
    /// Voice capture events
    pub voice_captures: i64,
    /// Search events
    pub searches: i64,
    /// Insertion events
    pub insertions: i64,
    /// Pattern match events
    pub pattern_matches: i64,
}

impl Metrics {
    /// Get total time saved in hours (rounded to 1 decimal place)
    pub fn total_time_saved_hours(&self) -> f64 {
        (self.total_time_saved_minutes as f64 / 60.0 * 10.0).round() / 10.0
    }
}

/// Provides aggregated metrics from usage events
pub struct UsageMetrics<'a> {
    tracker: &'a UsageTracker,
}

impl<'a> UsageMetrics<'a> {
    /**
     * Create a new UsageMetrics instance.
     *
     * DESIGN DECISION: Borrow tracker instead of owning
     * WHY: Allows metrics queries without moving tracker ownership
     *
     * # Arguments
     *
     * * `tracker` - Reference to UsageTracker with event data
     */
    pub fn new(tracker: &'a UsageTracker) -> Self {
        UsageMetrics { tracker }
    }

    /**
     * Get metrics for a specific time period.
     *
     * DESIGN DECISION: Single SQL query with date filtering
     * WHY: Efficient (one round-trip), leverages SQLite's datetime functions
     *
     * # Arguments
     *
     * * `period` - Time period to aggregate (daily/weekly/monthly/all-time)
     *
     * # Errors
     *
     * Returns `Error::Internal` if database query fails
     */
    pub fn get_metrics(&self, period: MetricsPeriod) -> Result<Metrics, Error> {
        // Calculate date threshold for period
        let date_filter = match period {
            MetricsPeriod::Daily => "datetime('now', '-1 day')",
            MetricsPeriod::Weekly => "datetime('now', '-7 days')",
            MetricsPeriod::Monthly => "datetime('now', '-30 days')",
            MetricsPeriod::AllTime => "datetime('1970-01-01')", // Beginning of time
        };

        // Query aggregated metrics
        let (total_events, total_time_saved): (i64, i64) = self.tracker.conn.query_row(
            &format!(
                "SELECT COUNT(*), COALESCE(SUM(time_saved_minutes), 0)
                 FROM usage_events
                 WHERE timestamp >= {}",
                date_filter
            ),
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )?;

        // Query counts by event type
        let voice_captures = self.count_by_type_in_period(EventType::VoiceCapture, date_filter)?;
        let searches = self.count_by_type_in_period(EventType::Search, date_filter)?;
        let insertions = self.count_by_type_in_period(EventType::Insertion, date_filter)?;
        let pattern_matches = self.count_by_type_in_period(EventType::PatternMatch, date_filter)?;

        Ok(Metrics {
            period,
            total_events,
            total_time_saved_minutes: total_time_saved,
            voice_captures,
            searches,
            insertions,
            pattern_matches,
        })
    }

    /// Get metrics for the last 24 hours
    pub fn get_daily_metrics(&self) -> Result<Metrics, Error> {
        self.get_metrics(MetricsPeriod::Daily)
    }

    /// Get metrics for the last 7 days
    pub fn get_weekly_metrics(&self) -> Result<Metrics, Error> {
        self.get_metrics(MetricsPeriod::Weekly)
    }

    /// Get metrics for the last 30 days
    pub fn get_monthly_metrics(&self) -> Result<Metrics, Error> {
        self.get_metrics(MetricsPeriod::Monthly)
    }

    /// Get metrics for all recorded events
    pub fn get_all_time_metrics(&self) -> Result<Metrics, Error> {
        self.get_metrics(MetricsPeriod::AllTime)
    }

    /**
     * Count events by type within a time period.
     *
     * # Arguments
     *
     * * `event_type` - Type of event to count
     * * `date_filter` - SQLite datetime expression for period filtering
     *
     * # Errors
     *
     * Returns `Error::Internal` if database query fails
     */
    fn count_by_type_in_period(&self, event_type: EventType, date_filter: &str) -> Result<i64, Error> {
        let count: i64 = self.tracker.conn.query_row(
            &format!(
                "SELECT COUNT(*) FROM usage_events
                 WHERE event_type = ?1 AND timestamp >= {}",
                date_filter
            ),
            params![event_type.as_str()],
            |row| row.get(0),
        )?;
        Ok(count)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metrics_all_time_empty() {
        let tracker = UsageTracker::new(":memory:").expect("Failed to create tracker");
        let metrics = UsageMetrics::new(&tracker);

        let all_time = metrics.get_all_time_metrics().expect("Failed to get metrics");

        assert_eq!(all_time.period, MetricsPeriod::AllTime);
        assert_eq!(all_time.total_events, 0);
        assert_eq!(all_time.total_time_saved_minutes, 0);
        assert_eq!(all_time.voice_captures, 0);
        assert_eq!(all_time.searches, 0);
        assert_eq!(all_time.insertions, 0);
        assert_eq!(all_time.pattern_matches, 0);
    }

    #[test]
    fn test_metrics_all_time_with_events() {
        let tracker = UsageTracker::new(":memory:").expect("Failed to create tracker");

        // Record diverse events
        tracker.record_voice_capture(None).expect("Failed to record");
        tracker.record_voice_capture(None).expect("Failed to record");
        tracker.record_search(None).expect("Failed to record");
        tracker.record_insertion(None).expect("Failed to record");
        tracker.record_pattern_match(None).expect("Failed to record");

        let metrics = UsageMetrics::new(&tracker);
        let all_time = metrics.get_all_time_metrics().expect("Failed to get metrics");

        assert_eq!(all_time.total_events, 5);
        assert_eq!(all_time.total_time_saved_minutes, 2 + 2 + 5 + 2 + 10); // Sum of time saved
        assert_eq!(all_time.voice_captures, 2);
        assert_eq!(all_time.searches, 1);
        assert_eq!(all_time.insertions, 1);
        assert_eq!(all_time.pattern_matches, 1);
    }

    #[test]
    fn test_metrics_daily() {
        let tracker = UsageTracker::new(":memory:").expect("Failed to create tracker");

        // Record events (will have current timestamps)
        tracker.record_voice_capture(None).expect("Failed to record");
        tracker.record_search(None).expect("Failed to record");

        let metrics = UsageMetrics::new(&tracker);
        let daily = metrics.get_daily_metrics().expect("Failed to get metrics");

        assert_eq!(daily.period, MetricsPeriod::Daily);
        assert_eq!(daily.total_events, 2);
        assert_eq!(daily.total_time_saved_minutes, 2 + 5);
    }

    #[test]
    fn test_metrics_time_saved_hours() {
        let tracker = UsageTracker::new(":memory:").expect("Failed to create tracker");

        // Record 120 minutes worth of events
        for _ in 0..12 {
            tracker.record_pattern_match(None).expect("Failed to record"); // 10 min each
        }

        let metrics = UsageMetrics::new(&tracker);
        let all_time = metrics.get_all_time_metrics().expect("Failed to get metrics");

        assert_eq!(all_time.total_time_saved_minutes, 120);
        assert_eq!(all_time.total_time_saved_hours(), 2.0);
    }

    #[test]
    fn test_metrics_time_saved_hours_rounding() {
        let tracker = UsageTracker::new(":memory:").expect("Failed to create tracker");

        // Record 17 minutes (should round to 0.3 hours)
        tracker.record_pattern_match(None).expect("Failed to record"); // 10 min
        tracker.record_search(None).expect("Failed to record"); // 5 min
        tracker.record_voice_capture(None).expect("Failed to record"); // 2 min

        let metrics = UsageMetrics::new(&tracker);
        let all_time = metrics.get_all_time_metrics().expect("Failed to get metrics");

        assert_eq!(all_time.total_time_saved_minutes, 17);
        assert_eq!(all_time.total_time_saved_hours(), 0.3); // 17/60 = 0.283... → 0.3
    }

    #[test]
    fn test_metrics_weekly() {
        let tracker = UsageTracker::new(":memory:").expect("Failed to create tracker");

        // Record events (current timestamps, within last 7 days)
        for _ in 0..10 {
            tracker.record_voice_capture(None).expect("Failed to record");
        }

        let metrics = UsageMetrics::new(&tracker);
        let weekly = metrics.get_weekly_metrics().expect("Failed to get metrics");

        assert_eq!(weekly.period, MetricsPeriod::Weekly);
        assert_eq!(weekly.total_events, 10);
        assert_eq!(weekly.voice_captures, 10);
    }

    #[test]
    fn test_metrics_monthly() {
        let tracker = UsageTracker::new(":memory:").expect("Failed to create tracker");

        // Record events (current timestamps, within last 30 days)
        tracker.record_pattern_match(None).expect("Failed to record");
        tracker.record_pattern_match(None).expect("Failed to record");
        tracker.record_pattern_match(None).expect("Failed to record");

        let metrics = UsageMetrics::new(&tracker);
        let monthly = metrics.get_monthly_metrics().expect("Failed to get metrics");

        assert_eq!(monthly.period, MetricsPeriod::Monthly);
        assert_eq!(monthly.total_events, 3);
        assert_eq!(monthly.pattern_matches, 3);
        assert_eq!(monthly.total_time_saved_minutes, 30); // 3 * 10
    }
}
