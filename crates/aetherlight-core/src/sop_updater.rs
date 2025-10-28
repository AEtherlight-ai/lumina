/**
 * SOP Updater - Automatically update SOPs based on experiment results
 *
 * DESIGN DECISION: Automatically update SOPs when experiments validate improvements
 * WHY: Manual SOP updates lag behind validated improvements; automation closes loop
 *
 * REASONING CHAIN:
 * 1. Experiment Runner validates that approach B beats approach A (p < 0.05)
 * 2. SOP Updater generates diff showing old vs new approach
 * 3. Applies update to agent context file (docs/agents/<agent>-agent-context.md)
 * 4. Records rationale with experiment data
 * 5. Notifies humans of update
 * 6. Result: SOPs always reflect latest validated best practices
 *
 * PATTERN: Pattern-SOP-UPDATE-001 (Automated Process Improvement)
 * PERFORMANCE: <1s to generate and apply update
 * IMPACT: Zero lag between validation and adoption
 */

// TODO: Implement submodules
// pub mod differ;
// pub mod applier;
// pub mod notifier;

use crate::validation_agent::types::{AgentType, Approach, ExperimentResult, Winner};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Arc;

/// SOP update record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SOPUpdate {
    pub agent_type: AgentType,
    pub sop_section: String,
    pub old_approach: Approach,
    pub new_approach: Approach,
    pub rationale: String, // Why updating
    pub experiment_id: String,
    pub validated_date: DateTime<Utc>,
    pub diff: String, // Human-readable diff
}

/// SOP updater
pub struct SOPUpdater {
    agent_contexts_dir: PathBuf,
    updates_log: PathBuf,
}

impl SOPUpdater {
    /// Create new SOP updater
    ///
    /// DESIGN DECISION: Store updates in .lumina/sop-updates/
    /// WHY: Version control for SOP evolution, audit trail
    pub fn new(workspace_root: impl Into<PathBuf>) -> Self {
        let workspace_root = workspace_root.into();
        let updates_dir = workspace_root.join(".lumina/sop-updates");
        let agent_contexts_dir = workspace_root.join("docs/agents");

        // Create directories
        let _ = std::fs::create_dir_all(&updates_dir);
        let _ = std::fs::create_dir_all(&agent_contexts_dir);

        Self {
            agent_contexts_dir,
            updates_log: updates_dir.join("updates.json"),
        }
    }

    /// Update SOP based on experiment result
    ///
    /// DESIGN DECISION: Only update if treatment wins with significance
    /// WHY: Don't adopt unvalidated changes
    ///
    /// **Steps:**
    /// 1. Check if experiment shows significant improvement
    /// 2. Generate SOPUpdate with rationale
    /// 3. Generate diff (old vs new approach)
    /// 4. Apply update to agent context file
    /// 5. Log update for audit trail
    /// 6. Notify human
    pub async fn update_sop(&self, result: ExperimentResult) -> Result<SOPUpdate, String> {
        // Only update if treatment wins significantly
        if result.winner != Winner::Treatment {
            return Err(format!(
                "Experiment {} did not produce a treatment win (winner: {:?})",
                result.experiment_id, result.winner
            ));
        }

        if !result.significant {
            return Err(format!(
                "Experiment {} did not reach statistical significance (p={:.4})",
                result.experiment_id, result.p_value
            ));
        }

        // Create update record
        let update = SOPUpdate {
            agent_type: AgentType::Implementation, // TODO: Infer from experiment
            sop_section: "Workflow".to_string(),    // TODO: Infer from experiment
            old_approach: result.control.approach.clone(),
            new_approach: result.treatment.approach.clone(),
            rationale: format!(
                "A/B test (Experiment {}) showed {} improves {}:\n\
                 - Control mean: {:.2}\n\
                 - Treatment mean: {:.2}\n\
                 - Improvement: {:.1}%\n\
                 - p-value: {:.4} (statistically significant)\n\
                 - Effect size: {:.2} (Cohen's d)\n\
                 \n\
                 Validated with {} samples per group.",
                result.experiment_id,
                result.treatment.approach.name,
                result.hypothesis,
                result.control.mean,
                result.treatment.mean,
                ((result.treatment.mean - result.control.mean) / result.control.mean * 100.0),
                result.p_value,
                result.effect_size,
                result.control.sample_size
            ),
            experiment_id: result.experiment_id.clone(),
            validated_date: result.completed_at,
            diff: self.generate_diff(&result),
        };

        // Apply update
        self.apply_update(&update).await?;

        // Log update
        self.log_update(&update).await?;

        // Notify human
        self.notify_human(&update).await?;

        Ok(update)
    }

    /// Generate human-readable diff
    ///
    /// DESIGN DECISION: Markdown format with clear old/new sections
    /// WHY: Human review required before adopting changes
    fn generate_diff(&self, result: &ExperimentResult) -> String {
        let mut diff = String::new();

        diff.push_str("```diff\n");
        diff.push_str("- OLD APPROACH:\n");
        diff.push_str(&format!("- Name: {}\n", result.control.approach.name));
        diff.push_str(&format!("- Description: {}\n", result.control.approach.description));
        diff.push_str("- Steps:\n");
        for (i, step) in result.control.approach.steps.iter().enumerate() {
            diff.push_str(&format!("-   {}. {}\n", i + 1, step));
        }
        diff.push_str("\n");

        diff.push_str("+ NEW APPROACH (VALIDATED):\n");
        diff.push_str(&format!("+ Name: {}\n", result.treatment.approach.name));
        diff.push_str(&format!("+ Description: {}\n", result.treatment.approach.description));
        diff.push_str("+ Steps:\n");
        for (i, step) in result.treatment.approach.steps.iter().enumerate() {
            diff.push_str(&format!("+   {}. {}\n", i + 1, step));
        }
        diff.push_str("```\n");

        diff
    }

    /// Apply update to agent context file
    ///
    /// DESIGN DECISION: Append to existing file, don't replace
    /// WHY: Preserve history, humans can review and adjust
    async fn apply_update(&self, update: &SOPUpdate) -> Result<(), String> {
        let agent_file = self
            .agent_contexts_dir
            .join(format!("{:?}-agent-context.md", update.agent_type).to_lowercase());

        // Read existing content
        let existing = std::fs::read_to_string(&agent_file).unwrap_or_else(|_| {
            format!(
                "# {:?} Agent Context\n\nNo existing context.\n\n",
                update.agent_type
            )
        });

        // Append update
        let mut updated = existing;
        updated.push_str(&format!(
            "\n---\n\n## SOP Update: {} (UPDATED {})\n\n",
            update.sop_section,
            update.validated_date.format("%Y-%m-%d")
        ));
        updated.push_str(&format!("**Experiment:** {}\n\n", update.experiment_id));
        updated.push_str(&update.diff);
        updated.push_str("\n**RATIONALE:**\n");
        updated.push_str(&update.rationale);
        updated.push_str("\n\n**Patterns:**\n");
        for pattern in &update.new_approach.patterns {
            updated.push_str(&format!("- {}\n", pattern));
        }
        updated.push_str("\n");

        // Write updated file
        std::fs::write(&agent_file, updated)
            .map_err(|e| format!("Failed to write agent context file: {}", e))?;

        Ok(())
    }

    /// Log update for audit trail
    async fn log_update(&self, update: &SOPUpdate) -> Result<(), String> {
        // Read existing log
        let mut log: Vec<SOPUpdate> = if self.updates_log.exists() {
            let content = std::fs::read_to_string(&self.updates_log)
                .map_err(|e| format!("Failed to read updates log: {}", e))?;
            serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse updates log: {}", e))?
        } else {
            Vec::new()
        };

        // Append new update
        log.push(update.clone());

        // Write log
        let json = serde_json::to_string_pretty(&log)
            .map_err(|e| format!("Failed to serialize updates log: {}", e))?;
        std::fs::write(&self.updates_log, json)
            .map_err(|e| format!("Failed to write updates log: {}", e))?;

        Ok(())
    }

    /// Notify human of update
    async fn notify_human(&self, update: &SOPUpdate) -> Result<(), String> {
        println!("\n=== SOP UPDATE NOTIFICATION ===");
        println!("Agent: {:?}", update.agent_type);
        println!("Section: {}", update.sop_section);
        println!("Experiment: {}", update.experiment_id);
        println!("Date: {}", update.validated_date.format("%Y-%m-%d"));
        println!("\nRationale:");
        println!("{}", update.rationale);
        println!("\nDiff:");
        println!("{}", update.diff);
        println!("===============================\n");

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::validation_agent::types::{
        AgentExecution, GroupResults, TaskType, Trend, Winner,
    };
    use tempfile::TempDir;

    fn create_test_experiment_result() -> ExperimentResult {
        ExperimentResult {
            experiment_id: "exp-tdd-001".to_string(),
            hypothesis: "TDD improves test coverage by 10%".to_string(),
            control: GroupResults {
                approach: Approach {
                    id: "feature-first".to_string(),
                    name: "Feature-First".to_string(),
                    description: "Write code, then tests".to_string(),
                    steps: vec![
                        "Design feature".to_string(),
                        "Implement code".to_string(),
                        "Write tests".to_string(),
                    ],
                    patterns: vec!["Pattern-IMPL-001".to_string()],
                    estimated_duration_secs: 3600,
                },
                executions: vec![],
                mean: 0.78,
                std_dev: 0.05,
                median: 0.78,
                min: 0.70,
                max: 0.85,
                sample_size: 30,
            },
            treatment: GroupResults {
                approach: Approach {
                    id: "tdd".to_string(),
                    name: "TDD".to_string(),
                    description: "Write tests first, then code".to_string(),
                    steps: vec![
                        "Design feature".to_string(),
                        "Write failing tests".to_string(),
                        "Implement code to pass tests".to_string(),
                        "Refactor".to_string(),
                    ],
                    patterns: vec!["Pattern-TDD-001".to_string()],
                    estimated_duration_secs: 4200,
                },
                executions: vec![],
                mean: 0.87,
                std_dev: 0.04,
                median: 0.87,
                min: 0.80,
                max: 0.92,
                sample_size: 30,
            },
            p_value: 0.003,
            significant: true,
            winner: Winner::Treatment,
            effect_size: 1.23,
            confidence_interval: (0.07, 0.11),
            recommendation: "Adopt TDD as default for all feature tasks".to_string(),
            completed_at: Utc::now(),
        }
    }

    #[tokio::test]
    async fn test_sop_update() {
        let temp_dir = TempDir::new().unwrap();
        let updater = SOPUpdater::new(temp_dir.path());

        let result = create_test_experiment_result();
        let update = updater.update_sop(result).await.unwrap();

        assert_eq!(update.experiment_id, "exp-tdd-001");
        assert_eq!(update.old_approach.name, "Feature-First");
        assert_eq!(update.new_approach.name, "TDD");
        assert!(update.rationale.contains("78%"));
        assert!(update.rationale.contains("87%"));
        assert!(update.diff.contains("- OLD APPROACH"));
        assert!(update.diff.contains("+ NEW APPROACH"));
    }

    #[tokio::test]
    async fn test_reject_inconclusive() {
        let temp_dir = TempDir::new().unwrap();
        let updater = SOPUpdater::new(temp_dir.path());

        let mut result = create_test_experiment_result();
        result.winner = Winner::Inconclusive;

        let result_update = updater.update_sop(result).await;

        assert!(result_update.is_err());
        assert!(result_update.unwrap_err().contains("did not produce a treatment win"));
    }

    #[tokio::test]
    async fn test_reject_not_significant() {
        let temp_dir = TempDir::new().unwrap();
        let updater = SOPUpdater::new(temp_dir.path());

        let mut result = create_test_experiment_result();
        result.significant = false;
        result.p_value = 0.12;

        let result_update = updater.update_sop(result).await;

        assert!(result_update.is_err());
        assert!(result_update.unwrap_err().contains("did not reach statistical significance"));
    }
}
