/**
 * Function Verifier - Verify function existence in files
 *
 * DESIGN DECISION: Use code map + regex fallback for function detection
 * WHY: Code map provides accurate AST parsing, regex handles edge cases
 *
 * REASONING CHAIN:
 * 1. Agent claims: "Function calculate() exists in utils.rs"
 * 2. Load code map from AI-001 (if available)
 * 3. Search for function in module exports
 * 4. If code map unavailable, fall back to regex search
 * 5. If function not found → hallucination detected
 * 6. Result: Prevents "undefined function" bugs
 *
 * PATTERN: Pattern-VERIFICATION-001 (Claim Validation)
 * RELATED: AI-001 (Code Map - primary data source)
 * PERFORMANCE: <50ms per function check (with code map)
 */

use std::fs;
use std::path::{Path, PathBuf};
use regex::Regex;
use super::{AgentClaim, VerificationResult};
use crate::code_map::{CodeMap, Module};

/// Function verifier
pub struct FunctionVerifier {
    /// Project root directory
    root: PathBuf,

    /// Cached code map (if available)
    code_map: Option<CodeMap>,

    /// Regex patterns for function detection (fallback)
    rust_fn_pattern: Regex,
    ts_fn_pattern: Regex,
}

impl FunctionVerifier {
    /// Create new function verifier
    ///
    /// DESIGN DECISION: Load code map on initialization
    /// WHY: Amortize cost of loading, reuse across verifications
    pub fn new(root: PathBuf) -> Self {
        // Try to load code map from .lumina/code-map.json
        let code_map_path = root.join(".lumina").join("code-map.json");
        let code_map = if code_map_path.exists() {
            match fs::read_to_string(&code_map_path) {
                Ok(json) => match serde_json::from_str::<CodeMap>(&json) {
                    Ok(map) => Some(map),
                    Err(e) => {
                        eprintln!("⚠️  Failed to parse code map: {}", e);
                        None
                    }
                },
                Err(e) => {
                    eprintln!("⚠️  Failed to read code map: {}", e);
                    None
                }
            }
        } else {
            None
        };

        Self {
            root,
            code_map,
            // Rust: pub fn name() or fn name()
            rust_fn_pattern: Regex::new(r"(?:pub\s+)?fn\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(<[^>]*>)?\s*\(").unwrap(),
            // TypeScript: function name() or const name = () => or async function
            ts_fn_pattern: Regex::new(
                r"(?:export\s+)?(?:async\s+)?(?:function\s+([a-zA-Z_][a-zA-Z0-9_]*)|const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=)"
            ).unwrap(),
        }
    }

    /// Verify function exists in file
    ///
    /// DESIGN DECISION: Code map first, regex fallback
    /// WHY: Code map is accurate (AST-based), regex handles files not in map
    ///
    /// REASONING CHAIN:
    /// 1. Check if code map available
    /// 2. If yes: Search code map for function in module
    /// 3. If no or not found: Fall back to regex search in file
    /// 4. Return result with actual functions found (for correction)
    pub async fn verify_function_exists(
        &self,
        file: &Path,
        function: &str,
    ) -> Result<VerificationResult, String> {
        let start = std::time::Instant::now();
        let claim = AgentClaim::FunctionExists {
            file: file.to_path_buf(),
            function: function.to_string(),
        };

        // Try code map first
        if let Some(ref code_map) = self.code_map {
            if let Some(module) = self.find_module_by_path(code_map, file) {
                // Search exports for function
                let found = module.exports.iter().any(|symbol| {
                    symbol.name == function
                        && matches!(symbol.symbol_type, crate::code_map::SymbolType::Function)
                });

                if found {
                    let duration = start.elapsed().as_millis() as u64;
                    return Ok(VerificationResult::success(claim, duration));
                } else {
                    // Not found in exports, but might be private
                    // Fall through to regex search
                }
            }
        }

        // Fall back to regex search
        let abs_path = if file.is_absolute() {
            file.to_path_buf()
        } else {
            self.root.join(file)
        };

        if !abs_path.exists() {
            let duration = start.elapsed().as_millis() as u64;
            return Ok(VerificationResult::failed(
                claim,
                format!("File does not exist: {}", file.display()),
                duration,
            ));
        }

        let contents = fs::read_to_string(&abs_path)
            .map_err(|e| format!("Failed to read file: {}", e))?;

        let found = self.search_function_in_text(&contents, function, file);

        let duration = start.elapsed().as_millis() as u64;

        if found {
            Ok(VerificationResult::success(claim, duration))
        } else {
            // Find all functions in file for correction suggestion
            let available_functions = self.find_all_functions(&contents, file);
            let suggestion = if available_functions.is_empty() {
                format!("Function '{}' not found in {}", function, file.display())
            } else {
                format!(
                    "Function '{}' not found. Available functions: {}",
                    function,
                    available_functions.join(", ")
                )
            };

            Ok(VerificationResult::failed(claim, suggestion, duration))
        }
    }

    /// Find module in code map by file path
    fn find_module_by_path<'a>(&self, code_map: &'a CodeMap, file: &Path) -> Option<&'a Module> {
        code_map.modules.iter().find(|module| {
            // Try exact match
            if module.path == file {
                return true;
            }

            // Try matching just the file name
            if let (Some(module_name), Some(file_name)) = (
                module.path.file_name(),
                file.file_name(),
            ) {
                return module_name == file_name;
            }

            false
        })
    }

    /// Search for function in text using regex
    fn search_function_in_text(&self, contents: &str, function: &str, file: &Path) -> bool {
        let pattern = if file.extension().and_then(|s| s.to_str()) == Some("rs") {
            &self.rust_fn_pattern
        } else {
            &self.ts_fn_pattern
        };

        for cap in pattern.captures_iter(contents) {
            // Check both capture groups (function name or const name)
            if let Some(name) = cap.get(1).or_else(|| cap.get(2)) {
                if name.as_str() == function {
                    return true;
                }
            }
        }

        false
    }

    /// Find all functions in file
    fn find_all_functions(&self, contents: &str, file: &Path) -> Vec<String> {
        let mut functions = Vec::new();

        let pattern = if file.extension().and_then(|s| s.to_str()) == Some("rs") {
            &self.rust_fn_pattern
        } else {
            &self.ts_fn_pattern
        };

        for cap in pattern.captures_iter(contents) {
            if let Some(name) = cap.get(1).or_else(|| cap.get(2)) {
                functions.push(name.as_str().to_string());
            }
        }

        functions
    }

    /// Verify multiple functions in batch
    pub async fn verify_batch(
        &self,
        claims: &[(PathBuf, String)],
    ) -> Result<Vec<VerificationResult>, String> {
        let mut results = Vec::new();

        for (file, function) in claims {
            let result = self.verify_function_exists(file, function).await?;
            results.push(result);
        }

        Ok(results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::TempDir;

    fn create_rust_file(dir: &TempDir, name: &str, contents: &str) -> PathBuf {
        let path = dir.path().join(name);
        let mut file = fs::File::create(&path).unwrap();
        file.write_all(contents.as_bytes()).unwrap();
        path
    }

    #[tokio::test]
    async fn test_verify_function_exists_rust() {
        let dir = TempDir::new().unwrap();
        let _file = create_rust_file(
            &dir,
            "test.rs",
            r#"
pub fn calculate(x: i32) -> i32 {
    x * 2
}

fn private_helper() {
    println!("helper");
}
"#,
        );

        let verifier = FunctionVerifier::new(dir.path().to_path_buf());

        // Public function should be found
        let result = verifier
            .verify_function_exists(&PathBuf::from("test.rs"), "calculate")
            .await
            .unwrap();
        assert!(result.verified);

        // Private function should be found (regex fallback)
        let result = verifier
            .verify_function_exists(&PathBuf::from("test.rs"), "private_helper")
            .await
            .unwrap();
        assert!(result.verified);

        // Non-existent function should fail
        let result = verifier
            .verify_function_exists(&PathBuf::from("test.rs"), "nonexistent")
            .await
            .unwrap();
        assert!(!result.verified);
        assert!(result.actual_value.is_some());
        assert!(result.actual_value.unwrap().contains("Available functions"));
    }

    #[tokio::test]
    async fn test_verify_function_with_generics() {
        let dir = TempDir::new().unwrap();
        let _file = create_rust_file(
            &dir,
            "test.rs",
            r#"
pub fn process<T: Clone>(item: T) -> T {
    item.clone()
}
"#,
        );

        let verifier = FunctionVerifier::new(dir.path().to_path_buf());
        let result = verifier
            .verify_function_exists(&PathBuf::from("test.rs"), "process")
            .await
            .unwrap();
        assert!(result.verified);
    }

    #[tokio::test]
    async fn test_find_all_functions() {
        let dir = TempDir::new().unwrap();
        let file_path = create_rust_file(
            &dir,
            "test.rs",
            r#"
pub fn func1() {}
fn func2() {}
pub fn func3() {}
"#,
        );

        let verifier = FunctionVerifier::new(dir.path().to_path_buf());
        let contents = fs::read_to_string(&file_path).unwrap();
        let functions = verifier.find_all_functions(&contents, &PathBuf::from("test.rs"));

        assert_eq!(functions.len(), 3);
        assert!(functions.contains(&"func1".to_string()));
        assert!(functions.contains(&"func2".to_string()));
        assert!(functions.contains(&"func3".to_string()));
    }

    #[tokio::test]
    async fn test_verify_batch() {
        let dir = TempDir::new().unwrap();
        create_rust_file(
            &dir,
            "test.rs",
            r#"
pub fn func1() {}
pub fn func2() {}
"#,
        );

        let verifier = FunctionVerifier::new(dir.path().to_path_buf());
        let claims = vec![
            (PathBuf::from("test.rs"), "func1".to_string()),
            (PathBuf::from("test.rs"), "func2".to_string()),
            (PathBuf::from("test.rs"), "nonexistent".to_string()),
        ];

        let results = verifier.verify_batch(&claims).await.unwrap();

        assert_eq!(results.len(), 3);
        assert!(results[0].verified);
        assert!(results[1].verified);
        assert!(!results[2].verified);
    }
}
