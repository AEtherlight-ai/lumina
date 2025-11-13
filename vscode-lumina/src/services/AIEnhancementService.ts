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
import { EnhancementContext } from '../types/EnhancementContext';

export class AIEnhancementService {
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
            return this.embedMetadata(result, context);

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
        return this.embedMetadata(sections.join('\n'), context);
    }

    /**
     * Embed metadata in HTML comment
     *
     * PURPOSE: Terminal AI can parse metadata to skip redundant analysis
     *
     * Format:
     * <!--
     * AETHERLIGHT_ENHANCEMENT_METADATA
     * {JSON metadata}
     * -->
     * Enhanced prompt text...
     *
     * @param prompt - Generated prompt
     * @param context - Enhancement context
     * @returns Prompt with embedded metadata
     */
    private embedMetadata(prompt: string, context: EnhancementContext): string {
        const metadata = {
            filesAnalyzed: context.workspaceContext.filesFound.map(f => f.path),
            gitCommitsReviewed: context.workspaceContext.gitCommits.length,
            confidence: context.metadata.confidence,
            patterns: context.metadata.patterns,
            agent: context.metadata.agent,
            validation: context.metadata.validation
        };

        const metadataComment = `<!--\nAETHERLIGHT_ENHANCEMENT_METADATA\n${JSON.stringify(metadata, null, 2)}\n-->\n\n`;
        return metadataComment + prompt;
    }
}
