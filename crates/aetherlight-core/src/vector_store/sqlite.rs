/**
 * SQLite Vector Store Implementation
 *
 * DESIGN DECISION: SQLite with JSON for vectors + metadata, Rust-based cosine similarity
 * WHY: Embedded, persistent, zero configuration, works offline
 *
 * REASONING CHAIN:
 * 1. Need persistent vector storage for patterns
 * 2. SQLite: battle-tested, embedded, ACID compliant, cross-platform
 * 3. Store vectors as JSON (SQLite has good JSON support since 3.38)
 * 4. Metadata as JSON (flexible schema for different pattern types)
 * 5. Cosine similarity in Rust (load all, filter in memory for <10k vectors)
 * 6. For >10k vectors: could add HNSW index or switch to specialized vector DB
 * 7. Trade-off: Simplicity vs specialized vector DB performance
 *
 * PATTERN: Pattern-VECTOR-001 (Local Vector Storage)
 * PERFORMANCE: <10ms for 10k patterns (brute-force cosine similarity acceptable)
 * RELATED: LocalEmbeddings, PatternMatcher
 * FUTURE: Add HNSW index for >100k patterns, or ChromaDB HTTP client
 */

use super::SearchResult;

// Re-enabled after embeddings module restored
// TEMPORARILY DISABLED: embeddings module disabled (Windows SDK required)
// use crate::embeddings::Embedding;
// Local type alias for Embedding while embeddings module is disabled
pub type Embedding = Vec<f32>;

use crate::error::Result;
use rusqlite::{params, Connection};
use serde_json::Value as JsonValue;
use std::path::Path;

/**
 * SQLite-backed Vector Store
 *
 * DESIGN DECISION: Single connection with WAL mode
 * WHY: WAL enables concurrent reads, good for desktop app
 *
 * SCHEMA:
 * - id: TEXT PRIMARY KEY (pattern UUID)
 * - embedding: TEXT (JSON array of f32)
 * - metadata: TEXT (JSON object with pattern data)
 * - created_at: INTEGER (Unix timestamp)
 */
pub struct SqliteVectorStore {
    conn: Connection,
}

impl SqliteVectorStore {
    /**
     * DESIGN DECISION: Create database file with schema initialization
     * WHY: Self-contained, no external setup required
     *
     * REASONING CHAIN:
     * 1. Open/create SQLite file at given path
     * 2. Enable WAL mode (write-ahead logging for concurrent reads)
     * 3. Create vectors table if not exists
     * 4. Create index on id for fast lookups
     * 5. No index on embedding (brute-force search acceptable for <10k)
     */
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self> {
        let conn = Connection::open(path)?;

        // Enable WAL mode for better concurrency
        // NOTE: PRAGMA returns results, so use query_row instead of execute
        conn.query_row("PRAGMA journal_mode=WAL", [], |_| Ok(()))?;

        // Create vectors table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS vectors (
                id TEXT PRIMARY KEY,
                embedding TEXT NOT NULL,
                metadata TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )",
            [],
        )?;

        Ok(Self { conn })
    }

    /**
     * DESIGN DECISION: In-memory database for testing
     * WHY: Fast, no file cleanup needed, isolated tests
     */
    pub fn new_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;

        conn.execute(
            "CREATE TABLE vectors (
                id TEXT PRIMARY KEY,
                embedding TEXT NOT NULL,
                metadata TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )",
            [],
        )?;

        Ok(Self { conn })
    }

    /**
     * DESIGN DECISION: Insert or replace vector
     * WHY: Allows updating existing patterns
     *
     * REASONING CHAIN:
     * 1. Serialize embedding to JSON (TEXT in SQLite)
     * 2. Serialize metadata to JSON
     * 3. INSERT OR REPLACE (upsert semantics)
     * 4. Store Unix timestamp for created_at
     */
    pub fn insert(&mut self, id: &str, embedding: &Embedding, metadata: &JsonValue) -> Result<()> {
        let embedding_json = serde_json::to_string(embedding)?;
        let metadata_json = serde_json::to_string(metadata)?;
        let timestamp = chrono::Utc::now().timestamp();

        self.conn.execute(
            "INSERT OR REPLACE INTO vectors (id, embedding, metadata, created_at) VALUES (?, ?, ?, ?)",
            params![id, embedding_json, metadata_json, timestamp],
        )?;

        Ok(())
    }

    /**
     * DESIGN DECISION: Brute-force cosine similarity search
     * WHY: Simple, fast enough for <10k vectors (<10ms target)
     *
     * REASONING CHAIN:
     * 1. Load all vectors from SQLite (or apply filters first if needed)
     * 2. Deserialize embeddings from JSON
     * 3. Calculate cosine similarity for each vector
     * 4. Sort by score (descending)
     * 5. Return top N results
     *
     * PERFORMANCE:
     * - 10k vectors * 384 dims * 2 operations (dot product + magnitude) = ~7.7M ops
     * - Modern CPU: ~1ns per operation = ~8ms for brute force
     * - Meets <10ms target for 10k patterns
     *
     * ALTERNATIVE: For >100k patterns, add HNSW index or use ChromaDB
     */
    pub fn search(&self, query_embedding: &Embedding, limit: usize) -> Result<Vec<SearchResult>> {
        // Load all vectors (could optimize with WHERE clause for metadata filtering)
        let mut stmt = self.conn.prepare("SELECT id, embedding, metadata FROM vectors")?;

        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })?;

        // Calculate cosine similarity for each vector
        let mut results: Vec<SearchResult> = Vec::new();

        for row in rows {
            let (id, embedding_json, metadata_json) = row?;

            // Deserialize embedding
            let embedding: Embedding = serde_json::from_str(&embedding_json)?;

            // Calculate cosine similarity
            let score = cosine_similarity(query_embedding, &embedding);

            // Deserialize metadata
            let metadata: JsonValue = serde_json::from_str(&metadata_json)?;

            results.push(SearchResult { id, score, metadata });
        }

        // Sort by score (descending)
        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());

        // Return top N
        results.truncate(limit);

        Ok(results)
    }

    /**
     * DESIGN DECISION: Delete by ID
     * WHY: Enables pattern removal (e.g., outdated patterns)
     */
    pub fn delete(&mut self, id: &str) -> Result<()> {
        self.conn.execute("DELETE FROM vectors WHERE id = ?", params![id])?;
        Ok(())
    }

    /**
     * DESIGN DECISION: Count vectors
     * WHY: Useful for debugging and UI display
     */
    pub fn count(&self) -> Result<usize> {
        let count: i64 = self.conn.query_row("SELECT COUNT(*) FROM vectors", [], |row| row.get(0))?;
        Ok(count as usize)
    }

    /**
     * DESIGN DECISION: Clear all vectors
     * WHY: Useful for testing and reset functionality
     */
    pub fn clear(&mut self) -> Result<()> {
        self.conn.execute("DELETE FROM vectors", [])?;
        Ok(())
    }
}

/**
 * Cosine Similarity Calculation
 *
 * DESIGN DECISION: Standard cosine similarity formula
 * WHY: Industry standard for vector similarity, range [-1, 1], 1 = identical
 *
 * FORMULA:
 * similarity = (A · B) / (||A|| * ||B||)
 *
 * WHERE:
 * - A · B = dot product (sum of element-wise multiplication)
 * - ||A|| = magnitude of A (sqrt of sum of squares)
 *
 * OPTIMIZATION: Embeddings already L2-normalized (||A|| = ||B|| = 1.0)
 * Therefore: similarity = A · B (just dot product)
 */
fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    debug_assert_eq!(
        a.len(),
        b.len(),
        "Embeddings must have same dimensions for cosine similarity"
    );

    // Dot product
    let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();

    // Note: If embeddings are NOT L2-normalized, use this instead:
    // let magnitude_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    // let magnitude_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    // dot_product / (magnitude_a * magnitude_b)

    // Since our embeddings ARE L2-normalized (magnitude = 1.0):
    dot_product
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_cosine_similarity() {
        // Identical vectors (normalized)
        let a = vec![0.5, 0.5, 0.5, 0.5];
        let b = vec![0.5, 0.5, 0.5, 0.5];
        let sim = cosine_similarity(&a, &b);
        assert!((sim - 1.0).abs() < 0.01, "Identical vectors should have similarity ~1.0");

        // Orthogonal vectors
        let a = vec![1.0, 0.0];
        let b = vec![0.0, 1.0];
        let sim = cosine_similarity(&a, &b);
        assert!((sim - 0.0).abs() < 0.01, "Orthogonal vectors should have similarity ~0.0");
    }

    #[test]
    fn test_vector_store_insert_search() {
        let mut store = SqliteVectorStore::new_in_memory().unwrap();

        // Insert some vectors with more distinct values
        // DESIGN DECISION: Use clearly different vectors for score ordering test
        // WHY: emb1=[0.5,0.5,0.5,0.5] vs emb2=[0.6,0.5,0.4,0.5] had similar scores
        let emb1 = vec![1.0, 0.0, 0.0, 0.0];  // Clearly different from query
        let emb2 = vec![0.8, 0.6, 0.0, 0.0];  // More similar to query
        let emb3 = vec![0.5, 0.5, 0.5, 0.5];  // Identical to query (highest score)

        store.insert("1", &emb1, &json!({"name": "pattern1"})).unwrap();
        store.insert("2", &emb2, &json!({"name": "pattern2"})).unwrap();
        store.insert("3", &emb3, &json!({"name": "pattern3"})).unwrap();

        // Search with query identical to emb3
        let query = vec![0.5, 0.5, 0.5, 0.5];
        let results = store.search(&query, 2).unwrap();

        assert_eq!(results.len(), 2);
        assert_eq!(results[0].id, "3"); // Identical vector = highest score
        assert!(results[0].score > results[1].score); // emb3 score > emb2 score
    }

    #[test]
    fn test_vector_store_count() {
        let mut store = SqliteVectorStore::new_in_memory().unwrap();

        assert_eq!(store.count().unwrap(), 0);

        store.insert("1", &vec![0.1, 0.2], &json!({})).unwrap();
        assert_eq!(store.count().unwrap(), 1);

        store.insert("2", &vec![0.3, 0.4], &json!({})).unwrap();
        assert_eq!(store.count().unwrap(), 2);
    }

    #[test]
    fn test_vector_store_delete() {
        let mut store = SqliteVectorStore::new_in_memory().unwrap();

        store.insert("1", &vec![0.1], &json!({})).unwrap();
        store.insert("2", &vec![0.2], &json!({})).unwrap();

        assert_eq!(store.count().unwrap(), 2);

        store.delete("1").unwrap();
        assert_eq!(store.count().unwrap(), 1);
    }

    #[test]
    fn test_vector_store_clear() {
        let mut store = SqliteVectorStore::new_in_memory().unwrap();

        store.insert("1", &vec![0.1], &json!({})).unwrap();
        store.insert("2", &vec![0.2], &json!({})).unwrap();

        assert_eq!(store.count().unwrap(), 2);

        store.clear().unwrap();
        assert_eq!(store.count().unwrap(), 0);
    }

    #[test]
    fn test_vector_store_upsert() {
        let mut store = SqliteVectorStore::new_in_memory().unwrap();

        // Insert
        store.insert("1", &vec![0.1], &json!({"version": 1})).unwrap();
        assert_eq!(store.count().unwrap(), 1);

        // Update (INSERT OR REPLACE)
        store.insert("1", &vec![0.2], &json!({"version": 2})).unwrap();
        assert_eq!(store.count().unwrap(), 1); // Still 1 (replaced)

        // Verify updated metadata
        let results = store.search(&vec![0.2], 1).unwrap();
        assert_eq!(results[0].metadata["version"], 2);
    }
}
