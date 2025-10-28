use crate::error::{Error, Result};
use crate::viral::invitation::UserTier;
use serde::{Deserialize, Serialize};

/**
 * Storage Quota Manager
 *
 * DESIGN DECISION: Base storage + viral bonus storage with tier-based caps
 * WHY: Encourage upgrades (higher tiers = higher bonus caps), prevent abuse
 *
 * REASONING CHAIN:
 * 1. Base storage: Free (100MB), Network (500MB), Pro (2GB), Enterprise (10GB)
 * 2. Viral bonus: Network (+10MB/invite), Pro (+20MB/invite), Enterprise (+50MB/invite)
 * 3. Bonus caps: Network (250MB), Pro (1GB), Enterprise (10GB)
 * 4. Example: Pro user with 10 invites = 2GB base + 200MB bonus = 2.2GB total
 * 5. Cap prevents abuse: Pro user with 100 invites = 2GB base + 1GB bonus (capped) = 3GB total
 * 6. Result: Fair system that rewards active users without breaking storage limits
 *
 * PATTERN: Pattern-VIRAL-001 (Storage-Based Viral Growth Mechanics)
 * PERFORMANCE: O(1) quota calculations (simple arithmetic, no database queries)
 */

#[derive(Debug, Clone)]
pub struct StorageQuotaManager {
    _user_id: String, // TODO: Use for Phase 4 authentication and quota tracking
    tier: UserTier,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageStats {
    pub used_mb: u64,
    pub base_mb: u64,
    pub bonus_mb: u64,
    pub total_mb: u64,
    pub percentage_used: f64,
}

#[derive(Debug, thiserror::Error)]
pub enum QuotaError {
    #[error("Storage quota exceeded: {used} MB used, {total} MB available")]
    QuotaExceeded { used: u64, total: u64 },

    #[error("Invalid tier: {0}")]
    InvalidTier(String),

    #[error("Database error: {0}")]
    DatabaseError(String),
}

impl StorageQuotaManager {
    /**
     * Create new storage quota manager
     *
     * PLACEHOLDER: Returns manager with provided tier
     *
     * FULL IMPLEMENTATION (Phase 4):
     * - Load user_id from authentication
     * - Load tier from subscription system
     * - Initialize SQLite connection for quota tracking
     */
    pub fn new(user_id: String, tier: UserTier) -> Self {
        Self { _user_id: user_id, tier }
    }

    /**
     * Get base storage for tier (before viral bonus)
     *
     * BASE STORAGE ALLOCATION:
     * - Free: 100 MB (local-only patterns)
     * - Network: 500 MB (team sync enabled)
     * - Pro: 2 GB (advanced features)
     * - Enterprise: 10 GB (unlimited team, self-hosted option)
     *
     * DESIGN DECISION: Generous free tier (100MB = ~10,000 patterns)
     * WHY: Users need enough storage to experience value before paying
     */
    pub fn get_base_storage(&self) -> u64 {
        match self.tier {
            UserTier::Free => 100,
            UserTier::Network => 500,
            UserTier::Pro => 2000,
            UserTier::Enterprise => 10000,
        }
    }

    /**
     * Get maximum viral bonus for tier
     *
     * BONUS CAPS:
     * - Free: 0 MB (no viral mechanics on free tier)
     * - Network: 250 MB (max 25 invites × 10MB)
     * - Pro: 1000 MB (max 50 invites × 20MB)
     * - Enterprise: 10000 MB (max 200 invites × 50MB)
     *
     * DESIGN DECISION: Caps prevent abuse while allowing meaningful growth
     * WHY: Unlimited bonus = storage abuse risk, caps = sustainable system
     */
    pub fn get_bonus_cap(&self) -> u64 {
        match self.tier {
            UserTier::Free => 0,
            UserTier::Network => 250,
            UserTier::Pro => 1000,
            UserTier::Enterprise => 10000,
        }
    }

    /**
     * Get current storage statistics
     *
     * PLACEHOLDER: Returns hardcoded stats (0 MB used)
     *
     * FULL IMPLEMENTATION (Phase 4):
     * 1. Query SQLite: SELECT SUM(size_bytes) FROM patterns WHERE user_id = ?
     * 2. Query invitations: Calculate viral bonus from accepted invitations
     * 3. Calculate: total = base + min(bonus, cap)
     * 4. Calculate: percentage_used = (used / total) * 100
     * 5. Return StorageStats struct
     */
    pub fn get_storage_stats(&self, bonus_mb: u64) -> Result<StorageStats> {
        let used_mb = 0; // TODO (Phase 4): Query actual usage from SQLite
        let base_mb = self.get_base_storage();
        let bonus_cap = self.get_bonus_cap();
        let capped_bonus = bonus_mb.min(bonus_cap);
        let total_mb = base_mb + capped_bonus;
        let percentage_used = if total_mb > 0 {
            (used_mb as f64 / total_mb as f64) * 100.0
        } else {
            0.0
        };

        Ok(StorageStats {
            used_mb,
            base_mb,
            bonus_mb: capped_bonus,
            total_mb,
            percentage_used,
        })
    }

    /**
     * Check if user can store additional data
     *
     * PLACEHOLDER: Always returns true (no quota enforcement)
     *
     * FULL IMPLEMENTATION (Phase 4):
     * 1. Get current usage: used_mb
     * 2. Get total quota: base_mb + bonus_mb
     * 3. Check: used_mb + size_mb <= total_mb
     * 4. Return: true if space available, false otherwise
     * 5. Suggest upgrade if near quota: "Upgrade to Pro for 2GB storage"
     *
     * SOFT LIMITS:
     * - 80% used: Show warning ("Storage almost full")
     * - 95% used: Show upgrade prompt
     * - 100% used: Block new uploads, allow deletion
     *
     * PATTERN: Pattern-VIRAL-001 (Storage incentivizes invitations)
     */
    pub fn can_store(&self, size_mb: u64, current_bonus_mb: u64) -> Result<bool> {
        let stats = self.get_storage_stats(current_bonus_mb)?;

        if stats.used_mb + size_mb > stats.total_mb {
            Err(Error::Internal(format!(
                "Storage quota exceeded: {} MB used, {} MB available",
                stats.used_mb + size_mb,
                stats.total_mb
            )))
        } else {
            Ok(true)
        }
    }
}

// ============================================================================
// FULL IMPLEMENTATION ROADMAP (Phase 4)
// ============================================================================

/**
 * Phase 4 Implementation Tasks:
 *
 * 1. SQLite Schema:
 *    - patterns table: Add size_bytes column for quota tracking
 *    - storage_quotas table: (user_id, used_mb, base_mb, bonus_mb, updated_at)
 *
 * 2. Quota Enforcement:
 *    - Hook into pattern storage: Check can_store() before inserting
 *    - Update used_mb on pattern insert/delete
 *    - Trigger quota recalculation on invitation acceptance
 *
 * 3. UI Integration (products/lumina-desktop/src/components/StorageQuotaBar.tsx):
 *    - Progress bar showing used / total
 *    - Color coding: green (<80%), yellow (80-95%), red (>95%)
 *    - Tooltip: "500 MB base + 200 MB bonus (from 10 invitations)"
 *    - Upgrade prompt: "Get 2GB storage - Upgrade to Pro"
 *
 * 4. Soft Limit Warnings:
 *    - 80% used: Toast notification ("Storage 80% full")
 *    - 95% used: Modal prompt ("Almost out of space - Invite friends or upgrade")
 *    - 100% used: Block new uploads with clear message
 *
 * 5. Analytics:
 *    - Track quota utilization by tier
 *    - Identify power users (>80% usage) for targeted upgrades
 *    - Measure invitation effectiveness (bonus MB granted vs quota increases)
 *
 * ESTIMATED EFFORT: 2-3 hours (quota enforcement + UI)
 * DEPENDS ON: SQLite patterns table, InvitationManager integration
 */

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_base_storage_allocation() {
        assert_eq!(StorageQuotaManager::new("u1".to_string(), UserTier::Free).get_base_storage(), 100);
        assert_eq!(StorageQuotaManager::new("u2".to_string(), UserTier::Network).get_base_storage(), 500);
        assert_eq!(StorageQuotaManager::new("u3".to_string(), UserTier::Pro).get_base_storage(), 2000);
        assert_eq!(StorageQuotaManager::new("u4".to_string(), UserTier::Enterprise).get_base_storage(), 10000);
    }

    #[test]
    fn test_bonus_caps() {
        assert_eq!(StorageQuotaManager::new("u1".to_string(), UserTier::Free).get_bonus_cap(), 0);
        assert_eq!(StorageQuotaManager::new("u2".to_string(), UserTier::Network).get_bonus_cap(), 250);
        assert_eq!(StorageQuotaManager::new("u3".to_string(), UserTier::Pro).get_bonus_cap(), 1000);
        assert_eq!(StorageQuotaManager::new("u4".to_string(), UserTier::Enterprise).get_bonus_cap(), 10000);
    }

    #[test]
    fn test_storage_stats_with_no_bonus() {
        let manager = StorageQuotaManager::new("user123".to_string(), UserTier::Pro);
        let stats = manager.get_storage_stats(0).unwrap();

        assert_eq!(stats.used_mb, 0); // Placeholder: no actual usage yet
        assert_eq!(stats.base_mb, 2000); // Pro tier base
        assert_eq!(stats.bonus_mb, 0); // No invitations
        assert_eq!(stats.total_mb, 2000); // base + bonus
        assert_eq!(stats.percentage_used, 0.0);
    }

    #[test]
    fn test_storage_stats_with_bonus_under_cap() {
        let manager = StorageQuotaManager::new("user123".to_string(), UserTier::Pro);
        let stats = manager.get_storage_stats(200).unwrap(); // 10 invites × 20MB

        assert_eq!(stats.base_mb, 2000);
        assert_eq!(stats.bonus_mb, 200); // Under cap (1000 MB)
        assert_eq!(stats.total_mb, 2200);
    }

    #[test]
    fn test_storage_stats_with_bonus_exceeding_cap() {
        let manager = StorageQuotaManager::new("user123".to_string(), UserTier::Pro);
        let stats = manager.get_storage_stats(1500).unwrap(); // 75 invites × 20MB = 1500MB

        assert_eq!(stats.base_mb, 2000);
        assert_eq!(stats.bonus_mb, 1000); // Capped at 1000 MB
        assert_eq!(stats.total_mb, 3000); // base + capped bonus
    }

    #[test]
    fn test_can_store_within_quota() {
        let manager = StorageQuotaManager::new("user123".to_string(), UserTier::Pro);
        let result = manager.can_store(500, 200); // Storing 500MB with 200MB bonus

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), true);
    }

    #[test]
    fn test_can_store_exceeding_quota() {
        let manager = StorageQuotaManager::new("user123".to_string(), UserTier::Free);
        let result = manager.can_store(200, 0); // Storing 200MB with 100MB quota

        assert!(result.is_err());
    }
}
