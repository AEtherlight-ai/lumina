/**
 * Real-Time Sync Configuration
 *
 * DESIGN DECISION: Privacy-first sync configuration
 * WHY: Users need granular control over what context is shared
 *
 * REASONING CHAIN:
 * 1. Privacy concerns = users need control (not forced sharing)
 * 2. Different use cases = need different privacy levels
 * 3. Full transparency = show what's being synced
 * 4. Opt-in by default = decisions only (not code snippets)
 * 5. Enterprise mode = IT can enforce policies
 *
 * PATTERN: Pattern-CONFIG-001 (Privacy-First Configuration)
 * RELATED: RTC-005 (Security & Privacy)
 * PERFORMANCE: <10ms config loading
 */

use serde::{Deserialize, Serialize};

/// Privacy mode for real-time context sync
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PrivacyMode {
    /// Share all context (design decisions, code snippets, blockers)
    FullSync,

    /// Share design decisions only (no code snippets)
    DecisionsOnly,

    /// Share blockers only (minimal context)
    BlockersOnly,

    /// No sync (local-only mode)
    Disabled,
}

impl Default for PrivacyMode {
    fn default() -> Self {
        PrivacyMode::DecisionsOnly
    }
}

impl PrivacyMode {
    /// Check if this mode allows sharing design decisions
    pub fn allows_decisions(&self) -> bool {
        matches!(self, PrivacyMode::FullSync | PrivacyMode::DecisionsOnly)
    }

    /// Check if this mode allows sharing code snippets
    pub fn allows_code_snippets(&self) -> bool {
        matches!(self, PrivacyMode::FullSync)
    }

    /// Check if this mode allows sharing blockers
    pub fn allows_blockers(&self) -> bool {
        !matches!(self, PrivacyMode::Disabled)
    }

    /// Check if sync is completely disabled
    pub fn is_disabled(&self) -> bool {
        matches!(self, PrivacyMode::Disabled)
    }
}

/// Real-time sync configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncConfig {
    /// Enable/disable real-time sync
    #[serde(default = "default_enabled")]
    pub enabled: bool,

    /// WebSocket server URL (default: ws://localhost:43216)
    #[serde(default = "default_server_url")]
    pub server_url: String,

    /// Privacy mode
    #[serde(default)]
    pub privacy_mode: PrivacyMode,

    /// Auto-reconnect on disconnect
    #[serde(default = "default_enabled")]
    pub auto_reconnect: bool,

    /// Reconnect delay in milliseconds (exponential backoff)
    #[serde(default = "default_reconnect_delay")]
    pub reconnect_delay_ms: u64,

    /// Maximum reconnect delay in milliseconds
    #[serde(default = "default_max_reconnect_delay")]
    pub max_reconnect_delay_ms: u64,

    /// Show desktop notifications for events
    #[serde(default = "default_enabled")]
    pub show_notifications: bool,

    /// Play sound on notifications
    #[serde(default = "default_disabled")]
    pub notification_sound: bool,

    /// Event types to subscribe to
    #[serde(default = "default_event_types")]
    pub event_types: Vec<String>,

    /// Per-project JWT token (for authentication)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub jwt_token: Option<String>,

    /// TLS enabled (for production)
    #[serde(default = "default_disabled")]
    pub tls_enabled: bool,
}

// Default values

fn default_enabled() -> bool {
    true
}

fn default_disabled() -> bool {
    false
}

fn default_server_url() -> String {
    "ws://localhost:43216".to_string()
}

fn default_reconnect_delay() -> u64 {
    1000 // 1 second
}

fn default_max_reconnect_delay() -> u64 {
    30000 // 30 seconds
}

fn default_event_types() -> Vec<String> {
    vec![
        "design_decision".to_string(),
        "blocker".to_string(),
        "discovery".to_string(),
    ]
}

impl Default for SyncConfig {
    fn default() -> Self {
        Self {
            enabled: default_enabled(),
            server_url: default_server_url(),
            privacy_mode: PrivacyMode::default(),
            auto_reconnect: default_enabled(),
            reconnect_delay_ms: default_reconnect_delay(),
            max_reconnect_delay_ms: default_max_reconnect_delay(),
            show_notifications: default_enabled(),
            notification_sound: default_disabled(),
            event_types: default_event_types(),
            jwt_token: None,
            tls_enabled: default_disabled(),
        }
    }
}

impl SyncConfig {
    /**
     * Validate configuration values
     *
     * DESIGN DECISION: Validate on load (not at runtime)
     * WHY: Fail fast, clear error messages
     */
    pub fn validate(&self) -> Result<(), String> {
        // Validate server URL
        if self.server_url.is_empty() {
            return Err("server_url cannot be empty".to_string());
        }

        // Validate reconnect delays
        if self.reconnect_delay_ms == 0 {
            return Err("reconnect_delay_ms must be greater than 0".to_string());
        }

        if self.max_reconnect_delay_ms < self.reconnect_delay_ms {
            return Err(format!(
                "max_reconnect_delay_ms ({}) must be >= reconnect_delay_ms ({})",
                self.max_reconnect_delay_ms, self.reconnect_delay_ms
            ));
        }

        // Validate event types
        if self.event_types.is_empty() {
            return Err("event_types cannot be empty when sync is enabled".to_string());
        }

        let valid_event_types = ["design_decision", "blocker", "discovery"];
        for event_type in &self.event_types {
            if !valid_event_types.contains(&event_type.as_str()) {
                return Err(format!(
                    "Invalid event_type '{}'. Valid types: {:?}",
                    event_type, valid_event_types
                ));
            }
        }

        Ok(())
    }

    /// Check if this config is ready for production (TLS enabled)
    pub fn is_production_ready(&self) -> bool {
        self.tls_enabled && self.jwt_token.is_some()
    }

    /// Get reconnect delay with exponential backoff
    pub fn get_reconnect_delay(&self, attempt: u32) -> u64 {
        let delay = self.reconnect_delay_ms * 2_u64.pow(attempt);
        delay.min(self.max_reconnect_delay_ms)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_privacy_mode() {
        let mode = PrivacyMode::default();
        assert_eq!(mode, PrivacyMode::DecisionsOnly);
        assert!(mode.allows_decisions());
        assert!(!mode.allows_code_snippets());
        assert!(mode.allows_blockers());
        assert!(!mode.is_disabled());
    }

    #[test]
    fn test_privacy_mode_full_sync() {
        let mode = PrivacyMode::FullSync;
        assert!(mode.allows_decisions());
        assert!(mode.allows_code_snippets());
        assert!(mode.allows_blockers());
        assert!(!mode.is_disabled());
    }

    #[test]
    fn test_privacy_mode_disabled() {
        let mode = PrivacyMode::Disabled;
        assert!(!mode.allows_decisions());
        assert!(!mode.allows_code_snippets());
        assert!(!mode.allows_blockers());
        assert!(mode.is_disabled());
    }

    #[test]
    fn test_default_sync_config() {
        let config = SyncConfig::default();
        assert!(config.enabled);
        assert_eq!(config.server_url, "ws://localhost:43216");
        assert_eq!(config.privacy_mode, PrivacyMode::DecisionsOnly);
        assert!(config.auto_reconnect);
        assert_eq!(config.reconnect_delay_ms, 1000);
        assert_eq!(config.max_reconnect_delay_ms, 30000);
        assert!(config.show_notifications);
        assert!(!config.notification_sound);
        assert_eq!(config.event_types.len(), 3);
        assert!(config.jwt_token.is_none());
        assert!(!config.tls_enabled);
    }

    #[test]
    fn test_validation_success() {
        let config = SyncConfig::default();
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_validation_empty_server_url() {
        let mut config = SyncConfig::default();
        config.server_url = String::new();
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_validation_zero_reconnect_delay() {
        let mut config = SyncConfig::default();
        config.reconnect_delay_ms = 0;
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_validation_invalid_max_delay() {
        let mut config = SyncConfig::default();
        config.max_reconnect_delay_ms = 500; // Less than reconnect_delay_ms (1000)
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_validation_empty_event_types() {
        let mut config = SyncConfig::default();
        config.event_types.clear();
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_validation_invalid_event_type() {
        let mut config = SyncConfig::default();
        config.event_types.push("invalid_type".to_string());
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_production_ready() {
        let mut config = SyncConfig::default();
        assert!(!config.is_production_ready());

        config.tls_enabled = true;
        assert!(!config.is_production_ready()); // Still needs JWT

        config.jwt_token = Some("test_token".to_string());
        assert!(config.is_production_ready()); // Now ready
    }

    #[test]
    fn test_exponential_backoff() {
        let config = SyncConfig::default();
        assert_eq!(config.get_reconnect_delay(0), 1000);  // 1s * 2^0 = 1s
        assert_eq!(config.get_reconnect_delay(1), 2000);  // 1s * 2^1 = 2s
        assert_eq!(config.get_reconnect_delay(2), 4000);  // 1s * 2^2 = 4s
        assert_eq!(config.get_reconnect_delay(3), 8000);  // 1s * 2^3 = 8s
        assert_eq!(config.get_reconnect_delay(4), 16000); // 1s * 2^4 = 16s
        assert_eq!(config.get_reconnect_delay(5), 30000); // Capped at max (30s)
        assert_eq!(config.get_reconnect_delay(10), 30000); // Still capped
    }
}
