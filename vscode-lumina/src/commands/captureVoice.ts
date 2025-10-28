/**
 * Capture Voice Command - IPC-based voice capture
 *
 * DESIGN DECISION: Extract code context BEFORE sending to desktop
 * WHY: IDE has full editor context, desktop app doesn't - minimize IPC payload
 *
 * REASONING CHAIN:
 * 1. User presses ` (backtick) to open voice panel OR ~ (tilde) to transcribe at cursor
 * 2. Command extracts: file path, language, cursor position, surrounding code
 * 3. Context sent to desktop app via IPC
 * 4. Desktop app starts voice capture with context awareness
 * 5. Voice → transcription → pattern matching happens in desktop
 * 6. Desktop sends back results to IDE
 *
 * PATTERN: Pattern-IDE-001 (VS Code extension scaffold)
 * RELATED: IPC client (client.ts), context extraction (context.ts)
 * FUTURE: Add visual feedback (status bar), error notifications, offline mode
 *
 * @module commands/captureVoice
 */

import * as vscode from 'vscode';
import { IPCClient, StatusCallback } from '../ipc/client';
import { VoiceStatus } from '../ipc/protocol';
import { extractCodeContext } from '../utils/context';

/**
 * Insert text at cursor position in active editor
 *
 * DESIGN DECISION: Insert as snippet for better UX (tab stops, placeholders in future)
 * WHY: Snippets support cursor positioning, selections, tab stops
 *
 * REASONING CHAIN:
 * 1. Get active text editor
 * 2. Get current cursor position (or selection)
 * 3. Insert text using snippet (supports future enhancements)
 * 4. Cursor automatically advances after insertion
 * 5. Future: Add tab stops, placeholders for pattern parameters
 *
 * @param text - Text to insert at cursor
 * @returns Promise that resolves when insertion complete
 */
async function insertTextAtCursor(text: string): Promise<void> {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		throw new Error('No active editor');
	}

	/**
	 * DESIGN DECISION: Use snippet for insertion (not simple edit)
	 * WHY: Snippets support tab stops, placeholders, transformations
	 *
	 * Future enhancements:
	 * - Tab stops: ${1:defaultValue}
	 * - Placeholders: ${2:parameterName}
	 * - Choices: ${3|option1,option2,option3|}
	 * - Transformations: ${TM_SELECTED_TEXT/regex/replacement/}
	 */
	const snippet = new vscode.SnippetString(text);
	await editor.insertSnippet(snippet);
}

/**
 * Register capture voice command with VS Code
 *
 * DESIGN DECISION: Command retrieves IPC client from extension context
 * WHY: Single client instance shared across all commands
 *
 * REASONING CHAIN:
 * 1. Extension activation creates IPC client
 * 2. Client stored in context.globalState
 * 3. Command retrieves client from context
 * 4. Command uses client to send IPC messages
 * 5. Avoids multiple WebSocket connections
 *
 * @param context - VS Code extension context (provides IPC client access)
 */
export function registerCaptureVoiceCommand(context: vscode.ExtensionContext): void {
	const disposable = vscode.commands.registerCommand('lumina.captureVoice', async () => {
		try {
			// Get IPC client from context
			const ipcClient = context.globalState.get<IPCClient>('ipcClient');
			if (!ipcClient) {
				vscode.window.showErrorMessage('Lumina: IPC client not initialized');
				return;
			}

			// Get status bar from context
			const statusBar = context.globalState.get<any>('luminaControlStatusBar');

			// Update status bar: Recording started
			if (statusBar && typeof statusBar.setRecordingStatus === 'function') {
				statusBar.setRecordingStatus('recording');
			}

			// Extract code context from active editor
			const codeContext = extractCodeContext();
			if (!codeContext) {
				vscode.window.showWarningMessage('Lumina: No active editor or code context');
				return;
			}

			/**
			 * DESIGN DECISION: Show real-time status updates via callback
			 * WHY: Better UX - user sees "listening", "transcribing", "matching" states
			 *
			 * REASONING CHAIN:
			 * 1. Desktop sends VoiceStatus messages during capture
			 * 2. Status callback receives: listening → transcribing → matching → complete
			 * 3. Show status in VS Code UI (status bar or notifications)
			 * 4. User knows system is working, not frozen
			 * 5. Future: Add progress indicator, cancel button
			 */
			const statusCallback: StatusCallback = (status: VoiceStatus) => {
				const statusMessages: Record<VoiceStatus['status'], string> = {
					listening: 'Listening...',
					transcribing: 'Transcribing voice...',
					matching: 'Finding patterns...',
					complete: 'Complete',
					error: 'Error occurred'
				};
				const message = status.message || statusMessages[status.status];
				console.log(`Lumina status: ${message}`);
				// Future: Show in status bar instead of console
			};

			// Send capture request to desktop via IPC with status callback
			const response = await ipcClient.sendCaptureVoice(codeContext, statusCallback);

			// Update status bar: Recording stopped
			if (statusBar && typeof statusBar.setRecordingStatus === 'function') {
				statusBar.setRecordingStatus('idle');
			}

			/**
			 * Handle response from desktop
			 *
			 * DESIGN DECISION: Auto-insert at high confidence (>85%), prompt at medium (50-85%), warn at low (<50%)
			 * WHY: High confidence = user's intent is clear, auto-insert speeds up workflow
			 *
			 * REASONING CHAIN:
			 * 1. Success: Show transcription text + confidence + pattern (if matched)
			 * 2. High confidence (>85%): Auto-insert text at cursor, show confirmation
			 * 3. Medium confidence (50-85%): Prompt user to confirm before insert
			 * 4. Low confidence (<50%): Show warning, don't auto-insert
			 * 5. Failure: Show error message with error code (structured error handling)
			 * 6. Future: Add Quick Send buttons, pattern code insertion
			 */
			if (response.success) {
				// Update status bar with pattern match confidence
				if (statusBar && typeof statusBar.setPatternMatchConfidence === 'function' && response.pattern) {
					statusBar.setPatternMatchConfidence(response.pattern.confidence);
				}
				const confidencePercent = (response.confidence * 100).toFixed(0);
				const patternInfo = response.pattern
					? ` | Matched: ${response.pattern.name} (${(response.pattern.confidence * 100).toFixed(0)}%)`
					: '';

				/**
				 * DESIGN DECISION: Confidence-based auto-insertion thresholds
				 * WHY: Balance between automation and accuracy
				 *
				 * >85%: High confidence - auto-insert (user's intent is clear)
				 * 50-85%: Medium confidence - prompt user (uncertain, let user decide)
				 * <50%: Low confidence - warn only (likely wrong, don't insert)
				 */
				if (response.confidence >= 0.85) {
					// High confidence: Auto-insert at cursor
					await insertTextAtCursor(response.text);
					vscode.window.showInformationMessage(
						`Lumina: Inserted "${response.text}" | Confidence: ${confidencePercent}%${patternInfo}`
					);
				} else if (response.confidence >= 0.50) {
					// Medium confidence: Prompt user
					const choice = await vscode.window.showWarningMessage(
						`Lumina: "${response.text}" | Confidence: ${confidencePercent}%${patternInfo}`,
						'Insert', 'Cancel'
					);
					if (choice === 'Insert') {
						await insertTextAtCursor(response.text);
						vscode.window.showInformationMessage(`Lumina: Inserted "${response.text}"`);
					}
				} else {
					// Low confidence: Warn only, don't insert
					vscode.window.showWarningMessage(
						`Lumina: Low confidence (${confidencePercent}%) - "${response.text}"${patternInfo}`
					);
				}
			} else {
				const errorDetails = response.errorCode ? ` (${response.errorCode})` : '';
				vscode.window.showErrorMessage(
					`Lumina: Voice capture failed - ${response.error || 'Unknown error'}${errorDetails}`
				);
			}
		} catch (error) {
			// Update status bar: Error, stop recording
			const statusBar = context.globalState.get<any>('luminaControlStatusBar');
			if (statusBar && typeof statusBar.setRecordingStatus === 'function') {
				statusBar.setRecordingStatus('idle');
			}

			// Handle connection errors gracefully
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			vscode.window.showErrorMessage(
				`Lumina: Failed to connect to desktop app - ${errorMessage}`
			);
			console.error('Capture voice command error:', error);
		}
	});

	// Add command to extension subscriptions for cleanup
	context.subscriptions.push(disposable);
	console.log('Capture voice command registered');
}
