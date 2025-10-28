/**
 * Domain Agent Implementations
 *
 * DESIGN DECISION: Separate module for concrete domain agent implementations
 * WHY: Clean separation between trait definition and implementations
 *
 * REASONING CHAIN:
 * 1. domain_agent.rs defines the DomainAgent trait (interface)
 * 2. agents/ contains concrete implementations (7 domains)
 * 3. Each agent specializes in one domain (Infrastructure, Knowledge, etc.)
 * 4. Agents are independently testable and deployable
 * 5. Future: Agents can be compiled as separate binaries for distributed systems
 *
 * PATTERN: Pattern-DOMAIN-001 (Domain Agent Trait)
 * RELATED: domain_agent.rs (trait definition), domain_pattern_library.rs (pattern storage)
 * FUTURE: Phase 3.7 will add distributed agent deployment
 */

pub mod infrastructure;
pub mod quality;
pub mod scalability;
pub mod knowledge;
pub mod innovation;
pub mod deployment;
pub mod ethics;

// Re-export for convenience
pub use infrastructure::InfrastructureAgent;
pub use quality::QualityAgent;
pub use scalability::ScalabilityAgent;
pub use knowledge::KnowledgeAgent;
pub use innovation::InnovationAgent;
pub use deployment::DeploymentAgent;
pub use ethics::EthicsAgent;

/**
 * Helper Functions for Agent Creation
 *
 * DESIGN DECISION: Provide default paths for testing and simple initialization
 * WHY: Tests need easy way to create agents without complex setup
 *
 * REASONING CHAIN:
 * 1. DomainPatternLibrary requires patterns_dir PathBuf
 * 2. DomainEmbeddings requires model_path and tokenizer_path
 * 3. Tests need simple API: create_domain_patterns(Domain::Infrastructure)
 * 4. Production code can use custom paths if needed
 * 5. Default paths: data/patterns/ for patterns, models/ for ONNX
 *
 * PATTERN: Pattern-DOMAIN-002 (Domain Pattern Library Structure)
 * RELATED: domain_pattern_library.rs (actual constructors)
 * FUTURE: Make paths configurable via environment variables
 */

use crate::domain_agent::{Domain, DomainEmbeddings, DomainPatternLibrary};
use crate::Error;
use std::path::PathBuf;

/// Create domain pattern library with default paths
///
/// DESIGN DECISION: Use data/patterns/ directory by default
/// WHY: Standard location for pattern storage, consistent across all agents
///
/// # Arguments
/// * `domain` - Which domain (Infrastructure, Quality, etc.)
///
/// # Example
/// ```rust,ignore
/// let patterns = create_domain_patterns(Domain::Infrastructure)?;
/// let agent = InfrastructureAgent::new(patterns, embeddings);
/// ```
pub fn create_domain_patterns(domain: Domain) -> Result<DomainPatternLibrary, Error> {
    let patterns_dir = PathBuf::from("data/patterns");
    DomainPatternLibrary::new(domain, patterns_dir)
}

/// Create domain embeddings with default model paths
///
/// DESIGN DECISION: Use models/ directory for ONNX models by default
/// WHY: Standard location for ML models, consistent across all agents
///
/// # Arguments
/// * `_domain` - Which domain (currently unused, for future domain-specific models)
///
/// # Example
/// ```rust,ignore
/// let embeddings = create_domain_embeddings(Domain::Infrastructure)?;
/// let agent = InfrastructureAgent::new(patterns, embeddings);
/// ```
///
/// # FUTURE: Phase 3.6
/// - Use domain-specific fine-tuned models
/// - e.g., infrastructure_model.onnx vs quality_model.onnx
pub fn create_domain_embeddings(_domain: Domain) -> Result<DomainEmbeddings, Error> {
    let model_path = "models/all-MiniLM-L6-v2.onnx";
    let tokenizer_path = "models/tokenizer.json";
    DomainEmbeddings::new(model_path, tokenizer_path)
}
