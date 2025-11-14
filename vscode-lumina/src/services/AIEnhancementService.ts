/**
 * AIEnhancementService
 *
 * DESIGN DECISION: Use VS Code Language Model API instead of custom AI logic
 * WHY: User already has AI installed (Copilot, Continue.dev, etc.) - use it!
 *
 * REASONING CHAIN:
 * 1. User has chosen and configured their preferred AI provider
 * 2. Building custom AI logic duplicates existing infrastructure
 * 3. Custom AI logic requires maintenance (prompts, retry, error handling)
 * 4. VS Code LM API provides official, stable interface to user's AI
 * 5. Fallback to templates if no AI available (graceful degradation)
 * 6. Result: Zero AI logic to maintain, user's AI improves our extension automatically
 *
 * PATTERN: Pattern-LEVERAGE-001 (Leverage Existing Infrastructure)
 * ARCHITECTURE: v3.0 Context Builder Pattern
 * RELATED: IContextBuilder.ts, EnhancementContext.ts
 *
 * MIGRATION: v2.0 → v3.0
 * - v2.0: 200+ lines of custom AI logic (prompts, retry, streaming, token management)
 * - v3.0: 15 lines using VS Code LM API
 * - Benefit: 93% less code to maintain, automatic AI improvements
 *
 * VS CODE LM API:
 * - vscode.lm.selectChatModels() - Get available language models
 * - model.sendRequest(messages, options, token) - Send prompt to AI
 * - response.text - Async iterator for streaming response
 *
 * METADATA PASSTHROUGH:
 * Embed structured metadata as HTML comment for terminal AI:
 * <!--
 * AETHERLIGHT_ENHANCEMENT_METADATA
 * {
 *   "filesAnalyzed": ["src/auth.ts"],
 *   "confidence": {"score": 92, "level": "high"},
 *   "patterns": ["Pattern-AUTH-001"],
 *   "validation": {"filesExist": true, "dependenciesMet": true, "taskDataCurrent": true}
 * }
 * -->
 * Enhanced prompt text here...
 *
 * Terminal AI can parse this to skip redundant analysis.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { EnhancementContext } from '../types/EnhancementContext';
import { EnhancementMetadata, MetadataFormatterOptions } from '../types/EnhancementMetadata';
import { TemplateEvolutionService } from './TemplateEvolutionService'; // ENHANCE-001.5: Outcome tracking

export class AIEnhancementService {
    private templateEvolution: TemplateEvolutionService;

    constructor() {
        this.templateEvolution = new TemplateEvolutionService();
    }
    /**
     * Enhance prompt using VS Code Language Model API
     *
     * Flow:
     * 1. Check for available language models (Copilot, Continue.dev, etc.)
     * 2. If available: Build AI prompt → Send to model → Stream response
     * 3. If unavailable: Fall back to template system
     * 4. Embed metadata in HTML comment for terminal AI
     * 5. Return enhanced prompt
     *
     * @param context - Normalized enhancement context from IContextBuilder
     * @returns Enhanced prompt with embedded metadata
     */
    async enhance(context: EnhancementContext): Promise<string> {
        try {
            // Step 1: Check for available language models
            const models = await vscode.lm.selectChatModels();

            if (models.length === 0) {
                // No AI available - fall back to template
                console.log('[ÆtherLight] No language models available, using template fallback');
                return this.templateFallback(context);
            }

            // Step 2: Build prompt for AI
            const promptForAI = this.buildAIPrompt(context);

            // Step 3: Send request to language model
            const messages = [vscode.LanguageModelChatMessage.User(promptForAI)];
            const token = new vscode.CancellationTokenSource().token;

            console.log(`[ÆtherLight] Sending enhancement request to ${models[0].name}`);
            const response = await models[0].sendRequest(messages, {}, token);

            // Step 4: Stream response
            let result = '';
            for await (const chunk of response.text) {
                result += chunk;
            }

            // Step 5: Embed metadata
            const enhancedPrompt = this.embedMetadata(result, context);

            // Step 6: Track enhancement for outcome analysis (ENHANCE-001.5)
            this.templateEvolution.trackEnhancement({
                context: context,
                enhancedPrompt: enhancedPrompt,
                timestamp: new Date()
            });

            return enhancedPrompt;

        } catch (error) {
            // AI error - fall back to template
            console.warn('[ÆtherLight] AI enhancement failed, using template fallback:', error);
            return this.templateFallback(context);
        }
    }

    /**
     * Build AI prompt from enhancement context
     *
     * Prompt structure:
     * 1. Task Overview (type, name, description)
     * 2. Files to Modify (with relevance scores)
     * 3. Workspace Context (languages, frameworks, git commits)
     * 4. Patterns to Apply (ÆtherLight patterns)
     * 5. SOPs (CLAUDE.md, aetherlight.md)
     * 6. Request (generate comprehensive prompt following MVP-003 template)
     *
     * @param context - Enhancement context
     * @returns Prompt string for AI
     */
    private buildAIPrompt(context: EnhancementContext): string {
        const sections: string[] = [];

        // Header
        sections.push(`# AI Enhancement Request\n`);
        sections.push(`Generate a comprehensive, actionable prompt following MVP-003 template format.\n`);

        // Task Overview
        sections.push(`## Task Overview`);
        sections.push(`**Type**: ${context.type}`);
        sections.push(`**Name**: ${context.template.name}`);
        sections.push(`**Description**: ${context.template.description}`);
        sections.push(`**Agent**: ${context.metadata.agent}`);
        sections.push(`**Confidence**: ${context.metadata.confidence.level} (${context.metadata.confidence.score}%)\n`);

        // Files to Modify
        if (context.workspaceContext.filesFound.length > 0) {
            sections.push(`## Files Found (Relevance)`);
            context.workspaceContext.filesFound.forEach(file => {
                sections.push(`- \`${file.path}\` (${file.relevance}%) - ${file.reason}`);
            });
            sections.push('');
        }

        // Workspace Context
        sections.push(`## Workspace Context`);
        sections.push(`**Root**: ${context.workspaceContext.rootPath}`);
        sections.push(`**Languages**: ${context.workspaceContext.languages.join(', ')}`);
        sections.push(`**Frameworks**: ${context.workspaceContext.frameworks.join(', ')}\n`);

        // Git Commits
        if (context.workspaceContext.gitCommits.length > 0) {
            sections.push(`## Recent Git Commits`);
            context.workspaceContext.gitCommits.slice(0, 5).forEach(commit => {
                sections.push(`- \`${commit.hash.substring(0, 7)}\` ${commit.message} (${commit.date})`);
            });
            sections.push('');
        }

        // Patterns to Apply
        if (context.metadata.patterns.length > 0) {
            sections.push(`## Patterns to Apply`);
            context.metadata.patterns.forEach(pattern => {
                sections.push(`- ${pattern}`);
            });
            sections.push('');
        }

        // SOPs
        if (context.workspaceContext.sops.claudeMd || context.workspaceContext.sops.aetherlightMd) {
            sections.push(`## Standard Operating Procedures`);
            if (context.workspaceContext.sops.claudeMd) {
                sections.push(`**CLAUDE.md**: Available - follow project guidelines`);
            }
            if (context.workspaceContext.sops.aetherlightMd) {
                sections.push(`**aetherlight.md**: Available - follow ÆtherLight patterns`);
            }
            sections.push('');
        }

        // Specific Context
        if (Object.keys(context.specificContext).length > 0) {
            sections.push(`## Additional Context`);
            sections.push(JSON.stringify(context.specificContext, null, 2));
            sections.push('');
        }

        // Request
        sections.push(`## Request`);
        sections.push(`Generate a comprehensive, actionable prompt that:`);
        sections.push(`1. Clearly states the objective`);
        sections.push(`2. Provides specific context (files, patterns, SOPs)`);
        sections.push(`3. Lists concrete execution steps`);
        sections.push(`4. Includes success validation criteria`);
        sections.push(`5. Follows MVP-003 template structure`);
        sections.push(`6. Incorporates Pattern-TDD-001 (tests FIRST)`);
        sections.push(`7. Applies relevant ÆtherLight patterns`);
        sections.push(`8. Is ready for terminal AI to execute`);

        return sections.join('\n');
    }

    /**
     * Template fallback when no AI available
     *
     * Uses MVP-003 template structure with context from EnhancementContext
     *
     * @param context - Enhancement context
     * @returns Template-based prompt
     */
    private templateFallback(context: EnhancementContext): string {
        const sections: string[] = [];

        // Header
        sections.push(`# ${context.template.name}\n`);

        // Description
        sections.push(`## Description`);
        sections.push(context.template.description || 'No description provided');
        sections.push('');

        // Files to Modify
        if (context.workspaceContext.filesFound.length > 0) {
            sections.push(`## Files to Modify`);
            context.workspaceContext.filesFound.forEach(file => {
                sections.push(`- \`${file.path}\` (${file.relevance}%) - ${file.reason}`);
            });
            sections.push('');
        }

        // Approach
        if (context.template.approach) {
            sections.push(`## Approach`);
            sections.push(context.template.approach);
            sections.push('');
        }

        // Patterns
        if (context.metadata.patterns.length > 0) {
            sections.push(`## Patterns to Apply`);
            context.metadata.patterns.forEach(pattern => {
                sections.push(`- ${pattern}`);
            });
            sections.push('');
        }

        // Validation
        if (context.template.validation_steps && context.template.validation_steps.length > 0) {
            sections.push(`## Success Criteria`);
            context.template.validation_steps.forEach((step: string) => {
                sections.push(`- [ ] ${step}`);
            });
            sections.push('');
        }

        // Embed metadata
        const enhancedPrompt = this.embedMetadata(sections.join('\n'), context);

        // Track enhancement for outcome analysis (ENHANCE-001.5)
        this.templateEvolution.trackEnhancement({
            context: context,
            enhancedPrompt: enhancedPrompt,
            timestamp: new Date()
        });

        return enhancedPrompt;
    }

    /**
     * Embed metadata in HTML comment
     *
     * PURPOSE: Terminal AI can parse metadata to skip redundant analysis
     *
     * ENHANCED VERSION (v1.0):
     * - Complete metadata schema (version, timestamp, template, context summary)
     * - Size optimization (compress if > 2KB)
     * - Path sanitization (relative paths, not absolute)
     * - Error handling (JSON formatting failures)
     *
     * Format:
     * <!--
     * AETHERLIGHT_ENHANCEMENT_METADATA
     * {
     *   "version": "1.0",
     *   "enhancementType": "bug",
     *   "buttonType": "Bug Report",
     *   "timestamp": "2025-01-13T15:45:00Z",
     *   "confidence": {"score": 85, "level": "high"},
     *   "contextGathered": {...},
     *   "validation": {...}
     * }
     * -->
     * Enhanced prompt text...
     *
     * @param prompt - Generated prompt text
     * @param context - Enhancement context
     * @param options - Formatter options (size limits, sanitization)
     * @returns Prompt with embedded metadata
     */
    private embedMetadata(
        prompt: string,
        context: EnhancementContext,
        options?: MetadataFormatterOptions
    ): string {
        try {
            // Default options
            const opts: MetadataFormatterOptions = {
                maxSize: options?.maxSize || 2048,
                prettyPrint: options?.prettyPrint !== false,
                sanitizePaths: options?.sanitizePaths !== false,
                includeSpecificContext: options?.includeSpecificContext || false
            };

            // Build complete metadata
            const metadata: EnhancementMetadata = {
                version: '1.0',
                enhancementType: context.type,
                buttonType: this.getButtonTypeName(context.type),
                timestamp: new Date().toISOString(),
                templateVersion: 'MVP-003 v1.4.3',
                confidence: context.metadata.confidence,
                contextGathered: {
                    workspace: {
                        rootPath: opts.sanitizePaths
                            ? this.sanitizePath(context.workspaceContext.rootPath)
                            : context.workspaceContext.rootPath,
                        languages: context.workspaceContext.languages,
                        frameworks: context.workspaceContext.frameworks,
                        filesAnalyzed: context.workspaceContext.filesFound.length,
                        directoryCount: this.estimateDirectoryCount(context.workspaceContext.rootPath)
                    },
                    git: context.workspaceContext.gitCommits.length > 0 ? {
                        commitsAnalyzed: context.workspaceContext.gitCommits.length,
                        daysBack: this.calculateDaysBack(context.workspaceContext.gitCommits),
                        branch: this.getCurrentBranch(),
                        hasUncommittedChanges: false  // TODO: Implement git status check
                    } : undefined,
                    filesFound: this.compressFilesFound(
                        context.workspaceContext.filesFound,
                        opts.sanitizePaths !== false
                    ),
                    patterns: context.metadata.patterns,
                    sops: {
                        claudeMd: !!context.workspaceContext.sops.claudeMd,
                        aetherlightMd: !!context.workspaceContext.sops.aetherlightMd
                    }
                },
                validation: context.metadata.validation,
                agent: context.metadata.agent,
                specificContext: opts.includeSpecificContext ? context.specificContext : undefined
            };

            // Format as JSON
            let metadataJson = opts.prettyPrint
                ? JSON.stringify(metadata, null, 2)
                : JSON.stringify(metadata);

            // Size check: compress if needed
            const maxSize = opts.maxSize || 2048;
            if (metadataJson.length > maxSize) {
                console.log(`[AIEnhancementService] Metadata too large (${metadataJson.length} bytes), compressing`);
                metadata.contextGathered.filesFound = metadata.contextGathered.filesFound.slice(0, 5);
                metadata.specificContext = undefined;
                metadataJson = JSON.stringify(metadata, null, 2);
            }

            // Format as HTML comment
            const metadataComment = `<!--\nAETHERLIGHT_ENHANCEMENT_METADATA\n${metadataJson}\n-->\n\n`;
            return metadataComment + prompt;

        } catch (error) {
            // Fallback: if metadata fails, return prompt without metadata
            console.error('[AIEnhancementService] Metadata embedding failed:', error);
            return prompt;
        }
    }

    /**
     * Get human-readable button type name
     */
    private getButtonTypeName(type: string): string {
        const names: Record<string, string> = {
            'task': 'Start This Task',
            'bug': 'Bug Report',
            'feature': 'Feature Request',
            'code_analyzer': 'Code Analyzer',
            'sprint_planner': 'Sprint Planner',
            'general': 'General Enhancement'
        };
        return names[type] || type;
    }

    /**
     * Sanitize workspace path (convert absolute → relative, remove username)
     */
    private sanitizePath(absolutePath: string): string {
        // Remove username from path
        let sanitized = absolutePath.replace(/\/Users\/[^\/]+\//, '/Users/<user>/');
        sanitized = sanitized.replace(/C:\\Users\\[^\\]+\\/, 'C:\\Users\\<user>\\');

        // Convert to relative if possible
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (workspaceRoot && absolutePath.startsWith(workspaceRoot)) {
            return path.relative(workspaceRoot, absolutePath) || '.';
        }

        return sanitized;
    }

    /**
     * Compress filesFound list (top 10 by relevance)
     */
    private compressFilesFound(
        files: Array<{ path: string; relevance: number; reason: string }>,
        sanitize: boolean
    ): Array<{ path: string; relevance: number; reason: string }> {
        // Sort by relevance (descending)
        const sorted = [...files].sort((a, b) => b.relevance - a.relevance);

        // Take top 10
        const top10 = sorted.slice(0, 10);

        // Sanitize paths if requested
        return top10.map(file => ({
            path: sanitize ? this.sanitizePath(file.path) : file.path,
            relevance: file.relevance,
            reason: file.reason
        }));
    }

    /**
     * Calculate how many days back git commits were analyzed
     */
    private calculateDaysBack(commits: Array<{ hash: string; message: string; date: string }>): number {
        if (commits.length === 0) return 0;

        const oldest = commits[commits.length - 1].date;
        const oldestDate = new Date(oldest);
        const now = new Date();
        const diffMs = now.getTime() - oldestDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        return diffDays;
    }

    /**
     * Get current git branch
     */
    private getCurrentBranch(): string | undefined {
        try {
            const { execSync } = require('child_process');
            const branch = execSync('git rev-parse --abbrev-ref HEAD', {
                encoding: 'utf-8',
                cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
            }).trim();
            return branch;
        } catch {
            return undefined;
        }
    }

    /**
     * Estimate directory count (approximate)
     */
    private estimateDirectoryCount(rootPath: string): number {
        // Simple heuristic: count subdirectories in workspace root
        try {
            const fs = require('fs');
            const entries = fs.readdirSync(rootPath, { withFileTypes: true });
            return entries.filter((e: any) => e.isDirectory()).length;
        } catch {
            return 0;
        }
    }
}
