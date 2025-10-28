/**
 * Domain Agent Trait - Core interface for specialized domain expertise
 *
 * DESIGN DECISION: Use async trait with 5-level breadcrumb escalation
 * WHY: Enables autonomous problem-solving with domain expertise and cross-agent collaboration
 *      identified in ANALYSIS_2025_THEORY_VS_IMPLEMENTATION_V2.md (43.75% implementation gap)
 *
 * REASONING CHAIN:
 * 1. Theory analysis revealed missing domain expert systems (Infrastructure, Knowledge, Scalability, etc.)
 * 2. Needed 5-level hierarchical search (Local → Long-term → House → Mentor → Ether)
 * 3. Async trait enables network I/O for Mentor and Ether levels
 * 4. Confidence threshold (85% default) determines when to escalate
 * 5. Cross-agent collaboration via Mentor layer (agent-to-agent queries)
 * 6. Performance target: <300ms for full 5-level escalation
 *
 * PATTERN: Pattern-DOMAIN-001 (Domain Agent Trait with Breadcrumb Escalation)
 * RELATED: Pattern-ESCALATION-001 (Breadcrumb Navigation), Pattern-MENTOR-001 (Cross-Agent Collaboration)
 * PERFORMANCE: <50ms per level, <300ms total escalation
 * FUTURE: Domain-specific embeddings (Phase 3.6), Progressive responses (Phase 3.7)
 */

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

/// 7 specialized knowledge domains
///
/// DESIGN DECISION: 7 domains based on software development lifecycle
/// WHY: Covers full spectrum of development needs while remaining manageable
///
/// REASONING CHAIN:
/// 1. Infrastructure: Deployment, scaling, cloud platforms, architecture
/// 2. Knowledge: Semantic search, data modeling, embeddings, ML
/// 3. Scalability: Performance optimization, distributed systems, caching
/// 4. Innovation: Code generation, AI models, novel approaches
/// 5. Quality: Testing strategies, bug patterns, QA processes
/// 6. Deployment: CI/CD pipelines, releases, rollback strategies
/// 7. Ethics: Bias detection, privacy compliance, fairness
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Domain {
    /// Infrastructure: Deployment, scaling, architecture patterns
    Infrastructure,
    /// Knowledge: Semantic search, data modeling, embeddings
    Knowledge,
    /// Scalability: Performance optimization, distributed systems
    Scalability,
    /// Innovation: Code generation, AI models, creative solutions
    Innovation,
    /// Quality: Testing, bug patterns, QA processes
    Quality,
    /// Deployment: CI/CD, releases, rollback strategies
    Deployment,
    /// Ethics: Bias detection, privacy compliance, fairness
    Ethics,
}

/// Problem to solve (generic input)
///
/// DESIGN DECISION: Keep problem structure generic and extensible
/// WHY: Different domains may need different context types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Problem {
    /// Natural language description of the problem
    pub description: String,
    /// Additional context (code snippets, logs, etc.)
    pub context: Vec<String>,
    /// Domain hints for routing (optional)
    pub domain_hints: Vec<Domain>,
}

/// Solution with confidence score
///
/// DESIGN DECISION: Include reasoning chain and source level
/// WHY: Enables transparency and debugging of agent decision-making
///
/// **Phase 3.6 Integration:** Added optional content addressing fields
/// WHY: Enables hash verification, ripple effect notification, 60% token reduction
/// See Pattern-CONTEXT-002 (Content-Addressable Context System)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Solution {
    /// Recommended solution or action
    pub recommendation: String,
    /// Step-by-step reasoning (Chain of Thought)
    pub reasoning: Vec<String>,
    /// Confidence score (0.0 to 1.0)
    pub confidence: f64,
    /// Which search level produced this solution
    pub source_level: SearchLevel,

    // ===== Phase 3.6: Content Addressing Fields (Optional) =====
    /// Content address (e.g., "CLAUDE.2.5.1") if solution references documentation
    ///
    /// DESIGN DECISION: Optional field for backward compatibility
    /// WHY: Existing code works without modification, new code can opt-in
    ///
    /// FORMAT: "DOC-ID.SEC-ID.PARA-ID.LINE-ID"
    /// EXAMPLE: "PHASE_3.5.12.3" = PHASE_3.5_IMPLEMENTATION.md, section 5, paragraph 12, line 3
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content_address: Option<String>,

    /// SHA256 hash of content at content_address
    ///
    /// DESIGN DECISION: Store hash for verification
    /// WHY: Detects stale content, triggers ripple effect notification
    ///
    /// LENGTH: 64 characters (SHA256 hex string)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content_hash: Option<String>,

    /// Whether hash was verified as current
    ///
    /// DESIGN DECISION: Boolean flag for freshness check
    /// WHY: Simple indicator if content is stale (needs refetch)
    ///
    /// VALUES:
    /// - true: Content is fresh (hash matches current content)
    /// - false: Content is stale (hash mismatch, refetch needed)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hash_verified: Option<bool>,

    /// When hash was last verified (ISO 8601 timestamp)
    ///
    /// DESIGN DECISION: Track verification time for cache expiry
    /// WHY: 5-minute cache TTL reduces verification overhead from 7% to 0.5%
    #[serde(skip_serializing_if = "Option::is_none")]
    pub verified_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// 5-level breadcrumb hierarchy
///
/// DESIGN DECISION: 5 levels balancing speed and thoroughness
/// WHY: Early levels are fast (<50ms), later levels provide network search
///
/// REASONING CHAIN:
/// 1. Local: Immediate context (current session) - fastest
/// 2. Long-term: Historical decisions (agent's memory)
/// 3. House: Domain-specific pattern library (specialized knowledge)
/// 4. Mentor: Cross-agent queries (multi-domain insights)
/// 5. Ether: Universal DHT network (global patterns)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SearchLevel {
    /// Level 1: Immediate context (current session)
    Local,
    /// Level 2: Historical decisions (agent's long-term memory)
    LongTerm,
    /// Level 3: Domain pattern library (specialized knowledge)
    House,
    /// Level 4: Cross-agent queries (mentor collaboration)
    Mentor,
    /// Level 5: Universal DHT network (global search)
    Ether,
}

/// Domain-specific pattern library (placeholder for P3.5-002)
///
/// DESIGN DECISION: Abstract pattern library for now
/// WHY: Full implementation in P3.5-002, this enables trait definition
#[derive(Debug, Clone)]
pub struct DomainPatternLibrary {
    pub domain: Domain,
    // TODO P3.5-002: Replace with ChromaDB integration
    pub patterns: Vec<String>,
}

impl DomainPatternLibrary {
    /// Create new domain pattern library (placeholder)
    ///
    /// DESIGN DECISION: Accept PathBuf for compatibility with agents/mod.rs
    /// WHY: agents/mod.rs expects this signature
    pub fn new(domain: Domain, _patterns_dir: std::path::PathBuf) -> Result<Self, crate::Error> {
        Ok(Self {
            domain,
            patterns: Vec::new(),
        })
    }
}

/// Domain-specific embeddings (placeholder for P3.5-002)
///
/// DESIGN DECISION: Abstract embeddings for now
/// WHY: Full implementation in P3.5-002, this enables trait definition
#[derive(Debug, Clone)]
pub struct DomainEmbeddings {
    pub domain: Domain,
    // TODO P3.5-002: Replace with ONNX embedding vectors
    pub embeddings: Vec<Vec<f32>>,
}

impl DomainEmbeddings {
    /// Create new domain embeddings (placeholder)
    ///
    /// DESIGN DECISION: Accept model/tokenizer paths for compatibility with agents/mod.rs
    /// WHY: agents/mod.rs expects this signature
    pub fn new(_model_path: &str, _tokenizer_path: &str) -> Result<Self, crate::Error> {
        Ok(Self {
            domain: Domain::Infrastructure, // Default domain
            embeddings: Vec::new(),
        })
    }
}

/// Escalation path tracking for debugging
///
/// DESIGN DECISION: Track full escalation journey
/// WHY: Enables debugging, performance analysis, and learning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EscalationPath {
    /// Levels attempted during escalation
    pub levels_attempted: Vec<SearchLevel>,
    /// Confidence at each level
    pub confidence_per_level: Vec<f64>,
    /// Time spent at each level (milliseconds)
    pub time_per_level_ms: Vec<u64>,
    /// Level where solution was accepted
    pub final_level: SearchLevel,
    /// Total escalation time
    pub total_time_ms: u64,
    /// Whether confidence threshold was met
    pub threshold_met: bool,
}

impl EscalationPath {
    /// Create new escalation path tracker
    pub fn new() -> Self {
        Self {
            levels_attempted: Vec::new(),
            confidence_per_level: Vec::new(),
            time_per_level_ms: Vec::new(),
            final_level: SearchLevel::Local,
            total_time_ms: 0,
            threshold_met: false,
        }
    }

    /// Record attempt at a level
    pub fn record_attempt(&mut self, level: SearchLevel, confidence: f64, time_ms: u64) {
        self.levels_attempted.push(level);
        self.confidence_per_level.push(confidence);
        self.time_per_level_ms.push(time_ms);
    }

    /// Finalize escalation path
    pub fn finalize(&mut self, final_level: SearchLevel, threshold_met: bool) {
        self.final_level = final_level;
        self.threshold_met = threshold_met;
        self.total_time_ms = self.time_per_level_ms.iter().sum();
    }
}

/// Breadcrumb Escalation Engine - Manages 5-level escalation with tracking
///
/// DESIGN DECISION: Extract escalation logic from DomainAgent trait into reusable engine
/// WHY: Enables independent testing, configuration, monitoring, and multiple escalation strategies
///
/// REASONING CHAIN:
/// 1. Original implementation (P3.5-001) had escalation inline in solve_with_escalation()
/// 2. Extracting enables:
///    - Different escalation strategies per agent
///    - Independent unit testing of escalation logic
///    - Performance monitoring and debugging
///    - Configuration without trait changes
/// 3. EscalationEngine becomes first-class abstraction
/// 4. Can implement alternative strategies (parallel escalation, adaptive thresholds, etc.)
///
/// PATTERN: Pattern-ESCALATION-001 (Breadcrumb Escalation Engine)
/// RELATED: Pattern-DOMAIN-001 (Domain Agent Trait)
/// PERFORMANCE: <300ms for full 5-level escalation, <5ms per-level decision
/// FUTURE: Adaptive thresholds, parallel escalation, learning from outcomes
#[derive(Debug, Clone)]
pub struct EscalationEngine {
    /// Confidence threshold to stop escalation (default: 85%)
    ///
    /// DESIGN DECISION: 85% default based on theory analysis
    /// WHY: Balances accuracy (don't stop too early) with speed (don't search forever)
    pub confidence_threshold: f64,

    /// Maximum escalation level (1-5)
    ///
    /// DESIGN DECISION: Allow limiting escalation depth
    /// WHY: Some agents may not want expensive network queries
    pub max_escalation_level: usize,

    /// Timeout per level (milliseconds)
    ///
    /// DESIGN DECISION: Different timeouts per level
    /// WHY: Local searches should be fast, network queries can take longer
    ///
    /// Defaults:
    /// - Level 1 (Local): 50ms
    /// - Level 2 (Long-term): 50ms
    /// - Level 3 (House): 50ms
    /// - Level 4 (Mentor): 100ms
    /// - Level 5 (Ether): 100ms
    pub level_timeouts: Vec<std::time::Duration>,

    /// Track escalation paths for debugging
    ///
    /// DESIGN DECISION: Optional tracking (disabled in production)
    /// WHY: Overhead of tracking, but valuable for debugging/analysis
    pub enable_tracking: bool,
}

impl EscalationEngine {
    /// Create new escalation engine with default configuration
    ///
    /// DESIGN DECISION: Sensible defaults from theory analysis
    /// WHY: Most agents should use standard 85% threshold and full 5-level search
    pub fn new() -> Self {
        Self {
            confidence_threshold: 0.85,
            max_escalation_level: 5,
            level_timeouts: vec![
                std::time::Duration::from_millis(50),  // Local
                std::time::Duration::from_millis(50),  // Long-term
                std::time::Duration::from_millis(50),  // House
                std::time::Duration::from_millis(100), // Mentor
                std::time::Duration::from_millis(100), // Ether
            ],
            enable_tracking: false,
        }
    }

    /// Create escalation engine with custom configuration
    pub fn with_config(
        confidence_threshold: f64,
        max_escalation_level: usize,
        enable_tracking: bool,
    ) -> Self {
        let mut engine = Self::new();
        engine.confidence_threshold = confidence_threshold;
        engine.max_escalation_level = max_escalation_level.min(5);
        engine.enable_tracking = enable_tracking;
        engine
    }

    /// Check if should escalate to next level
    ///
    /// DESIGN DECISION: Simple confidence-based check
    /// WHY: Clear, predictable behavior
    ///
    /// REASONING CHAIN:
    /// 1. If confidence >= threshold, stop (good enough)
    /// 2. If reached max level, stop (no more levels)
    /// 3. Otherwise, escalate to next level
    pub fn should_escalate(&self, confidence: f64, current_level: usize) -> bool {
        confidence < self.confidence_threshold && current_level < self.max_escalation_level
    }

    /// Get next escalation level
    ///
    /// DESIGN DECISION: Linear progression through levels
    /// WHY: Simple, predictable, matches theory (Local → Long-term → House → Mentor → Ether)
    ///
    /// FUTURE: Could implement adaptive escalation (skip levels based on problem type)
    pub fn next_level(&self, current_level: SearchLevel) -> Option<SearchLevel> {
        match current_level {
            SearchLevel::Local => Some(SearchLevel::LongTerm),
            SearchLevel::LongTerm => Some(SearchLevel::House),
            SearchLevel::House => {
                if self.max_escalation_level >= 4 {
                    Some(SearchLevel::Mentor)
                } else {
                    None
                }
            }
            SearchLevel::Mentor => {
                if self.max_escalation_level >= 5 {
                    Some(SearchLevel::Ether)
                } else {
                    None
                }
            }
            SearchLevel::Ether => None, // Final level
        }
    }

    /// Get level number (1-5) from SearchLevel enum
    fn level_number(&self, level: SearchLevel) -> usize {
        match level {
            SearchLevel::Local => 1,
            SearchLevel::LongTerm => 2,
            SearchLevel::House => 3,
            SearchLevel::Mentor => 4,
            SearchLevel::Ether => 5,
        }
    }

    /// Get timeout for a specific level
    pub fn timeout_for_level(&self, level: SearchLevel) -> std::time::Duration {
        let level_num = self.level_number(level);
        self.level_timeouts
            .get(level_num - 1)
            .copied()
            .unwrap_or(std::time::Duration::from_millis(50))
    }
}

impl Default for EscalationEngine {
    fn default() -> Self {
        Self::new()
    }
}

/// Domain Agent Trait - Core interface for all domain agents
///
/// DESIGN DECISION: Async trait with default solve_with_escalation() implementation
/// WHY: Agents can override individual levels but get escalation logic for free
///
/// REASONING CHAIN:
/// 1. Define trait with required methods (domain, patterns, embeddings)
/// 2. Provide default solve_with_escalation() that implements 5-level search
/// 3. Each agent implements level-specific search methods
/// 4. Confidence threshold determines when to stop escalating
/// 5. Cross-agent collaboration enabled via query_mentor()
#[async_trait]
pub trait DomainAgent: Send + Sync {
    /// Agent's domain specialty
    ///
    /// DESIGN DECISION: Each agent has exactly one domain
    /// WHY: Specialization enables deep expertise, clear routing
    fn domain(&self) -> Domain;

    /// Domain-specific pattern library
    ///
    /// DESIGN DECISION: Each agent maintains its own pattern library
    /// WHY: Enables domain-specific optimizations and caching
    fn domain_patterns(&self) -> &DomainPatternLibrary;

    /// Domain-specific embeddings
    ///
    /// DESIGN DECISION: Separate embeddings per domain
    /// WHY: Different domains have different semantic spaces
    fn domain_embeddings(&self) -> &DomainEmbeddings;

    /// Configurable confidence threshold (default: 85%)
    ///
    /// DESIGN DECISION: 85% default threshold based on theory analysis
    /// WHY: Balances accuracy (don't stop too early) with speed (don't search forever)
    fn confidence_threshold(&self) -> f64 {
        0.85
    }

    /// **Main entry point:** Solve problem with 5-level escalation
    ///
    /// DESIGN DECISION: Default implementation using confidence-based escalation
    /// WHY: All agents get escalation logic for free, can override if needed
    ///
    /// REASONING CHAIN:
    /// 1. Try Level 1 (Local) - fastest, immediate context
    /// 2. If confidence < threshold, try Level 2 (Long-term)
    /// 3. If confidence < threshold, try Level 3 (House)
    /// 4. If confidence < threshold, try Level 4 (Mentor) - async, cross-agent
    /// 5. If confidence < threshold, try Level 5 (Ether) - async, DHT network
    /// 6. Return best solution found (even if < threshold)
    ///
    /// PERFORMANCE: <300ms target for full escalation
    /// - Local: <50ms
    /// - Long-term: <50ms
    /// - House: <50ms
    /// - Mentor: <100ms (network I/O)
    /// - Ether: <100ms (DHT lookup)
    async fn solve_with_escalation(&mut self, problem: Problem) -> Result<Solution, String> {
        let threshold = self.confidence_threshold();

        // Level 1: Local (immediate context)
        let mut solution = self.match_local(&problem);
        if solution.confidence >= threshold {
            return Ok(solution);
        }

        // Level 2: Long-term (historical decisions)
        solution = self.match_long_term(&problem);
        if solution.confidence >= threshold {
            return Ok(solution);
        }

        // Level 3: House (domain pattern library)
        solution = self.match_house(&problem);
        if solution.confidence >= threshold {
            return Ok(solution);
        }

        // Level 4: Mentor (query other agents)
        solution = self.query_mentor(&problem).await?;
        if solution.confidence >= threshold {
            return Ok(solution);
        }

        // Level 5: Ether (DHT network search)
        solution = self.query_ether(&problem).await?;

        // Return best effort, even if < threshold
        Ok(solution)
    }

    /// Level 1: Match against immediate context (current session)
    ///
    /// DESIGN DECISION: Search only recent interactions (last 10-20)
    /// WHY: Fast (<50ms), high relevance for ongoing conversation
    ///
    /// PERFORMANCE: Target <50ms
    fn match_local(&self, problem: &Problem) -> Solution;

    /// Level 2: Match against historical decisions (agent's long-term memory)
    ///
    /// DESIGN DECISION: Search all past solutions for this agent
    /// WHY: Agent learns from its own history
    ///
    /// PERFORMANCE: Target <50ms (in-memory search)
    fn match_long_term(&self, problem: &Problem) -> Solution;

    /// Level 3: Match against domain pattern library (specialized knowledge)
    ///
    /// DESIGN DECISION: Search domain-specific patterns (ChromaDB)
    /// WHY: Deep domain expertise, curated high-quality patterns
    ///
    /// PERFORMANCE: Target <50ms (local vector search)
    fn match_house(&self, problem: &Problem) -> Solution;

    /// Level 4: Query other domain agents (cross-agent collaboration)
    ///
    /// DESIGN DECISION: Async method for agent-to-agent communication
    /// WHY: May need to query multiple agents in parallel
    ///
    /// PERFORMANCE: Target <100ms (network communication)
    async fn query_mentor(&self, problem: &Problem) -> Result<Solution, String>;

    /// Level 5: Query DHT network (universal search)
    ///
    /// DESIGN DECISION: Async method for distributed network query
    /// WHY: Kademlia DHT provides O(log N) pattern discovery
    ///
    /// PERFORMANCE: Target <100ms (DHT lookup)
    async fn query_ether(&self, problem: &Problem) -> Result<Solution, String>;
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Mock agent for testing trait default implementation
    struct MockAgent {
        domain: Domain,
        patterns: DomainPatternLibrary,
        embeddings: DomainEmbeddings,
        local_confidence: f64,
        long_term_confidence: f64,
        house_confidence: f64,
        mentor_confidence: f64,
    }

    #[async_trait]
    impl DomainAgent for MockAgent {
        fn domain(&self) -> Domain {
            self.domain
        }

        fn domain_patterns(&self) -> &DomainPatternLibrary {
            &self.patterns
        }

        fn domain_embeddings(&self) -> &DomainEmbeddings {
            &self.embeddings
        }

        fn match_local(&self, problem: &Problem) -> Solution {
            Solution {
                recommendation: format!("Local solution for: {}", problem.description),
                reasoning: vec!["Searched local context".to_string()],
                confidence: self.local_confidence,
                source_level: SearchLevel::Local,
                content_address: None,
                content_hash: None,
                hash_verified: None,
                verified_at: None,
            }
        }

        fn match_long_term(&self, problem: &Problem) -> Solution {
            Solution {
                recommendation: format!("Long-term solution for: {}", problem.description),
                reasoning: vec!["Searched historical decisions".to_string()],
                confidence: self.long_term_confidence,
                source_level: SearchLevel::LongTerm,
                content_address: None,
                content_hash: None,
                hash_verified: None,
                verified_at: None,
            }
        }

        fn match_house(&self, problem: &Problem) -> Solution {
            Solution {
                recommendation: format!("House solution for: {}", problem.description),
                reasoning: vec!["Searched domain pattern library".to_string()],
                confidence: self.house_confidence,
                source_level: SearchLevel::House,
                content_address: None,
                content_hash: None,
                hash_verified: None,
                verified_at: None,
            }
        }

        async fn query_mentor(&self, problem: &Problem) -> Result<Solution, String> {
            Ok(Solution {
                recommendation: format!("Mentor solution for: {}", problem.description),
                reasoning: vec!["Queried other domain agents".to_string()],
                confidence: self.mentor_confidence,
                source_level: SearchLevel::Mentor,
                content_address: None,
                content_hash: None,
                hash_verified: None,
                verified_at: None,
            })
        }

        async fn query_ether(&self, problem: &Problem) -> Result<Solution, String> {
            Ok(Solution {
                recommendation: format!("Ether solution for: {}", problem.description),
                reasoning: vec!["Queried DHT network".to_string()],
                confidence: 0.75, // Always returns 75% confidence
                source_level: SearchLevel::Ether,
                content_address: None,
                content_hash: None,
                hash_verified: None,
                verified_at: None,
            })
        }
    }

    #[tokio::test]
    async fn test_escalation_stops_at_local() {
        let mut agent = MockAgent {
            domain: Domain::Infrastructure,
            patterns: DomainPatternLibrary {
                domain: Domain::Infrastructure,
                patterns: vec![],
            },
            embeddings: DomainEmbeddings {
                domain: Domain::Infrastructure,
                embeddings: vec![],
            },
            local_confidence: 0.9, // High confidence at local level
            long_term_confidence: 0.0,
            house_confidence: 0.0,
            mentor_confidence: 0.0,
        };

        let problem = Problem {
            description: "Test problem".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Infrastructure],
        };

        let solution = agent.solve_with_escalation(problem).await.unwrap();

        assert_eq!(solution.source_level, SearchLevel::Local);
        assert!(solution.confidence >= 0.85);
    }

    #[tokio::test]
    async fn test_escalation_stops_at_house() {
        let mut agent = MockAgent {
            domain: Domain::Scalability,
            patterns: DomainPatternLibrary {
                domain: Domain::Scalability,
                patterns: vec![],
            },
            embeddings: DomainEmbeddings {
                domain: Domain::Scalability,
                embeddings: vec![],
            },
            local_confidence: 0.6, // Too low
            long_term_confidence: 0.7, // Too low
            house_confidence: 0.88, // High enough at House level
            mentor_confidence: 0.0,
        };

        let problem = Problem {
            description: "Performance optimization needed".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Scalability],
        };

        let solution = agent.solve_with_escalation(problem).await.unwrap();

        assert_eq!(solution.source_level, SearchLevel::House);
        assert!(solution.confidence >= 0.85);
    }

    #[tokio::test]
    async fn test_escalation_reaches_mentor() {
        let mut agent = MockAgent {
            domain: Domain::Quality,
            patterns: DomainPatternLibrary {
                domain: Domain::Quality,
                patterns: vec![],
            },
            embeddings: DomainEmbeddings {
                domain: Domain::Quality,
                embeddings: vec![],
            },
            local_confidence: 0.5,
            long_term_confidence: 0.6,
            house_confidence: 0.7,
            mentor_confidence: 0.92, // High confidence from mentor
        };

        let problem = Problem {
            description: "Multi-domain testing strategy".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Quality, Domain::Deployment],
        };

        let solution = agent.solve_with_escalation(problem).await.unwrap();

        assert_eq!(solution.source_level, SearchLevel::Mentor);
        assert!(solution.confidence >= 0.85);
    }

    #[tokio::test]
    async fn test_escalation_reaches_ether() {
        let mut agent = MockAgent {
            domain: Domain::Ethics,
            patterns: DomainPatternLibrary {
                domain: Domain::Ethics,
                patterns: vec![],
            },
            embeddings: DomainEmbeddings {
                domain: Domain::Ethics,
                embeddings: vec![],
            },
            local_confidence: 0.4,
            long_term_confidence: 0.5,
            house_confidence: 0.6,
            mentor_confidence: 0.7, // Still below threshold
        };

        let problem = Problem {
            description: "Novel ethical dilemma".to_string(),
            context: vec![],
            domain_hints: vec![Domain::Ethics],
        };

        let solution = agent.solve_with_escalation(problem).await.unwrap();

        // Should reach Ether level (final fallback)
        assert_eq!(solution.source_level, SearchLevel::Ether);
        // Ether returns 75%, which is still below threshold, but it's best effort
        assert_eq!(solution.confidence, 0.75);
    }

    /// Tests for EscalationEngine

    #[test]
    fn test_escalation_engine_default_config() {
        let engine = EscalationEngine::new();

        assert_eq!(engine.confidence_threshold, 0.85);
        assert_eq!(engine.max_escalation_level, 5);
        assert_eq!(engine.level_timeouts.len(), 5);
        assert_eq!(engine.enable_tracking, false);
    }

    #[test]
    fn test_escalation_engine_custom_config() {
        let engine = EscalationEngine::with_config(0.9, 3, true);

        assert_eq!(engine.confidence_threshold, 0.9);
        assert_eq!(engine.max_escalation_level, 3);
        assert_eq!(engine.enable_tracking, true);
    }

    #[test]
    fn test_should_escalate() {
        let engine = EscalationEngine::new();

        // High confidence - should not escalate
        assert!(!engine.should_escalate(0.9, 1));

        // Low confidence, within max level - should escalate
        assert!(engine.should_escalate(0.5, 1));
        assert!(engine.should_escalate(0.5, 4));

        // Low confidence, at max level - should not escalate
        assert!(!engine.should_escalate(0.5, 5));
    }

    #[test]
    fn test_next_level_progression() {
        let engine = EscalationEngine::new();

        assert_eq!(engine.next_level(SearchLevel::Local), Some(SearchLevel::LongTerm));
        assert_eq!(engine.next_level(SearchLevel::LongTerm), Some(SearchLevel::House));
        assert_eq!(engine.next_level(SearchLevel::House), Some(SearchLevel::Mentor));
        assert_eq!(engine.next_level(SearchLevel::Mentor), Some(SearchLevel::Ether));
        assert_eq!(engine.next_level(SearchLevel::Ether), None);
    }

    #[test]
    fn test_next_level_respects_max_level() {
        let engine = EscalationEngine::with_config(0.85, 3, false);

        // Should stop at House (level 3)
        assert_eq!(engine.next_level(SearchLevel::Local), Some(SearchLevel::LongTerm));
        assert_eq!(engine.next_level(SearchLevel::LongTerm), Some(SearchLevel::House));
        assert_eq!(engine.next_level(SearchLevel::House), None); // Stopped!
    }

    #[test]
    fn test_level_number_mapping() {
        let engine = EscalationEngine::new();

        assert_eq!(engine.level_number(SearchLevel::Local), 1);
        assert_eq!(engine.level_number(SearchLevel::LongTerm), 2);
        assert_eq!(engine.level_number(SearchLevel::House), 3);
        assert_eq!(engine.level_number(SearchLevel::Mentor), 4);
        assert_eq!(engine.level_number(SearchLevel::Ether), 5);
    }

    #[test]
    fn test_timeout_for_level() {
        let engine = EscalationEngine::new();

        // Fast levels (50ms)
        assert_eq!(engine.timeout_for_level(SearchLevel::Local), std::time::Duration::from_millis(50));
        assert_eq!(engine.timeout_for_level(SearchLevel::LongTerm), std::time::Duration::from_millis(50));
        assert_eq!(engine.timeout_for_level(SearchLevel::House), std::time::Duration::from_millis(50));

        // Slower network levels (100ms)
        assert_eq!(engine.timeout_for_level(SearchLevel::Mentor), std::time::Duration::from_millis(100));
        assert_eq!(engine.timeout_for_level(SearchLevel::Ether), std::time::Duration::from_millis(100));
    }

    #[test]
    fn test_escalation_path_tracking() {
        let mut path = EscalationPath::new();

        // Record attempts
        path.record_attempt(SearchLevel::Local, 0.6, 20);
        path.record_attempt(SearchLevel::LongTerm, 0.7, 25);
        path.record_attempt(SearchLevel::House, 0.9, 30);

        // Finalize
        path.finalize(SearchLevel::House, true);

        // Verify tracking
        assert_eq!(path.levels_attempted.len(), 3);
        assert_eq!(path.confidence_per_level, vec![0.6, 0.7, 0.9]);
        assert_eq!(path.time_per_level_ms, vec![20, 25, 30]);
        assert_eq!(path.final_level, SearchLevel::House);
        assert_eq!(path.total_time_ms, 75); // 20 + 25 + 30
        assert_eq!(path.threshold_met, true);
    }

    #[test]
    fn test_escalation_path_not_met_threshold() {
        let mut path = EscalationPath::new();

        // Full escalation but never met threshold
        path.record_attempt(SearchLevel::Local, 0.5, 10);
        path.record_attempt(SearchLevel::LongTerm, 0.6, 15);
        path.record_attempt(SearchLevel::House, 0.7, 20);
        path.record_attempt(SearchLevel::Mentor, 0.75, 50);
        path.record_attempt(SearchLevel::Ether, 0.8, 80);

        path.finalize(SearchLevel::Ether, false);

        assert_eq!(path.levels_attempted.len(), 5);
        assert_eq!(path.final_level, SearchLevel::Ether);
        assert_eq!(path.total_time_ms, 175); // 10+15+20+50+80
        assert_eq!(path.threshold_met, false);
    }
}
