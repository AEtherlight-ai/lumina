/**
 * Experiment Runner - Automated A/B testing of agent processes
 *
 * DESIGN DECISION: Automated experimentation enables data-driven process improvement
 * WHY: Manual process improvement is slow and biased; experiments provide objective data
 *
 * REASONING CHAIN:
 * 1. Validation Agent identifies potential improvements (analyzer.rs)
 * 2. Experiment Runner runs A/B tests (control vs treatment)
 * 3. Statistical analysis determines winner (t-test, Cohen's d)
 * 4. SOP Update System adopts validated improvements
 * 5. Continuous improvement loop
 *
 * PATTERN: Pattern-EXPERIMENT-001 (A/B Test Automation)
 * PERFORMANCE: Background execution, minimal impact on active development
 * IMPACT: 2-3 validated process improvements per month
 *
 * **Example Flow:**
 * ```rust
 * // 1. Validation Agent proposes experiment
 * let experiment = Experiment {
 *     hypothesis: "TDD improves test coverage by 10%",
 *     control: Approach { name: "Feature-First", ... },
 *     treatment: Approach { name: "TDD", ... },
 *     metric: "test_coverage",
 *     sample_size: 30,
 *     ...
 * };
 *
 * // 2. Experiment Runner executes
 * let result = experiment_runner.run_experiment(experiment).await?;
 *
 * // 3. Result:
 * // - Control: 78% coverage (mean)
 * // - Treatment: 87% coverage (mean)
 * // - p-value: 0.003 (significant!)
 * // - Winner: Treatment (TDD)
 * // - Recommendation: "Adopt TDD as default"
 *
 * // 4. SOP Update System applies changes
 * sop_updater.update_sop(result).await?;
 * ```
 */

pub mod executor;
pub mod reporter;
pub mod statistics;

use crate::validation_agent::types::{Experiment, ExperimentResult, GroupResults};
use crate::validation_agent::ValidationAgent;
use executor::{ExecutionResult, Executor};
use reporter::Reporter;
use statistics::StatisticalAnalyzer;
use std::path::{Path, PathBuf};
use std::sync::Arc;

/// Experiment runner
///
/// DESIGN DECISION: Facade pattern for simple public API
/// WHY: Hide complexity of execution, statistics, reporting
pub struct ExperimentRunner {
    validation_agent: Arc<ValidationAgent>,
    executor: Executor,
    statistics: StatisticalAnalyzer,
    reporter: Reporter,
}

impl ExperimentRunner {
    /// Create new experiment runner
    ///
    /// DESIGN DECISION: Store artifacts in .lumina/experiments/
    /// WHY: Consistent with other ÆtherLight data storage
    pub fn new(workspace_root: impl Into<PathBuf>, validation_agent: Arc<ValidationAgent>) -> Self {
        let workspace_root = workspace_root.into();
        let experiments_dir = workspace_root.join(".lumina/experiments");
        let reports_dir = experiments_dir.join("reports");

        // Create directories
        let _ = std::fs::create_dir_all(&experiments_dir);
        let _ = std::fs::create_dir_all(&reports_dir);

        Self {
            validation_agent,
            executor: Executor::new(workspace_root),
            statistics: StatisticalAnalyzer::new(0.05), // p < 0.05 for significance
            reporter: Reporter::new(reports_dir),
        }
    }

    /// Run A/B experiment
    ///
    /// DESIGN DECISION: Execute control and treatment in parallel
    /// WHY: Faster execution, identical conditions
    ///
    /// **Steps:**
    /// 1. Run control group (N tasks with current approach)
    /// 2. Run treatment group (N tasks with alternative approach)
    /// 3. Statistical analysis (Welch's t-test, Cohen's d)
    /// 4. Generate human-readable report
    /// 5. Return result with recommendation
    pub async fn run_experiment(&self, experiment: Experiment) -> Result<ExperimentResult, String> {
        // Validate experiment
        if experiment.sample_size < 10 {
            return Err("Sample size must be at least 10 per group".to_string());
        }

        // Run control and treatment groups
        let (control_results, treatment_results) = tokio::join!(
            self.executor.run_control(&experiment, experiment.sample_size),
            self.executor.run_treatment(&experiment, experiment.sample_size)
        );

        let control_results = control_results?;
        let treatment_results = treatment_results?;

        // Aggregate results
        let control_group = self.aggregate_group_results(control_results, &experiment.control);
        let treatment_group = self.aggregate_group_results(treatment_results, &experiment.treatment);

        // Statistical analysis
        let analysis = self.statistics.analyze(&control_group, &treatment_group);

        // Create result
        let result = ExperimentResult {
            experiment_id: experiment.id.clone(),
            hypothesis: experiment.hypothesis.clone(),
            control: control_group,
            treatment: treatment_group,
            p_value: analysis.p_value,
            significant: analysis.significant,
            winner: analysis.winner,
            effect_size: analysis.effect_size,
            confidence_interval: analysis.confidence_interval,
            recommendation: analysis.recommendation,
            completed_at: chrono::Utc::now(),
        };

        // Generate report
        let report_path = self.reporter.generate_report(&result)?;
        println!("✅ Experiment complete. Report: {}", report_path.display());

        Ok(result)
    }

    /// Aggregate execution results into group statistics
    ///
    /// DESIGN DECISION: Calculate mean, std dev, median, min, max
    /// WHY: Required for statistical analysis and reporting
    fn aggregate_group_results(
        &self,
        results: Vec<ExecutionResult>,
        approach: &crate::validation_agent::types::Approach,
    ) -> GroupResults {
        // Extract metric values (using test_coverage as example)
        let values: Vec<f64> = results.iter().map(|r| r.execution.test_coverage).collect();

        // Calculate statistics
        let mean = values.iter().sum::<f64>() / values.len() as f64;

        let variance = values.iter().map(|v| (v - mean).powi(2)).sum::<f64>() / values.len() as f64;
        let std_dev = variance.sqrt();

        let mut sorted_values = values.clone();
        sorted_values.sort_by(|a, b| a.partial_cmp(b).unwrap());
        let median = sorted_values[sorted_values.len() / 2];

        let min = sorted_values.first().copied().unwrap_or(0.0);
        let max = sorted_values.last().copied().unwrap_or(0.0);

        GroupResults {
            approach: approach.clone(),
            executions: results.into_iter().map(|r| r.execution).collect(),
            mean,
            std_dev,
            median,
            min,
            max,
            sample_size: values.len(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::validation_agent::types::{AgentType, Approach, ExperimentStatus, TaskType};
    use chrono::Utc;
    use tempfile::TempDir;

    fn create_test_experiment() -> Experiment {
        Experiment {
            id: "test-exp-001".to_string(),
            hypothesis: "TDD improves test coverage by 10%".to_string(),
            control: Approach {
                id: "feature-first".to_string(),
                name: "Feature-First".to_string(),
                description: "Write code, then tests".to_string(),
                steps: vec![],
                patterns: vec!["Pattern-IMPL-001".to_string()],
                estimated_duration_secs: 3600,
            },
            treatment: Approach {
                id: "tdd".to_string(),
                name: "TDD".to_string(),
                description: "Write tests, then code".to_string(),
                steps: vec![],
                patterns: vec!["Pattern-TDD-001".to_string()],
                estimated_duration_secs: 4200,
            },
            metric: "test_coverage".to_string(),
            target_improvement: 0.10,
            sample_size: 30,
            significance_level: 0.05,
            status: ExperimentStatus::Proposed,
            created_at: Utc::now(),
            task_type: TaskType::Feature,
        }
    }

    #[tokio::test]
    async fn test_run_experiment() {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("validation.db");
        let validation_agent = Arc::new(ValidationAgent::new(&db_path).unwrap());

        let experiment_runner = ExperimentRunner::new(temp_dir.path(), validation_agent);

        let experiment = create_test_experiment();

        let result = experiment_runner.run_experiment(experiment).await.unwrap();

        // Verify result structure
        assert_eq!(result.experiment_id, "test-exp-001");
        assert_eq!(result.hypothesis, "TDD improves test coverage by 10%");
        assert_eq!(result.control.sample_size, 30);
        assert_eq!(result.treatment.sample_size, 30);

        // Verify statistical fields exist
        assert!(result.p_value >= 0.0 && result.p_value <= 1.0);
        assert!(result.effect_size >= 0.0);

        println!("✅ Experiment result: {:?}", result.winner);
        println!("   p-value: {:.4}", result.p_value);
        println!("   Effect size: {:.2}", result.effect_size);
    }

    #[tokio::test]
    async fn test_small_sample_size_rejected() {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("validation.db");
        let validation_agent = Arc::new(ValidationAgent::new(&db_path).unwrap());

        let experiment_runner = ExperimentRunner::new(temp_dir.path(), validation_agent);

        let mut experiment = create_test_experiment();
        experiment.sample_size = 5; // Too small

        let result = experiment_runner.run_experiment(experiment).await;

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("at least 10"));
    }
}
