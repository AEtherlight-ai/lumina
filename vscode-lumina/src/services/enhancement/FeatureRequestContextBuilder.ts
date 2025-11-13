/**
 * FeatureRequestContextBuilder
 *
 * DESIGN DECISION: Lightweight context builder for feature requests
 * WHY: Feature requests need historical context (similar features, use case patterns)
 *
 * REASONING CHAIN:
 * 1. User fills out feature request form (priority, use case, proposed solution)
 * 2. Search git history for similar features (keyword matching in commit messages)
 * 3. Identify use case patterns (auth, UI, performance, database, API)
 * 4. Calculate confidence score (high if patterns found, low if not)
 * 5. Package everything into normalized EnhancementContext
 * 6. AI enhancement service receives consistent format
 *
 * PATTERN: Pattern-STRATEGY-001 (Strategy pattern for pluggable context builders)
 * ARCHITECTURE: v3.0 Context Builder Pattern
 * RELATED: IContextBuilder.ts, EnhancementContext.ts, AIEnhancementService.ts
 */

import * as vscode from 'vscode';
import * as cp from 'child_process';
import { IContextBuilder } from '../../interfaces/IContextBuilder';
import { EnhancementContext, ConfidenceScore } from '../../types/EnhancementContext';
import { FeatureRequestFormData, TemplateTask, TemplateTaskBuilder } from '../TemplateTaskBuilder';

export class FeatureRequestContextBuilder implements IContextBuilder {
    private workspaceRoot: string;

    // Use case pattern mapping
    private useCasePatterns: Record<string, string[]> = {
        'authentication': ['Pattern-AUTH-001', 'Pattern-SECURITY-001'],
        'auth': ['Pattern-AUTH-001', 'Pattern-SECURITY-001'],
        'ui': ['Pattern-UI-001', 'Pattern-UX-001'],
        'interface': ['Pattern-UI-001', 'Pattern-UX-001'],
        'theme': ['Pattern-UI-001'],
        'performance': ['Pattern-PERF-001', 'Pattern-CACHE-001'],
        'speed': ['Pattern-PERF-001'],
        'optimize': ['Pattern-PERF-001'],
        'database': ['Pattern-DB-001', 'Pattern-MIGRATION-001'],
        'db': ['Pattern-DB-001'],
        'api': ['Pattern-API-001', 'Pattern-REST-001'],
        'endpoint': ['Pattern-API-001']
    };

    constructor(private context: vscode.ExtensionContext) {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    }

    /**
     * Build EnhancementContext from feature request form data
     *
     * @param input - Feature request form data from UI
     * @returns Promise resolving to normalized EnhancementContext
     */
    async build(input: FeatureRequestFormData): Promise<EnhancementContext> {
        // 1. Extract keywords from feature request
        const keywords = this.extractKeywords(input.title + ' ' + input.useCase);

        // 2. Search git for similar features
        const gitCommits = await this.searchSimilarFeatures(keywords);

        // 3. Identify use case patterns
        const patterns = this.identifyUseCasePatterns(input.useCase);

        // 4. Calculate confidence score
        const confidence = this.calculateConfidence(gitCommits.length, patterns.length);

        // 5. Build template task
        const template = this.buildTemplate(input);

        // 6. Return normalized context
        return {
            type: 'feature',
            template,
            metadata: {
                buttonType: 'feature_request',
                confidence,
                patterns,
                agent: 'architect',
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
                gitCommits,
                sops: {}
            },
            specificContext: {
                priority: input.priority,
                category: input.category,
                useCase: input.useCase,
                proposedSolution: input.proposedSolution,
                alternativeApproaches: input.alternativeApproaches,
                additionalContext: input.additionalContext
            }
        };
    }

    /**
     * Extract keywords from text for searching
     * WHY: Keywords help find similar features
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
     * Search git history for similar features
     * WHY: Historical context helps understand feature development patterns
     * REASONING: Use git log --grep to search commit messages for "feat"
     */
    private async searchSimilarFeatures(keywords: string[]): Promise<Array<{ hash: string; message: string; date: string }>> {
        if (!this.workspaceRoot || keywords.length === 0) {
            return [];
        }

        try {
            // Build git grep pattern (feat + keywords)
            const grepPattern = keywords.map(kw => `${kw}`).join('\\|');

            // Search git log for feature commits matching keywords
            const gitCommand = `git log --all --grep="feat.*\\(${grepPattern}\\)" --format="%H|%s|%ai" --max-count=10`;

            const output = await this.execCommand(gitCommand, this.workspaceRoot);

            // Parse output: hash|message|date
            return output
                .trim()
                .split('\n')
                .filter(line => line.length > 0)
                .map(line => {
                    const [hash, message, date] = line.split('|');
                    return { hash, message, date };
                });
        } catch (error) {
            // Git command failed - return empty array gracefully
            return [];
        }
    }

    /**
     * Identify use case patterns from text
     * WHY: Pattern suggestions help architect choose right approach
     * REASONING: Keyword matching against known pattern categories
     */
    private identifyUseCasePatterns(useCase: string): string[] {
        const text = useCase.toLowerCase();
        const patterns = new Set<string>();

        // Match keywords against pattern categories
        for (const [keyword, patternList] of Object.entries(this.useCasePatterns)) {
            if (text.includes(keyword)) {
                patternList.forEach(p => patterns.add(p));
            }
        }

        return Array.from(patterns);
    }

    /**
     * Calculate confidence score based on evidence
     * WHY: Confidence helps AI know how much context is available
     * REASONING: More evidence = higher confidence
     */
    private calculateConfidence(similarFeaturesFound: number, patternsFound: number): ConfidenceScore {
        let score = 50; // Base score

        // Increase score based on similar features found
        if (similarFeaturesFound >= 2) {
            score += 25;
        } else if (similarFeaturesFound >= 1) {
            score += 10;
        }

        // Increase score based on patterns found
        if (patternsFound >= 2) {
            score += 25;
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
     * Build template task from feature request form data
     * WHY: Template provides structured format for AI enhancement
     * REASONING: Use TemplateTaskBuilder to create consistent template
     */
    private buildTemplate(input: FeatureRequestFormData): TemplateTask {
        const builder = new TemplateTaskBuilder(this.workspaceRoot);
        const template = builder.buildFeatureRequestTemplate(input);
        return template;
    }

    /**
     * Execute shell command and return output
     * WHY: Needed for git commands
     * REASONING: Promisify child_process.exec for async/await
     */
    private execCommand(command: string, cwd: string): Promise<string> {
        return new Promise((resolve, reject) => {
            cp.exec(command, { cwd, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });
    }
}
