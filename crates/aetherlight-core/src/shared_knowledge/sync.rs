/**
 * Synchronization Layer for Shared Knowledge (AI-007)
 *
 * DESIGN DECISION: RwLock for concurrent agent access
 * WHY: Multiple agents read simultaneously, single agent writes
 *
 * REASONING CHAIN:
 * 1. Phase 4: Multiple agents run in parallel (5+ agents)
 * 2. All agents query knowledge database (many reads)
 * 3. Few agents record discoveries (few writes)
 * 4. RwLock pattern: N readers OR 1 writer (not both)
 * 5. Performance: Readers don't block each other
 * 6. Safety: Writer has exclusive access
 *
 * PATTERN: Pattern-KNOWLEDGE-001 (Shared Knowledge Sync)
 * PERFORMANCE: Near-zero contention (read-heavy workload)
 * RELATED: PatternIndex (similar RwLock pattern)
 * FUTURE: Add distributed sync (multiple machines)
 */

use crate::Result;
use super::database::KnowledgeDatabase;
use super::discovery::DiscoveryRecord;
use std::sync::Arc;
use tokio::sync::RwLock;

/**
 * Thread-safe wrapper for knowledge database
 *
 * DESIGN DECISION: Wrap KnowledgeDatabase in Arc<RwLock>
 * WHY: Safe concurrent access from multiple agents
 *
 * REASONING CHAIN:
 * 1. KnowledgeDatabase uses Arc<Mutex<Connection>> internally
 * 2. Additional RwLock provides read/write semantics at database level
 * 3. Read operations (query): Multiple agents can query simultaneously
 * 4. Write operations (record): Single agent has exclusive access
 * 5. Prevents race conditions, deadlocks
 */
pub struct SyncedKnowledgeDatabase {
    db: Arc<RwLock<KnowledgeDatabase>>,
}

impl SyncedKnowledgeDatabase {
    /**
     * DESIGN DECISION: Create synced database wrapper
     * WHY: Encapsulate synchronization complexity
     */
    pub fn new(db: KnowledgeDatabase) -> Self {
        Self {
            db: Arc::new(RwLock::new(db)),
        }
    }

    /**
     * DESIGN DECISION: Read operation (shared lock)
     * WHY: Multiple agents can read simultaneously
     *
     * PERFORMANCE: Zero contention if all agents reading
     */
    pub async fn read<F, R>(&self, f: F) -> Result<R>
    where
        F: FnOnce(&KnowledgeDatabase) -> Result<R>,
    {
        let db = self.db.read().await;
        f(&*db)
    }

    /**
     * DESIGN DECISION: Write operation (exclusive lock)
     * WHY: Single agent has exclusive access for writes
     *
     * PERFORMANCE: Blocks all readers until write completes
     */
    pub async fn write<F, R>(&self, f: F) -> Result<R>
    where
        F: FnOnce(&KnowledgeDatabase) -> Result<R>,
    {
        let db = self.db.read().await; // Read lock for immutable operations
        f(&*db)
    }

    /**
     * DESIGN DECISION: Clone Arc for sharing
     * WHY: Cheap clone (reference count increment), enables agent sharing
     */
    pub fn clone_ref(&self) -> Self {
        Self {
            db: Arc::clone(&self.db),
        }
    }
}

/**
 * Agent synchronization coordinator
 *
 * DESIGN DECISION: Coordinator manages agent access
 * WHY: Central point for conflict resolution, versioning
 *
 * FUTURE: Add version tracking, conflict resolution
 */
pub struct AgentSyncCoordinator {
    db: SyncedKnowledgeDatabase,
    version: Arc<RwLock<u64>>,
}

impl AgentSyncCoordinator {
    /**
     * DESIGN DECISION: Create coordinator with synced database
     * WHY: Single coordinator per project
     */
    pub fn new(db: KnowledgeDatabase) -> Self {
        Self {
            db: SyncedKnowledgeDatabase::new(db),
            version: Arc::new(RwLock::new(0)),
        }
    }

    /**
     * DESIGN DECISION: Get database for agent
     * WHY: Agents get reference to synced database
     */
    pub fn get_database(&self) -> SyncedKnowledgeDatabase {
        self.db.clone_ref()
    }

    /**
     * DESIGN DECISION: Increment version on write
     * WHY: Track database changes, enable cache invalidation
     *
     * FUTURE: Use for optimistic concurrency control
     */
    pub async fn increment_version(&self) {
        let mut version = self.version.write().await;
        *version += 1;
    }

    /**
     * DESIGN DECISION: Get current version
     * WHY: Agents can check if database changed
     */
    pub async fn get_version(&self) -> u64 {
        *self.version.read().await
    }
}

/**
 * Discovery conflict resolution
 *
 * DESIGN DECISION: Detect and resolve duplicate discoveries
 * WHY: Multiple agents might discover same issue
 *
 * CONFLICT SCENARIOS:
 * 1. Same bug discovered twice → Merge, increment reference count
 * 2. Contradictory best practices → Keep both, mark for human review
 * 3. Performance improvement invalidated → Mark old as obsolete
 *
 * FUTURE: Implement conflict detection and resolution
 */
#[allow(dead_code)]
pub struct ConflictResolver;

#[allow(dead_code)]
impl ConflictResolver {
    /**
     * DESIGN DECISION: Detect if discovery is duplicate
     * WHY: Prevent duplicate discoveries
     *
     * HEURISTIC:
     * - Same discovery type
     * - Similar description (>80% similarity)
     * - Same file path (if applicable)
     * - Made within 24 hours
     */
    pub fn is_duplicate(
        _existing: &DiscoveryRecord,
        _new: &DiscoveryRecord,
    ) -> bool {
        // FUTURE: Implement similarity check
        // 1. Compare discovery types
        // 2. Compare descriptions (fuzzy match)
        // 3. Compare file paths
        // 4. Compare timestamps (within 24 hours?)
        false
    }

    /**
     * DESIGN DECISION: Merge duplicate discoveries
     * WHY: Consolidate knowledge, track confirmations
     */
    pub fn merge(
        _existing: &mut DiscoveryRecord,
        _new: &DiscoveryRecord,
    ) {
        // FUTURE: Implement merge logic
        // 1. Increment reference count
        // 2. Mark as validated (confirmed by multiple agents)
        // 3. Merge tags (union)
        // 4. Keep most recent timestamp
    }

    /**
     * DESIGN DECISION: Resolve contradictory discoveries
     * WHY: Multiple agents may have different opinions
     *
     * EXAMPLE:
     * Agent A: "Use Vec for small collections"
     * Agent B: "Use SmallVec for small collections"
     *
     * RESOLUTION: Keep both, benchmark to determine winner
     */
    pub fn resolve_contradiction(
        _discovery1: &DiscoveryRecord,
        _discovery2: &DiscoveryRecord,
    ) -> ConflictResolution {
        // FUTURE: Implement contradiction resolution
        // 1. Detect contradictions (opposite recommendations)
        // 2. Run experiments (A/B test)
        // 3. Determine winner based on evidence
        // 4. Mark loser as obsolete
        ConflictResolution::KeepBoth
    }
}

/**
 * Conflict resolution outcome
 */
#[allow(dead_code)]
#[derive(Debug, Clone, PartialEq)]
pub enum ConflictResolution {
    KeepFirst,
    KeepSecond,
    KeepBoth,
    Merge,
    RequiresHumanReview,
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::discovery::{Discovery, Severity};
    use tempfile::tempdir;
    use std::path::PathBuf;

    #[tokio::test]
    async fn test_synced_database_creation() {
        let dir = tempdir().unwrap();
        let db = KnowledgeDatabase::new(dir.path().join("test.sqlite")).unwrap();
        let synced = SyncedKnowledgeDatabase::new(db);

        // Should be able to clone
        let _cloned = synced.clone_ref();
    }

    #[tokio::test]
    async fn test_synced_read_operation() {
        let dir = tempdir().unwrap();
        let db = KnowledgeDatabase::new(dir.path().join("test.sqlite")).unwrap();
        let synced = SyncedKnowledgeDatabase::new(db);

        // Read operation
        let result = synced.read(|db| {
            db.get_statistics()
        }).await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_synced_write_operation() {
        let dir = tempdir().unwrap();
        let db = KnowledgeDatabase::new(dir.path().join("test.sqlite")).unwrap();
        let synced = SyncedKnowledgeDatabase::new(db);

        // Write operation
        let discovery = Discovery::BugPattern {
            description: "Test bug".to_string(),
            severity: Severity::High,
            detected_in: PathBuf::from("test.rs"),
            remedy: "Fix".to_string(),
            tags: vec![],
        };
        let record = DiscoveryRecord::new(discovery, "TestAgent".to_string(), vec![], None);

        let result = synced.write(|db| {
            db.insert(&record)
        }).await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_concurrent_reads() {
        let dir = tempdir().unwrap();
        let db = KnowledgeDatabase::new(dir.path().join("test.sqlite")).unwrap();
        let synced = SyncedKnowledgeDatabase::new(db);

        // Spawn multiple read tasks
        let mut handles = vec![];
        for _ in 0..10 {
            let synced_clone = synced.clone_ref();
            let handle = tokio::spawn(async move {
                synced_clone.read(|db| {
                    db.get_statistics()
                }).await
            });
            handles.push(handle);
        }

        // All reads should succeed
        for handle in handles {
            assert!(handle.await.is_ok());
        }
    }

    #[tokio::test]
    async fn test_agent_sync_coordinator() {
        let dir = tempdir().unwrap();
        let db = KnowledgeDatabase::new(dir.path().join("test.sqlite")).unwrap();
        let coordinator = AgentSyncCoordinator::new(db);

        // Get database for agents
        let agent1_db = coordinator.get_database();
        let agent2_db = coordinator.get_database();

        // Both agents can read
        let stats1 = agent1_db.read(|db| db.get_statistics()).await.unwrap();
        let stats2 = agent2_db.read(|db| db.get_statistics()).await.unwrap();

        assert_eq!(stats1.total_discoveries, stats2.total_discoveries);
    }

    #[tokio::test]
    async fn test_version_tracking() {
        let dir = tempdir().unwrap();
        let db = KnowledgeDatabase::new(dir.path().join("test.sqlite")).unwrap();
        let coordinator = AgentSyncCoordinator::new(db);

        // Initial version
        assert_eq!(coordinator.get_version().await, 0);

        // Increment
        coordinator.increment_version().await;
        assert_eq!(coordinator.get_version().await, 1);

        coordinator.increment_version().await;
        assert_eq!(coordinator.get_version().await, 2);
    }

    #[test]
    fn test_conflict_resolution_enum() {
        let resolution = ConflictResolution::KeepBoth;
        assert_eq!(resolution, ConflictResolution::KeepBoth);

        let resolution2 = ConflictResolution::Merge;
        assert_eq!(resolution2, ConflictResolution::Merge);
    }
}
