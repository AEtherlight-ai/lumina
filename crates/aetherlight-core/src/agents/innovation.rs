/**
 * Innovation Domain Agent - Code Generation & Creative Problem Solving Expert
 *
 * DESIGN DECISION: Fifth domain agent specializing in creative solutions and new features
 * WHY: Autonomous systems need ability to generate novel code, design features, and prototype solutions
 *
 * REASONING CHAIN:
 * 1. Innovation domain covers code generation, AI model integration, feature design
 * 2. Session history (VecDeque, FIFO, 20 capacity) for recent creative patterns (Local level)
 * 3. Decision history (Vec, unlimited) for long-term learning from past innovations (Long-term level)
 * 4. 5 seed patterns cover major innovation areas (design patterns, AI, features, creative, prototyping)
 * 5. 22 innovation keywords for fast confidence scoring (<5ms per query)
 * 6. Keyword-based confidence: 0.3 base + (matches * 0.2) + 0.15 domain hint boost
 * 7. House level patterns provide high-quality actionable guidance (88-92% confidence)
 * 8. Mentor/Ether levels placeholder for cross-agent collaboration (Phase 3.5-007+)
 *
 * PATTERN: Pattern-DOMAIN-007 (Innovation Agent)
 * RELATED: domain_agent.rs (trait), domain_pattern_library.rs (pattern storage)
 * PERFORMANCE: <20ms pattern match, <5ms confidence calculation
 */

use async_trait::async_trait;
use std::collections::VecDeque;

use crate::domain_agent::{
    Domain, DomainAgent, DomainEmbeddings, DomainPatternLibrary, Problem, SearchLevel, Solution,
};

/**
 * InnovationAgent - Domain expert for creative problem solving
 *
 * DESIGN DECISION: Consistent agent architecture across all domain agents
 * WHY: Validates pattern, enables rapid development, simplifies testing
 *
 * ARCHITECTURE:
 * - session_history: Recent interactions (FIFO, last 20) for fast Local level searches
 * - decision_history: All past solutions (unlimited) for Long-term level learning
 * - domain_patterns: Domain-specific pattern library with vector search
 * - domain_embeddings: Semantic embeddings for pattern matching (Phase 3.6)
 * - confidence_threshold: Default 85% (configurable)
 * - max_session_history: Default 20 (configurable)
 */
#[derive(Debug)]
pub struct InnovationAgent {
    session_history: VecDeque<(Problem, Solution)>,
    decision_history: Vec<(Problem, Solution)>,
    domain_patterns: DomainPatternLibrary,
    domain_embeddings: DomainEmbeddings,
    confidence_threshold: f64,
    #[allow(dead_code)] // TODO: Add session history pruning in Phase 3.6
    max_session_history: usize,
}

impl InnovationAgent {
    /**
     * Create new InnovationAgent with default configuration
     *
     * DESIGN DECISION: Factory method with sensible defaults
     * WHY: Most agents use default configuration (85% confidence, 20 session history)
     *
     * PARAMETERS:
     * - patterns: Domain-specific pattern library
     * - embeddings: Semantic embeddings for pattern matching
     *
     * DEFAULTS:
     * - confidence_threshold: 0.85 (85%)
     * - max_session_history: 20 (FIFO)
     */
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

    /**
     * Create InnovationAgent with custom configuration
     *
     * DESIGN DECISION: Allow confidence threshold and history size customization
     * WHY: Some use cases need stricter/looser confidence, larger/smaller history
     *
     * PARAMETERS:
     * - patterns: Domain-specific pattern library
     * - embeddings: Semantic embeddings for pattern matching
     * - confidence_threshold: Custom threshold (e.g., 0.90 for high-stakes decisions)
     * - max_session_history: Custom capacity (e.g., 50 for complex sessions)
     */
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

    /**
     * Record solution in both session and decision history
     *
     * DESIGN DECISION: FIFO session history, unlimited decision history
     * WHY: Recent patterns fast (Local), all past patterns enable learning (Long-term)
     *
     * REASONING CHAIN:
     * 1. Check if session history at capacity
     * 2. If full, pop oldest entry (FIFO behavior)
     * 3. Push new entry to session history (last 20 interactions)
     * 4. Append to decision history (unlimited, all past solutions)
     * 5. Enables Local level (recent) and Long-term level (all past) searches
     *
     * TODO: Auto-record in Phase 3.6 (after solve_with_escalation calls)
     */
    #[allow(dead_code)] // Placeholder for Phase 3.6 automatic solution recording
    fn record_solution(&mut self, problem: Problem, solution: Solution) {
        // FIFO: Remove oldest if at capacity
        if self.session_history.len() >= self.max_session_history {
            self.session_history.pop_front();
        }
        self.session_history
            .push_back((problem.clone(), solution.clone()));

        // Unlimited: Keep all past solutions for long-term learning
        self.decision_history.push((problem, solution));
    }

    /**
     * Calculate confidence score based on keyword matching
     *
     * DESIGN DECISION: Keyword-based confidence for innovation problems
     * WHY: Fast (<5ms), explainable, works well for technical innovation terminology
     *
     * REASONING CHAIN:
     * 1. Define 22 innovation keywords covering design, AI, features, creative, prototyping
     * 2. Count keyword matches in problem description (case-insensitive)
     * 3. Base confidence: 0.3 (30%)
     * 4. Add 0.2 (20%) per keyword match, max +0.6 (60%)
     * 5. If Domain::Innovation in domain_hints, add 0.15 (15%) bonus
     * 6. Total range: 0.3 to 1.0 (30% to 100%)
     *
     * PERFORMANCE: <5ms (22 keyword checks, string operations)
     */
    fn calculate_confidence(&self, problem: &Problem, _solution: &str) -> f64 {
        let innovation_keywords = [
            // Design & Architecture (7)
            "pattern",
            "architecture",
            "design",
            "framework",
            "library",
            "api",
            "interface",
            // Code Generation (3)
            "generate",
            "create",
            "build",
            // AI & Models (3)
            "ai",
            "model",
            "algorithm",
            // Features & Solutions (5)
            "feature",
            "solution",
            "implement",
            "develop",
            "prototype",
            // Creative (4)
            "creative",
            "innovative",
            "novel",
            "new",
        ];

        let problem_lower = problem.description.to_lowercase();
        let matches = innovation_keywords
            .iter()
            .filter(|kw| problem_lower.contains(*kw))
            .count();

        // Base confidence + keyword matches (capped at 60% bonus)
        let base_confidence = 0.3 + (matches as f64 * 0.2).min(0.6);

        // Domain hint bonus (15% if Innovation in domain_hints)
        if problem.domain_hints.contains(&Domain::Innovation) {
            (base_confidence + 0.15).min(1.0)
        } else {
            base_confidence
        }
    }
}

#[async_trait]
impl DomainAgent for InnovationAgent {
    /**
     * Return agent's domain identifier
     */
    fn domain(&self) -> Domain {
        Domain::Innovation
    }

    /**
     * Return domain-specific pattern library reference
     */
    fn domain_patterns(&self) -> &DomainPatternLibrary {
        &self.domain_patterns
    }

    /**
     * Return domain-specific embeddings reference
     */
    fn domain_embeddings(&self) -> &DomainEmbeddings {
        &self.domain_embeddings
    }

    /**
     * Return confidence threshold for escalation
     */
    fn confidence_threshold(&self) -> f64 {
        self.confidence_threshold
    }

    /**
     * Search recent session history for matching solutions
     *
     * DESIGN DECISION: FIFO session history with simple substring matching
     * WHY: Fast Local level search (<20ms) for recently solved problems
     *
     * REASONING CHAIN:
     * 1. If session history empty, return low confidence (0.1) - cold start
     * 2. Iterate session history in reverse order (most recent first)
     * 3. Simple substring match: does current problem contain past problem text?
     * 4. If match found, return past solution with high confidence (0.9)
     * 5. If no match, return "not found" with low confidence (0.3)
     *
     * PERFORMANCE: O(n) where n = session history size (max 20), <20ms typical
     */
    fn match_local(&self, problem: &Problem) -> Solution {
        if self.session_history.is_empty() {
            return Solution {
                recommendation: "No recent innovation interactions found. Try Long-term memory or House patterns.".to_string(),
                reasoning: vec!["Searched session history (empty - cold start)".to_string()],
                confidence: 0.1,
                source_level: SearchLevel::Local,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
        }

        // Reverse iterate (most recent first)
        for (past_problem, past_solution) in self.session_history.iter().rev() {
            // Simple substring match (case-insensitive would be better in production)
            if past_problem
                .description
                .to_lowercase()
                .contains(&problem.description.to_lowercase())
                || problem
                    .description
                    .to_lowercase()
                    .contains(&past_problem.description.to_lowercase())
            {
                return Solution {
                    recommendation: format!(
                        "Recently solved similar problem: {}",
                        past_solution.recommendation
                    ),
                    reasoning: vec![
                        "Searched session history (Local level)".to_string(),
                        format!("Found similar problem: {}", past_problem.description),
                    ],
                    confidence: 0.9,
                    source_level: SearchLevel::Local,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
            }
        }

        Solution {
            recommendation: "No matching recent solutions. Escalating to Long-term memory."
                .to_string(),
            reasoning: vec![
                "Searched session history (last 20 interactions)".to_string(),
                "No matching patterns found in recent session".to_string(),
            ],
            confidence: 0.3,
            source_level: SearchLevel::Local,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        }
    }

    /**
     * Search all past decision history for matching solutions
     *
     * DESIGN DECISION: Unlimited decision history with substring matching
     * WHY: Long-term learning from all past innovations, not just recent
     *
     * REASONING CHAIN:
     * 1. If decision history empty, return low confidence (0.1)
     * 2. Iterate all past decisions (could be hundreds/thousands)
     * 3. Substring match between current and past problem descriptions
     * 4. If match found, return past solution with medium-high confidence (0.8)
     * 5. If no match, return "not found" with low confidence (0.3)
     *
     * PERFORMANCE: O(n) where n = all past decisions, could be slow for large history
     * FUTURE: Phase 3.6 will add semantic search with embeddings for better matching
     */
    fn match_long_term(&self, problem: &Problem) -> Solution {
        if self.decision_history.is_empty() {
            return Solution {
                recommendation: "No long-term decision history available.".to_string(),
                reasoning: vec!["Searched decision history (empty)".to_string()],
                confidence: 0.1,
                source_level: SearchLevel::LongTerm,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
        }

        // Iterate all past decisions
        for (past_problem, past_solution) in &self.decision_history {
            if past_problem
                .description
                .to_lowercase()
                .contains(&problem.description.to_lowercase())
                || problem
                    .description
                    .to_lowercase()
                    .contains(&past_problem.description.to_lowercase())
            {
                return Solution {
                    recommendation: format!(
                        "Found in long-term memory: {}",
                        past_solution.recommendation
                    ),
                    reasoning: vec![
                        "Searched decision history (Long-term level)".to_string(),
                        format!(
                            "Matched past problem: {}",
                            past_problem.description.chars().take(100).collect::<String>()
                        ),
                    ],
                    confidence: 0.8,
                    source_level: SearchLevel::LongTerm,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
            }
        }

        Solution {
            recommendation: "No matching solutions in long-term memory. Escalating to House patterns.".to_string(),
            reasoning: vec!["Searched decision history (all past solutions)".to_string()],
            confidence: 0.3,
            source_level: SearchLevel::LongTerm,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        }
    }

    /**
     * Search domain-specific pattern library
     *
     * DESIGN DECISION: 5 seed patterns covering major innovation domains
     * WHY: High-quality actionable guidance for common innovation problems
     *
     * SEED PATTERNS:
     * 1. Design Pattern Implementation (Gang of Four patterns, Factory, Strategy, Observer)
     * 2. AI Model Integration (LLM APIs, embeddings, RAG, fine-tuning)
     * 3. Feature Design Methodology (user stories, prototyping, MVPs, iterative)
     * 4. Creative Problem Solving (lateral thinking, brainstorming, constraints, analogies)
     * 5. Rapid Prototyping (MVPs, spikes, proof-of-concepts, fail fast)
     *
     * PERFORMANCE: O(n) where n = 5 patterns, <20ms typical
     */
    fn match_house(&self, problem: &Problem) -> Solution {
        let innovation_patterns = vec![
            (
                "Design Pattern Implementation",
                "Use Gang of Four design patterns: Factory for object creation, Strategy for algorithms, Observer for event handling, Decorator for extending behavior",
                0.90,
            ),
            (
                "AI Model Integration",
                "Integrate AI via APIs (OpenAI, Anthropic, Cohere). Use embeddings for semantic search, RAG for grounded responses, fine-tuning for domain-specific tasks",
                0.92,
            ),
            (
                "Feature Design Methodology",
                "Start with user stories (As a [user], I want [feature], So that [benefit]). Build MVPs, iterate based on feedback, prioritize core value",
                0.88,
            ),
            (
                "Creative Problem Solving",
                "Use lateral thinking: Question assumptions, explore analogies from other domains, embrace constraints as opportunities, brainstorm without judgment first",
                0.89,
            ),
            (
                "Rapid Prototyping",
                "Build MVPs in 1-2 days. Use spikes for risky unknowns. Proof-of-concepts over production code. Fail fast, iterate quickly, learn from failures",
                0.91,
            ),
        ];

        let problem_lower = problem.description.to_lowercase();

        // CRITICAL: Iterate over reference to avoid moving the vector
        for (title, description, base_confidence) in &innovation_patterns {
            let keywords = title.to_lowercase();
            if problem_lower.contains(&keywords)
                || keywords.split_whitespace().any(|kw| problem_lower.contains(kw))
            {
                return Solution {
                    recommendation: format!("{}: {}", title, description),
                    reasoning: vec![
                        "Searched domain patterns (House level)".to_string(),
                        format!("Matched pattern: {}", title),
                    ],
                    confidence: base_confidence * self.calculate_confidence(problem, description),
                    source_level: SearchLevel::House,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
            }
        }

        // Generic fallback: Can access innovation_patterns[0] because we didn't move it
        Solution {
            recommendation: format!(
                "{}: {} (generic match - problem likely innovation-related)",
                innovation_patterns[0].0, innovation_patterns[0].1
            ),
            reasoning: vec![
                "Searched domain patterns (generic match)".to_string(),
                "No specific pattern matched, returning default innovation pattern".to_string(),
            ],
            confidence: 0.5,
            source_level: SearchLevel::House,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        }
    }

    /**
     * Query other domain agents for assistance (Mentor level)
     *
     * DESIGN DECISION: Placeholder implementation for P3.5-007+ cross-agent communication
     * WHY: Agent network not yet implemented, return medium confidence placeholder
     *
     * FUTURE: Will route to other domain agents via AgentNetwork when confidence < 85%
     */
    async fn query_mentor(&self, problem: &Problem) -> Result<Solution, String> {
        Ok(Solution {
            recommendation: format!(
                "Mentor query for '{}' (placeholder - agent network not yet implemented)",
                problem.description.chars().take(100).collect::<String>()
            ),
            reasoning: vec![
                "Placeholder mentor query (P3.5-007+ will implement agent network)".to_string(),
            ],
            confidence: 0.6,
            source_level: SearchLevel::Mentor,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        })
    }

    /**
     * Query distributed pattern network (Ether level)
     *
     * DESIGN DECISION: Placeholder implementation for distributed network
     * WHY: Distributed pattern network planned for Phase 3.7+
     *
     * FUTURE: Will query global DHT network for community patterns
     */
    async fn query_ether(&self, problem: &Problem) -> Result<Solution, String> {
        Ok(Solution {
            recommendation: format!(
                "Ether query for '{}' (placeholder - distributed network planned for Phase 3.7)",
                problem.description.chars().take(100).collect::<String>()
            ),
            reasoning: vec![
                "Placeholder ether query (Phase 3.7+ will implement distributed network)".to_string(),
            ],
            confidence: 0.5,
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
    use std::path::PathBuf;

    fn create_test_agent() -> InnovationAgent {
        let patterns = DomainPatternLibrary::new(
            Domain::Innovation,
            PathBuf::from("data/patterns/innovation"),
        )
        .expect("Failed to create pattern library");
        let embeddings = DomainEmbeddings::new().expect("Failed to create embeddings");
        InnovationAgent::new(patterns, embeddings)
    }

    #[test]
    fn test_new_innovation_agent() {
        let agent = create_test_agent();
        assert_eq!(agent.domain(), Domain::Innovation);
        assert_eq!(agent.confidence_threshold(), 0.85);
        assert_eq!(agent.max_session_history, 20);
    }

    #[test]
    fn test_with_config() {
        let patterns = DomainPatternLibrary::new(
            Domain::Innovation,
            PathBuf::from("data/patterns/innovation"),
        )
        .expect("Failed to create pattern library");
        let embeddings = DomainEmbeddings::new().expect("Failed to create embeddings");
        let agent = InnovationAgent::with_config(patterns, embeddings, 0.90, 50);
        assert_eq!(agent.confidence_threshold(), 0.90);
        assert_eq!(agent.max_session_history, 50);
    }

    #[test]
    fn test_domain() {
        let agent = create_test_agent();
        assert_eq!(agent.domain(), Domain::Innovation);
    }

    #[test]
    fn test_domain_patterns() {
        let agent = create_test_agent();
        let patterns = agent.domain_patterns();
        assert_eq!(patterns.domain(), Domain::Innovation);
    }

    #[test]
    fn test_domain_embeddings() {
        let agent = create_test_agent();
        let embeddings = agent.domain_embeddings();
        // Just verify we can access embeddings (no panic)
        let _ = embeddings;
    }

    #[test]
    fn test_confidence_threshold() {
        let agent = create_test_agent();
        assert_eq!(agent.confidence_threshold(), 0.85);
    }

    #[test]
    fn test_match_local_empty_history() {
        let agent = create_test_agent();
        let problem = Problem {
            description: "How do I implement a Factory pattern?".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Innovation],
        };

        let solution = agent.match_local(&problem);
        assert_eq!(solution.source_level, SearchLevel::Local);
        assert!(solution.confidence < 0.2); // Low confidence (empty history)
    }

    #[test]
    fn test_match_local_with_history() {
        let mut agent = create_test_agent();
        let past_problem = Problem {
            description: "Factory pattern implementation".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Innovation],
        };
        let past_solution = Solution {
            recommendation: "Use Factory pattern for object creation".to_string(),
            reasoning: vec!["Factory pattern provides flexible object creation".to_string()],
            confidence: 0.9,
            source_level: SearchLevel::House,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
        agent.record_solution(past_problem, past_solution);

        let problem = Problem {
            description: "How do I implement a Factory pattern?".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Innovation],
        };

        let solution = agent.match_local(&problem);
        assert_eq!(solution.source_level, SearchLevel::Local);
        assert!(solution.confidence > 0.8); // High confidence (found match)
    }

    #[test]
    fn test_match_local_no_match() {
        let mut agent = create_test_agent();
        let past_problem = Problem {
            description: "Unrelated problem".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Infrastructure],
        };
        let past_solution = Solution {
            recommendation: "Unrelated solution".to_string(),
            reasoning: vec!["Unrelated".to_string()],
            confidence: 0.9,
            source_level: SearchLevel::House,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
        agent.record_solution(past_problem, past_solution);

        let problem = Problem {
            description: "How do I integrate AI models?".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Innovation],
        };

        let solution = agent.match_local(&problem);
        assert_eq!(solution.source_level, SearchLevel::Local);
        assert!(solution.confidence < 0.5); // Low confidence (no match)
    }

    #[test]
    fn test_match_long_term_found() {
        let mut agent = create_test_agent();
        let past_problem = Problem {
            description: "AI model integration strategy".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Innovation],
        };
        let past_solution = Solution {
            recommendation: "Use LLM APIs with RAG architecture".to_string(),
            reasoning: vec!["RAG provides grounded responses".to_string()],
            confidence: 0.9,
            source_level: SearchLevel::House,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
        agent.record_solution(past_problem, past_solution);

        let problem = Problem {
            description: "How do I integrate AI models?".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Innovation],
        };

        let solution = agent.match_long_term(&problem);
        assert_eq!(solution.source_level, SearchLevel::LongTerm);
        assert!(solution.confidence > 0.7); // Medium-high confidence
    }

    #[test]
    fn test_match_long_term_not_found() {
        let agent = create_test_agent();
        let problem = Problem {
            description: "How do I design a prototype?".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Innovation],
        };

        let solution = agent.match_long_term(&problem);
        assert_eq!(solution.source_level, SearchLevel::LongTerm);
        assert!(solution.confidence < 0.5); // Low confidence (empty history)
    }

    #[test]
    fn test_match_house_design_pattern() {
        let agent = create_test_agent();
        let problem = Problem {
            description: "How do I implement the Factory pattern?".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Innovation],
        };

        let solution = agent.match_house(&problem);
        assert_eq!(solution.source_level, SearchLevel::House);
        assert!(solution.confidence > 0.8); // High confidence
        assert!(solution.recommendation.contains("Design Pattern"));
    }

    #[test]
    fn test_match_house_ai_model() {
        let agent = create_test_agent();
        let problem = Problem {
            description: "How do I integrate AI models into my application?".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Innovation],
        };

        let solution = agent.match_house(&problem);
        assert_eq!(solution.source_level, SearchLevel::House);
        assert!(solution.confidence > 0.8);
        assert!(solution.recommendation.contains("AI Model"));
    }

    #[test]
    fn test_match_house_feature_design() {
        let agent = create_test_agent();
        let problem = Problem {
            description: "How do I design a new feature for my product?".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Innovation],
        };

        let solution = agent.match_house(&problem);
        assert_eq!(solution.source_level, SearchLevel::House);
        assert!(solution.confidence > 0.8);
        assert!(solution.recommendation.contains("Feature Design"));
    }

    #[test]
    fn test_session_history_fifo() {
        let mut agent = create_test_agent();
        // Add 21 problems (1 more than capacity of 20)
        for i in 0..21 {
            let problem = Problem {
                description: format!("Problem {}", i),
                context: vec![],
                domain_hints: vec![Domain::Innovation],
            };
            let solution = Solution {
                recommendation: format!("Solution {}", i),
                reasoning: vec![format!("Reasoning {}", i)],
                confidence: 0.9,
                source_level: SearchLevel::House,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
            agent.record_solution(problem, solution);
        }

        // Session history should only have last 20 (0 should be popped)
        assert_eq!(agent.session_history.len(), 20);
        assert_eq!(agent.session_history[0].0.description, "Problem 1");
        assert_eq!(agent.session_history[19].0.description, "Problem 20");
    }

    #[test]
    fn test_decision_history_unlimited() {
        let mut agent = create_test_agent();
        // Add 30 problems (more than session history capacity)
        for i in 0..30 {
            let problem = Problem {
                description: format!("Problem {}", i),
                context: vec![],
                domain_hints: vec![Domain::Innovation],
            };
            let solution = Solution {
                recommendation: format!("Solution {}", i),
                reasoning: vec![format!("Reasoning {}", i)],
                confidence: 0.9,
                source_level: SearchLevel::House,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
            agent.record_solution(problem, solution);
        }

        // Decision history should have all 30
        assert_eq!(agent.decision_history.len(), 30);
        assert_eq!(agent.decision_history[0].0.description, "Problem 0");
        assert_eq!(agent.decision_history[29].0.description, "Problem 29");
    }

    #[tokio::test]
    async fn test_query_mentor_placeholder() {
        let agent = create_test_agent();
        let problem = Problem {
            description: "Complex design problem".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Innovation],
        };

        let result = agent.query_mentor(&problem).await;
        assert!(result.is_ok());
        let solution = result.unwrap();
        assert_eq!(solution.source_level, SearchLevel::Mentor);
        assert!(solution.confidence > 0.5);
    }

    #[test]
    fn test_calculate_confidence_with_keywords() {
        let agent = create_test_agent();
        let problem = Problem {
            description: "Design a new feature using AI models and creative patterns".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Innovation],
        };

        // Contains "design", "feature", "ai", "model", "creative", "pattern" (6 keywords)
        // Base: 0.3, Keywords: min(6 * 0.2, 0.6) = 0.6, Domain hint: 0.15 = 1.05 capped at 1.0
        let confidence = agent.calculate_confidence(&problem, "");
        assert!(confidence >= 0.9); // Should be near 1.0 with many keywords + domain hint
    }
}
