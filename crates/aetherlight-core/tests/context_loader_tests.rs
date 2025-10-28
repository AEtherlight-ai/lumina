/**
 * Integration tests for AI-006: Progressive Context Loader
 *
 * DESIGN DECISION: Comprehensive test suite covering all context loader functionality
 * WHY: Validate 60% token reduction target, test hierarchical loading, verify relevance ranking
 *
 * REASONING CHAIN:
 * 1. Test ContextLoader initialization with project root
 * 2. Test task analysis (domain extraction, complexity estimation)
 * 3. Test section loading (essential, domains, references)
 * 4. Test context assembly with token budget constraints
 * 5. Test relevance ranking algorithms
 * 6. Test full load_context() workflow end-to-end
 * 7. Test edge cases (missing files, budget exhaustion, empty domains)
 *
 * PATTERN: Pattern-TESTING-001 (Integration Testing with Real Files)
 * RELATED: AI-006, context_loader module, Pattern-CONTEXT-003
 * PERFORMANCE: All tests should complete in <5s total
 */

use aetherlight_core::{
    ContextLoader, ContextLoadStrategy, Task as ContextTask, Section, SectionType,
    ContextAnalyzer, SectionLoader, ContextAssembler, TaskAnalysis, Complexity,
    LocalEmbeddings, PatternIndex, Error
};
use std::path::{Path, PathBuf};
use std::fs;

/// Helper: Get project root (assumes tests run from workspace root)
fn get_project_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .to_path_buf()
}

/// Helper: Create test task
fn create_test_task(description: &str) -> ContextTask {
    ContextTask {
        id: "TEST-001".to_string(),
        description: description.to_string(),
        requirements: vec![],
        domain_hints: vec![],
    }
}

#[tokio::test]
async fn test_context_loader_initialization() {
    /**
     * Test: ContextLoader can be initialized with valid project root
     *
     * DESIGN DECISION: Validate initialization creates all required components
     * WHY: Ensures embeddings, pattern index, and submodules are properly configured
     */
    let project_root = get_project_root();

    let result = ContextLoader::new(
        project_root.clone(),
        ContextLoadStrategy::Adaptive,
        8000,
    ).await;

    assert!(result.is_ok(), "ContextLoader initialization should succeed");

    let loader = result.unwrap();
    assert_eq!(loader.project_root, project_root);
    assert_eq!(loader.strategy, ContextLoadStrategy::Adaptive);
    assert_eq!(loader.token_budget, 8000);
}

#[tokio::test]
async fn test_task_analysis_rust_domain() {
    /**
     * Test: Task analysis correctly identifies Rust domain
     *
     * DESIGN DECISION: Test domain extraction with Rust keywords
     * WHY: Validates keyword-based domain detection (rust, cargo, crate, ffi)
     */
    let project_root = get_project_root();
    let loader = ContextLoader::new(
        project_root.clone(),
        ContextLoadStrategy::Adaptive,
        8000,
    ).await.unwrap();

    let task = create_test_task("Implement pattern matching algorithm in Rust with cargo benchmarks");

    let analysis = loader.analyzer.analyze(&task).await.unwrap();

    assert!(analysis.domains.contains(&"rust".to_string()), "Should detect 'rust' domain");
    assert!(analysis.keywords.contains(&"pattern".to_string()), "Should extract 'pattern' keyword");
    assert!(analysis.keywords.contains(&"benchmark".to_string()), "Should extract 'benchmark' keyword");
    assert_eq!(analysis.complexity, Complexity::Medium, "Multi-step implementation should be medium complexity");
}

#[tokio::test]
async fn test_task_analysis_desktop_domain() {
    /**
     * Test: Task analysis correctly identifies Desktop domain
     *
     * DESIGN DECISION: Test domain extraction with Tauri/desktop keywords
     * WHY: Validates keyword-based domain detection (tauri, voice, capture, ipc)
     */
    let project_root = get_project_root();
    let loader = ContextLoader::new(
        project_root.clone(),
        ContextLoadStrategy::Adaptive,
        8000,
    ).await.unwrap();

    let task = create_test_task("Add voice capture UI to Tauri desktop app with IPC protocol");

    let analysis = loader.analyzer.analyze(&task).await.unwrap();

    assert!(analysis.domains.contains(&"desktop".to_string()), "Should detect 'desktop' domain");
    assert!(analysis.keywords.contains(&"voice".to_string()), "Should extract 'voice' keyword");
    assert!(analysis.keywords.contains(&"tauri".to_string()), "Should extract 'tauri' keyword");
    assert_eq!(analysis.complexity, Complexity::High, "UI + IPC implementation should be high complexity");
}

#[tokio::test]
async fn test_task_analysis_mobile_domain() {
    /**
     * Test: Task analysis correctly identifies Mobile domain
     *
     * DESIGN DECISION: Test domain extraction with Flutter/mobile keywords
     * WHY: Validates keyword-based domain detection (flutter, ios, android, ffi)
     */
    let project_root = get_project_root();
    let loader = ContextLoader::new(
        project_root.clone(),
        ContextLoadStrategy::Adaptive,
        8000,
    ).await.unwrap();

    let task = create_test_task("Create Flutter FFI bindings for iOS and Android mobile apps");

    let analysis = loader.analyzer.analyze(&task).await.unwrap();

    assert!(analysis.domains.contains(&"mobile".to_string()), "Should detect 'mobile' domain");
    assert!(analysis.keywords.contains(&"flutter".to_string()), "Should extract 'flutter' keyword");
    assert!(analysis.keywords.contains(&"ffi".to_string()), "Should extract 'ffi' keyword");
    assert_eq!(analysis.complexity, Complexity::High, "Cross-platform FFI should be high complexity");
}

#[tokio::test]
async fn test_load_essential_context() {
    /**
     * Test: Section loader can load essential.md
     *
     * DESIGN DECISION: Test essential context loading (universal SOPs)
     * WHY: Validates file reading and content extraction
     */
    let project_root = get_project_root();
    let loader = SectionLoader::new(project_root.clone());

    let result = loader.load_essential(&project_root).await;

    assert!(result.is_ok(), "Should load essential.md successfully");

    let content = result.unwrap();
    assert!(content.contains("Project Identity"), "Should contain Project Identity section");
    assert!(content.contains("TASK COMPLETENESS DEFINITION"), "Should contain task completeness section");
    assert!(content.contains("REQUIRED SEQUENCE"), "Should contain required sequence section");
    assert!(content.len() > 1000, "Essential context should be substantial (>1000 chars)");
}

#[tokio::test]
async fn test_load_rust_domain_context() {
    /**
     * Test: Section loader can load rust-dev.md
     *
     * DESIGN DECISION: Test domain-specific context loading
     * WHY: Validates domain file reading and Rust-specific content
     */
    let project_root = get_project_root();
    let loader = SectionLoader::new(project_root.clone());

    let result = loader.load_domains(&project_root, &["rust".to_string()]).await;

    assert!(result.is_ok(), "Should load rust-dev.md successfully");

    let content = result.unwrap();
    assert!(content.contains("Rust Development Context"), "Should contain Rust context header");
    assert!(content.contains("Performance Targets"), "Should contain performance targets");
    assert!(content.contains("Pattern-001"), "Should reference Rust core patterns");
    assert!(content.len() > 1500, "Rust context should be substantial (>1500 chars)");
}

#[tokio::test]
async fn test_load_desktop_domain_context() {
    /**
     * Test: Section loader can load desktop-dev.md
     *
     * DESIGN DECISION: Test desktop domain loading
     * WHY: Validates Tauri-specific context extraction
     */
    let project_root = get_project_root();
    let loader = SectionLoader::new(project_root.clone());

    let result = loader.load_domains(&project_root, &["desktop".to_string()]).await;

    assert!(result.is_ok(), "Should load desktop-dev.md successfully");

    let content = result.unwrap();
    assert!(content.contains("Desktop Development Context"), "Should contain desktop context header");
    assert!(content.contains("tauri-desktop-dev"), "Should reference tauri agent");
    assert!(content.contains("Voice capture"), "Should mention voice capture");
    assert!(content.len() > 1000, "Desktop context should be substantial (>1000 chars)");
}

#[tokio::test]
async fn test_load_mobile_domain_context() {
    /**
     * Test: Section loader can load mobile-dev.md
     *
     * DESIGN DECISION: Test mobile domain loading
     * WHY: Validates Flutter-specific context extraction
     */
    let project_root = get_project_root();
    let loader = SectionLoader::new(project_root.clone());

    let result = loader.load_domains(&project_root, &["mobile".to_string()]).await;

    assert!(result.is_ok(), "Should load mobile-dev.md successfully");

    let content = result.unwrap();
    assert!(content.contains("Mobile Development Context"), "Should contain mobile context header");
    assert!(content.contains("Flutter"), "Should mention Flutter");
    assert!(content.contains("FFI"), "Should mention FFI bindings");
    assert!(content.len() > 800, "Mobile context should be substantial (>800 chars)");
}

#[tokio::test]
async fn test_context_assembly_within_budget() {
    /**
     * Test: Context assembler respects token budget
     *
     * DESIGN DECISION: Test token budget constraint enforcement
     * WHY: Validates 60% token reduction target (8000 token budget)
     */
    let assembler = ContextAssembler::new();

    let essential = "Essential context ".repeat(100); // ~1800 chars
    let task_specific = "Task specific context ".repeat(100); // ~2300 chars
    let patterns = vec![]; // Empty for simplicity
    let references = vec!["Reference 1".to_string(), "Reference 2".to_string()];

    let result = assembler.assemble(
        essential,
        task_specific,
        patterns,
        references,
        8000, // Token budget
        50,   // Load time
    );

    assert!(result.is_ok(), "Assembly should succeed");

    let loaded_context = result.unwrap();
    assert!(loaded_context.total_tokens <= 8000, "Should respect token budget");
    assert!(loaded_context.sections_loaded > 0, "Should load some sections");
}

#[tokio::test]
async fn test_full_context_loading_rust_task() {
    /**
     * Test: End-to-end context loading for Rust task
     *
     * DESIGN DECISION: Test complete workflow (analyze → load → assemble)
     * WHY: Validates full integration with real files
     */
    let project_root = get_project_root();
    let loader = ContextLoader::new(
        project_root.clone(),
        ContextLoadStrategy::Adaptive,
        8000,
    ).await.unwrap();

    let task = create_test_task("Implement FFI bindings for pattern matching in Rust");

    let result = loader.load_context(&task).await;

    assert!(result.is_ok(), "Full context loading should succeed");

    let loaded_context = result.unwrap();
    assert!(loaded_context.essential_loaded, "Essential context should be loaded");
    assert!(loaded_context.domains_loaded.contains(&"rust".to_string()), "Rust domain should be loaded");
    assert!(loaded_context.total_tokens > 0, "Should have non-zero tokens");
    assert!(loaded_context.total_tokens <= 8000, "Should respect token budget");
    assert!(loaded_context.load_time_ms < 5000, "Should load in <5s");
    assert!(loaded_context.sections_loaded >= 2, "Should load at least essential + rust domain");
}

#[tokio::test]
async fn test_full_context_loading_desktop_task() {
    /**
     * Test: End-to-end context loading for Desktop task
     *
     * DESIGN DECISION: Test complete workflow for Tauri desktop task
     * WHY: Validates desktop domain detection and loading
     */
    let project_root = get_project_root();
    let loader = ContextLoader::new(
        project_root.clone(),
        ContextLoadStrategy::Adaptive,
        8000,
    ).await.unwrap();

    let task = create_test_task("Add voice capture UI to Tauri desktop app");

    let result = loader.load_context(&task).await;

    assert!(result.is_ok(), "Full context loading should succeed");

    let loaded_context = result.unwrap();
    assert!(loaded_context.essential_loaded, "Essential context should be loaded");
    assert!(loaded_context.domains_loaded.contains(&"desktop".to_string()), "Desktop domain should be loaded");
    assert!(loaded_context.total_tokens <= 8000, "Should respect token budget");
    assert!(loaded_context.sections_loaded >= 2, "Should load essential + desktop");
}

#[tokio::test]
async fn test_multi_domain_task() {
    /**
     * Test: Context loading for task spanning multiple domains
     *
     * DESIGN DECISION: Test multi-domain detection (rust + desktop)
     * WHY: Validates handling of complex tasks requiring multiple contexts
     */
    let project_root = get_project_root();
    let loader = ContextLoader::new(
        project_root.clone(),
        ContextLoadStrategy::Adaptive,
        8000,
    ).await.unwrap();

    let task = create_test_task("Implement Rust core library with Tauri desktop IPC bindings");

    let result = loader.load_context(&task).await;

    assert!(result.is_ok(), "Multi-domain loading should succeed");

    let loaded_context = result.unwrap();
    assert!(loaded_context.essential_loaded, "Essential context should be loaded");
    assert!(
        loaded_context.domains_loaded.contains(&"rust".to_string()) ||
        loaded_context.domains_loaded.contains(&"desktop".to_string()),
        "Should load at least one relevant domain"
    );
    assert!(loaded_context.total_tokens <= 8000, "Should respect token budget");
}

#[tokio::test]
async fn test_token_reduction_target() {
    /**
     * Test: Validate 60% token reduction vs full CLAUDE.md
     *
     * DESIGN DECISION: Compare progressive loading tokens vs full CLAUDE.md tokens
     * WHY: Validates AI-006 success criteria (60% reduction target)
     *
     * REASONING:
     * - Full CLAUDE.md: ~20,000 tokens (estimate)
     * - Progressive loading target: 8,000 tokens (60% reduction)
     * - Success: loaded_context.total_tokens <= 8,000
     */
    let project_root = get_project_root();
    let loader = ContextLoader::new(
        project_root.clone(),
        ContextLoadStrategy::Adaptive,
        8000,
    ).await.unwrap();

    let task = create_test_task("Implement pattern matching algorithm in Rust");

    let result = loader.load_context(&task).await;

    assert!(result.is_ok(), "Context loading should succeed");

    let loaded_context = result.unwrap();

    // Target: 8,000 tokens (vs ~20,000 full CLAUDE.md = 60% reduction)
    assert!(loaded_context.total_tokens <= 8000, "Should achieve 60% token reduction");

    // Validate reduction percentage
    let full_claude_tokens = 20000; // Estimated full CLAUDE.md size
    let reduction_percentage = ((full_claude_tokens - loaded_context.total_tokens) as f64 / full_claude_tokens as f64) * 100.0;

    assert!(reduction_percentage >= 60.0, "Should achieve at least 60% reduction (actual: {:.1}%)", reduction_percentage);
}

#[tokio::test]
async fn test_edge_case_empty_task_description() {
    /**
     * Test: Handle edge case of empty task description
     *
     * DESIGN DECISION: Test graceful handling of invalid input
     * WHY: Ensures robustness against malformed tasks
     */
    let project_root = get_project_root();
    let loader = ContextLoader::new(
        project_root.clone(),
        ContextLoadStrategy::Adaptive,
        8000,
    ).await.unwrap();

    let task = create_test_task("");

    let result = loader.load_context(&task).await;

    // Should still load essential context even with empty description
    assert!(result.is_ok(), "Should handle empty description gracefully");

    let loaded_context = result.unwrap();
    assert!(loaded_context.essential_loaded, "Should still load essential context");
}

#[tokio::test]
async fn test_edge_case_nonexistent_domain() {
    /**
     * Test: Handle edge case of task with no matching domain
     *
     * DESIGN DECISION: Test fallback to essential context only
     * WHY: Ensures system works for non-standard tasks
     */
    let project_root = get_project_root();
    let loader = ContextLoader::new(
        project_root.clone(),
        ContextLoadStrategy::Adaptive,
        8000,
    ).await.unwrap();

    let task = create_test_task("Design logo for marketing campaign");

    let result = loader.load_context(&task).await;

    assert!(result.is_ok(), "Should handle non-technical task");

    let loaded_context = result.unwrap();
    assert!(loaded_context.essential_loaded, "Should load essential context");
    assert_eq!(loaded_context.domains_loaded.len(), 0, "Should not load domain-specific context");
}

#[tokio::test]
async fn test_performance_target() {
    /**
     * Test: Validate <5s load time target
     *
     * DESIGN DECISION: Measure actual load time for performance validation
     * WHY: Ensures context loading doesn't block task execution
     */
    let project_root = get_project_root();
    let loader = ContextLoader::new(
        project_root.clone(),
        ContextLoadStrategy::Adaptive,
        8000,
    ).await.unwrap();

    let task = create_test_task("Implement Rust FFI bindings for Tauri desktop app");

    let start = std::time::Instant::now();
    let result = loader.load_context(&task).await;
    let elapsed_ms = start.elapsed().as_millis() as u64;

    assert!(result.is_ok(), "Context loading should succeed");
    assert!(elapsed_ms < 5000, "Should load in <5s (actual: {}ms)", elapsed_ms);

    let loaded_context = result.unwrap();
    assert!(loaded_context.load_time_ms < 5000, "Reported load time should be <5s");
}
