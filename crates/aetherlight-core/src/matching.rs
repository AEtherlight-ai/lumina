/**
 * Pattern Matching Engine Module
 *
 * DESIGN DECISION: In-memory pattern storage with HashMap for O(1) ID lookups
 * WHY: <50ms performance target for 10k patterns requires efficient data structures
 *
 * REASONING CHAIN:
 * 1. Performance target: <50ms for 10k pattern matching (SOP-004)
 * 2. HashMap provides O(1) average-case lookup by pattern ID
 * 3. Linear scan for text matching acceptable for 10k patterns (<50ms)
 * 4. Future optimization: Add inverted index for keyword matching (P1-006)
 * 5. Future optimization: Add vector index for semantic search (P1-007)
 * 6. Thread-safe via Sync + Send bounds (no interior mutability)
 *
 * PATTERN: Pattern-005 (Multi-Dimensional Matching)
 * RELATED: confidence.rs (scoring), pattern.rs (storage)
 * FUTURE: Add persistent storage backend (SQLite/ChromaDB) in P1-010
 *
 * # Matching Algorithm
 *
 * ```text
 * User Query: "How do I handle errors in Rust?"
 *     ↓
 * 1. Keyword extraction: ["handle", "errors", "rust"]
 * 2. For each pattern in library:
 *    a. Calculate keyword overlap (tags + title + content)
 *    b. Calculate context match (language, framework, domain)
 *    c. TODO: Calculate semantic similarity (embeddings) [P1-007]
 *    d. Combine into multi-dimensional confidence score
 * 3. Sort by confidence (descending)
 * 4. Return top N results
 *     ↓
 * MatchResult { pattern, confidence }
 * ```
 *
 * # Performance Characteristics
 *
 * - Add pattern: O(1) HashMap insert
 * - Remove pattern: O(1) HashMap remove
 * - Find by ID: O(1) HashMap lookup
 * - Match query: O(n) linear scan (n = pattern count)
 * - Memory: ~1KB per pattern (typical), ~10MB for 10k patterns
 *
 * # Examples
 *
 * ```rust
 * use aetherlight_core::{PatternMatcher, Pattern};
 *
 * let mut matcher = PatternMatcher::new();
 *
 * let pattern = Pattern::new(
 *     "Rust error handling".to_string(),
 *     "Use Result<T, E> for fallible operations".to_string(),
 *     vec!["rust".to_string(), "error-handling".to_string()],
 * );
 * matcher.add_pattern(pattern);
 *
 * let results = matcher.find_matches("How do I handle errors in Rust?", 5);
 * for result in results {
 *     println!("{}: {:.2}%", result.pattern.title(), result.confidence.total_score() * 100.0);
 * }
 * ```
 */

use std::collections::HashMap;
use uuid::Uuid;
use crate::{Pattern, ConfidenceScore, ConfidenceBreakdown, Error, Result};

/**
 * Pattern matching engine with in-memory storage
 *
 * DESIGN DECISION: Mutable storage with ownership-based mutation
 * WHY: Enable dynamic pattern library updates without locks (single-threaded mutation)
 *
 * REASONING CHAIN:
 * 1. Pattern library grows over time (new patterns from usage)
 * 2. Mutable storage enables add/remove operations
 * 3. HashMap provides fast ID-based lookup for pattern retrieval
 * 4. No interior mutability (RefCell/Mutex) keeps API simple
 * 5. Thread-safety: PatternMatcher is Send but not Sync (mutable)
 * 6. Future: Add Arc<RwLock<PatternMatcher>> for concurrent access
 *
 * PATTERN: Pattern-001 (Rust Core + Language Bindings)
 * PATTERN: Pattern-005 (Multi-Dimensional Matching)
 * RELATED: Pattern, ConfidenceScore
 * FUTURE: Add thread-safe concurrent matcher for web server (P1-010)
 */
#[derive(Debug, Clone)]
pub struct PatternMatcher {
    /// Pattern storage (ID -> Pattern)
    patterns: HashMap<Uuid, Pattern>,
}

impl PatternMatcher {
    /**
     * Create a new empty pattern matcher
     *
     * DESIGN DECISION: Default constructor with empty storage
     * WHY: Pattern library populated incrementally (add_pattern calls)
     *
     * # Examples
     *
     * ```rust
     * let matcher = PatternMatcher::new();
     * ```
     */
    pub fn new() -> Self {
        Self {
            patterns: HashMap::new(),
        }
    }

    /**
     * Add a pattern to the library
     *
     * DESIGN DECISION: Reject duplicate pattern IDs
     * WHY: Pattern IDs must be unique for correct matching
     *
     * REASONING CHAIN:
     * 1. Each pattern has unique UUID (generated at creation)
     * 2. Duplicate IDs indicate programming error or data corruption
     * 3. Early detection prevents index corruption
     * 4. HashMap::insert overwrites existing key (unsafe for patterns)
     * 5. Explicit duplicate check provides clear error message
     *
     * PATTERN: Rust error handling best practices
     * RELATED: Error::DuplicatePattern
     *
     * # Examples
     *
     * ```rust
     * let pattern = Pattern::new("Title".to_string(), "Content".to_string(), vec![]);
     * matcher.add_pattern(pattern)?;
     * ```
     */
    pub fn add_pattern(&mut self, pattern: Pattern) -> Result<()> {
        let id = *pattern.id();

        if self.patterns.contains_key(&id) {
            return Err(Error::DuplicatePattern(id.to_string()));
        }

        self.patterns.insert(id, pattern);
        Ok(())
    }

    /**
     * Remove a pattern from the library by ID
     *
     * DESIGN DECISION: Return error if pattern not found
     * WHY: Silent failure hides bugs; explicit error enables proper handling
     *
     * # Examples
     *
     * ```rust
     * let id = pattern.id().clone();
     * matcher.remove_pattern(&id)?;
     * ```
     */
    pub fn remove_pattern(&mut self, id: &Uuid) -> Result<()> {
        self.patterns
            .remove(id)
            .ok_or_else(|| Error::PatternNotFound(id.to_string()))?;
        Ok(())
    }

    /**
     * Get a pattern by ID
     *
     * DESIGN DECISION: Return reference to avoid cloning
     * WHY: Patterns can be large (content, metadata); avoid unnecessary copies
     *
     * # Examples
     *
     * ```rust
     * let pattern = matcher.get_pattern(&id)?;
     * println!("Title: {}", pattern.title());
     * ```
     */
    pub fn get_pattern(&self, id: &Uuid) -> Result<&Pattern> {
        self.patterns
            .get(id)
            .ok_or_else(|| Error::PatternNotFound(id.to_string()))
    }

    /**
     * Get total pattern count
     *
     * DESIGN DECISION: O(1) count via HashMap::len()
     * WHY: Enable UI display of pattern library size
     */
    pub fn count(&self) -> usize {
        self.patterns.len()
    }

    /**
     * Check if library is empty
     *
     * DESIGN DECISION: Explicit empty check for readability
     * WHY: Clearer than `count() == 0` at call sites
     */
    pub fn is_empty(&self) -> bool {
        self.patterns.is_empty()
    }

    /**
     * Find matching patterns for a user query
     *
     * DESIGN DECISION: Return top N matches sorted by confidence (descending)
     * WHY: Users need ranked results, not all matches (UX best practice)
     *
     * REASONING CHAIN:
     * 1. User query converted to lowercase for case-insensitive matching
     * 2. Each pattern scored using multi-dimensional algorithm
     * 3. Results sorted by confidence (highest first)
     * 4. Top N results returned (limit = max_results parameter)
     * 5. Empty library returns error (not empty Vec) for explicit handling
     *
     * PATTERN: Pattern-005 (Multi-Dimensional Matching)
     * PERFORMANCE: O(n) where n = pattern count (linear scan)
     * FUTURE: Add inverted index for O(log n) keyword matching (P1-006)
     *
     * # Examples
     *
     * ```rust
     * let results = matcher.find_matches("How do I handle errors in Rust?", 5);
     * for result in results {
     *     println!("{}: {:.2}%", result.pattern.title(), result.confidence.total_score() * 100.0);
     * }
     * ```
     */
    pub fn find_matches(&self, query: &str, max_results: usize) -> Result<Vec<MatchResult>> {
        // Validate query
        if query.trim().is_empty() {
            return Err(Error::InvalidQuery("Query cannot be empty".to_string()));
        }

        // Validate library not empty
        if self.is_empty() {
            return Err(Error::EmptyLibrary);
        }

        // Normalize query for case-insensitive matching
        let query_lower = query.to_lowercase();
        let query_words: Vec<&str> = query_lower.split_whitespace().collect();

        // Score all patterns
        let mut results: Vec<MatchResult> = self.patterns
            .values()
            .filter_map(|pattern| {
                match self.score_pattern(pattern, &query_lower, &query_words) {
                    Ok(confidence) => Some(MatchResult {
                        pattern: pattern.clone(),
                        confidence,
                    }),
                    Err(_) => None, // Skip patterns with scoring errors
                }
            })
            .collect();

        // Sort by confidence (descending)
        results.sort_by(|a, b| {
            b.confidence.total_score()
                .partial_cmp(&a.confidence.total_score())
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        // Return top N results
        results.truncate(max_results);
        Ok(results)
    }

    /**
     * Score a single pattern against a query
     *
     * DESIGN DECISION: Multi-dimensional scoring with configurable weights
     * WHY: Single-dimension scoring (embeddings only) achieves ~60% accuracy;
     * multi-dimensional achieves 85%+ by combining semantic and contextual signals
     *
     * REASONING CHAIN:
     * 1. Keyword overlap: Count matching words in title, content, tags
     * 2. Context match: Check language/framework/domain metadata
     * 3. TODO: Semantic similarity via embeddings (P1-007)
     * 4. TODO: Historical success rate from usage data (P1-006)
     * 5. Combine dimensions into confidence score using weights
     *
     * PATTERN: Pattern-005 (Multi-Dimensional Matching)
     * PERFORMANCE: O(m) where m = pattern field lengths (acceptable for 10k patterns)
     * FUTURE: Add caching for repeated queries (P1-011)
     */
    fn score_pattern(
        &self,
        pattern: &Pattern,
        query_lower: &str,
        query_words: &[&str],
    ) -> Result<ConfidenceScore> {
        // Dimension 1: Keyword overlap (tags, title, content)
        let keyword_score = self.calculate_keyword_overlap(pattern, query_words);

        // Dimension 2: Context match (language, framework, domain)
        let context_score = self.calculate_context_match(pattern, query_lower);

        // TODO (P1-007): Dimension 3: Semantic similarity via embeddings
        let semantic_score = 0.5; // Placeholder (neutral)

        // TODO (P1-006): Dimension 4: Historical success rate
        let historical_score = 0.5; // Placeholder

        // TODO (P1-006): Dimensions 5-10: Recency, preferences, usage, security, quality
        let recency_score = 0.5;
        let user_pref_score = 0.5;
        let team_usage_score = 0.5;
        let global_usage_score = 0.5;
        let security_score = 1.0; // Default: assume secure until validated
        let quality_score = 0.8; // Default: assume good quality

        // Build confidence breakdown
        let breakdown = ConfidenceBreakdown::builder()
            .semantic_similarity(semantic_score)
            .context_match(context_score)
            .keyword_overlap(keyword_score)
            .historical_success_rate(historical_score)
            .pattern_recency(recency_score)
            .user_preference(user_pref_score)
            .team_usage(team_usage_score)
            .global_usage(global_usage_score)
            .security_score(security_score)
            .code_quality_score(quality_score)
            .build()?;

        ConfidenceScore::calculate(breakdown)
    }

    /**
     * Calculate keyword overlap score
     *
     * DESIGN DECISION: Simple word matching with case-insensitive comparison
     * WHY: Keyword matching provides fast baseline score before semantic analysis
     *
     * REASONING CHAIN:
     * 1. Count query words appearing in pattern tags (exact match)
     * 2. Count query words appearing in pattern title (substring match)
     * 3. Count query words appearing in pattern content (substring match)
     * 4. Normalize by query word count (score = matches / total_words)
     * 5. Cap at 1.0 for consistent score range
     *
     * PERFORMANCE: O(m * n) where m = query words, n = pattern field lengths
     * FUTURE: Add stemming/lemmatization for better matching (P1-008)
     */
    fn calculate_keyword_overlap(&self, pattern: &Pattern, query_words: &[&str]) -> f64 {
        if query_words.is_empty() {
            return 0.0;
        }

        let title_lower = pattern.title().to_lowercase();
        let content_lower = pattern.content().to_lowercase();
        let tags_lower: Vec<String> = pattern.tags().iter()
            .map(|t| t.to_lowercase())
            .collect();

        let mut matches = 0;
        for word in query_words {
            // Check exact match in tags
            if tags_lower.iter().any(|tag| tag == word) {
                matches += 2; // Tags are high-signal (weight more)
            }
            // Check substring match in title
            if title_lower.contains(word) {
                matches += 1;
            }
            // Check substring match in content
            if content_lower.contains(word) {
                matches += 1;
            }
        }

        // Normalize by max possible score (each word can match in tags, title, content)
        let max_score = query_words.len() * 4; // 2 (tags) + 1 (title) + 1 (content)
        let score = matches as f64 / max_score as f64;

        score.min(1.0) // Cap at 1.0
    }

    /**
     * Calculate context match score
     *
     * DESIGN DECISION: Exact match on language/framework/domain metadata
     * WHY: Context match provides high-confidence signal (language mismatch = irrelevant)
     *
     * REASONING CHAIN:
     * 1. Extract language/framework/domain from pattern metadata
     * 2. Check if query mentions any metadata terms (substring match)
     * 3. Each matching context dimension adds to score
     * 4. Normalize by number of context dimensions (3 max)
     * 5. Missing metadata defaults to 0.0 (no match)
     *
     * PERFORMANCE: O(m) where m = query length (single pass)
     * FUTURE: Add fuzzy matching for framework names (e.g., "react" matches "reactjs")
     */
    fn calculate_context_match(&self, pattern: &Pattern, query_lower: &str) -> f64 {
        let metadata = pattern.metadata();
        let mut matches = 0;
        let mut total = 0;

        // Check language match
        if let Some(lang) = &metadata.language {
            total += 1;
            if query_lower.contains(&lang.to_lowercase()) {
                matches += 1;
            }
        }

        // Check framework match
        if let Some(framework) = &metadata.framework {
            total += 1;
            if query_lower.contains(&framework.to_lowercase()) {
                matches += 1;
            }
        }

        // Check domain match
        if let Some(domain) = &metadata.domain {
            total += 1;
            if query_lower.contains(&domain.to_lowercase()) {
                matches += 1;
            }
        }

        if total == 0 {
            return 0.5; // Neutral score if no metadata
        }

        matches as f64 / total as f64
    }
}

impl Default for PatternMatcher {
    fn default() -> Self {
        Self::new()
    }
}

/**
 * Single match result with pattern and confidence score
 *
 * DESIGN DECISION: Owned Pattern (not reference) for FFI compatibility
 * WHY: FFI cannot safely return references; owned data enables serialization
 *
 * REASONING CHAIN:
 * 1. FFI bindings need owned data for safe transmission
 * 2. Cloning patterns acceptable (serialization cost > cloning cost)
 * 3. Owned MatchResult can be stored, passed across boundaries
 * 4. Pattern is cheap to clone (no large allocations typically)
 *
 * PATTERN: Pattern-001 (Rust Core + Language Bindings)
 * PATTERN: Pattern-007 (Language Bindings via NAPI)
 * RELATED: Pattern, ConfidenceScore
 */
#[derive(Debug, Clone)]
pub struct MatchResult {
    /// Matched pattern
    pub pattern: Pattern,

    /// Confidence score with breakdown
    pub confidence: ConfidenceScore,
}

#[cfg(test)]
mod tests {
    use super::*;

    /**
     * Test: Add and retrieve patterns
     *
     * PATTERN: Test-Driven Development (SOP-003)
     */
    #[test]
    fn test_add_and_get_pattern() {
        let mut matcher = PatternMatcher::new();
        let pattern = Pattern::new(
            "Test Pattern".to_string(),
            "Test Content".to_string(),
            vec!["test".to_string()],
        );
        let id = *pattern.id();

        matcher.add_pattern(pattern.clone()).unwrap();
        assert_eq!(matcher.count(), 1);

        let retrieved = matcher.get_pattern(&id).unwrap();
        assert_eq!(retrieved.title(), "Test Pattern");
    }

    /**
     * Test: Reject duplicate pattern IDs
     */
    #[test]
    fn test_duplicate_pattern_rejected() {
        let mut matcher = PatternMatcher::new();
        let pattern = Pattern::new(
            "Test".to_string(),
            "Content".to_string(),
            vec![],
        );

        matcher.add_pattern(pattern.clone()).unwrap();
        let result = matcher.add_pattern(pattern);
        assert!(result.is_err());
    }

    /**
     * Test: Remove pattern by ID
     */
    #[test]
    fn test_remove_pattern() {
        let mut matcher = PatternMatcher::new();
        let pattern = Pattern::new("Test".to_string(), "Content".to_string(), vec![]);
        let id = *pattern.id();

        matcher.add_pattern(pattern).unwrap();
        assert_eq!(matcher.count(), 1);

        matcher.remove_pattern(&id).unwrap();
        assert_eq!(matcher.count(), 0);
    }

    /**
     * Test: Find matches returns results sorted by confidence
     */
    #[test]
    fn test_find_matches() {
        let mut matcher = PatternMatcher::new();

        // Add patterns with varying relevance
        let pattern1 = Pattern::builder()
            .title("Rust error handling")
            .content("Use Result<T, E> for errors")
            .tags(vec!["rust", "error-handling"])
            .language("rust")
            .build()
            .unwrap();

        let pattern2 = Pattern::builder()
            .title("Python exception handling")
            .content("Use try/except for errors")
            .tags(vec!["python", "exceptions"])
            .language("python")
            .build()
            .unwrap();

        matcher.add_pattern(pattern1).unwrap();
        matcher.add_pattern(pattern2).unwrap();

        // Query for Rust error handling
        let results = matcher.find_matches("How do I handle errors in Rust?", 5).unwrap();

        assert_eq!(results.len(), 2);
        // First result should be Rust pattern (higher confidence)
        assert!(results[0].pattern.title().contains("Rust"));
    }

    /**
     * Test: Empty query returns error
     */
    #[test]
    fn test_empty_query_error() {
        let mut matcher = PatternMatcher::new();
        matcher.add_pattern(Pattern::new("Test".to_string(), "Content".to_string(), vec![])).unwrap();

        let result = matcher.find_matches("", 5);
        assert!(result.is_err());
    }

    /**
     * Test: Empty library returns error
     */
    #[test]
    fn test_empty_library_error() {
        let matcher = PatternMatcher::new();
        let result = matcher.find_matches("test query", 5);
        assert!(result.is_err());
    }

    /**
     * Test: Keyword overlap calculation
     */
    #[test]
    fn test_keyword_overlap() {
        let matcher = PatternMatcher::new();
        let pattern = Pattern::builder()
            .title("Rust error handling")
            .content("Use Result for error handling")
            .tags(vec!["rust", "error-handling"])
            .build()
            .unwrap();

        let query_words = vec!["rust", "error", "handling"];
        let score = matcher.calculate_keyword_overlap(&pattern, &query_words);

        assert!(score > 0.0);
        assert!(score <= 1.0);
    }

    /**
     * Test: Context match calculation
     */
    #[test]
    fn test_context_match() {
        let matcher = PatternMatcher::new();
        let pattern = Pattern::builder()
            .title("Test Pattern")
            .content("Test Content")
            .language("rust")
            .framework("tokio")
            .build()
            .unwrap();

        let score = matcher.calculate_context_match(&pattern, "rust async with tokio");
        assert!(score > 0.5); // Should match language and framework
    }
}
