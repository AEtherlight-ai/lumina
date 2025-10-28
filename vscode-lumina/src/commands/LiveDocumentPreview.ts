import * as vscode from 'vscode';
import * as path from 'path';

/**
 * LiveDocumentPreview: Shows file being edited below terminals
 *
 * DESIGN DECISION: Context-aware file preview with auto-detection
 * WHY: Engineer needs to see WHAT is being changed (file) AND HOW (terminal output)
 * USER REQUIREMENT: Default enabled, toggle in Voice tab
 *
 * REASONING CHAIN:
 * 1. Agent/human selects terminal and sends prompt
 * 2. ÆtherLight detects which file will be edited (from prompt context or recent activity)
 * 3. Live preview panel shows that file with syntax highlighting
 * 4. When new prompt sent → preview updates to show next file
 * 5. Previous file closes, new file opens (keeps view clean)
 * 6. Terminal stays clean, file context always visible
 * 7. Result: Engineer sees WHAT is being changed AND HOW (terminal output)
 *
 * PATTERN: Pattern-UI-007 (Live Document Preview with Context Awareness)
 */

export interface PreviewConfig {
    enabled: boolean;
    defaultHeight: number;          // 0-100 percentage
    autoDetectFile: boolean;
    showDiffOnChange: boolean;
    transitionAnimation: boolean;
}

/**
 * LiveDocumentPreview: Manages file preview panel below terminals
 */
export class LiveDocumentPreview {
    private currentFile: vscode.Uri | null = null;
    private isEnabled: boolean = true;
    private readonly config: PreviewConfig;

    constructor(
        private readonly context: vscode.ExtensionContext
    ) {
        this.config = this.loadConfig();
        this.isEnabled = this.config.enabled;
    }

    /**
     * Load preview configuration from VS Code settings
     */
    private loadConfig(): PreviewConfig {
        const config = vscode.workspace.getConfiguration('aetherlight.preview');

        return {
            enabled: config.get<boolean>('enabled', true),
            defaultHeight: config.get<number>('defaultHeight', 40),
            autoDetectFile: config.get<boolean>('autoDetectFile', true),
            showDiffOnChange: config.get<boolean>('showDiffOnChange', true),
            transitionAnimation: config.get<boolean>('transitionAnimation', true)
        };
    }

    /**
     * Check if preview is currently enabled
     */
    public isPreviewEnabled(): boolean {
        return this.isEnabled;
    }

    /**
     * Toggle preview panel visibility
     */
    public async togglePreview(): Promise<boolean> {
        this.isEnabled = !this.isEnabled;

        // Update configuration
        await vscode.workspace.getConfiguration('aetherlight.preview')
            .update('enabled', this.isEnabled, vscode.ConfigurationTarget.Workspace);

        return this.isEnabled;
    }

    /**
     * Detect which file to preview from prompt context
     *
     * DESIGN DECISION: Multi-source file detection with priority order
     * WHY: Need to accurately guess which file will be edited from prompt
     */
    public async detectFileFromPrompt(
        prompt: string,
        terminal: vscode.Terminal
    ): Promise<vscode.Uri | null> {
        // 1. Explicit filename in prompt (highest priority)
        const explicitFile = this.extractFilenameFromPrompt(prompt);
        if (explicitFile) {
            const uri = await this.resolveFileUri(explicitFile);
            if (uri) return uri;
        }

        // 2. Active file in editor
        const activeFile = vscode.window.activeTextEditor?.document.uri;
        if (activeFile && !activeFile.scheme.startsWith('git')) {
            return activeFile;
        }

        // 3. Recently modified files in workspace
        const recentFiles = await this.getRecentlyModifiedFiles();
        if (recentFiles.length > 0) {
            return recentFiles[0];
        }

        // 4. Pattern matching context (infer from prompt semantics)
        const patternFile = await this.inferFileFromPatterns(prompt);
        if (patternFile) return patternFile;

        return null;
    }

    /**
     * Extract filename from prompt using regex patterns
     *
     * Examples:
     * - "update Button.tsx to add disabled prop" → Button.tsx
     * - "edit src/components/Header.tsx" → src/components/Header.tsx
     * - "fix the auth service" → auth service (no extension, need to resolve)
     */
    private extractFilenameFromPrompt(prompt: string): string | null {
        // Pattern 1: Full paths with extensions
        const fullPathMatch = prompt.match(/\b([\w\-/\\]+\.(tsx?|jsx?|rs|py|md|json|ya?ml))\b/i);
        if (fullPathMatch) {
            return fullPathMatch[1];
        }

        // Pattern 2: Filenames with extensions (no path)
        const filenameMatch = prompt.match(/\b([\w\-]+\.(tsx?|jsx?|rs|py|md|json|ya?ml))\b/i);
        if (filenameMatch) {
            return filenameMatch[1];
        }

        // Pattern 3: Module/component names (without extension)
        const moduleMatch = prompt.match(/\b(?:in|edit|update|fix|modify)\s+([\w\-]+)\b/i);
        if (moduleMatch) {
            // Return without extension, resolve later
            return moduleMatch[1];
        }

        return null;
    }

    /**
     * Resolve filename to full URI
     *
     * DESIGN DECISION: Search workspace for matching files
     * WHY: User may provide filename without full path
     */
    private async resolveFileUri(filename: string): Promise<vscode.Uri | null> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return null;
        }

        // If filename already has path, resolve directly
        if (filename.includes('/') || filename.includes('\\')) {
            const fullPath = path.join(workspaceFolders[0].uri.fsPath, filename);
            try {
                await vscode.workspace.fs.stat(vscode.Uri.file(fullPath));
                return vscode.Uri.file(fullPath);
            } catch {
                return null;
            }
        }

        // Search workspace for matching filename
        const files = await vscode.workspace.findFiles(
            `**/${filename}*`,  // Search for files starting with filename
            '**/node_modules/**',
            10  // Limit to 10 results
        );

        return files.length > 0 ? files[0] : null;
    }

    /**
     * Get recently modified files in workspace (last 10)
     */
    private async getRecentlyModifiedFiles(): Promise<vscode.Uri[]> {
        try {
            const files = await vscode.workspace.findFiles(
                '**/*',
                '**/node_modules/**',
                100
            );

            // Get file stats and sort by modification time
            const filesWithStats = await Promise.all(
                files.map(async (file) => {
                    try {
                        const stat = await vscode.workspace.fs.stat(file);
                        return { file, mtime: stat.mtime };
                    } catch {
                        return null;
                    }
                })
            );

            // Filter nulls and sort by mtime descending
            const sortedFiles = filesWithStats
                .filter((item): item is { file: vscode.Uri; mtime: number } => item !== null)
                .sort((a, b) => b.mtime - a.mtime)
                .slice(0, 10)
                .map(item => item.file);

            return sortedFiles;
        } catch {
            return [];
        }
    }

    /**
     * Infer file from pattern matching context
     *
     * DESIGN DECISION: Use semantic keywords to guess file type
     * WHY: Prompts often mention component/service/model names without extensions
     *
     * Examples:
     * - "add auth" → Look for auth.ts, auth.service.ts, Authentication.tsx
     * - "update button component" → Look for Button.tsx, button.component.tsx
     */
    private async inferFileFromPatterns(prompt: string): Promise<vscode.Uri | null> {
        const lowerPrompt = prompt.toLowerCase();

        // Keyword → File extension mappings
        const patternMappings = [
            { keywords: ['component', 'tsx', 'react'], extensions: ['tsx', 'jsx'] },
            { keywords: ['service', 'api', 'backend'], extensions: ['ts', 'js', 'service.ts'] },
            { keywords: ['model', 'schema', 'database'], extensions: ['ts', 'model.ts'] },
            { keywords: ['test', 'spec'], extensions: ['test.ts', 'spec.ts'] },
            { keywords: ['config', 'settings'], extensions: ['json', 'yaml', 'yml'] },
            { keywords: ['rust', 'cargo'], extensions: ['rs'] },
            { keywords: ['python', 'py'], extensions: ['py'] }
        ];

        // Find matching pattern
        for (const pattern of patternMappings) {
            if (pattern.keywords.some(keyword => lowerPrompt.includes(keyword))) {
                // Extract potential module name from prompt
                const moduleMatch = lowerPrompt.match(/\b([\w\-]+)\s+(?:component|service|model|test)\b/);
                if (moduleMatch) {
                    const moduleName = moduleMatch[1];

                    // Search for files matching module name + extension
                    for (const ext of pattern.extensions) {
                        const files = await vscode.workspace.findFiles(
                            `**/${moduleName}.${ext}`,
                            '**/node_modules/**',
                            1
                        );

                        if (files.length > 0) {
                            return files[0];
                        }
                    }
                }
            }
        }

        return null;
    }

    /**
     * Generate HTML for file preview panel
     */
    public async getPreviewHtml(file: vscode.Uri | null): Promise<string> {
        if (!file) {
            return this.getEmptyPreviewHtml();
        }

        try {
            // Read file content
            const content = await vscode.workspace.fs.readFile(file);
            const text = Buffer.from(content).toString('utf8');

            // Get file metadata
            const stat = await vscode.workspace.fs.stat(file);
            const lastModified = new Date(stat.mtime).toLocaleString();
            const filename = path.basename(file.fsPath);
            const relativePath = vscode.workspace.asRelativePath(file);

            // Detect language for syntax highlighting
            const language = this.detectLanguage(file);

            return `
                <div class="preview-panel">
                    <div class="preview-header">
                        <span class="preview-icon">📄</span>
                        <span class="preview-path">${relativePath}</span>
                        <button
                            class="preview-open-button"
                            onclick="openFileInEditor('${file.fsPath}')"
                            title="Open in editor"
                        >
                            🔗 Open in Editor
                        </button>
                    </div>
                    <div class="preview-meta">
                        Last modified: ${lastModified}
                    </div>
                    <div class="preview-content">
                        <pre><code class="language-${language}">${this.escapeHtml(text)}</code></pre>
                    </div>
                </div>
            `;
        } catch (error) {
            return `
                <div class="preview-panel">
                    <div class="preview-error">
                        ❌ Error loading file: ${error instanceof Error ? error.message : 'Unknown error'}
                    </div>
                </div>
            `;
        }
    }

    /**
     * Get HTML for empty preview state
     */
    private getEmptyPreviewHtml(): string {
        return `
            <div class="preview-panel preview-empty">
                <div class="preview-placeholder">
                    📄 No file selected
                    <p>File preview will appear here when you send a command</p>
                </div>
            </div>
        `;
    }

    /**
     * Detect programming language from file extension
     */
    private detectLanguage(file: vscode.Uri): string {
        const ext = path.extname(file.fsPath).toLowerCase();

        const languageMap: Record<string, string> = {
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.rs': 'rust',
            '.py': 'python',
            '.json': 'json',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.md': 'markdown',
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss'
        };

        return languageMap[ext] || 'plaintext';
    }

    /**
     * Escape HTML special characters
     */
    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Get CSS styles for preview panel
     */
    public getPreviewStyles(): string {
        return `
            .preview-panel {
                border-top: 1px solid var(--vscode-panel-border);
                background-color: var(--vscode-editor-background);
                height: ${this.config.defaultHeight}%;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .preview-header {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background-color: var(--vscode-editorGroupHeader-tabsBackground);
                border-bottom: 1px solid var(--vscode-editorGroupHeader-tabsBorder);
            }

            .preview-icon {
                font-size: 16px;
            }

            .preview-path {
                flex: 1;
                font-family: var(--vscode-editor-font-family);
                font-size: 13px;
                color: var(--vscode-editor-foreground);
            }

            .preview-open-button {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 4px 8px;
                border-radius: 2px;
                cursor: pointer;
                font-size: 12px;
            }

            .preview-open-button:hover {
                background: var(--vscode-button-hoverBackground);
            }

            .preview-meta {
                padding: 4px 12px;
                font-size: 11px;
                color: var(--vscode-descriptionForeground);
                background-color: var(--vscode-editorWidget-background);
            }

            .preview-content {
                flex: 1;
                overflow: auto;
                padding: 12px;
            }

            .preview-content pre {
                margin: 0;
                font-family: var(--vscode-editor-font-family);
                font-size: var(--vscode-editor-font-size);
                line-height: 1.6;
            }

            .preview-content code {
                color: var(--vscode-editor-foreground);
            }

            .preview-empty {
                justify-content: center;
                align-items: center;
            }

            .preview-placeholder {
                text-align: center;
                color: var(--vscode-descriptionForeground);
                font-size: 16px;
            }

            .preview-placeholder p {
                margin-top: 8px;
                font-size: 12px;
                font-style: italic;
            }

            .preview-error {
                padding: 16px;
                color: var(--vscode-errorForeground);
                text-align: center;
            }
        `;
    }
}
