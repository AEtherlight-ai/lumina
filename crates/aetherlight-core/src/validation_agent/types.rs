/**
 * Validation Agent Core Types
 *
 * DESIGN DECISION: Meta-learning engine types for agent self-improvement
 * WHY: Agents should self-improve through A/B testing, not stagnate
 *
 * REASONING CHAIN:
 * 1. Autonomous agents execute sprints (Phase 4)
 * 2. Without meta-learning, agents repeat mistakes
 * 3. Validation Agent tracks all executions and outcomes
 * 4. Identifies process variations to A/B test
 * 5. Updates SOPs based on experiment results
 * 6. Continuous improvement loop
 *
 * PATTERN: Pattern-VALIDATION-001 (Continuous Agent Improvement)
 * RELATED: AI-007 (Shared Knowledge), AI-008 (Uncertainty)
 * PERFORMANCE: <100ms for execution recording, <500ms for analysis
 */

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Agent type classification
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum AgentType {
    Implementation,
    Test,
    Review,
    Documentation,
    Database,
    UI,
    API,
    Infrastructure,
    ProjectManager,
    Validation,
}

/// Task type classification
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum TaskType {
    Feature,
    BugFix,
    Refactor,
    Documentation,
    Performance,
    Security,
    Testing,
}

/// Agent execution record
///
/// DESIGN DECISION: Comprehensive execution tracking for meta-learning
/// WHY: Need detailed metrics to identify improvement opportunities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentExecution {
    pub id: String,
    pub agent_type: AgentType,
    pub task_id: String,
    pub task_type: TaskType,

    // Process used
    pub pattern_used: String,
    pub sop_used: String,
    pub approach_variant: String, // "A", "B", "C" for experiments

    // Outcomes
    pub success: bool,
    pub duration_secs: u64, // Use u64 instead of Duration for SQLite storage
    pub tokens_used: usize,
    pub errors_count: usize,
    pub iterations_count: usize, // How many attempts to complete

    // Quality metrics
    pub tests_passing: usize,
    pub tests_total: usize,
    pub test_coverage: f64, // 0.0 to 1.0
    pub code_quality_score: f64, // 0.0 to 10.0 (linter score)
    pub security_issues: usize,
    pub performance_degradation: bool,

    // Human feedback
    pub human_approved: Option<bool>,
    pub human_feedback: Option<String>,

    // Metadata
    pub timestamp: DateTime<Utc>,
    pub git_commit: Option<String>,
    pub files_modified: Vec<String>,
}

/// Approach used in task execution
///
/// DESIGN DECISION: Structured approach definition for A/B testing
/// WHY: Need to compare different approaches systematically
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Approach {
    pub id: String,
    pub name: String,
    pub description: String,
    pub steps: Vec<String>,
    pub patterns: Vec<String>, // Pattern IDs
    pub estimated_duration_secs: u64,
}

/// Experiment proposal
///
/// DESIGN DECISION: Scientific experiment structure with hypothesis testing
/// WHY: Rigor prevents false positives, ensures valid improvements
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Experiment {
    pub id: String,
    pub hypothesis: String,
    pub control: Approach, // Current best practice
    pub treatment: Approach, // Alternative approach
    pub metric: String, // What to measure (test_coverage, duration, errors)
    pub target_improvement: f64, // e.g., 0.10 = 10%
    pub sample_size: usize, // How many runs per group
    pub significance_level: f64, // e.g., 0.05 = p < 0.05
    pub status: ExperimentStatus,
    pub created_at: DateTime<Utc>,
    pub task_type: TaskType, // Type of tasks for experiment
}

/// Experiment execution status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ExperimentStatus {
    Proposed,
    Running,
    Complete,
    Inconclusive,
    Cancelled,
}

/// Experiment result
///
/// DESIGN DECISION: Statistical analysis with p-value and effect size
/// WHY: Need confidence in results before adopting new approaches
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExperimentResult {
    pub experiment_id: String,
    pub hypothesis: String,

    pub control: GroupResults,
    pub treatment: GroupResults,

    pub p_value: f64, // Statistical significance
    pub significant: bool, // p < significance_level
    pub winner: Winner, // Control, Treatment, or Inconclusive
    pub effect_size: f64, // Cohen's d
    pub confidence_interval: (f64, f64), // 95% CI

    pub recommendation: String,
    pub completed_at: DateTime<Utc>,
}

/// Results for control or treatment group
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupResults {
    pub approach: Approach,
    pub executions: Vec<AgentExecution>,

    // Statistical summary
    pub mean: f64,
    pub std_dev: f64,
    pub median: f64,
    pub min: f64,
    pub max: f64,
    pub sample_size: usize,
}

/// Experiment winner
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Winner {
    Control,
    Treatment,
    Inconclusive,
}

/// Analysis of execution history
///
/// DESIGN DECISION: Aggregate patterns and trends for insight
/// WHY: Identify improvement opportunities from historical data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Analysis {
    pub period: String, // "Last 30 days"
    pub total_executions: usize,

    // Performance by agent type
    pub agent_performance: Vec<AgentPerformance>,

    // Performance by task type
    pub task_performance: Vec<TaskPerformance>,

    // Pattern usage
    pub pattern_usage: Vec<PatternUsage>,

    // Identified issues
    pub bottlenecks: Vec<Bottleneck>,
    pub common_errors: Vec<CommonError>,

    // Recommendations
    pub experiment_proposals: Vec<Experiment>,
}

/// Agent performance metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentPerformance {
    pub agent_type: AgentType,
    pub executions: usize,
    pub success_rate: f64,
    pub avg_duration_secs: u64,
    pub avg_tokens: usize,
    pub avg_test_coverage: f64,
    pub trend: Trend,
}

/// Task performance metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskPerformance {
    pub task_type: TaskType,
    pub executions: usize,
    pub success_rate: f64,
    pub avg_duration_secs: u64,
    pub most_successful_pattern: String,
}

/// Pattern usage statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternUsage {
    pub pattern_id: String,
    pub usage_count: usize,
    pub success_rate: f64,
    pub avg_quality_score: f64,
}

/// Bottleneck identification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bottleneck {
    pub description: String,
    pub agent_type: AgentType,
    pub frequency: usize,
    pub avg_delay_secs: u64,
    pub suggestion: String,
}

/// Common error pattern
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommonError {
    pub error_pattern: String,
    pub frequency: usize,
    pub agent_type: AgentType,
    pub suggested_fix: String,
}

/// Performance trend direction
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Trend {
    Improving,
    Declining,
    Stable,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_agent_execution_serialization() {
        let execution = AgentExecution {
            id: "exec-001".to_string(),
            agent_type: AgentType::Implementation,
            task_id: "P4-001".to_string(),
            task_type: TaskType::Feature,
            pattern_used: "Pattern-TDD-001".to_string(),
            sop_used: "SOP-001".to_string(),
            approach_variant: "A".to_string(),
            success: true,
            duration_secs: 3600,
            tokens_used: 5000,
            errors_count: 2,
            iterations_count: 3,
            tests_passing: 12,
            tests_total: 12,
            test_coverage: 0.89,
            code_quality_score: 8.5,
            security_issues: 0,
            performance_degradation: false,
            human_approved: Some(true),
            human_feedback: Some("Good work".to_string()),
            timestamp: Utc::now(),
            git_commit: Some("abc123".to_string()),
            files_modified: vec!["src/main.rs".to_string()],
        };

        let json = serde_json::to_string(&execution).unwrap();
        let deserialized: AgentExecution = serde_json::from_str(&json).unwrap();

        assert_eq!(execution.id, deserialized.id);
        assert_eq!(execution.agent_type, deserialized.agent_type);
        assert_eq!(execution.task_id, deserialized.task_id);
    }

    #[test]
    fn test_experiment_lifecycle() {
        let experiment = Experiment {
            id: "exp-001".to_string(),
            hypothesis: "TDD improves test coverage".to_string(),
            control: Approach {
                id: "feature-first".to_string(),
                name: "Feature First".to_string(),
                description: "Write code, then tests".to_string(),
                steps: vec!["Design".to_string(), "Implement".to_string(), "Test".to_string()],
                patterns: vec!["Pattern-IMPL-001".to_string()],
                estimated_duration_secs: 3600,
            },
            treatment: Approach {
                id: "tdd".to_string(),
                name: "TDD".to_string(),
                description: "Write tests, then code".to_string(),
                steps: vec![
                    "Design".to_string(),
                    "Write tests".to_string(),
                    "Implement".to_string(),
                    "Refactor".to_string(),
                ],
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
        };

        assert_eq!(experiment.status, ExperimentStatus::Proposed);
        assert_eq!(experiment.sample_size, 30);
        assert_eq!(experiment.significance_level, 0.05);
    }
}
