/**
 * DESIGN DECISION: Unified type system for code analysis
 * WHY: Single source of truth for all parser outputs
 * 
 * REASONING CHAIN:
 * 1. Multiple parsers (TypeScript, Rust) need consistent output format
 * 2. Analyzers consume CodeModel without knowing source language
 * 3. Generators produce sprint plans from language-agnostic model
 * 4. Result: Parse once, analyze anywhere
 * 
 * PATTERN: Pattern-ANALYZER-002 (Language-Agnostic Code Model)
 */

export interface CodeModel {
  /** Root directory of analyzed codebase */
  rootDir: string;
  
  /** Programming language detected */
  language: 'typescript' | 'javascript' | 'rust' | 'unknown';
  
  /** All source files parsed */
  files: FileModel[];
  
  /** Dependency graph (file → dependencies) */
  dependencies: Map<string, string[]>;
  
  /** Entry points detected (main.ts, index.ts, lib.rs) */
  entryPoints: string[];
  
  /** External dependencies (from package.json, Cargo.toml) */
  externalDeps: ExternalDependency[];
  
  /** Statistics summary */
  stats: CodeStats;
}

export interface FileModel {
  /** Absolute path to file */
  path: string;
  
  /** Relative path from root */
  relativePath: string;
  
  /** Classes defined in file */
  classes: ClassModel[];
  
  /** Functions defined in file (top-level) */
  functions: FunctionModel[];
  
  /** Interfaces/types defined in file */
  interfaces: InterfaceModel[];
  
  /** Imports (from other files or packages) */
  imports: ImportModel[];
  
  /** Exports (what this file exposes) */
  exports: ExportModel[];
  
  /** Lines of code (excluding comments/blank) */
  loc: number;
}

export interface ClassModel {
  name: string;
  isExported: boolean;
  methods: FunctionModel[];
  properties: PropertyModel[];
  superClass?: string;
  implements: string[];
  loc: number;
}

export interface FunctionModel {
  name: string;
  isExported: boolean;
  isAsync: boolean;
  parameters: ParameterModel[];
  returnType?: string;
  
  /** Cyclomatic complexity (1 = simple, 15+ = needs refactor) */
  complexity: number;
  
  /** Lines of code */
  loc: number;
  
  /** Whether function has Chain of Thought documentation */
  hasChainOfThought: boolean;
}

export interface InterfaceModel {
  name: string;
  isExported: boolean;
  properties: PropertyModel[];
}

export interface PropertyModel {
  name: string;
  type?: string;
  isOptional: boolean;
  isReadonly: boolean;
}

export interface ParameterModel {
  name: string;
  type?: string;
  isOptional: boolean;
  defaultValue?: string;
}

export interface ImportModel {
  /** What is imported (default, named, namespace) */
  importedNames: string[];
  
  /** Where it's imported from */
  source: string;
  
  /** Is this a local file or external package? */
  isExternal: boolean;
}

export interface ExportModel {
  /** What is exported */
  exportedName: string;
  
  /** Export type (default, named, re-export) */
  exportType: 'default' | 'named' | 'reexport';
}

export interface ExternalDependency {
  name: string;
  version: string;
  isDev: boolean;
}

export interface CodeStats {
  totalFiles: number;
  totalLoc: number;
  totalClasses: number;
  totalFunctions: number;
  totalInterfaces: number;
  avgComplexity: number;
  maxComplexity: number;
  filesWithoutDocs: number;
  functionsWithoutDocs: number;
}

/**
 * Architecture pattern detected in codebase
 */
export interface ArchitecturePattern {
  name: string;
  confidence: number; // 0.0 to 1.0
  evidence: string[];
  description: string;
}

/**
 * Technical debt item detected
 */
export interface TechnicalDebt {
  type: 'todo' | 'hardcoded' | 'missing_error_handling' | 'high_complexity' | 'missing_tests';
  severity: 'low' | 'medium' | 'high';
  file: string;
  line?: number;
  description: string;
  suggestion: string;
}

/**
 * Refactoring opportunity identified
 */
export interface RefactoringOpportunity {
  type: 'extract_function' | 'extract_class' | 'reduce_complexity' | 'add_error_handling';
  priority: 'low' | 'medium' | 'high';
  file: string;
  line?: number;
  description: string;
  effort: 'low' | 'medium' | 'high';
}

/**
 * Complete analysis report
 */
export interface AnalysisReport {
  codeModel: CodeModel;
  architecture: ArchitecturePattern[];
  technicalDebt: TechnicalDebt[];
  refactoringOpps: RefactoringOpportunity[];
  complexityHotspots: ComplexityHotspot[];
  timestamp: string;
}

export interface ComplexityHotspot {
  file: string;
  function: string;
  complexity: number;
  loc: number;
  reason: string;
}
