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
import { SkillDetector } from './SkillDetector';

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
    private skillDetector: SkillDetector;

    constructor(context: vscode.ExtensionContext) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        this.workspaceRoot = workspaceFolder?.uri.fsPath || '';
        this.skillDetector = new SkillDetector();
    }

    /**
     * Enhance user's natural language intent into comprehensive prompt
     *
     * Chain of Thought:
     * - Parse user intent to extract goal, scope, constraints
     * - Detect appropriate skills from user intent
     * - Match relevant patterns from knowledge base
     * - Gather codebase context (structure, patterns, SOPs)
     * - Generate structured prompt with skill + patterns + context + approach
     * - Return prompt ready for user review
     */
    async enhancePrompt(
        userIntent: string,
        promptType: 'code-analyzer' | 'sprint-planner' | 'general' = 'general'
    ): Promise<EnhancedPrompt> {
        const warnings: string[] = [];

        // Validate input
        if (!userIntent.trim()) {
            throw new Error('User intent cannot be empty');
        }

        if (!this.workspaceRoot) {
            warnings.push('No workspace folder open - context will be limited');
        }

        // SMART ENHANCEMENT DECISION
        const complexity = this.assessComplexity(userIntent);

        // For simple, clear requests - minimal enhancement (saves tokens)
        if (complexity === 'simple') {
            return {
                prompt: userIntent, // Pass through as-is
                context: await this.gatherContext(userIntent),
                confidence: 'high',
                warnings: []
            };
        }

        // Step 1: Detect if a skill should be applied
        const skillMatch = this.skillDetector.detectSkill(userIntent);

        // Step 2: Gather context from workspace
        const context = await this.gatherContext(userIntent);

        // Step 3: Find relevant patterns from knowledge base
        const patterns = await this.findRelevantPatterns(userIntent, context);

        // Step 4: Generate prompt based on type and detected elements
        let prompt: string;

        // If user already provided a skill command, just add minimal context
        if (userIntent.startsWith('/')) {
            prompt = userIntent;
            if (patterns.length > 0) {
                prompt += '\n\nApplicable patterns: ' + patterns.join(', ');
            }
        }
        // If skill detected with high confidence, use skill-enhanced prompt
        else if (skillMatch && skillMatch.confidence > 0.7) {
            prompt = skillMatch.enhancedPrompt;

            // Add pattern references if found
            if (patterns.length > 0) {
                prompt += '\n\n## Relevant Patterns:\n';
                patterns.forEach(pattern => {
                    prompt += `- ${pattern}\n`;
                });
            }
        }
        // For medium complexity - use lighter structure
        else if (complexity === 'medium') {
            prompt = await this.generateMediumPrompt(userIntent, context, patterns);
        }
        // For complex requests - full structure (worth the tokens)
        else if (promptType === 'code-analyzer') {
            prompt = await this.generateCodeAnalyzerPrompt(context);
        } else if (promptType === 'sprint-planner') {
            prompt = await this.generateSprintPlannerPrompt(context);
        } else {
            // Full enhancement for complex tasks
            prompt = await this.generateGeneralPrompt(userIntent, context, patterns);
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

    /**
     * Find relevant patterns from knowledge base
     * Designed for Claude Code to understand and apply patterns effectively
     */
    private async findRelevantPatterns(userIntent: string, context: EnhancementContext): Promise<string[]> {
        const patterns: string[] = [];
        const intentLower = userIntent.toLowerCase();

        // Local pattern directory
        const localPatternsPath = path.join(this.workspaceRoot, '.aetherlight', 'patterns');

        // Pattern keywords mapped to pattern identifiers Claude can use
        const patternKeywords = {
            auth: ['login', 'auth', 'user', 'password', 'token', 'jwt', 'session'],
            database: ['database', 'db', 'sql', 'query', 'model', 'schema', 'migration'],
            api: ['api', 'endpoint', 'rest', 'graphql', 'route', 'controller'],
            ui: ['ui', 'component', 'view', 'frontend', 'react', 'vue', 'angular'],
            testing: ['test', 'spec', 'unit', 'integration', 'e2e', 'coverage'],
            performance: ['performance', 'optimize', 'speed', 'cache', 'lazy'],
            security: ['security', 'vulnerability', 'xss', 'csrf', 'injection']
        };

        // Match patterns based on keywords
        for (const [category, keywords] of Object.entries(patternKeywords)) {
            const hasMatch = keywords.some(keyword => intentLower.includes(keyword));
            if (hasMatch) {
                patterns.push(`Use Pattern-${category.toUpperCase()}-001 for ${category} implementation`);
            }
        }

        // Check for project-specific patterns in CLAUDE.md
        if (context.projectInstructions) {
            const patternMatches = context.projectInstructions.match(/Pattern-[A-Z]+-\d+/g);
            if (patternMatches) {
                patterns.push(...patternMatches.map(p => `Apply ${p} from project guidelines`));
            }
        }

        return [...new Set(patterns)];
    }

    /**
     * Generate Claude-optimized prompt
     * DESIGNED BY CLAUDE FOR CLAUDE - This is the format I need for perfect execution
     */
    private async generateGeneralPrompt(
        userIntent: string,
        context: EnhancementContext,
        patterns: string[]
    ): Promise<string> {
        // 1. CLEAR OBJECTIVE - What I need to know immediately
        let prompt = `# 🎯 CLEAR OBJECTIVE\n\n`;
        prompt += `${this.extractObjective(userIntent)}\n\n`;

        // 2. SPECIFIC CONTEXT - Concrete details I can act on
        prompt += `# 📍 SPECIFIC CONTEXT\n\n`;
        prompt += `- **Current Directory**: \`${context.workspaceStructure.rootPath}\`\n`;

        // Identify likely files to modify based on intent
        const filesToModify = this.identifyTargetFiles(userIntent, context);
        prompt += `- **Files to Modify**: ${filesToModify.length > 0 ? filesToModify.join(', ') : 'To be determined after analysis'}\n`;

        prompt += `- **Project Type**: ${context.workspaceStructure.frameworks.join(', ') || 'General'}\n`;
        prompt += `- **Existing Patterns**: ${context.existingPatterns.length} patterns available\n`;
        prompt += `- **Protected Code**: ${context.projectInstructions ? 'Yes - follow Code Protection Policy' : 'No special restrictions'}\n\n`;

        // 3. EXECUTION STEPS - Concrete actions I should take
        prompt += `# 📝 EXECUTION STEPS\n\n`;
        const steps = this.generateExecutionSteps(userIntent, context, patterns);
        steps.forEach((step, index) => {
            prompt += `${index + 1}. ${step}\n`;
        });
        prompt += '\n';

        // 4. SUCCESS VALIDATION - How we know it's done right
        prompt += `# ✅ SUCCESS VALIDATION\n\n`;
        const validations = this.generateValidationCriteria(userIntent);
        validations.forEach(validation => {
            prompt += `- [ ] ${validation}\n`;
        });
        prompt += '\n';

        // 5. AVAILABLE TOOLS - What I can use
        prompt += `# 🔧 AVAILABLE TOOLS\n\n`;

        // Check for applicable skills
        const skill = this.skillDetector.detectSkill(userIntent);
        if (skill) {
            prompt += `- **Recommended Skill**: \`${skill.skillName}\` (${Math.round(skill.confidence * 100)}% match)\n`;
        }

        if (patterns.length > 0) {
            prompt += `- **Patterns to Apply**:\n`;
            patterns.forEach(pattern => {
                prompt += `  - ${pattern}\n`;
            });
        }

        prompt += `- **Key Commands**:\n`;
        prompt += `  - Use TodoWrite for multi-step tasks\n`;
        prompt += `  - Read files before editing\n`;
        prompt += `  - Use Edit for existing files, Write only for new\n\n`;

        // 6. EDGE CASES - What to watch out for
        prompt += `# ⚠️ EDGE CASES & REMINDERS\n\n`;
        prompt += `- **If file doesn't exist**: Ask user before creating new files\n`;
        prompt += `- **If code is protected**: Only refactor, don't modify behavior\n`;
        prompt += `- **If tests fail**: Stop and inform user before proceeding\n`;
        prompt += `- **Remember**: Always use semantic commit messages\n`;
        prompt += `- **Don't forget**: Update CHANGELOG if making visible changes\n`;

        return prompt;
    }

    /**
     * Extract clear objective from user intent
     */
    private extractObjective(userIntent: string): string {
        // Remove filler words and get to the core ask
        const intent = userIntent.trim();

        // If it's already clear and short, use it
        if (intent.length < 100 && intent.split('\n').length === 1) {
            return intent;
        }

        // Otherwise, try to extract the key verb and object
        const lines = intent.split('\n');
        const firstLine = lines[0];

        // Common patterns: "I want to...", "Can you...", "Please..."
        const cleaned = firstLine
            .replace(/^(i want to|can you|please|could you|i need to|help me)\s+/i, '')
            .replace(/[.!?]+$/, '');

        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    /**
     * Identify likely target files based on intent
     */
    private identifyTargetFiles(userIntent: string, context: EnhancementContext): string[] {
        const files: string[] = [];
        const intentLower = userIntent.toLowerCase();

        // Common file references
        if (intentLower.includes('package.json')) files.push('package.json');
        if (intentLower.includes('readme')) files.push('README.md');
        if (intentLower.includes('config')) files.push('*config*.{json,js,ts}');
        if (intentLower.includes('test')) files.push('**/*.test.{ts,js}');
        if (intentLower.includes('extension')) files.push('src/extension.ts');

        return files;
    }

    /**
     * Generate concrete execution steps
     */
    private generateExecutionSteps(userIntent: string, context: EnhancementContext, patterns: string[]): string[] {
        const steps: string[] = [];
        const intentLower = userIntent.toLowerCase();

        // Always start with analysis for complex tasks
        if (!this.skillDetector.hasSkillCommand(userIntent)) {
            steps.push('Use TodoWrite to track progress for this multi-step task');
        }

        // Read before write
        if (intentLower.includes('add') || intentLower.includes('modify') || intentLower.includes('update')) {
            steps.push('Read existing files to understand current implementation');
        }

        // Skill-specific steps
        if (intentLower.includes('initialize') || intentLower.includes('set up')) {
            steps.push('Check for existing configuration files');
            steps.push('Run /initialize skill if ÆtherLight not configured');
        }

        // Implementation
        steps.push('Implement the requested changes following patterns');

        // Testing
        if (context.workspaceStructure.keyFiles.some(f => f.includes('test'))) {
            steps.push('Run existing tests to ensure no breakage');
        }

        // Git workflow
        steps.push('Commit changes with semantic message if modifications made');
        steps.push('Report completion status to user');

        return steps;
    }

    /**
     * Generate validation criteria
     */
    private generateValidationCriteria(userIntent: string): string[] {
        const criteria: string[] = [];
        const intentLower = userIntent.toLowerCase();

        // Universal criteria
        criteria.push('User\'s primary request completed');

        // Specific validations based on intent
        if (intentLower.includes('fix')) {
            criteria.push('Bug/issue resolved and tested');
        }
        if (intentLower.includes('add') || intentLower.includes('create')) {
            criteria.push('New functionality working as expected');
        }
        if (intentLower.includes('refactor')) {
            criteria.push('Code refactored without changing behavior');
            criteria.push('All tests still passing');
        }
        if (intentLower.includes('optimize') || intentLower.includes('performance')) {
            criteria.push('Performance improvement measurable');
        }

        // Always include
        criteria.push('No breaking changes introduced');
        criteria.push('Code follows project patterns and standards');

        return criteria;
    }

    /**
     * Assess complexity to determine enhancement level
     * SAVES TOKENS by only adding structure when needed
     */
    private assessComplexity(userIntent: string): 'simple' | 'medium' | 'complex' {
        const intent = userIntent.toLowerCase();
        const wordCount = userIntent.split(/\s+/).length;

        // Simple: Direct commands or very clear requests
        if (intent.startsWith('/')) return 'simple'; // Already a skill command
        if (wordCount < 10 && intent.match(/^(fix|add|remove|update|change) \w+ in [\w.]+$/)) {
            return 'simple'; // e.g., "fix typo in README.md"
        }

        // Complex: Multi-part requests or ambiguous intent
        if (wordCount > 50) return 'complex';
        if (intent.includes(' and ') || intent.includes(' also ') || intent.includes(' then ')) {
            return 'complex'; // Multiple requirements
        }
        if (intent.includes('refactor') || intent.includes('optimize') || intent.includes('architecture')) {
            return 'complex'; // Needs careful planning
        }

        // Default to medium
        return 'medium';
    }

    /**
     * Generate medium-weight prompt (balanced token usage)
     */
    private async generateMediumPrompt(
        userIntent: string,
        context: EnhancementContext,
        patterns: string[]
    ): Promise<string> {
        // Lighter structure - just the essentials
        let prompt = `## Request\n${userIntent}\n\n`;

        if (context.workspaceStructure.rootPath) {
            prompt += `## Context\n`;
            prompt += `- Directory: ${context.workspaceStructure.rootPath}\n`;
            prompt += `- Type: ${context.workspaceStructure.frameworks.join(', ') || 'General'}\n\n`;
        }

        if (patterns.length > 0) {
            prompt += `## Patterns\n`;
            prompt += patterns.join('\n') + '\n\n';
        }

        prompt += `## Guidelines\n`;
        prompt += `- Read files before editing\n`;
        prompt += `- Follow existing patterns\n`;
        prompt += `- Use semantic commits\n`;

        return prompt;
    }
}
