/**
 * Configuration Validator
 *
 * DESIGN DECISION: Separate validation module (not mixed with config structs)
 * WHY: Single Responsibility Principle, easier to test, reusable
 *
 * REASONING CHAIN:
 * 1. Config structs = data representation
 * 2. Validation = business logic
 * 3. Separate concerns = easier to maintain
 * 4. Validator can check cross-field constraints
 * 5. Result: Clean, testable validation
 *
 * PATTERN: Pattern-VALIDATION-001 (Validator Pattern)
 * RELATED: CONFIG-001 (Config Loader)
 * PERFORMANCE: <10ms validation
 */

use super::{AetherlightConfig, ConfigLevel, PrivacyMode, SyncConfig, TerminalConfig};

/// Configuration validation result
pub type ValidationResult = Result<(), Vec<String>>;

/// Configuration validator
pub struct ConfigValidator;

impl ConfigValidator {
    /**
     * Validate complete configuration
     *
     * DESIGN DECISION: Collect all errors (not fail fast)
     * WHY: Users want to see ALL issues at once (not one at a time)
     */
    pub fn validate(config: &AetherlightConfig) -> ValidationResult {
        let mut errors = Vec::new();

        // Validate sync config
        if let Err(e) = Self::validate_sync(&config.sync) {
            errors.extend(e);
        }

        // Validate terminal config
        if let Err(e) = Self::validate_terminal(&config.terminal) {
            errors.extend(e);
        }

        // Validate cross-field constraints
        if let Err(e) = Self::validate_cross_constraints(config) {
            errors.extend(e);
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }

    /**
     * Validate sync configuration
     */
    fn validate_sync(sync: &SyncConfig) -> ValidationResult {
        let mut errors = Vec::new();

        // Server URL validation
        if sync.enabled {
            if sync.server_url.is_empty() {
                errors.push("sync.server_url cannot be empty when sync is enabled".to_string());
            } else if !sync.server_url.starts_with("ws://") && !sync.server_url.starts_with("wss://") {
                errors.push(format!(
                    "sync.server_url must start with 'ws://' or 'wss://', got '{}'",
                    sync.server_url
                ));
            }
        }

        // Reconnect delay validation
        if sync.reconnect_delay_ms == 0 {
            errors.push("sync.reconnect_delay_ms must be greater than 0".to_string());
        }

        if sync.max_reconnect_delay_ms < sync.reconnect_delay_ms {
            errors.push(format!(
                "sync.max_reconnect_delay_ms ({}) must be >= reconnect_delay_ms ({})",
                sync.max_reconnect_delay_ms, sync.reconnect_delay_ms
            ));
        }

        if sync.max_reconnect_delay_ms > 300_000 {
            // 5 minutes
            errors.push(format!(
                "sync.max_reconnect_delay_ms ({}) is too large (max 300000ms = 5 min)",
                sync.max_reconnect_delay_ms
            ));
        }

        // Event types validation
        if sync.enabled && sync.event_types.is_empty() {
            errors.push("sync.event_types cannot be empty when sync is enabled".to_string());
        }

        let valid_event_types = ["design_decision", "blocker", "discovery"];
        for event_type in &sync.event_types {
            if !valid_event_types.contains(&event_type.as_str()) {
                errors.push(format!(
                    "Invalid sync.event_types value '{}'. Valid: {:?}",
                    event_type, valid_event_types
                ));
            }
        }

        // TLS validation
        if sync.tls_enabled && sync.server_url.starts_with("ws://") {
            errors.push(
                "sync.tls_enabled is true but server_url uses 'ws://' (should be 'wss://')".to_string()
            );
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }

    /**
     * Validate terminal configuration
     */
    fn validate_terminal(terminal: &TerminalConfig) -> ValidationResult {
        let mut errors = Vec::new();

        // Confidence threshold validation
        if terminal.patterns.confidence_threshold < 0.0 || terminal.patterns.confidence_threshold > 1.0 {
            errors.push(format!(
                "terminal.patterns.confidence_threshold must be between 0.0 and 1.0, got {}",
                terminal.patterns.confidence_threshold
            ));
        }

        // Max patterns validation
        if terminal.patterns.max_patterns_shown == 0 || terminal.patterns.max_patterns_shown > 10 {
            errors.push(format!(
                "terminal.patterns.max_patterns_shown must be between 1 and 10, got {}",
                terminal.patterns.max_patterns_shown
            ));
        }

        // Max history validation
        if terminal.enhancement.max_history_messages == 0 || terminal.enhancement.max_history_messages > 20 {
            errors.push(format!(
                "terminal.enhancement.max_history_messages must be between 1 and 20, got {}",
                terminal.enhancement.max_history_messages
            ));
        }

        // Performance validation
        if terminal.performance.max_enhancement_time_ms < 100 || terminal.performance.max_enhancement_time_ms > 10_000 {
            errors.push(format!(
                "terminal.performance.max_enhancement_time_ms must be between 100 and 10000, got {}",
                terminal.performance.max_enhancement_time_ms
            ));
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }

    /**
     * Validate cross-field constraints
     *
     * DESIGN DECISION: Separate method for complex validations
     * WHY: Keep validation logic organized, easier to test
     */
    fn validate_cross_constraints(config: &AetherlightConfig) -> ValidationResult {
        let mut errors = Vec::new();

        // Privacy mode vs sync enabled
        if config.sync.enabled && config.sync.privacy_mode == PrivacyMode::Disabled {
            errors.push(
                "sync.enabled is true but privacy_mode is 'disabled' (inconsistent)".to_string()
            );
        }

        // Terminal enhancement vs patterns
        if config.terminal.enhancement.include_patterns && config.terminal.patterns.confidence_threshold < 0.5 {
            errors.push(
                "terminal.patterns.confidence_threshold < 0.5 is not recommended when patterns are enabled (too many low-quality matches)"
                    .to_string(),
            );
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }

    /**
     * Validate config level (for enterprise policies)
     *
     * DESIGN DECISION: Level-specific validation
     * WHY: Enterprise policies need stricter validation than user preferences
     */
    pub fn validate_for_level(config: &AetherlightConfig, level: ConfigLevel) -> ValidationResult {
        let mut errors = Vec::new();

        // Enterprise (system/team) requirements
        if level == ConfigLevel::System || level == ConfigLevel::Team {
            // Must use TLS in enterprise
            if config.sync.enabled && !config.sync.tls_enabled {
                errors.push(format!(
                    "{} level config must enable TLS for security",
                    level.name()
                ));
            }

            // Must set JWT token in enterprise
            if config.sync.enabled && config.sync.jwt_token.is_none() {
                errors.push(format!(
                    "{} level config must provide JWT token for authentication",
                    level.name()
                ));
            }
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_default_config() {
        let config = AetherlightConfig::default();
        assert!(ConfigValidator::validate(&config).is_ok());
    }

    #[test]
    fn test_validate_empty_server_url() {
        let mut config = AetherlightConfig::default();
        config.sync.server_url = String::new();
        let result = ConfigValidator::validate(&config);
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.contains("server_url")));
    }

    #[test]
    fn test_validate_invalid_server_url_protocol() {
        let mut config = AetherlightConfig::default();
        config.sync.server_url = "http://localhost:43216".to_string();
        let result = ConfigValidator::validate(&config);
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.contains("must start with 'ws://'")));
    }

    #[test]
    fn test_validate_invalid_reconnect_delays() {
        let mut config = AetherlightConfig::default();
        config.sync.reconnect_delay_ms = 0;
        let result = ConfigValidator::validate(&config);
        assert!(result.is_err());

        let mut config2 = AetherlightConfig::default();
        config2.sync.max_reconnect_delay_ms = 500; // Less than default 1000
        let result2 = ConfigValidator::validate(&config2);
        assert!(result2.is_err());
    }

    #[test]
    fn test_validate_invalid_confidence_threshold() {
        let mut config = AetherlightConfig::default();
        config.terminal.patterns.confidence_threshold = 1.5;
        let result = ConfigValidator::validate(&config);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_privacy_sync_mismatch() {
        let mut config = AetherlightConfig::default();
        config.sync.enabled = true;
        config.sync.privacy_mode = PrivacyMode::Disabled;
        let result = ConfigValidator::validate(&config);
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.contains("inconsistent")));
    }

    #[test]
    fn test_validate_enterprise_tls_required() {
        let mut config = AetherlightConfig::default();
        config.sync.enabled = true;
        config.sync.tls_enabled = false;
        let result = ConfigValidator::validate_for_level(&config, ConfigLevel::System);
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.contains("must enable TLS")));
    }

    #[test]
    fn test_validate_enterprise_jwt_required() {
        let mut config = AetherlightConfig::default();
        config.sync.enabled = true;
        config.sync.tls_enabled = true;
        config.sync.jwt_token = None;
        let result = ConfigValidator::validate_for_level(&config, ConfigLevel::System);
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.contains("must provide JWT token")));
    }

    #[test]
    fn test_validate_all_errors_collected() {
        let mut config = AetherlightConfig::default();
        config.sync.server_url = String::new(); // Error 1
        config.sync.reconnect_delay_ms = 0;     // Error 2
        config.terminal.patterns.confidence_threshold = 1.5; // Error 3

        let result = ConfigValidator::validate(&config);
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.len() >= 3); // Should collect multiple errors
    }
}
