/**
 * Function Registry Types - Core Data Structures
 *
 * DESIGN DECISION: Semantic function matching via embeddings
 * WHY: Natural language queries need fuzzy matching (not exact string match)
 *
 * REASONING CHAIN:
 * 1. Host applications register functions dynamically
 * 2. Users invoke functions with natural language ("Find John Doe's cases")
 * 3. Semantic embeddings enable fuzzy matching (handles variations)
 * 4. Confidence scores guide parameter extraction
 * 5. Result: Natural voice control for ANY application
 *
 * PATTERN: Pattern-REGISTRY-001 (Dynamic Function Registration)
 * RELATED: P3.7-001, Phase 3.7 Application Integration
 * PERFORMANCE: <20ms to match function, <100k functions supported
 */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Registered function available for voice invocation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisteredFunction {
    /// Unique identifier (app_name.function_name)
    pub id: String,

    /// Function name (e.g., "searchCases", "getSegment")
    pub name: String,

    /// Human-readable description for semantic matching
    pub description: String,

    /// Function parameters with type information
    pub parameters: Vec<FunctionParameter>,

    /// Example natural language queries
    /// e.g., ["Find John Doe's cases", "Show Jane Smith's open matters"]
    pub examples: Vec<String>,

    /// Tags for categorization (e.g., ["legal", "case-management"])
    pub tags: Vec<String>,

    /// Optional namespace for duplicate function names
    pub namespace: Option<String>,
}

/// Function parameter metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionParameter {
    /// Parameter name
    pub name: String,

    /// Parameter type (string, number, date, date_range, enum, boolean)
    pub param_type: String,

    /// Whether this parameter is required
    pub required: bool,

    /// Human-readable description for extraction
    pub description: String,

    /// Example values for this parameter
    pub examples: Vec<String>,

    /// For enum types: allowed values
    pub allowed_values: Option<Vec<String>>,
}

/// Function match result from semantic search
#[derive(Debug, Clone)]
pub struct FunctionMatch {
    /// Matched function
    pub function: RegisteredFunction,

    /// Confidence score 0.0-1.0
    pub confidence: f32,

    /// Reasoning for match (for explainability)
    pub reasoning: String,
}

/// Error types for function registry
#[derive(Debug, thiserror::Error)]
pub enum RegistryError {
    #[error("Function '{0}' already registered")]
    DuplicateFunction(String),

    #[error("Function '{0}' not found")]
    FunctionNotFound(String),

    #[error("Invalid function parameter: {0}")]
    InvalidParameter(String),

    #[error("Embedding generation failed: {0}")]
    EmbeddingError(String),

    #[error("Vector store error: {0}")]
    VectorStoreError(String),
}

impl RegisteredFunction {
    /// Create a unique identifier for this function
    pub fn full_id(&self) -> String {
        if let Some(ref ns) = self.namespace {
            format!("{}.{}.{}", ns, self.name, self.id)
        } else {
            self.id.clone()
        }
    }

    /// Get all text for semantic indexing
    pub fn indexing_text(&self) -> String {
        let param_desc = self
            .parameters
            .iter()
            .map(|p| &p.description)
            .cloned()
            .collect::<Vec<_>>()
            .join(" ");

        format!(
            "{} {} {} {}",
            self.description,
            self.examples.join(" "),
            param_desc,
            self.tags.join(" ")
        )
    }

    /// Get required parameters
    pub fn required_params(&self) -> Vec<&FunctionParameter> {
        self.parameters.iter().filter(|p| p.required).collect()
    }

    /// Get optional parameters
    pub fn optional_params(&self) -> Vec<&FunctionParameter> {
        self.parameters.iter().filter(|p| !p.required).collect()
    }
}

impl FunctionParameter {
    /// Check if value matches enum constraints
    pub fn is_valid_enum_value(&self, value: &str) -> bool {
        if let Some(ref allowed) = self.allowed_values {
            allowed.iter().any(|v| v.eq_ignore_ascii_case(value))
        } else {
            true // No enum constraint
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_indexing_text() {
        let func = RegisteredFunction {
            id: "legal.searchCases".to_string(),
            name: "searchCases".to_string(),
            description: "Search for cases by client name and status".to_string(),
            parameters: vec![FunctionParameter {
                name: "clientName".to_string(),
                param_type: "string".to_string(),
                required: true,
                description: "Client's full name".to_string(),
                examples: vec!["John Doe".to_string()],
                allowed_values: None,
            }],
            examples: vec!["Find John Doe's cases".to_string()],
            tags: vec!["legal".to_string(), "search".to_string()],
            namespace: Some("legal".to_string()),
        };

        let text = func.indexing_text();
        assert!(text.contains("Search for cases"));
        assert!(text.contains("Client's full name"));
        assert!(text.contains("legal"));
    }

    #[test]
    fn test_required_params() {
        let func = RegisteredFunction {
            id: "test".to_string(),
            name: "test".to_string(),
            description: "test".to_string(),
            parameters: vec![
                FunctionParameter {
                    name: "required".to_string(),
                    param_type: "string".to_string(),
                    required: true,
                    description: "Required param".to_string(),
                    examples: vec![],
                    allowed_values: None,
                },
                FunctionParameter {
                    name: "optional".to_string(),
                    param_type: "string".to_string(),
                    required: false,
                    description: "Optional param".to_string(),
                    examples: vec![],
                    allowed_values: None,
                },
            ],
            examples: vec![],
            tags: vec![],
            namespace: None,
        };

        assert_eq!(func.required_params().len(), 1);
        assert_eq!(func.optional_params().len(), 1);
    }

    #[test]
    fn test_enum_validation() {
        let param = FunctionParameter {
            name: "status".to_string(),
            param_type: "enum".to_string(),
            required: true,
            description: "Case status".to_string(),
            examples: vec![],
            allowed_values: Some(vec![
                "open".to_string(),
                "closed".to_string(),
                "all".to_string(),
            ]),
        };

        assert!(param.is_valid_enum_value("open"));
        assert!(param.is_valid_enum_value("OPEN")); // Case-insensitive
        assert!(!param.is_valid_enum_value("invalid"));
    }
}
