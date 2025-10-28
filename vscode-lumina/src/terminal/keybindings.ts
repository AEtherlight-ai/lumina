/**
 * Terminal Middleware - Keyboard Shortcuts & Accessibility
 *
 * DESIGN DECISION: Standard keyboard shortcuts (familiar to users)
 * WHY: ` and ~ = voice capture hotkeys, Enter/Ctrl+Enter = universal
 *
 * REASONING CHAIN:
 * 1. ` (backtick) opens voice panel, ~ (tilde) transcribes at cursor
 * 2. Enter for single-line = universal terminal behavior
 * 3. Ctrl+Enter for multiline = common in IDEs (VS Code, IntelliJ)
 * 4. Esc for cancel = universal cancel key
 * 5. Tab for autocomplete = universal autocomplete key
 * 6. Result: Zero learning curve
 *
 * PATTERN: Pattern-UX-001 (Familiar Keyboard Shortcuts)
 * RELATED: Voice panel hotkeys (` opens panel, ~ transcribes inline), VS Code keybindings
 * PERFORMANCE: <10ms key detection
 */

import * as vscode from 'vscode';

/**
 * Keybinding Actions
 */
export enum KeybindingAction {
    TOGGLE_VOICE = 'toggle_voice',
    SEND_SINGLE_LINE = 'send_single_line',
    SEND_MULTILINE = 'send_multiline',
    CANCEL = 'cancel',
    AUTOCOMPLETE_PATTERN = 'autocomplete_pattern',
    SHOW_PATTERNS = 'show_patterns',
}

/**
 * Keybinding Handler Callback
 */
export type KeybindingHandler = (action: KeybindingAction) => void | Promise<void>;

/**
 * Keyboard Shortcuts Manager
 *
 * DESIGN DECISION: Map keyboard events to actions
 * WHY: Decouple key detection from action handling
 */
export class KeybindingsManager {
    private handler: KeybindingHandler | null = null;

    /**
     * Register keybinding handler
     */
    registerHandler(handler: KeybindingHandler): void {
        this.handler = handler;
    }

    /**
     * Handle keyboard input
     *
     * DESIGN DECISION: Detect special keys, forward to handler
     * WHY: Centralized keyboard logic
     *
     * PERFORMANCE: <10ms key detection
     */
    handleInput(data: string): KeybindingAction | null {
        // Voice capture (` and ~) - Handled via VS Code commands, not raw terminal input
        // NOTE: ` opens voice panel, ~ transcribes at cursor (see package.json keybindings)

        // Enter (send single-line)
        if (data === '\r') {
            return KeybindingAction.SEND_SINGLE_LINE;
        }

        // Ctrl+Enter (send multiline)
        if (data === '\r\n' || data === '\n') {
            return KeybindingAction.SEND_MULTILINE;
        }

        // Escape (cancel)
        if (data === '\x1b') {
            return KeybindingAction.CANCEL;
        }

        // Tab (autocomplete pattern)
        if (data === '\t') {
            return KeybindingAction.AUTOCOMPLETE_PATTERN;
        }

        // Ctrl+Space (show patterns)
        if (data === '\x00') {
            return KeybindingAction.SHOW_PATTERNS;
        }

        return null;
    }
}

/**
 * Accessibility Manager
 *
 * DESIGN DECISION: ARIA labels for screen readers
 * WHY: Accessibility = not optional
 *
 * REASONING CHAIN:
 * 1. Screen reader users need labels
 * 2. ARIA labels describe UI elements
 * 3. VS Code supports ARIA in webviews
 * 4. Result: Accessible terminal middleware
 */
export class AccessibilityManager {
    /**
     * Get ARIA label for mic icon
     */
    getMicIconLabel(isRecording: boolean): string {
        return isRecording
            ? 'Stop voice recording (press ` again or Escape)'
            : 'Start voice recording (press ` to open panel or ~ to transcribe inline)';
    }

    /**
     * Get ARIA label for text input
     */
    getTextInputLabel(): string {
        return 'Type your request (press Enter to send, Ctrl+Enter for multiline)';
    }

    /**
     * Get ARIA label for enhanced prompt preview
     */
    getPreviewLabel(patternCount: number): string {
        return `Enhanced prompt preview with ${patternCount} pattern${patternCount === 1 ? '' : 's'} matched. Press S to send, E to edit, C to cancel.`;
    }

    /**
     * Announce to screen reader
     */
    announce(message: string, context: vscode.ExtensionContext): void {
        // VS Code doesn't have direct screen reader API
        // Use status bar message (screen readers read status bar)
        vscode.window.setStatusBarMessage(`ÆtherLight: ${message}`, 3000);
    }
}

/**
 * Register keyboard shortcuts in VS Code
 */
export function registerKeybindings(context: vscode.ExtensionContext): void {
    // NOTE: Voice capture hotkeys (` and ~) are registered in package.json
    // ` opens voice panel, ~ transcribes at cursor
    const toggleVoice = vscode.commands.registerCommand('aetherlight.terminal.toggleVoice', () => {
        // This command is invoked by voice panel hotkeys
        // The active terminal middleware instance will handle it
        vscode.commands.executeCommand('workbench.action.terminal.focus');
    });

    // Ctrl+Shift+P: Show pattern suggestions
    const showPatterns = vscode.commands.registerCommand(
        'aetherlight.terminal.showPatterns',
        () => {
            // Show quick pick with pattern suggestions
            vscode.window.showQuickPick(
                [
                    { label: 'Pattern-AUTH-001', description: 'OAuth2 Authentication' },
                    { label: 'Pattern-SESSION-003', description: 'Session Management' },
                    { label: 'Pattern-BUG-AUTH-005', description: 'Auth Token Refresh' },
                ],
                {
                    placeHolder: 'Search patterns...',
                    matchOnDescription: true,
                }
            );
        }
    );

    context.subscriptions.push(toggleVoice, showPatterns);
}

/**
 * Keybindings configuration for package.json
 *
 * DESIGN DECISION: Export keybindings for package.json contribution point
 * WHY: VS Code requires keybindings in package.json
 */
export const KEYBINDINGS_CONTRIBUTION = [
    // NOTE: Voice capture hotkeys (` and ~) are defined in package.json
    // This configuration is for terminal-specific patterns shortcuts only
    {
        command: 'aetherlight.terminal.showPatterns',
        key: 'ctrl+shift+p',
        mac: 'cmd+shift+p',
        when: 'terminalFocus && terminalProcessSupported',
    },
];

/**
 * Keybindings documentation (for user guide)
 */
export const KEYBINDINGS_DOCS = `
# Terminal Middleware Keyboard Shortcuts

## Voice Recording
- **\` (backtick)**: Open voice panel with cursor in Command/Transcription input
- **~ (tilde/Shift+\`)**: Start transcribing at current cursor position (any input field)

## Text Input
- **Enter**: Send single-line input (prompt will be enhanced automatically)
- **Ctrl+Enter** (Windows/Linux) / **Cmd+Enter** (Mac): Send multiline input

## Cancellation
- **Esc**: Cancel current operation (voice recording or prompt preview)

## Pattern Autocomplete
- **Tab**: Autocomplete pattern name (shows suggestions)
- **Ctrl+Space**: Show all available patterns

## Navigation
- **Arrow Up/Down**: Navigate conversation history (when input is empty)
- **Home/End**: Move to start/end of input line
- **Ctrl+Home/End**: Navigate to first/last character in multiline input

## Accessibility
- All UI elements have ARIA labels for screen readers
- Status bar messages announce state changes
- Keyboard-only navigation supported (no mouse required)
`;
