/**
 * MultiFormatParser: Unified parser for code-analyze outputs (MD/TOML/JSON)
 *
 * DESIGN DECISION: Format-agnostic parsing with automatic format detection
 * WHY: code-analyze outputs multiple formats, downstream components need unified interface
 *
 * REASONING CHAIN:
 * 1. User runs /code-analyze → Generates PHASE_A.md (Markdown)
 * 2. OR user has existing ACTIVE_SPRINT.toml (TOML)
 * 3. OR CLI outputs JSON analysis
 * 4. MultiFormatParser detects format automatically (extension + content)
 * 5. Parses into unified AnalysisData interface
 * 6. Downstream components (transformer, orchestrator) work with AnalysisData
 * 7. Result: Middleware works with all code-analyze outputs
 *
 * RELATIONSHIP TO SprintLoader.ts:
 * - SprintLoader: UI component for Sprint Tab display (TOML only, one specific file)
 * - MultiFormatParser: Middleware component for code-analyze processing (MD/TOML/JSON, any file)
 * - Both parse TOML but serve different purposes (UI vs middleware pipeline)
 * - Kept separate: SprintLoader has UI-specific features (auto-promotion, engineers, FileSystemWatcher)
 * - Future refactoring: Could extract shared TOML parsing utility (not critical for v0.16)
 *
 * PATTERN: Pattern-PARSER-001 (Format-Agnostic Parsing)
 * PATTERN: Pattern-ERROR-HANDLING-001 (Graceful Error Recovery)
 * RELATED: ConfidenceScorer.ts, SkillOrchestrator.ts, SprintLoader.ts (UI counterpart)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as toml from '@iarna/toml';

/**
 * Unified analysis data structure (format-agnostic)
 *
 * All parsers convert to this interface
 */
export interface AnalysisData {
    source: 'markdown' | 'toml' | 'json';  // Original format
    filePath: string;  // Source file path
    tasks: Task[];
    patterns?: string[];  // Referenced patterns
    dependencies?: Dependency[];
    risks?: Risk[];
    metadata?: Metadata;
}

export interface Task {
    id: string;
    name: string;
    description: string;
    phase?: string;
    status?: 'pending' | 'in_progress' | 'completed';
    estimated_time?: string;
    estimated_lines?: number;
    agent?: string;
    assigned_engineer?: string;
    dependencies?: string[];
    patterns?: string[];
    deliverables?: string[];
    validation_criteria?: string[];

    // Chain of Thought fields (ENORM-010)
    why?: string;
    context?: string;
    reasoning_chain?: string[];
    success_impact?: string;
    error_handling?: string[];
}

export interface Dependency {
    from: string;  // Task ID
    to: string;    // Task ID
    type: 'blocks' | 'requires' | 'relates_to';
}

export interface Risk {
    id: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    mitigation?: string;
}

export interface Metadata {
    sprint_name?: string;
    version?: string;
    created?: string;
    updated?: string;
    status?: string;
    total_tasks?: number;
    estimated_weeks?: string;
    priority?: string;
}

/**
 * Parse result (success or error)
 */
export type ParseResult =
    | { success: true; data: AnalysisData }
    | { success: false; error: string; filePath: string };

/**
 * Multi-format parser for code-analyze outputs
 */
export class MultiFormatParser {
    /**
     * Parse file with automatic format detection
     *
     * @param filePath - Path to file (MD/TOML/JSON)
     * @returns ParseResult (success with data, or error)
     *
     * DESIGN DECISION: Auto-detect format from extension + content
     * WHY: Caller doesn't need to know format, parser handles it
     */
    public async parseFile(filePath: string): Promise<ParseResult> {
        try {
            // Validate file exists
            if (!fs.existsSync(filePath)) {
                return {
                    success: false,
                    error: `File not found: ${filePath}`,
                    filePath
                };
            }

            // Read file content
            const content = fs.readFileSync(filePath, 'utf-8');

            // Detect format
            const format = this.detectFormat(filePath, content);

            // Parse based on format
            switch (format) {
                case 'markdown':
                    return await this.parseMarkdown(filePath, content);
                case 'toml':
                    return await this.parseToml(filePath, content);
                case 'json':
                    return await this.parseJson(filePath, content);
                default:
                    return {
                        success: false,
                        error: `Unsupported format for file: ${filePath}`,
                        filePath
                    };
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `Parse error: ${errorMsg}`,
                filePath
            };
        }
    }

    /**
     * Detect file format from extension and content
     *
     * DESIGN DECISION: Extension first, content inspection fallback
     * WHY: Extension is fast, content inspection catches edge cases
     */
    private detectFormat(filePath: string, content: string): 'markdown' | 'toml' | 'json' | 'unknown' {
        const ext = path.extname(filePath).toLowerCase();

        // Check extension
        if (ext === '.md' || ext === '.markdown') {
            return 'markdown';
        }
        if (ext === '.toml') {
            return 'toml';
        }
        if (ext === '.json') {
            return 'json';
        }

        // Content inspection fallback
        const trimmed = content.trim();

        // JSON: Starts with { or [
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            return 'json';
        }

        // TOML: Contains [section] or key = value
        if (/^\[[\w.]+\]/.test(trimmed) || /^\w+\s*=\s*.+/.test(trimmed)) {
            return 'toml';
        }

        // Markdown: Contains headers (# ## ###)
        if (/^#{1,6}\s+.+/m.test(trimmed)) {
            return 'markdown';
        }

        return 'unknown';
    }

    /**
     * Parse Markdown analysis file (PHASE_A.md format)
     *
     * DESIGN DECISION: Regex-based section extraction
     * WHY: Markdown structure is predictable (headers, task blocks)
     *
     * EXAMPLE INPUT:
     * ```markdown
     * # Phase A: Authentication
     *
     * ## Task A-001: Implement JWT
     * **Description:** Create JWT token system
     * **Estimated Time:** 3-4 hours
     * ```
     */
    private async parseMarkdown(filePath: string, content: string): Promise<ParseResult> {
        try {
            const tasks: Task[] = [];
            const patterns = new Set<string>();

            // Extract phase name from first H1 header
            const phaseMatch = content.match(/^#\s+(.+)$/m);
            const phaseName = phaseMatch ? phaseMatch[1].trim() : 'Unknown Phase';

            // Extract tasks (H2 or H3 headers starting with "Task")
            const taskRegex = /^###?\s+Task\s+([A-Z0-9-]+):\s+(.+)$/gm;
            let match;

            while ((match = taskRegex.exec(content)) !== null) {
                const taskId = match[1];
                const taskName = match[2];

                // Find task block (from this header to next header or EOF)
                const taskStart = match.index;
                const nextHeader = content.indexOf('\n#', taskStart + 1);
                const taskEnd = nextHeader === -1 ? content.length : nextHeader;
                const taskBlock = content.substring(taskStart, taskEnd);

                // Extract task fields
                const task = this.parseMarkdownTask(taskId, taskName, taskBlock, phaseName);
                tasks.push(task);

                // Collect patterns
                if (task.patterns) {
                    task.patterns.forEach(p => patterns.add(p));
                }
            }

            return {
                success: true,
                data: {
                    source: 'markdown',
                    filePath,
                    tasks,
                    patterns: Array.from(patterns),
                    metadata: {
                        sprint_name: phaseName,
                        total_tasks: tasks.length
                    }
                }
            };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `Markdown parse error: ${errorMsg}`,
                filePath
            };
        }
    }

    /**
     * Parse individual Markdown task block
     */
    private parseMarkdownTask(id: string, name: string, block: string, phase: string): Task {
        const task: Task = { id, name, description: '', phase };

        // Extract description (first paragraph after header)
        const descMatch = block.match(/^###?[^\n]+\n+([^\n]+)/);
        if (descMatch) {
            task.description = descMatch[1].trim();
        }

        // Extract fields (bold markers)
        const extractField = (fieldName: string): string | undefined => {
            const regex = new RegExp(`\\*\\*${fieldName}:\\*\\*\\s*(.+)`, 'i');
            const match = block.match(regex);
            return match ? match[1].trim() : undefined;
        };

        task.estimated_time = extractField('Estimated Time') || extractField('Time');
        task.agent = extractField('Agent');

        // Extract patterns
        const patternsMatch = block.match(/\*\*Patterns?:\*\*\s*(.+)/i);
        if (patternsMatch) {
            task.patterns = patternsMatch[1]
                .split(',')
                .map(p => p.trim())
                .filter(p => p.length > 0);
        }

        // Extract deliverables (bulleted list)
        const deliverablesMatch = block.match(/\*\*Deliverables?:\*\*\s*\n((?:[-*]\s+.+\n?)+)/i);
        if (deliverablesMatch) {
            task.deliverables = deliverablesMatch[1]
                .split('\n')
                .map(line => line.replace(/^[-*]\s+/, '').trim())
                .filter(line => line.length > 0);
        }

        return task;
    }

    /**
     * Parse TOML sprint file (ACTIVE_SPRINT.toml format)
     *
     * DESIGN DECISION: Use @iarna/toml for parsing
     * WHY: Reliable TOML parser, handles arrays correctly
     */
    private async parseToml(filePath: string, content: string): Promise<ParseResult> {
        try {
            const data = toml.parse(content) as any;
            const tasks: Task[] = [];
            const patterns = new Set<string>();

            // Extract metadata
            const metadata: Metadata = {
                sprint_name: data.meta?.sprint_name,
                version: data.meta?.version,
                created: data.meta?.created,
                updated: data.meta?.updated,
                status: data.meta?.status,
                total_tasks: data.meta?.total_tasks,
                estimated_weeks: data.meta?.estimated_weeks,
                priority: data.meta?.priority
            };

            // Extract tasks from [tasks.*] sections
            if (data.tasks) {
                for (const [taskKey, taskData] of Object.entries(data.tasks)) {
                    const task = taskData as any;

                    tasks.push({
                        id: task.id || taskKey,
                        name: task.name || 'Unnamed Task',
                        description: task.description || '',
                        phase: task.phase,
                        status: task.status || 'pending',
                        estimated_time: task.estimated_time,
                        estimated_lines: task.estimated_lines,
                        agent: task.agent,
                        assigned_engineer: task.assigned_engineer,
                        dependencies: task.dependencies,
                        patterns: task.patterns,
                        deliverables: task.deliverables,
                        validation_criteria: task.validation_criteria,
                        why: task.why,
                        context: task.context,
                        reasoning_chain: task.reasoning_chain,
                        success_impact: task.success_impact,
                        error_handling: task.error_handling
                    });

                    // Collect patterns
                    if (task.patterns) {
                        task.patterns.forEach((p: string) => patterns.add(p));
                    }
                }
            }

            return {
                success: true,
                data: {
                    source: 'toml',
                    filePath,
                    tasks,
                    patterns: Array.from(patterns),
                    metadata
                }
            };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `TOML parse error: ${errorMsg}`,
                filePath
            };
        }
    }

    /**
     * Parse JSON analysis file (custom format)
     *
     * DESIGN DECISION: Flexible structure validation
     * WHY: JSON output format may vary, validate required fields only
     */
    private async parseJson(filePath: string, content: string): Promise<ParseResult> {
        try {
            const data = JSON.parse(content);

            // Validate required structure
            if (!data.tasks || !Array.isArray(data.tasks)) {
                return {
                    success: false,
                    error: 'Invalid JSON: missing tasks array',
                    filePath
                };
            }

            const patterns = new Set<string>();

            // Map tasks
            const tasks: Task[] = data.tasks.map((t: any) => {
                // Collect patterns
                if (t.patterns) {
                    t.patterns.forEach((p: string) => patterns.add(p));
                }

                return {
                    id: t.id || 'UNKNOWN',
                    name: t.name || 'Unnamed Task',
                    description: t.description || '',
                    phase: t.phase,
                    status: t.status || 'pending',
                    estimated_time: t.estimated_time,
                    estimated_lines: t.estimated_lines,
                    agent: t.agent,
                    assigned_engineer: t.assigned_engineer,
                    dependencies: t.dependencies,
                    patterns: t.patterns,
                    deliverables: t.deliverables,
                    validation_criteria: t.validation_criteria,
                    why: t.why,
                    context: t.context,
                    reasoning_chain: t.reasoning_chain,
                    success_impact: t.success_impact,
                    error_handling: t.error_handling
                };
            });

            return {
                success: true,
                data: {
                    source: 'json',
                    filePath,
                    tasks,
                    patterns: Array.from(patterns),
                    metadata: data.metadata
                }
            };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `JSON parse error: ${errorMsg}`,
                filePath
            };
        }
    }
}
