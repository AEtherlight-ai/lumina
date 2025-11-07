import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as toml from '@iarna/toml';
import { TaskAnalyzer } from './TaskAnalyzer';

const execAsync = promisify(exec);

export interface ProjectState {
    gitDiff: string;
    completedTasks: Array<{id: string, name: string}>;
    modifiedFiles: string[];
    newFiles: string[];
    recentCommits: string[];
    testResults?: string;
}

/**
 * TaskPromptExporter
 *
 * Terminal-based service for exporting TOML tasks as AI-enhanced prompts.
 * Uses VS Code Terminal API to communicate with Claude Code (active session or launches new).
 *
 * Architecture: Option D (Hybrid Intelligence)
 * - Scenario 1: Find active aetherlight/clod terminal → send command → capture output
 * - Scenario 2: No terminal → launch new → aetherlight → clod → send command → capture
 *
 * No IPC, no webhooks, no files - pure terminal communication.
 */
export class TaskPromptExporter {
    private workspaceRoot: string;
    private sprintFilePath: string;
    private analyzer: TaskAnalyzer;

    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        this.sprintFilePath = path.join(this.workspaceRoot, 'internal', 'sprints', 'ACTIVE_SPRINT.toml');
        this.analyzer = new TaskAnalyzer(this.workspaceRoot);
    }

    /**
     * Main export function
     * Finds or launches Claude Code terminal, sends export command, captures AI-enhanced prompt
     */
    public async exportTask(taskId: string): Promise<string> {
        // Step 1: Find active terminal or launch new
        let terminal = await this.findAetherlightTerminal();

        if (!terminal) {
            terminal = await this.launchNewSession();
        }

        // Step 2: Send export command to Claude Code
        terminal.sendText(`export prompt for ${taskId}`);

        // Step 3: Capture output (AI-enhanced prompt)
        const enhancedPrompt = await this.captureTerminalOutput(terminal, 5000);

        return enhancedPrompt;
    }

    /**
     * Find active aetherlight or clod terminal
     * Scenario 1: Claude Code already running
     */
    public async findAetherlightTerminal(): Promise<vscode.Terminal | null> {
        const terminals = vscode.window.terminals;

        for (const terminal of terminals) {
            const name = terminal.name.toLowerCase();
            if (name.includes('aetherlight') || name.includes('clod')) {
                return terminal;
            }
        }

        return null;
    }

    /**
     * Launch new terminal session
     * Scenario 2: No active Claude Code session
     * Creates terminal → aetherlight → clod → waits for initialization
     */
    public async launchNewSession(): Promise<vscode.Terminal> {
        // Create new terminal
        const terminal = vscode.window.createTerminal('ÆtherLight Task Export');
        terminal.show();

        // Launch aetherlight
        terminal.sendText('aetherlight');

        // Wait for Windsurf/Cursor to launch
        await this.sleep(2000); // TODO: Replace with actual prompt detection

        // Start Claude Code
        terminal.sendText('clod');

        // Wait for Claude Code initialization
        await this.sleep(3000); // TODO: Replace with actual prompt detection

        return terminal;
    }

    /**
     * Capture terminal output until end marker
     * Reads terminal buffer until "--- END PROMPT ---" marker found
     *
     * NOTE: VS Code Terminal API doesn't expose buffer directly
     * This is a limitation - we need to use Terminal.onDidWriteData or alternative approach
     *
     * For now, implementing placeholder that will need enhancement
     */
    public async captureTerminalOutput(terminal: vscode.Terminal, timeoutMs: number): Promise<string> {
        // TODO: Implement actual terminal buffer reading
        // VS Code limitations:
        // - Terminal.onDidWriteData only available in extension context
        // - No direct buffer access
        //
        // Possible solutions:
        // 1. Use temporary file output redirection
        // 2. Use vscode.window.onDidWriteTerminalData event
        // 3. Implement custom terminal buffer tracking

        return new Promise((resolve, reject) => {
            let buffer = '';
            const startTime = Date.now();

            // Placeholder implementation
            // In real implementation, would listen to terminal output events
            const checkInterval = setInterval(() => {
                if (Date.now() - startTime > timeoutMs) {
                    clearInterval(checkInterval);
                    reject(new Error('Terminal output capture timeout'));
                }

                // Check if end marker found
                if (buffer.includes('--- END PROMPT ---')) {
                    clearInterval(checkInterval);
                    const promptText = buffer.split('--- END PROMPT ---')[0].trim();
                    resolve(promptText);
                }
            }, 100);
        });
    }

    /**
     * Analyze current project state
     * Called by Claude Code when generating AI-enhanced prompt
     * Returns temporal context (git diff, completed tasks, modified files, etc.)
     */
    public async analyzeProjectState(taskId: string): Promise<ProjectState> {
        const state: ProjectState = {
            gitDiff: '',
            completedTasks: [],
            modifiedFiles: [],
            newFiles: [],
            recentCommits: []
        };

        try {
            // Git diff since sprint start (or task creation date)
            const { stdout: gitDiff } = await execAsync('git diff HEAD~20..HEAD', {
                cwd: this.workspaceRoot
            });
            state.gitDiff = gitDiff;

            // Recent commits
            const { stdout: commits } = await execAsync('git log --oneline -20', {
                cwd: this.workspaceRoot
            });
            state.recentCommits = commits.split('\n').filter(c => c.trim());

            // Git status for modified/new files
            const { stdout: status } = await execAsync('git status --short', {
                cwd: this.workspaceRoot
            });
            const lines = status.split('\n');
            for (const line of lines) {
                if (line.startsWith(' M ')) {
                    state.modifiedFiles.push(line.substring(3).trim());
                } else if (line.startsWith('?? ')) {
                    state.newFiles.push(line.substring(3).trim());
                }
            }

            // Scan completed tasks from sprint TOML
            if (fs.existsSync(this.sprintFilePath)) {
                const tomlContent = fs.readFileSync(this.sprintFilePath, 'utf-8');
                const completedMatches = tomlContent.matchAll(/\[tasks\.([^\]]+)\][\s\S]*?status = "completed"/g);

                for (const match of completedMatches) {
                    const taskIdMatch = match[1];
                    // Extract task name (next line typically)
                    const nameMatch = match[0].match(/name = "([^"]+)"/);
                    state.completedTasks.push({
                        id: taskIdMatch,
                        name: nameMatch ? nameMatch[1] : taskIdMatch
                    });
                }
            }

        } catch (error) {
            console.error('Error analyzing project state:', error);
        }

        return state;
    }

    /**
     * Generate AI-enhanced prompt
     * This method would be called by Claude Code when it receives "export prompt for TASK-ID"
     * Combines TOML baseline with current project state analysis
     *
     * NOTE: This is what I (Claude Code) would execute when receiving the terminal command
     *
     * PROTECT-000A Integration: Uses TaskAnalyzer for gap detection before generating prompt
     */
    public async generateEnhancedPrompt(taskId: string): Promise<string> {
        // Read TOML task
        const task = await this.readTaskFromToml(taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found in sprint TOML`);
        }

        // PROTECT-000A: Analyze task for gaps using TaskAnalyzer
        const state = await this.analyzeProjectState(taskId);
        const completedTasksWithStatus = state.completedTasks.map(t => ({ ...t, status: 'completed' }));
        const analysisResult = await this.analyzer.analyzeTask(task, completedTasksWithStatus);

        // If gaps found, return questions instead of prompt
        if (analysisResult.status === 'needs_clarification') {
            return this.formatGapsAndQuestions(analysisResult, taskId);
        }

        // Calculate temporal drift
        const createdDate = new Date('2025-11-05'); // TODO: Extract from task or git
        const now = new Date();
        const daysElapsed = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

        // Generate enhanced prompt sections
        const prompt = `# 📋 AI-Enhanced Task Prompt for ${taskId}
**Generated:** ${now.toISOString().split('T')[0]}
**Task Created:** ${createdDate.toISOString().split('T')[0]} (${daysElapsed} days ago)

---

## ⚠️ Current Project State Analysis

### Changes Since Task Written
${daysElapsed === 0 ? '✅ **Task just created** - No temporal drift (written today)' : `⚠️ **${daysElapsed} days elapsed** - Analyzing changes...`}
${state.recentCommits.length > 0 ? `✅ **${state.recentCommits.length} recent commits**` : ''}
${state.modifiedFiles.length > 0 ? `⚠️ **${state.modifiedFiles.length} files modified**: ${state.modifiedFiles.slice(0, 3).join(', ')}` : ''}
${state.newFiles.length > 0 ? `📁 **${state.newFiles.length} new files**: ${state.newFiles.slice(0, 3).join(', ')}` : ''}
${state.completedTasks.length > 0 ? `✅ **${state.completedTasks.length} tasks completed**` : ''}

### Completed Tasks That Impact This One
${state.completedTasks.map(t => `✅ **${t.id}**: ${t.name}`).join('\n')}

---

## 📋 Task Metadata

${this.formatTaskMetadata(task)}

---

## 🎯 What to Do (Description)

${task.description || 'No description provided'}

---

## 🔍 Why This Matters (Rationale)

${task.why || 'No rationale provided'}

---

## 📚 Context (Background Knowledge)

${task.context || 'No context provided'}

---

## 🗺️ Step-by-Step Approach (Reasoning Chain)

${this.formatReasoningChain(task.reasoning_chain)}

---

## ✅ How to Verify Success (Validation Criteria)

${this.formatValidationCriteria(task.validation_criteria)}

---

## 📁 Files to Modify

${this.formatFilesList(task.files_to_modify)}

---

## 📦 Deliverables (Concrete Outputs)

${this.formatDeliverables(task.deliverables)}

---

## ⚡ Performance Target

${task.performance_target || 'No specific target'}

---

## 📋 Patterns to Follow

${this.formatPatterns(task.patterns)}

---

## 🧪 TDD Requirements

${this.formatTDDRequirements(task)}

---

## 🎯 Success Impact (What's Achieved)

${task.success_impact || 'No success impact specified'}

---

## 🔗 Related Tasks

${this.formatRelatedTasks(task.dependencies, state.completedTasks)}

---

--- END PROMPT ---`;

        return prompt;
    }

    // Helper methods for formatting sections
    private formatTaskMetadata(task: any): string {
        return `- **ID:** ${task.id}
- **Name:** ${task.name}
- **Phase:** ${task.phase}
- **Agent:** ${task.agent}
- **Status:** ${task.status}
- **Dependencies:** ${task.dependencies?.join(', ') || 'None'}
- **Estimated Time:** ${task.estimated_time || 'Not specified'}
- **Estimated Lines:** ${task.estimated_lines || 'Not specified'}`;
    }

    private formatReasoningChain(chain: string[] | undefined): string {
        if (!chain || chain.length === 0) return 'No reasoning chain provided';
        return chain.map((step, i) => `${i + 1}. ${step}`).join('\n');
    }

    private formatValidationCriteria(criteria: string[] | undefined): string {
        if (!criteria || criteria.length === 0) return 'No validation criteria provided';
        return criteria.map(c => `- [ ] ${c}`).join('\n');
    }

    private formatFilesList(files: string[] | undefined): string {
        if (!files || files.length === 0) return 'No files specified';
        return files.map(f => `- ${f}`).join('\n');
    }

    private formatDeliverables(deliverables: string[] | undefined): string {
        if (!deliverables || deliverables.length === 0) return 'No deliverables specified';
        return deliverables.map((d, i) => `${i + 1}. ${d}`).join('\n');
    }

    private formatPatterns(patterns: string[] | undefined): string {
        if (!patterns || patterns.length === 0) return 'No patterns specified';
        return patterns.map(p => `- **${p}**`).join('\n');
    }

    private formatTDDRequirements(task: any): string {
        const agent = task.agent || 'unknown';
        let coverage = '85%';
        if (agent === 'infrastructure-agent') coverage = '90%';
        if (agent === 'api-agent') coverage = '85%';
        if (agent === 'ui-agent') coverage = '70%';

        return `**TDD Workflow (RED-GREEN-REFACTOR):**
1. **RED Phase**: Write tests FIRST that fail (feature doesn't exist yet)
2. **GREEN Phase**: Implement minimum code to make tests pass
3. **REFACTOR Phase**: Optimize code while keeping tests passing

**Coverage Requirement:** ${coverage} (${agent})

**Test Files:** ${task.test_files?.join(', ') || 'Create test file in test/ directory'}`;
    }

    private formatRelatedTasks(dependencies: string[] | undefined, completedTasks: Array<{id: string, name: string}>): string {
        let output = '';
        if (dependencies && dependencies.length > 0) {
            output += '**Dependencies:**\n';
            dependencies.forEach(dep => {
                const completed = completedTasks.find(t => t.id === dep);
                if (completed) {
                    output += `- ✅ **${dep}** - ${completed.name} (COMPLETED)\n`;
                } else {
                    output += `- ⏳ **${dep}** (PENDING - BLOCKS THIS TASK)\n`;
                }
            });
        }
        return output || 'No dependencies';
    }

    private async readTaskFromToml(taskId: string): Promise<any | null> {
        try {
            // Read and parse TOML file (same approach as SprintLoader)
            const tomlContent = fs.readFileSync(this.sprintFilePath, 'utf-8');
            const data = toml.parse(tomlContent) as any;

            // Find task in TOML data
            if (!data.tasks || !data.tasks[taskId]) {
                throw new Error(`Task ${taskId} not found in sprint TOML`);
            }

            // Return task data
            return data.tasks[taskId];
        } catch (error) {
            console.error(`Error reading task ${taskId} from TOML:`, error);
            return null;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Format gaps and questions for user
     * PROTECT-000A: Returns formatted questions when gaps detected
     */
    private formatGapsAndQuestions(analysisResult: any, taskId: string): string {
        const gaps = analysisResult.gaps || [];
        const questions = analysisResult.questions || [];

        let output = `# ⚠️  Task Analysis - Gaps Detected for ${taskId}\n\n`;
        output += `**Status:** ${analysisResult.status}\n\n`;
        output += `---\n\n`;

        // Format gaps
        if (gaps.length > 0) {
            output += `## 🔍 Gaps Detected (${gaps.length})\n\n`;
            for (const gap of gaps) {
                const emoji = gap.severity === 'blocking' ? '🚫' : '⚠️';
                output += `### ${emoji} ${gap.type.replace(/_/g, ' ').toUpperCase()}\n\n`;
                output += `**Severity:** ${gap.severity}\n\n`;
                output += `**Issue:** ${gap.message}\n\n`;
                if (gap.suggestion) {
                    output += `**Suggestion:** ${gap.suggestion}\n\n`;
                }
                if (gap.relatedTo) {
                    output += `**Related to:** ${gap.relatedTo}\n\n`;
                }
                output += `---\n\n`;
            }
        }

        // Format questions
        if (questions.length > 0) {
            output += `## ❓ Questions to Resolve (${questions.length})\n\n`;
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                output += `### Question ${i + 1}: ${q.question}\n\n`;
                output += `**Type:** ${q.type}\n`;
                output += `**Required:** ${q.required ? 'Yes' : 'No'}\n\n`;
                if (q.choices && q.choices.length > 0) {
                    output += `**Choices:**\n`;
                    q.choices.forEach((choice: string) => {
                        output += `- ${choice}\n`;
                    });
                    output += `\n`;
                }
                if (q.helpText) {
                    output += `**Help:** ${q.helpText}\n\n`;
                }
                output += `---\n\n`;
            }
        }

        output += `\n## Next Steps\n\n`;
        output += `1. Address the gaps listed above\n`;
        output += `2. Answer the questions\n`;
        output += `3. Re-run task analysis after making changes\n`;
        output += `4. Once gaps resolved, prompt will generate automatically\n\n`;
        output += `--- END ANALYSIS ---`;

        return output;
    }
}
