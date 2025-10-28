/**
 * Domain Pattern Library - Specialized pattern storage per domain
 *
 * DESIGN DECISION: Domain-specific pattern filtering with vector index per domain
 * WHY: Each domain needs specialized knowledge isolated from other domains for accurate pattern matching
 *
 * REASONING CHAIN:
 * 1. Domain agents need access to domain-specific patterns only (not all patterns)
 * 2. Infrastructure patterns shouldn't mix with Quality patterns (different contexts)
 * 3. Vector search within domain provides better relevance than cross-domain search
 * 4. Each domain has its own embedding space (Infrastructure keywords ≠ Quality keywords)
 * 5. Seed patterns loaded from domain-specific JSON files (e.g., infrastructure_patterns.json)
 * 6. DomainEmbeddings wraps LocalEmbeddings with domain-specific context
 * 7. Performance: <500ms domain loading, <50ms search within 100 patterns
 *
 * PATTERN: Pattern-DOMAIN-002 (Domain Pattern Library Structure)
 * RELATED: P3.5-001 (DomainAgent trait), P3.5-003 (Breadcrumb Escalation)
 * PERFORMANCE: <500ms loading, <50ms search (100 patterns), <100ms search (1000 patterns)
 */

use crate::domain_agent::Domain;
use crate::pattern::Pattern;
use crate::embeddings::LocalEmbeddings;
use crate::vector_store::SqliteVectorStore;
use crate::error::Error;
use std::path::PathBuf;

/**
 * Domain Pattern Library
 *
 * DESIGN DECISION: In-memory pattern cache + vector index for fast search
 * WHY: 100-1000 patterns per domain fits in memory, vector search for semantic matching
 *
 * Structure:
 * - domain: Which domain this library serves
 * - patterns: In-memory cache of all domain patterns
 * - embeddings: Domain-specific embedding generator
 * - vector_store: SQLite-backed vector index for semantic search
 * - patterns_dir: Path to JSON pattern files
 *
 * Note: Not Clone due to SqliteVectorStore (database connection)
 */
pub struct DomainPatternLibrary {
    domain: Domain,
    patterns: Vec<Pattern>,
    embeddings: DomainEmbeddings,
    vector_store: SqliteVectorStore,
    patterns_dir: PathBuf,
}

impl DomainPatternLibrary {
    /**
     * Create new domain pattern library
     *
     * DESIGN DECISION: Load patterns lazily (don't load in constructor)
     * WHY: Constructor should be fast, loading patterns is I/O-heavy (500ms)
     *
     * Usage:
     * ```
     * let mut library = DomainPatternLibrary::new(Domain::Infrastructure);
     * library.load_patterns()?;  // Explicit load
     * let results = library.search("how to deploy rust app")?;
     * ```
     */
    pub fn new(domain: Domain, patterns_dir: PathBuf) -> Result<Self, Error> {
        // Create domain-specific vector store path
        let vector_db_path = format!("data/patterns/{:?}.sqlite", domain).to_lowercase();

        // PLACEHOLDER: Use default model paths for Week 0
        // FUTURE: Make these configurable or auto-discover from standard locations
        let model_path = "models/all-MiniLM-L6-v2.onnx";
        let tokenizer_path = "models/tokenizer.json";

        Ok(Self {
            domain,
            patterns: Vec::new(),
            embeddings: DomainEmbeddings::new(model_path, tokenizer_path)?,
            vector_store: SqliteVectorStore::new(&vector_db_path)?,
            patterns_dir,
        })
    }

    /**
     * Load patterns for this domain from JSON file
     *
     * DESIGN DECISION: JSON format for human-readable pattern editing
     * WHY: Developers can add patterns manually, git-friendly diffs
     *
     * File structure:
     * ```json
     * [
     *   {
     *     "id": "infra-001",
     *     "title": "Deploy Rust app to AWS",
     *     "content": "Use cargo build --release && scp to EC2",
     *     "tags": ["deployment", "aws", "rust"],
     *     "domain": "Infrastructure",
     *     "confidence": 0.92
     *   }
     * ]
     * ```
     *
     * Performance: <500ms for 100 patterns (file I/O + embedding generation)
     */
    pub fn load_patterns(&mut self) -> Result<(), Error> {
        // Construct filename: infrastructure.json, knowledge.json, etc.
        let filename = format!("{}.json", format!("{:?}", self.domain).to_lowercase());
        let pattern_file = self.patterns_dir.join(filename);

        // If file doesn't exist, start with empty library (not an error)
        if !pattern_file.exists() {
            return Ok(());
        }

        // Read JSON file
        let json_content = std::fs::read_to_string(&pattern_file)
            .map_err(|e| Error::Internal(format!("Failed to read pattern file: {}", e)))?;

        // Parse JSON into patterns
        let loaded_patterns: Vec<Pattern> = serde_json::from_str(&json_content)
            .map_err(|e| Error::Internal(format!("Failed to parse pattern JSON: {}", e)))?;

        // Filter patterns by domain (in case JSON has mixed domains)
        let domain_str = format!("{:?}", self.domain);
        self.patterns = loaded_patterns.into_iter()
            .filter(|p| p.metadata().domain.as_deref() == Some(&domain_str))
            .collect();

        // Generate embeddings and store in vector index
        for pattern in &self.patterns {
            let embedding = self.embeddings.embed(&pattern.content())?;
            let pattern_id_str = pattern.id().to_string();
            let metadata = serde_json::json!({
                "pattern_id": &pattern_id_str,
                "title": pattern.title(),
                "domain": &domain_str
            });
            self.vector_store.insert(&pattern_id_str, &embedding, &metadata)?;
        }

        Ok(())
    }

    /**
     * Search patterns within this domain
     *
     * DESIGN DECISION: Semantic search using embeddings (not keyword matching)
     * WHY: "how to deploy" matches "deployment guide" semantically, not lexically
     *
     * DESIGN DECISION: Takes &mut self for ort 2.0 compatibility
     * WHY: Calls embeddings.embed() which requires &mut in ort 2.0
     *
     * Algorithm:
     * 1. Generate embedding for query
     * 2. Vector search in domain-specific index
     * 3. Return patterns sorted by cosine similarity
     * 4. Filter results by confidence threshold (optional)
     *
     * Performance: <50ms for 100 patterns, <100ms for 1000 patterns
     *
     * Returns: Vec of (Pattern, confidence_score) sorted by confidence descending
     */
    pub fn search(&mut self, query: &str) -> Result<Vec<(Pattern, f32)>, Error> {
        // Generate query embedding
        let query_embedding = self.embeddings.embed(query)?;

        // Vector search (returns sorted by similarity descending)
        let search_results = self.vector_store.search(&query_embedding, 10)?;  // Top 10

        // Map IDs back to patterns with confidence scores
        let mut results = Vec::new();
        for result in search_results {
            let result_id_str = result.id.clone();
            if let Some(pattern) = self.patterns.iter().find(|p| p.id().to_string() == result_id_str) {
                results.push((pattern.clone(), result.score));
            }
        }

        Ok(results)
    }

    /**
     * Add new pattern to library
     *
     * DESIGN DECISION: Add to memory AND persist to JSON
     * WHY: Runtime additions should survive restart
     *
     * Steps:
     * 1. Validate pattern belongs to this domain
     * 2. Add to in-memory cache
     * 3. Generate embedding and update vector index
     * 4. Persist to JSON file
     */
    pub fn add_pattern(&mut self, pattern: Pattern) -> Result<(), Error> {
        // Validate domain (check metadata.domain matches)
        let domain_str = format!("{:?}", self.domain);
        if pattern.metadata().domain.as_deref() != Some(&domain_str) {
            return Err(Error::Internal(format!(
                "Pattern domain {:?} doesn't match library domain {:?}",
                pattern.metadata().domain,
                self.domain
            )));
        }

        // Generate embedding
        let embedding = self.embeddings.embed(&pattern.content())?;
        let pattern_id_str = pattern.id().to_string();
        let metadata = serde_json::json!({
            "pattern_id": &pattern_id_str,
            "title": pattern.title(),
            "domain": &domain_str
        });

        // Add to vector index
        self.vector_store.insert(&pattern_id_str, &embedding, &metadata)?;

        // Add to in-memory cache
        self.patterns.push(pattern);

        // Persist to JSON (save entire library)
        self.save_patterns()?;

        Ok(())
    }

    /**
     * Save patterns to JSON file
     *
     * DESIGN DECISION: Write entire library (not incremental)
     * WHY: Simple, atomic updates, 100 patterns = ~50KB JSON (fast)
     */
    fn save_patterns(&self) -> Result<(), Error> {
        let filename = format!("{}.json", format!("{:?}", self.domain).to_lowercase());
        let pattern_file = self.patterns_dir.join(filename);

        // Ensure directory exists
        if let Some(parent) = pattern_file.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| Error::Internal(format!("Failed to create patterns directory: {}", e)))?;
        }

        // Serialize to JSON
        let json_content = serde_json::to_string_pretty(&self.patterns)
            .map_err(|e| Error::Internal(format!("Failed to serialize patterns: {}", e)))?;

        // Write to file
        std::fs::write(&pattern_file, json_content)
            .map_err(|e| Error::Internal(format!("Failed to write pattern file: {}", e)))?;

        Ok(())
    }

    /// Get number of patterns in library
    pub fn pattern_count(&self) -> usize {
        self.patterns.len()
    }

    /// Get domain this library serves
    pub fn domain(&self) -> Domain {
        self.domain
    }
}

/**
 * Domain Embeddings - Wrapper around LocalEmbeddings with domain context
 *
 * DESIGN DECISION: Same embedding model, different context for each domain
 * WHY: Infrastructure "deployment" ≠ Quality "deployment" (different meanings)
 *
 * NOTE: Not Clone because LocalEmbeddings contains ONNX Session (not Clone)
 *
 * Future enhancement: Domain-specific fine-tuned models
 */
pub struct DomainEmbeddings {
    embeddings: LocalEmbeddings,
}

impl DomainEmbeddings {
    /// Create new domain embeddings
    ///
    /// # Arguments
    /// * `model_path` - Path to ONNX model file
    /// * `tokenizer_path` - Path to tokenizer JSON file
    ///
    /// DESIGN DECISION: Require explicit model/tokenizer paths
    /// WHY: LocalEmbeddings needs these paths for ONNX Runtime initialization
    pub fn new(
        model_path: impl AsRef<std::path::Path>,
        tokenizer_path: impl AsRef<std::path::Path>,
    ) -> Result<Self, Error> {
        Ok(Self {
            embeddings: LocalEmbeddings::new(model_path, tokenizer_path)?,
        })
    }

    /**
     * Generate embedding for text
     *
     * DESIGN DECISION: Use LocalEmbeddings (all-MiniLM-L6-v2, 384 dimensions)
     * WHY: Fast (<10ms per embedding), offline, good quality
     *
     * DESIGN DECISION: Takes &mut self for ort 2.0 compatibility
     * WHY: LocalEmbeddings::embed() requires &mut self in ort 2.0 (Session::run() mutability)
     *
     * Returns: Raw embedding vector (Vec<f32>, 384 dimensions)
     *
     * Future: Add domain-specific prefix to text before embedding
     * e.g., "Infrastructure: how to deploy" vs "Quality: how to deploy"
     */
    pub fn embed(&mut self, text: &str) -> Result<Vec<f32>, Error> {
        let result = self.embeddings.embed(text)?;
        Ok(result.embedding)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_create_domain_library() {
        let temp_dir = TempDir::new().unwrap();
        let library = DomainPatternLibrary::new(
            Domain::Infrastructure,
            temp_dir.path().to_path_buf()
        );
        assert!(library.is_ok());
        let lib = library.unwrap();
        assert_eq!(lib.domain(), Domain::Infrastructure);
        assert_eq!(lib.pattern_count(), 0);
    }

    #[test]
    fn test_load_patterns_from_json() {
        let temp_dir = TempDir::new().unwrap();

        // Create mock pattern JSON file with proper Pattern struct format
        let json_content = r#"[
            {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "title": "Deploy Rust app to AWS",
                "content": "Use cargo build --release && scp to EC2",
                "tags": ["deployment", "aws", "rust"],
                "metadata": {
                    "language": "rust",
                    "framework": null,
                    "domain": "Infrastructure"
                },
                "created_at": "2025-10-07T00:00:00Z",
                "modified_at": "2025-10-07T00:00:00Z"
            },
            {
                "id": "550e8400-e29b-41d4-a716-446655440001",
                "title": "Set up CI/CD pipeline",
                "content": "Use GitHub Actions for automated deployment",
                "tags": ["ci-cd", "github", "automation"],
                "metadata": {
                    "language": null,
                    "framework": null,
                    "domain": "Infrastructure"
                },
                "created_at": "2025-10-07T00:00:00Z",
                "modified_at": "2025-10-07T00:00:00Z"
            }
        ]"#;

        let pattern_file = temp_dir.path().join("infrastructure.json");
        fs::write(&pattern_file, json_content).unwrap();

        let mut library = DomainPatternLibrary::new(
            Domain::Infrastructure,
            temp_dir.path().to_path_buf()
        ).unwrap();

        let result = library.load_patterns();
        assert!(result.is_ok(), "Failed to load patterns: {:?}", result.err());
        assert_eq!(library.pattern_count(), 2);
    }

    #[test]
    fn test_add_pattern() {
        let temp_dir = TempDir::new().unwrap();
        let mut library = DomainPatternLibrary::new(
            Domain::Quality,
            temp_dir.path().to_path_buf()
        ).unwrap();

        let pattern = Pattern::builder()
            .title("Write comprehensive unit tests")
            .content("Test all edge cases with >80% coverage")
            .tags(vec!["testing", "quality"])
            .domain("Quality")
            .build()
            .unwrap();

        let result = library.add_pattern(pattern);
        assert!(result.is_ok());
        assert_eq!(library.pattern_count(), 1);
    }

    #[test]
    fn test_domain_isolation() {
        let temp_dir = TempDir::new().unwrap();
        let mut library = DomainPatternLibrary::new(
            Domain::Infrastructure,
            temp_dir.path().to_path_buf()
        ).unwrap();

        // Try to add pattern from wrong domain
        let wrong_domain_pattern = Pattern::builder()
            .title("Test pattern")
            .content("This is a quality pattern")
            .tags(vec!["testing"])
            .domain("Quality")
            .build()
            .unwrap();

        let result = library.add_pattern(wrong_domain_pattern);
        assert!(result.is_err());
        assert_eq!(library.pattern_count(), 0);
    }
}
