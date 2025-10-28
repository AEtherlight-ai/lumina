/**
 * Function Call Generator Module - Natural Language to JSON
 *
 * DESIGN DECISION: Hybrid parameter extraction (pattern matching + NER + heuristics)
 * WHY: Pure NER misses structured data, pure patterns miss variations
 *
 * REASONING CHAIN:
 * 1. User says: "Show me John Doe's open cases from last month"
 * 2. Function registry matches to `searchCases(clientName, status, dateRange)`
 * 3. Extract parameters from natural language:
 *    - clientName = "John Doe" (proper noun detection)
 *    - status = "open" (keyword match against enum values)
 *    - dateRange = parse_temporal("last month") → {start, end}
 * 4. Validate parameter types and required fields
 * 5. Generate JSON: {"function": "searchCases", "params": {...}}
 * 6. Return with confidence score and missing parameters
 *
 * PATTERN: Pattern-CALL-GEN-001 (Parameter Extraction Pipeline)
 * RELATED: P3.7-002, Function Registry, NER systems
 * PERFORMANCE: <100ms for 90% of queries
 */

pub mod types;
pub mod generator;
pub mod extractors;

pub use types::{FunctionCall, ParameterValue, ExtractionError};
pub use generator::FunctionCallGenerator;
