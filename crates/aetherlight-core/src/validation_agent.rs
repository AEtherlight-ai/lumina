/**
 * Validation Agent - Meta-learning engine for agent self-improvement
 *
 * DESIGN DECISION: Continuous improvement through A/B testing and automated SOP updates
 * WHY: Agents should self-improve, not stagnate
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
 * PERFORMANCE: <100ms execution recording, <500ms analysis
 * IMPACT: 2-3 process improvements per month, automated SOP updates
 */

pub mod analyzer;
pub mod tracker;
pub mod types;

use crate::shared_knowledge::SharedKnowledge;
use analyzer::ExecutionAnalyzer;
use std::path::PathBuf;
use std::sync::Arc;
use tracker::ExecutionTracker;
use types::*;

/// Validation Agent facade
///
/// DESIGN DECISION: Facade pattern for simple public API
/// WHY: Hide complexity of tracker + analyzer, provide unified interface
pub struct ValidationAgent {
    tracker: Arc<ExecutionTracker>,
    analyzer: ExecutionAnalyzer,
    shared_knowledge: Option<Arc<SharedKnowledge>>,
}

impl ValidationAgent {
    /// Create new Validation Agent
    ///
    /// DESIGN DECISION: Store execution database in .lumina/validation/
    /// WHY: Consistent with other ÆtherLight data storage locations
    pub fn new(db_path: impl Into<PathBuf>) -> Result<Self, String> {
        let tracker = Arc::new(ExecutionTracker::new(db_path)?);
        let analyzer = ExecutionAnalyzer::new(tracker.clone());

        Ok(Self {
            tracker,
            analyzer,
            shared_knowledge: None,
        })
    }

    /// Create with shared knowledge integration
    ///
    /// DESIGN DECISION: Optional SharedKnowledge integration
    /// WHY: Enables cross-agent learning from discoveries
    pub fn with_shared_knowledge(mut self, shared_knowledge: Arc<SharedKnowledge>) -> Self {
        self.shared_knowledge = Some(shared_knowledge);
        self
    }

    /// Record agent execution
    ///
    /// DESIGN DECISION: Public API for all agents to call after task completion
    /// WHY: Every execution becomes training data for improvement
    ///
    /// **Example Usage:**
    /// ```rust
    /// // After Implementation Agent completes task
    /// validation_agent.record_execution(AgentExecution {
    ///     agent_type: AgentType::Implementation,
    ///     task_type: TaskType::Feature,
    ///     pattern_used: "Pattern-TDD-001",
    ///     duration: Duration::from_secs(3600),
    ///     success: true,
    ///     tests_passing: 12,
    ///     test_coverage: 0.89,
    ///     // ... other metrics
    /// }).await?;
    /// ```
    pub fn record_execution(&self, execution: AgentExecution) -> Result<(), String> {
        self.tracker.record(&execution)?;

        // If execution discovered something interesting, record in shared knowledge
        if let Some(ref shared_knowledge) = self.shared_knowledge {
            // Check for significant discoveries (e.g., high quality despite errors)
            if execution.errors_count > 0 && execution.code_quality_score > 8.0 {
                // This is interesting - recovered well from errors
                let _ = tokio::runtime::Handle::try_current()
                    .ok()
                    .and_then(|_| {
                        tokio::task::block_in_place(|| {
                            tokio::runtime::Handle::current().block_on(shared_knowledge.record(
                                crate::shared_knowledge::Discovery::BestPractice {
                                    description: format!(
                                        "Pattern '{}' recovers well from errors",
                                        execution.pattern_used
                                    ),
                                    domain: "error-recovery".to_string(),
                                    rationale: format!(
                                        "Task {} had {} errors but achieved quality score {}",
                                        execution.task_id, execution.errors_count, execution.code_quality_score
                                    ),
                                    tags: vec![
                                        "error-handling".to_string(),
                                        execution.pattern_used.clone(),
                                    ],
                                },
                                format!("{:?}-agent", execution.agent_type),
                                vec![],
                                Some("validation".to_string()),
                            ))
                        })
                        .ok()
                    });
            }
        }

        Ok(())
    }

    /// Analyze execution history
    ///
    /// DESIGN DECISION: 30-day default analysis window
    /// WHY: Balance between statistical significance and recency
    ///
    /// **Example Usage:**
    /// ```rust
    /// let analysis = validation_agent.analyze_history(30).await?;
    ///
    /// // Shows:
    /// // - Performance trends by agent type
    /// // - Bottlenecks (tasks taking >2x avg duration)
    /// // - Common errors
    /// // - Experiment proposals
    /// ```
    pub fn analyze_history(&self, days: i64) -> Result<Analysis, String> {
        self.analyzer.analyze(days)
    }

    /// Propose experiments based on history
    ///
    /// DESIGN DECISION: Auto-propose experiments when patterns detected
    /// WHY: Continuous improvement should be proactive, not reactive
    ///
    /// **Returns:** Vec<Experiment> with:
    /// - Hypothesis (what we're testing)
    /// - Control (current approach)
    /// - Treatment (alternative approach)
    /// - Metric (what to measure)
    /// - Sample size (how many runs)
    ///
    /// **Example:**
    /// ```rust
    /// let experiments = validation_agent.propose_experiments().await?;
    ///
    /// // Example experiment:
    /// // Hypothesis: "TDD improves test coverage"
    /// // Control: Write tests after implementation
    /// // Treatment: Write tests before implementation (TDD)
    /// // Metric: test_coverage
    /// // Target: 10% improvement
    /// // Sample: 30 tasks each
    /// ```
    pub fn propose_experiments(&self) -> Result<Vec<Experiment>, String> {
        let analysis = self.analyzer.analyze(30)?;
        Ok(analysis.experiment_proposals)
    }

    /// Get execution by ID
    pub fn get_execution(&self, id: &str) -> Result<Option<AgentExecution>, String> {
        self.tracker.get(id)
    }

    /// Get executions by agent type
    ///
    /// **Example Usage:**
    /// ```rust
    /// let impl_executions = validation_agent
    ///     .get_by_agent(AgentType::Implementation)
    ///     .await?;
    ///
    /// // Analyze Implementation Agent performance specifically
    /// ```
    pub fn get_by_agent(&self, agent_type: AgentType) -> Result<Vec<AgentExecution>, String> {
        self.tracker.get_by_agent(agent_type)
    }

    /// Get execution statistics
    ///
    /// **Returns:**
    /// - Total executions
    /// - Success rate
    /// - Average duration
    /// - Average tokens used
    /// - Average test coverage
    pub fn get_statistics(&self) -> Result<tracker::ExecutionStatistics, String> {
        self.tracker.get_statistics()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use tempfile::NamedTempFile;

    fn create_test_execution() -> AgentExecution {
        AgentExecution {
            id: "test-001".to_string(),
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
        }
    }

    #[test]
    fn test_validation_agent_creation() {
        let temp_file = NamedTempFile::new().unwrap();
        let agent = ValidationAgent::new(temp_file.path()).unwrap();

        assert!(agent.shared_knowledge.is_none());
    }

    #[test]
    fn test_record_and_retrieve() {
        let temp_file = NamedTempFile::new().unwrap();
        let agent = ValidationAgent::new(temp_file.path()).unwrap();

        let execution = create_test_execution();
        agent.record_execution(execution.clone()).unwrap();

        let retrieved = agent.get_execution(&execution.id).unwrap();
        assert!(retrieved.is_some());

        let retrieved = retrieved.unwrap();
        assert_eq!(retrieved.id, execution.id);
        assert_eq!(retrieved.success, execution.success);
    }

    #[test]
    fn test_analyze_history() {
        let temp_file = NamedTempFile::new().unwrap();
        let agent = ValidationAgent::new(temp_file.path()).unwrap();

        let execution = create_test_execution();
        agent.record_execution(execution).unwrap();

        let analysis = agent.analyze_history(30).unwrap();
        assert_eq!(analysis.total_executions, 1);
        assert!(!analysis.agent_performance.is_empty());
    }

    #[test]
    fn test_statistics() {
        let temp_file = NamedTempFile::new().unwrap();
        let agent = ValidationAgent::new(temp_file.path()).unwrap();

        let execution = create_test_execution();
        agent.record_execution(execution).unwrap();

        let stats = agent.get_statistics().unwrap();
        assert_eq!(stats.total_executions, 1);
        assert_eq!(stats.successful_executions, 1);
    }
}
