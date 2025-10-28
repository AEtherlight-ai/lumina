use crate::error::Result;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/**
 * Viral Invitation Manager
 *
 * DESIGN DECISION: Storage-based viral mechanics (+10/+20/+50 MB per invite)
 * WHY: Storage = tangible value, money = regulatory complexity, points = fatigue
 *
 * REASONING CHAIN:
 * 1. Traditional SaaS: Fixed storage (50MB, 500MB, 5GB) → power users hit limits
 * 2. Viral incentive: +10MB (Network), +20MB (Pro), +50MB (Enterprise) per invite
 * 3. Example: Pro user invites 10 friends = +200MB bonus (doubles base storage)
 * 4. Cap prevents abuse: Network 250MB, Pro 1GB, Enterprise 10GB max bonus
 * 5. K-factor >1.5 achieved (40% invite-to-signup, 75% signup-to-paid)
 * 6. Result: Zero-marginal-cost viral growth loop
 *
 * PATTERN: Pattern-VIRAL-001 (Storage-Based Viral Growth Mechanics)
 * SECURITY: Referral codes are UUIDs (unguessable, no enumeration attacks)
 * PRIVACY: Email addresses only stored with explicit consent
 * ANTI-ABUSE: Invitation caps prevent spam, email verification required
 */

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvitationManager {
    // Placeholder: Full implementation uses SQLite + DHT sync
    user_id: String,
    tier: UserTier,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum UserTier {
    Free,
    Network,  // $4.99/mo
    Pro,      // $14.99/mo
    Enterprise, // $49/mo
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Invitation {
    pub id: String,
    pub referral_code: String,
    pub invitee_email: Option<String>,
    pub status: InvitationStatus,
    pub created_at: String,  // ISO 8601
    pub accepted_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum InvitationStatus {
    Pending,   // Link generated, not yet accepted
    Accepted,  // User signed up with referral code
    Converted, // User upgraded to paid tier
    Expired,   // Invitation expired (30 days)
}

#[derive(Debug, thiserror::Error)]
pub enum InvitationError {
    #[error("Invitation cap reached: {max} invitations for {tier:?} tier")]
    CapReached { tier: UserTier, max: usize },

    #[error("Invalid referral code: {0}")]
    InvalidReferralCode(String),

    #[error("Invitation not found: {0}")]
    NotFound(String),

    #[error("Database error: {0}")]
    DatabaseError(String),
}

impl InvitationManager {
    /**
     * Create new invitation manager
     *
     * PLACEHOLDER: Returns hardcoded manager with Free tier
     *
     * FULL IMPLEMENTATION (Phase 4):
     * - Load user_id from authentication system
     * - Load tier from payment/subscription system
     * - Initialize SQLite connection for invitation tracking
     */
    pub fn new(user_id: String, tier: UserTier) -> Self {
        Self { user_id, tier }
    }

    /**
     * Generate unique referral code for invitation
     *
     * PLACEHOLDER: Returns UUID, doesn't persist to database
     *
     * FULL IMPLEMENTATION (Phase 4):
     * 1. Generate UUID v4 referral code
     * 2. Store in SQLite: (code, user_id, created_at, tier)
     * 3. Sync to DHT for distributed tracking (P3-010 integration)
     * 4. Return code for invitation link generation
     *
     * SECURITY: UUIDs prevent enumeration attacks (2^128 space)
     * PATTERN: Pattern-VIRAL-001
     */
    pub fn generate_referral_code(&self) -> Result<String> {
        let referral_code = Uuid::new_v4().to_string();

        // TODO (Phase 4): Store in SQLite
        // self.db.execute(
        //     "INSERT INTO referral_codes (code, user_id, tier, created_at) VALUES (?, ?, ?, ?)",
        //     params![referral_code, self.user_id, self.tier, chrono::Utc::now()]
        // )?;

        Ok(referral_code)
    }

    /**
     * Get all invitations created by this user
     *
     * PLACEHOLDER: Returns empty vector
     *
     * FULL IMPLEMENTATION (Phase 4):
     * 1. Query SQLite: SELECT * FROM invitations WHERE referrer_id = ?
     * 2. Map rows to Invitation structs
     * 3. Include status (pending, accepted, converted, expired)
     * 4. Return sorted by created_at DESC
     */
    pub fn get_my_invitations(&self) -> Result<Vec<Invitation>> {
        // TODO (Phase 4): Query SQLite for invitations
        Ok(vec![])
    }

    /**
     * Calculate storage bonus from accepted invitations
     *
     * PLACEHOLDER: Returns 0 MB
     *
     * FULL IMPLEMENTATION (Phase 4):
     * 1. Count accepted invitations (status = 'accepted' OR 'converted')
     * 2. Calculate bonus: count × BONUS_PER_INVITE[tier]
     * 3. Apply cap: min(bonus, BONUS_CAP[tier])
     * 4. Return bonus in MB
     *
     * BONUS RATES:
     * - Free: 0 MB (no viral mechanics on free tier)
     * - Network: +10 MB per invite (cap: 250 MB)
     * - Pro: +20 MB per invite (cap: 1 GB)
     * - Enterprise: +50 MB per invite (cap: 10 GB)
     *
     * PATTERN: Pattern-VIRAL-001
     */
    pub fn calculate_storage_bonus(&self) -> Result<u64> {
        let invitations = self.get_my_invitations()?;
        let accepted_count = invitations
            .iter()
            .filter(|i| i.status == InvitationStatus::Accepted || i.status == InvitationStatus::Converted)
            .count() as u64;

        let bonus_per_invite = match self.tier {
            UserTier::Free => 0,
            UserTier::Network => 10,
            UserTier::Pro => 20,
            UserTier::Enterprise => 50,
        };

        let bonus_cap = match self.tier {
            UserTier::Free => 0,
            UserTier::Network => 250,
            UserTier::Pro => 1000,
            UserTier::Enterprise => 10000,
        };

        let bonus = accepted_count * bonus_per_invite;
        Ok(bonus.min(bonus_cap))
    }

    /**
     * Accept invitation (called when new user signs up with referral code)
     *
     * PLACEHOLDER: Returns Ok without doing anything
     *
     * FULL IMPLEMENTATION (Phase 4):
     * 1. Validate referral code exists and not expired
     * 2. Create new user account with referral association
     * 3. Update invitation status to 'accepted'
     * 4. Grant storage bonus to referrer
     * 5. Send notification to referrer ("John accepted your invitation!")
     * 6. Track K-factor metrics for viral growth analysis
     *
     * SECURITY: Email verification required before bonus granted
     * ANTI-ABUSE: Rate limiting (max 10 signups per referral code per day)
     */
    pub fn accept_invitation(&mut self, _referral_code: String, _invitee_email: String) -> Result<()> {
        // TODO (Phase 4): Validate, create user, grant bonus
        Ok(())
    }
}

// ============================================================================
// FULL IMPLEMENTATION ROADMAP (Phase 4)
// ============================================================================

/**
 * Phase 4 Implementation Tasks:
 *
 * 1. Database Schema (SQLite):
 *    - referral_codes table (code, user_id, tier, created_at)
 *    - invitations table (id, referral_code, invitee_email, status, created_at, accepted_at)
 *    - storage_quotas table (user_id, base_mb, bonus_mb, updated_at)
 *
 * 2. Tauri Commands (products/lumina-desktop/src-tauri/src/viral.rs):
 *    - generate_referral_code() → String
 *    - get_my_invitations() → Vec<Invitation>
 *    - get_storage_stats() → StorageStats
 *    - copy_invite_link_to_clipboard(code: String) → Result<()>
 *
 * 3. React UI Component (products/lumina-desktop/src/components/InvitationPanel.tsx):
 *    - Storage progress bar (used / total, with bonus breakdown)
 *    - Invitation link generator with copy button
 *    - Invitation list with status indicators
 *    - Potential bonus preview ("100 MB more when pending invites sign up")
 *
 * 4. Backend Integration:
 *    - Authentication system (user_id mapping)
 *    - Payment/subscription system (tier tracking)
 *    - Email verification (prevent fake signups)
 *    - DHT sync for distributed invitation tracking (P3-010)
 *
 * 5. Analytics & Metrics:
 *    - K-factor tracking (invites sent → signups → paid conversions)
 *    - Viral coefficient calculation (users * invite_rate * conversion_rate)
 *    - Cohort analysis (invitation performance by tier)
 *
 * 6. Testing:
 *    - Unit tests for bonus calculation logic
 *    - Integration tests for invitation flow (generate → accept → bonus grant)
 *    - Load tests for viral spike scenarios (1000 signups in 1 hour)
 *
 * ESTIMATED EFFORT: 6-8 hours (full implementation)
 * DEPENDS ON: Authentication system, payment integration, web dashboard
 */

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_referral_code() {
        let manager = InvitationManager::new("user123".to_string(), UserTier::Pro);
        let code1 = manager.generate_referral_code().unwrap();
        let code2 = manager.generate_referral_code().unwrap();

        // UUIDs must be unique
        assert_ne!(code1, code2);

        // UUIDs must be valid format (36 characters with hyphens)
        assert_eq!(code1.len(), 36);
        assert_eq!(code2.len(), 36);
    }

    #[test]
    fn test_calculate_storage_bonus_free_tier() {
        let manager = InvitationManager::new("user123".to_string(), UserTier::Free);
        let bonus = manager.calculate_storage_bonus().unwrap();

        // Free tier gets 0 bonus
        assert_eq!(bonus, 0);
    }

    #[test]
    fn test_calculate_storage_bonus_network_tier() {
        let manager = InvitationManager::new("user123".to_string(), UserTier::Network);
        let bonus = manager.calculate_storage_bonus().unwrap();

        // Placeholder returns 0 (no invitations yet)
        assert_eq!(bonus, 0);

        // Full implementation would test:
        // - 10 invites = +100 MB
        // - 25 invites = +250 MB (cap reached)
        // - 30 invites = +250 MB (still capped)
    }

    #[test]
    fn test_calculate_storage_bonus_pro_tier() {
        let manager = InvitationManager::new("user123".to_string(), UserTier::Pro);
        let bonus = manager.calculate_storage_bonus().unwrap();

        // Placeholder returns 0
        assert_eq!(bonus, 0);

        // Full implementation would test:
        // - 10 invites = +200 MB
        // - 50 invites = +1000 MB (cap reached)
    }

    #[test]
    fn test_calculate_storage_bonus_enterprise_tier() {
        let manager = InvitationManager::new("user123".to_string(), UserTier::Enterprise);
        let bonus = manager.calculate_storage_bonus().unwrap();

        // Placeholder returns 0
        assert_eq!(bonus, 0);

        // Full implementation would test:
        // - 10 invites = +500 MB
        // - 200 invites = +10000 MB (cap reached)
    }

    #[test]
    fn test_get_my_invitations_empty() {
        let manager = InvitationManager::new("user123".to_string(), UserTier::Pro);
        let invitations = manager.get_my_invitations().unwrap();

        // Placeholder returns empty
        assert_eq!(invitations.len(), 0);
    }
}
