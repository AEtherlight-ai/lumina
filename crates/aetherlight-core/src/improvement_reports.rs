/**
 * Improvement Reports - Regular reports showing agent performance trends
 *
 * DESIGN DECISION: Monthly reports with charts showing continuous improvement
 * WHY: Transparency for humans, validate meta-learning system is working
 *
 * REASONING CHAIN:
 * 1. Validation Agent tracks all executions and runs experiments
 * 2. Need to show humans the improvements over time
 * 3. Monthly reports aggregate trends, experiments, SOPs updated
 * 4. Charts/graphs visualize performance improvements
 * 5. Actionable recommendations for next month
 * 6. Result: Transparent continuous improvement with human oversight
 *
 * PATTERN: Pattern-REPORTING-002 (Continuous Improvement Reports)
 * PERFORMANCE: <5s to generate monthly report
 * IMPACT: Validates meta-learning ROI, guides future experiments
 */

// TODO: Implement submodules
// pub mod generator;
// pub mod visualizer;
// pub mod exporter;

use crate::validation_agent::types::{
    AgentPerformance, Analysis, Experiment, TaskPerformance, Trend,
};
use crate::sop_updater::SOPUpdate;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// Trend direction
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TrendDirection {
    Improving,
    Declining,
    Stable,
}

/// Performance trend over time
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceTrend {
    pub current: f64,
    pub previous: f64,
    pub change_pct: f64,
    pub direction: TrendDirection,
}

impl PerformanceTrend {
    pub fn new(current: f64, previous: f64) -> Self {
        let change_pct = if previous > 0.0 {
            ((current - previous) / previous) * 100.0
        } else {
            0.0
        };

        let direction = if change_pct > 5.0 {
            TrendDirection::Improving
        } else if change_pct < -5.0 {
            TrendDirection::Declining
        } else {
            TrendDirection::Stable
        };

        Self {
            current,
            previous,
            change_pct,
            direction,
        }
    }
}

/// Trend analysis for multiple metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrendAnalysis {
    pub avg_time_to_complete: PerformanceTrend,
    pub avg_tokens_used: PerformanceTrend,
    pub success_rate: PerformanceTrend,
    pub test_coverage: PerformanceTrend,
}

/// Significant finding from analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Finding {
    pub title: String,
    pub description: String,
    pub impact: String,
    pub experiment_id: String,
}

/// Recommendation for future action
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recommendation {
    pub priority: u8, // 1=high, 2=medium, 3=low
    pub title: String,
    pub description: String,
    pub estimated_impact: String,
}

/// Improvement report
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImprovementReport {
    pub period: String, // "October 2025"
    pub start_date: DateTime<Utc>,
    pub end_date: DateTime<Utc>,
    pub total_executions: usize,

    // Performance trends
    pub trends: TrendAnalysis,

    // Experiments
    pub experiments_run: Vec<Experiment>,
    pub significant_findings: Vec<Finding>,

    // SOPs updated
    pub sops_updated: Vec<SOPUpdate>,

    // Recommendations
    pub recommendations: Vec<Recommendation>,

    // Metadata
    pub generated_at: DateTime<Utc>,
}

/// Report generator
pub struct ImprovementReportGenerator {
    reports_dir: PathBuf,
}

impl ImprovementReportGenerator {
    /// Create new report generator
    ///
    /// DESIGN DECISION: Store reports in .lumina/reports/improvement/
    /// WHY: Organized by report type, version controlled
    pub fn new(workspace_root: impl Into<PathBuf>) -> Self {
        let workspace_root = workspace_root.into();
        let reports_dir = workspace_root.join(".lumina/reports/improvement");

        // Create directory
        let _ = std::fs::create_dir_all(&reports_dir);

        Self { reports_dir }
    }

    /// Generate monthly improvement report
    ///
    /// DESIGN DECISION: Aggregate last 30 days of data
    /// WHY: Monthly cadence balances timeliness vs statistical significance
    ///
    /// **Steps:**
    /// 1. Query validation agent for last 30 days
    /// 2. Query validation agent for previous 30 days (comparison)
    /// 3. Calculate trends (current vs previous)
    /// 4. Identify significant findings
    /// 5. Generate recommendations
    /// 6. Export to HTML
    pub fn generate_monthly_report(
        &self,
        current_analysis: Analysis,
        previous_analysis: Analysis,
        experiments: Vec<Experiment>,
        sop_updates: Vec<SOPUpdate>,
    ) -> Result<ImprovementReport, String> {
        let now = Utc::now();

        // Calculate trends
        let trends = self.calculate_trends(&current_analysis, &previous_analysis);

        // Extract significant findings
        let significant_findings = self.extract_findings(&experiments);

        // Generate recommendations
        let recommendations = self.generate_recommendations(&current_analysis, &trends);

        let report = ImprovementReport {
            period: format!("{}", now.format("%B %Y")),
            start_date: now - chrono::Duration::days(30),
            end_date: now,
            total_executions: current_analysis.total_executions,
            trends,
            experiments_run: experiments,
            significant_findings,
            sops_updated: sop_updates,
            recommendations,
            generated_at: now,
        };

        // Export to HTML
        let report_path = self.export_html(&report)?;
        println!("✅ Improvement report generated: {}", report_path.display());

        Ok(report)
    }

    /// Calculate performance trends
    fn calculate_trends(
        &self,
        current: &Analysis,
        previous: &Analysis,
    ) -> TrendAnalysis {
        // Calculate average metrics from current analysis
        let current_avg_duration = if current.agent_performance.is_empty() {
            0.0
        } else {
            current
                .agent_performance
                .iter()
                .map(|a| a.avg_duration_secs as f64)
                .sum::<f64>()
                / current.agent_performance.len() as f64
        };

        let previous_avg_duration = if previous.agent_performance.is_empty() {
            current_avg_duration
        } else {
            previous
                .agent_performance
                .iter()
                .map(|a| a.avg_duration_secs as f64)
                .sum::<f64>()
                / previous.agent_performance.len() as f64
        };

        let current_avg_tokens = if current.agent_performance.is_empty() {
            0.0
        } else {
            current
                .agent_performance
                .iter()
                .map(|a| a.avg_tokens as f64)
                .sum::<f64>()
                / current.agent_performance.len() as f64
        };

        let previous_avg_tokens = if previous.agent_performance.is_empty() {
            current_avg_tokens
        } else {
            previous
                .agent_performance
                .iter()
                .map(|a| a.avg_tokens as f64)
                .sum::<f64>()
                / previous.agent_performance.len() as f64
        };

        let current_success_rate = if current.agent_performance.is_empty() {
            0.0
        } else {
            current
                .agent_performance
                .iter()
                .map(|a| a.success_rate)
                .sum::<f64>()
                / current.agent_performance.len() as f64
        };

        let previous_success_rate = if previous.agent_performance.is_empty() {
            current_success_rate
        } else {
            previous
                .agent_performance
                .iter()
                .map(|a| a.success_rate)
                .sum::<f64>()
                / previous.agent_performance.len() as f64
        };

        let current_test_coverage = if current.agent_performance.is_empty() {
            0.0
        } else {
            current
                .agent_performance
                .iter()
                .map(|a| a.avg_test_coverage)
                .sum::<f64>()
                / current.agent_performance.len() as f64
        };

        let previous_test_coverage = if previous.agent_performance.is_empty() {
            current_test_coverage
        } else {
            previous
                .agent_performance
                .iter()
                .map(|a| a.avg_test_coverage)
                .sum::<f64>()
                / previous.agent_performance.len() as f64
        };

        TrendAnalysis {
            avg_time_to_complete: PerformanceTrend::new(current_avg_duration, previous_avg_duration),
            avg_tokens_used: PerformanceTrend::new(current_avg_tokens, previous_avg_tokens),
            success_rate: PerformanceTrend::new(current_success_rate, previous_success_rate),
            test_coverage: PerformanceTrend::new(current_test_coverage, previous_test_coverage),
        }
    }

    /// Extract significant findings from experiments
    fn extract_findings(&self, experiments: &[Experiment]) -> Vec<Finding> {
        experiments
            .iter()
            .filter(|exp| exp.target_improvement > 0.0)
            .map(|exp| Finding {
                title: exp.hypothesis.clone(),
                description: format!(
                    "Experiment {} tested: {}",
                    exp.id, exp.hypothesis
                ),
                impact: format!("Target improvement: {}%", exp.target_improvement * 100.0),
                experiment_id: exp.id.clone(),
            })
            .collect()
    }

    /// Generate actionable recommendations
    fn generate_recommendations(
        &self,
        analysis: &Analysis,
        trends: &TrendAnalysis,
    ) -> Vec<Recommendation> {
        let mut recommendations = Vec::new();

        // Check for declining trends
        if trends.success_rate.direction == TrendDirection::Declining {
            recommendations.push(Recommendation {
                priority: 1,
                title: "Investigate declining success rate".to_string(),
                description: format!(
                    "Success rate declined by {:.1}% this month. Review recent failures.",
                    trends.success_rate.change_pct.abs()
                ),
                estimated_impact: "High - prevents quality degradation".to_string(),
            });
        }

        // Check for bottlenecks
        if !analysis.bottlenecks.is_empty() {
            recommendations.push(Recommendation {
                priority: 2,
                title: "Address identified bottlenecks".to_string(),
                description: format!(
                    "{} bottlenecks identified. Review and experiment with alternatives.",
                    analysis.bottlenecks.len()
                ),
                estimated_impact: "Medium - improves velocity".to_string(),
            });
        }

        // Check for common errors
        if !analysis.common_errors.is_empty() {
            recommendations.push(Recommendation {
                priority: 2,
                title: "Fix common error patterns".to_string(),
                description: format!(
                    "{} recurring errors detected. Update SOPs to prevent.",
                    analysis.common_errors.len()
                ),
                estimated_impact: "Medium - reduces rework".to_string(),
            });
        }

        // Suggest new experiments
        if !analysis.experiment_proposals.is_empty() {
            recommendations.push(Recommendation {
                priority: 3,
                title: "Run proposed experiments".to_string(),
                description: format!(
                    "{} experiments proposed. Validate potential improvements.",
                    analysis.experiment_proposals.len()
                ),
                estimated_impact: "Low to Medium - continuous improvement".to_string(),
            });
        }

        recommendations
    }

    /// Export report to HTML
    fn export_html(&self, report: &ImprovementReport) -> Result<PathBuf, String> {
        let filename = format!(
            "{}-improvement-report.html",
            report.start_date.format("%Y-%m")
        );
        let report_path = self.reports_dir.join(&filename);

        let html = self.generate_html(report);

        std::fs::write(&report_path, html)
            .map_err(|e| format!("Failed to write HTML report: {}", e))?;

        Ok(report_path)
    }

    /// Generate HTML content
    fn generate_html(&self, report: &ImprovementReport) -> String {
        let mut html = String::new();

        html.push_str("<!DOCTYPE html>\n");
        html.push_str("<html>\n<head>\n");
        html.push_str("<title>ÆtherLight Improvement Report</title>\n");
        html.push_str("<style>\n");
        html.push_str("body { font-family: Arial, sans-serif; margin: 40px; }\n");
        html.push_str("h1 { color: #2c3e50; }\n");
        html.push_str("table { border-collapse: collapse; width: 100%; margin: 20px 0; }\n");
        html.push_str("th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }\n");
        html.push_str("th { background-color: #3498db; color: white; }\n");
        html.push_str(".improving { color: green; }\n");
        html.push_str(".declining { color: red; }\n");
        html.push_str(".stable { color: gray; }\n");
        html.push_str("</style>\n");
        html.push_str("</head>\n<body>\n");

        // Header
        html.push_str(&format!("<h1>Continuous Improvement Report</h1>\n"));
        html.push_str(&format!("<p><strong>Period:</strong> {}</p>\n", report.period));
        html.push_str(&format!(
            "<p><strong>Total Executions:</strong> {}</p>\n",
            report.total_executions
        ));

        // Performance Trends
        html.push_str("<h2>Performance Trends</h2>\n");
        html.push_str("<table>\n");
        html.push_str("<tr><th>Metric</th><th>Current</th><th>Previous</th><th>Change</th></tr>\n");

        let trends = &report.trends;
        html.push_str(&self.format_trend_row(
            "Avg Time to Complete (seconds)",
            &trends.avg_time_to_complete,
        ));
        html.push_str(&self.format_trend_row(
            "Avg Tokens Used",
            &trends.avg_tokens_used,
        ));
        html.push_str(&self.format_trend_row("Success Rate", &trends.success_rate));
        html.push_str(&self.format_trend_row("Test Coverage", &trends.test_coverage));

        html.push_str("</table>\n");

        // Experiments
        html.push_str("<h2>Experiments Run</h2>\n");
        if report.experiments_run.is_empty() {
            html.push_str("<p>No experiments run this period.</p>\n");
        } else {
            html.push_str("<ul>\n");
            for exp in &report.experiments_run {
                html.push_str(&format!(
                    "<li>{}: {}</li>\n",
                    exp.id, exp.hypothesis
                ));
            }
            html.push_str("</ul>\n");
        }

        // Significant Findings
        html.push_str("<h2>Significant Findings</h2>\n");
        if report.significant_findings.is_empty() {
            html.push_str("<p>No significant findings this period.</p>\n");
        } else {
            html.push_str("<ul>\n");
            for finding in &report.significant_findings {
                html.push_str(&format!("<li><strong>{}</strong>: {}</li>\n", finding.title, finding.description));
            }
            html.push_str("</ul>\n");
        }

        // SOPs Updated
        html.push_str("<h2>SOPs Updated</h2>\n");
        if report.sops_updated.is_empty() {
            html.push_str("<p>No SOPs updated this period.</p>\n");
        } else {
            html.push_str("<ul>\n");
            for sop in &report.sops_updated {
                html.push_str(&format!(
                    "<li>{:?} Agent: {} (Experiment: {})</li>\n",
                    sop.agent_type, sop.sop_section, sop.experiment_id
                ));
            }
            html.push_str("</ul>\n");
        }

        // Recommendations
        html.push_str("<h2>Recommendations</h2>\n");
        if report.recommendations.is_empty() {
            html.push_str("<p>No recommendations this period.</p>\n");
        } else {
            html.push_str("<ul>\n");
            for rec in &report.recommendations {
                let priority_label = match rec.priority {
                    1 => "HIGH",
                    2 => "MEDIUM",
                    _ => "LOW",
                };
                html.push_str(&format!(
                    "<li><strong>[{}]</strong> {}: {}</li>\n",
                    priority_label, rec.title, rec.description
                ));
            }
            html.push_str("</ul>\n");
        }

        // Footer
        html.push_str(&format!(
            "<hr>\n<p><em>Generated: {}</em></p>\n",
            report.generated_at.format("%Y-%m-%d %H:%M:%S UTC")
        ));
        html.push_str("</body>\n</html>");

        html
    }

    fn format_trend_row(&self, metric: &str, trend: &PerformanceTrend) -> String {
        let (arrow, class) = match trend.direction {
            TrendDirection::Improving => ("↑", "improving"),
            TrendDirection::Declining => ("↓", "declining"),
            TrendDirection::Stable => ("→", "stable"),
        };

        format!(
            "<tr><td>{}</td><td>{:.2}</td><td>{:.2}</td><td class=\"{}\">{} {:.1}%</td></tr>\n",
            metric, trend.current, trend.previous, class, arrow, trend.change_pct.abs()
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::validation_agent::types::{
        AgentPerformance, AgentType, Analysis, Approach, Experiment, ExperimentStatus,
        TaskPerformance, TaskType, Trend as ValidTrend,
    };
    use tempfile::TempDir;

    fn create_test_analysis(avg_duration: u64, success_rate: f64, test_coverage: f64) -> Analysis {
        Analysis {
            period: "Last 30 days".to_string(),
            total_executions: 100,
            agent_performance: vec![AgentPerformance {
                agent_type: AgentType::Implementation,
                executions: 100,
                success_rate,
                avg_duration_secs: avg_duration,
                avg_tokens: 5000,
                avg_test_coverage: test_coverage,
                trend: ValidTrend::Improving,
            }],
            task_performance: vec![],
            pattern_usage: vec![],
            bottlenecks: vec![],
            common_errors: vec![],
            experiment_proposals: vec![],
        }
    }

    #[test]
    fn test_generate_monthly_report() {
        let temp_dir = TempDir::new().unwrap();
        let generator = ImprovementReportGenerator::new(temp_dir.path());

        let current = create_test_analysis(3000, 0.90, 0.85);
        let previous = create_test_analysis(3600, 0.85, 0.78);

        let report = generator
            .generate_monthly_report(current, previous, vec![], vec![])
            .unwrap();

        assert_eq!(report.total_executions, 100);
        assert_eq!(
            report.trends.avg_time_to_complete.direction,
            TrendDirection::Improving
        );
        assert_eq!(report.trends.success_rate.direction, TrendDirection::Improving);
        assert_eq!(report.trends.test_coverage.direction, TrendDirection::Improving);
    }

    #[test]
    fn test_trend_calculation() {
        let trend = PerformanceTrend::new(90.0, 85.0);
        assert_eq!(trend.direction, TrendDirection::Improving);
        assert!((trend.change_pct - 5.88).abs() < 0.1);
    }
}
