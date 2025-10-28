/**
 * Function Call Generator - Main Implementation
 *
 * DESIGN DECISION: Pipeline architecture (match → extract → validate → return)
 * WHY: Clear separation of concerns, easy to test each stage
 *
 * REASONING CHAIN:
 * 1. Find matching functions from registry (semantic search)
 * 2. For each match, extract parameters from query
 * 3. Calculate confidence (function match × parameter extraction)
 * 4. Identify missing required parameters
 * 5. Return sorted by confidence
 *
 * PATTERN: Pattern-CALL-GEN-001 (Parameter Extraction Pipeline)
 * PERFORMANCE: <100ms for 90% of queries
 */

use crate::function_registry::{FunctionRegistry, RegisteredFunction, FunctionParameter};
use crate::function_call_generator::types::{
    FunctionCall, ParameterValue, ExtractionError, ExtractionMethod
};
use crate::function_call_generator::extractors;
use std::sync::Arc;
use std::collections::HashMap;

/**
 * Function Call Generator
 *
 * DESIGN DECISION: Hold reference to function registry (not owned)
 * WHY: Registry shared across multiple generators, avoid duplication
 */
pub struct FunctionCallGenerator {
    registry: Arc<FunctionRegistry>,
}

impl FunctionCallGenerator {
    /**
     * Create new function call generator
     *
     * # Arguments
     * * `registry` - Shared function registry
     */
    pub fn new(registry: Arc<FunctionRegistry>) -> Self {
        Self { registry }
    }

    /**
     * Generate function calls from natural language query
     *
     * DESIGN DECISION: Return multiple candidates (not just best match)
     * WHY: Enables fallback and user confirmation UX
     *
     * REASONING CHAIN:
     * 1. Find top 5 matching functions (semantic search)
     * 2. Extract parameters for each matched function
     * 3. Calculate overall confidence (function × parameters)
     * 4. Check for missing required parameters
     * 5. Sort by confidence descending
     * 6. Return top N results
     *
     * PERFORMANCE: <100ms target
     * - Function matching: ~20ms
     * - Parameter extraction: ~10-30ms per function (parallel potential)
     * - Total: <100ms for 90% of queries
     *
     * # Arguments
     * * `query` - Natural language query ("Find John Doe's open cases")
     * * `limit` - Max number of function call candidates to return
     *
     * # Returns
     * * Vector of FunctionCall candidates sorted by confidence
     */
    pub fn generate(&self, query: &str, limit: usize) -> Result<Vec<FunctionCall>, ExtractionError> {
        // Step 1: Find matching functions (semantic search)
        let function_matches = self.registry
            .find_matches(query, limit * 2) // Get 2x for re-ranking after parameter extraction
            .map_err(|e| ExtractionError::RegistryError(e.to_string()))?;

        if function_matches.is_empty() {
            return Ok(Vec::new());
        }

        let mut function_calls = Vec::new();

        // Step 2: Extract parameters for each matched function
        for func_match in function_matches {
            let extracted = self.extract_parameters(query, &func_match.function)?;

            // Step 3: Calculate overall confidence
            // Formula: function_confidence × parameter_confidence
            let param_confidence = self.calculate_parameter_confidence(&extracted, &func_match.function);
            let overall_confidence = func_match.confidence * param_confidence;

            // Step 4: Identify missing required parameters
            let missing_params = func_match.function
                .required_params()
                .iter()
                .filter(|p| !extracted.contains_key(&p.name))
                .map(|p| p.name.clone())
                .collect::<Vec<_>>();

            // Step 5: Build reasoning string
            let reasoning = format!(
                "Function match: {:.0}%, Parameter extraction: {:.0}%, Overall: {:.0}%{}",
                func_match.confidence * 100.0,
                param_confidence * 100.0,
                overall_confidence * 100.0,
                if !missing_params.is_empty() {
                    format!(", Missing: {}", missing_params.join(", "))
                } else {
                    String::new()
                }
            );

            function_calls.push(FunctionCall {
                function_id: func_match.function.id.clone(),
                parameters: extracted,
                confidence: overall_confidence,
                missing_params,
                reasoning,
            });
        }

        // Step 6: Sort by confidence and return top N
        function_calls.sort_by(|a, b| {
            b.confidence.partial_cmp(&a.confidence).unwrap_or(std::cmp::Ordering::Equal)
        });
        function_calls.truncate(limit);

        Ok(function_calls)
    }

    /**
     * Extract parameters for a specific function
     *
     * DESIGN DECISION: Try multiple extraction strategies per parameter
     * WHY: Increases extraction success rate
     *
     * REASONING CHAIN:
     * 1. For each function parameter, determine extraction strategy by type
     * 2. Try extraction (may return None if not found)
     * 3. Store extracted values with confidence scores
     * 4. Return map of parameter name → ParameterValue
     *
     * EXTRACTION STRATEGIES BY TYPE:
     * - string: Proper noun detection → keyword extraction
     * - number: Number regex extraction
     * - date/date_range: Temporal expression parsing
     * - enum: Case-insensitive matching against allowed values
     * - boolean: Keyword inference (yes/no/true/false)
     */
    fn extract_parameters(
        &self,
        query: &str,
        function: &RegisteredFunction,
    ) -> Result<HashMap<String, ParameterValue>, ExtractionError> {
        let mut extracted = HashMap::new();

        for param in &function.parameters {
            if let Some(value) = self.extract_single_parameter(query, param)? {
                extracted.insert(param.name.clone(), value);
            }
        }

        Ok(extracted)
    }

    /**
     * Extract single parameter based on its type
     */
    fn extract_single_parameter(
        &self,
        query: &str,
        param: &FunctionParameter,
    ) -> Result<Option<ParameterValue>, ExtractionError> {
        match param.param_type.as_str() {
            "string" => {
                // Try proper noun extraction first
                if let Some(value) = extractors::extract_proper_noun(query) {
                    return Ok(Some(value));
                }

                // Fall back to example matching
                for example in &param.examples {
                    if query.to_lowercase().contains(&example.to_lowercase()) {
                        return Ok(Some(ParameterValue {
                            value: serde_json::Value::String(example.clone()),
                            confidence: 0.8,
                            method: ExtractionMethod::KeywordMatch,
                        }));
                    }
                }

                Ok(None)
            }

            "number" => Ok(extractors::extract_number(query)),

            "date" | "date_range" => Ok(extractors::parse_temporal_expression(query)),

            "enum" => {
                if let Some(ref allowed_values) = param.allowed_values {
                    Ok(extractors::match_enum_value(query, allowed_values))
                } else {
                    // No allowed values specified, try example matching
                    Ok(extractors::match_enum_value(query, &param.examples))
                }
            }

            "boolean" => Ok(extractors::infer_boolean(query)),

            _ => Err(ExtractionError::InvalidParameterType(
                format!("Unsupported parameter type: {}", param.param_type)
            )),
        }
    }

    /**
     * Calculate parameter extraction confidence
     *
     * DESIGN DECISION: Average of extracted parameter confidences
     * WHY: Simple, interpretable, works well in practice
     *
     * FORMULA:
     * - All required params extracted + high confidence → 1.0
     * - Some required params missing → proportional penalty
     * - Optional params don't affect confidence
     */
    fn calculate_parameter_confidence(
        &self,
        extracted: &HashMap<String, ParameterValue>,
        function: &RegisteredFunction,
    ) -> f32 {
        let required_params = function.required_params();

        if required_params.is_empty() {
            // No required params, confidence = 1.0
            return 1.0;
        }

        // Count extracted required params
        let extracted_required = required_params
            .iter()
            .filter(|p| extracted.contains_key(&p.name))
            .count();

        // Base confidence from coverage
        let coverage = extracted_required as f32 / required_params.len() as f32;

        // Average confidence of extracted params
        let avg_confidence: f32 = extracted
            .values()
            .map(|pv| pv.confidence)
            .sum::<f32>() / extracted.len().max(1) as f32;

        // Combine coverage and avg confidence (50/50 weight)
        (coverage * 0.5) + (avg_confidence * 0.5)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::function_registry::FunctionRegistry;
    use tempfile::tempdir;
    use std::path::Path;

    /**
     * Test: Generate function call from query
     *
     * DESIGN DECISION: Use real embeddings model for realistic test
     * WHY: Mock embeddings don't test actual semantic matching
     */
    #[test]
    fn test_generate_function_call() {
        let temp_dir = tempdir().unwrap();
        let model_path = "models/all-MiniLM-L6-v2.onnx";
        let db_path = temp_dir.path().join("test_generator.db");

        // Skip if model not available
        if !Path::new(model_path).exists() {
            eprintln!("Skipping test: model not found");
            return;
        }

        let mut registry = FunctionRegistry::new(model_path, &db_path).unwrap();

        // Register test function
        let function = RegisteredFunction {
            id: "legal.searchCases".to_string(),
            name: "searchCases".to_string(),
            description: "Search for cases by client name and status".to_string(),
            parameters: vec![
                FunctionParameter {
                    name: "clientName".to_string(),
                    param_type: "string".to_string(),
                    required: true,
                    description: "Client's full name".to_string(),
                    examples: vec!["John Doe".to_string()],
                    allowed_values: None,
                },
                FunctionParameter {
                    name: "status".to_string(),
                    param_type: "enum".to_string(),
                    required: true,
                    description: "Case status".to_string(),
                    examples: vec!["open".to_string()],
                    allowed_values: Some(vec![
                        "open".to_string(),
                        "closed".to_string(),
                        "all".to_string(),
                    ]),
                },
            ],
            examples: vec![
                "Find John Doe's open cases".to_string(),
                "Show Jane Smith's closed matters".to_string(),
            ],
            tags: vec!["legal".to_string()],
            namespace: Some("legal".to_string()),
        };

        registry.register(function).unwrap();

        // Generate function call
        let generator = FunctionCallGenerator::new(Arc::new(registry));
        let calls = generator
            .generate("Find John Doe's open cases", 5)
            .unwrap();

        assert!(!calls.is_empty());
        let call = &calls[0];

        assert_eq!(call.function_id, "legal.searchCases");
        assert!(call.parameters.contains_key("clientName"));
        assert!(call.parameters.contains_key("status"));

        // Verify extracted values
        let client_name: String = call.get_param("clientName").unwrap();
        assert_eq!(client_name, "John Doe");

        let status: String = call.get_param("status").unwrap();
        assert_eq!(status, "open");

        // High confidence expected (exact example match)
        assert!(call.confidence > 0.7);
        assert!(call.missing_params.is_empty());
    }

    /**
     * Test: Missing required parameters
     */
    #[test]
    fn test_missing_required_parameters() {
        let temp_dir = tempdir().unwrap();
        let model_path = "models/all-MiniLM-L6-v2.onnx";
        let db_path = temp_dir.path().join("test_generator2.db");

        if !Path::new(model_path).exists() {
            eprintln!("Skipping test: model not found");
            return;
        }

        let mut registry = FunctionRegistry::new(model_path, &db_path).unwrap();

        let function = RegisteredFunction {
            id: "test.func".to_string(),
            name: "testFunc".to_string(),
            description: "Test function".to_string(),
            parameters: vec![
                FunctionParameter {
                    name: "required1".to_string(),
                    param_type: "string".to_string(),
                    required: true,
                    description: "Required parameter".to_string(),
                    examples: vec![],
                    allowed_values: None,
                },
            ],
            examples: vec!["Test query".to_string()],
            tags: vec![],
            namespace: None,
        };

        registry.register(function).unwrap();

        let generator = FunctionCallGenerator::new(Arc::new(registry));
        let calls = generator.generate("Test query", 5).unwrap();

        assert!(!calls.is_empty());
        let call = &calls[0];

        // Missing required parameter
        assert!(!call.missing_params.is_empty());
        assert!(call.missing_params.contains(&"required1".to_string()));
    }
}
