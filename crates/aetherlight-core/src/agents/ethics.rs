/**
 * Ethics Domain Agent - Bias Detection, Privacy Compliance & Ethical Frameworks Expert
 *
 * DESIGN DECISION: Seventh domain agent specializing in ethical AI, privacy compliance, and accessibility
 * WHY: Autonomous systems must consider ethical implications, regulatory compliance, and inclusive design
 *
 * REASONING CHAIN:
 * 1. Ethics domain encompasses AI fairness (bias detection, fairness metrics, dataset auditing)
 * 2. Privacy compliance critical (GDPR, CCPA, HIPAA, data minimization, consent management)
 * 3. Accessibility patterns ensure inclusive design (WCAG 2.1, screen readers, keyboard navigation)
 * 4. Ethical frameworks guide decision-making (utilitarian, deontological, virtue ethics)
 * 5. Transparency and explainability build trust (model interpretability, audit trails)
 * 6. Session history (last 20) + decision history (unlimited) balance speed and learning
 * 7. Keyword-based confidence scoring (<5ms) until Phase 3.6 semantic indexing
 *
 * PATTERN: Pattern-DOMAIN-009 (Ethics Agent with bias detection and privacy compliance)
 * RELATED: P3.5-001 (Domain Agent Trait), P3.5-002 (Domain Pattern Library)
 * PERFORMANCE: <20ms pattern match, <5ms confidence calculation
 * FUTURE: Phase 3.6 will expand to 100+ ethics patterns, semantic pattern indexing
 */

use async_trait::async_trait;
use std::collections::VecDeque;

use crate::domain_agent::{
    Domain, DomainAgent, DomainEmbeddings, DomainPatternLibrary, Problem, SearchLevel, Solution,
};

/**
 * EthicsAgent - Domain expert for ethical AI and privacy compliance
 *
 * DESIGN DECISION: FIFO session history (20 capacity) + unlimited decision history
 * WHY: Recent ethical decisions most relevant (Local level), all past decisions inform long-term learning
 *
 * REASONING CHAIN:
 * 1. Session history: VecDeque with FIFO behavior (capacity 20) for fast Local searches
 * 2. Decision history: Vec with unlimited capacity for Long-term learning patterns
 * 3. Domain patterns: DomainPatternLibrary with JSON persistence (data/patterns/ethics.json)
 * 4. Domain embeddings: DomainEmbeddings wrapping LocalEmbeddings (Phase 3.6)
 * 5. Confidence threshold: Configurable (default 0.85 = 85% confidence required for solution acceptance)
 *
 * PERFORMANCE:
 * - Local search: O(n) over last 20 interactions (<1ms typically)
 * - Long-term search: O(n) over all past decisions (<5ms for 1000+ decisions)
 * - House search: O(patterns) over seed patterns (<20ms for 5 patterns)
 * - Confidence calculation: O(keywords) with 26 ethics keywords (<5ms)
 */
#[derive(Debug)]
pub struct EthicsAgent {
    session_history: VecDeque<(Problem, Solution)>,
    decision_history: Vec<(Problem, Solution)>,
    domain_patterns: DomainPatternLibrary,
    domain_embeddings: DomainEmbeddings,
    confidence_threshold: f64,
    #[allow(dead_code)] // TODO: Add session history pruning in Phase 3.6
    max_session_history: usize,
}

impl EthicsAgent {
    /**
     * Create new EthicsAgent with default configuration
     *
     * DESIGN DECISION: Sensible defaults for most use cases
     * WHY: Easy instantiation while allowing customization via with_config()
     *
     * Default Configuration:
     * - confidence_threshold: 0.85 (85% confidence required)
     * - max_session_history: 20 (last 20 interactions)
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
     * Create EthicsAgent with custom configuration
     *
     * DESIGN DECISION: Allow configuration override for specialized use cases
     * WHY: Some domains may need higher/lower confidence thresholds, larger session history
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
     * Record solution in both session history and decision history
     *
     * DESIGN DECISION: Dual history tracking (recent + all-time)
     * WHY: Session history provides fast Local searches, decision history enables Long-term learning
     *
     * REASONING CHAIN:
     * 1. Session history is FIFO (pop_front when at capacity)
     * 2. Decision history is unlimited (all past solutions preserved)
     * 3. This pattern validated across 6 previous agents (Infrastructure, Quality, Scalability, Knowledge, Innovation, Deployment)
     *
     * TODO: Auto-record in Phase 3.6 (after solve_with_escalation calls)
     */
    #[allow(dead_code)] // Placeholder for Phase 3.6 automatic solution recording
    fn record_solution(&mut self, problem: Problem, solution: Solution) {
        // FIFO behavior: remove oldest when at capacity
        if self.session_history.len() >= self.max_session_history {
            self.session_history.pop_front();
        }
        self.session_history.push_back((problem.clone(), solution.clone()));

        // Decision history is unlimited (all past solutions)
        self.decision_history.push((problem, solution));
    }

    /**
     * Calculate confidence score based on ethics keywords
     *
     * DESIGN DECISION: Keyword-based confidence scoring (fast, explainable)
     * WHY: Phase 3.5 uses keyword matching for speed (<5ms), Phase 3.6 adds semantic similarity
     *
     * REASONING CHAIN:
     * 1. 26 ethics keywords cover ethical AI domain comprehensively
     * 2. Base confidence: 0.3 (30% baseline)
     * 3. Each matching keyword adds: 0.2 (up to 0.6 = 60% from keywords)
     * 4. Domain hint bonus: +0.15 (15%) if problem explicitly tagged as Ethics
     * 5. Max confidence: 0.3 + 0.6 + 0.15 = 1.05 → capped at 1.0 (100%)
     *
     * PERFORMANCE: O(keywords) = O(26) per calculation (<5ms)
     */
    fn calculate_confidence(&self, problem: &Problem, _solution: &str) -> f64 {
        let ethics_keywords = [
            // Fairness keywords (7)
            "bias", "fairness", "discrimination", "equity", "demographic", "protected", "disparate",
            // Privacy keywords (8)
            "privacy", "gdpr", "ccpa", "hipaa", "consent", "data protection", "pii", "anonymization",
            // Ethics keywords (6)
            "ethics", "ethical", "moral", "responsible", "transparency", "explainability",
            // Accessibility keywords (5)
            "accessibility", "wcag", "a11y", "inclusive", "screen reader",
        ]; // Total: 26 keywords

        let problem_lower = problem.description.to_lowercase();
        let matches = ethics_keywords
            .iter()
            .filter(|kw| problem_lower.contains(*kw))
            .count();

        // Base confidence + keyword matches (capped at 0.9)
        let base_confidence = 0.3 + (matches as f64 * 0.2).min(0.6);

        // Domain hint bonus: +15% if explicitly Ethics problem
        if problem.domain_hints.contains(&Domain::Ethics) {
            (base_confidence + 0.15).min(1.0)
        } else {
            base_confidence
        }
    }
}

#[async_trait]
impl DomainAgent for EthicsAgent {
    /**
     * Return domain identity (Ethics)
     *
     * DESIGN DECISION: Explicit domain identity for routing and classification
     * WHY: AgentNetwork uses domain() to route queries to appropriate specialist
     */
    fn domain(&self) -> Domain {
        Domain::Ethics
    }

    /**
     * Access domain-specific pattern library
     *
     * DESIGN DECISION: Encapsulated pattern storage per domain
     * WHY: Ethics patterns isolated from other domains (Infrastructure, Quality, etc.)
     *
     * PERFORMANCE: O(1) reference return
     */
    fn domain_patterns(&self) -> &DomainPatternLibrary {
        &self.domain_patterns
    }

    /**
     * Access domain-specific embeddings
     *
     * DESIGN DECISION: Domain-scoped embeddings for semantic search
     * WHY: Ethics-specific embeddings provide better semantic matching than global embeddings
     *
     * FUTURE: Phase 3.6 will add semantic pattern indexing using these embeddings
     */
    fn domain_embeddings(&self) -> &DomainEmbeddings {
        &self.domain_embeddings
    }

    /**
     * Return confidence threshold for escalation decisions
     *
     * DESIGN DECISION: Configurable confidence threshold (default 85%)
     * WHY: Some domains may require higher confidence, others may accept lower thresholds
     */
    fn confidence_threshold(&self) -> f64 {
        self.confidence_threshold
    }

    /**
     * Breadcrumb Level 1: Local (Session History - Last 20 Interactions)
     *
     * DESIGN DECISION: Search recent session history first (FIFO, capacity 20)
     * WHY: Recent ethical decisions most likely relevant (similar problems, recent context)
     *
     * REASONING CHAIN:
     * 1. Session history contains last 20 problem-solution pairs (FIFO)
     * 2. Linear search O(n) where n ≤ 20 (fast: <1ms)
     * 3. Match if problem descriptions similar (contains substring, case-insensitive)
     * 4. Confidence: 0.95 (95% - high confidence from recent success)
     * 5. If no match: return low-confidence placeholder (triggers escalation to Long-term)
     *
     * PERFORMANCE: O(n) where n ≤ 20, typically <1ms
     */
    fn match_local(&self, problem: &Problem) -> Solution {
        let problem_lower = problem.description.to_lowercase();

        // Search recent session history (last 20 interactions)
        for (past_problem, past_solution) in self.session_history.iter().rev() {
            if past_problem.description.to_lowercase().contains(&problem_lower)
                || problem_lower.contains(&past_problem.description.to_lowercase())
            {
                return Solution {
                    recommendation: format!(
                        "Recent ethical solution (session history): {}",
                        past_solution.recommendation
                    ),
                    reasoning: vec![
                        "Searched session history (Local level)".to_string(),
                        format!("Found similar problem: {}", past_problem.description),
                        "High confidence from recent success".to_string(),
                    ],
                    confidence: 0.95,
                    source_level: SearchLevel::Local,
                    content_address: None,
                    content_hash: None,
                    hash_verified: None,
                    verified_at: None,
                };
            }
        }

        // No match: return low confidence to trigger escalation
        Solution {
            recommendation: "No recent ethical solution found in session history".to_string(),
            reasoning: vec!["Searched session history (no match)".to_string()],
            confidence: 0.0,
            source_level: SearchLevel::Local,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        }
    }

    /**
     * Breadcrumb Level 2: Long-term (Decision History - All Past Decisions)
     *
     * DESIGN DECISION: Search all past decisions (unlimited history)
     * WHY: Ethical patterns may recur across projects (regulatory compliance, accessibility standards)
     *
     * REASONING CHAIN:
     * 1. Decision history contains ALL past problem-solution pairs (unlimited)
     * 2. Linear search O(n) where n = total decisions (still fast: <5ms for 1000+ decisions)
     * 3. Match criteria same as Local level (substring matching)
     * 4. Confidence: 0.90 (90% - slightly lower than Local due to temporal distance)
     * 5. If no match: return low-confidence placeholder (triggers escalation to House)
     *
     * PERFORMANCE: O(n) where n = total past decisions, typically <5ms for 1000+ decisions
     */
    fn match_long_term(&self, problem: &Problem) -> Solution {
        let problem_lower = problem.description.to_lowercase();

        // Search all past decisions (unlimited history)
        for (past_problem, past_solution) in self.decision_history.iter().rev() {
            if past_problem.description.to_lowercase().contains(&problem_lower)
                || problem_lower.contains(&past_problem.description.to_lowercase())
            {
                return Solution {
                    recommendation: format!(
                        "Historical ethical solution: {}",
                        past_solution.recommendation
                    ),
                    reasoning: vec![
                        "Searched decision history (Long-term level)".to_string(),
                        format!("Found similar problem: {}", past_problem.description),
                        "Good confidence from past success".to_string(),
                    ],
                    confidence: 0.90,
                    source_level: SearchLevel::LongTerm,
                    content_address: None,
                    content_hash: None,
                    hash_verified: None,
                    verified_at: None,
                };
            }
        }

        // No match: return low confidence to trigger escalation
        Solution {
            recommendation: "No historical ethical solution found in decision history".to_string(),
            reasoning: vec!["Searched decision history (no match)".to_string()],
            confidence: 0.0,
            source_level: SearchLevel::LongTerm,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        }
    }

    /**
     * Breadcrumb Level 3: House (Domain Patterns - Seed Knowledge)
     *
     * DESIGN DECISION: 5 seed ethics patterns for Phase 3.5 foundation
     * WHY: Comprehensive patterns (100+) will be added in Phase 3.6, seed patterns validate architecture
     *
     * REASONING CHAIN:
     * 1. Seed patterns cover 5 major ethics domains:
     *    a. Bias Detection in AI Models (fairness metrics, dataset auditing, disparate impact) - 92% confidence
     *    b. Privacy Compliance Framework (GDPR, CCPA, HIPAA, data minimization, consent) - 90% confidence
     *    c. Accessibility Standards (WCAG 2.1, screen reader support, keyboard navigation) - 88% confidence
     *    d. Ethical AI Decision Making (utilitarian, deontological, virtue ethics frameworks) - 89% confidence
     *    e. Model Explainability & Transparency (SHAP, LIME, feature importance, audit trails) - 91% confidence
     * 2. Keyword matching: problem description against pattern titles
     * 3. Confidence adjusted by keyword matching quality
     * 4. Generic fallback if no specific pattern matches
     *
     * PERFORMANCE: O(patterns) = O(5) per search (<20ms)
     * FUTURE: Phase 3.6 will expand to 100+ patterns with semantic search
     */
    fn match_house(&self, problem: &Problem) -> Solution {
        // 5 seed ethics patterns (Phase 3.5 foundation)
        let ethics_patterns = vec![
            (
                "Bias Detection in AI Models",
                "Measure fairness metrics: demographic parity (equal positive rate across groups), equal opportunity (equal TPR), equalized odds (equal TPR + FPR). Audit training data for representation (gender 50/50, ethnicity proportional, age diverse). Test for disparate impact (ratio >0.8). Use fairness-aware algorithms (reweighting, adversarial debiasing). Regular bias audits with diverse test sets. Document limitations in model card.",
                0.92,
            ),
            (
                "Privacy Compliance Framework",
                "GDPR compliance: lawful basis (consent, contract, legitimate interest), data minimization (collect only necessary), purpose limitation, right to erasure. CCPA: notice at collection, opt-out of sale, do-not-sell button. HIPAA: ePHI encryption, access controls, BAA with vendors. Implementation: consent management (checkboxes, revoke), data inventory (what, where, why), retention policies (auto-delete after N days), breach notification procedures.",
                0.90,
            ),
            (
                "Accessibility Standards (WCAG 2.1)",
                "Level AA compliance (legal requirement): perceivable (alt text, captions, contrast 4.5:1), operable (keyboard navigation, focus visible, no keyboard traps), understandable (readable text, consistent navigation, error prevention), robust (valid HTML, ARIA labels). Test with screen readers (NVDA, JAWS, VoiceOver). Automated testing (axe, WAVE) + manual testing (keyboard-only navigation, zoom to 200%).",
                0.88,
            ),
            (
                "Ethical AI Decision Making",
                "Apply ethical frameworks: Utilitarian (maximize overall benefit, minimize harm - use for resource allocation), Deontological (follow rules/duties - use for rights/privacy), Virtue ethics (cultivate good character traits - use for organizational culture). Process: identify stakeholders, assess impacts, apply framework, document reasoning, review with diverse committee. Red flags: harming vulnerable populations, violating autonomy, enabling discrimination, environmental harm.",
                0.89,
            ),
            (
                "Model Explainability & Transparency",
                "Techniques: SHAP values (feature importance per prediction), LIME (local interpretable model), feature importance (global), partial dependence plots (feature relationships). Documentation: model card (intended use, limitations, training data, performance metrics), datasheet (dataset provenance, biases, ethical considerations). Audit trail: log all predictions with explanations, enable human review of high-stakes decisions. Transparency: disclose AI use to users, provide appeals process.",
                0.91,
            ),
        ];

        let problem_lower = problem.description.to_lowercase();

        // CRITICAL: Iterate over reference to avoid moving the vector
        for (title, description, base_confidence) in &ethics_patterns {
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

        // Generic fallback: return first pattern as default
        Solution {
            recommendation: format!(
                "{}: {} (generic match)",
                ethics_patterns[0].0, ethics_patterns[0].1
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
     * Breadcrumb Level 4: Mentor (Cross-Agent Query)
     *
     * DESIGN DECISION: Placeholder for Phase 3.5-007 Agent Network integration
     * WHY: Agent network requires all 7 agents operational, implemented after agent foundations
     *
     * FUTURE: Phase 3.6 will implement cross-agent queries:
     * - Query Knowledge agent for data privacy patterns
     * - Query Quality agent for testing fairness metrics
     * - Query Infrastructure agent for secure deployment
     */
    async fn query_mentor(&self, _problem: &Problem) -> Result<Solution, String> {
        Err("Mentor queries not yet implemented (Phase 3.5-007)".to_string())
    }

    /**
     * Breadcrumb Level 5: Ether (Distributed Network Query)
     *
     * DESIGN DECISION: Placeholder for Phase 3.5-007+ distributed network
     * WHY: Distributed pattern network requires DHT infrastructure (implemented in Phase 3)
     *
     * FUTURE: Phase 3.6+ will implement network queries:
     * - Query global ethics pattern network via DHT
     * - Discover patterns from community contributions
     * - Validate patterns against ethical standards
     */
    async fn query_ether(&self, _problem: &Problem) -> Result<Solution, String> {
        Err("Ether queries not yet implemented (Phase 3.5-007+)".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    /**
     * Helper: Create mock pattern library and embeddings for testing
     *
     * DESIGN DECISION: Use placeholder implementations for unit tests
     * WHY: Agent logic independent of pattern library implementation details
     */
    fn create_test_agent() -> EthicsAgent {
        let patterns = DomainPatternLibrary::new(
            Domain::Ethics,
            PathBuf::from("test_patterns"),
        )
        .expect("Failed to create test pattern library");

        let embeddings = DomainEmbeddings::new(PathBuf::from("test_model"))
            .expect("Failed to create test embeddings");

        EthicsAgent::new(patterns, embeddings)
    }

    /**
     * Test: Agent creation with default configuration
     */
    #[test]
    fn test_new_ethics_agent() {
        let agent = create_test_agent();
        assert_eq!(agent.domain(), Domain::Ethics);
        assert_eq!(agent.confidence_threshold(), 0.85);
    }

    /**
     * Test: Agent creation with custom configuration
     */
    #[test]
    fn test_ethics_agent_with_config() {
        let patterns = DomainPatternLibrary::new(
            Domain::Ethics,
            PathBuf::from("test_patterns"),
        )
        .expect("Failed to create test pattern library");

        let embeddings = DomainEmbeddings::new(PathBuf::from("test_model"))
            .expect("Failed to create test embeddings");

        let agent = EthicsAgent::with_config(patterns, embeddings, 0.90, 10);
        assert_eq!(agent.confidence_threshold(), 0.90);
        assert_eq!(agent.max_session_history, 10);
    }

    /**
     * Test: Domain trait method (domain identity)
     */
    #[test]
    fn test_domain() {
        let agent = create_test_agent();
        assert_eq!(agent.domain(), Domain::Ethics);
    }

    /**
     * Test: Domain patterns accessor
     */
    #[test]
    fn test_domain_patterns() {
        let agent = create_test_agent();
        let patterns = agent.domain_patterns();
        assert_eq!(patterns.domain(), Domain::Ethics);
    }

    /**
     * Test: Domain embeddings accessor
     */
    #[test]
    fn test_domain_embeddings() {
        let agent = create_test_agent();
        let _embeddings = agent.domain_embeddings();
        // Embeddings exist (no panic)
    }

    /**
     * Test: Confidence threshold accessor
     */
    #[test]
    fn test_confidence_threshold() {
        let agent = create_test_agent();
        assert_eq!(agent.confidence_threshold(), 0.85);
    }

    /**
     * Test: Local level search (empty session history)
     */
    #[test]
    fn test_match_local_empty() {
        let agent = create_test_agent();
        let problem = Problem {
            description: "How to detect bias in AI models?".to_string(),
            domain_hints: vec![Domain::Ethics],
        };
        let solution = agent.match_local(&problem);
        assert_eq!(solution.confidence, 0.0); // No match in empty history
        assert_eq!(solution.source_level, SearchLevel::Local);
    }

    /**
     * Test: Local level search (with session history)
     */
    #[test]
    fn test_match_local_with_history() {
        let mut agent = create_test_agent();

        // Record a past solution
        let past_problem = Problem {
            description: "How to detect bias in AI models?".to_string(),
            domain_hints: vec![Domain::Ethics],
        };
        let past_solution = Solution {
            recommendation: "Use fairness metrics like demographic parity".to_string(),
            reasoning: vec!["Bias detection pattern".to_string()],
            confidence: 0.95,
            source_level: SearchLevel::Local,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
        agent.record_solution(past_problem.clone(), past_solution.clone());

        // Query similar problem
        let problem = Problem {
            description: "Bias detection in models".to_string(),
            domain_hints: vec![Domain::Ethics],
        };
        let solution = agent.match_local(&problem);
        assert_eq!(solution.confidence, 0.95);
        assert_eq!(solution.source_level, SearchLevel::Local);
    }

    /**
     * Test: Long-term level search (decision history)
     */
    #[test]
    fn test_match_long_term() {
        let mut agent = create_test_agent();

        // Record a past solution
        let past_problem = Problem {
            description: "GDPR compliance implementation".to_string(),
            domain_hints: vec![Domain::Ethics],
        };
        let past_solution = Solution {
            recommendation: "Implement consent management and data minimization".to_string(),
            reasoning: vec!["Privacy compliance pattern".to_string()],
            confidence: 0.90,
            source_level: SearchLevel::LongTerm,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
        agent.record_solution(past_problem.clone(), past_solution.clone());

        // Query similar problem
        let problem = Problem {
            description: "GDPR compliance".to_string(),
            domain_hints: vec![Domain::Ethics],
        };
        let solution = agent.match_long_term(&problem);
        assert_eq!(solution.confidence, 0.90);
        assert_eq!(solution.source_level, SearchLevel::LongTerm);
    }

    /**
     * Test: House level search (Bias Detection pattern)
     */
    #[test]
    fn test_match_house_bias() {
        let agent = create_test_agent();
        let problem = Problem {
            description: "How to detect bias in AI models?".to_string(),
            domain_hints: vec![Domain::Ethics],
        };
        let solution = agent.match_house(&problem);
        assert!(solution.confidence > 0.5);
        assert_eq!(solution.source_level, SearchLevel::House);
        assert!(solution.recommendation.contains("Bias Detection"));
    }

    /**
     * Test: House level search (Privacy Compliance pattern)
     */
    #[test]
    fn test_match_house_privacy() {
        let agent = create_test_agent();
        let problem = Problem {
            description: "Privacy compliance framework for GDPR".to_string(),
            domain_hints: vec![Domain::Ethics],
        };
        let solution = agent.match_house(&problem);
        assert!(solution.confidence > 0.5);
        assert_eq!(solution.source_level, SearchLevel::House);
        assert!(solution.recommendation.contains("Privacy Compliance"));
    }

    /**
     * Test: House level search (Accessibility pattern)
     */
    #[test]
    fn test_match_house_accessibility() {
        let agent = create_test_agent();
        let problem = Problem {
            description: "Accessibility standards WCAG 2.1".to_string(),
            domain_hints: vec![Domain::Ethics],
        };
        let solution = agent.match_house(&problem);
        assert!(solution.confidence > 0.5);
        assert_eq!(solution.source_level, SearchLevel::House);
        assert!(solution.recommendation.contains("Accessibility"));
    }

    /**
     * Test: House level search (Ethical Decision Making pattern)
     */
    #[test]
    fn test_match_house_ethical() {
        let agent = create_test_agent();
        let problem = Problem {
            description: "Ethical AI decision making framework".to_string(),
            domain_hints: vec![Domain::Ethics],
        };
        let solution = agent.match_house(&problem);
        assert!(solution.confidence > 0.5);
        assert_eq!(solution.source_level, SearchLevel::House);
        assert!(solution.recommendation.contains("Ethical AI Decision"));
    }

    /**
     * Test: House level search (Model Explainability pattern)
     */
    #[test]
    fn test_match_house_explainability() {
        let agent = create_test_agent();
        let problem = Problem {
            description: "Model explainability and transparency".to_string(),
            domain_hints: vec![Domain::Ethics],
        };
        let solution = agent.match_house(&problem);
        assert!(solution.confidence > 0.5);
        assert_eq!(solution.source_level, SearchLevel::House);
        assert!(solution.recommendation.contains("Explainability"));
    }

    /**
     * Test: Session history FIFO behavior (capacity 20)
     */
    #[test]
    fn test_session_history_fifo() {
        let mut agent = create_test_agent();

        // Add 25 solutions (exceeds capacity of 20)
        for i in 0..25 {
            let problem = Problem {
                description: format!("Ethics problem {}", i),
                domain_hints: vec![Domain::Ethics],
            };
            let solution = Solution {
                recommendation: format!("Ethics solution {}", i),
                reasoning: vec![format!("Reasoning {}", i)],
                confidence: 0.90,
                source_level: SearchLevel::Local,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
            agent.record_solution(problem, solution);
        }

        // Verify only last 20 remain
        assert_eq!(agent.session_history.len(), 20);

        // Verify oldest (0-4) are gone, newest (5-24) remain
        let first = &agent.session_history[0].0.description;
        assert!(first.contains("5")); // First should be problem 5 (0-4 evicted)
    }

    /**
     * Test: Decision history unlimited (all past solutions preserved)
     */
    #[test]
    fn test_decision_history_unlimited() {
        let mut agent = create_test_agent();

        // Add 100 solutions
        for i in 0..100 {
            let problem = Problem {
                description: format!("Ethics problem {}", i),
                domain_hints: vec![Domain::Ethics],
            };
            let solution = Solution {
                recommendation: format!("Ethics solution {}", i),
                reasoning: vec![format!("Reasoning {}", i)],
                confidence: 0.90,
                source_level: SearchLevel::LongTerm,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
            agent.record_solution(problem, solution);
        }

        // Verify all 100 preserved
        assert_eq!(agent.decision_history.len(), 100);
    }

    /**
     * Test: Mentor query (placeholder)
     */
    #[tokio::test]
    async fn test_query_mentor_placeholder() {
        let agent = create_test_agent();
        let problem = Problem {
            description: "Ethical AI framework".to_string(),
            domain_hints: vec![Domain::Ethics],
        };
        let result = agent.query_mentor(&problem).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not yet implemented"));
    }

    /**
     * Test: Confidence calculation with ethics keywords
     */
    #[test]
    fn test_calculate_confidence_with_keywords() {
        let agent = create_test_agent();
        let problem = Problem {
            description: "Detect bias and ensure fairness in AI model for GDPR privacy compliance with accessibility standards".to_string(),
            domain_hints: vec![Domain::Ethics],
        };
        let confidence = agent.calculate_confidence(&problem, "solution");
        // Should match: bias, fairness, gdpr, privacy, accessibility = 5 keywords
        // Base: 0.3, keywords: 5 * 0.2 = 1.0 → min(0.6) = 0.6, total: 0.3 + 0.6 = 0.9
        // Domain hint: +0.15 → 1.05 → min(1.0)
        assert!(confidence >= 0.9);
    }
}
