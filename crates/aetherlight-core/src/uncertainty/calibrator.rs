/**
 * Confidence Calibrator - Improve Accuracy Over Time (AI-008)
 *
 * DESIGN DECISION: Track claimed confidence vs actual correctness, adjust scoring
 * WHY: Agents often overconfident or underconfident, need calibration
 *
 * REASONING CHAIN:
 * 1. Agent claims confidence X for response Y
 * 2. User/system validates correctness (true/false)
 * 3. Store: claimed confidence, actual correctness, factors
 * 4. Analyze: Brier score, calibration error, bin accuracy
 * 5. Adjust: Recalibrate scoring algorithm over time
 * 6. Result: Claimed 90% confidence → Actually 90% correct
 *
 * ## Calibration Workflow
 *
 * ```rust
 * use aetherlight_core::uncertainty::{Calibrator, CalibrationRecord};
 *
 * let calibrator = Calibrator::new("data/calibration.sqlite")?;
 *
 * // Agent makes claim
 * let response = agent.generate_response(prompt);
 *
 * // ... later, validate correctness ...
 * let correct = verify_response(&response);
 *
 * // Record for calibration
 * calibrator.record_calibration(
 *     response.confidence,
 *     correct,
 *     response.content,
 *     task_description,
 *     agent_name,
 *     domain,
 *     factors,
 * )?;
 *
 * // Get calibration statistics
 * let stats = calibrator.get_statistics()?;
 * println!("Brier score: {:.3}", stats.brier_score); // Lower is better
 * println!("Calibration error: {:.3}", stats.calibration_error);
 * ```
 *
 * ## Brier Score
 *
 * Measures calibration quality: (claimed_confidence - actual)²
 * - 0.0 = Perfect calibration
 * - 0.25 = Poor calibration (random guessing)
 * - 1.0 = Worst possible calibration
 *
 * ## Calibration Error
 *
 * Difference between claimed confidence and actual accuracy:
 * - 0.0 = Perfect calibration
 * - +0.2 = Overconfident (claimed 90%, actually 70%)
 * - -0.2 = Underconfident (claimed 70%, actually 90%)
 *
 * PATTERN: Pattern-UNCERTAINTY-002 (Confidence Calibration System)
 * PERFORMANCE: <50ms for record, <100ms for statistics
 * RELATED: ConfidenceScorer (uses calibration data to adjust scores)
 */

use crate::{Error, Result};
use super::types::{CalibrationRecord, CalibrationStatistics, ConfidenceBin};
use rusqlite::{params, Connection, OptionalExtension};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

/**
 * Confidence calibrator with SQLite persistence
 *
 * DESIGN DECISION: SQLite for persistence, not in-memory
 * WHY: Calibration data must persist across sessions for long-term learning
 *
 * REASONING CHAIN:
 * 1. Calibration requires 100s-1000s of records to be accurate
 * 2. In-memory data lost when process exits
 * 3. SQLite provides: Persistence, ACID transactions, SQL queries
 * 4. Lightweight (no server), embeddable, zero configuration
 * 5. Indexes for fast queries by agent, domain, timestamp
 */
pub struct Calibrator {
    conn: Arc<Mutex<Connection>>,
    db_path: PathBuf,
}

impl Calibrator {
    /**
     * DESIGN DECISION: Create or open calibration database
     * WHY: Auto-initialization, no manual setup required
     */
    pub fn new<P: AsRef<Path>>(db_path: P) -> Result<Self> {
        let db_path = db_path.as_ref().to_path_buf();

        // Create parent directory if needed
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| {
                Error::Io(format!("Failed to create calibration directory: {}", e))
            })?;
        }

        // Open or create database
        let conn = Connection::open(&db_path).map_err(|e| {
            Error::Io(format!("Failed to open calibration database: {}", e))
        })?;

        let calibrator = Self {
            conn: Arc::new(Mutex::new(conn)),
            db_path,
        };

        // Initialize schema
        calibrator.initialize_schema()?;

        Ok(calibrator)
    }

    /**
     * DESIGN DECISION: Simple schema with factors as JSON
     * WHY: Balance between queryability and flexibility
     *
     * SCHEMA:
     * - calibration_records: Main table (id, claimed, actual, content, agent, timestamp, factors_json)
     * - Indexes on agent, domain, timestamp for fast filtering
     *
     * REASONING CHAIN:
     * 1. Core fields (claimed, actual) as columns for SQL queries
     * 2. Factors as JSON for flexibility (different agents use different factors)
     * 3. Indexes enable fast filtering by agent, domain, time range
     * 4. Can calculate Brier score, calibration error via SQL aggregations
     */
    fn initialize_schema(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        // Main calibration records table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS calibration_records (
                id TEXT PRIMARY KEY,
                claimed_confidence REAL NOT NULL,
                actual_correct INTEGER NOT NULL,
                response_content TEXT NOT NULL,
                task_description TEXT NOT NULL,
                agent_name TEXT NOT NULL,
                domain TEXT,
                timestamp INTEGER NOT NULL,
                factors_json TEXT NOT NULL
            )",
            [],
        )
        .map_err(|e| Error::Io(format!("Failed to create calibration table: {}", e)))?;

        // Indexes for fast queries
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_calibration_agent ON calibration_records(agent_name)",
            [],
        )
        .map_err(|e| Error::Io(format!("Failed to create agent index: {}", e)))?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_calibration_domain ON calibration_records(domain)",
            [],
        )
        .map_err(|e| Error::Io(format!("Failed to create domain index: {}", e)))?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_calibration_timestamp ON calibration_records(timestamp)",
            [],
        )
        .map_err(|e| Error::Io(format!("Failed to create timestamp index: {}", e)))?;

        Ok(())
    }

    /**
     * Record calibration data
     *
     * DESIGN DECISION: Single insert, no batch API yet
     * WHY: Calibration records created infrequently (per task completion)
     *
     * PERFORMANCE: <50ms per insert
     */
    pub fn record_calibration(
        &self,
        claimed_confidence: f64,
        actual_correct: bool,
        response_content: String,
        task_description: String,
        agent_name: String,
        domain: Option<String>,
        factors: HashMap<String, f64>,
    ) -> Result<String> {
        let record = CalibrationRecord::new(
            claimed_confidence,
            actual_correct,
            response_content,
            task_description,
            agent_name,
            domain,
            factors,
        );

        let conn = self.conn.lock().unwrap();

        // Serialize factors to JSON
        let factors_json = serde_json::to_string(&record.factors).map_err(|e| {
            Error::Io(format!("Failed to serialize factors: {}", e))
        })?;

        // Insert record
        conn.execute(
            "INSERT INTO calibration_records
             (id, claimed_confidence, actual_correct, response_content, task_description,
              agent_name, domain, timestamp, factors_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                record.id,
                record.claimed_confidence,
                if record.actual_correct { 1 } else { 0 },
                record.response_content,
                record.task_description,
                record.agent_name,
                record.domain,
                record.timestamp.timestamp(),
                factors_json,
            ],
        )
        .map_err(|e| Error::Io(format!("Failed to insert calibration record: {}", e)))?;

        Ok(record.id)
    }

    /**
     * Get calibration record by ID
     */
    pub fn get_record(&self, id: &str) -> Result<Option<CalibrationRecord>> {
        let conn = self.conn.lock().unwrap();

        let result: Option<(String, f64, i64, String, String, String, Option<String>, i64, String)> = conn
            .query_row(
                "SELECT id, claimed_confidence, actual_correct, response_content, task_description,
                        agent_name, domain, timestamp, factors_json
                 FROM calibration_records WHERE id = ?1",
                params![id],
                |row| {
                    Ok((
                        row.get(0)?,
                        row.get(1)?,
                        row.get(2)?,
                        row.get(3)?,
                        row.get(4)?,
                        row.get(5)?,
                        row.get(6)?,
                        row.get(7)?,
                        row.get(8)?,
                    ))
                },
            )
            .optional()
            .map_err(|e| Error::Io(format!("Failed to query calibration record: {}", e)))?;

        if let Some((id, claimed, actual, content, task, agent, domain, timestamp, factors_json)) = result {
            let factors: HashMap<String, f64> = serde_json::from_str(&factors_json).map_err(|e| {
                Error::Io(format!("Failed to deserialize factors: {}", e))
            })?;

            Ok(Some(CalibrationRecord {
                id,
                claimed_confidence: claimed,
                actual_correct: actual == 1,
                response_content: content,
                task_description: task,
                agent_name: agent,
                domain,
                timestamp: chrono::DateTime::from_timestamp(timestamp, 0)
                    .unwrap_or_default()
                    .into(),
                factors,
            }))
        } else {
            Ok(None)
        }
    }

    /**
     * Calculate calibration statistics
     *
     * DESIGN DECISION: Calculate Brier score, calibration error, bin accuracy
     * WHY: Quantify calibration quality, identify overconfidence/underconfidence
     *
     * REASONING CHAIN:
     * 1. Query all records (optionally filter by agent/domain)
     * 2. Calculate Brier score: average (claimed - actual)²
     * 3. Calculate calibration error: claimed_mean - actual_accuracy
     * 4. Group into bins (0.0-0.1, 0.1-0.2, ..., 0.9-1.0)
     * 5. For each bin: Calculate actual accuracy vs expected
     * 6. Return comprehensive statistics
     *
     * PERFORMANCE: <100ms for 10K records
     */
    pub fn get_statistics(
        &self,
        agent_filter: Option<&str>,
        domain_filter: Option<&str>,
    ) -> Result<CalibrationStatistics> {
        let conn = self.conn.lock().unwrap();

        // Build query
        let mut query = String::from(
            "SELECT claimed_confidence, actual_correct FROM calibration_records WHERE 1=1"
        );
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(agent) = agent_filter {
            query.push_str(" AND agent_name = ?");
            params.push(Box::new(agent.to_string()));
        }

        if let Some(domain) = domain_filter {
            query.push_str(" AND domain = ?");
            params.push(Box::new(domain.to_string()));
        }

        // Execute query
        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

        let mut stmt = conn
            .prepare(&query)
            .map_err(|e| Error::Io(format!("Failed to prepare query: {}", e)))?;

        let records: Vec<(f64, bool)> = stmt
            .query_map(param_refs.as_slice(), |row| {
                Ok((row.get::<_, f64>(0)?, row.get::<_, i64>(1)? == 1))
            })
            .map_err(|e| Error::Io(format!("Failed to execute query: {}", e)))?
            .filter_map(|r| r.ok())
            .collect();

        if records.is_empty() {
            return Ok(CalibrationStatistics {
                total_records: 0,
                correct_predictions: 0,
                accuracy: 0.0,
                brier_score: 0.0,
                mean_claimed_confidence: 0.0,
                calibration_error: 0.0,
                confidence_bins: HashMap::new(),
            });
        }

        // Calculate basic statistics
        let total_records = records.len();
        let correct_predictions = records.iter().filter(|(_, correct)| *correct).count();
        let accuracy = correct_predictions as f64 / total_records as f64;

        // Calculate Brier score
        let brier_score: f64 = records
            .iter()
            .map(|(claimed, actual)| {
                let actual_value = if *actual { 1.0 } else { 0.0 };
                (claimed - actual_value).powi(2)
            })
            .sum::<f64>()
            / total_records as f64;

        // Calculate mean claimed confidence
        let mean_claimed_confidence: f64 =
            records.iter().map(|(claimed, _)| claimed).sum::<f64>() / total_records as f64;

        // Calculate calibration error
        let calibration_error = mean_claimed_confidence - accuracy;

        // Group into bins
        let mut bins: HashMap<String, Vec<(f64, bool)>> = HashMap::new();
        for (claimed, actual) in records.iter() {
            let bin_index = (claimed * 10.0).floor() as i32;
            let bin_key = format!("{:.1}-{:.1}", bin_index as f64 / 10.0, (bin_index + 1) as f64 / 10.0);
            bins.entry(bin_key).or_insert_with(Vec::new).push((*claimed, *actual));
        }

        // Calculate bin statistics
        let mut confidence_bins = HashMap::new();
        for (bin_key, bin_records) in bins {
            let count = bin_records.len();
            let correct = bin_records.iter().filter(|(_, actual)| *actual).count();
            let bin_accuracy = correct as f64 / count as f64;

            // Expected accuracy is midpoint of bin range
            let bin_parts: Vec<&str> = bin_key.split('-').collect();
            let bin_start: f64 = bin_parts[0].parse().unwrap_or(0.0);
            let bin_end: f64 = bin_parts[1].parse().unwrap_or(1.0);
            let expected_accuracy = (bin_start + bin_end) / 2.0;

            let error = bin_accuracy - expected_accuracy;

            confidence_bins.insert(
                bin_key,
                ConfidenceBin {
                    count,
                    correct,
                    accuracy: bin_accuracy,
                    expected_accuracy,
                    error,
                },
            );
        }

        Ok(CalibrationStatistics {
            total_records,
            correct_predictions,
            accuracy,
            brier_score,
            mean_claimed_confidence,
            calibration_error,
            confidence_bins,
        })
    }

    /**
     * Get calibration adjustment factor
     *
     * DESIGN DECISION: Simple linear adjustment based on calibration error
     * WHY: Start simple, can evolve to more sophisticated models
     *
     * REASONING CHAIN:
     * 1. Calculate calibration error (claimed - actual)
     * 2. If positive (overconfident): Reduce future scores
     * 3. If negative (underconfident): Increase future scores
     * 4. Return adjustment factor (multiply claimed confidence by this)
     *
     * EXAMPLE:
     * - Calibration error +0.2 (claiming 90%, actually 70%)
     * - Adjustment factor: 0.8 (reduce scores by 20%)
     * - New claimed 90% becomes 72% (closer to actual)
     */
    pub fn get_adjustment_factor(
        &self,
        agent_filter: Option<&str>,
        domain_filter: Option<&str>,
    ) -> Result<f64> {
        let stats = self.get_statistics(agent_filter, domain_filter)?;

        if stats.total_records < 10 {
            // Need at least 10 records for reliable adjustment
            return Ok(1.0); // No adjustment
        }

        // Simple linear adjustment
        // If overconfident (+0.2 error), reduce by 20% (factor 0.8)
        // If underconfident (-0.2 error), increase by 25% (factor 1.25)
        let adjustment = 1.0 - stats.calibration_error;

        // Clamp to reasonable range (0.5 to 1.5)
        Ok(adjustment.max(0.5).min(1.5))
    }

    /**
     * Clear all calibration data (for testing)
     */
    #[cfg(test)]
    pub fn clear(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute("DELETE FROM calibration_records", [])
            .map_err(|e| Error::Io(format!("Failed to clear calibration data: {}", e)))?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_create_calibrator() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("calibration.sqlite");

        let calibrator = Calibrator::new(&db_path);
        assert!(calibrator.is_ok());
        assert!(db_path.exists());
    }

    #[test]
    fn test_record_and_retrieve() {
        let dir = tempdir().unwrap();
        let calibrator = Calibrator::new(dir.path().join("calibration.sqlite")).unwrap();

        let mut factors = HashMap::new();
        factors.insert("specificity".to_string(), 0.2);

        let id = calibrator
            .record_calibration(
                0.85,
                true,
                "Fix line 42".to_string(),
                "Fix bug".to_string(),
                "TestAgent".to_string(),
                Some("rust".to_string()),
                factors,
            )
            .unwrap();

        let record = calibrator.get_record(&id).unwrap();
        assert!(record.is_some());

        let record = record.unwrap();
        assert_eq!(record.claimed_confidence, 0.85);
        assert!(record.actual_correct);
        assert_eq!(record.agent_name, "TestAgent");
    }

    #[test]
    fn test_calibration_statistics_well_calibrated() {
        let dir = tempdir().unwrap();
        let calibrator = Calibrator::new(dir.path().join("calibration.sqlite")).unwrap();

        let factors = HashMap::new();

        // Record 10 claims at 90% confidence, 9 correct (well calibrated)
        for i in 0..10 {
            calibrator
                .record_calibration(
                    0.90,
                    i < 9, // 9 correct, 1 incorrect
                    format!("Response {}", i),
                    "Test task".to_string(),
                    "TestAgent".to_string(),
                    None,
                    factors.clone(),
                )
                .unwrap();
        }

        let stats = calibrator.get_statistics(None, None).unwrap();

        assert_eq!(stats.total_records, 10);
        assert_eq!(stats.correct_predictions, 9);
        assert_eq!(stats.accuracy, 0.9);
        assert!(stats.brier_score < 0.1); // Low Brier score = good calibration
        assert!(stats.calibration_error.abs() < 0.05); // Small error = well calibrated
    }

    #[test]
    fn test_calibration_statistics_overconfident() {
        let dir = tempdir().unwrap();
        let calibrator = Calibrator::new(dir.path().join("calibration.sqlite")).unwrap();

        let factors = HashMap::new();

        // Record 10 claims at 90% confidence, only 6 correct (overconfident)
        for i in 0..10 {
            calibrator
                .record_calibration(
                    0.90,
                    i < 6, // 6 correct, 4 incorrect
                    format!("Response {}", i),
                    "Test task".to_string(),
                    "TestAgent".to_string(),
                    None,
                    factors.clone(),
                )
                .unwrap();
        }

        let stats = calibrator.get_statistics(None, None).unwrap();

        assert_eq!(stats.total_records, 10);
        assert_eq!(stats.correct_predictions, 6);
        assert_eq!(stats.accuracy, 0.6);
        assert!(stats.calibration_error > 0.2); // Positive error = overconfident
    }

    #[test]
    fn test_adjustment_factor() {
        let dir = tempdir().unwrap();
        let calibrator = Calibrator::new(dir.path().join("calibration.sqlite")).unwrap();

        let factors = HashMap::new();

        // Record overconfident claims
        for i in 0..20 {
            calibrator
                .record_calibration(
                    0.90,
                    i < 12, // 60% correct when claiming 90%
                    format!("Response {}", i),
                    "Test task".to_string(),
                    "TestAgent".to_string(),
                    None,
                    factors.clone(),
                )
                .unwrap();
        }

        let adjustment = calibrator.get_adjustment_factor(None, None).unwrap();

        // Should reduce confidence (adjustment < 1.0)
        assert!(adjustment < 1.0);
        assert!(adjustment > 0.5); // Clamped to reasonable range
    }

    #[test]
    fn test_confidence_bins() {
        let dir = tempdir().unwrap();
        let calibrator = Calibrator::new(dir.path().join("calibration.sqlite")).unwrap();

        let factors = HashMap::new();

        // Record claims across different confidence levels
        for i in 0..10 {
            calibrator
                .record_calibration(
                    0.50 + i as f64 * 0.05, // 0.50, 0.55, 0.60, ..., 0.95
                    i >= 5, // First 5 wrong, last 5 correct
                    format!("Response {}", i),
                    "Test task".to_string(),
                    "TestAgent".to_string(),
                    None,
                    factors.clone(),
                )
                .unwrap();
        }

        let stats = calibrator.get_statistics(None, None).unwrap();

        // Should have multiple bins
        assert!(stats.confidence_bins.len() > 1);
    }

    #[test]
    fn test_filter_by_agent() {
        let dir = tempdir().unwrap();
        let calibrator = Calibrator::new(dir.path().join("calibration.sqlite")).unwrap();

        let factors = HashMap::new();

        // Record for Agent A
        for _ in 0..5 {
            calibrator
                .record_calibration(
                    0.80,
                    true,
                    "Response A".to_string(),
                    "Task".to_string(),
                    "AgentA".to_string(),
                    None,
                    factors.clone(),
                )
                .unwrap();
        }

        // Record for Agent B
        for _ in 0..3 {
            calibrator
                .record_calibration(
                    0.90,
                    false,
                    "Response B".to_string(),
                    "Task".to_string(),
                    "AgentB".to_string(),
                    None,
                    factors.clone(),
                )
                .unwrap();
        }

        let stats_a = calibrator.get_statistics(Some("AgentA"), None).unwrap();
        let stats_b = calibrator.get_statistics(Some("AgentB"), None).unwrap();

        assert_eq!(stats_a.total_records, 5);
        assert_eq!(stats_b.total_records, 3);
        assert_eq!(stats_a.accuracy, 1.0); // Agent A: 5/5 correct
        assert_eq!(stats_b.accuracy, 0.0); // Agent B: 0/3 correct
    }
}
