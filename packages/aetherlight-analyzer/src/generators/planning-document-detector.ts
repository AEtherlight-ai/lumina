/**
 * Planning Document Detector
 *
 * DESIGN DECISION: Multi-strategy detection (semantic + keyword + structure + intent)
 * WHY: Teams use different naming conventions for planning documents
 *
 * REASONING CHAIN:
 * 1. Not all teams use "PHASE" naming (some use SPRINT, VERSION, EPIC, etc.)
 * 2. Keyword-only matching misses documents with different names but same purpose
 * 3. Need semantic understanding: "Is this a planning document?"
 * 4. Combine: keywords + file structure + content analysis + intent classification
 * 5. Confidence scoring ensures we only detect true planning docs (>80%)
 * 6. Result: Detect ANY planning doc regardless of naming convention
 *
 * PATTERN: Pattern-ANALYZER-011 (Smart Document Detection)
 * DOGFOODING: Discovery #5 - Phase plan conflict detection missing
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

export interface DetectedPlanningDocument {
  path: string;
  type: 'phase' | 'sprint' | 'version' | 'epic' | 'milestone' | 'iteration' | 'roadmap' | 'unknown';
  confidence: number;
  detectionMethod: 'keyword' | 'structure' | 'semantic' | 'multi';
  metadata: {
    taskCount?: number;
    completionStatus?: number;
    duration?: string;
    lastModified: Date;
  };
}

export class PlanningDocumentDetector {
  /**
   * Filename patterns for common planning document conventions
   *
   * DESIGN DECISION: Cover maximum naming patterns with regex
   * WHY: Different teams use different conventions
   */
  private readonly FILENAME_PATTERNS = [
    /^PHASE[_-]?\d+/i,              // PHASE_1, PHASE-2, PHASE1
    /^SPRINT[_-]?\d+/i,             // SPRINT_1, SPRINT-2
    /^VERSION[_-]?v?\d+/i,          // VERSION_1, VERSION-v1.0
    /^EPIC[_-]?\d+/i,               // EPIC_1, EPIC-2
    /^MILESTONE[_-]?\d+/i,          // MILESTONE_1
    /^ITERATION[_-]?\d+/i,          // ITERATION_1
    /^RELEASE[_-]?\d+/i,            // RELEASE_1
    /^QUARTER[_-]?Q?\d+/i,          // QUARTER_Q1, Q1_2025
    /^WEEK[_-]?\d+/i,               // WEEK_1, WEEK-32
    /_PLAN\.md$/i,                  // ENHANCEMENT_PLAN.md
    /_ROADMAP\.md$/i,               // PRODUCT_ROADMAP.md
    /_IMPLEMENTATION\.md$/i,        // PHASE_1_IMPLEMENTATION.md
    /_RETROFIT\.md$/i,              // PHASE_B_RETROFIT.md
    /_ENHANCEMENT\.md$/i,           // PHASE_A_ENHANCEMENT.md
    /_DOGFOOD\.md$/i,               // PHASE_C_DOGFOOD.md
  ];

  /**
   * Directory names that indicate planning documents
   */
  private readonly DIRECTORY_INDICATORS = [
    'sprints',
    'phases',
    'iterations',
    'milestones',
    'roadmaps',
    'planning',
    'backlog',
  ];

  /**
   * Structural markers in document content
   *
   * DESIGN DECISION: Detect document structure via regex patterns
   * WHY: Planning docs have consistent structure regardless of naming
   *
   * PATTERN: Pattern-ANALYZER-011 (Smart Document Detection)
   * DOGFOODING: Discovery #6 - Structural markers too strict, need flexible matching
   */
  private readonly STRUCTURAL_MARKERS: Record<string, RegExp> = {
    hasTasks: /^#+\s*Task\s+[A-Z0-9-]+:/mi,                     // ## Task A-001: OR ### Task P1-001:
    hasTimeline: /^#+\s*[📊🗓️⏰]*\s*Timeline/mi,                 // ## Timeline OR ## 📊 Timeline
    hasDuration: /\*\*ESTIMATED DURATION:\*\*/i,                 // **ESTIMATED DURATION:**
    hasDependencies: /\*\*Dependencies:\*\*/i,                   // **Dependencies:**
    hasValidation: /\*\*Validation Criteria:\*\*/i,              // **Validation Criteria:**
    hasAgents: /\*\*Agent:\*\*/i,                                // **Agent:**
    hasWeekBreakdown: /^#+\s*Week\s+\d+/mi,                     // ## Week 1
    hasMermaidDiagram: /```mermaid/i,                            // Dependency graphs
    hasSuccessMetrics: /^#+\s*[📊🎯]*\s*Success\s+(Metrics|Criteria)/mi,  // ## Success Metrics OR ## 🎯 Success Metrics
    hasRiskAnalysis: /^#+\s*[🚦⚠️]*\s*Risk\s+Analysis/mi,       // ## Risk Analysis OR ## 🚦 Risk Analysis
    hasPhaseOverview: /^#+\s*[📋🎯]*\s*(Phase|Sprint|Iteration)\s+Overview/mi,  // ## Phase Overview
    hasTaskBreakdown: /^#+\s*[📊🔧]*\s*Task\s+Breakdown/mi,      // ## Task Breakdown
  };

  /**
   * Semantic phrases that indicate planning content
   *
   * DESIGN DECISION: Natural language understanding of intent
   * WHY: Catches documents that don't match structural patterns
   */
  private readonly SEMANTIC_PHRASES = [
    'sprint plan',
    'phase implementation',
    'task breakdown',
    'estimated duration',
    'completion criteria',
    'success metrics',
    'implementation steps',
    'validation criteria',
    'dependency graph',
    'risk analysis',
    'rollback plan',
    'deployment strategy',
    'testing strategy',
    'architecture context',
    'technical debt',
    'refactoring targets',
  ];

  /**
   * Main detection method - combines all strategies
   *
   * DESIGN DECISION: Parallel detection with confidence threshold
   * WHY: Fast detection with reasonable accuracy (>50% confidence required)
   *
   * REASONING CHAIN:
   * 1. Find all markdown files in project
   * 2. Calculate confidence score for each (multi-factor analysis)
   * 3. Filter to matches with >50% confidence (balanced threshold)
   * 4. Sort by confidence (highest first)
   * 5. Result: List of detected planning documents
   *
   * DOGFOODING: Discovery #6 - Lowered threshold from 80% to 50%
   * WHY: Our own phase documents scored 40-60% due to format differences
   *      (emojis in headings, different task formats, directory not named "planning")
   *      50% threshold catches real planning docs while filtering random markdown
   */
  async detectPlanningDocuments(rootDir: string): Promise<DetectedPlanningDocument[]> {
    const allMarkdownFiles = await this.findMarkdownFiles(rootDir);
    const detected: DetectedPlanningDocument[] = [];

    for (const file of allMarkdownFiles) {
      const confidence = await this.calculateConfidence(file);

      if (confidence >= 0.5) {
        detected.push({
          path: file,
          type: this.classifyType(file),
          confidence,
          detectionMethod: this.determineMethod(file, confidence),
          metadata: await this.extractMetadata(file),
        });
      }
    }

    return detected.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Find all markdown files in directory
   */
  private async findMarkdownFiles(rootDir: string): Promise<string[]> {
    const pattern = path.join(rootDir, '**/*.md').replace(/\\/g, '/');
    // glob v11+ returns array directly, with withFileTypes: false (default)
    const files = await glob(pattern, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
      withFileTypes: false,
    });
    return files as string[];
  }

  /**
   * Multi-factor confidence scoring
   *
   * DESIGN DECISION: Weighted combination of 4 detection strategies
   * WHY: No single strategy is 100% accurate, combination improves reliability
   *
   * REASONING CHAIN:
   * 1. Filename match (30% weight) - Fast, medium accuracy
   * 2. Directory location (10% weight) - Fast, low accuracy
   * 3. Structural markers (40% weight) - Medium speed, high accuracy
   * 4. Semantic phrases (20% weight) - Slow, very high accuracy
   * 5. Weighted combination (sum of all factors)
   * 6. Result: Confidence score 0.0-1.0
   */
  private async calculateConfidence(filePath: string): Promise<number> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const filename = path.basename(filePath);
    const dirname = path.basename(path.dirname(filePath));

    let score = 0;

    // Factor 1: Filename matches pattern (30% weight)
    if (this.matchesFilenamePattern(filename)) {
      score += 0.3;
    }

    // Factor 2: Directory indicates planning (10% weight)
    if (this.DIRECTORY_INDICATORS.some((ind) => dirname.toLowerCase().includes(ind))) {
      score += 0.1;
    }

    // Factor 3: Structural markers present (40% weight)
    const structuralScore = this.analyzeStructure(content);
    score += structuralScore * 0.4;

    // Factor 4: Semantic phrases present (20% weight)
    const semanticScore = this.analyzeSemantic(content);
    score += semanticScore * 0.2;

    return Math.min(score, 1.0);
  }

  /**
   * Check if filename matches any planning pattern
   */
  private matchesFilenamePattern(filename: string): boolean {
    return this.FILENAME_PATTERNS.some((pattern) => pattern.test(filename));
  }

  /**
   * Analyze document structure
   *
   * DESIGN DECISION: Count structural markers, normalize to 0.0-1.0
   * WHY: More markers = higher confidence it's a planning doc
   */
  private analyzeStructure(content: string): number {
    let matches = 0;
    const total = Object.keys(this.STRUCTURAL_MARKERS).length;

    for (const pattern of Object.values(this.STRUCTURAL_MARKERS)) {
      if (pattern.test(content)) {
        matches++;
      }
    }

    return matches / total;
  }

  /**
   * Analyze semantic indicators
   *
   * DESIGN DECISION: Count semantic phrases, cap at 1.0
   * WHY: More phrases = higher confidence it's a planning doc
   */
  private analyzeSemantic(content: string): number {
    const lowerContent = content.toLowerCase();
    let matches = 0;

    for (const phrase of this.SEMANTIC_PHRASES) {
      if (lowerContent.includes(phrase)) {
        matches++;
      }
    }

    return Math.min(matches / this.SEMANTIC_PHRASES.length, 1.0);
  }

  /**
   * Classify document type from filename
   *
   * DESIGN DECISION: Simple keyword matching for type classification
   * WHY: Type is informational only, doesn't affect detection
   */
  private classifyType(filePath: string): DetectedPlanningDocument['type'] {
    const filename = path.basename(filePath).toLowerCase();

    if (/phase/i.test(filename)) return 'phase';
    if (/sprint/i.test(filename)) return 'sprint';
    if (/version|release/i.test(filename)) return 'version';
    if (/epic/i.test(filename)) return 'epic';
    if (/milestone/i.test(filename)) return 'milestone';
    if (/iteration/i.test(filename)) return 'iteration';
    if (/roadmap/i.test(filename)) return 'roadmap';

    return 'unknown';
  }

  /**
   * Determine which detection method contributed most
   */
  private determineMethod(filePath: string, confidence: number): DetectedPlanningDocument['detectionMethod'] {
    if (confidence >= 0.9) return 'multi';
    if (this.matchesFilenamePattern(path.basename(filePath))) return 'keyword';
    if (confidence >= 0.85) return 'structure';
    return 'semantic';
  }

  /**
   * Extract metadata from document
   *
   * DESIGN DECISION: Parse document content for metadata
   * WHY: Provides context for conflict resolution decisions
   *
   * REASONING CHAIN:
   * 1. Count tasks (how much work is planned)
   * 2. Calculate completion status (how much is done)
   * 3. Extract duration (how long will it take)
   * 4. Get last modified date (how recent is the plan)
   * 5. Result: Rich metadata for smart conflict resolution
   */
  private async extractMetadata(filePath: string): Promise<DetectedPlanningDocument['metadata']> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const stats = await fs.promises.stat(filePath);

    // Count tasks
    const taskMatches = content.match(/^#+\s*Task\s+[A-Z0-9-]+:/gim);
    const taskCount = taskMatches ? taskMatches.length : 0;

    // Calculate completion status
    const checkboxes = content.match(/- \[([ x✓✅])\]/gi);
    const completedCheckboxes = content.match(/- \[(x|✓|✅)\]/gi);
    const completionStatus =
      checkboxes && checkboxes.length > 0 ? (completedCheckboxes?.length || 0) / checkboxes.length : 0;

    // Extract duration
    const durationMatch = content.match(/\*\*ESTIMATED DURATION:\*\*\s*([^\n]+)/i);
    const duration = durationMatch ? durationMatch[1].trim() : undefined;

    return {
      taskCount,
      completionStatus,
      duration,
      lastModified: stats.mtime,
    };
  }
}
