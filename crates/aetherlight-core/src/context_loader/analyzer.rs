/**
 * DESIGN DECISION: Semantic analysis of task to determine relevant sections
 * WHY: Keyword matching insufficient - need semantic understanding
 *
 * REASONING CHAIN:
 * 1. Task: "Fix OAuth2 security issue in authentication"
 * 2. Keyword match: "oauth2", "security", "authentication"
 * 3. Semantic match: Also relevant to "crypto", "tokens", "PKCE"
 * 4. Load sections with high semantic relevance (>0.6)
 * 5. Result: More comprehensive context
 *
 * PATTERN: Pattern-CONTEXT-003 (Progressive Context Loading)
 */

use crate::embeddings::LocalEmbeddings;
use crate::error::Error;
use super::{Task, Section};
use serde::{Deserialize, Serialize};

/// Task analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskAnalysis {
    /// Extracted domains (rust, typescript, database, etc.)
    pub domains: Vec<String>,

    /// Extracted keywords
    pub keywords: Vec<String>,

    /// Task embedding (384-dim)
    pub embedding: Vec<f32>,

    /// Complexity estimate (simple, medium, complex)
    pub complexity: Complexity,
}

/// Task complexity
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Complexity {
    Simple,   // Single file, <1 hour
    Medium,   // Multiple files, 1-4 hours
    Complex,  // Architecture changes, 4+ hours
}

/// Context analyzer
pub struct ContextAnalyzer {
    embeddings: LocalEmbeddings,
    domain_keywords: DomainKeywords,
}

impl ContextAnalyzer {
    /**
     * DESIGN DECISION: Initialize with embeddings and domain keywords
     * WHY: Need embeddings for semantic analysis, keywords for domain detection
     */
    pub fn new(embeddings: LocalEmbeddings) -> Self {
        let domain_keywords = DomainKeywords::default();

        Self {
            embeddings,
            domain_keywords,
        }
    }

    /**
     * DESIGN DECISION: Analyze task to extract domains and keywords
     * WHY: Enables intelligent section selection
     *
     * REASONING CHAIN:
     * 1. Embed task description
     * 2. Extract domains from keywords
     * 3. Extract keywords from description
     * 4. Estimate complexity
     * 5. Return analysis
     *
     * PERFORMANCE: <50ms per analysis
     */
    pub async fn analyze(&self, task: &Task) -> Result<TaskAnalysis, Error> {
        // Embed task description
        let embedding = self.embed_task(&task.description).await?;

        // Extract domains from keywords
        let domains = self.extract_domains(&task.description);

        // Extract keywords
        let keywords = self.extract_keywords(&task.description);

        // Estimate complexity
        let complexity = self.estimate_complexity(task);

        Ok(TaskAnalysis {
            domains,
            keywords,
            embedding,
            complexity,
        })
    }

    /**
     * DESIGN DECISION: Rank sections by relevance to task
     * WHY: Load most relevant sections first (within token budget)
     *
     * REASONING CHAIN:
     * 1. Calculate cosine similarity: task embedding vs section embedding
     * 2. Boost score if section used recently
     * 3. Boost score if domain matches
     * 4. Sort by final relevance score
     * 5. Return ranked sections
     */
    pub async fn rank_by_relevance(
        &self,
        sections: Vec<Section>,
        analysis: &TaskAnalysis,
    ) -> Result<Vec<Section>, Error> {
        let mut ranked = Vec::new();

        for mut section in sections {
            // Calculate base relevance (semantic similarity)
            let base_relevance = self.calculate_relevance(&section, analysis).await?;

            // Apply boosts
            let mut relevance = base_relevance;

            // Boost if used recently (recency bias)
            if let Some(last_used) = section.last_used {
                let hours_since = chrono::Utc::now()
                    .signed_duration_since(last_used)
                    .num_hours();

                if hours_since < 24 {
                    relevance += 0.15;  // Recent = more relevant
                } else if hours_since < 168 {  // 1 week
                    relevance += 0.05;
                }
            }

            // Boost if domain matches
            if analysis.domains.iter().any(|d| section.id.contains(d)) {
                relevance += 0.20;
            }

            // Clamp to 0.0-1.0
            section.relevance_score = relevance.min(1.0).max(0.0);
            ranked.push(section);
        }

        // Sort by relevance (descending)
        ranked.sort_by(|a, b| {
            b.relevance_score
                .partial_cmp(&a.relevance_score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        Ok(ranked)
    }

    /**
     * DESIGN DECISION: Embed task description for semantic matching
     * WHY: Enables semantic similarity calculation
     */
    async fn embed_task(&self, description: &str) -> Result<Vec<f32>, Error> {
        // Use embeddings to generate 384-dim vector
        let mut embeddings = self.embeddings.clone();
        let result = embeddings.embed(description)
            .map_err(|e| Error::Internal(format!("Embedding failed: {}", e)))?;

        Ok(result.embedding)
    }

    /**
     * DESIGN DECISION: Extract domains from task description
     * WHY: Determines which domain-specific sections to load
     *
     * REASONING CHAIN:
     * 1. Check description for domain keywords
     * 2. "Implement OAuth2 in Rust" → domains: ["rust", "security"]
     * 3. "Add database migration" → domains: ["database", "migration"]
     * 4. Return detected domains
     */
    fn extract_domains(&self, description: &str) -> Vec<String> {
        let desc_lower = description.to_lowercase();
        let mut domains = Vec::new();

        for (domain, keywords) in &self.domain_keywords.keywords {
            if keywords.iter().any(|kw| desc_lower.contains(kw)) {
                domains.push(domain.clone());
            }
        }

        // Deduplicate
        domains.sort();
        domains.dedup();

        domains
    }

    /**
     * DESIGN DECISION: Extract keywords from description
     * WHY: Enables keyword-based pattern matching
     */
    fn extract_keywords(&self, description: &str) -> Vec<String> {
        // Simple keyword extraction (split on whitespace, filter stop words)
        let stop_words = vec!["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for"];

        description
            .to_lowercase()
            .split_whitespace()
            .filter(|word| !stop_words.contains(word))
            .map(|s| s.to_string())
            .collect()
    }

    /**
     * DESIGN DECISION: Estimate task complexity
     * WHY: Complex tasks need more context
     */
    fn estimate_complexity(&self, task: &Task) -> Complexity {
        let desc_len = task.description.len();
        let keyword_count = task.keywords.len();

        // Heuristic: Long descriptions + many keywords = complex
        if desc_len > 200 || keyword_count > 10 {
            Complexity::Complex
        } else if desc_len > 100 || keyword_count > 5 {
            Complexity::Medium
        } else {
            Complexity::Simple
        }
    }

    /**
     * DESIGN DECISION: Calculate relevance using cosine similarity
     * WHY: Semantic relevance = similarity between embeddings
     */
    async fn calculate_relevance(
        &self,
        section: &Section,
        analysis: &TaskAnalysis,
    ) -> Result<f64, Error> {
        // For now, use simple keyword matching
        // TODO: Embed section content and calculate cosine similarity

        let section_id_lower = section.id.to_lowercase();
        let mut relevance: f64 = 0.0;

        // Check if any analysis keywords in section ID
        for keyword in &analysis.keywords {
            if section_id_lower.contains(keyword) {
                relevance += 0.1;
            }
        }

        // Check if any domains match
        for domain in &analysis.domains {
            if section_id_lower.contains(domain) {
                relevance += 0.3;
            }
        }

        Ok(relevance.min(1.0_f64))
    }
}

/// Domain keyword mappings
struct DomainKeywords {
    keywords: std::collections::HashMap<String, Vec<String>>,
}

impl Default for DomainKeywords {
    fn default() -> Self {
        let mut keywords = std::collections::HashMap::new();

        // Rust domain
        keywords.insert(
            "rust".to_string(),
            vec![
                "rust".to_string(),
                "cargo".to_string(),
                "rustc".to_string(),
                "unsafe".to_string(),
                "lifetime".to_string(),
                "borrow".to_string(),
            ],
        );

        // TypeScript domain
        keywords.insert(
            "typescript".to_string(),
            vec![
                "typescript".to_string(),
                "ts".to_string(),
                "javascript".to_string(),
                "js".to_string(),
                "node".to_string(),
                "npm".to_string(),
            ],
        );

        // Database domain
        keywords.insert(
            "database".to_string(),
            vec![
                "database".to_string(),
                "sql".to_string(),
                "postgresql".to_string(),
                "migration".to_string(),
                "schema".to_string(),
                "query".to_string(),
            ],
        );

        // Security domain
        keywords.insert(
            "security".to_string(),
            vec![
                "security".to_string(),
                "auth".to_string(),
                "oauth".to_string(),
                "jwt".to_string(),
                "crypto".to_string(),
                "encryption".to_string(),
            ],
        );

        // Testing domain
        keywords.insert(
            "testing".to_string(),
            vec![
                "test".to_string(),
                "testing".to_string(),
                "coverage".to_string(),
                "jest".to_string(),
                "pytest".to_string(),
                "tarpaulin".to_string(),
            ],
        );

        // Performance domain
        keywords.insert(
            "performance".to_string(),
            vec![
                "performance".to_string(),
                "benchmark".to_string(),
                "optimization".to_string(),
                "cache".to_string(),
                "latency".to_string(),
                "throughput".to_string(),
            ],
        );

        Self { keywords }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_domains() {
        let embeddings = LocalEmbeddings::new(
            std::path::PathBuf::from("data/models/model.onnx"),
            std::path::PathBuf::from("data/models/tokenizer.json"),
        ).unwrap();

        let analyzer = ContextAnalyzer::new(embeddings);

        let domains = analyzer.extract_domains("Implement OAuth2 authentication in Rust");
        assert!(domains.contains(&"rust".to_string()));
        assert!(domains.contains(&"security".to_string()));
    }

    #[test]
    fn test_extract_keywords() {
        let embeddings = LocalEmbeddings::new(
            std::path::PathBuf::from("data/models/model.onnx"),
            std::path::PathBuf::from("data/models/tokenizer.json"),
        ).unwrap();

        let analyzer = ContextAnalyzer::new(embeddings);

        let keywords = analyzer.extract_keywords("Implement OAuth2 authentication");
        assert!(keywords.contains(&"implement".to_string()));
        assert!(keywords.contains(&"oauth2".to_string()));
        assert!(keywords.contains(&"authentication".to_string()));
    }

    #[test]
    fn test_estimate_complexity() {
        let embeddings = LocalEmbeddings::new(
            std::path::PathBuf::from("data/models/model.onnx"),
            std::path::PathBuf::from("data/models/tokenizer.json"),
        ).unwrap();

        let analyzer = ContextAnalyzer::new(embeddings);

        // Simple task
        let simple_task = Task {
            id: "test-001".to_string(),
            description: "Fix typo".to_string(),
            domains: vec![],
            keywords: vec![],
            token_budget: 8000,
        };
        assert_eq!(analyzer.estimate_complexity(&simple_task), Complexity::Simple);

        // Complex task
        let complex_task = Task {
            id: "test-002".to_string(),
            description: "Refactor the entire authentication system to support multiple OAuth2 providers with PKCE flow, implement refresh token rotation, add session management, and update all documentation with comprehensive examples.".to_string(),
            domains: vec![],
            keywords: vec!["oauth2".to_string(), "pkce".to_string(), "auth".to_string()],
            token_budget: 8000,
        };
        assert_eq!(analyzer.estimate_complexity(&complex_task), Complexity::Complex);
    }
}
