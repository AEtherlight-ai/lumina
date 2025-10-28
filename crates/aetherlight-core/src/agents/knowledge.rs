/**
 * Knowledge Domain Agent - Semantic Search & Data Modeling Expert
 *
 * DESIGN DECISION: Fourth domain agent specializing in knowledge graphs, data modeling, and semantic search
 * WHY: Knowledge management and data architecture require specialized expertise for optimal solutions
 *
 * REASONING CHAIN:
 * 1. Knowledge domain covers semantic search, knowledge graphs, data modeling, schema design
 * 2. Session history stores recent interactions (last 20, FIFO) for fast Local level searches
 * 3. Decision history stores all past solutions (unlimited) for Long-term level learning
 * 4. Keyword-based confidence scoring provides fast estimation before semantic search
 * 5. 5 seed patterns provide high-quality starting knowledge for common scenarios
 * 6. Domain-specific embeddings enable semantic similarity matching (Phase 3.6)
 * 7. Placeholder mentor/ether methods will be implemented when AgentNetwork integration complete
 *
 * PATTERN: Pattern-DOMAIN-006 (Knowledge Agent)
 * RELATED: domain_agent.rs (trait), domain_pattern_library.rs (pattern storage)
 * PERFORMANCE: <20ms pattern match, <5ms confidence calculation
 * FUTURE: Semantic embeddings (Phase 3.6), Real mentor queries (P3.5-013)
 */

use async_trait::async_trait;
use std::collections::VecDeque;

use crate::domain_agent::{
    Domain, DomainAgent, DomainEmbeddings, DomainPatternLibrary, Problem, SearchLevel, Solution,
};

/**
 * KnowledgeAgent - Fourth concrete domain agent implementation
 *
 * DESIGN DECISION: Identical architecture to Infrastructure/Quality/Scalability agents
 * WHY: Validated pattern enables consistency, testability, and reusability
 *
 * ARCHITECTURE:
 * - Session history: VecDeque (FIFO, last 20) for fast recent lookups
 * - Decision history: Vec (unlimited) for comprehensive learning
 * - Domain patterns: Isolated pattern library for Knowledge domain
 * - Domain embeddings: Semantic search capability (all-MiniLM-L6-v2, 384 dims)
 * - Confidence threshold: 0.85 default (configurable)
 * - Max session history: 20 default (configurable)
 */
#[derive(Debug)]
pub struct KnowledgeAgent {
    session_history: VecDeque<(Problem, Solution)>,
    decision_history: Vec<(Problem, Solution)>,
    domain_patterns: DomainPatternLibrary,
    domain_embeddings: DomainEmbeddings,
    confidence_threshold: f64,
    #[allow(dead_code)] // TODO: Add session history pruning in Phase 3.6
    max_session_history: usize,
}

impl KnowledgeAgent {
    /**
     * Create new KnowledgeAgent with default configuration
     *
     * DESIGN DECISION: Default constructor for standard use cases
     * WHY: Most agents use standard configuration (85% threshold, 20 history)
     *
     * PARAMETERS:
     * - patterns: DomainPatternLibrary for Knowledge domain
     * - embeddings: DomainEmbeddings for semantic search
     *
     * RETURNS: Configured KnowledgeAgent ready for use
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
     * Create KnowledgeAgent with custom configuration
     *
     * DESIGN DECISION: Custom constructor for specialized use cases
     * WHY: Some scenarios need different thresholds or history sizes
     *
     * PARAMETERS:
     * - patterns: DomainPatternLibrary for Knowledge domain
     * - embeddings: DomainEmbeddings for semantic search
     * - confidence_threshold: Custom threshold (e.g., 0.90 for strict, 0.70 for lenient)
     * - max_session_history: Custom history size (e.g., 50 for high-traffic)
     *
     * RETURNS: Configured KnowledgeAgent with custom settings
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
     * Record solution in session and decision history
     *
     * DESIGN DECISION: Dual history tracking (session + decision)
     * WHY: Session history provides fast recent lookups (FIFO), decision history enables long-term learning
     *
     * REASONING CHAIN:
     * 1. Check if session history is full (>= max_session_history)
     * 2. If full, pop oldest entry (FIFO behavior)
     * 3. Push new entry to session history
     * 4. Always append to decision history (unlimited growth)
     * 5. Enables both fast recent searches and comprehensive learning
     *
     * TODO: Auto-record in Phase 3.6 (after solve_with_escalation calls)
     */
    #[allow(dead_code)] // Placeholder for Phase 3.6 automatic solution recording
    fn record_solution(&mut self, problem: Problem, solution: Solution) {
        // FIFO: Remove oldest if at capacity
        if self.session_history.len() >= self.max_session_history {
            self.session_history.pop_front();
        }

        // Add to session history (fast recent lookups)
        self.session_history.push_back((problem.clone(), solution.clone()));

        // Add to decision history (comprehensive learning)
        self.decision_history.push((problem, solution));
    }

    /**
     * Calculate confidence score for a problem-solution pair
     *
     * DESIGN DECISION: Keyword-based confidence scoring
     * WHY: Fast (<5ms), explainable, works well for knowledge domain terminology
     *
     * REASONING CHAIN:
     * 1. Define 21 knowledge-specific keywords (database, schema, graph, vector, semantic, etc.)
     * 2. Convert problem description to lowercase for case-insensitive matching
     * 3. Count keyword matches in problem description
     * 4. Base confidence: 0.3 + (matches * 0.2) capped at 0.9
     * 5. Boost by 0.15 if problem explicitly hints Knowledge domain
     * 6. Total confidence capped at 1.0
     *
     * PERFORMANCE: O(keywords * avg_word_length) = O(21 * 10) = ~210 ops = <5ms
     */
    fn calculate_confidence(&self, problem: &Problem, _solution: &str) -> f64 {
        let knowledge_keywords = [
            "database", "schema", "model", "data", "graph", "knowledge",
            "embedding", "vector", "semantic", "search", "query", "sql",
            "nosql", "index", "relationship", "entity", "ontology", "taxonomy",
            "rdf", "triple", "sparql",
        ]; // 21 keywords

        let problem_lower = problem.description.to_lowercase();
        let matches = knowledge_keywords
            .iter()
            .filter(|kw| problem_lower.contains(*kw))
            .count();

        // Base confidence from keyword matches (0.3 base + up to 0.6 from matches)
        let base_confidence = 0.3 + (matches as f64 * 0.2).min(0.6);

        // Boost if domain hint present
        if problem.domain_hints.contains(&Domain::Knowledge) {
            (base_confidence + 0.15).min(1.0)
        } else {
            base_confidence
        }
    }
}

/**
 * DomainAgent trait implementation for KnowledgeAgent
 *
 * DESIGN DECISION: Full trait implementation with 5-level breadcrumb escalation
 * WHY: Provides standardized interface for all domain agents
 */
#[async_trait]
impl DomainAgent for KnowledgeAgent {
    /**
     * Return domain identity
     *
     * DESIGN DECISION: Static domain identification
     * WHY: Enables routing and agent selection
     */
    fn domain(&self) -> Domain {
        Domain::Knowledge
    }

    /**
     * Access domain-specific pattern library
     *
     * DESIGN DECISION: Immutable reference to pattern library
     * WHY: Prevents accidental modification, enables safe concurrent access
     */
    fn domain_patterns(&self) -> &DomainPatternLibrary {
        &self.domain_patterns
    }

    /**
     * Access domain-specific embeddings
     *
     * DESIGN DECISION: Immutable reference to embeddings
     * WHY: Embeddings are read-only during agent operation
     */
    fn domain_embeddings(&self) -> &DomainEmbeddings {
        &self.domain_embeddings
    }

    /**
     * Get confidence threshold for this agent
     *
     * DESIGN DECISION: Configurable threshold (default 0.85)
     * WHY: Different scenarios need different confidence requirements
     */
    fn confidence_threshold(&self) -> f64 {
        self.confidence_threshold
    }

    /**
     * Level 1: Search recent session history
     *
     * DESIGN DECISION: FIFO buffer of last N interactions (default 20)
     * WHY: Most problems are similar to recent ones (temporal locality)
     *
     * REASONING CHAIN:
     * 1. Check if session history is empty (cold start)
     * 2. If empty, return low-confidence failure
     * 3. If not empty, search recent solutions (last 20 interactions)
     * 4. Find best match based on problem similarity
     * 5. Return high-confidence solution if found
     *
     * PERFORMANCE: O(session_size) = O(20) = <1ms
     */
    fn match_local(&self, problem: &Problem) -> Solution {
        if self.session_history.is_empty() {
            return Solution {
                recommendation: "No recent knowledge interactions found. Try Knowledge.match_long_term() or Knowledge.match_house().".to_string(),
                reasoning: vec!["Searched session history (empty - cold start)".to_string()],
                confidence: 0.1,
                source_level: SearchLevel::Local,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
        }

        // Search recent history (last 20 interactions)
        for (past_problem, past_solution) in self.session_history.iter().rev() {
            if past_problem.description.to_lowercase().contains(&problem.description.to_lowercase())
                || problem.description.to_lowercase().contains(&past_problem.description.to_lowercase())
            {
                return Solution {
                    recommendation: format!("Recently solved similar problem: {}", past_solution.recommendation),
                    reasoning: vec![
                        "Searched session history (Local level)".to_string(),
                        format!("Found similar problem: {}", past_problem.description),
                    ],
                    confidence: 0.9, // High confidence from recent success
                    source_level: SearchLevel::Local,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
            }
        }

        Solution {
            recommendation: "No matching recent solutions. Escalating to long-term memory.".to_string(),
            reasoning: vec!["Searched session history (last 20 interactions)".to_string()],
            confidence: 0.3,
            source_level: SearchLevel::Local,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        }
    }

    /**
     * Level 2: Search comprehensive decision history
     *
     * DESIGN DECISION: Unlimited history for comprehensive learning
     * WHY: Knowledge problems may recur after long periods
     *
     * REASONING CHAIN:
     * 1. Search all past decisions (unlimited history)
     * 2. Find problems with keyword overlap
     * 3. Return best match with medium-high confidence
     * 4. If no match, escalate to House level (domain patterns)
     *
     * PERFORMANCE: O(decision_count) = O(100-1000) = <10ms
     */
    fn match_long_term(&self, problem: &Problem) -> Solution {
        // Search comprehensive decision history
        for (past_problem, past_solution) in self.decision_history.iter() {
            if past_problem.description.to_lowercase().contains(&problem.description.to_lowercase())
                || problem.description.to_lowercase().contains(&past_problem.description.to_lowercase())
            {
                return Solution {
                    recommendation: format!("Found in long-term memory: {}", past_solution.recommendation),
                    reasoning: vec![
                        "Searched decision history (Long-term level)".to_string(),
                        format!("Found similar problem: {}", past_problem.description),
                    ],
                    confidence: 0.85, // High confidence from past success
                    source_level: SearchLevel::LongTerm,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
            }
        }

        Solution {
            recommendation: "No match in long-term memory. Escalating to house patterns.".to_string(),
            reasoning: vec!["Searched all decision history (no match)".to_string()],
            confidence: 0.4,
            source_level: SearchLevel::LongTerm,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        }
    }

    /**
     * Level 3: Search domain-specific pattern library
     *
     * DESIGN DECISION: 5 seed patterns for Knowledge domain
     * WHY: Provides high-quality starting knowledge for common scenarios
     *
     * SEED PATTERNS:
     * 1. Knowledge Graph Design - Build RDF/property graphs with clear ontology
     * 2. Data Modeling - Normalize to 3NF, denormalize for read-heavy workloads
     * 3. Semantic Search - Use embeddings (384-dim all-MiniLM-L6-v2) + vector DB (ChromaDB/Pinecone)
     * 4. Schema Design - PostgreSQL for ACID, MongoDB for flexible schemas, use migrations
     * 5. Query Optimization - Add indexes, avoid N+1 queries, use EXPLAIN, consider caching
     *
     * PERFORMANCE: O(pattern_count) = O(5) = <5ms
     */
    fn match_house(&self, problem: &Problem) -> Solution {
        let knowledge_patterns = vec![
            (
                "Knowledge Graph Design",
                "Use RDF or property graph (Neo4j) with clear ontology. Define entities, relationships, and attributes. Use standard vocabularies (Schema.org, FOAF). Enable reasoning with SPARQL or Cypher queries.",
                0.88,
            ),
            (
                "Data Modeling Best Practices",
                "Normalize to 3NF for write-heavy workloads, denormalize for read-heavy. Use foreign keys for integrity. Consider star schema for analytics. Document with ER diagrams.",
                0.9,
            ),
            (
                "Semantic Search Implementation",
                "Use embeddings (all-MiniLM-L6-v2, 384 dims) for text → vector. Store in vector DB (ChromaDB, Pinecone, Weaviate). Query with cosine similarity. Threshold 0.7+ for relevance.",
                0.92,
            ),
            (
                "Schema Design Patterns",
                "PostgreSQL for ACID + complex queries, MongoDB for flexible schemas, Redis for caching. Use migrations (Flyway, Liquibase). Version schemas. Test with realistic data volumes.",
                0.89,
            ),
            (
                "Query Optimization Techniques",
                "Add indexes for frequently queried columns. Avoid N+1 queries (use joins or batch loading). Use EXPLAIN to analyze query plans. Consider materialized views for expensive aggregations. Cache results (Redis, Memcached).",
                0.91,
            ),
        ];

        let problem_lower = problem.description.to_lowercase();

        // Match patterns by keyword relevance
        for (title, description, base_confidence) in &knowledge_patterns {
            let keywords = title.to_lowercase();
            if problem_lower.contains(&keywords)
                || keywords.contains(&problem_lower)
                || (problem_lower.contains("knowledge") && title.contains("Knowledge"))
                || (problem_lower.contains("data") && title.contains("Data"))
                || (problem_lower.contains("semantic") && title.contains("Semantic"))
                || (problem_lower.contains("schema") && title.contains("Schema"))
                || (problem_lower.contains("query") && title.contains("Query"))
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

        // Default: Return first pattern with lower confidence
        Solution {
            recommendation: format!(
                "{}: {} (generic match)",
                knowledge_patterns[0].0, knowledge_patterns[0].1
            ),
            reasoning: vec!["Searched domain patterns (generic match)".to_string()],
            confidence: 0.5,
            source_level: SearchLevel::House,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        }
    }

    /**
     * Level 4: Query other domain agents (mentor layer)
     *
     * DESIGN DECISION: Placeholder for cross-agent communication
     * WHY: AgentNetwork integration not yet complete (P3.5-013)
     *
     * FUTURE: Real mentor queries via AgentNetwork.mentor_query()
     */
    async fn query_mentor(&self, problem: &Problem) -> Result<Solution, String> {
        // Placeholder: Real implementation in P3.5-013 (Integration Tests)
        Ok(Solution {
            recommendation: format!(
                "Mentor query for '{}' (placeholder - will be implemented in P3.5-013)",
                problem.description
            ),
            reasoning: vec!["Placeholder mentor query".to_string()],
            confidence: 0.6,
            source_level: SearchLevel::Mentor,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        })
    }

    /**
     * Level 5: Query distributed neural mesh (ether layer)
     *
     * DESIGN DECISION: Placeholder for distributed pattern network
     * WHY: DHT-based pattern discovery not yet integrated (Phase 3.7)
     *
     * FUTURE: Real ether queries via HierarchicalDHTClient
     */
    async fn query_ether(&self, problem: &Problem) -> Result<Solution, String> {
        // Placeholder: Real implementation in Phase 3.7
        Ok(Solution {
            recommendation: format!(
                "Ether query for '{}' (placeholder - will be implemented in Phase 3.7)",
                problem.description
            ),
            reasoning: vec!["Placeholder ether query".to_string()],
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

    fn create_test_agent() -> KnowledgeAgent {
        let patterns = DomainPatternLibrary::new(
            Domain::Knowledge,
            PathBuf::from("data/patterns/knowledge"),
        )
        .expect("Failed to create pattern library");
        let embeddings = DomainEmbeddings::new().expect("Failed to create embeddings");
        KnowledgeAgent::new(patterns, embeddings)
    }

    /**
     * Test: Create new KnowledgeAgent with default configuration
     *
     * VALIDATES: Agent initialization with correct defaults
     */
    #[test]
    fn test_new_knowledge_agent() {
        let agent = create_test_agent();
        assert_eq!(agent.domain(), Domain::Knowledge);
        assert_eq!(agent.confidence_threshold(), 0.85);
        assert_eq!(agent.max_session_history, 20);
    }

    /**
     * Test: Create KnowledgeAgent with custom configuration
     *
     * VALIDATES: Custom threshold and history size respected
     */
    #[test]
    fn test_knowledge_agent_with_config() {
        let patterns = DomainPatternLibrary::new(
            Domain::Knowledge,
            PathBuf::from("data/patterns/knowledge"),
        )
        .expect("Failed to create pattern library");
        let embeddings = DomainEmbeddings::new().expect("Failed to create embeddings");

        let agent = KnowledgeAgent::with_config(patterns, embeddings, 0.90, 50);
        assert_eq!(agent.confidence_threshold(), 0.90);
        assert_eq!(agent.max_session_history, 50);
    }

    /**
     * Test: Domain returns Knowledge
     *
     * VALIDATES: Correct domain identification for routing
     */
    #[test]
    fn test_domain() {
        let agent = create_test_agent();
        assert_eq!(agent.domain(), Domain::Knowledge);
    }

    /**
     * Test: Domain patterns accessible
     *
     * VALIDATES: Pattern library integration
     */
    #[test]
    fn test_domain_patterns() {
        let agent = create_test_agent();
        let _patterns = agent.domain_patterns();
        // Pattern library exists and is accessible
    }

    /**
     * Test: Domain embeddings accessible
     *
     * VALIDATES: Embeddings integration for semantic search
     */
    #[test]
    fn test_domain_embeddings() {
        let agent = create_test_agent();
        let _embeddings = agent.domain_embeddings();
        // Embeddings exist and are accessible
    }

    /**
     * Test: Confidence threshold configurable
     *
     * VALIDATES: Threshold customization for different use cases
     */
    #[test]
    fn test_confidence_threshold() {
        let agent = create_test_agent();
        assert_eq!(agent.confidence_threshold(), 0.85);
    }

    /**
     * Test: Local match returns low confidence when history empty
     *
     * VALIDATES: Cold start handling (no session history yet)
     */
    #[test]
    fn test_match_local_empty_history() {
        let agent = create_test_agent();
        let problem = Problem {
            description: "How do I design a knowledge graph?".to_string(),
            domain_hints: vec![Domain::Knowledge],
        };

        let solution = agent.match_local(&problem);
        assert_eq!(solution.source_level, SearchLevel::Local);
        assert!(solution.confidence < 0.5); // Low confidence (cold start)
    }

    /**
     * Test: Local match finds recent solution
     *
     * VALIDATES: Session history search functionality
     */
    #[test]
    fn test_match_local_with_history() {
        let mut agent = create_test_agent();

        // Add solution to session history
        let past_problem = Problem {
            description: "How do I design a knowledge graph?".to_string(),
            domain_hints: vec![Domain::Knowledge],
        };
        let past_solution = Solution {
            recommendation: "Use RDF with clear ontology".to_string(),
            reasoning: vec!["Pattern from house level".to_string()],
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
            description: "knowledge graph design".to_string(),
            domain_hints: vec![Domain::Knowledge],
        };
        let solution = agent.match_local(&problem);

        assert_eq!(solution.source_level, SearchLevel::Local);
        assert!(solution.confidence > 0.8); // High confidence (found recent match)
    }

    /**
     * Test: Long-term match searches decision history
     *
     * VALIDATES: Comprehensive history search
     */
    #[test]
    fn test_match_long_term() {
        let mut agent = create_test_agent();

        // Add to decision history
        let past_problem = Problem {
            description: "semantic search implementation".to_string(),
            domain_hints: vec![Domain::Knowledge],
        };
        let past_solution = Solution {
            recommendation: "Use embeddings with vector DB".to_string(),
            reasoning: vec!["Pattern from house level".to_string()],
            confidence: 0.9,
            source_level: SearchLevel::House,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
        agent.record_solution(past_problem, past_solution);

        let problem = Problem {
            description: "How to implement semantic search?".to_string(),
            domain_hints: vec![Domain::Knowledge],
        };
        let solution = agent.match_long_term(&problem);

        assert_eq!(solution.source_level, SearchLevel::LongTerm);
        assert!(solution.confidence >= 0.8); // High confidence from past success
    }

    /**
     * Test: House match returns knowledge patterns
     *
     * VALIDATES: All 5 seed patterns (knowledge graph, data modeling, semantic search, schema design, query optimization)
     */
    #[test]
    fn test_match_house_knowledge_graph() {
        let agent = create_test_agent();
        let problem = Problem {
            description: "How do I design a knowledge graph?".to_string(),
            domain_hints: vec![Domain::Knowledge],
        };

        let solution = agent.match_house(&problem);
        assert_eq!(solution.source_level, SearchLevel::House);
        assert!(solution.recommendation.contains("Knowledge Graph") || solution.recommendation.contains("RDF"));
        assert!(solution.confidence > 0.5);
    }

    #[test]
    fn test_match_house_data_modeling() {
        let agent = create_test_agent();
        let problem = Problem {
            description: "Best practices for data modeling".to_string(),
            domain_hints: vec![Domain::Knowledge],
        };

        let solution = agent.match_house(&problem);
        assert_eq!(solution.source_level, SearchLevel::House);
        assert!(solution.recommendation.contains("Data Modeling") || solution.recommendation.contains("Normalize"));
    }

    #[test]
    fn test_match_house_semantic_search() {
        let agent = create_test_agent();
        let problem = Problem {
            description: "How to implement semantic search?".to_string(),
            domain_hints: vec![Domain::Knowledge],
        };

        let solution = agent.match_house(&problem);
        assert_eq!(solution.source_level, SearchLevel::House);
        assert!(solution.recommendation.contains("Semantic Search") || solution.recommendation.contains("embeddings"));
    }

    #[test]
    fn test_match_house_schema_design() {
        let agent = create_test_agent();
        let problem = Problem {
            description: "Database schema design patterns".to_string(),
            domain_hints: vec![Domain::Knowledge],
        };

        let solution = agent.match_house(&problem);
        assert_eq!(solution.source_level, SearchLevel::House);
        assert!(solution.recommendation.contains("Schema") || solution.recommendation.contains("PostgreSQL"));
    }

    #[test]
    fn test_match_house_query_optimization() {
        let agent = create_test_agent();
        let problem = Problem {
            description: "How to optimize database queries?".to_string(),
            domain_hints: vec![Domain::Knowledge],
        };

        let solution = agent.match_house(&problem);
        assert_eq!(solution.source_level, SearchLevel::House);
        assert!(solution.recommendation.contains("Query") || solution.recommendation.contains("optimization"));
    }

    /**
     * Test: Session history FIFO behavior
     *
     * VALIDATES: Old entries removed when capacity exceeded
     */
    #[test]
    fn test_session_history_fifo() {
        let mut agent = create_test_agent();

        // Fill session history beyond capacity (20 entries)
        for i in 0..25 {
            let problem = Problem {
                description: format!("Problem {}", i),
                domain_hints: vec![Domain::Knowledge],
            };
            let solution = Solution {
                recommendation: format!("Solution {}", i),
                reasoning: vec!["Test reasoning".to_string()],
                confidence: 0.9,
                source_level: SearchLevel::House,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
            agent.record_solution(problem, solution);
        }

        // Session history should be capped at 20
        assert_eq!(agent.session_history.len(), 20);

        // Oldest entries (0-4) should be removed, newest (5-24) retained
        let oldest = &agent.session_history.front().unwrap().0;
        assert!(oldest.description.contains("Problem 5")); // Oldest is now Problem 5 (0-4 removed)
    }

    /**
     * Test: Decision history unlimited growth
     *
     * VALIDATES: All decisions retained for long-term learning
     */
    #[test]
    fn test_decision_history_unlimited() {
        let mut agent = create_test_agent();

        // Add 50 entries (exceeds session history limit of 20)
        for i in 0..50 {
            let problem = Problem {
                description: format!("Problem {}", i),
                domain_hints: vec![Domain::Knowledge],
            };
            let solution = Solution {
                recommendation: format!("Solution {}", i),
                reasoning: vec!["Test reasoning".to_string()],
                confidence: 0.9,
                source_level: SearchLevel::House,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
            agent.record_solution(problem, solution);
        }

        // Decision history should contain all 50 entries
        assert_eq!(agent.decision_history.len(), 50);
    }

    /**
     * Test: Mentor query placeholder
     *
     * VALIDATES: Placeholder implementation until P3.5-013
     */
    #[tokio::test]
    async fn test_query_mentor_placeholder() {
        let agent = create_test_agent();
        let problem = Problem {
            description: "Complex knowledge problem".to_string(),
            domain_hints: vec![Domain::Knowledge],
        };

        let result = agent.query_mentor(&problem).await;
        assert!(result.is_ok());

        let solution = result.unwrap();
        assert_eq!(solution.source_level, SearchLevel::Mentor);
        assert!(solution.recommendation.contains("placeholder"));
    }

    /**
     * Test: Confidence calculation with knowledge keywords
     *
     * VALIDATES: Keyword matching increases confidence score
     */
    #[test]
    fn test_calculate_confidence_with_keywords() {
        let agent = create_test_agent();

        let problem_with_keywords = Problem {
            description: "Design a knowledge graph with semantic search and vector embeddings".to_string(),
            domain_hints: vec![Domain::Knowledge],
        };

        let problem_without_keywords = Problem {
            description: "Random problem with no domain keywords".to_string(),
            domain_hints: vec![],
        };

        let confidence_with = agent.calculate_confidence(&problem_with_keywords, "solution");
        let confidence_without = agent.calculate_confidence(&problem_without_keywords, "solution");

        // Problem with keywords should have higher confidence
        assert!(confidence_with > confidence_without);
        assert!(confidence_with > 0.5); // Should exceed base confidence
    }
}
