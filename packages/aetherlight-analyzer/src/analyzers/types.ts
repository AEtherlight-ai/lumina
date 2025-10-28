/**
 * DESIGN DECISION: Shared types for all analyzers
 * WHY: Consistent data model enables composition of analysis results
 *
 * REASONING CHAIN:
 * 1. Multiple analyzers (architecture, complexity, debt, dependency)
 * 2. Need common output format for aggregation
 * 3. Create analysis-agnostic types (AnalysisResult, Issue, Metric)
 * 4. Each analyzer produces structured output
 * 5. Result: Sprint generator consumes unified analysis data
 *
 * PATTERN: Pattern-ANALYZER-001 (AST-Based Code Analysis)
 */

import { ParseResult, ParsedFile } from '../parsers/types';

export interface AnalysisResult {
  analyzers: AnalyzerResult[];
  summary: AnalysisSummary;
  issues: Issue[];
  metrics: Record<string, number>;
  recommendations: Recommendation[];
  timestamp: string;
}

export interface AnalyzerResult {
  name: string; // "architecture" | "complexity" | "debt" | "dependency"
  version: string;
  executionTimeMs: number;
  data: any; // Analyzer-specific data
}

export interface AnalysisSummary {
  totalFiles: number;
  totalLinesOfCode: number;
  languages: Record<string, number>; // { typescript: 38920, rust: 6283 }
  parseErrors: number;
  analysisErrors: number;
}

export interface Issue {
  type: IssueType;
  severity: IssueSeverity;
  location: IssueLocation;
  message: string;
  recommendation?: string;
  effort?: IssueEffort;
  impact?: IssueImpact;
}

export enum IssueType {
  ARCHITECTURE = 'architecture',
  COMPLEXITY = 'complexity',
  DEBT = 'debt',
  DEPENDENCY = 'dependency',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
}

export enum IssueSeverity {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export enum IssueEffort {
  HIGH = 'high', // >1 week
  MEDIUM = 'medium', // 1-3 days
  LOW = 'low', // <1 day
}

export enum IssueImpact {
  HIGH = 'high', // Critical business/performance impact
  MEDIUM = 'medium', // Moderate improvement
  LOW = 'low', // Nice to have
}

export interface IssueLocation {
  filePath: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  context?: string; // Surrounding code snippet
}

export interface Recommendation {
  title: string;
  description: string;
  rationale: string; // WHY this recommendation
  reasoning: string[]; // REASONING CHAIN steps
  pattern?: string; // Pattern-XXX-YYY reference
  effort: IssueEffort;
  impact: IssueImpact;
  tasks: RecommendationTask[];
}

export interface RecommendationTask {
  id: string; // "A-001", "B-003", etc.
  title: string;
  description: string;
  estimatedHours: number;
  dependencies: string[]; // Task IDs
  files: string[]; // Files to modify
}

// Architecture-specific types

export interface ArchitectureAnalysis {
  pattern: ArchitecturePattern;
  confidence: number; // 0.0 to 1.0
  layers: ArchitectureLayer[];
  components: Component[];
  relationships: Relationship[];
  diagram: string; // Mermaid diagram
}

export enum ArchitecturePattern {
  MVC = 'MVC',
  MVVM = 'MVVM',
  CLEAN = 'Clean Architecture',
  HEXAGONAL = 'Hexagonal Architecture',
  LAYERED = 'Layered Architecture',
  MICROSERVICES = 'Microservices',
  MONOLITH = 'Monolith',
  UNKNOWN = 'Unknown',
}

export interface ArchitectureLayer {
  name: string; // "Controllers", "Services", "Models", "Views"
  files: string[];
  linesOfCode: number;
  complexity: 'high' | 'medium' | 'low';
  dependencies: string[]; // Other layer names
}

export interface Component {
  name: string;
  type: ComponentType;
  files: string[];
  responsibilities: string[];
  dependencies: string[]; // Component names
}

export enum ComponentType {
  CONTROLLER = 'controller',
  SERVICE = 'service',
  MODEL = 'model',
  REPOSITORY = 'repository',
  VIEW = 'view',
  UTILITY = 'utility',
  MIDDLEWARE = 'middleware',
  ROUTER = 'router',
}

export interface Relationship {
  from: string; // Component name
  to: string; // Component name
  type: RelationshipType;
  strength: number; // 0.0 to 1.0 (based on # of calls/imports)
}

export enum RelationshipType {
  USES = 'uses',
  EXTENDS = 'extends',
  IMPLEMENTS = 'implements',
  DEPENDS_ON = 'depends_on',
  AGGREGATES = 'aggregates',
}

// Complexity-specific types

export interface ComplexityAnalysis {
  averageComplexity: number;
  medianComplexity: number;
  maxComplexity: number;
  functionsOverThreshold: ComplexityIssue[];
  heatmap: ComplexityHeatmap[];
}

export interface ComplexityIssue {
  functionName: string;
  filePath: string;
  line: number;
  complexity: number;
  threshold: number; // 15 by default
  recommendation: string;
}

export interface ComplexityHeatmap {
  filePath: string;
  averageComplexity: number;
  maxComplexity: number;
  functionCount: number;
}

// Technical debt-specific types

export interface TechnicalDebtAnalysis {
  totalIssues: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  categories: Record<string, number>;
  issues: TechnicalDebtIssue[];
  score: number; // 0-100 (0 = no debt, 100 = critical)
}

export interface TechnicalDebtIssue {
  category: TechnicalDebtCategory;
  severity: IssueSeverity;
  location: IssueLocation;
  description: string;
  recommendation: string;
}

export enum TechnicalDebtCategory {
  TODO = 'todo',
  FIXME = 'fixme',
  HACK = 'hack',
  MAGIC_NUMBER = 'magic_number',
  HARDCODED_STRING = 'hardcoded_string',
  MISSING_ERROR_HANDLING = 'missing_error_handling',
  DEPRECATED_API = 'deprecated_api',
  DUPLICATE_CODE = 'duplicate_code',
  LONG_METHOD = 'long_method',
  GOD_CLASS = 'god_class',
}

// Dependency-specific types

export interface DependencyAnalysis {
  graph: DependencyGraph;
  cycles: DependencyCycle[];
  orphans: string[]; // Files with no dependencies
  hubs: DependencyHub[]; // Files with many dependents
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export interface DependencyNode {
  id: string; // File path
  label: string; // File name
  type: 'file' | 'module' | 'package';
  linesOfCode: number;
}

export interface DependencyEdge {
  from: string; // Node ID
  to: string; // Node ID
  type: 'import' | 'require' | 'dynamic_import';
  count: number; // Number of imports
}

export interface DependencyCycle {
  files: string[];
  severity: IssueSeverity;
  recommendation: string;
}

export interface DependencyHub {
  filePath: string;
  dependentCount: number;
  recommendation: string;
}
