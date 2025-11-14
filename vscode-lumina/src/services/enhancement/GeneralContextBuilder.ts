/**
 * GeneralContextBuilder
 *
 * DESIGN DECISION: Lightweight context builder for general text enhancement
 * WHY: General text needs intent extraction and pattern discovery
 *
 * REASONING CHAIN:
 * 1. User types free-form text in Voice Panel
 * 2. Extract intent from text (implement, refactor, debug, analyze, test, optimize)
 * 3. Find relevant patterns via keyword search
 * 4. Calculate confidence score (high if intent clear and patterns found)
 * 5. Package everything into normalized EnhancementContext
 * 6. AI enhancement service receives consistent format
 *
 * PATTERN: Pattern-STRATEGY-001 (Strategy pattern for pluggable context builders)
 * ARCHITECTURE: v3.0 Context Builder Pattern
 * RELATED: IContextBuilder.ts, EnhancementContext.ts, AIEnhancementService.ts
 */

import * as vscode from 'vscode';
import { IContextBuilder } from '../../interfaces/IContextBuilder';
import { EnhancementContext, ConfidenceScore } from '../../types/EnhancementContext';
import { TemplateTask, TemplateTaskBuilder } from '../TemplateTaskBuilder';

export class GeneralContextBuilder implements IContextBuilder {
    private workspaceRoot: string;

    // Intent keyword mapping
    private intentKeywords: Record<string, string[]> = {
        'implement': ['implement', 'add', 'create', 'build', 'develop', 'make'],
        'refactor': ['refactor', 'restructure', 'reorganize', 'improve', 'clean', 'cleanup'],
        'debug': ['debug', 'fix', 'resolve', 'diagnose', 'troubleshoot', 'bug'],
        'analyze': ['analyze', 'review', 'examine', 'investigate', 'assess', 'study'],
        'test': ['test', 'verify', 'validate', 'check', 'ensure', 'confirm'],
        'optimize': ['optimize', 'speed', 'faster', 'performance', 'improve']
    };

    constructor(private context: vscode.ExtensionContext) {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    }

    /**
     * Build EnhancementContext from general text input
     *
     * @param input - Object containing text field { text: string }
     * @returns Promise resolving to normalized EnhancementContext
     */
    async build(input: { text: string }): Promise<EnhancementContext> {
        const text = input.text;

        // 1. Extract intent from text
        const intent = this.extractIntent(text);

        // 2. Find relevant patterns
        const patterns = await this.findRelevantPatterns(text);

        // 3. Calculate confidence score
        const confidence = this.calculateConfidence(patterns.length, intent !== 'general');

        // 4. Build template task
        const template = this.buildTemplate(text);

        // 5. Return normalized context
        return {
            type: 'general',
            template,
            metadata: {
                buttonType: 'general_enhance',
                confidence,
                patterns,
                agent: 'developer',
                validation: {
                    filesExist: true,
                    dependenciesMet: true,
                    taskDataCurrent: true
                }
            },
            workspaceContext: {
                rootPath: this.workspaceRoot,
                languages: [],
                frameworks: [],
                filesFound: [],
                gitCommits: [],
                sops: {}
            },
            specificContext: {
                originalText: text,
                intent
            }
        };
    }

    /**
     * Extract intent from text
     * WHY: Intent helps AI understand what user wants to do
     * REASONING: Keyword matching against known intent categories
     */
    private extractIntent(text: string): string {
        const lowerText = text.toLowerCase();
        const intentScores = new Map<string, number>();

        // Count keyword matches for each intent
        for (const [intent, keywords] of Object.entries(this.intentKeywords)) {
            let score = 0;
            for (const keyword of keywords) {
                if (lowerText.includes(keyword)) {
                    score++;
                }
            }
            if (score > 0) {
                intentScores.set(intent, score);
            }
        }

        // Return intent with highest score
        if (intentScores.size > 0) {
            const sortedIntents = Array.from(intentScores.entries()).sort((a, b) => b[1] - a[1]);
            return sortedIntents[0][0];
        }

        // Default to 'general' if no intent detected
        return 'general';
    }

    /**
     * Find relevant patterns via keyword search
     * WHY: Pattern suggestions help user follow established patterns
     * REASONING: Search for Pattern-* references in workspace
     */
    private async findRelevantPatterns(text: string): Promise<string[]> {
        const keywords = this.extractKeywords(text);
        if (keywords.length === 0) {
            return [];
        }

        try {
            // Look for pattern files in docs/patterns directory
            const patternFiles = await vscode.workspace.findFiles('docs/patterns/Pattern-*.md', undefined, 50);

            const relevantPatterns: string[] = [];

            // Match pattern filenames against keywords
            for (const uri of patternFiles) {
                const filename = uri.fsPath.toLowerCase();
                for (const keyword of keywords) {
                    if (filename.includes(keyword)) {
                        // Extract pattern ID from filename (e.g., Pattern-AUTH-001.md)
                        const match = filename.match(/pattern-([a-z-0-9]+)\.md/i);
                        if (match) {
                            relevantPatterns.push(`Pattern-${match[1].toUpperCase()}`);
                            break;
                        }
                    }
                }
            }

            return relevantPatterns.slice(0, 10); // Limit to 10 patterns
        } catch (error) {
            return [];
        }
    }

    /**
     * Extract keywords from text for pattern matching
     * WHY: Keywords help find relevant patterns
     * REASONING: Remove common words, keep technical terms
     */
    private extractKeywords(text: string): string[] {
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can']);

        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word))
            .slice(0, 10); // Limit to 10 keywords for performance
    }

    /**
     * Calculate confidence score based on evidence
     * WHY: Confidence helps AI know how much context is available
     * REASONING: Clear intent and patterns found = higher confidence
     */
    private calculateConfidence(patternsFound: number, intentClear: boolean): ConfidenceScore {
        let score = 40; // Base score for general text

        // Increase score if intent is clear
        if (intentClear) {
            score += 30;
        }

        // Increase score based on patterns found
        if (patternsFound >= 3) {
            score += 30;
        } else if (patternsFound >= 1) {
            score += 15;
        }

        // Determine level
        let level: 'high' | 'medium' | 'low';
        if (score >= 70) {
            level = 'high';
        } else if (score >= 40) {
            level = 'medium';
        } else {
            level = 'low';
        }

        return { score, level };
    }

    /**
     * Build template task from text input
     * WHY: Template provides structured format for AI enhancement
     * REASONING: Use TemplateTaskBuilder to create consistent template
     */
    private buildTemplate(text: string): TemplateTask {
        const builder = new TemplateTaskBuilder(this.workspaceRoot);
        const template = builder.buildGeneralEnhanceTemplate(text);
        return template;
    }
}
