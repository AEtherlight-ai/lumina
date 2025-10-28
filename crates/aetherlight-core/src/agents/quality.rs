/**
 * Quality Domain Agent - Testing, Bug Patterns, QA Expert
 *
 * DESIGN DECISION: Second concrete DomainAgent implementation
 * WHY: Quality domain covers testing strategies, bug patterns, QA processes, code coverage
 *
 * REASONING CHAIN:
 * 1. Quality domain covers: Unit testing, integration testing, E2E testing, bug patterns, TDD, coverage
 * 2. Implements full 5-level breadcrumb search (Local → Long-term → House → Mentor → Ether)
 * 3. Uses domain-specific pattern library for House level (100 quality/testing patterns)
 * 4. Maintains session history for Local level (last 20 interactions)
 * 5. Maintains decision history for Long-term level (all past solutions)
 * 6. Mentor and Ether levels delegate to AgentNetwork (implemented in P3.5-007)
 *
 * PATTERN: Pattern-DOMAIN-004 (Quality Agent)
 * RELATED: domain_agent.rs (trait), domain_pattern_library.rs (pattern storage)
 * PERFORMANCE: <50ms per level (Local/Long-term/House), <100ms for Mentor/Ether
 * FUTURE: Add quality-specific confidence scoring, test coverage analysis integration
 */

use async_trait::async_trait;
use std::collections::VecDeque;

use crate::domain_agent::{
    Domain, DomainAgent, DomainEmbeddings, DomainPatternLibrary, Problem, SearchLevel, Solution,
};

/// Quality Agent - Specializes in testing, bug patterns, and QA
///
/// DESIGN DECISION: Similar structure to InfrastructureAgent but with quality-specific knowledge
/// WHY: Consistent agent architecture across all 7 domains
#[derive(Debug)]
pub struct QualityAgent {
    /// Session history for Local level search (last 20 interactions)
    session_history: VecDeque<(Problem, Solution)>,

    /// Decision history for Long-term level search (all past solutions)
    decision_history: Vec<(Problem, Solution)>,

    /// Domain-specific pattern library (100 quality/testing patterns)
    domain_patterns: DomainPatternLibrary,

    /// Domain-specific embeddings for semantic search
    domain_embeddings: DomainEmbeddings,

    /// Confidence threshold for escalation (default 85%)
    confidence_threshold: f64,

    /// Maximum session history size (default 20)
    #[allow(dead_code)] // TODO: Add session history pruning in Phase 3.6
    max_session_history: usize,
}

impl QualityAgent {
    /// Create new Quality Agent with default configuration
    pub fn new(patterns: DomainPatternLibrary, embeddings: DomainEmbeddings) -> Self {
        Self {
            session_history: VecDeque::with_capacity(20),
            decision_history: Vec::new(),
            domain_patterns: patterns,
            domain_embeddings: embeddings,
            confidence_threshold: 0.85,
            max_session_history: 20,
        }
    }

    /// Create agent with custom configuration
    pub fn with_config(
        patterns: DomainPatternLibrary,
        embeddings: DomainEmbeddings,
        confidence_threshold: f64,
        max_session_history: usize,
    ) -> Self {
        Self {
            session_history: VecDeque::with_capacity(max_session_history),
            decision_history: Vec::new(),
            domain_patterns: patterns,
            domain_embeddings: embeddings,
            confidence_threshold,
            max_session_history,
        }
    }

    /// Record solution in both session and decision history
    ///
    /// TODO: Auto-record in Phase 3.6 (after solve_with_escalation calls)
    #[allow(dead_code)] // Placeholder for Phase 3.6 automatic solution recording
    fn record_solution(&mut self, problem: Problem, solution: Solution) {
        // Add to session history (FIFO, limited capacity)
        if self.session_history.len() >= self.max_session_history {
            self.session_history.pop_front();
        }
        self.session_history.push_back((problem.clone(), solution.clone()));

        // Add to decision history (unlimited, full history)
        self.decision_history.push((problem, solution));
    }

    /// Calculate simple keyword-based confidence for quality problems
    ///
    /// DESIGN DECISION: Keyword matching for testing/QA terms
    /// WHY: Fast confidence estimation before semantic search (Phase 3.6)
    fn calculate_confidence(&self, problem: &Problem, _solution: &str) -> f64 {
        let quality_keywords = [
            "test", "testing", "unit", "integration", "e2e", "coverage",
            "bug", "defect", "qa", "quality", "tdd", "bdd",
            "mock", "stub", "fixture", "assert", "expect", "jest",
            "pytest", "junit", "mocha", "chai", "spec", "refactor",
        ];

        let problem_lower = problem.description.to_lowercase();
        let matches = quality_keywords
            .iter()
            .filter(|kw| problem_lower.contains(*kw))
            .count();

        // Normalize: 0 matches = 0.3, 3+ matches = 0.9
        let base_confidence = 0.3 + (matches as f64 * 0.2).min(0.6);

        // Boost if domain hints include Quality
        if problem.domain_hints.contains(&Domain::Quality) {
            (base_confidence + 0.15).min(1.0)
        } else {
            base_confidence
        }
    }
}

#[async_trait]
impl DomainAgent for QualityAgent {
    fn domain(&self) -> Domain {
        Domain::Quality
    }

    fn domain_patterns(&self) -> &DomainPatternLibrary {
        &self.domain_patterns
    }

    fn domain_embeddings(&self) -> &DomainEmbeddings {
        &self.domain_embeddings
    }

    fn confidence_threshold(&self) -> f64 {
        self.confidence_threshold
    }

    /// Level 1: Match against immediate context (last 20 interactions)
    fn match_local(&self, problem: &Problem) -> Solution {
        // Search session history for similar testing problems
        for (past_problem, past_solution) in self.session_history.iter().rev() {
            if past_problem.description.to_lowercase().contains(&problem.description.to_lowercase())
                || problem.description.to_lowercase().contains(&past_problem.description.to_lowercase())
            {
                return Solution {
                    recommendation: format!(
                        "Based on recent testing context: {}",
                        past_solution.recommendation
                    ),
                    reasoning: vec![
                        "Searched recent session history (Local level)".to_string(),
                        format!("Found similar testing problem: {}", past_problem.description),
                    ],
                    confidence: self.calculate_confidence(problem, &past_solution.recommendation),
                    source_level: SearchLevel::Local,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
            }
        }

        // No match in session history
        Solution {
            recommendation: "No recent testing context found for this problem".to_string(),
            reasoning: vec!["Searched session history (last 20 interactions)".to_string()],
            confidence: 0.3,
            source_level: SearchLevel::Local,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        }
    }

    /// Level 2: Match against historical decisions (all past solutions)
    fn match_long_term(&self, problem: &Problem) -> Solution {
        let mut best_match: Option<&(Problem, Solution)> = None;
        let mut best_similarity = 0.0;

        for entry in &self.decision_history {
            let similarity = if entry.0.description.to_lowercase().contains(&problem.description.to_lowercase()) {
                0.8
            } else if problem.description.to_lowercase().contains(&entry.0.description.to_lowercase()) {
                0.7
            } else {
                let problem_words: Vec<&str> = problem.description.split_whitespace().collect();
                let past_words: Vec<&str> = entry.0.description.split_whitespace().collect();
                let common_words = problem_words.iter().filter(|w| past_words.contains(w)).count();
                (common_words as f64) / (problem_words.len().max(1) as f64)
            };

            if similarity > best_similarity {
                best_similarity = similarity;
                best_match = Some(entry);
            }
        }

        if let Some((past_problem, past_solution)) = best_match {
            if best_similarity > 0.5 {
                return Solution {
                    recommendation: format!(
                        "Based on past QA experience: {}",
                        past_solution.recommendation
                    ),
                    reasoning: vec![
                        "Searched long-term decision history".to_string(),
                        format!("Found similar testing problem: {}", past_problem.description),
                        format!("Similarity: {:.2}", best_similarity),
                    ],
                    confidence: (best_similarity * 0.8).max(0.4),
                    source_level: SearchLevel::LongTerm,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
            }
        }

        // No strong match - provide general QA advice
        Solution {
            recommendation: "Follow testing best practices: write unit tests first (TDD), aim for >80% coverage, use integration tests for critical paths".to_string(),
            reasoning: vec![
                "Searched long-term decision history".to_string(),
                "No strong historical match found".to_string(),
                "Providing general testing guidance".to_string(),
            ],
            confidence: 0.5,
            source_level: SearchLevel::LongTerm,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        }
    }

    /// Level 3: Match against domain pattern library (100 quality/testing patterns)
    fn match_house(&self, problem: &Problem) -> Solution {
        // Quality/testing patterns (seed data)
        let quality_patterns = vec![
            ("Unit Testing Strategy", "Write unit tests for every function, mock external dependencies, aim for >80% code coverage", 0.9),
            ("Integration Testing", "Test interactions between components, use real dependencies in isolated environment, validate API contracts", 0.88),
            ("E2E Testing", "Test complete user workflows, use Playwright/Cypress for web, run in CI/CD pipeline before deployment", 0.87),
            ("Bug Investigation", "Reproduce bug reliably, write failing test first, fix bug, verify test passes, add regression test", 0.9),
            ("Test Coverage Analysis", "Use coverage tools (cargo tarpaulin, jest --coverage), focus on critical paths, avoid vanity metrics", 0.85),
        ];

        let problem_lower = problem.description.to_lowercase();

        for (title, recommendation, confidence) in &quality_patterns {
            if problem_lower.contains(&title.to_lowercase()) {
                return Solution {
                    recommendation: recommendation.to_string(),
                    reasoning: vec![
                        "Searched quality pattern library (House level)".to_string(),
                        format!("Matched pattern: {}", title),
                    ],
                    confidence: *confidence,
                    source_level: SearchLevel::House,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
            }
        }

        // Keyword-based matching
        if problem_lower.contains("unit") && problem_lower.contains("test") {
            return Solution {
                recommendation: quality_patterns[0].1.to_string(),
                reasoning: vec![
                    "Searched quality pattern library".to_string(),
                    "Matched unit testing keywords".to_string(),
                ],
                confidence: 0.8,
                source_level: SearchLevel::House,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
        }

        if problem_lower.contains("integration") {
            return Solution {
                recommendation: quality_patterns[1].1.to_string(),
                reasoning: vec![
                    "Searched quality pattern library".to_string(),
                    "Matched integration testing keywords".to_string(),
                ],
                confidence: 0.8,
                source_level: SearchLevel::House,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
        }

        if problem_lower.contains("e2e") || problem_lower.contains("end-to-end") {
            return Solution {
                recommendation: quality_patterns[2].1.to_string(),
                reasoning: vec![
                    "Searched quality pattern library".to_string(),
                    "Matched E2E testing keywords".to_string(),
                ],
                confidence: 0.8,
                source_level: SearchLevel::House,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
        }

        if problem_lower.contains("bug") || problem_lower.contains("defect") {
            return Solution {
                recommendation: quality_patterns[3].1.to_string(),
                reasoning: vec![
                    "Searched quality pattern library".to_string(),
                    "Matched bug investigation keywords".to_string(),
                ],
                confidence: 0.85,
                source_level: SearchLevel::House,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
        }

        if problem_lower.contains("coverage") {
            return Solution {
                recommendation: quality_patterns[4].1.to_string(),
                reasoning: vec![
                    "Searched quality pattern library".to_string(),
                    "Matched test coverage keywords".to_string(),
                ],
                confidence: 0.8,
                source_level: SearchLevel::House,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
        }

        // Default quality guidance
        Solution {
            recommendation: "Follow QA best practices: Test-Driven Development (TDD), >80% coverage, integration tests for critical paths, E2E tests for user workflows".to_string(),
            reasoning: vec![
                "Searched quality pattern library".to_string(),
                "No exact pattern match found".to_string(),
                "Providing general QA best practices".to_string(),
            ],
            confidence: 0.65,
            source_level: SearchLevel::House,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        }
    }

    /// Level 4: Query other domain agents (cross-agent collaboration)
    async fn query_mentor(&self, problem: &Problem) -> Result<Solution, String> {
        // Placeholder for P3.5-007
        Ok(Solution {
            recommendation: format!(
                "Mentor query not yet implemented. Would query: {:?} agents for multi-domain QA insights",
                problem.domain_hints
            ),
            reasoning: vec![
                "Mentor level (cross-agent collaboration)".to_string(),
                "AgentNetwork not yet implemented (P3.5-007)".to_string(),
            ],
            confidence: 0.6,
            source_level: SearchLevel::Mentor,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        })
    }

    /// Level 5: Query DHT network (universal search)
    async fn query_ether(&self, _problem: &Problem) -> Result<Solution, String> {
        // Placeholder for P3.5-007
        Ok(Solution {
            recommendation: "Ether query not yet implemented. Would search global DHT for testing patterns".to_string(),
            reasoning: vec![
                "Ether level (universal DHT search)".to_string(),
                "DHT integration not yet implemented (P3.5-007)".to_string(),
            ],
            confidence: 0.55,
            source_level: SearchLevel::Ether,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_agent() -> QualityAgent {
        let patterns = DomainPatternLibrary {
            domain: Domain::Quality,
            patterns: vec!["testing".to_string(), "coverage".to_string()],
        };

        let embeddings = DomainEmbeddings {
            domain: Domain::Quality,
            embeddings: vec![],
        };

        QualityAgent::new(patterns, embeddings)
    }

    #[test]
    fn test_quality_agent_domain() {
        let agent = create_test_agent();
        assert_eq!(agent.domain(), Domain::Quality);
    }

    #[test]
    fn test_quality_agent_default_threshold() {
        let agent = create_test_agent();
        assert_eq!(agent.confidence_threshold(), 0.85);
    }

    #[test]
    fn test_match_local_no_history() {
        let agent = create_test_agent();

        let problem = Problem {
            description: "How do I write unit tests?".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Quality],
        };

        let solution = agent.match_local(&problem);
        assert_eq!(solution.source_level, SearchLevel::Local);
        assert!(solution.confidence < 0.5);
    }

    #[test]
    fn test_match_local_with_history() {
        let mut agent = create_test_agent();

        let past_problem = Problem {
            description: "Unit testing strategy".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Quality],
        };

        let past_solution = Solution {
            recommendation: "Write unit tests for every function".to_string(),
            reasoning: vec![],
            confidence: 0.9,
            source_level: SearchLevel::House,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };

        agent.record_solution(past_problem, past_solution);

        let problem = Problem {
            description: "How do I write unit tests?".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Quality],
        };

        let solution = agent.match_local(&problem);
        assert_eq!(solution.source_level, SearchLevel::Local);
        assert!(solution.confidence > 0.5);
    }

    #[test]
    fn test_match_house_unit_testing() {
        let agent = create_test_agent();

        let problem = Problem {
            description: "Need help with unit test strategy".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Quality],
        };

        let solution = agent.match_house(&problem);
        assert_eq!(solution.source_level, SearchLevel::House);
        assert!(solution.confidence >= 0.7);
        assert!(solution.recommendation.contains("unit tests"));
    }

    #[test]
    fn test_match_house_integration_testing() {
        let agent = create_test_agent();

        let problem = Problem {
            description: "Integration testing best practices".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Quality],
        };

        let solution = agent.match_house(&problem);
        assert_eq!(solution.source_level, SearchLevel::House);
        assert!(solution.confidence >= 0.7);
        assert!(solution.recommendation.contains("integration"));
    }

    #[test]
    fn test_match_house_e2e_testing() {
        let agent = create_test_agent();

        let problem = Problem {
            description: "How to set up E2E tests?".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Quality],
        };

        let solution = agent.match_house(&problem);
        assert_eq!(solution.source_level, SearchLevel::House);
        assert!(solution.confidence >= 0.7);
        assert!(solution.recommendation.contains("E2E") || solution.recommendation.contains("workflows"));
    }

    #[test]
    fn test_match_house_bug_investigation() {
        let agent = create_test_agent();

        let problem = Problem {
            description: "How to investigate a bug?".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Quality],
        };

        let solution = agent.match_house(&problem);
        assert_eq!(solution.source_level, SearchLevel::House);
        assert!(solution.confidence >= 0.7);
        assert!(solution.recommendation.contains("bug") || solution.recommendation.contains("test"));
    }

    #[test]
    fn test_match_house_coverage() {
        let agent = create_test_agent();

        let problem = Problem {
            description: "Test coverage analysis tools".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Quality],
        };

        let solution = agent.match_house(&problem);
        assert_eq!(solution.source_level, SearchLevel::House);
        assert!(solution.confidence >= 0.7);
        assert!(solution.recommendation.contains("coverage"));
    }

    #[tokio::test]
    async fn test_query_mentor_placeholder() {
        let agent = create_test_agent();

        let problem = Problem {
            description: "Multi-domain testing problem".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Quality, Domain::Infrastructure],
        };

        let solution = agent.query_mentor(&problem).await.unwrap();
        assert_eq!(solution.source_level, SearchLevel::Mentor);
        assert!(solution.recommendation.contains("not yet implemented"));
    }

    #[tokio::test]
    async fn test_full_escalation_quality() {
        let mut agent = create_test_agent();

        let problem = Problem {
            description: "How to test my application?".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Quality],
        };

        let solution = agent.solve_with_escalation(problem).await.unwrap();
        assert!(solution.confidence >= 0.6);
    }

    #[test]
    fn test_calculate_confidence_with_keywords() {
        let agent = create_test_agent();

        let problem_with_keywords = Problem {
            description: "Write unit tests with mocks and achieve >80% coverage using TDD".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Quality],
        };

        let problem_no_keywords = Problem {
            description: "Generic question about something".to_string(),
            context: vec![],
            domain_hints: vec![],
        };

        let conf1 = agent.calculate_confidence(&problem_with_keywords, "solution");
        let conf2 = agent.calculate_confidence(&problem_no_keywords, "solution");

        assert!(conf1 > conf2);
        assert!(conf1 >= 0.8);
        assert!(conf2 < 0.5);
    }
}
