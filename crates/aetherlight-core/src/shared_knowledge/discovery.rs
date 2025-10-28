/**
 * Discovery Types for Shared Knowledge Database (AI-007)
 *
 * DESIGN DECISION: Enum-based discovery types with structured fields
 * WHY: Type-safe representation of different knowledge categories agents can share
 *
 * REASONING CHAIN:
 * 1. Agents discover insights during execution (bugs, performance, security, best practices)
 * 2. Other agents need to learn from these discoveries
 * 3. Type-safe enum ensures all required fields present
 * 4. Structured data enables powerful querying (filter by severity, domain, file path)
 * 5. Serializable for database storage (JSON in SQLite)
 * 6. Result: Institutional knowledge that persists across agent sessions
 *
 * PATTERN: Pattern-KNOWLEDGE-001 (Shared Knowledge Discovery)
 * PERFORMANCE: Lightweight structs, minimal overhead
 * RELATED: AI-004 (Session Handoff), AI-010 (Validation Agent)
 * FUTURE: Add confidence scores, add discovery relationships (related discoveries)
 */

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/**
 * Discovery made by an agent
 *
 * DESIGN DECISION: Enum with variant-specific fields
 * WHY: Different discovery types need different data
 *
 * REASONING CHAIN:
 * 1. Bug patterns need: severity, location, remedy
 * 2. Performance insights need: baseline, optimized, improvement metric
 * 3. Security risks need: severity, CWE ID, mitigation
 * 4. Best practices need: domain, rationale
 * 5. Enum ensures all required fields present for each type
 */
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Discovery {
    /// Bug pattern discovered during testing/review
    ///
    /// Example: "OAuth2 implementations often forget state validation"
    BugPattern {
        description: String,
        severity: Severity,
        detected_in: PathBuf,
        remedy: String,
        tags: Vec<String>,
    },

    /// Performance insight from optimization work
    ///
    /// Example: "Switching from Vec to SmallVec improved allocation speed by 40%"
    PerformanceInsight {
        description: String,
        baseline: String,
        optimized: String,
        improvement: f64, // Percentage improvement (e.g., 0.40 = 40%)
        tags: Vec<String>,
    },

    /// Security risk identified
    ///
    /// Example: "SQL injection vulnerability in query builder"
    SecurityRisk {
        description: String,
        severity: Severity,
        cwe_id: Option<String>, // CWE identifier (e.g., "CWE-89")
        mitigation: String,
        tags: Vec<String>,
    },

    /// Best practice learned
    ///
    /// Example: "Always use prepared statements for database queries"
    BestPractice {
        description: String,
        domain: String, // e.g., "database", "authentication", "error-handling"
        rationale: String,
        tags: Vec<String>,
    },
}

impl Discovery {
    /**
     * DESIGN DECISION: Get discovery type as string
     * WHY: Useful for database queries and filtering
     */
    pub fn discovery_type(&self) -> &str {
        match self {
            Discovery::BugPattern { .. } => "bug_pattern",
            Discovery::PerformanceInsight { .. } => "performance_insight",
            Discovery::SecurityRisk { .. } => "security_risk",
            Discovery::BestPractice { .. } => "best_practice",
        }
    }

    /**
     * DESIGN DECISION: Get severity if applicable
     * WHY: Filter high-severity discoveries for immediate attention
     */
    pub fn severity(&self) -> Option<&Severity> {
        match self {
            Discovery::BugPattern { severity, .. } => Some(severity),
            Discovery::SecurityRisk { severity, .. } => Some(severity),
            _ => None,
        }
    }

    /**
     * DESIGN DECISION: Get tags from discovery
     * WHY: Enable tag-based search across all discovery types
     */
    pub fn tags(&self) -> &[String] {
        match self {
            Discovery::BugPattern { tags, .. } => tags,
            Discovery::PerformanceInsight { tags, .. } => tags,
            Discovery::SecurityRisk { tags, .. } => tags,
            Discovery::BestPractice { tags, .. } => tags,
        }
    }

    /**
     * DESIGN DECISION: Get description from discovery
     * WHY: All discoveries have descriptions, provide unified access
     */
    pub fn description(&self) -> &str {
        match self {
            Discovery::BugPattern { description, .. } => description,
            Discovery::PerformanceInsight { description, .. } => description,
            Discovery::SecurityRisk { description, .. } => description,
            Discovery::BestPractice { description, .. } => description,
        }
    }

    /**
     * DESIGN DECISION: Check if discovery is high severity
     * WHY: Quick filter for urgent issues
     */
    pub fn is_high_severity(&self) -> bool {
        matches!(
            self.severity(),
            Some(Severity::High) | Some(Severity::Critical)
        )
    }
}

/**
 * Severity levels for discoveries
 *
 * DESIGN DECISION: Four-level severity scale
 * WHY: Industry standard (Low/Medium/High/Critical), clear prioritization
 */
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum Severity {
    Low,
    Medium,
    High,
    Critical,
}

impl Severity {
    /**
     * DESIGN DECISION: Convert severity to numeric score
     * WHY: Useful for ranking discoveries by severity
     */
    pub fn to_score(&self) -> u8 {
        match self {
            Severity::Low => 1,
            Severity::Medium => 2,
            Severity::High => 3,
            Severity::Critical => 4,
        }
    }

    /**
     * DESIGN DECISION: Parse severity from string
     * WHY: User-facing inputs, database queries
     */
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "low" => Some(Severity::Low),
            "medium" => Some(Severity::Medium),
            "high" => Some(Severity::High),
            "critical" => Some(Severity::Critical),
            _ => None,
        }
    }
}

impl std::fmt::Display for Severity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Severity::Low => write!(f, "Low"),
            Severity::Medium => write!(f, "Medium"),
            Severity::High => write!(f, "High"),
            Severity::Critical => write!(f, "Critical"),
        }
    }
}

/**
 * Discovery record stored in database
 *
 * DESIGN DECISION: Wrap Discovery with metadata
 * WHY: Track when/who/where discovery was made
 *
 * REASONING CHAIN:
 * 1. Need to know which agent made discovery (for credibility)
 * 2. Need timestamp for recency ranking
 * 3. Need file paths for related discoveries
 * 4. Discovery content in enum, metadata separate
 * 5. Enables querying "all discoveries by Test Agent in last 24 hours"
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveryRecord {
    /// Unique ID for this discovery
    pub id: String,

    /// The actual discovery
    pub discovery: Discovery,

    /// Which agent made this discovery
    pub agent: String,

    /// When discovery was made
    pub timestamp: DateTime<Utc>,

    /// File paths related to this discovery (if applicable)
    pub related_files: Vec<PathBuf>,

    /// Project or domain this discovery applies to
    pub domain: Option<String>,

    /// How many times this discovery has been referenced
    pub reference_count: usize,

    /// Was this discovery validated/confirmed by other agents?
    pub validated: bool,
}

impl DiscoveryRecord {
    /**
     * DESIGN DECISION: Create new discovery record
     * WHY: Ensures all required metadata filled
     */
    pub fn new(
        discovery: Discovery,
        agent: String,
        related_files: Vec<PathBuf>,
        domain: Option<String>,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            discovery,
            agent,
            timestamp: Utc::now(),
            related_files,
            domain,
            reference_count: 0,
            validated: false,
        }
    }

    /**
     * DESIGN DECISION: Increment reference count
     * WHY: Track how useful this discovery is (referenced by other agents)
     */
    pub fn increment_references(&mut self) {
        self.reference_count += 1;
    }

    /**
     * DESIGN DECISION: Mark as validated
     * WHY: Validated discoveries rank higher in queries
     */
    pub fn mark_validated(&mut self) {
        self.validated = true;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bug_pattern_discovery() {
        let discovery = Discovery::BugPattern {
            description: "OAuth2 implementations often forget state validation".to_string(),
            severity: Severity::High,
            detected_in: PathBuf::from("tests/auth/oauth2_test.rs"),
            remedy: "Add state parameter validation in token exchange".to_string(),
            tags: vec!["oauth2".to_string(), "security".to_string()],
        };

        assert_eq!(discovery.discovery_type(), "bug_pattern");
        assert_eq!(discovery.severity(), Some(&Severity::High));
        assert!(discovery.is_high_severity());
        assert_eq!(discovery.tags().len(), 2);
    }

    #[test]
    fn test_performance_insight_discovery() {
        let discovery = Discovery::PerformanceInsight {
            description: "SmallVec outperforms Vec for small collections".to_string(),
            baseline: "Vec allocation: 250ns".to_string(),
            optimized: "SmallVec allocation: 150ns".to_string(),
            improvement: 0.40,
            tags: vec!["performance".to_string(), "memory".to_string()],
        };

        assert_eq!(discovery.discovery_type(), "performance_insight");
        assert_eq!(discovery.severity(), None);
        assert!(!discovery.is_high_severity());
    }

    #[test]
    fn test_security_risk_discovery() {
        let discovery = Discovery::SecurityRisk {
            description: "SQL injection in query builder".to_string(),
            severity: Severity::Critical,
            cwe_id: Some("CWE-89".to_string()),
            mitigation: "Use prepared statements".to_string(),
            tags: vec!["sql".to_string(), "injection".to_string()],
        };

        assert_eq!(discovery.discovery_type(), "security_risk");
        assert_eq!(discovery.severity(), Some(&Severity::Critical));
        assert!(discovery.is_high_severity());
    }

    #[test]
    fn test_best_practice_discovery() {
        let discovery = Discovery::BestPractice {
            description: "Always use prepared statements".to_string(),
            domain: "database".to_string(),
            rationale: "Prevents SQL injection, improves performance".to_string(),
            tags: vec!["database".to_string(), "security".to_string()],
        };

        assert_eq!(discovery.discovery_type(), "best_practice");
        assert_eq!(discovery.severity(), None);
    }

    #[test]
    fn test_severity_ordering() {
        assert!(Severity::Critical > Severity::High);
        assert!(Severity::High > Severity::Medium);
        assert!(Severity::Medium > Severity::Low);
    }

    #[test]
    fn test_severity_to_score() {
        assert_eq!(Severity::Low.to_score(), 1);
        assert_eq!(Severity::Medium.to_score(), 2);
        assert_eq!(Severity::High.to_score(), 3);
        assert_eq!(Severity::Critical.to_score(), 4);
    }

    #[test]
    fn test_severity_from_str() {
        assert_eq!(Severity::from_str("low"), Some(Severity::Low));
        assert_eq!(Severity::from_str("High"), Some(Severity::High));
        assert_eq!(Severity::from_str("CRITICAL"), Some(Severity::Critical));
        assert_eq!(Severity::from_str("invalid"), None);
    }

    #[test]
    fn test_discovery_record_creation() {
        let discovery = Discovery::BugPattern {
            description: "Test bug".to_string(),
            severity: Severity::Medium,
            detected_in: PathBuf::from("test.rs"),
            remedy: "Fix it".to_string(),
            tags: vec!["test".to_string()],
        };

        let record = DiscoveryRecord::new(
            discovery,
            "TestAgent".to_string(),
            vec![PathBuf::from("test.rs")],
            Some("testing".to_string()),
        );

        assert_eq!(record.agent, "TestAgent");
        assert_eq!(record.reference_count, 0);
        assert!(!record.validated);
    }

    #[test]
    fn test_discovery_record_increment() {
        let discovery = Discovery::BestPractice {
            description: "Test".to_string(),
            domain: "test".to_string(),
            rationale: "Because".to_string(),
            tags: vec![],
        };

        let mut record = DiscoveryRecord::new(
            discovery,
            "TestAgent".to_string(),
            vec![],
            None,
        );

        record.increment_references();
        assert_eq!(record.reference_count, 1);

        record.increment_references();
        assert_eq!(record.reference_count, 2);
    }

    #[test]
    fn test_discovery_record_validation() {
        let discovery = Discovery::SecurityRisk {
            description: "Test risk".to_string(),
            severity: Severity::High,
            cwe_id: None,
            mitigation: "Fix it".to_string(),
            tags: vec![],
        };

        let mut record = DiscoveryRecord::new(
            discovery,
            "SecurityAgent".to_string(),
            vec![],
            None,
        );

        assert!(!record.validated);
        record.mark_validated();
        assert!(record.validated);
    }
}
