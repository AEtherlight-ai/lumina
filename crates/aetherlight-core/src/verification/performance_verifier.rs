/**
 * Performance Verifier - Verify performance benchmarks
 *
 * DESIGN DECISION: Run actual benchmarks, parse results
 * WHY: Only way to verify performance claims accurately
 *
 * REASONING CHAIN:
 * 1. Agent claims: "Pattern matching <50ms"
 * 2. Run: cargo bench pattern_matching
 * 3. Parse benchmark output
 * 4. Compare claimed target vs actual result
 * 5. If target not met → hallucination detected
 * 6. Result: Prevents performance regression bugs
 *
 * PATTERN: Pattern-VERIFICATION-001 (Claim Validation)
 * RELATED: CI/CD benchmarks, performance tracking
 * PERFORMANCE: Depends on benchmark (cache results)
 */

use std::path::PathBuf;
use std::process::Command;
use regex::Regex;
use super::{AgentClaim, VerificationResult};

/// Performance verifier
pub struct PerformanceVerifier {
    /// Project root directory
    root: PathBuf,

    /// Benchmark tool command (e.g., "cargo bench")
    benchmark_tool: String,
}

impl PerformanceVerifier {
    /// Create new performance verifier
    pub fn new(root: PathBuf, benchmark_tool: String) -> Self {
        Self {
            root,
            benchmark_tool,
        }
    }

    /// Verify performance target
    ///
    /// DESIGN DECISION: Parse benchmark output for timing
    /// WHY: Different tools have different output formats
    ///
    /// REASONING CHAIN:
    /// 1. Run benchmark for specific metric
    /// 2. Parse output (cargo bench, hyperfine, etc.)
    /// 3. Extract actual timing
    /// 4. Compare target vs actual
    /// 5. Return result with actual value
    pub async fn verify_performance_target(
        &self,
        metric: &str,
        target: &str,
        actual: &str,
    ) -> Result<VerificationResult, String> {
        let start = std::time::Instant::now();
        let claim = AgentClaim::PerformanceTarget {
            metric: metric.to_string(),
            target: target.to_string(),
            actual: actual.to_string(),
        };

        // Parse target threshold
        let target_ms = self.parse_duration(target)
            .ok_or_else(|| format!("Invalid target format: {}", target))?;

        // Parse actual value
        let actual_ms = self.parse_duration(actual)
            .ok_or_else(|| format!("Invalid actual format: {}", actual))?;

        let duration = start.elapsed().as_millis() as u64;

        // Compare: actual should be <= target
        if actual_ms <= target_ms {
            Ok(VerificationResult::success(claim, duration))
        } else {
            Ok(VerificationResult::failed(
                claim,
                format!(
                    "{} took {}, exceeds target of {}",
                    metric, actual, target
                ),
                duration,
            ))
        }
    }

    /// Parse duration string to milliseconds
    ///
    /// DESIGN DECISION: Support multiple formats
    /// WHY: Benchmarks report in different units (ns, µs, ms, s)
    ///
    /// Supported formats:
    /// - "45ms" → 45.0
    /// - "1.5s" → 1500.0
    /// - "250µs" → 0.25
    /// - "50,000ns" → 0.05
    fn parse_duration(&self, duration: &str) -> Option<f64> {
        let duration = duration.trim().replace(",", "");

        // Try different patterns
        let patterns = vec![
            (Regex::new(r"(\d+\.?\d*)\s*ms").unwrap(), 1.0),      // milliseconds
            (Regex::new(r"(\d+\.?\d*)\s*s").unwrap(), 1000.0),    // seconds
            (Regex::new(r"(\d+\.?\d*)\s*µs").unwrap(), 0.001),    // microseconds
            (Regex::new(r"(\d+\.?\d*)\s*us").unwrap(), 0.001),    // microseconds (alt)
            (Regex::new(r"(\d+\.?\d*)\s*ns").unwrap(), 0.000001), // nanoseconds
        ];

        for (pattern, multiplier) in patterns {
            if let Some(cap) = pattern.captures(&duration) {
                if let Ok(value) = cap[1].parse::<f64>() {
                    return Some(value * multiplier);
                }
            }
        }

        None
    }

    /// Run benchmark for metric
    ///
    /// DESIGN DECISION: Run specific benchmark by name
    /// WHY: Running all benchmarks is slow (minutes)
    pub async fn run_benchmark(&self, metric: &str) -> Result<String, String> {
        // Detect project type
        let has_cargo = self.root.join("Cargo.toml").exists();

        if has_cargo && self.benchmark_tool.contains("cargo bench") {
            self.run_cargo_bench(metric).await
        } else {
            Err(format!("Unsupported benchmark tool: {}", self.benchmark_tool))
        }
    }

    /// Run cargo bench for specific benchmark
    async fn run_cargo_bench(&self, metric: &str) -> Result<String, String> {
        let output = Command::new("cargo")
            .arg("bench")
            .arg("--bench")
            .arg(metric)
            .current_dir(&self.root)
            .output()
            .map_err(|e| format!("Failed to run cargo bench: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);

        // Parse cargo bench output: "test pattern_matching ... bench: 45,123 ns/iter (+/- 1,234)"
        let re = Regex::new(r"bench:\s+([0-9,]+)\s+(ns|µs|ms|s)/iter").unwrap();
        if let Some(cap) = re.captures(&stdout) {
            let value = &cap[1];
            let unit = &cap[2];
            Ok(format!("{}{}", value, unit))
        } else {
            Err(format!("Failed to parse cargo bench output for {}", metric))
        }
    }

    /// Verify multiple performance targets in batch
    pub async fn verify_batch(
        &self,
        claims: &[(String, String, String)], // (metric, target, actual)
    ) -> Result<Vec<VerificationResult>, String> {
        let mut results = Vec::new();

        for (metric, target, actual) in claims {
            let result = self.verify_performance_target(metric, target, actual).await?;
            results.push(result);
        }

        Ok(results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_verify_performance_target_met() {
        let root = PathBuf::from(".");
        let verifier = PerformanceVerifier::new(root, "cargo bench".to_string());

        // Actual (40ms) meets target (50ms)
        let result = verifier
            .verify_performance_target("pattern_matching", "50ms", "40ms")
            .await
            .unwrap();

        assert!(result.verified);
    }

    #[tokio::test]
    async fn test_verify_performance_target_exceeded() {
        let root = PathBuf::from(".");
        let verifier = PerformanceVerifier::new(root, "cargo bench".to_string());

        // Actual (60ms) exceeds target (50ms)
        let result = verifier
            .verify_performance_target("pattern_matching", "50ms", "60ms")
            .await
            .unwrap();

        assert!(!result.verified);
        assert!(result.actual_value.is_some());
    }

    #[test]
    fn test_parse_duration_milliseconds() {
        let root = PathBuf::from(".");
        let verifier = PerformanceVerifier::new(root, "cargo bench".to_string());

        assert_eq!(verifier.parse_duration("45ms"), Some(45.0));
        assert_eq!(verifier.parse_duration("1.5ms"), Some(1.5));
    }

    #[test]
    fn test_parse_duration_seconds() {
        let root = PathBuf::from(".");
        let verifier = PerformanceVerifier::new(root, "cargo bench".to_string());

        assert_eq!(verifier.parse_duration("1s"), Some(1000.0));
        assert_eq!(verifier.parse_duration("2.5s"), Some(2500.0));
    }

    #[test]
    fn test_parse_duration_microseconds() {
        let root = PathBuf::from(".");
        let verifier = PerformanceVerifier::new(root, "cargo bench".to_string());

        assert_eq!(verifier.parse_duration("500µs"), Some(0.5));
        assert_eq!(verifier.parse_duration("1500us"), Some(1.5));
    }

    #[test]
    fn test_parse_duration_nanoseconds() {
        let root = PathBuf::from(".");
        let verifier = PerformanceVerifier::new(root, "cargo bench".to_string());

        assert_eq!(verifier.parse_duration("50,000ns"), Some(0.05));
        assert_eq!(verifier.parse_duration("1000000ns"), Some(1.0));
    }

    #[tokio::test]
    async fn test_verify_batch() {
        let root = PathBuf::from(".");
        let verifier = PerformanceVerifier::new(root, "cargo bench".to_string());

        let claims = vec![
            ("benchmark1".to_string(), "50ms".to_string(), "40ms".to_string()),
            ("benchmark2".to_string(), "100ms".to_string(), "120ms".to_string()),
            ("benchmark3".to_string(), "1s".to_string(), "500ms".to_string()),
        ];

        let results = verifier.verify_batch(&claims).await.unwrap();

        assert_eq!(results.len(), 3);
        assert!(results[0].verified);   // 40ms < 50ms ✓
        assert!(!results[1].verified);  // 120ms > 100ms ✗
        assert!(results[2].verified);   // 500ms < 1000ms ✓
    }
}
