/**
 * CodeAnalyzerContextBuilder
 *
 * DESIGN DECISION: Complex context builder for workspace code analysis
 * WHY: Code analysis needs comprehensive workspace insights (structure, history, complexity, patterns)
 *
 * REASONING CHAIN:
 * 1. User clicks "Analyze Code" button with focus area (performance, security, architecture, etc.)
 * 2. Analyze workspace structure (languages, frameworks, directories)
 * 3. Analyze git history (last 30 days, hotspots, churn)
 * 4. Calculate complexity metrics (LOC estimate, file count, depth)
 * 5. Perform semantic pattern search (find 5-10 relevant patterns)
 * 6. Identify project type (CLI, web, desktop, library)
 * 7. Calculate confidence score (high if comprehensive data available)
 * 8. Package everything into normalized EnhancementContext
 * 9. AI enhancement service receives consistent format
 *
 * PATTERN: Pattern-STRATEGY-001 (Strategy pattern for pluggable context builders)
 * ARCHITECTURE: v3.0 Context Builder Pattern
 * RELATED: IContextBuilder.ts, EnhancementContext.ts, PromptEnhancer.ts
 */

import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import { IContextBuilder } from '../../interfaces/IContextBuilder';
import { EnhancementContext, ConfidenceScore } from '../../types/EnhancementContext';
import { TemplateTask, TemplateTaskBuilder } from '../TemplateTaskBuilder';

export class CodeAnalyzerContextBuilder implements IContextBuilder {
    private workspaceRoot: string;

    // Focus area to pattern mapping
    private focusAreaPatterns: Record<string, string[]> = {
        'performance': ['Pattern-PERF-001', 'Pattern-CACHE-001', 'Pattern-OPTIMIZATION-001'],
        'security': ['Pattern-SECURITY-001', 'Pattern-AUTH-001', 'Pattern-VALIDATION-001'],
        'architecture': ['Pattern-ARCH-001', 'Pattern-STRATEGY-001', 'Pattern-FACTORY-001'],
        'testing': ['Pattern-TDD-001', 'Pattern-TESTING-001', 'Pattern-MOCKING-001'],
        'documentation': ['Pattern-DOCS-001', 'Pattern-COMMENTS-001'],
        'ui': ['Pattern-UI-001', 'Pattern-UX-001'],
        'api': ['Pattern-API-001', 'Pattern-REST-001']
    };

    constructor(private context: vscode.ExtensionContext) {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    }

    /**
     * Build EnhancementContext from code analysis request
     *
     * @param input - Object containing focusArea field { focusArea: string }
     * @returns Promise resolving to normalized EnhancementContext
     */
    async build(input: { focusArea: string }): Promise<EnhancementContext> {
        const focusArea = input.focusArea || 'general';

        // 1. Analyze workspace structure
        const workspaceAnalysis = await this.analyzeWorkspaceStructure();

        // 2. Analyze git history (30 days)
        const gitAnalysis = await this.analyzeGitHistory(30);

        // 3. Calculate complexity metrics
        const complexityMetrics = await this.calculateComplexityMetrics();

        // 4. Find relevant patterns
        const patterns = await this.findRelevantPatterns(focusArea);

        // 5. Detect project type
        const projectType = this.detectProjectType(workspaceAnalysis.frameworks);

        // 6. Identify hotspots
        const hotspots = this.identifyHotspots(gitAnalysis.commits);

        // 7. Calculate confidence
        const confidence = this.calculateConfidence(
            workspaceAnalysis.languages.length,
            gitAnalysis.commits.length,
            patterns.length
        );

        // 8. Build template
        const template = this.buildTemplate(focusArea, workspaceAnalysis, complexityMetrics);

        // 9. Return normalized context
        return {
            type: 'code_analyzer',
            template,
            metadata: {
                buttonType: 'analyze_code',
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
                languages: workspaceAnalysis.languages,
                frameworks: workspaceAnalysis.frameworks,
                filesFound: workspaceAnalysis.keyFiles.map(f => ({ path: f, relevance: 90, reason: 'Key file' })),
                gitCommits: gitAnalysis.commits,
                sops: {}
            },
            specificContext: {
                focusArea,
                gitAnalysis,
                complexityMetrics,
                projectType,
                hotspots,
                keyDirectories: workspaceAnalysis.keyDirectories
            }
        };
    }

    /**
     * Analyze workspace structure
     * WHY: Understanding structure helps tailor analysis
     * REASONING: Languages and frameworks guide analysis recommendations
     */
    private async analyzeWorkspaceStructure(): Promise<{
        languages: string[];
        frameworks: string[];
        keyDirectories: string[];
        keyFiles: string[];
    }> {
        const structure = {
            languages: [] as string[],
            frameworks: [] as string[],
            keyDirectories: [] as string[],
            keyFiles: [] as string[]
        };

        if (!this.workspaceRoot) {
            return structure;
        }

        try {
            // Detect languages by file extensions
            const files = await vscode.workspace.findFiles('**/*.{ts,js,rs,py,go,java}', '**/node_modules/**', 100);

            const extensions = new Set<string>();
            for (const file of files) {
                const ext = path.extname(file.fsPath);
                extensions.add(ext);
            }

            // Map extensions to languages
            const extToLang: Record<string, string> = {
                '.ts': 'TypeScript',
                '.js': 'JavaScript',
                '.rs': 'Rust',
                '.py': 'Python',
                '.go': 'Go',
                '.java': 'Java'
            };

            for (const ext of extensions) {
                if (extToLang[ext]) {
                    structure.languages.push(extToLang[ext]);
                }
            }

            // Detect frameworks by checking key files
            const frameworkMarkers: Record<string, string> = {
                'package.json': 'Node.js',
                'Cargo.toml': 'Rust/Cargo',
                'tauri.conf.json': 'Tauri',
                'tsconfig.json': 'TypeScript'
            };

            for (const [marker, framework] of Object.entries(frameworkMarkers)) {
                const markerPath = path.join(this.workspaceRoot, marker);
                try {
                    await vscode.workspace.fs.stat(vscode.Uri.file(markerPath));
                    structure.frameworks.push(framework);
                } catch {
                    // File doesn't exist
                }
            }

            // Identify key directories
            const commonDirs = ['src', 'test', 'docs', 'internal', 'packages'];
            for (const dir of commonDirs) {
                const dirPath = path.join(this.workspaceRoot, dir);
                try {
                    await vscode.workspace.fs.stat(vscode.Uri.file(dirPath));
                    structure.keyDirectories.push(dir);
                } catch {
                    // Directory doesn't exist
                }
            }

            // Identify key files
            const keyFiles = ['README.md', 'CLAUDE.md', 'package.json', 'Cargo.toml', 'tsconfig.json'];
            for (const file of keyFiles) {
                const filePath = path.join(this.workspaceRoot, file);
                try {
                    await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
                    structure.keyFiles.push(file);
                } catch {
                    // File doesn't exist
                }
            }
        } catch (error) {
            console.warn('[ÆtherLight] Workspace structure analysis failed:', error);
        }

        return structure;
    }

    /**
     * Analyze git history (last N days)
     * WHY: Recent changes indicate active development areas
     * REASONING: Commit frequency and authors show project activity
     */
    private async analyzeGitHistory(days: number): Promise<{
        timeRange: string;
        commits: Array<{ hash: string; message: string; date: string }>;
        totalCommits: number;
    }> {
        const result = {
            timeRange: `Last ${days} days`,
            commits: [] as Array<{ hash: string; message: string; date: string }>,
            totalCommits: 0
        };

        if (!this.workspaceRoot) {
            return result;
        }

        try {
            const since = `--since="${days} days ago"`;
            const gitCommand = `git log ${since} --format="%H|%s|%ai" --max-count=50`;
            const output = await this.execCommand(gitCommand, this.workspaceRoot);

            result.commits = output
                .trim()
                .split('\n')
                .filter(line => line.length > 0)
                .map(line => {
                    const [hash, message, date] = line.split('|');
                    return { hash, message, date };
                });

            result.totalCommits = result.commits.length;
        } catch (error) {
            // Git command failed - return empty result gracefully
        }

        return result;
    }

    /**
     * Calculate complexity metrics
     * WHY: Metrics indicate codebase size and maintainability
     * REASONING: File count and estimated LOC help scope analysis
     */
    private async calculateComplexityMetrics(): Promise<{
        totalFiles: number;
        estimatedLOC: number;
        maxDepth: number;
    }> {
        const metrics = {
            totalFiles: 0,
            estimatedLOC: 0,
            maxDepth: 0
        };

        if (!this.workspaceRoot) {
            return metrics;
        }

        try {
            // Count code files (excluding node_modules, out, dist)
            const files = await vscode.workspace.findFiles(
                '**/*.{ts,js,rs,py,go,java}',
                '**/node_modules/**',
                1000
            );

            metrics.totalFiles = files.length;

            // Estimate LOC (average 50 lines per file for quick estimate)
            metrics.estimatedLOC = metrics.totalFiles * 50;

            // Calculate max directory depth
            let maxDepth = 0;
            for (const file of files) {
                const relativePath = path.relative(this.workspaceRoot, file.fsPath);
                const depth = relativePath.split(path.sep).length;
                if (depth > maxDepth) {
                    maxDepth = depth;
                }
            }
            metrics.maxDepth = maxDepth;
        } catch (error) {
            console.warn('[ÆtherLight] Complexity metrics calculation failed:', error);
        }

        return metrics;
    }

    /**
     * Find relevant patterns based on focus area
     * WHY: Patterns provide analysis guidance
     * REASONING: Focus area determines which patterns to recommend
     */
    private async findRelevantPatterns(focusArea: string): Promise<string[]> {
        const patterns: string[] = [];

        // Get patterns for focus area
        const focusPatterns = this.focusAreaPatterns[focusArea.toLowerCase()] || [];
        patterns.push(...focusPatterns);

        // Verify patterns exist in workspace
        const validPatterns: string[] = [];
        for (const pattern of patterns) {
            const patternFile = `docs/patterns/${pattern}.md`;
            const fullPath = path.join(this.workspaceRoot, patternFile);

            try {
                await vscode.workspace.fs.stat(vscode.Uri.file(fullPath));
                validPatterns.push(pattern);
            } catch {
                // Pattern file doesn't exist
            }
        }

        return validPatterns.slice(0, 10); // Limit to 10 patterns
    }

    /**
     * Detect project type from frameworks
     * WHY: Project type affects analysis recommendations
     * REASONING: CLI vs web vs desktop have different concerns
     */
    private detectProjectType(frameworks: string[]): string {
        if (frameworks.includes('Tauri')) {
            return 'desktop';
        }
        if (frameworks.includes('Node.js')) {
            return 'web';
        }
        if (frameworks.includes('Rust/Cargo')) {
            return 'library';
        }
        return 'unknown';
    }

    /**
     * Identify hotspots (frequently modified files)
     * WHY: Hotspots indicate maintenance burden
     * REASONING: Frequently changed files need attention
     */
    private identifyHotspots(commits: Array<{ hash: string; message: string; date: string }>): string[] {
        // Simple heuristic: Extract file mentions from commit messages
        const fileMentions = new Map<string, number>();

        for (const commit of commits) {
            // Look for file extensions in commit messages
            const matches = commit.message.match(/\b[\w/-]+\.(ts|js|rs|py|go|java)\b/g) || [];
            for (const match of matches) {
                fileMentions.set(match, (fileMentions.get(match) || 0) + 1);
            }
        }

        // Sort by frequency
        const sorted = Array.from(fileMentions.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([file, _]) => file);

        return sorted;
    }

    /**
     * Calculate confidence score
     * WHY: Confidence indicates data completeness
     * REASONING: More data = higher confidence
     */
    private calculateConfidence(
        languageCount: number,
        commitCount: number,
        patternCount: number
    ): ConfidenceScore {
        let score = 40; // Base score

        // Languages detected
        if (languageCount > 0) {
            score += 20;
        }

        // Git history available
        if (commitCount >= 10) {
            score += 20;
        } else if (commitCount >= 1) {
            score += 10;
        }

        // Patterns found
        if (patternCount >= 3) {
            score += 20;
        } else if (patternCount >= 1) {
            score += 10;
        }

        // Determine level
        let level: 'high' | 'medium' | 'low';
        if (score >= 70) {
            level = 'high';
        } else if (score >= 50) {
            level = 'medium';
        } else {
            level = 'low';
        }

        return { score, level };
    }

    /**
     * Build template from analysis results
     * WHY: Template provides structured format for AI enhancement
     * REASONING: Analysis findings inform prompt generation
     */
    private buildTemplate(
        focusArea: string,
        workspaceAnalysis: { languages: string[]; frameworks: string[]; keyDirectories: string[] },
        complexityMetrics: { totalFiles: number; estimatedLOC: number; maxDepth: number }
    ): TemplateTask {
        const builder = new TemplateTaskBuilder(this.workspaceRoot);

        // Build analysis description
        const description = `Analyze ${focusArea} aspects of codebase.\n\n` +
            `Workspace:\n` +
            `- Languages: ${workspaceAnalysis.languages.join(', ') || 'None detected'}\n` +
            `- Frameworks: ${workspaceAnalysis.frameworks.join(', ') || 'None detected'}\n` +
            `- Complexity: ${complexityMetrics.totalFiles} files, ~${complexityMetrics.estimatedLOC} LOC\n\n` +
            `Focus on ${focusArea} improvements.`;

        const taskName = `Code Analysis: ${focusArea.charAt(0).toUpperCase() + focusArea.slice(1)}`;

        // Create template with all required SprintTask fields
        return {
            id: `ANALYZE-${focusArea.toUpperCase()}`,
            name: taskName,
            status: 'pending',
            phase: 'analysis',
            agent: 'developer',
            description,
            dependencies: [],
            files_to_modify: [],
            files_to_create: [],
            deliverables: ['Analysis report', 'Recommendations'],
            estimated_time: '1-2 hours',
            estimated_lines: 0,
            assigned_engineer: 'engineer_1',
            required_expertise: ['code-analysis'],
            variables: {
                focusArea,
                languages: workspaceAnalysis.languages,
                frameworks: workspaceAnalysis.frameworks,
                totalFiles: complexityMetrics.totalFiles,
                estimatedLOC: complexityMetrics.estimatedLOC,
                workspace_root: this.workspaceRoot
            }
        };
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
