/**
 * Documentation Tracker - Monitor documentation coverage and freshness
 *
 * DESIGN DECISION: Track documentation quality metrics (not just presence)
 * WHY: Prompt user to update docs when code changes but docs don't
 *
 * REASONING CHAIN:
 * 1. User adds 500 lines of code across 5 files
 * 2. README.md not updated in 3 days
 * 3. DocTracker calculates doc_coverage drops (more code, same docs)
 * 4. System prompts: "Update README with recent changes?"
 * 5. Result: Documentation stays current with codebase
 *
 * PATTERN: Pattern-MONITOR-003 (Documentation Quality Tracking)
 * RELATED: DocumentationContext, SystemContextProvider
 * PERFORMANCE: <100ms coverage calculation, 30s polling interval
 */

use std::path::{Path, PathBuf};
use tokio::sync::mpsc::Sender;
use tokio::time::{Duration, interval};
use anyhow::Result;
use std::fs;

use super::types::DocUpdate;

/**
 * DocTracker - Monitor documentation files and coverage
 *
 * USAGE:
 * ```rust
 * let tracker = DocTracker::new("/path/to/workspace")?;
 * let (tx, rx) = mpsc::channel(100);
 * tracker.start(tx).await?;
 *
 * // Receive doc updates
 * while let Some(update) = rx.recv().await {
 *     println!("Doc coverage: {:.1}%", update.doc_coverage * 100.0);
 * }
 * ```
 */
pub struct DocTracker {
    workspace_path: PathBuf,
}

impl DocTracker {
    /**
     * Create new documentation tracker
     *
     * @param workspace_path - Root directory to analyze
     */
    pub fn new(workspace_path: &str) -> Result<Self> {
        let path = PathBuf::from(workspace_path);
        if !path.exists() {
            anyhow::bail!("Workspace path does not exist: {}", workspace_path);
        }

        Ok(Self {
            workspace_path: path,
        })
    }

    /**
     * Start tracking documentation (spawns background task)
     *
     * DESIGN DECISION: Poll every 30 seconds (not every 5s like git)
     * WHY: Documentation changes less frequently, lower priority
     *
     * @param tx - Channel to send DocUpdate events
     */
    pub async fn start(&self, tx: Sender<DocUpdate>) -> Result<()> {
        let workspace_path = self.workspace_path.clone();

        tokio::spawn(async move {
            let mut ticker = interval(Duration::from_secs(30));

            loop {
                ticker.tick().await;

                match Self::analyze_documentation(&workspace_path) {
                    Ok(update) => {
                        if let Err(e) = tx.send(update).await {
                            eprintln!("DocTracker: Failed to send update: {}", e);
                            break;
                        }
                    }
                    Err(e) => {
                        eprintln!("DocTracker: Analysis failed: {}", e);
                    }
                }
            }
        });

        Ok(())
    }

    /**
     * Analyze documentation coverage (blocking)
     *
     * DESIGN DECISION: Simple heuristic (doc lines / code lines)
     * WHY: Fast, good enough for prompting (don't need perfect accuracy)
     *
     * REASONING CHAIN:
     * 1. Find README.md, get last modified time
     * 2. Find all doc files (*.md in docs/, README*, CHANGELOG*, etc.)
     * 3. Count doc lines vs code lines
     * 4. Calculate coverage: doc_lines / code_lines
     * 5. Return DocUpdate
     *
     * HEURISTIC:
     * - 1 doc line per 10 code lines = 100% coverage (0.1 ratio)
     * - More docs = higher coverage (capped at 1.0)
     * - Less docs = lower coverage
     *
     * @return DocUpdate with documentation metrics
     */
    fn analyze_documentation(workspace_path: &Path) -> Result<DocUpdate> {
        // Find README.md
        let readme_path = workspace_path.join("README.md");
        let readme_last_modified = if readme_path.exists() {
            Some(
                fs::metadata(&readme_path)?
                    .modified()?
                    .into(),
            )
        } else {
            None
        };

        // Find all documentation files
        let doc_files = Self::find_doc_files(workspace_path);

        // Calculate documentation coverage
        let doc_coverage = Self::calculate_coverage(workspace_path, &doc_files)?;

        Ok(DocUpdate {
            readme_last_modified,
            doc_files,
            doc_coverage,
        })
    }

    /**
     * Find all documentation files in workspace
     *
     * DESIGN DECISION: Scan specific patterns (README*, docs/, *.md)
     * WHY: Fast, covers 95% of projects
     *
     * PATTERNS:
     * - README.md, README.txt, README
     * - CHANGELOG.md, CONTRIBUTING.md, LICENSE.md
     * - docs/**/*.md
     * - *.mdx (MDX documentation)
     *
     * @return Vec of documentation file paths
     */
    fn find_doc_files(workspace_path: &Path) -> Vec<PathBuf> {
        let mut doc_files = Vec::new();

        // Check root-level doc files
        let root_docs = [
            "README.md",
            "README.txt",
            "README",
            "CHANGELOG.md",
            "CONTRIBUTING.md",
            "LICENSE.md",
            "LICENSE",
        ];

        for file in &root_docs {
            let path = workspace_path.join(file);
            if path.exists() {
                doc_files.push(path);
            }
        }

        // Check docs/ directory
        let docs_dir = workspace_path.join("docs");
        if docs_dir.exists() {
            if let Ok(entries) = Self::walk_dir(&docs_dir, &[".md", ".mdx"]) {
                doc_files.extend(entries);
            }
        }

        doc_files
    }

    /**
     * Walk directory recursively, collect files with extensions
     *
     * @param dir - Directory to walk
     * @param extensions - File extensions to match (e.g., [".md", ".mdx"])
     * @return Vec of matching file paths
     */
    fn walk_dir(dir: &Path, extensions: &[&str]) -> Result<Vec<PathBuf>> {
        let mut files = Vec::new();

        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                // Ignore .git/, node_modules/
                if let Some(name) = path.file_name() {
                    let name_str = name.to_string_lossy();
                    if name_str == ".git" || name_str == "node_modules" {
                        continue;
                    }
                }

                files.extend(Self::walk_dir(&path, extensions)?);
            } else if let Some(ext) = path.extension() {
                let ext_str = format!(".{}", ext.to_string_lossy());
                if extensions.contains(&ext_str.as_str()) {
                    files.push(path);
                }
            }
        }

        Ok(files)
    }

    /**
     * Calculate documentation coverage
     *
     * DESIGN DECISION: Heuristic based on line counts
     * WHY: Fast, directionally correct
     *
     * FORMULA:
     * - doc_lines = total lines in all doc files
     * - code_lines = total lines in all code files
     * - coverage = min(doc_lines / (code_lines * 0.1), 1.0)
     * - Expected: 1 doc line per 10 code lines = 100%
     *
     * @param workspace_path - Workspace root
     * @param doc_files - Already found documentation files
     * @return Coverage ratio 0.0-1.0
     */
    fn calculate_coverage(workspace_path: &Path, doc_files: &[PathBuf]) -> Result<f32> {
        // Count doc lines
        let doc_lines: usize = doc_files
            .iter()
            .filter_map(|path| fs::read_to_string(path).ok())
            .map(|content| content.lines().count())
            .sum();

        // Count code lines (simplified: src/**/*.{rs,ts,js,py,go,java})
        let code_extensions = [".rs", ".ts", ".js", ".tsx", ".jsx", ".py", ".go", ".java"];
        let src_dir = workspace_path.join("src");

        let code_lines: usize = if src_dir.exists() {
            Self::walk_dir(&src_dir, &code_extensions)?
                .iter()
                .filter_map(|path| fs::read_to_string(path).ok())
                .map(|content| content.lines().count())
                .sum()
        } else {
            1 // Avoid division by zero
        };

        // Calculate coverage (cap at 100%)
        let coverage = (doc_lines as f32 / (code_lines as f32 * 0.1)).min(1.0);

        Ok(coverage)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_find_doc_files() {
        let temp_dir = tempfile::tempdir().unwrap();
        let workspace = temp_dir.path();

        // Create doc files
        fs::write(workspace.join("README.md"), "# Test").unwrap();
        fs::write(workspace.join("CHANGELOG.md"), "# Changelog").unwrap();

        fs::create_dir(workspace.join("docs")).unwrap();
        fs::write(workspace.join("docs/guide.md"), "# Guide").unwrap();

        let doc_files = DocTracker::find_doc_files(workspace);

        assert!(doc_files.len() >= 3);
        assert!(doc_files.iter().any(|p| p.ends_with("README.md")));
        assert!(doc_files.iter().any(|p| p.ends_with("CHANGELOG.md")));
        assert!(doc_files.iter().any(|p| p.ends_with("guide.md")));
    }

    #[test]
    fn test_calculate_coverage() {
        let temp_dir = tempfile::tempdir().unwrap();
        let workspace = temp_dir.path();

        // Create src/ with code
        fs::create_dir(workspace.join("src")).unwrap();
        let code_content = "fn main() {\n    println!(\"Hello\");\n}\n"; // 3 lines
        fs::write(workspace.join("src/main.rs"), code_content).unwrap();

        // Create docs
        let readme_path = workspace.join("README.md");
        fs::write(&readme_path, "# Test\nDoc line 1\n").unwrap(); // 2 lines

        let doc_files = vec![readme_path];

        // Coverage = doc_lines / (code_lines * 0.1)
        //          = 2 / (3 * 0.1) = 2 / 0.3 = 6.67 (capped at 1.0)
        let coverage = DocTracker::calculate_coverage(workspace, &doc_files).unwrap();

        assert!(coverage > 0.0);
        assert!(coverage <= 1.0);
    }

    #[tokio::test]
    async fn test_doc_tracker_new() {
        let temp_dir = tempfile::tempdir().unwrap();
        let workspace_path = temp_dir.path().to_str().unwrap();

        let tracker = DocTracker::new(workspace_path);
        assert!(tracker.is_ok());
    }
}
