/**
 * Function Registry Module - Dynamic Host App Integration
 *
 * DESIGN DECISION: Semantic function matching via embeddings
 * WHY: Natural language queries need fuzzy matching (not exact string match)
 *
 * REASONING CHAIN:
 * 1. Host applications register functions dynamically via IPC
 * 2. Users invoke functions with natural language ("Find John Doe's cases")
 * 3. Semantic embeddings enable fuzzy matching (handles query variations)
 * 4. Confidence scores guide parameter extraction and user feedback
 * 5. Result: Natural voice control for ANY application with <20ms latency
 *
 * PATTERN: Pattern-REGISTRY-001 (Dynamic Function Registration)
 * RELATED: P3.7-001, Phase 3.7 Application Integration, AI-005 Pattern Index
 * PERFORMANCE: <20ms to match function, <100k functions supported
 */

pub mod types;
pub mod registry;

pub use types::{RegisteredFunction, FunctionParameter, FunctionMatch, RegistryError};
pub use registry::{FunctionRegistry, RegistryStatistics};
