/**
 * Code Context Extraction Utility
 *
 * DESIGN DECISION: Extract minimal but sufficient context for pattern matching
 * WHY: Balance between context richness and IPC payload size
 *
 * REASONING CHAIN:
 * 1. User presses ` (backtick) or ~ (tilde) while cursor in editor
 * 2. Extract: file path, language ID, surrounding code (50 lines before/after cursor per spec)
 * 3. Context helps pattern matching understand "where user is" in code
 * 4. Desktop app uses context for:
 *    - Language-specific pattern matching
 *    - File-type awareness
 *    - Cursor position hints
 * 5. Minimal payload = faster IPC (<5ms target)
 *
 * PATTERN: Pattern-IDE-001 (VS Code extension scaffold)
 * RELATED: captureVoice command (uses this utility), protocol.ts (CodeContext type)
 * FUTURE: Add function/class detection, git blame info, recent edits
 *
 * @module utils/context
 */

import * as vscode from 'vscode';
import { CodeContext } from '../ipc/protocol';

/**
 * Extract code context from active VS Code editor
 *
 * DESIGN DECISION: Extract 50 lines before/after cursor for context window
 * WHY: Spec requires 50-line radius for better pattern matching accuracy
 *
 * REASONING CHAIN:
 * 1. Get active text editor from VS Code
 * 2. Extract file path (absolute path for desktop app reference)
 * 3. Extract language ID (e.g., "typescript", "rust", "python")
 * 4. Extract cursor position (line, column for precise context)
 * 5. Extract surrounding code (50 lines radius = 100 lines total per spec)
 * 6. Return structured context object matching protocol.ts CodeContext
 *
 * FUTURE: Add smart context extraction (expand to function/class boundaries)
 *
 * @returns CodeContext if active editor exists, null otherwise
 */
export function extractCodeContext(): CodeContext | null {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return null;
	}

	const document = editor.document;
	const selection = editor.selection;
	const cursorPosition = selection.active;

	/**
	 * DESIGN DECISION: Extract 50 lines before and after cursor
	 * WHY: Spec requirement for better pattern matching (was 20 in P1-009)
	 *
	 * REASONING CHAIN:
	 * 1. Calculate start line = max(0, cursor - 50)
	 * 2. Calculate end line = min(lastLine, cursor + 50)
	 * 3. Extract text range from document
	 * 4. Include line numbers for precise cursor positioning
	 * 5. Desktop can use context for smarter pattern matching
	 */
	const contextRadius = 50;
	const startLine = Math.max(0, cursorPosition.line - contextRadius);
	const endLine = Math.min(document.lineCount - 1, cursorPosition.line + contextRadius);
	const range = new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length);
	const surroundingCode = document.getText(range);

	return {
		language: document.languageId,
		currentFile: document.uri.fsPath,
		cursorPosition: {
			line: cursorPosition.line,
			character: cursorPosition.character
		},
		surroundingCode
	};
}
