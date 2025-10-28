/**
 * Sprint Generator Types
 *
 * DESIGN DECISION: Strongly typed sprint generation data structures
 * WHY: TypeScript types ensure template data matches expected structure
 *
 * REASONING CHAIN:
 * 1. Templates expect specific data structure (tasks, dependencies, metrics)
 * 2. Type safety prevents runtime errors during template rendering
 * 3. IntelliSense helps developers understand template variables
 * 4. Validation catches missing fields before generation
 * 5. Result: Reliable, maintainable sprint generation
 *
 * PATTERN: Pattern-TYPESCRIPT-001 (Type-safe template data)
 */

import { AnalysisResult, ArchitectureAnalysis, ComplexityAnalysis, TechnicalDebtAnalysis } from '../analyzers/types';

/**
 * Sprint task representation
 */
export interface Task {
  id: string;
  title: string;
  agent: string;
  duration: number; // hours
  dependencies: string[];
  priority: 'High' | 'Medium' | 'Low';
  designDecision: string;
  why: string;
  reasoningChain: string[];
  implementationSteps: string[];
  validationCriteria: string[];
  filesToModify: string[];
  pattern: string;
  related: string;
  performanceTarget?: string;
  securityConsiderations?: string[];
  beforeComplexity?: number;
  targetComplexity?: number;
  breakingChanges?: string[];
  testingStrategy?: string[];
}

/**
 * Task dependency edge (for Mermaid diagram)
 */
export interface TaskDependency {
  from: string;
  to: string;
}

/**
 * Risk assessment
 */
export interface Risk {
  title: string;
  severity: 'High' | 'Medium' | 'Low';
  probability: 'High' | 'Medium' | 'Low';
  scenario: string;
  mitigation: string[];
  contingency: string;
  rollback?: string;
}

/**
 * Weekly task breakdown
 */
export interface WeeklyBreakdown {
  week: number;
  tasks: {
    day: number;
    taskId: string;
    taskTitle: string;
    hours: number;
  }[];
}

/**
 * Integration point
 */
export interface IntegrationPoint {
  name: string;
  type: string;
  location: string;
  description: string;
  implementation: string[];
  aetherlightFeature?: string;
  currentImplementation?: string;
  afterIntegration?: string;
  migrationSteps?: string[];
  benefits?: string[];
  performanceImpact?: string;
}

/**
 * Analysis decision (Chain of Thought)
 */
export interface AnalysisDecision {
  title: string;
  designDecision: string;
  why: string;
  reasoningChain: string[];
  evidence: string[];
  alternativesConsidered?: string[];
  tradeOffs?: string[];
}

/**
 * Refactoring pattern
 */
export interface RefactoringPattern {
  name: string;
  context: string;
  problem: string;
  solution: string;
  language: string;
  before: string;
  after: string;
  whyThisWorks: string[];
}

/**
 * Performance target
 */
export interface PerformanceTarget {
  metric: string;
  target: string;
  current: string;
}

/**
 * Complexity target
 */
export interface ComplexityTarget {
  metric: string;
  before: number;
  target: number;
  improvement: string;
}

/**
 * Debt target
 */
export interface DebtTarget {
  category: string;
  before: number;
  target: number;
  reduction: string;
}

/**
 * Phase A (Enhancement) template data
 */
export interface PhaseAData {
  timestamp: string;
  estimatedWeeks: number;
  designDecision: string;
  why: string;
  reasoningChain: string[];
  insight: string;
  repositoryName: string;
  features: string[];
  successCriteria: string[];
  architecture: ArchitectureAnalysis;
  tasks: Task[];
  taskDependencies: TaskDependency[];
  phaseCompletionCriteria: string[];
  expectedOutcomes: string[];
  performanceTargets: PerformanceTarget[];
  risks: Risk[];
  estimatedStart: string;
  estimatedCompletion: string;
  weeklyBreakdown: WeeklyBreakdown[];
  relatedDocuments: string[];
  aetherlightPatterns: string[];
  externalResources: string[];
  integrationPoints: IntegrationPoint[];
  analysisDecisions: AnalysisDecision[];
  firstTaskId: string;
  owner: string;
}

/**
 * Phase B (Retrofit) template data
 */
export interface PhaseBData {
  timestamp: string;
  estimatedWeeks: number;
  designDecision: string;
  why: string;
  reasoningChain: string[];
  insight: string;
  repositoryName: string;
  refactoringGoals: string[];
  successCriteria: string[];
  debtScore: number;
  debtCategories: { name: string; count: number; severity: string }[];
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  averageComplexity: number;
  medianComplexity: number;
  maxComplexity: number;
  highComplexityCount: number;
  topRefactoringTargets: {
    functionName: string;
    complexity: number;
    filePath: string;
    line: number;
    recommendation: string;
  }[];
  tasks: Task[];
  taskDependencies: TaskDependency[];
  phaseCompletionCriteria: string[];
  expectedOutcomes: string[];
  complexityTargets: ComplexityTarget[];
  debtTargets: DebtTarget[];
  risks: Risk[];
  estimatedStart: string;
  estimatedCompletion: string;
  weeklyBreakdown: WeeklyBreakdown[];
  refactoringPatterns: RefactoringPattern[];
  testCoverageGoals: { metric: string; current: string; target: string }[];
  testingApproach: string[];
  criticalTestCases: string[];
  refactoringDecisions: AnalysisDecision[];
  hasMigration: boolean;
  migrationRequired: boolean;
  migrationSteps?: string[];
  rollbackProcedure?: string[];
  startingComplexity: number;
  targetComplexity: number;
  startingDebt: number;
  targetDebt: number;
  firstTaskId: string;
  owner: string;
}

/**
 * Phase C (Dogfood) template data
 */
export interface PhaseCData {
  timestamp: string;
  estimatedWeeks: number;
  designDecision: string;
  why: string;
  reasoningChain: string[];
  insight: string;
  repositoryName: string;
  integrationGoals: string[];
  successCriteria: string[];
  sdkVersion: string;
  sdkFeatures: { name: string; description: string }[];
  tasks: Task[];
  taskDependencies: TaskDependency[];
  integrationPoints: IntegrationPoint[];
  phaseCompletionCriteria: string[];
  expectedOutcomes: string[];
  performanceTargets: PerformanceTarget[];
  uxImprovements: string[];
  integrationTests: { name: string; description: string; expectedResult: string }[];
  e2eTests: { name: string; userFlow: string; validation: string }[];
  performanceTests: { metric: string; target: string; threshold: string }[];
  risks: Risk[];
  estimatedStart: string;
  estimatedCompletion: string;
  weeklyBreakdown: WeeklyBreakdown[];
  aetherlightPatterns: {
    name: string;
    patternId: string;
    context: string;
    implementation: string;
    language: string;
    codeExample: string;
    whyThisWorks: string[];
    reference: string;
  }[];
  config: {
    patternMatching: {
      localFirst: boolean;
      confidenceThreshold: number;
      maxResults: number;
    };
    confidenceScoring: {
      dimensions: number;
      semanticWeight: number;
      contextWeight: number;
    };
    offline: {
      enabled: boolean;
      whisperModel: string;
      embeddingModel: string;
    };
    privacy: {
      localOnly: boolean;
      sharePatterns: boolean;
      anonymize: boolean;
    };
  };
  envVariables: { name: string; value: string; description: string }[];
  integrationDecisions: AnalysisDecision[];
  requiredKnowledge: string[];
  trainingSessions: { title: string; duration: string; topics: string[]; materials: string }[];
  documentation: { title: string; url: string }[];
  deploymentPhases: {
    name: string;
    duration: string;
    scope: string;
    users: string;
    rollbackCriteria: string;
  }[];
  monitoringMetrics: { metric: string; threshold: string }[];
  rollbackPlan: string[];
  testCoverage: string;
  performanceTarget: string;
  securityScore: string;
  firstTaskId: string;
  owner: string;
}

/**
 * Sprint generation options
 */
export interface SprintGeneratorOptions {
  repositoryName: string;
  repositoryPath: string;
  owner?: string;
  estimatedStartDate?: Date;
}

/**
 * Generated sprint result
 */
export interface GeneratedSprint {
  phase: 'A' | 'B' | 'C';
  filePath: string;
  content: string;
  taskCount: number;
  estimatedDuration: number; // weeks
}
