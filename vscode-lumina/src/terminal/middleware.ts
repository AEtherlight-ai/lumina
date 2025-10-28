/**
 * Terminal Middleware - Voice + Typing → Enhanced AI Prompts
 *
 * DESIGN DECISION: Inline terminal UI (not external window)
 * WHY: Users shouldn't leave terminal to use AI assistance
 *
 * REASONING CHAIN:
 * 1. Terminal = primary developer workspace
 * 2. Context switching = productivity killer
 * 3. Desktop app = separate window (friction)
 * 4. Inline UI = zero context switch
 * 5. Mic icon = familiar pattern (Zoom, Google Meet)
 * 6. Voice OR typing → same enhanced prompt
 *
 * PATTERN: Pattern-TERMINAL-001 (Inline AI Assistance)
 * RELATED: Phase 2 (Desktop App), Pattern-IPC-001, AI-005 (Pattern Index)
 * PERFORMANCE: <100ms activation, <3s voice-to-enhanced, <500ms typing-to-enhanced
 */

import * as vscode from 'vscode';
import { InputProcessor, VoiceInput, TextInput } from './input-processor';
import { ContextEnhancer, EnhancedPrompt } from './context-enhancer';
import { PromptGenerator } from './prompt-generator';
import { VoiceCapture } from './voice-capture';

/**
 * Terminal Middleware State
 */
enum MiddlewareState {
    IDLE = 'idle',
    LISTENING = 'listening',
    TRANSCRIBING = 'transcribing',
    ENHANCING = 'enhancing',
    PREVIEWING = 'previewing',
}

/**
 * Terminal Middleware UI State
 */
interface UIState {
    state: MiddlewareState;
    text: string;
    enhancedPrompt: EnhancedPrompt | null;
    isVoiceActive: boolean;
    recordingDuration: number;
}

/**
 * Terminal Middleware - Main Controller
 *
 * DESIGN DECISION: Pseudoterminal (PTY) for input interception
 * WHY: VS Code Pseudoterminal API allows input interception before shell
 *
 * REASONING CHAIN:
 * 1. Standard terminal = sends input directly to shell
 * 2. Pseudoterminal = intercepts input, processes, then forwards
 * 3. We intercept → enhance → send to Claude Code
 * 4. User sees enhanced prompt before sending (preview)
 * 5. User can edit or cancel before sending
 */
export class TerminalMiddleware implements vscode.Pseudoterminal {
    private writeEmitter = new vscode.EventEmitter<string>();
    onDidWrite: vscode.Event<string> = this.writeEmitter.event;

    private closeEmitter = new vscode.EventEmitter<number>();
    onDidClose: vscode.Event<number> = this.closeEmitter.event;

    private inputProcessor: InputProcessor;
    private contextEnhancer: ContextEnhancer;
    private promptGenerator: PromptGenerator;
    private voiceCapture: VoiceCapture;

    private uiState: UIState = {
        state: MiddlewareState.IDLE,
        text: '',
        enhancedPrompt: null,
        isVoiceActive: false,
        recordingDuration: 0,
    };

    private currentInput: string = '';
    private inputBuffer: string[] = [];

    constructor() {
        this.inputProcessor = new InputProcessor();
        this.contextEnhancer = new ContextEnhancer();
        this.promptGenerator = new PromptGenerator();
        this.voiceCapture = new VoiceCapture();

        // Listen for voice capture events
        this.voiceCapture.onTranscription((text) => this.handleTranscription(text));
        this.voiceCapture.onError((error) => this.handleVoiceError(error));
    }

    /**
     * Open terminal - show welcome UI
     */
    open(initialDimensions: vscode.TerminalDimensions | undefined): void {
        this.showWelcome();
    }

    /**
     * Close terminal - cleanup
     */
    close(): void {
        this.voiceCapture.stop();
        this.closeEmitter.fire(0);
    }

    /**
     * Handle input from user
     *
     * DESIGN DECISION: Intercept all input before shell
     * WHY: Need to enhance prompts before sending to AI
     */
    handleInput(data: string): void {
        /**
         * DEBUG: Show keycode on screen so we can SEE what F4 sends
         */
        const dataHex = Buffer.from(data).toString('hex');
        const charCodes = data.split('').map(c => c.charCodeAt(0));

        // VISUAL DEBUG: Write to terminal screen
        this.writeEmitter.fire(`\r\n[DEBUG] Key pressed:\r\n`);
        this.writeEmitter.fire(`  Hex: ${dataHex}\r\n`);
        this.writeEmitter.fire(`  Codes: [${charCodes.join(', ')}]\r\n`);
        this.writeEmitter.fire(`  String: "${data}"\r\n`);
        this.writeEmitter.fire(`\r\n`);

        // Also log to console
        console.log('[ÆtherLight Terminal] Key:', dataHex, 'Codes:', charCodes);

        // Check if this looks like F4 and DON'T consume it
        if (charCodes.includes(83) || // Just 'S' (char code 83)
            dataHex.includes('1b4f53') || // ESC O S
            dataHex.includes('1b5b') // ESC [ (function keys)
        ) {
            this.writeEmitter.fire(`[DEBUG] This looks like F4 - NOT consuming it\r\n\r\n`);
            return; // Don't consume, let VS Code handle
        }

        // Check for special keys
        if (data === '\r') {
            // Enter pressed - process input
            this.processInput();
        } else if (data === '\x1b') {
            // Escape pressed - cancel
            this.cancel();
        } else if (data === '\x7f') {
            // Backspace pressed
            if (this.currentInput.length > 0) {
                this.currentInput = this.currentInput.slice(0, -1);
                this.writeEmitter.fire('\b \b'); // Move back, space, move back
            }
        } else if (data === '\t') {
            // Tab pressed - autocomplete pattern
            this.autocompletePattern();
        } else {
            // Regular character
            this.currentInput += data;
            this.writeEmitter.fire(data);
        }
    }

    /**
     * Show welcome UI with mic icon
     */
    private showWelcome(): void {
        this.writeEmitter.fire('\x1b[2J\x1b[H'); // Clear screen
        this.writeEmitter.fire('\r\n');
        this.writeEmitter.fire('  ÆtherLight Terminal Middleware\r\n');
        this.writeEmitter.fire('  ════════════════════════════════\r\n');
        this.writeEmitter.fire('\r\n');
        this.writeEmitter.fire('  🎤 Press ` (backtick) to open voice panel or ~ (tilde) to transcribe inline\r\n');
        this.writeEmitter.fire('  ⌨️  Type your request naturally\r\n');
        this.writeEmitter.fire('  ✨ All inputs get context enhancement\r\n');
        this.writeEmitter.fire('\r\n');
        this.writeEmitter.fire('  $ ');
    }

    /**
     * Toggle voice recording
     *
     * PERFORMANCE: <100ms activation (instant feedback)
     */
    async toggleVoice(): Promise<void> {
        if (this.uiState.isVoiceActive) {
            // Stop recording
            this.uiState.isVoiceActive = false;
            this.uiState.state = MiddlewareState.TRANSCRIBING;
            this.updateUI();

            const audioBlob = await this.voiceCapture.stop();
            await this.processVoiceInput(audioBlob);
        } else {
            // Start recording
            this.uiState.isVoiceActive = true;
            this.uiState.state = MiddlewareState.LISTENING;
            this.uiState.recordingDuration = 0;
            this.updateUI();

            this.voiceCapture.start();
            this.startRecordingTimer();
        }
    }

    /**
     * Process text input (Enter pressed)
     *
     * PERFORMANCE: <500ms enhancement
     */
    private async processInput(): Promise<void> {
        if (this.currentInput.trim().length === 0) {
            this.writeEmitter.fire('\r\n$ ');
            return;
        }

        this.uiState.state = MiddlewareState.ENHANCING;
        this.updateUI();

        try {
            // Create text input
            const textInput: TextInput = {
                type: 'text',
                text: this.currentInput,
                timestamp: Date.now(),
            };

            // Process and enhance
            const enhanced = await this.inputProcessor.processInput(textInput);
            this.uiState.enhancedPrompt = enhanced;
            this.uiState.state = MiddlewareState.PREVIEWING;
            this.updateUI();

            // Show preview
            this.showPreview(enhanced);
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Process voice input (transcription complete)
     *
     * PERFORMANCE: <3s total (transcribe + enhance)
     */
    private async processVoiceInput(audioBlob: Blob): Promise<void> {
        try {
            this.writeEmitter.fire('\r\n  🔄 Transcribing...\r\n');

            // Create voice input
            const voiceInput: VoiceInput = {
                type: 'voice',
                audioBlob: audioBlob,
                timestamp: Date.now(),
            };

            // Process and enhance
            this.uiState.state = MiddlewareState.ENHANCING;
            const enhanced = await this.inputProcessor.processInput(voiceInput);
            this.uiState.enhancedPrompt = enhanced;
            this.uiState.state = MiddlewareState.PREVIEWING;
            this.updateUI();

            // Show preview
            this.showPreview(enhanced);
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Show enhanced prompt preview
     */
    private showPreview(enhanced: EnhancedPrompt): void {
        this.writeEmitter.fire('\r\n');
        this.writeEmitter.fire('  ✨ Enhanced Prompt:\r\n');
        this.writeEmitter.fire('  ─────────────────────────────────\r\n');
        this.writeEmitter.fire(`\r\n  ${enhanced.userInput}\r\n`);

        if (enhanced.patterns && enhanced.patterns.length > 0) {
            this.writeEmitter.fire('\r\n  📊 Patterns:\r\n');
            enhanced.patterns.slice(0, 3).forEach((pattern) => {
                this.writeEmitter.fire(`    - ${pattern.name} (${pattern.confidence}%)\r\n`);
            });
        }

        if (enhanced.fileContext) {
            this.writeEmitter.fire(`\r\n  📁 File: ${enhanced.fileContext.fileName}\r\n`);
        }

        if (enhanced.projectState) {
            this.writeEmitter.fire(
                `  🏗️  Project: ${enhanced.projectState.language} + ${enhanced.projectState.framework}\r\n`
            );
        }

        this.writeEmitter.fire('\r\n');
        this.writeEmitter.fire('  [S]end  [E]dit  [C]ancel\r\n');
        this.writeEmitter.fire('  $ ');
    }

    /**
     * Handle transcription complete
     */
    private handleTranscription(text: string): void {
        this.writeEmitter.fire(`\r\n  📝 "${text}"\r\n`);
        this.currentInput = text;
        this.processInput();
    }

    /**
     * Handle voice error
     */
    private handleVoiceError(error: Error): void {
        this.writeEmitter.fire(`\r\n  ❌ Voice error: ${error.message}\r\n`);
        this.uiState.isVoiceActive = false;
        this.uiState.state = MiddlewareState.IDLE;
        this.updateUI();
    }

    /**
     * Handle general error
     */
    private handleError(error: any): void {
        this.writeEmitter.fire(`\r\n  ❌ Error: ${error.message}\r\n`);
        this.uiState.state = MiddlewareState.IDLE;
        this.updateUI();
        this.writeEmitter.fire('  $ ');
    }

    /**
     * Cancel current operation
     */
    private cancel(): void {
        this.currentInput = '';
        this.uiState.state = MiddlewareState.IDLE;
        this.uiState.enhancedPrompt = null;

        if (this.uiState.isVoiceActive) {
            this.voiceCapture.stop();
            this.uiState.isVoiceActive = false;
        }

        this.writeEmitter.fire('\r\n  ❌ Cancelled\r\n');
        this.writeEmitter.fire('  $ ');
        this.updateUI();
    }

    /**
     * Autocomplete pattern name
     */
    private async autocompletePattern(): Promise<void> {
        // TODO: Implement pattern autocomplete using AI-005 Pattern Index
        this.writeEmitter.fire('  [Pattern autocomplete not yet implemented]\r\n');
    }

    /**
     * Update UI based on state
     */
    private updateUI(): void {
        // Update status bar, webview, etc.
        // TODO: Implement UI updates
    }

    /**
     * Start recording timer (shows duration)
     */
    private startRecordingTimer(): void {
        const startTime = Date.now();
        const timer = setInterval(() => {
            if (!this.uiState.isVoiceActive) {
                clearInterval(timer);
                return;
            }

            this.uiState.recordingDuration = Math.floor((Date.now() - startTime) / 1000);
            this.updateUI();
        }, 1000);
    }

    /**
     * Send enhanced prompt to Claude Code
     */
    async sendToClaudeCode(enhanced: EnhancedPrompt): Promise<void> {
        // Format prompt
        const formattedPrompt = this.promptGenerator.format(enhanced);

        // Send to Claude Code (via extension command)
        await vscode.commands.executeCommand('claude.sendMessage', formattedPrompt);

        // Reset state
        this.currentInput = '';
        this.uiState.state = MiddlewareState.IDLE;
        this.uiState.enhancedPrompt = null;
        this.updateUI();

        this.writeEmitter.fire('\r\n  ✅ Sent to Claude Code\r\n');
        this.writeEmitter.fire('  $ ');
    }
}

/**
 * Track active middleware instances by terminal
 */
const activeMiddlewares = new Map<vscode.Terminal, TerminalMiddleware>();

/**
 * Register terminal middleware
 */
export function registerTerminalMiddleware(context: vscode.ExtensionContext): void {
    // Register pseudoterminal provider
    const terminalProvider = vscode.window.registerTerminalProfileProvider(
        'aetherlight.terminal',
        {
            provideTerminalProfile: (token: vscode.CancellationToken) => {
                const middleware = new TerminalMiddleware();

                const profile = new vscode.TerminalProfile({
                    name: 'ÆtherLight',
                    pty: middleware,
                    iconPath: new vscode.ThemeIcon('mic'),
                });

                // Store middleware for command access
                // Associate it with the terminal when it's created
                setTimeout(() => {
                    const terminal = vscode.window.activeTerminal;
                    if (terminal && terminal.name === 'ÆtherLight') {
                        activeMiddlewares.set(terminal, middleware);
                        console.log('[Lumina] Middleware registered for terminal:', terminal.name);
                    }
                }, 100);

                return profile;
            },
        }
    );

    context.subscriptions.push(terminalProvider);

    // Clean up middleware when terminal closes
    context.subscriptions.push(
        vscode.window.onDidCloseTerminal((terminal) => {
            if (activeMiddlewares.has(terminal)) {
                console.log('[Lumina] Cleaning up middleware for terminal:', terminal.name);
                activeMiddlewares.delete(terminal);
            }
        })
    );

    // Register F4 command to toggle voice
    const toggleVoiceCommand = vscode.commands.registerCommand(
        'aetherlight.toggleVoice',
        async () => {
            console.log('[Lumina] ========================================');
            console.log('[Lumina] F4 COMMAND TRIGGERED!');
            console.log('[Lumina] Active terminal:', vscode.window.activeTerminal?.name);
            console.log('[Lumina] Active middlewares count:', activeMiddlewares.size);
            console.log('[Lumina] ========================================');

            vscode.window.showInformationMessage('🎤 F4 pressed! Check Output → Extension Host for logs');

            const terminal = vscode.window.activeTerminal;
            if (!terminal || terminal.name !== 'ÆtherLight') {
                console.log('[Lumina] ERROR: Not an ÆtherLight terminal');
                vscode.window.showWarningMessage(
                    'Please use an ÆtherLight terminal. Create one from the + dropdown.'
                );
                return;
            }

            const middleware = activeMiddlewares.get(terminal);
            if (!middleware) {
                console.log('[Lumina] ERROR: No middleware found for terminal');
                vscode.window.showErrorMessage(
                    'Could not find middleware for this terminal. Try creating a new ÆtherLight terminal.'
                );
                return;
            }

            console.log('[Lumina] SUCCESS: Calling middleware.toggleVoice()');
            // Actually call the toggleVoice method!
            await middleware.toggleVoice();
            console.log('[Lumina] toggleVoice() completed');
        }
    );

    context.subscriptions.push(toggleVoiceCommand);
}
