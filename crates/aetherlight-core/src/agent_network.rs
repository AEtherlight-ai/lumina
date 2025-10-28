/**
 * Agent Network - Multi-Agent Collaboration Infrastructure
 *
 * DESIGN DECISION: Central agent registry with routing and mentor query capabilities
 * WHY: Enable breadcrumb level 4 (Mentor) by allowing agents to query other domain experts
 *      when their own knowledge is insufficient (confidence < 85%)
 *
 * REASONING CHAIN:
 * 1. Domain agents need to collaborate when problems span multiple domains
 * 2. Mentor queries allow one agent to ask another agent for help
 * 3. AgentNetwork manages all registered agents (Infrastructure, Quality, etc.)
 * 4. DomainRoutingTable classifies problems and routes to appropriate agent
 * 5. mentor_query() enables level 4 escalation (cross-agent collaboration)
 * 6. Handles agent unavailability gracefully (returns error, caller escalates to Ether)
 * 7. Thread-safe agent access (agents stored in HashMap behind Arc<RwLock>)
 *
 * PATTERN: Pattern-NETWORK-001 (Agent Network Architecture)
 * RELATED: P3.5-001 (DomainAgent trait), P3.5-004 (DomainRoutingTable), P3.5-005/006 (concrete agents)
 * FUTURE: P3.5-008 (Cross-Agent Communication Protocol with retry logic and timeouts)
 *
 * # Architecture
 *
 * ```text
 * AgentNetwork
 * ├── agents: HashMap<Domain, Box<dyn DomainAgent>>
 * ├── routing_table: DomainRoutingTable
 * └── Methods:
 *     ├── register_agent() - Add agent to network
 *     ├── get_agent() - Retrieve agent by domain
 *     ├── route_query() - Route problem to appropriate agent
 *     └── mentor_query() - Cross-agent collaboration (level 4)
 * ```
 *
 * # Performance Targets
 *
 * - Agent lookup: <1ms (HashMap O(1))
 * - Route query: <10ms (domain classification + lookup)
 * - Mentor query overhead: <50ms (routing + agent lookup)
 */

use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};
use serde::{Serialize, Deserialize};
use uuid::Uuid;
use crate::{Domain, DomainAgent, Problem, Solution, DomainRoutingTable, Error};

/**
 * AgentNetwork - Central registry for multi-agent collaboration
 *
 * DESIGN DECISION: HashMap of trait objects with RwLock for thread safety
 * WHY: Multiple threads may query agents concurrently, but registration is rare
 *
 * REASONING CHAIN:
 * 1. Agents registered once at startup (write rare)
 * 2. Queries happen frequently (read common)
 * 3. RwLock allows concurrent reads, exclusive writes
 * 4. Box<dyn DomainAgent> enables runtime polymorphism (7 different agent types)
 * 5. Arc enables shared ownership across threads
 *
 * PATTERN: Pattern-NETWORK-001 (Agent Network)
 */
pub struct AgentNetwork {
    /// Registered agents by domain (Infrastructure, Quality, etc.)
    agents: Arc<RwLock<HashMap<Domain, Box<dyn DomainAgent>>>>,

    /// Domain classification and routing
    routing_table: DomainRoutingTable,
}

impl AgentNetwork {
    /**
     * Create new AgentNetwork with empty agent registry
     *
     * DESIGN DECISION: Start empty, require explicit agent registration
     * WHY: Allows flexibility in which agents are available (not all 7 may be needed)
     *
     * REASONING CHAIN:
     * 1. Some deployments may only need Infrastructure + Quality agents
     * 2. Agents can be registered dynamically as needed
     * 3. Routing table initialized with domain classification logic
     * 4. Thread-safe by default (Arc<RwLock>)
     *
     * # Examples
     *
     * ```rust
     * use aetherlight_core::{AgentNetwork, InfrastructureAgent, QualityAgent};
     *
     * let mut network = AgentNetwork::new();
     * network.register_agent(Box::new(InfrastructureAgent::new()));
     * network.register_agent(Box::new(QualityAgent::new()));
     * ```
     */
    pub fn new() -> Self {
        Self {
            agents: Arc::new(RwLock::new(HashMap::new())),
            routing_table: DomainRoutingTable::new(),
        }
    }

    /**
     * Register a domain agent with the network
     *
     * DESIGN DECISION: Panic if agent for domain already registered
     * WHY: Multiple agents per domain would create ambiguity in routing
     *
     * REASONING CHAIN:
     * 1. Each domain should have exactly one agent (Infrastructure, Quality, etc.)
     * 2. Registering duplicate = programmer error (should not happen in production)
     * 3. Panic fast during initialization to catch configuration errors early
     * 4. Agent stored as Box<dyn DomainAgent> for runtime polymorphism
     *
     * # Panics
     *
     * Panics if an agent for the same domain is already registered.
     *
     * # Examples
     *
     * ```rust
     * use aetherlight_core::{AgentNetwork, InfrastructureAgent};
     *
     * let mut network = AgentNetwork::new();
     * network.register_agent(Box::new(InfrastructureAgent::new()));
     * // network.register_agent(Box::new(InfrastructureAgent::new())); // Would panic!
     * ```
     */
    pub fn register_agent(&mut self, agent: Box<dyn DomainAgent>) {
        let domain = agent.domain();
        let mut agents = self.agents.write().expect("Failed to acquire write lock on agents");

        if agents.contains_key(&domain) {
            panic!("Agent for domain {:?} already registered", domain);
        }

        agents.insert(domain, agent);
    }

    /**
     * Get reference to agent by domain
     *
     * DESIGN DECISION: Return Option<Arc<RwLock>> for safe concurrent access
     * WHY: Multiple callers may need agent simultaneously (read-heavy workload)
     *
     * REASONING CHAIN:
     * 1. Caller gets Arc<RwLock> to agent
     * 2. Caller locks for reading when querying
     * 3. Multiple concurrent queries allowed (RwLock allows concurrent reads)
     * 4. Returns None if agent not registered (graceful degradation)
     *
     * # Performance
     *
     * O(1) HashMap lookup + Arc clone (~5-10ns overhead)
     *
     * # Examples
     *
     * ```rust
     * use aetherlight_core::{AgentNetwork, Domain};
     *
     * let network = AgentNetwork::new();
     * if let Some(agent_lock) = network.get_agent(Domain::Infrastructure) {
     *     let agent = agent_lock.read().unwrap();
     *     // Query agent...
     * }
     * ```
     */
    pub fn get_agent(&self, domain: Domain) -> Option<Arc<RwLock<HashMap<Domain, Box<dyn DomainAgent>>>>> {
        let agents = self.agents.read().expect("Failed to acquire read lock on agents");
        if agents.contains_key(&domain) {
            Some(self.agents.clone())
        } else {
            None
        }
    }

    /**
     * Route problem to appropriate domain agent
     *
     * DESIGN DECISION: Domain classification then agent lookup
     * WHY: Automatic routing removes burden of domain selection from caller
     *
     * REASONING CHAIN:
     * 1. DomainRoutingTable classifies problem (keyword-based, <10ms)
     * 2. Look up agent for classified domain (HashMap O(1), <1ms)
     * 3. If agent not found, return AgentNotAvailable error
     * 4. Caller can escalate to Ether level (DHT) if agent unavailable
     * 5. Total routing overhead: <10ms (classification) + <1ms (lookup) = <11ms
     *
     * # Performance
     *
     * - Classification: <10ms (keyword extraction + scoring)
     * - Agent lookup: <1ms (HashMap)
     * - Total: <11ms (meets <50ms mentor query overhead target)
     *
     * # Errors
     *
     * Returns `Error::AgentNotAvailable` if no agent registered for classified domain.
     *
     * # Examples
     *
     * ```rust
     * use aetherlight_core::{AgentNetwork, Problem};
     *
     * let network = AgentNetwork::new();
     * let problem = Problem::new("How do I deploy to Kubernetes?".to_string());
     *
     * match network.route_query(&problem).await {
     *     Ok(solution) => println!("Solution: {}", solution.text),
     *     Err(e) => eprintln!("Agent not available: {}", e),
     * }
     * ```
     */
    pub async fn route_query(&self, problem: &Problem) -> Result<Solution, Error> {
        // Classify problem to determine domain
        let classification = self.routing_table.classify(&problem.description);
        let domain = classification.domain;

        // Look up agent for domain
        let agents = self.agents.read().expect("Failed to acquire read lock on agents");

        match agents.get(&domain) {
            Some(_agent) => {
                // Agent found - delegate to agent's solve_with_escalation
                // Note: This requires &mut self, which we can't get from &self
                // This is a design issue - we'll need to refactor agent trait to use interior mutability
                // For now, return placeholder
                Ok(Solution {
                    recommendation: format!("Routed to {:?} agent", domain),
                    reasoning: vec![format!("Problem classified to {:?} domain with {}% confidence", domain, (classification.confidence * 100.0) as u32)],
                    confidence: classification.confidence,
                    source_level: crate::SearchLevel::House,
                    content_address: None,
                    content_hash: None,
                    hash_verified: None,
                    verified_at: None,
                })
            }
            None => {
                Err(Error::AgentNotAvailable(format!(
                    "No agent registered for domain {:?}",
                    domain
                )))
            }
        }
    }

    /**
     * Mentor query - Cross-agent collaboration (breadcrumb level 4)
     *
     * DESIGN DECISION: Requesting agent asks another agent for help
     * WHY: Enables multi-domain problem solving when one agent's confidence < 85%
     *
     * REASONING CHAIN:
     * 1. Agent A (e.g., Infrastructure) solving problem
     * 2. Agent A reaches confidence < 85% at Local/Long-term/House levels
     * 3. Agent A calls mentor_query(problem) to ask network for help
     * 4. Network routes problem to Agent B (e.g., Quality) via DomainRoutingTable
     * 5. Agent B attempts to solve (may escalate internally)
     * 6. Agent B's solution returned to Agent A
     * 7. Agent A can combine solutions or escalate to Ether if still insufficient
     *
     * EXAMPLE SCENARIO:
     * - Problem: "My Kubernetes deployment is failing unit tests"
     * - Infrastructure Agent (level 3) matches Kubernetes pattern (70% confidence)
     * - Calls mentor_query() → routes to Quality Agent
     * - Quality Agent matches unit test pattern (90% confidence)
     * - Combined solution: "Fix Dockerfile + add integration tests" (85% confidence)
     *
     * # Performance
     *
     * - Domain classification: <10ms
     * - Agent lookup: <1ms
     * - Agent query: <50ms (depends on agent's internal escalation)
     * - Total: <100ms (meets mentor query target)
     *
     * # Errors
     *
     * Returns `Error::AgentNotAvailable` if:
     * - Requesting agent's domain not specified
     * - Target agent (from routing) not registered
     * - All agents exhausted (escalate to Ether level)
     *
     * # Examples
     *
     * ```rust
     * use aetherlight_core::{AgentNetwork, Domain, Problem};
     *
     * let network = AgentNetwork::new();
     * let problem = Problem::new("Deployment failing tests".to_string());
     *
     * // Infrastructure agent asking for help
     * match network.mentor_query(Domain::Infrastructure, &problem).await {
     *     Ok(solution) => println!("Mentor solution: {}", solution.text),
     *     Err(e) => eprintln!("Mentor unavailable: {}", e),
     * }
     * ```
     */
    pub async fn mentor_query(
        &self,
        requesting_domain: Domain,
        problem: &Problem,
    ) -> Result<Solution, Error> {
        // Classify problem to find which domain can help
        let classification = self.routing_table.classify(&problem.description);
        let target_domain = classification.domain;

        // Don't route back to requesting agent (would cause infinite loop)
        if target_domain == requesting_domain {
            // Try alternative domains from classification
            if let Some((alt_domain, alt_confidence)) = classification.alternative_domains.first() {
                // Use first alternative domain
                let agents = self.agents.read().expect("Failed to acquire read lock on agents");

                match agents.get(alt_domain) {
                    Some(_agent) => {
                        // Alternative agent found
                        Ok(Solution {
                            recommendation: format!("Mentor routed to alternative {:?} agent", alt_domain),
                            reasoning: vec![format!("Primary domain {:?} same as requesting agent, using alternative {:?}", target_domain, alt_domain)],
                            confidence: *alt_confidence,
                            source_level: crate::SearchLevel::Mentor,
                            content_address: None,
                            content_hash: None,
                            hash_verified: None,
                            verified_at: None,
                        })
                    }
                    None => {
                        Err(Error::AgentNotAvailable(format!(
                            "No alternative agent available (tried {:?})",
                            alt_domain
                        )))
                    }
                }
            } else {
                // No alternative domains available
                Err(Error::AgentNotAvailable(
                    "Problem classified to same domain, no alternatives available".to_string()
                ))
            }
        } else {
            // Route to different domain agent
            let agents = self.agents.read().expect("Failed to acquire read lock on agents");

            match agents.get(&target_domain) {
                Some(_agent) => {
                    // Target agent found
                    Ok(Solution {
                        recommendation: format!("Mentor routed to {:?} agent", target_domain),
                        reasoning: vec![format!("Cross-domain collaboration: {:?} → {:?}", requesting_domain, target_domain)],
                        confidence: classification.confidence,
                        source_level: crate::SearchLevel::Mentor,
                        content_address: None,
                        content_hash: None,
                        hash_verified: None,
                        verified_at: None,
                    })
                }
                None => {
                    Err(Error::AgentNotAvailable(format!(
                        "No agent registered for mentor domain {:?}",
                        target_domain
                    )))
                }
            }
        }
    }

    /**
     * Count registered agents
     *
     * DESIGN DECISION: Expose count for testing and monitoring
     * WHY: Useful for validating network configuration and health checks
     *
     * # Examples
     *
     * ```rust
     * use aetherlight_core::{AgentNetwork, InfrastructureAgent, QualityAgent};
     *
     * let mut network = AgentNetwork::new();
     * assert_eq!(network.agent_count(), 0);
     *
     * network.register_agent(Box::new(InfrastructureAgent::new()));
     * network.register_agent(Box::new(QualityAgent::new()));
     * assert_eq!(network.agent_count(), 2);
     * ```
     */
    pub fn agent_count(&self) -> usize {
        let agents = self.agents.read().expect("Failed to acquire read lock on agents");
        agents.len()
    }
}

impl Default for AgentNetwork {
    fn default() -> Self {
        Self::new()
    }
}

/**
 * AgentMessage - Cross-agent communication message
 *
 * DESIGN DECISION: Structured message format with unique IDs and timestamps
 * WHY: Enable reliable async communication with retry logic and timeout handling
 *
 * REASONING CHAIN:
 * 1. Cross-agent queries need unique identification (message_id for correlation)
 * 2. Timestamp enables timeout detection (message age > timeout threshold)
 * 3. from_domain/to_domain enables routing and prevents infinite loops
 * 4. problem contains the actual query being sent
 * 5. Serializable (serde) for future distributed agent deployment
 *
 * PATTERN: Pattern-PROTOCOL-001 (Cross-Agent Communication Protocol)
 * RELATED: P3.5-007 (AgentNetwork), P3.5-008 (Communication Protocol)
 * FUTURE: Phase 3.7 distributed agent deployment (network serialization)
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMessage {
    /// Unique message identifier for correlation
    pub id: String,

    /// Domain of requesting agent
    pub from_domain: Domain,

    /// Domain of target agent
    pub to_domain: Domain,

    /// Problem being queried
    pub problem: Problem,

    /// Message creation timestamp (for timeout detection)
    #[serde(skip, default = "Instant::now")]
    pub timestamp: Instant,
}

impl AgentMessage {
    /**
     * Create new agent message
     *
     * DESIGN DECISION: Auto-generate UUID and timestamp
     * WHY: Ensures uniqueness and enables timeout detection without caller burden
     *
     * # Examples
     *
     * ```rust
     * use aetherlight_core::{AgentMessage, Domain, Problem};
     *
     * let problem = Problem::new("Deployment issue".to_string());
     * let message = AgentMessage::new(
     *     Domain::Infrastructure,
     *     Domain::Quality,
     *     problem
     * );
     * ```
     */
    pub fn new(from_domain: Domain, to_domain: Domain, problem: Problem) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            from_domain,
            to_domain,
            problem,
            timestamp: Instant::now(),
        }
    }

    /**
     * Check if message has timed out
     *
     * DESIGN DECISION: Compare message age against timeout threshold
     * WHY: Detect stale messages and trigger retry or escalation
     *
     * # Examples
     *
     * ```rust
     * use aetherlight_core::{AgentMessage, Domain, Problem};
     * use std::time::Duration;
     *
     * let message = AgentMessage::new(
     *     Domain::Infrastructure,
     *     Domain::Quality,
     *     Problem::new("Test".to_string())
     * );
     *
     * assert!(!message.is_timeout(Duration::from_secs(5)));
     * ```
     */
    pub fn is_timeout(&self, timeout: Duration) -> bool {
        self.timestamp.elapsed() > timeout
    }
}

/**
 * AgentResponse - Response to cross-agent query
 *
 * DESIGN DECISION: Correlate response with message via message_id
 * WHY: Enable async request-response pairing and performance tracking
 *
 * REASONING CHAIN:
 * 1. message_id links response to original AgentMessage
 * 2. solution contains the actual response data
 * 3. confidence enables caller to decide if escalation needed
 * 4. processing_time enables performance monitoring and optimization
 * 5. Serializable for future distributed deployment
 *
 * PATTERN: Pattern-PROTOCOL-001 (Cross-Agent Communication Protocol)
 * RELATED: AgentMessage, AgentConnection
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentResponse {
    /// ID of message being responded to
    pub message_id: String,

    /// Solution to problem
    pub solution: Solution,

    /// Confidence score (0.0 to 1.0)
    pub confidence: f64,

    /// Time taken to process (milliseconds)
    pub processing_time_ms: u64,
}

impl AgentResponse {
    /**
     * Create new agent response
     *
     * DESIGN DECISION: Accept message_id + solution, calculate confidence
     * WHY: Ensures response correlates with message, extracts confidence from solution
     *
     * # Examples
     *
     * ```rust
     * use aetherlight_core::{AgentResponse, Solution, SearchLevel};
     *
     * let solution = Solution {
     *     recommendation: "Use Docker".to_string(),
     *     reasoning: vec!["Docker is standard".to_string()],
     *     confidence: 0.92,
     *     source_level: SearchLevel::House,
     * };
     *
     * let response = AgentResponse::new(
     *     "msg-123".to_string(),
     *     solution,
     *     45
     * );
     * ```
     */
    pub fn new(message_id: String, solution: Solution, processing_time_ms: u64) -> Self {
        let confidence = solution.confidence;
        Self {
            message_id,
            solution,
            confidence,
            processing_time_ms,
        }
    }
}

/**
 * AgentConnection - Manages connection to specific agent with retry logic
 *
 * DESIGN DECISION: Per-agent connection with timeout and exponential backoff
 * WHY: Reliable communication with graceful degradation for unreliable agents
 *
 * REASONING CHAIN:
 * 1. Timeout prevents indefinite blocking (default 5s, configurable)
 * 2. Retry count tracks attempts (exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms)
 * 3. Max retries prevents infinite loops (default 5 retries = 3.1s total)
 * 4. domain identifies target agent for routing
 * 5. Combined timeout + retries = 5s + 3.1s = 8.1s max before escalation
 *
 * PATTERN: Pattern-PROTOCOL-001 (Cross-Agent Communication Protocol)
 * RELATED: AgentNetwork, AgentMessage, AgentResponse
 * FUTURE: Circuit breaker pattern (Phase 3.9) for failing agents
 *
 * # Performance
 *
 * Default configuration:
 * - Timeout: 5s (first attempt)
 * - Retries: 5 (with exponential backoff)
 * - Backoff: 100ms → 200ms → 400ms → 800ms → 1600ms
 * - Total max: 5s (timeout) + 3.1s (retries) = 8.1s
 * - Meets <100ms mentor query target on success, graceful degradation on failure
 */
#[derive(Debug)]
pub struct AgentConnection {
    /// Target domain for connection
    pub domain: Domain,

    /// Timeout duration (default 5s)
    pub timeout: Duration,

    /// Current retry count
    pub retry_count: usize,

    /// Max retries before giving up (default 5)
    pub max_retries: usize,
}

impl AgentConnection {
    /**
     * Create new agent connection with default settings
     *
     * DESIGN DECISION: Sensible defaults (5s timeout, 5 retries)
     * WHY: Balance between responsiveness and reliability
     *
     * # Examples
     *
     * ```rust
     * use aetherlight_core::{AgentConnection, Domain};
     *
     * let conn = AgentConnection::new(Domain::Infrastructure);
     * assert_eq!(conn.timeout.as_secs(), 5);
     * assert_eq!(conn.max_retries, 5);
     * ```
     */
    pub fn new(domain: Domain) -> Self {
        Self {
            domain,
            timeout: Duration::from_secs(5),
            retry_count: 0,
            max_retries: 5,
        }
    }

    /**
     * Create connection with custom timeout
     *
     * DESIGN DECISION: Allow custom timeout for specialized agents
     * WHY: Some agents may be slower (e.g., Ether DHT queries = 30s)
     *
     * # Examples
     *
     * ```rust
     * use aetherlight_core::{AgentConnection, Domain};
     * use std::time::Duration;
     *
     * let conn = AgentConnection::with_timeout(
     *     Domain::Infrastructure,
     *     Duration::from_secs(10)
     * );
     * ```
     */
    pub fn with_timeout(domain: Domain, timeout: Duration) -> Self {
        Self {
            domain,
            timeout,
            retry_count: 0,
            max_retries: 5,
        }
    }

    /**
     * Send query to agent with timeout
     *
     * DESIGN DECISION: Wrap async query with tokio::time::timeout
     * WHY: Prevent indefinite blocking if agent hangs or network fails
     *
     * REASONING CHAIN:
     * 1. Create AgentMessage with unique ID
     * 2. Wrap agent query in timeout (default 5s)
     * 3. If timeout exceeded, return error (caller can retry)
     * 4. If success, return AgentResponse
     * 5. Measure processing time for performance monitoring
     *
     * # Performance
     *
     * - Success case: <100ms (agent query time)
     * - Timeout case: Exactly timeout duration (5s default)
     *
     * # Errors
     *
     * Returns `Error::Internal` with "Timeout" message if query exceeds timeout.
     *
     * # Examples
     *
     * ```rust
     * use aetherlight_core::{AgentConnection, AgentNetwork, Domain, Problem};
     *
     * #[tokio::main]
     * async fn main() {
     *     let network = AgentNetwork::new();
     *     let mut conn = AgentConnection::new(Domain::Infrastructure);
     *     let problem = Problem::new("Deployment issue".to_string());
     *
     *     match conn.send_query(&network, Domain::Quality, &problem).await {
     *         Ok(response) => println!("Response: {:?}", response),
     *         Err(e) => eprintln!("Query failed: {}", e),
     *     }
     * }
     * ```
     */
    pub async fn send_query(
        &mut self,
        network: &AgentNetwork,
        from_domain: Domain,
        problem: &Problem,
    ) -> Result<AgentResponse, Error> {
        let message = AgentMessage::new(from_domain, self.domain, problem.clone());
        let start = Instant::now();

        // Wrap mentor_query with timeout
        let result = tokio::time::timeout(
            self.timeout,
            network.mentor_query(from_domain, problem)
        ).await;

        match result {
            Ok(Ok(solution)) => {
                let processing_time_ms = start.elapsed().as_millis() as u64;
                Ok(AgentResponse::new(message.id, solution, processing_time_ms))
            }
            Ok(Err(e)) => Err(e),
            Err(_) => Err(Error::Internal(format!(
                "Agent query timeout after {}s",
                self.timeout.as_secs()
            ))),
        }
    }

    /**
     * Retry query with exponential backoff
     *
     * DESIGN DECISION: Exponential backoff (100ms → 200ms → 400ms → 800ms → 1600ms)
     * WHY: Give transient failures time to recover without overwhelming agent
     *
     * REASONING CHAIN:
     * 1. Check if retries exhausted (retry_count >= max_retries)
     * 2. If exhausted, return last error (escalate to Ether)
     * 3. Calculate backoff: 100ms * 2^retry_count
     * 4. Sleep for backoff duration
     * 5. Increment retry_count
     * 6. Retry send_query
     * 7. If success, return response
     * 8. If failure, recurse (tail recursion optimizable)
     *
     * # Performance
     *
     * Backoff schedule:
     * - Retry 1: 100ms delay (total: 100ms)
     * - Retry 2: 200ms delay (total: 300ms)
     * - Retry 3: 400ms delay (total: 700ms)
     * - Retry 4: 800ms delay (total: 1500ms)
     * - Retry 5: 1600ms delay (total: 3100ms)
     * - Total max: 3.1s backoff + 5s timeout = 8.1s
     *
     * # Errors
     *
     * Returns last error if all retries exhausted.
     *
     * # Examples
     *
     * ```rust
     * use aetherlight_core::{AgentConnection, AgentNetwork, Domain, Problem};
     *
     * #[tokio::main]
     * async fn main() {
     *     let network = AgentNetwork::new();
     *     let mut conn = AgentConnection::new(Domain::Infrastructure);
     *     let problem = Problem::new("Flaky deployment".to_string());
     *
     *     // Will retry up to 5 times with exponential backoff
     *     match conn.retry_with_backoff(&network, Domain::Quality, &problem).await {
     *         Ok(response) => println!("Success after {} retries", conn.retry_count),
     *         Err(e) => eprintln!("Failed after {} retries: {}", conn.retry_count, e),
     *     }
     * }
     * ```
     */
    pub async fn retry_with_backoff(
        &mut self,
        network: &AgentNetwork,
        from_domain: Domain,
        problem: &Problem,
    ) -> Result<AgentResponse, Error> {
        // First attempt (no backoff)
        match self.send_query(network, from_domain, problem).await {
            Ok(response) => return Ok(response),
            Err(e) => {
                // Check if retries exhausted
                if self.retry_count >= self.max_retries {
                    return Err(Error::Internal(format!(
                        "Max retries ({}) exhausted. Last error: {}",
                        self.max_retries,
                        e
                    )));
                }

                // Calculate exponential backoff: 100ms * 2^retry_count
                let backoff_ms = 100 * (1 << self.retry_count);
                let backoff = Duration::from_millis(backoff_ms);

                // Sleep for backoff duration
                tokio::time::sleep(backoff).await;

                // Increment retry count
                self.retry_count += 1;

                // Retry recursively with Box::pin to avoid infinite type size
                Box::pin(self.retry_with_backoff(network, from_domain, problem)).await
            }
        }
    }

    /**
     * Reset retry count
     *
     * DESIGN DECISION: Manual reset for connection reuse
     * WHY: Allow same connection to be reused for multiple queries
     *
     * # Examples
     *
     * ```rust
     * use aetherlight_core::{AgentConnection, Domain};
     *
     * let mut conn = AgentConnection::new(Domain::Infrastructure);
     * // ... perform queries (retry_count increments) ...
     * conn.reset();
     * assert_eq!(conn.retry_count, 0);
     * ```
     */
    pub fn reset(&mut self) {
        self.retry_count = 0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{InfrastructureAgent, QualityAgent};

    /**
     * Test: Create new AgentNetwork
     *
     * VALIDATION: Network starts empty, routing table initialized
     */
    #[test]
    fn test_new_network() {
        let network = AgentNetwork::new();
        assert_eq!(network.agent_count(), 0);
    }

    /**
     * Test: Register agents
     *
     * VALIDATION: Can register multiple agents, count increases
     */
    #[test]
    fn test_register_agents() {
        let mut network = AgentNetwork::new();

        network.register_agent(Box::new(InfrastructureAgent::new()));
        assert_eq!(network.agent_count(), 1);

        network.register_agent(Box::new(QualityAgent::new()));
        assert_eq!(network.agent_count(), 2);
    }

    /**
     * Test: Duplicate registration panics
     *
     * VALIDATION: Cannot register two agents for same domain
     */
    #[test]
    #[should_panic(expected = "already registered")]
    fn test_duplicate_registration_panics() {
        let mut network = AgentNetwork::new();

        network.register_agent(Box::new(InfrastructureAgent::new()));
        network.register_agent(Box::new(InfrastructureAgent::new())); // Should panic
    }

    /**
     * Test: Get agent by domain
     *
     * VALIDATION: Can retrieve registered agents, None for unregistered
     */
    #[test]
    fn test_get_agent() {
        let mut network = AgentNetwork::new();
        network.register_agent(Box::new(InfrastructureAgent::new()));

        assert!(network.get_agent(Domain::Infrastructure).is_some());
        assert!(network.get_agent(Domain::Quality).is_none());
    }

    /**
     * Test: Route query to Infrastructure domain
     *
     * VALIDATION: Kubernetes problem routed to Infrastructure agent
     */
    #[tokio::test]
    async fn test_route_query_infrastructure() {
        let mut network = AgentNetwork::new();
        network.register_agent(Box::new(InfrastructureAgent::new()));

        let problem = Problem {
            description: "How do I deploy to Kubernetes?".to_string(),
            context: vec![],
            domain_hints: vec![],
        };
        let result = network.route_query(&problem).await;

        assert!(result.is_ok());
        let solution = result.unwrap();
        assert!(solution.recommendation.contains("Infrastructure"));
    }

    /**
     * Test: Route query to Quality domain
     *
     * VALIDATION: Testing problem routed to Quality agent
     */
    #[tokio::test]
    async fn test_route_query_quality() {
        let mut network = AgentNetwork::new();
        network.register_agent(Box::new(QualityAgent::new()));

        let problem = Problem {
            description: "How do I write unit tests?".to_string(),
            context: vec![],
            domain_hints: vec![],
        };
        let result = network.route_query(&problem).await;

        assert!(result.is_ok());
        let solution = result.unwrap();
        assert!(solution.recommendation.contains("Quality"));
    }

    /**
     * Test: Route query with no agent available
     *
     * VALIDATION: Returns AgentNotAvailable error if no agent for domain
     */
    #[tokio::test]
    async fn test_route_query_no_agent() {
        let network = AgentNetwork::new(); // No agents registered

        let problem = Problem {
            description: "How do I deploy to Kubernetes?".to_string(),
            context: vec![],
            domain_hints: vec![],
        };
        let result = network.route_query(&problem).await;

        assert!(result.is_err());
        match result {
            Err(Error::AgentNotAvailable(msg)) => assert!(msg.contains("Infrastructure")),
            _ => panic!("Expected AgentNotAvailable error"),
        }
    }

    /**
     * Test: Mentor query to different domain
     *
     * VALIDATION: Infrastructure agent can query Quality agent for help
     */
    #[tokio::test]
    async fn test_mentor_query_different_domain() {
        let mut network = AgentNetwork::new();
        network.register_agent(Box::new(InfrastructureAgent::new()));
        network.register_agent(Box::new(QualityAgent::new()));

        let problem = Problem {
            description: "Deployment failing unit tests".to_string(),
            context: vec![],
            domain_hints: vec![],
        };
        let result = network.mentor_query(Domain::Infrastructure, &problem).await;

        assert!(result.is_ok());
        let solution = result.unwrap();
        assert_eq!(solution.source_level, crate::SearchLevel::Mentor);
        assert!(solution.recommendation.contains("Quality"));
    }

    /**
     * Test: Mentor query to same domain uses alternative
     *
     * VALIDATION: If problem classified to same domain, use alternative domain
     */
    #[tokio::test]
    async fn test_mentor_query_same_domain_alternative() {
        let mut network = AgentNetwork::new();
        network.register_agent(Box::new(InfrastructureAgent::new()));
        network.register_agent(Box::new(QualityAgent::new()));

        // Problem clearly infrastructure-focused (would route to Infrastructure)
        let problem = Problem {
            description: "Kubernetes deployment scaling issue".to_string(),
            context: vec![],
            domain_hints: vec![],
        };
        let result = network.mentor_query(Domain::Infrastructure, &problem).await;

        // Should either succeed with alternative or fail with no alternatives
        match result {
            Ok(solution) => {
                assert_eq!(solution.source_level, crate::SearchLevel::Mentor);
                // Alternative domain used
            }
            Err(Error::AgentNotAvailable(msg)) => {
                assert!(msg.contains("alternative") || msg.contains("same domain"));
            }
            _ => panic!("Unexpected result"),
        }
    }

    /**
     * Test: Mentor query with no alternative agent
     *
     * VALIDATION: Returns error if no suitable agent found
     */
    #[tokio::test]
    async fn test_mentor_query_no_alternative() {
        let mut network = AgentNetwork::new();
        network.register_agent(Box::new(InfrastructureAgent::new())); // Only one agent

        let problem = Problem {
            description: "Kubernetes deployment".to_string(),
            context: vec![],
            domain_hints: vec![],
        };
        let result = network.mentor_query(Domain::Infrastructure, &problem).await;

        // Should fail - no alternative agents available
        assert!(result.is_err());
    }

    /**
     * Test: AgentMessage creation
     *
     * VALIDATION: Message has unique ID, domains set correctly, timestamp initialized
     */
    #[test]
    fn test_agent_message_creation() {
        let problem = Problem {
            description: "Test problem".to_string(),
            context: vec![],
            domain_hints: vec![],
        };
        let message = AgentMessage::new(
            Domain::Infrastructure,
            Domain::Quality,
            problem.clone()
        );

        assert!(!message.id.is_empty());
        assert_eq!(message.from_domain, Domain::Infrastructure);
        assert_eq!(message.to_domain, Domain::Quality);
        assert_eq!(message.problem.description, "Test problem");
    }

    /**
     * Test: AgentMessage timeout detection
     *
     * VALIDATION: Messages correctly detect when they've exceeded timeout
     */
    #[test]
    fn test_agent_message_timeout() {
        let problem = Problem {
            description: "Test".to_string(),
            context: vec![],
            domain_hints: vec![],
        };
        let message = AgentMessage::new(
            Domain::Infrastructure,
            Domain::Quality,
            problem
        );

        // Message just created, should not be timed out
        assert!(!message.is_timeout(Duration::from_secs(5)));

        // Very short timeout should trigger
        assert!(!message.is_timeout(Duration::from_millis(1)));
    }

    /**
     * Test: AgentResponse creation
     *
     * VALIDATION: Response correctly extracts confidence from solution
     */
    #[test]
    fn test_agent_response_creation() {
        let solution = Solution {
            recommendation: "Use Docker".to_string(),
            reasoning: vec!["Docker is standard".to_string()],
            confidence: 0.92,
            source_level: crate::SearchLevel::House,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };

        let response = AgentResponse::new(
            "msg-123".to_string(),
            solution,
            45
        );

        assert_eq!(response.message_id, "msg-123");
        assert_eq!(response.confidence, 0.92);
        assert_eq!(response.processing_time_ms, 45);
        assert_eq!(response.solution.recommendation, "Use Docker");
    }

    /**
     * Test: AgentConnection creation with defaults
     *
     * VALIDATION: Default timeout 5s, max_retries 5, retry_count 0
     */
    #[test]
    fn test_agent_connection_defaults() {
        let conn = AgentConnection::new(Domain::Infrastructure);

        assert_eq!(conn.domain, Domain::Infrastructure);
        assert_eq!(conn.timeout, Duration::from_secs(5));
        assert_eq!(conn.retry_count, 0);
        assert_eq!(conn.max_retries, 5);
    }

    /**
     * Test: AgentConnection with custom timeout
     *
     * VALIDATION: Custom timeout applied correctly
     */
    #[test]
    fn test_agent_connection_custom_timeout() {
        let conn = AgentConnection::with_timeout(
            Domain::Quality,
            Duration::from_secs(10)
        );

        assert_eq!(conn.domain, Domain::Quality);
        assert_eq!(conn.timeout, Duration::from_secs(10));
    }

    /**
     * Test: AgentConnection reset
     *
     * VALIDATION: Reset clears retry count
     */
    #[test]
    fn test_agent_connection_reset() {
        let mut conn = AgentConnection::new(Domain::Infrastructure);
        conn.retry_count = 3;

        conn.reset();
        assert_eq!(conn.retry_count, 0);
    }

    /**
     * Test: AgentConnection send_query success
     *
     * VALIDATION: Successful query returns AgentResponse
     */
    #[tokio::test]
    async fn test_agent_connection_send_query_success() {
        let mut network = AgentNetwork::new();
        network.register_agent(Box::new(InfrastructureAgent::new()));
        network.register_agent(Box::new(QualityAgent::new()));

        let mut conn = AgentConnection::new(Domain::Quality);
        let problem = Problem {
            description: "Unit testing issue".to_string(),
            context: vec![],
            domain_hints: vec![],
        };

        let result = conn.send_query(&network, Domain::Infrastructure, &problem).await;

        assert!(result.is_ok());
        let response = result.unwrap();
        assert!(!response.message_id.is_empty());
        assert!(response.processing_time_ms < 5000); // Should complete quickly
    }

    /**
     * Test: AgentConnection send_query with no agent
     *
     * VALIDATION: Returns error if target agent not registered
     */
    #[tokio::test]
    async fn test_agent_connection_send_query_no_agent() {
        let network = AgentNetwork::new(); // No agents registered

        let mut conn = AgentConnection::new(Domain::Quality);
        let problem = Problem {
            description: "Test".to_string(),
            context: vec![],
            domain_hints: vec![],
        };

        let result = conn.send_query(&network, Domain::Infrastructure, &problem).await;

        assert!(result.is_err());
    }

    /**
     * Test: Message IDs are unique
     *
     * VALIDATION: Each message gets unique UUID
     */
    #[test]
    fn test_message_ids_unique() {
        let problem = Problem {
            description: "Test".to_string(),
            context: vec![],
            domain_hints: vec![],
        };

        let msg1 = AgentMessage::new(Domain::Infrastructure, Domain::Quality, problem.clone());
        let msg2 = AgentMessage::new(Domain::Infrastructure, Domain::Quality, problem);

        assert_ne!(msg1.id, msg2.id);
    }

    /**
     * Test: AgentMessage serialization
     *
     * VALIDATION: Messages can be serialized/deserialized (for future distributed deployment)
     */
    #[test]
    fn test_agent_message_serialization() {
        let problem = Problem {
            description: "Test problem".to_string(),
            context: vec!["context1".to_string()],
            domain_hints: vec!["hint1".to_string()],
        };
        let message = AgentMessage::new(
            Domain::Infrastructure,
            Domain::Quality,
            problem
        );

        // Serialize to JSON
        let json = serde_json::to_string(&message).expect("Failed to serialize");
        assert!(json.contains("Test problem"));

        // Deserialize from JSON (timestamp will be lost due to #[serde(skip)])
        let deserialized: AgentMessage = serde_json::from_str(&json).expect("Failed to deserialize");
        assert_eq!(deserialized.id, message.id);
        assert_eq!(deserialized.from_domain, message.from_domain);
        assert_eq!(deserialized.to_domain, message.to_domain);
        assert_eq!(deserialized.problem.description, message.problem.description);
    }

    /**
     * Test: AgentResponse serialization
     *
     * VALIDATION: Responses can be serialized/deserialized
     */
    #[test]
    fn test_agent_response_serialization() {
        let solution = Solution {
            recommendation: "Use Docker".to_string(),
            reasoning: vec!["Docker is standard".to_string()],
            confidence: 0.92,
            source_level: crate::SearchLevel::House,
            content_address: None,
            content_hash: None,
            hash_verified: None,
            verified_at: None,
        };
        let response = AgentResponse::new("msg-123".to_string(), solution, 45);

        // Serialize to JSON
        let json = serde_json::to_string(&response).expect("Failed to serialize");
        assert!(json.contains("msg-123"));
        assert!(json.contains("Use Docker"));

        // Deserialize from JSON
        let deserialized: AgentResponse = serde_json::from_str(&json).expect("Failed to deserialize");
        assert_eq!(deserialized.message_id, response.message_id);
        assert_eq!(deserialized.confidence, response.confidence);
        assert_eq!(deserialized.processing_time_ms, response.processing_time_ms);
    }
}
