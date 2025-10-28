/**
 * Query Interface for Shared Knowledge (AI-007)
 *
 * DESIGN DECISION: Builder pattern for composable queries
 * WHY: Flexible filtering without combinatorial explosion of function parameters
 *
 * REASONING CHAIN:
 * 1. Agents need flexible queries: "All OAuth2 security risks" vs "All high-severity discoveries"
 * 2. Function with 10+ optional parameters = unreadable, error-prone
 * 3. Builder pattern: query.by_type("security_risk").by_severity(High).by_tags(["oauth2"])
 * 4. Composable, readable, type-safe
 * 5. Compiles to single SQL query (no N+1 problem)
 *
 * PATTERN: Pattern-KNOWLEDGE-001 (Shared Knowledge Query)
 * PERFORMANCE: <50ms for complex queries (with indexes)
 * RELATED: KnowledgeDatabase (executes queries)
 * FUTURE: Add fuzzy search, add ranking by relevance
 */

use super::discovery::{Discovery, DiscoveryRecord, Severity};
use std::path::{Path, PathBuf};

/**
 * Query builder for shared knowledge
 *
 * DESIGN DECISION: Builder pattern with method chaining
 * WHY: Readable, composable, zero-cost abstraction
 *
 * EXAMPLES:
 * ```rust
 * // Simple query
 * let query = KnowledgeQuery::new()
 *     .by_type(DiscoveryType::BugPattern);
 *
 * // Complex query
 * let query = KnowledgeQuery::new()
 *     .by_type(DiscoveryType::SecurityRisk)
 *     .by_severity(Severity::High)
 *     .by_tags(&["oauth2", "authentication"])
 *     .by_domain("authentication")
 *     .limit(20);
 * ```
 */
#[derive(Debug, Clone)]
pub struct KnowledgeQuery {
    pub type_filter: Option<DiscoveryType>,
    pub severity_filter: Option<Severity>,
    pub domain_filter: Option<String>,
    pub tags_filter: Option<Vec<String>>,
    pub agent_filter: Option<String>,
    pub file_path_filter: Option<PathBuf>,
    pub validated_only: bool,
    pub limit: usize,
}

impl KnowledgeQuery {
    /**
     * DESIGN DECISION: Create empty query with defaults
     * WHY: Start with no filters, add as needed
     */
    pub fn new() -> Self {
        Self {
            type_filter: None,
            severity_filter: None,
            domain_filter: None,
            tags_filter: None,
            agent_filter: None,
            file_path_filter: None,
            validated_only: false,
            limit: 100, // Default limit
        }
    }

    /**
     * DESIGN DECISION: Filter by discovery type
     * WHY: Most common filter ("find all bug patterns")
     */
    pub fn by_type(mut self, discovery_type: DiscoveryType) -> Self {
        self.type_filter = Some(discovery_type);
        self
    }

    /**
     * DESIGN DECISION: Filter by severity
     * WHY: Urgent issues need immediate attention ("show critical bugs")
     */
    pub fn by_severity(mut self, severity: Severity) -> Self {
        self.severity_filter = Some(severity);
        self
    }

    /**
     * DESIGN DECISION: Filter by domain
     * WHY: Domain-specific discoveries ("authentication discoveries")
     */
    pub fn by_domain<S: Into<String>>(mut self, domain: S) -> Self {
        self.domain_filter = Some(domain.into());
        self
    }

    /**
     * DESIGN DECISION: Filter by tags (match ANY)
     * WHY: Tag-based search ("oauth2" OR "jwt" OR "authentication")
     */
    pub fn by_tags(mut self, tags: &[&str]) -> Self {
        self.tags_filter = Some(tags.iter().map(|s| s.to_string()).collect());
        self
    }

    /**
     * DESIGN DECISION: Filter by agent
     * WHY: Track which agent made discoveries ("show TestAgent discoveries")
     */
    pub fn by_agent<S: Into<String>>(mut self, agent: S) -> Self {
        self.agent_filter = Some(agent.into());
        self
    }

    /**
     * DESIGN DECISION: Filter by related file
     * WHY: Context-aware queries ("discoveries about auth.rs")
     */
    pub fn by_file<P: AsRef<Path>>(mut self, file_path: P) -> Self {
        self.file_path_filter = Some(file_path.as_ref().to_path_buf());
        self
    }

    /**
     * DESIGN DECISION: Filter validated discoveries only
     * WHY: Prioritize confirmed discoveries over unvalidated
     */
    pub fn validated_only(mut self) -> Self {
        self.validated_only = true;
        self
    }

    /**
     * DESIGN DECISION: Set result limit
     * WHY: Prevent overwhelming agents with thousands of results
     */
    pub fn limit(mut self, limit: usize) -> Self {
        self.limit = limit;
        self
    }
}

impl Default for KnowledgeQuery {
    fn default() -> Self {
        Self::new()
    }
}

/**
 * Discovery type enum for type-safe queries
 *
 * DESIGN DECISION: Enum instead of strings
 * WHY: Compile-time validation, no typos
 */
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DiscoveryType {
    BugPattern,
    PerformanceInsight,
    SecurityRisk,
    BestPractice,
}

impl DiscoveryType {
    /**
     * DESIGN DECISION: Convert to database string
     * WHY: Match Discovery::discovery_type() strings
     */
    pub fn as_str(&self) -> &'static str {
        match self {
            DiscoveryType::BugPattern => "bug_pattern",
            DiscoveryType::PerformanceInsight => "performance_insight",
            DiscoveryType::SecurityRisk => "security_risk",
            DiscoveryType::BestPractice => "best_practice",
        }
    }

    /**
     * DESIGN DECISION: Parse from string
     * WHY: User inputs, API calls
     */
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "bug_pattern" => Some(DiscoveryType::BugPattern),
            "performance_insight" => Some(DiscoveryType::PerformanceInsight),
            "security_risk" => Some(DiscoveryType::SecurityRisk),
            "best_practice" => Some(DiscoveryType::BestPractice),
            _ => None,
        }
    }
}

/**
 * Query result ranker
 *
 * DESIGN DECISION: Rank results by relevance + recency + validation
 * WHY: Most useful discoveries first
 *
 * RANKING FORMULA:
 * score = base_score + recency_boost + validation_boost + reference_boost
 *
 * WHERE:
 * - base_score: 1.0 (all discoveries equal initially)
 * - recency_boost: 0.0 to 0.3 (newer = higher, decay over time)
 * - validation_boost: 0.5 if validated, 0.0 otherwise
 * - reference_boost: 0.1 * log10(references + 1)
 *
 * RESULT: Validated, frequently-referenced, recent discoveries rank highest
 */
pub struct QueryRanker;

impl QueryRanker {
    /**
     * DESIGN DECISION: Rank query results
     * WHY: Most relevant discoveries first
     */
    pub fn rank(mut results: Vec<DiscoveryRecord>) -> Vec<DiscoveryRecord> {
        // Calculate scores
        let now = chrono::Utc::now();
        let mut scored: Vec<(DiscoveryRecord, f64)> = results
            .drain(..)
            .map(|record| {
                let score = Self::calculate_score(&record, &now);
                (record, score)
            })
            .collect();

        // Sort by score (descending)
        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

        // Return sorted records
        scored.into_iter().map(|(record, _)| record).collect()
    }

    /**
     * DESIGN DECISION: Calculate relevance score
     * WHY: Composite score from multiple factors
     */
    fn calculate_score(record: &DiscoveryRecord, now: &chrono::DateTime<chrono::Utc>) -> f64 {
        let mut score = 1.0; // Base score

        // Recency boost (decay over 30 days)
        let age_days = (now.timestamp() - record.timestamp.timestamp()) / 86400;
        let recency_boost = (0.3 * (-age_days as f64 / 30.0).exp()).max(0.0);
        score += recency_boost;

        // Validation boost
        if record.validated {
            score += 0.5;
        }

        // Reference boost (logarithmic)
        let reference_boost = 0.1 * ((record.reference_count + 1) as f64).log10();
        score += reference_boost;

        // Severity boost (if applicable)
        if let Some(severity) = record.discovery.severity() {
            let severity_boost = match severity {
                Severity::Critical => 0.4,
                Severity::High => 0.3,
                Severity::Medium => 0.1,
                Severity::Low => 0.0,
            };
            score += severity_boost;
        }

        score
    }
}

/**
 * Semantic query (future enhancement)
 *
 * DESIGN DECISION: Semantic search with embeddings
 * WHY: Find discoveries by meaning, not just keywords
 *
 * EXAMPLE:
 * Query: "How to prevent SQL injection?"
 * Matches: "Use prepared statements" (best practice)
 *          "SQL injection in query builder" (security risk)
 *
 * FUTURE: Implement with embeddings module
 */
#[allow(dead_code)]
pub struct SemanticQuery {
    query_text: String,
    limit: usize,
}

#[allow(dead_code)]
impl SemanticQuery {
    pub fn new(query_text: String) -> Self {
        Self {
            query_text,
            limit: 10,
        }
    }

    pub fn limit(mut self, limit: usize) -> Self {
        self.limit = limit;
        self
    }

    // FUTURE: Implement semantic search
    // pub async fn execute(&self, db: &KnowledgeDatabase) -> Result<Vec<DiscoveryRecord>> {
    //     // 1. Generate embedding for query_text
    //     // 2. Search similar discovery embeddings
    //     // 3. Return ranked results
    // }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_query_builder() {
        let query = KnowledgeQuery::new()
            .by_type(DiscoveryType::BugPattern)
            .by_severity(Severity::High)
            .by_domain("authentication")
            .by_tags(&["oauth2", "security"])
            .limit(20);

        assert_eq!(query.type_filter, Some(DiscoveryType::BugPattern));
        assert_eq!(query.severity_filter, Some(Severity::High));
        assert_eq!(query.domain_filter, Some("authentication".to_string()));
        assert_eq!(query.tags_filter, Some(vec!["oauth2".to_string(), "security".to_string()]));
        assert_eq!(query.limit, 20);
    }

    #[test]
    fn test_query_builder_default() {
        let query = KnowledgeQuery::new();

        assert_eq!(query.type_filter, None);
        assert_eq!(query.severity_filter, None);
        assert_eq!(query.limit, 100);
    }

    #[test]
    fn test_discovery_type_conversion() {
        assert_eq!(DiscoveryType::BugPattern.as_str(), "bug_pattern");
        assert_eq!(DiscoveryType::PerformanceInsight.as_str(), "performance_insight");
        assert_eq!(DiscoveryType::SecurityRisk.as_str(), "security_risk");
        assert_eq!(DiscoveryType::BestPractice.as_str(), "best_practice");

        assert_eq!(DiscoveryType::from_str("bug_pattern"), Some(DiscoveryType::BugPattern));
        assert_eq!(DiscoveryType::from_str("invalid"), None);
    }

    #[test]
    fn test_query_ranker() {
        use chrono::Utc;
        use std::path::PathBuf;

        // Create test discoveries with different characteristics
        let mut records = vec![];

        // Old, unvalidated
        let old = Discovery::BugPattern {
            description: "Old bug".to_string(),
            severity: Severity::Low,
            detected_in: PathBuf::from("test.rs"),
            remedy: "Fix".to_string(),
            tags: vec![],
        };
        let mut old_record = DiscoveryRecord::new(old, "TestAgent".to_string(), vec![], None);
        old_record.timestamp = Utc::now() - chrono::Duration::days(60);
        records.push(old_record);

        // Recent, validated, high severity
        let recent = Discovery::SecurityRisk {
            description: "Recent security risk".to_string(),
            severity: Severity::Critical,
            cwe_id: None,
            mitigation: "Fix now".to_string(),
            tags: vec![],
        };
        let mut recent_record = DiscoveryRecord::new(recent, "SecurityAgent".to_string(), vec![], None);
        recent_record.validated = true;
        records.push(recent_record);

        // Rank
        let ranked = QueryRanker::rank(records);

        // Recent validated critical should rank first
        assert!(ranked[0].validated);
        assert_eq!(ranked[0].discovery.severity(), Some(&Severity::Critical));
    }

    #[test]
    fn test_semantic_query_builder() {
        let query = SemanticQuery::new("How to prevent SQL injection?".to_string())
            .limit(5);

        assert_eq!(query.query_text, "How to prevent SQL injection?");
        assert_eq!(query.limit, 5);
    }
}
