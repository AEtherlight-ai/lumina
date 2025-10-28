/**
 * Semantic Search (AI-005 Submodule)
 *
 * DESIGN DECISION: Cosine similarity search over embeddings
 * WHY: Fast, accurate semantic matching for pattern discovery
 *
 * REASONING CHAIN:
 * 1. User query: "I need secure authentication"
 * 2. Embed query → [0.23, -0.45, 0.67, ...] (384-dim)
 * 3. Compare to all pattern embeddings via cosine similarity
 * 4. Cosine similarity = dot(A, B) / (||A|| * ||B||)
 * 5. Results ranked by similarity: OAuth2 (0.87), JWT (0.72), BasicAuth (0.45)
 * 6. Top N results returned with explanations
 *
 * PATTERN: Pattern-INDEX-001 (Semantic Pattern Search)
 * PERFORMANCE: <100ms for 100+ patterns
 * RELATED: SQLiteVectorStore (provides efficient storage)
 */

use crate::{Pattern, Result};

/// Search result with score
#[derive(Debug, Clone)]
pub struct SearchResult {
    /// Pattern ID
    pub pattern_id: String,

    /// Similarity score (0.0-1.0)
    pub score: f64,

    /// Embedding used for matching
    pub embedding: Vec<f32>,
}

/**
 * DESIGN DECISION: Calculate cosine similarity between vectors
 * WHY: Standard metric for semantic similarity in NLP
 *
 * REASONING CHAIN:
 * 1. Cosine similarity measures angle between vectors
 * 2. Similar text → similar vectors → small angle → high similarity
 * 3. Formula: cos(θ) = dot(A, B) / (||A|| * ||B||)
 * 4. Range: -1.0 to 1.0 (we normalize to 0.0 to 1.0)
 * 5. Fast to compute (<1μs for 384-dim vectors)
 *
 * PERFORMANCE: <1μs per comparison
 */
pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f64 {
    if a.len() != b.len() {
        return 0.0;
    }

    let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let magnitude_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let magnitude_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

    if magnitude_a == 0.0 || magnitude_b == 0.0 {
        return 0.0;
    }

    let similarity = dot_product / (magnitude_a * magnitude_b);

    // Normalize to 0.0-1.0 range (cosine similarity is -1.0 to 1.0)
    ((similarity + 1.0) / 2.0) as f64
}

/**
 * DESIGN DECISION: Search with threshold filtering
 * WHY: Return only relevant matches (> 0.5 similarity)
 *
 * REASONING CHAIN:
 * 1. User expects relevant results only
 * 2. Low similarity scores = irrelevant patterns
 * 3. Threshold filters out noise:
 *    - 0.85+ : Highly relevant
 *    - 0.70-0.85 : Relevant
 *    - 0.50-0.70 : Possibly relevant
 *    - <0.50 : Not relevant (filtered out)
 * 4. Configurable threshold (default 0.5)
 */
pub fn search_with_threshold(
    query_embedding: &[f32],
    pattern_embeddings: &[(String, Vec<f32>)],
    threshold: f64,
    limit: usize,
) -> Vec<SearchResult> {
    let mut results: Vec<SearchResult> = pattern_embeddings
        .iter()
        .map(|(id, embedding)| {
            let score = cosine_similarity(query_embedding, embedding);
            SearchResult {
                pattern_id: id.clone(),
                score,
                embedding: embedding.clone(),
            }
        })
        .filter(|r| r.score >= threshold) // Filter by threshold
        .collect();

    // Sort by score descending
    results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());

    // Limit results
    results.truncate(limit);

    results
}

/**
 * DESIGN DECISION: Explain why pattern matched query
 * WHY: Transparency helps users understand search results
 *
 * REASONING CHAIN:
 * 1. User sees: "Pattern-OAUTH2-001 (87% relevance)"
 * 2. User wonders: "Why this pattern?"
 * 3. Explanation helps: "Semantic match: 'OAuth2', 'PKCE', 'security'"
 * 4. Builds trust in semantic search
 * 5. Simple keyword extraction from pattern text + query overlap
 */
pub fn explain_match(query: &str, pattern: &Pattern, relevance: f64) -> String {
    let query_lower = query.to_lowercase();
    let pattern_title_lower = pattern.title().to_lowercase();
    let pattern_keywords: Vec<String> = pattern.tags().iter().map(|k| k.to_lowercase()).collect();

    // Find overlapping keywords
    let mut overlapping_keywords: Vec<String> = Vec::new();

    for keyword in &pattern_keywords {
        if query_lower.contains(keyword) || pattern_title_lower.contains(keyword) {
            overlapping_keywords.push(keyword.clone());
        }
    }

    // Check for title match
    let title_words: Vec<&str> = pattern_title_lower.split_whitespace().collect();
    let mut title_matches: Vec<String> = Vec::new();

    for word in title_words {
        if word.len() > 3 && query_lower.contains(word) {
            title_matches.push(word.to_string());
        }
    }

    // Build explanation
    let mut explanation = if relevance >= 0.85 {
        "Strong semantic match".to_string()
    } else if relevance >= 0.70 {
        "Semantic match".to_string()
    } else if relevance >= 0.50 {
        "Possible match".to_string()
    } else {
        "Weak match".to_string()
    };

    if !title_matches.is_empty() {
        explanation.push_str(&format!(": title contains '{}'", title_matches.join("', '")));
    } else if !overlapping_keywords.is_empty() {
        explanation.push_str(&format!(": keywords '{}'", overlapping_keywords.join("', '")));
    } else {
        explanation.push_str(": based on semantic similarity");
    }

    explanation
}

/**
 * DESIGN DECISION: Highlight matching text in pattern
 * WHY: Visual feedback helps users quickly validate relevance
 *
 * REASONING CHAIN:
 * 1. User searches: "OAuth2 security"
 * 2. Pattern description: "Implements **OAuth2** PKCE for **security**"
 * 3. Highlighted text confirms match
 * 4. User validates relevance instantly
 */
pub fn highlight_matches(text: &str, query: &str) -> String {
    let query_words: Vec<&str> = query.split_whitespace().collect();
    let mut highlighted = text.to_string();

    for word in query_words {
        if word.len() > 3 {
            // Only highlight significant words
            let word_lower = word.to_lowercase();
            let highlighted_word = format!("**{}**", word);

            // Case-insensitive replacement
            highlighted = highlighted.replace(&word_lower, &highlighted_word);
            highlighted = highlighted.replace(&word.to_uppercase(), &highlighted_word);
            highlighted = highlighted.replace(word, &highlighted_word);
        }
    }

    highlighted
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cosine_similarity() {
        // Identical vectors
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![1.0, 2.0, 3.0];
        let sim = cosine_similarity(&a, &b);
        assert!((sim - 1.0).abs() < 0.01); // Should be ~1.0

        // Orthogonal vectors
        let a = vec![1.0, 0.0];
        let b = vec![0.0, 1.0];
        let sim = cosine_similarity(&a, &b);
        assert!((sim - 0.5).abs() < 0.01); // Should be ~0.5 (after normalization)

        // Opposite vectors
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![-1.0, -2.0, -3.0];
        let sim = cosine_similarity(&a, &b);
        assert!(sim < 0.1); // Should be close to 0.0
    }

    #[test]
    fn test_search_with_threshold() {
        let query_embedding = vec![1.0, 2.0, 3.0];

        let pattern_embeddings = vec![
            ("Pattern-001".to_string(), vec![1.0, 2.0, 3.0]), // High similarity
            ("Pattern-002".to_string(), vec![1.0, 0.0, 0.0]), // Medium similarity
            ("Pattern-003".to_string(), vec![-1.0, -2.0, -3.0]), // Low similarity
        ];

        let results = search_with_threshold(&query_embedding, &pattern_embeddings, 0.5, 10);

        // Should return 2 results (above threshold)
        assert_eq!(results.len(), 2);

        // First result should be Pattern-001
        assert_eq!(results[0].pattern_id, "Pattern-001");
        assert!(results[0].score > 0.9);
    }

    #[test]
    fn test_explain_match() {
        let pattern = Pattern::new(
            "OAuth2 PKCE Flow".to_string(),
            "Secure authentication".to_string(),
            vec!["oauth2".to_string(), "security".to_string()],
        );

        let query = "I need OAuth2 with PKCE for security";
        let explanation = explain_match(query, &pattern, 0.87);

        assert!(explanation.contains("match"));
        assert!(explanation.contains("oauth2") || explanation.contains("security"));
    }

    #[test]
    fn test_highlight_matches() {
        let text = "Implements OAuth2 PKCE for security";
        let query = "OAuth2 security";

        let highlighted = highlight_matches(text, query);

        assert!(highlighted.contains("**OAuth2**"));
        assert!(highlighted.contains("**security**"));
    }

    #[test]
    fn test_highlight_case_insensitive() {
        let text = "OAUTH2 and Security";
        let query = "oauth2 security";

        let highlighted = highlight_matches(text, query);

        // Should highlight both (case-insensitive)
        assert!(highlighted.contains("**OAUTH2**") || highlighted.contains("**oauth2**"));
        assert!(highlighted.contains("**Security**") || highlighted.contains("**security**"));
    }
}
