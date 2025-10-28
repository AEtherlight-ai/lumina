/**
 * DESIGN DECISION: Shared types for all parsers
 * WHY: Unified data model enables consistent analysis across languages
 *
 * REASONING CHAIN:
 * 1. TypeScript, JavaScript, and Rust have different AST structures
 * 2. Need common representation for analysis phase
 * 3. Create language-agnostic types (CodeElement, Dependency, etc.)
 * 4. Each parser transforms native AST to these types
 * 5. Result: Analyzers work on unified data model
 *
 * PATTERN: Pattern-ANALYZER-001 (AST-Based Code Analysis)
 */

export interface SourceLocation {
  filePath: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

export interface CodeElement {
  type: ElementType;
  name: string;
  location: SourceLocation;
  documentation?: string;
  metadata: Record<string, any>;
}

export enum ElementType {
  CLASS = 'class',
  INTERFACE = 'interface',
  FUNCTION = 'function',
  METHOD = 'method',
  PROPERTY = 'property',
  VARIABLE = 'variable',
  ENUM = 'enum',
  TYPE_ALIAS = 'type_alias',
  MODULE = 'module',
  IMPORT = 'import',
  EXPORT = 'export',
  // Rust-specific types
  STRUCT = 'struct',
  TRAIT = 'trait',
  IMPL = 'impl',
  MACRO = 'macro',
}

export interface ClassElement extends CodeElement {
  type: ElementType.CLASS;
  extends?: string[];
  implements?: string[];
  properties: PropertyElement[];
  methods: MethodElement[];
  isAbstract: boolean;
  isExported: boolean;
}

export interface FunctionElement extends CodeElement {
  type: ElementType.FUNCTION;
  parameters: ParameterInfo[];
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
  complexity?: number; // Cyclomatic complexity
}

export interface MethodElement extends CodeElement {
  type: ElementType.METHOD;
  parameters: ParameterInfo[];
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
  complexity?: number;
  visibility: 'public' | 'private' | 'protected';
  isStatic: boolean;
  isAbstract: boolean;
}

export interface PropertyElement extends CodeElement {
  type: ElementType.PROPERTY;
  propertyType?: string;
  visibility: 'public' | 'private' | 'protected';
  isStatic: boolean;
  isReadonly: boolean;
}

export interface ParameterInfo {
  name: string;
  type?: string;
  isOptional: boolean;
  defaultValue?: string;
}

export interface Dependency {
  from: string; // Source file path
  to: string; // Target file/module path
  type: DependencyType;
  importedSymbols?: string[];
}

export enum DependencyType {
  IMPORT = 'import',
  DYNAMIC_IMPORT = 'dynamic_import',
  REQUIRE = 'require',
  TYPE_REFERENCE = 'type_reference',
}

export interface ParsedFile {
  filePath: string;
  language: 'typescript' | 'javascript' | 'rust';
  elements: CodeElement[];
  dependencies: Dependency[];
  linesOfCode: number;
  parseErrors: ParseError[];
}

export interface ParseError {
  message: string;
  location: SourceLocation;
  severity: 'error' | 'warning';
}

export interface ParseResult {
  files: ParsedFile[];
  totalFiles: number;
  totalLinesOfCode: number;
  parseErrors: ParseError[];
  parseDurationMs: number;
}

// Rust-specific element types
export interface StructElement extends CodeElement {
  type: ElementType.STRUCT;
  fields: PropertyElement[];
  isPublic: boolean;
  genericParams?: string[];
  derives?: string[]; // #[derive(...)]
}

export interface TraitElement extends CodeElement {
  type: ElementType.TRAIT;
  methods: MethodElement[];
  associatedTypes?: string[];
  isPublic: boolean;
}

export interface ImplElement extends CodeElement {
  type: ElementType.IMPL;
  targetType: string; // Type being implemented for
  traitName?: string; // Trait being implemented (if trait impl)
  methods: MethodElement[];
}
