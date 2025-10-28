/**
 * Quality Checker for Pattern Validation
 *
 * DESIGN DECISION: Automated quality checks for pattern content
 * WHY: Catch obvious quality issues before human review (save reviewer time)
 *
 * REASONING CHAIN:
 * 1. Quality issues slow down human review process
 * 2. Many issues are programmatically detectable (empty fields, too short, no examples)
 * 3. Automated pre-screening filters out obviously bad patterns
 * 4. Human reviewers focus on subtle issues (correctness, anti-patterns)
 * 5. Result: Higher throughput, better pattern quality
 *
 * PATTERN: Pattern-VALIDATION-001 (Quality-First Pattern Curation)
 * RELATED: validator.rs (PatternValidator orchestrates quality checks)
 */

use crate::{Pattern, Result};

#[derive(Debug, Clone, PartialEq)]
pub enum Severity {
    Critical,   // Must fix before approval
    High,       // Should fix, but not blocking
    Medium,     // Nice to fix
    Low,        // Suggestion only
}

#[derive(Debug, Clone)]
pub enum QualityIssueType {
    TitleTooShort,
    TitleTooLong,
    ContentTooShort,
    ContentTooLong,
    NoTags,
    TooManyTags,
    NoMetadata,
    LowContentQuality,
    SuspiciousContent,
}

#[derive(Debug, Clone)]
pub struct QualityIssue {
    pub issue_type: QualityIssueType,
    pub severity: Severity,
    pub message: String,
}

pub struct QualityChecker;

impl QualityChecker {
    /**
     * Create a new QualityChecker instance
     *
     * DESIGN DECISION: Stateless quality checker
     * WHY: No mutable state needed, pure validation logic
     */
    pub fn new() -> Self {
        Self
    }

    /**
     * Check pattern quality
     *
     * DESIGN DECISION: Return all issues, not just first failure
     * WHY: Human reviewer can fix multiple issues at once
     *
     * REASONING CHAIN:
     * 1. Check title length (3-100 chars)
     * 2. Check content length (50-10000 chars)
     * 3. Check tags (1-20 tags)
     * 4. Check metadata completeness
     * 5. Check content quality score (readability, grammar)
     * 6. Collect ALL issues, return sorted by severity
     */
    pub fn check(&self, pattern: &Pattern) -> Result<Vec<QualityIssue>> {
        let mut issues = Vec::new();

        // Check 1: Title length
        let title = pattern.title();
        if title.len() < 3 {
            issues.push(QualityIssue {
                issue_type: QualityIssueType::TitleTooShort,
                severity: Severity::Critical,
                message: format!("Title too short: {} chars (min 3)", title.len()),
            });
        } else if title.len() > 100 {
            issues.push(QualityIssue {
                issue_type: QualityIssueType::TitleTooLong,
                severity: Severity::Medium,
                message: format!("Title too long: {} chars (max 100)", title.len()),
            });
        }

        // Check 2: Content length
        let content = pattern.content();
        if content.len() < 50 {
            issues.push(QualityIssue {
                issue_type: QualityIssueType::ContentTooShort,
                severity: Severity::Critical,
                message: format!("Content too short: {} chars (min 50)", content.len()),
            });
        } else if content.len() > 10_000 {
            issues.push(QualityIssue {
                issue_type: QualityIssueType::ContentTooLong,
                severity: Severity::Medium,
                message: format!("Content too long: {} chars (max 10,000)", content.len()),
            });
        }

        // Check 3: Tags
        let tags = pattern.tags();
        if tags.is_empty() {
            issues.push(QualityIssue {
                issue_type: QualityIssueType::NoTags,
                severity: Severity::High,
                message: "Pattern has no tags (need at least 1 for discoverability)".to_string(),
            });
        } else if tags.len() > 20 {
            issues.push(QualityIssue {
                issue_type: QualityIssueType::TooManyTags,
                severity: Severity::Medium,
                message: format!("Too many tags: {} (max 20)", tags.len()),
            });
        }

        // Check 4: Metadata completeness
        let metadata = pattern.metadata();
        if metadata.language.is_none() && metadata.framework.is_none() && metadata.domain.is_none() {
            issues.push(QualityIssue {
                issue_type: QualityIssueType::NoMetadata,
                severity: Severity::Medium,
                message: "Pattern has no metadata (language, framework, or domain)".to_string(),
            });
        }

        // Check 5: Content quality score
        let quality_score = self.score_content_quality(content);
        if quality_score < 0.5 {
            issues.push(QualityIssue {
                issue_type: QualityIssueType::LowContentQuality,
                severity: Severity::High,
                message: format!("Content quality score too low: {:.2} (min 0.5)", quality_score),
            });
        }

        // Check 6: Suspicious content patterns
        if self.has_suspicious_patterns(content) {
            issues.push(QualityIssue {
                issue_type: QualityIssueType::SuspiciousContent,
                severity: Severity::Critical,
                message: "Content contains suspicious patterns (potential malicious code)".to_string(),
            });
        }

        // Sort by severity (Critical first)
        issues.sort_by(|a, b| {
            let order_a = match a.severity {
                Severity::Critical => 0,
                Severity::High => 1,
                Severity::Medium => 2,
                Severity::Low => 3,
            };
            let order_b = match b.severity {
                Severity::Critical => 0,
                Severity::High => 1,
                Severity::Medium => 2,
                Severity::Low => 3,
            };
            order_a.cmp(&order_b)
        });

        Ok(issues)
    }

    /**
     * Score content quality (readability, grammar, structure)
     *
     * DESIGN DECISION: Heuristic-based quality scoring
     * WHY: Simple, fast, no ML model needed for MVP
     *
     * REASONING CHAIN:
     * 1. Check sentence count (more sentences = better structure)
     * 2. Check average word length (7-8 chars = good readability)
     * 3. Check code examples presence (patterns should have examples)
     * 4. Check for markdown formatting (headers, lists = better structure)
     * 5. Combine into 0.0-1.0 score
     *
     * FUTURE: Use ML model for grammar/style checking
     */
    fn score_content_quality(&self, content: &str) -> f32 {
        let mut score: f32 = 0.0;

        // Check 1: Sentence count (good range: 3-50 sentences)
        let sentence_count = content.matches(&['.', '!', '?'][..]).count();
        if sentence_count >= 3 && sentence_count <= 50 {
            score += 0.3;
        } else if sentence_count > 0 {
            score += 0.15;
        }

        // Check 2: Average word length (good range: 4-10 chars)
        let words: Vec<&str> = content.split_whitespace().collect();
        if !words.is_empty() {
            let avg_word_len: f32 = words.iter().map(|w| w.len() as f32).sum::<f32>() / words.len() as f32;
            if avg_word_len >= 4.0 && avg_word_len <= 10.0 {
                score += 0.2;
            }
        }

        // Check 3: Code examples present (``` code blocks)
        if content.contains("```") {
            score += 0.2;
        }

        // Check 4: Markdown structure (headers, lists)
        if content.contains('#') || content.contains('-') || content.contains('*') {
            score += 0.15;
        }

        // Check 5: Not too repetitive (unique word ratio)
        let unique_words: std::collections::HashSet<&str> = words.iter().copied().collect();
        if !words.is_empty() {
            let uniqueness = unique_words.len() as f32 / words.len() as f32;
            if uniqueness > 0.5 {
                score += 0.15;
            }
        }

        score.min(1.0)
    }

    /**
     * Check for suspicious content patterns
     *
     * DESIGN DECISION: Blocklist-based detection
     * WHY: Simple, fast, catches common malicious patterns
     *
     * REASONING CHAIN:
     * 1. Malicious patterns often contain specific keywords
     * 2. SQL injection: "'; DROP TABLE", "UNION SELECT", etc.
     * 3. Command injection: "$(", "`", ";", etc.
     * 4. Path traversal: "../", "..\", etc.
     * 5. Obfuscation: "eval(", "exec(", etc.
     *
     * FUTURE: ML-based anomaly detection
     */
    fn has_suspicious_patterns(&self, content: &str) -> bool {
        let suspicious_patterns = [
            "'; DROP",
            "UNION SELECT",
            "../../../",
            "eval(",
            "exec(",
            "system(",
            "__import__",
            "rm -rf /",
            "del /f /q",
        ];

        suspicious_patterns.iter().any(|pattern| content.contains(pattern))
    }
}

impl Default for QualityChecker {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Pattern;

    #[test]
    fn test_good_pattern_passes() {
        let checker = QualityChecker::new();

        let pattern = Pattern::builder()
            .title("Rust Error Handling Pattern")
            .content("This pattern demonstrates proper error handling in Rust using Result<T, E>. Always prefer Result over panic! for recoverable errors. Example:\n\n```rust\nfn read_file(path: &str) -> Result<String, std::io::Error> {\n    std::fs::read_to_string(path)\n}\n```\n\nThis approach allows callers to handle errors gracefully.")
            .tags(vec!["rust", "error-handling"])
            .language("rust")
            .domain("error-handling")
            .build()
            .unwrap();

        let issues = checker.check(&pattern).unwrap();

        // Should have no critical issues
        let critical_issues: Vec<_> = issues.iter()
            .filter(|i| i.severity == Severity::Critical)
            .collect();
        assert!(critical_issues.is_empty(), "Good pattern should have no critical issues");
    }

    #[test]
    fn test_title_too_short() {
        let checker = QualityChecker::new();

        let pattern = Pattern::builder()
            .title("AB")  // Only 2 chars
            .content("This is valid content that meets the minimum length requirement of fifty characters.")
            .tags(vec!["test"])
            .build()
            .unwrap();

        let issues = checker.check(&pattern).unwrap();

        assert!(issues.iter().any(|i| matches!(i.issue_type, QualityIssueType::TitleTooShort)));
    }

    #[test]
    fn test_content_too_short() {
        let checker = QualityChecker::new();

        let pattern = Pattern::builder()
            .title("Valid Title")
            .content("Too short")  // Only 9 chars
            .tags(vec!["test"])
            .build()
            .unwrap();

        let issues = checker.check(&pattern).unwrap();

        assert!(issues.iter().any(|i| matches!(i.issue_type, QualityIssueType::ContentTooShort)));
    }

    #[test]
    fn test_suspicious_content_detected() {
        let checker = QualityChecker::new();

        let pattern = Pattern::builder()
            .title("Malicious Pattern")
            .content("This pattern shows how to use SQL: SELECT * FROM users WHERE id = 1'; DROP TABLE users;--")
            .tags(vec!["sql"])
            .build()
            .unwrap();

        let issues = checker.check(&pattern).unwrap();

        assert!(issues.iter().any(|i| matches!(i.issue_type, QualityIssueType::SuspiciousContent)));
    }
}
