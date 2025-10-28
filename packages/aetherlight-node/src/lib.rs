#![deny(clippy::all)]
/**
 * NAPI-RS FFI Bindings for ÆtherLight Core
 *
 * DESIGN DECISION: Thin FFI wrapper layer with NAPI-RS automatic binding generation
 * WHY: Zero-cost abstractions with type-safe JavaScript/TypeScript integration
 *
 * REASONING CHAIN:
 * 1. NAPI-RS proc macros (#[napi]) generate JavaScript bindings automatically
 * 2. Type conversions handled by NAPI-RS (Rust String ↔ JS string, etc.)
 * 3. Error handling: Rust Result ↔ JavaScript Error/Promise rejection
 * 4. Memory safety: NAPI manages ownership across FFI boundary
 * 5. Zero-copy where possible (strings, buffers) for <5ms latency target
 * 6. TypeScript definitions auto-generated from Rust types
 *
 * PATTERN: Pattern-007 (Language Bindings via NAPI)
 * PATTERN: Pattern-001 (Rust Core + Language Bindings)
 * RELATED: aetherlight-core (core library), VS Code extension (P1-009)
 * PERFORMANCE: <5ms FFI latency, <3MB binary size
 * FUTURE: Add async pattern matching with worker threads (P1-011)
 *
 * # FFI Architecture
 *
 * ```text
 * JavaScript/TypeScript
 *     ↓ (NAPI-RS auto-generated bindings)
 * PatternMatcherFFI (this module)
 *     ↓ (thin wrapper)
 * aetherlight_core::PatternMatcher
 *     ↓ (core algorithm)
 * Pattern matching result
 *     ↓ (auto-serialized by NAPI-RS)
 * JavaScript Promise<MatchResult[]>
 * ```
 *
 * # Examples (JavaScript/TypeScript consumer)
 *
 * ```typescript
 * import { PatternMatcher, Pattern } from '@aetherlight/node';
 *
 * const matcher = new PatternMatcher();
 *
 * const pattern = new Pattern(
 *   "Rust error handling",
 *   "Use Result<T, E> for fallible operations",
 *   ["rust", "error-handling"]
 * );
 * matcher.addPattern(pattern);
 *
 * const results = matcher.findMatches("How do I handle errors in Rust?", 5);
 * console.log(`Found ${results.length} matches`);
 * console.log(`Confidence: ${results[0].confidence.totalScore * 100}%`);
 * ```
 */
use napi::bindgen_prelude::*;
use napi_derive::napi;
use aetherlight_core::{
    PatternMatcher as CoreMatcher,
    Pattern as CorePattern,
    MatchResult as CoreMatchResult,
    ConfidenceScore as CoreConfidenceScore,
    ConfidenceBreakdown as CoreConfidenceBreakdown,
    Error as CoreError,
    PatternIndex as CorePatternIndex,
    PatternMatch as CorePatternMatch,
    SearchContext as CoreSearchContext,
    PatternIndexStatistics as CoreStatistics,
};
use uuid::Uuid;
use std::path::PathBuf;
use std::collections::HashMap;

/**
 * Convert Rust core errors to NAPI errors
 *
 * DESIGN DECISION: Helper function instead of From trait to avoid orphan rules
 * WHY: Cannot implement From<CoreError> for napi::Error (both are external types)
 *
 * REASONING CHAIN:
 * 1. Rust panics cannot cross FFI boundary safely (undefined behavior)
 * 2. All Rust errors returned as Result (no panics in library code)
 * 3. NAPI-RS converts Result::Err to JavaScript Error automatically
 * 4. Error messages preserved from Rust (user-facing, no internal details)
 * 5. JavaScript consumers can catch errors with try/catch
 * 6. Helper function pattern avoids orphan rule violation (cannot impl foreign trait on foreign type)
 *
 * PATTERN: Pattern-007 (Language Bindings via NAPI)
 * RELATED: aetherlight_core::Error
 */
fn convert_error(err: CoreError) -> napi::Error {
    napi::Error::new(napi::Status::GenericFailure, err.to_string())
}

/**
 * FFI wrapper for Pattern
 *
 * DESIGN DECISION: JavaScript class with constructor and getters
 * WHY: Idiomatic JavaScript API (new Pattern(...), pattern.title)
 *
 * REASONING CHAIN:
 * 1. #[napi(constructor)] generates JavaScript constructor
 * 2. #[napi(getter)] generates JavaScript property getters
 * 3. Core Pattern wrapped, not exposed directly (encapsulation)
 * 4. Immutable from JavaScript perspective (getters only, no setters)
 * 5. Auto-serializable to JSON via NAPI-RS
 *
 * PATTERN: Pattern-007 (Language Bindings via NAPI)
 * RELATED: aetherlight_core::Pattern
 * FUTURE: Add builder pattern for JavaScript (P1-010)
 */
#[napi]
pub struct Pattern {
    inner: CorePattern,
}

#[napi]
impl Pattern {
    /**
     * Create a new pattern
     *
     * DESIGN DECISION: Simple constructor with required fields
     * WHY: JavaScript consumers expect new Pattern(title, content, tags)
     *
     * # JavaScript Example
     *
     * ```javascript
     * const pattern = new Pattern(
     *   "Rust error handling",
     *   "Use Result<T, E> for fallible operations",
     *   ["rust", "error-handling"]
     * );
     * ```
     */
    #[napi(constructor)]
    pub fn new(title: String, content: String, tags: Vec<String>) -> Self {
        Self {
            inner: CorePattern::new(title, content, tags),
        }
    }

    /**
     * Get pattern ID (UUID as string)
     *
     * DESIGN DECISION: Return UUID as string, not buffer
     * WHY: JavaScript consumers expect string UUIDs (JSON-serializable)
     */
    #[napi(getter)]
    pub fn id(&self) -> String {
        self.inner.id().to_string()
    }

    /**
     * Get pattern title
     */
    #[napi(getter)]
    pub fn title(&self) -> String {
        self.inner.title().to_string()
    }

    /**
     * Get pattern content
     */
    #[napi(getter)]
    pub fn content(&self) -> String {
        self.inner.content().to_string()
    }

    /**
     * Get pattern tags
     */
    #[napi(getter)]
    pub fn tags(&self) -> Vec<String> {
        self.inner.tags().to_vec()
    }

    /**
     * Get pattern metadata as JSON string
     *
     * DESIGN DECISION: Return metadata as JSON string (not serde_json::Value)
     * WHY: serde_json::Value doesn't implement NAPI traits; string easily parsed in JavaScript
     *
     * REASONING CHAIN:
     * 1. NAPI-RS cannot serialize serde_json::Value directly (no NapiRaw impl)
     * 2. String is universally compatible across FFI boundary
     * 3. JavaScript consumers can JSON.parse() the string
     * 4. Alternative: Define separate PatternMetadata struct with #[napi(object)]
     * 5. JSON string simpler for optional fields (language?, framework?, domain?)
     *
     * # JavaScript Example
     *
     * ```javascript
     * const metadata = JSON.parse(pattern.metadata);
     * console.log(metadata.language); // "rust"
     * ```
     */
    #[napi(getter)]
    pub fn metadata(&self) -> Result<String> {
        let metadata = self.inner.metadata();
        let json = serde_json::json!({
            "language": metadata.language,
            "framework": metadata.framework,
            "domain": metadata.domain,
        });
        serde_json::to_string(&json)
            .map_err(|e| convert_error(CoreError::from(e)))
    }

    /**
     * Get creation timestamp as ISO 8601 string
     *
     * DESIGN DECISION: Return ISO 8601 string, not timestamp integer
     * WHY: JavaScript Date constructor accepts ISO 8601 strings natively
     *
     * # JavaScript Example
     *
     * ```javascript
     * const createdAt = new Date(pattern.createdAt);
     * ```
     */
    #[napi(getter, js_name = "createdAt")]
    pub fn created_at(&self) -> String {
        self.inner.created_at().to_rfc3339()
    }

    /**
     * Get modification timestamp as ISO 8601 string
     */
    #[napi(getter, js_name = "modifiedAt")]
    pub fn modified_at(&self) -> String {
        self.inner.modified_at().to_rfc3339()
    }

    /**
     * Serialize pattern to JSON string
     *
     * DESIGN DECISION: Explicit toJSON method for serialization
     * WHY: Enable JSON.stringify(pattern) in JavaScript
     *
     * # JavaScript Example
     *
     * ```javascript
     * const json = JSON.stringify(pattern);
     * const stored = localStorage.setItem('pattern', json);
     * ```
     */
    #[napi(js_name = "toJSON")]
    pub fn to_json(&self) -> Result<String> {
        serde_json::to_string(&self.inner)
            .map_err(|e| convert_error(CoreError::from(e)))
    }

    /**
     * Deserialize pattern from JSON string
     *
     * DESIGN DECISION: Static method for deserialization
     * WHY: Enable Pattern.fromJSON(json) in JavaScript
     *
     * # JavaScript Example
     *
     * ```javascript
     * const json = localStorage.getItem('pattern');
     * const pattern = Pattern.fromJSON(json);
     * ```
     */
    #[napi(factory, js_name = "fromJSON")]
    pub fn from_json(json: String) -> Result<Self> {
        let inner: CorePattern = serde_json::from_str(&json)
            .map_err(|e| convert_error(CoreError::from(e)))?;
        Ok(Self { inner })
    }
}

/**
 * FFI wrapper for ConfidenceBreakdown
 *
 * DESIGN DECISION: Plain JavaScript object (not class)
 * WHY: Breakdown is data-only (no methods), plain object more idiomatic
 *
 * REASONING CHAIN:
 * 1. #[napi(object)] generates plain JavaScript object type
 * 2. All fields public (JavaScript consumers need read access)
 * 3. TypeScript definitions auto-generated with correct types
 * 4. JSON-serializable by default
 *
 * PATTERN: Pattern-007 (Language Bindings via NAPI)
 * RELATED: aetherlight_core::ConfidenceBreakdown
 */
#[napi(object)]
pub struct ConfidenceBreakdown {
    pub semantic_similarity: f64,
    pub context_match: f64,
    pub keyword_overlap: f64,
    pub historical_success_rate: f64,
    pub pattern_recency: f64,
    pub user_preference: f64,
    pub team_usage: f64,
    pub global_usage: f64,
    pub security_score: f64,
    pub code_quality_score: f64,
}

impl From<CoreConfidenceBreakdown> for ConfidenceBreakdown {
    fn from(core: CoreConfidenceBreakdown) -> Self {
        Self {
            semantic_similarity: core.semantic_similarity,
            context_match: core.context_match,
            keyword_overlap: core.keyword_overlap,
            historical_success_rate: core.historical_success_rate,
            pattern_recency: core.pattern_recency,
            user_preference: core.user_preference,
            team_usage: core.team_usage,
            global_usage: core.global_usage,
            security_score: core.security_score,
            code_quality_score: core.code_quality_score,
        }
    }
}

/**
 * FFI wrapper for ConfidenceScore
 *
 * DESIGN DECISION: JavaScript class with getters for transparency
 * WHY: Encapsulate score calculation, expose total and breakdown
 */
#[napi]
pub struct ConfidenceScore {
    inner: CoreConfidenceScore,
}

#[napi]
impl ConfidenceScore {
    /**
     * Get total confidence score [0.0, 1.0]
     */
    #[napi(getter, js_name = "totalScore")]
    pub fn total_score(&self) -> f64 {
        self.inner.total_score()
    }

    /**
     * Get confidence breakdown (individual dimension scores)
     */
    #[napi(getter)]
    pub fn breakdown(&self) -> ConfidenceBreakdown {
        self.inner.breakdown().clone().into()
    }

    /**
     * Check if confidence meets threshold
     *
     * # JavaScript Example
     *
     * ```javascript
     * if (score.meetsThreshold(0.85)) {
     *   console.log("High confidence match!");
     * }
     * ```
     */
    #[napi(js_name = "meetsThreshold")]
    pub fn meets_threshold(&self, threshold: f64) -> bool {
        self.inner.meets_threshold(threshold)
    }
}

/**
 * FFI wrapper for MatchResult
 *
 * DESIGN DECISION: JavaScript class with getters (not plain object)
 * WHY: Contains complex types (Pattern, ConfidenceScore) which are classes
 *
 * REASONING CHAIN:
 * 1. #[napi(object)] only works with primitive types (strings, numbers, booleans)
 * 2. Pattern and ConfidenceScore are #[napi] classes, not plain objects
 * 3. Cannot mix classes and #[napi(object)] (trait bound errors)
 * 4. Solution: Make MatchResult a class with getters for pattern and confidence
 * 5. JavaScript consumers still get intuitive API (result.pattern, result.confidence)
 *
 * PATTERN: Pattern-007 (Language Bindings via NAPI)
 * RELATED: Pattern, ConfidenceScore
 *
 * # JavaScript Example
 *
 * ```javascript
 * const results = matcher.findMatches("query", 5);
 * console.log(results[0].pattern.title);
 * console.log(results[0].confidence.totalScore);
 * ```
 */
#[napi]
pub struct MatchResult {
    pattern: Pattern,
    confidence: ConfidenceScore,
}

#[napi]
impl MatchResult {
    /**
     * Get the matched pattern
     */
    #[napi(getter)]
    pub fn pattern(&self) -> Pattern {
        // Clone pattern to return owned value
        Pattern {
            inner: self.pattern.inner.clone(),
        }
    }

    /**
     * Get the confidence score
     */
    #[napi(getter)]
    pub fn confidence(&self) -> ConfidenceScore {
        // Clone confidence to return owned value
        ConfidenceScore {
            inner: self.confidence.inner.clone(),
        }
    }
}

impl From<CoreMatchResult> for MatchResult {
    fn from(core: CoreMatchResult) -> Self {
        Self {
            pattern: Pattern { inner: core.pattern },
            confidence: ConfidenceScore { inner: core.confidence },
        }
    }
}

/**
 * FFI wrapper for PatternMatcher
 *
 * DESIGN DECISION: JavaScript class with mutable methods (add, remove, find)
 * WHY: Idiomatic JavaScript API (matcher.addPattern(p), matcher.findMatches(q))
 *
 * REASONING CHAIN:
 * 1. Core PatternMatcher wrapped in struct (encapsulation)
 * 2. All methods take &mut self (mutable operations)
 * 3. NAPI-RS handles thread safety (matcher instance owned by JavaScript)
 * 4. Errors converted to JavaScript exceptions automatically
 * 5. Results cloned for FFI boundary (acceptable cost vs latency)
 *
 * PATTERN: Pattern-007 (Language Bindings via NAPI)
 * PATTERN: Pattern-005 (Multi-Dimensional Matching)
 * RELATED: aetherlight_core::PatternMatcher
 * PERFORMANCE: <5ms FFI latency target
 */
#[napi]
pub struct PatternMatcher {
    inner: CoreMatcher,
}

impl Default for PatternMatcher {
    fn default() -> Self {
        Self::new()
    }
}

#[napi]
impl PatternMatcher {
    /**
     * Create a new empty pattern matcher
     *
     * # JavaScript Example
     *
     * ```javascript
     * const matcher = new PatternMatcher();
     * ```
     */
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            inner: CoreMatcher::new(),
        }
    }

    /**
     * Add a pattern to the library
     *
     * DESIGN DECISION: Accept Pattern by reference, clone internally
     * WHY: NAPI-RS classes cannot be moved across FFI boundary (trait bounds)
     *
     * REASONING CHAIN:
     * 1. NAPI-RS classes must implement FromNapiValue to be passed by value
     * 2. Custom NAPI classes don't automatically implement this trait
     * 3. Solution: Accept &Pattern reference, clone the inner value
     * 4. Clone cost acceptable for <5ms latency target (patterns are small)
     * 5. JavaScript consumers don't see the difference (transparent)
     *
     * # JavaScript Example
     *
     * ```javascript
     * const pattern = new Pattern("Title", "Content", ["tag"]);
     * matcher.addPattern(pattern);
     * // pattern is still usable after adding
     * ```
     */
    #[napi(js_name = "addPattern")]
    pub fn add_pattern(&mut self, pattern: &Pattern) -> Result<()> {
        self.inner.add_pattern(pattern.inner.clone())
            .map_err(convert_error)
    }

    /**
     * Remove a pattern from the library by ID
     *
     * DESIGN DECISION: Accept UUID as string (not buffer)
     * WHY: JavaScript consumers work with string UUIDs
     *
     * # JavaScript Example
     *
     * ```javascript
     * matcher.removePattern(pattern.id);
     * ```
     */
    #[napi(js_name = "removePattern")]
    pub fn remove_pattern(&mut self, id: String) -> Result<()> {
        let uuid = Uuid::parse_str(&id)
            .map_err(|e| napi::Error::new(napi::Status::InvalidArg, format!("Invalid UUID: {}", e)))?;
        self.inner.remove_pattern(&uuid)
            .map_err(convert_error)
    }

    /**
     * Get a pattern by ID
     *
     * DESIGN DECISION: Return cloned Pattern (not reference)
     * WHY: FFI cannot safely return references; cloning acceptable for latency target
     *
     * # JavaScript Example
     *
     * ```javascript
     * const pattern = matcher.getPattern(id);
     * console.log(pattern.title);
     * ```
     */
    #[napi(js_name = "getPattern")]
    pub fn get_pattern(&self, id: String) -> Result<Pattern> {
        let uuid = Uuid::parse_str(&id)
            .map_err(|e| napi::Error::new(napi::Status::InvalidArg, format!("Invalid UUID: {}", e)))?;
        let core_pattern = self.inner.get_pattern(&uuid)
            .map_err(convert_error)?;
        Ok(Pattern { inner: core_pattern.clone() })
    }

    /**
     * Get total pattern count
     *
     * # JavaScript Example
     *
     * ```javascript
     * console.log(`Library has ${matcher.count()} patterns`);
     * ```
     */
    #[napi]
    pub fn count(&self) -> i64 {
        self.inner.count() as i64
    }

    /**
     * Check if library is empty
     *
     * # JavaScript Example
     *
     * ```javascript
     * if (matcher.isEmpty()) {
     *   console.log("No patterns in library");
     * }
     * ```
     */
    #[napi(js_name = "isEmpty")]
    pub fn is_empty(&self) -> bool {
        self.inner.is_empty()
    }

    /**
     * Find matching patterns for a user query
     *
     * DESIGN DECISION: Synchronous method (not async)
     * WHY: Pattern matching completes in <50ms (fast enough for sync call)
     *
     * REASONING CHAIN:
     * 1. <50ms target makes async overhead unnecessary (no blocking)
     * 2. Synchronous API simpler for consumers (no await/Promises)
     * 3. Node.js event loop not blocked (<50ms acceptable)
     * 4. Future: Add async version for >100k pattern libraries (P1-011)
     * 5. Results cloned for FFI boundary (acceptable cost)
     *
     * PATTERN: Pattern-005 (Multi-Dimensional Matching)
     * PERFORMANCE: <50ms for 10k patterns, <5ms FFI overhead
     * FUTURE: Add async findMatchesAsync for large libraries (P1-011)
     *
     * # JavaScript Example
     *
     * ```javascript
     * const results = matcher.findMatches("How do I handle errors in Rust?", 5);
     * for (const result of results) {
     *   console.log(`${result.pattern.title}: ${result.confidence.totalScore * 100}%`);
     * }
     * ```
     */
    #[napi(js_name = "findMatches")]
    pub fn find_matches(&self, query: String, max_results: i64) -> Result<Vec<MatchResult>> {
        let results = self.inner.find_matches(&query, max_results as usize)
            .map_err(convert_error)?;

        Ok(results.into_iter().map(|r| r.into()).collect())
    }
}

/**
 * FFI wrapper for PatternMatch
 *
 * DESIGN DECISION: JavaScript class with getters (not plain object)
 * WHY: PatternMatch contains Pattern class, cannot use #[napi(object)]
 *
 * REASONING CHAIN:
 * 1. #[napi(object)] only works with primitive types (strings, numbers, booleans)
 * 2. Pattern is #[napi] class, not plain object
 * 3. Cannot mix classes and #[napi(object)] (trait bound errors)
 * 4. Solution: Make PatternMatch a class with getters (like MatchResult)
 * 5. JavaScript consumers still get intuitive API (match.pattern, match.relevance)
 *
 * PATTERN: Pattern-INDEX-001 (Semantic Pattern Search)
 * PATTERN: Pattern-007 (Language Bindings via NAPI)
 * RELATED: PatternIndex.searchByIntent(), MatchResult (same pattern)
 *
 * # JavaScript Example
 *
 * ```javascript
 * const matches = await index.searchByIntent("OAuth2 with PKCE");
 * console.log(matches[0].pattern.title);
 * console.log(`Relevance: ${matches[0].relevance * 100}%`);
 * console.log(`Reasoning: ${matches[0].reasoning}`);
 * if (matches[0].contextBoost) {
 *   console.log(`Context boost: +${matches[0].contextBoost * 100}%`);
 * }
 * ```
 */
#[napi]
pub struct PatternMatch {
    pattern: Pattern,
    relevance: f64,
    reasoning: String,
    context_boost: Option<f64>,
}

#[napi]
impl PatternMatch {
    /**
     * Get the matched pattern
     */
    #[napi(getter)]
    pub fn pattern(&self) -> Pattern {
        // Clone pattern to return owned value
        Pattern {
            inner: self.pattern.inner.clone(),
        }
    }

    /**
     * Get relevance score (0.0-1.0)
     */
    #[napi(getter)]
    pub fn relevance(&self) -> f64 {
        self.relevance
    }

    /**
     * Get explanation of why this pattern matched
     */
    #[napi(getter)]
    pub fn reasoning(&self) -> String {
        self.reasoning.clone()
    }

    /**
     * Get confidence boost from context (if any)
     */
    #[napi(getter, js_name = "contextBoost")]
    pub fn context_boost(&self) -> Option<f64> {
        self.context_boost
    }
}

impl From<CorePatternMatch> for PatternMatch {
    fn from(core: CorePatternMatch) -> Self {
        Self {
            pattern: Pattern { inner: core.pattern },
            relevance: core.relevance,
            reasoning: core.reasoning,
            context_boost: core.context_boost,
        }
    }
}

/**
 * FFI wrapper for SearchContext
 *
 * DESIGN DECISION: Plain JavaScript object for optional context
 * WHY: Context is data-only, enables context-aware ranking
 *
 * PATTERN: Pattern-INDEX-001 (Semantic Pattern Search)
 * RELATED: PatternIndex.searchByIntent()
 *
 * # JavaScript Example
 *
 * ```javascript
 * const context = {
 *   domain: "authentication",
 *   framework: "actix-web",
 *   recentPatterns: ["Pattern-OAUTH2-001"],
 *   userPreferences: { "Pattern-OAUTH2-001": 0.95 }
 * };
 * const matches = await index.searchByIntent("secure login", context);
 * ```
 */
#[napi(object)]
pub struct SearchContext {
    /// Current domain (e.g., "rust", "typescript", "authentication")
    pub domain: Option<String>,

    /// Current framework (e.g., "actix-web", "react", "flutter")
    pub framework: Option<String>,

    /// Recent patterns used (boost related patterns)
    pub recent_patterns: Vec<String>,

    /// User preference (boost patterns user likes)
    pub user_preferences: HashMap<String, f64>,
}

impl From<SearchContext> for CoreSearchContext {
    fn from(js: SearchContext) -> Self {
        Self {
            domain: js.domain,
            framework: js.framework,
            recent_patterns: js.recent_patterns,
            user_preferences: js.user_preferences,
        }
    }
}

/**
 * FFI wrapper for PatternIndexStatistics
 *
 * DESIGN DECISION: Plain JavaScript object for statistics
 * WHY: Statistics are data-only, no methods needed
 */
#[napi(object)]
pub struct PatternIndexStatistics {
    pub total_patterns: i64,
    pub total_usage: i64,
    pub cached_patterns: i64,
    pub most_used: Option<String>,
}

impl From<CoreStatistics> for PatternIndexStatistics {
    fn from(core: CoreStatistics) -> Self {
        Self {
            total_patterns: core.total_patterns as i64,
            total_usage: core.total_usage as i64,
            cached_patterns: core.cached_patterns as i64,
            most_used: core.most_used,
        }
    }
}

/**
 * FFI wrapper for PatternIndex
 *
 * DESIGN DECISION: JavaScript class with async methods
 * WHY: Semantic search requires embeddings (async I/O), return JavaScript Promises
 *
 * REASONING CHAIN:
 * 1. PatternIndex uses embeddings model (ONNX file I/O)
 * 2. Vector store queries (SQLite I/O)
 * 3. Async operations in Rust (tokio runtime)
 * 4. NAPI-RS automatically converts async fn → JavaScript Promise
 * 5. JavaScript consumers use await for async operations
 * 6. Result: Clean async API with zero manual Promise handling
 *
 * PATTERN: Pattern-INDEX-001 (Semantic Pattern Search)
 * PATTERN: Pattern-007 (Language Bindings via NAPI)
 * RELATED: AI-005 (Pattern Index), AI-006 (Progressive Context Loader)
 * PERFORMANCE: <100ms search across 100+ patterns
 *
 * # JavaScript Example
 *
 * ```javascript
 * import { PatternIndex } from '@aetherlight/node';
 *
 * const index = new PatternIndex('./docs/patterns', './data');
 * await index.rebuild(); // Build index from pattern files
 *
 * // Search by intent
 * const matches = await index.searchByIntent(
 *   "I need to implement OAuth2 with PKCE for security"
 * );
 *
 * console.log(`Found ${matches.length} matches`);
 * console.log(`Top match: ${matches[0].pattern.title} (${matches[0].relevance * 100}%)`);
 * ```
 */
#[napi]
pub struct PatternIndex {
    inner: CorePatternIndex,
}

#[napi]
impl PatternIndex {
    /**
     * Create a new pattern index
     *
     * DESIGN DECISION: Constructor takes directory paths as strings
     * WHY: JavaScript consumers work with string paths
     *
     * # JavaScript Example
     *
     * ```javascript
     * const index = new PatternIndex('./docs/patterns', './data');
     * ```
     */
    #[napi(constructor)]
    pub fn new(pattern_dir: String, data_dir: String) -> Result<Self> {
        let core = CorePatternIndex::new(
            PathBuf::from(pattern_dir),
            PathBuf::from(data_dir),
        ).map_err(convert_error)?;

        Ok(Self { inner: core })
    }

    /**
     * Search patterns by intent (semantic search)
     *
     * DESIGN DECISION: Async method returning Promise<PatternMatch[]>
     * WHY: Embeddings and vector search are async I/O operations
     *
     * REASONING CHAIN:
     * 1. User provides intent query: "I need to implement OAuth2 with PKCE"
     * 2. Generate embedding for query (async ONNX inference)
     * 3. Search vector store for similar patterns (async SQLite query)
     * 4. Rank by relevance + context boost (CPU-bound, fast)
     * 5. Return top matches with reasoning
     *
     * PERFORMANCE: <100ms for search across 100+ patterns
     * PATTERN: Pattern-INDEX-001 (Semantic Pattern Search)
     *
     * # JavaScript Example
     *
     * ```javascript
     * // Without context
     * const matches = await index.searchByIntent("OAuth2 with PKCE");
     *
     * // With context (boosts relevance)
     * const context = {
     *   domain: "authentication",
     *   framework: "actix-web",
     *   recentPatterns: [],
     *   userPreferences: {}
     * };
     * const matches = await index.searchByIntent("OAuth2 with PKCE", context);
     *
     * console.log(`Found ${matches.length} matches`);
     * for (const match of matches) {
     *   console.log(`${match.pattern.title}: ${match.relevance * 100}%`);
     *   console.log(`Reasoning: ${match.reasoning}`);
     * }
     * ```
     */
    #[napi(js_name = "searchByIntent")]
    pub async fn search_by_intent(
        &self,
        intent: String,
        context: Option<SearchContext>,
    ) -> Result<Vec<PatternMatch>> {
        // Convert JavaScript context to Rust context
        let core_context = context.map(|ctx| ctx.into());

        // Call Rust async method
        let matches = self.inner.search_by_intent(
            &intent,
            core_context.as_ref(),
        ).await.map_err(convert_error)?;

        // Convert Rust results to JavaScript
        Ok(matches.into_iter().map(|m| m.into()).collect())
    }

    /**
     * Add a pattern to the index
     *
     * DESIGN DECISION: Async method (generates embeddings)
     * WHY: Embedding generation is async I/O operation
     *
     * # JavaScript Example
     *
     * ```javascript
     * const pattern = new Pattern(
     *   "OAuth2 PKCE Flow",
     *   "Secure OAuth2 implementation with PKCE",
     *   ["oauth2", "security"]
     * );
     * await index.addPattern(pattern);
     * ```
     */
    #[napi(js_name = "addPattern")]
    pub async fn add_pattern(&mut self, pattern: &Pattern) -> Result<()> {
        self.inner.add_pattern(pattern.inner.clone())
            .await
            .map_err(convert_error)
    }

    /**
     * Rebuild index from pattern directory
     *
     * DESIGN DECISION: Async method (scans directory + generates embeddings)
     * WHY: Rebuilding index involves multiple I/O operations
     *
     * # JavaScript Example
     *
     * ```javascript
     * // Rebuild index after adding new pattern files
     * await index.rebuild();
     * console.log("Index rebuilt successfully");
     * ```
     */
    #[napi]
    pub async fn rebuild(&mut self) -> Result<()> {
        self.inner.rebuild()
            .await
            .map_err(convert_error)
    }

    /**
     * Record pattern usage for ranking
     *
     * DESIGN DECISION: Async method (updates in-memory + persistent storage)
     * WHY: Usage tracking involves async write operations
     *
     * # JavaScript Example
     *
     * ```javascript
     * // Record that pattern was used with 87% confidence
     * await index.recordUsage(pattern.id, 0.87);
     * ```
     */
    #[napi(js_name = "recordUsage")]
    pub async fn record_usage(&self, pattern_id: String, confidence: f64) -> Result<()> {
        self.inner.record_usage(&pattern_id, confidence)
            .await
            .map_err(convert_error)
    }

    /**
     * Get index statistics
     *
     * DESIGN DECISION: Async method (reads from in-memory cache)
     * WHY: Statistics calculation may involve async operations
     *
     * # JavaScript Example
     *
     * ```javascript
     * const stats = await index.getStatistics();
     * console.log(`Total patterns: ${stats.totalPatterns}`);
     * console.log(`Total usage: ${stats.totalUsage}`);
     * console.log(`Cached patterns: ${stats.cachedPatterns}`);
     * console.log(`Most used: ${stats.mostUsed}`);
     * ```
     */
    #[napi(js_name = "getStatistics")]
    pub async fn get_statistics(&self) -> PatternIndexStatistics {
        self.inner.get_statistics().await.into()
    }
}

/**
 * Get library version
 *
 * DESIGN DECISION: Export version as module-level function
 * WHY: Enable version checking for compatibility validation
 *
 * # JavaScript Example
 *
 * ```javascript
 * import { version } from '@aetherlight/node';
 * console.log(`ÆtherLight Core v${version()}`);
 * ```
 */
#[napi]
pub fn version() -> String {
    aetherlight_core::version()
}

/**
 * Module initialization tests
 *
 * DESIGN DECISION: Basic smoke tests for FFI layer
 * WHY: Catch obvious FFI bugs at compile time
 *
 * PATTERN: Test-Driven Development (SOP-003)
 * RELATED: Integration tests in test/ directory
 */
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ffi_pattern_creation() {
        let pattern = Pattern::new(
            "Test".to_string(),
            "Content".to_string(),
            vec!["tag".to_string()],
        );
        assert_eq!(pattern.title(), "Test");
        assert_eq!(pattern.content(), "Content");
        assert_eq!(pattern.tags(), vec!["tag"]);
    }

    #[test]
    fn test_ffi_matcher_creation() {
        let matcher = PatternMatcher::new();
        assert!(matcher.is_empty());
        assert_eq!(matcher.count(), 0);
    }

    #[test]
    fn test_ffi_version() {
        let ver = version();
        assert!(ver.contains("0.1.0"));
    }
}
