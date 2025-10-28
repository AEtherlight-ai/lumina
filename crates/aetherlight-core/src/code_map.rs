/**
 * Code Map Generator - Dependency Graph and Impact Analysis
 *
 * DESIGN DECISION: Use tree-sitter for accurate AST parsing, not regex
 * WHY: Need precise dependency tracking for impact analysis
 *
 * REASONING CHAIN:
 * 1. Agents need to understand "what breaks if I change X"
 * 2. Regex-based parsing fails on complex syntax (macros, nested imports)
 * 3. tree-sitter provides accurate AST with language support
 * 4. Dependency graph enables impact radius calculation
 * 5. JSON export allows agents to query without parsing
 * 6. Git hook keeps map synchronized on every commit
 *
 * PATTERN: Pattern-CODEMAP-001 (Dependency Graph Generation)
 * RELATED: AI-001, verification system, session handoff
 * PERFORMANCE: <5s for 50K LOC project, <2s for incremental updates
 */

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};

pub mod parser;
pub mod dependency_graph;
pub mod impact_analyzer;
pub mod exporter;

// Re-exports for convenience
pub use parser::RustParser;
pub use dependency_graph::DependencyGraph;
pub use impact_analyzer::ImpactAnalyzer;
pub use exporter::JsonExporter;

/// Unique identifier for a module
pub type ModuleId = String;

/// Symbol exported by a module (function, struct, trait, etc.)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Symbol {
    /// Symbol name
    pub name: String,

    /// Symbol type (function, struct, trait, const, etc.)
    pub symbol_type: SymbolType,

    /// Visibility (public, crate-local, private)
    pub visibility: Visibility,
}

/// Type of symbol
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SymbolType {
    Function,
    Struct,
    Enum,
    Trait,
    Const,
    Static,
    Type,
    Macro,
}

/// Visibility level
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Visibility {
    Public,
    Crate,
    Private,
}

/// Import statement in a module
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Import {
    /// Module path being imported (e.g., "std::collections::HashMap")
    pub path: String,

    /// Specific symbols imported (empty = wildcard or module itself)
    pub symbols: Vec<String>,

    /// Line number where import occurs
    pub line: usize,
}

/// Module in the codebase
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Module {
    /// File path relative to project root
    pub path: PathBuf,

    /// Module name (derived from path)
    pub name: String,

    /// Symbols exported by this module
    pub exports: Vec<Symbol>,

    /// Import statements in this module
    pub imports: Vec<Import>,

    /// Lines of code (excluding comments and blank lines)
    pub loc: usize,

    /// Modules that import from this module
    pub imported_by: Vec<ModuleId>,

    /// Impact radius (number of modules affected by changes)
    pub impact_radius: usize,
}

impl Module {
    /// Create a new module
    pub fn new(path: PathBuf, name: String) -> Self {
        Self {
            path,
            name,
            exports: Vec::new(),
            imports: Vec::new(),
            loc: 0,
            imported_by: Vec::new(),
            impact_radius: 0,
        }
    }

    /// Get module ID (unique identifier)
    pub fn id(&self) -> ModuleId {
        self.name.clone()
    }
}

/// Type of dependency between modules
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DependencyType {
    /// Direct import (use statement)
    Import,

    /// Function call across modules
    Call,

    /// Data flow (passing data between modules)
    DataFlow,
}

/// Dependency between two modules
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dependency {
    /// Source module
    pub from: ModuleId,

    /// Target module
    pub to: ModuleId,

    /// Type of dependency
    pub dep_type: DependencyType,

    /// Specific locations where dependency occurs (file:line)
    pub locations: Vec<String>,
}

impl Dependency {
    /// Create a new dependency
    pub fn new(from: ModuleId, to: ModuleId, dep_type: DependencyType) -> Self {
        Self {
            from,
            to,
            dep_type,
            locations: Vec::new(),
        }
    }

    /// Add a location where this dependency occurs
    pub fn add_location(&mut self, file: &str, line: usize) {
        self.locations.push(format!("{}:{}", file, line));
    }
}

/// Call graph node (function)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallNode {
    /// Function name
    pub name: String,

    /// Module containing this function
    pub module: ModuleId,

    /// Functions called by this function
    pub calls: Vec<String>,

    /// Functions that call this function
    pub called_by: Vec<String>,
}

/// Call graph for the entire codebase
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallGraph {
    /// All function nodes
    pub nodes: HashMap<String, CallNode>,
}

impl CallGraph {
    /// Create an empty call graph
    pub fn new() -> Self {
        Self {
            nodes: HashMap::new(),
        }
    }

    /// Add a function call relationship
    pub fn add_call(&mut self, caller: String, callee: String) {
        // Add caller node if doesn't exist
        self.nodes.entry(caller.clone()).or_insert_with(|| CallNode {
            name: caller.clone(),
            module: String::new(), // Will be set by caller
            calls: Vec::new(),
            called_by: Vec::new(),
        });

        // Add callee node if doesn't exist
        self.nodes.entry(callee.clone()).or_insert_with(|| CallNode {
            name: callee.clone(),
            module: String::new(),
            calls: Vec::new(),
            called_by: Vec::new(),
        });

        // Record the call relationship
        if let Some(caller_node) = self.nodes.get_mut(&caller) {
            if !caller_node.calls.contains(&callee) {
                caller_node.calls.push(callee.clone());
            }
        }

        if let Some(callee_node) = self.nodes.get_mut(&callee) {
            if !callee_node.called_by.contains(&caller) {
                callee_node.called_by.push(caller);
            }
        }
    }
}

impl Default for CallGraph {
    fn default() -> Self {
        Self::new()
    }
}

/// Data flow between modules
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataFlow {
    /// Source module producing data
    pub from: ModuleId,

    /// Target module consuming data
    pub to: ModuleId,

    /// Data type being passed
    pub data_type: String,
}

/// Complete code map for a project
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeMap {
    /// Project root directory
    pub root: PathBuf,

    /// All modules in the project
    pub modules: Vec<Module>,

    /// Dependencies between modules
    pub dependencies: Vec<Dependency>,

    /// Call graph (function-level dependencies)
    pub call_graph: CallGraph,

    /// Data flows between modules
    pub data_flows: Vec<DataFlow>,

    /// Timestamp when map was generated
    pub generated_at: String,
}

impl CodeMap {
    /// Create a new empty code map
    pub fn new(root: PathBuf) -> Self {
        Self {
            root,
            modules: Vec::new(),
            dependencies: Vec::new(),
            call_graph: CallGraph::new(),
            data_flows: Vec::new(),
            generated_at: chrono::Utc::now().to_rfc3339(),
        }
    }

    /// Build code map from project root
    ///
    /// DESIGN DECISION: Parse all Rust files in src/ directories
    /// WHY: Focuses on source code, ignores tests/examples for initial map
    ///
    /// PERFORMANCE: <5s for 50K LOC project
    pub fn build(root: &Path) -> Result<Self, String> {
        let mut map = Self::new(root.to_path_buf());

        // Step 1: Parse all Rust files and extract modules
        let parser = RustParser::new()?;
        let modules = parser.parse_project(root)?;
        map.modules = modules;

        // Step 2: Build dependency graph
        let graph = DependencyGraph::build(&map.modules)?;
        map.dependencies = graph.dependencies;
        map.call_graph = graph.call_graph;
        map.data_flows = graph.data_flows;

        // Step 3: Calculate impact radius for each module
        // Note: Create analyzer, calculate all radii, then update modules
        // (avoids borrow checker error: analyzer needs immutable reference to map)
        let analyzer = ImpactAnalyzer::new(&map);
        let radii: Vec<(String, usize, Vec<String>)> = map
            .modules
            .iter()
            .map(|m| {
                let id = m.id();
                let radius = analyzer.calculate_impact_radius(&id);
                let importers = analyzer.find_importers(&id);
                (id, radius, importers)
            })
            .collect();

        // Now update modules with calculated values
        for (id, radius, importers) in radii {
            if let Some(module) = map.modules.iter_mut().find(|m| m.id() == id) {
                module.impact_radius = radius;
                module.imported_by = importers;
            }
        }

        Ok(map)
    }

    /// Find all modules that depend on the given module
    ///
    /// DESIGN DECISION: Recursive traversal with cycle detection
    /// WHY: Some codebases have circular dependencies
    pub fn find_dependents(&self, module_id: &str) -> Vec<&Module> {
        let mut result = Vec::new();
        let mut visited = HashSet::new();
        self.find_dependents_recursive(module_id, &mut result, &mut visited);
        result
    }

    fn find_dependents_recursive<'a>(
        &'a self,
        module_id: &str,
        result: &mut Vec<&'a Module>,
        visited: &mut HashSet<String>,
    ) {
        if visited.contains(module_id) {
            return;
        }
        visited.insert(module_id.to_string());

        // Find all modules that import this module
        for dep in &self.dependencies {
            if dep.to == module_id && dep.dep_type == DependencyType::Import {
                if let Some(module) = self.modules.iter().find(|m| m.id() == dep.from) {
                    result.push(module);
                    // Recursively find dependents of dependents
                    self.find_dependents_recursive(&dep.from, result, visited);
                }
            }
        }
    }

    /// Calculate impact radius (number of modules affected by changing this module)
    ///
    /// DESIGN DECISION: Count unique modules in dependency tree
    /// WHY: Provides quick estimate of change impact
    pub fn impact_radius(&self, module_id: &str) -> usize {
        self.find_dependents(module_id).len()
    }

    /// Find module by name
    pub fn find_module(&self, name: &str) -> Option<&Module> {
        self.modules.iter().find(|m| m.name == name)
    }

    /// Export code map to JSON
    ///
    /// DESIGN DECISION: Pretty-printed JSON for human readability
    /// WHY: Developers may manually inspect .lumina/code-map.json
    ///
    /// PERFORMANCE: <2s for full codebase export
    pub fn to_json(&self) -> Result<String, String> {
        JsonExporter::export(self)
    }

    /// Load code map from JSON file
    pub fn from_json(json: &str) -> Result<Self, String> {
        serde_json::from_str(json).map_err(|e| format!("Failed to parse JSON: {}", e))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_module_creation() {
        let module = Module::new(
            PathBuf::from("src/embeddings.rs"),
            "embeddings".to_string(),
        );
        assert_eq!(module.name, "embeddings");
        assert_eq!(module.id(), "embeddings");
        assert_eq!(module.exports.len(), 0);
        assert_eq!(module.imports.len(), 0);
    }

    #[test]
    fn test_dependency_creation() {
        let mut dep = Dependency::new(
            "pattern_library".to_string(),
            "embeddings".to_string(),
            DependencyType::Import,
        );
        dep.add_location("pattern_library.rs", 45);

        assert_eq!(dep.from, "pattern_library");
        assert_eq!(dep.to, "embeddings");
        assert_eq!(dep.dep_type, DependencyType::Import);
        assert_eq!(dep.locations.len(), 1);
        assert_eq!(dep.locations[0], "pattern_library.rs:45");
    }

    #[test]
    fn test_call_graph() {
        let mut graph = CallGraph::new();
        graph.add_call("main".to_string(), "process".to_string());
        graph.add_call("process".to_string(), "validate".to_string());

        assert_eq!(graph.nodes.len(), 3);
        assert!(graph.nodes.contains_key("main"));
        assert!(graph.nodes.contains_key("process"));
        assert!(graph.nodes.contains_key("validate"));

        let process_node = &graph.nodes["process"];
        assert_eq!(process_node.calls.len(), 1);
        assert_eq!(process_node.calls[0], "validate");
        assert_eq!(process_node.called_by.len(), 1);
        assert_eq!(process_node.called_by[0], "main");
    }

    #[test]
    fn test_code_map_creation() {
        let map = CodeMap::new(PathBuf::from("/project/root"));
        assert_eq!(map.modules.len(), 0);
        assert_eq!(map.dependencies.len(), 0);
        assert!(!map.generated_at.is_empty());
    }

    #[test]
    fn test_impact_radius_empty_map() {
        let map = CodeMap::new(PathBuf::from("/project/root"));
        assert_eq!(map.impact_radius("nonexistent"), 0);
    }
}
