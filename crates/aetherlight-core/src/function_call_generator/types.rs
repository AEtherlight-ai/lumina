/**
 * Function Call Generation Types
 *
 * DESIGN DECISION: Separate types module for reusability
 * WHY: Parameter extraction logic used by generator, validator, and IPC layer
 *
 * PATTERN: Pattern-CALL-GEN-001 (Parameter Extraction Pipeline)
 */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/**
 * Function Call - Result of Natural Language Processing
 *
 * DESIGN DECISION: Include confidence and missing parameters for multi-turn
 * WHY: Low confidence triggers confirmation, missing params trigger clarification
 *
 * REASONING CHAIN:
 * 1. Confidence <0.7 → Ask "Did you mean function X?"
 * 2. Missing required params → Ask "What [param] would you like?"
 * 3. All params present + high confidence → Execute immediately
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionCall {
    /// Function ID from registry
    pub function_id: String,

    /// Extracted parameters (name → value)
    pub parameters: HashMap<String, ParameterValue>,

    /// Overall confidence (function match × parameter extraction)
    pub confidence: f32,

    /// Missing required parameters (for multi-turn conversation)
    pub missing_params: Vec<String>,

    /// Human-readable reasoning (for transparency)
    pub reasoning: String,
}

/**
 * Parameter Value - Typed Value with Confidence
 *
 * DESIGN DECISION: Store confidence per parameter (not just overall)
 * WHY: Low-confidence parameters can trigger clarification ("Did you mean X?")
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParameterValue {
    /// Actual value (JSON-serializable)
    pub value: serde_json::Value,

    /// Confidence in extraction (0.0-1.0)
    pub confidence: f32,

    /// Extraction method (for debugging)
    pub method: ExtractionMethod,
}

/**
 * Extraction Method - How Parameter Was Extracted
 *
 * DESIGN DECISION: Track extraction method for debugging and improvement
 * WHY: Understand which extraction strategies work best
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExtractionMethod {
    /// Exact keyword match (highest confidence)
    KeywordMatch,

    /// Named entity recognition (proper nouns, dates, etc.)
    NER,

    /// Temporal expression parsing ("last month" → date range)
    TemporalParsing,

    /// Number extraction (regex + validation)
    NumberExtraction,

    /// Enum value matching (case-insensitive)
    EnumMatch,

    /// Boolean inference ("yes" → true)
    BooleanInference,

    /// Default value used (no extraction)
    DefaultValue,
}

/**
 * Extraction Error Types
 */
#[derive(Debug, thiserror::Error)]
pub enum ExtractionError {
    #[error("Function not found in registry: {0}")]
    FunctionNotFound(String),

    #[error("Invalid parameter type: {0}")]
    InvalidParameterType(String),

    #[error("Missing required parameter: {0}")]
    MissingRequiredParameter(String),

    #[error("Parameter extraction failed: {0}")]
    ExtractionFailed(String),

    #[error("Registry error: {0}")]
    RegistryError(String),
}

impl FunctionCall {
    /**
     * Check if all required parameters are present
     */
    pub fn has_all_required_params(&self) -> bool {
        self.missing_params.is_empty()
    }

    /**
     * Check if confidence is high enough for auto-execution
     *
     * DESIGN DECISION: 0.75 threshold for auto-execution
     * WHY: Balance between user convenience and error prevention
     */
    pub fn is_high_confidence(&self) -> bool {
        self.confidence >= 0.75
    }

    /**
     * Get parameter value as specific type
     */
    pub fn get_param<T>(&self, name: &str) -> Option<T>
    where
        T: for<'de> Deserialize<'de>,
    {
        self.parameters
            .get(name)
            .and_then(|pv| serde_json::from_value(pv.value.clone()).ok())
    }
}
