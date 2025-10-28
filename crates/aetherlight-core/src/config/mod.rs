/**
 * Configuration Module - ÆtherLight Core
 *
 * DESIGN DECISION: 4-tier hierarchical configuration system
 * WHY: Different stakeholders need different control levels
 *
 * REASONING CHAIN:
 * 1. Enterprise IT needs policy enforcement (security, compliance)
 * 2. Teams need shared conventions (avoid manual synchronization)
 * 3. Projects need repo-specific overrides (sensitive repositories)
 * 4. Users need personal preferences (notification styles, privacy)
 * 5. Resolution: User > Project > Team > System (last one wins)
 *
 * PATTERN: Pattern-CONFIG-001 (Hierarchical Configuration)
 * RELATED: RTC-005 (Security & Privacy), Sprint 0 (Phase 3.9)
 * PERFORMANCE: <50ms config load, <100ms hot reload
 */

pub mod features;
pub mod loader;
pub mod policy;
pub mod sync;
pub mod terminal;
pub mod validator;

pub use features::{
    ArchitectureConfig, CodeAnalysisConfig, ComplexityConfig, PatternExtractionConfig,
    PatternValidationConfig, RealtimeSyncDeduplicationConfig, RealtimeSyncEventsConfig,
    RealtimeSyncUiConfig, SprintGenerationConfig, TechnicalDebtConfig, TerminalIntentConfig,
    TerminalMultiPassConfig, TerminalOutcomesConfig, TerminalValidationConfig,
};
pub use loader::{AetherlightConfig, ConfigLoader, ConfigLevel};
pub use policy::{PolicyAction, PolicyBuilder, PolicyConfig, PolicyEnforcer};
pub use sync::{PrivacyMode, SyncConfig};
pub use terminal::TerminalConfig;
pub use validator::ConfigValidator;
