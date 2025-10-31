/**
 * Lumina VS Code Extension - Entry Point
 *
 * DESIGN DECISION: Extension activates on VS Code startup (onStartupFinished)
 * WHY: Immediate availability for voice hotkeys (` and Shift+`) without manual activation
 *
 * REASONING CHAIN:
 * 1. VS Code loads extension on startup via activationEvents
 * 2. Extension registers voice hotkeys immediately (` for voice panel, Shift+` for enhance)
 * 3. Voice capture uses webview + OpenAI Whisper API for transcription
 * 4. User can press ` any time after VS Code starts
 * 5. Live transcription flows back via message passing
 *
 * PATTERN: Pattern-IDE-001 (VS Code extension scaffold)
 * RELATED: voiceRecorder.ts (webview audio), simpleVoiceCapture.ts (command handler)
 * FUTURE: Add settings UI for OpenAI API key management, model selection
 *
 * @module extension
 */

import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { IPCClient } from './ipc/client';
import { registerCaptureVoiceCommand } from './commands/captureVoice';
import { checkAndSetupUserDocumentation } from './firstRunSetup';
// Enhancement commands now implemented (v0.15.2):
import { registerCaptureVoiceGlobalCommand } from './commands/captureVoiceGlobal';
import { registerEnhanceTerminalInputCommand } from './commands/enhanceTerminalInput';
// import { registerOpenAetherlightTerminalCommand } from './commands/openAetherlightTerminal';
// import { registerQuickVoiceCommand } from './commands/quickVoice';
// import { registerLuminaControlStatusBar } from './lumina_status_bar';
// import { ShellIntegration } from './terminal/shell-integration';
// import { checkAndSetupUserDocumentation } from './firstRunSetup';
import { registerVoiceView } from './commands/voicePanel';
// TEMPORARILY DISABLED FOR v0.13.1-beta - Phase 4 code has incomplete NAPI bindings
// import { registerSprintProgressPanel } from './sprint_progress_panel';
// import { registerAgentCoordinationView } from './agent_coordination_view';
import { registerStatusBarManager } from './status_bar_manager';
import { RealtimeSyncManager } from './realtime_sync';
import { SprintLoader } from './commands/SprintLoader';
// TEMPORARILY DISABLED - Missing @aetherlight/analyzer package
// import { registerAnalyzeWorkspaceCommands } from './commands/analyzeWorkspace';
import { UpdateChecker } from './services/updateChecker';
import { SkillExecutor } from './services/SkillExecutor';
import * as fs from 'fs';

/**
 * Global variable to store desktop app process for cleanup
 *
 * DESIGN DECISION: Store process reference globally for deactivate() access
 * WHY: Need to kill process when extension unloads (clean shutdown)
 *
 * REASONING CHAIN:
 * 1. activate() spawns desktop app process
 * 2. Store process in global variable
 * 3. deactivate() kills process using stored PID
 * 4. Result: No orphaned desktop app processes
 */
let desktopAppProcess: ChildProcess | null = null;

/**
 * Launch ÆtherLight desktop app in system tray mode
 *
 * DESIGN DECISION: Auto-launch desktop app on extension activation
 * WHY: User requirement - "when they launch ether light we have to launch the Tory desktop app also it needs to be seamless and feel like it's all one system"
 *
 * REASONING CHAIN:
 * 1. Detect OS platform (Windows/Mac/Linux)
 * 2. Find desktop app executable path (products/lumina-desktop/src-tauri/target/release/)
 * 3. Spawn process with --hidden --systray flags (run in background)
 * 4. Store process reference for cleanup
 * 5. Log success or graceful failure if executable not found
 * 6. Result: Desktop app launches automatically, runs in system tray, provides IPC server
 *
 * PATTERN: Pattern-DESKTOP-AUTO-LAUNCH-001
 * RELATED: IPC client (ipc/client.ts), deactivate() cleanup
 *
 * @param context - VS Code extension context (for logging and paths)
 */
function launchDesktopApp(context: vscode.ExtensionContext): void {
	try {
		// Detect OS platform
		const platform = process.platform;
		let executableName: string;
		let executablePath: string;

		// Find workspace root (where products/ directory is located)
		const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
		if (!workspaceRoot) {
			console.log('[ÆtherLight] No workspace folder open - skipping desktop app launch');
			return;
		}

		// Determine executable name and path based on platform
		if (platform === 'win32') {
			executableName = 'lumina-desktop.exe';
			executablePath = path.join(workspaceRoot, 'products', 'lumina-desktop', 'src-tauri', 'target', 'debug', executableName);
		} else if (platform === 'darwin') {
			// macOS: Tauri builds .app bundle
			executableName = 'Lumina Desktop.app';
			executablePath = path.join(workspaceRoot, 'products', 'lumina-desktop', 'src-tauri', 'target', 'release', 'bundle', 'macos', executableName);
		} else {
			// Linux: Executable binary
			executableName = 'lumina-desktop';
			executablePath = path.join(workspaceRoot, 'products', 'lumina-desktop', 'src-tauri', 'target', 'release', executableName);
		}

		// Check if executable exists
		if (!fs.existsSync(executablePath)) {
			console.log(`[ÆtherLight] Desktop app not found at ${executablePath}`);
			console.log('[ÆtherLight] Build desktop app first: cd products/lumina-desktop && npm run tauri build');
			console.log('[ÆtherLight] Extension will work in limited mode (no IPC features)');
			return;
		}

		// Launch desktop app with system tray flags
		// FUTURE: Add --hidden --systray flags once desktop app implements them
		console.log(`[ÆtherLight] Launching desktop app: ${executablePath}`);

		desktopAppProcess = spawn(executablePath, [], {
			detached: true, // Allow process to run independently
			stdio: 'ignore' // Don't pipe stdout/stderr
		});

		// Unref the process so it doesn't keep Node.js running
		desktopAppProcess.unref();

		console.log(`[ÆtherLight] Desktop app launched (PID: ${desktopAppProcess.pid})`);
		vscode.window.showInformationMessage('ÆtherLight: Desktop app launched in system tray');

		// Handle process exit
		desktopAppProcess.on('exit', (code, signal) => {
			console.log(`[ÆtherLight] Desktop app exited (code: ${code}, signal: ${signal})`);
			desktopAppProcess = null;
		});

		// Handle process errors
		desktopAppProcess.on('error', (err) => {
			console.error('[ÆtherLight] Desktop app launch failed:', err);
			vscode.window.showErrorMessage(`ÆtherLight: Failed to launch desktop app - ${err.message}`);
			desktopAppProcess = null;
		});

	} catch (error) {
		console.error('[ÆtherLight] Desktop app launch error:', error);
		// Don't show error to user - extension can work without desktop app
	}
}

/**
 * Extension activation function - called when VS Code loads extension
 *
 * DESIGN DECISION: Initialize IPC client on activation, not on first command use
 * WHY: Reduces latency for first voice capture (no connection delay)
 *
 * REASONING CHAIN:
 * 1. VS Code calls activate() on extension load
 * 2. Create IPC client instance (connects to ws://localhost:43215)
 * 3. Register voice capture command handlers (` opens panel, ~ transcribes inline)
 * 4. Store client in extension context for command access
 * 5. Return context for cleanup on deactivation
 *
 * @param context - VS Code extension context (provides lifecycle management)
 * @returns void
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
	console.log('Lumina extension activating...');

	/**
	 * DESIGN DECISION: Setup user documentation FIRST (before any features)
	 * WHY: New repos need .vscode/aetherlight.md so Claude knows what to do
	 *
	 * REASONING CHAIN:
	 * 1. User installs extension in their repo (no ÆtherLight docs exist yet)
	 * 2. Check if .vscode/aetherlight.md exists
	 * 3. If missing → Create from template (explains Sprint Tab, hotkeys, ACTIVE_SPRINT.toml)
	 * 4. Add references in settings.json and CLAUDE.md (if exists)
	 * 5. Claude Code can read these files → Learns how to use ÆtherLight features
	 * 6. Result: Self-documenting extension (no manual setup needed)
	 *
	 * PATTERN: Pattern-WORKSPACE-001 (Per-Workspace Setup)
	 */
	await checkAndSetupUserDocumentation(context);

	/**
	 * DESIGN DECISION: Setup docs when workspace folders change (user opens new repo)
	 * WHY: User might install extension, then open multiple different repos - each needs setup
	 *
	 * REASONING CHAIN:
	 * 1. User has extension installed globally
	 * 2. User opens Repo A → Setup runs ✅
	 * 3. User opens Repo B → Need to run setup again for Repo B
	 * 4. User opens Repo C → Need to run setup again for Repo C
	 * 5. Listen to workspace folder changes → Run setup for each new workspace
	 * 6. Result: Every repo gets documentation, not just first one
	 *
	 * PATTERN: Pattern-WORKSPACE-001 (Per-Workspace Setup)
	 */
	context.subscriptions.push(
		vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
			// Check if workspace folders were added (not removed)
			if (event.added.length > 0) {
				console.log('[ÆtherLight] Workspace folders added - checking for documentation setup');
				await checkAndSetupUserDocumentation(context);
			}
		})
	);

	/**
	 * DESIGN DECISION: Launch desktop app BEFORE creating IPC client
	 * WHY: Desktop app provides the IPC server that client connects to
	 *
	 * REASONING CHAIN:
	 * 1. Launch desktop app (spawns WebSocket server on port 43215)
	 * 2. Wait briefly for server to start (~500ms)
	 * 3. Create IPC client to connect to desktop app
	 * 4. Result: Seamless auto-launch + connection (feels like one system)
	 *
	 * PATTERN: Pattern-DESKTOP-AUTO-LAUNCH-001
	 */
	launchDesktopApp(context);

	// Wait briefly for desktop app to start server (avoid connection race condition)
	await new Promise(resolve => setTimeout(resolve, 1000));

	/**
	 * DESIGN DECISION: IPC client as singleton in extension context
	 * WHY: Single WebSocket connection shared across all commands (for desktop integration)
	 *
	 * REASONING CHAIN:
	 * 1. Create IPCClient instance on activation (after desktop app launched)
	 * 2. Attempt connection to Lumina desktop (ws://localhost:43215)
	 * 3. Store in globalState for command access
	 * 4. Connection failures logged but don't prevent activation
	 * 5. Voice commands work if desktop app running, graceful degradation if not
	 */
	const ipcClient = new IPCClient('ws://localhost:43215');

	// Store IPC client for command access via closure scope
	// DON'T use globalState (JSON.stringify fails) or context properties (object is sealed)
	// Commands will access via the closure when they're registered

	/**
	 * DESIGN DECISION: Connect IPC client immediately after creation
	 * WHY: Enable voice capture commands to work as soon as extension loads
	 *
	 * REASONING CHAIN:
	 * 1. Desktop app is already running (launched above)
	 * 2. Connect to IPC server on ws://localhost:43215
	 * 3. Log connection status (success or graceful failure)
	 * 4. Store client reference for commands to use
	 * 5. Result: Voice commands work immediately if desktop app is running
	 *
	 * PATTERN: Pattern-IPC-002 (Unified IPC Protocol)
	 */
	try {
		await ipcClient.connect();
		console.log('✅ IPC client connected to desktop app');

		// Store in global state for command access
		context.globalState.update('ipcClient', ipcClient);

		/**
		 * DESIGN DECISION: Register callback to focus Voice panel when backtick (`) pressed
		 * WHY: Backtick should show/focus Voice panel, tilde (~) shouldn't (hotkey differentiation)
		 *
		 * REASONING CHAIN:
		 * 1. User presses backtick (`) in any application
		 * 2. Desktop app sends FocusVoicePanel IPC message
		 * 3. Extension receives message → this callback executes
		 * 4. Execute VS Code command to show Voice panel: aetherlightVoiceView.focus
		 * 5. Voice panel appears and input field gets focus
		 * 6. User can immediately type or speak
		 * 7. Tilde (~) doesn't send this message → no focus change
		 *
		 * PATTERN: Pattern-IPC-004 (Hotkey-Triggered IPC Messages)
		 */
		ipcClient.onFocusPanel(() => {
			console.log('🎯 Focus panel callback triggered - showing Voice panel');
			// Execute VS Code command to focus the Voice panel webview
			vscode.commands.executeCommand('aetherlightVoiceView.focus').then(
				() => {
					console.log('✅ Voice panel focused successfully');
				},
				(error) => {
					console.error('❌ Failed to focus Voice panel:', error);
				}
			);
		});

		/**
		 * DESIGN DECISION: Sync VS Code settings to desktop app on connection
		 * WHY: User configures API key once in VS Code, desktop app uses it automatically
		 *
		 * REASONING CHAIN:
		 * 1. VS Code has OpenAI API key configured in settings
		 * 2. Desktop app needs same API key to make voice capture requests
		 * 3. Sync settings from VS Code → desktop app via IPC
		 * 4. Desktop app saves synced settings to its settings.json
		 * 5. Result: Single source of truth (VS Code settings), zero duplicate configuration
		 *
		 * PATTERN: Pattern-SETTINGS-SYNC-001 (VS Code → Desktop Settings Sync)
		 */
		try {
			const config = vscode.workspace.getConfiguration('aetherlight.desktop');
			const settingsToSync = {
				openai_api_key: config.get<string>('openaiApiKey', ''),
				whisper_model: config.get<string>('whisperModel', 'base.en'),
				offline_mode: config.get<boolean>('offlineMode', true),
			};

			// TODO: Implement settings sync when IPCClient.send() method is added
			// Send settings to desktop app via IPC
			// Desktop app will merge with its existing settings and save
			// await ipcClient.send({
			// 	type: 'SyncSettings',
			// 	id: Date.now().toString(),
			// 	settings: settingsToSync
			// });

			console.log('ℹ️ Settings sync to desktop app not yet implemented:', {
				hasApiKey: settingsToSync.openai_api_key.length > 0,
				whisperModel: settingsToSync.whisper_model,
				offlineMode: settingsToSync.offline_mode
			});
		} catch (syncError: any) {
			console.warn('⚠️ Failed to sync settings to desktop app:', syncError.message);
			// Don't fail activation - desktop app will use its own settings
		}
	} catch (error: any) {
		console.warn('⚠️ Failed to connect to desktop app:', error.message);
		console.warn('   Voice capture features will be unavailable until desktop app is running');

		// Don't fail activation - extension can work in limited mode
		// Commands will check for IPC client and show appropriate errors
	}

	/**
	 * DESIGN DECISION: Register Lumina Control Status Bar BEFORE other components
	 * WHY: Status bar needs to be available for connection status updates from IPC client
	 *
	 * REASONING CHAIN:
	 * 1. Status bar must exist before IPC client connects
	 * 2. IPC client will update sync status on connection/disconnection
	 * 3. Other components will reference status bar for updates
	 * 4. Result: Status bar shows real-time connection state
	 *
	 * PATTERN: Pattern-UI-004 (Comprehensive AI Assistant Status Bar)
	 *
	 * NOTE: Temporarily disabled status bar to fix serialization issue.
	 * TODO: Re-enable after fixing Timeout serialization bug.
	 */
	// const luminaControlStatusBar = registerLuminaControlStatusBar(context);

	// Connect IPC client events to status bar
	// Note: IPCClient needs event emitter pattern - will add in next iteration
	// For now, status bar will start in offline mode and update when connection established

	/**
	 * QUICK VOICE: Dead simple voice capture that just works
	 * Mic → Whisper → Type at cursor
	 * No desktop app, no IPC, no webview - just works
	 */
	// REMOVED - quickVoice.ts doesn't exist (work-in-progress feature)
	// registerQuickVoiceCommand(context);

	/**
	 * DEPRECATED in v0.9.0 - Old webview-based recording (doesn't work)
	 *
	 * @deprecated Webview recording replaced by IPC to desktop app
	 *
	 * DEPRECATION REASON: VS Code webviews block microphone access via Permissions-Policy
	 * NEW APPROACH: Desktop app records natively, sends audio via IPC
	 *
	 * Kept for backwards compatibility but not recommended.
	 * Use captureVoiceGlobal (Shift+`) or openVoicePanel (`) instead.
	 */
	// registerSimpleVoiceCaptureCommand(context); // DEPRECATED: Use IPC-based recording

	/**
	 * DESIGN DECISION: Status bar icon with Æ to open terminal
	 * WHY: Prominent, always-visible entry point (like Claude's @ icon)
	 *
	 * REASONING CHAIN:
	 * 1. Status bar provides constant visibility
	 * 2. Blue Æ icon creates brand recognition
	 * 3. Click opens or shows ÆtherLight terminal
	 * 4. Result: One-click access to voice-enhanced terminal
	 */
	// REMOVED - openAetherlightTerminal.ts doesn't exist (work-in-progress feature)
	// registerOpenAetherlightTerminalCommand(context);

	/**
	 * DESIGN DECISION: Persistent voice panel with terminal selector
	 * WHY: User wants robust UX - keep panel open, select terminals, edit before sending
	 *
	 * REASONING CHAIN:
	 * 1. Panel stays open on right side (like Cursor's composer)
	 * 2. Shows all available terminals in dropdown
	 * 3. Editable transcription text area
	 * 4. Select target terminal before sending
	 * 5. Result: Full-featured voice command center
	 */
	const { disposable: voiceViewDisposable, provider: voiceViewProvider } = registerVoiceView(context);
	context.subscriptions.push(voiceViewDisposable);

	/**
	 * DESIGN DECISION: Add command to reset tab state
	 * WHY: Recover from workspace state corruption without restarting VS Code
	 *
	 * REASONING CHAIN:
	 * 1. User reports Sprint tab not showing (workspace state corrupted)
	 * 2. TabManager marks tabs as "promoted" incorrectly
	 * 3. Add command: "ÆtherLight: Reset Tab State"
	 * 4. Command calls voiceViewProvider.resetTabState() → resets workspace storage → refreshes view
	 * 5. Result: All tabs visible again without restart
	 *
	 * PATTERN: Pattern-DEBUG-001 (State Reset Command for Recovery)
	 */
	const resetTabStateCommand = vscode.commands.registerCommand('aetherlight.resetTabState', async () => {
		await voiceViewProvider.resetTabState();
	});
	context.subscriptions.push(resetTabStateCommand);

	/**
	 * DESIGN DECISION: Clear sprint workspace state cache (force TOML as source of truth)
	 * WHY: Workspace state can have stale data that overrides TOML updates
	 *
	 * REASONING CHAIN:
	 * 1. User updates VOICE_PANEL_V0.5_SPRINT.toml with new task statuses
	 * 2. Workspace state still has old "pending" statuses cached
	 * 3. loadSavedStatuses() respects TOML but workspace data persists
	 * 4. Clear cache → force fresh read from TOML → all views sync
	 * 5. Result: TOML becomes single source of truth (v0.5.7 fix)
	 */
	const clearSprintCacheCommand = vscode.commands.registerCommand('aetherlight.clearSprintCache', async () => {
		await context.workspaceState.update('aetherlight.sprintTaskStatuses', {});
		vscode.window.showInformationMessage('✅ Sprint cache cleared - reloading from TOML...');

		// Trigger reload in voice panel
		vscode.commands.executeCommand('workbench.view.extension.aetherlight-sidebar');
	});
	context.subscriptions.push(clearSprintCacheCommand);

	/**
	 * DESIGN DECISION: Register aetherlight.openVoicePanel command (backtick hotkey)
	 * WHY: Keybinding requires a command handler to open the voice panel
	 *
	 * REASONING CHAIN:
	 * 1. package.json declares command and binds backtick (`) to it
	 * 2. Command must be registered to handle the keypress
	 * 3. Command reveals the ÆtherLight sidebar view with Voice tab
	 * 4. Store flag in workspace state to switch to Voice tab on next render
	 * 5. Result: Pressing ` always focuses Voice tab
	 *
	 * A-004: Enhanced with Voice tab auto-focus
	 * DESIGN DECISION: Use workspace state flag to communicate tab switch to webview
	 * WHY: VS Code doesn't support direct webview messaging before visibility
	 * REASONING CHAIN:
	 * 1. Hotkey pressed → Set workspace flag "requestedTab" = "Voice"
	 * 2. Open sidebar (may already be open)
	 * 3. VoicePanel checks flag on next render
	 * 4. If flag set → Switch to Voice tab, clear flag
	 * 5. Result: Reliable tab switching regardless of current state
	 */
	const openVoicePanelCommand = vscode.commands.registerCommand('aetherlight.openVoicePanel', async () => {
		/**
		 * DESIGN DECISION: Backtick records into Activity Panel input field via IPC
		 * WHY: User wants ` to record into command/transcript input (not type globally)
		 *
		 * REASONING CHAIN:
		 * 1. User presses ` (backtick)
		 * 2. Open Voice panel if not already open
		 * 3. Focus command/transcript input field
		 * 4. Start recording via IPC (desktop app)
		 * 5. Transcription chunks fill the input field (not typed globally)
		 * 6. User can edit, then press Enter to send
		 * 7. Result: Structured voice input into Activity Panel ✅
		 *
		 * PATTERN: Pattern-VOICE-004 (Panel Voice Input)
		 */
		// Set flag to request Voice tab focus + record into input field
		await context.workspaceState.update('aetherlight.requestedAction', {
			tab: 'Voice',
			action: 'startRecording',
			target: 'inputField' // NEW: Record into input field, not global typing
		});

		// Focus the ÆtherLight sidebar
		await vscode.commands.executeCommand('workbench.view.extension.aetherlight-sidebar');

		// Note: For promoted tabs (future phases), we'll need to check promotion state here
		// and focus the promoted view instead of the main sidebar
	});
	context.subscriptions.push(openVoicePanelCommand);

	/**
	 * DESIGN DECISION: Register Capture Voice Global command (Shift+` hotkey)
	 * WHY: Record and type transcription at current cursor position (universal voice typing)
	 *
	 * REASONING CHAIN:
	 * 1. User presses ~ (Shift+`)
	 * 2. Desktop app records via IPC (native microphone access)
	 * 3. Transcription chunks typed using VS Code editor API
	 * 4. Text appears at current cursor position (editor)
	 * 5. Result: Universal voice-to-text that works everywhere ✅
	 *
	 * PATTERN: Pattern-VOICE-005 (Global Voice Typing)
	 * RELATED: captureVoiceGlobal.ts, IPC client, desktop app
	 */
	registerCaptureVoiceGlobalCommand(context);

	/**
	 * DESIGN DECISION: Register Enhance Terminal Input command
	 * WHY: User can type text and enhance it with project context via button or hotkey
	 *
	 * REASONING CHAIN:
	 * 1. User types natural language request in Voice Panel
	 * 2. User clicks Enhancement button (lightning bolt) or uses hotkey
	 * 3. System gathers project context (patterns, files, git status, errors)
	 * 4. Combines user input + context into enhanced prompt
	 * 5. Enhanced prompt ready to send to Claude Code
	 * 6. Result: Rich contextual prompts with minimal effort
	 *
	 * PATTERN: Pattern-ENHANCEMENT-001 (Context-Aware Enhancement)
	 * RELATED: enhanceTerminalInput.ts, voicePanel.ts, PromptEnhancer
	 */
	registerEnhanceTerminalInputCommand(context);

	/**
	 * OLD APPROACH: IPC-based voice capture (Ctrl+Shift+V hotkey)
	 * STATUS: Deprecated - replaced by simpleVoiceCapture (backtick `)
	 * NOTE: This required desktop app running with IPC protocol (ws://localhost:43215)
	 *       Current approach uses webview + OpenAI API (no desktop app needed)
	 */
	// registerCaptureVoiceCommand(context);

	/**
	 * DESIGN DECISION: Register Sprint Progress Panel (TreeView)
	 * WHY: User requirement for real-time multi-agent dashboard
	 *
	 * REASONING CHAIN:
	 * 1. Sprint Progress Panel shows all 9 agents in TreeView
	 * 2. Real-time updates via IPC from orchestrator (<100ms latency)
	 * 3. Click agent → focus terminal (lumina.focusAgentTerminal command)
	 * 4. Visible only when sprint active (when condition in package.json)
	 * 5. Result: User sees all agents at once without tab switching
	 *
	 * PATTERN: Pattern-UI-001 (Real-Time TreeView Dashboard)
	 * RELATED: AgentCoordinationView (UI-002), StatusBarManager (UI-003)
	 */
	// TEMPORARILY DISABLED FOR v0.13.1-beta - Phase 4 code has incomplete NAPI bindings
	// const sprintProgressProvider = registerSprintProgressPanel(context);
	// Providers are already registered in context.subscriptions by their register functions

	/**
	 * DESIGN DECISION: Load sprint data on activation (v0.5.2.1 fix)
	 * WHY: Sprint tab was not showing because lumina.sprintActive was never set to true
	 *
	 * REASONING CHAIN:
	 * 1. Create SprintLoader instance
	 * 2. Attempt to load VOICE_PANEL_V0.5_SPRINT.toml
	 * 3. If sprint file exists and loads successfully:
	 *    - Set lumina.sprintActive to true (enables TreeView visibility)
	 *    - Update SprintProgressProvider with initial task data
	 * 4. If sprint file doesn't exist or fails to load:
	 *    - Keep lumina.sprintActive as false
	 *    - Sprint tab remains hidden
	 * 5. Result: Sprint tab automatically shows when sprint file present
	 */
	// TEMPORARILY DISABLED FOR v0.13.1-beta - Phase 4 code has incomplete NAPI bindings
	/*
	const sprintLoader = new SprintLoader(context);
	sprintLoader.loadSprint().then(({ tasks, metadata }) => {
		if (tasks.length > 0 && metadata) {
			// Sprint loaded successfully - enable Sprint tab
			vscode.commands.executeCommand('setContext', 'lumina.sprintActive', true);
			console.log(`Sprint loaded: ${metadata.sprint_name} (${tasks.length} tasks)`);

			// TODO: Update SprintProgressProvider with sprint data
			// This will be implemented when we integrate with Phase 4 orchestrator
			// For now, the tab will show with the welcome message
		} else {
			// No sprint file or empty sprint - keep tab hidden
			vscode.commands.executeCommand('setContext', 'lumina.sprintActive', false);
		}
	}).catch(error => {
		// Sprint loading failed - keep tab hidden
		console.log('Sprint loading failed:', error);
		vscode.commands.executeCommand('setContext', 'lumina.sprintActive', false);
	});
	*/

	/**
	 * DESIGN DECISION: Register Agent Coordination View (Webview with Gantt chart)
	 * WHY: User requirement for "Gantt chart of task timeline" + "Task dependencies visualized"
	 *
	 * REASONING CHAIN:
	 * 1. TreeView (UI-001) shows current state snapshot
	 * 2. Webview (UI-002) shows timeline history + dependencies
	 * 3. Gantt chart displays tasks as horizontal bars on timeline
	 * 4. Arrows show dependencies (Task A → Task B)
	 * 5. Handoff points highlighted when tasks transfer
	 * 6. Activity log shows recent events (scrollable, timestamped)
	 * 7. Result: Complete workflow visualization with dependency tracking
	 *
	 * PATTERN: Pattern-UI-002 (Gantt Chart Webview)
	 * RELATED: SprintProgressPanel (UI-001), StatusBarManager (UI-003)
	 */
	// TEMPORARILY DISABLED FOR v0.13.1-beta - Phase 4 code has incomplete NAPI bindings
	// const agentCoordinationProvider = registerAgentCoordinationView(context);

	/**
	 * DESIGN DECISION: Register Status Bar Manager (sprint status indicator)
	 * WHY: User requirement for glanceable sprint status + one-click access to coordination view
	 *
	 * REASONING CHAIN:
	 * 1. Status bar always visible at bottom of VS Code
	 * 2. Color codes provide instant recognition (🟢/🟡/🔴/⚪)
	 * 3. Text shows progress (e.g., "🟢 OAuth2 (3/8) 40%")
	 * 4. Click → opens AgentCoordinationView webview
	 * 5. Result: Sprint status always visible, details one click away
	 *
	 * PATTERN: Pattern-UI-003 (Status Bar Sprint Indicator)
	 * RELATED: SprintProgressPanel (UI-001), AgentCoordinationView (UI-002)
	 */
	const statusBarManager = registerStatusBarManager(context);

	/**
	 * DESIGN DECISION: Register ÆtherLight Claude terminal profile (regular terminal + shell integration)
	 * WHY: Pseudoterminal doesn't provide real TTY - Claude Code needs that to display properly
	 *
	 * REASONING CHAIN:
	 * 1. User creates "ÆtherLight Claude" terminal from dropdown
	 * 2. We create regular terminal (has real TTY)
	 * 3. Automatically run `claude` command to start Claude Code
	 * 4. Shell integration intercepts commands AFTER Claude starts
	 * 5. Enhance commands with patterns before execution
	 * 6. Result: Claude displays properly, we can still enhance input
	 *
	 * PATTERN: Pattern-TERMINAL-INTEGRATION-001 (Shell Integration over Pseudoterminal)
	 * SOURCE: User feedback: "we want to actually launch Claude code directly in it"
	 * RELATED: shell-integration.ts
	 */
	const claudeWrapperProvider = vscode.window.registerTerminalProfileProvider(
		'aetherlight.claudeWrapper',
		{
			provideTerminalProfile: () => {
				// Create regular terminal, not Pseudoterminal
				return new vscode.TerminalProfile({
					name: 'ÆtherLight Claude',
					iconPath: new vscode.ThemeIcon('sparkle'),
				});
			},
		}
	);
	context.subscriptions.push(claudeWrapperProvider);

	/**
	 * DESIGN DECISION: Setup shell integration to intercept commands
	 * WHY: This allows us to enhance commands AFTER Claude Code starts
	 */
	// REMOVED - shell-integration.ts doesn't exist (work-in-progress feature)
	// const shellIntegration = new ShellIntegration(context);
	// context.subscriptions.push(shellIntegration);

	/**
	 * DESIGN DECISION: Real-Time Context Sync DISABLED (Future Release)
	 * WHY: WebSocket implementation causes "WebSocket is not defined" error in Node.js environment
	 *
	 * REASONING CHAIN:
	 * 1. VS Code extensions run in Node.js, not browser
	 * 2. WebSocket API not available in Node.js without 'ws' package
	 * 3. Feature planned for future release after proper Node.js WebSocket implementation
	 * 4. Commenting out to prevent extension activation errors
	 *
	 * TODO (Future Release):
	 * - Add 'ws' package dependency
	 * - Update RealtimeSyncClient to use Node.js WebSocket (require('ws'))
	 * - Test WebSocket connection in Node.js environment
	 *
	 * PATTERN: Pattern-WEBSOCKET-001 (Real-Time Sync Server Architecture)
	 * RELATED: Activity Feed (realtime_sync/activity_feed.ts)
	 * STATUS: Disabled until future release
	 */
	// DISABLED: Real-time sync causes WebSocket errors in Node.js environment
	// try {
	// 	const realtimeSyncManager = await RealtimeSyncManager.initialize(context);
	// 	context.subscriptions.push({
	// 		dispose: () => realtimeSyncManager.dispose()
	// 	});
	// 	console.log('Real-time sync manager initialized');
	// } catch (error) {
	// 	console.log('Real-time sync disabled or failed to initialize:', error);
	// 	// Continue without real-time sync - not a critical failure
	// }

	/**
	 * DESIGN DECISION: Register workspace analyzer commands (integrates @aetherlight/analyzer)
	 * WHY: Enable users to analyze codebases directly from VS Code without CLI
	 *
	 * REASONING CHAIN:
	 * 1. User opens workspace they want to analyze
	 * 2. Run "ÆtherLight: Analyze Workspace" from Command Palette
	 * 3. TypeScript parser scans files → analyzers detect patterns
	 * 4. Optionally generate sprint plans (Phase A/B/C)
	 * 5. Results saved to .aetherlight/analysis.json
	 * 6. Result: Zero-friction codebase analysis + sprint generation
	 *
	 * PATTERN: Pattern-ANALYZER-INTEGRATION-001 (Hybrid Bundling)
	 * RELATED: @aetherlight/analyzer package (packages/aetherlight-analyzer)
	 */
	// TEMPORARILY DISABLED - Missing @aetherlight/analyzer package
	// registerAnalyzeWorkspaceCommands(context);

	/**
	 * DESIGN DECISION: Initialize Update Checker on activation
	 * WHY: Notify users when new versions are available (respect auto-update preference)
	 *
	 * REASONING CHAIN:
	 * 1. Check npm registry for latest version on activation (after 10s delay)
	 * 2. Compare with current extension version (from package.json)
	 * 3. If newer version exists → Show notification with update options
	 * 4. User can update now, view changes, skip version, or auto-update
	 * 5. Check every 12 hours in background (configurable)
	 * 6. Result: Users stay updated without manual checking
	 *
	 * PATTERN: Pattern-UPDATE-001 (Auto-Update Detection)
	 */
	const updateChecker = new UpdateChecker(context);
	updateChecker.start();

	// Register manual update check command
	context.subscriptions.push(
		vscode.commands.registerCommand('aetherlight.checkForUpdates', () => {
			updateChecker.checkNow();
		})
	);

	// Clean up update checker on deactivation
	context.subscriptions.push({
		dispose: () => updateChecker.stop()
	});

	/**
	 * Initialize Skill Executor for running skills
	 *
	 * DESIGN DECISION: Skills are markdown-defined workflows that need execution
	 * WHY: Bridges gap between .claude/skills/ definitions and VS Code commands
	 *
	 * REASONING CHAIN:
	 * 1. Skills defined in .claude/skills/[skill-name]/SKILL.md
	 * 2. SkillExecutor reads and executes them
	 * 3. Each skill becomes a VS Code command
	 * 4. Result: /initialize, /sprint-plan, /code-analyze work in VS Code
	 *
	 * PATTERN: Pattern-SKILLS-001 (Skill Execution Bridge)
	 */
	const skillExecutor = new SkillExecutor();
	await skillExecutor.discoverSkills();
	skillExecutor.registerCommands(context);
	console.log('[ÆtherLight] Skill executor initialized');

	/**
	 * DESIGN DECISION: Inject ACTIVE_SPRINT_* environment variables into ALL terminals
	 * WHY: Claude Code needs sprint context available as environment variables
	 *
	 * REASONING CHAIN:
	 * 1. User creates terminal (manually or via extension)
	 * 2. VS Code injects environment variables from EnvironmentVariableCollection
	 * 3. Claude Code reads ACTIVE_SPRINT_* variables (file path, name, tasks)
	 * 4. Claude knows current sprint context without manual lookup
	 * 5. Result: Automatic sprint awareness in all terminals
	 *
	 * PATTERN: Pattern-TERMINAL-ENV-001 (Global Terminal Environment Variables)
	 * RELATED: SprintLoader (loads sprint data), TerminalSpawner (agent terminals)
	 */
	await updateSprintEnvironmentVariables(context);

	console.log('Lumina extension activated successfully');
}

/**
 * Extension deactivation function - called when VS Code unloads extension
 *
 * DESIGN DECISION: Kill desktop app process on extension deactivation
 * WHY: Clean resource cleanup, prevent orphaned desktop app processes
 *
 * REASONING CHAIN:
 * 1. VS Code calls deactivate() on extension unload/reload
 * 2. Kill desktop app process if running
 * 3. Close IPC WebSocket connection gracefully
 * 4. Log cleanup completion
 * 5. Result: No orphaned processes, clean shutdown
 *
 * PATTERN: Pattern-DESKTOP-AUTO-LAUNCH-001
 * RELATED: launchDesktopApp(), activate()
 *
 * @returns void
 */
export function deactivate(): void {
	console.log('Lumina extension deactivating...');

	// Kill desktop app process if running
	if (desktopAppProcess && !desktopAppProcess.killed) {
		try {
			console.log(`[ÆtherLight] Killing desktop app process (PID: ${desktopAppProcess.pid})`);
			desktopAppProcess.kill();
			console.log('[ÆtherLight] Desktop app process terminated');
		} catch (error) {
			console.error('[ÆtherLight] Failed to kill desktop app process:', error);
		}
	}

	// IPC client cleanup handled by IPCClient destructor
	console.log('Lumina extension deactivated successfully');
}

/**
 * Update terminal environment variables with current sprint data
 *
 * DESIGN DECISION: Extracted to reusable function for sprint file switching
 * WHY: Environment variables must update when user switches sprint files
 *
 * REASONING CHAIN:
 * 1. Load current sprint from configured file path (aetherlight.sprint.filePath)
 * 2. Extract metadata and task statistics
 * 3. Update environment variables for ALL terminals (existing + future)
 * 4. Log success/failure for debugging
 * 5. Result: Claude Code terminals always see current sprint context
 *
 * PATTERN: Pattern-TERMINAL-ENV-001 (Global Terminal Environment Variables)
 * RELATED: SprintLoader.ts:96-124 (findSprintFile), voicePanel.ts:660-690 (switchSprintFile)
 *
 * @param context Extension context with environment variable collection
 */
export async function updateSprintEnvironmentVariables(context: vscode.ExtensionContext): Promise<void> {
	const envCollection = context.environmentVariableCollection;
	envCollection.clear(); // Clear old values first

	// Load sprint data to inject into environment
	const sprintLoader = new SprintLoader(context);
	const { tasks, metadata } = await sprintLoader.loadSprint();

	if (metadata && tasks.length > 0) {
		const sprintFilePath = sprintLoader.getSprintFilePath();
		const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
		const fullSprintPath = path.join(workspaceRoot, sprintFilePath);

		// Set environment variables for all terminals
		envCollection.replace('ACTIVE_SPRINT_FILE', fullSprintPath);
		envCollection.replace('ACTIVE_SPRINT_NAME', metadata.sprint_name);
		envCollection.replace('ACTIVE_SPRINT_VERSION', metadata.version);
		envCollection.replace('ACTIVE_SPRINT_PHASE', metadata.phase || 'unknown');
		envCollection.replace('ACTIVE_SPRINT_STATUS', metadata.status || 'active');
		envCollection.replace('ACTIVE_SPRINT_TASKS_TOTAL', tasks.length.toString());
		envCollection.replace('ACTIVE_SPRINT_TASKS_COMPLETED',
			tasks.filter(t => t.status === 'completed').length.toString());
		envCollection.replace('ACTIVE_SPRINT_TASKS_IN_PROGRESS',
			tasks.filter(t => t.status === 'in_progress').length.toString());

		console.log(`[ÆtherLight] Injected ACTIVE_SPRINT_* environment variables for: ${metadata.sprint_name}`);
	} else {
		console.log('[ÆtherLight] No active sprint found - ACTIVE_SPRINT_* variables not set');
	}
}
