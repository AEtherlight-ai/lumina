/**
 * Security Scanner for Pattern Validation
 *
 * DESIGN DECISION: Security-first pattern validation
 * WHY: Bad security patterns → customer vulnerabilities → reputation damage
 *
 * REASONING CHAIN:
 * 1. Patterns teach developers how to code
 * 2. Insecure patterns → developers copy insecure code
 * 3. Vulnerabilities spread across customer codebases
 * 4. Solution: Scan patterns for common security issues
 * 5. Zero tolerance: Any security issue = pattern rejected
 *
 * PATTERN: Pattern-VALIDATION-001 (Quality-First Pattern Curation)
 * RELATED: quality.rs (quality vs security separation of concerns)
 * FUTURE: Integration with CVE databases, OWASP Top 10 checks
 */

use crate::{Pattern, Result};

#[derive(Debug, Clone, PartialEq)]
pub enum SecuritySeverity {
    Critical,   // Exploitable vulnerability
    High,       // Potential vulnerability
    Medium,     // Security best practice violation
    Low,        // Security suggestion
}

#[derive(Debug, Clone)]
pub struct SecurityIssue {
    pub vulnerability_type: String,
    pub severity: SecuritySeverity,
    pub message: String,
    pub remediation: String,
}

pub struct SecurityScanner;

impl SecurityScanner {
    /**
     * Create a new SecurityScanner instance
     *
     * DESIGN DECISION: Stateless security scanner
     * WHY: No mutable state needed, pure validation logic
     */
    pub fn new() -> Self {
        Self
    }

    /**
     * Scan pattern for security issues
     *
     * DESIGN DECISION: Zero tolerance for Critical/High severity issues
     * WHY: Security > Convenience. Better to reject good pattern than approve bad one.
     *
     * REASONING CHAIN:
     * 1. Check for SQL injection patterns
     * 2. Check for command injection patterns
     * 3. Check for path traversal patterns
     * 4. Check for hardcoded credentials
     * 5. Check for insecure crypto usage
     * 6. Return ALL issues found
     */
    pub fn scan(&self, pattern: &Pattern) -> Result<Vec<SecurityIssue>> {
        let mut issues = Vec::new();

        let title = pattern.title();
        let content = pattern.content();
        let combined = format!("{} {}", title, content);

        // Check 1: SQL injection patterns
        issues.extend(self.check_sql_injection(&combined));

        // Check 2: Command injection patterns
        issues.extend(self.check_command_injection(&combined));

        // Check 3: Path traversal patterns
        issues.extend(self.check_path_traversal(&combined));

        // Check 4: Hardcoded credentials
        issues.extend(self.check_hardcoded_credentials(&combined));

        // Check 5: Insecure crypto
        issues.extend(self.check_insecure_crypto(&combined));

        // Check 6: Insecure deserialization
        issues.extend(self.check_insecure_deserialization(&combined));

        Ok(issues)
    }

    fn check_sql_injection(&self, text: &str) -> Vec<SecurityIssue> {
        let mut issues = Vec::new();

        // Pattern 1: String concatenation in SQL
        if text.contains("SELECT * FROM") && text.contains("+") && !text.contains("?") && !text.contains("$") {
            issues.push(SecurityIssue {
                vulnerability_type: "SQL Injection".to_string(),
                severity: SecuritySeverity::Critical,
                message: "Pattern demonstrates SQL query with string concatenation (no parameterization)".to_string(),
                remediation: "Use parameterized queries or prepared statements instead".to_string(),
            });
        }

        // Pattern 2: Template literal SQL without escaping
        if text.contains("${") && (text.contains("SELECT") || text.contains("INSERT") || text.contains("UPDATE")) {
            issues.push(SecurityIssue {
                vulnerability_type: "SQL Injection".to_string(),
                severity: SecuritySeverity::High,
                message: "Pattern uses template literals in SQL query (potential injection)".to_string(),
                remediation: "Use parameterized queries with ? or $N placeholders".to_string(),
            });
        }

        issues
    }

    fn check_command_injection(&self, text: &str) -> Vec<SecurityIssue> {
        let mut issues = Vec::new();

        // Pattern 1: Shell command with user input
        if (text.contains("exec(") || text.contains("system(") || text.contains("spawn("))
            && (text.contains("input") || text.contains("user") || text.contains("request"))
        {
            issues.push(SecurityIssue {
                vulnerability_type: "Command Injection".to_string(),
                severity: SecuritySeverity::Critical,
                message: "Pattern executes shell command with user input (command injection risk)".to_string(),
                remediation: "Sanitize input, use safe APIs, avoid shell=True".to_string(),
            });
        }

        issues
    }

    fn check_path_traversal(&self, text: &str) -> Vec<SecurityIssue> {
        let mut issues = Vec::new();

        // Pattern 1: Direct path concatenation
        if text.contains("../") && (text.contains("open(") || text.contains("read") || text.contains("file")) {
            issues.push(SecurityIssue {
                vulnerability_type: "Path Traversal".to_string(),
                severity: SecuritySeverity::High,
                message: "Pattern demonstrates path traversal with ../ (directory traversal risk)".to_string(),
                remediation: "Validate paths, use Path::canonicalize(), restrict to safe directories".to_string(),
            });
        }

        issues
    }

    fn check_hardcoded_credentials(&self, text: &str) -> Vec<SecurityIssue> {
        let mut issues = Vec::new();

        // Pattern 1: Password literals
        let password_patterns = ["password = \"", "apiKey = \"", "secret = \"", "token = \""];

        for pattern in &password_patterns {
            if text.contains(pattern) {
                issues.push(SecurityIssue {
                    vulnerability_type: "Hardcoded Credentials".to_string(),
                    severity: SecuritySeverity::Critical,
                    message: format!("Pattern contains hardcoded credentials ({}...)", pattern.trim_end_matches(" = \"")),
                    remediation: "Use environment variables or secure credential stores".to_string(),
                });
                break;  // Only report once
            }
        }

        issues
    }

    fn check_insecure_crypto(&self, text: &str) -> Vec<SecurityIssue> {
        let mut issues = Vec::new();

        // Pattern 1: Weak hashing algorithms
        let weak_algorithms = ["MD5", "SHA1", "md5(", "sha1("];

        for algo in &weak_algorithms {
            if text.contains(algo) {
                issues.push(SecurityIssue {
                    vulnerability_type: "Weak Cryptography".to_string(),
                    severity: SecuritySeverity::High,
                    message: format!("Pattern uses weak cryptographic algorithm: {}", algo),
                    remediation: "Use SHA-256, SHA-3, or bcrypt for hashing".to_string(),
                });
                break;
            }
        }

        // Pattern 2: Insecure random number generation
        if text.contains("Math.random()") || text.contains("rand()") {
            issues.push(SecurityIssue {
                vulnerability_type: "Insecure Randomness".to_string(),
                severity: SecuritySeverity::Medium,
                message: "Pattern uses insecure random number generator".to_string(),
                remediation: "Use cryptographically secure RNG (crypto.randomBytes, etc.)".to_string(),
            });
        }

        issues
    }

    fn check_insecure_deserialization(&self, text: &str) -> Vec<SecurityIssue> {
        let mut issues = Vec::new();

        // Pattern 1: Unsafe deserialization
        if text.contains("pickle.load") || text.contains("eval(") || text.contains("unserialize(") {
            issues.push(SecurityIssue {
                vulnerability_type: "Insecure Deserialization".to_string(),
                severity: SecuritySeverity::Critical,
                message: "Pattern uses insecure deserialization (remote code execution risk)".to_string(),
                remediation: "Use safe serialization formats (JSON), validate input types".to_string(),
            });
        }

        issues
    }
}

impl Default for SecurityScanner {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Pattern;

    #[test]
    fn test_secure_pattern_passes() {
        let scanner = SecurityScanner::new();

        let pattern = Pattern::builder()
            .title("Secure Database Query")
            .content("Use parameterized queries to prevent SQL injection:\n\n```rust\nlet result = query(\"SELECT * FROM users WHERE id = ?\", &[id]);\n```")
            .tags(vec!["security", "sql"])
            .build()
            .unwrap();

        let issues = scanner.scan(&pattern).unwrap();

        assert!(issues.is_empty(), "Secure pattern should have no issues");
    }

    #[test]
    fn test_sql_injection_detected() {
        let scanner = SecurityScanner::new();

        let pattern = Pattern::builder()
            .title("Bad SQL Pattern")
            .content("SELECT * FROM users WHERE name = \" + userName")
            .tags(vec!["sql"])
            .build()
            .unwrap();

        let issues = scanner.scan(&pattern).unwrap();

        assert!(issues.iter().any(|i| i.vulnerability_type == "SQL Injection"));
    }

    #[test]
    fn test_command_injection_detected() {
        let scanner = SecurityScanner::new();

        let pattern = Pattern::builder()
            .title("Insecure Command Execution")
            .content("exec(\"ls \" + user_input)")
            .tags(vec!["shell"])
            .build()
            .unwrap();

        let issues = scanner.scan(&pattern).unwrap();

        assert!(issues.iter().any(|i| i.vulnerability_type == "Command Injection"));
    }

    #[test]
    fn test_hardcoded_credentials_detected() {
        let scanner = SecurityScanner::new();

        let pattern = Pattern::builder()
            .title("Database Connection")
            .content("password = \"admin123\"")
            .tags(vec!["database"])
            .build()
            .unwrap();

        let issues = scanner.scan(&pattern).unwrap();

        assert!(issues.iter().any(|i| i.vulnerability_type == "Hardcoded Credentials"));
    }
}
