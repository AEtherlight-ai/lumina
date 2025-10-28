/**
 * Impact Analyzer - Calculate impact radius of code changes
 *
 * DESIGN DECISION: Use transitive dependency traversal to calculate impact
 * WHY: Changing module A affects all modules that depend on A (directly or indirectly)
 *
 * REASONING CHAIN:
 * 1. Module A is changed
 * 2. Find all modules that import from A (direct dependents)
 * 3. Recursively find modules that import from those (indirect dependents)
 * 4. Count total unique modules affected (impact radius)
 * 5. Handle circular dependencies (cycle detection)
 * 6. Result: Accurate measure of change impact
 *
 * PATTERN: Pattern-CODEMAP-001 (Dependency Graph Generation)
 * RELATED: AI-001, verification system, session handoff
 * PERFORMANCE: <100ms for full impact analysis (typical project)
 */

use crate::code_map::{CodeMap, DependencyType, ModuleId};
use std::collections::{HashSet, VecDeque};

/// Impact analyzer for calculating change impact
pub struct ImpactAnalyzer<'a> {
    /// Code map to analyze
    code_map: &'a CodeMap,
}

impl<'a> ImpactAnalyzer<'a> {
    /// Create a new impact analyzer
    pub fn new(code_map: &'a CodeMap) -> Self {
        Self { code_map }
    }

    /// Calculate impact radius for a module
    ///
    /// DESIGN DECISION: Use BFS to find all transitive dependents
    /// WHY: BFS ensures shortest path and prevents duplicate counting
    ///
    /// REASONING CHAIN:
    /// 1. Start with target module
    /// 2. Find all direct dependents (modules importing target)
    /// 3. For each dependent, recursively find their dependents
    /// 4. Use visited set to avoid cycles and duplicates
    /// 5. Count total unique modules affected
    /// 6. Return impact radius
    ///
    /// PERFORMANCE: O(V + E) where V=modules, E=dependencies (graph traversal)
    pub fn calculate_impact_radius(&self, module_id: &str) -> usize {
        let mut visited = HashSet::new();
        let mut queue = VecDeque::new();

        // Start with the target module
        queue.push_back(module_id.to_string());
        visited.insert(module_id.to_string());

        // BFS traversal to find all transitive dependents
        while let Some(current) = queue.pop_front() {
            // Find all modules that import from current module
            for dep in &self.code_map.dependencies {
                if dep.to == current && dep.dep_type == DependencyType::Import {
                    // Add dependent if not already visited
                    if visited.insert(dep.from.clone()) {
                        queue.push_back(dep.from.clone());
                    }
                }
            }
        }

        // Impact radius = number of dependents (excluding the module itself)
        visited.len().saturating_sub(1)
    }

    /// Find all modules that import from the given module
    ///
    /// DESIGN DECISION: Filter dependencies by target module
    /// WHY: Quick lookup for direct dependents
    pub fn find_importers(&self, module_id: &str) -> Vec<ModuleId> {
        self.code_map
            .dependencies
            .iter()
            .filter(|dep| dep.to == module_id && dep.dep_type == DependencyType::Import)
            .map(|dep| dep.from.clone())
            .collect()
    }

    /// Calculate impact radius for all modules
    ///
    /// DESIGN DECISION: Batch calculation for efficiency
    /// WHY: Enables sorting modules by impact (high-risk modules first)
    ///
    /// PERFORMANCE: O(N * (V + E)) where N=modules
    pub fn calculate_all_impact_radii(&self) -> Vec<(ModuleId, usize)> {
        self.code_map
            .modules
            .iter()
            .map(|module| {
                let radius = self.calculate_impact_radius(&module.id());
                (module.id(), radius)
            })
            .collect()
    }

    /// Find modules with highest impact radius
    ///
    /// DESIGN DECISION: Identify high-risk modules first
    /// WHY: Changes to these modules affect many others (require extra caution)
    pub fn find_high_impact_modules(&self, threshold: usize) -> Vec<ModuleId> {
        let radii = self.calculate_all_impact_radii();
        radii
            .into_iter()
            .filter(|(_, radius)| *radius >= threshold)
            .map(|(id, _)| id)
            .collect()
    }

    /// Calculate impact chain from module A to module B
    ///
    /// DESIGN DECISION: Find shortest dependency path
    /// WHY: Shows how changing A affects B (transitive dependency chain)
    ///
    /// REASONING CHAIN:
    /// 1. Start from module A
    /// 2. Use BFS to find shortest path to B
    /// 3. Track parent pointers to reconstruct path
    /// 4. Return chain: A → C → D → B
    /// 5. If no path exists, return None
    ///
    /// PERFORMANCE: O(V + E) worst case (graph traversal)
    pub fn calculate_impact_chain(
        &self,
        from_module: &str,
        to_module: &str,
    ) -> Option<Vec<ModuleId>> {
        if from_module == to_module {
            return Some(vec![from_module.to_string()]);
        }

        let mut visited = HashSet::new();
        let mut queue = VecDeque::new();
        let mut parent: std::collections::HashMap<String, String> = std::collections::HashMap::new();

        // Start BFS from the source module
        queue.push_back(from_module.to_string());
        visited.insert(from_module.to_string());

        while let Some(current) = queue.pop_front() {
            // Check if we reached the target
            if current == to_module {
                // Reconstruct path from parent pointers
                let mut path = vec![to_module.to_string()];
                let mut node = to_module.to_string();

                while let Some(parent_node) = parent.get(&node) {
                    path.push(parent_node.clone());
                    node = parent_node.clone();
                }

                path.reverse();
                return Some(path);
            }

            // Explore neighbors (modules that import from current)
            for dep in &self.code_map.dependencies {
                if dep.to == current && dep.dep_type == DependencyType::Import {
                    if visited.insert(dep.from.clone()) {
                        parent.insert(dep.from.clone(), current.clone());
                        queue.push_back(dep.from.clone());
                    }
                }
            }
        }

        // No path found
        None
    }

    /// Detect circular dependencies
    ///
    /// DESIGN DECISION: Use DFS to detect cycles
    /// WHY: Circular dependencies are design issues (should be flagged)
    ///
    /// PERFORMANCE: O(V + E) worst case
    pub fn detect_circular_dependencies(&self) -> Vec<Vec<ModuleId>> {
        let mut visited = HashSet::new();
        let mut rec_stack = HashSet::new();
        let mut cycles = Vec::new();

        for module in &self.code_map.modules {
            if !visited.contains(&module.id()) {
                let mut path = Vec::new();
                self.dfs_detect_cycle(
                    &module.id(),
                    &mut visited,
                    &mut rec_stack,
                    &mut path,
                    &mut cycles,
                );
            }
        }

        cycles
    }

    /// DFS helper for cycle detection
    fn dfs_detect_cycle(
        &self,
        node: &str,
        visited: &mut HashSet<ModuleId>,
        rec_stack: &mut HashSet<ModuleId>,
        path: &mut Vec<ModuleId>,
        cycles: &mut Vec<Vec<ModuleId>>,
    ) {
        visited.insert(node.to_string());
        rec_stack.insert(node.to_string());
        path.push(node.to_string());

        // Find all modules that import from this node
        for dep in &self.code_map.dependencies {
            if dep.to == node && dep.dep_type == DependencyType::Import {
                if !visited.contains(&dep.from) {
                    self.dfs_detect_cycle(&dep.from, visited, rec_stack, path, cycles);
                } else if rec_stack.contains(&dep.from) {
                    // Found cycle: extract it from path
                    if let Some(cycle_start) = path.iter().position(|id| id == &dep.from) {
                        let cycle = path[cycle_start..].to_vec();
                        cycles.push(cycle);
                    }
                }
            }
        }

        path.pop();
        rec_stack.remove(node);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::code_map::{Dependency, DependencyType, Module};
    use std::path::PathBuf;

    fn create_test_map() -> CodeMap {
        let mut map = CodeMap::new(PathBuf::from("/project"));

        // Create modules
        let mut embeddings = Module::new(
            PathBuf::from("src/embeddings.rs"),
            "embeddings".to_string(),
        );
        embeddings.loc = 385;

        let mut pattern_library = Module::new(
            PathBuf::from("src/pattern_library.rs"),
            "pattern_library".to_string(),
        );
        pattern_library.loc = 450;

        let mut domain_agent = Module::new(
            PathBuf::from("src/domain_agent.rs"),
            "domain_agent".to_string(),
        );
        domain_agent.loc = 500;

        let mut network = Module::new(
            PathBuf::from("src/network.rs"),
            "network".to_string(),
        );
        network.loc = 300;

        map.modules = vec![embeddings, pattern_library, domain_agent, network];

        // Create dependencies:
        // pattern_library → embeddings
        // domain_agent → embeddings
        // domain_agent → pattern_library
        // network → domain_agent
        map.dependencies = vec![
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
            Dependency::new(
                "domain_agent".to_string(),
                "pattern_library".to_string(),
                DependencyType::Import,
            ),
            Dependency::new(
                "network".to_string(),
                "domain_agent".to_string(),
                DependencyType::Import,
            ),
        ];

        map
    }

    #[test]
    fn test_calculate_impact_radius() {
        let map = create_test_map();
        let analyzer = ImpactAnalyzer::new(&map);

        // embeddings is imported by pattern_library and domain_agent
        // domain_agent is imported by network
        // So changing embeddings affects 3 modules (pattern_library, domain_agent, network)
        assert_eq!(analyzer.calculate_impact_radius("embeddings"), 3);

        // pattern_library is imported by domain_agent
        // domain_agent is imported by network
        // So changing pattern_library affects 2 modules (domain_agent, network)
        assert_eq!(analyzer.calculate_impact_radius("pattern_library"), 2);

        // domain_agent is imported by network
        // So changing domain_agent affects 1 module (network)
        assert_eq!(analyzer.calculate_impact_radius("domain_agent"), 1);

        // network is not imported by anyone
        // So changing network affects 0 modules
        assert_eq!(analyzer.calculate_impact_radius("network"), 0);
    }

    #[test]
    fn test_find_importers() {
        let map = create_test_map();
        let analyzer = ImpactAnalyzer::new(&map);

        let importers = analyzer.find_importers("embeddings");
        assert_eq!(importers.len(), 2);
        assert!(importers.contains(&"pattern_library".to_string()));
        assert!(importers.contains(&"domain_agent".to_string()));

        let importers = analyzer.find_importers("domain_agent");
        assert_eq!(importers.len(), 1);
        assert_eq!(importers[0], "network");
    }

    #[test]
    fn test_calculate_all_impact_radii() {
        let map = create_test_map();
        let analyzer = ImpactAnalyzer::new(&map);

        let radii = analyzer.calculate_all_impact_radii();
        assert_eq!(radii.len(), 4);

        // Find embeddings radius
        let embeddings_radius = radii
            .iter()
            .find(|(id, _)| id == "embeddings")
            .map(|(_, r)| *r);
        assert_eq!(embeddings_radius, Some(3));
    }

    #[test]
    fn test_find_high_impact_modules() {
        let map = create_test_map();
        let analyzer = ImpactAnalyzer::new(&map);

        // Modules with impact radius >= 2
        let high_impact = analyzer.find_high_impact_modules(2);
        assert_eq!(high_impact.len(), 2);
        assert!(high_impact.contains(&"embeddings".to_string()));
        assert!(high_impact.contains(&"pattern_library".to_string()));
    }

    #[test]
    fn test_calculate_impact_chain() {
        let map = create_test_map();
        let analyzer = ImpactAnalyzer::new(&map);

        // Chain: embeddings → domain_agent → network
        let chain = analyzer.calculate_impact_chain("embeddings", "network");
        assert_eq!(
            chain,
            Some(vec![
                "embeddings".to_string(),
                "domain_agent".to_string(),
                "network".to_string()
            ])
        );

        // Direct dependency: domain_agent → network
        let chain = analyzer.calculate_impact_chain("domain_agent", "network");
        assert_eq!(
            chain,
            Some(vec!["domain_agent".to_string(), "network".to_string()])
        );

        // No chain (reversed direction)
        let chain = analyzer.calculate_impact_chain("network", "embeddings");
        assert_eq!(chain, None);
    }

    #[test]
    fn test_detect_circular_dependencies() {
        let mut map = CodeMap::new(PathBuf::from("/project"));

        // Create circular dependency: A → B → C → A
        map.modules = vec![
            Module::new(PathBuf::from("src/a.rs"), "a".to_string()),
            Module::new(PathBuf::from("src/b.rs"), "b".to_string()),
            Module::new(PathBuf::from("src/c.rs"), "c".to_string()),
        ];

        map.dependencies = vec![
            Dependency::new("b".to_string(), "a".to_string(), DependencyType::Import),
            Dependency::new("c".to_string(), "b".to_string(), DependencyType::Import),
            Dependency::new("a".to_string(), "c".to_string(), DependencyType::Import),
        ];

        let analyzer = ImpactAnalyzer::new(&map);
        let cycles = analyzer.detect_circular_dependencies();

        // Should detect the cycle
        assert!(cycles.len() > 0);
    }
}
