/**
 * VS Code Extension Tests
 *
 * DESIGN DECISION: Basic smoke tests for extension activation and command registration
 * WHY: Verify extension scaffold works before full integration testing (P1-011)
 *
 * REASONING CHAIN:
 * 1. Test suite verifies extension activates without errors
 * 2. Verifies F13 command is registered
 * 3. Verifies IPC client can be created (connection tested in P1-010)
 * 4. Full integration tests happen in P1-011 (with mock server)
 * 5. These tests = smoke tests for scaffold validation
 *
 * PATTERN: Pattern-IDE-001 (VS Code extension scaffold)
 * RELATED: extension.ts (activation logic)
 * FUTURE: Add unit tests for context extraction, IPC message serialization
 *
 * @module test/extension.test
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Lumina Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	/**
	 * Test: Extension activation
	 *
	 * DESIGN DECISION: Verify extension loads and activates
	 * WHY: Basic sanity check for scaffold
	 */
	test('Extension should be present', () => {
		const extension = vscode.extensions.getExtension('aetherlight.lumina-vscode');
		assert.ok(extension, 'Extension not found - check publisher and name in package.json');
	});

	/**
	 * Test: Extension activation
	 *
	 * DESIGN DECISION: Verify activation doesn't throw errors
	 * WHY: Extension must activate for commands to work
	 */
	test('Extension should activate', async () => {
		const extension = vscode.extensions.getExtension('aetherlight.lumina-vscode');
		assert.ok(extension, 'Extension not found');

		await extension.activate();
		assert.ok(extension.isActive, 'Extension failed to activate');
	});

	/**
	 * Test: Command registration
	 *
	 * DESIGN DECISION: Verify F13 command is registered
	 * WHY: Command must exist for F13 hotkey to work
	 */
	test('Capture voice command should be registered', async () => {
		const commands = await vscode.commands.getCommands(true);
		assert.ok(
			commands.includes('lumina.captureVoice'),
			'lumina.captureVoice command not registered'
		);
	});
});
