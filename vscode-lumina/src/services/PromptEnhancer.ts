/**
 * PromptEnhancer Service
 *
 * DESIGN DECISION: Enhance user's natural language intent into comprehensive AI prompts
 * WHY: Users know what they want but may not know how to structure it for AI agents
 *
 * REASONING CHAIN:
 * 1. User provides high-level intent ("add dark mode")
 * 2. System analyzes codebase structure and patterns
 * 3. System loads SOPs from .vscode/aetherlight.md and CLAUDE.md
 * 4. System generates detailed prompt with context, approach, validation
 * 5. User reviews generated prompt in Voice tab before sending
 * 6. Result: Expert-level prompts that Claude Code can execute effectively
 *
 * PATTERN: Pattern-ENHANCE-001 (Intent Normalization + Context Injection)
 * RELATED: voicePanel.ts (Code Analyzer, Sprint Planner), WorkspaceAnalyzer
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface EnhancementContext {
    userIntent: string;
    workspaceStructure: {
        rootPath: string;
        mainLanguages: string[];
        frameworks: string[];
        keyDirectories: string[];
        keyFiles: string[];
    };
    aetherlightSOPs: string | null;
    projectInstructions: string | null;
    existingPatterns: string[];
    existingSprints: string[];
}

export interface EnhancedPrompt {
    prompt: string;
    context: EnhancementContext;
    confidence: 'high' | 'medium' | 'low';
    warnings: string[];
}

export class PromptEnhancer {
    private workspaceRoot: string;

    constructor(context: vscode.ExtensionContext) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        this.workspaceRoot = workspaceFolder?.uri.fsPath || '';
    }

    /**
     * Enhance user's natural language intent into comprehensive prompt
     *
     * Chain of Thought:
     * - Parse user intent to extract goal, scope, constraints
     * - Gather codebase context (structure, patterns, SOPs)
     * - Generate structured prompt with context + approach + validation
     * - Return prompt ready for user review
     */
    async enhancePrompt(
        userIntent: string,
        promptType: 'code-analyzer' | 'sprint-planner'
    ): Promise<EnhancedPrompt> {
        const warnings: string[] = [];

        // Validate input
        if (!userIntent.trim()) {
            throw new Error('User intent cannot be empty');
        }

        if (!this.workspaceRoot) {
            warnings.push('No workspace folder open - context will be limited');
        }

        // Gather context from workspace
        const context = await this.gatherContext(userIntent);

        // Generate prompt based on type
        let prompt: string;
        if (promptType === 'code-analyzer') {
            prompt = await this.generateCodeAnalyzerPrompt(context);
        } else {
            prompt = await this.generateSprintPlannerPrompt(context);
        }

        // Calculate confidence based on available context
        const confidence = this.calculateConfidence(context, warnings);

        return {
            prompt,
            context,
            confidence,
            warnings
        };
    }

    /**
     * Gather codebase context for prompt enhancement
     *
     * Chain of Thought:
     * - Analyze workspace structure (languages, frameworks, directories)
     * - Load ÆtherLight SOPs from .vscode/aetherlight.md
     * - Load project instructions from CLAUDE.md
     * - Detect existing patterns in codebase
     * - Find sprint files for context
     */
    private async gatherContext(userIntent: string): Promise<EnhancementContext> {
        const context: EnhancementContext = {
            userIntent,
            workspaceStructure: {
                rootPath: this.workspaceRoot,
                mainLanguages: [],
                frameworks: [],
                keyDirectories: [],
                keyFiles: []
            },
            aetherlightSOPs: null,
            projectInstructions: null,
            existingPatterns: [],
            existingSprints: []
        };

        if (!this.workspaceRoot) {
            return context;
        }

        // Analyze workspace structure
        try {
            context.workspaceStructure = await this.analyzeWorkspaceStructure();
        } catch (error) {
            console.warn('[ÆtherLight] Failed to analyze workspace structure:', error);
        }

        // Load ÆtherLight SOPs
        try {
            context.aetherlightSOPs = await this.loadAetherlightSOPs();
        } catch (error) {
            console.warn('[ÆtherLight] Failed to load ÆtherLight SOPs:', error);
        }

        // Load project instructions
        try {
            context.projectInstructions = await this.loadProjectInstructions();
        } catch (error) {
            console.warn('[ÆtherLight] Failed to load project instructions:', error);
        }

        // Detect existing patterns
        try {
            context.existingPatterns = await this.detectExistingPatterns();
        } catch (error) {
            console.warn('[ÆtherLight] Failed to detect patterns:', error);
        }

        // Find sprint files
        try {
            context.existingSprints = await this.findSprintFiles();
        } catch (error) {
            console.warn('[ÆtherLight] Failed to find sprint files:', error);
        }

        return context;
    }

    /**
     * Analyze workspace structure to understand codebase
     */
    private async analyzeWorkspaceStructure(): Promise<EnhancementContext['workspaceStructure']> {
        const structure: EnhancementContext['workspaceStructure'] = {
            rootPath: this.workspaceRoot,
            mainLanguages: [],
            frameworks: [],
            keyDirectories: [],
            keyFiles: []
        };

        if (!this.workspaceRoot) {
            return structure;
        }

        // Detect languages from file extensions
        const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 100);
        const extensions = new Set<string>();
        files.forEach(file => {
            const ext = path.extname(file.fsPath).toLowerCase();
            if (ext) extensions.add(ext);
        });

        const languageMap: Record<string, string> = {
            '.ts': 'TypeScript',
            '.tsx': 'TypeScript/React',
            '.js': 'JavaScript',
            '.jsx': 'JavaScript/React',
            '.py': 'Python',
            '.rs': 'Rust',
            '.go': 'Go',
            '.java': 'Java',
            '.cpp': 'C++',
            '.c': 'C'
        };

        structure.mainLanguages = Array.from(extensions)
            .map(ext => languageMap[ext])
            .filter(Boolean);

        // Detect frameworks from package.json
        const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

                if (deps['react']) structure.frameworks.push('React');
                if (deps['vue']) structure.frameworks.push('Vue');
                if (deps['@angular/core']) structure.frameworks.push('Angular');
                if (deps['express']) structure.frameworks.push('Express');
                if (deps['next']) structure.frameworks.push('Next.js');
                if (deps['vscode']) structure.frameworks.push('VS Code Extension');
            } catch (error) {
                console.warn('[ÆtherLight] Failed to parse package.json:', error);
            }
        }

        // Detect key directories
        const commonDirs = ['src', 'lib', 'components', 'services', 'utils', 'tests', 'docs'];
        for (const dir of commonDirs) {
            const dirPath = path.join(this.workspaceRoot, dir);
            if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
                structure.keyDirectories.push(dir);
            }
        }

        // Detect key files
        const commonFiles = [
            'README.md', 'CLAUDE.md', 'package.json', 'tsconfig.json',
            'Cargo.toml', 'go.mod', 'requirements.txt', '.gitignore'
        ];
        for (const file of commonFiles) {
            const filePath = path.join(this.workspaceRoot, file);
            if (fs.existsSync(filePath)) {
                structure.keyFiles.push(file);
            }
        }

        return structure;
    }

    /**
     * Load ÆtherLight SOPs from .vscode/aetherlight.md
     */
    private async loadAetherlightSOPs(): Promise<string | null> {
        if (!this.workspaceRoot) return null;

        const aetherlightMdPath = path.join(this.workspaceRoot, '.vscode', 'aetherlight.md');
        if (!fs.existsSync(aetherlightMdPath)) {
            return null;
        }

        try {
            return fs.readFileSync(aetherlightMdPath, 'utf8');
        } catch (error) {
            console.warn('[ÆtherLight] Failed to read aetherlight.md:', error);
            return null;
        }
    }

    /**
     * Load project instructions from CLAUDE.md
     */
    private async loadProjectInstructions(): Promise<string | null> {
        if (!this.workspaceRoot) return null;

        const claudeMdPath = path.join(this.workspaceRoot, 'CLAUDE.md');
        if (!fs.existsSync(claudeMdPath)) {
            return null;
        }

        try {
            return fs.readFileSync(claudeMdPath, 'utf8');
        } catch (error) {
            console.warn('[ÆtherLight] Failed to read CLAUDE.md:', error);
            return null;
        }
    }

    /**
     * Detect existing patterns in codebase
     *
     * Chain of Thought:
     * - Search for "Pattern-" references in code comments
     * - Extract unique pattern names
     * - Return list of patterns used in codebase
     */
    private async detectExistingPatterns(): Promise<string[]> {
        if (!this.workspaceRoot) return [];

        const patterns = new Set<string>();

        // Search for Pattern- references in code
        const files = await vscode.workspace.findFiles(
            '**/*.{ts,js,tsx,jsx,py,rs,go}',
            '**/node_modules/**',
            500
        );

        for (const file of files) {
            try {
                const content = fs.readFileSync(file.fsPath, 'utf8');
                const matches = content.matchAll(/Pattern-([A-Z0-9-]+)/g);
                for (const match of matches) {
                    patterns.add(`Pattern-${match[1]}`);
                }
            } catch (error) {
                // Skip files that can't be read
            }
        }

        return Array.from(patterns).sort();
    }

    /**
     * Find sprint TOML files
     */
    private async findSprintFiles(): Promise<string[]> {
        if (!this.workspaceRoot) return [];

        const sprintsDir = path.join(this.workspaceRoot, 'sprints');
        if (!fs.existsSync(sprintsDir)) {
            return [];
        }

        try {
            const files = fs.readdirSync(sprintsDir);
            return files
                .filter(f => f.endsWith('.toml'))
                .map(f => path.basename(f, '.toml'));
        } catch (error) {
            console.warn('[ÆtherLight] Failed to read sprints directory:', error);
            return [];
        }
    }

    /**
     * Generate Code Analyzer prompt with enhanced context
     */
    private async generateCodeAnalyzerPrompt(context: EnhancementContext): Promise<string> {
        const sections: string[] = [];

        // Header
        sections.push(`# Code Analysis Request\n`);

        // User intent
        sections.push(`## Intent\n${context.userIntent}\n`);

        // Codebase context
        sections.push(`## Codebase Context`);
        if (context.workspaceStructure.mainLanguages.length > 0) {
            sections.push(`**Languages**: ${context.workspaceStructure.mainLanguages.join(', ')}`);
        }
        if (context.workspaceStructure.frameworks.length > 0) {
            sections.push(`**Frameworks**: ${context.workspaceStructure.frameworks.join(', ')}`);
        }
        if (context.workspaceStructure.keyDirectories.length > 0) {
            sections.push(`**Key Directories**: ${context.workspaceStructure.keyDirectories.join(', ')}`);
        }
        sections.push('');

        // Existing patterns
        if (context.existingPatterns.length > 0) {
            sections.push(`## Existing Patterns`);
            sections.push(`This codebase uses ${context.existingPatterns.length} ÆtherLight patterns:`);
            context.existingPatterns.slice(0, 10).forEach(pattern => {
                sections.push(`- ${pattern}`);
            });
            if (context.existingPatterns.length > 10) {
                sections.push(`- ... and ${context.existingPatterns.length - 10} more`);
            }
            sections.push('');
        }

        // SOPs reminder
        if (context.aetherlightSOPs) {
            sections.push(`## Standard Operating Procedures`);
            sections.push(`Follow ÆtherLight SOPs from .vscode/aetherlight.md`);
            sections.push('');
        }

        if (context.projectInstructions) {
            sections.push(`## Project Instructions`);
            sections.push(`Follow project-specific instructions from CLAUDE.md`);
            sections.push('');
        }

        // Analysis approach
        sections.push(`## Analysis Approach`);
        sections.push(`1. Scan relevant files in ${context.workspaceStructure.keyDirectories.join(', ')}`);
        sections.push(`2. Identify code that matches the intent`);
        sections.push(`3. Apply ÆtherLight patterns where applicable`);
        sections.push(`4. Generate Chain of Thought comments explaining findings`);
        sections.push('');

        // Success criteria
        sections.push(`## Success Criteria`);
        sections.push(`✅ Complete analysis addressing user's intent`);
        sections.push(`✅ Findings backed by specific file/line references`);
        sections.push(`✅ Recommendations follow project patterns and SOPs`);
        sections.push(`✅ Output is actionable and clearly structured`);

        return sections.join('\n');
    }

    /**
     * Generate Sprint Planner prompt with enhanced context
     */
    private async generateSprintPlannerPrompt(context: EnhancementContext): Promise<string> {
        const sections: string[] = [];

        // Header
        sections.push(`# Sprint Planning Request\n`);

        // User intent
        sections.push(`## Goal\n${context.userIntent}\n`);

        // Codebase context
        sections.push(`## Codebase Context`);
        if (context.workspaceStructure.mainLanguages.length > 0) {
            sections.push(`**Languages**: ${context.workspaceStructure.mainLanguages.join(', ')}`);
        }
        if (context.workspaceStructure.frameworks.length > 0) {
            sections.push(`**Frameworks**: ${context.workspaceStructure.frameworks.join(', ')}`);
        }
        if (context.workspaceStructure.keyDirectories.length > 0) {
            sections.push(`**Key Directories**: ${context.workspaceStructure.keyDirectories.join(', ')}`);
        }
        sections.push('');

        // Existing sprints
        if (context.existingSprints.length > 0) {
            sections.push(`## Existing Sprints`);
            sections.push(`Found ${context.existingSprints.length} existing sprint(s):`);
            context.existingSprints.forEach(sprint => {
                sections.push(`- ${sprint}`);
            });
            sections.push('');
        }

        // Existing patterns
        if (context.existingPatterns.length > 0) {
            sections.push(`## Existing Patterns`);
            sections.push(`Follow these established patterns:`);
            context.existingPatterns.slice(0, 10).forEach(pattern => {
                sections.push(`- ${pattern}`);
            });
            if (context.existingPatterns.length > 10) {
                sections.push(`- ... and ${context.existingPatterns.length - 10} more`);
            }
            sections.push('');
        }

        // Sprint structure
        sections.push(`## Sprint Structure`);
        sections.push(`Generate a TOML sprint file with:`);
        sections.push(`- Clear phases breaking down the work`);
        sections.push(`- Specific tasks with IDs, descriptions, files to modify`);
        sections.push(`- Estimated time for each task`);
        sections.push(`- Success criteria and validation steps`);
        sections.push(`- Chain of Thought reasoning for approach`);
        sections.push('');

        // SOPs reminder
        if (context.aetherlightSOPs) {
            sections.push(`## Standard Operating Procedures`);
            sections.push(`Follow ÆtherLight SOPs from .vscode/aetherlight.md`);
            sections.push('');
        }

        if (context.projectInstructions) {
            sections.push(`## Project Instructions`);
            sections.push(`Follow project-specific instructions from CLAUDE.md`);
            sections.push('');
        }

        // Success criteria
        sections.push(`## Success Criteria`);
        sections.push(`✅ Sprint plan addresses user's goal comprehensively`);
        sections.push(`✅ Tasks are specific and actionable`);
        sections.push(`✅ Follows ÆtherLight TOML format`);
        sections.push(`✅ Includes time estimates and validation steps`);
        sections.push(`✅ Aligns with project patterns and SOPs`);

        return sections.join('\n');
    }

    /**
     * Calculate confidence based on available context
     */
    private calculateConfidence(
        context: EnhancementContext,
        warnings: string[]
    ): 'high' | 'medium' | 'low' {
        let score = 0;

        // Check context availability
        if (context.workspaceStructure.mainLanguages.length > 0) score++;
        if (context.workspaceStructure.frameworks.length > 0) score++;
        if (context.aetherlightSOPs) score++;
        if (context.projectInstructions) score++;
        if (context.existingPatterns.length > 0) score++;
        if (warnings.length === 0) score++;

        if (score >= 5) return 'high';
        if (score >= 3) return 'medium';
        return 'low';
    }
}
