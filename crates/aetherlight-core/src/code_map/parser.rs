/**
 * Rust Parser - Tree-sitter based AST parsing
 *
 * DESIGN DECISION: Use tree-sitter for accurate syntax parsing
 * WHY: Regex fails on complex Rust syntax (macros, nested generics, procedural macros)
 *
 * REASONING CHAIN:
 * 1. Need to extract imports, exports, function calls from Rust code
 * 2. Regex-based parsing misses edge cases (comments, strings, macros)
 * 3. tree-sitter provides 100% accurate AST
 * 4. tree-sitter-rust crate provides Rust language grammar
 * 5. Can query AST for specific node types (use_declaration, function_item)
 * 6. Extensible to other languages (TypeScript, Python) in Phase 3.7
 *
 * PATTERN: Pattern-CODEMAP-001 (Dependency Graph Generation)
 * RELATED: AI-001, code intelligence module
 * PERFORMANCE: <100ms per file (5K LOC), <5s for 50 files (50K LOC project)
 */

use crate::code_map::{Import, Module, Symbol, SymbolType, Visibility};
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

/// Rust parser using tree-sitter
///
/// NOTE: For Phase 3.6 MVP, we implement a placeholder parser that uses
/// simple pattern matching. Full tree-sitter integration will be completed
/// when tree-sitter dependencies are re-enabled (currently commented out
/// due to C compiler requirements).
///
/// DESIGN DECISION: MVP uses regex-based parsing, production uses tree-sitter
/// WHY: Unblock Phase 3.6 development while maintaining upgrade path
pub struct RustParser {
    // Future: tree-sitter parser state
    // parser: tree_sitter::Parser,
    // language: tree_sitter::Language,
}

impl RustParser {
    /// Create a new Rust parser
    ///
    /// DESIGN DECISION: Initialize tree-sitter with Rust grammar
    /// WHY: Rust grammar provides accurate parsing of all Rust syntax
    pub fn new() -> Result<Self, String> {
        // TODO: Initialize tree-sitter when dependencies re-enabled
        // let mut parser = tree_sitter::Parser::new();
        // parser.set_language(tree_sitter_rust::language())
        //     .map_err(|e| format!("Failed to set language: {}", e))?;

        Ok(Self {
            // parser,
            // language: tree_sitter_rust::language(),
        })
    }

    /// Parse all Rust files in a project
    ///
    /// DESIGN DECISION: Walk src/ directories recursively
    /// WHY: Standard Rust project layout (src/ contains source code)
    ///
    /// PERFORMANCE: <5s for 50K LOC project (parallelizable)
    pub fn parse_project(&self, root: &Path) -> Result<Vec<Module>, String> {
        let mut modules = Vec::new();

        // Find all .rs files in src/ directories
        for entry in WalkDir::new(root)
            .follow_links(true)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();

            // Only process .rs files in src/ directories
            if path.extension().and_then(|s| s.to_str()) == Some("rs")
                && path.to_str().map(|s| s.contains("src")).unwrap_or(false)
            {
                // Skip test files for MVP
                if path.to_str().map(|s| s.contains("test")).unwrap_or(false) {
                    continue;
                }

                match self.parse_file(path, root) {
                    Ok(module) => modules.push(module),
                    Err(e) => {
                        // Log error but continue parsing other files
                        eprintln!("Warning: Failed to parse {}: {}", path.display(), e);
                    }
                }
            }
        }

        Ok(modules)
    }

    /// Parse a single Rust file
    ///
    /// DESIGN DECISION: Extract imports, exports, LOC from AST
    /// WHY: These are critical for dependency graph construction
    pub fn parse_file(&self, path: &Path, root: &Path) -> Result<Module, String> {
        // Read file contents
        let contents = fs::read_to_string(path)
            .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;

        // Derive module name from file path
        let module_name = self.derive_module_name(path, root);

        // Create module
        let mut module = Module::new(
            path.strip_prefix(root)
                .unwrap_or(path)
                .to_path_buf(),
            module_name,
        );

        // MVP: Simple pattern-based parsing
        // TODO: Replace with tree-sitter AST queries when dependencies enabled
        module.imports = self.extract_imports_simple(&contents);
        module.exports = self.extract_exports_simple(&contents);
        module.loc = self.count_loc(&contents);

        Ok(module)
    }

    /// Derive module name from file path
    ///
    /// DESIGN DECISION: Convert path to module-style name
    /// WHY: Matches Rust module system conventions
    ///
    /// Example: "src/domain_agent.rs" → "domain_agent"
    ///          "src/network/dht.rs" → "network::dht"
    fn derive_module_name(&self, path: &Path, root: &Path) -> String {
        let relative = path.strip_prefix(root).unwrap_or(path);

        // Remove src/ prefix if present
        let relative = relative
            .to_str()
            .unwrap_or("")
            .trim_start_matches("src/")
            .trim_start_matches("src\\");

        // Remove .rs extension
        let relative = relative.trim_end_matches(".rs");

        // Replace path separators with ::
        relative.replace('/', "::").replace('\\', "::")
    }

    /// Extract imports from file contents (MVP implementation)
    ///
    /// DESIGN DECISION: Parse "use" statements with regex
    /// WHY: Simple pattern matching sufficient for MVP, upgrade to tree-sitter later
    fn extract_imports_simple(&self, contents: &str) -> Vec<Import> {
        let mut imports = Vec::new();

        for (line_num, line) in contents.lines().enumerate() {
            let trimmed = line.trim();

            // Match "use" statements
            if trimmed.starts_with("use ") && trimmed.ends_with(';') {
                // Extract path between "use" and ";"
                let path_part = trimmed
                    .trim_start_matches("use ")
                    .trim_end_matches(';')
                    .trim();

                // Handle different import styles
                let (path, symbols) = if path_part.contains('{') {
                    // use std::collections::{HashMap, HashSet};
                    let parts: Vec<&str> = path_part.split('{').collect();
                    let base_path = parts[0].trim().trim_end_matches("::").to_string();
                    let symbols_str = parts
                        .get(1)
                        .unwrap_or(&"")
                        .trim_end_matches('}')
                        .trim();
                    let symbols: Vec<String> = symbols_str
                        .split(',')
                        .map(|s| s.trim().to_string())
                        .filter(|s| !s.is_empty())
                        .collect();
                    (base_path, symbols)
                } else if path_part.contains("::*") {
                    // use std::collections::*;
                    (path_part.trim_end_matches("::*").to_string(), vec![])
                } else {
                    // use std::collections::HashMap;
                    (path_part.to_string(), vec![])
                };

                imports.push(Import {
                    path,
                    symbols,
                    line: line_num + 1,
                });
            }
        }

        imports
    }

    /// Extract exports from file contents (MVP implementation)
    ///
    /// DESIGN DECISION: Parse "pub" declarations with pattern matching
    /// WHY: Identify exported symbols for dependency graph
    fn extract_exports_simple(&self, contents: &str) -> Vec<Symbol> {
        let mut exports = Vec::new();

        for line in contents.lines() {
            let trimmed = line.trim();

            // Match public declarations
            if trimmed.starts_with("pub ") {
                if trimmed.contains("fn ") {
                    // pub fn function_name
                    if let Some(name) = self.extract_function_name(trimmed) {
                        exports.push(Symbol {
                            name,
                            symbol_type: SymbolType::Function,
                            visibility: Visibility::Public,
                        });
                    }
                } else if trimmed.contains("struct ") {
                    // pub struct StructName
                    if let Some(name) = self.extract_type_name(trimmed, "struct") {
                        exports.push(Symbol {
                            name,
                            symbol_type: SymbolType::Struct,
                            visibility: Visibility::Public,
                        });
                    }
                } else if trimmed.contains("enum ") {
                    // pub enum EnumName
                    if let Some(name) = self.extract_type_name(trimmed, "enum") {
                        exports.push(Symbol {
                            name,
                            symbol_type: SymbolType::Enum,
                            visibility: Visibility::Public,
                        });
                    }
                } else if trimmed.contains("trait ") {
                    // pub trait TraitName
                    if let Some(name) = self.extract_type_name(trimmed, "trait") {
                        exports.push(Symbol {
                            name,
                            symbol_type: SymbolType::Trait,
                            visibility: Visibility::Public,
                        });
                    }
                } else if trimmed.contains("const ") {
                    // pub const CONST_NAME
                    if let Some(name) = self.extract_const_name(trimmed) {
                        exports.push(Symbol {
                            name,
                            symbol_type: SymbolType::Const,
                            visibility: Visibility::Public,
                        });
                    }
                } else if trimmed.contains("type ") {
                    // pub type TypeAlias
                    if let Some(name) = self.extract_type_name(trimmed, "type") {
                        exports.push(Symbol {
                            name,
                            symbol_type: SymbolType::Type,
                            visibility: Visibility::Public,
                        });
                    }
                }
            }
        }

        exports
    }

    /// Extract function name from declaration
    fn extract_function_name(&self, line: &str) -> Option<String> {
        // pub fn function_name(...) or pub async fn function_name(...)
        let after_fn = line.split("fn ").nth(1)?;
        let name = after_fn.split('(').next()?.trim();
        Some(name.to_string())
    }

    /// Extract type name from declaration
    fn extract_type_name(&self, line: &str, keyword: &str) -> Option<String> {
        // pub struct StructName or pub enum EnumName
        let after_keyword = line.split(&format!("{} ", keyword)).nth(1)?;
        let name = after_keyword
            .split(|c: char| c.is_whitespace() || c == '<' || c == '{')
            .next()?
            .trim();
        Some(name.to_string())
    }

    /// Extract const name from declaration
    fn extract_const_name(&self, line: &str) -> Option<String> {
        // pub const CONST_NAME: Type = ...
        let after_const = line.split("const ").nth(1)?;
        let name = after_const.split(':').next()?.trim();
        Some(name.to_string())
    }

    /// Count lines of code (excluding comments and blank lines)
    ///
    /// DESIGN DECISION: Count non-comment, non-blank lines
    /// WHY: Provides accurate measure of code size for impact estimation
    fn count_loc(&self, contents: &str) -> usize {
        contents
            .lines()
            .filter(|line| {
                let trimmed = line.trim();
                !trimmed.is_empty() && !trimmed.starts_with("//") && !trimmed.starts_with("/*")
            })
            .count()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_derive_module_name() {
        let parser = RustParser::new().unwrap();
        let root = Path::new("/project");

        let name = parser.derive_module_name(
            Path::new("/project/src/domain_agent.rs"),
            root,
        );
        assert_eq!(name, "domain_agent");

        let name = parser.derive_module_name(
            Path::new("/project/src/network/dht.rs"),
            root,
        );
        assert_eq!(name, "network::dht");
    }

    #[test]
    fn test_extract_imports_simple() {
        let parser = RustParser::new().unwrap();
        let contents = r#"
            use std::collections::HashMap;
            use std::path::{Path, PathBuf};
            use crate::embeddings::*;
        "#;

        let imports = parser.extract_imports_simple(contents);
        assert_eq!(imports.len(), 3);

        assert_eq!(imports[0].path, "std::collections::HashMap");
        assert_eq!(imports[0].symbols.len(), 0);

        assert_eq!(imports[1].path, "std::path");
        assert_eq!(imports[1].symbols.len(), 2);
        assert_eq!(imports[1].symbols[0], "Path");
        assert_eq!(imports[1].symbols[1], "PathBuf");

        assert_eq!(imports[2].path, "crate::embeddings");
        assert_eq!(imports[2].symbols.len(), 0);
    }

    #[test]
    fn test_extract_exports_simple() {
        let parser = RustParser::new().unwrap();
        let contents = r#"
            pub fn process() {}
            pub struct Config {}
            pub enum Status { Ok, Error }
            pub trait Validate {}
            pub const MAX_SIZE: usize = 1000;
            pub type Result<T> = std::result::Result<T, Error>;
        "#;

        let exports = parser.extract_exports_simple(contents);
        assert_eq!(exports.len(), 6);

        assert_eq!(exports[0].name, "process");
        assert_eq!(exports[0].symbol_type, SymbolType::Function);

        assert_eq!(exports[1].name, "Config");
        assert_eq!(exports[1].symbol_type, SymbolType::Struct);

        assert_eq!(exports[2].name, "Status");
        assert_eq!(exports[2].symbol_type, SymbolType::Enum);

        assert_eq!(exports[3].name, "Validate");
        assert_eq!(exports[3].symbol_type, SymbolType::Trait);

        assert_eq!(exports[4].name, "MAX_SIZE");
        assert_eq!(exports[4].symbol_type, SymbolType::Const);

        assert_eq!(exports[5].name, "Result");
        assert_eq!(exports[5].symbol_type, SymbolType::Type);
    }

    #[test]
    fn test_count_loc() {
        let parser = RustParser::new().unwrap();
        let contents = r#"
            // This is a comment
            pub fn process() {
                let x = 5;
                // Another comment

                x + 1
            }
        "#;

        let loc = parser.count_loc(contents);
        assert_eq!(loc, 5); // Only non-comment, non-blank lines
    }
}
