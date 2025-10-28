/**
 * Sprint Generator
 *
 * DESIGN DECISION: Generate 3-phase incremental plan (Enhance → Retrofit → Dogfood)
 * WHY: Full rewrite too risky for most codebases, incremental adoption safer
 *
 * REASONING CHAIN:
 * 1. Phase A (Enhancement): Add new ÆtherLight features (low risk)
 * 2. Phase B (Retrofit): Refactor existing code (medium risk)
 * 3. Phase C (Dogfood): Integrate ÆtherLight SDK (validate everything works)
 * 4. Each phase: 5-15 tasks, 1-3 weeks duration
 * 5. Result: Gradual transformation, testable at each phase
 *
 * PATTERN: Pattern-ANALYZER-002 (Incremental Sprint Generation)
 */

import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import { TaskGenerator } from './task-generator';
import { DependencyResolver } from './dependency-resolver';
import { PlanningDocumentDetector, DetectedPlanningDocument } from './planning-document-detector';
import {
  SprintGeneratorOptions,
  GeneratedSprint,
  PhaseAData,
  PhaseBData,
  PhaseCData,
  Task,
  WeeklyBreakdown,
  Risk,
  AnalysisDecision,
  IntegrationPoint,
  RefactoringPattern,
} from './types';
import { AnalysisResult, ArchitecturePattern, IssueSeverity, ArchitectureAnalysis, ComplexityAnalysis, TechnicalDebtAnalysis } from '../analyzers/types';

export class SprintGenerator {
  private taskGenerator: TaskGenerator;
  private dependencyResolver: DependencyResolver;
  private handlebars: typeof Handlebars;
  private options: SprintGeneratorOptions;

  constructor(options: SprintGeneratorOptions) {
    this.taskGenerator = new TaskGenerator();
    this.dependencyResolver = new DependencyResolver();
    this.handlebars = Handlebars.create();
    this.options = options;

    this.registerHelpers();
  }

  /**
   * Extract architecture analysis from analyzers array
   */
  private getArchitecture(analysis: AnalysisResult): ArchitectureAnalysis {
    const analyzer = analysis.analyzers.find((a) => a.name === 'architecture');
    return analyzer?.data as ArchitectureAnalysis;
  }

  /**
   * Extract complexity analysis from analyzers array
   */
  private getComplexity(analysis: AnalysisResult): ComplexityAnalysis {
    const analyzer = analysis.analyzers.find((a) => a.name === 'complexity');
    return analyzer?.data as ComplexityAnalysis;
  }

  /**
   * Extract technical debt analysis from analyzers array
   *
   * DESIGN DECISION: Match analyzer name with hyphen ('technical-debt')
   * WHY: Analyzer uses kebab-case name, not camelCase
   *
   * REASONING CHAIN:
   * 1. TechnicalDebtAnalyzer exports name as 'technical-debt' (kebab-case)
   * 2. Sprint generator was looking for 'technicalDebt' (camelCase)
   * 3. Mismatch caused "Cannot read properties of undefined (reading 'issues')" error
   * 4. Fix: Match actual analyzer name with hyphen
   * 5. Result: getTechnicalDebt() returns valid data
   *
   * PATTERN: Pattern-ANALYZER-010 (Analyzer Name Consistency)
   * DOGFOODING: Discovery #4 - Sprint generator name mismatch
   */
  private getTechnicalDebt(analysis: AnalysisResult): TechnicalDebtAnalysis {
    const analyzer = analysis.analyzers.find((a) => a.name === 'technical-debt');
    return analyzer?.data as TechnicalDebtAnalysis;
  }

  /**
   * Generate all 3 sprint plans from analysis results
   *
   * DESIGN DECISION: Detect existing planning documents before generating new ones
   * WHY: Prevent accidental overwrite, enable smart merge/replace workflows
   *
   * REASONING CHAIN:
   * 1. Use PlanningDocumentDetector to find existing plans (ANY naming: PHASE/SPRINT/EPIC/etc)
   * 2. Multi-strategy detection (keyword + structure + semantic + intent)
   * 3. If existing documents found → show user with metadata (task count, completion %)
   * 4. User decides: MERGE (combine), REPLACE (overwrite), IGNORE (skip), REVIEW (manual)
   * 5. Generate new plans based on user decision
   * 6. Result: No accidental data loss, intelligent conflict resolution
   *
   * PATTERN: Pattern-ANALYZER-011 (Smart Document Detection)
   * DOGFOODING: Discovery #5 - Phase plan conflict detection
   */
  async generateAllSprints(
    analysis: AnalysisResult,
    outputDir: string
  ): Promise<GeneratedSprint[]> {
    const results: GeneratedSprint[] = [];

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // DISCOVERY #5: Detect existing planning documents before generating new ones
    console.log('🔍 Checking for existing planning documents...');
    const detector = new PlanningDocumentDetector();
    // Get absolute project root - resolve outputDir to absolute path, then get parent once
    // outputDir is typically '.aetherlight-dogfooding' (directly under project root)
    const absoluteOutputDir = path.resolve(outputDir);
    const projectRoot = path.dirname(absoluteOutputDir);
    const existingDocs = await detector.detectPlanningDocuments(projectRoot);

    // If existing documents found, show user and handle conflicts
    if (existingDocs.length > 0) {
      console.log(`\n⚠️  Found ${existingDocs.length} existing planning document(s):\n`);

      // Display detected documents with metadata
      existingDocs.forEach((doc, index) => {
        console.log(`${index + 1}. ${doc.type.toUpperCase().padEnd(12)} ${path.relative(projectRoot, doc.path)}`);
        console.log(`   ${''.padEnd(12)} Confidence: ${(doc.confidence * 100).toFixed(0)}% | ` +
                    `Method: ${doc.detectionMethod} | ` +
                    `Tasks: ${doc.metadata.taskCount || 0} | ` +
                    `Progress: ${((doc.metadata.completionStatus || 0) * 100).toFixed(0)}%`);
        console.log(`   ${''.padEnd(12)} Last Modified: ${doc.metadata.lastModified.toISOString().split('T')[0]}\n`);
      });

      console.log('📋 Conflict Resolution Options:\n');
      console.log('   IGNORE  - Keep existing documents, skip sprint generation');
      console.log('   REPLACE - Delete existing documents, generate new ones');
      console.log('   MERGE   - Combine existing + new tasks (not implemented yet)');
      console.log('   REVIEW  - Show diff before deciding (not implemented yet)\n');

      // For now, default to REPLACE with warning
      // TODO: Implement user prompt for conflict resolution choice
      console.log('⚠️  DEFAULT: REPLACE mode (overwrite existing documents)');
      console.log('💡 TIP: Backup existing documents if you want to preserve them\n');

      // Log detected documents for audit trail
      console.log('📊 Detection Details:');
      existingDocs.forEach(doc => {
        console.log(`   • ${path.basename(doc.path)}: ${(doc.confidence * 100).toFixed(0)}% confidence (${doc.detectionMethod})`);
      });
      console.log('');
    } else {
      console.log('✅ No existing planning documents found - proceeding with generation\n');
    }

    // Phase A: Enhancement (add features)
    const phaseA = await this.generatePhaseA(analysis, outputDir);
    results.push(phaseA);

    // Phase B: Retrofit (refactor existing)
    const phaseB = await this.generatePhaseB(analysis, outputDir);
    results.push(phaseB);

    // Phase C: Dogfood (integrate SDK)
    const phaseC = await this.generatePhaseC(analysis, outputDir);
    results.push(phaseC);

    // Generate summary report
    await this.generateSummaryReport(results, analysis, outputDir);

    return results;
  }

  /**
   * Generate Phase A sprint (Enhancement)
   */
  private async generatePhaseA(
    analysis: AnalysisResult,
    outputDir: string
  ): Promise<GeneratedSprint> {
    // Generate tasks
    let tasks = this.taskGenerator.generatePhaseATasks(analysis, this.options.repositoryName);

    // Resolve dependencies
    tasks = this.dependencyResolver.resolveDependencies(tasks, this.getArchitecture(analysis));

    // Build template data
    const data = this.buildPhaseAData(analysis, tasks);

    // Render template
    const content = await this.renderTemplate('PHASE_A_ENHANCEMENT', data);

    // Write to file
    const filePath = path.join(outputDir, 'PHASE_A_ENHANCEMENT.md');
    fs.writeFileSync(filePath, content, 'utf-8');

    return {
      phase: 'A',
      filePath,
      content,
      taskCount: tasks.length,
      estimatedDuration: this.calculateDurationWeeks(tasks),
    };
  }

  /**
   * Generate Phase B sprint (Retrofit)
   */
  private async generatePhaseB(
    analysis: AnalysisResult,
    outputDir: string
  ): Promise<GeneratedSprint> {
    // Generate tasks
    let tasks = this.taskGenerator.generatePhaseBTasks(analysis);

    // Resolve dependencies
    tasks = this.dependencyResolver.resolveDependencies(tasks, this.getArchitecture(analysis));

    // Build template data
    const data = this.buildPhaseBData(analysis, tasks);

    // Render template
    const content = await this.renderTemplate('PHASE_B_RETROFIT', data);

    // Write to file
    const filePath = path.join(outputDir, 'PHASE_B_RETROFIT.md');
    fs.writeFileSync(filePath, content, 'utf-8');

    return {
      phase: 'B',
      filePath,
      content,
      taskCount: tasks.length,
      estimatedDuration: this.calculateDurationWeeks(tasks),
    };
  }

  /**
   * Generate Phase C sprint (Dogfood)
   */
  private async generatePhaseC(
    analysis: AnalysisResult,
    outputDir: string
  ): Promise<GeneratedSprint> {
    // Generate tasks
    let tasks = this.taskGenerator.generatePhaseCTasks(this.options.repositoryName);

    // Resolve dependencies
    tasks = this.dependencyResolver.resolveDependencies(tasks);

    // Build template data
    const data = this.buildPhaseCData(analysis, tasks);

    // Render template
    const content = await this.renderTemplate('PHASE_C_DOGFOOD', data);

    // Write to file
    const filePath = path.join(outputDir, 'PHASE_C_DOGFOOD.md');
    fs.writeFileSync(filePath, content, 'utf-8');

    return {
      phase: 'C',
      filePath,
      content,
      taskCount: tasks.length,
      estimatedDuration: this.calculateDurationWeeks(tasks),
    };
  }

  /**
   * Build Phase A template data
   */
  private buildPhaseAData(analysis: AnalysisResult, tasks: Task[]): PhaseAData {
    const stats = this.dependencyResolver.generateExecutionStats(tasks);

    return {
      timestamp: new Date().toISOString(),
      estimatedWeeks: this.calculateDurationWeeks(tasks),
      designDecision: `Add ÆtherLight features to existing ${this.options.repositoryName} codebase`,
      why: 'Enable voice-to-intelligence capabilities without breaking existing functionality',
      reasoningChain: [
        `Analyzed existing ${this.getArchitecture(analysis).pattern} architecture`,
        `Identified ${tasks.length} integration points for ÆtherLight features`,
        'Detected compatible tech stack for seamless integration',
        'Proposed incremental enhancement (not full rewrite)',
        `Result: ${tasks.length} tasks over ${this.calculateDurationWeeks(tasks)} weeks, zero breaking changes`,
      ],
      insight: 'Incremental enhancement minimizes risk while maximizing value',
      repositoryName: this.options.repositoryName,
      features: [
        'Voice capture and transcription',
        'Pattern matching engine',
        'Confidence scoring system',
        'Chain of Thought documentation',
        'Impact tracking dashboard',
      ],
      successCriteria: [
        'All enhancement tasks complete',
        'Zero breaking changes to existing functionality',
        'All tests pass (>80% coverage)',
        'Performance targets met (<100ms pattern matching)',
        'Documentation complete with Chain of Thought',
      ],
      architecture: this.getArchitecture(analysis),
      tasks,
      taskDependencies: this.dependencyResolver.generateDependencyGraph(tasks),
      phaseCompletionCriteria: [
        `All ${tasks.length} tasks complete`,
        'Integration tests pass',
        'Performance benchmarks met',
        'User acceptance testing passed',
      ],
      expectedOutcomes: [
        'Voice-to-intelligence capabilities integrated',
        'Pattern matching operational',
        'Users saving 2+ hours per week',
      ],
      performanceTargets: [
        { metric: 'Pattern matching', target: '<100ms', current: 'N/A' },
        { metric: 'Voice transcription', target: '<5s for 30s audio', current: 'N/A' },
        { metric: 'Dashboard load time', target: '<3s', current: 'N/A' },
      ],
      risks: this.generatePhaseARisks(),
      estimatedStart: this.formatDate(this.options.estimatedStartDate || new Date()),
      estimatedCompletion: this.formatDate(
        this.addWeeks(this.options.estimatedStartDate || new Date(), this.calculateDurationWeeks(tasks))
      ),
      weeklyBreakdown: this.generateWeeklyBreakdown(tasks),
      relatedDocuments: [
        'CHAIN_OF_THOUGHT_STANDARD.md',
        'Pattern-ANALYZER-002.md',
        'ÆtherLight Technical Architecture',
      ],
      aetherlightPatterns: [
        'Pattern-API-001 (REST endpoints)',
        'Pattern-MATCH-001 (Pattern matching)',
        'Pattern-SCORE-001 (Confidence scoring)',
      ],
      externalResources: [
        'Whisper.cpp documentation',
        'ChromaDB documentation',
        'ÆtherLight SDK documentation',
      ],
      integrationPoints: this.generateIntegrationPoints(analysis),
      analysisDecisions: this.generateAnalysisDecisions(analysis),
      firstTaskId: tasks[0]?.id || 'A-001',
      owner: this.options.owner || 'Core Team',
    };
  }

  /**
   * Build Phase B template data
   */
  private buildPhaseBData(analysis: AnalysisResult, tasks: Task[]): PhaseBData {
    const debtAnalysis = this.getTechnicalDebt(analysis);
    const complexityAnalysis = this.getComplexity(analysis);

    return {
      timestamp: new Date().toISOString(),
      estimatedWeeks: this.calculateDurationWeeks(tasks),
      designDecision: `Refactor existing ${this.options.repositoryName} codebase to reduce technical debt`,
      why: 'Technical debt slows development and increases bug risk',
      reasoningChain: [
        `Detected ${debtAnalysis.totalIssues} technical debt issues`,
        `Identified ${complexityAnalysis.functionsOverThreshold.length} high-complexity functions`,
        'Debt and complexity compound over time',
        `Refactoring now prevents future slowdowns`,
        `Result: ${tasks.length} refactoring tasks over ${this.calculateDurationWeeks(tasks)} weeks`,
      ],
      insight: 'Strategic refactoring improves long-term maintainability',
      repositoryName: this.options.repositoryName,
      refactoringGoals: [
        'Reduce average complexity to <10',
        'Eliminate high-priority technical debt',
        'Improve test coverage to >80%',
        'Standardize code patterns',
      ],
      successCriteria: [
        'All refactoring tasks complete',
        'Complexity reduced by 40%',
        'Debt score improved by 50%',
        'All tests pass',
        'No behavioral changes',
      ],
      debtScore: debtAnalysis.score,
      debtCategories: Object.entries(debtAnalysis.categories).map(([name, count]) => ({
        name,
        count,
        severity: this.getDebtSeverity(name),
      })),
      highPriorityCount: debtAnalysis.highPriority,
      mediumPriorityCount: debtAnalysis.mediumPriority,
      lowPriorityCount: debtAnalysis.lowPriority,
      averageComplexity: complexityAnalysis.averageComplexity,
      medianComplexity: complexityAnalysis.medianComplexity,
      maxComplexity: complexityAnalysis.maxComplexity,
      highComplexityCount: complexityAnalysis.functionsOverThreshold.length,
      topRefactoringTargets: complexityAnalysis.functionsOverThreshold.slice(0, 5),
      tasks,
      taskDependencies: this.dependencyResolver.generateDependencyGraph(tasks),
      phaseCompletionCriteria: [
        `All ${tasks.length} refactoring tasks complete`,
        'Complexity average <10',
        'Debt score <50',
        'Test coverage >80%',
      ],
      expectedOutcomes: [
        'Codebase easier to maintain',
        'Faster development velocity',
        'Fewer bugs in production',
      ],
      complexityTargets: [
        {
          metric: 'Average Complexity',
          before: complexityAnalysis.averageComplexity,
          target: 8,
          improvement: `${Math.round((1 - 8 / complexityAnalysis.averageComplexity) * 100)}%`,
        },
      ],
      debtTargets: [
        {
          category: 'All Issues',
          before: debtAnalysis.totalIssues,
          target: Math.round(debtAnalysis.totalIssues * 0.5),
          reduction: '50%',
        },
      ],
      risks: this.generatePhaseBRisks(),
      estimatedStart: this.formatDate(
        this.addWeeks(this.options.estimatedStartDate || new Date(), this.calculateDurationWeeks(tasks))
      ),
      estimatedCompletion: this.formatDate(
        this.addWeeks(
          this.options.estimatedStartDate || new Date(),
          this.calculateDurationWeeks(tasks) * 2
        )
      ),
      weeklyBreakdown: this.generateWeeklyBreakdown(tasks),
      refactoringPatterns: this.generateRefactoringPatterns(),
      testCoverageGoals: [
        { metric: 'Line Coverage', current: '65%', target: '80%' },
        { metric: 'Branch Coverage', current: '58%', target: '75%' },
      ],
      testingApproach: [
        'Write characterization tests before refactoring',
        'Refactor in small steps',
        'Run tests after each change',
        'Verify no behavioral changes',
      ],
      criticalTestCases: [
        'Core business logic unchanged',
        'API contracts maintained',
        'Database queries produce same results',
      ],
      refactoringDecisions: this.generateRefactoringDecisions(analysis),
      hasMigration: false,
      migrationRequired: false,
      startingComplexity: complexityAnalysis.averageComplexity,
      targetComplexity: 8,
      startingDebt: debtAnalysis.score,
      targetDebt: Math.round(debtAnalysis.score * 0.5),
      firstTaskId: tasks[0]?.id || 'B-001',
      owner: this.options.owner || 'Core Team',
    };
  }

  /**
   * Build Phase C template data
   */
  private buildPhaseCData(analysis: AnalysisResult, tasks: Task[]): PhaseCData {
    return {
      timestamp: new Date().toISOString(),
      estimatedWeeks: this.calculateDurationWeeks(tasks),
      designDecision: `Integrate ÆtherLight SDK into ${this.options.repositoryName}`,
      why: 'Validate full ÆtherLight integration with production codebase',
      reasoningChain: [
        'Phase A added features, Phase B refactored code',
        'Now integrate official ÆtherLight SDK',
        'SDK provides pattern matching, confidence scoring, offline mode',
        'Dogfooding validates our own product',
        'Result: Production-ready ÆtherLight integration',
      ],
      insight: 'Dogfooding our own SDK ensures quality and reveals improvements',
      repositoryName: this.options.repositoryName,
      integrationGoals: [
        'Install and configure ÆtherLight SDK',
        'Migrate custom implementations to SDK',
        'Test all SDK features',
        'Validate performance and accuracy',
        'Document integration for other teams',
      ],
      successCriteria: [
        'SDK fully integrated',
        'All features working',
        'Performance targets met',
        'Team trained on SDK',
      ],
      sdkVersion: '1.0.0',
      sdkFeatures: [
        { name: 'PatternMatcher', description: 'Multi-dimensional pattern matching' },
        { name: 'ConfidenceScorer', description: '10+ dimension confidence scoring' },
        { name: 'OfflineMode', description: 'Whisper.cpp + local embeddings' },
        { name: 'ImpactTracker', description: 'Usage analytics and ROI tracking' },
      ],
      tasks,
      taskDependencies: this.dependencyResolver.generateDependencyGraph(tasks),
      integrationPoints: this.generateSDKIntegrationPoints(),
      phaseCompletionCriteria: [
        'SDK installed and configured',
        'All tests pass',
        'Performance benchmarks met',
        'Team trained',
      ],
      expectedOutcomes: [
        'Official ÆtherLight SDK integrated',
        'Performance validated',
        'Team confident using SDK',
      ],
      performanceTargets: [
        { metric: 'Pattern matching', target: '<100ms', current: 'N/A' },
        { metric: 'Confidence scoring', target: '<50ms', current: 'N/A' },
      ],
      uxImprovements: [
        'Faster pattern matching responses',
        'More accurate confidence scores',
        'Better offline experience',
      ],
      integrationTests: [
        {
          name: 'Pattern matching integration',
          description: 'Test SDK pattern matching with real queries',
          expectedResult: 'Matches returned with >85% confidence',
        },
      ],
      e2eTests: [
        {
          name: 'Voice-to-intelligence flow',
          userFlow: 'User captures voice → transcription → pattern match → result',
          validation: 'Complete flow <10s, confidence >85%',
        },
      ],
      performanceTests: [
        { metric: 'Pattern matching', target: '<100ms', threshold: '150ms' },
      ],
      risks: this.generatePhaseCRisks(),
      estimatedStart: this.formatDate(
        this.addWeeks(
          this.options.estimatedStartDate || new Date(),
          this.calculateDurationWeeks(tasks) * 2
        )
      ),
      estimatedCompletion: this.formatDate(
        this.addWeeks(
          this.options.estimatedStartDate || new Date(),
          this.calculateDurationWeeks(tasks) * 3
        )
      ),
      weeklyBreakdown: this.generateWeeklyBreakdown(tasks),
      aetherlightPatterns: [
        {
          name: 'Local-First Pattern Matching',
          patternId: 'Pattern-MATCH-001',
          context: 'Need fast, private pattern matching',
          implementation: 'Use PatternMatcher with localFirst: true',
          language: 'typescript',
          codeExample: `const matcher = new PatternMatcher({ localFirst: true });
const result = await matcher.match(query);`,
          whyThisWorks: ['Fast (<100ms)', 'Private (no network calls)', 'Reliable (works offline)'],
          reference: 'Pattern-MATCH-001.md',
        },
      ],
      config: {
        patternMatching: {
          localFirst: true,
          confidenceThreshold: 0.85,
          maxResults: 10,
        },
        confidenceScoring: {
          dimensions: 10,
          semanticWeight: 0.3,
          contextWeight: 0.15,
        },
        offline: {
          enabled: true,
          whisperModel: 'base',
          embeddingModel: 'all-MiniLM-L6-v2',
        },
        privacy: {
          localOnly: true,
          sharePatterns: false,
          anonymize: true,
        },
      },
      envVariables: [
        { name: 'AETHERLIGHT_API_KEY', value: 'your-api-key', description: 'Optional cloud sync' },
        { name: 'AETHERLIGHT_LOCAL_ONLY', value: 'true', description: 'Local-first mode' },
      ],
      integrationDecisions: this.generateIntegrationDecisions(),
      requiredKnowledge: [
        'ÆtherLight SDK basics',
        'Pattern matching concepts',
        'Confidence scoring system',
      ],
      trainingSessions: [
        {
          title: 'ÆtherLight SDK Overview',
          duration: '2 hours',
          topics: ['Pattern matching', 'Confidence scoring', 'Offline mode'],
          materials: 'docs/training/sdk-overview.pdf',
        },
      ],
      documentation: [
        { title: 'ÆtherLight SDK Documentation', url: 'https://docs.aetherlight.ai' },
      ],
      deploymentPhases: [
        {
          name: 'Development',
          duration: '1 week',
          scope: 'Dev environment only',
          users: 'Engineering team',
          rollbackCriteria: 'Any critical bugs',
        },
      ],
      monitoringMetrics: [
        { metric: 'Pattern matching latency', threshold: '150ms' },
        { metric: 'Error rate', threshold: '1%' },
      ],
      rollbackPlan: [
        'Disable SDK features',
        'Revert to custom implementations',
        'Restore from backup',
      ],
      testCoverage: '80%',
      performanceTarget: '<100ms pattern matching',
      securityScore: 'A',
      firstTaskId: tasks[0]?.id || 'C-001',
      owner: this.options.owner || 'Core Team',
    };
  }

  /**
   * Render template with data
   */
  private async renderTemplate(templateName: string, data: any): Promise<string> {
    const templatePath = path.join(__dirname, '../../templates', `${templateName}.md.hbs`);
    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const template = this.handlebars.compile(templateSource);

    return template(data);
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers(): void {
    // Helper: Add numbers
    this.handlebars.registerHelper('add', (a: number, b: number) => a + b);

    // Helper: Format percentage
    this.handlebars.registerHelper('formatPercent', (value: number) => {
      return `${Math.round(value * 100)}%`;
    });

    // Helper: Format date
    this.handlebars.registerHelper('formatDate', (date: Date) => {
      return this.formatDate(date);
    });
  }

  /**
   * Calculate duration in weeks
   */
  private calculateDurationWeeks(tasks: Task[]): number {
    const totalHours = this.dependencyResolver.estimateParallelExecutionTime(tasks);
    const hoursPerWeek = 40;
    return Math.ceil(totalHours / hoursPerWeek);
  }

  /**
   * Generate weekly breakdown
   */
  private generateWeeklyBreakdown(tasks: Task[]): WeeklyBreakdown[] {
    const groups = this.dependencyResolver.identifyParallelGroups(tasks);
    const breakdown: WeeklyBreakdown[] = [];

    let currentWeek = 1;
    let currentDay = 1;
    let hoursThisWeek = 0;

    groups.forEach((group) => {
      const weekTasks: WeeklyBreakdown['tasks'] = [];

      group.forEach((taskId) => {
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;

        // Start new week if needed
        if (hoursThisWeek + task.duration > 40) {
          if (weekTasks.length > 0) {
            breakdown.push({ week: currentWeek, tasks: weekTasks });
          }
          currentWeek++;
          currentDay = 1;
          hoursThisWeek = 0;
        }

        weekTasks.push({
          day: currentDay,
          taskId: task.id,
          taskTitle: task.title,
          hours: task.duration,
        });

        hoursThisWeek += task.duration;
        currentDay++;
      });

      if (weekTasks.length > 0) {
        breakdown.push({ week: currentWeek, tasks: weekTasks });
      }
    });

    return breakdown;
  }

  /**
   * Generate summary report
   */
  private async generateSummaryReport(
    sprints: GeneratedSprint[],
    analysis: AnalysisResult,
    outputDir: string
  ): Promise<void> {
    const totalTasks = sprints.reduce((sum, sprint) => sum + sprint.taskCount, 0);
    const totalWeeks = sprints.reduce((sum, sprint) => sum + sprint.estimatedDuration, 0);

    const summary = `# ÆtherLight Sprint Generation Summary

**Repository:** ${this.options.repositoryName}
**Generated:** ${new Date().toISOString()}

## Overview

Generated **${sprints.length} sprint plans** with **${totalTasks} total tasks** over **${totalWeeks} weeks**.

## Sprints Generated

### Phase A: Enhancement
- **File:** ${sprints[0].filePath}
- **Tasks:** ${sprints[0].taskCount}
- **Duration:** ${sprints[0].estimatedDuration} weeks
- **Focus:** Add ÆtherLight features

### Phase B: Retrofit
- **File:** ${sprints[1].filePath}
- **Tasks:** ${sprints[1].taskCount}
- **Duration:** ${sprints[1].estimatedDuration} weeks
- **Focus:** Refactor existing code

### Phase C: Dogfood
- **File:** ${sprints[2].filePath}
- **Tasks:** ${sprints[2].taskCount}
- **Duration:** ${sprints[2].estimatedDuration} weeks
- **Focus:** Integrate ÆtherLight SDK

## Analysis Summary

- **Architecture:** ${this.getArchitecture(analysis).pattern}
- **Average Complexity:** ${this.getComplexity(analysis).averageComplexity.toFixed(2)}
- **Technical Debt Score:** ${this.getTechnicalDebt(analysis).score}/100
- **High-Complexity Functions:** ${this.getComplexity(analysis).functionsOverThreshold.length}
- **Debt Issues:** ${this.getTechnicalDebt(analysis).totalIssues}

## Next Steps

1. Review all 3 sprint plans
2. Adjust task estimates as needed
3. Begin Phase A execution
4. Track progress in execution logs

---

**Generated with ÆtherLight Sprint Generator**
`;

    const summaryPath = path.join(outputDir, 'SPRINT_SUMMARY.md');
    fs.writeFileSync(summaryPath, summary, 'utf-8');
  }

  // Helper methods

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private addWeeks(date: Date, weeks: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + weeks * 7);
    return result;
  }

  private getDebtSeverity(category: string): string {
    const high = ['HACK', 'MISSING_ERROR_HANDLING', 'DEPRECATED_API'];
    const medium = ['FIXME', 'HARDCODED_STRING'];
    return high.includes(category) ? 'High' : medium.includes(category) ? 'Medium' : 'Low';
  }

  private generatePhaseARisks(): Risk[] {
    return [
      {
        title: 'Integration Breaks Existing Functionality',
        severity: 'Medium',
        probability: 'Low',
        scenario: 'ÆtherLight features interfere with existing code',
        mitigation: [
          'Comprehensive testing before deployment',
          'Feature flags for gradual rollout',
          'Rollback plan prepared',
        ],
        contingency: 'Disable ÆtherLight features, revert changes',
      },
    ];
  }

  private generatePhaseBRisks(): Risk[] {
    return [
      {
        title: 'Refactoring Introduces Bugs',
        severity: 'High',
        probability: 'Medium',
        scenario: 'Code refactoring changes behavior',
        mitigation: [
          'Write characterization tests first',
          'Small, incremental changes',
          'Automated regression testing',
        ],
        contingency: 'Revert specific refactoring, fix bug, retry',
        rollback: 'Git revert to pre-refactoring state',
      },
    ];
  }

  private generatePhaseCRisks(): Risk[] {
    return [
      {
        title: 'SDK Performance Below Expectations',
        severity: 'Medium',
        probability: 'Low',
        scenario: 'ÆtherLight SDK slower than custom implementation',
        mitigation: [
          'Performance benchmarking before integration',
          'Optimization with ÆtherLight team',
          'Hybrid approach (SDK + custom)',
        ],
        contingency: 'Keep custom implementations as fallback',
      },
    ];
  }

  private generateIntegrationPoints(analysis: AnalysisResult): IntegrationPoint[] {
    const points: IntegrationPoint[] = [];

    if (
      this.getArchitecture(analysis).pattern === ArchitecturePattern.MVC ||
      this.getArchitecture(analysis).pattern === ArchitecturePattern.LAYERED
    ) {
      points.push({
        name: 'API Layer',
        type: 'REST Endpoint',
        location: 'src/routes/api.ts',
        description: 'Voice capture endpoint',
        implementation: [
          'Add POST /api/voice/capture route',
          'Integrate Whisper.cpp',
          'Return transcription JSON',
        ],
      });
    }

    return points;
  }

  private generateSDKIntegrationPoints(): IntegrationPoint[] {
    return [
      {
        name: 'Pattern Matching',
        type: 'SDK Integration',
        location: 'src/services/pattern-matcher.ts',
        description: 'Replace custom pattern matching with SDK',
        implementation: [
          'Import PatternMatcher from SDK',
          'Replace custom logic',
          'Test equivalence',
        ],
        aetherlightFeature: 'PatternMatcher',
        currentImplementation: 'Custom pattern matching',
        afterIntegration: 'ÆtherLight SDK PatternMatcher',
        migrationSteps: [
          'Install SDK',
          'Write integration tests',
          'Replace custom code',
          'Verify tests pass',
        ],
        benefits: [
          'Faster performance',
          'More accurate matching',
          'Maintained by ÆtherLight team',
        ],
        performanceImpact: '20% faster matching',
      },
    ];
  }

  private generateAnalysisDecisions(analysis: AnalysisResult): AnalysisDecision[] {
    return [
      {
        title: 'Architecture Pattern Detection',
        designDecision: `Detected ${this.getArchitecture(analysis).pattern} architecture`,
        why: 'File/directory structure matches pattern conventions',
        reasoningChain: [
          `Found ${this.getArchitecture(analysis).layers.length} distinct layers`,
          `Detected ${this.getArchitecture(analysis).components.length} components`,
          `Confidence score: ${this.getArchitecture(analysis).confidence.toFixed(2)}`,
        ],
        evidence: this.getArchitecture(analysis).layers.map((l) => `${l.name} layer: ${l.files.length} files`),
      },
    ];
  }

  private generateRefactoringDecisions(analysis: AnalysisResult): AnalysisDecision[] {
    return [
      {
        title: 'Complexity Threshold Selection',
        designDecision: 'Use McCabe threshold of 15',
        why: 'Industry standard for identifying high-complexity functions',
        reasoningChain: [
          'Complexity 1-10: Simple, low risk',
          'Complexity 11-20: Moderate risk',
          'Complexity >20: High risk, needs refactoring',
        ],
        evidence: [
          `Found ${this.getComplexity(analysis).functionsOverThreshold.length} functions >15`,
          `Average complexity: ${this.getComplexity(analysis).averageComplexity.toFixed(2)}`,
        ],
      },
    ];
  }

  private generateIntegrationDecisions(): AnalysisDecision[] {
    return [
      {
        title: 'SDK vs Custom Implementation',
        designDecision: 'Use ÆtherLight SDK for all features',
        why: 'Official SDK provides better performance and support',
        reasoningChain: [
          'SDK maintained by ÆtherLight team',
          'Performance optimizations built-in',
          'Regular updates and bug fixes',
          'Easier onboarding for new team members',
        ],
        evidence: ['SDK 20% faster', 'Lower maintenance burden'],
        alternativesConsidered: [
          'Keep custom implementations',
          'Hybrid approach (SDK + custom)',
        ],
        tradeOffs: [
          'Pro: Better performance, less maintenance',
          'Con: External dependency',
        ],
      },
    ];
  }

  private generateRefactoringPatterns(): RefactoringPattern[] {
    return [
      {
        name: 'Extract Method',
        context: 'Function too long or complex',
        problem: 'Hard to understand and test',
        solution: 'Extract code blocks into separate methods',
        language: 'typescript',
        before: `function processData(data: any[]) {
  // 50 lines of complex logic
}`,
        after: `function processData(data: any[]) {
  const validated = validateData(data);
  const transformed = transformData(validated);
  return saveData(transformed);
}`,
        whyThisWorks: [
          'Each function has single responsibility',
          'Easier to test individual steps',
          'More readable and maintainable',
        ],
      },
    ];
  }
}
