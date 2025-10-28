/**
 * CLI Config Commands
 *
 * DESIGN DECISION: Command-line interface for configuration management
 * WHY: Enable developers to manage config without VS Code UI
 *
 * REASONING CHAIN:
 * 1. VS Code settings UI = great for UI users
 * 2. CLI commands = great for automation, CI/CD, scripting
 * 3. Need CRUD operations: get, set, list, reset, validate
 * 4. Need to respect 4-tier hierarchy (System → Team → Project → User)
 * 5. Result: Complete CLI for config management
 *
 * PATTERN: Pattern-CLI-001 (Command-Line Interface)
 * RELATED: config/loader.rs, config/validator.rs
 * PERFORMANCE: <100ms per command
 */

use crate::config::{
    AetherlightConfig, ConfigLevel, ConfigLoader, ConfigValidator, PrivacyMode, SyncConfig,
    TerminalConfig,
};
use std::path::PathBuf;

/// CLI config command result
pub type ConfigResult<T> = Result<T, String>;

/// Config CLI commands
pub struct ConfigCli {
    loader: ConfigLoader,
}

impl ConfigCli {
    /**
     * Create new config CLI
     *
     * DESIGN DECISION: Accepts optional project directory
     * WHY: Enables project-specific config operations
     */
    pub fn new(project_dir: Option<PathBuf>) -> ConfigResult<Self> {
        let mut loader = ConfigLoader::new()?;
        if let Some(dir) = project_dir {
            loader = loader.with_project_dir(dir);
        }
        Ok(Self { loader })
    }

    /**
     * Get configuration value by key
     *
     * DESIGN DECISION: Dot-separated key path (sync.enabled, terminal.voice.hotkey)
     * WHY: Matches VS Code settings convention
     *
     * Examples:
     * - aetherlight config get sync.enabled
     * - aetherlight config get sync.privacy_mode
     * - aetherlight config get terminal.voice.hotkey
     */
    pub fn get(&self, key: &str) -> ConfigResult<String> {
        let config = self.loader.load()?;

        let value = match key {
            // Sync config
            "sync.enabled" => config.sync.enabled.to_string(),
            "sync.server_url" => config.sync.server_url.clone(),
            "sync.privacy_mode" => format!("{:?}", config.sync.privacy_mode),
            "sync.auto_reconnect" => config.sync.auto_reconnect.to_string(),
            "sync.reconnect_delay_ms" => config.sync.reconnect_delay_ms.to_string(),
            "sync.max_reconnect_delay_ms" => config.sync.max_reconnect_delay_ms.to_string(),
            "sync.show_notifications" => config.sync.show_notifications.to_string(),
            "sync.notification_sound" => config.sync.notification_sound.to_string(),
            "sync.tls_enabled" => config.sync.tls_enabled.to_string(),

            // Terminal config
            "terminal.enabled" => config.terminal.enabled.to_string(),
            "terminal.voice.enabled" => config.terminal.voice.enabled.to_string(),
            "terminal.voice.hotkey" => config.terminal.voice.hotkey.clone(),
            "terminal.voice.auto_transcribe" => config.terminal.voice.auto_transcribe.to_string(),

            _ => return Err(format!("Unknown config key: {}", key)),
        };

        Ok(value)
    }

    /**
     * Set configuration value
     *
     * DESIGN DECISION: Writes to User level by default
     * WHY: User preferences highest priority, safe to modify
     *
     * Examples:
     * - aetherlight config set sync.enabled true
     * - aetherlight config set sync.privacy_mode decisions_only
     * - aetherlight config set terminal.voice.hotkey F14
     */
    pub fn set(&self, key: &str, value: &str, level: Option<ConfigLevel>) -> ConfigResult<()> {
        let mut config = self.loader.load()?;
        let target_level = level.unwrap_or(ConfigLevel::User);

        // Update config based on key
        match key {
            // Sync config
            "sync.enabled" => {
                config.sync.enabled = value
                    .parse()
                    .map_err(|_| format!("Invalid boolean: {}", value))?;
            }
            "sync.server_url" => {
                config.sync.server_url = value.to_string();
            }
            "sync.privacy_mode" => {
                config.sync.privacy_mode = match value {
                    "full_sync" => PrivacyMode::FullSync,
                    "decisions_only" => PrivacyMode::DecisionsOnly,
                    "blockers_only" => PrivacyMode::BlockersOnly,
                    "disabled" => PrivacyMode::Disabled,
                    _ => return Err(format!("Invalid privacy mode: {}", value)),
                };
            }
            "sync.auto_reconnect" => {
                config.sync.auto_reconnect = value
                    .parse()
                    .map_err(|_| format!("Invalid boolean: {}", value))?;
            }
            "sync.reconnect_delay_ms" => {
                config.sync.reconnect_delay_ms = value
                    .parse()
                    .map_err(|_| format!("Invalid number: {}", value))?;
            }
            "sync.max_reconnect_delay_ms" => {
                config.sync.max_reconnect_delay_ms = value
                    .parse()
                    .map_err(|_| format!("Invalid number: {}", value))?;
            }
            "terminal.voice.hotkey" => {
                config.terminal.voice.hotkey = value.to_string();
            }

            _ => return Err(format!("Unknown or read-only config key: {}", key)),
        }

        // Validate before saving
        config.validate()?;

        // Save to specified level
        self.loader.save(&config, target_level)?;

        Ok(())
    }

    /**
     * List all configuration with hierarchy
     *
     * DESIGN DECISION: Show effective config + source level
     * WHY: Helps debug hierarchy issues
     *
     * Output format:
     * sync.enabled = true (User)
     * sync.server_url = ws://localhost:43216 (System)
     * sync.privacy_mode = DecisionsOnly (Project)
     */
    pub fn list(&self) -> ConfigResult<String> {
        let config = self.loader.load()?;

        let mut output = String::new();
        output.push_str("=== ÆtherLight Configuration ===\n\n");

        output.push_str("[Sync]\n");
        output.push_str(&format!("  enabled = {} ({:?})\n", config.sync.enabled, config.level));
        output.push_str(&format!(
            "  server_url = {} ({:?})\n",
            config.sync.server_url, config.level
        ));
        output.push_str(&format!(
            "  privacy_mode = {:?} ({:?})\n",
            config.sync.privacy_mode, config.level
        ));
        output.push_str(&format!(
            "  auto_reconnect = {} ({:?})\n",
            config.sync.auto_reconnect, config.level
        ));
        output.push_str(&format!(
            "  tls_enabled = {} ({:?})\n\n",
            config.sync.tls_enabled, config.level
        ));

        output.push_str("[Terminal]\n");
        output.push_str(&format!(
            "  enabled = {} ({:?})\n",
            config.terminal.enabled, config.level
        ));
        output.push_str(&format!(
            "  voice.enabled = {} ({:?})\n",
            config.terminal.voice.enabled, config.level
        ));
        output.push_str(&format!(
            "  voice.hotkey = {} ({:?})\n",
            config.terminal.voice.hotkey, config.level
        ));

        if let Some(source) = &config.source_path {
            output.push_str(&format!("\nSource: {:?}\n", source));
        }

        Ok(output)
    }

    /**
     * Reset configuration to defaults
     *
     * DESIGN DECISION: Deletes User level config, preserves System/Team/Project
     * WHY: Safe reset - doesn't affect team policies
     *
     * Example:
     * - aetherlight config reset
     * - aetherlight config reset --level user
     */
    pub fn reset(&self, level: Option<ConfigLevel>) -> ConfigResult<()> {
        let target_level = level.unwrap_or(ConfigLevel::User);
        let path = self.loader.get_all_paths().into_iter().find(|(l, _)| *l == target_level);

        if let Some((_, config_path)) = path {
            if config_path.exists() {
                std::fs::remove_file(&config_path)
                    .map_err(|e| format!("Failed to delete config file: {}", e))?;
                println!("Reset {:?} configuration at {:?}", target_level, config_path);
            } else {
                println!("No {:?} configuration file found", target_level);
            }
        }

        Ok(())
    }

    /**
     * Validate configuration
     *
     * DESIGN DECISION: Loads and validates current config
     * WHY: Helps debug invalid config states
     *
     * Example:
     * - aetherlight config validate
     */
    pub fn validate(&self) -> ConfigResult<String> {
        let config = self.loader.load()?;

        match ConfigValidator::validate(&config) {
            Ok(()) => Ok("✅ Configuration is valid".to_string()),
            Err(errors) => {
                let mut output = String::new();
                output.push_str("❌ Configuration validation failed:\n\n");
                for error in errors {
                    output.push_str(&format!("  - {}\n", error));
                }
                Err(output)
            }
        }
    }

    /**
     * Show all config file paths
     *
     * DESIGN DECISION: Display hierarchy with existence check
     * WHY: Helps debug "which config is being used"
     *
     * Output format:
     * System:  /etc/aetherlight/config.toml (not found)
     * Team:    ~/.config/aetherlight/team/config.toml (exists)
     * Project: ./.aetherlight/config.toml (exists)
     * User:    ~/.config/aetherlight/user.toml (exists)
     */
    pub fn paths(&self) -> ConfigResult<String> {
        let paths = self.loader.get_all_paths();

        let mut output = String::new();
        output.push_str("=== Configuration File Paths ===\n\n");

        for (level, path) in paths {
            let exists = if path.exists() { "exists ✅" } else { "not found" };
            output.push_str(&format!("{:8} {:?} ({})\n", format!("{:?}:", level), path, exists));
        }

        Ok(output)
    }

    /**
     * Export configuration to TOML file
     *
     * DESIGN DECISION: Export merged config (not individual levels)
     * WHY: Useful for backup/restore, sharing config
     */
    pub fn export(&self, output_path: &str) -> ConfigResult<()> {
        let config = self.loader.load()?;

        let toml = toml::to_string_pretty(&config)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;

        std::fs::write(output_path, toml)
            .map_err(|e| format!("Failed to write file: {}", e))?;

        println!("✅ Configuration exported to {}", output_path);
        Ok(())
    }

    /**
     * Import configuration from TOML file
     *
     * DESIGN DECISION: Imports to User level by default
     * WHY: Safe - doesn't override team policies
     */
    pub fn import(&self, input_path: &str, level: Option<ConfigLevel>) -> ConfigResult<()> {
        let target_level = level.unwrap_or(ConfigLevel::User);

        let toml = std::fs::read_to_string(input_path)
            .map_err(|e| format!("Failed to read file: {}", e))?;

        let config: AetherlightConfig =
            toml::from_str(&toml).map_err(|e| format!("Failed to parse config: {}", e))?;

        // Validate before saving
        config.validate()?;

        // Save to specified level
        self.loader.save(&config, target_level)?;

        println!("✅ Configuration imported to {:?} level", target_level);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_cli_creation() {
        let cli = ConfigCli::new(None);
        assert!(cli.is_ok());
    }

    #[test]
    fn test_get_sync_enabled() {
        let cli = ConfigCli::new(None).unwrap();
        let result = cli.get("sync.enabled");
        assert!(result.is_ok());
    }

    #[test]
    fn test_list_config() {
        let cli = ConfigCli::new(None).unwrap();
        let result = cli.list();
        assert!(result.is_ok());
        assert!(result.unwrap().contains("ÆtherLight Configuration"));
    }

    #[test]
    fn test_validate_default_config() {
        let cli = ConfigCli::new(None).unwrap();
        let result = cli.validate();
        assert!(result.is_ok());
        assert!(result.unwrap().contains("valid"));
    }

    #[test]
    fn test_paths_display() {
        let cli = ConfigCli::new(None).unwrap();
        let result = cli.paths();
        assert!(result.is_ok());
        assert!(result.unwrap().contains("System"));
    }
}
