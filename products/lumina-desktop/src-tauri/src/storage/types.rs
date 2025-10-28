/**
 * Storage Types - Shared types for PostgreSQL and SQLite storage
 *
 * DESIGN DECISION: Common types for pattern storage and metadata
 * WHY: Type safety across storage backends, consistent API
 */

use serde::{Deserialize, Serialize};

/**
 * PatternRecord - Pattern stored in PostgreSQL
 *
 * DESIGN DECISION: Store embeddings as Vec<f32> (pgvector compatible)
 * WHY: pgvector expects float arrays, 384-dim for all-MiniLM-L6-v2
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternRecord {
    pub id: String,
    pub name: String,
    pub description: String,
    pub domain: Option<String>,
    pub tags: Vec<String>,
    pub confidence_score: Option<f64>,
    pub embedding: Option<Vec<f32>>, // 384-dim for all-MiniLM-L6-v2
    pub created_at: String,
    pub updated_at: String,
}

/**
 * StorageConfig - Configuration for storage provisioning
 *
 * DESIGN DECISION: User-chosen storage limit enforced at database level
 * WHY: Prevent accidental over-provisioning, clear user expectations
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageConfig {
    pub storage_mb: u64,
    pub max_patterns: u64, // Calculated from storage_mb / 5
    pub postgres_url: String,
    pub sqlite_path: String,
}

/**
 * SyncState - Track pattern sync progress (SQLite)
 *
 * DESIGN DECISION: SQLite for sync state (local-first, survives reinstalls)
 * WHY: Pattern sync can take minutes, user needs resume capability
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncState {
    pub last_sync_timestamp: String,
    pub patterns_synced: u64,
    pub domains_synced: Vec<String>,
    pub sync_status: String, // "idle", "syncing", "complete", "error"
    pub error_message: Option<String>,
}

/**
 * OutcomeRecord - Track pattern usage outcomes (SQLite)
 *
 * DESIGN DECISION: Track success/failure for confidence calibration
 * WHY: Patterns with low success rate get lower confidence scores
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutcomeRecord {
    pub id: String,
    pub pattern_id: String,
    pub timestamp: String,
    pub outcome: String, // "success", "partial", "failure"
    pub user_feedback: Option<String>,
    pub time_saved_minutes: Option<i64>,
}

/**
 * CalibrationRecord - Confidence score adjustments (SQLite)
 *
 * DESIGN DECISION: Per-pattern confidence adjustments based on outcomes
 * WHY: Initial confidence may be inaccurate, calibrate based on actual use
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalibrationRecord {
    pub pattern_id: String,
    pub initial_confidence: f64,
    pub adjusted_confidence: f64,
    pub success_count: u64,
    pub failure_count: u64,
    pub last_updated: String,
}
