/**
 * Storage Module - PostgreSQL + SQLite pattern storage (Storage-001, Storage-003)
 *
 * DESIGN DECISION: Hybrid storage - PostgreSQL for vectors, SQLite for metadata
 * WHY: PostgreSQL + pgvector optimized for semantic search, SQLite for local sync state
 *
 * REASONING CHAIN:
 * 1. Patterns need vector embeddings for semantic search
 * 2. pgvector extension provides HNSW indexes (<100ms for 10k patterns)
 * 3. PostgreSQL handles pattern storage (name, description, embeddings)
 * 4. SQLite handles metadata (outcomes, calibration, sync_state)
 * 5. Result: Fast semantic search + local-first metadata
 *
 * PATTERN: Pattern-STORAGE-001 (Hybrid Storage Architecture)
 * RELATED: Installer-001 (wizard calls this), Storage-002 (Code.NET sync)
 * PERFORMANCE: <100ms semantic search, <50ms metadata queries
 */

pub mod postgres;
pub mod sqlite;
pub mod types;

pub use postgres::PostgresStorage;
pub use sqlite::SqliteMetadata;
pub use types::*;
