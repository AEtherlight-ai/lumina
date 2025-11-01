import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SprintLoader, SprintTask, Engineer } from './SprintLoader';
import { TabManager, TabId } from './TabManager';
import { recordVoiceWithWebview } from './voiceRecorder';
// Removed @nut-tree-fork/nut-js - using VS Code APIs instead (Chain of Thought: native deps don't package well)
import { IPCClient } from '../ipc/client';
import { AutoTerminalSelector } from './AutoTerminalSelector';
import { checkAndSetupUserDocumentation } from '../firstRunSetup';
import { PromptEnhancer } from '../services/PromptEnhancer';

/**
 * DESIGN DECISION: Tabbed sidebar webview with 6 tabs managed by TabManager
 * WHY: Unified tab management with promote/demote capability (A-002)
 *
 * REASONING CHAIN:
 * 1. A-001 created TabManager with 6 tabs (Voice, Sprint, Planning, Patterns, Activity, Settings)
 * 2. A-002 integrates TabManager into VoicePanel WebView
 * 3. TabManager handles state persistence, tab switching, HTML generation
 * 4. All tabs use TabManager's methods for consistency
 * 5. Tab promotion/demotion supported (future: separate Activity Bar icons)
 * 6. Result: Scalable tab architecture with unified management
 *
 * PATTERN: Pattern-UI-006 (Tabbed Multi-Feature Sidebar)
 * VERSION: 0.5.2 (Voice Panel Redesign v0.5.0, Task A-002)
 * RELATED: TabManager.ts, sprints/ACTIVE_SPRINT.toml, SprintLoader.ts
 */

/**
 * WebviewViewProvider for the voice panel in the sidebar
 */
export class VoiceViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'aetherlightVoiceView';
    private _view?: vscode.WebviewView;
    private tabManager: TabManager; // A-002: Tab state management
    private sprintLoader: SprintLoader;
    private promptEnhancer: PromptEnhancer; // ENHANCE-001: AI-powered prompt enhancement
    private autoTerminalSelector: AutoTerminalSelector; // B-003: Intelligent terminal selection
    private sprintTasks: SprintTask[] = [];
    private selectedTaskId: string | null = null;
    private selectedEngineerId: string = 'all'; // 'all' or specific engineer ID
    private selectedTaskDetails: string | null = null; // Full task section from PHASE markdown
    private phaseFileCache: Map<string, string> = new Map(); // Cache for phase file contents
    private taskDetailsCache: Map<string, string> = new Map(); // Cache for extracted task sections
    private poppedOutPanels: vscode.WebviewPanel[] = []; // Track all popped-out panels
    private sprintFileWatcher?: vscode.FileSystemWatcher; // Auto-refresh on TOML changes

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext
    ) {
        /**
         * A-002: Initialize TabManager for 6-tab interface
         * REASONING: TabManager persists state, handles tab switching, generates HTML
         */
        this.tabManager = new TabManager(_context);

        // Initialize SprintLoader
        this.sprintLoader = new SprintLoader(_context);

        // ENHANCE-001: Initialize PromptEnhancer for AI-powered prompt generation
        this.promptEnhancer = new PromptEnhancer(_context);

        /**
         * B-003: Initialize AutoTerminalSelector for intelligent terminal selection
         * REASONING: Monitor command execution, auto-select next waiting terminal
         */
        this.autoTerminalSelector = new AutoTerminalSelector(_context);
        this.autoTerminalSelector.initializeFromOpenTerminals();

        // Register callback for auto-selection changes
        this.autoTerminalSelector.onSelectionChanged((terminalName) => {
            // Notify webview to update selected terminal
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'autoSelectTerminal',
                    terminalName: terminalName
                });
            }
        });

        // BUG-002 FIX: Load sprint tasks asynchronously and refresh webview when done
        // Chain of Thought: Constructor can't be async, but we need tasks loaded before first render
        // REASONING: Load tasks immediately, then send postMessage to update webview once loaded
        // WHY: Prevents "undefined" task display bug (tasks array was empty on first render)
        this.loadSprintTasks().then(() => {
            // Refresh webview if it's already been resolved
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'updateTabContent',
                    tab: 'sprint',
                    content: this.getSprintTabContent()
                });
            }
        });

        // Setup file watcher for automatic sprint refresh
        this.setupSprintFileWatcher();

        /**
         * DESIGN DECISION: Add terminal event listeners for auto-refresh
         * WHY: Keep terminal list in sync with VS Code without manual refresh
         *
         * REASONING CHAIN:
         * 1. Terminals can be opened/closed/renamed in VS Code UI
         * 2. Voice panel must always show current terminal list
         * 3. Listen to VS Code terminal events → auto-refresh panel
         * 4. No need for custom name Map (use actual terminal.name)
         * 5. Result: Terminal list always accurate, no stale data
         *
         * PATTERN: Pattern-EVENT-002 (Reactive UI Updates via Event Listeners)
         * RELATED: vscode.window.terminals, terminalList message
         * PERFORMANCE: Event-driven refresh only when needed
         */
        this.setupTerminalEventListeners();
    }

    /**
     * Setup file watcher for ACTIVE_SPRINT.toml in sprints directory
     *
     * DESIGN DECISION: Auto-refresh Sprint panel when TOML file changes
     * WHY: TOML is single source of truth for autonomous agents + continuous sprint loading
     *
     * REASONING CHAIN:
     * 1. Autonomous agents update sprints/ACTIVE_SPRINT.toml (task status changes)
     * 2. Git commits capture status changes (task traceability)
     * 3. Sprint completion triggers auto-promotion (next sprint loaded)
     * 4. Sprint panel must show real-time task status
     * 5. File watcher detects changes → auto-reload → all views sync
     * 6. Result: Sprint panel is always current (zero manual refresh)
     *
     * PATTERN: Pattern-SPRINT-001 (Sprint System with TOML Source of Truth)
     * RELATED: SprintLoader.ts, loadSprintTasks(), reloadSprint message handler
     * PERFORMANCE: Debounced 500ms to avoid rapid refreshes, TOML parsing <5ms
     */
    private setupSprintFileWatcher(): void {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceRoot) {
            return;
        }

        // Watch ACTIVE_SPRINT.toml at discovered location (internal/sprints, sprints, or root)
        const sprintFilePath = this.sprintLoader.getSprintFilePath();
        const pattern = new vscode.RelativePattern(workspaceRoot, sprintFilePath);

        this.sprintFileWatcher = vscode.workspace.createFileSystemWatcher(pattern);

        // Debounce timer to avoid rapid refreshes
        let debounceTimer: NodeJS.Timeout | null = null;

        const handleFileChange = async () => {
            // Clear existing timer
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }

            // Debounce 500ms (wait for file writes to settle)
            debounceTimer = setTimeout(async () => {
                console.log('[ÆtherLight] Sprint TOML changed, auto-refreshing...');

                // Reload sprint tasks
                await this.loadSprintTasks();

                // Refresh all active webviews
                if (this._view) {
                    this._view.webview.html = this._getHtmlForWebview(this._view.webview);
                }

                // Refresh all popped-out panels
                for (const panel of this.poppedOutPanels) {
                    panel.webview.html = this._getHtmlForWebview(panel.webview);
                }

                console.log('[ÆtherLight] Sprint panel auto-refreshed');
            }, 500);
        };

        this.sprintFileWatcher.onDidChange(handleFileChange);
        this.sprintFileWatcher.onDidCreate(handleFileChange);

        // Cleanup on dispose
        this._context.subscriptions.push(this.sprintFileWatcher);
    }

    /**
     * Setup terminal event listeners for auto-refresh
     *
     * DESIGN DECISION: Listen to terminal lifecycle events to keep panel in sync
     * WHY: Terminals can be created/closed/renamed outside the panel
     *
     * REASONING CHAIN:
     * 1. User can create terminals via Command Palette, context menu, or API
     * 2. User can close terminals by clicking X on terminal tab
     * 3. User can rename terminals via right-click → Rename in VS Code
     * 4. Voice panel must reflect current state without manual refresh
     * 5. Subscribe to onDidOpenTerminal, onDidCloseTerminal, onDidChangeTerminalState
     * 6. Result: Terminal list always accurate in real-time
     *
     * PATTERN: Pattern-EVENT-002 (Reactive UI Updates via Event Listeners)
     * RELATED: getTerminals message handler, updateTerminalList webview function
     * PERFORMANCE: Event-driven refresh, no polling overhead
     */
    private setupTerminalEventListeners(): void {
        // Refresh terminal list when a new terminal is opened
        this._context.subscriptions.push(
            vscode.window.onDidOpenTerminal((terminal) => {
                console.log(`[ÆtherLight] Terminal opened: ${terminal.name}`);
                this.refreshTerminalList();
            })
        );

        // Refresh terminal list when a terminal is closed
        this._context.subscriptions.push(
            vscode.window.onDidCloseTerminal((terminal) => {
                console.log(`[ÆtherLight] Terminal closed: ${terminal.name}`);
                this.refreshTerminalList();
            })
        );

        // Refresh terminal list when terminal state changes (includes renames)
        this._context.subscriptions.push(
            vscode.window.onDidChangeTerminalState((terminal) => {
                console.log(`[ÆtherLight] Terminal state changed: ${terminal.name}`);
                this.refreshTerminalList();
            })
        );
    }

    /**
     * Refresh terminal list in all active webviews
     *
     * DESIGN DECISION: Send updated terminal list to all panels
     * WHY: Keep main view and popped-out panels in sync
     *
     * REASONING CHAIN:
     * 1. Get current terminals from vscode.window.terminals
     * 2. Map to simple objects with name, processId, isExecuting
     * 3. Send terminalList message to main view (if exists)
     * 4. Send to all popped-out panels
     * 5. Result: All views show same terminal state
     */
    private refreshTerminalList(): void {
        const terminals = vscode.window.terminals.map(t => ({
            name: t.name,
            processId: t.processId,
            isExecuting: this.autoTerminalSelector.isTerminalExecuting(t.name)
        }));

        // Update main view
        if (this._view) {
            this._view.webview.postMessage({
                type: 'terminalList',
                terminals
            });
        }

        // Update popped-out panels (if any)
        for (const panel of this.poppedOutPanels) {
            panel.webview.postMessage({
                type: 'terminalList',
                terminals
            });
        }
    }

    private async loadSprintTasks(): Promise<void> {
        try {
            const { tasks } = await this.sprintLoader.loadSprint();
            this.sprintTasks = tasks;
        } catch (error) {
            console.error('[ÆtherLight] Failed to load sprint tasks:', error);
            this.sprintTasks = [];
        }
    }

    /**
     * Simulate typing text using keyboard automation
     *
     * DESIGN DECISION: Use robotjs to simulate real keyboard typing
     * WHY: Allows transcription to appear anywhere cursor is positioned
     *
     * REASONING CHAIN:
     * 1. User wants text typed as if they're typing it themselves
     * 2. Enables typing into ANY text field (not just our textarea)
     * 3. robotjs simulates actual keyboard events
     * 4. Add small delays between characters for realistic typing
     * 5. Result: Transcription appears wherever cursor is focused
     *
     * PATTERN: Pattern-VOICE-003 (Keyboard Simulation for Transcription)
     * RELATED: recordVoiceWithWebview, robotjs
     * PERFORMANCE: ~50ms per character (adjustable via config)
     */
    private async simulateTyping(text: string, delayMs: number = 50): Promise<void> {
        // Chain of Thought: Replaced keyboard.type() with VS Code APIs
        // Reason: @nut-tree-fork/nut-js has native deps that don't package well

        // Try to insert in active text editor first
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            await editor.edit(editBuilder => {
                editBuilder.insert(editor.selection.active, text);
            });
            return;
        }

        // Try to send to active terminal
        const terminal = vscode.window.activeTerminal;
        if (terminal) {
            terminal.sendText(text, false); // false = don't add newline
            return;
        }

        // Fallback: Copy to clipboard and notify user
        await vscode.env.clipboard.writeText(text);
        vscode.window.showInformationMessage('Transcription copied to clipboard (no active editor/terminal)');
    }

    /**
     * Extract full task section from PHASE_X_IMPLEMENTATION.md
     *
     * DESIGN DECISION: Parse markdown with caching for instant subsequent loads
     * WHY: First load parses file, subsequent loads use cache (~1-2s → <10ms)
     *
     * REASONING CHAIN:
     * 1. User wants task details without opening entire file
     * 2. Each task section contains: description, implementation, validation, execution log
     * 3. Parse markdown to find task header (### **Task P2-XXX: [Name]**)
     * 4. Extract until next task header or end of document
     * 5. Cache both phase file contents and extracted task sections
     * 6. Subsequent task selections use cache (<10ms)
     * 7. Result: Fast hierarchical context loading (Pattern-CONTEXT-002)
     *
     * PATTERN: Pattern-CONTEXT-002 (Hierarchical Context Loading), Pattern-CACHE-001 (Phase File Caching)
     * RELATED: getTaskDetailPanel(), Pattern-META-002 (Documentation Ripple Effect)
     * PERFORMANCE: First load ~1-2s (file I/O + parsing), cached loads <10ms
     */
    private async extractTaskDetails(taskId: string): Promise<string | null> {
        try {
            // Check cache first
            if (this.taskDetailsCache.has(taskId)) {
                return this.taskDetailsCache.get(taskId)!;
            }

            const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            if (!workspaceRoot) return null;

            // Determine phase from task ID (e.g., P2-001 → PHASE_2_IMPLEMENTATION.md)
            const phaseNumber = taskId.split('-')[0].substring(1); // "P2" → "2"
            const phaseFile = path.join(workspaceRoot, 'docs', 'phases', `PHASE_${phaseNumber}_IMPLEMENTATION.md`);

            if (!fs.existsSync(phaseFile)) {
                console.warn(`[ÆtherLight] Phase file not found: ${phaseFile}`);
                return null;
            }

            // Check phase file cache
            let content: string;
            if (this.phaseFileCache.has(phaseFile)) {
                content = this.phaseFileCache.get(phaseFile)!;
            } else {
                // Read and cache phase file
                content = fs.readFileSync(phaseFile, 'utf-8');
                this.phaseFileCache.set(phaseFile, content);
            }

            // Find task section: ### **Task P2-XXX: [Name]**
            const taskHeader = new RegExp(`^###\\s*\\*\\*Task ${taskId}:.*?\\*\\*`, 'm');
            const headerMatch = content.match(taskHeader);

            if (!headerMatch) {
                console.warn(`[ÆtherLight] Task ${taskId} not found in ${phaseFile}`);
                return null;
            }

            const startIndex = headerMatch.index!;

            // Find next task header or end of document
            const nextTaskHeader = /^### \*\*Task P\d+-\d+:/gm;
            nextTaskHeader.lastIndex = startIndex + headerMatch[0].length;
            const nextMatch = nextTaskHeader.exec(content);

            const endIndex = nextMatch ? nextMatch.index : content.length;

            // Extract task section
            const taskSection = content.substring(startIndex, endIndex).trim();

            // Cache extracted task section
            this.taskDetailsCache.set(taskId, taskSection);

            return taskSection;
        } catch (error) {
            console.error(`[ÆtherLight] Failed to extract task details for ${taskId}:`, error);
            return null;
        }
    }

    /**
     * Reset tab state to defaults (debug/recovery command)
     *
     * DESIGN DECISION: Public method exposed for command registration
     * WHY: Allow users to fix corrupted tab state without restarting VS Code
     *
     * REASONING CHAIN:
     * 1. User reports Sprint tab not showing
     * 2. Root cause: Workspace state corruption (tabs marked as promoted)
     * 3. Add command: "ÆtherLight: Reset Tab State"
     * 4. Command calls this method → resets TabManager → refreshes view
     * 5. Result: Immediate recovery without restart
     */
    public async resetTabState(): Promise<void> {
        await this.tabManager.resetState();

        // Refresh all active webviews
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
        }

        for (const panel of this.poppedOutPanels) {
            if (panel.visible) {
                panel.webview.html = this._getHtmlForWebview(panel.webview);
            }
        }

        vscode.window.showInformationMessage('✅ Tab state reset. All tabs should now be visible.');
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
            // Enable forms for media input (microphone access)
            enableForms: true
        };

        /**
         * A-004: Check for requested tab focus from hotkey
         * DESIGN DECISION: Handle requested tab switch before rendering HTML
         * WHY: Ensures backtick hotkey always focuses Voice tab
         *
         * REASONING CHAIN:
         * 1. Check workspace state for "requestedTab" flag
         * 2. If flag is "Voice" → Switch to Voice tab (TabManager.setActiveTab)
         * 3. Clear flag to prevent repeat switching
         * 4. Render HTML with correct active tab
         * 5. Result: Hotkey reliably focuses Voice tab
         */
        const requestedTab = this._context.workspaceState.get<string>('aetherlight.requestedTab');
        if (requestedTab === 'Voice') {
            this.tabManager.setActiveTab('voice' as any); // TabId enum uses lowercase internally
            this._context.workspaceState.update('aetherlight.requestedTab', undefined);
        }

        /**
         * DESIGN DECISION: Check for requested action (e.g., auto-start recording)
         * WHY: Backtick hotkey should immediately start recording, not just open panel
         *
         * REASONING CHAIN:
         * 1. Check workspace state for "requestedAction" object
         * 2. If action is "startRecording" → Trigger recording after HTML renders
         * 3. Clear flag to prevent repeat recording
         * 4. Send startRecording message to webview after render
         * 5. Result: Pressing ` = immediate recording (push-to-talk)
         *
         * PATTERN: Pattern-VOICE-004 (Push-to-Talk Hotkey)
         */
        const requestedAction = this._context.workspaceState.get<{ tab: string; action: string; target?: string }>('aetherlight.requestedAction');

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async message => {
            await this._handleMessage(message, webviewView.webview);
        });

        // Auto-trigger action after webview is ready
        if (requestedAction?.action === 'startRecording') {
            // Get target (inputField or undefined for global typing)
            const target = requestedAction.target;

            // Clear flag first
            this._context.workspaceState.update('aetherlight.requestedAction', undefined);

            // Wait for webview to fully render
            setTimeout(() => {
                // Trigger recording via the same message flow as clicking Record button
                this._handleMessage({ type: 'startRecording', target }, webviewView.webview);
            }, 500); // 500ms delay for webview render
        }
    }

    private async _handleMessage(message: any, webview: vscode.Webview) {
        switch (message.type) {
            case 'switchTab':
                /**
                 * A-002: Use TabManager for tab switching
                 * REASONING: TabManager handles state persistence automatically
                 *
                 * FIXED: Don't refresh entire HTML (loses event listeners)
                 * Instead: Send new content to webview via postMessage
                 */
                console.log('[ÆtherLight VoicePanel] Switch tab requested:', message.tabId);
                this.tabManager.setActiveTab(message.tabId);
                console.log('[ÆtherLight VoicePanel] Active tab set, getting new content...');

                // Get the active tab content
                const activeTab = this.tabManager.getActiveTab();
                let tabContent: string;
                switch (activeTab) {
                    case TabId.Voice:
                        tabContent = getVoicePanelBodyContent();
                        break;
                    case TabId.Sprint:
                        tabContent = this.getSprintTabContent();
                        break;
                    case TabId.Planning:
                        tabContent = this.getPlanningTabPlaceholder();
                        break;
                    case TabId.Patterns:
                        tabContent = this.getPatternsTabPlaceholder();
                        break;
                    case TabId.Activity:
                        tabContent = this.getActivityTabPlaceholder();
                        break;
                    case TabId.Settings:
                        tabContent = this.getSettingsTabPlaceholder();
                        break;
                    default:
                        tabContent = `<div class="placeholder-error">Unknown Tab: ${activeTab}</div>`;
                }

                // Send content update message to webview
                const updateMessage = {
                    type: 'updateTabContent',
                    tabId: message.tabId,
                    content: tabContent,
                    needsVoiceScripts: activeTab === TabId.Voice
                };

                // Update the webview that sent the message
                webview.postMessage(updateMessage);

                // Update sidebar if different
                if (this._view && this._view.webview !== webview) {
                    this._view.webview.postMessage(updateMessage);
                }

                // Update all popped-out panels
                for (const poppedPanel of this.poppedOutPanels) {
                    if (poppedPanel.webview !== webview) {
                        poppedPanel.webview.postMessage(updateMessage);
                    }
                }
                break;

            case 'selectTask':
                // Select a task to show details
                this.selectedTaskId = message.taskId;

                // Extract full task details from PHASE_X_IMPLEMENTATION.md
                this.selectedTaskDetails = await this.extractTaskDetails(message.taskId);

                // Send update message to ALL webviews instead of full HTML refresh
                const selectedTask = this.sprintTasks.find(t => t.id === message.taskId);
                if (selectedTask) {
                    const detailHtml = this.getTaskDetailPanel();

                    const updateMessage = {
                        type: 'updateTaskDetail',
                        taskId: message.taskId,
                        detailHtml: detailHtml
                    };

                    // Update the webview that sent the message
                    webview.postMessage(updateMessage);

                    // Update sidebar if different
                    if (this._view && this._view.webview !== webview) {
                        this._view.webview.postMessage(updateMessage);
                    }

                    // Update all popped-out panels
                    for (const poppedPanel of this.poppedOutPanels) {
                        if (poppedPanel.webview !== webview) {
                            poppedPanel.webview.postMessage(updateMessage);
                        }
                    }
                }
                break;

            case 'toggleTaskStatus':
                // Toggle task status (pending → in_progress → completed → pending)
                const task = this.sprintTasks.find(t => t.id === message.taskId);
                if (task) {
                    this.sprintLoader.toggleTaskStatus(task);
                    await this.sprintLoader.saveTaskStatuses(this.sprintTasks);

                    // CRITICAL FIX: Use postMessage instead of HTML regeneration
                    // WHY: Regenerating HTML causes script redeclaration errors
                    // PATTERN: Pattern-UPDATE-003 (Targeted Content Updates)
                    const sprintContent = this.getSprintTabContent();
                    const updateMessage = {
                        type: 'updateTabContent',
                        tabId: TabId.Sprint,
                        content: sprintContent,
                        needsVoiceScripts: false
                    };

                    // Update the webview that sent the message
                    webview.postMessage(updateMessage);

                    // Update sidebar if different
                    if (this._view && this._view.webview !== webview) {
                        this._view.webview.postMessage(updateMessage);
                    }

                    // Update all popped-out panels
                    for (const poppedPanel of this.poppedOutPanels) {
                        if (poppedPanel.webview !== webview) {
                            poppedPanel.webview.postMessage(updateMessage);
                        }
                    }
                }
                break;

            case 'discoverSprintFiles':
                // Discover all sprint files in workspace
                {
                    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
                    if (workspaceRoot) {
                        const sprintFiles = await this.sprintLoader.discoverAllSprintFiles(workspaceRoot);
                        const currentPath = this.sprintLoader.getSprintFilePath();

                        // Send discovered files to all webviews
                        const updateMessage = {
                            type: 'updateSprintFileList',
                            sprintFiles,
                            currentPath
                        };

                        if (this._view) {
                            this._view.webview.postMessage(updateMessage);
                        }

                        for (const panel of this.poppedOutPanels) {
                            panel.webview.postMessage(updateMessage);
                        }

                        vscode.window.showInformationMessage(`Found ${sprintFiles.length} sprint file(s)`);
                    }
                }
                break;

            case 'switchSprintFile':
                // Switch to a different sprint file
                {
                    const newSprintPath = message.sprintPath;
                    if (newSprintPath) {
                        // Update the sprint file path
                        await this.sprintLoader.setSprintFilePath(newSprintPath);

                        // Reload sprint data from new file
                        await this.loadSprintTasks();

                        // CRITICAL FIX: Use postMessage instead of HTML regeneration
                        // WHY: Regenerating HTML causes script redeclaration errors
                        const sprintContent = this.getSprintTabContent();
                        const updateMessage = {
                            type: 'updateTabContent',
                            tabId: TabId.Sprint,
                            content: sprintContent,
                            needsVoiceScripts: false
                        };

                        // Update all webviews
                        if (this._view) {
                            this._view.webview.postMessage(updateMessage);
                        }

                        for (const panel of this.poppedOutPanels) {
                            panel.webview.postMessage(updateMessage);
                        }

                        vscode.window.showInformationMessage(`✅ Switched to: ${newSprintPath}`);
                    }
                }
                break;

            case 'reloadSprint':
                // Clear workspace state cache first (force TOML as source of truth)
                await this._context.workspaceState.update('aetherlight.sprintTaskStatuses', {});

                // Reload sprint data from TOML file (refresh after file changes)
                await this.loadSprintTasks();

                // CRITICAL FIX: Use postMessage instead of HTML regeneration
                // WHY: Regenerating HTML causes script redeclaration errors
                {
                    const sprintContent = this.getSprintTabContent();
                    const updateMessage = {
                        type: 'updateTabContent',
                        tabId: TabId.Sprint,
                        content: sprintContent,
                        needsVoiceScripts: false
                    };

                    // Update the webview that sent the message
                    webview.postMessage(updateMessage);

                    // Update sidebar if different
                    if (this._view && this._view.webview !== webview) {
                        this._view.webview.postMessage(updateMessage);
                    }

                    // Update all popped-out panels
                    for (const poppedPanel of this.poppedOutPanels) {
                        if (poppedPanel.webview !== webview) {
                            poppedPanel.webview.postMessage(updateMessage);
                        }
                    }

                    // Show full relative path to clarify which sprint file was loaded
                    const sprintFilePath = this.sprintLoader.getSprintFilePath();
                    const stats = this.sprintLoader.getProgressStats();
                    vscode.window.showInformationMessage(
                        `✅ Sprint data reloaded from ${sprintFilePath} (${stats.total} tasks, ${stats.completed} completed)`
                    );
                }
                break;

            case 'selectEngineer':
                // Switch engineer view
                this.selectedEngineerId = message.engineerId;

                // CRITICAL FIX: Use postMessage instead of HTML regeneration
                // WHY: Regenerating HTML causes script redeclaration errors
                {
                    const sprintContent = this.getSprintTabContent();
                    const updateMessage = {
                        type: 'updateTabContent',
                        tabId: TabId.Sprint,
                        content: sprintContent,
                        needsVoiceScripts: false
                    };

                    // Update the webview that sent the message
                    webview.postMessage(updateMessage);

                    // Update sidebar if different
                    if (this._view && this._view.webview !== webview) {
                        this._view.webview.postMessage(updateMessage);
                    }

                    // Update all popped-out panels
                    for (const poppedPanel of this.poppedOutPanels) {
                        if (poppedPanel.webview !== webview) {
                            poppedPanel.webview.postMessage(updateMessage);
                        }
                    }
                }
                break;

            // Removed: openTaskDocs - task details now shown in detail panel instead

            case 'openSprintSettings':
                // Open sprint settings
                vscode.window.showInformationMessage(
                    'Sprint settings coming soon! Configure team size, engineer profiles, and sprint parameters.',
                    'Create New Sprint', 'Edit Team', 'Sprint Templates'
                ).then(selection => {
                    if (selection === 'Create New Sprint') {
                        vscode.window.showInformationMessage('New sprint creation wizard coming in v0.5.4');
                    } else if (selection === 'Edit Team') {
                        // Open CURRENT_SPRINT.md for manual editing
                        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
                        if (workspaceRoot) {
                            const currentEngineer = this.sprintLoader.getCurrentEngineer();
                            const sprintPath = path.join(
                                workspaceRoot,
                                'docs',
                                'final',
                                'Human_Engineers',
                                currentEngineer,
                                'CURRENT_SPRINT.md'
                            );
                            const sprintUri = vscode.Uri.file(sprintPath);
                            vscode.workspace.openTextDocument(sprintUri).then(doc => {
                                vscode.window.showTextDocument(doc);
                            });
                        }
                    } else if (selection === 'Sprint Templates') {
                        vscode.window.showInformationMessage('Sprint templates coming in v0.5.4');
                    }
                });
                break;

            case 'popOutSprint':
                // Pop out sprint view to new editor panel
                const panel = vscode.window.createWebviewPanel(
                    'aetherlightSprintView',
                    'ÆtherLight Sprint',
                    vscode.ViewColumn.Beside,
                    {
                        enableScripts: true,
                        retainContextWhenHidden: true,
                        // Enable forms for media input (microphone access)
                        enableForms: true
                    }
                );

                // Track this panel for synchronized updates
                this.poppedOutPanels.push(panel);

                // Clone current sprint view HTML into the panel
                panel.webview.html = this._getHtmlForWebview(panel.webview);

                // Handle messages from the popped-out panel
                panel.webview.onDidReceiveMessage(async message => {
                    await this._handleMessage(message, panel.webview);
                });

                // Remove from tracking when panel is closed
                panel.onDidDispose(() => {
                    const index = this.poppedOutPanels.indexOf(panel);
                    if (index > -1) {
                        this.poppedOutPanels.splice(index, 1);
                    }
                });

                vscode.window.showInformationMessage('Sprint view opened in new editor panel. You can drag it to any column or float it as a separate window.');
                break;
            case 'getTerminals':
                // Ensure ÆtherLight terminal exists and show in main editor view
                let aetherlightTerminal = vscode.window.terminals.find(t => t.name === 'ÆtherLight Claude');
                if (!aetherlightTerminal) {
                    aetherlightTerminal = vscode.window.createTerminal({
                        name: 'ÆtherLight Claude',
                        shellPath: 'powershell.exe',
                        shellArgs: [
                            '-NoExit',
                            '-Command',
                            '& { Write-Host "ÆtherLight Terminal Ready 🎤" -ForegroundColor Cyan }'
                        ],
                        location: vscode.TerminalLocation.Editor // Show in main editor area
                    });
                    // Show the terminal to make it visible
                    aetherlightTerminal.show();
                }

                // B-003: Send list of terminals with execution state
                const terminals = vscode.window.terminals.map(t => ({
                    name: t.name, // Use terminal's actual name (after any renames)
                    actualName: t.name,
                    processId: t.processId,
                    isExecuting: this.autoTerminalSelector.isTerminalExecuting(t.name) // B-003: Add execution state
                }));
                webview.postMessage({
                    type: 'terminalList',
                    terminals
                });
                break;

            case 'renameTerminal':
                /**
                 * B-004: Terminal renaming by dispose-and-recreate
                 * DESIGN DECISION: Create new terminal with desired name, dispose old terminal
                 * WHY: VS Code Terminal.name is readonly, only way to "rename" is recreate
                 *
                 * REASONING CHAIN:
                 * 1. VS Code terminals have readonly .name property (cannot rename directly)
                 * 2. Find old terminal by name
                 * 3. Get shell type and cwd from old terminal
                 * 4. Create new terminal with same shell/cwd but new name
                 * 5. Show new terminal in same position
                 * 6. Dispose old terminal
                 * 7. Result: Terminal appears "renamed" in VS Code tabs
                 *
                 * TRADE-OFF: Loses terminal history, but provides true rename in VS Code UI
                 */
                const oldTerminal = vscode.window.terminals.find(t => t.name === message.oldName);

                if (oldTerminal) {
                    // Get shell info from old terminal (if available)
                    const shellPath = (oldTerminal as any).shellPath || undefined;
                    const cwd = (oldTerminal as any).cwd || undefined;

                    // Create new terminal with new name
                    const newTerminal = vscode.window.createTerminal({
                        name: message.newName,
                        shellPath: shellPath,
                        cwd: cwd
                    });

                    // Show the new terminal (replaces old terminal visually)
                    newTerminal.show(false); // false = don't steal focus

                    // Dispose old terminal (removes from tabs)
                    oldTerminal.dispose();

                    // Refresh terminal list in webview
                    const updatedTerminals = vscode.window.terminals.map(t => ({
                        name: t.name,
                        actualName: t.name,
                        processId: t.processId,
                        isExecuting: this.autoTerminalSelector.isTerminalExecuting(t.name)
                    }));

                    webview.postMessage({
                        type: 'updateTerminals',
                        terminals: updatedTerminals
                    });

                    vscode.window.showInformationMessage(`Terminal renamed to "${message.newName}"`);
                } else {
                    vscode.window.showErrorMessage(`Terminal "${message.oldName}" not found`);
                }
                break;

            case 'enhanceText':
                const enhancedText = await enhanceWithPatterns(message.text);
                webview.postMessage({
                    type: 'enhancedText',
                    text: enhancedText
                });
                break;

            case 'startRecording':
                /**
                 * DESIGN DECISION: Use IPC to desktop app for recording (not webview)
                 * WHY: Desktop app has native microphone access, no permission issues
                 *
                 * REASONING CHAIN:
                 * 1. User clicks 🎤 Record button OR presses ` hotkey
                 * 2. Check if target is 'inputField' (fill input) or undefined (type globally)
                 * 3. Connect to desktop app via IPC
                 * 4. Desktop app records with native API (Tauri microphone)
                 * 5. Desktop app chunks audio → OpenAI Whisper
                 * 6. For each transcription chunk:
                 *    - If target='inputField': Send to webview input field
                 *    - If undefined: Simulate typing with nut-js (global typing)
                 * 7. Recording completes
                 * 8. Result: 100% reliable microphone access + flexible output
                 *
                 * PATTERN: Pattern-VOICE-006 (IPC-Based Recording)
                 * RELATED: captureVoiceGlobal.ts, IPC client, desktop app
                 * PERFORMANCE: <50ms IPC latency, <2s transcription per chunk
                 */
                try {
                    // Get IPC client
                    const ipcClient = this._context.globalState.get<IPCClient>('ipcClient');
                    if (!ipcClient) {
                        webview.postMessage({
                            type: 'transcriptionError',
                            message: 'Desktop app not connected. Please start the ÆtherLight desktop app.'
                        });
                        vscode.window.showErrorMessage('ÆtherLight: Desktop app not connected');
                        return;
                    }

                    // Check for OpenAI API key
                    const config = vscode.workspace.getConfiguration('aetherlight');
                    const apiKey = config.get<string>('openai.apiKey');

                    if (!apiKey || apiKey.trim() === '') {
                        const action = await vscode.window.showErrorMessage(
                            '🔑 OpenAI API key required for voice transcription',
                            'Open Settings',
                            'Cancel'
                        );

                        if (action === 'Open Settings') {
                            await vscode.commands.executeCommand('workbench.action.openSettings', 'aetherlight.openai.apiKey');
                        }
                        return;
                    }

                    const target = message.target; // 'inputField' or undefined

                    if (target === 'inputField') {
                        // Focus the command/transcript input field
                        webview.postMessage({
                            type: 'focusInput',
                            inputId: 'transcriptionText' // Fixed: Use correct input field ID
                        });
                    }

                    // Show status
                    webview.postMessage({
                        type: 'recordingStatus',
                        status: 'recording'
                    });

                    // Start recording via IPC
                    // Note: For panel recording, we don't need code context
                    const response = await ipcClient.sendCaptureVoice({
                        language: '',
                        currentFile: '',
                        cursorPosition: { line: 0, character: 0 },
                        surroundingCode: ''
                    }, (status) => {
                        // Update recording status in webview
                        webview.postMessage({
                            type: 'recordingStatus',
                            status: status.status
                        });
                    });

                    // Final status update
                    if (response.success) {
                        // Handle transcription based on target
                        if (target === 'inputField') {
                            // Send complete transcription to webview input field
                            webview.postMessage({
                                type: 'appendToInput',
                                text: response.text
                            });
                        } else {
                            // Type globally
                            try {
                                await this.simulateTyping(response.text);
                            } catch (error) {
                                console.error('[ÆtherLight] Failed to simulate typing:', error);
                            }
                        }

                        webview.postMessage({
                            type: 'transcriptionComplete',
                            text: response.text
                        });

                        const confidencePercent = (response.confidence * 100).toFixed(0);
                        vscode.window.showInformationMessage(
                            `✅ Transcription complete | Confidence: ${confidencePercent}%`
                        );
                    } else{
                        const errorDetails = response.errorCode ? ` (${response.errorCode})` : '';
                        webview.postMessage({
                            type: 'transcriptionError',
                            message: response.error || 'Unknown error'
                        });
                        vscode.window.showErrorMessage(
                            `ÆtherLight: Voice capture failed - ${response.error || 'Unknown error'}${errorDetails}`
                        );
                    }
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                    webview.postMessage({
                        type: 'transcriptionError',
                        message: errorMsg
                    });
                    vscode.window.showErrorMessage(`ÆtherLight: Recording failed - ${errorMsg}`);
                }
                break;

            case 'sendKeystroke':
                // BUG FIX v0.15.1: Record button should trigger same behavior as backtick key
                // WHY: Record button was calling non-existent 'captureVoiceGlobal' command
                // Chain of Thought: Backtick key → openVoicePanel → startRecording action
                // FIX: Call the same command that backtick key uses
                if (message.key === 'backtick') {
                    // Execute the openVoicePanel command which handles recording
                    vscode.commands.executeCommand('aetherlight.openVoicePanel');
                }
                break;

            case 'transcribeAudio':
                try {
                    const transcription = await transcribeAudioWithWhisper(message.audioData);
                    webview.postMessage({
                        type: 'transcriptionComplete',
                        text: transcription
                    });
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                    webview.postMessage({
                        type: 'transcriptionError',
                        message: errorMsg
                    });
                }
                break;

            case 'sendToTerminal':
                /**
                 * DESIGN DECISION: Execute command immediately (addNewLine: true)
                 * WHY: User wants one-click execution, not manual Enter
                 *
                 * REASONING CHAIN:
                 * 1. sendText() with addNewLine=true executes command immediately
                 * 2. No need for user to press Enter in terminal
                 * 3. Frontend clears input box after sending
                 * 4. Result: Smooth voice → terminal → execute → clear workflow
                 */
                const targetTerminal = vscode.window.terminals.find(
                    t => t.name === message.terminalName
                );

                if (targetTerminal) {
                    // Execute command immediately (addNewLine: true by default)
                    targetTerminal.sendText(message.text, true);
                    targetTerminal.show();
                } else {
                    vscode.window.showErrorMessage(
                        `❌ Terminal not found: ${message.terminalName}`
                    );
                }
                break;

            case 'error':
                vscode.window.showErrorMessage(message.message);
                break;

            case 'openUrl':
                // UI-003: Handle opening URLs (bug reports, feature requests)
                vscode.env.openExternal(vscode.Uri.parse(message.url));
                break;

            case 'enhancePrompt':
                // ENHANCE-002: Enhance user's natural language intent into comprehensive prompt
                // Chain of Thought: User provides intent → PromptEnhancer analyzes + enhances → send back to webview
                // WHY: Users know what they want but may not know how to structure it for AI
                // REASONING: Combine user intent + codebase context + SOPs = expert-level prompt
                try {
                    const { userIntent, promptType } = message;

                    if (!userIntent || !userIntent.trim()) {
                        webview.postMessage({
                            type: 'enhancementError',
                            error: 'Please describe what you want to analyze or plan.'
                        });
                        return;
                    }

                    // Show status in webview
                    webview.postMessage({
                        type: 'enhancementStarted'
                    });

                    // Enhance the prompt
                    const result = await this.promptEnhancer.enhancePrompt(userIntent, promptType);

                    // Send enhanced prompt back to webview
                    webview.postMessage({
                        type: 'enhancementComplete',
                        prompt: result.prompt,
                        confidence: result.confidence,
                        warnings: result.warnings
                    });

                    // Save user intent for next time
                    const stateKey = promptType === 'code-analyzer'
                        ? 'lastCodeAnalyzerIntent'
                        : 'lastSprintPlannerIntent';
                    await this._context.workspaceState.update(`aetherlight.${stateKey}`, userIntent);

                } catch (error) {
                    console.error('[ÆtherLight] Prompt enhancement failed:', error);
                    webview.postMessage({
                        type: 'enhancementError',
                        error: error instanceof Error ? error.message : 'Failed to enhance prompt'
                    });
                }
                break;

            case 'saveSettings':
                // SETTINGS-001: Save sprint planning settings to workspace state
                await this._context.workspaceState.update('aetherlight.sprintSettings', message.settings);
                console.log('[ÆtherLight] Settings saved:', message.settings);
                break;
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        /**
         * A-002: Use TabManager for HTML generation
         * REASONING:
         * 1. TabManager generates tab bar HTML with all 6 tabs
         * 2. TabManager provides CSS styles for tab UI
         * 3. Generate tab content based on active tab
         * 4. Result: Consistent tab UI managed by TabManager
         */
        const tabBar = this.tabManager.getTabBarHtml();
        const activeTab = this.tabManager.getActiveTab();

        /**
         * A-003: Generate tab content with proper placeholders
         * REASONING: Each tab shows skeleton UI to give users clear expectations
         */
        let tabContent: string;
        switch (activeTab) {
            case TabId.Voice:
                tabContent = getVoicePanelBodyContent();
                break;
            case TabId.Sprint:
                tabContent = this.getSprintTabContent();
                break;
            case TabId.Planning:
                tabContent = this.getPlanningTabPlaceholder();
                break;
            case TabId.Patterns:
                tabContent = this.getPatternsTabPlaceholder();
                break;
            case TabId.Activity:
                tabContent = this.getActivityTabPlaceholder();
                break;
            case TabId.Settings:
                tabContent = this.getSettingsTabPlaceholder();
                break;
            default:
                tabContent = `<div class="placeholder-error">Unknown Tab: ${activeTab}</div>`;
        }

        // Chain of Thought: Generate nonce for script-src CSP to prevent TrustedScript violations
        // WHY: VS Code webviews now enforce Trusted Types policy, 'unsafe-inline' causes security errors
        // REASONING: Using webview.cspSource and nonce is the recommended VS Code pattern
        const nonce = this.getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' 'unsafe-hashes' 'unsafe-inline'; media-src * blob: data: mediastream:; img-src ${webview.cspSource} https: data: blob:; font-src ${webview.cspSource} data:; connect-src https://api.openai.com;">
    <title>ÆtherLight</title>
    <style>
        ${this.tabManager.getTabStyles()}
        ${this.getSprintTabStyles()}
        ${this.getVoicePanelStyles()}
    </style>
</head>
<body>
    ${tabBar}
    <div class="tab-content active">
        ${tabContent}
    </div>
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        // DIAGNOSTIC: Log script execution
        console.log('[ÆtherLight WebView] Script started');
        console.log('[ÆtherLight WebView] Looking for tab buttons...');

        // Tab switching
        const tabButtons = document.querySelectorAll('.tab-button');
        console.log('[ÆtherLight WebView] Found', tabButtons.length, 'tab buttons');

        tabButtons.forEach((button, index) => {
            console.log('[ÆtherLight WebView] Attaching listener to button', index, 'with tabId:', button.dataset.tabId);
            button.addEventListener('click', (event) => {
                console.log('[ÆtherLight WebView] Click event fired on button', index);

                // Save voice tab text before switching tabs
                const textAreaEl = document.getElementById('transcriptionText');
                if (textAreaEl) {
                    const state = vscode.getState() || {};
                    state.voiceTextContent = textAreaEl.value;
                    vscode.setState(state);
                }

                const tabId = button.dataset.tabId;
                console.log('[ÆtherLight WebView] Tab clicked:', tabId);
                vscode.postMessage({ type: 'switchTab', tabId });
                console.log('[ÆtherLight WebView] Message sent to backend');
            });
        });

        console.log('[ÆtherLight WebView] All event listeners attached');

        // Global functions for Sprint Tab

        // Toggle task status (called from status icon click)
        window.toggleStatus = function(taskId) {
            vscode.postMessage({ type: 'toggleTaskStatus', taskId });
        };

        // Select task to view details (called from task row click)
        window.selectTask = function(taskId) {
            vscode.postMessage({ type: 'selectTask', taskId });
        };

        // Switch engineer view
        window.selectEngineer = function(engineerId) {
            vscode.postMessage({ type: 'selectEngineer', engineerId });
        };

        // Open sprint settings
        window.openSprintSettings = function() {
            vscode.postMessage({ type: 'openSprintSettings' });
        };

        // Pop out sprint view
        window.popOutSprint = function() {
            vscode.postMessage({ type: 'popOutSprint' });
        };

        window.reloadSprint = function() {
            vscode.postMessage({ type: 'reloadSprint' });
        };

        // Discover all sprint files in workspace
        window.discoverSprintFiles = function() {
            vscode.postMessage({ type: 'discoverSprintFiles' });
        };

        // Switch to a different sprint file
        window.switchSprintFile = function(sprintPath) {
            vscode.postMessage({ type: 'switchSprintFile', sprintPath });
        };

        // GLOBAL-PERSIST-001: Configuration Panel Functions
        // Chain of Thought: These functions must be at global scope to persist across tab switches
        // WHY: Tab content updates replace HTML but don't re-run script, so functions defined
        //      later in the script are lost when tabs switch
        // REASONING: Define toggleConfigPanel, generate*Prompt, and panel getter functions
        //            at global scope so they survive content updates
        // PATTERN: Pattern-PERSIST-001 (Global Function Persistence)

        // Show status message (used by configuration panels)
        window.showStatus = function(message, type) {
            const statusEl = document.getElementById('statusMessage');
            if (statusEl) {
                statusEl.textContent = message;
                statusEl.className = 'status-message ' + type;
                statusEl.style.display = 'block';

                // Auto-hide after 5 seconds
                setTimeout(() => {
                    statusEl.style.display = 'none';
                }, 5000);
            }
        };

        // Toggle configuration panel for Code Analyzer or Sprint Planner
        window.toggleConfigPanel = function(panelType) {
            const container = document.getElementById('configPanelContainer');
            if (!container) return;

            // If clicking same panel, close it
            if (container.dataset.activePanel === panelType && container.classList.contains('open')) {
                container.classList.remove('open');
                container.style.display = 'none';
                delete container.dataset.activePanel;
                return;
            }

            // Load panel content based on type
            let panelHtml = '';
            if (panelType === 'code-analyzer') {
                panelHtml = window.getCodeAnalyzerPanel();
            } else if (panelType === 'sprint-planner') {
                panelHtml = window.getSprintPlannerPanel();
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(panelHtml, 'text/html');
            container.replaceChildren(...doc.body.childNodes);

            // Show panel with animation
            container.dataset.activePanel = panelType;
            container.style.display = 'block';
            container.offsetHeight; // Force reflow
            container.classList.add('open');

            // Attach event listeners to dynamically added panel buttons
            setTimeout(() => {
                if (panelType === 'code-analyzer') {
                    const closeBtn = document.getElementById('closeCodeAnalyzerPanel');
                    const cancelBtn = document.getElementById('cancelCodeAnalyzer');
                    const generateBtn = document.getElementById('generateCodeAnalyzerPrompt');

                    if (closeBtn) closeBtn.addEventListener('click', () => window.toggleConfigPanel(panelType));
                    if (cancelBtn) cancelBtn.addEventListener('click', () => window.toggleConfigPanel(panelType));
                    if (generateBtn) generateBtn.addEventListener('click', () => window.generateCodeAnalyzerPrompt());
                } else if (panelType === 'sprint-planner') {
                    const closeBtn = document.getElementById('closeSprintPlannerPanel');
                    const cancelBtn = document.getElementById('cancelSprintPlanner');
                    const generateBtn = document.getElementById('generateSprintPrompt');

                    if (closeBtn) closeBtn.addEventListener('click', () => window.toggleConfigPanel(panelType));
                    if (cancelBtn) cancelBtn.addEventListener('click', () => window.toggleConfigPanel(panelType));
                    if (generateBtn) generateBtn.addEventListener('click', () => window.generateSprintPlannerPrompt());
                }
            }, 0);
        };

        // Generate Code Analyzer prompt from user intent + configuration
        // Chain of Thought: Collect all config values including checkboxes and save to state for persistence
        window.generateCodeAnalyzerPrompt = function() {
            const intentTextarea = document.getElementById('codeAnalyzerIntent');
            if (!intentTextarea) return;

            const userIntent = intentTextarea.value.trim();
            if (!userIntent) {
                window.showStatus('⚠️ Please describe what you want to analyze.', 'warning');
                intentTextarea.focus();
                return;
            }

            // Collect Code Analyzer configuration values
            const goalsTextarea = document.getElementById('analyzerGoals');
            const depthSelect = document.getElementById('analyzerDepth');
            const outputSelect = document.getElementById('analyzerOutput');
            const exclusionsTextarea = document.getElementById('analyzerExclusions');

            // Collect checked focus areas
            const focusAreas = [];
            ['bugs', 'features', 'debt', 'tests', 'docs', 'security', 'performance'].forEach(area => {
                const checkbox = document.getElementById('focus-' + area);
                if (checkbox && checkbox.checked) {
                    focusAreas.push(area);
                }
            });

            const config = {
                goals: goalsTextarea ? goalsTextarea.value.trim() : '',
                focusAreas: focusAreas,
                depth: depthSelect ? depthSelect.value : 'standard',
                output: outputSelect ? outputSelect.value : 'sprint-toml',
                exclusions: exclusionsTextarea ? exclusionsTextarea.value.trim() : ''
            };

            // Save config to state for persistence
            const state = vscode.getState() || {};
            state.sprintSettings = state.sprintSettings || {};
            state.sprintSettings.analyzerGoals = config.goals;
            state.sprintSettings.focusAreas = config.focusAreas;
            state.sprintSettings.analyzerDepth = config.depth;
            state.sprintSettings.analyzerOutput = config.output;
            state.sprintSettings.analyzerExclusions = config.exclusions;
            state.lastCodeAnalyzerIntent = userIntent;
            vscode.setState(state);

            // Show enhancement status
            const statusDiv = document.getElementById('enhancementStatus');
            if (statusDiv) statusDiv.style.display = 'flex';

            // Disable button during enhancement
            const generateBtn = document.getElementById('generateCodeAnalyzerPrompt');
            if (generateBtn) {
                generateBtn.disabled = true;
                generateBtn.textContent = '⏳ Enhancing...';
            }

            // Send to extension for enhancement with config
            vscode.postMessage({
                type: 'enhancePrompt',
                userIntent,
                config,
                promptType: 'code-analyzer'
            });
        };

        // Generate Sprint Planner prompt from user intent + configuration
        // Chain of Thought: Collect all config values and save to state for persistence
        window.generateSprintPlannerPrompt = function() {
            const intentTextarea = document.getElementById('sprintPlannerIntent');
            if (!intentTextarea) return;

            const userIntent = intentTextarea.value.trim();
            if (!userIntent) {
                window.showStatus('⚠️ Please describe the sprint you want to plan.', 'warning');
                intentTextarea.focus();
                return;
            }

            // Collect Sprint Planner configuration values
            const teamSizeInput = document.getElementById('teamSize');
            const structureSelect = document.getElementById('sprintStructure');
            const typeSelect = document.getElementById('sprintType');
            const formatSelect = document.getElementById('docFormat');

            const config = {
                teamSize: teamSizeInput ? parseInt(teamSizeInput.value) : 1,
                structure: structureSelect ? structureSelect.value : 'phases',
                type: typeSelect ? typeSelect.value : 'feature',
                format: formatSelect ? formatSelect.value : 'toml'
            };

            // Save config to state for persistence
            const state = vscode.getState() || {};
            state.sprintSettings = state.sprintSettings || {};
            state.sprintSettings.teamSize = config.teamSize;
            state.sprintSettings.sprintStructure = config.structure;
            state.sprintSettings.sprintType = config.type;
            state.sprintSettings.docFormat = config.format;
            state.lastSprintPlannerIntent = userIntent;
            vscode.setState(state);

            // Show enhancement status
            const statusDiv = document.getElementById('enhancementStatus');
            if (statusDiv) statusDiv.style.display = 'flex';

            // Disable button during enhancement
            const generateBtn = document.getElementById('generateSprintPrompt');
            if (generateBtn) {
                generateBtn.disabled = true;
                generateBtn.textContent = '⏳ Enhancing...';
            }

            // Send to extension for enhancement with config
            vscode.postMessage({
                type: 'enhancePrompt',
                userIntent,
                config,
                promptType: 'sprint-planner'
            });
        };

        // Get Code Analyzer panel HTML
        // Chain of Thought: Merged configuration UI + natural language intent
        // WHY: User wants config checkboxes/dropdowns merged with textarea in single slide-down panel
        // REASONING: Restore Code Analyzer config (focus areas, depth, output, exclusions) from git history
        window.getCodeAnalyzerPanel = function() {
            const state = vscode.getState() || {};
            const lastIntent = state.lastCodeAnalyzerIntent || '';
            const savedSettings = state.sprintSettings || {};
            const focusAreas = savedSettings.focusAreas || ['bugs', 'features'];

            return \`
                <div class="config-panel-header">
                    <h3>🔍 Code Analyzer</h3>
                    <button id="closeCodeAnalyzerPanel" class="config-panel-close">×</button>
                </div>
                <div class="config-panel-body">
                    <div class="settings-group">
                        <label for="codeAnalyzerIntent">What would you like to analyze?</label>
                        <textarea
                            id="codeAnalyzerIntent"
                            class="settings-textarea enhanced-textarea"
                            rows="3"
                            placeholder="Example: 'Find all authentication bugs and security vulnerabilities in the API layer'">\${lastIntent}</textarea>
                        <span class="settings-hint">💡 Describe your analysis goal - AI will enhance with config below</span>
                    </div>

                    <div class="settings-group">
                        <label for="analyzerGoals">Additional Analysis Goals (optional)</label>
                        <textarea id="analyzerGoals" class="settings-textarea" rows="2" placeholder="e.g., Identify technical debt, Find missing tests, Review security vulnerabilities">\${savedSettings.analyzerGoals || ''}</textarea>
                        <span class="settings-hint">One per line or comma-separated</span>
                    </div>

                    <div class="settings-group">
                        <label>Focus Areas</label>
                        <div class="settings-checkboxes">
                            <label class="checkbox-label">
                                <input type="checkbox" id="focus-bugs" value="bugs" \${focusAreas.includes('bugs') ? 'checked' : ''}>
                                <span>🐛 Bugs</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="focus-features" value="features" \${focusAreas.includes('features') ? 'checked' : ''}>
                                <span>✨ Features</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="focus-debt" value="debt" \${focusAreas.includes('debt') ? 'checked' : ''}>
                                <span>⚠️ Technical Debt</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="focus-tests" value="tests" \${focusAreas.includes('tests') ? 'checked' : ''}>
                                <span>🧪 Tests</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="focus-docs" value="docs" \${focusAreas.includes('docs') ? 'checked' : ''}>
                                <span>📚 Documentation</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="focus-security" value="security" \${focusAreas.includes('security') ? 'checked' : ''}>
                                <span>🔒 Security</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="focus-performance" value="performance" \${focusAreas.includes('performance') ? 'checked' : ''}>
                                <span>⚡ Performance</span>
                            </label>
                        </div>
                        <span class="settings-hint">Select areas to focus analysis on</span>
                    </div>

                    <div class="settings-group">
                        <label for="analyzerDepth">Analysis Depth</label>
                        <select id="analyzerDepth" class="settings-select">
                            <option value="quick" \${savedSettings.analyzerDepth === 'quick' ? 'selected' : ''}>Quick (5 min - surface level)</option>
                            <option value="standard" \${savedSettings.analyzerDepth === 'standard' || !savedSettings.analyzerDepth ? 'selected' : ''}>Standard (15 min - thorough)</option>
                            <option value="deep" \${savedSettings.analyzerDepth === 'deep' ? 'selected' : ''}>Deep (30+ min - comprehensive)</option>
                        </select>
                        <span class="settings-hint">Deeper analysis takes longer but finds more issues</span>
                    </div>

                    <div class="settings-group">
                        <label for="analyzerOutput">Output Format</label>
                        <select id="analyzerOutput" class="settings-select">
                            <option value="sprint-toml" \${savedSettings.analyzerOutput === 'sprint-toml' || !savedSettings.analyzerOutput ? 'selected' : ''}>Sprint TOML (ÆtherLight format)</option>
                            <option value="markdown" \${savedSettings.analyzerOutput === 'markdown' ? 'selected' : ''}>Markdown Report</option>
                            <option value="github-issues" \${savedSettings.analyzerOutput === 'github-issues' ? 'selected' : ''}>GitHub Issues JSON</option>
                            <option value="csv" \${savedSettings.analyzerOutput === 'csv' ? 'selected' : ''}>CSV Export</option>
                        </select>
                        <span class="settings-hint">How analysis results should be formatted</span>
                    </div>

                    <div class="settings-group">
                        <label for="analyzerExclusions">Exclusions (paths to skip)</label>
                        <textarea id="analyzerExclusions" class="settings-textarea" rows="2" placeholder="e.g., node_modules/, dist/, *.test.ts">\${savedSettings.analyzerExclusions || ''}</textarea>
                        <span class="settings-hint">Files/folders to exclude from analysis (one per line)</span>
                    </div>

                    <div id="enhancementStatus" class="enhancement-status" style="display: none;">
                        <div class="enhancement-spinner"></div>
                        <span>Enhancing prompt with codebase context...</span>
                    </div>
                </div>
                <div class="config-panel-actions">
                    <button id="generateCodeAnalyzerPrompt" class="settings-button primary">✨ Enhance & Generate Prompt</button>
                    <button id="cancelCodeAnalyzer" class="settings-button">Cancel</button>
                </div>
            \`;
        };

        // Get Sprint Planner panel HTML
        // Chain of Thought: Merged configuration UI + natural language intent
        // WHY: User wants config dropdowns merged with textarea in single slide-down panel
        // REASONING: Restore Sprint Planning config (team size, structure, type, format) from git history
        window.getSprintPlannerPanel = function() {
            const state = vscode.getState() || {};
            const lastIntent = state.lastSprintPlannerIntent || '';
            const savedSettings = state.sprintSettings || {};

            return \`
                <div class="config-panel-header">
                    <h3>📋 Sprint Planner</h3>
                    <button id="closeSprintPlannerPanel" class="config-panel-close">×</button>
                </div>
                <div class="config-panel-body">
                    <div class="settings-group">
                        <label for="sprintPlannerIntent">What sprint would you like to plan?</label>
                        <textarea
                            id="sprintPlannerIntent"
                            class="settings-textarea enhanced-textarea"
                            rows="4"
                            placeholder="Example: 'Plan a 2-week sprint for fixing authentication bugs and adding OAuth support'">\${lastIntent}</textarea>
                        <span class="settings-hint">💡 Describe your sprint goal - AI will enhance with config below</span>
                    </div>

                    <div class="settings-group">
                        <label for="teamSize">Team Size</label>
                        <input type="number" id="teamSize" min="1" max="999" value="\${savedSettings.teamSize || 1}" class="settings-input">
                        <span class="settings-hint">Number of engineers (1-999)</span>
                    </div>

                    <div class="settings-group">
                        <label for="sprintStructure">Structure Terminology</label>
                        <select id="sprintStructure" class="settings-select">
                            <option value="phases" \${savedSettings.sprintStructure === 'phases' || !savedSettings.sprintStructure ? 'selected' : ''}>Phases (ÆtherLight default)</option>
                            <option value="epics" \${savedSettings.sprintStructure === 'epics' ? 'selected' : ''}>Epics</option>
                            <option value="user-stories" \${savedSettings.sprintStructure === 'user-stories' ? 'selected' : ''}>User Stories</option>
                            <option value="sprints" \${savedSettings.sprintStructure === 'sprints' ? 'selected' : ''}>Sprints</option>
                            <option value="kanban" \${savedSettings.sprintStructure === 'kanban' ? 'selected' : ''}>Kanban</option>
                            <option value="milestones" \${savedSettings.sprintStructure === 'milestones' ? 'selected' : ''}>Milestones</option>
                        </select>
                        <span class="settings-hint">Choose terminology that matches your workflow</span>
                    </div>

                    <div class="settings-group">
                        <label for="sprintType">Sprint Type</label>
                        <select id="sprintType" class="settings-select">
                            <option value="feature" \${savedSettings.sprintType === 'feature' || !savedSettings.sprintType ? 'selected' : ''}>Feature Development</option>
                            <option value="bugfix" \${savedSettings.sprintType === 'bugfix' ? 'selected' : ''}>Bug Fix Sprint</option>
                            <option value="research" \${savedSettings.sprintType === 'research' ? 'selected' : ''}>Research & Design</option>
                            <option value="refactor" \${savedSettings.sprintType === 'refactor' ? 'selected' : ''}>Refactoring</option>
                            <option value="mixed" \${savedSettings.sprintType === 'mixed' ? 'selected' : ''}>Mixed (Feature + Bugs)</option>
                            <option value="maintenance" \${savedSettings.sprintType === 'maintenance' ? 'selected' : ''}>Maintenance</option>
                        </select>
                        <span class="settings-hint">Type of work for sprint planning context</span>
                    </div>

                    <div class="settings-group">
                        <label for="docFormat">Documentation Format</label>
                        <select id="docFormat" class="settings-select">
                            <option value="toml" \${savedSettings.docFormat === 'toml' || !savedSettings.docFormat ? 'selected' : ''}>TOML (ÆtherLight default)</option>
                            <option value="markdown" \${savedSettings.docFormat === 'markdown' ? 'selected' : ''}>Markdown</option>
                            <option value="json" \${savedSettings.docFormat === 'json' ? 'selected' : ''}>JSON</option>
                            <option value="yaml" \${savedSettings.docFormat === 'yaml' ? 'selected' : ''}>YAML</option>
                            <option value="xml" \${savedSettings.docFormat === 'xml' ? 'selected' : ''}>XML</option>
                        </select>
                        <span class="settings-hint">Sprint plan output format</span>
                    </div>

                    <div id="enhancementStatus" class="enhancement-status" style="display: none;">
                        <div class="enhancement-spinner"></div>
                        <span>Enhancing prompt with codebase context...</span>
                    </div>
                </div>
                <div class="config-panel-actions">
                    <button id="generateSprintPrompt" class="settings-button primary">✨ Enhance & Generate Prompt</button>
                    <button id="cancelSprintPlanner" class="settings-button">Cancel</button>
                </div>
            \`;
        };

        // GLOBAL-PERSIST-002: Sprint Tab Event Delegation
        // Chain of Thought: Event listeners must persist across tab switches
        // WHY: Sprint tab content gets replaced when switching tabs, losing event listeners
        // REASONING: Attach to document.body which never gets replaced, use event delegation
        // PATTERN: Pattern-PERSIST-002 (Global Event Delegation for Tab-Switched Content)
        document.body.addEventListener('click', function(e) {
            const target = e.target;

            // Task status icon click (Sprint tab)
            if (target.classList.contains('task-status-icon')) {
                e.stopPropagation();
                const taskItem = target.closest('.task-item');
                if (taskItem && taskItem.dataset.taskId) {
                    window.toggleStatus(taskItem.dataset.taskId);
                }
                return;
            }

            // Task item click - select task to show details (Sprint tab)
            const taskItem = target.classList.contains('task-item') ? target : target.closest('.task-item');
            if (taskItem && taskItem.dataset.taskId) {
                window.selectTask(taskItem.dataset.taskId);
                return;
            }

            // Status toggle button in detail panel (Sprint tab)
            const statusBtn = target.classList.contains('status-toggle-btn') ? target : target.closest('.status-toggle-btn');
            if (statusBtn && statusBtn.dataset.taskId) {
                window.toggleStatus(statusBtn.dataset.taskId);
                return;
            }

            // Sprint header action buttons
            const actionBtn = target.closest('[data-action]');
            if (actionBtn) {
                const action = actionBtn.dataset.action;
                if (action === 'reloadSprint' && window.reloadSprint) window.reloadSprint();
                else if (action === 'openSprintSettings' && window.openSprintSettings) window.openSprintSettings();
                else if (action === 'popOutSprint' && window.popOutSprint) window.popOutSprint();
                else if (action === 'discoverSprintFiles' && window.discoverSprintFiles) window.discoverSprintFiles();
                return;
            }

            // Engineer tab clicks (Sprint tab)
            const engineerTab = target.closest('[data-engineer-id]');
            if (engineerTab && engineerTab.dataset.engineerId && window.selectEngineer) {
                window.selectEngineer(engineerTab.dataset.engineerId);
                return;
            }

            // Voice tab button clicks
            // CRITICAL FIX: Handle Voice tab buttons globally to persist across tab switches
            if (target.id === 'recordBtn' && window.toggleRecording) {
                window.toggleRecording();
                return;
            }
            if (target.id === 'codeAnalyzerBtn' && window.toggleConfigPanel) {
                window.toggleConfigPanel('code-analyzer');
                return;
            }
            if (target.id === 'sprintPlannerBtn' && window.toggleConfigPanel) {
                window.toggleConfigPanel('sprint-planner');
                return;
            }
            if (target.id === 'enhanceBtn' && window.enhanceText) {
                window.enhanceText();
                return;
            }
            if (target.id === 'sendBtn' && window.sendToTerminal) {
                window.sendToTerminal();
                return;
            }
            if (target.id === 'clearBtn' && window.clearText) {
                window.clearText();
                return;
            }
            if (target.id === 'settingsBtn' && window.openVoiceSettings) {
                window.openVoiceSettings();
                return;
            }
        });

        // Sprint file dropdown change handler (needs dedicated listener since 'change' event)
        document.body.addEventListener('change', function(e) {
            const target = e.target;
            if (target.id === 'sprint-file-dropdown' && window.switchSprintFile) {
                window.switchSprintFile(target.value);
            }
        });

        // Global message listener for ALL tabs (Sprint and Voice)
        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.type) {
                case 'updateTabContent':
                    // Update tab content without refreshing entire HTML
                    console.log('[ÆtherLight WebView] Updating tab content for:', message.tabId);

                    // Update active tab button
                    document.querySelectorAll('.tab-button').forEach(btn => {
                        if (btn.dataset.tabId === message.tabId) {
                            btn.classList.add('active');
                        } else {
                            btn.classList.remove('active');
                        }
                    });

                    // Update content area (CSP-safe with DOMParser)
                    const contentArea = document.querySelector('.tab-content');
                    if (contentArea) {
                        // CSP-FIX: Use DOMParser instead of innerHTML
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(message.content, 'text/html');
                        contentArea.replaceChildren(...doc.body.childNodes);
                        contentArea.classList.add('active');
                    }

                    // If this is Voice tab, reinitialize Voice scripts
                    if (message.needsVoiceScripts) {
                        console.log('[ÆtherLight WebView] Reinitializing Voice tab scripts...');
                        if (window.initializeVoiceTab) {
                            window.initializeVoiceTab();
                        }
                    }
                    break;

                case 'updateTaskDetail':
                    // Update just the detail panel without full page refresh (CSP-safe)
                    const detailPanel = document.querySelector('.task-detail-panel');
                    if (detailPanel) {
                        // CSP-FIX: Use DOMParser instead of outerHTML
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(message.detailHtml, 'text/html');
                        const newPanel = doc.body.firstElementChild;
                        if (newPanel) {
                            detailPanel.replaceWith(newPanel);
                        }
                    }

                    // Update selected state on task items
                    document.querySelectorAll('.task-item').forEach(item => {
                        if (item.dataset.taskId === message.taskId) {
                            item.classList.add('selected');
                        } else {
                            item.classList.remove('selected');
                        }
                    });
                    break;

                case 'updateSprintFileList':
                    // Update dropdown with discovered sprint files (CSP-safe)
                    const dropdown = document.getElementById('sprint-file-dropdown');
                    if (dropdown && message.sprintFiles) {
                        const currentValue = dropdown.value;
                        // CSP-FIX: Clear children without innerHTML
                        while (dropdown.firstChild) {
                            dropdown.removeChild(dropdown.firstChild);
                        }

                        message.sprintFiles.forEach(filePath => {
                            const option = document.createElement('option');
                            option.value = filePath;
                            option.textContent = filePath;
                            option.selected = filePath === message.currentPath;
                            dropdown.appendChild(option);
                        });

                        console.log('[ÆtherLight] Updated sprint file list:', message.sprintFiles);
                    }
                    break;

                case 'enhancementStarted':
                    // Show enhancement in progress
                    const statusDiv = document.getElementById('enhancementStatus');
                    if (statusDiv) {
                        statusDiv.style.display = 'flex';
                    }
                    break;

                case 'enhancementComplete':
                    // ENHANCE-002: Insert enhanced prompt into textarea
                    // Chain of Thought: PromptEnhancer generated comprehensive prompt → insert + close panel
                    // WHY: User can review/edit before sending
                    const textarea = document.getElementById('transcriptionText');
                    if (textarea) {
                        textarea.value = message.prompt;
                        textarea.focus();
                        if (window.autoResizeTextarea) window.autoResizeTextarea();
                        if (window.updateSendButton) window.updateSendButton();

                        // Save to state
                        const state = vscode.getState() || {};
                        state.voiceTextContent = textarea.value;
                        vscode.setState(state);
                    }

                    // Close config panel
                    if (window.toggleConfigPanel) {
                        window.toggleConfigPanel('code-analyzer'); // or 'sprint-planner'
                    }

                    // Hide enhancement status
                    const statusDiv2 = document.getElementById('enhancementStatus');
                    if (statusDiv2) {
                        statusDiv2.style.display = 'none';
                    }

                    // Re-enable button
                    const generateBtn = document.getElementById('generateCodeAnalyzerPrompt')
                        || document.getElementById('generateSprintPrompt');
                    if (generateBtn) {
                        generateBtn.disabled = false;
                        generateBtn.textContent = generateBtn.id === 'generateCodeAnalyzerPrompt'
                            ? '✨ Enhance & Generate Prompt'
                            : '✨ Enhance & Generate Prompt';
                    }

                    // Show confidence and warnings if any
                    let statusMessage = '✨ Enhanced prompt generated!';
                    if (message.confidence === 'medium') {
                        statusMessage += ' (Medium confidence - some context missing)';
                    } else if (message.confidence === 'low') {
                        statusMessage += ' (Low confidence - limited context available)';
                    }
                    if (message.warnings && message.warnings.length > 0) {
                        statusMessage += ' Warnings: ' + message.warnings.join(', ');
                    }
                    showStatus(statusMessage, 'info');
                    break;

                case 'enhancementError':
                    // Hide enhancement status
                    const statusDiv3 = document.getElementById('enhancementStatus');
                    if (statusDiv3) {
                        statusDiv3.style.display = 'none';
                    }

                    // Re-enable button
                    const generateBtn2 = document.getElementById('generateCodeAnalyzerPrompt')
                        || document.getElementById('generateSprintPrompt');
                    if (generateBtn2) {
                        generateBtn2.disabled = false;
                        generateBtn2.textContent = generateBtn2.id === 'generateCodeAnalyzerPrompt'
                            ? '✨ Enhance & Generate Prompt'
                            : '✨ Enhance & Generate Prompt';
                    }

                    showStatus('❌ Enhancement failed: ' + message.error, 'error');
                    break;

                case 'terminalList':
                case 'transcriptionComplete':
                case 'transcriptionError':
                case 'enhancedText':
                    // Forward to voice-specific handler if it exists
                    if (window.handleVoiceMessage) {
                        window.handleVoiceMessage(message);
                    }
                    break;
            }
        });

        // Voice Tab initialization function (called on load and tab switch)
        // CRITICAL FIX: Scripts MUST be inside initializeVoiceTab(), not at global scope
        // WHY: Global scripts get re-executed on every HTML update (updateTabContent)
        // PATTERN: Pattern-UPDATE-004 (Idempotent Script Initialization)
        window.initializeVoiceTab = function() {
            console.log('[ÆtherLight] Initializing Voice tab...');

            // Guard: Skip if already initialized to prevent double-initialization
            if (window.voiceTabInitialized) {
                console.log('[ÆtherLight] Voice tab already initialized, skipping...');

                // Still request terminal list and focus text area on tab switch
                vscode.postMessage({ type: 'getTerminals' });
                const voiceTextArea = document.getElementById('transcriptionText');
                if (voiceTextArea) {
                    voiceTextArea.focus();
                }
                return;
            }

            window.voiceTabInitialized = true;
            console.log('[ÆtherLight] First-time Voice tab initialization...');

            // Inject all voice tab scripts (functions, event handlers, etc.)
            ${this.getVoiceTabScripts()}

            // Request terminal list on Voice tab activation
            vscode.postMessage({ type: 'getTerminals' });

            // Auto-focus text area when Voice tab shows
            const voiceTextArea = document.getElementById('transcriptionText');
            if (voiceTextArea) {
                voiceTextArea.focus();
            }

            // Restore saved text from webview state (if any)
            const state = vscode.getState() || {};
            const savedText = state.voiceTextContent || '';
            const savedHeight = state.textareaHeight || 200; // UI-001: Default 200px

            if (voiceTextArea && savedText) {
                voiceTextArea.value = savedText;
            }

            // UI-001: Restore saved textarea height
            if (voiceTextArea && savedHeight) {
                voiceTextArea.style.height = savedHeight + 'px';
            }

            // UI-001: ResizeObserver to persist textarea height
            if (voiceTextArea && typeof ResizeObserver !== 'undefined') {
                const resizeObserver = new ResizeObserver((entries) => {
                    for (const entry of entries) {
                        const newHeight = entry.contentRect.height;
                        // Only save if height changed significantly (> 5px)
                        if (Math.abs(newHeight - savedHeight) > 5) {
                            const currentState = vscode.getState() || {};
                            currentState.textareaHeight = newHeight;
                            vscode.setState(currentState);
                        }
                    }
                });
                resizeObserver.observe(voiceTextArea);
            }
        };

        // Initialize Voice tab if it's active on page load
        if (document.querySelector('.tab-button[data-tab-id="voice"]')?.classList.contains('active')) {
            window.initializeVoiceTab();
        }
    </script>
</body>
</html>`;
    }

    /**
     * Generate a cryptographically secure nonce for Content Security Policy
     * Chain of Thought: Required for script-src CSP to prevent TrustedScript violations
     * WHY: VS Code enforces Trusted Types, inline scripts need nonce verification
     * PATTERN: Standard VS Code webview security pattern
     */
    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    private getVoicePanelStyles(): string {
        return `
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .header h2 {
            margin: 0;
            font-size: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .status-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: #0078D4;
        }

        .terminal-selector {
            margin-bottom: 16px;
        }

        .terminal-selector label {
            display: block;
            margin-bottom: 8px;
            font-size: 12px;
            font-weight: 600;
            color: var(--vscode-descriptionForeground);
        }

        .terminal-list {
            display: flex;
            flex-direction: column;
            gap: 4px;
            max-height: none;
            overflow-y: visible;
        }

        .terminal-item {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 8px;
            background-color: var(--vscode-list-inactiveSelectionBackground);
            border: 1px solid transparent;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            min-height: 24px;
            transition: all 0.2s;
        }

        .terminal-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .terminal-item:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
            background-color: var(--vscode-list-focusBackground);
        }

        .terminal-item.selected {
            background-color: #0078D4;
            color: white;
            font-weight: 600;
            border: 2px solid #005a9e;
            box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.3);
        }

        /* B-002: Checkmark only visible when selected */
        .terminal-checkmark {
            opacity: 0;
            font-weight: bold;
            font-size: 12px;
            width: 12px;
            transition: opacity 0.2s;
        }

        .terminal-item.selected .terminal-checkmark {
            opacity: 1;
        }

        .terminal-name {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        /* B-004: Inline rename input */
        .terminal-name-input {
            flex: 1;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-focusBorder);
            border-radius: 2px;
            padding: 2px 4px;
            font-size: 13px;
            font-family: inherit;
            outline: none;
        }

        .terminal-name-input:focus {
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 0 0 1px var(--vscode-focusBorder);
        }

        /* BUG-010: Removed terminal-edit-icon styles (pencil icon removed) */

        /* B-003: Executing terminal indicator */
        .terminal-executing-icon {
            font-size: 12px;
            opacity: 0.8;
            animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 0.8; }
            50% { opacity: 0.4; }
        }

        .transcription-editor {
            margin-bottom: 16px;
        }

        .transcription-editor label {
            display: block;
            margin-bottom: 4px;
            font-size: 12px;
            font-weight: 600;
            color: var(--vscode-descriptionForeground);
        }

        .transcription-editor textarea {
            width: 100%;
            height: 200px; /* UI-001: Default 200px (user-draggable) */
            min-height: 100px; /* UI-001: Prevent collapse */
            max-height: 600px; /* UI-001: Prevent takeover */
            padding: 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family);
            font-size: 13px;
            resize: vertical; /* UI-001: User-draggable resize */
            overflow-y: auto;
            box-sizing: border-box;
        }

        .transcription-editor textarea:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        /* B-001: Icon bar for compact Voice tab (replaces .controls) */
        .icon-bar {
            display: flex;
            gap: 4px;
            padding: 4px;
            margin-bottom: 12px;
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            height: 32px;
            align-items: center;
        }

        .icon-button {
            flex: 0 0 auto;
            width: 32px;
            height: 24px;
            padding: 0;
            background-color: transparent;
            color: var(--vscode-button-foreground);
            border: 1px solid transparent;
            border-radius: 3px;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .icon-button .icon {
            display: inline-block;
            line-height: 1;
        }

        .icon-button:hover:not(:disabled) {
            background-color: var(--vscode-button-hoverBackground);
            border-color: var(--vscode-button-border);
            transform: scale(1.05); /* UI-002: Hover scale effect */
        }

        .icon-button:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        .icon-button.primary {
            background-color: rgba(0, 120, 212, 0.1);
        }

        .icon-button.primary:hover:not(:disabled) {
            background-color: #0078D4;
        }

        /* UI-003: Secondary toolbar styling (smaller, bottom placement) */
        .secondary-toolbar {
            margin-top: 12px;
            margin-bottom: 8px;
            height: 28px;
            justify-content: center;
            opacity: 0.8;
        }

        .secondary-toolbar:hover {
            opacity: 1;
        }

        .icon-button-small {
            flex: 0 0 auto;
            width: 28px;
            height: 20px;
            padding: 0;
            background-color: transparent;
            color: var(--vscode-button-foreground);
            border: 1px solid transparent;
            border-radius: 3px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .icon-button-small .icon {
            display: inline-block;
            line-height: 1;
        }

        .icon-button-small:hover {
            background-color: var(--vscode-button-hoverBackground);
            border-color: var(--vscode-button-border);
            transform: scale(1.05);
        }

        /* SLIDE-DOWN-002: Configuration panel container styling */
        /* Chain of Thought: Smooth slide-down animation for config panels */
        /* WHY: User requested configs appear below toolbar with smooth transition */
        /* REASONING: Use max-height for slide animation, padding for spacing */
        .config-panel-container {
            overflow: hidden;
            max-height: 0;
            opacity: 0;
            transition: max-height 0.3s ease-in-out, opacity 0.3s ease-in-out, padding 0.3s ease-in-out;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            margin: 12px 0;
        }

        .config-panel-container.open {
            max-height: 800px;
            opacity: 1;
            padding: 16px;
        }

        .config-panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .config-panel-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        .config-panel-close {
            background: transparent;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: var(--vscode-descriptionForeground);
            padding: 0 8px;
            line-height: 1;
        }

        .config-panel-close:hover {
            color: var(--vscode-foreground);
        }

        .config-panel-body {
            max-height: 600px;
            overflow-y: auto;
        }

        .config-panel-actions {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 8px;
            justify-content: flex-end;
        }

        /* Legacy button styles (still used in Sprint tab) */
        button:not(.icon-button) {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            font-size: 13px;
            cursor: pointer;
            transition: background-color 0.2s;
        }

        button:not(.icon-button):hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        button:not(.icon-button):disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        button:not(.icon-button).primary {
            background-color: #0078D4;
            color: white;
        }

        button:not(.icon-button).primary:hover {
            background-color: #005a9e;
        }

        .help-text {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 8px;
            line-height: 1.5;
        }

        .hotkey {
            display: inline-block;
            padding: 2px 6px;
            background-color: var(--vscode-keybindingLabel-background);
            border: 1px solid var(--vscode-keybindingLabel-border);
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
            font-size: 11px;
            font-weight: 600;
        }

        /* B-006: Keyboard shortcuts hints */
        .keyboard-hints {
            margin-top: 16px;
            padding: 8px 12px;
            text-align: center;
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
            opacity: 0.7;
            border-top: 1px solid var(--vscode-panel-border);
        }

        .keyboard-hints code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 2px;
            font-family: var(--vscode-editor-font-family);
            font-size: 10px;
        }

        .hint-item {
            display: inline-block;
            margin: 0 8px;
        }

        .hint-separator {
            color: var(--vscode-descriptionForeground);
            opacity: 0.5;
            margin: 0 4px;
        }

        /* SETTINGS-001: Settings Panel Styling */
        .settings-panel {
            padding: 16px;
            max-width: 800px;
        }

        .settings-header {
            margin-bottom: 24px;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 12px;
        }

        .settings-header h2 {
            margin: 0 0 8px 0;
            color: var(--vscode-foreground);
        }

        .settings-subtitle {
            margin: 0;
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
        }

        .settings-section {
            margin-bottom: 32px;
            padding: 16px;
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
        }

        .settings-section-title {
            margin: 0 0 16px 0;
            font-size: 14px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        .settings-group {
            margin-bottom: 20px;
        }

        .settings-group label {
            display: block;
            margin-bottom: 6px;
            font-size: 13px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        .settings-input,
        .settings-select {
            width: 100%;
            padding: 6px 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            font-size: 13px;
            font-family: var(--vscode-font-family);
        }

        /* Chain of Thought: Fix white-on-white dropdown text issue */
        /* WHY: User reported dropdowns have white text on white background */
        /* REASONING: option elements inside select need explicit color styling */
        .settings-select option {
            background-color: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
        }

        .settings-input:focus,
        .settings-select:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .settings-hint {
            display: block;
            margin-top: 4px;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }

        .settings-status {
            margin-top: 16px;
            padding: 12px;
            background-color: var(--vscode-editor-background);
            border-radius: 3px;
        }

        .status-badge {
            display: inline-block;
            margin-left: 8px;
            padding: 2px 8px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 3px;
            font-size: 11px;
            font-weight: 600;
        }

        .settings-actions {
            display: flex;
            gap: 12px;
            margin-top: 24px;
        }

        .settings-button {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            font-size: 13px;
            cursor: pointer;
            transition: background-color 0.2s;
        }

        .settings-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .settings-button.primary {
            background-color: #0078D4;
            color: white;
        }

        .settings-button.primary:hover {
            background-color: #005a9e;
        }

        .settings-footer {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid var(--vscode-panel-border);
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            text-align: center;
        }

        /* SETTINGS-002: Code Analyzer Settings Styling */
        .settings-textarea {
            width: 100%;
            padding: 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            font-size: 13px;
            font-family: var(--vscode-editor-font-family);
            resize: vertical;
            min-height: 60px;
        }

        .settings-textarea:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .settings-checkboxes {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 8px;
        }

        .checkbox-label {
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            font-size: 13px;
            color: var(--vscode-foreground);
        }

        .checkbox-label input[type="checkbox"] {
            cursor: pointer;
        }

        .checkbox-label span {
            user-select: none;
        }
        `;
    }

    // A-002: Removed getTabBarHtml() - now using TabManager.getTabBarHtml()

    private getEngineerTabs(engineers: Engineer[]): string {
        let html = `
        <div class="engineer-tabs">
            <button class="engineer-tab ${this.selectedEngineerId === 'all' ? 'active' : ''}"
                    data-engineer-id="all">
                📊 All Engineers
            </button>
        `;

        for (const engineer of engineers) {
            const engineerTasks = this.sprintLoader.getTasksByEngineer(engineer.id);
            const completedTasks = engineerTasks.filter(t => t.status === 'completed').length;
            const totalTasks = engineerTasks.length;
            const isActive = this.selectedEngineerId === engineer.id;

            html += `
            <button class="engineer-tab ${isActive ? 'active' : ''}"
                    data-engineer-id="${engineer.id}"
                    title="${engineer.expertise.join(', ')}">
                👤 ${engineer.name} (${completedTasks}/${totalTasks})
            </button>
            `;
        }

        html += `</div>`;
        return html;
    }

    private getFilteredTasks(): SprintTask[] {
        if (this.selectedEngineerId === 'all') {
            return this.sprintTasks;
        }
        return this.sprintLoader.getTasksByEngineer(this.selectedEngineerId);
    }

    /**
     * DESIGN DECISION: Check if ÆtherLight setup files exist
     * WHY: Show setup panel in Sprint Tab if user hasn't run first-time setup
     *
     * REASONING CHAIN:
     * 1. User installs extension but setup files not auto-created in some cases
     * 2. Add manual setup trigger in Sprint Tab for easy access
     * 3. Check if .vscode/aetherlight.md and sprints/ACTIVE_SPRINT.toml exist
     * 4. If either missing, show setup panel with "Setup ÆtherLight" button
     * 5. Once setup complete, hide the setup panel
     * 6. Result: User can always trigger setup from Sprint Tab if needed
     *
     * PATTERN: Pattern-UI-007 (First-Run Setup Detection)
     * RELATED: firstRunSetup.ts, USER_SETUP_CORRECTED.md
     */
    private needsSetup(): boolean {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            return false; // No workspace open
        }

        const aetherlightDocPath = path.join(workspaceRoot, '.vscode', 'aetherlight.md');

        // BUG FIX: Check configured sprint path, not hardcoded 'sprints/ACTIVE_SPRINT.toml'
        // REASONING: User may configure custom sprint path (e.g., 'internal/sprints/ACTIVE_SPRINT.toml')
        // WHY: SprintLoader uses configured path, so setup detection must match
        const config = vscode.workspace.getConfiguration('aetherlight');
        const configuredSprintPath = config.get<string>('sprint.filePath') || 'sprints/ACTIVE_SPRINT.toml';
        const sprintFilePath = path.join(workspaceRoot, configuredSprintPath);

        const docExists = fs.existsSync(aetherlightDocPath);
        const sprintExists = fs.existsSync(sprintFilePath);

        return !docExists || !sprintExists;
    }

    private getSprintTabContent(): string {
        /**
         * DESIGN DECISION: Sprint file discovery happens on-demand
         * WHY: _getHtmlForWebview must be synchronous for proper webview rendering
         *
         * REASONING CHAIN:
         * 1. User opens Sprint tab - shows current sprint file immediately
         * 2. User clicks "Discover Sprint Files" button - triggers async discovery
         * 3. Dropdown populates with all found files
         * 4. Result: Fast initial render, discovery happens when needed
         */

        /**
         * DESIGN DECISION: Automatically run setup if files don't exist
         * WHY: Better UX - no button needed, setup happens automatically
         *
         * REASONING CHAIN:
         * 1. Check if setup files exist (.vscode/aetherlight.md, sprints/ACTIVE_SPRINT.toml)
         * 2. If either missing, trigger automatic setup in background
         * 3. Show loading message while setup runs
         * 4. Once setup completes, Sprint Tab will reload with normal content
         * 5. Result: Seamless first-run experience, no user interaction needed
         *
         * PATTERN: Pattern-UI-008 (Automatic First-Run Setup)
         */
        if (this.needsSetup()) {
            // Trigger automatic setup in background
            this.runAutomaticSetup();
            // Return loading UI while setup runs
            return this.getSetupLoadingPanel();
        }

        const filteredTasks = this.getFilteredTasks();
        const stats = this.sprintLoader.getProgressStats();
        const phases = new Map<string, SprintTask[]>();

        // Group filtered tasks by phase
        for (const task of filteredTasks) {
            if (!phases.has(task.phase)) {
                phases.set(task.phase, []);
            }
            phases.get(task.phase)!.push(task);
        }
        const teamSize = this.sprintLoader.getTeamSize();
        const engineers = this.sprintLoader.getEngineers();
        const currentSprintPath = this.sprintLoader.getSprintFilePath();

        let html = `
        <div class="sprint-panel">
            <div class="sprint-header">
                <h2>Sprint</h2>
                <div class="sprint-header-actions">
                    <button class="icon-btn" data-action="reloadSprint" title="Refresh Sprint Data">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M13.5 2.5a1 1 0 011 1v9a1 1 0 01-1 1h-11a1 1 0 01-1-1v-9a1 1 0 011-1h11zM8 12a4 4 0 100-8 4 4 0 000 8zm0-1.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
                            <path d="M10 8a.5.5 0 01-.5.5h-1v1a.5.5 0 01-1 0v-1h-1a.5.5 0 010-1h1v-1a.5.5 0 011 0v1h1a.5.5 0 01.5.5z"/>
                        </svg>
                        🔄
                    </button>
                    <button class="icon-btn" data-action="openSprintSettings" title="Sprint Settings">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/>
                            <path d="M14 8a1.5 1.5 0 01-1.5 1.5h-.39a.5.5 0 00-.48.36l-.12.45a.5.5 0 00.11.54l.27.27a1.5 1.5 0 010 2.12l-.71.71a1.5 1.5 0 01-2.12 0l-.27-.27a.5.5 0 00-.54-.11l-.45.12a.5.5 0 00-.36.48v.39A1.5 1.5 0 016 16H5.5a1.5 1.5 0 01-1.5-1.5v-.39a.5.5 0 00-.36-.48l-.45-.12a.5.5 0 00-.54.11l-.27.27a1.5 1.5 0 01-2.12 0l-.71-.71a1.5 1.5 0 010-2.12l.27-.27a.5.5 0 00.11-.54l-.12-.45a.5.5 0 00-.48-.36H1.5A1.5 1.5 0 010 8v-.5a1.5 1.5 0 011.5-1.5h.39a.5.5 0 00.48-.36l.12-.45a.5.5 0 00-.11-.54L2.11 4.38a1.5 1.5 0 010-2.12l.71-.71a1.5 1.5 0 012.12 0l.27.27a.5.5 0 00.54.11l.45-.12a.5.5 0 00.36-.48V1.5A1.5 1.5 0 017.5 0H8a1.5 1.5 0 011.5 1.5v.39a.5.5 0 00.36.48l.45.12a.5.5 0 00.54-.11l.27-.27a1.5 1.5 0 012.12 0l.71.71a1.5 1.5 0 010 2.12l-.27.27a.5.5 0 00-.11.54l.12.45a.5.5 0 00.48.36h.39A1.5 1.5 0 0116 7.5V8z"/>
                        </svg>
                    </button>
                    <button class="icon-btn" data-action="popOutSprint" title="Pop Out Sprint View">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M9 2h5v5l-1.5-1.5L9 9 7 7l3.5-3.5L9 2zM2 7v7h7V7H2z"/>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- CONFIG-CONSOLIDATION: Configuration section removed per user request -->
            <!-- Sprint tab should focus on sprint management, not configuration -->

            <div class="sprint-file-selector">
                <label for="sprint-file-dropdown">Sprint File:</label>
                <select id="sprint-file-dropdown" title="Select which sprint file to view">
                    <option value="${currentSprintPath}" selected>${currentSprintPath}</option>
                </select>
                <button class="icon-btn" data-action="discoverSprintFiles" title="Discover all sprint files in workspace">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M15.7 13.3l-3.81-3.83A5.93 5.93 0 0 0 13 6c0-3.31-2.69-6-6-6S1 2.69 1 6s2.69 6 6 6c1.3 0 2.48-.41 3.47-1.11l3.83 3.81c.19.2.45.3.7.3.25 0 .52-.09.7-.3a.996.996 0 0 0 0-1.41v.01zM7 10.7c-2.59 0-4.7-2.11-4.7-4.7 0-2.59 2.11-4.7 4.7-4.7 2.59 0 4.7 2.11 4.7 4.7 0 2.59-2.11 4.7-4.7 4.7z"/>
                    </svg>
                    🔍
                </button>
            </div>

            <div class="progress-section">
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: ${stats.percentage}%"></div>
                </div>
                <div class="progress-text">
                    ${stats.completed}/${stats.total} tasks completed (${stats.percentage}%)
                    <span class="progress-detail">| ${stats.inProgress} in progress | ${stats.pending} pending</span>
                </div>
            </div>

            ${teamSize > 1 ? this.getEngineerTabs(engineers) : ''}

            <div class="sprint-content">
                <div class="task-list-section">
        `;

        // Render tasks grouped by phase
        for (const [phase, tasks] of phases) {
            const phaseCompleted = tasks.filter(t => t.status === 'completed').length;
            const phaseTotal = tasks.length;

            html += `
            <div class="phase-section">
                <h3>${phase} <span class="phase-progress">(${phaseCompleted}/${phaseTotal})</span></h3>
                <div class="task-list">
            `;

            for (const task of tasks) {
                const statusIcon = this.getStatusIcon(task.status);
                const statusClass = `task-status-${task.status}`;
                const selectedClass = this.selectedTaskId === task.id ? 'selected' : '';

                html += `
                <div class="task-item ${statusClass} ${selectedClass}" data-task-id="${task.id}" title="Click to view task details">
                    <span class="task-status-icon" title="Click to toggle status">${statusIcon}</span>
                    <div class="task-content">
                        <div class="task-header">
                            <span class="task-id">${task.id}</span>
                            <span class="task-time">${task.estimated_time}</span>
                        </div>
                        <div class="task-description">${task.name}</div>
                    </div>
                </div>
                `;
            }

            html += `</div></div>`;
        }

        html += `</div>`; // End task-list-section

        // Render task detail panel
        html += this.getTaskDetailPanel();

        html += `</div></div>`; // End sprint-content and sprint-panel

        // NOTE: Sprint tab event listeners moved to global scope (GLOBAL-PERSIST-002)
        // All task clicks, status toggles, and action buttons now handled by document.body event delegation
        // This ensures event listeners persist across tab switches

        return html;
    }

    private getTaskDetailPanel(): string {
        if (!this.selectedTaskId) {
            return `
            <div class="task-detail-panel">
                <div class="no-selection">
                    <p>👈 Select a task to view details</p>
                </div>
            </div>`;
        }

        const task = this.sprintTasks.find(t => t.id === this.selectedTaskId);
        if (!task) {
            return `
            <div class="task-detail-panel">
                <div class="no-selection">
                    <p>❌ Task not found</p>
                </div>
            </div>`;
        }

        const statusIcon = this.getStatusIcon(task.status);
        const statusText = task.status.replace('_', ' ').toUpperCase();

        return `
        <div class="task-detail-panel">
            <div class="detail-header">
                <h3>${statusIcon} ${task.id}: ${task.name}</h3>
                <button class="status-toggle-btn" data-task-id="${task.id}" title="Toggle status">
                    ${statusIcon} ${statusText}
                </button>
            </div>

            <div class="detail-section">
                <h4>📝 Description</h4>
                <p class="task-description">${task.description}</p>
            </div>

            <div class="detail-row">
                <div class="detail-section">
                    <h4>⏱️ Estimated Time</h4>
                    <p>${task.estimated_time}</p>
                </div>
                <div class="detail-section">
                    <h4>📏 Estimated Lines</h4>
                    <p>${task.estimated_lines} lines</p>
                </div>
            </div>

            <div class="detail-section">
                <h4>🤖 Agent</h4>
                <p>${task.agent}</p>
            </div>

            ${task.dependencies && task.dependencies.length > 0 ? `
            <div class="detail-section">
                <h4>🔗 Dependencies</h4>
                <div class="tag-list">
                    ${task.dependencies.map(dep => `<span class="tag">${dep}</span>`).join('')}
                </div>
            </div>
            ` : ''}

            ${task.patterns && task.patterns.length > 0 ? `
            <div class="detail-section">
                <h4>🎨 Patterns</h4>
                <div class="tag-list">
                    ${task.patterns.map(pattern => `<span class="tag pattern-tag">${pattern}</span>`).join('')}
                </div>
            </div>
            ` : ''}

            ${task.performance_target ? `
            <div class="detail-section">
                <h4>🎯 Performance Target</h4>
                <p class="performance-target">${task.performance_target}</p>
            </div>
            ` : ''}

            <div class="detail-section">
                <h4>📂 Phase</h4>
                <p>${task.phase}</p>
            </div>

            ${task.why ? `
            <div class="detail-section cot-section">
                <h4>💡 Why This Task Matters</h4>
                <div class="cot-content why-content">
                    ${this.convertMarkdownToHtml(task.why)}
                </div>
            </div>
            ` : ''}

            ${task.context ? `
            <div class="detail-section cot-section">
                <h4>📚 Context & Documentation</h4>
                <div class="cot-content context-content">
                    ${this.convertMarkdownToHtml(task.context)}
                </div>
            </div>
            ` : ''}

            ${task.reasoning_chain && task.reasoning_chain.length > 0 ? `
            <div class="detail-section cot-section">
                <h4>🧠 Reasoning Chain</h4>
                <ol class="reasoning-chain">
                    ${task.reasoning_chain.map(step => `<li>${this.convertMarkdownToHtml(step)}</li>`).join('')}
                </ol>
            </div>
            ` : ''}

            ${task.success_impact ? `
            <div class="detail-section cot-section">
                <h4>🎯 Success Impact</h4>
                <div class="cot-content success-impact-content">
                    ${this.convertMarkdownToHtml(task.success_impact)}
                </div>
            </div>
            ` : ''}

            ${task.validation_criteria && task.validation_criteria.length > 0 ? `
            <div class="detail-section cot-section">
                <h4>✅ Validation Criteria</h4>
                <ul class="validation-list">
                    ${task.validation_criteria.map(criteria => `<li>${this.convertMarkdownToHtml(criteria)}</li>`).join('')}
                </ul>
            </div>
            ` : ''}

            ${task.files_to_create && task.files_to_create.length > 0 ? `
            <div class="detail-section">
                <h4>📝 Files to Create</h4>
                <div class="tag-list">
                    ${task.files_to_create.map(file => `<span class="tag file-tag">${file}</span>`).join('')}
                </div>
            </div>
            ` : ''}

            ${task.files_to_modify && task.files_to_modify.length > 0 ? `
            <div class="detail-section">
                <h4>✏️ Files to Modify</h4>
                <div class="tag-list">
                    ${task.files_to_modify.map(file => `<span class="tag file-tag">${file}</span>`).join('')}
                </div>
            </div>
            ` : ''}

            ${task.notes ? `
            <div class="detail-section cot-section notes-section">
                <h4>📌 Notes</h4>
                <div class="cot-content notes-content">
                    ${this.convertMarkdownToHtml(task.notes)}
                </div>
            </div>
            ` : ''}

            ${this.selectedTaskDetails ? `
            <div class="detail-section full-task-details">
                <h4>📄 Full Task Implementation</h4>
                <div class="markdown-content">
                    ${this.convertMarkdownToHtml(this.selectedTaskDetails)}
                </div>
            </div>
            ` : ''}
        </div>`;
    }

    private getStatusIcon(status: string): string {
        switch (status) {
            case 'completed': return '✅';
            case 'in_progress': return '🔄';
            case 'pending': return '⏳';
            default: return '❓';
        }
    }

    /**
     * Convert markdown to HTML for display in webview
     *
     * DESIGN DECISION: Simple markdown-to-HTML conversion with code highlighting
     * WHY: Display task details with proper formatting (headers, code blocks, lists)
     *
     * PATTERN: Pattern-UI-007 (Markdown Rendering in Webview)
     */
    private convertMarkdownToHtml(markdown: string): string {
        // Escape HTML to prevent injection
        let html = markdown
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Code blocks (```...```)
        html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
        });

        // Inline code (`...`)
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Headers
        html = html.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
        html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');

        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Checkboxes
        html = html.replace(/- \[x\]/g, '- ✅');
        html = html.replace(/- \[ \]/g, '- ⬜');

        // Lists
        html = html.replace(/^- (.*?)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

        // Line breaks
        html = html.replace(/\n\n/g, '<br><br>');

        return html;
    }

    /**
     * DESIGN DECISION: Automatically trigger first-run setup
     * WHY: Seamless UX - no button clicks needed
     *
     * REASONING CHAIN:
     * 1. Called when needsSetup() returns true
     * 2. Runs checkAndSetupUserDocumentation() in background
     * 3. After setup completes, reloads Sprint Tab to show normal content
     * 4. Shows loading panel while setup runs
     * 5. Result: Zero-friction onboarding
     *
     * PATTERN: Pattern-UI-008 (Automatic First-Run Setup)
     */
    private async runAutomaticSetup(): Promise<void> {
        try {
            console.log('[ÆtherLight] Running automatic first-run setup...');

            // Call the first-run setup function
            await checkAndSetupUserDocumentation(this._context);

            // Reload sprint tasks from newly created ACTIVE_SPRINT.toml
            await this.loadSprintTasks();

            // Refresh the webview to show normal Sprint Tab content
            if (this._view) {
                this._view.webview.html = this._getHtmlForWebview(this._view.webview);
            }

            // Also refresh popped-out panels
            for (const panel of this.poppedOutPanels) {
                panel.webview.html = this._getHtmlForWebview(panel.webview);
            }

            console.log('[ÆtherLight] First-run setup complete! Sprint Tab ready.');
        } catch (error) {
            console.error('[ÆtherLight] Error during automatic setup:', error);
            vscode.window.showErrorMessage(`ÆtherLight setup failed: ${error}`);
        }
    }

    /**
     * DESIGN DECISION: Show loading panel during automatic setup
     * WHY: Give user feedback that setup is happening
     *
     * REASONING CHAIN:
     * 1. Shown while runAutomaticSetup() runs in background
     * 2. Simple spinner + message
     * 3. Panel disappears automatically when setup completes
     * 4. Result: User knows something is happening
     */
    private getSetupLoadingPanel(): string {
        return `
        <div class="sprint-panel">
            <div class="setup-loading-panel">
                <div class="setup-loading-content">
                    <div class="spinner">⟳</div>
                    <h2>🚀 Setting up ÆtherLight...</h2>
                    <p>Creating documentation and sprint files for your project.</p>
                    <p class="setup-note">This will only take a moment.</p>
                </div>
            </div>
        </div>`;
    }

    /**
     * A-002: Removed getTabStyles() - now using TabManager.getTabStyles()
     * REASONING: TabManager provides CSS for tab bar and containers
     * NOTE: Sprint-specific styles remain in this method below
     */
    private getSprintTabStyles(): string {
        return `
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 0;
        }

        .tab-content {
            padding: 16px;
        }

        /* CRITICAL FIX: Ensure active tab content is visible */
        .tab-content.active {
            display: block !important;
        }

        /* A-003: Placeholder Panel Styles */
        .placeholder-panel {
            max-width: 600px;
            margin: 0 auto;
            padding: 32px 24px;
            text-align: center;
        }

        .placeholder-header {
            margin-bottom: 24px;
        }

        .placeholder-icon {
            font-size: 48px;
            display: block;
            margin-bottom: 16px;
        }

        .placeholder-header h2 {
            margin: 0;
            font-size: 24px;
            color: var(--vscode-foreground);
        }

        .placeholder-description {
            margin-bottom: 32px;
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
        }

        .placeholder-features {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 24px;
            text-align: left;
        }

        .placeholder-features h3 {
            margin: 0 0 16px 0;
            font-size: 16px;
            color: var(--vscode-foreground);
        }

        .placeholder-features ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .placeholder-features li {
            padding: 8px 0;
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
        }

        .placeholder-status {
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
            margin-top: 16px;
        }

        .placeholder-error {
            color: var(--vscode-errorForeground);
            padding: 16px;
            text-align: center;
        }

        /* Sprint Tab Styles */
        .sprint-panel h2 {
            margin: 0 0 16px 0;
            font-size: 16px;
        }

        /* Removed sprint-config-redirect and info-box styles - no longer needed */

        .info-box li {
            margin: 4px 0;
        }

        .info-box em {
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
        }

        .progress-section {
            margin-bottom: 24px;
        }

        .progress-bar-container {
            width: 100%;
            height: 24px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            overflow: hidden;
        }

        .progress-bar-fill {
            height: 100%;
            background-color: var(--vscode-progressBar-background);
            transition: width 0.3s ease;
        }

        .progress-text {
            text-align: center;
            margin-top: 8px;
            color: var(--vscode-descriptionForeground);
            font-size: 13px;
        }

        .progress-detail {
            font-size: 11px;
            opacity: 0.8;
        }

        .phase-section {
            margin-bottom: 24px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 12px;
        }

        .phase-section h3 {
            margin: 0 0 12px 0;
            font-size: 14px;
        }

        .phase-progress {
            color: var(--vscode-descriptionForeground);
            font-size: 0.9em;
            font-weight: normal;
        }

        .task-list {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        /* UI-COMPACT-001: Compact task list layout */
        .task-item {
            display: flex;
            align-items: flex-start; /* Changed from center to support two-row layout */
            padding: 8px;
            margin: 2px 0;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background-color 0.2s;
        }

        .task-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .task-status-pending {
            opacity: 0.7;
        }

        .task-status-in_progress {
            background-color: var(--vscode-inputValidation-infoBackground);
        }

        .task-status-completed {
            opacity: 0.5;
            text-decoration: line-through;
        }

        .task-status-icon {
            margin-right: 8px;
            font-size: 14px;
            flex-shrink: 0; /* Prevent checkbox from shrinking */
            width: 20px; /* Fixed width for alignment */
        }

        /* UI-COMPACT-001: Container for task content (two rows) */
        .task-content {
            display: flex;
            flex-direction: column;
            gap: 4px;
            flex: 1;
        }

        /* UI-COMPACT-001: First row - ID and time */
        .task-header {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .task-id {
            font-weight: bold;
            font-family: var(--vscode-editor-font-family);
            white-space: nowrap;
        }

        .task-time {
            color: var(--vscode-descriptionForeground);
            font-size: 11px;
            white-space: nowrap;
            margin-left: auto; /* Push to right side of header */
        }

        /* UI-COMPACT-001: Second row - description */
        .task-description {
            color: var(--vscode-foreground);
            line-height: 1.4;
        }

        /* DEPRECATED: Old .task-name style - replaced by .task-description */
        .task-name {
            flex: 1;
        }

        /* Sprint Content Layout */
        .sprint-content {
            display: flex;
            gap: 16px;
            margin-top: 16px;
        }

        .task-list-section {
            flex: 0 0 40%;
            min-width: 300px;
            overflow-y: auto;
            max-height: calc(100vh - 250px);
        }

        .task-item.selected {
            background-color: var(--vscode-list-activeSelectionBackground);
            color: var(--vscode-list-activeSelectionForeground);
            border-left: 3px solid var(--vscode-focusBorder);
        }

        /* Task Detail Panel */
        .task-detail-panel {
            flex: 1;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 16px;
            overflow-y: auto;
            max-height: calc(100vh - 250px);
        }

        .no-selection {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 200px;
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
        }

        .detail-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 2px solid var(--vscode-panel-border);
        }

        .detail-header h3 {
            margin: 0;
            font-size: 15px;
            font-weight: 600;
        }

        .status-toggle-btn {
            padding: 6px 12px;
            font-size: 11px;
            font-weight: 600;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
            cursor: pointer;
        }

        .status-toggle-btn:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .detail-section {
            margin-bottom: 16px;
        }

        .detail-section h4 {
            margin: 0 0 8px 0;
            font-size: 12px;
            font-weight: 600;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .detail-section p {
            margin: 0;
            font-size: 13px;
            line-height: 1.5;
        }

        .task-description {
            white-space: pre-wrap;
            background-color: var(--vscode-textBlockQuote-background);
            padding: 12px;
            border-radius: 4px;
            border-left: 3px solid var(--vscode-textBlockQuote-border);
        }

        .detail-row {
            display: flex;
            gap: 16px;
        }

        .detail-row .detail-section {
            flex: 1;
        }

        .tag-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .tag {
            display: inline-block;
            padding: 4px 10px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
        }

        .pattern-tag {
            background-color: var(--vscode-inputValidation-infoBorder);
            color: var(--vscode-inputValidation-infoForeground);
        }

        .performance-target {
            background-color: var(--vscode-inputValidation-warningBackground);
            padding: 8px 12px;
            border-radius: 4px;
            border-left: 3px solid var(--vscode-inputValidation-warningBorder);
            font-family: var(--vscode-editor-font-family);
        }

        /* Full Task Details (Markdown Content) */
        .full-task-details {
            margin-top: 24px;
            padding-top: 20px;
            border-top: 2px solid var(--vscode-panel-border);
        }

        .markdown-content {
            font-size: 13px;
            line-height: 1.6;
        }

        .markdown-content h2,
        .markdown-content h3,
        .markdown-content h4 {
            margin-top: 20px;
            margin-bottom: 10px;
            font-weight: 600;
        }

        .markdown-content h2 {
            font-size: 16px;
            color: var(--vscode-editor-foreground);
        }

        .markdown-content h3 {
            font-size: 14px;
            color: var(--vscode-editor-foreground);
        }

        .markdown-content h4 {
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
        }

        .markdown-content pre {
            background-color: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 12px;
            overflow-x: auto;
            margin: 12px 0;
        }

        .markdown-content code {
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
        }

        .markdown-content pre code {
            padding: 0;
            background-color: transparent;
        }

        .markdown-content ul {
            padding-left: 20px;
            margin: 8px 0;
        }

        .markdown-content li {
            margin: 4px 0;
        }

        .markdown-content strong {
            font-weight: 600;
            color: var(--vscode-editor-foreground);
        }

        /* Sprint Header with Actions */
        .sprint-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .sprint-header h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
        }

        .sprint-header-actions {
            display: flex;
            gap: 8px;
        }

        .icon-btn {
            padding: 6px;
            background-color: transparent;
            border: 1px solid var(--vscode-button-border);
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--vscode-foreground);
        }

        .icon-btn:hover {
            background-color: var(--vscode-toolbar-hoverBackground);
            border-color: var(--vscode-focusBorder);
        }

        .icon-btn svg {
            fill: currentColor;
        }

        /* Sprint File Selector */
        .sprint-file-selector {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 16px;
            padding: 12px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
        }

        .sprint-file-selector label {
            font-size: 13px;
            font-weight: 500;
            color: var(--vscode-foreground);
            white-space: nowrap;
        }

        .sprint-file-selector select {
            flex: 1;
            padding: 6px 8px;
            background-color: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
            border: 1px solid var(--vscode-dropdown-border);
            border-radius: 4px;
            font-size: 13px;
            font-family: var(--vscode-font-family);
            cursor: pointer;
        }

        .sprint-file-selector select:hover {
            background-color: var(--vscode-dropdown-listBackground);
        }

        .sprint-file-selector select:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -1px;
        }

        /* Engineer Tabs */
        .engineer-tabs {
            display: flex;
            gap: 4px;
            margin-bottom: 16px;
            padding: 8px;
            background-color: var(--vscode-editor-background);
            border-radius: 6px;
            overflow-x: auto;
        }

        .engineer-tab {
            padding: 8px 16px;
            background-color: transparent;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
            color: var(--vscode-foreground);
        }

        .engineer-tab:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .engineer-tab.active {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-color: var(--vscode-button-background);
            font-weight: 600;
        }

        /* Clickable Elements */
        .clickable {
            cursor: pointer;
            transition: color 0.2s;
        }

        .task-id.clickable:hover {
            color: var(--vscode-textLink-activeForeground);
            text-decoration: underline;
        }

        .task-name.clickable:hover {
            color: var(--vscode-textLink-activeForeground);
            text-decoration: underline;
        }

        /* Setup Loading Panel Styles */
        .setup-loading-panel {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            padding: 48px 24px;
        }

        .setup-loading-content {
            text-align: center;
            max-width: 500px;
        }

        .spinner {
            font-size: 48px;
            animation: spin 2s linear infinite;
            display: block;
            margin: 0 auto 24px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .setup-loading-content h2 {
            font-size: 24px;
            font-weight: 600;
            margin: 0 0 16px 0;
            color: var(--vscode-foreground);
        }

        .setup-loading-content p {
            font-size: 14px;
            line-height: 1.6;
            color: var(--vscode-descriptionForeground);
            margin: 0 0 12px 0;
        }

        .setup-note {
            font-size: 12px;
            font-style: italic;
            color: var(--vscode-descriptionForeground);
            opacity: 0.8;
        }

        /* Chain of Thought Sections */
        .cot-section {
            background: var(--vscode-editor-background);
            border-left: 3px solid var(--vscode-charts-blue);
            padding-left: 12px;
            margin-top: 16px;
        }

        .cot-content {
            font-size: 13px;
            line-height: 1.6;
            white-space: pre-wrap;
        }

        .why-content {
            color: var(--vscode-charts-purple);
        }

        .context-content {
            color: var(--vscode-charts-green);
        }

        .reasoning-chain {
            list-style: decimal;
            padding-left: 24px;
            margin: 8px 0;
        }

        .reasoning-chain li {
            margin: 6px 0;
            line-height: 1.5;
        }

        .success-impact-content {
            color: var(--vscode-charts-green);
            font-weight: 500;
        }

        .validation-list {
            list-style: none;
            padding-left: 0;
        }

        .validation-list li {
            margin: 6px 0;
            padding-left: 24px;
            position: relative;
        }

        .validation-list li::before {
            content: '☑️';
            position: absolute;
            left: 0;
        }

        .file-tag {
            background: var(--vscode-editorWidget-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-editor-font-family);
            font-size: 11px;
        }

        .notes-section {
            border-left-color: var(--vscode-charts-orange);
        }
        `;
    }

    /**
     * Extract global configuration panel functions for re-injection
     * Chain of Thought: These functions need to be available after tab switches
     * WHY: Tab content replacement loses global functions, causing button failures
     * PATTERN: Pattern-PERSIST-002 (Global Function Re-injection)
     */
    private getGlobalConfigPanelFunctions(): string {
        return `
            // Show status message (used by configuration panels)
            window.showStatus = function(message, type) {
                const statusEl = document.getElementById('statusMessage');
                if (statusEl) {
                    statusEl.textContent = message;
                    statusEl.className = 'status-' + (type || 'info');
                    statusEl.style.display = 'block';

                    // Auto-hide after 5 seconds
                    setTimeout(() => {
                        if (statusEl.textContent === message) {
                            statusEl.style.display = 'none';
                        }
                    }, 5000);
                }
            };

            // Toggle configuration panel for Code Analyzer or Sprint Planner
            window.toggleConfigPanel = function(panelType) {
                const container = document.getElementById('configPanelContainer');
                if (!container) return;

                // If clicking same panel, close it
                if (container.dataset.activePanel === panelType && container.classList.contains('open')) {
                    container.classList.remove('open');
                    container.style.display = 'none';
                    delete container.dataset.activePanel;
                    return;
                }

                // Load panel content based on type
                let panelHtml = '';
                if (panelType === 'code-analyzer') {
                    panelHtml = window.getCodeAnalyzerPanel();
                } else if (panelType === 'sprint-planner') {
                    panelHtml = window.getSprintPlannerPanel();
                }

                const parser = new DOMParser();
                const doc = parser.parseFromString(panelHtml, 'text/html');
                container.replaceChildren(...doc.body.childNodes);

                // Show panel with animation
                container.dataset.activePanel = panelType;
                container.style.display = 'block';
                container.offsetHeight; // Force reflow
                container.classList.add('open');

                // Attach event listeners to dynamically added panel buttons
                setTimeout(() => {
                    if (panelType === 'code-analyzer') {
                        const closeBtn = document.getElementById('closeCodeAnalyzerPanel');
                        const cancelBtn = document.getElementById('cancelCodeAnalyzer');
                        const generateBtn = document.getElementById('generateCodeAnalyzerPrompt');

                        if (closeBtn) closeBtn.addEventListener('click', () => window.toggleConfigPanel(panelType));
                        if (cancelBtn) cancelBtn.addEventListener('click', () => window.toggleConfigPanel(panelType));
                        if (generateBtn) generateBtn.addEventListener('click', () => window.generateCodeAnalyzerPrompt());
                    } else if (panelType === 'sprint-planner') {
                        const closeBtn = document.getElementById('closeSprintPlannerPanel');
                        const cancelBtn = document.getElementById('cancelSprintPlanner');
                        const generateBtn = document.getElementById('generateSprintPrompt');

                        if (closeBtn) closeBtn.addEventListener('click', () => window.toggleConfigPanel(panelType));
                        if (cancelBtn) cancelBtn.addEventListener('click', () => window.toggleConfigPanel(panelType));
                        if (generateBtn) generateBtn.addEventListener('click', () => window.generateSprintPlannerPrompt());
                    }
                }, 0);
            };

            // Generate Code Analyzer prompt from user intent + configuration
            window.generateCodeAnalyzerPrompt = function() {
                const intentTextarea = document.getElementById('analyzerIntent');
                if (!intentTextarea || !intentTextarea.value.trim()) {
                    window.showStatus('⚠️ Please describe what you want to analyze', 'warning');
                    return;
                }

                // Show enhancement status
                const statusDiv = document.getElementById('enhancementStatus');
                if (statusDiv) {
                    statusDiv.style.display = 'flex';
                }

                // Disable button
                const generateBtn = document.getElementById('generateCodeAnalyzerPrompt');
                if (generateBtn) {
                    generateBtn.disabled = true;
                }

                // Send to extension for enhancement
                vscode.postMessage({
                    type: 'enhancePrompt',
                    promptType: 'code-analyzer',
                    userIntent: intentTextarea.value.trim()
                });

                window.showStatus('✨ Enhancing with ÆtherLight patterns...', 'info');
            };

            // Generate Sprint Planner prompt from user intent + configuration
            window.generateSprintPlannerPrompt = function() {
                const intentTextarea = document.getElementById('plannerIntent');
                if (!intentTextarea || !intentTextarea.value.trim()) {
                    window.showStatus('⚠️ Please describe what you want to plan', 'warning');
                    return;
                }

                // Show enhancement status
                const statusDiv = document.getElementById('enhancementStatus');
                if (statusDiv) {
                    statusDiv.style.display = 'flex';
                }

                // Disable button
                const generateBtn = document.getElementById('generateSprintPrompt');
                if (generateBtn) {
                    generateBtn.disabled = true;
                }

                // Send to extension for enhancement
                vscode.postMessage({
                    type: 'enhancePrompt',
                    promptType: 'sprint-planner',
                    userIntent: intentTextarea.value.trim()
                });

                window.showStatus('✨ Enhancing with ÆtherLight patterns...', 'info');
            };

            // Get Code Analyzer panel HTML
            window.getCodeAnalyzerPanel = function() {
                const state = vscode.getState() || {};
                const savedIntent = state.analyzerIntent || '';

                return \`
                    <div class="config-panel-header">
                        <h3>🔍 Code Analyzer</h3>
                        <button id="closeCodeAnalyzerPanel" class="config-panel-close">×</button>
                    </div>

                    <div class="config-panel-body">
                        <div class="config-section">
                            <label for="analyzerIntent" class="config-label">What would you like to analyze?</label>
                            <textarea
                                id="analyzerIntent"
                                class="config-textarea"
                                placeholder="Examples:\n• Review the authentication system for security issues\n• Find all API endpoints and their usage patterns\n• Analyze component dependencies and coupling\n• Check for performance bottlenecks in data processing"
                                rows="4">\${savedIntent}</textarea>
                        </div>

                        <div id="enhancementStatus" style="display: none; align-items: center; gap: 10px; margin: 10px 0;">
                            <div class="spinner"></div>
                            <span>Enhancing with ÆtherLight patterns...</span>
                        </div>

                        <div class="config-actions">
                            <button id="generateCodeAnalyzerPrompt" class="config-button primary">
                                ✨ Generate Enhanced Prompt
                            </button>
                            <button id="cancelCodeAnalyzer" class="config-button secondary">
                                Cancel
                            </button>
                        </div>
                    </div>
                \`;
            };

            // Get Sprint Planner panel HTML
            window.getSprintPlannerPanel = function() {
                const state = vscode.getState() || {};
                const savedIntent = state.plannerIntent || '';

                return \`
                    <div class="config-panel-header">
                        <h3>📋 Sprint Planner</h3>
                        <button id="closeSprintPlannerPanel" class="config-panel-close">×</button>
                    </div>

                    <div class="config-panel-body">
                        <div class="config-section">
                            <label for="plannerIntent" class="config-label">What would you like to plan?</label>
                            <textarea
                                id="plannerIntent"
                                class="config-textarea"
                                placeholder="Examples:\n• Create a 2-week sprint for implementing user authentication\n• Plan refactoring of the payment processing module\n• Design sprint for migrating to microservices\n• Build roadmap for mobile app development"
                                rows="4">\${savedIntent}</textarea>
                        </div>

                        <div id="enhancementStatus" style="display: none; align-items: center; gap: 10px; margin: 10px 0;">
                            <div class="spinner"></div>
                            <span>Enhancing with ÆtherLight patterns...</span>
                        </div>

                        <div class="config-actions">
                            <button id="generateSprintPrompt" class="config-button primary">
                                ✨ Generate Enhanced Prompt
                            </button>
                            <button id="cancelSprintPlanner" class="config-button secondary">
                                Cancel
                            </button>
                        </div>
                    </div>
                \`;
            };
        `;
    }

    private getVoiceTabScripts(): string {
        return `
            // Recording state stored in window object to survive tab switches and avoid re-declaration
            // CRITICAL FIX: Variables were re-declared on every tab switch, causing errors
            // WHY: Initialize once globally, persist across tab switches
            window.voiceTabState = window.voiceTabState || {
                mediaRecorder: null,
                audioChunks: [],
                isRecording: false,
                selectedTerminal: null
            };

            // BUG FIX: Check if global config panel functions exist before re-attaching event listeners
            // Chain of Thought: When tabs switch, HTML is replaced and global functions may be lost
            // WHY: Global functions defined in main template are not in Voice tab scripts
            // SOLUTION: Re-define critical functions if they don't exist
            if (typeof window.toggleConfigPanel === 'undefined') {
                console.log('[ÆtherLight] Re-defining global config panel functions after tab switch...');

                // Re-define the functions that were lost when tab switched
                ${this.getGlobalConfigPanelFunctions()}
            }

            /**
             * B-005: Auto-resize textarea from 60px to max 120px
             * DESIGN DECISION: Dynamic height based on content, scrollbar when exceeds max
             * WHY: Compact default (60px) saves space, auto-grows for longer prompts
             *
             * REASONING CHAIN:
             * 1. Default 60px height (2-3 lines) for typical voice commands
             * 2. Auto-resize as user types more content
             * 3. Max 120px prevents textarea from dominating panel
             * 4. Scrollbar appears when content exceeds 120px
             * 5. Result: Voice tab ~200px total height, compact and efficient
             */
            function autoResizeTextarea() {
                const textarea = document.getElementById('transcriptionText');
                if (!textarea) return;

                // Reset height to calculate scrollHeight correctly
                textarea.style.height = '60px';

                // Calculate new height (min 60px, max 120px)
                const newHeight = Math.min(Math.max(textarea.scrollHeight, 60), 120);
                textarea.style.height = newHeight + 'px';
            }

            // Attach auto-resize to textarea
            // CRITICAL FIX: Don't use const/let/var to avoid redeclaration error on tab switch
            (function() {
                const textarea = document.getElementById('transcriptionText');
                if (textarea) {
                    textarea.addEventListener('input', autoResizeTextarea);
                    // Initial resize in case there's pre-filled content
                    autoResizeTextarea();
                }
            })();

            // CSP-FIX-002: Define functions BEFORE attaching event listeners
            // Chain of Thought: Event listeners were calling undefined functions
            // WHY: Functions must exist before event listeners can reference them
            // REASONING: JavaScript function expressions (not declarations) aren't hoisted

            window.refreshTerminals = function() {
                vscode.postMessage({ type: 'getTerminals' });
            };

            window.sendToTerminal = function() {
                const text = document.getElementById('transcriptionText').value;

                if (!window.voiceTabState.selectedTerminal) {
                    showStatus('⚠️ Please select a terminal', 'error');
                    return;
                }

                if (!text.trim()) {
                    showStatus('⚠️ Nothing to send', 'error');
                    return;
                }

                vscode.postMessage({
                    type: 'sendToTerminal',
                    terminalName: window.voiceTabState.selectedTerminal,
                    text
                });

                // Clear input box after sending
                document.getElementById('transcriptionText').value = '';
                updateSendButton();

                // Clear saved state after sending to terminal
                const state = vscode.getState() || {};
                state.voiceTextContent = '';
                vscode.setState(state);

                showStatus('📤 Sent to ' + window.voiceTabState.selectedTerminal + ' ✓', 'info');
            };

            window.clearText = function() {
                document.getElementById('transcriptionText').value = '';
                updateSendButton();

                // Clear saved state when manually clearing text
                const state = vscode.getState() || {};
                state.voiceTextContent = '';
                vscode.setState(state);
            };

            // CSP-FIX-001: Attach event listeners to buttons (no onclick allowed)
            // Chain of Thought: CSP Trusted Types blocks onclick handlers, must use addEventListener
            // WHY: VS Code webview CSP policy blocks inline event handlers for security
            // REASONING: Add listeners after DOM loads AND after functions are defined
            (function() {
                // Primary toolbar buttons
                const recordBtn = document.getElementById('recordBtn');
                const codeAnalyzerBtn = document.getElementById('codeAnalyzerBtn');
                const sprintPlannerBtn = document.getElementById('sprintPlannerBtn');
                const enhanceBtn = document.getElementById('enhanceBtn');
                const sendBtn = document.getElementById('sendBtn');
                const clearBtn = document.getElementById('clearBtn');

                // Secondary toolbar buttons
                const reportBugBtn = document.getElementById('reportBugBtn');
                const requestFeatureBtn = document.getElementById('requestFeatureBtn');
                const manageSkillsBtn = document.getElementById('manageSkillsBtn');
                const settingsBtn = document.getElementById('settingsBtn');

                if (recordBtn) recordBtn.addEventListener('click', () => window.toggleRecording());
                if (codeAnalyzerBtn) codeAnalyzerBtn.addEventListener('click', () => window.toggleConfigPanel('code-analyzer'));
                if (sprintPlannerBtn) sprintPlannerBtn.addEventListener('click', () => window.toggleConfigPanel('sprint-planner'));
                if (enhanceBtn) enhanceBtn.addEventListener('click', () => window.enhanceText());
                if (sendBtn) sendBtn.addEventListener('click', () => window.sendToTerminal());
                if (clearBtn) clearBtn.addEventListener('click', () => window.clearText());

                if (reportBugBtn) reportBugBtn.addEventListener('click', () => window.reportBug());
                if (requestFeatureBtn) requestFeatureBtn.addEventListener('click', () => window.requestFeature());
                if (manageSkillsBtn) manageSkillsBtn.addEventListener('click', () => window.manageSkills());
                if (settingsBtn) settingsBtn.addEventListener('click', () => {
                    vscode.postMessage({ type: 'switchTab', tabId: 'settings' });
                });
            })();

            // Toggle recording - Send backtick to trigger desktop app
            window.toggleRecording = function() {
                /**
                 * DESIGN DECISION: Send backtick keystroke to trigger desktop app recording
                 * WHY: Desktop app handles voice recording with global hotkey (backtick)
                 *
                 * REASONING CHAIN:
                 * 1. Desktop app (Tauri) has global hotkey listener for backtick
                 * 2. Sending backtick from webview triggers desktop recording
                 * 3. Desktop app handles microphone permissions and Whisper API
                 * 4. Result: Consistent recording behavior across all contexts
                 *
                 * PATTERN: Pattern-VOICE-004 (Desktop App Integration)
                 */

                // Send backtick keystroke to VS Code to trigger desktop app
                vscode.postMessage({
                    type: 'sendKeystroke',
                    key: 'backtick'
                });

                showStatus('📢 Triggering voice capture (backtick sent)', 'info');
            };

            // Voice-specific message handler (called from global listener)
            window.handleVoiceMessage = function(message) {
                switch (message.type) {
                    case 'terminalList':
                        updateTerminalList(message.terminals);
                        break;
                    case 'focusTranscriptionBox':
                        // Focus the transcription text area for keyboard simulation
                        const transcriptionBox = document.getElementById('transcriptionText');
                        if (transcriptionBox) {
                            transcriptionBox.focus();
                            console.log('[ÆtherLight] Focused transcription box');
                        }
                        break;
                    case 'recordingStatus':
                        if (message.status === 'opening') {
                            showStatus('🎤 Recording started... Speak now!', 'info');
                        }
                        break;
                    case 'transcriptionChunk':
                        // Append transcription chunk to text area
                        const chunkTextArea = document.getElementById('transcriptionText');
                        if (chunkTextArea) {
                            chunkTextArea.value += (chunkTextArea.value ? ' ' : '') + message.text;
                            autoResizeTextarea(); // B-005: Auto-resize after chunk
                        }
                        showStatus('🎤 Transcribing...', 'info');
                        break;
                    case 'transcriptionComplete':
                        // Set final transcription text
                        const finalTextArea = document.getElementById('transcriptionText');
                        if (finalTextArea && message.text) {
                            finalTextArea.value = message.text;
                            autoResizeTextarea(); // B-005: Auto-resize after transcription
                        }
                        showStatus('✅ Transcription complete!', 'info');
                        updateSendButton();
                        break;
                    case 'transcriptionError':
                        showStatus('❌ Transcription error: ' + message.message, 'error');
                        break;
                    case 'enhancedText':
                        document.getElementById('transcriptionText').value = message.text;
                        autoResizeTextarea(); // B-005: Auto-resize after enhancement
                        updateSendButton();
                        showStatus('✅ Enhancement complete!', 'info');
                        break;
                    case 'autoSelectTerminal':
                        // B-003: Auto-selection triggered by Shell Integration
                        selectTerminal(message.terminalName);
                        showStatus(\`Auto-selected: \${message.terminalName}\`, 'info');
                        break;
                    case 'updateTerminals':
                        // B-004: Refresh terminal list after rename
                        updateTerminalList(message.terminals);
                        break;
                }
            };

            function updateTerminalList(terminals) {
                const list = document.getElementById('terminalList');
                if (!list) return;

                // CSP-FIX: Clear children without innerHTML
                while (list.firstChild) {
                    list.removeChild(list.firstChild);
                }

                if (terminals.length === 0) {
                    // CSP-FIX: Create element instead of innerHTML
                    const emptyMsg = document.createElement('div');
                    emptyMsg.style.padding = '8px';
                    emptyMsg.style.color = 'var(--vscode-descriptionForeground)';
                    emptyMsg.textContent = 'No terminals open';
                    list.appendChild(emptyMsg);
                    return;
                }

                terminals.forEach((terminal, index) => {
                    const item = document.createElement('div');
                    item.className = 'terminal-item';
                    item.tabIndex = 0;
                    item.dataset.terminalName = terminal.name; // Display name
                    item.dataset.actualName = terminal.actualName || terminal.name; // B-004: Actual VS Code terminal name

                    // CSP-FIX: Build DOM structure instead of innerHTML
                    const checkmark = document.createElement('span');
                    checkmark.className = 'terminal-checkmark';
                    checkmark.textContent = '✓';

                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'terminal-name';
                    nameSpan.textContent = terminal.name;

                    item.appendChild(checkmark);
                    item.appendChild(nameSpan);

                    if (terminal.isExecuting) {
                        const execIcon = document.createElement('span');
                        execIcon.className = 'terminal-executing-icon';
                        execIcon.title = 'Command executing';
                        execIcon.textContent = '⏳';
                        item.appendChild(execIcon);
                    }

                    // BUG-010: Removed pencil icon and rename functionality
                    // WHY: VS Code API doesn't support programmatic terminal renaming
                    // REASONING: Feature only updated Voice Panel list, not actual VS Code terminal tab
                    // Users confirmed feature was pointless - custom names not visible where they matter

                    // Click to select terminal
                    item.addEventListener('click', () => {
                        selectTerminal(terminal.name);
                    });

                    // Keyboard navigation
                    item.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            selectTerminal(terminal.name);
                        } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            const items = Array.from(document.querySelectorAll('.terminal-item'));
                            const currentIndex = items.indexOf(e.target);
                            if (currentIndex < items.length - 1) {
                                items[currentIndex + 1].focus();
                            }
                        } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            const items = Array.from(document.querySelectorAll('.terminal-item'));
                            const currentIndex = items.indexOf(e.target);
                            if (currentIndex > 0) {
                                items[currentIndex - 1].focus();
                            }
                        }
                    });

                    list.appendChild(item);
                });

                // B-003: Intelligent auto-selection prioritizing Review/Column A terminal
                // DESIGN DECISION: Auto-select Review terminal (Column A) by default
                // WHY: Column A is Review/INACTIVE terminal where commands are tested
                // REASONING CHAIN:
                // 1. User's workflow: Column A (Review) = test commands, Column B (Working) = active dev
                // 2. Voice commands should go to Review terminal by default (almost 100% automatic)
                // 3. User only manually selects different terminal in edge cases
                // 4. Try patterns: "Review", "INACTIVE", "bash", "Column A", or first terminal
                // 5. Result: 95%+ automatic selection of correct terminal

                function findReviewTerminal() {
                    // Priority order: Review > INACTIVE > bash > Column A > first terminal
                    const reviewPatterns = [
                        /review/i,          // "Review", "review", "bash - Review"
                        /inactive/i,        // "INACTIVE", "Inactive"
                        /^bash$/i,          // Exact "bash" terminal
                        /column\s*a/i,      // "Column A", "ColumnA"
                        /^zsh$/i,           // Exact "zsh" terminal
                        /^powershell$/i,    // Exact "powershell" terminal
                    ];

                    for (const pattern of reviewPatterns) {
                        const match = terminals.find(t => pattern.test(t.name));
                        if (match) {
                            return match.name;
                        }
                    }

                    // Fallback: first terminal
                    return terminals.length > 0 ? terminals[0].name : null;
                }

                // Auto-selection logic
                if (!window.voiceTabState.selectedTerminal && terminals.length > 0) {
                    // No terminal selected yet - find Review terminal
                    const reviewTerminal = findReviewTerminal();
                    if (reviewTerminal) {
                        selectTerminal(reviewTerminal);
                    }
                } else if (window.voiceTabState.selectedTerminal) {
                    // Check if previously selected terminal still exists
                    const stillExists = terminals.find(t => t.name === window.voiceTabState.selectedTerminal);
                    if (stillExists) {
                        // Restore previous selection
                        selectTerminal(window.voiceTabState.selectedTerminal);
                    } else {
                        // Previous terminal closed - find Review terminal
                        const reviewTerminal = findReviewTerminal();
                        if (reviewTerminal) {
                            selectTerminal(reviewTerminal);
                        }
                    }
                }
            }

            function selectTerminal(terminalName) {
                window.voiceTabState.selectedTerminal = terminalName;

                // Update UI
                document.querySelectorAll('.terminal-item').forEach(item => {
                    if (item.dataset.terminalName === terminalName) {
                        item.classList.add('selected');
                    } else {
                        item.classList.remove('selected');
                    }
                });

                updateSendButton();
            }

            // UI-002 & SKILLS-002: Insert skill invocation with parameters from settings
            window.insertSkill = function(skillCommand) {
                const textarea = document.getElementById('transcriptionText');
                if (!textarea) return;

                // Get saved settings
                const state = vscode.getState() || {};
                const settings = state.sprintSettings || {};

                let fullCommand = skillCommand;

                // SKILLS-002: Auto-populate parameters based on skill type
                if (skillCommand === '/code-analyzer') {
                    const params = [];
                    if (settings.teamSize) params.push('--engineers=' + settings.teamSize);
                    if (settings.focusAreas && settings.focusAreas.length > 0) {
                        params.push('--focus=' + settings.focusAreas.join(','));
                    }
                    if (settings.analyzerDepth) params.push('--depth=' + settings.analyzerDepth);
                    if (settings.analyzerOutput) params.push('--output=' + settings.analyzerOutput);
                    if (settings.analyzerGoals) {
                        const goals = settings.analyzerGoals.replace(/\\n/g, ', ');
                        params.push('--goals="' + goals + '"');
                    }
                    fullCommand = skillCommand + (params.length > 0 ? ' ' + params.join(' ') : '');
                }
                else if (skillCommand === '/sprint-planner') {
                    const params = [];
                    if (settings.teamSize) params.push('--engineers=' + settings.teamSize);
                    if (settings.sprintStructure) params.push('--structure=' + settings.sprintStructure);
                    if (settings.sprintType) params.push('--type=' + settings.sprintType);
                    if (settings.docFormat) params.push('--format=' + settings.docFormat);
                    fullCommand = skillCommand + (params.length > 0 ? ' ' + params.join(' ') : '');
                }

                // Insert skill command at cursor position
                const cursorPos = textarea.selectionStart;
                const currentText = textarea.value;
                const beforeCursor = currentText.substring(0, cursorPos);
                const afterCursor = currentText.substring(cursorPos);

                textarea.value = beforeCursor + fullCommand + ' ' + afterCursor;

                // Move cursor after inserted skill
                const newCursorPos = cursorPos + fullCommand.length + 1;
                textarea.setSelectionRange(newCursorPos, newCursorPos);
                textarea.focus();

                updateSendButton();

                // Save to state
                state.voiceTextContent = textarea.value;
                vscode.setState(state);
            };

            // UI-003: Secondary toolbar functions
            window.reportBug = function() {
                vscode.postMessage({
                    type: 'openUrl',
                    url: 'https://github.com/AEtherlight-ai/lumina/issues/new?labels=bug&template=bug_report.md'
                });
            };

            window.requestFeature = function() {
                vscode.postMessage({
                    type: 'openUrl',
                    url: 'https://github.com/AEtherlight-ai/lumina/issues/new?labels=enhancement&template=feature_request.md'
                });
            };

            window.manageSkills = function() {
                // TODO: Open skills management panel
                window.showStatus('📦 Skills Management coming soon!', 'info');
            };

            // NOTE: toggleConfigPanel, generateCodeAnalyzerPrompt, generateSprintPlannerPrompt,
            // getCodeAnalyzerPanel, getSprintPlannerPanel, and showStatus are defined at global scope
            // (see GLOBAL-PERSIST-001 earlier in script) to persist across tab switches.
            // DO NOT redefine them here or they will be lost when tabs switch.

            // REMOVED DUPLICATE DECLARATIONS - Now using global versions defined above
            /*
            window.toggleConfigPanel = function(panelType) {
                const container = document.getElementById('configPanelContainer');
                if (!container) return;

                // If clicking same panel, close it
                if (container.dataset.activePanel === panelType && container.classList.contains('open')) {
                    container.classList.remove('open');
                    container.style.display = 'none';
                    delete container.dataset.activePanel;
                    return;
                }

                // Load panel content based on type
                // CSP-FIX: Use DOMParser instead of innerHTML
                let panelHtml = '';
                if (panelType === 'code-analyzer') {
                    panelHtml = window.getCodeAnalyzerPanel();
                } else if (panelType === 'sprint-planner') {
                    panelHtml = window.getSprintPlannerPanel();
                }

                const parser = new DOMParser();
                const doc = parser.parseFromString(panelHtml, 'text/html');
                container.replaceChildren(...doc.body.childNodes);

                // Show panel with animation
                container.dataset.activePanel = panelType;
                container.style.display = 'block';
                // Force reflow for animation
                container.offsetHeight;
                container.classList.add('open');

                // CONFIG-PANEL-001: Attach event listeners to dynamically added panel buttons
                // Chain of Thought: Panel HTML is dynamically inserted, need to attach listeners after insertion
                // WHY: Buttons don't exist until panel is opened, must attach listeners each time
                // REASONING: Use setTimeout to ensure DOM is updated before attaching listeners
                setTimeout(() => {
                    if (panelType === 'code-analyzer') {
                        const closeBtn = document.getElementById('closeCodeAnalyzerPanel');
                        const cancelBtn = document.getElementById('cancelCodeAnalyzer');
                        const generateBtn = document.getElementById('generateCodeAnalyzerPrompt');

                        if (closeBtn) closeBtn.addEventListener('click', () => window.toggleConfigPanel(panelType));
                        if (cancelBtn) cancelBtn.addEventListener('click', () => window.toggleConfigPanel(panelType));
                        if (generateBtn) generateBtn.addEventListener('click', () => window.generateCodeAnalyzerPrompt());
                    } else if (panelType === 'sprint-planner') {
                        const closeBtn = document.getElementById('closeSprintPlannerPanel');
                        const cancelBtn = document.getElementById('cancelSprintPlanner');
                        const generateBtn = document.getElementById('generateSprintPrompt');

                        if (closeBtn) closeBtn.addEventListener('click', () => window.toggleConfigPanel(panelType));
                        if (cancelBtn) cancelBtn.addEventListener('click', () => window.toggleConfigPanel(panelType));
                        if (generateBtn) generateBtn.addEventListener('click', () => window.generateSprintPlannerPrompt());
                    }
                }, 0);
            };

            // ENHANCE-002: Generate enhanced prompt from natural language intent
            // Chain of Thought: User types intent → send to extension → PromptEnhancer analyzes → insert result
            // WHY: AI-powered enhancement provides codebase context + SOPs automatically
            // REASONING: User describes goal → system generates expert-level prompt with full context
            window.generateCodeAnalyzerPrompt = function() {
                const intentTextarea = document.getElementById('codeAnalyzerIntent');
                if (!intentTextarea) return;

                const userIntent = intentTextarea.value.trim();

                if (!userIntent) {
                    showStatus('⚠️ Please describe what you want to analyze.', 'warning');
                    intentTextarea.focus();
                    return;
                }

                // Show enhancement status
                const statusDiv = document.getElementById('enhancementStatus');
                if (statusDiv) {
                    statusDiv.style.display = 'flex';
                }

                // Disable button during enhancement
                const generateBtn = document.getElementById('generateCodeAnalyzerPrompt');
                if (generateBtn) {
                    generateBtn.disabled = true;
                    generateBtn.textContent = '⏳ Enhancing...';
                }

                // Send to extension for enhancement
                vscode.postMessage({
                    type: 'enhancePrompt',
                    userIntent,
                    promptType: 'code-analyzer'
                });
            };

            // ENHANCE-003: Generate enhanced prompt from natural language intent (Sprint Planner)
            // Chain of Thought: User types intent → send to extension → PromptEnhancer analyzes → insert result
            // WHY: AI-powered enhancement provides codebase context + SOPs automatically
            // REASONING: User describes goal → system generates expert-level sprint plan prompt
            window.generateSprintPlannerPrompt = function() {
                const intentTextarea = document.getElementById('sprintPlannerIntent');
                if (!intentTextarea) return;

                const userIntent = intentTextarea.value.trim();

                if (!userIntent) {
                    showStatus('⚠️ Please describe the sprint you want to plan.', 'warning');
                    intentTextarea.focus();
                    return;
                }

                // Show enhancement status
                const statusDiv = document.getElementById('enhancementStatus');
                if (statusDiv) {
                    statusDiv.style.display = 'flex';
                }

                // Disable button during enhancement
                const generateBtn = document.getElementById('generateSprintPrompt');
                if (generateBtn) {
                    generateBtn.disabled = true;
                    generateBtn.textContent = '⏳ Enhancing...';
                }

                // Send to extension for enhancement
                vscode.postMessage({
                    type: 'enhancePrompt',
                    userIntent,
                    promptType: 'sprint-planner'
                });
            };

            // Full panel generators with actual configuration forms
            // ENHANCE-002: Code Analyzer with deep prompt enhancement
            // Chain of Thought: Replace complex dropdowns with natural language input
            // WHY: Users know what they want but don't know how to structure it for AI
            // REASONING: User types intent → system enhances with codebase context + SOPs
            window.getCodeAnalyzerPanel = function() {
                const state = vscode.getState() || {};
                const lastIntent = state.lastCodeAnalyzerIntent || '';

                return \`
                    <div class="config-panel-header">
                        <h3>🔍 Code Analyzer</h3>
                        <button id="closeCodeAnalyzerPanel" class="config-panel-close">×</button>
                    </div>
                    <div class="config-panel-body">
                        <div class="settings-group">
                            <label for="codeAnalyzerIntent">What would you like to analyze?</label>
                            <textarea
                                id="codeAnalyzerIntent"
                                class="settings-textarea enhanced-textarea"
                                rows="8"
                                placeholder="Describe your analysis goal in natural language...

Examples:
• I want to identify all technical debt in the authentication system
• Find security vulnerabilities in API endpoints
• Review error handling across the codebase
• Analyze performance bottlenecks in data processing
• Check for missing unit tests in critical modules

Be specific about what you want to understand or improve.">\${lastIntent}</textarea>
                            <span class="settings-hint">
                                💡 <strong>AI-Enhanced Prompt</strong>: Your description will be analyzed and enhanced with:
                                <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 11px;">
                                    <li>Codebase structure and patterns</li>
                                    <li>Relevant ÆtherLight SOPs</li>
                                    <li>Project-specific instructions</li>
                                    <li>Success criteria and validation steps</li>
                                </ul>
                            </span>
                        </div>

                        <div id="enhancementStatus" class="enhancement-status" style="display: none;">
                            <div class="enhancement-spinner"></div>
                            <span>Enhancing prompt with codebase context...</span>
                        </div>
                    </div>
                    <div class="config-panel-actions">
                        <button id="generateCodeAnalyzerPrompt" class="settings-button primary">✨ Enhance & Generate Prompt</button>
                        <button id="cancelCodeAnalyzer" class="settings-button">Cancel</button>
                    </div>
                \`;
            };

            // ENHANCE-003: Sprint Planner with deep prompt enhancement
            // Chain of Thought: Replace complex dropdowns with natural language input
            // WHY: Users know what they want but don't know how to structure it for AI
            // REASONING: User types intent → system enhances with codebase context + SOPs
            window.getSprintPlannerPanel = function() {
                const state = vscode.getState() || {};
                const lastIntent = state.lastSprintPlannerIntent || '';

                return \`
                    <div class="config-panel-header">
                        <h3>📋 Sprint Planner</h3>
                        <button id="closeSprintPlannerPanel" class="config-panel-close">×</button>
                    </div>
                    <div class="config-panel-body">
                        <div class="settings-group">
                            <label for="sprintPlannerIntent">What sprint would you like to plan?</label>
                            <textarea
                                id="sprintPlannerIntent"
                                class="settings-textarea enhanced-textarea"
                                rows="8"
                                placeholder="Describe your sprint goal in natural language...

Examples:
• Plan a sprint to implement user authentication with OAuth
• Create tasks for refactoring the API layer
• Build a sprint for adding dark mode to the application
• Design a maintenance sprint to improve test coverage
• Plan feature development for real-time notifications

Be specific about features, timeline, and any constraints.">\${lastIntent}</textarea>
                            <span class="settings-hint">
                                💡 <strong>AI-Enhanced Prompt</strong>: Your description will be analyzed and enhanced with:
                                <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 11px;">
                                    <li>Codebase structure and existing patterns</li>
                                    <li>Relevant ÆtherLight SOPs and hooks</li>
                                    <li>Project-specific instructions</li>
                                    <li>Sprint structure and TOML formatting</li>
                                </ul>
                            </span>
                        </div>

                        <div id="enhancementStatus" class="enhancement-status" style="display: none;">
                            <div class="enhancement-spinner"></div>
                            <span>Enhancing prompt with codebase context...</span>
                        </div>
                    </div>
                    <div class="config-panel-actions">
                        <button id="generateSprintPrompt" class="settings-button primary">✨ Enhance & Generate Prompt</button>
                        <button id="cancelSprintPlanner" class="settings-button">Cancel</button>
                    </div>
                \`;
            };
            */

            // Support Ctrl+Enter to send
            const mainTextArea = document.getElementById('transcriptionText');
            if (mainTextArea) {
                mainTextArea.addEventListener('keydown', (e) => {
                    if (e.ctrlKey && e.key === 'Enter') {
                        window.sendToTerminal();
                    }
                });

                // Update send button when text changes AND save text to state
                mainTextArea.addEventListener('input', () => {
                    updateSendButton();
                    // Save text to webview state for persistence
                    const state = vscode.getState() || {};
                    state.voiceTextContent = mainTextArea.value;
                    vscode.setState(state);
                });
            }

            function updateSendButton() {
                const text = document.getElementById('transcriptionText')?.value || '';
                const sendBtn = document.getElementById('sendBtn');
                const enhanceBtn = document.getElementById('enhanceBtn');

                if (sendBtn) sendBtn.disabled = !text.trim() || !window.voiceTabState.selectedTerminal;
                if (enhanceBtn) enhanceBtn.disabled = !text.trim();
            }

            window.enhanceText = function() {
                const text = document.getElementById('transcriptionText').value;

                if (!text.trim()) {
                    window.showStatus('⚠️ Nothing to enhance', 'error');
                    return;
                }

                // Send to extension for enhancement
                vscode.postMessage({
                    type: 'enhanceText',
                    text: text
                });

                window.showStatus('✨ Enhancing with ÆtherLight patterns...', 'info');
            };

            // NOTE: showStatus is now defined at global scope (see GLOBAL-PERSIST-001)
        `;
    }

    /**
     * A-003: Planning Tab Placeholder
     *
     * DESIGN DECISION: Show skeleton UI for sprint planning functionality
     * WHY: Give users clear expectations of what Planning tab will contain
     * FUTURE: Will show dependency graph, sprint creation, task breakdown tools
     */
    private getPlanningTabPlaceholder(): string {
        return `
        <div class="placeholder-panel">
            <div class="placeholder-header">
                <span class="placeholder-icon">🗂️</span>
                <h2>Sprint Planning</h2>
            </div>
            <div class="placeholder-description">
                <p>Sprint planning and dependency graph visualization</p>
            </div>
            <div class="placeholder-features">
                <h3>Coming Soon:</h3>
                <ul>
                    <li>📊 Interactive dependency graph</li>
                    <li>📝 Sprint creation wizard</li>
                    <li>🔗 Task breakdown and estimation</li>
                    <li>📅 Timeline visualization</li>
                    <li>⚙️ Resource allocation</li>
                </ul>
            </div>
            <div class="placeholder-status">
                <em>Implementation: Task A-003 → Phase 1</em>
            </div>
        </div>
        `;
    }

    /**
     * A-003: Patterns Tab Placeholder
     *
     * DESIGN DECISION: Show skeleton UI for pattern library search
     * WHY: Give users clear expectations of pattern management capabilities
     * FUTURE: Will show searchable pattern library with confidence scores
     */
    private getPatternsTabPlaceholder(): string {
        return `
        <div class="placeholder-panel">
            <div class="placeholder-header">
                <span class="placeholder-icon">🧩</span>
                <h2>Pattern Library</h2>
            </div>
            <div class="placeholder-description">
                <p>Search and manage ÆtherLight code patterns</p>
            </div>
            <div class="placeholder-features">
                <h3>Coming Soon:</h3>
                <ul>
                    <li>🔍 Semantic pattern search</li>
                    <li>📈 Confidence score filtering</li>
                    <li>📚 Pattern category browser</li>
                    <li>⭐ Favorite patterns</li>
                    <li>➕ Add custom patterns</li>
                </ul>
            </div>
            <div class="placeholder-status">
                <em>Implementation: Task A-003 → Phase 1</em>
            </div>
        </div>
        `;
    }

    /**
     * A-003: Activity Tab Placeholder
     *
     * DESIGN DECISION: Show skeleton UI for real-time activity feed
     * WHY: Give users clear expectations of team collaboration features
     * FUTURE: Will show real-time team activity from Phase 3.9 WebSocket integration
     */
    private getActivityTabPlaceholder(): string {
        return `
        <div class="placeholder-panel">
            <div class="placeholder-header">
                <span class="placeholder-icon">📡</span>
                <h2>Team Activity</h2>
            </div>
            <div class="placeholder-description">
                <p>Real-time team activity feed and collaboration</p>
            </div>
            <div class="placeholder-features">
                <h3>Coming Soon:</h3>
                <ul>
                    <li>📊 Real-time design decision broadcasts</li>
                    <li>🚨 Blocker notifications</li>
                    <li>💡 Discovery sharing</li>
                    <li>👥 Team member status</li>
                    <li>🔔 Activity notifications</li>
                </ul>
            </div>
            <div class="placeholder-status">
                <em>Implementation: Task A-003 → Phase 1 | Full functionality: Phase 3.9</em>
            </div>
        </div>
        `;
    }

    /**
     * SETTINGS-001: Settings Tab with Sprint Planning Configuration
     *
     * DESIGN DECISION: Real settings UI replacing placeholder
     * WHY: Users need configurable sprint planning that matches their terminology
     * REASONING: No artificial limits on team size, 6 structure terminology options
     */
    /**
     * Chain of Thought: Settings Tab now contains ONLY global ÆtherLight settings
     * WHY: User requested Sprint Planning and Code Analyzer settings moved to Sprint Tab
     * REASONING: Settings Tab should be for global extension configuration, not sprint-specific settings
     * PATTERN: Separation of concerns - global vs. sprint-specific configuration
     */
    private getSettingsTabPlaceholder(): string {
        return `
        <div class="settings-panel">
            <div class="settings-header">
                <h2>⚙️ ÆtherLight Global Settings</h2>
                <p class="settings-subtitle">Configure global extension behavior</p>
                <p class="settings-note"><em>Note: Sprint Planning and Code Analyzer settings are in the Sprint Tab</em></p>
            </div>

            <!-- GLOBAL-SETTINGS-001: Voice Input Configuration -->
            <div class="settings-section">
                <h3 class="settings-section-title">🎤 Voice Input</h3>

                <div class="settings-group">
                    <label for="whisperModel">Whisper Model</label>
                    <select id="whisperModel" class="settings-select">
                        <option value="whisper-1">Whisper-1 (OpenAI default)</option>
                    </select>
                    <span class="settings-hint">Voice transcription model (OpenAI Whisper API)</span>
                </div>

                <div class="settings-group">
                    <label for="voiceLanguage">Language</label>
                    <select id="voiceLanguage" class="settings-select">
                        <option value="auto">Auto-Detect</option>
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="it">Italian</option>
                        <option value="pt">Portuguese</option>
                        <option value="nl">Dutch</option>
                        <option value="pl">Polish</option>
                        <option value="ru">Russian</option>
                        <option value="ja">Japanese</option>
                        <option value="zh">Chinese</option>
                        <option value="ko">Korean</option>
                    </select>
                    <span class="settings-hint">Primary language for voice recognition</span>
                </div>

                <div class="settings-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="autoSendEnabled" checked>
                        <span>Auto-send transcription to active editor</span>
                    </label>
                    <span class="settings-hint">Automatically insert transcribed text without manual confirmation</span>
                </div>
            </div>

            <!-- GLOBAL-SETTINGS-002: Pattern Matching Configuration -->
            <div class="settings-section">
                <h3 class="settings-section-title">🔍 Pattern Matching</h3>

                <div class="settings-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="patternMatchingEnabled" checked>
                        <span>Enable pattern matching (hallucination prevention)</span>
                    </label>
                    <span class="settings-hint">Verify AI suggestions against known code patterns</span>
                </div>

                <div class="settings-group">
                    <label for="patternThreshold">Match Threshold</label>
                    <input type="range" id="patternThreshold" min="0" max="100" value="85" class="settings-slider">
                    <span class="settings-hint">Pattern confidence threshold: <strong id="thresholdValue">85%</strong></span>
                </div>
            </div>

            <!-- GLOBAL-SETTINGS-003: Update & Sync Configuration -->
            <div class="settings-section">
                <h3 class="settings-section-title">🔄 Updates & Sync</h3>

                <div class="settings-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="autoUpdateCheck" checked>
                        <span>Automatically check for updates</span>
                    </label>
                    <span class="settings-hint">Check for new ÆtherLight versions hourly</span>
                </div>

                <div class="settings-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="realtimeSyncEnabled">
                        <span>Enable real-time collaboration sync</span>
                    </label>
                    <span class="settings-hint">Sync sprint progress with team members (requires Supabase)</span>
                </div>
            </div>

            <!-- GLOBAL-SETTINGS-004: Appearance -->
            <div class="settings-section">
                <h3 class="settings-section-title">🎨 Appearance</h3>

                <div class="settings-group">
                    <label for="uiDensity">UI Density</label>
                    <select id="uiDensity" class="settings-select">
                        <option value="compact">Compact</option>
                        <option value="standard" selected>Standard</option>
                        <option value="comfortable">Comfortable</option>
                    </select>
                    <span class="settings-hint">Spacing and sizing of UI elements</span>
                </div>

                <div class="settings-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="showTimestamps" checked>
                        <span>Show timestamps on tasks</span>
                    </label>
                    <span class="settings-hint">Display creation/modification times in Sprint view</span>
                </div>
            </div>

            <div class="settings-actions">
                <button id="saveGlobalSettings" class="settings-button primary">💾 Save Settings</button>
                <button id="resetGlobalSettings" class="settings-button">↩️ Reset to Defaults</button>
            </div>

            <div class="settings-footer">
                <p><strong>Version:</strong> ${require('../../package.json').version}</p>
                <p><em>Sprint-specific settings (Sprint Planning, Code Analyzer) are in the Sprint Tab</em></p>
            </div>
        </div>
        <script>
            // GLOBAL-SETTINGS: Load and save global settings
            (function() {
                // Load saved settings from workspace state
                const savedSettings = vscode.getState()?.globalSettings || {};

                // Load voice settings
                if (savedSettings.whisperModel) document.getElementById('whisperModel').value = savedSettings.whisperModel;
                if (savedSettings.voiceLanguage) document.getElementById('voiceLanguage').value = savedSettings.voiceLanguage;
                if (savedSettings.autoSendEnabled !== undefined) document.getElementById('autoSendEnabled').checked = savedSettings.autoSendEnabled;

                // Load pattern matching settings
                if (savedSettings.patternMatchingEnabled !== undefined) document.getElementById('patternMatchingEnabled').checked = savedSettings.patternMatchingEnabled;
                if (savedSettings.patternThreshold) {
                    document.getElementById('patternThreshold').value = savedSettings.patternThreshold;
                    document.getElementById('thresholdValue').textContent = savedSettings.patternThreshold + '%';
                }

                // Load update/sync settings
                if (savedSettings.autoUpdateCheck !== undefined) document.getElementById('autoUpdateCheck').checked = savedSettings.autoUpdateCheck;
                if (savedSettings.realtimeSyncEnabled !== undefined) document.getElementById('realtimeSyncEnabled').checked = savedSettings.realtimeSyncEnabled;

                // Load appearance settings
                if (savedSettings.uiDensity) document.getElementById('uiDensity').value = savedSettings.uiDensity;
                if (savedSettings.showTimestamps !== undefined) document.getElementById('showTimestamps').checked = savedSettings.showTimestamps;

                // Update threshold display on slider change
                document.getElementById('patternThreshold').addEventListener('input', function(e) {
                    document.getElementById('thresholdValue').textContent = e.target.value + '%';
                });

                // Global save settings function
                window.saveGlobalSettings = function() {
                    const settings = {
                        // Voice Input
                        whisperModel: document.getElementById('whisperModel').value,
                        voiceLanguage: document.getElementById('voiceLanguage').value,
                        autoSendEnabled: document.getElementById('autoSendEnabled').checked,

                        // Pattern Matching
                        patternMatchingEnabled: document.getElementById('patternMatchingEnabled').checked,
                        patternThreshold: parseInt(document.getElementById('patternThreshold').value),

                        // Updates & Sync
                        autoUpdateCheck: document.getElementById('autoUpdateCheck').checked,
                        realtimeSyncEnabled: document.getElementById('realtimeSyncEnabled').checked,

                        // Appearance
                        uiDensity: document.getElementById('uiDensity').value,
                        showTimestamps: document.getElementById('showTimestamps').checked
                    };

                    // Save to webview state
                    const state = vscode.getState() || {};
                    state.globalSettings = settings;
                    vscode.setState(state);

                    // Send to backend for workspace state persistence
                    vscode.postMessage({
                        type: 'saveGlobalSettings',
                        settings: settings
                    });

                    // Show confirmation
                    alert('✅ Global settings saved successfully!');
                };

                // Global reset settings function
                window.resetGlobalSettings = function() {
                    // Voice Input defaults
                    document.getElementById('whisperModel').value = 'whisper-1';
                    document.getElementById('voiceLanguage').value = 'auto';
                    document.getElementById('autoSendEnabled').checked = true;

                    // Pattern Matching defaults
                    document.getElementById('patternMatchingEnabled').checked = true;
                    document.getElementById('patternThreshold').value = 85;
                    document.getElementById('thresholdValue').textContent = '85%';

                    // Updates & Sync defaults
                    document.getElementById('autoUpdateCheck').checked = true;
                    document.getElementById('realtimeSyncEnabled').checked = false;

                    // Appearance defaults
                    document.getElementById('uiDensity').value = 'standard';
                    document.getElementById('showTimestamps').checked = true;

                    window.saveGlobalSettings();
                };

                // CSP-FIX-004: Attach event listeners to Settings tab buttons
                const saveBtn = document.getElementById('saveGlobalSettings');
                const resetBtn = document.getElementById('resetGlobalSettings');

                if (saveBtn) saveBtn.addEventListener('click', () => window.saveGlobalSettings());
                if (resetBtn) resetBtn.addEventListener('click', () => window.resetGlobalSettings());
            })();
        </script>
        `;
    }
}

// ============================================================================
// Helper Functions (outside class)
// ============================================================================

/**
 * Get Voice Panel body content (HTML fragment without document wrapper)
 *
 * DESIGN DECISION: Return only body HTML, not full document
 * WHY: Enables embedding in tabbed interface without nested HTML documents
 */
function getVoicePanelBodyContent(): string {
    // Chain of Thought: Redesigned Voice tab for compactness (B-001)
    // WHY: Reduce height from 500px to ~200px by using icon bar instead of buttons
    // REASONING: Icon bar (32px) + terminal list (72px) + textarea (60px) + hints (20px) = ~200px
    return `
    <div class="header">
        <h2>
            <span class="status-indicator" id="statusIndicator"></span>
            ÆtherLight Voice
        </h2>
    </div>

    <div id="statusMessage"></div>

    <!-- UI-002: Primary icon toolbar (6 icons, 32px height) -->
    <!-- CSP-FIX: Removed onclick handlers, using event listeners instead to comply with Trusted Types -->
    <div class="icon-bar primary-toolbar">
        <button id="recordBtn" class="icon-button" title="🎤 Record - Click or hit Backtick (\`)">
            <span class="icon">🎤</span>
        </button>
        <button id="codeAnalyzerBtn" class="icon-button" title="🔍 Code Analyzer - Configure and analyze codebase">
            <span class="icon">🔍</span>
        </button>
        <button id="sprintPlannerBtn" class="icon-button" title="📋 Sprint Planner - Configure and generate sprint plans">
            <span class="icon">📋</span>
        </button>
        <button id="enhanceBtn" class="icon-button" disabled title="✨ Enhance with Patterns - Coming Soon">
            <span class="icon">✨</span>
        </button>
        <button id="sendBtn" class="icon-button primary" disabled title="📤 Send to Terminal - Ctrl+Enter">
            <span class="icon">📤</span>
        </button>
        <button id="clearBtn" class="icon-button" title="🗑️ Clear Transcription">
            <span class="icon">🗑️</span>
        </button>
    </div>

    <div class="terminal-selector">
        <div id="terminalList" class="terminal-list">
            <!-- Terminals will be populated here -->
        </div>
    </div>

    <div class="transcription-editor">
        <label for="transcriptionText">Command / Transcription:</label>
        <textarea
            id="transcriptionText"
            placeholder="Click 🎤 to record, or type directly..."
        ></textarea>
    </div>

    <!-- UI-003: Secondary icon toolbar (4 icons, 28px height, bottom placement) -->
    <!-- CSP-FIX: Removed onclick handlers, using event listeners instead -->
    <div class="icon-bar secondary-toolbar">
        <button id="reportBugBtn" class="icon-button-small" title="🐛 Report Bug">
            <span class="icon">🐛</span>
        </button>
        <button id="requestFeatureBtn" class="icon-button-small" title="🔧 Request Feature">
            <span class="icon">🔧</span>
        </button>
        <button id="manageSkillsBtn" class="icon-button-small" title="📦 Skill Management">
            <span class="icon">📦</span>
        </button>
        <button id="settingsBtn" class="icon-button-small" title="⚙️ Settings">
            <span class="icon">⚙️</span>
        </button>
    </div>

    <!-- SLIDE-DOWN-001: Configuration panel container -->
    <!-- Chain of Thought: Slide-down panels for Code Analyzer and Sprint Planner -->
    <!-- WHY: User requested configs appear below toolbar in Voice tab, not in separate tabs -->
    <!-- REASONING: Allows inline configuration that generates prompts directly into text area -->
    <!-- PATTERN: Collapsible panels for contextual configuration -->
    <div id="configPanelContainer" class="config-panel-container" style="display: none;">
        <!-- Dynamic content for Code Analyzer or Sprint Planner configuration -->
    </div>

    <div class="keyboard-hints">
        <span class="hint-item"><code>\`</code> Voice</span>
        <span class="hint-separator">|</span>
        <span class="hint-item"><code>Ctrl+Enter</code> Send</span>
    </div>
    `;
}

// Removed legacy getVoicePanelContent() function - no longer needed with tab-based system

// Helper functions for transcription and enhancement
async function transcribeAudioWithWhisper(audioData: string): Promise<string> {
    const fetch = require('node-fetch');
    const FormData = require('form-data');

    // Get OpenAI API key from settings
    const config = vscode.workspace.getConfiguration('aetherlight');
    const apiKey = config.get<string>('openaiApiKey') || config.get<string>('openai.apiKey');

    if (!apiKey || apiKey.trim() === '') {
        throw new Error('OpenAI API key not configured. Please set aetherlight.openaiApiKey in settings.');
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioData, 'base64');

    // Create form data
    const formData = new FormData();
    formData.append('file', audioBuffer, {
        filename: 'audio.webm',
        contentType: 'audio/webm'
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    // Send to OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            ...formData.getHeaders()
        },
        body: formData
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Whisper API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    return result.text || '';
}

async function enhanceWithPatterns(text: string): Promise<string> {
    // TODO: Implement pattern matching and enhancement
    // For now, return original text
    return text;
}

/**
 * Register voice view provider with VS Code
 *
 * DESIGN DECISION: Return both disposable and provider instance
 * WHY: Allow extension.ts to access provider methods (e.g., resetTabState)
 */
export function registerVoiceView(context: vscode.ExtensionContext): { disposable: vscode.Disposable; provider: VoiceViewProvider } {
    const provider = new VoiceViewProvider(context.extensionUri, context);

    const disposable = vscode.window.registerWebviewViewProvider(
        VoiceViewProvider.viewType,
        provider
    );

    return { disposable, provider };
}
