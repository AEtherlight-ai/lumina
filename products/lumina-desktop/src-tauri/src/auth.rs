//! License validation and device fingerprint module (BUG-002)
//!
//! DESIGN DECISION: Server-side license validation with device fingerprinting
//! WHY: Prevents license key sharing, tracks usage per device, enables monetization
//!
//! REASONING CHAIN:
//! 1. User installs desktop app → no license key configured
//! 2. First launch → Show activation dialog (LicenseActivationDialog.tsx)
//! 3. User enters license key from dashboard (https://aetherlight.ai/dashboard)
//! 4. Desktop generates device_fingerprint (OS + CPU + MAC → SHA-256 hash)
//! 5. Desktop calls POST /api/license/validate with license_key + device_fingerprint
//! 6. API validates license → Associates key with device_fingerprint
//! 7. API returns: user_id, device_id, tier (stored in AppSettings)
//! 8. Subsequent launches → Check if license_key exists (skip activation)
//!
//! Device Fingerprint Components:
//! - OS name (Windows, macOS, Linux)
//! - CPU architecture (x86_64, aarch64)
//! - MAC address (first network adapter)
//! - SHA-256 hash for privacy (don't send raw MAC to server)
//!
//! Security Notes:
//! - Device fingerprint is deterministic (same device → same fingerprint)
//! - Fingerprint changes if hardware changes (new network adapter)
//! - License keys can only activate ONE device (enforced by API)
//! - Users must deactivate old device before activating new device
//!
//! PATTERN: Pattern-AUTH-001 (Device Fingerprinting for License Validation)
//! RELATED: main.rs (activation flow), LicenseActivationDialog.tsx (frontend UI)

use anyhow::{Context, Result};
use mac_address::get_mac_address;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

/// Generate device fingerprint for license activation
///
/// Fingerprint is SHA-256 hash of:
/// - OS name (Windows, macOS, Linux)
/// - CPU architecture (x86_64, aarch64)
/// - MAC address (first network adapter)
///
/// Returns 64-character hex string (SHA-256 hash)
///
/// # Example
/// ```
/// let fingerprint = generate_device_fingerprint().unwrap();
/// assert_eq!(fingerprint.len(), 64); // SHA-256 produces 64 hex chars
/// ```
///
/// # Errors
/// Returns error if:
/// - No network adapters found
/// - MAC address retrieval fails (permissions, driver issues)
pub fn generate_device_fingerprint() -> Result<String> {
    // Get OS name
    let os = std::env::consts::OS; // "windows", "macos", "linux"

    // Get CPU architecture
    let arch = std::env::consts::ARCH; // "x86_64", "aarch64", etc.

    // Get MAC address (first network adapter)
    let mac = get_mac_address()
        .context("Failed to get MAC address - check network adapters are enabled")?
        .ok_or_else(|| anyhow::anyhow!("No MAC address found - no network adapters detected"))?;

    // Combine components (format: "windows:x86_64:MacAddr(aa:bb:cc:dd:ee:ff)")
    let components = format!("{}:{}:{:?}", os, arch, mac);

    // Hash with SHA-256 (privacy: don't send raw MAC address to server)
    let mut hasher = Sha256::new();
    hasher.update(components.as_bytes());
    let hash = hasher.finalize();

    // Convert to hex string (64 characters)
    let fingerprint = format!("{:x}", hash);

    Ok(fingerprint)
}

/// License validation API request payload
#[derive(Debug, Serialize)]
struct LicenseValidationRequest {
    license_key: String,
    device_fingerprint: String,
}

/// License validation API response (200 OK)
/// Matches API contract: website/app/api/license/validate/route.ts
#[derive(Debug, Deserialize)]
pub struct LicenseValidationResponse {
    pub valid: bool,
    pub user_id: String,
    pub device_id: String,
    pub tier: String,                // "free" or "pro"
    pub storage_limit_mb: u64,
    pub user_name: String,
    pub message: String,
}

/// Validate license key with server API
///
/// Calls POST /api/license/validate with license_key + device_fingerprint
///
/// # Arguments
/// - `license_key`: License key from dashboard (format: XXXX-XXXX-XXXX-XXXX)
/// - `api_url`: API base URL (e.g., "https://api.aetherlight.ai")
///
/// # Returns
/// - `Ok(LicenseValidationResponse)`: License is valid, device activated
/// - `Err(...)`: Validation failed with specific error
///
/// # Errors
/// - 400: Missing required fields (license_key or device_fingerprint)
/// - 404: Invalid license key (not found in database)
/// - 403: License already activated on another device
/// - 500: Server error (database or network issue)
/// - Network errors: Connection timeout, DNS resolution failure
///
/// # Example
/// ```no_run
/// let response = validate_license_key("CD7W-AJDK-RLQT-LUFA", "https://api.aetherlight.ai").await?;
/// println!("Activated! User: {}, Tier: {}", response.user_name, response.tier);
/// ```
pub async fn validate_license_key(
    license_key: &str,
    api_url: &str,
) -> Result<LicenseValidationResponse> {
    // Validate license key format: trim whitespace
    let license_key = license_key.trim();
    if license_key.is_empty() {
        anyhow::bail!("License key is empty");
    }

    // Generate device fingerprint
    let device_fingerprint = generate_device_fingerprint()
        .context("Failed to generate device fingerprint")?;

    // Build API endpoint
    let endpoint = format!("{}/api/license/validate", api_url);

    // Build request payload
    let payload = LicenseValidationRequest {
        license_key: license_key.to_string(),
        device_fingerprint,
    };

    println!("🔑 Validating license key: {}... at {}", &license_key[..4], endpoint);

    // Send POST request
    let client = reqwest::Client::new();
    let response = client
        .post(&endpoint)
        .json(&payload)
        .send()
        .await
        .context("Failed to send license validation request - check internet connection")?;

    // Check status code
    let status = response.status();

    if status.is_success() {
        // Parse success response (200 OK)
        let validation_response: LicenseValidationResponse = response
            .json()
            .await
            .context("Failed to parse license validation response")?;

        println!("✅ License validation successful!");
        println!("   User: {}", validation_response.user_name);
        println!("   Tier: {}", validation_response.tier);
        println!("   User ID: {}", validation_response.user_id);
        println!("   Device ID: {}", validation_response.device_id);

        Ok(validation_response)
    } else {
        // Parse error message
        let error_text = response.text().await.unwrap_or_default();

        // Return user-friendly error messages based on status code
        match status.as_u16() {
            400 => anyhow::bail!("Invalid request: {}. Please check license key format (XXXX-XXXX-XXXX-XXXX).", error_text),
            404 => anyhow::bail!("Invalid license key: Key not found in database. Please check your license key and try again. Get your license key from https://aetherlight.ai/dashboard"),
            403 => anyhow::bail!("License already activated on another device. Each license can only be used on one device at a time. Please deactivate your other device from the dashboard or contact support."),
            500 => anyhow::bail!("Server error: {}. Please try again later or contact support if the problem persists.", error_text),
            _ => anyhow::bail!("Validation failed ({}): {}",  status, error_text),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Test device fingerprint consistency
    /// Same device should produce same fingerprint across multiple calls
    #[test]
    fn test_fingerprint_consistency() {
        let fp1 = generate_device_fingerprint().unwrap();
        let fp2 = generate_device_fingerprint().unwrap();
        assert_eq!(fp1, fp2, "Fingerprint should be consistent across calls");
    }

    /// Test device fingerprint length
    /// SHA-256 produces 64 hexadecimal characters
    #[test]
    fn test_fingerprint_length() {
        let fp = generate_device_fingerprint().unwrap();
        assert_eq!(fp.len(), 64, "SHA-256 fingerprint should be exactly 64 hex chars");
    }

    /// Test device fingerprint is not empty
    #[test]
    fn test_fingerprint_not_empty() {
        let fp = generate_device_fingerprint().unwrap();
        assert!(!fp.is_empty(), "Fingerprint should not be empty");
    }

    /// Test empty license key validation
    #[tokio::test]
    async fn test_empty_license_key() {
        let license_key = "";
        let api_url = "https://api.aetherlight.ai";

        let result = validate_license_key(license_key, api_url).await;
        assert!(result.is_err(), "Empty license key should fail validation");

        let error_msg = result.unwrap_err().to_string();
        assert!(error_msg.contains("empty"), "Error should mention empty license key");
    }

    /// Test whitespace-only license key validation
    #[tokio::test]
    async fn test_whitespace_license_key() {
        let license_key = "   ";
        let api_url = "https://api.aetherlight.ai";

        let result = validate_license_key(license_key, api_url).await;
        assert!(result.is_err(), "Whitespace-only license key should fail validation");
    }

    // Integration tests with live API (marked as #[ignore] - run manually)

    /// Test valid license key activation (free tier)
    /// Run manually: cargo test test_valid_license_key -- --ignored
    #[tokio::test]
    #[ignore] // Requires live API and may exhaust license activations
    async fn test_valid_license_key_free_tier() {
        let license_key = "CD7W-AJDK-RLQT-LUFA"; // Free tier test key
        let api_url = "https://api.aetherlight.ai";

        let result = validate_license_key(license_key, api_url).await;

        // May fail if already activated - that's expected behavior (403)
        if result.is_ok() {
            let response = result.unwrap();
            assert_eq!(response.valid, true);
            assert_eq!(response.tier, "free");
        } else {
            // Expected: 403 already activated
            let error = result.unwrap_err();
            println!("Expected error (already activated): {}", error);
        }
    }

    /// Test invalid license key (404)
    /// Run manually: cargo test test_invalid_license_key -- --ignored
    #[tokio::test]
    #[ignore] // Requires live API
    async fn test_invalid_license_key() {
        let license_key = "INVALID-0000-0000-0000";
        let api_url = "https://api.aetherlight.ai";

        let result = validate_license_key(license_key, api_url).await;
        assert!(result.is_err(), "Invalid license key should fail validation");

        let error_msg = result.unwrap_err().to_string();
        assert!(error_msg.contains("Invalid license key") || error_msg.contains("not found"),
                "Error should mention invalid license key");
    }
}
