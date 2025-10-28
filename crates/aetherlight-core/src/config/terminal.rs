/**
 * Terminal Middleware Configuration
 *
 * DESIGN DECISION: Separate terminal config section (not in main config)
 * WHY: Terminal middleware = optional feature, should have own config namespace
 *
 * REASONING CHAIN:
 * 1. Main config = core features (always enabled)
 * 2. Terminal middleware = optional feature (can be disabled)
 * 3. Separate namespace = easier to enable/disable
 * 4. Granular controls = users can customize behavior
 * 5. Result: Flexible configuration
 *
 * PATTERN: Pattern-CONFIG-001 (Modular Configuration)
 * RELATED: system.toml, user.toml
 * PERFORMANCE: <10ms config loading
 */

use serde::{Deserialize, Serialize};

/**
 * Terminal Middleware Configuration
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalConfig {
    /// Terminal middleware enabled
    #[serde(default = "default_enabled")]
    pub enabled: bool,

    /// Voice input configuration
    #[serde(default)]
    pub voice: VoiceConfig,

    /// Typing input configuration
    #[serde(default)]
    pub typing: TypingConfig,

    /// Context enhancement configuration
    #[serde(default)]
    pub enhancement: EnhancementConfig,

    /// Pattern matching configuration
    #[serde(default)]
    pub patterns: PatternConfig,

    /// Performance configuration
    #[serde(default)]
    pub performance: PerformanceConfig,
}

/**
 * Voice Input Configuration
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceConfig {
    /// Voice input enabled
    #[serde(default = "default_enabled")]
    pub enabled: bool,

    /// Voice hotkey (default: F13)
    #[serde(default = "default_hotkey")]
    pub hotkey: String,

    /// Auto-transcribe (don't wait for user confirmation)
    #[serde(default = "default_enabled")]
    pub auto_transcribe: bool,

    /// Show transcription text
    #[serde(default = "default_enabled")]
    pub show_transcription: bool,
}

/**
 * Typing Input Configuration
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypingConfig {
    /// Multiline shortcut (default: Ctrl+Enter)
    #[serde(default = "default_multiline_shortcut")]
    pub multiline_shortcut: String,

    /// Auto-enhance on Enter (vs manual trigger)
    #[serde(default = "default_enabled")]
    pub auto_enhance: bool,

    /// Show preview before sending
    #[serde(default = "default_enabled")]
    pub show_preview: bool,
}

/**
 * Context Enhancement Configuration
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnhancementConfig {
    /// Context enhancement enabled
    #[serde(default = "default_enabled")]
    pub enabled: bool,

    /// Include pattern matching
    #[serde(default = "default_enabled")]
    pub include_patterns: bool,

    /// Include file context
    #[serde(default = "default_enabled")]
    pub include_file_context: bool,

    /// Include project state
    #[serde(default = "default_enabled")]
    pub include_project_state: bool,

    /// Include error context
    #[serde(default = "default_enabled")]
    pub include_error_context: bool,

    /// Include conversation history
    #[serde(default = "default_enabled")]
    pub include_history: bool,

    /// Max history messages to include
    #[serde(default = "default_max_history")]
    pub max_history_messages: u32,
}

/**
 * Pattern Matching Configuration
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternConfig {
    /// Confidence threshold (0.0-1.0)
    #[serde(default = "default_confidence_threshold")]
    pub confidence_threshold: f32,

    /// Max patterns to show in preview
    #[serde(default = "default_max_patterns")]
    pub max_patterns_shown: u32,

    /// Auto-apply top pattern (without preview)
    #[serde(default = "default_disabled")]
    pub auto_apply_top_pattern: bool,
}

/**
 * Performance Configuration
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceConfig {
    /// Max enhancement time (ms)
    #[serde(default = "default_max_enhancement_time")]
    pub max_enhancement_time_ms: u32,

    /// Cache file context (read once per session)
    #[serde(default = "default_enabled")]
    pub cache_file_context: bool,

    /// Cache project state (detect once per session)
    #[serde(default = "default_enabled")]
    pub cache_project_state: bool,
}

// Default values

fn default_enabled() -> bool {
    true
}

fn default_disabled() -> bool {
    false
}

fn default_hotkey() -> String {
    "F13".to_string()
}

fn default_multiline_shortcut() -> String {
    "Ctrl+Enter".to_string()
}

fn default_max_history() -> u32 {
    5
}

fn default_confidence_threshold() -> f32 {
    0.75
}

fn default_max_patterns() -> u32 {
    3
}

fn default_max_enhancement_time() -> u32 {
    500
}

// Default implementation

impl Default for TerminalConfig {
    fn default() -> Self {
        Self {
            enabled: default_enabled(),
            voice: VoiceConfig::default(),
            typing: TypingConfig::default(),
            enhancement: EnhancementConfig::default(),
            patterns: PatternConfig::default(),
            performance: PerformanceConfig::default(),
        }
    }
}

impl Default for VoiceConfig {
    fn default() -> Self {
        Self {
            enabled: default_enabled(),
            hotkey: default_hotkey(),
            auto_transcribe: default_enabled(),
            show_transcription: default_enabled(),
        }
    }
}

impl Default for TypingConfig {
    fn default() -> Self {
        Self {
            multiline_shortcut: default_multiline_shortcut(),
            auto_enhance: default_enabled(),
            show_preview: default_enabled(),
        }
    }
}

impl Default for EnhancementConfig {
    fn default() -> Self {
        Self {
            enabled: default_enabled(),
            include_patterns: default_enabled(),
            include_file_context: default_enabled(),
            include_project_state: default_enabled(),
            include_error_context: default_enabled(),
            include_history: default_enabled(),
            max_history_messages: default_max_history(),
        }
    }
}

impl Default for PatternConfig {
    fn default() -> Self {
        Self {
            confidence_threshold: default_confidence_threshold(),
            max_patterns_shown: default_max_patterns(),
            auto_apply_top_pattern: default_disabled(),
        }
    }
}

impl Default for PerformanceConfig {
    fn default() -> Self {
        Self {
            max_enhancement_time_ms: default_max_enhancement_time(),
            cache_file_context: default_enabled(),
            cache_project_state: default_enabled(),
        }
    }
}

// Validation

impl TerminalConfig {
    /**
     * Validate configuration values
     *
     * DESIGN DECISION: Validate on load (not at runtime)
     * WHY: Fail fast, clear error messages
     */
    pub fn validate(&self) -> Result<(), String> {
        // Validate confidence threshold
        if self.patterns.confidence_threshold < 0.0 || self.patterns.confidence_threshold > 1.0 {
            return Err(format!(
                "confidence_threshold must be between 0.0 and 1.0, got {}",
                self.patterns.confidence_threshold
            ));
        }

        // Validate max patterns shown
        if self.patterns.max_patterns_shown == 0 || self.patterns.max_patterns_shown > 10 {
            return Err(format!(
                "max_patterns_shown must be between 1 and 10, got {}",
                self.patterns.max_patterns_shown
            ));
        }

        // Validate max history messages
        if self.enhancement.max_history_messages == 0 || self.enhancement.max_history_messages > 20 {
            return Err(format!(
                "max_history_messages must be between 1 and 20, got {}",
                self.enhancement.max_history_messages
            ));
        }

        // Validate max enhancement time
        if self.performance.max_enhancement_time_ms < 100 || self.performance.max_enhancement_time_ms > 5000 {
            return Err(format!(
                "max_enhancement_time_ms must be between 100 and 5000, got {}",
                self.performance.max_enhancement_time_ms
            ));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = TerminalConfig::default();
        assert!(config.enabled);
        assert!(config.voice.enabled);
        assert_eq!(config.voice.hotkey, "F13");
        assert!(config.typing.auto_enhance);
        assert_eq!(config.patterns.confidence_threshold, 0.75);
        assert_eq!(config.performance.max_enhancement_time_ms, 500);
    }

    #[test]
    fn test_validation_success() {
        let config = TerminalConfig::default();
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_validation_confidence_threshold() {
        let mut config = TerminalConfig::default();
        config.patterns.confidence_threshold = 1.5; // Invalid
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_validation_max_patterns() {
        let mut config = TerminalConfig::default();
        config.patterns.max_patterns_shown = 0; // Invalid
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_validation_max_history() {
        let mut config = TerminalConfig::default();
        config.enhancement.max_history_messages = 25; // Invalid
        assert!(config.validate().is_err());
    }
}
