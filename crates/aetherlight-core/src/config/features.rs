/**
 * Feature Configuration - Phase 1 Enhancements
 *
 * DESIGN DECISION: Separate module for feature-specific configuration
 * WHY: Phase 1 enhancements (code analysis, pattern extraction, etc.) need dedicated types
 *
 * REASONING CHAIN:
 * 1. Added 8 new configuration sections to .aetherlight.toml (118 lines)
 * 2. Need Rust types to deserialize these sections
 * 3. Grouped into 4 major categories: code_analysis, pattern_library.extraction, realtime_sync.events, terminal.enhancement
 * 4. Each section has subsections with specific configuration options
 * 5. Result: Type-safe configuration with sensible defaults
 *
 * PATTERN: Pattern-CONFIG-002 (Feature Configuration Types)
 * RELATED: CONFIGURATION_ENHANCEMENTS_2025-10-17.md, .aetherlight.toml v2.0
 * PERFORMANCE: <10ms deserialization (serde optimized)
 */

use serde::{Deserialize, Serialize};

// ============================================
// CODE ANALYSIS (Phase 0)
// ============================================

/// Code analysis configuration (Phase 0 - Code Analyzer)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct CodeAnalysisConfig {
    /// Enable code analysis features
    pub enabled: bool,

    /// Automatically analyze when opening workspace
    pub auto_analyze_on_open: bool,

    /// Languages to analyze
    pub languages: Vec<String>,

    /// Architecture pattern detection
    pub architecture: ArchitectureConfig,

    /// Complexity analysis
    pub complexity: ComplexityConfig,

    /// Technical debt tracking
    pub technical_debt: TechnicalDebtConfig,

    /// Sprint plan generation
    pub sprint_generation: SprintGenerationConfig,
}

impl Default for CodeAnalysisConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            auto_analyze_on_open: false,
            languages: vec![
                "typescript".to_string(),
                "javascript".to_string(),
                "rust".to_string(),
            ],
            architecture: ArchitectureConfig::default(),
            complexity: ComplexityConfig::default(),
            technical_debt: TechnicalDebtConfig::default(),
            sprint_generation: SprintGenerationConfig::default(),
        }
    }
}

impl CodeAnalysisConfig {
    /// Validate configuration
    pub fn validate(&self) -> Result<(), String> {
        if self.enabled && self.languages.is_empty() {
            return Err("At least one language must be specified when code analysis is enabled".to_string());
        }
        self.architecture.validate()?;
        self.complexity.validate()?;
        self.technical_debt.validate()?;
        self.sprint_generation.validate()?;
        Ok(())
    }
}

/// Architecture pattern detection configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct ArchitectureConfig {
    /// Enable pattern detection
    pub detect_patterns: bool,

    /// Minimum confidence threshold (0.0-1.0)
    pub min_confidence: f64,
}

impl Default for ArchitectureConfig {
    fn default() -> Self {
        Self {
            detect_patterns: true,
            min_confidence: 0.85,
        }
    }
}

impl ArchitectureConfig {
    pub fn validate(&self) -> Result<(), String> {
        if self.min_confidence < 0.0 || self.min_confidence > 1.0 {
            return Err(format!(
                "min_confidence must be between 0.0 and 1.0, got {}",
                self.min_confidence
            ));
        }
        Ok(())
    }
}

/// Complexity analysis configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct ComplexityConfig {
    /// Enable complexity analysis
    pub enabled: bool,

    /// Maximum cyclomatic complexity threshold
    pub max_cyclomatic_complexity: u32,

    /// Highlight refactoring targets
    pub highlight_refactoring_targets: bool,
}

impl Default for ComplexityConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            max_cyclomatic_complexity: 15,
            highlight_refactoring_targets: true,
        }
    }
}

impl ComplexityConfig {
    pub fn validate(&self) -> Result<(), String> {
        if self.max_cyclomatic_complexity == 0 {
            return Err("max_cyclomatic_complexity must be greater than 0".to_string());
        }
        Ok(())
    }
}

/// Technical debt tracking configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct TechnicalDebtConfig {
    /// Enable technical debt tracking
    pub enabled: bool,

    /// Categories to track
    pub categories: Vec<String>,

    /// Show debt items in VS Code problems panel
    pub show_in_problems_panel: bool,
}

impl Default for TechnicalDebtConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            categories: vec![
                "todo_comments".to_string(),
                "hardcoded_values".to_string(),
                "missing_error_handling".to_string(),
                "code_duplication".to_string(),
                "unused_code".to_string(),
                "magic_numbers".to_string(),
                "missing_tests".to_string(),
                "outdated_dependencies".to_string(),
            ],
            show_in_problems_panel: true,
        }
    }
}

impl TechnicalDebtConfig {
    pub fn validate(&self) -> Result<(), String> {
        if self.enabled && self.categories.is_empty() {
            return Err("At least one category must be specified when technical debt tracking is enabled".to_string());
        }
        Ok(())
    }
}

/// Sprint plan generation configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct SprintGenerationConfig {
    /// Automatically generate sprint plans after analysis
    pub auto_generate: bool,

    /// Sprint phases to generate
    pub phases: Vec<String>,

    /// Default task duration
    pub default_task_duration: String,
}

impl Default for SprintGenerationConfig {
    fn default() -> Self {
        Self {
            auto_generate: false,
            phases: vec![
                "enhancement".to_string(),
                "retrofit".to_string(),
                "dogfood".to_string(),
            ],
            default_task_duration: "4 hours".to_string(),
        }
    }
}

impl SprintGenerationConfig {
    pub fn validate(&self) -> Result<(), String> {
        if self.auto_generate && self.phases.is_empty() {
            return Err("At least one phase must be specified when auto_generate is enabled".to_string());
        }
        Ok(())
    }
}

// ============================================
// PATTERN EXTRACTION (Phase 0)
// ============================================

/// Pattern extraction configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct PatternExtractionConfig {
    /// Enable pattern extraction
    pub enabled: bool,

    /// Extract patterns from committed code
    pub auto_extract_on_commit: bool,

    /// Minimum quality score (0.0-1.0)
    pub quality_threshold: f64,

    /// Maximum cyclomatic complexity
    pub max_complexity: u32,

    /// Pattern categories
    pub categories: Vec<String>,
}

impl Default for PatternExtractionConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            auto_extract_on_commit: false,
            quality_threshold: 0.80,
            max_complexity: 15,
            categories: vec![
                "architecture".to_string(),
                "api_handler".to_string(),
                "data_model".to_string(),
                "utility".to_string(),
                "error_handling".to_string(),
                "authentication".to_string(),
                "validation".to_string(),
                "caching".to_string(),
                "testing".to_string(),
            ],
        }
    }
}

impl PatternExtractionConfig {
    pub fn validate(&self) -> Result<(), String> {
        if self.quality_threshold < 0.0 || self.quality_threshold > 1.0 {
            return Err(format!(
                "quality_threshold must be between 0.0 and 1.0, got {}",
                self.quality_threshold
            ));
        }
        if self.max_complexity == 0 {
            return Err("max_complexity must be greater than 0".to_string());
        }
        Ok(())
    }
}

/// Pattern validation configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct PatternValidationConfig {
    /// Enable pattern validation
    pub enabled: bool,

    /// Require Chain of Thought in extracted patterns
    pub require_chain_of_thought: bool,

    /// Require working code example
    pub require_code_example: bool,

    /// Minimum pattern length (lines of code)
    pub min_pattern_length: usize,

    /// Maximum pattern length (lines of code)
    pub max_pattern_length: usize,
}

impl Default for PatternValidationConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            require_chain_of_thought: true,
            require_code_example: true,
            min_pattern_length: 10,
            max_pattern_length: 200,
        }
    }
}

impl PatternValidationConfig {
    pub fn validate(&self) -> Result<(), String> {
        if self.min_pattern_length >= self.max_pattern_length {
            return Err(format!(
                "min_pattern_length ({}) must be less than max_pattern_length ({})",
                self.min_pattern_length, self.max_pattern_length
            ));
        }
        Ok(())
    }
}

// ============================================
// REAL-TIME SYNC EVENTS (Phase 3.9)
// ============================================

/// Real-time sync event filtering configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct RealtimeSyncEventsConfig {
    /// Broadcast TodoWrite events
    pub broadcast_todo_updates: bool,

    /// Broadcast Bash command errors
    pub broadcast_bash_errors: bool,

    /// Broadcast pattern extractions (Pattern-XXX-YYY discoveries)
    pub broadcast_pattern_extractions: bool,

    /// Broadcast file modifications (high volume)
    pub broadcast_file_changes: bool,

    /// Broadcast test pass/fail results
    pub broadcast_test_results: bool,
}

impl Default for RealtimeSyncEventsConfig {
    fn default() -> Self {
        Self {
            broadcast_todo_updates: true,
            broadcast_bash_errors: true,
            broadcast_pattern_extractions: true,
            broadcast_file_changes: false, // High volume, disabled by default
            broadcast_test_results: true,
        }
    }
}

impl RealtimeSyncEventsConfig {
    pub fn validate(&self) -> Result<(), String> {
        // All boolean flags, no validation needed
        Ok(())
    }
}

/// Real-time sync deduplication configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct RealtimeSyncDeduplicationConfig {
    /// Enable event deduplication
    pub enabled: bool,

    /// Deduplication window in minutes
    pub window_minutes: u32,

    /// Hash algorithm for event fingerprints
    pub hash_algorithm: String,
}

impl Default for RealtimeSyncDeduplicationConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            window_minutes: 5,
            hash_algorithm: "sha256".to_string(),
        }
    }
}

impl RealtimeSyncDeduplicationConfig {
    pub fn validate(&self) -> Result<(), String> {
        if self.enabled && self.window_minutes == 0 {
            return Err("window_minutes must be greater than 0 when deduplication is enabled".to_string());
        }
        if self.enabled && !["sha256", "sha1", "md5"].contains(&self.hash_algorithm.as_str()) {
            return Err(format!(
                "hash_algorithm must be one of: sha256, sha1, md5, got {}",
                self.hash_algorithm
            ));
        }
        Ok(())
    }
}

/// Real-time sync UI configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct RealtimeSyncUiConfig {
    /// Show Activity Feed TreeView
    pub show_activity_feed: bool,

    /// Show toast notifications for events
    pub show_notifications: bool,

    /// Notification duration in milliseconds
    pub notification_duration_ms: u32,

    /// Group events by type in UI
    pub group_by_type: bool,

    /// Maximum events displayed (older events pruned)
    pub max_events_displayed: usize,
}

impl Default for RealtimeSyncUiConfig {
    fn default() -> Self {
        Self {
            show_activity_feed: true,
            show_notifications: true,
            notification_duration_ms: 5000,
            group_by_type: true,
            max_events_displayed: 50,
        }
    }
}

impl RealtimeSyncUiConfig {
    pub fn validate(&self) -> Result<(), String> {
        if self.notification_duration_ms == 0 {
            return Err("notification_duration_ms must be greater than 0".to_string());
        }
        if self.max_events_displayed == 0 {
            return Err("max_events_displayed must be greater than 0".to_string());
        }
        Ok(())
    }
}

// ============================================
// TERMINAL INTENT CLASSIFICATION (Phase 3.10)
// ============================================

/// Terminal intent classification configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct TerminalIntentConfig {
    /// Enable intent classification before pattern matching
    pub enabled: bool,

    /// Intent types to detect
    pub intents: Vec<String>,

    /// Filter patterns by detected intent
    pub filter_patterns_by_intent: bool,
}

impl Default for TerminalIntentConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            intents: vec![
                "bug_fix".to_string(),
                "feature_add".to_string(),
                "refactor".to_string(),
                "documentation".to_string(),
                "testing".to_string(),
                "performance".to_string(),
                "security".to_string(),
            ],
            filter_patterns_by_intent: true,
        }
    }
}

impl TerminalIntentConfig {
    pub fn validate(&self) -> Result<(), String> {
        if self.enabled && self.intents.is_empty() {
            return Err("At least one intent type must be specified when intent classification is enabled".to_string());
        }
        Ok(())
    }
}

/// Terminal multi-pass pattern matching configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct TerminalMultiPassConfig {
    /// Enable multi-pass pattern matching
    pub enabled: bool,

    /// Pass 1: Exact semantic search
    pub pass_1_exact: bool,

    /// Pass 2: Query expansion with synonyms
    pub pass_2_expanded: bool,

    /// Pass 3: File context-aware search
    pub pass_3_context_aware: bool,

    /// Combine and re-rank all passes
    pub combine_results: bool,
}

impl Default for TerminalMultiPassConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            pass_1_exact: true,
            pass_2_expanded: true,
            pass_3_context_aware: true,
            combine_results: true,
        }
    }
}

impl TerminalMultiPassConfig {
    pub fn validate(&self) -> Result<(), String> {
        if self.enabled && !self.pass_1_exact && !self.pass_2_expanded && !self.pass_3_context_aware {
            return Err("At least one pass must be enabled when multi-pass matching is enabled".to_string());
        }
        Ok(())
    }
}

/// Terminal context validation configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct TerminalValidationConfig {
    /// Enable context validation
    pub enabled: bool,

    /// Check context completeness before prompting
    pub check_completeness: bool,

    /// Check all dependencies are available
    pub check_dependencies: bool,

    /// Check for conflicting patterns (slow)
    pub check_conflicts: bool,

    /// Ask clarifying questions if gaps detected
    pub ask_clarifying_questions: bool,
}

impl Default for TerminalValidationConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            check_completeness: true,
            check_dependencies: true,
            check_conflicts: false, // Slow, disabled by default
            ask_clarifying_questions: true,
        }
    }
}

impl TerminalValidationConfig {
    pub fn validate(&self) -> Result<(), String> {
        // All boolean flags, no validation needed
        Ok(())
    }
}

/// Terminal outcome tracking configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct TerminalOutcomesConfig {
    /// Enable outcome tracking
    pub enabled: bool,

    /// Track outcomes for every enhanced prompt
    pub track_every_prompt: bool,

    /// Request feedback: "always", "auto" (on errors), "never"
    pub request_feedback: String,

    /// Update pattern success rates from feedback
    pub update_pattern_scores: bool,
}

impl Default for TerminalOutcomesConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            track_every_prompt: true,
            request_feedback: "auto".to_string(),
            update_pattern_scores: true,
        }
    }
}

impl TerminalOutcomesConfig {
    pub fn validate(&self) -> Result<(), String> {
        if !["always", "auto", "never"].contains(&self.request_feedback.as_str()) {
            return Err(format!(
                "request_feedback must be one of: always, auto, never, got {}",
                self.request_feedback
            ));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Code Analysis Tests
    #[test]
    fn test_code_analysis_default() {
        let config = CodeAnalysisConfig::default();
        assert!(config.enabled);
        assert!(!config.auto_analyze_on_open);
        assert_eq!(config.languages.len(), 3);
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_architecture_config_validation() {
        let mut config = ArchitectureConfig::default();
        assert!(config.validate().is_ok());

        config.min_confidence = 1.5;
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_complexity_config_validation() {
        let mut config = ComplexityConfig::default();
        assert!(config.validate().is_ok());

        config.max_cyclomatic_complexity = 0;
        assert!(config.validate().is_err());
    }

    // Pattern Extraction Tests
    #[test]
    fn test_pattern_extraction_default() {
        let config = PatternExtractionConfig::default();
        assert!(config.enabled);
        assert!(!config.auto_extract_on_commit);
        assert_eq!(config.quality_threshold, 0.80);
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_pattern_validation_config() {
        let mut config = PatternValidationConfig::default();
        assert!(config.validate().is_ok());

        config.min_pattern_length = 200;
        config.max_pattern_length = 10;
        assert!(config.validate().is_err());
    }

    // Real-Time Sync Tests
    #[test]
    fn test_realtime_events_default() {
        let config = RealtimeSyncEventsConfig::default();
        assert!(config.broadcast_todo_updates);
        assert!(!config.broadcast_file_changes); // High volume
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_realtime_deduplication_config() {
        let mut config = RealtimeSyncDeduplicationConfig::default();
        assert!(config.validate().is_ok());

        config.hash_algorithm = "invalid".to_string();
        assert!(config.validate().is_err());
    }

    // Terminal Intent Tests
    #[test]
    fn test_terminal_intent_default() {
        let config = TerminalIntentConfig::default();
        assert!(config.enabled);
        assert_eq!(config.intents.len(), 7);
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_terminal_multi_pass_config() {
        let mut config = TerminalMultiPassConfig::default();
        assert!(config.validate().is_ok());

        config.pass_1_exact = false;
        config.pass_2_expanded = false;
        config.pass_3_context_aware = false;
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_terminal_outcomes_config() {
        let mut config = TerminalOutcomesConfig::default();
        assert!(config.validate().is_ok());

        config.request_feedback = "invalid".to_string();
        assert!(config.validate().is_err());
    }
}
