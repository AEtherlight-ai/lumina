/**
 * Analytics Module - Usage tracking and impact metrics
 *
 * DESIGN DECISION: Separate analytics module with dedicated SQLite database
 * WHY: Isolate usage tracking from pattern/vector storage, enable privacy controls
 *
 * REASONING CHAIN:
 * 1. Users need to see ROI ("You saved 2.5 hours this week")
 * 2. Usage data must be private (no PII, aggregate stats only)
 * 3. Separate database prevents mixing usage data with patterns
 * 4. Event-based tracking allows flexible aggregation (daily/weekly/monthly)
 * 5. Fixed time estimates per action type (simple, predictable)
 *
 * PATTERN: Pattern-ANALYTICS-001 (Usage tracking with privacy)
 * RELATED: vector_store module (separate databases), error module (error handling)
 * FUTURE: Export to CSV/JSON, custom time estimates, A/B testing metrics
 *
 * # Architecture
 *
 * ```
 * UsageTracker
 *   ├── record_voice_capture()     → 2 min saved
 *   ├── record_search()             → 5 min saved
 *   ├── record_insertion()          → 2 min saved
 *   └── record_pattern_match()      → 10 min saved
 *
 * UsageMetrics
 *   ├── get_daily_metrics()
 *   ├── get_weekly_metrics()
 *   ├── get_monthly_metrics()
 *   └── get_all_time_metrics()
 * ```
 *
 * # Privacy Guarantees
 *
 * - No code content stored (only action types)
 * - No user identifiers
 * - No file paths or project names
 * - Optional metadata (JSON) for non-PII context
 */

pub mod tracker;
pub mod metrics;

pub use tracker::UsageTracker;
pub use metrics::{UsageMetrics, Metrics, MetricsPeriod};

/// Event types tracked by the analytics system
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EventType {
    /// Voice capture completed
    VoiceCapture,
    /// Semantic search executed
    Search,
    /// Code inserted into editor
    Insertion,
    /// Pattern matched and suggested
    PatternMatch,
}

impl EventType {
    /// Get time saved estimate for this event type (in minutes)
    pub fn time_saved_minutes(&self) -> i32 {
        match self {
            EventType::VoiceCapture => 2,
            EventType::Search => 5,
            EventType::Insertion => 2,
            EventType::PatternMatch => 10,
        }
    }

    /// Convert to database string representation
    pub fn as_str(&self) -> &'static str {
        match self {
            EventType::VoiceCapture => "voice_capture",
            EventType::Search => "search",
            EventType::Insertion => "insertion",
            EventType::PatternMatch => "pattern_match",
        }
    }

    /// Parse from database string representation
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "voice_capture" => Some(EventType::VoiceCapture),
            "search" => Some(EventType::Search),
            "insertion" => Some(EventType::Insertion),
            "pattern_match" => Some(EventType::PatternMatch),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_event_type_time_saved() {
        assert_eq!(EventType::VoiceCapture.time_saved_minutes(), 2);
        assert_eq!(EventType::Search.time_saved_minutes(), 5);
        assert_eq!(EventType::Insertion.time_saved_minutes(), 2);
        assert_eq!(EventType::PatternMatch.time_saved_minutes(), 10);
    }

    #[test]
    fn test_event_type_string_conversion() {
        let types = vec![
            EventType::VoiceCapture,
            EventType::Search,
            EventType::Insertion,
            EventType::PatternMatch,
        ];

        for event_type in types {
            let s = event_type.as_str();
            let parsed = EventType::from_str(s).expect("Failed to parse event type");
            assert_eq!(parsed, event_type);
        }
    }

    #[test]
    fn test_event_type_invalid_string() {
        assert_eq!(EventType::from_str("invalid"), None);
        assert_eq!(EventType::from_str(""), None);
    }
}
