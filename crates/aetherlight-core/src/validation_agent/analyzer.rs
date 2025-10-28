/**
 * Execution Analyzer - Analyzes history to identify patterns and opportunities
 *
 * DESIGN DECISION: Statistical analysis to find improvement opportunities
 * WHY: Data-driven insights beat intuition for process improvement
 *
 * REASONING CHAIN:
 * 1. Tracker stores all executions with metrics
 * 2. Analyzer queries history for patterns
 * 3. Identifies: bottlenecks, common errors, trends
 * 4. Proposes experiments to test hypotheses
 * 5. Feeds into continuous improvement loop
 *
 * PATTERN: Pattern-STATISTICS-001 (Data-Driven Process Improvement)
 * PERFORMANCE: <500ms for 1000 executions analysis
 */

use crate::validation_agent::tracker::ExecutionTracker;
use crate::validation_agent::types::*;
use chrono::{Duration, Utc};
use std::collections::HashMap;
use std::sync::Arc;

/// Execution analyzer
pub struct ExecutionAnalyzer {
    tracker: Arc<ExecutionTracker>,
}

impl ExecutionAnalyzer {
    pub fn new(tracker: Arc<ExecutionTracker>) -> Self {
        Self { tracker }
    }

    /// Analyze execution history for period
    ///
    /// DESIGN DECISION: 30-day default analysis window
    /// WHY: Balance between statistical significance and recency
    pub fn analyze(&self, days: i64) -> Result<Analysis, String> {
        let since = Utc::now() - Duration::days(days);
        let executions = self.tracker.get_recent(since)?;

        if executions.is_empty() {
            return Ok(Analysis {
                period: format!("Last {} days", days),
                total_executions: 0,
                agent_performance: vec![],
                task_performance: vec![],
                pattern_usage: vec![],
                bottlenecks: vec![],
                common_errors: vec![],
                experiment_proposals: vec![],
            });
        }

        let agent_performance = self.analyze_agent_performance(&executions)?;
        let task_performance = self.analyze_task_performance(&executions)?;
        let pattern_usage = self.analyze_pattern_usage(&executions)?;
        let bottlenecks = self.identify_bottlenecks(&executions)?;
        let common_errors = self.identify_common_errors(&executions)?;
        let experiment_proposals = self.propose_experiments(&executions)?;

        Ok(Analysis {
            period: format!("Last {} days", days),
            total_executions: executions.len(),
            agent_performance,
            task_performance,
            pattern_usage,
            bottlenecks,
            common_errors,
            experiment_proposals,
        })
    }

    /// Analyze agent performance
    fn analyze_agent_performance(
        &self,
        executions: &[AgentExecution],
    ) -> Result<Vec<AgentPerformance>, String> {
        let mut agent_map: HashMap<AgentType, Vec<&AgentExecution>> = HashMap::new();

        for exec in executions {
            agent_map
                .entry(exec.agent_type.clone())
                .or_insert_with(Vec::new)
                .push(exec);
        }

        let mut performance = Vec::new();

        for (agent_type, agent_execs) in agent_map {
            let executions_count = agent_execs.len();
            let success_count = agent_execs.iter().filter(|e| e.success).count();
            let success_rate = success_count as f64 / executions_count as f64;

            let avg_duration_secs = agent_execs.iter().map(|e| e.duration_secs).sum::<u64>()
                / executions_count as u64;

            let avg_tokens =
                agent_execs.iter().map(|e| e.tokens_used).sum::<usize>() / executions_count;

            let avg_test_coverage = agent_execs.iter().map(|e| e.test_coverage).sum::<f64>()
                / executions_count as f64;

            // Determine trend (simple: compare first half vs second half)
            let mid = executions_count / 2;
            let first_half_success = agent_execs[..mid].iter().filter(|e| e.success).count() as f64
                / mid as f64;
            let second_half_success =
                agent_execs[mid..].iter().filter(|e| e.success).count() as f64
                    / (executions_count - mid) as f64;

            let trend = if second_half_success > first_half_success + 0.05 {
                Trend::Improving
            } else if second_half_success < first_half_success - 0.05 {
                Trend::Declining
            } else {
                Trend::Stable
            };

            performance.push(AgentPerformance {
                agent_type,
                executions: executions_count,
                success_rate,
                avg_duration_secs,
                avg_tokens,
                avg_test_coverage,
                trend,
            });
        }

        Ok(performance)
    }

    /// Analyze task performance
    fn analyze_task_performance(
        &self,
        executions: &[AgentExecution],
    ) -> Result<Vec<TaskPerformance>, String> {
        let mut task_map: HashMap<TaskType, Vec<&AgentExecution>> = HashMap::new();

        for exec in executions {
            task_map
                .entry(exec.task_type.clone())
                .or_insert_with(Vec::new)
                .push(exec);
        }

        let mut performance = Vec::new();

        for (task_type, task_execs) in task_map {
            let executions_count = task_execs.len();
            let success_count = task_execs.iter().filter(|e| e.success).count();
            let success_rate = success_count as f64 / executions_count as f64;

            let avg_duration_secs = task_execs.iter().map(|e| e.duration_secs).sum::<u64>()
                / executions_count as u64;

            // Find most successful pattern
            let mut pattern_success: HashMap<String, (usize, usize)> = HashMap::new();
            for exec in task_execs.iter() {
                let entry = pattern_success
                    .entry(exec.pattern_used.clone())
                    .or_insert((0, 0));
                entry.0 += 1; // Total uses
                if exec.success {
                    entry.1 += 1; // Successful uses
                }
            }

            let most_successful_pattern = pattern_success
                .iter()
                .max_by(|a, b| {
                    let a_rate = a.1 .1 as f64 / a.1 .0 as f64;
                    let b_rate = b.1 .1 as f64 / b.1 .0 as f64;
                    a_rate.partial_cmp(&b_rate).unwrap()
                })
                .map(|(pattern, _)| pattern.clone())
                .unwrap_or_else(|| "Unknown".to_string());

            performance.push(TaskPerformance {
                task_type,
                executions: executions_count,
                success_rate,
                avg_duration_secs,
                most_successful_pattern,
            });
        }

        Ok(performance)
    }

    /// Analyze pattern usage
    fn analyze_pattern_usage(
        &self,
        executions: &[AgentExecution],
    ) -> Result<Vec<PatternUsage>, String> {
        let mut pattern_map: HashMap<String, Vec<&AgentExecution>> = HashMap::new();

        for exec in executions {
            pattern_map
                .entry(exec.pattern_used.clone())
                .or_insert_with(Vec::new)
                .push(exec);
        }

        let mut usage = Vec::new();

        for (pattern_id, pattern_execs) in pattern_map {
            let usage_count = pattern_execs.len();
            let success_count = pattern_execs.iter().filter(|e| e.success).count();
            let success_rate = success_count as f64 / usage_count as f64;

            let avg_quality_score = pattern_execs
                .iter()
                .map(|e| e.code_quality_score)
                .sum::<f64>()
                / usage_count as f64;

            usage.push(PatternUsage {
                pattern_id,
                usage_count,
                success_rate,
                avg_quality_score,
            });
        }

        // Sort by usage count (descending)
        usage.sort_by(|a, b| b.usage_count.cmp(&a.usage_count));

        Ok(usage)
    }

    /// Identify bottlenecks
    ///
    /// DESIGN DECISION: Bottleneck = task takes >2x avg duration
    /// WHY: Significant outliers indicate process issues
    fn identify_bottlenecks(
        &self,
        executions: &[AgentExecution],
    ) -> Result<Vec<Bottleneck>, String> {
        let avg_duration_secs =
            executions.iter().map(|e| e.duration_secs).sum::<u64>() / executions.len() as u64;

        let threshold = avg_duration_secs * 2;

        let mut bottlenecks = Vec::new();

        for exec in executions.iter() {
            if exec.duration_secs > threshold {
                bottlenecks.push(Bottleneck {
                    description: format!(
                        "Task {} took {}s (avg: {}s)",
                        exec.task_id,
                        exec.duration_secs,
                        avg_duration_secs
                    ),
                    agent_type: exec.agent_type.clone(),
                    frequency: 1, // Will aggregate later
                    avg_delay_secs: exec.duration_secs - avg_duration_secs,
                    suggestion: format!(
                        "Review approach '{}' for task type '{:?}'",
                        exec.approach_variant, exec.task_type
                    ),
                });
            }
        }

        // Aggregate by agent type
        let mut aggregated: HashMap<AgentType, Vec<Bottleneck>> = HashMap::new();
        for bottleneck in bottlenecks {
            aggregated
                .entry(bottleneck.agent_type.clone())
                .or_insert_with(Vec::new)
                .push(bottleneck);
        }

        let mut final_bottlenecks = Vec::new();
        for (agent_type, bottlenecks_list) in aggregated {
            if bottlenecks_list.len() >= 3 {
                // Only report if frequent (3+ occurrences)
                let total_delay = bottlenecks_list
                    .iter()
                    .map(|b| b.avg_delay_secs)
                    .sum::<u64>();
                let avg_delay_secs = total_delay / bottlenecks_list.len() as u64;

                final_bottlenecks.push(Bottleneck {
                    description: format!(
                        "{:?} agent frequently exceeds expected duration",
                        agent_type
                    ),
                    agent_type,
                    frequency: bottlenecks_list.len(),
                    avg_delay_secs,
                    suggestion: "Consider A/B testing faster approaches".to_string(),
                });
            }
        }

        Ok(final_bottlenecks)
    }

    /// Identify common errors
    fn identify_common_errors(
        &self,
        executions: &[AgentExecution],
    ) -> Result<Vec<CommonError>, String> {
        let mut error_map: HashMap<AgentType, Vec<&AgentExecution>> = HashMap::new();

        for exec in executions.iter().filter(|e| e.errors_count > 0) {
            error_map
                .entry(exec.agent_type.clone())
                .or_insert_with(Vec::new)
                .push(exec);
        }

        let mut common_errors = Vec::new();

        for (agent_type, error_execs) in error_map {
            if error_execs.len() >= 5 {
                // Only report if frequent
                common_errors.push(CommonError {
                    error_pattern: format!("{:?} agent encountering errors", agent_type),
                    frequency: error_execs.len(),
                    agent_type: agent_type.clone(),
                    suggested_fix: "Review error logs and update SOPs".to_string(),
                });
            }
        }

        Ok(common_errors)
    }

    /// Propose experiments based on analysis
    ///
    /// DESIGN DECISION: Auto-propose experiments when patterns detected
    /// WHY: Continuous improvement should be proactive, not reactive
    fn propose_experiments(
        &self,
        executions: &[AgentExecution],
    ) -> Result<Vec<Experiment>, String> {
        let mut proposals = Vec::new();

        // Check if any pattern has significantly different success rates
        let pattern_usage = self.analyze_pattern_usage(executions)?;

        if pattern_usage.len() >= 2 {
            // Find best and worst patterns
            let best = pattern_usage.iter().max_by(|a, b| {
                a.success_rate
                    .partial_cmp(&b.success_rate)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });

            let worst = pattern_usage.iter().min_by(|a, b| {
                a.success_rate
                    .partial_cmp(&b.success_rate)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });

            if let (Some(best), Some(worst)) = (best, worst) {
                if best.success_rate > worst.success_rate + 0.15 {
                    // 15% difference
                    proposals.push(Experiment {
                        id: format!("exp-{}", Utc::now().timestamp()),
                        hypothesis: format!(
                            "Pattern '{}' improves success rate vs '{}'",
                            best.pattern_id, worst.pattern_id
                        ),
                        control: Approach {
                            id: worst.pattern_id.clone(),
                            name: format!("Current: {}", worst.pattern_id),
                            description: "Current approach".to_string(),
                            steps: vec![],
                            patterns: vec![worst.pattern_id.clone()],
                            estimated_duration_secs: 3600, // 1 hour
                        },
                        treatment: Approach {
                            id: best.pattern_id.clone(),
                            name: format!("Treatment: {}", best.pattern_id),
                            description: "Better performing approach".to_string(),
                            steps: vec![],
                            patterns: vec![best.pattern_id.clone()],
                            estimated_duration_secs: 3600, // 1 hour
                        },
                        metric: "success_rate".to_string(),
                        target_improvement: 0.15,
                        sample_size: 30,
                        significance_level: 0.05,
                        status: ExperimentStatus::Proposed,
                        created_at: Utc::now(),
                        task_type: TaskType::Feature, // Default to Feature for comparison experiments
                    });
                }
            }
        }

        Ok(proposals)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::validation_agent::tracker::ExecutionTracker;
    use tempfile::NamedTempFile;

    fn create_test_execution(id: &str, success: bool, duration_secs: u64) -> AgentExecution {
        AgentExecution {
            id: id.to_string(),
            agent_type: AgentType::Implementation,
            task_id: format!("task-{}", id),
            task_type: TaskType::Feature,
            pattern_used: "Pattern-TDD-001".to_string(),
            sop_used: "SOP-001".to_string(),
            approach_variant: "A".to_string(),
            success,
            duration_secs,
            tokens_used: 5000,
            errors_count: if success { 0 } else { 2 },
            iterations_count: 1,
            tests_passing: 12,
            tests_total: 12,
            test_coverage: 0.89,
            code_quality_score: 8.5,
            security_issues: 0,
            performance_degradation: false,
            human_approved: Some(true),
            human_feedback: None,
            timestamp: Utc::now(),
            git_commit: Some("abc123".to_string()),
            files_modified: vec!["src/main.rs".to_string()],
        }
    }

    #[test]
    fn test_analyzer_with_data() {
        let temp_file = NamedTempFile::new().unwrap();
        let tracker = Arc::new(ExecutionTracker::new(temp_file.path()).unwrap());

        // Add test executions
        tracker
            .record(&create_test_execution("1", true, 3600))
            .unwrap();
        tracker
            .record(&create_test_execution("2", true, 3700))
            .unwrap();
        tracker
            .record(&create_test_execution("3", false, 5000))
            .unwrap();

        let analyzer = ExecutionAnalyzer::new(tracker);
        let analysis = analyzer.analyze(30).unwrap();

        assert_eq!(analysis.total_executions, 3);
        assert!(!analysis.agent_performance.is_empty());
        assert!(!analysis.task_performance.is_empty());
    }
}
