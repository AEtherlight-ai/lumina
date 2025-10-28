/**
 * Signal Writer - Agent writes completion signals
 *
 * DESIGN DECISION: Atomic file writes with temp + rename
 * WHY: Prevents race conditions, ensures reader never sees partial writes
 *
 * REASONING CHAIN:
 * 1. Agent completes task
 * 2. Write signal to temp file (.tmp)
 * 3. Rename temp → final (atomic operation)
 * 4. Reader watches for final file creation
 * 5. Reader gets complete signal (never partial)
 * 6. Result: Race-free coordination
 *
 * PATTERN: Pattern-IPC-002 (Atomic File Writes)
 * PERFORMANCE: <10ms write + rename
 */

use std::fs;
use std::path::{Path, PathBuf};
use anyhow::{Context, Result};
use super::types::CompletionSignal;

/**
 * Signal writer for agents
 *
 * DESIGN DECISION: Single writer per agent
 * WHY: Each agent writes only its own signals
 */
pub struct SignalWriter {
    workflow_dir: PathBuf,
}

impl SignalWriter {
    /**
     * Create new signal writer
     *
     * @param workflow_dir - Directory for IPC signals (default: .lumina/workflow)
     */
    pub fn new(workflow_dir: impl AsRef<Path>) -> Result<Self> {
        let workflow_dir = workflow_dir.as_ref().to_path_buf();

        // Ensure workflow directory exists
        if !workflow_dir.exists() {
            fs::create_dir_all(&workflow_dir)
                .context("Failed to create workflow directory")?;
        }

        Ok(Self { workflow_dir })
    }

    /**
     * Write completion signal (atomic)
     *
     * DESIGN DECISION: Atomic write with temp + rename
     * WHY: Reader never sees partial signal
     *
     * REASONING CHAIN:
     * 1. Serialize signal to JSON
     * 2. Write to temp file (.tmp)
     * 3. Rename temp → final (atomic)
     * 4. Result: Reader gets complete signal
     *
     * PERFORMANCE: <10ms (serialize + write + rename)
     *
     * @param signal - Completion signal to write
     */
    pub fn write_signal(&self, signal: &CompletionSignal) -> Result<()> {
        let signal_file = self.workflow_dir.join(format!("{}.complete.json", signal.task_id));
        let temp_file = self.workflow_dir.join(format!("{}.complete.json.tmp", signal.task_id));

        // Serialize to JSON (pretty for human readability)
        let json = serde_json::to_string_pretty(signal)
            .context("Failed to serialize completion signal")?;

        // Write to temp file
        fs::write(&temp_file, json)
            .context("Failed to write temp signal file")?;

        // Atomic rename (temp → final)
        fs::rename(&temp_file, &signal_file)
            .context("Failed to rename signal file")?;

        Ok(())
    }

    /**
     * Check if signal exists for task
     *
     * @param task_id - Task ID to check
     * @returns true if signal file exists
     */
    pub fn signal_exists(&self, task_id: &str) -> bool {
        let signal_file = self.workflow_dir.join(format!("{}.complete.json", task_id));
        signal_file.exists()
    }

    /**
     * Delete signal file
     *
     * DESIGN DECISION: Manual cleanup
     * WHY: Signals useful for debugging, delete when no longer needed
     *
     * @param task_id - Task ID to delete signal for
     */
    pub fn delete_signal(&self, task_id: &str) -> Result<()> {
        let signal_file = self.workflow_dir.join(format!("{}.complete.json", task_id));
        
        if signal_file.exists() {
            fs::remove_file(&signal_file)
                .context("Failed to delete signal file")?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::path::PathBuf;

    #[test]
    fn test_write_signal() {
        let temp_dir = TempDir::new().unwrap();
        let writer = SignalWriter::new(temp_dir.path()).unwrap();

        let signal = CompletionSignal::success(
            "TEST-001",
            "test",
            vec![PathBuf::from("test.rs")],
            vec!["Design decision 1".to_string()],
        );

        writer.write_signal(&signal).unwrap();

        assert!(writer.signal_exists("TEST-001"));
    }

    #[test]
    fn test_delete_signal() {
        let temp_dir = TempDir::new().unwrap();
        let writer = SignalWriter::new(temp_dir.path()).unwrap();

        let signal = CompletionSignal::success(
            "TEST-002",
            "test",
            vec![],
            vec![],
        );

        writer.write_signal(&signal).unwrap();
        assert!(writer.signal_exists("TEST-002"));

        writer.delete_signal("TEST-002").unwrap();
        assert!(!writer.signal_exists("TEST-002"));
    }
}
