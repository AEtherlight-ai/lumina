/**
 * DESIGN DECISION: Load session handoff from JSON files for context recovery
 * WHY: Next session needs to recover ALL context from previous session
 *
 * REASONING CHAIN:
 * 1. Session ends → handoff saved to .lumina/sessions/YYYY-MM-DD-session-NNN.json
 * 2. Next session starts → load previous handoff
 * 3. Handoff contains: decisions, files, patterns, learnings, next steps
 * 4. Agent has COMPLETE context instantly
 * 5. Zero context loss, zero repeated work
 *
 * PATTERN: Pattern-HANDOFF-001 (Structured Session Transfer)
 * PERFORMANCE: <100ms to load and parse handoff JSON
 * RELATED: generator.rs (creates handoffs), types.rs (data structures)
 */

use super::types::*;
use std::fs;
use std::path::{Path, PathBuf};

/// Session handoff loader
pub struct HandoffLoader {
    sessions_dir: PathBuf,
}

impl HandoffLoader {
    /// Create new loader
    pub fn new(project_root: PathBuf) -> Self {
        let sessions_dir = project_root.join(".lumina/sessions");
        Self { sessions_dir }
    }

    /**
     * DESIGN DECISION: Load handoff by session ID
     * WHY: Precise loading, no ambiguity
     */
    pub async fn load(&self, session_id: &str) -> Result<SessionHandoff, String> {
        let handoff_path = self.sessions_dir.join(format!("{}.json", session_id));

        if !handoff_path.exists() {
            return Err(format!("Handoff file not found: {}", handoff_path.display()));
        }

        let content = fs::read_to_string(&handoff_path)
            .map_err(|e| format!("Failed to read handoff file: {}", e))?;

        let handoff: SessionHandoff = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse handoff JSON: {}", e))?;

        Ok(handoff)
    }

    /**
     * DESIGN DECISION: Load most recent handoff automatically
     * WHY: Typical workflow: continue from last session
     */
    pub async fn load_latest(&self) -> Result<SessionHandoff, String> {
        let mut handoff_files = self.list_handoffs().await?;

        if handoff_files.is_empty() {
            return Err("No handoff files found".to_string());
        }

        // Sort by modification time (most recent first)
        handoff_files.sort_by(|a, b| {
            let a_meta = fs::metadata(a).ok();
            let b_meta = fs::metadata(b).ok();

            match (a_meta, b_meta) {
                (Some(a_m), Some(b_m)) => {
                    let a_time = a_m.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH);
                    let b_time = b_m.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH);
                    b_time.cmp(&a_time) // Descending order
                }
                _ => std::cmp::Ordering::Equal,
            }
        });

        let latest_path = &handoff_files[0];
        let content = fs::read_to_string(latest_path)
            .map_err(|e| format!("Failed to read handoff file: {}", e))?;

        let handoff: SessionHandoff = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse handoff JSON: {}", e))?;

        Ok(handoff)
    }

    /**
     * DESIGN DECISION: List all available handoffs
     * WHY: Allow user to browse session history
     */
    pub async fn list_handoffs(&self) -> Result<Vec<PathBuf>, String> {
        if !self.sessions_dir.exists() {
            fs::create_dir_all(&self.sessions_dir)
                .map_err(|e| format!("Failed to create sessions directory: {}", e))?;
            return Ok(Vec::new());
        }

        let mut handoff_files = Vec::new();

        let entries = fs::read_dir(&self.sessions_dir)
            .map_err(|e| format!("Failed to read sessions directory: {}", e))?;

        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) == Some("json") {
                    handoff_files.push(path);
                }
            }
        }

        Ok(handoff_files)
    }

    /**
     * DESIGN DECISION: Load handoffs for specific date
     * WHY: Resume work from specific day
     */
    pub async fn load_by_date(&self, date: &str) -> Result<Vec<SessionHandoff>, String> {
        let handoff_files = self.list_handoffs().await?;
        let mut handoffs = Vec::new();

        for path in handoff_files {
            if let Some(filename) = path.file_name().and_then(|s| s.to_str()) {
                if filename.starts_with(date) {
                    let content = fs::read_to_string(&path)
                        .map_err(|e| format!("Failed to read handoff file: {}", e))?;

                    if let Ok(handoff) = serde_json::from_str::<SessionHandoff>(&content) {
                        handoffs.push(handoff);
                    }
                }
            }
        }

        if handoffs.is_empty() {
            return Err(format!("No handoffs found for date: {}", date));
        }

        // Sort by start time
        handoffs.sort_by(|a, b| a.start_time.cmp(&b.start_time));

        Ok(handoffs)
    }

    /**
     * DESIGN DECISION: Generate context summary from handoff
     * WHY: Provide concise overview for agent initialization
     */
    pub fn generate_context_summary(&self, handoff: &SessionHandoff) -> String {
        let mut summary = String::new();

        summary.push_str(&format!("# Session Context: {}\n\n", handoff.session_id));
        summary.push_str(&format!(
            "**Duration:** {}s ({})\n",
            handoff.duration_secs,
            handoff.start_time.format("%Y-%m-%d %H:%M")
        ));
        summary.push_str(&format!(
            "**Tasks Completed:** {}\n",
            handoff.tasks_completed.len()
        ));
        summary.push_str(&format!(
            "**Files Modified:** {}\n",
            handoff.files_modified.len()
        ));
        summary.push_str(&format!(
            "**Patterns Applied:** {}\n\n",
            handoff.patterns_applied.len()
        ));

        // Tasks completed
        if !handoff.tasks_completed.is_empty() {
            summary.push_str("## Completed Tasks\n\n");
            for task in &handoff.tasks_completed {
                summary.push_str(&format!("- **{}**: {}\n", task.id, task.title));
            }
            summary.push('\n');
        }

        // Key decisions
        if !handoff.decisions_made.is_empty() {
            summary.push_str("## Key Decisions\n\n");
            for (i, decision) in handoff.decisions_made.iter().take(5).enumerate() {
                summary.push_str(&format!("{}. **{}**\n", i + 1, decision.decision));
                summary.push_str(&format!("   - Reasoning: {}\n", decision.reasoning));
            }
            summary.push('\n');
        }

        // Work in progress
        if !handoff.work_in_progress.is_empty() {
            summary.push_str("## Work In Progress\n\n");
            for task in &handoff.work_in_progress {
                summary.push_str(&format!("- **{}**: {} ({})\n", task.id, task.title, format!("{:?}", task.status)));
            }
            summary.push('\n');
        }

        // Blockers
        if !handoff.blockers.is_empty() {
            summary.push_str("## Blockers\n\n");
            for blocker in &handoff.blockers {
                summary.push_str(&format!(
                    "- **[{:?}]** {}\n",
                    blocker.severity, blocker.description
                ));
            }
            summary.push('\n');
        }

        // Next steps
        if !handoff.next_steps.is_empty() {
            summary.push_str("## Next Steps\n\n");
            for (i, step) in handoff.next_steps.iter().enumerate() {
                summary.push_str(&format!("{}. {}\n", i + 1, step));
            }
            summary.push('\n');
        }

        // Learnings
        if !handoff.learnings.is_empty() {
            summary.push_str("## Key Learnings\n\n");
            for learning in &handoff.learnings {
                summary.push_str(&format!("- {}\n", learning.learning));
            }
            summary.push('\n');
        }

        summary
    }

    /**
     * DESIGN DECISION: Save handoff to JSON file
     * WHY: Persistent storage for future sessions
     */
    pub async fn save(&self, handoff: &SessionHandoff) -> Result<PathBuf, String> {
        // Ensure sessions directory exists
        if !self.sessions_dir.exists() {
            fs::create_dir_all(&self.sessions_dir)
                .map_err(|e| format!("Failed to create sessions directory: {}", e))?;
        }

        let handoff_path = self
            .sessions_dir
            .join(format!("{}.json", handoff.session_id));

        let json = serde_json::to_string_pretty(handoff)
            .map_err(|e| format!("Failed to serialize handoff: {}", e))?;

        fs::write(&handoff_path, json)
            .map_err(|e| format!("Failed to write handoff file: {}", e))?;

        Ok(handoff_path)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn test_context_summary_generation() {
        let mut handoff = SessionHandoff::new("test-session".to_string());
        handoff.start_time = Utc::now();
        handoff.end_time = Utc::now();
        handoff.duration_secs = 3600;

        handoff.tasks_completed.push(Task {
            id: "AI-004".to_string(),
            title: "Session Handoff".to_string(),
            status: TaskStatus::Complete,
            files_modified: vec![],
            patterns_applied: vec![],
            start_time: None,
            end_time: None,
            duration_secs: None,
        });

        handoff.decisions_made.push(Decision {
            decision: "Use JSON for storage".to_string(),
            reasoning: "Human-readable".to_string(),
            alternatives: vec![],
            timestamp: Utc::now(),
            related_files: vec![],
            confidence: None,
        });

        handoff.next_steps.push("Continue implementation".to_string());

        let loader = HandoffLoader::new(PathBuf::from("/tmp"));
        let summary = loader.generate_context_summary(&handoff);

        assert!(summary.contains("AI-004"));
        assert!(summary.contains("Session Handoff"));
        assert!(summary.contains("Use JSON for storage"));
        assert!(summary.contains("Continue implementation"));
    }

    #[test]
    fn test_handoff_serialization() {
        let handoff = SessionHandoff::new("test-session".to_string());
        let json = serde_json::to_string(&handoff).unwrap();
        let deserialized: SessionHandoff = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.session_id, "test-session");
    }
}
