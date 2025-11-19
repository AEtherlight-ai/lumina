/**
 * TypeScript Configuration Types
 *
 * DESIGN DECISION: Mirror Rust config types in TypeScript
 * WHY: Type-safe config management in VS Code extension
 *
 * REASONING CHAIN:
 * 1. Rust defines canonical config schema
 * 2. TypeScript needs matching types for VS Code settings
 * 3. Serde serialization ensures JSON compatibility
 * 4. Type definitions enable autocomplete + validation
 * 5. Result: Type-safe config management across Rust/TypeScript
 *
 * PATTERN: Pattern-CONFIG-001 (Hierarchical Configuration)
 * RELATED: crates/aetherlight-core/src/config/
 * PERFORMANCE: <10ms type checking
 */

/**
 * Configuration hierarchy level
 */
export enum ConfigLevel {
    System = 0,   // Global defaults
    Team = 1,     // Shared team policies
    Project = 2,  // Repository-specific
    User = 3      // Personal preferences (highest priority)
}

/**
 * Voice configuration
 */
export interface VoiceConfig {
    enabled: boolean;
    hotkey: string;  // Default: ` (backtick)
    auto_transcribe: boolean;
    openai_model: string;  // Default: "whisper-1"
    language: string;
}

/**
 * Typing configuration
 */
export interface TypingConfig {
    auto_enhance: boolean;
    show_preview: boolean;
    preview_delay_ms: number;
}

/**
 * Enhancement configuration
 */
export interface EnhancementConfig {
    include_patterns: boolean;
    include_file_context: boolean;
    include_project_state: boolean;
    include_error_context: boolean;
    include_history: boolean;
    confidence_threshold: number;
    max_context_tokens: number;
    max_history_messages: number;
}

/**
 * Pattern display configuration
 */
export interface PatternConfig {
    show_inline: boolean;
    show_sidebar: boolean;
    confidence_threshold: number;
    max_patterns_shown: number;
}

/**
 * Performance configuration
 */
export interface PerformanceConfig {
    max_enhancement_time_ms: number;
    cache_enabled: boolean;
}

/**
 * Terminal middleware configuration
 */
export interface TerminalConfig {
    enabled: boolean;
    voice: VoiceConfig;
    typing: TypingConfig;
    enhancement: EnhancementConfig;
    patterns: PatternConfig;
    performance: PerformanceConfig;
}

/**
 * Complete ÆtherLight configuration (v2.0 with Phase 1 enhancements)
 */
export interface AetherlightConfig {
    terminal: TerminalConfig;

    // Phase 1 Enhancements (2025-10-17)
    code_analysis?: CodeAnalysisConfig;
    pattern_library?: PatternLibraryConfig;
    terminal_enhancement?: TerminalEnhancementConfig;

    level?: ConfigLevel;
    source_path?: string;
}

// ============================================
// PHASE 1 ENHANCEMENTS - CODE ANALYSIS
// ============================================

export interface CodeAnalysisConfig {
    enabled: boolean;
    auto_analyze_on_open: boolean;
    languages: string[];
    architecture: ArchitectureConfig;
    complexity: ComplexityConfig;
    technical_debt: TechnicalDebtConfig;
    sprint_generation: SprintGenerationConfig;
}

export interface ArchitectureConfig {
    detect_patterns: boolean;
    min_confidence: number;
}

export interface ComplexityConfig {
    enabled: boolean;
    max_cyclomatic_complexity: number;
    highlight_refactoring_targets: boolean;
}

export interface TechnicalDebtConfig {
    enabled: boolean;
    categories: string[];
    show_in_problems_panel: boolean;
}

export interface SprintGenerationConfig {
    auto_generate: boolean;
    phases: string[];
    default_task_duration: string;
}

// ============================================
// PHASE 1 ENHANCEMENTS - PATTERN LIBRARY
// ============================================

export interface PatternLibraryConfig {
    extraction: PatternExtractionConfig;
    validation: PatternValidationConfig;
}

export interface PatternExtractionConfig {
    enabled: boolean;
    auto_extract_on_commit: boolean;
    quality_threshold: number;
    max_complexity: number;
    categories: string[];
}

export interface PatternValidationConfig {
    enabled: boolean;
    require_chain_of_thought: boolean;
    require_code_example: boolean;
    min_pattern_length: number;
    max_pattern_length: number;
}

// ============================================
// PHASE 1 ENHANCEMENTS - TERMINAL ENHANCEMENT
// ============================================

export interface TerminalEnhancementConfig {
    intent: TerminalIntentConfig;
    multi_pass: TerminalMultiPassConfig;
    validation: TerminalValidationConfig;
    outcomes: TerminalOutcomesConfig;
}

export interface TerminalIntentConfig {
    enabled: boolean;
    intents: string[];
    filter_patterns_by_intent: boolean;
}

export interface TerminalMultiPassConfig {
    enabled: boolean;
    pass_1_exact: boolean;
    pass_2_expanded: boolean;
    pass_3_context_aware: boolean;
    combine_results: boolean;
}

export interface TerminalValidationConfig {
    enabled: boolean;
    check_completeness: boolean;
    check_dependencies: boolean;
    check_conflicts: boolean;
    ask_clarifying_questions: boolean;
}

export interface TerminalOutcomesConfig {
    enabled: boolean;
    track_every_prompt: boolean;
    request_feedback: string;
    update_pattern_scores: boolean;
}

/**
 * Default terminal configuration
 */
export const DEFAULT_TERMINAL_CONFIG: TerminalConfig = {
    enabled: true,
    voice: {
        enabled: true,
        hotkey: "`",  // Backtick for voice capture
        auto_transcribe: true,
        openai_model: "whisper-1",  // OpenAI Whisper API model
        language: "en"
    },
    typing: {
        auto_enhance: true,
        show_preview: true,
        preview_delay_ms: 500
    },
    enhancement: {
        include_patterns: true,
        include_file_context: true,
        include_project_state: true,
        include_error_context: true,
        include_history: false,
        confidence_threshold: 0.75,
        max_context_tokens: 5000,
        max_history_messages: 5
    },
    patterns: {
        show_inline: true,
        show_sidebar: true,
        confidence_threshold: 0.75,
        max_patterns_shown: 5
    },
    performance: {
        max_enhancement_time_ms: 500,
        cache_enabled: true
    }
};

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: AetherlightConfig = {
    terminal: DEFAULT_TERMINAL_CONFIG,
    level: ConfigLevel.System
};

/**
 * Configuration validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}