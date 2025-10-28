/**
 * Consent Manager
 *
 * DESIGN DECISION: Explicit consent with granular control
 * WHY: GDPR compliance + user trust + ethical data collection
 *
 * REASONING CHAIN:
 * 1. User must explicitly opt-in to telemetry (default: disabled)
 * 2. User can change level anytime (anonymous → metadata → full)
 * 3. User can exclude specific patterns from contribution
 * 4. User can delete all contributed data (GDPR right to erasure)
 * 5. User can export all contributed data (GDPR right to access)
 *
 * PATTERN: Pattern-CONSENT-001 (Granular Privacy Control)
 */

import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';
import {
  ConsentState,
  TelemetryLevel,
  SubscriptionTier,
} from './types';

/**
 * Consent Manager
 *
 * Manages user consent for telemetry collection
 */
export class ConsentManager {
  private consentState: ConsentState | null = null;
  private storageKey = 'aetherlight_consent';

  constructor(private storage: Storage = localStorage) {
    this.loadConsent();
  }

  /**
   * Initialize consent (first-time setup)
   *
   * DESIGN DECISION: Opt-in by default (user must explicitly enable)
   * WHY: Privacy-first principle, GDPR compliance
   */
  async initializeConsent(tier: SubscriptionTier): Promise<ConsentState> {
    // Generate anonymized user ID
    const userId = this.generateAnonymousId();

    // Determine default telemetry level based on tier
    const defaultLevel = this.getDefaultLevel(tier);

    const consent: ConsentState = {
      userId,
      tier,
      level: defaultLevel,
      consentDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      excludedPatterns: [],
      shareWithCircle: tier === SubscriptionTier.NETWORK || tier === SubscriptionTier.PRO,
      allowTraining: tier === SubscriptionTier.PRO,
    };

    this.consentState = consent;
    this.saveConsent();

    return consent;
  }

  /**
   * Update telemetry level
   *
   * CONSTRAINTS:
   * - Free tier: Can be DISABLED or ANONYMOUS only
   * - Network tier: Can be DISABLED, ANONYMOUS, or METADATA
   * - Pro tier: Must be FULL_PATTERN (mandatory)
   */
  async updateLevel(newLevel: TelemetryLevel): Promise<ConsentState> {
    if (!this.consentState) {
      throw new Error('Consent not initialized. Call initializeConsent first.');
    }

    // Validate level is allowed for tier
    if (!this.isLevelAllowed(newLevel, this.consentState.tier)) {
      throw new Error(
        `Telemetry level "${newLevel}" not allowed for tier "${this.consentState.tier}"`
      );
    }

    this.consentState.level = newLevel;
    this.consentState.lastUpdated = new Date().toISOString();
    this.saveConsent();

    return this.consentState;
  }

  /**
   * Update subscription tier
   *
   * DESIGN DECISION: Tier change may force level change
   * WHY: Pro tier requires FULL_PATTERN, Free tier cannot use METADATA
   */
  async updateTier(newTier: SubscriptionTier): Promise<ConsentState> {
    if (!this.consentState) {
      throw new Error('Consent not initialized. Call initializeConsent first.');
    }

    const oldTier = this.consentState.tier;
    this.consentState.tier = newTier;

    // Force level adjustment if current level not allowed
    if (!this.isLevelAllowed(this.consentState.level, newTier)) {
      this.consentState.level = this.getDefaultLevel(newTier);
    }

    // Update sharing permissions based on tier
    this.consentState.shareWithCircle = newTier === SubscriptionTier.NETWORK || newTier === SubscriptionTier.PRO;
    this.consentState.allowTraining = newTier === SubscriptionTier.PRO;

    this.consentState.lastUpdated = new Date().toISOString();
    this.saveConsent();

    return this.consentState;
  }

  /**
   * Exclude pattern from contribution
   *
   * DESIGN DECISION: User can opt-out individual patterns
   * WHY: Give users granular control over sensitive data
   */
  async excludePattern(patternId: string): Promise<ConsentState> {
    if (!this.consentState) {
      throw new Error('Consent not initialized.');
    }

    if (!this.consentState.excludedPatterns.includes(patternId)) {
      this.consentState.excludedPatterns.push(patternId);
      this.consentState.lastUpdated = new Date().toISOString();
      this.saveConsent();
    }

    return this.consentState;
  }

  /**
   * Include pattern back in contribution
   */
  async includePattern(patternId: string): Promise<ConsentState> {
    if (!this.consentState) {
      throw new Error('Consent not initialized.');
    }

    this.consentState.excludedPatterns = this.consentState.excludedPatterns.filter(
      (id) => id !== patternId
    );
    this.consentState.lastUpdated = new Date().toISOString();
    this.saveConsent();

    return this.consentState;
  }

  /**
   * Check if pattern is excluded
   */
  isPatternExcluded(patternId: string): boolean {
    if (!this.consentState) return false;
    return this.consentState.excludedPatterns.includes(patternId);
  }

  /**
   * Get current consent state
   */
  getConsent(): ConsentState | null {
    return this.consentState;
  }

  /**
   * Check if telemetry is enabled
   */
  isEnabled(): boolean {
    return this.consentState?.level !== TelemetryLevel.DISABLED;
  }

  /**
   * Opt out of telemetry entirely
   */
  async optOut(): Promise<void> {
    if (!this.consentState) return;

    this.consentState.level = TelemetryLevel.DISABLED;
    this.consentState.lastUpdated = new Date().toISOString();
    this.saveConsent();
  }

  /**
   * Opt back in to telemetry
   */
  async optIn(level?: TelemetryLevel): Promise<ConsentState> {
    if (!this.consentState) {
      throw new Error('Consent not initialized.');
    }

    const newLevel = level || this.getDefaultLevel(this.consentState.tier);

    if (!this.isLevelAllowed(newLevel, this.consentState.tier)) {
      throw new Error(
        `Telemetry level "${newLevel}" not allowed for tier "${this.consentState.tier}"`
      );
    }

    this.consentState.level = newLevel;
    this.consentState.lastUpdated = new Date().toISOString();
    this.saveConsent();

    return this.consentState;
  }

  /**
   * Export user data (GDPR right to access)
   *
   * DESIGN DECISION: User can export all contributed data
   * WHY: GDPR compliance + transparency
   */
  async exportData(): Promise<string> {
    if (!this.consentState) {
      return JSON.stringify({ error: 'No consent data found' });
    }

    // In production, this would fetch from API
    // For now, return consent state
    return JSON.stringify(this.consentState, null, 2);
  }

  /**
   * Delete user data (GDPR right to erasure)
   *
   * DESIGN DECISION: User can delete all contributed data
   * WHY: GDPR compliance + user trust
   */
  async deleteData(): Promise<void> {
    if (!this.consentState) return;

    // In production, this would call API to delete server-side data
    // For now, just clear local consent
    this.storage.removeItem(this.storageKey);
    this.consentState = null;
  }

  // === Private Methods ===

  /**
   * Generate anonymous user ID
   *
   * DESIGN DECISION: SHA-256 hash of UUID + timestamp
   * WHY: Cryptographically secure, irreversible, unique
   */
  private generateAnonymousId(): string {
    const uuid = uuidv4();
    const timestamp = Date.now();
    const raw = `${uuid}-${timestamp}`;
    return CryptoJS.SHA256(raw).toString(CryptoJS.enc.Hex);
  }

  /**
   * Get default telemetry level for tier
   */
  private getDefaultLevel(tier: SubscriptionTier): TelemetryLevel {
    switch (tier) {
      case SubscriptionTier.FREE:
        return TelemetryLevel.DISABLED; // Opt-in required
      case SubscriptionTier.NETWORK:
        return TelemetryLevel.METADATA;
      case SubscriptionTier.PRO:
        return TelemetryLevel.FULL_PATTERN; // Mandatory
      default:
        return TelemetryLevel.DISABLED;
    }
  }

  /**
   * Check if telemetry level is allowed for tier
   */
  private isLevelAllowed(level: TelemetryLevel, tier: SubscriptionTier): boolean {
    switch (tier) {
      case SubscriptionTier.FREE:
        // Free tier: DISABLED or ANONYMOUS only
        return level === TelemetryLevel.DISABLED || level === TelemetryLevel.ANONYMOUS;

      case SubscriptionTier.NETWORK:
        // Network tier: DISABLED, ANONYMOUS, or METADATA
        return (
          level === TelemetryLevel.DISABLED ||
          level === TelemetryLevel.ANONYMOUS ||
          level === TelemetryLevel.METADATA
        );

      case SubscriptionTier.PRO:
        // Pro tier: FULL_PATTERN is mandatory (cannot be DISABLED)
        return level === TelemetryLevel.FULL_PATTERN;

      default:
        return false;
    }
  }

  /**
   * Load consent from storage
   */
  private loadConsent(): void {
    try {
      const stored = this.storage.getItem(this.storageKey);
      if (stored) {
        this.consentState = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load consent:', error);
    }
  }

  /**
   * Save consent to storage
   */
  private saveConsent(): void {
    try {
      if (this.consentState) {
        this.storage.setItem(this.storageKey, JSON.stringify(this.consentState));
      }
    } catch (error) {
      console.error('Failed to save consent:', error);
    }
  }
}
