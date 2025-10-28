/**
 * Pattern Validator - Orchestrates Multi-Layer Validation
 *
 * DESIGN DECISION: Orchestrator pattern for validation workflow
 * WHY: Separate concerns (quality vs security) while providing unified API
 *
 * REASONING CHAIN:
 * 1. Quality checks and security scans have different priorities
 * 2. Quality issues may be acceptable (Medium/Low severity)
 * 3. Security issues are zero-tolerance (any Critical = rejection)
 * 4. Human review required for ambiguous cases
 * 5. Orchestrator coordinates all checks, determines final status
 *
 * PATTERN: Pattern-VALIDATION-001 (Quality-First Pattern Curation)
 * RELATED: quality.rs, security.rs, SOP-006 (Pattern Library Management)
 * FUTURE: Machine learning confidence scoring, automated anti-pattern detection
 */

use crate::{Pattern, Result};
use super::{QualityChecker, QualityIssue, Severity};
use super::{SecurityScanner, SecurityIssue, SecuritySeverity};

#[derive(Debug, Clone, PartialEq)]
pub enum ValidationStatus {
    /// Pattern approved automatically (no critical issues)
    Approved,

    /// Pattern rejected automatically (critical issues found)
    Rejected,

    /// Pattern needs human review (ambiguous quality or minor security issues)
    NeedsHumanReview,
}

#[derive(Debug, Clone)]
pub struct ValidationResult {
    pub status: ValidationStatus,
    pub quality_issues: Vec<QualityIssue>,
    pub security_issues: Vec<SecurityIssue>,
    pub human_review_reason: Option<String>,
}

pub struct PatternValidator {
    quality_checker: QualityChecker,
    security_scanner: SecurityScanner,
}

impl PatternValidator {
    /**
     * Create a new PatternValidator
     *
     * DESIGN DECISION: Stateless validator with owned checkers
     * WHY: Thread-safe, no shared mutable state, easy to parallelize
     */
    pub fn new() -> Self {
        Self {
            quality_checker: QualityChecker::new(),
            security_scanner: SecurityScanner::new(),
        }
    }

    /**
     * Validate a pattern through all layers
     *
     * DESIGN DECISION: Zero tolerance for Critical/High security issues
     * WHY: Security > Convenience. Better to reject good pattern than approve bad one.
     *
     * REASONING CHAIN:
     * 1. Run quality checks (all issues collected)
     * 2. Run security scan (zero tolerance for vulnerabilities)
     * 3. Evaluate quality issues (Critical = human review, others = approved with warnings)
     * 4. Evaluate security issues (Critical/High = rejection, Medium/Low = human review)
     * 5. Combine results into ValidationResult
     * 6. Return status (Approved/Rejected/NeedsHumanReview)
     *
     * PATTERN: Pattern-VALIDATION-001 (Quality-First Pattern Curation)
     * PERFORMANCE: O(n) where n = pattern content length (linear scan)
     */
    pub fn validate(&self, pattern: &Pattern) -> Result<ValidationResult> {
        // Step 1: Run quality checks
        let quality_issues = self.quality_checker.check(pattern)?;

        // Step 2: Run security scan
        let security_issues = self.security_scanner.scan(pattern)?;

        // Step 3: Evaluate quality issues
        let has_critical_quality = quality_issues.iter()
            .any(|issue| issue.severity == Severity::Critical);

        // Step 4: Evaluate security issues
        let has_critical_security = security_issues.iter()
            .any(|issue| matches!(issue.severity, SecuritySeverity::Critical | SecuritySeverity::High));

        // Step 5: Determine validation status
        let (status, human_review_reason) = if has_critical_security {
            // ZERO TOLERANCE: Any Critical/High security issue = automatic rejection
            (
                ValidationStatus::Rejected,
                Some(format!(
                    "Critical security issues found: {}",
                    security_issues.iter()
                        .filter(|i| matches!(i.severity, SecuritySeverity::Critical | SecuritySeverity::High))
                        .map(|i| i.vulnerability_type.as_str())
                        .collect::<Vec<_>>()
                        .join(", ")
                ))
            )
        } else if has_critical_quality {
            // Critical quality issues require human review
            (
                ValidationStatus::NeedsHumanReview,
                Some(format!(
                    "Critical quality issues found: {}",
                    quality_issues.iter()
                        .filter(|i| i.severity == Severity::Critical)
                        .map(|i| format!("{:?}", i.issue_type))
                        .collect::<Vec<_>>()
                        .join(", ")
                ))
            )
        } else if !security_issues.is_empty() {
            // Medium/Low security issues require human review
            (
                ValidationStatus::NeedsHumanReview,
                Some(format!(
                    "Security concerns require review: {}",
                    security_issues.iter()
                        .map(|i| i.vulnerability_type.as_str())
                        .collect::<Vec<_>>()
                        .join(", ")
                ))
            )
        } else if !quality_issues.is_empty() {
            // Non-critical quality issues = approved with warnings
            (
                ValidationStatus::Approved,
                None
            )
        } else {
            // No issues = automatic approval
            (
                ValidationStatus::Approved,
                None
            )
        };

        Ok(ValidationResult {
            status,
            quality_issues,
            security_issues,
            human_review_reason,
        })
    }

    /**
     * Get validation summary statistics
     *
     * DESIGN DECISION: Separate stats method for reporting/metrics
     * WHY: Validation workflow shouldn't be cluttered with stats logic
     */
    pub fn get_validation_stats(&self, result: &ValidationResult) -> ValidationStats {
        ValidationStats {
            total_issues: result.quality_issues.len() + result.security_issues.len(),
            critical_quality: result.quality_issues.iter()
                .filter(|i| i.severity == Severity::Critical)
                .count(),
            high_quality: result.quality_issues.iter()
                .filter(|i| i.severity == Severity::High)
                .count(),
            critical_security: result.security_issues.iter()
                .filter(|i| i.severity == SecuritySeverity::Critical)
                .count(),
            high_security: result.security_issues.iter()
                .filter(|i| i.severity == SecuritySeverity::High)
                .count(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct ValidationStats {
    pub total_issues: usize,
    pub critical_quality: usize,
    pub high_quality: usize,
    pub critical_security: usize,
    pub high_security: usize,
}

impl Default for PatternValidator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Pattern;

    #[test]
    fn test_clean_pattern_approved() {
        let validator = PatternValidator::new();

        let pattern = Pattern::builder()
            .title("Rust Error Handling Pattern")
            .content("This pattern demonstrates proper error handling in Rust using Result<T, E>. Always prefer Result over panic! for recoverable errors. Example:\n\n```rust\nfn read_file(path: &str) -> Result<String, std::io::Error> {\n    std::fs::read_to_string(path)\n}\n```\n\nThis approach allows callers to handle errors gracefully.")
            .tags(vec!["rust", "error-handling"])
            .language("rust")
            .domain("error-handling")
            .build()
            .unwrap();

        let result = validator.validate(&pattern).unwrap();

        assert_eq!(result.status, ValidationStatus::Approved);
        assert!(result.quality_issues.is_empty() || result.quality_issues.iter().all(|i| i.severity != Severity::Critical));
        assert!(result.security_issues.is_empty());
        assert!(result.human_review_reason.is_none());
    }

    #[test]
    fn test_security_issue_rejected() {
        let validator = PatternValidator::new();

        let pattern = Pattern::builder()
            .title("Bad SQL Pattern")
            .content("SELECT * FROM users WHERE name = \" + userName")
            .tags(vec!["sql"])
            .build()
            .unwrap();

        let result = validator.validate(&pattern).unwrap();

        assert_eq!(result.status, ValidationStatus::Rejected);
        assert!(!result.security_issues.is_empty());
        assert!(result.human_review_reason.is_some());
        assert!(result.human_review_reason.as_ref().unwrap().contains("SQL Injection"));
    }

    #[test]
    fn test_critical_quality_needs_review() {
        let validator = PatternValidator::new();

        let pattern = Pattern::builder()
            .title("AB")  // Too short (Critical quality issue)
            .content("This is valid content that meets the minimum length requirement of fifty characters.")
            .tags(vec!["test"])
            .build()
            .unwrap();

        let result = validator.validate(&pattern).unwrap();

        assert_eq!(result.status, ValidationStatus::NeedsHumanReview);
        assert!(result.quality_issues.iter().any(|i| i.severity == Severity::Critical));
        assert!(result.human_review_reason.is_some());
    }

    #[test]
    fn test_validation_stats() {
        let validator = PatternValidator::new();

        let pattern = Pattern::builder()
            .title("AB")  // Critical quality issue
            .content("Short")  // Critical quality issue
            .tags(vec!["test"])
            .build()
            .unwrap();

        let result = validator.validate(&pattern).unwrap();
        let stats = validator.get_validation_stats(&result);

        assert!(stats.total_issues >= 2);
        assert!(stats.critical_quality >= 2);
    }

    #[test]
    fn test_medium_security_needs_review() {
        let validator = PatternValidator::new();

        let pattern = Pattern::builder()
            .title("Random Number Generation")
            .content("Use Math.random() to generate random numbers for security tokens.")
            .tags(vec!["javascript", "security"])
            .build()
            .unwrap();

        let result = validator.validate(&pattern).unwrap();

        // Medium security issue (insecure randomness) should trigger human review
        assert_eq!(result.status, ValidationStatus::NeedsHumanReview);
        assert!(!result.security_issues.is_empty());
        assert!(result.human_review_reason.is_some());
    }

    #[test]
    fn test_approved_with_warnings() {
        let validator = PatternValidator::new();

        let pattern = Pattern::builder()
            .title("Good Pattern with Minor Issues")
            .content("This is a valid pattern that meets all critical requirements. It has sufficient length, proper structure, and no security issues. However, it might have some minor quality issues that don't prevent approval.")
            .tags(vec!["test", "example"])
            .build()
            .unwrap();

        let result = validator.validate(&pattern).unwrap();

        // Should be approved even with minor (non-critical) quality issues
        if !result.quality_issues.is_empty() {
            assert_eq!(result.status, ValidationStatus::Approved);
            assert!(result.quality_issues.iter().all(|i| i.severity != Severity::Critical));
        }
    }
}
