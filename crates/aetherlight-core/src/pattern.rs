/**
 * Pattern Storage Module
 *
 * DESIGN DECISION: Pattern as immutable struct with builder pattern for construction
 * WHY: Immutability ensures thread-safe pattern sharing across matcher instances
 *
 * REASONING CHAIN:
 * 1. Patterns represent reusable knowledge captured from past coding sessions
 * 2. Once created, patterns should be immutable (prevent accidental modification)
 * 3. Immutability enables safe sharing across threads without locks
 * 4. Builder pattern provides ergonomic construction with validation
 * 5. Unique UUID identifies patterns in distributed pattern network (Phase 5)
 * 6. Metadata (timestamps, tags, context) enables multi-dimensional matching
 *
 * PATTERN: Pattern-001 (Rust Core + Language Bindings)
 * PATTERN: Pattern-005 (Multi-Dimensional Matching)
 * RELATED: confidence.rs (scoring), matching.rs (search algorithms)
 * FUTURE: Add embedding vector storage for semantic similarity (P1-007)
 *
 * # Pattern Structure
 *
 * ```text
 * Pattern {
 *     id: UUID (unique identifier)
 *     title: "How to handle errors in Rust"
 *     content: "Use Result<T, E> for fallible operations..."
 *     tags: ["rust", "error-handling", "best-practices"]
 *     metadata: {
 *         language: "rust",
 *         framework: "std",
 *         domain: "error-handling",
 *         created_at: "2025-10-04T14:30:00Z",
 *         modified_at: "2025-10-04T14:30:00Z",
 *     }
 * }
 * ```
 *
 * # Examples
 *
 * ```rust
 * use aetherlight_core::Pattern;
 *
 * let pattern = Pattern::builder()
 *     .title("Rust error handling")
 *     .content("Use Result<T, E> for fallible operations")
 *     .tags(vec!["rust", "error-handling"])
 *     .language("rust")
 *     .build()
 *     .unwrap();
 *
 * println!("Pattern ID: {}", pattern.id());
 * println!("Title: {}", pattern.title());
 * ```
 */

use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use crate::{Error, Result};

/**
 * Represents a single pattern in the ÆtherLight pattern library
 *
 * DESIGN DECISION: Immutable struct with private fields and public getters
 * WHY: Enforce invariants and enable safe concurrent access without locks
 *
 * REASONING CHAIN:
 * 1. Private fields prevent external mutation after construction
 * 2. Public getters provide read-only access to pattern data
 * 3. Immutability enables Sync + Send for thread-safe sharing
 * 4. UUID provides globally unique identifier for distributed network
 * 5. Timestamps track pattern lifecycle (creation, modification, usage)
 * 6. Tags enable keyword-based filtering (10% confidence weight)
 * 7. Metadata enables context-aware matching (language, framework, domain)
 *
 * PATTERN: Pattern-005 (Multi-Dimensional Matching)
 * RELATED: PatternBuilder for construction, ConfidenceScore for matching
 * FUTURE: Add embedding vector (Vec<f32>) for semantic similarity (P1-007)
 */
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Pattern {
    /// Unique identifier (UUID v4)
    id: Uuid,

    /// Pattern title (short description)
    title: String,

    /// Pattern content (full explanation with Chain of Thought reasoning)
    content: String,

    /// Tags for keyword matching
    tags: Vec<String>,

    /// Pattern metadata (context for multi-dimensional matching)
    metadata: PatternMetadata,

    /// Creation timestamp (ISO 8601)
    created_at: DateTime<Utc>,

    /// Last modification timestamp (ISO 8601)
    modified_at: DateTime<Utc>,
}

/**
 * Pattern metadata for context-aware matching
 *
 * DESIGN DECISION: Separate struct for metadata to enable flexible extension
 * WHY: Metadata fields will grow over time; separate struct prevents Pattern bloat
 *
 * REASONING CHAIN:
 * 1. Language/framework context enables 15% confidence weight
 * 2. Domain context enables cross-domain pattern matching
 * 3. Optional fields (Option<String>) enable gradual metadata enrichment
 * 4. Serializable for pattern storage and FFI transmission
 * 5. Future: Add success_rate, usage_count, security_score (P1-006)
 */
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct PatternMetadata {
    /// Programming language (e.g., "rust", "typescript", "python")
    pub language: Option<String>,

    /// Framework/library (e.g., "tokio", "react", "flutter")
    pub framework: Option<String>,

    /// Domain context (e.g., "error-handling", "async", "testing")
    pub domain: Option<String>,
}

impl Pattern {
    /**
     * Create a PatternBuilder for ergonomic pattern construction
     *
     * DESIGN DECISION: Builder pattern for optional fields and validation
     * WHY: Patterns have many optional fields; builder provides clean API
     *
     * REASONING CHAIN:
     * 1. Required fields (title, content) enforced by builder
     * 2. Optional fields (tags, metadata) have sensible defaults
     * 3. Validation happens at build() time, not construction
     * 4. Builder pattern is standard Rust idiom for complex structs
     * 5. Enables future field additions without breaking API
     *
     * PATTERN: Rust builder pattern
     * RELATED: PatternBuilder::build()
     *
     * # Examples
     *
     * ```rust
     * let pattern = Pattern::builder()
     *     .title("Example pattern")
     *     .content("Example content")
     *     .build()?;
     * ```
     */
    pub fn builder() -> PatternBuilder {
        PatternBuilder::default()
    }

    /**
     * Create a new pattern with minimal required fields (for testing)
     *
     * DESIGN DECISION: Simple constructor for tests and prototyping
     * WHY: Tests need quick pattern creation without builder verbosity
     *
     * # Examples
     *
     * ```rust
     * let pattern = Pattern::new(
     *     "Title".to_string(),
     *     "Content".to_string(),
     *     vec!["tag1".to_string()],
     * );
     * ```
     */
    pub fn new(title: String, content: String, tags: Vec<String>) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            title,
            content,
            tags,
            metadata: PatternMetadata::default(),
            created_at: now,
            modified_at: now,
        }
    }

    // Public getters for immutable access
    pub fn id(&self) -> &Uuid { &self.id }
    pub fn title(&self) -> &str { &self.title }
    pub fn content(&self) -> &str { &self.content }
    pub fn tags(&self) -> &[String] { &self.tags }
    pub fn metadata(&self) -> &PatternMetadata { &self.metadata }
    pub fn created_at(&self) -> &DateTime<Utc> { &self.created_at }
    pub fn modified_at(&self) -> &DateTime<Utc> { &self.modified_at }

    /**
     * Load pattern from markdown file
     *
     * DESIGN DECISION: Simple markdown parser for pattern files
     * WHY: Pattern library uses markdown files; need to load them for indexing
     *
     * REASONING CHAIN:
     * 1. Read file contents
     * 2. Extract title from first # heading
     * 3. Extract content (everything after title)
     * 4. Parse tags from inline [tag] or frontmatter
     * 5. Parse metadata from frontmatter or defaults
     *
     * PATTERN: Pattern-INDEX-001 (used by PatternIndex::rebuild)
     * RELATED: PatternIndex::load_patterns_from_directory
     */
    pub fn from_file(path: &std::path::Path) -> Result<Self> {
        use std::io::Read;

        // Read file contents
        let mut file = std::fs::File::open(path)
            .map_err(|e| Error::Io(format!("Failed to open file {:?}: {}", path, e)))?;

        let mut contents = String::new();
        file.read_to_string(&mut contents)
            .map_err(|e| Error::Io(format!("Failed to read file {:?}: {}", path, e)))?;

        // Extract title from first # heading
        let title = contents.lines()
            .find(|line| line.starts_with("# "))
            .map(|line| line[2..].trim().to_string())
            .ok_or_else(|| Error::PatternValidation("No title found (expected # heading)".to_string()))?;

        // Extract content (everything after first line)
        let content = contents.lines()
            .skip_while(|line| !line.starts_with("# "))
            .skip(1)
            .collect::<Vec<&str>>()
            .join("\n")
            .trim()
            .to_string();

        // Parse tags (look for tags: line or inline [tag])
        let mut tags = Vec::new();
        for line in contents.lines() {
            if line.to_lowercase().starts_with("tags:") || line.to_lowercase().starts_with("**tags:**") {
                // Extract tags from "tags: rust, error-handling, async"
                let tag_str = line.split(':').nth(1).unwrap_or("");
                tags.extend(
                    tag_str.split(',')
                        .map(|t| t.trim().to_string())
                        .filter(|t| !t.is_empty())
                );
            }
        }

        // Parse metadata (look for language, framework, domain lines)
        let mut language = None;
        let mut framework = None;
        let mut domain = None;

        for line in contents.lines() {
            let lower = line.to_lowercase();
            if lower.starts_with("language:") || lower.starts_with("**language:**") {
                language = line.split(':').nth(1).map(|s| s.trim().to_string());
            } else if lower.starts_with("framework:") || lower.starts_with("**framework:**") {
                framework = line.split(':').nth(1).map(|s| s.trim().to_string());
            } else if lower.starts_with("domain:") || lower.starts_with("**domain:**") {
                domain = line.split(':').nth(1).map(|s| s.trim().to_string());
            }
        }

        // Build pattern
        Pattern::builder()
            .title(title)
            .content(content)
            .tags(tags)
            .language(language.unwrap_or_default())
            .framework(framework.unwrap_or_default())
            .domain(domain.unwrap_or_default())
            .build()
    }
}

/**
 * Builder for constructing Pattern instances with validation
 *
 * DESIGN DECISION: Owned String fields with validation at build time
 * WHY: Builder consumes itself, enabling move semantics and clear ownership
 *
 * REASONING CHAIN:
 * 1. Builder pattern enables optional fields with compile-time validation
 * 2. Required fields (title, content) validated at build() time
 * 3. Optional fields have sensible defaults (empty Vec, None)
 * 4. Consuming methods (self, not &mut self) prevent reuse bugs
 * 5. Validation errors returned as Result for error handling
 *
 * PATTERN: Rust builder pattern
 * RELATED: Pattern::builder()
 */
#[derive(Default)]
pub struct PatternBuilder {
    title: Option<String>,
    content: Option<String>,
    tags: Vec<String>,
    language: Option<String>,
    framework: Option<String>,
    domain: Option<String>,
}

impl PatternBuilder {
    /// Set pattern title (required)
    pub fn title(mut self, title: impl Into<String>) -> Self {
        self.title = Some(title.into());
        self
    }

    /// Set pattern content (required)
    pub fn content(mut self, content: impl Into<String>) -> Self {
        self.content = Some(content.into());
        self
    }

    /// Set pattern tags (optional, defaults to empty)
    pub fn tags(mut self, tags: Vec<impl Into<String>>) -> Self {
        self.tags = tags.into_iter().map(|t| t.into()).collect();
        self
    }

    /// Add a single tag
    pub fn tag(mut self, tag: impl Into<String>) -> Self {
        self.tags.push(tag.into());
        self
    }

    /// Set programming language metadata
    pub fn language(mut self, language: impl Into<String>) -> Self {
        self.language = Some(language.into());
        self
    }

    /// Set framework metadata
    pub fn framework(mut self, framework: impl Into<String>) -> Self {
        self.framework = Some(framework.into());
        self
    }

    /// Set domain metadata
    pub fn domain(mut self, domain: impl Into<String>) -> Self {
        self.domain = Some(domain.into());
        self
    }

    /**
     * Build the Pattern instance with validation
     *
     * DESIGN DECISION: Validate required fields and return Result
     * WHY: Prevent invalid patterns from entering the system
     *
     * REASONING CHAIN:
     * 1. Title and content are required (user-facing validation)
     * 2. Empty strings rejected for title/content (meaningful patterns only)
     * 3. Timestamps auto-generated at build time
     * 4. UUID auto-generated for unique identification
     * 5. Validation failures return descriptive errors
     *
     * PATTERN: Rust builder pattern with validation
     * RELATED: Error::PatternValidation
     */
    pub fn build(self) -> Result<Pattern> {
        let title = self.title
            .ok_or_else(|| Error::PatternValidation("title is required".to_string()))?;

        let content = self.content
            .ok_or_else(|| Error::PatternValidation("content is required".to_string()))?;

        if title.trim().is_empty() {
            return Err(Error::PatternValidation("title cannot be empty".to_string()));
        }

        if content.trim().is_empty() {
            return Err(Error::PatternValidation("content cannot be empty".to_string()));
        }

        let now = Utc::now();
        Ok(Pattern {
            id: Uuid::new_v4(),
            title,
            content,
            tags: self.tags,
            metadata: PatternMetadata {
                language: self.language,
                framework: self.framework,
                domain: self.domain,
            },
            created_at: now,
            modified_at: now,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /**
     * Test: Pattern builder validates required fields
     *
     * DESIGN DECISION: Test builder validation at compile time
     * WHY: Ensure invalid patterns cannot be constructed
     *
     * PATTERN: Test-Driven Development (SOP-003)
     */
    #[test]
    fn test_pattern_builder_validation() {
        // Missing title
        let result = Pattern::builder()
            .content("Content")
            .build();
        assert!(result.is_err());

        // Missing content
        let result = Pattern::builder()
            .title("Title")
            .build();
        assert!(result.is_err());

        // Empty title
        let result = Pattern::builder()
            .title("")
            .content("Content")
            .build();
        assert!(result.is_err());

        // Valid pattern
        let result = Pattern::builder()
            .title("Title")
            .content("Content")
            .build();
        assert!(result.is_ok());
    }

    /**
     * Test: Pattern builder sets fields correctly
     */
    #[test]
    fn test_pattern_builder_fields() {
        let pattern = Pattern::builder()
            .title("Test Pattern")
            .content("Test Content")
            .tags(vec!["rust", "testing"])
            .language("rust")
            .framework("tokio")
            .domain("testing")
            .build()
            .unwrap();

        assert_eq!(pattern.title(), "Test Pattern");
        assert_eq!(pattern.content(), "Test Content");
        assert_eq!(pattern.tags(), &["rust", "testing"]);
        assert_eq!(pattern.metadata().language.as_deref(), Some("rust"));
        assert_eq!(pattern.metadata().framework.as_deref(), Some("tokio"));
        assert_eq!(pattern.metadata().domain.as_deref(), Some("testing"));
    }

    /**
     * Test: Pattern timestamps are set correctly
     */
    #[test]
    fn test_pattern_timestamps() {
        let pattern = Pattern::new(
            "Title".to_string(),
            "Content".to_string(),
            vec![],
        );

        assert!(pattern.created_at() <= &Utc::now());
        assert!(pattern.modified_at() <= &Utc::now());
        assert_eq!(pattern.created_at(), pattern.modified_at());
    }

    /**
     * Test: Pattern is cloneable and comparable
     */
    #[test]
    fn test_pattern_traits() {
        let pattern = Pattern::new(
            "Title".to_string(),
            "Content".to_string(),
            vec!["tag".to_string()],
        );

        let cloned = pattern.clone();
        assert_eq!(pattern, cloned);
    }

    /**
     * Test: Pattern serialization works
     */
    #[test]
    fn test_pattern_serialization() {
        let pattern = Pattern::new(
            "Title".to_string(),
            "Content".to_string(),
            vec!["tag".to_string()],
        );

        let json = serde_json::to_string(&pattern).unwrap();
        let deserialized: Pattern = serde_json::from_str(&json).unwrap();

        assert_eq!(pattern, deserialized);
    }
}
