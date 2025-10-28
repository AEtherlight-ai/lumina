/**
 * Core Types for Uncertainty Quantification (AI-008)
 *
 * DESIGN DECISION: Separate types module for clean API boundaries
 * WHY: Core types used across scorer, calibrator, and agent responses
 *
 * REASONING CHAIN:
 * 1. AgentResponse must include confidence, content, and factors
 * 2. Confidence factors categorized by source certainty, recency, specificity
 * 3. Types reusable across all uncertainty quantification components
 * 4. Clear separation enables independent evolution of scorer vs calibrator
 * 5. Serializable for persistence and network transmission
 *
 * PATTERN: Pattern-UNCERTAINTY-002 (Confidence Calibration System)
 * PERFORMANCE: Zero-cost abstractions (types compile away)
 * RELATED: uncertainty.rs (main module), calibrator.rs, confidence_scorer.rs
 */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/**
 * Agent response with explicit confidence tracking
 *
 * DESIGN DECISION: All AI responses must include confidence score
 * WHY: Enables detection of overconfident mistakes, triggers verification
 *
 * REASONING CHAIN:
 * 1. Agent generates response content (text, code, decision)
 * 2. Simultaneously calculate confidence (0.0-1.0)
 * 3. Include uncertainty factors explaining the score
 * 4. Flag if verification needed (confidence < 0.70)
 * 5. Low confidence triggers escalation or human review
 *
 * ## Example Usage
 *
 * ```rust
 * let response = AgentResponse {
 *     content: "Modify line 42 in server.rs".to_string(),
 *     confidence: 0.85,
 *     uncertainty_factors: vec![
 *         UncertaintyFactor {
 *             category: FactorCategory::Specificity,
 *             description: "Exact line number provided".to_string(),
 *             impact: 0.2, // Increases confidence
 *         },
 *         UncertaintyFactor {
 *             category: FactorCategory::SourceCertainty,
 *             description: "Recently read file".to_string(),
 *             impact: 0.15,
 *         },
 *     ],
 *     verification_needed: false,
 * };
 *
 * if response.verification_needed {
 *     verify_claim(&response.content)?;
 * }
 * ```
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentResponse {
    /// Response content (text, code, decision)
    pub content: String,

    /// Confidence score (0.0-1.0)
    /// - 1.0 = Verified fact (file exists, function defined)
    /// - 0.8-0.9 = High confidence (recently read, specific reference)
    /// - 0.6-0.8 = Medium confidence (memory, inference)
    /// - 0.3-0.5 = Low confidence (guess, vague)
    pub confidence: f64,

    /// Factors contributing to uncertainty
    pub uncertainty_factors: Vec<UncertaintyFactor>,

    /// Whether verification is needed before execution
    /// Set to true when confidence < 0.70 (configurable threshold)
    pub verification_needed: bool,
}

impl AgentResponse {
    /**
     * DESIGN DECISION: Builder pattern for agent responses
     * WHY: Simplifies construction with sensible defaults
     */
    pub fn new(content: String, confidence: f64) -> Self {
        Self {
            content,
            confidence,
            uncertainty_factors: Vec::new(),
            verification_needed: confidence < 0.70,
        }
    }

    /**
     * Add uncertainty factor explaining confidence score
     */
    pub fn add_factor(&mut self, factor: UncertaintyFactor) {
        self.uncertainty_factors.push(factor);
    }

    /**
     * Set custom verification threshold
     */
    pub fn set_verification_threshold(&mut self, threshold: f64) {
        self.verification_needed = self.confidence < threshold;
    }

    /**
     * Get human-readable confidence level
     */
    pub fn confidence_level(&self) -> &'static str {
        if self.confidence >= 0.90 {
            "Very High"
        } else if self.confidence >= 0.80 {
            "High"
        } else if self.confidence >= 0.60 {
            "Medium"
        } else if self.confidence >= 0.40 {
            "Low"
        } else {
            "Very Low"
        }
    }
}

/**
 * Factor contributing to uncertainty calculation
 *
 * DESIGN DECISION: Categorized factors with impact scores
 * WHY: Enables explainable confidence (not black box)
 *
 * CATEGORIES:
 * - SourceCertainty: Known fact vs inference vs guess
 * - Recency: Just read vs memory vs vague memory
 * - Specificity: Exact reference vs "around line 120" vs "somewhere"
 * - Verification: Can verify claim (file exists, test passes)
 * - DomainExpertise: Agent's primary domain vs secondary
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UncertaintyFactor {
    /// Category of uncertainty factor
    pub category: FactorCategory,

    /// Human-readable description
    pub description: String,

    /// Impact on confidence (-1.0 to +1.0)
    /// Positive = increases confidence, Negative = decreases confidence
    pub impact: f64,
}

/**
 * Categories of uncertainty factors
 *
 * DESIGN DECISION: Explicit categories for multi-factor scoring
 * WHY: Single heuristic insufficient, need combined signals
 */
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FactorCategory {
    /// Source certainty: Known fact (1.0) vs inference (0.6-0.8) vs guess (0.3-0.5)
    SourceCertainty,

    /// Recency: Recently read file (0.9+) vs memory (0.6-0.8) vs vague memory (0.3-0.5)
    Recency,

    /// Specificity: Exact line number (0.9+) vs "around line 120" (0.6) vs "somewhere in file" (0.3)
    Specificity,

    /// Verification: Can verify claim (boost +0.1-0.2)
    Verification,

    /// Domain expertise: Agent's primary domain (0.9+) vs secondary domain (0.6-0.8)
    DomainExpertise,

    /// Hedging language detected ("probably", "might", "I think")
    HedgingLanguage,

    /// Pattern reference (Pattern-XXX, SOP-YYY)
    PatternReference,
}

impl FactorCategory {
    /**
     * Get human-readable label
     */
    pub fn label(&self) -> &'static str {
        match self {
            FactorCategory::SourceCertainty => "Source Certainty",
            FactorCategory::Recency => "Recency",
            FactorCategory::Specificity => "Specificity",
            FactorCategory::Verification => "Verification",
            FactorCategory::DomainExpertise => "Domain Expertise",
            FactorCategory::HedgingLanguage => "Hedging Language",
            FactorCategory::PatternReference => "Pattern Reference",
        }
    }
}

/**
 * Calibration record for confidence scoring
 *
 * DESIGN DECISION: Track claimed confidence vs actual correctness
 * WHY: Enables learning (confidence calibration over time)
 *
 * REASONING CHAIN:
 * 1. Agent claims confidence X for response Y
 * 2. User/system validates correctness (true/false)
 * 3. Store: claimed confidence, actual correctness, timestamp
 * 4. Analyze: Are 90% confidence claims actually 90% correct?
 * 5. Adjust: If 90% claims only 70% correct, recalibrate scoring
 *
 * ## Calibration Example
 *
 * Agent claims 0.90 confidence on 100 responses:
 * - If 90/100 are correct → Well calibrated
 * - If 70/100 are correct → Overconfident (need to lower scores)
 * - If 95/100 are correct → Underconfident (can increase scores)
 *
 * **Brier Score:** Measures calibration accuracy
 * - Score = 1/N * Σ(claimed_confidence - actual_correct)²
 * - Lower is better (0.0 = perfect calibration)
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalibrationRecord {
    /// Unique ID for this calibration record
    pub id: String,

    /// Claimed confidence (0.0-1.0)
    pub claimed_confidence: f64,

    /// Actual correctness (true/false)
    pub actual_correct: bool,

    /// Response content (for debugging)
    pub response_content: String,

    /// Task description (what agent was asked to do)
    pub task_description: String,

    /// Agent that made the claim
    pub agent_name: String,

    /// Domain of task (rust, typescript, etc.)
    pub domain: Option<String>,

    /// Timestamp when claim was made
    pub timestamp: chrono::DateTime<chrono::Utc>,

    /// Factors that contributed to confidence score
    pub factors: HashMap<String, f64>,
}

impl CalibrationRecord {
    /**
     * Create new calibration record
     */
    pub fn new(
        claimed_confidence: f64,
        actual_correct: bool,
        response_content: String,
        task_description: String,
        agent_name: String,
        domain: Option<String>,
        factors: HashMap<String, f64>,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            claimed_confidence,
            actual_correct,
            response_content,
            task_description,
            agent_name,
            domain,
            timestamp: chrono::Utc::now(),
            factors,
        }
    }
}

/**
 * Calibration statistics
 *
 * DESIGN DECISION: Calculate calibration metrics (Brier score, error)
 * WHY: Quantify how well calibrated agent confidence scores are
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalibrationStatistics {
    /// Total number of calibration records
    pub total_records: usize,

    /// Number of correct predictions
    pub correct_predictions: usize,

    /// Overall accuracy (correct / total)
    pub accuracy: f64,

    /// Brier score (0.0 = perfect, 1.0 = worst)
    /// Measures calibration quality: (claimed_confidence - actual)²
    pub brier_score: f64,

    /// Mean claimed confidence
    pub mean_claimed_confidence: f64,

    /// Calibration error (difference between claimed and actual)
    pub calibration_error: f64,

    /// Records by confidence bin (0.0-0.1, 0.1-0.2, ..., 0.9-1.0)
    pub confidence_bins: HashMap<String, ConfidenceBin>,
}

/**
 * Statistics for confidence bin (e.g., 0.8-0.9 range)
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfidenceBin {
    /// Number of predictions in this bin
    pub count: usize,

    /// Number of correct predictions in this bin
    pub correct: usize,

    /// Actual accuracy in this bin
    pub accuracy: f64,

    /// Expected accuracy (midpoint of bin range)
    pub expected_accuracy: f64,

    /// Calibration error for this bin
    pub error: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_agent_response_creation() {
        let response = AgentResponse::new("Fix line 42".to_string(), 0.85);

        assert_eq!(response.content, "Fix line 42");
        assert_eq!(response.confidence, 0.85);
        assert!(!response.verification_needed); // 0.85 > 0.70
        assert_eq!(response.confidence_level(), "High");
    }

    #[test]
    fn test_agent_response_low_confidence() {
        let response = AgentResponse::new("Maybe fix line 42?".to_string(), 0.45);

        assert!(response.verification_needed); // 0.45 < 0.70
        assert_eq!(response.confidence_level(), "Low");
    }

    #[test]
    fn test_agent_response_add_factor() {
        let mut response = AgentResponse::new("Fix line 42".to_string(), 0.85);

        response.add_factor(UncertaintyFactor {
            category: FactorCategory::Specificity,
            description: "Exact line number".to_string(),
            impact: 0.2,
        });

        assert_eq!(response.uncertainty_factors.len(), 1);
        assert_eq!(
            response.uncertainty_factors[0].category,
            FactorCategory::Specificity
        );
    }

    #[test]
    fn test_calibration_record_creation() {
        let mut factors = HashMap::new();
        factors.insert("specificity".to_string(), 0.2);
        factors.insert("recency".to_string(), 0.15);

        let record = CalibrationRecord::new(
            0.85,
            true,
            "Fix line 42".to_string(),
            "Fix bug in pattern.rs".to_string(),
            "RustAgent".to_string(),
            Some("rust".to_string()),
            factors,
        );

        assert_eq!(record.claimed_confidence, 0.85);
        assert!(record.actual_correct);
        assert_eq!(record.agent_name, "RustAgent");
        assert!(record.id.len() > 0); // UUID generated
    }

    #[test]
    fn test_factor_category_labels() {
        assert_eq!(FactorCategory::SourceCertainty.label(), "Source Certainty");
        assert_eq!(FactorCategory::Recency.label(), "Recency");
        assert_eq!(FactorCategory::Specificity.label(), "Specificity");
    }
}
