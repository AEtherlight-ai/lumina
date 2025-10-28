/**
 * Integration Tests: Uncertainty Quantification + Verification System (AI-008)
 *
 * DESIGN DECISION: Integration tests demonstrating uncertainty + verification workflow
 * WHY: Show how confidence scoring and verification work together
 *
 * REASONING CHAIN:
 * 1. Agent generates response with confidence score
 * 2. Low confidence → Trigger verification before execution
 * 3. High confidence + unverified → Flag as potential hallucination
 * 4. High confidence + verified → Proceed with execution
 * 5. Record calibration data for learning
 *
 * PATTERN: Pattern-UNCERTAINTY-002 (Confidence Calibration System)
 * RELATED: AI-002 (Verification System), AI-008 (Uncertainty Quantification)
 */

#[cfg(test)]
mod integration_tests {
    use aetherlight_core::uncertainty::{ConfidenceScorer, Calibrator};
    use aetherlight_core::verification::{VerificationSystem, AgentClaim, VerificationConfig};
    use std::collections::HashMap;
    use std::path::PathBuf;
    use tempfile::tempdir;

    /**
     * SCENARIO 1: High confidence + verified claim → Proceed
     *
     * Agent claims "File exists at line 42" with high confidence.
     * Verification System confirms file exists.
     * Result: Proceed with execution, record successful calibration.
     */
    #[test]
    fn test_high_confidence_verified_claim() {
        let dir = tempdir().unwrap();
        let calibration_db = dir.path().join("calibration.sqlite");
        let project_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

        // Create scorer with calibration
        let scorer = ConfidenceScorer::new(Some(&calibration_db)).unwrap();

        // Agent generates response with file reference
        let response = scorer
            .score(
                "Modify line 42 in crates/aetherlight-core/src/lib.rs",
                "rust-core-dev",
                Some("rust"),
                true,  // Recently read
                true,  // Can verify
                true,  // Primary domain
            )
            .unwrap();

        // High confidence expected
        assert!(response.confidence > 0.85);
        assert!(!response.verification_needed);

        // Verify claim with Verification System
        let verifier = VerificationSystem::with_defaults(&project_root);
        let claim = AgentClaim::FileExists {
            path: project_root.join("crates/aetherlight-core/src/lib.rs"),
        };
        let verification = verifier.verify(&claim).unwrap();

        assert!(verification.verified);

        // Record calibration (high confidence + correct)
        let mut factors = HashMap::new();
        factors.insert("specificity".to_string(), 0.2);
        factors.insert("recency".to_string(), 0.2);

        let calibrator = scorer.calibrator().unwrap();
        calibrator
            .record_calibration(
                response.confidence,
                verification.verified, // Actual correctness
                response.content.clone(),
                "Modify file".to_string(),
                "rust-core-dev".to_string(),
                Some("rust".to_string()),
                factors,
            )
            .unwrap();

        // Verify calibration recorded
        let stats = calibrator.get_statistics(None, None).unwrap();
        assert_eq!(stats.total_records, 1);
        assert_eq!(stats.correct_predictions, 1);
        assert_eq!(stats.accuracy, 1.0);
    }

    /**
     * SCENARIO 2: Low confidence → Trigger verification
     *
     * Agent claims "Maybe fix line 42?" with low confidence.
     * System requires verification before execution.
     * Result: Escalate to human or verify first.
     */
    #[test]
    fn test_low_confidence_requires_verification() {
        let dir = tempdir().unwrap();
        let calibration_db = dir.path().join("calibration.sqlite");

        let scorer = ConfidenceScorer::new(Some(&calibration_db)).unwrap();

        // Agent generates uncertain response
        let response = scorer
            .score(
                "I think you might need to modify some file in src, probably around line 42. Not sure exactly.",
                "rust-core-dev",
                None,
                false, // Not recently read
                false, // Cannot verify
                false, // Not primary domain
            )
            .unwrap();

        // Low confidence expected
        assert!(response.confidence < 0.50);
        assert!(response.verification_needed);

        // System should NOT execute without verification
        println!("⚠️ Low confidence response - requires verification or escalation");
        println!("Confidence: {:.2}", response.confidence);
        println!("Recommendation: {}", response.confidence_level());
    }

    /**
     * SCENARIO 3: High confidence + unverified claim → Hallucination warning
     *
     * Agent claims high confidence but verification fails.
     * Result: Flag as potential hallucination, record poor calibration.
     */
    #[test]
    fn test_high_confidence_unverified_claim() {
        let dir = tempdir().unwrap();
        let calibration_db = dir.path().join("calibration.sqlite");
        let project_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

        let scorer = ConfidenceScorer::new(Some(&calibration_db)).unwrap();

        // Agent claims high confidence about non-existent file
        let response = scorer
            .score(
                "Modify line 42 in crates/aetherlight-core/src/nonexistent.rs. Pattern-001 applies. Tests pass.",
                "rust-core-dev",
                Some("rust"),
                true,  // Claims recently read
                true,  // Claims can verify
                true,  // Primary domain
            )
            .unwrap();

        // High confidence claimed
        assert!(response.confidence > 0.85);

        // Verify claim with Verification System
        let verifier = VerificationSystem::with_defaults(&project_root);
        let claim = AgentClaim::FileExists {
            path: project_root.join("crates/aetherlight-core/src/nonexistent.rs"),
        };
        let verification = verifier.verify(&claim).unwrap();

        assert!(!verification.verified); // File doesn't exist

        // This is a hallucination: High confidence + unverified
        println!("⚠️ HALLUCINATION DETECTED: High confidence but unverified claim");
        println!("Claimed confidence: {:.2}", response.confidence);
        println!("Verification result: {}", verification.verified);

        // Record calibration (high confidence + incorrect)
        let mut factors = HashMap::new();
        factors.insert("specificity".to_string(), 0.2);

        let calibrator = scorer.calibrator().unwrap();
        calibrator
            .record_calibration(
                response.confidence,
                verification.verified, // Actual correctness (false)
                response.content.clone(),
                "Modify file".to_string(),
                "rust-core-dev".to_string(),
                Some("rust".to_string()),
                factors,
            )
            .unwrap();

        // Verify calibration recorded with poor accuracy
        let stats = calibrator.get_statistics(Some("rust-core-dev"), Some("rust")).unwrap();
        assert_eq!(stats.total_records, 1);
        assert_eq!(stats.correct_predictions, 0);
        assert_eq!(stats.accuracy, 0.0);

        // Calibration error should be high (overconfident)
        assert!(stats.calibration_error > 0.8); // Claimed 0.85+, actual 0.0
    }

    /**
     * SCENARIO 4: Calibration improves scores over time
     *
     * Agent makes overconfident claims initially.
     * Calibration system adjusts scores downward.
     * Future scores more accurate.
     */
    #[test]
    fn test_calibration_improves_over_time() {
        let dir = tempdir().unwrap();
        let calibration_db = dir.path().join("calibration.sqlite");

        let scorer = ConfidenceScorer::new(Some(&calibration_db)).unwrap();
        let calibrator = scorer.calibrator().unwrap();

        let factors = HashMap::new();

        // Record 20 overconfident claims (claiming 90%, actually 60% correct)
        for i in 0..20 {
            calibrator
                .record_calibration(
                    0.90,
                    i < 12, // 60% correct
                    format!("Response {}", i),
                    "Test task".to_string(),
                    "test-agent".to_string(),
                    Some("test".to_string()),
                    factors.clone(),
                )
                .unwrap();
        }

        // Get calibration statistics
        let stats = calibrator.get_statistics(Some("test-agent"), Some("test")).unwrap();

        assert_eq!(stats.total_records, 20);
        assert_eq!(stats.correct_predictions, 12);
        assert_eq!(stats.accuracy, 0.6);
        assert!(stats.calibration_error > 0.2); // Overconfident

        // Get adjustment factor (should reduce scores)
        let adjustment = calibrator
            .get_adjustment_factor(Some("test-agent"), Some("test"))
            .unwrap();

        assert!(adjustment < 1.0); // Should reduce confidence
        println!("Calibration adjustment factor: {:.2}", adjustment);

        // Future scores will be adjusted
        // 90% claimed * 0.67 adjustment ≈ 60% (closer to actual accuracy)
        let adjusted_score = 0.90 * adjustment;
        assert!(adjusted_score >= 0.55 && adjusted_score <= 0.70);
    }

    /**
     * SCENARIO 5: Multi-factor confidence scoring
     *
     * Test all confidence factors working together.
     */
    #[test]
    fn test_multi_factor_confidence_scoring() {
        let dir = tempdir().unwrap();
        let calibration_db = dir.path().join("calibration.sqlite");

        let scorer = ConfidenceScorer::new(Some(&calibration_db)).unwrap();

        // Test response with multiple positive factors
        let response = scorer
            .score(
                "Implement fn process_data() in impl DataProcessor. Modify line 42 in crates/aetherlight-core/src/pattern.rs. Pattern-001 applies.",
                "rust-core-dev",
                Some("rust"),
                true,  // Recently read
                true,  // Can verify
                true,  // Primary domain
            )
            .unwrap();

        // Should have multiple factors
        let positive_factors = response
            .uncertainty_factors
            .iter()
            .filter(|f| f.impact > 0.0)
            .count();

        assert!(positive_factors >= 4, "Expected at least 4 positive factors");

        // Verify factor categories
        use aetherlight_core::uncertainty::FactorCategory;
        let has_specificity = response
            .uncertainty_factors
            .iter()
            .any(|f| matches!(f.category, FactorCategory::Specificity));
        let has_recency = response
            .uncertainty_factors
            .iter()
            .any(|f| matches!(f.category, FactorCategory::Recency));
        let has_domain = response
            .uncertainty_factors
            .iter()
            .any(|f| matches!(f.category, FactorCategory::DomainExpertise));

        assert!(has_specificity);
        assert!(has_recency);
        assert!(has_domain);

        println!("Multi-factor confidence: {:.2}", response.confidence);
        for factor in &response.uncertainty_factors {
            println!("  {} ({:+.2}): {}", factor.category.label(), factor.impact, factor.description);
        }
    }
}
