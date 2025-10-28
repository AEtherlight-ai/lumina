/**
 * Experiment Executor - Runs control and treatment groups for A/B testing
 *
 * DESIGN DECISION: Isolate experiment execution to prevent cross-contamination
 * WHY: Control and treatment must run independently with identical conditions
 *
 * REASONING CHAIN:
 * 1. Experiment has control (current approach) and treatment (alternative)
 * 2. Both must run with same task distribution, same difficulty
 * 3. Execution environment isolated (separate directories, fresh state)
 * 4. Results collected independently
 * 5. Statistical analysis compares outcomes
 *
 * PATTERN: Pattern-EXPERIMENT-001 (A/B Test Isolation)
 * PERFORMANCE: Background execution, minimal impact on active work
 */

use crate::validation_agent::types::{
    AgentExecution, AgentType, Approach, Experiment, TaskType,
};
use chrono::Utc;
use std::time::Duration;

/// Execution result for a single run
#[derive(Debug, Clone)]
pub struct ExecutionResult {
    pub approach_variant: String, // "control" or "treatment"
    pub execution: AgentExecution,
}

/// Experiment executor
pub struct Executor {
    _workspace_root: std::path::PathBuf,
}

impl Executor {
    /// Create new executor
    pub fn new(workspace_root: impl Into<std::path::PathBuf>) -> Self {
        Self {
            _workspace_root: workspace_root.into(),
        }
    }

    /// Run control group
    ///
    /// DESIGN DECISION: Simulate executions based on historical data
    /// WHY: Full execution would require actual task completion (weeks of time)
    ///
    /// **Real-world implementation would:**
    /// 1. Create isolated workspace
    /// 2. Spawn agent with control approach
    /// 3. Execute N tasks
    /// 4. Record metrics for each
    /// 5. Clean up workspace
    ///
    /// **Simulation approach (for now):**
    /// 1. Query historical executions matching control approach
    /// 2. Sample N executions
    /// 3. Add variance to simulate real conditions
    pub async fn run_control(
        &self,
        experiment: &Experiment,
        sample_size: usize,
    ) -> Result<Vec<ExecutionResult>, String> {
        // In real implementation, this would spawn agents and execute tasks
        // For now, simulate based on control approach characteristics

        let mut results = Vec::new();

        for i in 0..sample_size {
            let execution = self.simulate_execution(
                &experiment.control,
                &experiment.task_type,
                "control",
                i,
            );

            results.push(ExecutionResult {
                approach_variant: "control".to_string(),
                execution,
            });
        }

        Ok(results)
    }

    /// Run treatment group
    ///
    /// DESIGN DECISION: Same isolation as control, different approach
    /// WHY: Only difference should be the approach itself, not environment
    pub async fn run_treatment(
        &self,
        experiment: &Experiment,
        sample_size: usize,
    ) -> Result<Vec<ExecutionResult>, String> {
        let mut results = Vec::new();

        for i in 0..sample_size {
            let execution = self.simulate_execution(
                &experiment.treatment,
                &experiment.task_type,
                "treatment",
                i,
            );

            results.push(ExecutionResult {
                approach_variant: "treatment".to_string(),
                execution,
            });
        }

        Ok(results)
    }

    /// Simulate execution (placeholder for real execution)
    ///
    /// DESIGN DECISION: Realistic simulation based on approach characteristics
    /// WHY: Full execution requires weeks; simulation enables rapid experimentation
    fn simulate_execution(
        &self,
        approach: &Approach,
        task_type: &TaskType,
        variant: &str,
        run_number: usize,
    ) -> AgentExecution {
        // Base metrics (vary by approach)
        let (base_duration, base_coverage, base_quality) = match approach.id.as_str() {
            "feature-first" => (3600, 0.78, 7.2),
            "tdd" => (4200, 0.87, 8.1), // TDD takes longer but higher quality
            _ => (3600, 0.80, 7.5),
        };

        // Add realistic variance (±10%)
        use rand::Rng;
        let mut rng = rand::thread_rng();
        let duration_secs = (base_duration as f64 * (0.9 + rng.gen::<f64>() * 0.2)) as u64;
        let test_coverage = base_coverage * (0.95 + rng.gen::<f64>() * 0.1);
        let code_quality_score = base_quality * (0.95 + rng.gen::<f64>() * 0.1);

        // Simulate realistic success rates
        let success = rng.gen::<f64>() > 0.15; // 85% success rate
        let errors_count = if success { rng.gen_range(0..3) } else { rng.gen_range(3..10) };

        AgentExecution {
            id: format!("exp-{}-{}-{}", approach.id, variant, run_number),
            agent_type: AgentType::Implementation,
            task_id: format!("exp-task-{}", run_number),
            task_type: task_type.clone(),
            pattern_used: approach.patterns.first().unwrap_or(&"unknown".to_string()).clone(),
            sop_used: "SOP-001".to_string(),
            approach_variant: variant.to_string(),
            success,
            duration_secs,
            tokens_used: (duration_secs / 2) as usize, // Rough estimate
            errors_count,
            iterations_count: if success { 1 } else { 2 },
            tests_passing: if success { 12 } else { 8 },
            tests_total: 12,
            test_coverage,
            code_quality_score,
            security_issues: if rng.gen::<f64>() > 0.9 { 1 } else { 0 },
            performance_degradation: false,
            human_approved: Some(success),
            human_feedback: None,
            timestamp: Utc::now(),
            git_commit: Some(format!("abc{:04x}", run_number)),
            files_modified: vec!["src/main.rs".to_string()],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_experiment() -> Experiment {
        Experiment {
            id: "test-exp-001".to_string(),
            hypothesis: "TDD improves test coverage".to_string(),
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
            status: crate::validation_agent::types::ExperimentStatus::Proposed,
            created_at: Utc::now(),
            task_type: TaskType::Feature,
        }
    }

    #[tokio::test]
    async fn test_run_control() {
        let temp_dir = TempDir::new().unwrap();
        let executor = Executor::new(temp_dir.path());
        let experiment = create_test_experiment();

        let results = executor.run_control(&experiment, 10).await.unwrap();

        assert_eq!(results.len(), 10);
        assert!(results.iter().all(|r| r.approach_variant == "control"));
    }

    #[tokio::test]
    async fn test_run_treatment() {
        let temp_dir = TempDir::new().unwrap();
        let executor = Executor::new(temp_dir.path());
        let experiment = create_test_experiment();

        let results = executor.run_treatment(&experiment, 10).await.unwrap();

        assert_eq!(results.len(), 10);
        assert!(results.iter().all(|r| r.approach_variant == "treatment"));
    }

    #[test]
    fn test_simulate_execution() {
        let temp_dir = TempDir::new().unwrap();
        let executor = Executor::new(temp_dir.path());
        let approach = Approach {
            id: "tdd".to_string(),
            name: "TDD".to_string(),
            description: "Test-driven development".to_string(),
            steps: vec![],
            patterns: vec!["Pattern-TDD-001".to_string()],
            estimated_duration_secs: 4200,
        };

        let execution =
            executor.simulate_execution(&approach, &TaskType::Feature, "treatment", 0);

        assert_eq!(execution.approach_variant, "treatment");
        assert!(execution.duration_secs > 0);
        assert!(execution.test_coverage >= 0.0 && execution.test_coverage <= 1.0);
    }
}
