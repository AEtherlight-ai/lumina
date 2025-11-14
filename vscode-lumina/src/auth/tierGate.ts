/**
 * TierGate: Feature gating based on user tier
 *
 * BUG-011: Tier-based feature access control
 * Date: 2025-11-13
 *
 * DESIGN DECISION: Free tier can use all features EXCEPT voice capture
 * WHY: Voice capture uses OpenAI Whisper API (costs money per token)
 *
 * REASONING CHAIN:
 * 1. Free tier users get all features except voice capture (no cost to us)
 * 2. Voice capture requires OpenAI API calls (costs us $$$)
 * 3. Paid tiers (network, pro, enterprise) get everything including voice capture
 * 4. Offline mode = same as free tier (can't validate tokens)
 * 5. Centralized feature gate configuration (easy to update tiers)
 *
 * PATTERN: Pattern-FEATURE-GATING-001
 * RELATED: licenseValidator.ts (tier validation), extension.ts (activation)
 * USAGE: Check canUseFeature() before enabling features
 */

/**
 * Feature gate definitions by tier
 *
 * DESIGN DECISION: Explicit feature map per tier (clear permissions)
 * WHY: Makes it obvious what each tier can access, easy to audit
 *
 * Free Tier: All features EXCEPT voice capture
 * - sprintPanel: ✅ (helps developers plan work)
 * - codeAnalyzer: ✅ (helps find bugs)
 * - taskTracking: ✅ (helps track progress)
 * - workspaceAnalysis: ✅ (helps understand codebases)
 * - voiceCapture: ❌ (costs us money via OpenAI API)
 *
 * Paid Tiers (Network/Pro/Enterprise): All features enabled
 * - Everything free tier has PLUS voice capture
 *
 * Offline Mode: Same as free tier (can't validate tokens for voice capture)
 */
const FEATURE_GATES = {
  free: {
    voiceCapture: false,
    sprintPanel: true,
    codeAnalyzer: true,
    taskTracking: true,
    workspaceAnalysis: true
  },
  network: {
    voiceCapture: true,
    sprintPanel: true,
    codeAnalyzer: true,
    taskTracking: true,
    workspaceAnalysis: true
  },
  pro: {
    voiceCapture: true,
    sprintPanel: true,
    codeAnalyzer: true,
    taskTracking: true,
    workspaceAnalysis: true
  },
  enterprise: {
    voiceCapture: true,
    sprintPanel: true,
    codeAnalyzer: true,
    taskTracking: true,
    workspaceAnalysis: true
  },
  offline: {
    // In offline mode, allow all features except voice capture
    // WHY: Can't validate tokens when offline (can't charge for voice usage)
    voiceCapture: false,
    sprintPanel: true,
    codeAnalyzer: true,
    taskTracking: true,
    workspaceAnalysis: true
  }
};

/**
 * TierGate: Feature gating based on user tier
 *
 * Chain of Thought:
 * - Why: Need to block voice capture for free tier users
 * - Pattern: Centralized feature gate configuration
 * - Usage: Check canUseFeature() before enabling features
 * - Integration: Set tier after license validation, check before commands
 */
export class TierGate {
  private userTier: keyof typeof FEATURE_GATES | null = null;

  /**
   * Sets the user's tier (after license validation)
   *
   * @param tier - User tier from license validation
   */
  setUserTier(tier: keyof typeof FEATURE_GATES): void {
    this.userTier = tier;
    console.log(`[TierGate] User tier set to: ${tier}`);
  }

  /**
   * Checks if user can use a specific feature
   *
   * @param feature - Feature name to check
   * @returns true if user can use feature, false otherwise
   * @throws Error if tier not set
   */
  canUseFeature(feature: keyof typeof FEATURE_GATES['free']): boolean {
    if (!this.userTier) {
      throw new Error('User tier not set. Call setUserTier() first.');
    }

    const allowed = FEATURE_GATES[this.userTier][feature];
    console.log(`[TierGate] Feature '${feature}' for tier '${this.userTier}': ${allowed ? 'ALLOWED' : 'BLOCKED'}`);
    return allowed;
  }

  /**
   * Gets all feature gates for current tier
   *
   * @returns Object with all feature gates
   * @throws Error if tier not set
   */
  getFeatureGates(): Record<string, boolean> {
    if (!this.userTier) {
      throw new Error('User tier not set. Call setUserTier() first.');
    }

    return FEATURE_GATES[this.userTier];
  }

  /**
   * Gets current user tier
   *
   * @returns Current tier or null if not set
   */
  getUserTier(): keyof typeof FEATURE_GATES | null {
    return this.userTier;
  }
}
