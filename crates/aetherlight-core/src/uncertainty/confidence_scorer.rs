/**
 * Confidence Scorer - Multi-Factor Confidence Calculation (AI-008)
 *
 * DESIGN DECISION: Multi-factor confidence scoring with calibration
 * WHY: Single heuristic insufficient, need combined signals + learning
 *
 * REASONING CHAIN:
 * 1. Parse response text for confidence indicators
 * 2. Apply multiple scoring factors:
 *    - Source certainty: Known fact (1.0) vs inference (0.6-0.8) vs guess (0.3-0.5)
 *    - Recency: Recently read (0.9+) vs memory (0.6-0.8) vs vague (0.3-0.5)
 *    - Specificity: Exact reference (0.9+) vs "around line 120" (0.6) vs "somewhere" (0.3)
 *    - Verification: Can verify claim (boost +0.1-0.2)
 *    - Domain expertise: Primary domain (0.9+) vs secondary (0.6-0.8)
 * 3. Combine weighted scores
 * 4. Apply calibration adjustment (if available)
 * 5. Clamp to 0.0-1.0 range
 * 6. Return confidence score + factors
 *
 * ## Usage Example
 *
 * ```rust
 * use aetherlight_core::uncertainty::ConfidenceScorer;
 *
 * let scorer = ConfidenceScorer::new(Some("data/calibration.sqlite"))?;
 *
 * let response = "Modify line 42 in crates/aetherlight-core/src/pattern.rs";
 * let score = scorer.score(
 *     response,
 *     "rust-core-dev",  // Agent name
 *     Some("rust"),      // Domain
 *     true,              // Recently read file?
 * )?;
 *
 * println!("Confidence: {:.2}", score.confidence);
 * for factor in score.factors {
 *     println!("  {} ({:+.2}): {}", factor.category.label(), factor.impact, factor.description);
 * }
 * ```
 *
 * PATTERN: Pattern-UNCERTAINTY-002 (Confidence Calibration System)
 * PERFORMANCE: <10ms per score calculation
 * RELATED: Calibrator (provides adjustment factors), UncertaintyQuantifier
 */

use crate::{Error, Result};
use super::types::{AgentResponse, UncertaintyFactor, FactorCategory};
use super::calibrator::Calibrator;
use std::path::Path;

/**
 * Confidence scorer with multi-factor analysis
 *
 * DESIGN DECISION: Optional calibration support
 * WHY: Can work standalone (no calibration) or with calibration (improved accuracy)
 */
pub struct ConfidenceScorer {
    /// Optional calibrator for score adjustment
    calibrator: Option<Calibrator>,

    /// Low confidence phrases (hedging language)
    low_confidence_phrases: Vec<&'static str>,

    /// High confidence patterns (specific references)
    high_confidence_patterns: Vec<&'static str>,

    /// Domain-specific patterns
    domain_patterns: Vec<(&'static str, &'static str)>, // (domain, pattern)
}

impl ConfidenceScorer {
    /**
     * DESIGN DECISION: Create scorer with optional calibration
     * WHY: Calibration optional (requires historical data)
     */
    pub fn new<P: AsRef<Path>>(calibration_db_path: Option<P>) -> Result<Self> {
        let calibrator = if let Some(path) = calibration_db_path {
            Some(Calibrator::new(path)?)
        } else {
            None
        };

        Ok(Self {
            calibrator,
            low_confidence_phrases: vec![
                "probably", "might", "maybe", "i think", "i believe",
                "not sure", "unsure", "unclear", "possibly", "perhaps",
                "could be", "seems like", "appears to", "assuming",
                "if this is correct", "if i understand", "guessing",
                "around", "approximately", "roughly", "about",
            ],
            high_confidence_patterns: vec![
                "line:", "line ", "function ", "crates/", "src/",
                "pattern-", "sop-", "test passes", "benchmark:",
                ".rs:", ".ts:", ".md:", "commit:", "cargo check",
                "file exists", "function defined", "verified",
            ],
            domain_patterns: vec![
                ("rust", "impl "),
                ("rust", "fn "),
                ("rust", "pub mod"),
                ("rust", "use crate::"),
                ("typescript", "interface "),
                ("typescript", "export "),
                ("typescript", "async "),
                ("typescript", "import {"),
            ],
        })
    }

    /**
     * Score confidence of agent response
     *
     * DESIGN DECISION: Multi-factor scoring with explainability
     * WHY: Need to explain WHY confidence is high/low (not black box)
     *
     * PARAMETERS:
     * - response_text: Agent's response content
     * - agent_name: Name of agent (for calibration lookup)
     * - domain: Optional domain (rust, typescript, etc.)
     * - recently_read: Whether agent recently read relevant files
     * - can_verify: Whether claim can be verified (file exists, etc.)
     * - is_primary_domain: Whether domain is agent's primary expertise
     *
     * RETURNS:
     * - AgentResponse with confidence score and factors
     */
    pub fn score(
        &self,
        response_text: &str,
        agent_name: &str,
        domain: Option<&str>,
        recently_read: bool,
        can_verify: bool,
        is_primary_domain: bool,
    ) -> Result<AgentResponse> {
        let response_lower = response_text.to_lowercase();
        let mut factors = Vec::new();
        let mut score = 0.5; // Base score (neutral)

        // Factor 1: Hedging language (decreases confidence)
        let mut hedging_count = 0;
        for phrase in &self.low_confidence_phrases {
            if response_lower.contains(phrase) {
                hedging_count += 1;
            }
        }

        if hedging_count > 0 {
            let impact = -0.1 * hedging_count as f64;
            score += impact;
            factors.push(UncertaintyFactor {
                category: FactorCategory::HedgingLanguage,
                description: format!("Detected {} hedging phrases", hedging_count),
                impact,
            });
        }

        // Factor 2: Specific references (increases confidence)
        let mut specificity_count = 0;
        for pattern in &self.high_confidence_patterns {
            if response_lower.contains(pattern) {
                specificity_count += 1;
            }
        }

        if specificity_count > 0 {
            let impact = 0.2 * specificity_count.min(3) as f64; // Cap at 3 patterns
            score += impact;
            factors.push(UncertaintyFactor {
                category: FactorCategory::Specificity,
                description: format!("Detected {} specific references", specificity_count),
                impact,
            });
        }

        // Factor 3: Recency (agent recently read files)
        if recently_read {
            let impact = 0.2;
            score += impact;
            factors.push(UncertaintyFactor {
                category: FactorCategory::Recency,
                description: "Recently read relevant files".to_string(),
                impact,
            });
        }

        // Factor 4: Verification availability
        if can_verify {
            let impact = 0.15;
            score += impact;
            factors.push(UncertaintyFactor {
                category: FactorCategory::Verification,
                description: "Claim can be verified".to_string(),
                impact,
            });
        }

        // Factor 5: Domain expertise
        if is_primary_domain {
            let impact = 0.15;
            score += impact;
            factors.push(UncertaintyFactor {
                category: FactorCategory::DomainExpertise,
                description: "Agent's primary domain".to_string(),
                impact,
            });
        } else if domain.is_some() {
            // Secondary domain
            let impact = -0.05;
            score += impact;
            factors.push(UncertaintyFactor {
                category: FactorCategory::DomainExpertise,
                description: "Secondary domain (not primary expertise)".to_string(),
                impact,
            });
        }

        // Factor 6: Domain-specific patterns
        if let Some(domain_name) = domain {
            let domain_pattern_count = self
                .domain_patterns
                .iter()
                .filter(|(d, pattern)| *d == domain_name && response_lower.contains(pattern))
                .count();

            if domain_pattern_count > 0 {
                let impact = 0.1 * domain_pattern_count.min(2) as f64; // Cap at 2 patterns
                score += impact;
                factors.push(UncertaintyFactor {
                    category: FactorCategory::PatternReference,
                    description: format!("Detected {} {} patterns", domain_pattern_count, domain_name),
                    impact,
                });
            }
        }

        // Apply calibration adjustment (if available)
        if let Some(ref calibrator) = self.calibrator {
            match calibrator.get_adjustment_factor(Some(agent_name), domain) {
                Ok(adjustment) if adjustment != 1.0 => {
                    let adjusted_score = score * adjustment;
                    let impact = adjusted_score - score;
                    score = adjusted_score;

                    factors.push(UncertaintyFactor {
                        category: FactorCategory::SourceCertainty,
                        description: format!("Calibration adjustment (×{:.2})", adjustment),
                        impact,
                    });
                }
                _ => {} // No adjustment or error
            }
        }

        // Clamp score to 0.0-1.0
        score = score.max(0.0).min(1.0);

        // Create agent response
        let mut response = AgentResponse::new(response_text.to_string(), score);
        response.uncertainty_factors = factors;

        Ok(response)
    }

    /**
     * Score with default parameters (convenience method)
     */
    pub fn score_simple(&self, response_text: &str, agent_name: &str) -> Result<AgentResponse> {
        self.score(
            response_text,
            agent_name,
            None,   // No domain
            false,  // Not recently read
            false,  // Cannot verify
            false,  // Not primary domain
        )
    }

    /**
     * Get calibrator reference (for recording calibration data)
     */
    pub fn calibrator(&self) -> Option<&Calibrator> {
        self.calibrator.as_ref()
    }
}

impl Default for ConfidenceScorer {
    fn default() -> Self {
        Self::new(None::<&str>).expect("Failed to create default ConfidenceScorer")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_high_confidence_response() {
        let scorer = ConfidenceScorer::new(None::<&str>).unwrap();

        let response = "Modify line 42 in crates/aetherlight-core/src/pattern.rs. Pattern-001 applies. Tests pass.";
        let result = scorer
            .score(
                response,
                "rust-core-dev",
                Some("rust"),
                true,  // Recently read
                true,  // Can verify
                true,  // Primary domain
            )
            .unwrap();

        assert!(result.confidence > 0.85, "Expected high confidence, got {}", result.confidence);
        assert!(!result.verification_needed);
        assert_eq!(result.confidence_level(), "High");

        // Should have multiple positive factors
        let positive_factors = result
            .uncertainty_factors
            .iter()
            .filter(|f| f.impact > 0.0)
            .count();
        assert!(positive_factors >= 3);
    }

    #[test]
    fn test_low_confidence_response() {
        let scorer = ConfidenceScorer::new(None::<&str>).unwrap();

        let response = "I think you might need to modify some file, probably in the src directory. Not sure exactly.";
        let result = scorer
            .score(
                response,
                "rust-core-dev",
                None,
                false, // Not recently read
                false, // Cannot verify
                false, // Not primary domain
            )
            .unwrap();

        assert!(result.confidence < 0.50, "Expected low confidence, got {}", result.confidence);
        assert!(result.verification_needed);
        assert_eq!(result.confidence_level(), "Low");

        // Should have hedging language factor
        let has_hedging = result
            .uncertainty_factors
            .iter()
            .any(|f| matches!(f.category, FactorCategory::HedgingLanguage));
        assert!(has_hedging);
    }

    #[test]
    fn test_medium_confidence_response() {
        let scorer = ConfidenceScorer::new(None::<&str>).unwrap();

        let response = "Modify pattern.rs to fix this issue. The function is in src/pattern.rs.";
        let result = scorer
            .score(
                response,
                "rust-core-dev",
                Some("rust"),
                false, // Not recently read
                true,  // Can verify
                true,  // Primary domain
            )
            .unwrap();

        assert!(
            result.confidence >= 0.60 && result.confidence < 0.85,
            "Expected medium confidence, got {}",
            result.confidence
        );
        assert!(!result.verification_needed); // Medium confidence doesn't require verification
    }

    #[test]
    fn test_calibration_adjustment() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("calibration.sqlite");

        // Create calibrator and record overconfident claims
        let calibrator = Calibrator::new(&db_path).unwrap();
        let factors = std::collections::HashMap::new();

        for i in 0..20 {
            calibrator
                .record_calibration(
                    0.90,
                    i < 12, // 60% correct when claiming 90%
                    format!("Response {}", i),
                    "Test task".to_string(),
                    "test-agent".to_string(),
                    Some("test".to_string()),
                    factors.clone(),
                )
                .unwrap();
        }

        // Create scorer with calibration
        let scorer = ConfidenceScorer::new(Some(&db_path)).unwrap();

        let response = "Fix line 42 in test.rs";
        let result = scorer
            .score(
                response,
                "test-agent",
                Some("test"),
                true,
                true,
                true,
            )
            .unwrap();

        // Should have calibration adjustment factor
        let has_calibration = result
            .uncertainty_factors
            .iter()
            .any(|f| f.description.contains("Calibration adjustment"));
        assert!(has_calibration);
    }

    #[test]
    fn test_domain_patterns() {
        let scorer = ConfidenceScorer::new(None::<&str>).unwrap();

        let response = "Implement fn process_data() in impl DataProcessor for Database";
        let result = scorer
            .score(
                response,
                "rust-core-dev",
                Some("rust"),
                false,
                false,
                true,
            )
            .unwrap();

        // Should detect Rust-specific patterns (fn, impl)
        let has_rust_patterns = result
            .uncertainty_factors
            .iter()
            .any(|f| matches!(f.category, FactorCategory::PatternReference));
        assert!(has_rust_patterns);
    }

    #[test]
    fn test_score_simple_convenience() {
        let scorer = ConfidenceScorer::new(None::<&str>).unwrap();

        let response = "Fix the bug in line 42";
        let result = scorer.score_simple(response, "test-agent").unwrap();

        assert!(result.confidence >= 0.0 && result.confidence <= 1.0);
    }

    #[test]
    fn test_verification_threshold() {
        let scorer = ConfidenceScorer::new(None::<&str>).unwrap();

        let response = "Fix line 42";
        let mut result = scorer
            .score(
                response,
                "test-agent",
                None,
                false,
                false,
                false,
            )
            .unwrap();

        // Default threshold 0.70
        if result.confidence < 0.70 {
            assert!(result.verification_needed);
        } else {
            assert!(!result.verification_needed);
        }

        // Custom threshold
        result.set_verification_threshold(0.90);
        assert!(result.verification_needed); // Most responses need verification at 0.90 threshold
    }
}
