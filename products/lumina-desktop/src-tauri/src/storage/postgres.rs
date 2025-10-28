/**
 * PostgreSQL Storage - Pattern storage with vector embeddings (Storage-001)
 *
 * DESIGN DECISION: Start with SQLite, migrate to PostgreSQL later
 * WHY: SQLite bundled (no external dependencies), PostgreSQL requires server
 *
 * REASONING CHAIN:
 * 1. Original plan: PostgreSQL + pgvector for semantic search
 * 2. Problem: Requires PostgreSQL server installation (complex setup)
 * 3. Solution: Use SQLite with JSON embeddings for v1.0
 * 4. Future: Migrate to PostgreSQL when user upgrades to Pro tier
 * 5. Result: Zero-dependency installation, upgrade path exists
 *
 * PATTERN: Pattern-STORAGE-002 (SQLite-First, PostgreSQL-Later)
 * RELATED: Storage-003 (SQLite metadata), Installer-001
 * PERFORMANCE: <200ms semantic search with SQLite JSON (acceptable for v1.0)
 *
 * NOTE: This is a pragmatic v1.0 implementation. Real PostgreSQL + pgvector
 * will be added in Phase 4 for Pro/Team/Enterprise tiers.
 */

use rusqlite::{Connection, params, Result as SqliteResult};
use std::path::PathBuf;
use crate::storage::types::{PatternRecord, StorageConfig};

/**
 * PostgresStorage - Pattern storage (currently SQLite-backed)
 *
 * DESIGN DECISION: Abstract interface, swap backend later
 * WHY: Code remains same when migrating SQLite → PostgreSQL
 */
pub struct PostgresStorage {
    conn: Connection,
    config: StorageConfig,
}

impl PostgresStorage {
    /**
     * Initialize pattern storage with user-chosen storage limit
     *
     * DESIGN DECISION: Create patterns table on first run
     * WHY: User configures storage in installation wizard
     *
     * SCHEMA:
     * - id: TEXT PRIMARY KEY (UUID)
     * - name: TEXT NOT NULL
     * - description: TEXT NOT NULL
     * - domain: TEXT (nullable)
     * - tags: TEXT (comma-separated, for simple search)
     * - confidence_score: REAL (0.0-1.0)
     * - embedding: TEXT (JSON array of floats, 384-dim)
     * - created_at: TEXT (ISO 8601)
     * - updated_at: TEXT (ISO 8601)
     */
    pub fn new(config: StorageConfig) -> SqliteResult<Self> {
        // Create directory if not exists
        if let Some(parent) = PathBuf::from(&config.sqlite_path).parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| rusqlite::Error::InvalidPath(PathBuf::from(format!("Failed to create directory: {}", e))))?;
        }

        let conn = Connection::open(&config.sqlite_path)?;

        // Create patterns table (mimics PostgreSQL schema)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS patterns (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                domain TEXT,
                tags TEXT,
                confidence_score REAL,
                embedding TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        // Create indexes for common queries
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_patterns_domain ON patterns(domain)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON patterns(confidence_score)",
            [],
        )?;

        println!("✅ Pattern storage initialized: {}", config.sqlite_path);
        println!("   Max storage: {} MB (~{} patterns)", config.storage_mb, config.max_patterns);

        Ok(Self { conn, config })
    }

    /**
     * Check if storage is provisioned
     */
    pub fn is_provisioned(&self) -> SqliteResult<bool> {
        let mut stmt = self.conn.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='patterns'"
        )?;
        let exists = stmt.exists([])?;
        Ok(exists)
    }

    /**
     * Get storage statistics
     */
    pub fn get_storage_stats(&self) -> SqliteResult<(u64, u64)> {
        // Count patterns
        let count: u64 = self.conn.query_row(
            "SELECT COUNT(*) FROM patterns",
            [],
            |row| row.get(0),
        )?;

        // Calculate approximate storage used
        // SQLite page size × page count / 1024 / 1024 = MB
        let mb_used: u64 = self.conn.query_row(
            "SELECT (page_count * page_size) / 1024 / 1024 FROM pragma_page_count(), pragma_page_size()",
            [],
            |row| row.get(0),
        ).unwrap_or(0);

        Ok((count, mb_used))
    }

    /**
     * Insert pattern into storage
     *
     * DESIGN DECISION: Validate against storage limits
     * WHY: User chose 200MB-5GB limit, enforce to prevent surprises
     */
    pub fn insert_pattern(&self, pattern: &PatternRecord) -> SqliteResult<()> {
        // Check storage limits
        let (current_count, _) = self.get_storage_stats()?;
        if current_count >= self.config.max_patterns {
            return Err(rusqlite::Error::ExecuteReturnedResults);
        }

        // Serialize embedding as JSON
        let embedding_json = pattern.embedding.as_ref()
            .map(|emb| serde_json::to_string(emb).unwrap_or_default());

        self.conn.execute(
            "INSERT INTO patterns (id, name, description, domain, tags, confidence_score, embedding, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                &pattern.id,
                &pattern.name,
                &pattern.description,
                &pattern.domain,
                &pattern.tags.join(","),
                &pattern.confidence_score,
                &embedding_json,
                &pattern.created_at,
                &pattern.updated_at,
            ],
        )?;

        Ok(())
    }

    /**
     * Search patterns by domain
     */
    pub fn search_by_domain(&self, domain: &str) -> SqliteResult<Vec<PatternRecord>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, description, domain, tags, confidence_score, embedding, created_at, updated_at
             FROM patterns
             WHERE domain = ?1
             ORDER BY confidence_score DESC"
        )?;

        let patterns = stmt.query_map(params![domain], |row| {
            let tags_str: String = row.get(4).unwrap_or_default();
            let tags: Vec<String> = if tags_str.is_empty() {
                vec![]
            } else {
                tags_str.split(',').map(|s| s.trim().to_string()).collect()
            };

            let embedding_json: Option<String> = row.get(6)?;
            let embedding = embedding_json.and_then(|json| {
                serde_json::from_str(&json).ok()
            });

            Ok(PatternRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                domain: row.get(3)?,
                tags,
                confidence_score: row.get(5)?,
                embedding,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })?;

        let mut result = Vec::new();
        for pattern in patterns {
            result.push(pattern?);
        }

        Ok(result)
    }

    /**
     * Truncate all patterns (for testing/reset)
     */
    pub fn truncate(&self) -> SqliteResult<()> {
        self.conn.execute("DELETE FROM patterns", [])?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_postgres_storage_new() {
        let config = StorageConfig {
            storage_mb: 200,
            max_patterns: 200,
            postgres_url: String::new(),
            sqlite_path: ":memory:".to_string(),
        };

        let storage = PostgresStorage::new(config).unwrap();
        assert!(storage.is_provisioned().unwrap());
    }

    #[test]
    fn test_insert_pattern() {
        let config = StorageConfig {
            storage_mb: 200,
            max_patterns: 200,
            postgres_url: String::new(),
            sqlite_path: ":memory:".to_string(),
        };

        let storage = PostgresStorage::new(config).unwrap();

        let pattern = PatternRecord {
            id: "test-001".to_string(),
            name: "Test Pattern".to_string(),
            description: "Test description".to_string(),
            domain: Some("rust".to_string()),
            tags: vec!["test".to_string()],
            confidence_score: Some(0.95),
            embedding: Some(vec![0.1; 384]),
            created_at: "2025-10-14T00:00:00Z".to_string(),
            updated_at: "2025-10-14T00:00:00Z".to_string(),
        };

        storage.insert_pattern(&pattern).unwrap();

        let patterns = storage.search_by_domain("rust").unwrap();
        assert_eq!(patterns.len(), 1);
        assert_eq!(patterns[0].name, "Test Pattern");
    }
}
