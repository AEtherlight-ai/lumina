/**
 * ÆtherLight Core Library
 *
 * DESIGN DECISION: Modular architecture with separate concerns for pattern storage,
 * confidence scoring, and matching algorithms
 * WHY: Separation of concerns enables independent testing, optimization, and evolution
 * of each subsystem while maintaining clear contracts between components
 *
 * REASONING CHAIN:
 * 1. Pattern matching systems require three distinct capabilities:
 *    - Pattern representation and storage (pattern.rs)
 *    - Confidence scoring with transparent breakdowns (confidence.rs)
 *    - Efficient matching algorithms across multiple dimensions (matching.rs)
 * 2. Separating these into modules enables:
 *    - Independent unit testing of each component
 *    - Performance optimization of matching without affecting storage
 *    - Clear ownership boundaries for memory safety
 *    - Parallel development by multiple contributors
 * 3. Error handling centralized in error.rs provides consistent error semantics
 * 4. FFI safety requires well-defined public API surface with C-compatible types
 * 5. Zero-cost abstractions achieved through monomorphization and inlining
 *
 * PATTERN: Pattern-001 (Rust Core + Language Bindings)
 * PATTERN: Pattern-005 (Multi-Dimensional Matching)
 * RELATED: aetherlight-node (NAPI-RS bindings), aetherlight-mobile (Flutter FFI)
 * FUTURE: Add embedding module when embedding library selected (P1-007)
 *
 * # Architecture Overview
 *
 * ```text
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    ÆtherLight Core                          │
 * ├─────────────────────────────────────────────────────────────┤
 * │  Pattern Storage    │  Confidence Scoring  │  Matching      │
 * │  (pattern.rs)       │  (confidence.rs)     │  (matching.rs) │
 * ├─────────────────────────────────────────────────────────────┤
 * │              Error Handling (error.rs)                      │
 * ├─────────────────────────────────────────────────────────────┤
 * │                   FFI Boundary                              │
 * │  (C-compatible exports for Tauri, Node.js, Flutter)         │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 *
 * # Performance Targets
 *
 * - Pattern matching: <50ms for 10,000 patterns (p50 latency)
 * - Memory usage: <50MB for 100,000 patterns in memory
 * - Binary size: <3MB for Tauri static linking
 * - FFI latency: <5ms for Node.js/Flutter calls
 *
 * # Safety Guarantees
 *
 * - Zero unsafe code in public API (unless explicitly documented)
 * - No panics in library code (all errors returned as Result)
 * - Thread-safe pattern storage with Sync + Send bounds
 * - Memory-safe FFI with validated pointer handling
 *
 * # Examples
 *
 * ```rust
 * use aetherlight_core::{Pattern, PatternMatcher, ConfidenceScore};
 *
 * // Create a pattern
 * let pattern = Pattern::new(
 *     "Rust error handling".to_string(),
 *     "Use Result<T, E> for fallible operations".to_string(),
 *     vec!["rust".to_string(), "error-handling".to_string()],
 * );
 *
 * // Initialize matcher with pattern library
 * let mut matcher = PatternMatcher::new();
 * matcher.add_pattern(pattern);
 *
 * // Match user prompt against patterns
 * let results = matcher.find_matches("How do I handle errors in Rust?", 5);
 *
 * // Access confidence breakdown
 * for result in results {
 *     println!("Pattern: {}", result.pattern.title);
 *     println!("Confidence: {:.2}%", result.confidence.total_score * 100.0);
 *     println!("Breakdown: {:?}", result.confidence.breakdown);
 * }
 * ```
 */

// DESIGN DECISION: Explicit module declarations with visibility control
// WHY: Clear API surface for FFI bindings, prevents accidental exposure of internals
//
// REASONING CHAIN:
// 1. Public modules (pub mod) expose core types for library consumers
// 2. Pattern, Confidence, and Error types must be public for FFI
// 3. Matching engine public for Rust consumers, wrapped for FFI
// 4. Internal helpers remain private (e.g., future utils module)
// 5. Re-exports at crate root provide ergonomic imports
//
// PATTERN: Pattern-001 (Rust Core + Language Bindings)
// RELATED: Pattern-007 (Language Bindings via NAPI)

pub mod error;
pub mod pattern;
pub mod confidence;
pub mod matching;
pub mod transcription;

// Re-enabled after ort 2.0 API migration completion
// DESIGN DECISION: Migrated to with_model_from_file(), Array2::from_shape_vec(), try_extract_raw_tensor()
// WHY: ort 2.0 API changes completed, embeddings now functional
// REQUIRED FOR: AI-005 (Pattern Index with semantic search)
pub mod embeddings;

pub mod vector_store;

// TEMPORARILY DISABLED FOR WEEK 0 LAUNCH: Depends on tree-sitter (requires C compiler)
// WHY: code_intelligence uses tree-sitter for AST parsing (Phase 3 feature)
// FUTURE: Re-enable in Phase 3 when tree-sitter dependencies restored
// pub mod code_intelligence;

pub mod analytics;
pub mod validation;
pub mod network;
pub mod crypto;
pub mod viral;
pub mod domain_agent;
pub mod domain_router;

// Re-enabled after embeddings module restored
// TEMPORARILY DISABLED: Depends on embeddings module (disabled above)
// pub mod domain_pattern_library;

// Domain agent implementations (P3.5-005+)
pub mod agents;

// Agent network for multi-agent collaboration (P3.5-007+)
pub mod agent_network;

// Content addressing system for Pattern-CONTEXT-002 (Phase 3.6)
pub mod content_addressing;

// Code map generator for AI-001 (Phase 3.6)
pub mod code_map;

// Verification system for AI-002 (Phase 3.6)
pub mod verification;

// Session handoff protocol for AI-004 (Phase 3.6)
pub mod session_handoff;

// Pattern index with semantic search for AI-005 (Phase 3.6)
pub mod pattern_index;

// Uncertainty quantification for AI-007 (Phase 3.6)
pub mod uncertainty;

// Progressive context loader for AI-006 (Phase 3.6)
pub mod context_loader;

// Shared knowledge database for AI-007 (Phase 3.6)
pub mod shared_knowledge;

// Validation agent for AI-010 (Phase 3.6)
pub mod validation_agent;

// Experiment runner for AI-011 (Phase 3.6)
pub mod experiment_runner;

// SOP updater for AI-012 (Phase 3.6)
pub mod sop_updater;

// Improvement reports for AI-013 (Phase 3.6)
pub mod improvement_reports;

// Sprint parser for autonomous sprint execution (Phase 4 - AS-001, AS-002)
pub mod sprint_parser;

// Task scheduler for autonomous sprint execution (Phase 4 - AS-003)
pub mod task_scheduler;

// File-based IPC system for agent coordination (Phase 4 - AS-014)
pub mod ipc;

// Function registry for dynamic host app integration (Phase 3.7 - P3.7-001)
pub mod function_registry;

// Function call generator for natural language to JSON (Phase 3.7 - P3.7-002)
pub mod function_call_generator;

// Multi-turn conversation manager for parameter clarification (Phase 3.7 - P3.7-003)
pub mod conversation_manager;

// Configuration system (Phase 3.9 - CONFIG-001, CONFIG-002)
pub mod config;

// CLI commands (Phase 3.9 - CONFIG-003)
pub mod cli;

// Real-time context sync (Phase 3.9 - RTC-001, RTC-002)
pub mod realtime_sync;

// DESIGN DECISION: Re-export primary types at crate root
// WHY: Ergonomic imports for library consumers (use aetherlight_core::Pattern)
//
// REASONING CHAIN:
// 1. Users should import Pattern, not aetherlight_core::pattern::Pattern
// 2. Reduces import verbosity across codebase
// 3. Standard Rust library practice (std::io::Error vs std::Error)
// 4. Enables future refactoring without breaking API
// 5. FFI bindings reference crate root types
//
// PATTERN: Rust API design best practices
// FUTURE: Add prelude module for glob imports (use aetherlight_core::prelude::*)

pub use error::{Error, Result};
pub use pattern::Pattern;
pub use confidence::{ConfidenceScore, ConfidenceBreakdown};
pub use matching::{PatternMatcher, MatchResult};
pub use transcription::{Transcriber, TranscriptionResult};

// Re-enabled after ort 2.0 API migration (REQUIRED FOR: AI-005)
pub use embeddings::{LocalEmbeddings, Embedding, EMBEDDING_DIM};

pub use vector_store::{SqliteVectorStore, SearchResult as VectorSearchResult};

// TEMPORARILY DISABLED FOR WEEK 0 LAUNCH: code_intelligence module disabled
// pub use code_intelligence::{
//     CodeChunk, CodeChunker, Language,
//     DocumentChunk, DocumentChunker, DocumentType,
//     SemanticSearch, SearchQuery, CodeSearchResult,
//     CodebaseIndexer, IndexingResult, SearchResult as IndexerSearchResult, ProgressCallback
// };

pub use analytics::{
    UsageTracker, UsageMetrics, Metrics, MetricsPeriod, EventType
};
pub use validation::{
    PatternValidator, ValidationResult, ValidationStatus,
    QualityChecker, QualityIssue, QualityIssueType, Severity,
    SecurityScanner, SecurityIssue, SecuritySeverity
};
pub use network::{
    HierarchicalDHTClient, PublishResult, FindResult, DHTError,
    KademliaNode, NodeStatus
};
pub use crypto::{
    ShamirKeyManager, ShamirError, KeyShard
};
pub use viral::{
    InvitationManager, Invitation, InvitationStatus, InvitationError,
    StorageQuotaManager, StorageStats, UserTier, QuotaError
};

// Re-enabled after embeddings module restored
// TEMPORARILY DISABLED: domain_pattern_library module disabled (depends on embeddings)
// pub use domain_pattern_library::{
//     DomainPatternLibrary, DomainEmbeddings
// };

pub use domain_agent::{
    Domain, Problem, Solution, SearchLevel, DomainAgent,
    EscalationEngine, EscalationPath
};

pub use domain_router::{
    DomainRoutingTable, DomainClassification, ProblemCategory
};

// Domain agent implementations (P3.5-005+)
pub use agents::{
    InfrastructureAgent,
    QualityAgent,
    ScalabilityAgent,
    KnowledgeAgent,
    InnovationAgent,
    DeploymentAgent,
    EthicsAgent,
    create_domain_patterns,
    create_domain_embeddings,
};

// Agent network (P3.5-007+)
pub use agent_network::{AgentNetwork, AgentMessage, AgentResponse, AgentConnection};

// Content addressing (Phase 3.6 - Pattern-CONTEXT-002)
pub use content_addressing::{
    ContentAddress, ContentRef, HashCache, CrossReferenceIndex, Dependent, calculate_sha256
};

// Code map (Phase 3.6 - AI-001)
pub use code_map::{
    CodeMap, Module, Dependency, DependencyType, Symbol, SymbolType, Visibility,
    Import, CallGraph, CallNode, DataFlow,
    RustParser, DependencyGraph, ImpactAnalyzer, JsonExporter
};

// Verification system (Phase 3.6 - AI-002)
pub use verification::{
    VerificationSystem, VerificationConfig, AgentClaim, VerificationResult,
    FileVerifier, FunctionVerifier, TestVerifier, PerformanceVerifier, ClaimParser
};

// Session handoff (Phase 3.6 - AI-004)
pub use session_handoff::{
    SessionHandoff, HandoffGenerator, HandoffLoader,
    Task, TaskStatus, FileChange, ChangeType, PatternReference, Decision,
    Blocker, BlockerSeverity, Question, ContextReference, Learning,
    PatternExtraction, VerificationRecord
};

// Pattern index (Phase 3.6 - AI-005)
pub use pattern_index::{
    PatternIndex, IndexedPattern, PatternMatch, SearchContext,
    PatternIndexStatistics
};

// Uncertainty quantification (Phase 3.6 - AI-007 + AI-008)
pub use uncertainty::{
    UncertaintyQuantifier, ConfidenceLevel, UncertaintyScore, ConfidenceIndicator,
    IndicatorType, AssessmentContext,
    // AI-008: Calibration system (rename AgentResponse to avoid conflict with agent_network)
    AgentResponse as ConfidentAgentResponse, UncertaintyFactor, FactorCategory,
    CalibrationRecord, CalibrationStatistics, ConfidenceBin,
    Calibrator, ConfidenceScorer,
};

// Progressive context loader (Phase 3.6 - AI-006)
pub use context_loader::{
    ContextLoader, ContextLoadStrategy, LoadedContext, Task as ContextTask,
    Section, SectionType,
    analyzer::{ContextAnalyzer, TaskAnalysis, Complexity},
    loader::SectionLoader,
    assembler::ContextAssembler,
};

// Shared knowledge database (Phase 3.6 - AI-007)
pub use shared_knowledge::{
    SharedKnowledge, KnowledgeDatabase, DatabaseStatistics,
    Discovery, DiscoveryRecord,
    KnowledgeQuery, DiscoveryType, QueryRanker, SemanticQuery,
    SyncedKnowledgeDatabase, AgentSyncCoordinator, ConflictResolver, ConflictResolution
};
// Note: Severity is already exported from validation module, so not re-exported here
// Use shared_knowledge::Severity when needed

// Validation agent (Phase 3.6 - AI-010)
pub use validation_agent::{
    ValidationAgent,
    types::{
        AgentExecution, AgentType as ValidationAgentType, TaskType as ValidationTaskType,
        Approach, Experiment, ExperimentStatus, ExperimentResult,
        GroupResults, Winner, Analysis, AgentPerformance, TaskPerformance,
        PatternUsage, Bottleneck, CommonError, Trend
    },
    tracker::{ExecutionTracker, ExecutionStatistics},
    analyzer::ExecutionAnalyzer,
};
// Note: AgentType and TaskType renamed to ValidationAgentType/ValidationTaskType to avoid conflicts

// Experiment runner (Phase 3.6 - AI-011)
pub use experiment_runner::ExperimentRunner;

// SOP updater (Phase 3.6 - AI-012)
pub use sop_updater::SOPUpdater;

// Improvement reports (Phase 3.6 - AI-013)
pub use improvement_reports::{
    ImprovementReport, ImprovementReportGenerator, TrendAnalysis, PerformanceTrend,
    TrendDirection, Finding, Recommendation,
};

// Sprint parser (Phase 4 - AS-001, AS-002, AS-003)
pub use sprint_parser::{
    SprintPlan, SprintMetadata, ExecutableSprintPlan,
    Task as SprintTask, TaskId, AgentType,
    ApprovalGate, ParallelGroup, TaskContext,
    YamlParser, Validator as SprintValidator,
    SprintDependencyGraph, TaskNode,
    parse_sprint_file, parse_sprint_str
};
// Note: Task renamed to SprintTask to avoid conflict with session_handoff::Task and context_loader::Task
// Note: DependencyGraph renamed to SprintDependencyGraph to avoid conflict with code_map::DependencyGraph

// Task scheduler (Phase 4 - AS-003)
pub use task_scheduler::{
    TaskScheduler,
    ExecutionState, TaskStatus as SchedulerTaskStatus, AgentAssignment,
    ProgressMonitor, SprintMetrics, SprintResult
};
// Note: TaskStatus renamed to SchedulerTaskStatus to avoid conflicts

// File-based IPC (Phase 4 - AS-014)
pub use ipc::{
    CompletionSignal, TaskStatus as IPCTaskStatus,
    SignalWriter, SignalReader
};
// Note: TaskStatus renamed to IPCTaskStatus to avoid conflict with SchedulerTaskStatus

// Function registry (Phase 3.7 - P3.7-001)
pub use function_registry::{
    FunctionRegistry, RegisteredFunction, FunctionParameter, FunctionMatch,
    RegistryError, RegistryStatistics
};

// Function call generator (Phase 3.7 - P3.7-002)
pub use function_call_generator::{
    FunctionCallGenerator, FunctionCall, ParameterValue
};

// Multi-turn conversation manager (Phase 3.7 - P3.7-003)
pub use conversation_manager::{
    ConversationManager, ConversationSession, ConversationTurn
};

// Configuration (Phase 3.9 - CONFIG-001, CONFIG-002, CONFIG-004)
pub use config::{
    ConfigLoader, ConfigLevel, AetherlightConfig,
    SyncConfig, PrivacyMode,
    TerminalConfig,
    ConfigValidator,
    PolicyAction, PolicyBuilder, PolicyConfig, PolicyEnforcer,
};

// CLI (Phase 3.9 - CONFIG-003)
pub use cli::ConfigCli;

// Real-time context sync (Phase 3.9 - RTC-001, RTC-002)
pub use realtime_sync::{
    ConnectionInfo, SyncEventType, ServerStats, SyncEvent, WsMessage,
    ServerState, WsSession, ws_route, health_check, stats_endpoint,
};

// DESIGN DECISION: Semantic versioning with compile-time version constants
// WHY: Enable version checking at runtime for FFI compatibility validation
//
// REASONING CHAIN:
// 1. FFI bindings must verify core library version compatibility
// 2. Compile-time constants enable zero-cost version checks
// 3. Semantic versioning communicates breaking changes
// 4. Version embedded in binary for debugging and support
// 5. Automated version bumps via cargo-release in CI/CD
//
// PATTERN: Pattern-001 (Rust Core + Language Bindings)
// RELATED: CI/CD version validation, FFI compatibility checks
// FUTURE: Add version negotiation protocol for distributed pattern network

pub const VERSION_MAJOR: u32 = 0;
pub const VERSION_MINOR: u32 = 1;
pub const VERSION_PATCH: u32 = 0;

/// Returns the library version as a semantic version string
///
/// DESIGN DECISION: Runtime version string for logging and diagnostics
/// WHY: Enable version logging in production for debugging and support
///
/// # Examples
///
/// ```rust
/// use aetherlight_core::version;
/// println!("ÆtherLight Core v{}", version());
/// ```
pub fn version() -> String {
    format!("{}.{}.{}", VERSION_MAJOR, VERSION_MINOR, VERSION_PATCH)
}

#[cfg(test)]
mod tests {
    use super::*;

    /**
     * Test: Version string formatting
     *
     * DESIGN DECISION: Validate version string format at compile time
     * WHY: Ensure version string conforms to semantic versioning
     *
     * REASONING CHAIN:
     * 1. Version string must match semver format (MAJOR.MINOR.PATCH)
     * 2. Test runs at compile time via cargo test
     * 3. Prevents accidental version string corruption
     * 4. Validates version constants are properly formatted
     *
     * PATTERN: Test-Driven Development (SOP-003)
     */
    #[test]
    fn test_version_string() {
        let ver = version();
        assert_eq!(ver, "0.1.0");
        assert!(ver.contains('.'));
    }

    /**
     * Test: Version constants are non-zero for initial release
     *
     * DESIGN DECISION: Validate version constants at compile time
     * WHY: Prevent accidental zero version in production builds
     */
    #[test]
    fn test_version_constants() {
        assert_eq!(VERSION_MAJOR, 0);
        assert_eq!(VERSION_MINOR, 1);
        assert_eq!(VERSION_PATCH, 0);
    }
}
