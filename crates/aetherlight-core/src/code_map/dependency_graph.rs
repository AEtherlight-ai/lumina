/**
 * Dependency Graph Builder - Construct module dependency relationships
 *
 * DESIGN DECISION: Build graph from parsed modules, not from source
 * WHY: Separation of concerns - parser extracts data, graph builder connects it
 *
 * REASONING CHAIN:
 * 1. Parser extracts imports/exports from each module
 * 2. Graph builder matches imports to exports across modules
 * 3. Creates dependency edges (Module A imports from Module B)
 * 4. Constructs call graph (Function X calls Function Y)
 * 5. Tracks data flow (Module A passes Type T to Module B)
 * 6. Result: Complete dependency graph for impact analysis
 *
 * PATTERN: Pattern-CODEMAP-001 (Dependency Graph Generation)
 * RELATED: AI-001, impact analyzer, verification system
 * PERFORMANCE: <1s for 50 modules, O(N*M) where N=modules, M=avg imports per module
 */

use crate::code_map::{CallGraph, DataFlow, Dependency, DependencyType, Module, ModuleId};
use std::collections::HashMap;

/// Dependency graph with modules and relationships
pub struct DependencyGraph {
    /// All dependencies between modules
    pub dependencies: Vec<Dependency>,

    /// Call graph (function-level dependencies)
    pub call_graph: CallGraph,

    /// Data flows between modules
    pub data_flows: Vec<DataFlow>,
}

impl DependencyGraph {
    /// Build dependency graph from modules
    ///
    /// DESIGN DECISION: Match imports to exports across modules
    /// WHY: Identifies which modules depend on which others
    ///
    /// REASONING CHAIN:
    /// 1. For each module, examine its imports
    /// 2. For each import, find which module exports that symbol
    /// 3. Create dependency edge: importing module → exporting module
    /// 4. Record location where import occurs
    /// 5. Build call graph by analyzing function calls
    /// 6. Track data flows between modules
    ///
    /// PERFORMANCE: O(N*M) where N=modules, M=avg imports per module
    pub fn build(modules: &[Module]) -> Result<Self, String> {
        let mut graph = Self {
            dependencies: Vec::new(),
            call_graph: CallGraph::new(),
            data_flows: Vec::new(),
        };

        // Step 1: Build module name → module mapping for fast lookup
        let module_map: HashMap<String, &Module> = modules
            .iter()
            .map(|m| (m.name.clone(), m))
            .collect();

        // Step 2: Build export symbol → module mapping
        let _export_map = Self::build_export_map(modules); // TODO: Use for advanced symbol resolution in Phase 3.7

        // Step 3: Process each module's imports
        for module in modules {
            for import in &module.imports {
                // Resolve import path to target module
                if let Some(target_module_id) = Self::resolve_import(&import.path, &module_map) {
                    // Create dependency edge
                    let mut dep = Dependency::new(
                        module.id(),
                        target_module_id.clone(),
                        DependencyType::Import,
                    );

                    // Record location
                    dep.add_location(&module.path.to_string_lossy(), import.line);

                    // Add to graph (avoid duplicates)
                    if !graph
                        .dependencies
                        .iter()
                        .any(|d| d.from == dep.from && d.to == dep.to && d.dep_type == dep.dep_type)
                    {
                        graph.dependencies.push(dep);
                    }
                }
            }
        }

        // Step 4: Build call graph (future: extract from AST)
        // TODO: When tree-sitter enabled, extract function calls from AST
        // For MVP, call graph will be empty but structure is ready

        Ok(graph)
    }

    /// Build mapping from exported symbol to module
    ///
    /// DESIGN DECISION: Pre-build export map for O(1) lookup
    /// WHY: Each import needs to find which module exports it
    fn build_export_map(modules: &[Module]) -> HashMap<String, ModuleId> {
        let mut map = HashMap::new();

        for module in modules {
            for export in &module.exports {
                // Map symbol name to module ID
                // Note: Doesn't handle shadowing (multiple modules exporting same symbol)
                // TODO: Handle symbol conflicts in Phase 3.7
                map.insert(export.name.clone(), module.id());
            }
        }

        map
    }

    /// Resolve import path to target module ID
    ///
    /// DESIGN DECISION: Match import paths to module names
    /// WHY: Import paths reference module names (use crate::embeddings)
    ///
    /// REASONING CHAIN:
    /// 1. Import path: "crate::embeddings" or "std::collections::HashMap"
    /// 2. Check if it's a crate-local import (starts with "crate::")
    /// 3. If crate-local, extract module name and find in module_map
    /// 4. If external (std, third-party), record as external dependency
    /// 5. Return target module ID or None if external
    fn resolve_import(
        import_path: &str,
        module_map: &HashMap<String, &Module>,
    ) -> Option<ModuleId> {
        // Handle crate-local imports: "crate::embeddings" → "embeddings"
        if import_path.starts_with("crate::") {
            let module_name = import_path.trim_start_matches("crate::");

            // Handle nested modules: "crate::network::dht" → "network::dht"
            // Try exact match first
            if module_map.contains_key(module_name) {
                return Some(module_name.to_string());
            }

            // Try parent module: "crate::network::dht" → "network"
            let parts: Vec<&str> = module_name.split("::").collect();
            if parts.len() > 1 {
                let parent = parts[0];
                if module_map.contains_key(parent) {
                    return Some(parent.to_string());
                }
            }
        }

        // Handle relative imports: "super::embeddings" or "self::types"
        // TODO: Resolve relative imports in Phase 3.7

        // Handle external imports: "std::collections::HashMap", "serde::Serialize"
        // These are external dependencies, not tracked in internal dependency graph
        // TODO: Track external dependencies in Phase 3.7

        None
    }

    /// Add a call relationship to the call graph
    ///
    /// DESIGN DECISION: Function-level dependency tracking
    /// WHY: Enables fine-grained impact analysis (which functions are affected)
    pub fn add_call(&mut self, caller: String, callee: String) {
        self.call_graph.add_call(caller, callee);
    }

    /// Add a data flow relationship
    ///
    /// DESIGN DECISION: Track data types passed between modules
    /// WHY: Changes to data types affect all modules using them
    pub fn add_data_flow(&mut self, from: ModuleId, to: ModuleId, data_type: String) {
        // Avoid duplicates
        if !self
            .data_flows
            .iter()
            .any(|df| df.from == from && df.to == to && df.data_type == data_type)
        {
            self.data_flows.push(DataFlow {
                from,
                to,
                data_type,
            });
        }
    }

    /// Get all modules that depend on the given module
    ///
    /// DESIGN DECISION: Filter dependencies by target module
    /// WHY: Quick lookup for "what depends on X"
    pub fn get_dependents(&self, module_id: &str) -> Vec<&Dependency> {
        self.dependencies
            .iter()
            .filter(|dep| dep.to == module_id)
            .collect()
    }

    /// Get all modules that the given module depends on
    ///
    /// DESIGN DECISION: Filter dependencies by source module
    /// WHY: Quick lookup for "what does X depend on"
    pub fn get_dependencies(&self, module_id: &str) -> Vec<&Dependency> {
        self.dependencies
            .iter()
            .filter(|dep| dep.from == module_id)
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::code_map::{Import, Symbol, SymbolType, Visibility};
    use std::path::PathBuf;

    fn create_test_module(name: &str, imports: Vec<Import>, exports: Vec<Symbol>) -> Module {
        let mut module = Module::new(
            PathBuf::from(format!("src/{}.rs", name)),
            name.to_string(),
        );
        module.imports = imports;
        module.exports = exports;
        module
    }

    #[test]
    fn test_build_export_map() {
        let modules = vec![
            create_test_module(
                "embeddings",
                vec![],
                vec![Symbol {
                    name: "LocalEmbeddings".to_string(),
                    symbol_type: SymbolType::Struct,
                    visibility: Visibility::Public,
                }],
            ),
            create_test_module(
                "pattern_library",
                vec![],
                vec![Symbol {
                    name: "PatternLibrary".to_string(),
                    symbol_type: SymbolType::Struct,
                    visibility: Visibility::Public,
                }],
            ),
        ];

        let export_map = DependencyGraph::build_export_map(&modules);
        assert_eq!(export_map.len(), 2);
        assert_eq!(export_map.get("LocalEmbeddings"), Some(&"embeddings".to_string()));
        assert_eq!(export_map.get("PatternLibrary"), Some(&"pattern_library".to_string()));
    }

    #[test]
    fn test_resolve_import() {
        let mut module_map = HashMap::new();
        let embeddings_module = create_test_module("embeddings", vec![], vec![]);
        let network_module = create_test_module("network", vec![], vec![]);
        module_map.insert("embeddings".to_string(), &embeddings_module);
        module_map.insert("network".to_string(), &network_module);

        // Crate-local imports should resolve
        assert_eq!(
            DependencyGraph::resolve_import("crate::embeddings", &module_map),
            Some("embeddings".to_string())
        );

        // External imports should return None
        assert_eq!(
            DependencyGraph::resolve_import("std::collections::HashMap", &module_map),
            None
        );

        // Third-party imports should return None
        assert_eq!(
            DependencyGraph::resolve_import("serde::Serialize", &module_map),
            None
        );
    }

    #[test]
    fn test_build_dependency_graph() {
        let modules = vec![
            // embeddings module (exports LocalEmbeddings)
            create_test_module(
                "embeddings",
                vec![],
                vec![Symbol {
                    name: "LocalEmbeddings".to_string(),
                    symbol_type: SymbolType::Struct,
                    visibility: Visibility::Public,
                }],
            ),
            // pattern_library module (imports embeddings)
            create_test_module(
                "pattern_library",
                vec![Import {
                    path: "crate::embeddings".to_string(),
                    symbols: vec!["LocalEmbeddings".to_string()],
                    line: 5,
                }],
                vec![],
            ),
        ];

        let graph = DependencyGraph::build(&modules).unwrap();

        // Should have 1 dependency: pattern_library → embeddings
        assert_eq!(graph.dependencies.len(), 1);
        assert_eq!(graph.dependencies[0].from, "pattern_library");
        assert_eq!(graph.dependencies[0].to, "embeddings");
        assert_eq!(graph.dependencies[0].dep_type, DependencyType::Import);
    }

    #[test]
    fn test_get_dependents() {
        let mut graph = DependencyGraph {
            dependencies: vec![
                Dependency::new(
                    "pattern_library".to_string(),
                    "embeddings".to_string(),
                    DependencyType::Import,
                ),
                Dependency::new(
                    "domain_agent".to_string(),
                    "embeddings".to_string(),
                    DependencyType::Import,
                ),
            ],
            call_graph: CallGraph::new(),
            data_flows: Vec::new(),
        };

        let dependents = graph.get_dependents("embeddings");
        assert_eq!(dependents.len(), 2);
        assert!(dependents.iter().any(|d| d.from == "pattern_library"));
        assert!(dependents.iter().any(|d| d.from == "domain_agent"));
    }

    #[test]
    fn test_add_call() {
        let mut graph = DependencyGraph {
            dependencies: Vec::new(),
            call_graph: CallGraph::new(),
            data_flows: Vec::new(),
        };

        graph.add_call("main".to_string(), "process".to_string());

        assert_eq!(graph.call_graph.nodes.len(), 2);
        assert!(graph.call_graph.nodes.contains_key("main"));
        assert!(graph.call_graph.nodes.contains_key("process"));
    }

    #[test]
    fn test_add_data_flow() {
        let mut graph = DependencyGraph {
            dependencies: Vec::new(),
            call_graph: CallGraph::new(),
            data_flows: Vec::new(),
        };

        graph.add_data_flow(
            "pattern_library".to_string(),
            "domain_agent".to_string(),
            "Pattern".to_string(),
        );

        assert_eq!(graph.data_flows.len(), 1);
        assert_eq!(graph.data_flows[0].from, "pattern_library");
        assert_eq!(graph.data_flows[0].to, "domain_agent");
        assert_eq!(graph.data_flows[0].data_type, "Pattern");

        // Adding duplicate should not create new entry
        graph.add_data_flow(
            "pattern_library".to_string(),
            "domain_agent".to_string(),
            "Pattern".to_string(),
        );
        assert_eq!(graph.data_flows.len(), 1);
    }
}
