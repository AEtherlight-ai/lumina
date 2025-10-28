/**
 * Experiment Reporter - Generate human-readable reports
 *
 * DESIGN DECISION: Clear, actionable reports for humans
 * WHY: Experiments validate process changes; humans decide adoption
 *
 * REASONING CHAIN:
 * 1. Statistical analysis produces p-values, effect sizes
 * 2. Humans need plain-English interpretation
 * 3. Report shows: hypothesis, results, recommendation
 * 4. Markdown format (readable + git-friendly)
 * 5. Exported to .lumina/experiments/reports/
 *
 * PATTERN: Pattern-REPORTING-001 (Human-Readable Analysis)
 * PERFORMANCE: <50ms to generate report
 */

use crate::experiment_runner::statistics::StatisticalAnalysis;
use crate::validation_agent::types::{Experiment, ExperimentResult, GroupResults, Winner};
use chrono::Utc;
use std::path::{Path, PathBuf};

/// Experiment reporter
pub struct Reporter {
    output_dir: PathBuf,
}

impl Reporter {
    /// Create new reporter
    pub fn new(output_dir: impl Into<PathBuf>) -> Self {
        let output_dir = output_dir.into();
        // Ensure directory exists
        let _ = std::fs::create_dir_all(&output_dir);
        Self { output_dir }
    }

    /// Generate experiment report
    ///
    /// DESIGN DECISION: Markdown format with tables and charts
    /// WHY: Readable by humans, parseable by tools, git-friendly
    pub fn generate_report(&self, result: &ExperimentResult) -> Result<PathBuf, String> {
        let report_path = self
            .output_dir
            .join(format!("{}-report.md", result.experiment_id));

        let markdown = self.format_as_markdown(result);

        std::fs::write(&report_path, markdown)
            .map_err(|e| format!("Failed to write report: {}", e))?;

        Ok(report_path)
    }

    /// Format result as markdown
    fn format_as_markdown(&self, result: &ExperimentResult) -> String {
        let mut md = String::new();

        // Header
        md.push_str(&format!("# Experiment Report: {}\n\n", result.experiment_id));
        md.push_str(&format!("**Generated:** {}\n\n", Utc::now().format("%Y-%m-%d %H:%M:%S UTC")));
        md.push_str("---\n\n");

        // Hypothesis
        md.push_str("## Hypothesis\n\n");
        md.push_str(&format!("> {}\n\n", result.hypothesis));

        // Results Summary
        md.push_str("## Results Summary\n\n");
        md.push_str(&format!("**Winner:** {:?}\n\n", result.winner));

        let winner_emoji = match result.winner {
            Winner::Treatment => "✅ Treatment wins",
            Winner::Control => "⚪ Control wins (no improvement)",
            Winner::Inconclusive => "❓ Inconclusive",
        };
        md.push_str(&format!("**Outcome:** {}\n\n", winner_emoji));

        // Statistical Significance
        md.push_str("## Statistical Analysis\n\n");
        md.push_str("| Metric | Value | Interpretation |\n");
        md.push_str("|--------|-------|----------------|\n");

        md.push_str(&format!(
            "| **p-value** | {:.4} | {} |\n",
            result.p_value,
            if result.significant {
                "✅ Statistically significant (p < 0.05)"
            } else {
                "❌ Not statistically significant"
            }
        ));

        let effect_interpretation = if result.effect_size > 0.8 {
            "Large effect"
        } else if result.effect_size > 0.5 {
            "Medium effect"
        } else if result.effect_size > 0.2 {
            "Small effect"
        } else {
            "Negligible effect"
        };

        md.push_str(&format!(
            "| **Effect Size (Cohen's d)** | {:.2} | {} |\n",
            result.effect_size, effect_interpretation
        ));

        md.push_str(&format!(
            "| **95% Confidence Interval** | ({:.3}, {:.3}) | Range of likely difference |\n\n",
            result.confidence_interval.0, result.confidence_interval.1
        ));

        // Control vs Treatment
        md.push_str("## Control vs Treatment\n\n");
        md.push_str("### Control Group\n\n");
        md.push_str(&self.format_group_results(&result.control));

        md.push_str("### Treatment Group\n\n");
        md.push_str(&self.format_group_results(&result.treatment));

        // Recommendation
        md.push_str("## Recommendation\n\n");
        md.push_str(&format!("> {}\n\n", result.recommendation));

        // Metadata
        md.push_str("---\n\n");
        md.push_str("## Metadata\n\n");
        md.push_str(&format!("- **Experiment ID:** {}\n", result.experiment_id));
        md.push_str(&format!("- **Completed:** {}\n", result.completed_at.format("%Y-%m-%d %H:%M:%S UTC")));
        md.push_str(&format!("- **Sample Size:** {} per group\n", result.control.sample_size));

        md
    }

    /// Format group results
    fn format_group_results(&self, group: &GroupResults) -> String {
        let mut md = String::new();

        md.push_str(&format!("**Approach:** {}\n\n", group.approach.name));
        md.push_str(&format!("_{}_\n\n", group.approach.description));

        md.push_str("| Statistic | Value |\n");
        md.push_str("|-----------|-------|\n");
        md.push_str(&format!("| Mean | {:.3} |\n", group.mean));
        md.push_str(&format!("| Median | {:.3} |\n", group.median));
        md.push_str(&format!("| Std Dev | {:.3} |\n", group.std_dev));
        md.push_str(&format!("| Min | {:.3} |\n", group.min));
        md.push_str(&format!("| Max | {:.3} |\n", group.max));
        md.push_str(&format!("| Sample Size | {} |\n\n", group.sample_size));

        md
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::validation_agent::types::{AgentExecution, AgentType, Approach, TaskType};
    use chrono::Utc;
    use tempfile::TempDir;

    fn create_test_result() -> ExperimentResult {
        let control_executions = vec![AgentExecution {
            id: "test-001".to_string(),
            agent_type: AgentType::Implementation,
            task_id: "task-001".to_string(),
            task_type: TaskType::Feature,
            pattern_used: "Pattern-IMPL-001".to_string(),
            sop_used: "SOP-001".to_string(),
            approach_variant: "control".to_string(),
            success: true,
            duration_secs: 3600,
            tokens_used: 5000,
            errors_count: 0,
            iterations_count: 1,
            tests_passing: 12,
            tests_total: 12,
            test_coverage: 0.78,
            code_quality_score: 7.2,
            security_issues: 0,
            performance_degradation: false,
            human_approved: Some(true),
            human_feedback: None,
            timestamp: Utc::now(),
            git_commit: Some("abc123".to_string()),
            files_modified: vec!["src/main.rs".to_string()],
        }];

        let treatment_executions = vec![AgentExecution {
            id: "test-002".to_string(),
            agent_type: AgentType::Implementation,
            task_id: "task-002".to_string(),
            task_type: TaskType::Feature,
            pattern_used: "Pattern-TDD-001".to_string(),
            sop_used: "SOP-001".to_string(),
            approach_variant: "treatment".to_string(),
            success: true,
            duration_secs: 4200,
            tokens_used: 5500,
            errors_count: 0,
            iterations_count: 1,
            tests_passing: 12,
            tests_total: 12,
            test_coverage: 0.87,
            code_quality_score: 8.1,
            security_issues: 0,
            performance_degradation: false,
            human_approved: Some(true),
            human_feedback: None,
            timestamp: Utc::now(),
            git_commit: Some("def456".to_string()),
            files_modified: vec!["src/main.rs".to_string()],
        }];

        ExperimentResult {
            experiment_id: "exp-001".to_string(),
            hypothesis: "TDD improves test coverage by 10%".to_string(),
            control: GroupResults {
                approach: Approach {
                    id: "feature-first".to_string(),
                    name: "Feature-First".to_string(),
                    description: "Write code, then tests".to_string(),
                    steps: vec![],
                    patterns: vec!["Pattern-IMPL-001".to_string()],
                    estimated_duration_secs: 3600,
                },
                executions: control_executions,
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
                    description: "Write tests, then code".to_string(),
                    steps: vec![],
                    patterns: vec!["Pattern-TDD-001".to_string()],
                    estimated_duration_secs: 4200,
                },
                executions: treatment_executions,
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

    #[test]
    fn test_generate_report() {
        let temp_dir = TempDir::new().unwrap();
        let reporter = Reporter::new(temp_dir.path());
        let result = create_test_result();

        let report_path = reporter.generate_report(&result).unwrap();

        assert!(report_path.exists());

        let content = std::fs::read_to_string(&report_path).unwrap();
        assert!(content.contains("# Experiment Report"));
        assert!(content.contains("TDD improves test coverage"));
        assert!(content.contains("Treatment wins"));
    }

    #[test]
    fn test_format_as_markdown() {
        let temp_dir = TempDir::new().unwrap();
        let reporter = Reporter::new(temp_dir.path());
        let result = create_test_result();

        let markdown = reporter.format_as_markdown(&result);

        assert!(markdown.contains("## Hypothesis"));
        assert!(markdown.contains("## Results Summary"));
        assert!(markdown.contains("## Statistical Analysis"));
        assert!(markdown.contains("## Control vs Treatment"));
        assert!(markdown.contains("## Recommendation"));
    }
}
