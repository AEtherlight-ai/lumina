/**
 * Task Generator
 *
 * DESIGN DECISION: Transform analysis results into actionable sprint tasks
 * WHY: Bridge between code analysis and executable work items
 *
 * REASONING CHAIN:
 * 1. Analysis identifies problems (high complexity, technical debt)
 * 2. Tasks define solutions (refactor function X, fix debt Y)
 * 3. Each task includes Chain of Thought reasoning
 * 4. Effort estimates based on analysis severity
 * 5. Dependencies detected from file/layer relationships
 * 6. Result: Developers have clear, prioritized work items
 *
 * PATTERN: Pattern-ANALYZER-002 (Incremental Sprint Generation)
 */

import {
  Task,
  IntegrationPoint,
  RefactoringPattern,
} from './types';
import {
  AnalysisResult,
  ArchitecturePattern,
  ArchitectureAnalysis,
  ComplexityAnalysis,
  TechnicalDebtAnalysis,
  ComplexityIssue,
  TechnicalDebtIssue,
  TechnicalDebtCategory,
  IssueSeverity,
} from '../analyzers/types';

export class TaskGenerator {
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
   * 2. Task generator was looking for 'technicalDebt' (camelCase)
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
   * Generate Phase A tasks (Enhancement - add features)
   *
   * DESIGN DECISION: Generate tasks based on detected architecture
   * WHY: Integration points vary by architecture (MVC vs Clean vs Microservices)
   */
  generatePhaseATasks(analysis: AnalysisResult, repositoryName: string): Task[] {
    const tasks: Task[] = [];

    // Task A-001: Add voice capture endpoint (if REST API detected)
    if (
      this.getArchitecture(analysis).pattern === ArchitecturePattern.MVC ||
      this.getArchitecture(analysis).pattern === ArchitecturePattern.LAYERED
    ) {
      tasks.push(this.createVoiceCaptureTask(repositoryName));
    }

    // Task A-002: Integrate pattern matching
    tasks.push(this.createPatternMatchingTask(repositoryName));

    // Task A-003: Add Chain of Thought docs
    tasks.push(this.createChainOfThoughtDocsTask(repositoryName));

    // Task A-004: Add confidence scoring
    tasks.push(this.createConfidenceScoringTask(repositoryName));

    // Task A-005: Create impact dashboard
    tasks.push(this.createImpactDashboardTask(repositoryName));

    return tasks;
  }

  /**
   * Generate Phase B tasks (Retrofit - refactor existing)
   *
   * DESIGN DECISION: Generate refactoring tasks from complexity + debt analysis
   * WHY: Data-driven prioritization (highest complexity first)
   */
  generatePhaseBTasks(analysis: AnalysisResult): Task[] {
    const tasks: Task[] = [];

    // Refactoring tasks from complexity analysis
    const refactoringTasks = this.generateRefactoringTasks(this.getComplexity(analysis));
    tasks.push(...refactoringTasks);

    // Debt cleanup tasks from technical debt analysis
    const debtTasks = this.generateDebtCleanupTasks(this.getTechnicalDebt(analysis));
    tasks.push(...debtTasks);

    return tasks;
  }

  /**
   * Generate Phase C tasks (Dogfood - integrate SDK)
   *
   * DESIGN DECISION: Standard SDK integration workflow
   * WHY: Consistent onboarding experience across all projects
   */
  generatePhaseCTasks(repositoryName: string): Task[] {
    const tasks: Task[] = [];

    // Task C-001: Install SDK
    tasks.push(this.createInstallSDKTask(repositoryName));

    // Task C-002: Configure SDK
    tasks.push(this.createConfigureSDKTask(repositoryName));

    // Task C-003: Test pattern matching
    tasks.push(this.createTestPatternMatchingTask(repositoryName));

    // Task C-004: Validate confidence scoring
    tasks.push(this.createValidateConfidenceScoringTask(repositoryName));

    // Task C-005: End-to-end integration test
    tasks.push(this.createE2EIntegrationTestTask(repositoryName));

    return tasks;
  }

  /**
   * Generate refactoring tasks from complexity analysis
   */
  private generateRefactoringTasks(complexityAnalysis: any): Task[] {
    const tasks: Task[] = [];

    if (!complexityAnalysis.functionsOverThreshold) {
      return tasks;
    }

    // Sort by complexity (highest first), take top 10
    const topFunctions = complexityAnalysis.functionsOverThreshold
      .sort((a: ComplexityIssue, b: ComplexityIssue) => b.complexity - a.complexity)
      .slice(0, 10);

    topFunctions.forEach((func: ComplexityIssue, index: number) => {
      const taskId = `B-${String(index + 1).padStart(3, '0')}`;

      tasks.push({
        id: taskId,
        title: `Refactor high-complexity function: ${func.functionName}`,
        agent: 'Refactor Agent',
        duration: this.estimateRefactoringDuration(func.complexity),
        dependencies: [],
        priority: func.complexity > 30 ? 'High' : func.complexity > 20 ? 'Medium' : 'Low',
        designDecision: `Extract nested code blocks from ${func.functionName}`,
        why: `Current complexity ${func.complexity} exceeds threshold ${func.threshold}`,
        reasoningChain: [
          `Analyzed function ${func.functionName} at ${func.filePath}:${func.line}`,
          `Measured cyclomatic complexity: ${func.complexity}`,
          `Complexity >15 increases maintenance burden and bug probability`,
          `Refactoring will reduce complexity to <15`,
          'Result: More maintainable, testable code',
        ],
        implementationSteps: this.generateRefactoringSteps(func),
        validationCriteria: [
          `Complexity reduced to <15 (current: ${func.complexity})`,
          'Unit tests pass after refactoring',
          'No behavioral changes (same outputs for same inputs)',
          'Code coverage maintained or improved',
          'Chain of Thought documentation added to extracted functions',
        ],
        filesToModify: [func.filePath],
        pattern: 'Pattern-REFACTOR-001',
        related: `${func.filePath}:${func.line}, Complexity Analyzer`,
        beforeComplexity: func.complexity,
        targetComplexity: 10,
        testingStrategy: [
          'Capture current behavior with characterization tests',
          'Refactor in small steps (1-2 extractions at a time)',
          'Run tests after each change',
          'Verify no behavioral changes',
        ],
      });
    });

    return tasks;
  }

  /**
   * Generate debt cleanup tasks from technical debt analysis
   */
  private generateDebtCleanupTasks(debtAnalysis: any): Task[] {
    const tasks: Task[] = [];
    let taskIndex = 0;

    if (!debtAnalysis.issues) {
      return tasks;
    }

    // Group issues by category
    const issuesByCategory = this.groupIssuesByCategory(debtAnalysis.issues);

    // Generate tasks for each category
    Object.entries(issuesByCategory).forEach(([category, issues]: [string, any[]]) => {
      // Skip if no issues
      if (issues.length === 0) return;

      // Skip low-priority categories if too many issues
      if (category === TechnicalDebtCategory.TODO && issues.length > 50) return;

      const taskId = `B-${String(taskIndex + 11).padStart(3, '0')}`; // Start after refactoring tasks
      taskIndex++;

      tasks.push({
        id: taskId,
        title: `Clean up ${category} issues (${issues.length} items)`,
        agent: 'Debt Cleanup Agent',
        duration: this.estimateDebtCleanupDuration(issues.length, category),
        dependencies: [],
        priority: this.getDebtPriority(category),
        designDecision: `Systematically address all ${category} issues`,
        why: `${issues.length} ${category} issues accumulate technical debt`,
        reasoningChain: [
          `Detected ${issues.length} ${category} issues via Technical Debt Analyzer`,
          `${category} issues indicate incomplete work or known problems`,
          'Unaddressed debt slows future development',
          `Cleanup improves code quality and reduces risk`,
          'Result: Cleaner, more maintainable codebase',
        ],
        implementationSteps: this.generateDebtCleanupSteps(category, issues),
        validationCriteria: [
          `All ${category} issues resolved`,
          `No new ${category} issues introduced`,
          'Unit tests pass',
          'Chain of Thought documentation updated',
        ],
        filesToModify: [...new Set(issues.map((i: TechnicalDebtIssue) => i.location.filePath))],
        pattern: 'Pattern-DEBT-001',
        related: `Technical Debt Analyzer, ${category}`,
      });
    });

    return tasks;
  }

  /**
   * Group issues by category
   */
  private groupIssuesByCategory(issues: TechnicalDebtIssue[]): Record<string, TechnicalDebtIssue[]> {
    const grouped: Record<string, TechnicalDebtIssue[]> = {};

    issues.forEach((issue) => {
      if (!grouped[issue.category]) {
        grouped[issue.category] = [];
      }
      grouped[issue.category].push(issue);
    });

    return grouped;
  }

  /**
   * Estimate refactoring duration based on complexity
   */
  private estimateRefactoringDuration(complexity: number): number {
    if (complexity > 50) return 8; // Full day
    if (complexity > 30) return 4; // Half day
    if (complexity > 20) return 2; // 2 hours
    return 1; // 1 hour
  }

  /**
   * Estimate debt cleanup duration based on issue count and category
   */
  private estimateDebtCleanupDuration(issueCount: number, category: string): number {
    // High-severity categories take longer per issue
    const timePerIssue =
      category === TechnicalDebtCategory.HACK ||
      category === TechnicalDebtCategory.MISSING_ERROR_HANDLING
        ? 0.5
        : 0.25;

    return Math.ceil(issueCount * timePerIssue);
  }

  /**
   * Get priority for debt category
   */
  private getDebtPriority(category: string): 'High' | 'Medium' | 'Low' {
    switch (category) {
      case TechnicalDebtCategory.HACK:
      case TechnicalDebtCategory.MISSING_ERROR_HANDLING:
      case TechnicalDebtCategory.DEPRECATED_API:
        return 'High';
      case TechnicalDebtCategory.FIXME:
      case TechnicalDebtCategory.HARDCODED_STRING:
        return 'Medium';
      default:
        return 'Low';
    }
  }

  /**
   * Generate refactoring steps based on complexity level
   */
  private generateRefactoringSteps(func: ComplexityIssue): string[] {
    const steps: string[] = [
      `Read ${func.filePath} to understand ${func.functionName}`,
      'Write characterization tests to capture current behavior',
      'Identify code blocks suitable for extraction',
    ];

    if (func.complexity > 50) {
      steps.push('Consider complete rewrite with smaller functions');
      steps.push('Apply Strategy or Command pattern if appropriate');
      steps.push('Break into 5-7 smaller functions');
    } else if (func.complexity > 30) {
      steps.push('Extract 3-5 helper functions');
      steps.push('Reduce nesting depth (max 3 levels)');
      steps.push('Apply Extract Method refactoring pattern');
    } else {
      steps.push('Extract 1-2 helper functions');
      steps.push('Simplify conditional logic');
    }

    steps.push('Run tests after each extraction');
    steps.push('Update Chain of Thought documentation');
    steps.push('Verify complexity reduced to <15');

    return steps;
  }

  /**
   * Generate debt cleanup steps based on category
   */
  private generateDebtCleanupSteps(category: string, issues: TechnicalDebtIssue[]): string[] {
    switch (category) {
      case TechnicalDebtCategory.TODO:
        return [
          'Review each TODO comment',
          'Either implement the TODO or remove if no longer relevant',
          'For complex TODOs, create separate tasks',
          'Update documentation',
        ];

      case TechnicalDebtCategory.FIXME:
        return [
          'Prioritize FIXME issues by severity',
          'Reproduce the problem described in FIXME',
          'Implement proper fix',
          'Add tests to prevent regression',
          'Remove FIXME comment after verification',
        ];

      case TechnicalDebtCategory.HACK:
        return [
          'Understand why HACK was necessary',
          'Design proper solution to replace workaround',
          'Implement clean solution with tests',
          'Verify no breaking changes',
          'Remove HACK comment and document decision',
        ];

      case TechnicalDebtCategory.MISSING_ERROR_HANDLING:
        return [
          'Identify async operations without error handling',
          'Add try/catch blocks or .catch() handlers',
          'Log errors appropriately',
          'Add error recovery logic where needed',
          'Test error scenarios',
        ];

      case TechnicalDebtCategory.MAGIC_NUMBER:
        return [
          'Extract magic numbers to named constants',
          'Choose descriptive constant names',
          'Group related constants',
          'Update all references',
          'Add comments explaining constant values',
        ];

      case TechnicalDebtCategory.HARDCODED_STRING:
        return [
          'Identify hardcoded URLs, keys, secrets',
          'Move to environment variables or config files',
          'Update code to read from configuration',
          'Document required environment variables',
          'Verify works in all environments',
        ];

      default:
        return [
          `Review all ${category} issues`,
          'Fix each issue systematically',
          'Add tests where appropriate',
          'Update documentation',
        ];
    }
  }

  // Phase A task creators

  private createVoiceCaptureTask(repositoryName: string): Task {
    return {
      id: 'A-001',
      title: 'Add voice capture API endpoint',
      agent: 'API Agent',
      duration: 4,
      dependencies: [],
      priority: 'High',
      designDecision: 'REST endpoint at POST /api/voice/capture',
      why: 'Enable voice input for AI-powered features',
      reasoningChain: [
        'Users need to capture voice input for pattern matching',
        'REST API maintains consistency with existing architecture',
        'Whisper.cpp provides fast, accurate transcription',
        'Endpoint returns transcription + confidence score',
        'Result: Voice-to-intelligence capability integrated',
      ],
      implementationSteps: [
        'Add route: POST /api/voice/capture',
        'Accept multipart/form-data (audio file)',
        'Validate audio format (.wav, .mp3, .m4a)',
        'Call Whisper.cpp for transcription',
        'Calculate confidence score',
        'Return JSON: { text, confidence, timestamp }',
        'Add error handling for invalid audio',
        'Write unit tests (>80% coverage)',
      ],
      validationCriteria: [
        'Endpoint accepts .wav, .mp3, .m4a files',
        'Transcription <5s for 30s audio',
        'Returns JSON: { text, confidence, timestamp }',
        'Unit tests >80% coverage',
        'Chain of Thought documentation added',
        'Error handling for invalid audio',
      ],
      filesToModify: ['src/routes/api.ts', 'src/controllers/voice-controller.ts'],
      pattern: 'Pattern-API-001',
      related: 'Voice capture (ÆtherLight Phase 2)',
      performanceTarget: '<5s transcription for 30s audio',
      securityConsiderations: [
        'Validate audio file size (<10MB)',
        'Sanitize file uploads',
        'Rate limit API endpoint (max 10 requests/minute)',
      ],
    };
  }

  private createPatternMatchingTask(repositoryName: string): Task {
    return {
      id: 'A-002',
      title: 'Integrate pattern matching engine',
      agent: 'Integration Agent',
      duration: 6,
      dependencies: ['A-001'],
      priority: 'High',
      designDecision: 'Use ÆtherLight pattern matching with local-first approach',
      why: 'Match user queries against proven patterns for high-confidence suggestions',
      reasoningChain: [
        'Users need high-confidence code suggestions',
        'Pattern matching provides 85%+ accuracy',
        'Local-first ensures privacy and speed',
        'Multi-dimensional scoring (10+ factors)',
        'Result: Intelligent, trustworthy suggestions',
      ],
      implementationSteps: [
        'Install @aetherlight/sdk (or use core library)',
        'Initialize PatternMatcher with configuration',
        'Create pattern storage (local ChromaDB)',
        'Implement pattern matching endpoint',
        'Add confidence threshold filtering (>85%)',
        'Integrate with voice capture endpoint',
        'Write integration tests',
      ],
      validationCriteria: [
        'Pattern matching <100ms for local queries',
        'Confidence scores >85% for matches',
        'Integration tests pass',
        'Chain of Thought documentation complete',
      ],
      filesToModify: [
        'src/services/pattern-matcher.ts',
        'src/controllers/voice-controller.ts',
      ],
      pattern: 'Pattern-MATCH-001',
      related: 'Pattern matching (ÆtherLight core)',
      performanceTarget: '<100ms pattern matching',
    };
  }

  private createChainOfThoughtDocsTask(repositoryName: string): Task {
    return {
      id: 'A-003',
      title: 'Add Chain of Thought documentation',
      agent: 'Documentation Agent',
      duration: 3,
      dependencies: [],
      priority: 'Medium',
      designDecision: 'Document all functions with DESIGN DECISION, WHY, REASONING CHAIN',
      why: 'Enable AI assistants to understand reasoning, not just code',
      reasoningChain: [
        'Current docs explain WHAT code does',
        'AI needs WHY decisions were made',
        'Chain of Thought captures reasoning',
        'Future developers (human + AI) understand context',
        'Result: Self-documenting codebase',
      ],
      implementationSteps: [
        'Review ÆtherLight Chain of Thought standard',
        'Identify key functions requiring documentation',
        'Add DESIGN DECISION, WHY, REASONING CHAIN to docstrings',
        'Include PATTERN and RELATED references',
        'Run documentation enforcer',
      ],
      validationCriteria: [
        'All exported functions have Chain of Thought docs',
        'Documentation enforcer passes',
        '100% of new code includes reasoning',
      ],
      filesToModify: ['src/**/*.ts (selected high-impact files)'],
      pattern: 'Pattern-DOC-001',
      related: 'CHAIN_OF_THOUGHT_STANDARD.md',
    };
  }

  private createConfidenceScoringTask(repositoryName: string): Task {
    return {
      id: 'A-004',
      title: 'Add confidence scoring system',
      agent: 'Scoring Agent',
      duration: 5,
      dependencies: ['A-002'],
      priority: 'High',
      designDecision: 'Multi-dimensional confidence scoring (10+ factors)',
      why: 'Users need to know confidence level before accepting suggestions',
      reasoningChain: [
        'Not all pattern matches are equally confident',
        'Multi-dimensional scoring more accurate than embeddings alone',
        '10+ factors: semantic similarity, context match, historical success, etc.',
        'Threshold filtering (>85%) prevents low-confidence suggestions',
        'Result: Users trust AI suggestions',
      ],
      implementationSteps: [
        'Implement ConfidenceScorer class',
        'Calculate 10+ scoring dimensions',
        'Apply weighted combination',
        'Add threshold filtering (>85%)',
        'Display confidence to users',
        'Write unit tests for scoring',
      ],
      validationCriteria: [
        'Confidence scoring <50ms',
        'Scores range 0.0-1.0',
        'Threshold filtering works correctly',
        'Unit tests >80% coverage',
      ],
      filesToModify: ['src/services/confidence-scorer.ts'],
      pattern: 'Pattern-SCORE-001',
      related: 'Confidence scoring (ÆtherLight core)',
      performanceTarget: '<50ms confidence scoring',
    };
  }

  private createImpactDashboardTask(repositoryName: string): Task {
    return {
      id: 'A-005',
      title: 'Create impact tracking dashboard',
      agent: 'UI Agent',
      duration: 8,
      dependencies: ['A-002', 'A-004'],
      priority: 'Medium',
      designDecision: 'Track time saved, patterns used, confidence scores',
      why: 'Users need to see ROI to justify subscription',
      reasoningChain: [
        'Users need proof ÆtherLight saves time',
        'Track: voice captures, patterns matched, time saved',
        'Visualize: weekly trends, top patterns, confidence distribution',
        'Goal: "You saved 2.5 hours this week"',
        'Result: Justified $15/month subscription',
      ],
      implementationSteps: [
        'Create dashboard UI component',
        'Track usage metrics (voice captures, patterns, time saved)',
        'Calculate time saved estimates',
        'Add weekly/monthly trend charts',
        'Export reports (CSV/PDF)',
      ],
      validationCriteria: [
        'Dashboard loads <3s',
        'Metrics update in real-time',
        'Export functionality works',
        'Responsive design (mobile + desktop)',
      ],
      filesToModify: [
        'src/components/Dashboard.tsx',
        'src/services/analytics.ts',
      ],
      pattern: 'Pattern-DASHBOARD-001',
      related: 'Impact tracking (ÆtherLight Phase 3)',
    };
  }

  // Phase C task creators

  private createInstallSDKTask(repositoryName: string): Task {
    return {
      id: 'C-001',
      title: 'Install @aetherlight/sdk',
      agent: 'Package Agent',
      duration: 1,
      dependencies: [],
      priority: 'High',
      designDecision: 'Install ÆtherLight SDK via npm',
      why: 'Integrate full ÆtherLight capabilities',
      reasoningChain: [
        'SDK provides pattern matching, confidence scoring, offline mode',
        'npm package ensures version management',
        'TypeScript types included',
        'Result: Official ÆtherLight integration',
      ],
      implementationSteps: [
        'Run: npm install @aetherlight/sdk',
        'Verify installation successful',
        'Import SDK in code',
        'Verify TypeScript types available',
      ],
      validationCriteria: [
        'Package installed successfully',
        'TypeScript types available',
        'No dependency conflicts',
      ],
      filesToModify: ['package.json', 'package-lock.json'],
      pattern: 'Pattern-SDK-001',
      related: 'ÆtherLight SDK',
    };
  }

  private createConfigureSDKTask(repositoryName: string): Task {
    return {
      id: 'C-002',
      title: 'Configure ÆtherLight SDK',
      agent: 'Configuration Agent',
      duration: 2,
      dependencies: ['C-001'],
      priority: 'High',
      designDecision: 'Local-first configuration with optional cloud sync',
      why: 'Privacy-first, fast, enterprise-compliant',
      reasoningChain: [
        'Local-first ensures privacy and speed',
        'Cloud sync optional (user choice)',
        'Configuration via environment variables',
        'Result: Secure, performant setup',
      ],
      implementationSteps: [
        'Create config/aetherlight.config.ts',
        'Set environment variables',
        'Initialize SDK with configuration',
        'Test configuration works',
      ],
      validationCriteria: [
        'Configuration file created',
        'Environment variables set',
        'SDK initializes successfully',
      ],
      filesToModify: [
        'config/aetherlight.config.ts',
        '.env',
      ],
      pattern: 'Pattern-CONFIG-001',
      related: 'SDK configuration',
    };
  }

  private createTestPatternMatchingTask(repositoryName: string): Task {
    return {
      id: 'C-003',
      title: 'Test pattern matching integration',
      agent: 'Test Agent',
      duration: 3,
      dependencies: ['C-002'],
      priority: 'High',
      designDecision: 'End-to-end test with real patterns',
      why: 'Validate pattern matching works correctly',
      reasoningChain: [
        'Pattern matching is core feature',
        'Test with real user queries',
        'Verify confidence scores >85%',
        'Result: Proven integration',
      ],
      implementationSteps: [
        'Create test patterns',
        'Write integration tests',
        'Test with sample queries',
        'Verify confidence scores',
      ],
      validationCriteria: [
        'Pattern matching returns results',
        'Confidence scores >85%',
        'Performance <100ms',
        'Integration tests pass',
      ],
      filesToModify: ['tests/integration/pattern-matching.test.ts'],
      pattern: 'Pattern-TEST-001',
      related: 'Pattern matching tests',
    };
  }

  private createValidateConfidenceScoringTask(repositoryName: string): Task {
    return {
      id: 'C-004',
      title: 'Validate confidence scoring',
      agent: 'Validation Agent',
      duration: 2,
      dependencies: ['C-003'],
      priority: 'Medium',
      designDecision: 'Test multi-dimensional scoring accuracy',
      why: 'Ensure confidence scores are reliable',
      reasoningChain: [
        'Confidence scores guide user decisions',
        'Test all 10+ scoring dimensions',
        'Verify weighted combination',
        'Result: Trustworthy scores',
      ],
      implementationSteps: [
        'Create test cases for each dimension',
        'Test weighted combination',
        'Verify threshold filtering',
        'Run validation tests',
      ],
      validationCriteria: [
        'All dimensions tested',
        'Weighted combination correct',
        'Threshold filtering works',
        'Tests pass',
      ],
      filesToModify: ['tests/integration/confidence-scoring.test.ts'],
      pattern: 'Pattern-TEST-002',
      related: 'Confidence scoring tests',
    };
  }

  private createE2EIntegrationTestTask(repositoryName: string): Task {
    return {
      id: 'C-005',
      title: 'End-to-end integration test',
      agent: 'E2E Test Agent',
      duration: 4,
      dependencies: ['C-004'],
      priority: 'High',
      designDecision: 'Test complete voice-to-intelligence flow',
      why: 'Validate entire system works together',
      reasoningChain: [
        'Full integration test: voice → transcription → pattern matching → confidence → result',
        'Test with real audio files',
        'Verify all components working',
        'Result: Production-ready integration',
      ],
      implementationSteps: [
        'Record sample audio files',
        'Create E2E test suite',
        'Test complete flow',
        'Measure performance',
        'Verify results accurate',
      ],
      validationCriteria: [
        'E2E test passes',
        'Voice → intelligence <10s total',
        'Confidence scores >85%',
        'No errors in full flow',
      ],
      filesToModify: ['tests/e2e/voice-to-intelligence.test.ts'],
      pattern: 'Pattern-TEST-003',
      related: 'E2E testing',
      performanceTarget: '<10s voice-to-intelligence flow',
    };
  }
}
