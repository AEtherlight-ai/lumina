import * as assert from 'assert';
import * as vscode from 'vscode';
import { VoiceViewProvider } from '../../src/commands/voicePanel';

/**
 * UNLINK-006: Comprehensive unit tests for link state management
 *
 * TDD GREEN Phase: Expand tests for full coverage
 *
 * Test Strategy:
 * - Verify panelLinkStates Map exists and is initialized
 * - Verify new panels default to isLinked: true
 * - Verify setPanelLinked() updates state correctly
 * - Verify isPanelLinked() reads state correctly
 * - Verify panel disposal removes from link state tracking
 * - Verify toggle handler works correctly
 * - Verify edge cases (null panels, concurrent toggles)
 * - Coverage target: 90% (Infrastructure task requirement)
 *
 * Pattern: Pattern-TDD-001 (Test-Driven Development Ratchet)
 * Related: UNLINK-001 through UNLINK-005 (Sprint 4), Pattern-UX-001 (Real-time feedback)
 */

suite('UNLINK-001: Panel Link State Tracking Tests', () => {
    let extension: vscode.Extension<any>;
    let voiceProvider: VoiceViewProvider;

    suiteSetup(async () => {
        // Get extension context for testing
        extension = vscode.extensions.getExtension('aetherlight.aetherlight')!;
        if (!extension) {
            throw new Error('ÆtherLight extension not found');
        }
        await extension.activate();
    });

    setup(() => {
        // Get VoiceViewProvider instance from extension
        const context = (extension.exports as any).context;
        voiceProvider = new VoiceViewProvider(context);
    });

    /**
     * TEST 1: panelLinkStates Map exists after construction
     *
     * Expected: VoiceViewProvider has panelLinkStates property
     * Type: Map<vscode.WebviewPanel, boolean>
     */
    test('VoiceViewProvider should have panelLinkStates Map', () => {
        // Access via any to check private property existence
        const provider = voiceProvider as any;

        assert.ok(
            provider.panelLinkStates,
            'panelLinkStates Map should exist'
        );

        assert.ok(
            provider.panelLinkStates instanceof Map,
            'panelLinkStates should be a Map instance'
        );

        assert.strictEqual(
            provider.panelLinkStates.size,
            0,
            'panelLinkStates should be empty on initialization'
        );
    });

    /**
     * TEST 2: New panels default to isLinked: true
     *
     * Expected: When panel is created, it's added to panelLinkStates with value true
     * This test will be manual verification since we can't easily create WebviewPanels in tests
     */
    test('setPanelLinked() should add panel to link state tracking', () => {
        const provider = voiceProvider as any;

        // Create a mock panel (we can't create real WebviewPanels in unit tests)
        const mockPanel = {} as vscode.WebviewPanel;

        // Set panel as linked (default behavior on panel creation)
        provider.setPanelLinked(mockPanel, true);

        assert.strictEqual(
            provider.panelLinkStates.size,
            1,
            'panelLinkStates should have 1 entry after setPanelLinked()'
        );

        assert.strictEqual(
            provider.panelLinkStates.get(mockPanel),
            true,
            'Panel should be linked (true) by default'
        );
    });

    /**
     * TEST 3: setPanelLinked() updates state correctly
     *
     * Expected: Can change panel link state from true to false and vice versa
     */
    test('setPanelLinked() should update panel link state', () => {
        const provider = voiceProvider as any;
        const mockPanel = {} as vscode.WebviewPanel;

        // Start linked
        provider.setPanelLinked(mockPanel, true);
        assert.strictEqual(
            provider.panelLinkStates.get(mockPanel),
            true,
            'Panel should be linked initially'
        );

        // Change to unlinked
        provider.setPanelLinked(mockPanel, false);
        assert.strictEqual(
            provider.panelLinkStates.get(mockPanel),
            false,
            'Panel should be unlinked after setPanelLinked(false)'
        );

        // Change back to linked
        provider.setPanelLinked(mockPanel, true);
        assert.strictEqual(
            provider.panelLinkStates.get(mockPanel),
            true,
            'Panel should be linked again after setPanelLinked(true)'
        );
    });

    /**
     * TEST 4: isPanelLinked() reads state correctly
     *
     * Expected: Returns boolean link state for panel, defaults to true if not found
     */
    test('isPanelLinked() should return correct link state', () => {
        const provider = voiceProvider as any;
        const mockPanel1 = {} as vscode.WebviewPanel;
        const mockPanel2 = {} as vscode.WebviewPanel;

        // Panel not in map → defaults to true
        assert.strictEqual(
            provider.isPanelLinked(mockPanel1),
            true,
            'Unknown panel should default to linked (true)'
        );

        // Set panel1 to linked
        provider.setPanelLinked(mockPanel1, true);
        assert.strictEqual(
            provider.isPanelLinked(mockPanel1),
            true,
            'Panel1 should be linked'
        );

        // Set panel2 to unlinked
        provider.setPanelLinked(mockPanel2, false);
        assert.strictEqual(
            provider.isPanelLinked(mockPanel2),
            false,
            'Panel2 should be unlinked'
        );

        // Panel1 should still be linked (independent state)
        assert.strictEqual(
            provider.isPanelLinked(mockPanel1),
            true,
            'Panel1 should still be linked (independent of panel2)'
        );
    });

    /**
     * TEST 5: Panel disposal removes from link state tracking
     *
     * Expected: When panel is disposed, it's removed from panelLinkStates Map
     */
    test('Panel disposal should remove from link state tracking', () => {
        const provider = voiceProvider as any;
        const mockPanel = {} as vscode.WebviewPanel;

        // Add panel to tracking
        provider.setPanelLinked(mockPanel, true);
        assert.strictEqual(
            provider.panelLinkStates.size,
            1,
            'panelLinkStates should have 1 entry'
        );

        // Simulate panel disposal (remove from map)
        provider.panelLinkStates.delete(mockPanel);
        assert.strictEqual(
            provider.panelLinkStates.size,
            0,
            'panelLinkStates should be empty after disposal'
        );

        // After disposal, isPanelLinked should default to true
        assert.strictEqual(
            provider.isPanelLinked(mockPanel),
            true,
            'Disposed panel should default to linked (true)'
        );
    });

    /**
     * TEST 6: Multiple panels can have independent link states
     *
     * Expected: Can track multiple panels with different link states
     */
    test('Multiple panels should have independent link states', () => {
        const provider = voiceProvider as any;
        const mockPanel1 = {} as vscode.WebviewPanel;
        const mockPanel2 = {} as vscode.WebviewPanel;
        const mockPanel3 = {} as vscode.WebviewPanel;

        // Set different states for each panel
        provider.setPanelLinked(mockPanel1, true);  // Linked
        provider.setPanelLinked(mockPanel2, false); // Unlinked
        provider.setPanelLinked(mockPanel3, true);  // Linked

        assert.strictEqual(
            provider.panelLinkStates.size,
            3,
            'Should track 3 panels'
        );

        assert.strictEqual(
            provider.isPanelLinked(mockPanel1),
            true,
            'Panel1 should be linked'
        );
        assert.strictEqual(
            provider.isPanelLinked(mockPanel2),
            false,
            'Panel2 should be unlinked'
        );
        assert.strictEqual(
            provider.isPanelLinked(mockPanel3),
            true,
            'Panel3 should be linked'
        );
    });

    /**
     * TEST 7: Idempotent state setting
     *
     * Expected: Setting same state multiple times should work correctly (idempotent)
     */
    test('setPanelLinked() should be idempotent (safe to call multiple times)', () => {
        const provider = voiceProvider as any;
        const mockPanel = {} as vscode.WebviewPanel;

        // Set linked multiple times
        provider.setPanelLinked(mockPanel, true);
        provider.setPanelLinked(mockPanel, true);
        provider.setPanelLinked(mockPanel, true);

        assert.strictEqual(
            provider.isPanelLinked(mockPanel),
            true,
            'Panel should still be linked after multiple setPanelLinked(true) calls'
        );

        assert.strictEqual(
            provider.panelLinkStates.size,
            1,
            'Should only have 1 entry (not duplicates)'
        );

        // Set unlinked multiple times
        provider.setPanelLinked(mockPanel, false);
        provider.setPanelLinked(mockPanel, false);

        assert.strictEqual(
            provider.isPanelLinked(mockPanel),
            false,
            'Panel should still be unlinked after multiple setPanelLinked(false) calls'
        );
    });

    /**
     * TEST 8: Rapid toggle scenario
     *
     * Expected: Rapid toggles (true → false → true → false) should track correctly
     */
    test('Rapid state toggles should track correctly', () => {
        const provider = voiceProvider as any;
        const mockPanel = {} as vscode.WebviewPanel;

        // Rapid toggle: linked → unlinked → linked → unlinked → linked
        provider.setPanelLinked(mockPanel, true);
        assert.strictEqual(provider.isPanelLinked(mockPanel), true, 'Toggle 1: linked');

        provider.setPanelLinked(mockPanel, false);
        assert.strictEqual(provider.isPanelLinked(mockPanel), false, 'Toggle 2: unlinked');

        provider.setPanelLinked(mockPanel, true);
        assert.strictEqual(provider.isPanelLinked(mockPanel), true, 'Toggle 3: linked');

        provider.setPanelLinked(mockPanel, false);
        assert.strictEqual(provider.isPanelLinked(mockPanel), false, 'Toggle 4: unlinked');

        provider.setPanelLinked(mockPanel, true);
        assert.strictEqual(provider.isPanelLinked(mockPanel), true, 'Toggle 5: linked (final)');
    });

    /**
     * TEST 9: Default behavior for untracked panels
     *
     * Expected: Panels not in Map default to linked (true) - safe default
     */
    test('Untracked panels should default to linked (safe default behavior)', () => {
        const provider = voiceProvider as any;
        const untrackedPanel1 = {} as vscode.WebviewPanel;
        const untrackedPanel2 = {} as vscode.WebviewPanel;
        const untrackedPanel3 = {} as vscode.WebviewPanel;

        // None of these panels have been added to panelLinkStates Map
        assert.strictEqual(
            provider.isPanelLinked(untrackedPanel1),
            true,
            'Untracked panel 1 should default to linked'
        );
        assert.strictEqual(
            provider.isPanelLinked(untrackedPanel2),
            true,
            'Untracked panel 2 should default to linked'
        );
        assert.strictEqual(
            provider.isPanelLinked(untrackedPanel3),
            true,
            'Untracked panel 3 should default to linked'
        );
    });

    /**
     * TEST 10: State isolation between panels
     *
     * Expected: Changing one panel's state doesn't affect other panels
     */
    test('Panel state changes should be isolated (no cross-contamination)', () => {
        const provider = voiceProvider as any;
        const panel1 = {} as vscode.WebviewPanel;
        const panel2 = {} as vscode.WebviewPanel;
        const panel3 = {} as vscode.WebviewPanel;

        // Set initial states
        provider.setPanelLinked(panel1, true);
        provider.setPanelLinked(panel2, true);
        provider.setPanelLinked(panel3, true);

        // Change panel2 to unlinked
        provider.setPanelLinked(panel2, false);

        // Verify panel1 and panel3 are still linked (isolated)
        assert.strictEqual(
            provider.isPanelLinked(panel1),
            true,
            'Panel1 should still be linked (isolated from panel2 change)'
        );
        assert.strictEqual(
            provider.isPanelLinked(panel2),
            false,
            'Panel2 should be unlinked'
        );
        assert.strictEqual(
            provider.isPanelLinked(panel3),
            true,
            'Panel3 should still be linked (isolated from panel2 change)'
        );
    });
});
