/**
 * Infrastructure Domain Agent - Deployment, Scaling, Architecture Expert
 *
 * DESIGN DECISION: First concrete DomainAgent implementation
 * WHY: Infrastructure domain is foundational - deployment, scaling, cloud platforms
 *
 * REASONING CHAIN:
 * 1. Infrastructure domain covers: Kubernetes, Docker, AWS/Azure/GCP, CI/CD, architecture
 * 2. Implements full 5-level breadcrumb search (Local → Long-term → House → Mentor → Ether)
 * 3. Uses domain-specific pattern library for House level (100 infrastructure patterns)
 * 4. Maintains session history for Local level (last 20 interactions)
 * 5. Maintains decision history for Long-term level (all past solutions)
 * 6. Mentor and Ether levels delegate to AgentNetwork (implemented in P3.5-007)
 *
 * PATTERN: Pattern-DOMAIN-003 (Infrastructure Agent)
 * RELATED: domain_agent.rs (trait), domain_pattern_library.rs (pattern storage)
 * PERFORMANCE: <50ms per level (Local/Long-term/House), <100ms for Mentor/Ether
 * FUTURE: Add infrastructure-specific confidence scoring, adaptive learning from outcomes
 */

use async_trait::async_trait;
use std::collections::VecDeque;

use crate::domain_agent::{
    Domain, DomainAgent, DomainEmbeddings, DomainPatternLibrary, Problem, SearchLevel, Solution,
};

/// Infrastructure Agent - Specializes in deployment, scaling, and architecture
///
/// DESIGN DECISION: Maintain session history (local), decision history (long-term), and domain patterns (house)
/// WHY: Each search level needs appropriate data structures
///
/// REASONING CHAIN:
/// 1. session_history: Recent interactions (VecDeque for fast FIFO, limit 20)
/// 2. decision_history: All past solutions (Vec for full history)
/// 3. domain_patterns: Infrastructure pattern library (from P3.5-002)
/// 4. domain_embeddings: Infrastructure embeddings (from P3.5-002)
/// 5. confidence_threshold: Configurable per agent (default 85%)
#[derive(Debug)]
pub struct InfrastructureAgent {
    /// Session history for Local level search (last 20 interactions)
    ///
    /// DESIGN DECISION: VecDeque with max capacity for fast FIFO
    /// WHY: Local level should search recent context only (<50ms)
    session_history: VecDeque<(Problem, Solution)>,

    /// Decision history for Long-term level search (all past solutions)
    ///
    /// DESIGN DECISION: Vec for full historical context
    /// WHY: Learn from all past decisions, not just recent
    decision_history: Vec<(Problem, Solution)>,

    /// Domain-specific pattern library (100 infrastructure patterns)
    ///
    /// DESIGN DECISION: Use DomainPatternLibrary from P3.5-002
    /// WHY: House level searches curated infrastructure patterns
    domain_patterns: DomainPatternLibrary,

    /// Domain-specific embeddings for semantic search
    ///
    /// DESIGN DECISION: Use DomainEmbeddings from P3.5-002
    /// WHY: Semantic similarity for pattern matching
    domain_embeddings: DomainEmbeddings,

    /// Confidence threshold for escalation (default 85%)
    ///
    /// DESIGN DECISION: Configurable per agent
    /// WHY: Infrastructure problems may need different thresholds than other domains
    confidence_threshold: f64,

    /// Maximum session history size (default 20)
    ///
    /// DESIGN DECISION: Limit to prevent unbounded growth
    /// WHY: Local search should be fast, not exhaustive
    #[allow(dead_code)] // TODO: Add session history pruning in Phase 3.6
    max_session_history: usize,
}

impl InfrastructureAgent {
    /// Create new Infrastructure Agent with default configuration
    ///
    /// DESIGN DECISION: Initialize with domain-specific patterns and embeddings
    /// WHY: Agent needs pattern library for House level search
    ///
    /// REASONING CHAIN:
    /// 1. Load infrastructure pattern library (from JSON or database)
    /// 2. Load infrastructure embeddings (from ONNX model)
    /// 3. Initialize empty session and decision histories
    /// 4. Set default confidence threshold (85%)
    /// 5. Set default session history limit (20)
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
    /// DESIGN DECISION: Automatically record all solutions for learning
    /// WHY: Agent learns from its own decisions (Long-term level)
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

    /// Calculate simple keyword-based confidence for now
    ///
    /// DESIGN DECISION: Simple keyword matching for P3.5-005
    /// WHY: Full semantic search requires embeddings integration (Phase 3.6)
    ///
    /// REASONING CHAIN:
    /// 1. Infrastructure keywords: deploy, k8s, docker, aws, cloud, scaling, etc.
    /// 2. Count keyword matches in problem description
    /// 3. Normalize by total keywords (0.0 to 1.0)
    /// 4. Future: Replace with semantic similarity via embeddings
    ///
    /// FUTURE: Phase 3.6 will add semantic similarity scoring
    fn calculate_confidence(&self, problem: &Problem, _solution: &str) -> f64 {
        let infrastructure_keywords = [
            "deploy", "deployment", "k8s", "kubernetes", "docker", "container",
            "aws", "azure", "gcp", "cloud", "scaling", "architecture",
            "load", "balancer", "database", "replica", "cluster", "node",
            "pod", "service", "ingress", "helm", "terraform", "ansible",
        ];

        let problem_lower = problem.description.to_lowercase();
        let matches = infrastructure_keywords
            .iter()
            .filter(|kw| problem_lower.contains(*kw))
            .count();

        // Normalize: 0 matches = 0.3 (low confidence), 3+ matches = 0.9 (high confidence)
        let base_confidence = 0.3 + (matches as f64 * 0.2).min(0.6);

        // Boost if domain hints include Infrastructure
        if problem.domain_hints.contains(&Domain::Infrastructure) {
            (base_confidence + 0.15).min(1.0)
        } else {
            base_confidence
        }
    }
}

#[async_trait]
impl DomainAgent for InfrastructureAgent {
    /// Agent's domain specialty
    fn domain(&self) -> Domain {
        Domain::Infrastructure
    }

    /// Domain-specific pattern library
    fn domain_patterns(&self) -> &DomainPatternLibrary {
        &self.domain_patterns
    }

    /// Domain-specific embeddings
    fn domain_embeddings(&self) -> &DomainEmbeddings {
        &self.domain_embeddings
    }

    /// Configurable confidence threshold
    fn confidence_threshold(&self) -> f64 {
        self.confidence_threshold
    }

    /// Level 1: Match against immediate context (last 20 interactions)
    ///
    /// DESIGN DECISION: Search only recent session history
    /// WHY: Local level should be fast (<50ms) and focus on current conversation
    ///
    /// REASONING CHAIN:
    /// 1. Search session_history (last 20 interactions)
    /// 2. Find problems similar to current problem
    /// 3. Return solution with highest confidence
    /// 4. If no matches, return low-confidence placeholder
    ///
    /// PERFORMANCE: O(n) where n = min(20, session_history.len())
    fn match_local(&self, problem: &Problem) -> Solution {
        // Search session history for similar problems
        for (past_problem, past_solution) in self.session_history.iter().rev() {
            // Simple string matching for now (TODO: semantic similarity)
            if past_problem.description.to_lowercase().contains(&problem.description.to_lowercase())
                || problem.description.to_lowercase().contains(&past_problem.description.to_lowercase())
            {
                // Found similar problem in recent history
                return Solution {
                    recommendation: format!(
                        "Based on recent context: {}",
                        past_solution.recommendation
                    ),
                    reasoning: vec![
                        "Searched recent session history (Local level)".to_string(),
                        format!("Found similar problem: {}", past_problem.description),
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
            recommendation: "No recent context found for this infrastructure problem".to_string(),
            reasoning: vec!["Searched session history (last 20 interactions)".to_string()],
            confidence: 0.3, // Low confidence - no local match
            source_level: SearchLevel::Local,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        }
    }

    /// Level 2: Match against historical decisions (all past solutions)
    ///
    /// DESIGN DECISION: Search full decision history
    /// WHY: Agent learns from all past decisions, not just recent
    ///
    /// REASONING CHAIN:
    /// 1. Search decision_history (all past solutions)
    /// 2. Find problems similar to current problem
    /// 3. Return solution with highest confidence
    /// 4. If no matches, return moderate-confidence general advice
    ///
    /// PERFORMANCE: O(n) where n = decision_history.len() (in-memory search)
    fn match_long_term(&self, problem: &Problem) -> Solution {
        // Search full decision history for similar problems
        let mut best_match: Option<&(Problem, Solution)> = None;
        let mut best_similarity = 0.0;

        for entry in &self.decision_history {
            // Calculate similarity (simple substring matching for now)
            let similarity = if entry.0.description.to_lowercase().contains(&problem.description.to_lowercase()) {
                0.8
            } else if problem.description.to_lowercase().contains(&entry.0.description.to_lowercase()) {
                0.7
            } else {
                // Check for common keywords
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
                        "Based on past experience: {}",
                        past_solution.recommendation
                    ),
                    reasoning: vec![
                        "Searched long-term decision history".to_string(),
                        format!("Found similar problem: {}", past_problem.description),
                        format!("Similarity: {:.2}", best_similarity),
                    ],
                    confidence: (best_similarity * 0.8).max(0.4), // Scale to 0.4-0.8 range
                    source_level: SearchLevel::LongTerm,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
            }
        }

        // No strong match in long-term history
        Solution {
            recommendation: "Consider infrastructure best practices: use containers for portability, implement auto-scaling, monitor metrics".to_string(),
            reasoning: vec![
                "Searched long-term decision history".to_string(),
                "No strong historical match found".to_string(),
                "Providing general infrastructure guidance".to_string(),
            ],
            confidence: 0.5, // Moderate confidence - general advice
            source_level: SearchLevel::LongTerm,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        }
    }

    /// Level 3: Match against domain pattern library (100 infrastructure patterns)
    ///
    /// DESIGN DECISION: Search domain-specific patterns
    /// WHY: House level provides curated infrastructure expertise
    ///
    /// REASONING CHAIN:
    /// 1. Search domain_patterns for matching patterns
    /// 2. Use pattern library's semantic search (ChromaDB)
    /// 3. Return best matching pattern
    /// 4. If no matches, return infrastructure-specific guidance
    ///
    /// PERFORMANCE: <50ms (local vector search via ChromaDB)
    fn match_house(&self, problem: &Problem) -> Solution {
        // For now, use simple keyword matching against pattern titles
        // Future: Full semantic search via domain_patterns.search()

        let infrastructure_patterns = vec![
            ("Kubernetes Deployment", "Use Deployment for stateless apps, StatefulSet for stateful apps with persistent storage", 0.9),
            ("Docker Compose", "Use docker-compose for local dev, Kubernetes for production multi-container orchestration", 0.85),
            ("AWS Auto Scaling", "Configure Auto Scaling Groups with target tracking policies for cost-effective scalability", 0.9),
            ("Load Balancer Setup", "Use Application Load Balancer for HTTP/HTTPS, Network Load Balancer for TCP/UDP", 0.88),
            ("Database Replication", "Use read replicas for read-heavy workloads, multi-AZ for high availability", 0.87),
        ];

        let problem_lower = problem.description.to_lowercase();

        for (title, recommendation, confidence) in &infrastructure_patterns {
            if problem_lower.contains(&title.to_lowercase()) {
                return Solution {
                    recommendation: recommendation.to_string(),
                    reasoning: vec![
                        "Searched infrastructure pattern library (House level)".to_string(),
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

        // Check for keyword matches
        if problem_lower.contains("deploy") || problem_lower.contains("kubernetes") {
            return Solution {
                recommendation: infrastructure_patterns[0].1.to_string(),
                reasoning: vec![
                    "Searched infrastructure pattern library".to_string(),
                    "Matched deployment-related keywords".to_string(),
                ],
                confidence: 0.75,
                source_level: SearchLevel::House,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
        }

        if problem_lower.contains("docker") {
            return Solution {
                recommendation: infrastructure_patterns[1].1.to_string(),
                reasoning: vec![
                    "Searched infrastructure pattern library".to_string(),
                    "Matched Docker-related keywords".to_string(),
                ],
                confidence: 0.75,
                source_level: SearchLevel::House,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
        }

        // Default infrastructure guidance
        Solution {
            recommendation: "Follow infrastructure best practices: containerization, orchestration, monitoring, auto-scaling, and disaster recovery".to_string(),
            reasoning: vec![
                "Searched infrastructure pattern library".to_string(),
                "No exact pattern match found".to_string(),
                "Providing general infrastructure best practices".to_string(),
            ],
            confidence: 0.65, // Moderate-high confidence - domain expertise
            source_level: SearchLevel::House,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        }
    }

    /// Level 4: Query other domain agents (cross-agent collaboration)
    ///
    /// DESIGN DECISION: Placeholder for P3.5-007 (Agent Network)
    /// WHY: Mentor layer requires AgentNetwork infrastructure
    ///
    /// REASONING CHAIN:
    /// 1. P3.5-007 will implement AgentNetwork for cross-agent queries
    /// 2. For now, return placeholder indicating Mentor layer not yet operational
    /// 3. Future: Query Knowledge agent for data modeling, Quality agent for testing, etc.
    ///
    /// PERFORMANCE: Target <100ms (network communication)
    /// FUTURE: P3.5-007 will implement full mentor query logic
    async fn query_mentor(&self, problem: &Problem) -> Result<Solution, String> {
        // Placeholder for P3.5-007
        Ok(Solution {
            recommendation: format!(
                "Mentor query not yet implemented. Would query: {:?} agents for multi-domain insights",
                problem.domain_hints
            ),
            reasoning: vec![
                "Mentor level (cross-agent collaboration)".to_string(),
                "AgentNetwork not yet implemented (P3.5-007)".to_string(),
            ],
            confidence: 0.6, // Moderate confidence - placeholder
            source_level: SearchLevel::Mentor,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        })
    }

    /// Level 5: Query DHT network (universal search)
    ///
    /// DESIGN DECISION: Placeholder for P3.5-007 (Agent Network + DHT integration)
    /// WHY: Ether layer requires DHT network infrastructure
    ///
    /// REASONING CHAIN:
    /// 1. P3.5-007 will integrate with existing HierarchicalDHTClient
    /// 2. For now, return placeholder indicating Ether layer not yet operational
    /// 3. Future: Query global DHT for patterns from other users/organizations
    ///
    /// PERFORMANCE: Target <100ms (DHT lookup via Kademlia)
    /// FUTURE: P3.5-007 will implement full DHT query logic
    async fn query_ether(&self, _problem: &Problem) -> Result<Solution, String> {
        // Placeholder for P3.5-007
        Ok(Solution {
            recommendation: "Ether query not yet implemented. Would search global DHT network for patterns".to_string(),
            reasoning: vec![
                "Ether level (universal DHT search)".to_string(),
                "DHT integration not yet implemented (P3.5-007)".to_string(),
            ],
            confidence: 0.55, // Moderate confidence - placeholder
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

    fn create_test_agent() -> InfrastructureAgent {
        let patterns = DomainPatternLibrary {
            domain: Domain::Infrastructure,
            patterns: vec!["deployment".to_string(), "scaling".to_string()],
        };

        let embeddings = DomainEmbeddings {
            domain: Domain::Infrastructure,
            embeddings: vec![],
        };

        InfrastructureAgent::new(patterns, embeddings)
    }

    #[test]
    fn test_infrastructure_agent_domain() {
        let agent = create_test_agent();
        assert_eq!(agent.domain(), Domain::Infrastructure);
    }

    #[test]
    fn test_infrastructure_agent_default_threshold() {
        let agent = create_test_agent();
        assert_eq!(agent.confidence_threshold(), 0.85);
    }

    #[test]
    fn test_infrastructure_agent_custom_threshold() {
        let patterns = DomainPatternLibrary {
            domain: Domain::Infrastructure,
            patterns: vec![],
        };
        let embeddings = DomainEmbeddings {
            domain: Domain::Infrastructure,
            embeddings: vec![],
        };

        let agent = InfrastructureAgent::with_config(patterns, embeddings, 0.9, 10);
        assert_eq!(agent.confidence_threshold(), 0.9);
        assert_eq!(agent.max_session_history, 10);
    }

    #[test]
    fn test_match_local_no_history() {
        let agent = create_test_agent();

        let problem = Problem {
            description: "How do I deploy to Kubernetes?".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Infrastructure],
        };

        let solution = agent.match_local(&problem);
        assert_eq!(solution.source_level, SearchLevel::Local);
        assert!(solution.confidence < 0.5); // Low confidence - no history
    }

    #[test]
    fn test_match_local_with_history() {
        let mut agent = create_test_agent();

        // Add to history
        let past_problem = Problem {
            description: "Kubernetes deployment strategy".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Infrastructure],
        };

        let past_solution = Solution {
            recommendation: "Use Deployment for stateless apps".to_string(),
            reasoning: vec![],
            confidence: 0.9,
            source_level: SearchLevel::House,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };

        agent.record_solution(past_problem, past_solution);

        // Query similar problem
        let problem = Problem {
            description: "How do I deploy to Kubernetes?".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Infrastructure],
        };

        let solution = agent.match_local(&problem);
        assert_eq!(solution.source_level, SearchLevel::Local);
        assert!(solution.confidence > 0.5); // Found match in history
    }

    #[test]
    fn test_match_long_term_no_history() {
        let agent = create_test_agent();

        let problem = Problem {
            description: "AWS auto-scaling configuration".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Infrastructure],
        };

        let solution = agent.match_long_term(&problem);
        assert_eq!(solution.source_level, SearchLevel::LongTerm);
        assert!(solution.confidence >= 0.4); // General advice
    }

    #[test]
    fn test_match_house_kubernetes() {
        let agent = create_test_agent();

        let problem = Problem {
            description: "Need help with Kubernetes deployment".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Infrastructure],
        };

        let solution = agent.match_house(&problem);
        assert_eq!(solution.source_level, SearchLevel::House);
        assert!(solution.confidence >= 0.7); // Domain pattern match
        assert!(solution.recommendation.contains("Deployment"));
    }

    #[test]
    fn test_match_house_docker() {
        let agent = create_test_agent();

        let problem = Problem {
            description: "Docker container orchestration".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Infrastructure],
        };

        let solution = agent.match_house(&problem);
        assert_eq!(solution.source_level, SearchLevel::House);
        assert!(solution.confidence >= 0.7);
        assert!(solution.recommendation.contains("docker-compose"));
    }

    #[tokio::test]
    async fn test_query_mentor_placeholder() {
        let agent = create_test_agent();

        let problem = Problem {
            description: "Multi-domain infrastructure problem".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Infrastructure, Domain::Scalability],
        };

        let solution = agent.query_mentor(&problem).await.unwrap();
        assert_eq!(solution.source_level, SearchLevel::Mentor);
        assert!(solution.recommendation.contains("not yet implemented"));
    }

    #[tokio::test]
    async fn test_query_ether_placeholder() {
        let agent = create_test_agent();

        let problem = Problem {
            description: "Novel infrastructure challenge".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Infrastructure],
        };

        let solution = agent.query_ether(&problem).await.unwrap();
        assert_eq!(solution.source_level, SearchLevel::Ether);
        assert!(solution.recommendation.contains("not yet implemented"));
    }

    #[tokio::test]
    async fn test_full_escalation_infrastructure() {
        let mut agent = create_test_agent();

        let problem = Problem {
            description: "How do I deploy to AWS?".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Infrastructure],
        };

        let solution = agent.solve_with_escalation(problem).await.unwrap();

        // Should find solution at House level (domain patterns)
        // Confidence should be high enough to stop before Mentor
        assert!(solution.confidence >= 0.6);
    }

    #[test]
    fn test_session_history_limit() {
        let mut agent = create_test_agent();

        // Add 25 entries (max is 20)
        for i in 0..25 {
            let problem = Problem {
                description: format!("Problem {}", i),
                context: vec![],
                domain_hints: vec![Domain::Infrastructure],
            };

            let solution = Solution {
                recommendation: format!("Solution {}", i),
                reasoning: vec![],
                confidence: 0.8,
                source_level: SearchLevel::Local,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };

            agent.record_solution(problem, solution);
        }

        // Should only keep last 20
        assert_eq!(agent.session_history.len(), 20);
        // Should keep all in decision history
        assert_eq!(agent.decision_history.len(), 25);
    }

    #[test]
    fn test_calculate_confidence_with_keywords() {
        let agent = create_test_agent();

        let problem_with_keywords = Problem {
            description: "Deploy a Docker container to Kubernetes cluster with AWS load balancer".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Infrastructure],
        };

        let problem_no_keywords = Problem {
            description: "Generic question about something".to_string(),
            context: vec![],
            domain_hints: vec![],
        };

        let conf1 = agent.calculate_confidence(&problem_with_keywords, "solution");
        let conf2 = agent.calculate_confidence(&problem_no_keywords, "solution");

        assert!(conf1 > conf2); // Keywords should increase confidence
        assert!(conf1 >= 0.8); // Multiple keywords + domain hint
        assert!(conf2 < 0.5); // No keywords, no domain hint
    }
}
