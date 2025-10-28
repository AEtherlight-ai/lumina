/**
 * Pattern Embedder (AI-005 Submodule)
 *
 * DESIGN DECISION: Generate embeddings for pattern descriptions
 * WHY: Transform text descriptions into vectors for semantic search
 *
 * REASONING CHAIN:
 * 1. Pattern has text description: "Implements OAuth2 PKCE flow for secure authentication"
 * 2. Cannot directly compare text strings for semantic similarity
 * 3. Embed description → 384-dim vector (all-MiniLM-L6-v2 model)
 * 4. Similar descriptions → similar vectors (cosine similarity)
 * 5. Example:
 *    - "OAuth2 PKCE" → [0.23, -0.45, 0.67, ...]
 *    - "Secure login flow" → [0.21, -0.43, 0.65, ...]  (close!)
 *    - "Database migration" → [-0.12, 0.78, -0.34, ...] (far!)
 * 6. Result: Semantic search works, finds intent not just keywords
 *
 * PATTERN: Pattern-INDEX-001 (Semantic Pattern Search)
 * PERFORMANCE: <10ms per embedding
 * RELATED: LocalEmbeddings (reuses existing model)
 */

use crate::{LocalEmbeddings, Result, Error};
use std::collections::HashMap;

/// Pattern description parts for embedding
#[derive(Debug, Clone)]
pub struct PatternDescription {
    /// Pattern title
    pub title: String,

    /// What problem this pattern solves
    pub problem: Option<String>,

    /// What solution this pattern provides
    pub solution: Option<String>,

    /// Keywords (tags)
    pub keywords: Vec<String>,

    /// Domain (rust, typescript, authentication, etc.)
    pub domain: String,
}

impl PatternDescription {
    /**
     * DESIGN DECISION: Combine all text into single description for embedding
     * WHY: Single embedding captures full pattern meaning
     *
     * REASONING CHAIN:
     * 1. Pattern has multiple text fields: title, problem, solution, keywords
     * 2. Could embed each field separately → 4 embeddings per pattern
     * 3. OR combine into single text → 1 embedding per pattern
     * 4. Single embedding simpler, faster, captures overall meaning
     * 5. Format: "Title. Problem: ... Solution: ... Keywords: ..."
     */
    pub fn to_combined_text(&self) -> String {
        let mut text = self.title.clone();

        if let Some(problem) = &self.problem {
            text.push_str(&format!("\n\nProblem: {}", problem));
        }

        if let Some(solution) = &self.solution {
            text.push_str(&format!("\n\nSolution: {}", solution));
        }

        if !self.keywords.is_empty() {
            text.push_str(&format!("\n\nKeywords: {}", self.keywords.join(", ")));
        }

        text.push_str(&format!("\n\nDomain: {}", self.domain));

        text
    }
}

/// Embeds pattern descriptions for semantic search
pub struct PatternEmbedder {
    embeddings: LocalEmbeddings,
    cache: HashMap<String, Vec<f32>>,
}

impl PatternEmbedder {
    /**
     * DESIGN DECISION: Initialize with LocalEmbeddings model
     * WHY: Reuse existing embeddings infrastructure (all-MiniLM-L6-v2)
     */
    pub fn new(model_path: impl AsRef<std::path::Path>, tokenizer_path: impl AsRef<std::path::Path>) -> Result<Self> {
        let embeddings = LocalEmbeddings::new(model_path, tokenizer_path)?;

        Ok(Self {
            embeddings,
            cache: HashMap::new(),
        })
    }

    /**
     * DESIGN DECISION: Embed pattern description with caching
     * WHY: Same pattern might be embedded multiple times (avoid redundant work)
     *
     * PERFORMANCE: <10ms per embedding (cached: <1ms)
     */
    pub fn embed_pattern(&mut self, description: &PatternDescription) -> Result<Vec<f32>> {
        let text = description.to_combined_text();

        // Check cache first
        if let Some(cached) = self.cache.get(&text) {
            return Ok(cached.clone());
        }

        // Generate embedding
        let embedding_result = self.embeddings.embed(&text)?;
        let embedding = embedding_result.embedding.clone();

        // Cache for future use
        self.cache.insert(text, embedding.clone());

        Ok(embedding)
    }

    /**
     * DESIGN DECISION: Batch embed multiple patterns
     * WHY: More efficient than one-by-one when indexing full library
     *
     * PERFORMANCE: ~10ms per pattern (batching would be ~7ms per pattern if model supported it)
     * NOTE: Current LocalEmbeddings doesn't support batch, but structured for future optimization
     */
    pub fn embed_batch(&mut self, descriptions: Vec<PatternDescription>) -> Result<Vec<Vec<f32>>> {
        let mut embeddings = Vec::new();

        for description in descriptions {
            embeddings.push(self.embed_pattern(&description)?);
        }

        Ok(embeddings)
    }

    /**
     * DESIGN DECISION: Clear cache
     * WHY: Prevent unbounded memory growth if indexing very large libraries
     */
    pub fn clear_cache(&mut self) {
        self.cache.clear();
    }

    /**
     * DESIGN DECISION: Get cache statistics
     * WHY: Debug performance, identify cache hit rate
     */
    pub fn cache_statistics(&self) -> CacheStatistics {
        CacheStatistics {
            cached_patterns: self.cache.len(),
            memory_usage_bytes: self.cache.len() * 384 * std::mem::size_of::<f32>(),
        }
    }
}

/// Cache statistics for debugging
#[derive(Debug, Clone)]
pub struct CacheStatistics {
    pub cached_patterns: usize,
    pub memory_usage_bytes: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pattern_description_to_text() {
        let description = PatternDescription {
            title: "OAuth2 PKCE Flow".to_string(),
            problem: Some("Secure authentication without client secrets".to_string()),
            solution: Some("Use PKCE (Proof Key for Code Exchange) flow".to_string()),
            keywords: vec!["oauth2".to_string(), "security".to_string()],
            domain: "authentication".to_string(),
        };

        let text = description.to_combined_text();

        assert!(text.contains("OAuth2 PKCE Flow"));
        assert!(text.contains("Problem: Secure authentication"));
        assert!(text.contains("Solution: Use PKCE"));
        assert!(text.contains("Keywords: oauth2, security"));
        assert!(text.contains("Domain: authentication"));
    }

    #[test]
    fn test_embed_pattern() {
        // Note: Test requires model files at data/models/
        let model_path = "data/models/all-MiniLM-L6-v2.onnx";
        let tokenizer_path = "data/models/tokenizer.json";

        if !std::path::Path::new(model_path).exists() {
            println!("SKIP: Model not found at {}", model_path);
            return;
        }

        let mut embedder = PatternEmbedder::new(model_path, tokenizer_path).unwrap();

        let description = PatternDescription {
            title: "Test Pattern".to_string(),
            problem: None,
            solution: None,
            keywords: vec![],
            domain: "test".to_string(),
        };

        let embedding = embedder.embed_pattern(&description);
        assert!(embedding.is_ok());

        let embedding = embedding.unwrap();
        assert_eq!(embedding.len(), 384); // all-MiniLM-L6-v2 dimension
    }

    #[test]
    fn test_embed_caching() {
        let model_path = "data/models/all-MiniLM-L6-v2.onnx";
        let tokenizer_path = "data/models/tokenizer.json";

        if !std::path::Path::new(model_path).exists() {
            println!("SKIP: Model not found");
            return;
        }

        let mut embedder = PatternEmbedder::new(model_path, tokenizer_path).unwrap();

        let description = PatternDescription {
            title: "Test Pattern".to_string(),
            problem: None,
            solution: None,
            keywords: vec![],
            domain: "test".to_string(),
        };

        // First embed
        let embedding1 = embedder.embed_pattern(&description).unwrap();

        // Second embed (should be cached)
        let embedding2 = embedder.embed_pattern(&description).unwrap();

        // Should be identical
        assert_eq!(embedding1, embedding2);

        // Cache should have 1 entry
        let stats = embedder.cache_statistics();
        assert_eq!(stats.cached_patterns, 1);
    }

    #[test]
    fn test_batch_embed() {
        let model_path = "data/models/all-MiniLM-L6-v2.onnx";
        let tokenizer_path = "data/models/tokenizer.json";

        if !std::path::Path::new(model_path).exists() {
            println!("SKIP: Model not found");
            return;
        }

        let mut embedder = PatternEmbedder::new(model_path, tokenizer_path).unwrap();

        let descriptions = vec![
            PatternDescription {
                title: "Pattern 1".to_string(),
                problem: None,
                solution: None,
                keywords: vec![],
                domain: "test".to_string(),
            },
            PatternDescription {
                title: "Pattern 2".to_string(),
                problem: None,
                solution: None,
                keywords: vec![],
                domain: "test".to_string(),
            },
        ];

        let embeddings = embedder.embed_batch(descriptions);
        assert!(embeddings.is_ok());

        let embeddings = embeddings.unwrap();
        assert_eq!(embeddings.len(), 2);
        assert_eq!(embeddings[0].len(), 384);
        assert_eq!(embeddings[1].len(), 384);
    }

    #[test]
    fn test_clear_cache() {
        let model_path = "data/models/all-MiniLM-L6-v2.onnx";
        let tokenizer_path = "data/models/tokenizer.json";

        if !std::path::Path::new(model_path).exists() {
            println!("SKIP: Model not found");
            return;
        }

        let mut embedder = PatternEmbedder::new(model_path, tokenizer_path).unwrap();

        let description = PatternDescription {
            title: "Test Pattern".to_string(),
            problem: None,
            solution: None,
            keywords: vec![],
            domain: "test".to_string(),
        };

        embedder.embed_pattern(&description).unwrap();

        // Cache should have 1 entry
        assert_eq!(embedder.cache_statistics().cached_patterns, 1);

        // Clear cache
        embedder.clear_cache();

        // Cache should be empty
        assert_eq!(embedder.cache_statistics().cached_patterns, 0);
    }
}
