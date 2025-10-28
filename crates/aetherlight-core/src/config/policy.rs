/**
 * Configuration Policy Enforcement
 *
 * DESIGN DECISION: Enterprise IT policy enforcement at System/Team levels
 * WHY: Enable IT departments to enforce security/compliance policies
 *
 * REASONING CHAIN:
 * 1. Enterprise IT needs policy enforcement (GDPR, HIPAA, SOC 2)
 * 2. Users shouldn't be able to override security policies
 * 3. Need locked settings (can't be changed by lower levels)
 * 4. Need audit logging (who changed what, when)
 * 5. Result: Policy enforcement system with locked settings + audit
 *
 * PATTERN: Pattern-CONFIG-001 (Hierarchical Configuration)
 * RELATED: config/loader.rs, config/validator.rs
 * PERFORMANCE: <10ms policy check
 */

use super::{AetherlightConfig, ConfigLevel, PrivacyMode, SyncConfig, TerminalConfig};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};

/// Policy enforcement result
pub type PolicyResult<T> = Result<T, String>;

/// Policy action (for audit logging)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyAction {
    /// Timestamp (ISO 8601)
    pub timestamp: String,
    /// User who performed action
    pub user: String,
    /// Action type (set, reset, override_attempt)
    pub action: String,
    /// Config key affected
    pub key: String,
    /// Old value (if applicable)
    pub old_value: Option<String>,
    /// New value (if applicable)
    pub new_value: Option<String>,
    /// Config level
    pub level: ConfigLevel,
    /// Whether action was allowed
    pub allowed: bool,
    /// Reason (if blocked)
    pub reason: Option<String>,
}

/// Policy configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyConfig {
    /// Locked settings (cannot be changed by lower levels)
    pub locked_settings: HashSet<String>,
    /// Required settings (must have specific values)
    pub required_settings: HashMap<String, String>,
    /// Forbidden settings (cannot be enabled)
    pub forbidden_settings: HashSet<String>,
    /// Audit log enabled
    pub audit_enabled: bool,
    /// Audit log path
    pub audit_log_path: Option<PathBuf>,
}

impl Default for PolicyConfig {
    fn default() -> Self {
        Self {
            locked_settings: HashSet::new(),
            required_settings: HashMap::new(),
            forbidden_settings: HashSet::new(),
            audit_enabled: false,
            audit_log_path: None,
        }
    }
}

/// Policy enforcer
pub struct PolicyEnforcer {
    policy: PolicyConfig,
    config_level: ConfigLevel,
}

impl PolicyEnforcer {
    /**
     * Create new policy enforcer
     *
     * DESIGN DECISION: Load policy from System level config
     * WHY: Only System level can define policies (IT control)
     */
    pub fn new(config_level: ConfigLevel) -> PolicyResult<Self> {
        let policy = Self::load_policy(config_level)?;
        Ok(Self {
            policy,
            config_level,
        })
    }

    /**
     * Load policy configuration
     *
     * DESIGN DECISION: Policy stored in separate .policy.toml file
     * WHY: Separation of concerns - config vs policy
     */
    fn load_policy(level: ConfigLevel) -> PolicyResult<PolicyConfig> {
        let policy_path = match level {
            ConfigLevel::System => {
                #[cfg(target_os = "windows")]
                {
                    let program_data = std::env::var("PROGRAMDATA")
                        .unwrap_or_else(|_| "C:\\ProgramData".to_string());
                    PathBuf::from(program_data)
                        .join("AetherLight")
                        .join("policy.toml")
                }
                #[cfg(not(target_os = "windows"))]
                {
                    PathBuf::from("/etc/aetherlight/policy.toml")
                }
            }
            ConfigLevel::Team => {
                let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
                #[cfg(target_os = "windows")]
                {
                    PathBuf::from(std::env::var("APPDATA").unwrap_or(home))
                        .join("AetherLight")
                        .join("team")
                        .join("policy.toml")
                }
                #[cfg(not(target_os = "windows"))]
                {
                    let config_home = std::env::var("XDG_CONFIG_HOME")
                        .unwrap_or_else(|_| format!("{}/.config", home));
                    PathBuf::from(config_home)
                        .join("aetherlight")
                        .join("team")
                        .join("policy.toml")
                }
            }
            _ => {
                // Project and User levels cannot define policies
                return Ok(PolicyConfig::default());
            }
        };

        if !policy_path.exists() {
            return Ok(PolicyConfig::default());
        }

        let content = fs::read_to_string(&policy_path)
            .map_err(|e| format!("Failed to read policy file: {}", e))?;

        let policy: PolicyConfig =
            toml::from_str(&content).map_err(|e| format!("Failed to parse policy: {}", e))?;

        Ok(policy)
    }

    /**
     * Check if setting can be modified
     *
     * DESIGN DECISION: Lower levels cannot override locked settings
     * WHY: IT policy enforcement (security, compliance)
     *
     * Examples:
     * - System locks sync.tls_enabled=true → User cannot disable TLS
     * - Team locks sync.privacy_mode=disabled → User cannot enable sync
     */
    pub fn can_modify(&self, key: &str, target_level: ConfigLevel) -> PolicyResult<()> {
        // Check if setting is locked
        if self.policy.locked_settings.contains(key) {
            if target_level > self.config_level {
                return Err(format!(
                    "Setting '{}' is locked at {:?} level and cannot be modified",
                    key, self.config_level
                ));
            }
        }

        // Check if setting is forbidden
        if self.policy.forbidden_settings.contains(key) {
            return Err(format!(
                "Setting '{}' is forbidden by policy and cannot be enabled",
                key
            ));
        }

        Ok(())
    }

    /**
     * Validate configuration against policy
     *
     * DESIGN DECISION: Check required settings and forbidden settings
     * WHY: Ensure compliance with IT policies
     */
    pub fn validate(&self, config: &AetherlightConfig) -> PolicyResult<()> {
        let mut errors = Vec::new();

        // Check required settings
        for (key, required_value) in &self.policy.required_settings {
            let actual_value = self.get_config_value(config, key);
            if actual_value != *required_value {
                errors.push(format!(
                    "Required setting '{}' must be '{}', but is '{}'",
                    key, required_value, actual_value
                ));
            }
        }

        // Check forbidden settings (example: sync.enabled if forbidden)
        if self.policy.forbidden_settings.contains("sync.enabled") && config.sync.enabled {
            errors.push("Setting 'sync.enabled' is forbidden by policy".to_string());
        }

        if !errors.is_empty() {
            return Err(format!("Policy validation failed:\n{}", errors.join("\n")));
        }

        Ok(())
    }

    /**
     * Get configuration value as string
     *
     * DESIGN DECISION: Helper to extract values for policy validation
     * WHY: Required settings need value comparison
     */
    fn get_config_value(&self, config: &AetherlightConfig, key: &str) -> String {
        match key {
            "sync.enabled" => config.sync.enabled.to_string(),
            "sync.tls_enabled" => config.sync.tls_enabled.to_string(),
            "sync.privacy_mode" => format!("{:?}", config.sync.privacy_mode),
            "terminal.enabled" => config.terminal.enabled.to_string(),
            _ => "unknown".to_string(),
        }
    }

    /**
     * Log policy action to audit log
     *
     * DESIGN DECISION: Append-only JSON Lines format
     * WHY: Easy to parse, grep-friendly, no JSON array overhead
     *
     * Example audit log entry:
     * {"timestamp":"2025-10-17T13:30:00Z","user":"alice","action":"set","key":"sync.tls_enabled","old_value":"false","new_value":"true","level":"User","allowed":false,"reason":"Setting locked at System level"}
     */
    pub fn log_action(&self, action: PolicyAction) -> PolicyResult<()> {
        if !self.policy.audit_enabled {
            return Ok(());
        }

        let log_path = self
            .policy
            .audit_log_path
            .as_ref()
            .ok_or_else(|| "Audit log enabled but no path specified".to_string())?;

        // Create parent directory if needed
        if let Some(parent) = log_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create audit log directory: {}", e))?;
        }

        // Serialize action to JSON
        let json = serde_json::to_string(&action)
            .map_err(|e| format!("Failed to serialize audit action: {}", e))?;

        // Append to log file
        use std::fs::OpenOptions;
        use std::io::Write;

        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(log_path)
            .map_err(|e| format!("Failed to open audit log: {}", e))?;

        writeln!(file, "{}", json).map_err(|e| format!("Failed to write audit log: {}", e))?;

        Ok(())
    }

    /**
     * Get current policy configuration
     */
    pub fn get_policy(&self) -> &PolicyConfig {
        &self.policy
    }

    /**
     * Check if audit logging is enabled
     */
    pub fn is_audit_enabled(&self) -> bool {
        self.policy.audit_enabled
    }
}

/// Policy builder for creating policy configurations
pub struct PolicyBuilder {
    policy: PolicyConfig,
}

impl PolicyBuilder {
    pub fn new() -> Self {
        Self {
            policy: PolicyConfig::default(),
        }
    }

    /**
     * Lock a setting (cannot be changed by lower levels)
     *
     * Example:
     * PolicyBuilder::new()
     *     .lock("sync.tls_enabled")
     *     .lock("sync.privacy_mode")
     *     .build()
     */
    pub fn lock(mut self, key: &str) -> Self {
        self.policy.locked_settings.insert(key.to_string());
        self
    }

    /**
     * Require a setting to have specific value
     *
     * Example:
     * PolicyBuilder::new()
     *     .require("sync.tls_enabled", "true")
     *     .require("sync.privacy_mode", "disabled")
     *     .build()
     */
    pub fn require(mut self, key: &str, value: &str) -> Self {
        self.policy
            .required_settings
            .insert(key.to_string(), value.to_string());
        self
    }

    /**
     * Forbid a setting (cannot be enabled)
     *
     * Example:
     * PolicyBuilder::new()
     *     .forbid("sync.enabled")
     *     .build()
     */
    pub fn forbid(mut self, key: &str) -> Self {
        self.policy.forbidden_settings.insert(key.to_string());
        self
    }

    /**
     * Enable audit logging
     *
     * Example:
     * PolicyBuilder::new()
     *     .enable_audit("/var/log/aetherlight/audit.jsonl")
     *     .build()
     */
    pub fn enable_audit(mut self, log_path: &str) -> Self {
        self.policy.audit_enabled = true;
        self.policy.audit_log_path = Some(PathBuf::from(log_path));
        self
    }

    pub fn build(self) -> PolicyConfig {
        self.policy
    }

    /**
     * Save policy to file
     *
     * DESIGN DECISION: Write to System level policy.toml
     * WHY: Only System level can define policies
     */
    pub fn save_to_system(self) -> PolicyResult<()> {
        #[cfg(target_os = "windows")]
        let policy_path = {
            let program_data =
                std::env::var("PROGRAMDATA").unwrap_or_else(|_| "C:\\ProgramData".to_string());
            PathBuf::from(program_data)
                .join("AetherLight")
                .join("policy.toml")
        };

        #[cfg(not(target_os = "windows"))]
        let policy_path = PathBuf::from("/etc/aetherlight/policy.toml");

        // Create parent directory
        if let Some(parent) = policy_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create policy directory: {}", e))?;
        }

        // Serialize to TOML
        let toml = toml::to_string_pretty(&self.policy)
            .map_err(|e| format!("Failed to serialize policy: {}", e))?;

        // Write to file
        fs::write(&policy_path, toml)
            .map_err(|e| format!("Failed to write policy file: {}", e))?;

        println!("✅ Policy saved to {:?}", policy_path);
        Ok(())
    }
}

impl Default for PolicyBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_policy_builder() {
        let policy = PolicyBuilder::new()
            .lock("sync.tls_enabled")
            .require("sync.privacy_mode", "disabled")
            .forbid("sync.enabled")
            .build();

        assert!(policy.locked_settings.contains("sync.tls_enabled"));
        assert_eq!(policy.required_settings.get("sync.privacy_mode"), Some(&"disabled".to_string()));
        assert!(policy.forbidden_settings.contains("sync.enabled"));
    }

    #[test]
    fn test_policy_enforcer_creation() {
        let enforcer = PolicyEnforcer::new(ConfigLevel::System);
        assert!(enforcer.is_ok());
    }

    #[test]
    fn test_can_modify_unlocked_setting() {
        let enforcer = PolicyEnforcer::new(ConfigLevel::System).unwrap();
        let result = enforcer.can_modify("sync.enabled", ConfigLevel::User);
        assert!(result.is_ok());
    }

    #[test]
    fn test_audit_action_serialization() {
        let action = PolicyAction {
            timestamp: "2025-10-17T13:30:00Z".to_string(),
            user: "alice".to_string(),
            action: "set".to_string(),
            key: "sync.tls_enabled".to_string(),
            old_value: Some("false".to_string()),
            new_value: Some("true".to_string()),
            level: ConfigLevel::User,
            allowed: false,
            reason: Some("Setting locked".to_string()),
        };

        let json = serde_json::to_string(&action);
        assert!(json.is_ok());
        assert!(json.unwrap().contains("sync.tls_enabled"));
    }
}
