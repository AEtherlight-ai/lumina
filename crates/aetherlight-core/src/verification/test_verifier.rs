/**
 * Test Verifier - Verify test coverage and pass rates
 *
 * DESIGN DECISION: Run actual test tools (tarpaulin, jest, pytest)
 * WHY: Only way to get accurate test metrics
 *
 * REASONING CHAIN:
 * 1. Agent claims: "Test coverage is 85%"
 * 2. Run: cargo tarpaulin (Rust) or jest --coverage (TypeScript)
 * 3. Parse tool output for coverage percentage
 * 4. Compare claimed vs actual
 * 5. If mismatch → hallucination detected
 * 6. Result: Prevents inflated coverage claims
 *
 * PATTERN: Pattern-VERIFICATION-001 (Claim Validation)
 * RELATED: CI/CD pipeline (same tools used)
 * PERFORMANCE: <5s per coverage run (can be cached)
 */

use std::path::PathBuf;
use std::process::Command;
use std::sync::RwLock;
use regex::Regex;
use super::{AgentClaim, VerificationResult};

/// Test verifier
pub struct TestVerifier {
    /// Project root directory
    root: PathBuf,

    /// Coverage tool command (e.g., "tarpaulin", "jest --coverage")
    coverage_tool: String,

    /// Cached coverage result (to avoid re-running expensive tools)
    /// Uses RwLock for thread-safe interior mutability (Verifier trait requires Sync)
    cached_coverage: RwLock<Option<CachedCoverage>>,
}

#[derive(Debug, Clone)]
struct CachedCoverage {
    percentage: f64,
    timestamp: std::time::Instant,
    /// Cache valid for 60 seconds
    ttl_seconds: u64,
}

impl TestVerifier {
    /// Create new test verifier
    pub fn new(root: PathBuf, coverage_tool: String) -> Self {
        Self {
            root,
            coverage_tool,
            cached_coverage: RwLock::new(None),
        }
    }

    /// Verify test coverage claim
    ///
    /// DESIGN DECISION: Cache coverage for 60s
    /// WHY: Running coverage tools is expensive (2-5s), agent might query multiple times
    ///
    /// REASONING CHAIN:
    /// 1. Check if cache valid (< 60s old)
    /// 2. If yes: Return cached value
    /// 3. If no: Run coverage tool
    /// 4. Parse coverage from output
    /// 5. Cache result
    /// 6. Compare claimed vs actual
    pub async fn verify_test_coverage(
        &self,
        claimed_percentage: f64,
    ) -> Result<VerificationResult, String> {
        let start = std::time::Instant::now();
        let claim = AgentClaim::TestCoverage {
            percentage: claimed_percentage,
        };

        // Check cache
        if let Ok(cached_guard) = self.cached_coverage.read() {
            if let Some(ref cached) = *cached_guard {
                if cached.timestamp.elapsed().as_secs() < cached.ttl_seconds {
                    let duration = start.elapsed().as_millis() as u64;
                    return self.compare_coverage(claim, claimed_percentage, cached.percentage, duration);
                }
            }
        }

        // Run coverage tool
        match self.run_coverage_tool().await {
            Ok(actual_percentage) => {
                // Cache result
                self.cache_coverage(actual_percentage);

                let duration = start.elapsed().as_millis() as u64;
                self.compare_coverage(claim, claimed_percentage, actual_percentage, duration)
            }
            Err(e) => {
                let duration = start.elapsed().as_millis() as u64;
                Ok(VerificationResult::error(
                    claim,
                    format!("Failed to run coverage tool: {}", e),
                    duration,
                ))
            }
        }
    }

    /// Cache coverage result
    fn cache_coverage(&self, percentage: f64) {
        if let Ok(mut cached_guard) = self.cached_coverage.write() {
            *cached_guard = Some(CachedCoverage {
                percentage,
                timestamp: std::time::Instant::now(),
                ttl_seconds: 60,
            });
        }
    }

    /// Compare claimed vs actual coverage
    fn compare_coverage(
        &self,
        claim: AgentClaim,
        claimed: f64,
        actual: f64,
        duration: u64,
    ) -> Result<VerificationResult, String> {
        // Allow 2% tolerance for rounding
        let tolerance = 2.0;

        if (claimed - actual).abs() <= tolerance {
            Ok(VerificationResult::success(claim, duration))
        } else {
            Ok(VerificationResult::failed(
                claim,
                format!("Test coverage is {:.1}%, not {:.1}%", actual, claimed),
                duration,
            ))
        }
    }

    /// Run coverage tool
    ///
    /// DESIGN DECISION: Auto-detect project type
    /// WHY: Support Rust (Cargo.toml), TypeScript (package.json), Python (setup.py)
    async fn run_coverage_tool(&self) -> Result<f64, String> {
        // Detect project type
        let has_cargo = self.root.join("Cargo.toml").exists();
        let has_package_json = self.root.join("package.json").exists();
        let has_setup_py = self.root.join("setup.py").exists();

        if self.coverage_tool == "tarpaulin" && has_cargo {
            self.run_tarpaulin().await
        } else if self.coverage_tool.contains("jest") && has_package_json {
            self.run_jest_coverage().await
        } else if self.coverage_tool.contains("pytest") && has_setup_py {
            self.run_pytest_coverage().await
        } else {
            Err(format!("Unsupported coverage tool: {}", self.coverage_tool))
        }
    }

    /// Run cargo tarpaulin for Rust
    async fn run_tarpaulin(&self) -> Result<f64, String> {
        let output = Command::new("cargo")
            .arg("tarpaulin")
            .arg("--out")
            .arg("Stdout")
            .current_dir(&self.root)
            .output()
            .map_err(|e| format!("Failed to run tarpaulin: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);

        // Parse: "Coverage: 87.5%"
        let re = Regex::new(r"Coverage:\s+(\d+\.?\d*)%").unwrap();
        if let Some(cap) = re.captures(&stdout) {
            let percentage: f64 = cap[1].parse()
                .map_err(|e| format!("Failed to parse coverage: {}", e))?;
            Ok(percentage)
        } else {
            Err("Failed to parse tarpaulin output".to_string())
        }
    }

    /// Run jest --coverage for TypeScript
    async fn run_jest_coverage(&self) -> Result<f64, String> {
        let output = Command::new("npm")
            .arg("run")
            .arg("test:coverage")
            .current_dir(&self.root)
            .output()
            .map_err(|e| format!("Failed to run jest: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);

        // Parse jest output: "All files | 87.5 |"
        let re = Regex::new(r"All files\s+\|\s+(\d+\.?\d*)\s+\|").unwrap();
        if let Some(cap) = re.captures(&stdout) {
            let percentage: f64 = cap[1].parse()
                .map_err(|e| format!("Failed to parse coverage: {}", e))?;
            Ok(percentage)
        } else {
            Err("Failed to parse jest output".to_string())
        }
    }

    /// Run pytest --cov for Python
    async fn run_pytest_coverage(&self) -> Result<f64, String> {
        let output = Command::new("pytest")
            .arg("--cov")
            .arg("--cov-report=term")
            .current_dir(&self.root)
            .output()
            .map_err(|e| format!("Failed to run pytest: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);

        // Parse pytest output: "TOTAL ... 87%"
        let re = Regex::new(r"TOTAL\s+\d+\s+\d+\s+(\d+)%").unwrap();
        if let Some(cap) = re.captures(&stdout) {
            let percentage: f64 = cap[1].parse()
                .map_err(|e| format!("Failed to parse coverage: {}", e))?;
            Ok(percentage)
        } else {
            Err("Failed to parse pytest output".to_string())
        }
    }

    /// Verify tests passing claim
    ///
    /// DESIGN DECISION: Run test suite, count passes/fails
    /// WHY: Accurate pass rate requires running tests
    pub async fn verify_tests_passing(
        &self,
        claimed_count: usize,
        claimed_total: usize,
    ) -> Result<VerificationResult, String> {
        let start = std::time::Instant::now();
        let claim = AgentClaim::TestsPassing {
            count: claimed_count,
            total: claimed_total,
        };

        match self.run_test_suite().await {
            Ok((actual_count, actual_total)) => {
                let duration = start.elapsed().as_millis() as u64;

                if actual_count == claimed_count && actual_total == claimed_total {
                    Ok(VerificationResult::success(claim, duration))
                } else {
                    Ok(VerificationResult::failed(
                        claim,
                        format!(
                            "{} out of {} tests passing, not {} out of {}",
                            actual_count, actual_total, claimed_count, claimed_total
                        ),
                        duration,
                    ))
                }
            }
            Err(e) => {
                let duration = start.elapsed().as_millis() as u64;
                Ok(VerificationResult::error(
                    claim,
                    format!("Failed to run tests: {}", e),
                    duration,
                ))
            }
        }
    }

    /// Run test suite and count passes
    async fn run_test_suite(&self) -> Result<(usize, usize), String> {
        // Detect project type
        let has_cargo = self.root.join("Cargo.toml").exists();
        let has_package_json = self.root.join("package.json").exists();

        if has_cargo {
            self.run_cargo_test().await
        } else if has_package_json {
            self.run_npm_test().await
        } else {
            Err("Unknown project type".to_string())
        }
    }

    /// Run cargo test and count results
    async fn run_cargo_test(&self) -> Result<(usize, usize), String> {
        let output = Command::new("cargo")
            .arg("test")
            .arg("--")
            .arg("--test-threads=1")
            .current_dir(&self.root)
            .output()
            .map_err(|e| format!("Failed to run cargo test: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);

        // Parse: "test result: ok. 12 passed; 3 failed; 0 ignored"
        let re = Regex::new(r"(\d+) passed;\s+(\d+) failed").unwrap();
        if let Some(cap) = re.captures(&stdout) {
            let passed: usize = cap[1].parse().unwrap_or(0);
            let failed: usize = cap[2].parse().unwrap_or(0);
            let total = passed + failed;
            Ok((passed, total))
        } else {
            Err("Failed to parse cargo test output".to_string())
        }
    }

    /// Run npm test and count results
    async fn run_npm_test(&self) -> Result<(usize, usize), String> {
        let output = Command::new("npm")
            .arg("test")
            .current_dir(&self.root)
            .output()
            .map_err(|e| format!("Failed to run npm test: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);

        // Parse jest output: "Tests: 3 failed, 12 passed, 15 total"
        let re = Regex::new(r"Tests:\s+(?:(\d+)\s+failed,\s+)?(\d+)\s+passed,\s+(\d+)\s+total").unwrap();
        if let Some(cap) = re.captures(&stdout) {
            let _failed: usize = cap.get(1).map(|m| m.as_str().parse().unwrap_or(0)).unwrap_or(0);
            let passed: usize = cap[2].parse().unwrap_or(0);
            let total: usize = cap[3].parse().unwrap_or(0);
            Ok((passed, total))
        } else {
            Err("Failed to parse npm test output".to_string())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_compare_coverage() {
        let root = PathBuf::from(".");
        let verifier = TestVerifier::new(root, "tarpaulin".to_string());

        let claim = AgentClaim::TestCoverage { percentage: 85.0 };

        // Exact match
        let result = verifier.compare_coverage(claim.clone(), 85.0, 85.0, 100).unwrap();
        assert!(result.verified);

        // Within tolerance (2%)
        let result = verifier.compare_coverage(claim.clone(), 85.0, 86.5, 100).unwrap();
        assert!(result.verified);

        // Outside tolerance
        let result = verifier.compare_coverage(claim.clone(), 85.0, 90.0, 100).unwrap();
        assert!(!result.verified);
        assert!(result.actual_value.unwrap().contains("90.0%"));
    }

    #[test]
    fn test_coverage_cache() {
        let root = PathBuf::from(".");
        let verifier = TestVerifier::new(root, "tarpaulin".to_string());

        verifier.cache_coverage(87.5);

        let cached_guard = verifier.cached_coverage.read().unwrap();
        assert!(cached_guard.is_some());
        let cached = cached_guard.as_ref().unwrap();
        assert_eq!(cached.percentage, 87.5);
        assert!(cached.timestamp.elapsed().as_secs() < 1);
    }
}
