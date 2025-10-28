/**
 * Claim Parser - Extract verifiable claims from agent text
 *
 * DESIGN DECISION: Use regex patterns to extract claims from natural language
 * WHY: Agents make claims in text ("Test coverage is 85%"), need to extract for verification
 *
 * REASONING CHAIN:
 * 1. Agent writes: "See src/main.rs:45"
 * 2. Parse text for file reference pattern
 * 3. Extract: FileReference { file: "src/main.rs", line: Some(45) }
 * 4. Pass to FileVerifier for validation
 * 5. Result: Catch hallucinated file references
 *
 * PATTERN: Pattern-VERIFICATION-001 (Claim Validation)
 * RELATED: VerificationSystem (consumer), all verifiers
 * PERFORMANCE: <10ms per text block (regex is fast)
 */

use regex::Regex;
use std::path::PathBuf;
use super::AgentClaim;

/// Claim parser for extracting claims from text
pub struct ClaimParser {
    /// File reference pattern: "See src/main.rs:45" or "in utils.rs line 10"
    file_ref_pattern: Regex,

    /// Function reference pattern: "Function calculate() exists in utils.rs"
    function_pattern: Regex,

    /// Test coverage pattern: "Test coverage is 85%" or "Coverage: 87.5%"
    coverage_pattern: Regex,

    /// Tests passing pattern: "12 out of 15 tests passing" or "12/15 tests"
    tests_pattern: Regex,

    /// Performance pattern: "Pattern matching took 45ms (target: <50ms)"
    performance_pattern: Regex,
}

impl ClaimParser {
    /// Create new claim parser
    pub fn new() -> Self {
        Self {
            // File reference: "src/main.rs:45" or "utils.rs line 10"
            file_ref_pattern: Regex::new(
                r"(?:See\s+)?([a-zA-Z0-9_/\\.-]+\.(?:rs|ts|js|py|java|go))(?::(\d+)|(?:\s+line\s+(\d+)))?"
            ).unwrap(),

            // Function reference: "Function calculate() exists in utils.rs"
            function_pattern: Regex::new(
                r"(?:Function|function|fn)\s+([a-zA-Z_][a-zA-Z0-9_]*)\(\)(?:\s+(?:exists\s+)?in\s+([a-zA-Z0-9_/\\.-]+\.(?:rs|ts|js|py|java|go)))?"
            ).unwrap(),

            // Test coverage: "Test coverage is 85%" or "Coverage: 87.5%"
            coverage_pattern: Regex::new(
                r"(?:Test\s+)?[Cc]overage(?:\s+is)?:?\s+(\d+\.?\d*)%"
            ).unwrap(),

            // Tests passing: "12 out of 15 tests passing" or "12/15 tests"
            tests_pattern: Regex::new(
                r"(\d+)(?:\s+out\s+of\s+|\s*/\s*)(\d+)\s+tests(?:\s+passing)?"
            ).unwrap(),

            // Performance: "Pattern matching took 45ms (target: <50ms)"
            performance_pattern: Regex::new(
                r"([a-zA-Z_][a-zA-Z0-9_\s]*)\s+took\s+([\d.]+\s*(?:ms|µs|ns|s))(?:\s+\(target:\s*([<>]?[\d.]+\s*(?:ms|µs|ns|s))\))?"
            ).unwrap(),
        }
    }

    /// Parse text and extract all claims
    ///
    /// DESIGN DECISION: Extract all claim types from single text block
    /// WHY: Agent responses contain multiple claims (file refs, test results, etc.)
    ///
    /// REASONING CHAIN:
    /// 1. Run all regex patterns on text
    /// 2. Extract matching groups
    /// 3. Convert to AgentClaim instances
    /// 4. Return vector of all claims found
    /// 5. Caller verifies each claim
    pub fn parse(&self, text: &str) -> Vec<AgentClaim> {
        let mut claims = Vec::new();

        // Extract file references
        for cap in self.file_ref_pattern.captures_iter(text) {
            let file = PathBuf::from(&cap[1]);
            let line = cap.get(2)
                .or_else(|| cap.get(3))
                .and_then(|m| m.as_str().parse().ok());

            claims.push(AgentClaim::FileReference { file, line });
        }

        // Extract function references
        for cap in self.function_pattern.captures_iter(text) {
            let function = cap[1].to_string();
            if let Some(file_match) = cap.get(2) {
                let file = PathBuf::from(file_match.as_str());
                claims.push(AgentClaim::FunctionExists { file, function });
            }
        }

        // Extract test coverage claims
        for cap in self.coverage_pattern.captures_iter(text) {
            if let Ok(percentage) = cap[1].parse::<f64>() {
                claims.push(AgentClaim::TestCoverage { percentage });
            }
        }

        // Extract tests passing claims
        for cap in self.tests_pattern.captures_iter(text) {
            if let (Ok(count), Ok(total)) = (
                cap[1].parse::<usize>(),
                cap[2].parse::<usize>(),
            ) {
                claims.push(AgentClaim::TestsPassing { count, total });
            }
        }

        // Extract performance claims
        for cap in self.performance_pattern.captures_iter(text) {
            let metric = cap[1].trim().to_string();
            let actual = cap[2].trim().to_string();

            if let Some(target_match) = cap.get(3) {
                let target = target_match.as_str().trim().to_string();
                claims.push(AgentClaim::PerformanceTarget {
                    metric,
                    target,
                    actual,
                });
            }
        }

        claims
    }

    /// Parse specific claim type from text
    ///
    /// DESIGN DECISION: Allow filtering by claim type
    /// WHY: Sometimes only need specific claims (e.g., only file refs)
    pub fn parse_file_references(&self, text: &str) -> Vec<AgentClaim> {
        self.parse(text)
            .into_iter()
            .filter(|claim| matches!(claim, AgentClaim::FileReference { .. }))
            .collect()
    }

    pub fn parse_function_claims(&self, text: &str) -> Vec<AgentClaim> {
        self.parse(text)
            .into_iter()
            .filter(|claim| matches!(claim, AgentClaim::FunctionExists { .. }))
            .collect()
    }

    pub fn parse_test_claims(&self, text: &str) -> Vec<AgentClaim> {
        self.parse(text)
            .into_iter()
            .filter(|claim| matches!(
                claim,
                AgentClaim::TestCoverage { .. } | AgentClaim::TestsPassing { .. }
            ))
            .collect()
    }

    pub fn parse_performance_claims(&self, text: &str) -> Vec<AgentClaim> {
        self.parse(text)
            .into_iter()
            .filter(|claim| matches!(claim, AgentClaim::PerformanceTarget { .. }))
            .collect()
    }
}

impl Default for ClaimParser {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_file_reference() {
        let parser = ClaimParser::new();

        // Test various file reference formats
        let text = "See src/main.rs:45 for implementation";
        let claims = parser.parse(text);
        assert_eq!(claims.len(), 1);

        if let AgentClaim::FileReference { file, line } = &claims[0] {
            assert_eq!(file, &PathBuf::from("src/main.rs"));
            assert_eq!(*line, Some(45));
        } else {
            panic!("Expected FileReference claim");
        }

        // Test "line" keyword format
        let text2 = "Check utils.rs line 10";
        let claims2 = parser.parse(text2);
        assert_eq!(claims2.len(), 1);

        if let AgentClaim::FileReference { file, line } = &claims2[0] {
            assert_eq!(file, &PathBuf::from("utils.rs"));
            assert_eq!(*line, Some(10));
        } else {
            panic!("Expected FileReference claim");
        }

        // Test file without line number
        let text3 = "Modified src/lib.rs";
        let claims3 = parser.parse(text3);
        assert_eq!(claims3.len(), 1);

        if let AgentClaim::FileReference { file, line } = &claims3[0] {
            assert_eq!(file, &PathBuf::from("src/lib.rs"));
            assert_eq!(*line, None);
        } else {
            panic!("Expected FileReference claim");
        }
    }

    #[test]
    fn test_parse_function_claim() {
        let parser = ClaimParser::new();

        let text = "Function calculate() exists in utils.rs";
        let claims = parser.parse(text);
        assert_eq!(claims.len(), 1);

        if let AgentClaim::FunctionExists { file, function } = &claims[0] {
            assert_eq!(file, &PathBuf::from("utils.rs"));
            assert_eq!(function, "calculate");
        } else {
            panic!("Expected FunctionExists claim");
        }

        // Test without file reference
        let text2 = "Function process() handles the data";
        let claims2 = parser.parse(text2);
        // Should not extract function without file reference
        assert_eq!(claims2.len(), 0);
    }

    #[test]
    fn test_parse_test_coverage() {
        let parser = ClaimParser::new();

        // Test "Coverage: X%" format
        let text = "Coverage: 87.5%";
        let claims = parser.parse(text);
        assert_eq!(claims.len(), 1);

        if let AgentClaim::TestCoverage { percentage } = &claims[0] {
            assert_eq!(*percentage, 87.5);
        } else {
            panic!("Expected TestCoverage claim");
        }

        // Test "Test coverage is X%" format
        let text2 = "Test coverage is 85%";
        let claims2 = parser.parse(text2);
        assert_eq!(claims2.len(), 1);

        if let AgentClaim::TestCoverage { percentage } = &claims2[0] {
            assert_eq!(*percentage, 85.0);
        } else {
            panic!("Expected TestCoverage claim");
        }
    }

    #[test]
    fn test_parse_tests_passing() {
        let parser = ClaimParser::new();

        // Test "X out of Y tests" format
        let text = "12 out of 15 tests passing";
        let claims = parser.parse(text);
        assert_eq!(claims.len(), 1);

        if let AgentClaim::TestsPassing { count, total } = &claims[0] {
            assert_eq!(*count, 12);
            assert_eq!(*total, 15);
        } else {
            panic!("Expected TestsPassing claim");
        }

        // Test "X/Y tests" format
        let text2 = "8/10 tests";
        let claims2 = parser.parse(text2);
        assert_eq!(claims2.len(), 1);

        if let AgentClaim::TestsPassing { count, total } = &claims2[0] {
            assert_eq!(*count, 8);
            assert_eq!(*total, 10);
        } else {
            panic!("Expected TestsPassing claim");
        }
    }

    #[test]
    fn test_parse_performance() {
        let parser = ClaimParser::new();

        let text = "Pattern matching took 45ms (target: <50ms)";
        let claims = parser.parse(text);
        assert_eq!(claims.len(), 1);

        if let AgentClaim::PerformanceTarget { metric, target, actual } = &claims[0] {
            assert_eq!(metric, "Pattern matching");
            assert_eq!(actual, "45ms");
            assert_eq!(target, "<50ms");
        } else {
            panic!("Expected PerformanceTarget claim");
        }

        // Test without target
        let text2 = "Query execution took 1.5s";
        let claims2 = parser.parse(text2);
        // Should not extract performance without target
        assert_eq!(claims2.len(), 0);
    }

    #[test]
    fn test_parse_multiple_claims() {
        let parser = ClaimParser::new();

        let text = r#"
        I implemented the feature in src/main.rs:45.
        Function calculate() exists in utils.rs.
        Test coverage is 85%.
        12 out of 15 tests passing.
        Pattern matching took 45ms (target: <50ms).
        "#;

        let claims = parser.parse(text);
        assert_eq!(claims.len(), 5);

        // Verify each claim type extracted
        assert!(claims.iter().any(|c| matches!(c, AgentClaim::FileReference { .. })));
        assert!(claims.iter().any(|c| matches!(c, AgentClaim::FunctionExists { .. })));
        assert!(claims.iter().any(|c| matches!(c, AgentClaim::TestCoverage { .. })));
        assert!(claims.iter().any(|c| matches!(c, AgentClaim::TestsPassing { .. })));
        assert!(claims.iter().any(|c| matches!(c, AgentClaim::PerformanceTarget { .. })));
    }

    #[test]
    fn test_filter_by_claim_type() {
        let parser = ClaimParser::new();

        let text = r#"
        See src/main.rs:45
        Function calculate() exists in utils.rs
        Test coverage is 85%
        "#;

        let file_refs = parser.parse_file_references(text);
        assert_eq!(file_refs.len(), 1);

        let function_claims = parser.parse_function_claims(text);
        assert_eq!(function_claims.len(), 1);

        let test_claims = parser.parse_test_claims(text);
        assert_eq!(test_claims.len(), 1);

        let performance_claims = parser.parse_performance_claims(text);
        assert_eq!(performance_claims.len(), 0);
    }
}
