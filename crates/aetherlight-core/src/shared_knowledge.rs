/**
 * Shared Knowledge Database (AI-007)
 *
 * DESIGN DECISION: Centralized knowledge base for institutional learning
 * WHY: Agents learn from each other, not just individually
 *
 * REASONING CHAIN:
 * 1. Phase 4: Multiple agents work in parallel
 * 2. Test Agent finds bug pattern: "OAuth2 state validation missing"
 * 3. How does Implementation Agent learn about this?
 * 4. Shared knowledge database enables cross-agent learning
 * 5. Bug discovered once = never repeated across ALL agents
 * 6. Knowledge compounds: More agents → More discoveries → Better system
 *
 * PATTERN: Pattern-KNOWLEDGE-001 (Shared Knowledge Database)
 * PERFORMANCE: <100ms record, <50ms query
 * IMPACT: 50% reduction in repeated bugs, institutional knowledge
 * RELATED: AI-004 (Session Handoff), AI-010 (Validation Agent)
 * FUTURE: Add semantic search, add confidence scores, add discovery relationships
 *
 * # Architecture
 *
 * ```text
 * ┌───────────────────────────────────────────────────────────────┐
 * │                     SharedKnowledge                           │
 * ├───────────────────────────────────────────────────────────────┤
 * │  record() → KnowledgeDatabase → SQLite                        │
 * │  query()  → QueryBuilder → KnowledgeDatabase → Results        │
 * │  get_related() → File Path Index → Results                    │
 * ├───────────────────────────────────────────────────────────────┤
 * │  Sync Layer (RwLock) - Concurrent Agent Access                │
 * └───────────────────────────────────────────────────────────────┘
 * ```
 *
 * # Examples
 *
 * ## Recording Discoveries
 *
 * ```rust
 * use aetherlight_core::shared_knowledge::{SharedKnowledge, Discovery, Severity};
 * use std::path::PathBuf;
 *
 * // Test Agent records bug pattern
 * let shared_knowledge = SharedKnowledge::new(".lumina/knowledge").await?;
 *
 * shared_knowledge.record(
 *     Discovery::BugPattern {
 *         description: "OAuth2 implementations often forget state validation".to_string(),
 *         severity: Severity::High,
 *         detected_in: PathBuf::from("tests/auth/oauth2_test.rs"),
 *         remedy: "Add state parameter validation in token exchange".to_string(),
 *         tags: vec!["oauth2".to_string(), "security".to_string()],
 *     },
 *     "TestAgent".to_string(),
 *     vec![PathBuf::from("tests/auth/oauth2_test.rs")],
 *     Some("authentication".to_string()),
 * ).await?;
 * ```
 *
 * ## Querying Discoveries
 *
 * ```rust
 * use aetherlight_core::shared_knowledge::{SharedKnowledge, KnowledgeQuery, DiscoveryType, Severity};
 *
 * // Review Agent checks for OAuth2-related security risks
 * let query = KnowledgeQuery::new()
 *     .by_type(DiscoveryType::SecurityRisk)
 *     .by_tags(&["oauth2"])
 *     .by_severity(Severity::High);
 *
 * let discoveries = shared_knowledge.query(query).await?;
 *
 * for discovery in discoveries {
 *     println!("Found: {}", discovery.discovery.description());
 *     println!("Remedy: {:?}", discovery.discovery);
 * }
 * ```
 *
 * ## Related Discoveries
 *
 * ```rust
 * use std::path::Path;
 *
 * // Implementation Agent checks discoveries about specific file
 * let related = shared_knowledge.get_related(Path::new("src/auth/oauth2.rs")).await?;
 *
 * if !related.is_empty() {
 *     println!("⚠️  Found {} discoveries about this file:", related.len());
 *     for discovery in related {
 *         if discovery.discovery.is_high_severity() {
 *             println!("  🔴 {}", discovery.discovery.description());
 *         }
 *     }
 * }
 * ```
 */

pub mod database;
pub mod discovery;
pub mod query;
pub mod sync;

pub use database::{KnowledgeDatabase, DatabaseStatistics};
pub use discovery::{Discovery, Severity, DiscoveryRecord};
pub use query::{KnowledgeQuery, DiscoveryType, QueryRanker, SemanticQuery};
pub use sync::{SyncedKnowledgeDatabase, AgentSyncCoordinator, ConflictResolver, ConflictResolution};

use crate::{Result, Error};
use std::path::{Path, PathBuf};

/**
 * Shared knowledge database facade
 *
 * DESIGN DECISION: Simple API that hides complexity
 * WHY: Agents shouldn't worry about sync, locks, SQL
 *
 * REASONING CHAIN:
 * 1. Agents need: record(), query(), get_related()
 * 2. Don't need: SQLite details, RwLock management, query building
 * 3. Facade pattern: Simple interface, complex implementation
 * 4. Thread-safe by default (RwLock internally)
 * 5. Zero-configuration (auto-creates database)
 */
pub struct SharedKnowledge {
    db: SyncedKnowledgeDatabase,
    coordinator: AgentSyncCoordinator,
}

impl SharedKnowledge {
    /**
     * DESIGN DECISION: Create or open shared knowledge database
     * WHY: Single function for initialization
     *
     * REASONING CHAIN:
     * 1. Check if database exists at path
     * 2. If not, create with schema
     * 3. If exists, validate schema
     * 4. Wrap in sync layer
     * 5. Return ready-to-use instance
     *
     * PERFORMANCE: <50ms for initialization
     */
    pub async fn new<P: AsRef<Path>>(db_path: P) -> Result<Self> {
        let db_path = db_path.as_ref().join("shared_knowledge.sqlite");

        // Create or open database
        let db = KnowledgeDatabase::new(db_path)?;

        // Create sync coordinator
        let coordinator = AgentSyncCoordinator::new(db);

        // Get synced database
        let synced_db = coordinator.get_database();

        Ok(Self {
            db: synced_db,
            coordinator,
        })
    }

    /**
     * DESIGN DECISION: Record discovery
     * WHY: Primary write operation for agents
     *
     * REASONING CHAIN:
     * 1. Agent makes discovery (bug, performance insight, etc.)
     * 2. Creates Discovery enum with details
     * 3. Calls record() with discovery + metadata
     * 4. Database stores discovery
     * 5. Other agents can now query and learn from it
     *
     * PERFORMANCE: <100ms for insert
     */
    pub async fn record(
        &self,
        discovery: Discovery,
        agent: String,
        related_files: Vec<PathBuf>,
        domain: Option<String>,
    ) -> Result<String> {
        // Create discovery record
        let record = DiscoveryRecord::new(discovery, agent, related_files, domain);
        let id = record.id.clone();

        // Insert into database
        self.db.write(|db| {
            db.insert(&record)
        }).await?;

        // Increment version
        self.coordinator.increment_version().await;

        Ok(id)
    }

    /**
     * DESIGN DECISION: Query discoveries
     * WHY: Primary read operation for agents
     *
     * REASONING CHAIN:
     * 1. Agent needs knowledge (e.g., "OAuth2 security risks")
     * 2. Builds query with filters (type, severity, tags)
     * 3. Calls query() with builder
     * 4. Database executes SQL query
     * 5. Results ranked by relevance
     * 6. Agent learns from discoveries
     *
     * PERFORMANCE: <50ms for complex queries
     */
    pub async fn query(&self, query: KnowledgeQuery) -> Result<Vec<DiscoveryRecord>> {
        // Execute query
        let results = self.db.read(|db| {
            db.query(
                query.type_filter.as_ref().map(|t| t.as_str()),
                query.severity_filter,
                query.domain_filter.as_deref(),
                query.tags_filter.as_deref(),
                query.agent_filter.as_deref(),
                query.file_path_filter.as_deref(),
                query.limit,
            )
        }).await?;

        // Rank results by relevance
        let ranked = QueryRanker::rank(results);

        // Filter validated only (if requested)
        if query.validated_only {
            Ok(ranked.into_iter().filter(|r| r.validated).collect())
        } else {
            Ok(ranked)
        }
    }

    /**
     * DESIGN DECISION: Get discoveries related to file
     * WHY: Context-aware learning ("what do I need to know about this file?")
     *
     * REASONING CHAIN:
     * 1. Agent about to modify file (e.g., src/auth/oauth2.rs)
     * 2. Calls get_related() with file path
     * 3. Database returns all discoveries mentioning that file
     * 4. Agent learns: "This file has OAuth2 state validation bug"
     * 5. Agent avoids making same mistake
     *
     * PERFORMANCE: <50ms (uses file path index)
     */
    pub async fn get_related(&self, file_path: &Path) -> Result<Vec<DiscoveryRecord>> {
        let query = KnowledgeQuery::new()
            .by_file(file_path)
            .limit(50);

        self.query(query).await
    }

    /**
     * DESIGN DECISION: Get recent discoveries
     * WHY: "What did agents discover recently?"
     *
     * USAGE: Dashboard, daily digest, agent onboarding
     */
    pub async fn get_recent(&self, limit: usize) -> Result<Vec<DiscoveryRecord>> {
        let query = KnowledgeQuery::new()
            .limit(limit);

        self.query(query).await
    }

    /**
     * DESIGN DECISION: Get high-severity discoveries
     * WHY: Urgent issues need immediate attention
     *
     * USAGE: Security Agent, Review Agent
     */
    pub async fn get_high_severity(&self) -> Result<Vec<DiscoveryRecord>> {
        let query = KnowledgeQuery::new()
            .by_severity(Severity::High)
            .limit(50);

        let high = self.query(query).await?;

        let query_critical = KnowledgeQuery::new()
            .by_severity(Severity::Critical)
            .limit(50);

        let critical = self.query(query_critical).await?;

        // Combine and re-rank
        let mut combined = high;
        combined.extend(critical);
        Ok(QueryRanker::rank(combined))
    }

    /**
     * DESIGN DECISION: Increment reference count
     * WHY: Track how useful discoveries are
     *
     * USAGE: Agent references discovery in code/documentation
     */
    pub async fn increment_references(&self, discovery_id: &str) -> Result<()> {
        self.db.write(|db| {
            db.increment_references(discovery_id)
        }).await
    }

    /**
     * DESIGN DECISION: Mark discovery as validated
     * WHY: Validated discoveries rank higher
     *
     * USAGE: Multiple agents confirm same discovery
     */
    pub async fn mark_validated(&self, discovery_id: &str) -> Result<()> {
        self.db.write(|db| {
            db.mark_validated(discovery_id)
        }).await?;

        // Increment version
        self.coordinator.increment_version().await;

        Ok(())
    }

    /**
     * DESIGN DECISION: Get database statistics
     * WHY: Monitoring, analytics, debugging
     */
    pub async fn get_statistics(&self) -> Result<DatabaseStatistics> {
        self.db.read(|db| {
            db.get_statistics()
        }).await
    }

    /**
     * DESIGN DECISION: Get database version
     * WHY: Cache invalidation, change detection
     */
    pub async fn get_version(&self) -> u64 {
        self.coordinator.get_version().await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_shared_knowledge_creation() {
        let dir = tempdir().unwrap();
        let sk = SharedKnowledge::new(dir.path()).await;
        assert!(sk.is_ok());
    }

    #[tokio::test]
    async fn test_record_and_query() {
        let dir = tempdir().unwrap();
        let sk = SharedKnowledge::new(dir.path()).await.unwrap();

        // Record discovery
        let discovery = Discovery::BugPattern {
            description: "OAuth2 state validation missing".to_string(),
            severity: Severity::High,
            detected_in: PathBuf::from("auth.rs"),
            remedy: "Add state validation".to_string(),
            tags: vec!["oauth2".to_string(), "security".to_string()],
        };

        let id = sk.record(
            discovery,
            "TestAgent".to_string(),
            vec![PathBuf::from("auth.rs")],
            Some("authentication".to_string()),
        ).await.unwrap();

        // Query by type
        let query = KnowledgeQuery::new()
            .by_type(DiscoveryType::BugPattern);

        let results = sk.query(query).await.unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, id);
    }

    #[tokio::test]
    async fn test_get_related() {
        let dir = tempdir().unwrap();
        let sk = SharedKnowledge::new(dir.path()).await.unwrap();

        // Record discovery about specific file
        let discovery = Discovery::SecurityRisk {
            description: "SQL injection risk".to_string(),
            severity: Severity::Critical,
            cwe_id: Some("CWE-89".to_string()),
            mitigation: "Use prepared statements".to_string(),
            tags: vec!["sql".to_string()],
        };

        sk.record(
            discovery,
            "SecurityAgent".to_string(),
            vec![PathBuf::from("database.rs")],
            None,
        ).await.unwrap();

        // Get related discoveries
        let related = sk.get_related(Path::new("database.rs")).await.unwrap();
        assert_eq!(related.len(), 1);
        assert_eq!(related[0].discovery.discovery_type(), "security_risk");
    }

    #[tokio::test]
    async fn test_get_high_severity() {
        let dir = tempdir().unwrap();
        let sk = SharedKnowledge::new(dir.path()).await.unwrap();

        // Record critical discovery
        let critical = Discovery::SecurityRisk {
            description: "Critical vulnerability".to_string(),
            severity: Severity::Critical,
            cwe_id: None,
            mitigation: "Fix immediately".to_string(),
            tags: vec![],
        };

        sk.record(critical, "SecurityAgent".to_string(), vec![], None).await.unwrap();

        // Record medium discovery
        let medium = Discovery::BugPattern {
            description: "Medium bug".to_string(),
            severity: Severity::Medium,
            detected_in: PathBuf::from("test.rs"),
            remedy: "Fix when convenient".to_string(),
            tags: vec![],
        };

        sk.record(medium, "TestAgent".to_string(), vec![], None).await.unwrap();

        // Get high severity only
        let high_sev = sk.get_high_severity().await.unwrap();
        assert_eq!(high_sev.len(), 1);
        assert_eq!(high_sev[0].discovery.severity(), Some(&Severity::Critical));
    }

    #[tokio::test]
    async fn test_increment_references() {
        let dir = tempdir().unwrap();
        let sk = SharedKnowledge::new(dir.path()).await.unwrap();

        // Record discovery
        let discovery = Discovery::BestPractice {
            description: "Use prepared statements".to_string(),
            domain: "database".to_string(),
            rationale: "Prevents SQL injection".to_string(),
            tags: vec![],
        };

        let id = sk.record(discovery, "DatabaseAgent".to_string(), vec![], None).await.unwrap();

        // Increment references
        sk.increment_references(&id).await.unwrap();
        sk.increment_references(&id).await.unwrap();

        // Verify
        let query = KnowledgeQuery::new()
            .by_type(DiscoveryType::BestPractice);

        let results = sk.query(query).await.unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].reference_count, 2);
    }

    #[tokio::test]
    async fn test_mark_validated() {
        let dir = tempdir().unwrap();
        let sk = SharedKnowledge::new(dir.path()).await.unwrap();

        // Record discovery
        let discovery = Discovery::PerformanceInsight {
            description: "SmallVec faster than Vec".to_string(),
            baseline: "Vec: 250ns".to_string(),
            optimized: "SmallVec: 150ns".to_string(),
            improvement: 0.40,
            tags: vec![],
        };

        let id = sk.record(discovery, "PerfAgent".to_string(), vec![], None).await.unwrap();

        // Mark validated
        sk.mark_validated(&id).await.unwrap();

        // Verify
        let query = KnowledgeQuery::new()
            .by_type(DiscoveryType::PerformanceInsight)
            .validated_only();

        let results = sk.query(query).await.unwrap();
        assert_eq!(results.len(), 1);
        assert!(results[0].validated);
    }

    #[tokio::test]
    async fn test_version_tracking() {
        let dir = tempdir().unwrap();
        let sk = SharedKnowledge::new(dir.path()).await.unwrap();

        // Initial version
        assert_eq!(sk.get_version().await, 0);

        // Record discovery (increments version)
        let discovery = Discovery::BestPractice {
            description: "Test".to_string(),
            domain: "test".to_string(),
            rationale: "Test".to_string(),
            tags: vec![],
        };

        sk.record(discovery, "TestAgent".to_string(), vec![], None).await.unwrap();

        // Version incremented
        assert_eq!(sk.get_version().await, 1);
    }

    #[tokio::test]
    async fn test_get_statistics() {
        let dir = tempdir().unwrap();
        let sk = SharedKnowledge::new(dir.path()).await.unwrap();

        // Initial stats
        let stats = sk.get_statistics().await.unwrap();
        assert_eq!(stats.total_discoveries, 0);

        // Add discoveries
        for i in 0..5 {
            let discovery = Discovery::BestPractice {
                description: format!("Practice {}", i),
                domain: "test".to_string(),
                rationale: "Test".to_string(),
                tags: vec!["test".to_string()],
            };

            sk.record(discovery, "TestAgent".to_string(), vec![], None).await.unwrap();
        }

        // Check stats
        let stats = sk.get_statistics().await.unwrap();
        assert_eq!(stats.total_discoveries, 5);
    }
}
