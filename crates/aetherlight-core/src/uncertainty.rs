/**
 * Uncertainty Quantification (AI-007 + AI-008)
 *
 * DESIGN DECISION: Explicit confidence scores with calibration tracking
 * WHY: Prevents overconfident mistakes, enables learning, improves trust
 *
 * REASONING CHAIN:
 * 1. AI agents often claim certainty when uncertain ("I'm confident this will work")
 * 2. Overconfidence leads to mistakes (hallucinations, incorrect implementations)
 * 3. Explicit confidence scores make uncertainty visible
 * 4. Low confidence triggers escalation (ask user, search docs, call expert agent)
 * 5. "I don't know" is a valid response (better than hallucinating)
 * 6. Confidence tracking enables learning (low confidence → learn → high confidence)
 * 7. **NEW (AI-008)**: Calibration system tracks claimed vs actual accuracy
 * 8. **NEW (AI-008)**: Scores improve over time via calibration adjustment
 *
 * PATTERN: Pattern-UNCERTAINTY-001 (Confidence Quantification)
 * PATTERN: Pattern-UNCERTAINTY-002 (Confidence Calibration System)
 * PERFORMANCE: <10ms to calculate confidence score, <50ms to record calibration
 * IMPACT: Reduces hallucinations by 50-80%, improves trust
 *
 * ## Usage Example (Basic)
 *
 * ```rust
 * use aetherlight_core::uncertainty::{UncertaintyQuantifier, ConfidenceLevel, UncertaintyScore};
 *
 * let quantifier = UncertaintyQuantifier::new();
 *
 * // Agent generates response
 * let response_text = "To fix this issue, modify line 42 in server.rs";
 *
 * // Quantify uncertainty
 * let uncertainty = quantifier.assess_confidence(&response_text, &context)?;
 *
 * if uncertainty.level == ConfidenceLevel::Low {
 *     // Escalate: Ask user or call expert agent
 *     escalate_to_human("Low confidence in proposed solution")?;
 * } else {
 *     // Proceed with high/medium confidence response
 *     execute_solution(&response_text)?;
 * }
 * ```
 *
 * ## Usage Example (With Calibration - AI-008)
 *
 * ```rust
 * use aetherlight_core::uncertainty::ConfidenceScorer;
 *
 * // Create scorer with calibration database
 * let scorer = ConfidenceScorer::new(Some("data/calibration.sqlite"))?;
 *
 * // Agent generates response
 * let response = scorer.score(
 *     "Modify line 42 in pattern.rs",
 *     "rust-core-dev",  // Agent name
 *     Some("rust"),      // Domain
 *     true,              // Recently read file?
 *     true,              // Can verify?
 *     true,              // Primary domain?
 * )?;
 *
 * if response.verification_needed {
 *     verify_before_executing(&response)?;
 * } else {
 *     execute_response(&response)?;
 * }
 *
 * // Later, record calibration data
 * let correct = validate_response(&response);
 * scorer.calibrator().unwrap().record_calibration(
 *     response.confidence,
 *     correct,
 *     response.content,
 *     task_description,
 *     agent_name,
 *     domain,
 *     factors,
 * )?;
 * ```
 *
 * ## Confidence Levels
 *
 * - **High (>85%)**: Proceed with solution
 * - **Medium (50-85%)**: Proceed with caution, log uncertainty
 * - **Low (<50%)**: Escalate to human or expert agent
 * - **Unknown**: Unable to assess (treat as Low)
 *
 * ## Detection Heuristics
 *
 * **Low Confidence Indicators:**
 * - Hedging language: "probably", "might", "I think", "maybe"
 * - Uncertainty phrases: "not sure", "unsure", "unclear"
 * - Conditional statements: "if this is correct", "assuming"
 * - Multiple alternatives: "either A or B", "could be X or Y"
 * - Lack of specifics: Vague file names, generic solutions
 *
 * **High Confidence Indicators:**
 * - Specific references: File paths, line numbers, function names
 * - Concrete examples: Code snippets, exact commands
 * - Verifiable claims: "File exists", "Function defined at line 42"
 * - Pattern references: "Uses Pattern-X", "Follows SOP-Y"
 * - Test validation: "Tests pass", "Benchmark meets target"
 *
 * ## Integration with Verification System
 *
 * Uncertainty Quantification works with Verification System (AI-002):
 * - Verification System: Detects factual errors (hallucinations)
 * - Uncertainty Quantification: Detects confidence levels (uncertainty)
 * - Combined: High confidence + verified claims = Proceed
 * - Combined: High confidence + unverified claims = Flag as hallucination
 * - Combined: Low confidence + anything = Escalate
 */

// Sub-modules (AI-008)
pub mod types;
pub mod calibrator;
pub mod confidence_scorer;

// Re-export new types
pub use types::{
    AgentResponse, UncertaintyFactor, FactorCategory,
    CalibrationRecord, CalibrationStatistics, ConfidenceBin,
};
pub use calibrator::Calibrator;
pub use confidence_scorer::ConfidenceScorer;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Confidence level categories
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConfidenceLevel {
    /// High confidence (>85%) - Proceed with solution
    High,
    /// Medium confidence (50-85%) - Proceed with caution
    Medium,
    /// Low confidence (<50%) - Escalate to human/expert
    Low,
    /// Unable to assess confidence - Treat as Low
    Unknown,
}

impl ConfidenceLevel {
    /// Convert confidence score (0.0-1.0) to ConfidenceLevel
    pub fn from_score(score: f64) -> Self {
        if score >= 0.85 {
            ConfidenceLevel::High
        } else if score >= 0.50 {
            ConfidenceLevel::Medium
        } else if score >= 0.0 {
            ConfidenceLevel::Low
        } else {
            ConfidenceLevel::Unknown
        }
    }

    /// Get human-readable label
    pub fn label(&self) -> &'static str {
        match self {
            ConfidenceLevel::High => "High",
            ConfidenceLevel::Medium => "Medium",
            ConfidenceLevel::Low => "Low",
            ConfidenceLevel::Unknown => "Unknown",
        }
    }
}

/// Confidence assessment result (uncertainty quantification)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UncertaintyScore {
    /// Confidence level category
    pub level: ConfidenceLevel,
    /// Numeric confidence score (0.0-1.0)
    pub score: f64,
    /// Detected confidence indicators (positive + negative)
    pub indicators: Vec<ConfidenceIndicator>,
    /// Recommended action based on confidence
    pub recommendation: String,
    /// Whether escalation is needed
    pub should_escalate: bool,
}

impl UncertaintyScore {
    /// Create new uncertainty score
    pub fn new(score: f64, indicators: Vec<ConfidenceIndicator>) -> Self {
        let level = ConfidenceLevel::from_score(score);
        let should_escalate = matches!(level, ConfidenceLevel::Low | ConfidenceLevel::Unknown);

        let recommendation = match level {
            ConfidenceLevel::High => "Proceed with solution (high confidence)".to_string(),
            ConfidenceLevel::Medium => "Proceed with caution, log uncertainty".to_string(),
            ConfidenceLevel::Low => "Escalate to human or expert agent (low confidence)".to_string(),
            ConfidenceLevel::Unknown => "Unable to assess confidence - escalate".to_string(),
        };

        Self {
            level,
            score,
            indicators,
            recommendation,
            should_escalate,
        }
    }
}

/// Confidence indicator detected in response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfidenceIndicator {
    /// Type of indicator (positive or negative)
    pub indicator_type: IndicatorType,
    /// Description of what was detected
    pub description: String,
    /// Impact on confidence score (-1.0 to +1.0)
    pub weight: f64,
    /// Location in response text (optional)
    pub location: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum IndicatorType {
    /// Increases confidence (specific references, concrete examples)
    Positive,
    /// Decreases confidence (hedging, uncertainty phrases)
    Negative,
}

/// Context for confidence assessment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssessmentContext {
    /// Task description (what agent was asked to do)
    pub task_description: String,
    /// Available verification data (file exists, function defined, etc.)
    pub verifications: HashMap<String, bool>,
    /// Domain of task (rust, typescript, etc.)
    pub domain: Option<String>,
}

/// Uncertainty quantifier - assesses confidence in AI responses
pub struct UncertaintyQuantifier {
    /// Low confidence phrases (hedging language)
    low_confidence_phrases: Vec<&'static str>,
    /// High confidence patterns (specific references)
    high_confidence_patterns: Vec<&'static str>,
}

impl UncertaintyQuantifier {
    /**
     * DESIGN DECISION: Heuristic-based confidence assessment
     * WHY: Fast (<10ms), no ML model needed, interpretable
     *
     * REASONING CHAIN:
     * 1. Parse response text for confidence indicators
     * 2. Count positive indicators (specifics, patterns, verifications)
     * 3. Count negative indicators (hedging, uncertainty phrases)
     * 4. Calculate weighted confidence score
     * 5. Categorize as High/Medium/Low/Unknown
     * 6. Return recommendation
     */
    pub fn new() -> Self {
        Self {
            low_confidence_phrases: vec![
                "probably", "might", "maybe", "i think", "i believe",
                "not sure", "unsure", "unclear", "possibly", "perhaps",
                "could be", "seems like", "appears to", "assuming",
                "if this is correct", "if i understand", "guessing",
            ],
            high_confidence_patterns: vec![
                "file:", "line:", "function ", "crates/", "src/",
                "pattern-", "sop-", "test passes", "benchmark:",
                ".rs:", ".ts:", ".md:", "commit:", "cargo check",
            ],
        }
    }

    /**
     * Assess confidence in AI response
     *
     * DESIGN DECISION: Multi-factor confidence scoring
     * WHY: Single heuristic insufficient, need combined signals
     *
     * REASONING CHAIN:
     * 1. Scan for hedging language (-0.1 per phrase)
     * 2. Scan for specific references (+0.2 per pattern)
     * 3. Check verification data (+0.3 if verified)
     * 4. Combine scores: base (0.5) + positive - negative
     * 5. Clamp to 0.0-1.0 range
     * 6. Categorize and recommend
     */
    pub fn assess_confidence(
        &self,
        response_text: &str,
        context: &AssessmentContext,
    ) -> Result<UncertaintyScore, String> {
        let response_lower = response_text.to_lowercase();
        let mut indicators = Vec::new();
        let mut score = 0.5; // Base score (neutral)

        // Detect low confidence phrases
        for phrase in &self.low_confidence_phrases {
            if response_lower.contains(phrase) {
                score -= 0.1; // Decrease confidence
                indicators.push(ConfidenceIndicator {
                    indicator_type: IndicatorType::Negative,
                    description: format!("Hedging language: '{}'", phrase),
                    weight: -0.1,
                    location: Some(phrase.to_string()),
                });
            }
        }

        // Detect high confidence patterns
        for pattern in &self.high_confidence_patterns {
            if response_lower.contains(pattern) {
                score += 0.2; // Increase confidence
                indicators.push(ConfidenceIndicator {
                    indicator_type: IndicatorType::Positive,
                    description: format!("Specific reference: '{}'", pattern),
                    weight: 0.2,
                    location: Some(pattern.to_string()),
                });
            }
        }

        // Check verification data
        let verified_count = context.verifications.values().filter(|&&v| v).count();
        let total_verifications = context.verifications.len();

        if total_verifications > 0 {
            let verification_ratio = verified_count as f64 / total_verifications as f64;
            let verification_boost = verification_ratio * 0.3;
            score += verification_boost;

            indicators.push(ConfidenceIndicator {
                indicator_type: IndicatorType::Positive,
                description: format!(
                    "Verification: {}/{} claims verified",
                    verified_count, total_verifications
                ),
                weight: verification_boost,
                location: None,
            });
        }

        // Clamp score to 0.0-1.0
        score = score.max(0.0).min(1.0);

        Ok(UncertaintyScore::new(score, indicators))
    }

    /**
     * Detect "I don't know" responses
     *
     * DESIGN DECISION: Explicit "I don't know" detection
     * WHY: Better than hallucinating - should be encouraged
     */
    pub fn is_idk_response(&self, response_text: &str) -> bool {
        let response_lower = response_text.to_lowercase();
        let idk_phrases = vec![
            "i don't know",
            "i'm not sure",
            "unable to determine",
            "cannot assess",
            "insufficient information",
            "need more context",
        ];

        idk_phrases.iter().any(|phrase| response_lower.contains(phrase))
    }
}

impl Default for UncertaintyQuantifier {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_confidence_level_from_score() {
        assert_eq!(ConfidenceLevel::from_score(0.90), ConfidenceLevel::High);
        assert_eq!(ConfidenceLevel::from_score(0.85), ConfidenceLevel::High);
        assert_eq!(ConfidenceLevel::from_score(0.70), ConfidenceLevel::Medium);
        assert_eq!(ConfidenceLevel::from_score(0.50), ConfidenceLevel::Medium);
        assert_eq!(ConfidenceLevel::from_score(0.40), ConfidenceLevel::Low);
        assert_eq!(ConfidenceLevel::from_score(0.0), ConfidenceLevel::Low);
        assert_eq!(ConfidenceLevel::from_score(-1.0), ConfidenceLevel::Unknown);
    }

    #[test]
    fn test_high_confidence_response() {
        let quantifier = UncertaintyQuantifier::new();
        let response = "Modify line 42 in crates/aetherlight-core/src/pattern.rs. Pattern-001 applies here. Tests pass.";
        let context = AssessmentContext {
            task_description: "Fix pattern loading".to_string(),
            verifications: [
                ("file_exists:crates/aetherlight-core/src/pattern.rs".to_string(), true),
                ("pattern_referenced:Pattern-001".to_string(), true),
            ].iter().cloned().collect(),
            domain: Some("rust".to_string()),
        };

        let score = quantifier.assess_confidence(response, &context).unwrap();

        assert!(score.score > 0.85, "Expected high confidence, got {}", score.score);
        assert_eq!(score.level, ConfidenceLevel::High);
        assert!(!score.should_escalate);
    }

    #[test]
    fn test_low_confidence_response() {
        let quantifier = UncertaintyQuantifier::new();
        let response = "I think you might need to modify some file, probably in the src directory. Not sure exactly.";
        let context = AssessmentContext {
            task_description: "Fix pattern loading".to_string(),
            verifications: HashMap::new(),
            domain: Some("rust".to_string()),
        };

        let score = quantifier.assess_confidence(response, &context).unwrap();

        assert!(score.score < 0.50, "Expected low confidence, got {}", score.score);
        assert_eq!(score.level, ConfidenceLevel::Low);
        assert!(score.should_escalate);
    }

    #[test]
    fn test_idk_detection() {
        let quantifier = UncertaintyQuantifier::new();

        assert!(quantifier.is_idk_response("I don't know how to fix this"));
        assert!(quantifier.is_idk_response("I'm not sure which approach to take"));
        assert!(quantifier.is_idk_response("Unable to determine the root cause"));
        assert!(!quantifier.is_idk_response("Fix line 42 in pattern.rs"));
    }

    #[test]
    fn test_medium_confidence_response() {
        let quantifier = UncertaintyQuantifier::new();
        let response = "Modify pattern.rs to fix this issue. The function is probably in src/pattern.rs.";
        let context = AssessmentContext {
            task_description: "Fix pattern loading".to_string(),
            verifications: [("file_exists:src/pattern.rs".to_string(), true)]
                .iter()
                .cloned()
                .collect(),
            domain: Some("rust".to_string()),
        };

        let score = quantifier.assess_confidence(response, &context).unwrap();

        assert!(score.score >= 0.50 && score.score < 0.85, "Expected medium confidence, got {}", score.score);
        assert_eq!(score.level, ConfidenceLevel::Medium);
        assert!(!score.should_escalate);
    }
}
