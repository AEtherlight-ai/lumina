/**
 * Signal Reader - Project Manager reads completion signals
 *
 * DESIGN DECISION: Filesystem watcher for real-time detection
 * WHY: Polling wastes CPU, watcher provides instant notification
 *
 * REASONING CHAIN:
 * 1. Project Manager spawns agents
 * 2. Create filesystem watcher on workflow directory
 * 3. Agent writes signal → filesystem event fires
 * 4. Reader detects event (<50ms)
 * 5. Read and parse signal
 * 6. Update dependency graph
 * 7. Result: Real-time coordination with minimal overhead
 *
 * PATTERN: Pattern-IPC-003 (Filesystem Watching)
 * PERFORMANCE: <50ms detection latency
 */

use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;
use anyhow::{Context, Result};
use notify::{Watcher, RecursiveMode, Event, EventKind};
use super::types::CompletionSignal;

/**
 * Signal reader for Project Manager
 *
 * DESIGN DECISION: Single reader (Project Manager only)
 * WHY: Only Project Manager needs to coordinate agents
 */
pub struct SignalReader {
    workflow_dir: PathBuf,
}

impl SignalReader {
    /**
     * Create new signal reader
     *
     * @param workflow_dir - Directory for IPC signals
     */
    pub fn new(workflow_dir: impl AsRef<Path>) -> Result<Self> {
        let workflow_dir = workflow_dir.as_ref().to_path_buf();

        if !workflow_dir.exists() {
            fs::create_dir_all(&workflow_dir)
                .context("Failed to create workflow directory")?;
        }

        Ok(Self { workflow_dir })
    }

    /**
     * Read completion signal
     *
     * DESIGN DECISION: Synchronous read
     * WHY: Signal file guaranteed to exist when called
     *
     * @param task_id - Task ID to read signal for
     * @returns Parsed completion signal
     */
    pub fn read_signal(&self, task_id: &str) -> Result<CompletionSignal> {
        let signal_file = self.workflow_dir.join(format!("{}.complete.json", task_id));

        let json = fs::read_to_string(&signal_file)
            .context("Failed to read signal file")?;

        let signal: CompletionSignal = serde_json::from_str(&json)
            .context("Failed to parse completion signal")?;

        Ok(signal)
    }

    /**
     * Wait for completion signal (blocking)
     *
     * DESIGN DECISION: Blocking wait with filesystem watcher
     * WHY: Project Manager needs to wait for agent completion
     *
     * REASONING CHAIN:
     * 1. Create filesystem watcher
     * 2. Wait for file creation event
     * 3. Read signal when file appears
     * 4. Return signal to caller
     *
     * PERFORMANCE: <50ms detection after file written
     *
     * @param task_id - Task ID to wait for
     * @param timeout - Timeout duration (None = wait forever)
     * @returns Completion signal when available
     */
    pub fn wait_for_signal(
        &self,
        task_id: &str,
        timeout: Option<Duration>,
    ) -> Result<CompletionSignal> {
        let signal_file = self.workflow_dir.join(format!("{}.complete.json", task_id));

        // Check if signal already exists
        if signal_file.exists() {
            return self.read_signal(task_id);
        }

        // Create filesystem watcher
        let (tx, rx) = std::sync::mpsc::channel();
        let mut watcher = notify::recommended_watcher(move |res: Result<Event, _>| {
            if let Ok(event) = res {
                if matches!(event.kind, EventKind::Create(_) | EventKind::Modify(_)) {
                    let _ = tx.send(event);
                }
            }
        })?;

        // Watch workflow directory
        watcher.watch(&self.workflow_dir, RecursiveMode::NonRecursive)?;

        // Wait for signal file creation
        let deadline = timeout.map(|d| std::time::Instant::now() + d);

        loop {
            let timeout_duration = deadline
                .map(|d| d.saturating_duration_since(std::time::Instant::now()))
                .unwrap_or(Duration::from_secs(3600)); // 1 hour default

            match rx.recv_timeout(timeout_duration) {
                Ok(event) => {
                    // Check if this is our signal file
                    if event.paths.iter().any(|p| p == &signal_file) {
                        // Signal file created, read it
                        return self.read_signal(task_id);
                    }
                }
                Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                    if deadline.is_some() {
                        anyhow::bail!("Timeout waiting for signal: {}", task_id);
                    }
                }
                Err(e) => {
                    anyhow::bail!("Watcher error: {}", e);
                }
            }
        }
    }

    /**
     * List all completion signals
     *
     * @returns Vector of task IDs with signals
     */
    pub fn list_signals(&self) -> Result<Vec<String>> {
        let mut task_ids = Vec::new();

        for entry in fs::read_dir(&self.workflow_dir)? {
            let entry = entry?;
            let path = entry.path();

            if let Some(filename) = path.file_name().and_then(|n| n.to_str()) {
                if filename.ends_with(".complete.json") {
                    let task_id = filename.trim_end_matches(".complete.json");
                    task_ids.push(task_id.to_string());
                }
            }
        }

        Ok(task_ids)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ipc::writer::SignalWriter;
    use tempfile::TempDir;
    use std::thread;
    use std::time::Duration;

    #[test]
    fn test_read_signal() {
        let temp_dir = TempDir::new().unwrap();
        let writer = SignalWriter::new(temp_dir.path()).unwrap();
        let reader = SignalReader::new(temp_dir.path()).unwrap();

        let signal = CompletionSignal::success(
            "TEST-001",
            "test",
            vec![PathBuf::from("test.rs")],
            vec!["Design decision".to_string()],
        );

        writer.write_signal(&signal).unwrap();

        let read_signal = reader.read_signal("TEST-001").unwrap();
        assert_eq!(read_signal.task_id, "TEST-001");
        assert_eq!(read_signal.agent_type, "test");
    }

    #[test]
    fn test_wait_for_signal() {
        let temp_dir = TempDir::new().unwrap();
        let writer = SignalWriter::new(temp_dir.path()).unwrap();
        let reader = SignalReader::new(temp_dir.path()).unwrap();

        // Spawn thread to write signal after 100ms
        let temp_path = temp_dir.path().to_path_buf();
        thread::spawn(move || {
            thread::sleep(Duration::from_millis(100));
            let writer = SignalWriter::new(&temp_path).unwrap();
            let signal = CompletionSignal::success(
                "TEST-002",
                "test",
                vec![],
                vec![],
            );
            writer.write_signal(&signal).unwrap();
        });

        // Wait for signal (should succeed after 100ms)
        let signal = reader.wait_for_signal("TEST-002", Some(Duration::from_secs(5))).unwrap();
        assert_eq!(signal.task_id, "TEST-002");
    }

    #[test]
    fn test_list_signals() {
        let temp_dir = TempDir::new().unwrap();
        let writer = SignalWriter::new(temp_dir.path()).unwrap();
        let reader = SignalReader::new(temp_dir.path()).unwrap();

        writer.write_signal(&CompletionSignal::success("TASK-001", "test", vec![], vec![])).unwrap();
        writer.write_signal(&CompletionSignal::success("TASK-002", "test", vec![], vec![])).unwrap();

        let signals = reader.list_signals().unwrap();
        assert_eq!(signals.len(), 2);
        assert!(signals.contains(&"TASK-001".to_string()));
        assert!(signals.contains(&"TASK-002".to_string()));
    }
}
