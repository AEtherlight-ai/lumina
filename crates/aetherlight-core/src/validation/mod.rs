/**
 * Pattern Validation Module
 *
 * DESIGN DECISION: Multi-layer validation system with automated and human review
 * WHY: Bad data in = bad data out. Must prevent hallucinations from entering pattern library.
 *
 * REASONING CHAIN:
 * 1. Patterns come from multiple sources (manual curation, user submissions, GitHub scraping)
 * 2. Some patterns will be bad (incorrect reasoning, outdated practices, security issues)
 * 3. If bad patterns enter library → system recommends bad patterns → customers implement → corruption spreads
 * 4. Solution: Validate ALL patterns before they become "truth"
 * 5. Multi-layer approach: automated checks (fast) + human review (thorough)
 *
 * PATTERN: Pattern-VALIDATION-001 (Quality-First Pattern Curation)
 * RELATED: SOP-006 (Pattern Library Management), PRE_LAUNCH_TRAINING.md, P3-007 (Pattern Management UI)
 * FUTURE: Machine learning for pattern quality scoring, automated anti-pattern detection
 */

pub mod validator;
pub mod security;
pub mod quality;

pub use validator::{PatternValidator, ValidationResult, ValidationStatus};
pub use security::{SecurityScanner, SecurityIssue, SecuritySeverity};
pub use quality::{QualityChecker, QualityIssue, QualityIssueType, Severity};
