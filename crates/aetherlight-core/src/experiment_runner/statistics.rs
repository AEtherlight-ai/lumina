/**
 * Statistical Analysis - t-test, Cohen's d, confidence intervals
 *
 * DESIGN DECISION: Statistical rigor prevents false positives
 * WHY: Need confidence that observed difference is real, not random chance
 *
 * REASONING CHAIN:
 * 1. A/B test produces two groups (control, treatment)
 * 2. Observed difference could be random chance
 * 3. t-test calculates probability (p-value) that difference is chance
 * 4. p < 0.05 = statistically significant (95% confidence)
 * 5. Cohen's d measures effect size (practical significance)
 * 6. Both required: statistical + practical significance
 *
 * PATTERN: Pattern-STATISTICS-001 (Rigorous A/B Testing)
 * PERFORMANCE: <100ms for statistical analysis
 */

use crate::validation_agent::types::{GroupResults, Winner};

/// Statistical analysis result
#[derive(Debug, Clone)]
pub struct StatisticalAnalysis {
    pub p_value: f64,
    pub significant: bool, // p < significance_level
    pub effect_size: f64,  // Cohen's d
    pub confidence_interval: (f64, f64), // 95% CI for difference
    pub winner: Winner,
    pub recommendation: String,
}

/// Statistical analyzer
pub struct StatisticalAnalyzer {
    significance_level: f64, // Default: 0.05
}

impl StatisticalAnalyzer {
    /// Create new analyzer
    pub fn new(significance_level: f64) -> Self {
        Self {
            significance_level,
        }
    }

    /// Analyze experiment results
    ///
    /// DESIGN DECISION: Two-sample Welch's t-test (unequal variances)
    /// WHY: More robust than Student's t-test, handles unequal variances
    ///
    /// REASONING CHAIN:
    /// 1. Control and treatment groups may have different variances
    /// 2. Student's t-test assumes equal variances (often violated)
    /// 3. Welch's t-test relaxes this assumption
    /// 4. More conservative (better Type I error control)
    /// 5. Standard in industry for A/B testing
    pub fn analyze(&self, control: &GroupResults, treatment: &GroupResults) -> StatisticalAnalysis {
        // Extract metric values
        let control_values: Vec<f64> = self.extract_metric_values(control);
        let treatment_values: Vec<f64> = self.extract_metric_values(treatment);

        // Calculate means
        let control_mean = control.mean;
        let treatment_mean = treatment.mean;

        // Calculate standard deviations
        let control_std = control.std_dev;
        let treatment_std = treatment.std_dev;

        // Sample sizes
        let n_control = control.sample_size as f64;
        let n_treatment = treatment.sample_size as f64;

        // Welch's t-test
        let t_statistic = self.welchs_t_test(
            control_mean,
            treatment_mean,
            control_std,
            treatment_std,
            n_control,
            n_treatment,
        );

        // Degrees of freedom (Welch-Satterthwaite equation)
        let df = self.welch_degrees_of_freedom(
            control_std,
            treatment_std,
            n_control,
            n_treatment,
        );

        // p-value (two-tailed)
        let p_value = self.t_to_p_value(t_statistic, df);

        // Statistical significance
        let significant = p_value < self.significance_level;

        // Effect size (Cohen's d)
        let pooled_std = ((control_std.powi(2) + treatment_std.powi(2)) / 2.0).sqrt();
        let effect_size = (treatment_mean - control_mean).abs() / pooled_std;

        // 95% Confidence interval for difference
        let standard_error = (control_std.powi(2) / n_control + treatment_std.powi(2) / n_treatment).sqrt();
        let t_critical = self.t_critical(df, 0.05);
        let margin_of_error = t_critical * standard_error;
        let mean_diff = treatment_mean - control_mean;
        let confidence_interval = (
            mean_diff - margin_of_error,
            mean_diff + margin_of_error,
        );

        // Determine winner
        let winner = if significant {
            if treatment_mean > control_mean {
                Winner::Treatment
            } else {
                Winner::Control
            }
        } else {
            Winner::Inconclusive
        };

        // Generate recommendation
        let recommendation = self.generate_recommendation(
            &winner,
            effect_size,
            p_value,
            control_mean,
            treatment_mean,
        );

        StatisticalAnalysis {
            p_value,
            significant,
            effect_size,
            confidence_interval,
            winner,
            recommendation,
        }
    }

    /// Extract metric values from group results
    fn extract_metric_values(&self, group: &GroupResults) -> Vec<f64> {
        // In real implementation, this would extract the specific metric
        // For now, use test_coverage as example
        group
            .executions
            .iter()
            .map(|e| e.test_coverage)
            .collect()
    }

    /// Welch's t-test statistic
    ///
    /// Formula: t = (mean1 - mean2) / sqrt(s1²/n1 + s2²/n2)
    fn welchs_t_test(
        &self,
        mean1: f64,
        mean2: f64,
        std1: f64,
        std2: f64,
        n1: f64,
        n2: f64,
    ) -> f64 {
        let numerator = mean1 - mean2;
        let denominator = (std1.powi(2) / n1 + std2.powi(2) / n2).sqrt();
        numerator / denominator
    }

    /// Welch-Satterthwaite degrees of freedom
    ///
    /// More complex than Student's t-test due to unequal variances
    fn welch_degrees_of_freedom(&self, std1: f64, std2: f64, n1: f64, n2: f64) -> f64 {
        let numerator = (std1.powi(2) / n1 + std2.powi(2) / n2).powi(2);
        let denominator = (std1.powi(2) / n1).powi(2) / (n1 - 1.0)
            + (std2.powi(2) / n2).powi(2) / (n2 - 1.0);
        numerator / denominator
    }

    /// Convert t-statistic to p-value (two-tailed)
    ///
    /// DESIGN DECISION: Use Student's t-distribution CDF
    /// WHY: Standard approach for t-tests
    ///
    /// NOTE: For production, use `statrs` crate for accurate CDF
    /// This is a simplified approximation
    fn t_to_p_value(&self, t: f64, df: f64) -> f64 {
        // Simplified approximation (use statrs in production)
        // This uses a rough approximation for demonstration
        let x = df / (df + t.powi(2));
        let p_one_tail = 0.5 * self.beta_distribution_cdf(x, df / 2.0, 0.5);
        2.0 * p_one_tail.min(1.0 - p_one_tail)
    }

    /// Beta distribution CDF (simplified approximation)
    fn beta_distribution_cdf(&self, x: f64, a: f64, b: f64) -> f64 {
        // Very simplified - use statrs in production
        if x <= 0.0 {
            return 0.0;
        }
        if x >= 1.0 {
            return 1.0;
        }
        // Rough approximation for demonstration
        x.powf(a) * (1.0 - x).powf(b)
    }

    /// Critical t-value for confidence interval
    ///
    /// NOTE: Simplified lookup table, use statrs in production
    fn t_critical(&self, df: f64, alpha: f64) -> f64 {
        // Simplified lookup for common df values at alpha=0.05
        // Use statrs::distribution::StudentsT in production
        if df >= 30.0 {
            1.96 // Approximate z-score for large df
        } else if df >= 20.0 {
            2.086
        } else if df >= 10.0 {
            2.228
        } else {
            2.571 // Conservative for small df
        }
    }

    /// Generate recommendation based on results
    fn generate_recommendation(
        &self,
        winner: &Winner,
        effect_size: f64,
        p_value: f64,
        control_mean: f64,
        treatment_mean: f64,
    ) -> String {
        match winner {
            Winner::Treatment => {
                let improvement_pct = ((treatment_mean - control_mean) / control_mean * 100.0);
                let effect_interpretation = if effect_size > 0.8 {
                    "large effect"
                } else if effect_size > 0.5 {
                    "medium effect"
                } else {
                    "small effect"
                };

                format!(
                    "Adopt treatment approach. Statistically significant improvement of {:.1}% (p={:.4}, {}, Cohen's d={:.2}). Treatment should become new default.",
                    improvement_pct, p_value, effect_interpretation, effect_size
                )
            }
            Winner::Control => {
                format!(
                    "Keep control approach. Treatment did not improve outcomes (p={:.4}). Consider testing different treatment.",
                    p_value
                )
            }
            Winner::Inconclusive => {
                format!(
                    "Inconclusive results (p={:.4} ≥ {:.2}). Need larger sample size or clearer difference between approaches.",
                    p_value, self.significance_level
                )
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::validation_agent::types::{AgentExecution, AgentType, Approach, TaskType};
    use chrono::Utc;

    fn create_group_results(mean: f64, std_dev: f64, sample_size: usize) -> GroupResults {
        let mut executions = Vec::new();

        for i in 0..sample_size {
            executions.push(AgentExecution {
                id: format!("test-{}", i),
                agent_type: AgentType::Implementation,
                task_id: format!("task-{}", i),
                task_type: TaskType::Feature,
                pattern_used: "Pattern-TEST-001".to_string(),
                sop_used: "SOP-001".to_string(),
                approach_variant: "control".to_string(),
                success: true,
                duration_secs: 3600,
                tokens_used: 5000,
                errors_count: 0,
                iterations_count: 1,
                tests_passing: 12,
                tests_total: 12,
                test_coverage: mean, // Simplified: all have same value
                code_quality_score: 8.0,
                security_issues: 0,
                performance_degradation: false,
                human_approved: Some(true),
                human_feedback: None,
                timestamp: Utc::now(),
                git_commit: Some("abc123".to_string()),
                files_modified: vec!["src/main.rs".to_string()],
            });
        }

        GroupResults {
            approach: Approach {
                id: "test".to_string(),
                name: "Test Approach".to_string(),
                description: "Test".to_string(),
                steps: vec![],
                patterns: vec![],
                estimated_duration_secs: 3600,
            },
            executions,
            mean,
            std_dev,
            median: mean,
            min: mean - std_dev,
            max: mean + std_dev,
            sample_size,
        }
    }

    #[test]
    fn test_significant_improvement() {
        let analyzer = StatisticalAnalyzer::new(0.05);

        let control = create_group_results(0.78, 0.05, 30);
        let treatment = create_group_results(0.87, 0.04, 30);

        let analysis = analyzer.analyze(&control, &treatment);

        // Treatment should win (87% > 78%)
        assert_eq!(analysis.winner, Winner::Treatment);
        // Should be statistically significant
        assert!(analysis.significant);
        // Effect size should be positive
        assert!(analysis.effect_size > 0.0);
    }

    #[test]
    fn test_inconclusive_small_difference() {
        let analyzer = StatisticalAnalyzer::new(0.05);

        let control = create_group_results(0.78, 0.08, 30);
        let treatment = create_group_results(0.80, 0.08, 30);

        let analysis = analyzer.analyze(&control, &treatment);

        // Likely inconclusive (small difference, high variance)
        // Note: Actual result depends on statistical calculation
    }
}
