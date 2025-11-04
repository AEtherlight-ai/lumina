/**
 * @aetherlight/analyzer - Code analysis tool for generating ÆtherLight sprint plans
 *
 * DESIGN DECISION: Export complete public API (parsers, analyzers, generators)
 * WHY: Enable programmatic usage in addition to CLI
 *
 * REASONING CHAIN:
 * 1. Parsers: TypeScript/JavaScript (ts-morph), Rust (syn via subprocess)
 * 2. Analyzers: Architecture, Complexity, Technical Debt
 * 3. Generators: Sprint Plans, Pattern Extractor, Chain of Thought Documenter
 * 4. CLI: Command-line interface (separate entry point)
 * 5. Result: Complete code analysis → sprint generation pipeline
 *
 * PATTERN: Pattern-ANALYZER-001 (AST-Based Code Analysis)
 * RELATED: Phase 0 Week 1-4 (Parsing, Analysis, Generation, CLI)
 */

// Parsers
export { TypeScriptParser } from './parsers/typescript-parser';
export { RustParser } from './parsers/rust-parser';

// Analyzers
export { ArchitectureAnalyzer } from './analyzers/architecture-analyzer';
export { ComplexityAnalyzer } from './analyzers/complexity-analyzer';
export { TechnicalDebtAnalyzer } from './analyzers/technical-debt-analyzer';

// Generators
export { SprintGenerator } from './generators/sprint-generator';
export { PatternExtractor } from './generators/pattern-extractor';
export { CoTDocumenter } from './generators/cot-documenter';

// Types
export * from './analyzers/types';
export * from './generators/types';
