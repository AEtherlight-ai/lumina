/**
 * LicenseValidator: Validates license keys against server API using Bearer token
 *
 * BUG-011: Extension license key validation (LIVE validation)
 * Date: 2025-11-13
 *
 * DESIGN DECISION: Use Bearer token pattern with GET /api/tokens/balance
 * WHY: Extensions can't generate device fingerprints like desktop app does
 *
 * REASONING CHAIN:
 * 1. Extension needs to validate license keys on every activation
 * 2. Desktop app uses POST /api/license/validate with device_fingerprint (requires physical device)
 * 3. Extensions run in VS Code (no physical device to fingerprint)
 * 4. Solution: Use GET /api/tokens/balance with Bearer token authentication
 * 5. API returns tier + user_id if valid, 401 if invalid
 * 6. Cache results for 24 hours to reduce API calls
 * 7. Graceful degradation: offline mode if network fails
 *
 * PATTERN: Pattern-AUTH-001 (Bearer token authentication)
 * RELATED: tierGate.ts (feature gating), extension.ts (activation flow)
 * API: GET https://www.aetherlight.ai/api/tokens/balance
 *
 * Test Keys (from BUG-011_QUESTIONS.md):
 * - Free: CD7W-AJDK-RLQT-LUFA
 * - Pro: W7HD-X79Q-CQJ9-XW13
 */

/**
 * License validation result interface
 *
 * Matches API response from GET /api/tokens/balance
 */
export interface LicenseValidationResult {
  valid: boolean;
  tier: 'free' | 'network' | 'pro' | 'enterprise' | 'offline';
  user_id?: string;
  balance?: number;
  message?: string;
  error?: string;
}

/**
 * Validation options
 */
export interface ValidationOptions {
  allowOffline?: boolean;
  timeout?: number;
  cache?: boolean;
}

/**
 * LicenseValidator: Validates license keys against server API
 *
 * Chain of Thought:
 * - Why: Extension needs live license validation (not just local check)
 * - Pattern: Bearer token authentication with GET /api/tokens/balance
 * - Integration: Calls GET https://www.aetherlight.ai/api/tokens/balance with Authorization: Bearer {key}
 * - Error handling: Graceful degradation (offline mode, timeouts, rate limits)
 * - Caching: 24-hour cache to avoid repeated API calls on every activation
 *
 * CRITICAL: Uses Bearer token pattern (NOT device fingerprint)
 * WHY: Extensions can't generate device fingerprints like desktop app does
 * DESKTOP APP: Uses POST /api/license/validate with device_fingerprint (see products/lumina-desktop/src-tauri/src/auth.rs)
 * EXTENSION: Uses GET /api/tokens/balance with Bearer token (no fingerprint needed)
 */
export class LicenseValidator {
  private cache: Map<string, { result: LicenseValidationResult; timestamp: number }> = new Map();
  private readonly API_BASE_URL = 'https://www.aetherlight.ai'; // Production API
  private readonly CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Validates a license key against the server using Bearer token authentication
   *
   * Chain of Thought:
   * 1. Check cache first (avoid repeated API calls)
   * 2. Call GET /api/tokens/balance with Authorization: Bearer {key}
   * 3. Handle 200 OK → Return tier + user_id
   * 4. Handle 401 Unauthorized → Invalid key
   * 5. Handle 429 Rate Limit → Retry later error
   * 6. Handle network errors → Offline mode (if allowed)
   * 7. Cache successful results for 24 hours
   *
   * @param licenseKey - License key to validate (format: XXXX-XXXX-XXXX-XXXX)
   * @param options - Validation options (offline mode, timeout, cache)
   * @returns Validation result with tier and status
   * @throws Error if validation fails and offline mode not allowed
   */
  async validateLicenseKey(
    licenseKey: string,
    options: ValidationOptions = {}
  ): Promise<LicenseValidationResult> {
    const { allowOffline = true, timeout = 2000, cache = true } = options;

    // Trim whitespace
    licenseKey = licenseKey.trim();
    if (!licenseKey) {
      throw new Error('License key is empty');
    }

    // Check cache first
    if (cache && this.cache.has(licenseKey)) {
      const cached = this.cache.get(licenseKey)!;
      const age = Date.now() - cached.timestamp;
      if (age < this.CACHE_DURATION_MS) {
        console.log(`[LicenseValidator] Using cached result (age: ${Math.round(age / 1000 / 60)}min)`);
        return cached.result;
      }
      // Cache expired, remove
      this.cache.delete(licenseKey);
    }

    try {
      // Call API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      console.log(`[LicenseValidator] Validating license key: ${licenseKey.substring(0, 4)}...`);

      const response = await fetch(`${this.API_BASE_URL}/api/tokens/balance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${licenseKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // 200 OK - Valid license key
        const data = await response.json();

        const result: LicenseValidationResult = {
          valid: true,
          tier: data.subscription_tier || data.tier || 'free',  // API returns subscription_tier, not tier
          user_id: data.user_id,
          balance: data.tokens_balance || data.balance,
          message: data.message
        };

        // Cache result
        if (cache) {
          this.cache.set(licenseKey, { result, timestamp: Date.now() });
        }

        console.log(`[LicenseValidator] ✅ Valid license key (tier: ${result.tier}, user: ${result.user_id})`);
        return result;
      } else {
        // Handle error responses
        const data = await response.json().catch(() => ({ error: 'Unknown error' }));

        switch (response.status) {
          case 401:
            // Unauthorized - Invalid license key
            throw new Error(`Invalid license key: ${data.error || 'Key not found in database'}. Please check your license key and try again.`);

          case 429:
            // Rate limit exceeded
            throw new Error(`Rate limit exceeded: ${data.error || 'Too many requests'}. Please try again in a few minutes.`);

          default:
            // Other errors
            throw new Error(`License validation failed (HTTP ${response.status}): ${data.error || 'Unknown error'}`);
        }
      }
    } catch (error: any) {
      // Handle network errors and timeouts
      if (error.name === 'AbortError') {
        // Timeout
        if (allowOffline) {
          console.log('[LicenseValidator] ⚠️ Validation timeout - using offline mode');
          return {
            valid: true,
            tier: 'offline',
            message: 'Offline mode (validation timeout)'
          };
        }
        throw new Error('License validation timeout. Please check your internet connection and try again.');
      }

      // Network errors (ECONNREFUSED, ENOTFOUND, etc.)
      if (allowOffline && (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.message.includes('Network error'))) {
        console.log('[LicenseValidator] ⚠️ Network error - using offline mode');
        return {
          valid: true,
          tier: 'offline',
          message: 'Offline mode (network unavailable)'
        };
      }

      // Re-throw other errors (invalid key, rate limit, etc.)
      throw error;
    }
  }

  /**
   * Clears validation cache (for testing or forced revalidation)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[LicenseValidator] Cache cleared');
  }
}
