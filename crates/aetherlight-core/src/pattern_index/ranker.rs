/**
 * Context-Based Ranking (AI-005 Submodule)
 *
 * DESIGN DECISION: Boost relevance based on context (domain, recency, usage)
 * WHY: Semantic similarity alone isn't enough - context matters
 *
 * REASONING CHAIN:
 * 1. Two patterns both match "authentication" semantically (0.85 similarity)
 * 2. Pattern A: OAuth2 (used 50 times, last week, matches current domain)
 * 3. Pattern B: LDAP (used 2 times, 6 months ago, different domain)
 * 4. Context boost: Pattern A gets +0.10, Pattern B gets +0.02
 * 5. Final relevance: Pattern A = 0.95, Pattern B = 0.87
 * 6. Result: Context-aware ranking surfaces better pattern
 *
 * PATTERN: Pattern-INDEX-001 (Semantic Pattern Search)
 * PERFORMANCE: <1ms per pattern to calculate boost
 * RELATED: PatternIndex (uses this for final ranking)
 */

use super::{IndexedPattern, SearchContext};
use chrono::{Utc, Duration};

/// Context boost factors
#[derive(Debug, Clone)]
pub struct BoostFactors {
    /// Domain match boost (0.0 - 0.15)
    pub domain_boost: f64,

    /// Framework match boost (0.0 - 0.10)
    pub framework_boost: f64,

    /// Recency boost (0.0 - 0.10)
    pub recency_boost: f64,

    /// Usage frequency boost (0.0 - 0.10)
    pub usage_boost: f64,

    /// User preference boost (0.0 - 0.15)
    pub preference_boost: f64,

    /// Total boost (sum of above)
    pub total_boost: f64,
}

/**
 * DESIGN DECISION: Calculate total context boost from multiple factors
 * WHY: Multiple signals provide better ranking than single factor
 *
 * REASONING CHAIN:
 * 1. Domain match: Pattern is for Rust, user is writing Rust code → +0.15
 * 2. Framework match: Pattern is for Actix-web, user uses Actix-web → +0.10
 * 3. Recency: Pattern used last week → +0.08
 * 4. Usage frequency: Pattern used 50 times → +0.10
 * 5. User preference: User previously liked similar patterns → +0.12
 * 6. Total boost: 0.15 + 0.10 + 0.08 + 0.10 + 0.12 = 0.55
 * 7. But cap at 0.25 to avoid over-boosting (semantic similarity still primary)
 *
 * PERFORMANCE: <1ms per pattern
 */
pub fn calculate_context_boost(
    pattern: &IndexedPattern,
    context: &SearchContext,
) -> Option<f64> {
    let mut boost = BoostFactors {
        domain_boost: 0.0,
        framework_boost: 0.0,
        recency_boost: 0.0,
        usage_boost: 0.0,
        preference_boost: 0.0,
        total_boost: 0.0,
    };

    // Domain match boost (max 0.15)
    if let Some(ctx_domain) = &context.domain {
        if pattern.common_domains.contains(ctx_domain) {
            boost.domain_boost = 0.15;
        } else if pattern.common_domains.iter().any(|d| d.contains(ctx_domain)) {
            boost.domain_boost = 0.08; // Partial match
        }
    }

    // Framework match boost (max 0.10)
    if let Some(ctx_framework) = &context.framework {
        let pattern_tags = &pattern.pattern.tags();
        if pattern_tags.iter().any(|tag| tag.to_lowercase().contains(&ctx_framework.to_lowercase())) {
            boost.framework_boost = 0.10;
        }
    }

    // Recency boost (max 0.10)
    if let Some(last_used) = pattern.last_used {
        let days_ago = (Utc::now() - last_used).num_days();

        if days_ago <= 7 {
            boost.recency_boost = 0.10; // Used in last week
        } else if days_ago <= 30 {
            boost.recency_boost = 0.06; // Used in last month
        } else if days_ago <= 90 {
            boost.recency_boost = 0.03; // Used in last quarter
        }
        // Else: no boost (pattern is stale)
    }

    // Usage frequency boost (max 0.10)
    let usage_count = pattern.usage_count;

    if usage_count >= 50 {
        boost.usage_boost = 0.10; // Very popular
    } else if usage_count >= 20 {
        boost.usage_boost = 0.07; // Popular
    } else if usage_count >= 10 {
        boost.usage_boost = 0.04; // Moderately used
    }
    // Else: no boost (pattern rarely used)

    // User preference boost (max 0.15)
    let pattern_id_str = pattern.pattern.id().to_string();
    if let Some(pref_score) = context.user_preferences.get(&pattern_id_str) {
        boost.preference_boost = (*pref_score * 0.15).min(0.15);
    }

    // Calculate total boost (capped at 0.25)
    boost.total_boost = (boost.domain_boost
        + boost.framework_boost
        + boost.recency_boost
        + boost.usage_boost
        + boost.preference_boost)
        .min(0.25);

    if boost.total_boost > 0.0 {
        Some(boost.total_boost)
    } else {
        None
    }
}

/**
 * DESIGN DECISION: Decay boost over time
 * WHY: Old patterns should gradually lose relevance
 *
 * REASONING CHAIN:
 * 1. Pattern last used 6 months ago
 * 2. Still relevant, but less than recent patterns
 * 3. Apply exponential decay: boost *= e^(-λ * days)
 * 4. λ = 0.01 (decay constant)
 * 5. After 30 days: boost *= 0.74
 * 6. After 90 days: boost *= 0.41
 * 7. After 180 days: boost *= 0.16
 * 8. Result: Gradual decay, not sudden cutoff
 */
pub fn apply_temporal_decay(base_boost: f64, days_since_use: i64) -> f64 {
    if days_since_use <= 0 {
        return base_boost;
    }

    let decay_constant = 0.01;
    let decay_factor = (-decay_constant * days_since_use as f64).exp();

    base_boost * decay_factor
}

/**
 * DESIGN DECISION: Boost related patterns
 * WHY: Patterns often used together should surface together
 *
 * REASONING CHAIN:
 * 1. User recently used Pattern-OAUTH2-001
 * 2. Pattern-JWT-001 often used with OAuth2 patterns
 * 3. If user searches "authentication", boost JWT pattern
 * 4. Collaborative filtering: patterns A and B often co-occur
 * 5. Simple implementation: if recent pattern shares keywords, boost +0.05
 */
pub fn boost_related_patterns(
    pattern: &IndexedPattern,
    recent_patterns: &[String],
) -> f64 {
    // Check if any recent patterns share keywords with current pattern
    let pattern_keywords: Vec<String> = pattern.pattern.tags().iter().map(|k| k.to_lowercase()).collect();

    for recent_id in recent_patterns {
        // In production, would lookup recent pattern's keywords
        // For now, simple check: if pattern ID contains shared keywords
        for keyword in &pattern_keywords {
            if recent_id.to_lowercase().contains(keyword) {
                return 0.05; // Small boost for related patterns
            }
        }
    }

    0.0
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Pattern;
    use chrono::Utc;

    fn create_test_pattern() -> IndexedPattern {
        let pattern = Pattern::new(
            "OAuth2 PKCE Flow".to_string(),
            "Secure authentication".to_string(),
            vec!["oauth2".to_string(), "security".to_string()],
        );

        IndexedPattern {
            pattern,
            description_embedding: vec![],
            usage_count: 50,
            last_used: Some(Utc::now() - Duration::days(7)),
            avg_confidence: Some(0.89),
            common_domains: vec!["authentication".to_string()],
        }
    }

    fn create_test_context() -> SearchContext {
        SearchContext {
            domain: Some("authentication".to_string()),
            framework: Some("actix-web".to_string()),
            recent_patterns: vec!["Pattern-JWT-001".to_string()],
            user_preferences: Default::default(),
        }
    }

    #[test]
    fn test_calculate_context_boost() {
        let pattern = create_test_pattern();
        let context = create_test_context();

        let boost = calculate_context_boost(&pattern, &context);

        assert!(boost.is_some());
        let boost = boost.unwrap();

        // Should have positive boost
        assert!(boost > 0.0);

        // Should be capped at 0.25
        assert!(boost <= 0.25);
    }

    #[test]
    fn test_domain_boost() {
        let pattern = create_test_pattern();

        let context = SearchContext {
            domain: Some("authentication".to_string()),
            framework: None,
            recent_patterns: vec![],
            user_preferences: Default::default(),
        };

        let boost = calculate_context_boost(&pattern, &context);
        assert!(boost.is_some());

        // Domain match should give 0.15 boost
        let boost = boost.unwrap();
        assert!((boost - 0.15).abs() < 0.01);
    }

    #[test]
    fn test_recency_boost() {
        let mut pattern = create_test_pattern();

        // Used last week
        pattern.last_used = Some(Utc::now() - Duration::days(3));

        let context = create_test_context();
        let boost = calculate_context_boost(&pattern, &context);

        assert!(boost.is_some());
        let boost = boost.unwrap();

        // Should include recency boost (0.10 for last week)
        assert!(boost >= 0.10);
    }

    #[test]
    fn test_usage_frequency_boost() {
        let mut pattern = create_test_pattern();

        // Very popular pattern
        pattern.usage_count = 100;

        let context = create_test_context();
        let boost = calculate_context_boost(&pattern, &context);

        assert!(boost.is_some());
        let boost = boost.unwrap();

        // Should include usage boost (0.10 for 50+ uses)
        assert!(boost >= 0.10);
    }

    #[test]
    fn test_temporal_decay() {
        let base_boost = 0.10;

        // No decay for recent use
        let boost_0_days = apply_temporal_decay(base_boost, 0);
        assert_eq!(boost_0_days, base_boost);

        // Some decay after 30 days
        let boost_30_days = apply_temporal_decay(base_boost, 30);
        assert!(boost_30_days < base_boost);
        assert!(boost_30_days > 0.05);

        // More decay after 90 days
        let boost_90_days = apply_temporal_decay(base_boost, 90);
        assert!(boost_90_days < boost_30_days);

        // Significant decay after 180 days
        let boost_180_days = apply_temporal_decay(base_boost, 180);
        assert!(boost_180_days < boost_90_days);
        assert!(boost_180_days < 0.03);
    }

    #[test]
    fn test_boost_related_patterns() {
        let pattern = create_test_pattern();

        // Recent pattern with shared keyword
        let recent_patterns = vec!["Pattern-JWT-OAUTH2-001".to_string()];

        let boost = boost_related_patterns(&pattern, &recent_patterns);

        // Should have small boost for related pattern
        assert!((boost - 0.05).abs() < 0.01);
    }
}
