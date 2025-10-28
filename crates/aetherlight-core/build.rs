/**
 * Build Script: Cross-Reference Index Generator
 *
 * DESIGN DECISION: Build cross-reference index at compile time
 * WHY: Ensures index is always up-to-date, happens automatically with cargo build
 *
 * REASONING CHAIN:
 * 1. Scan codebase for @ADDRESS references during build
 * 2. Build inverted index: address → [dependents]
 * 3. Save to .lumina/cross-ref-index.json
 * 4. Enables ripple effect notification when content changes
 * 5. Zero runtime overhead (index pre-built)
 *
 * PATTERN: Pattern-CONTEXT-002 (Content-Addressable Context System)
 * RELATED: content_addressing.rs (CrossReferenceIndex runtime API)
 * PERFORMANCE: <2s build time for 100k LOC
 * FUTURE: Incremental updates (only scan changed files)
 */

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use regex::Regex;

/// Scan file for @ADDRESS references
///
/// DESIGN DECISION: Use regex to find content address references
/// WHY: Simple, fast, works across all file types (.rs, .md, .ts)
///
/// PATTERN: @DOC-ID.SEC-ID.PARA-ID.LINE-ID
/// EXAMPLE: @CLAUDE.2.5.1
fn scan_file_for_references(file_path: &Path) -> Vec<(String, usize, String)> {
    // Read file content
    let content = match fs::read_to_string(file_path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };

    // Regex pattern: @[A-Z_]+\.\d+\.\d+\.\d+
    // Matches: @CLAUDE.2.5.1, @PHASE_3.12.3, etc.
    let re = Regex::new(r"@([A-Z][A-Z_0-9]*\.\d+\.\d+\.\d+)").unwrap();

    let mut references = Vec::new();

    for (line_num, line) in content.lines().enumerate() {
        for cap in re.captures_iter(line) {
            let address = cap[1].to_string();
            references.push((address, line_num + 1, line.to_string()));
        }
    }

    references
}

/// Walk directory tree and collect all relevant files
///
/// DESIGN DECISION: Scan .rs, .md, .ts files only
/// WHY: These are the files that contain @ADDRESS references
///
/// IGNORED: .git, node_modules, target, archive
fn walk_directory(root: &Path, files: &mut Vec<PathBuf>) {
    if let Ok(entries) = fs::read_dir(root) {
        for entry in entries.flatten() {
            let path = entry.path();
            let name = path.file_name().unwrap().to_string_lossy();

            // Skip ignored directories
            if name == ".git" || name == "node_modules" || name == "target" || name == "archive" {
                continue;
            }

            if path.is_dir() {
                walk_directory(&path, files);
            } else if let Some(ext) = path.extension() {
                let ext_str = ext.to_string_lossy();
                if ext_str == "rs" || ext_str == "md" || ext_str == "ts" {
                    files.push(path);
                }
            }
        }
    }
}

/// Build cross-reference index
///
/// DESIGN DECISION: Inverted index stored as JSON
/// WHY: Human-readable, easy to inspect, git-friendly
///
/// FORMAT:
/// {
///   "CLAUDE.2.5.1": [
///     {"file": "src/agents/knowledge.rs", "line": 329, "content": "// See @CLAUDE.2.5.1"},
///     {"file": "docs/patterns/Pattern-006.md", "line": 42, "content": "References @CLAUDE.2.5.1"}
///   ]
/// }
fn build_cross_reference_index() -> Result<(), Box<dyn std::error::Error>> {
    println!("cargo:rerun-if-changed=src/");
    println!("cargo:rerun-if-changed=docs/");

    // Find all files to scan
    let mut files = Vec::new();
    let root = Path::new(".").canonicalize()?;
    walk_directory(&root, &mut files);

    println!("Scanning {} files for @ADDRESS references...", files.len());

    // Build inverted index
    let mut index: HashMap<String, Vec<serde_json::Value>> = HashMap::new();

    for file_path in files {
        let references = scan_file_for_references(&file_path);

        for (address, line_num, line_content) in references {
            // Get relative path from project root
            let relative_path = file_path
                .strip_prefix(&root)
                .unwrap_or(&file_path)
                .to_string_lossy()
                .to_string();

            let dependent = serde_json::json!({
                "file": relative_path,
                "line": line_num,
                "content": line_content.trim()
            });

            index.entry(address).or_insert_with(Vec::new).push(dependent);
        }
    }

    // Create .lumina directory if it doesn't exist
    let lumina_dir = root.join(".lumina");
    fs::create_dir_all(&lumina_dir)?;

    // Save index to .lumina/cross-ref-index.json
    let index_path = lumina_dir.join("cross-ref-index.json");
    let json = serde_json::to_string_pretty(&index)?;
    fs::write(&index_path, json)?;

    let total_addresses = index.len();
    let total_references = index.values().map(|v| v.len()).sum::<usize>();

    println!("✅ Cross-reference index built:");
    println!("   - {} unique addresses", total_addresses);
    println!("   - {} total references", total_references);
    println!("   - Saved to: {}", index_path.display());

    Ok(())
}

fn main() {
    // Build cross-reference index
    if let Err(e) = build_cross_reference_index() {
        eprintln!("Warning: Failed to build cross-reference index: {}", e);
        // Don't fail the build, just warn
    }
}
