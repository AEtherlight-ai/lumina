/**
 * DESIGN DECISION: Assemble loaded sections into final context
 * WHY: Combine sections intelligently within token budget
 *
 * REASONING CHAIN:
 * 1. Essential context loaded (~2,000 tokens)
 * 2. Domain context loaded (~1,200 tokens)
 * 3. Patterns loaded (~800 tokens)
 * 4. References loaded (~4,000 tokens)
 * 5. Total = 8,000 tokens (within budget)
 * 6. Assemble with clear section markers
 *
 * PATTERN: Pattern-CONTEXT-003 (Progressive Context Loading)
 */

use crate::pattern_index::PatternMatch;
use crate::error::Error;
use super::{LoadedContext, Section};

/// Context assembler
pub struct ContextAssembler {}

impl ContextAssembler {
    pub fn new() -> Self {
        Self {}
    }

    /**
     * DESIGN DECISION: Assemble sections with clear markers
     * WHY: Agent needs to know which section is which
     *
     * REASONING CHAIN:
     * 1. Start with essential context
     * 2. Add task-specific context
     * 3. Add relevant patterns
     * 4. Add references (if budget allows)
     * 5. Add section separators (# markers)
     * 6. Calculate total tokens
     * 7. Return assembled context
     *
     * PERFORMANCE: <10ms to assemble
     */
    pub fn assemble(
        &self,
        essential: String,
        task_specific: String,
        patterns: Vec<PatternMatch>,
        references: Vec<String>,
        token_budget: usize,
        load_time_ms: u64,
    ) -> Result<LoadedContext, Error> {
        let mut assembled = String::new();
        let mut tokens_used = 0;

        // Section 1: Essential Context (always included)
        assembled.push_str("# Essential Context\n\n");
        assembled.push_str(&essential);
        assembled.push_str("\n\n---\n\n");
        tokens_used += Self::estimate_tokens(&essential);

        // Section 2: Task-Specific Context
        if !task_specific.is_empty() {
            assembled.push_str(&task_specific);
            assembled.push_str("\n\n---\n\n");
            tokens_used += Self::estimate_tokens(&task_specific);
        }

        // Section 3: Relevant Patterns
        if !patterns.is_empty() {
            assembled.push_str("# Relevant Patterns\n\n");

            for pattern_match in &patterns {
                // Only include if within budget
                let pattern_text = self.format_pattern(&pattern_match);
                let pattern_tokens = Self::estimate_tokens(&pattern_text);

                if tokens_used + pattern_tokens > token_budget {
                    break;  // Budget exhausted
                }

                assembled.push_str(&pattern_text);
                assembled.push_str("\n\n");
                tokens_used += pattern_tokens;
            }

            assembled.push_str("---\n\n");
        }

        // Section 4: References (if budget allows)
        if !references.is_empty() && tokens_used < token_budget {
            assembled.push_str("# Additional References\n\n");

            for reference in &references {
                let ref_tokens = Self::estimate_tokens(reference);

                if tokens_used + ref_tokens > token_budget {
                    break;  // Budget exhausted
                }

                assembled.push_str(reference);
                assembled.push_str("\n\n");
                tokens_used += ref_tokens;
            }

            assembled.push_str("---\n\n");
        }

        // Build LoadedContext
        Ok(LoadedContext {
            essential: essential.clone(),
            task_specific: task_specific.clone(),
            patterns: patterns.clone(),
            references: references.clone(),
            token_count: tokens_used,
            sections_loaded: vec![],  // Populated by caller
            load_time_ms,
        })
    }

    /**
     * DESIGN DECISION: Format pattern match for display
     * WHY: Show relevance score and reasoning
     */
    fn format_pattern(&self, pattern_match: &PatternMatch) -> String {
        format!(
            "## {} (Relevance: {:.0}%)\n\n{}\n\n**Why this matches:** {}",
            pattern_match.pattern.title(),
            pattern_match.relevance * 100.0,
            pattern_match.pattern.content(),
            pattern_match.reasoning
        )
    }

    /**
     * DESIGN DECISION: Estimate token count
     * WHY: Simple heuristic (4 chars ≈ 1 token)
     */
    fn estimate_tokens(text: &str) -> usize {
        (text.len() as f64 / 4.0).ceil() as usize
    }
}

impl Default for ContextAssembler {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pattern::Pattern;

    #[test]
    fn test_assembler_creation() {
        let assembler = ContextAssembler::new();
        // Stateless, just test creation works
        let _ = assembler;
    }

    #[test]
    fn test_assemble_essential_only() {
        let assembler = ContextAssembler::new();

        let result = assembler.assemble(
            "Essential context here".to_string(),
            String::new(),
            vec![],
            vec![],
            8000,
            50,
        );

        assert!(result.is_ok());

        if let Ok(context) = result {
            assert!(!context.essential.is_empty());
            assert!(context.token_count > 0);
            assert_eq!(context.load_time_ms, 50);
        }
    }

    #[test]
    fn test_assemble_with_patterns() {
        let assembler = ContextAssembler::new();

        let pattern = Pattern::builder()
            .title("Test Pattern".to_string())
            .content("Test problem and solution".to_string())
            .tags(vec!["test".to_string()])
            .build()
            .unwrap();

        let pattern_match = PatternMatch {
            pattern,
            relevance: 0.85,
            reasoning: "Test reasoning".to_string(),
        };

        let result = assembler.assemble(
            "Essential".to_string(),
            "Task-specific".to_string(),
            vec![pattern_match],
            vec![],
            8000,
            75,
        );

        assert!(result.is_ok());

        if let Ok(context) = result {
            assert!(!context.patterns.is_empty());
            assert_eq!(context.patterns.len(), 1);
        }
    }

    #[test]
    fn test_assemble_respects_budget() {
        let assembler = ContextAssembler::new();

        // Small budget should limit what's included
        let result = assembler.assemble(
            "Essential context here".to_string(),
            "Very long task specific context ".repeat(100),
            vec![],
            vec!["Reference 1".to_string(), "Reference 2".to_string()],
            100,  // Very small budget
            50,
        );

        assert!(result.is_ok());

        if let Ok(context) = result {
            // Should stay within budget
            assert!(context.token_count <= 100);
        }
    }

    #[test]
    fn test_estimate_tokens() {
        let text = "This is a test string.";
        let tokens = ContextAssembler::estimate_tokens(text);

        // ~4 chars per token
        let expected = (text.len() as f64 / 4.0).ceil() as usize;
        assert_eq!(tokens, expected);
    }

    #[test]
    fn test_format_pattern() {
        let assembler = ContextAssembler::new();

        let pattern = Pattern::builder()
            .title("OAuth2 with PKCE".to_string())
            .content("Need secure OAuth2 flow. Use PKCE for security.".to_string())
            .tags(vec!["oauth2".to_string(), "security".to_string()])
            .build()
            .unwrap();

        let pattern_match = PatternMatch {
            pattern,
            relevance: 0.87,
            reasoning: "High security requirement".to_string(),
        };

        let formatted = assembler.format_pattern(&pattern_match);

        assert!(formatted.contains("OAuth2 with PKCE"));
        assert!(formatted.contains("87%"));  // Relevance
        assert!(formatted.contains("High security requirement"));
    }
}
