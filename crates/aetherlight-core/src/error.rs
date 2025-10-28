/**
 * Error Handling Module
 *
 * DESIGN DECISION: Centralized error types using thiserror for consistent error semantics
 * WHY: Library code must never panic; all errors returned as Result for FFI safety
 *
 * REASONING CHAIN:
 * 1. FFI boundaries cannot propagate Rust panics safely (undefined behavior)
 * 2. thiserror provides ergonomic error derive macros without boilerplate
 * 3. Centralized error types enable consistent error handling across modules
 * 4. Error conversion (From trait) enables ? operator for error propagation
 * 5. Custom error types provide domain-specific context for debugging
 * 6. Serializable errors enable error transmission across FFI boundaries
 *
 * PATTERN: Pattern-001 (Rust Core + Language Bindings)
 * RELATED: FFI error codes (P1-009), error logging (P1-011)
 * FUTURE: Add error telemetry for production debugging (Phase 5)
 *
 * # FFI Error Handling Strategy
 *
 * ```text
 * Rust Error → FFI Error Code → Language-Specific Exception
 *     ↓              ↓                    ↓
 *   Error      i32 status         JavaScript Error
 *   Result     (0 = success)      TypeScript Error
 *   Display    (-1 = generic)     Dart Exception
 * ```
 *
 * # Examples
 *
 * ```rust
 * use aetherlight_core::{Error, Result};
 *
 * fn validate_pattern_id(id: &str) -> Result<()> {
 *     if id.is_empty() {
 *         return Err(Error::InvalidPatternId("ID cannot be empty".to_string()));
 *     }
 *     Ok(())
 * }
 * ```
 */

use thiserror::Error;

/**
 * Primary error type for ÆtherLight Core library
 *
 * DESIGN DECISION: Enum-based error type with structured variants
 * WHY: Type-safe error handling with exhaustive pattern matching
 *
 * REASONING CHAIN:
 * 1. Each error variant represents a distinct failure mode
 * 2. Structured errors carry contextual data (pattern ID, field name, etc.)
 * 3. thiserror generates Display impl for human-readable messages
 * 4. Error messages suitable for end-user display (no internal details)
 * 5. Enum exhaustiveness ensures all errors handled at call sites
 * 6. Serializable via serde for FFI transmission (future)
 *
 * PATTERN: Rust error handling best practices
 * RELATED: Result type alias, From conversions
 * FUTURE: Add serde derive for error serialization across FFI (P1-009)
 */
#[derive(Error, Debug, Clone, PartialEq)]
pub enum Error {
    /**
     * Pattern-related errors
     *
     * DESIGN DECISION: Separate error variants for pattern operations
     * WHY: Enable granular error handling and user-facing error messages
     */

    /// Pattern not found in library by ID
    #[error("Pattern not found: {0}")]
    PatternNotFound(String),

    /// Invalid pattern ID format
    #[error("Invalid pattern ID: {0}")]
    InvalidPatternId(String),

    /// Pattern validation failed (missing required field, etc.)
    #[error("Pattern validation failed: {0}")]
    PatternValidation(String),

    /// Duplicate pattern ID in library
    #[error("Duplicate pattern ID: {0}")]
    DuplicatePattern(String),

    /**
     * Confidence scoring errors
     *
     * DESIGN DECISION: Separate variants for confidence calculation failures
     * WHY: Confidence scoring has multiple failure modes requiring different handling
     */

    /// Confidence score out of valid range [0.0, 1.0]
    #[error("Invalid confidence score: {0} (must be between 0.0 and 1.0)")]
    InvalidConfidenceScore(f64),

    /// Missing required dimension for confidence calculation
    #[error("Missing confidence dimension: {0}")]
    MissingConfidenceDimension(String),

    /// Confidence weight sum does not equal 1.0
    #[error("Confidence weights must sum to 1.0, got: {0}")]
    InvalidConfidenceWeights(f64),

    /**
     * Matching engine errors
     *
     * DESIGN DECISION: Separate variants for matching algorithm failures
     * WHY: Matching can fail due to index corruption, empty library, or algorithm errors
     */

    /// Pattern library is empty (no patterns to match against)
    #[error("Pattern library is empty")]
    EmptyLibrary,

    /// Matching algorithm failed
    #[error("Matching failed: {0}")]
    MatchingFailed(String),

    /// Query validation failed (empty query, invalid format, etc.)
    #[error("Invalid query: {0}")]
    InvalidQuery(String),

    /**
     * Agent network errors (Phase 3.5)
     *
     * DESIGN DECISION: Separate variants for agent availability and communication
     * WHY: AgentNetwork needs to gracefully handle agent unavailability (escalate to Ether)
     */

    /// Agent not available for domain (not registered or query failed)
    #[error("Agent not available: {0}")]
    AgentNotAvailable(String),

    /**
     * Content addressing errors (Phase 3.6 - Pattern-CONTEXT-002)
     *
     * DESIGN DECISION: Separate variant for content address parsing
     * WHY: ContentAddress uses hierarchical format (DOC.SEC.PARA.LINE) that requires validation
     */

    /// Content address parsing error (invalid format)
    #[error("Content address parse error: {0}")]
    Parse(String),

    /**
     * Configuration and validation errors (Phase 4 - AS-001)
     *
     * DESIGN DECISION: Separate variant for configuration validation
     * WHY: Sprint plans, context loader config, and other YAML configs need validation
     */

    /// Configuration validation error (sprint plans, context config, etc.)
    #[error("Configuration error: {0}")]
    Configuration(String),

    /**
     * Function registry errors (Phase 3.7 - P3.7-001)
     *
     * DESIGN DECISION: Separate variants for function registration and lock errors
     * WHY: Function registry uses Arc<RwLock<>> for thread-safe access
     */

    /// Function validation error (empty description, invalid parameters, etc.)
    #[error("Function validation error: {0}")]
    ValidationError(String),

    /// Lock acquisition error (RwLock poisoned or unavailable)
    #[error("Lock error: {0}")]
    LockError(String),

    /**
     * I/O and serialization errors
     *
     * DESIGN DECISION: Generic I/O error variant with context
     * WHY: I/O failures require external error context (file path, operation type)
     */

    /// Generic I/O error (file read/write, network, etc.)
    #[error("I/O error: {0}")]
    Io(String),

    /// JSON serialization/deserialization error
    #[error("Serialization error: {0}")]
    Serialization(String),

    /**
     * Generic error fallback
     *
     * DESIGN DECISION: Catch-all variant for unexpected errors
     * WHY: Enable error conversion from external libraries via From trait
     */

    /// Unexpected internal error (should not occur in normal operation)
    #[error("Internal error: {0}")]
    Internal(String),
}

/**
 * Result type alias for ÆtherLight operations
 *
 * DESIGN DECISION: Type alias for consistent Result usage across library
 * WHY: Reduces boilerplate and ensures consistent error type
 *
 * REASONING CHAIN:
 * 1. Standard Rust pattern (std::io::Result, std::fmt::Result)
 * 2. Reduces verbosity: Result<T> instead of Result<T, Error>
 * 3. Enables ? operator for error propagation
 * 4. Single source of truth for error type
 * 5. Easy to change underlying error type if needed
 *
 * PATTERN: Rust error handling best practices
 *
 * # Examples
 *
 * ```rust
 * use aetherlight_core::Result;
 *
 * fn risky_operation() -> Result<String> {
 *     let pattern = find_pattern("id")?; // ? propagates Error
 *     Ok(pattern.title)
 * }
 * ```
 */
pub type Result<T> = std::result::Result<T, Error>;

/**
 * Error conversion implementations
 *
 * DESIGN DECISION: Implement From trait for common external error types
 * WHY: Enable ? operator for error propagation from external libraries
 *
 * REASONING CHAIN:
 * 1. serde_json errors converted to Serialization variant
 * 2. std::io errors converted to Io variant
 * 3. From trait enables automatic conversion via ?
 * 4. Preserves error context in error message string
 * 5. Future: Add conversions for embedding library errors (P1-007)
 */

impl From<serde_json::Error> for Error {
    fn from(err: serde_json::Error) -> Self {
        Error::Serialization(err.to_string())
    }
}

impl From<std::io::Error> for Error {
    fn from(err: std::io::Error) -> Self {
        Error::Io(err.to_string())
    }
}

impl From<rusqlite::Error> for Error {
    fn from(err: rusqlite::Error) -> Self {
        Error::Internal(format!("Database error: {}", err))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /**
     * Test: Error display messages are user-friendly
     *
     * DESIGN DECISION: Validate error messages at compile time
     * WHY: Error messages displayed to users must be clear and actionable
     *
     * REASONING CHAIN:
     * 1. Error::Display provides user-facing error messages
     * 2. Messages should not expose internal implementation details
     * 3. Messages should guide user toward resolution
     * 4. Test ensures thiserror macro generates expected format
     *
     * PATTERN: Test-Driven Development (SOP-003)
     */
    #[test]
    fn test_error_display() {
        let err = Error::PatternNotFound("pattern-123".to_string());
        assert_eq!(err.to_string(), "Pattern not found: pattern-123");

        let err = Error::InvalidConfidenceScore(1.5);
        assert!(err.to_string().contains("must be between 0.0 and 1.0"));

        let err = Error::EmptyLibrary;
        assert_eq!(err.to_string(), "Pattern library is empty");
    }

    /**
     * Test: Error variants are cloneable and comparable
     *
     * DESIGN DECISION: Errors implement Clone and PartialEq
     * WHY: Enable error comparison in tests and error caching in production
     */
    #[test]
    fn test_error_traits() {
        let err1 = Error::EmptyLibrary;
        let err2 = err1.clone();
        assert_eq!(err1, err2);

        let err3 = Error::PatternNotFound("id".to_string());
        assert_ne!(err1, err3);
    }

    /**
     * Test: Error conversion from external libraries
     *
     * DESIGN DECISION: Validate From trait implementations
     * WHY: Ensure error propagation via ? operator works correctly
     */
    #[test]
    fn test_error_conversion() {
        // Test serde_json error conversion
        let json_err = serde_json::from_str::<serde_json::Value>("invalid json");
        assert!(json_err.is_err());
        let err: Error = json_err.unwrap_err().into();
        match err {
            Error::Serialization(_) => {},
            _ => panic!("Expected Serialization error"),
        }

        // Test std::io error conversion
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let err: Error = io_err.into();
        match err {
            Error::Io(msg) => assert!(msg.contains("file not found")),
            _ => panic!("Expected Io error"),
        }
    }

    /**
     * Test: Result type alias works as expected
     *
     * DESIGN DECISION: Validate Result type alias functionality
     * WHY: Ensure type alias provides expected ergonomics
     */
    #[test]
    fn test_result_type_alias() {
        fn returns_result() -> Result<i32> {
            Ok(42)
        }

        fn returns_error() -> Result<i32> {
            Err(Error::EmptyLibrary)
        }

        assert_eq!(returns_result().unwrap(), 42);
        assert!(returns_error().is_err());
    }
}
