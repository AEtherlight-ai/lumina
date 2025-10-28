/**
 * Code Intelligence Module
 *
 * DESIGN DECISION: Separate module for semantic code analysis
 * WHY: Phase 3 adds intelligence layer - search, chunking, indexing
 *
 * REASONING CHAIN:
 * 1. Phase 1-2: Pattern matching on voice input
 * 2. Phase 3: Semantic code search across entire codebase
 * 3. Need AST parsing to chunk code at function/class level
 * 4. Module structure: chunking → indexing → search
 *
 * PATTERN: Pattern-RUST-011 (Code Intelligence Module Structure)
 * RELATED: P3-001 (Code Chunking), P3-002 (Indexing), P3-003 (Search)
 * FUTURE: Support 50+ languages via tree-sitter
 */

pub mod chunking;
pub mod indexer;
pub mod search;

pub use chunking::{CodeChunk, CodeChunker, Language, DocumentChunk, DocumentChunker, DocumentType};
pub use indexer::{CodebaseIndexer, IndexingResult, SearchResult, ProgressCallback};
pub use search::{SemanticSearch, SearchQuery, CodeSearchResult};
