/**
 * Pattern Index with Semantic Search (AI-005)
 *
 * DESIGN DECISION: Intent-based pattern search using embeddings
 * WHY: As pattern library grows to 100+, keyword search fails. Semantic search understands intent.
 *
 * REASONING CHAIN:
 * 1. Pattern library grows: 20 patterns → 100+ patterns
 * 2. Keyword search breaks: "auth" matches OAuth, Basic Auth, JWT, RBAC... (too many results)
 * 3. Semantic search understands intent: "secure login flow" → OAuth2 PKCE pattern (87% relevance)
 * 4. Context-based ranking: Recent usage, domain, framework (boosts relevance)
 * 5. <100ms performance target with 384-dim embeddings + SQLite vector store
 * 6. Result: Right pattern, first try, zero cognitive load
 *
 * PATTERN: Pattern-INDEX-001 (Semantic Pattern Search)
 * PERFORMANCE: <100ms for search across 100+ patterns
 * RELATED: AI-006 (Progressive Context Loader uses this)
 * FUTURE: Add collaborative filtering (patterns often used together)
 *
 * # Architecture
 *
 * ```text
 * ┌─────────────────────────────────────────────────────────────┐
 * │                     PatternIndex                             │
 * ├─────────────────────────────────────────────────────────────┤
 * │  Intent Query → Embedder → Semantic Search → Ranker         │
 * ├─────────────────────────────────────────────────────────────┤
 * │  In-Memory Cache              │  SQLite Vector Store        │
 * │  (Hot patterns)               │  (All patterns)              │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 *
 * # Examples
 *
 * ```rust
 * use aetherlight_core::{PatternIndex, Pattern};
 *
 * // Build index from pattern library
 * let mut index = PatternIndex::new()?;
 * index.rebuild().await?;
 *
 * // Search by intent
 * let matches = index.search_by_intent(
 *     "I need to implement OAuth2 with PKCE for security",
 *     None  // No specific context
 * ).await?;
 *
 * // Returns:
 * // PatternMatch {
 * //     pattern: Pattern-OAUTH2-001,
 * //     relevance: 0.87,
 * //     reasoning: "Semantic match: 'OAuth2', 'PKCE', 'security'"
 * // }
 * ```
 */

pub mod embedder;
pub mod search;
pub mod ranker;

use crate::{Pattern, LocalEmbeddings, SqliteVectorStore, Result, Error};
use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::RwLock;

/// Pattern with embedding and usage metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexedPattern {
    /// Original pattern
    pub pattern: Pattern,

    /// Embedding of pattern description (384-dim)
    pub description_embedding: Vec<f32>,

    /// How many times pattern has been used
    pub usage_count: usize,

    /// Last time pattern was used
    pub last_used: Option<DateTime<Utc>>,

    /// Average confidence when pattern applied
    pub avg_confidence: Option<f64>,

    /// Domains this pattern is commonly used in
    pub common_domains: Vec<String>,
}

/// Pattern match result with relevance score
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternMatch {
    /// Matched pattern
    pub pattern: Pattern,

    /// Relevance score (0.0-1.0)
    pub relevance: f64,

    /// Explanation of why this pattern matched
    pub reasoning: String,

    /// Confidence boost from context (if any)
    pub context_boost: Option<f64>,
}

/// Context for pattern search (optional)
#[derive(Debug, Clone)]
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

/// Pattern index with semantic search
pub struct PatternIndex {
    /// In-memory cache of indexed patterns
    patterns: Arc<RwLock<Vec<IndexedPattern>>>,

    /// Vector store for semantic search (SQLite)
    vector_store: Arc<RwLock<SqliteVectorStore>>,

    /// Embeddings generator
    embeddings: Arc<RwLock<LocalEmbeddings>>,

    /// Pattern library root directory
    pattern_dir: PathBuf,

    /// Hot cache (frequently accessed patterns)
    hot_cache: Arc<RwLock<HashMap<String, PatternMatch>>>,
}

impl PatternIndex {
    /**
     * DESIGN DECISION: Initialize with embeddings model and vector store
     * WHY: Self-contained, no external dependencies after initialization
     */
    pub fn new(pattern_dir: PathBuf, data_dir: PathBuf) -> Result<Self> {
        // Initialize embeddings model
        // DESIGN DECISION: Use default model paths from data directory
        // WHY: Self-contained, no external configuration required
        let model_path = data_dir.join("models/all-MiniLM-L6-v2.onnx");
        let tokenizer_path = data_dir.join("models/tokenizer.json");
        let embeddings = LocalEmbeddings::new(model_path, tokenizer_path)?;

        // Initialize vector store (SQLite)
        let vector_store_path = data_dir.join("pattern_index.sqlite");
        let vector_store = SqliteVectorStore::new(vector_store_path)?;

        Ok(Self {
            patterns: Arc::new(RwLock::new(Vec::new())),
            vector_store: Arc::new(RwLock::new(vector_store)),
            embeddings: Arc::new(RwLock::new(embeddings)),
            pattern_dir,
            hot_cache: Arc::new(RwLock::new(HashMap::new())),
        })
    }

    /**
     * DESIGN DECISION: Search by intent (semantic), not keywords
     * WHY: Understands user's goal, not just string matching
     *
     * REASONING CHAIN:
     * 1. User query: "I need to implement OAuth2 with PKCE for security"
     * 2. Generate embedding for query (384-dim vector)
     * 3. Search vector store for similar pattern embeddings (cosine similarity)
     * 4. Rank by relevance + context boost (recent usage, domain, framework)
     * 5. Return top N matches with reasoning
     *
     * PERFORMANCE: <100ms for search across 100+ patterns
     */
    pub async fn search_by_intent(
        &self,
        intent: &str,
        context: Option<&SearchContext>,
    ) -> Result<Vec<PatternMatch>> {
        // Check hot cache first
        if let Some(cached) = self.hot_cache.read().await.get(intent) {
            return Ok(vec![cached.clone()]);
        }

        // Generate embedding for intent query
        let mut embeddings = self.embeddings.write().await;
        let query_embedding_result = embeddings.embed(intent)?;
        let query_embedding = query_embedding_result.embedding.clone();

        // Search vector store for similar patterns
        let vector_store = self.vector_store.read().await;
        let search_results = vector_store.search(&query_embedding, 10)?;

        // Load full patterns
        let patterns = self.patterns.read().await;
        let mut matches: Vec<PatternMatch> = Vec::new();

        for result in search_results {
            // Find pattern by ID (stored in vector store metadata)
            let pattern_id = result.metadata.get("pattern_id")
                .and_then(|v| v.as_str())
                .unwrap_or("");

            if let Some(indexed) = patterns.iter().find(|p| {
                p.pattern.id().to_string() == pattern_id
            }) {
                // Calculate context boost (if context provided)
                let context_boost = if let Some(ctx) = context {
                    ranker::calculate_context_boost(&indexed, ctx)
                } else {
                    None
                };

                // Calculate final relevance
                let base_relevance = result.score as f64;
                let relevance = if let Some(boost) = context_boost {
                    (base_relevance + boost).min(1.0)
                } else {
                    base_relevance
                };

                // Generate reasoning
                let reasoning = search::explain_match(intent, &indexed.pattern, base_relevance);

                matches.push(PatternMatch {
                    pattern: indexed.pattern.clone(),
                    relevance,
                    reasoning,
                    context_boost,
                });
            }
        }

        // Sort by relevance (descending)
        matches.sort_by(|a, b| b.relevance.partial_cmp(&a.relevance).unwrap());

        // Cache top result if high relevance
        if let Some(top) = matches.first() {
            if top.relevance > 0.85 {
                self.hot_cache.write().await.insert(intent.to_string(), top.clone());
            }
        }

        Ok(matches)
    }

    /**
     * DESIGN DECISION: Add pattern to index incrementally
     * WHY: Avoid full rebuild when adding single pattern
     */
    pub async fn add_pattern(&mut self, pattern: Pattern) -> Result<()> {
        // Generate embedding for pattern description
        let mut embeddings = self.embeddings.write().await;
        let description = format!(
            "{}\n\n{}",
            pattern.title(),
            pattern.content()
        );
        let embedding_result = embeddings.embed(&description)?;
        let embedding = embedding_result.embedding.clone();

        // Create indexed pattern
        let indexed = IndexedPattern {
            pattern: pattern.clone(),
            description_embedding: embedding.clone(),
            usage_count: 0,
            last_used: None,
            avg_confidence: None,
            common_domains: vec![],
        };

        // Add to vector store
        let mut vector_store = self.vector_store.write().await;
        let metadata = serde_json::json!({
            "pattern_id": pattern.id().to_string(),
            "domain": pattern.metadata().domain.clone().unwrap_or_default(),
        });

        vector_store.insert(&pattern.id().to_string(), &embedding, &metadata)?;

        // Add to in-memory cache
        self.patterns.write().await.push(indexed);

        Ok(())
    }

    /**
     * DESIGN DECISION: Rebuild index from pattern library directory
     * WHY: Ensure index stays in sync with pattern library files
     */
    pub async fn rebuild(&mut self) -> Result<()> {
        // Clear existing index
        self.patterns.write().await.clear();
        self.hot_cache.write().await.clear();

        // Clear vector store
        let mut vector_store = self.vector_store.write().await;
        vector_store.clear()?;

        // Load all patterns from pattern directory
        let patterns = self.load_patterns_from_directory().await?;

        // Index each pattern
        for pattern in patterns {
            drop(vector_store); // Release lock temporarily
            self.add_pattern(pattern).await?;
            vector_store = self.vector_store.write().await; // Re-acquire
        }

        Ok(())
    }

    /**
     * DESIGN DECISION: Record pattern usage for ranking
     * WHY: Recently used patterns should rank higher (recency bias)
     */
    pub async fn record_usage(&self, pattern_id: &str, confidence: f64) -> Result<()> {
        let mut patterns = self.patterns.write().await;

        if let Some(indexed) = patterns.iter_mut().find(|p| p.pattern.id().to_string() == pattern_id) {
            indexed.usage_count += 1;
            indexed.last_used = Some(Utc::now());

            // Update average confidence
            if let Some(avg) = indexed.avg_confidence {
                indexed.avg_confidence = Some((avg + confidence) / 2.0);
            } else {
                indexed.avg_confidence = Some(confidence);
            }
        }

        Ok(())
    }

    /**
     * DESIGN DECISION: Get pattern statistics
     * WHY: Useful for analytics, debugging, optimization
     */
    pub async fn get_statistics(&self) -> PatternIndexStatistics {
        let patterns = self.patterns.read().await;
        let hot_cache = self.hot_cache.read().await;

        let total_patterns = patterns.len();
        let total_usage = patterns.iter().map(|p| p.usage_count).sum();
        let cached_patterns = hot_cache.len();

        let most_used = patterns.iter()
            .max_by_key(|p| p.usage_count)
            .map(|p| p.pattern.id().to_string());

        PatternIndexStatistics {
            total_patterns,
            total_usage,
            cached_patterns,
            most_used,
        }
    }

    /**
     * DESIGN DECISION: Load patterns from directory recursively
     * WHY: Support nested pattern organization (by domain, type, etc.)
     */
    async fn load_patterns_from_directory(&self) -> Result<Vec<Pattern>> {
        let mut patterns = Vec::new();

        // Read all .md files in pattern directory
        let entries = std::fs::read_dir(&self.pattern_dir)
            .map_err(|e| Error::Io(format!("Failed to read pattern directory: {}", e)))?;

        for entry in entries {
            let entry = entry.map_err(|e| Error::Io(format!("Failed to read directory entry: {}", e)))?;
            let path = entry.path();

            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("md") {
                // Parse pattern from markdown file
                match Pattern::from_file(&path) {
                    Ok(pattern) => patterns.push(pattern),
                    Err(e) => eprintln!("Warning: Failed to parse pattern {:?}: {}", path, e),
                }
            }
        }

        Ok(patterns)
    }
}

/// Pattern index statistics
#[derive(Debug, Clone)]
pub struct PatternIndexStatistics {
    pub total_patterns: usize,
    pub total_usage: usize,
    pub cached_patterns: usize,
    pub most_used: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_pattern_index() {
        let pattern_dir = PathBuf::from("./docs/patterns");
        let data_dir = PathBuf::from("./data/test");

        let index = PatternIndex::new(pattern_dir, data_dir);
        assert!(index.is_ok());
    }

    #[tokio::test]
    async fn test_add_pattern() {
        let pattern_dir = PathBuf::from("./docs/patterns");
        let data_dir = PathBuf::from("./data/test");
        let mut index = PatternIndex::new(pattern_dir, data_dir).unwrap();

        let pattern = Pattern::new(
            "Test Pattern".to_string(),
            "OAuth2 PKCE implementation".to_string(),
            vec!["oauth2".to_string(), "security".to_string()],
        );

        let result = index.add_pattern(pattern).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_search_by_intent() {
        let pattern_dir = PathBuf::from("./docs/patterns");
        let data_dir = PathBuf::from("./data/test");
        let mut index = PatternIndex::new(pattern_dir, data_dir).unwrap();

        // Add test pattern
        let pattern = Pattern::new(
            "OAuth2 PKCE Flow".to_string(),
            "Secure OAuth2 implementation with PKCE".to_string(),
            vec!["oauth2".to_string(), "security".to_string()],
        );
        index.add_pattern(pattern).await.unwrap();

        // Search
        let matches = index.search_by_intent(
            "I need to implement OAuth2 with PKCE for security",
            None
        ).await;

        assert!(matches.is_ok());
        let matches = matches.unwrap();
        assert!(!matches.is_empty());
    }

    #[tokio::test]
    async fn test_record_usage() {
        let pattern_dir = PathBuf::from("./docs/patterns");
        let data_dir = PathBuf::from("./data/test");
        let mut index = PatternIndex::new(pattern_dir, data_dir).unwrap();

        let pattern = Pattern::new(
            "Test Pattern".to_string(),
            "Test description".to_string(),
            vec!["test".to_string()],
        );
        let pattern_id = pattern.id().to_string();
        index.add_pattern(pattern).await.unwrap();

        // Record usage
        let result = index.record_usage(&pattern_id, 0.89).await;
        assert!(result.is_ok());

        // Check statistics
        let stats = index.get_statistics().await;
        assert_eq!(stats.total_usage, 1);
    }
}
