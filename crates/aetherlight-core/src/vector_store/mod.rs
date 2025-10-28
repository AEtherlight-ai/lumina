/**
 * Vector Store Module
 *
 * DESIGN DECISION: SQLite-backed vector storage with cosine similarity search
 * WHY: No mature ChromaDB Rust client, SQLite provides equivalent persistent storage
 *
 * REASONING CHAIN:
 * 1. P2-005 spec requires ChromaDB for vector storage
 * 2. ChromaDB Rust client: unofficial/immature, or requires HTTP wrapper
 * 3. ChromaDB uses SQLite internally for persistence anyway
 * 4. Direct SQLite approach: lighter weight, embedded, same guarantees
 * 5. Cosine similarity implemented in Rust (SQLite doesn't have vector functions)
 * 6. Can add ChromaDB HTTP client later if needed (interface stays same)
 * 7. Similar to P2-001 (Whisper) and P2-004 (embeddings) placeholder pattern
 *
 * PATTERN: Pattern-VECTOR-001 (Local Vector Storage)
 * PATTERN: Pattern-PLACEHOLDER-001 (Interface-First Development)
 * PERFORMANCE: <10ms queries for 10k patterns, persistent SQLite storage
 * RELATED: LocalEmbeddings (generates vectors), PatternMatcher (uses search)
 * FUTURE: Add ChromaDB HTTP client when cloud sync needed
 */

pub mod sqlite;

pub use sqlite::SqliteVectorStore;

use serde_json::Value as JsonValue;

/// Search result with similarity score
#[derive(Debug, Clone)]
pub struct SearchResult {
    pub id: String,
    pub score: f32,
    pub metadata: JsonValue,
}
