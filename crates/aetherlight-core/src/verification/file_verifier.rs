/**
 * File Verifier - Verify file references and line numbers
 *
 * DESIGN DECISION: Check file existence and line ranges synchronously
 * WHY: File I/O is fast (<1ms), no need for async overhead
 *
 * REASONING CHAIN:
 * 1. Agent claims: "See src/main.rs:45"
 * 2. Verify file exists: src/main.rs
 * 3. Verify line 45 is within file length
 * 4. If file doesn't exist → hallucination detected
 * 5. If line out of range → hallucination detected
 * 6. Result: Prevents "file not found" bugs
 *
 * PATTERN: Pattern-VERIFICATION-001 (Claim Validation)
 * RELATED: AI-001 (Code Map - can use for module resolution)
 * PERFORMANCE: <10ms per file check
 */

use std::fs;
use std::path::{Path, PathBuf};
use super::{AgentClaim, VerificationResult};

/// File verifier
pub struct FileVerifier {
    /// Project root directory
    root: PathBuf,
}

impl FileVerifier {
    /// Create new file verifier
    pub fn new(root: PathBuf) -> Self {
        Self { root }
    }

    /// Verify file reference
    ///
    /// DESIGN DECISION: Return VerificationResult with actual line count
    /// WHY: Agent needs to know actual file length to correct claim
    ///
    /// REASONING CHAIN:
    /// 1. Resolve file path (relative to project root)
    /// 2. Check if file exists
    /// 3. If line specified, check if within range
    /// 4. Return actual line count for correction
    pub async fn verify_file_reference(
        &self,
        file: &Path,
        line: Option<usize>,
    ) -> Result<VerificationResult, String> {
        let start = std::time::Instant::now();
        let claim = AgentClaim::FileReference {
            file: file.to_path_buf(),
            line,
        };

        // Resolve absolute path
        let abs_path = if file.is_absolute() {
            file.to_path_buf()
        } else {
            self.root.join(file)
        };

        // Check if file exists
        if !abs_path.exists() {
            let duration = start.elapsed().as_millis() as u64;
            return Ok(VerificationResult::failed(
                claim,
                format!("File does not exist: {}", file.display()),
                duration,
            ));
        }

        // Check if it's actually a file (not a directory)
        if !abs_path.is_file() {
            let duration = start.elapsed().as_millis() as u64;
            return Ok(VerificationResult::failed(
                claim,
                format!("Path is not a file: {}", file.display()),
                duration,
            ));
        }

        // If line number specified, verify it's within range
        if let Some(line_num) = line {
            match self.count_lines(&abs_path) {
                Ok(total_lines) => {
                    if line_num == 0 || line_num > total_lines {
                        let duration = start.elapsed().as_millis() as u64;
                        return Ok(VerificationResult::failed(
                            claim,
                            format!(
                                "Line {} out of range (file has {} lines)",
                                line_num, total_lines
                            ),
                            duration,
                        ));
                    }
                }
                Err(e) => {
                    let duration = start.elapsed().as_millis() as u64;
                    return Ok(VerificationResult::error(
                        claim,
                        format!("Failed to count lines: {}", e),
                        duration,
                    ));
                }
            }
        }

        let duration = start.elapsed().as_millis() as u64;
        Ok(VerificationResult::success(claim, duration))
    }

    /// Count lines in file
    ///
    /// DESIGN DECISION: Read entire file, count newlines
    /// WHY: Simple, works for all text files, <10ms for typical files
    fn count_lines(&self, path: &Path) -> Result<usize, String> {
        let contents = fs::read_to_string(path)
            .map_err(|e| format!("Failed to read file: {}", e))?;

        // Count newlines, add 1 for last line if no trailing newline
        let line_count = contents.lines().count();
        Ok(line_count)
    }

    /// Verify multiple file references in batch
    ///
    /// DESIGN DECISION: Batch verification for efficiency
    /// WHY: Can verify 10+ file references in parallel
    pub async fn verify_batch(
        &self,
        references: &[(PathBuf, Option<usize>)],
    ) -> Result<Vec<VerificationResult>, String> {
        let mut results = Vec::new();

        for (file, line) in references {
            let result = self.verify_file_reference(file, *line).await?;
            results.push(result);
        }

        Ok(results)
    }

    /// Find file by name (fuzzy search)
    ///
    /// DESIGN DECISION: Help agents find correct file paths
    /// WHY: Agent might hallucinate wrong directory but correct filename
    ///
    /// REASONING CHAIN:
    /// 1. Agent claims: "src/utils.rs"
    /// 2. File doesn't exist
    /// 3. Search for "utils.rs" in project
    /// 4. Found: "src/common/utils.rs"
    /// 5. Suggest correction to agent
    pub fn find_file_by_name(&self, filename: &str) -> Vec<PathBuf> {
        let mut matches = Vec::new();

        for entry_result in walkdir::WalkDir::new(&self.root).into_iter() {
            if let Ok(entry) = entry_result {
                if let Some(name) = entry.path().file_name() {
                    if name.to_string_lossy() == filename {
                        if let Ok(relative) = entry.path().strip_prefix(&self.root) {
                            matches.push(relative.to_path_buf());
                        }
                    }
                }
            }
        }

        matches
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::TempDir;

    fn create_test_file(dir: &TempDir, name: &str, contents: &str) -> PathBuf {
        let path = dir.path().join(name);
        let mut file = fs::File::create(&path).unwrap();
        file.write_all(contents.as_bytes()).unwrap();
        path
    }

    #[tokio::test]
    async fn test_verify_file_exists() {
        let dir = TempDir::new().unwrap();
        let file_path = create_test_file(&dir, "test.txt", "line 1\nline 2\nline 3\n");

        let verifier = FileVerifier::new(dir.path().to_path_buf());
        let result = verifier
            .verify_file_reference(&PathBuf::from("test.txt"), None)
            .await
            .unwrap();

        assert!(result.verified);
        assert!(result.error.is_none());
    }

    #[tokio::test]
    async fn test_verify_file_not_exists() {
        let dir = TempDir::new().unwrap();
        let verifier = FileVerifier::new(dir.path().to_path_buf());

        let result = verifier
            .verify_file_reference(&PathBuf::from("nonexistent.txt"), None)
            .await
            .unwrap();

        assert!(!result.verified);
        assert!(result.actual_value.is_some());
        assert!(result.actual_value.unwrap().contains("does not exist"));
    }

    #[tokio::test]
    async fn test_verify_line_in_range() {
        let dir = TempDir::new().unwrap();
        create_test_file(&dir, "test.txt", "line 1\nline 2\nline 3\n");

        let verifier = FileVerifier::new(dir.path().to_path_buf());
        let result = verifier
            .verify_file_reference(&PathBuf::from("test.txt"), Some(2))
            .await
            .unwrap();

        assert!(result.verified);
    }

    #[tokio::test]
    async fn test_verify_line_out_of_range() {
        let dir = TempDir::new().unwrap();
        create_test_file(&dir, "test.txt", "line 1\nline 2\nline 3\n");

        let verifier = FileVerifier::new(dir.path().to_path_buf());
        let result = verifier
            .verify_file_reference(&PathBuf::from("test.txt"), Some(10))
            .await
            .unwrap();

        assert!(!result.verified);
        assert!(result.actual_value.is_some());
        assert!(result.actual_value.unwrap().contains("out of range"));
    }

    #[tokio::test]
    async fn test_verify_batch() {
        let dir = TempDir::new().unwrap();
        create_test_file(&dir, "file1.txt", "content1\n");
        create_test_file(&dir, "file2.txt", "content2\n");

        let verifier = FileVerifier::new(dir.path().to_path_buf());
        let references = vec![
            (PathBuf::from("file1.txt"), None),
            (PathBuf::from("file2.txt"), Some(1)),
            (PathBuf::from("nonexistent.txt"), None),
        ];

        let results = verifier.verify_batch(&references).await.unwrap();

        assert_eq!(results.len(), 3);
        assert!(results[0].verified);  // file1 exists
        assert!(results[1].verified);  // file2 line 1 valid
        assert!(!results[2].verified); // nonexistent fails
    }
}
