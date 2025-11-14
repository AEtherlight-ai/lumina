/**
 * EnhancementContext Type Definition
 *
 * DESIGN DECISION: Normalized context format for all button types
 * WHY: Consistent structure enables unified AI enhancement logic
 *
 * REASONING CHAIN:
 * 1. Different buttons gather different context (bug severity vs. feature priority)
 * 2. AI enhancement service needs consistent input format
 * 3. Metadata passthrough requires structured format for terminal AI
 * 4. Normalize all context into single interface with:
 *    - type: Button type for routing
 *    - template: MVP-003 template task
 *    - metadata: Structured data for terminal AI (confidence, patterns, validation)
 *    - workspaceContext: Common context (files, git, SOPs)
 *    - specificContext: Button-specific data (severity, priority, etc.)
 * 5. Result: AI service receives consistent format regardless of button type
 *
 * PATTERN: Pattern-NORMALIZE-001 (Normalization Layer for Heterogeneous Inputs)
 * ARCHITECTURE: v3.0 Context Builder Pattern
 * RELATED: IContextBuilder.ts, AIEnhancementService.ts
 *
 * MIGRATION: v2.0 → v3.0
 * - v2.0: Each button type has different output format (inconsistent)
 * - v3.0: All buttons produce EnhancementContext (consistent)
 * - Benefit: Single AI enhancement logic handles all types
 */

import { TemplateTask } from '../services/TemplateTaskBuilder';

/**
 * Button type discriminator
 */
export type EnhancementType =
    | 'task'           // Sprint task enhancement
    | 'bug'            // Bug report
    | 'feature'        // Feature request
    | 'code_analyzer'  // Code analyzer
    | 'sprint_planner' // Sprint planner
    | 'general';       // General enhancement

/**
 * Confidence level for enhancement
 */
export interface ConfidenceScore {
    score: number;      // 0-100
    level: 'high' | 'medium' | 'low';  // high: 70+, medium: 40-70, low: <40
}

/**
 * Validation status for task context
 */
export interface ValidationStatus {
    filesExist: boolean;        // Do referenced files exist in workspace?
    dependenciesMet: boolean;   // Are task dependencies satisfied?
    taskDataCurrent: boolean;   // Is task data up-to-date (no temporal drift)?
}

/**
 * Metadata for terminal AI passthrough
 *
 * PURPOSE: Embed structured metadata in enhanced prompt (HTML comment)
 * WHY: Terminal AI can skip redundant analysis if it knows context was already gathered
 *
 * EXAMPLE:
 * <!--
 * AETHERLIGHT_ENHANCEMENT_METADATA
 * {
 *   "filesAnalyzed": ["src/auth.ts", "src/config.ts"],
 *   "gitCommitsReviewed": 5,
 *   "confidence": {"score": 92, "level": "high"},
 *   "validation": {"filesExist": true, "dependenciesMet": true, "taskDataCurrent": true}
 * }
 * -->
 */
export interface EnhancementMetadata {
    buttonType: string;                  // Which button was clicked
    confidence: ConfidenceScore;         // Confidence in gathered context
    patterns: string[];                  // Applicable ÆtherLight patterns
    agent: string;                       // Target agent (developer, architect, etc.)
    validation: ValidationStatus;        // Validation checks
}

/**
 * Workspace-level context (common across all button types)
 */
export interface WorkspaceContext {
    rootPath: string;                    // Workspace root path
    languages: string[];                 // Detected languages (TypeScript, Python, etc.)
    frameworks: string[];                // Detected frameworks (React, Express, etc.)
    filesFound: Array<{                  // Files relevant to enhancement
        path: string;                    // Relative path from workspace root
        relevance: number;               // Relevance score 0-100
        reason: string;                  // Why this file is relevant
    }>;
    gitCommits: Array<{                  // Recent git commits for context
        hash: string;                    // Commit hash
        message: string;                 // Commit message
        date: string;                    // Commit date (ISO 8601)
    }>;
    sops: {                              // Standard Operating Procedures
        claudeMd?: string;               // Project instructions from CLAUDE.md
        aetherlightMd?: string;          // ÆtherLight SOPs from .vscode/aetherlight.md
    };
}

/**
 * Complete enhancement context (normalized format)
 *
 * All IContextBuilder implementations must produce this structure.
 * AIEnhancementService consumes this structure to generate enhanced prompts.
 */
export interface EnhancementContext {
    /**
     * Button type (discriminator for routing)
     */
    type: EnhancementType;

    /**
     * MVP-003 template task
     * Contains structured task data (id, name, description, files, approach, etc.)
     */
    template: TemplateTask;

    /**
     * Metadata for terminal AI passthrough
     * Embedded as HTML comment in enhanced prompt
     */
    metadata: EnhancementMetadata;

    /**
     * Workspace-level context (common across all buttons)
     */
    workspaceContext: WorkspaceContext;

    /**
     * Button-specific context (varies by type)
     *
     * Examples:
     * - Bug: { severity: string, stepsToReproduce: string, expectedBehavior: string, actualBehavior: string }
     * - Feature: { priority: string, useCase: string, proposedSolution: string, alternativeApproaches: string }
     * - Code Analyzer: { analysisScope: string, focusAreas: string[] }
     * - Sprint Planner: { sprintGoal: string, duration: string }
     * - General: { originalText: string }
     */
    specificContext: any;
}
