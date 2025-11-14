/**
 * BugReportContextBuilder
 *
 * DESIGN DECISION: Lightweight context builder for bug reports
 * WHY: Bug reports need historical context (similar bugs, affected files)
 *
 * REASONING CHAIN:
 * 1. User fills out bug report form (severity, steps, expected vs. actual)
 * 2. Search git history for similar bugs (keyword matching in commit messages)
 * 3. Find potentially affected files (heuristic: keywords in file paths)
 * 4. Calculate confidence score (high if evidence found, low if not)
 * 5. Package everything into normalized EnhancementContext
 * 6. AI enhancement service receives consistent format
 *
 * PATTERN: Pattern-STRATEGY-001 (Strategy pattern for pluggable context builders)
 * ARCHITECTURE: v3.0 Context Builder Pattern
 * RELATED: IContextBuilder.ts, EnhancementContext.ts, AIEnhancementService.ts
 */

import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import { IContextBuilder } from '../../interfaces/IContextBuilder';
import { EnhancementContext, ConfidenceScore } from '../../types/EnhancementContext';
import { BugReportFormData, TemplateTask, TemplateTaskBuilder } from '../TemplateTaskBuilder';

export class BugReportContextBuilder implements IContextBuilder {
    private workspaceRoot: string;

    constructor(private context: vscode.ExtensionContext) {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    }

    /**
     * Build EnhancementContext from bug report form data
     *
     * @param input - Bug report form data from UI
     * @returns Promise resolving to normalized EnhancementContext
     */
    async build(input: BugReportFormData): Promise<EnhancementContext> {
        // 1. Extract keywords from bug report
        const keywords = this.extractKeywords(input.title + ' ' + input.stepsToReproduce);

        // 2. Search git for similar bugs
        const gitCommits = await this.searchSimilarBugs(keywords);

        // 3. Find affected files by heuristic
        const filesFound = await this.findAffectedFiles(keywords);

        // 4. Calculate confidence score
        const confidence = this.calculateConfidence(gitCommits.length, filesFound.length);

        // 5. Build template task
        const template = this.buildTemplate(input);

        // 6. Return normalized context
        return {
            type: 'bug',
            template,
            metadata: {
                buttonType: 'bug_report',
                confidence,
                patterns: [], // Patterns will be populated by AI enhancement service
                agent: 'developer',
                validation: {
                    filesExist: filesFound.length > 0,
                    dependenciesMet: true,
                    taskDataCurrent: true
                }
            },
            workspaceContext: {
                rootPath: this.workspaceRoot,
                languages: [], // Will be detected by AI enhancement service
                frameworks: [],
                filesFound,
                gitCommits,
                sops: {}
            },
            specificContext: {
                severity: input.severity,
                stepsToReproduce: input.stepsToReproduce,
                expectedBehavior: input.expectedBehavior,
                actualBehavior: input.actualBehavior,
                additionalContext: input.additionalContext
            }
        };
    }

    /**
     * Extract keywords from text for searching
     * WHY: Keywords help find similar bugs and affected files
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
     * Search git history for similar bugs
     * WHY: Historical context helps understand recurring issues
     * REASONING: Use git log --grep to search commit messages
     */
    private async searchSimilarBugs(keywords: string[]): Promise<Array<{ hash: string; message: string; date: string }>> {
        if (!this.workspaceRoot || keywords.length === 0) {
            return [];
        }

        try {
            // Build git grep pattern (OR of all keywords)
            const grepPattern = keywords.map(kw => `${kw}`).join('\\|');

            // Search git log for commits matching keywords
            const gitCommand = `git log --all --grep="${grepPattern}" --format="%H|%s|%ai" --max-count=10`;

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
     * Find affected files by heuristic (keywords in file paths)
     * WHY: Helps identify which files might be related to the bug
     * REASONING: Use VS Code's findFiles API with keyword-based patterns
     */
    private async findAffectedFiles(keywords: string[]): Promise<Array<{ path: string; relevance: number; reason: string }>> {
        if (keywords.length === 0) {
            return [];
        }

        try {
            const filesFound: Array<{ path: string; relevance: number; reason: string }> = [];

            // Search for files containing keywords in their paths
            for (const keyword of keywords.slice(0, 5)) { // Limit to 5 keywords for performance
                const pattern = new vscode.RelativePattern(this.workspaceRoot, `**/*${keyword}*`);
                const uris = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 20);

                for (const uri of uris) {
                    const relativePath = path.relative(this.workspaceRoot, uri.fsPath);
                    filesFound.push({
                        path: relativePath,
                        relevance: 70, // Medium relevance (keyword match)
                        reason: `File path contains keyword: "${keyword}"`
                    });
                }
            }

            // Return unique files, sorted by relevance
            const uniqueFiles = Array.from(new Map(filesFound.map(f => [f.path, f])).values());
            return uniqueFiles.slice(0, 20); // Limit to 20 files
        } catch (error) {
            return [];
        }
    }

    /**
     * Calculate confidence score based on evidence
     * WHY: Confidence helps AI know how much context is available
     * REASONING: More evidence = higher confidence
     */
    private calculateConfidence(similarBugsFound: number, filesFound: number): ConfidenceScore {
        let score = 50; // Base score

        // Increase score based on similar bugs found
        if (similarBugsFound >= 3) {
            score += 30;
        } else if (similarBugsFound >= 1) {
            score += 15;
        }

        // Increase score based on files found
        if (filesFound >= 2) {
            score += 20;
        } else if (filesFound >= 1) {
            score += 10;
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
     * Build template task from bug report form data
     * WHY: Template provides structured format for AI enhancement
     * REASONING: Use TemplateTaskBuilder to create consistent template
     */
    private buildTemplate(input: BugReportFormData): TemplateTask {
        const builder = new TemplateTaskBuilder(this.workspaceRoot);
        const template = builder.buildBugReportTemplate(input);
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
