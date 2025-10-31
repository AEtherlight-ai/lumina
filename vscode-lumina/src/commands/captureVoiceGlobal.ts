/**
 * Capture Voice Global Command - Shift+` Hotkey Handler
 *
 * DESIGN DECISION: Record voice and type transcription at cursor position
 * WHY: Universal voice typing that works everywhere (editor, terminal, any input)
 *
 * REASONING CHAIN:
 * 1. User presses Shift+` (tilde key)
 * 2. Command activates and starts voice recording via IPC
 * 3. Desktop app captures audio natively
 * 4. Transcription sent back via IPC
 * 5. Text typed at current cursor position using VS Code APIs
 * 6. Result: Voice-to-text works in any VS Code context
 *
 * PATTERN: Pattern-VOICE-005 (Global Voice Typing)
 * RELATED: voicePanel.ts, IPC client, desktop app
 */

import * as vscode from 'vscode';
import { IPCClient } from '../ipc/client';

/**
 * Registers the Capture Voice Global command (Shift+` hotkey)
 */
export function registerCaptureVoiceGlobalCommand(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand('aetherlight.captureVoiceGlobal', async () => {
        try {
            // For now, this command will invoke the enhanceTerminalInput command
            // since the IPC-based voice capture requires desktop app integration
            // that isn't fully implemented yet.
            //
            // TODO: Full implementation requires:
            // 1. Desktop app implementing voice recording API
            // 2. IPC protocol for startRecording/stopRecording
            // 3. Streaming transcription back to extension
            //
            // For v0.15.2, we'll use the enhancement feature instead

            vscode.window.showInformationMessage(
                'Voice capture requires desktop app. Use enhancement feature instead.',
                'Use Enhancement'
            ).then(selection => {
                if (selection === 'Use Enhancement') {
                    vscode.commands.executeCommand('aetherlight.enhanceTerminalInput');
                }
            });

        } catch (error: any) {
            console.error('[ÆtherLight] Capture voice global failed:', error);
            vscode.window.showErrorMessage(`ÆtherLight: Voice capture failed - ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
    console.log('[ÆtherLight] Capture Voice Global command registered (Shift+`)');
}
