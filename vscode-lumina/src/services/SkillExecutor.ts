/**
 * SkillExecutor Service
 *
 * Bridges the gap between skill definitions in .claude/skills/ and VS Code execution.
 * This service reads skill markdown files and executes their defined workflows.
 *
 * Chain of Thought:
 * 1. Skills are defined as markdown in .claude/skills/[skill-name]/SKILL.md
 * 2. Claude Code can read and understand them
 * 3. This service makes them executable in VS Code
 * 4. Each skill becomes a command that users can invoke
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface SkillMetadata {
    name: string;
    description: string;
    path: string;
}

export class SkillExecutor {
    private skills: Map<string, SkillMetadata> = new Map();
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('ÆtherLight Skills');
    }

    /**
     * Discovers and loads all skills from .claude/skills/ directory
     */
    public async discoverSkills(): Promise<void> {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            return;
        }

        const skillsDir = path.join(workspaceRoot, '.claude', 'skills');

        if (!fs.existsSync(skillsDir)) {
            // No skills directory yet - that's OK, initialize skill will create it
            return;
        }

        try {
            const skillFolders = fs.readdirSync(skillsDir);

            for (const folder of skillFolders) {
                const skillPath = path.join(skillsDir, folder, 'SKILL.md');
                if (fs.existsSync(skillPath)) {
                    const content = fs.readFileSync(skillPath, 'utf-8');
                    const metadata = this.parseSkillMetadata(content);
                    if (metadata) {
                        this.skills.set(metadata.name, {
                            ...metadata,
                            path: skillPath
                        });
                    }
                }
            }

            this.outputChannel.appendLine(`Discovered ${this.skills.size} skills`);
        } catch (error) {
            this.outputChannel.appendLine(`Error discovering skills: ${error}`);
        }
    }

    /**
     * Parses skill metadata from markdown frontmatter
     */
    private parseSkillMetadata(content: string): SkillMetadata | null {
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!frontmatterMatch) {
            return null;
        }

        const frontmatter = frontmatterMatch[1];
        const nameMatch = frontmatter.match(/name:\s*(.+)/);
        const descMatch = frontmatter.match(/description:\s*(.+)/);

        if (nameMatch && descMatch) {
            return {
                name: nameMatch[1].trim(),
                description: descMatch[1].trim(),
                path: ''
            };
        }

        return null;
    }

    /**
     * Gets skill prompt template for user customization
     */
    public getSkillPrompt(skillName: string): string {
        switch (skillName) {
            case 'initialize':
                return `/initialize

Please set up ÆtherLight in this project with:
- [Describe your project type and requirements]
- [Any specific configurations needed]`;

            case 'sprint-plan':
                return `/sprint-plan

Create a sprint for:
- Sprint name: [e.g., "Authentication Feature"]
- Duration: [e.g., "2 weeks"]
- Main goals: [List your sprint objectives]
- Team size: [e.g., "solo" or "3 developers"]`;

            case 'code-analyze':
                return `/code-analyze

Analyze the codebase focusing on:
- [Specific areas of concern]
- [Type of analysis: security, performance, architecture]
- [Any known issues to investigate]`;

            case 'publish':
                return `/publish patch

Ready to release with:
- [Describe changes in this release]
- [Any special considerations]`;

            default:
                return `/${skillName}\n\n[Add your specific requirements here]`;
        }
    }

    /**
     * Executes a skill by name with optional user context
     */
    public async executeSkill(skillName: string, userContext?: string): Promise<void> {
        // Show output channel
        this.outputChannel.show(true);
        this.outputChannel.appendLine(`\n${'='.repeat(50)}`);
        this.outputChannel.appendLine(`Executing skill: ${skillName}`);
        if (userContext) {
            this.outputChannel.appendLine(`User context: ${userContext}`);
        }
        this.outputChannel.appendLine(`${'='.repeat(50)}\n`);

        try {
            // If we have user context, we should pass it to Claude Code
            // For now, execute the skill with available context
            switch (skillName) {
                case 'initialize':
                    await this.executeInitialize(userContext);
                    break;
                case 'sprint-plan':
                    await this.executeSprintPlan(userContext);
                    break;
                case 'code-analyze':
                    await this.executeCodeAnalyze(userContext);
                    break;
                case 'publish':
                    await this.executePublish(userContext);
                    break;
                default:
                    vscode.window.showErrorMessage(`Unknown skill: ${skillName}`);
            }
        } catch (error) {
            this.outputChannel.appendLine(`Error: ${error}`);
            vscode.window.showErrorMessage(`Skill execution failed: ${error}`);
        }
    }

    /**
     * Initialize skill - Sets up ÆtherLight in the project
     */
    private async executeInitialize(userContext?: string): Promise<void> {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            throw new Error('No workspace folder open');
        }

        vscode.window.showInformationMessage('🚀 Initializing ÆtherLight project structure...');

        // Step 1: Check for existing CLAUDE.md
        const claudePath = path.join(workspaceRoot, '.claude', 'CLAUDE.md');
        const rootClaudePath = path.join(workspaceRoot, 'CLAUDE.md');

        if (fs.existsSync(claudePath) || fs.existsSync(rootClaudePath)) {
            const choice = await vscode.window.showWarningMessage(
                'Existing CLAUDE.md found. Enhance with ÆtherLight features?',
                'Yes, Enhance', 'No, Cancel'
            );
            if (choice !== 'Yes, Enhance') {
                return;
            }

            // Backup existing file
            const existingPath = fs.existsSync(claudePath) ? claudePath : rootClaudePath;
            const backupPath = `${existingPath}.backup.${Date.now()}`;
            fs.copyFileSync(existingPath, backupPath);
            this.outputChannel.appendLine(`Backed up existing CLAUDE.md to ${backupPath}`);
        }

        // Step 2: Create directory structure
        const dirs = [
            '.claude/skills',
            '.claude/commands',
            '.aetherlight/patterns/auth',
            '.aetherlight/patterns/database',
            '.aetherlight/patterns/api',
            '.aetherlight/patterns/ui',
            'sprints',
            'docs/patterns',
            'docs/architecture',
            'analysis',
            'tasks'
        ];

        for (const dir of dirs) {
            const dirPath = path.join(workspaceRoot, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                this.outputChannel.appendLine(`Created: ${dir}`);
            }
        }

        // Step 3: Create CLAUDE.md
        const claudeContent = await this.generateClaudeMd(workspaceRoot);
        fs.mkdirSync(path.dirname(claudePath), { recursive: true });
        fs.writeFileSync(claudePath, claudeContent);
        this.outputChannel.appendLine('Created: .claude/CLAUDE.md');

        // Step 4: Create settings files
        const settings = {
            version: '1.0.0',
            workflow: {
                requirePR: true,
                protectedBranch: 'master',
                requireReview: true,
                semanticCommits: true
            }
        };
        fs.writeFileSync(
            path.join(workspaceRoot, '.claude', 'settings.json'),
            JSON.stringify(settings, null, 2)
        );

        // Step 5: Create command files
        await this.createCommandFiles(workspaceRoot);

        // Step 6: Initialize Git if needed
        if (!fs.existsSync(path.join(workspaceRoot, '.git'))) {
            await execAsync('git init', { cwd: workspaceRoot });
            this.outputChannel.appendLine('Initialized Git repository');
        }

        vscode.window.showInformationMessage('✅ ÆtherLight initialization complete!');
    }

    /**
     * Sprint Planning skill - Creates sprint with Git branches
     */
    private async executeSprintPlan(userContext?: string): Promise<void> {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            throw new Error('No workspace folder open');
        }

        // Get sprint details from user
        const sprintName = await vscode.window.showInputBox({
            prompt: 'Sprint name',
            placeHolder: 'e.g., Sprint 1, Authentication Sprint'
        });

        if (!sprintName) {
            return;
        }

        const duration = await vscode.window.showQuickPick(
            ['1 week', '2 weeks', '3 weeks', '4 weeks'],
            { placeHolder: 'Select sprint duration' }
        );

        const branchStrategy = await vscode.window.showQuickPick(
            ['gitflow', 'github-flow', 'custom'],
            { placeHolder: 'Select branching strategy' }
        );

        vscode.window.showInformationMessage(`📋 Creating sprint: ${sprintName}`);

        // Create sprint TOML
        const sprintFile = path.join(
            workspaceRoot,
            'sprints',
            `SPRINT_${new Date().toISOString().split('T')[0]}.toml`
        );

        const sprintContent = `[sprint]
name = "${sprintName}"
duration = "${duration}"
start_date = "${new Date().toISOString().split('T')[0]}"
branch_strategy = "${branchStrategy}"

[[phases]]
id = 1
name = "Planning"
tasks = ["Define requirements", "Create design docs", "Set up environment"]

[[phases]]
id = 2
name = "Implementation"
tasks = ["Core features", "Tests", "Documentation"]

[[phases]]
id = 3
name = "Review"
tasks = ["Code review", "Testing", "Deployment prep"]
`;

        fs.mkdirSync(path.dirname(sprintFile), { recursive: true });
        fs.writeFileSync(sprintFile, sprintContent);
        this.outputChannel.appendLine(`Created sprint file: ${sprintFile}`);

        // Create Git branches
        const epicName = sprintName.toLowerCase().replace(/\s+/g, '-');
        try {
            await execAsync(`git checkout -b feature/${epicName}`, { cwd: workspaceRoot });
            this.outputChannel.appendLine(`Created branch: feature/${epicName}`);
        } catch (error) {
            this.outputChannel.appendLine(`Branch creation: ${error}`);
        }

        vscode.window.showInformationMessage(`✅ Sprint "${sprintName}" created!`);
    }

    /**
     * Code Analysis skill - Analyzes codebase
     */
    private async executeCodeAnalyze(userContext?: string): Promise<void> {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            throw new Error('No workspace folder open');
        }

        vscode.window.showInformationMessage('🔍 Analyzing codebase...');

        const analysisDate = new Date().toISOString().split('T')[0];
        const analysisFile = path.join(
            workspaceRoot,
            'analysis',
            `ANALYSIS_${analysisDate}.md`
        );

        // Run basic analysis
        const analysis = [];
        analysis.push('# Code Analysis Report\n');
        analysis.push(`Date: ${analysisDate}\n\n`);

        // Count files
        try {
            const { stdout: fileCount } = await execAsync(
                'find . -type f -name "*.ts" -o -name "*.js" | wc -l',
                { cwd: workspaceRoot }
            );
            analysis.push(`## Statistics\n`);
            analysis.push(`- Source files: ${fileCount.trim()}\n`);
        } catch (error) {
            // Windows fallback
            analysis.push(`## Statistics\n`);
            analysis.push(`- Analysis platform: Windows\n`);
        }

        // Check for TODOs
        analysis.push(`\n## Technical Debt\n`);
        try {
            const { stdout: todos } = await execAsync(
                'grep -r "TODO\\|FIXME" --include="*.ts" --include="*.js" | head -10',
                { cwd: workspaceRoot }
            );
            if (todos) {
                analysis.push('### Found TODOs:\n```\n' + todos + '\n```\n');
            }
        } catch (error) {
            analysis.push('- Unable to scan for TODOs (Windows)\n');
        }

        // Write report
        fs.mkdirSync(path.dirname(analysisFile), { recursive: true });
        fs.writeFileSync(analysisFile, analysis.join(''));

        this.outputChannel.appendLine(`Analysis report: ${analysisFile}`);

        // Open the report
        const doc = await vscode.workspace.openTextDocument(analysisFile);
        await vscode.window.showTextDocument(doc);

        vscode.window.showInformationMessage('✅ Code analysis complete!');
    }

    /**
     * Publish skill - Runs the automated release pipeline
     */
    private async executePublish(userContext?: string): Promise<void> {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            throw new Error('No workspace folder open');
        }

        const releaseType = await vscode.window.showQuickPick(
            ['patch', 'minor', 'major'],
            { placeHolder: 'Select release type' }
        );

        if (!releaseType) {
            return;
        }

        vscode.window.showInformationMessage(`📦 Starting ${releaseType} release...`);

        // Run publish script
        const terminal = vscode.window.createTerminal('ÆtherLight Publish');
        terminal.show();
        terminal.sendText(`node scripts/publish-release.js ${releaseType}`);
    }

    /**
     * Generates CLAUDE.md content based on project analysis
     */
    private async generateClaudeMd(workspaceRoot: string): Promise<string> {
        const packageJsonPath = path.join(workspaceRoot, 'package.json');
        let projectType = 'General';
        let projectName = path.basename(workspaceRoot);

        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            projectName = packageJson.name || projectName;
            projectType = 'Node.js';

            // Detect frameworks
            if (packageJson.dependencies?.react) projectType = 'React';
            if (packageJson.dependencies?.vue) projectType = 'Vue';
            if (packageJson.dependencies?.['@angular/core']) projectType = 'Angular';
            if (packageJson.dependencies?.express) projectType = 'Express';
        }

        return `# Project Instructions for Claude - ÆtherLight Enhanced

## Project Overview
**Name**: ${projectName}
**Type**: ${projectType}
**Initialized**: ${new Date().toISOString()}

## ÆtherLight Integration
- Voice commands available via backtick (\`)
- Sprint management in \`/sprints/\` directory
- Pattern library in \`.aetherlight/patterns/\`
- Code analysis via \`/code-analyze\` command
- Automated workflows via skills

## Development Standards

### Git Workflow (Enforced)
1. All work in feature branches
2. PRs required for master
3. Semantic commit messages
4. Code review before merge
5. Protected code policy applies after release

### Code Standards
- TypeScript/JavaScript: ESLint + Prettier
- Tests required for new features
- Documentation for public APIs
- No console.log in production

### Available Commands
- \`/initialize\` - Set up project structure
- \`/sprint-plan\` - Create sprint with branches
- \`/code-analyze\` - Analyze codebase
- \`/publish\` - Automated release

### Code Protection Rules
- Released code is PROTECTED
- Refactor-only modifications allowed
- New features as extensions only

## Project-Specific Rules
_Add your project-specific guidelines here_

## Troubleshooting
- If voice commands don't work, check desktop app is running
- For sprint issues, ensure Git is initialized
- For publishing, ensure npm login is active
`;
    }

    /**
     * Creates command markdown files
     */
    private async createCommandFiles(workspaceRoot: string): Promise<void> {
        const commands = {
            'sprint-status.md': `---
name: sprint-status
description: Display current sprint progress
---

# Sprint Status Command

Shows the current sprint's tasks and their completion status.
`,
            'update-task.md': `---
name: update-task
description: Update task status in sprint
---

# Update Task Command

Modifies a task's status in the active sprint TOML file.
`,
            'view-patterns.md': `---
name: view-patterns
description: Browse pattern library
---

# View Patterns Command

Browse available code patterns and templates.
`
        };

        for (const [filename, content] of Object.entries(commands)) {
            const filePath = path.join(workspaceRoot, '.claude', 'commands', filename);
            fs.writeFileSync(filePath, content);
            this.outputChannel.appendLine(`Created command: ${filename}`);
        }
    }

    /**
     * Registers all skill commands with VS Code
     */
    public registerCommands(context: vscode.ExtensionContext): void {
        // Register generic skill executor
        context.subscriptions.push(
            vscode.commands.registerCommand('aetherlight.executeSkill', async (skillName: string) => {
                await this.executeSkill(skillName);
            })
        );

        // Register specific skill commands for better UX
        context.subscriptions.push(
            vscode.commands.registerCommand('aetherlight.initialize', async () => {
                await this.executeSkill('initialize');
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('aetherlight.sprintPlan', async () => {
                await this.executeSkill('sprint-plan');
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('aetherlight.codeAnalyze', async () => {
                await this.executeSkill('code-analyze');
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('aetherlight.publish', async () => {
                await this.executeSkill('publish');
            })
        );

        this.outputChannel.appendLine('Skill commands registered');
    }
}