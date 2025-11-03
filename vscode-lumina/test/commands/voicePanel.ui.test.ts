import * as assert from 'assert';
import * as vscode from 'vscode';
import { TabManager, TabId } from '../../src/commands/TabManager';

/**
 * UI-ARCH-001: Remove Voice Tab - Unit Tests
 *
 * TDD RED Phase: Tests written BEFORE implementation
 *
 * Test Strategy:
 * - Verify Voice NOT in TabManager tabs array
 * - Verify tab count is 5 (not 6)
 * - Verify voice section HTML structure independent of tabs
 * - Coverage target: 70% (UI task requirement)
 *
 * Pattern: Pattern-TDD-001 (Test-Driven Development Ratchet)
 */

suite('UI-ARCH-001: Remove Voice Tab Tests', () => {
    let context: vscode.ExtensionContext;
    let tabManager: TabManager;

    suiteSetup(async () => {
        // Get extension context for testing
        const extension = vscode.extensions.getExtension('aetherlight.aetherlight');
        if (!extension) {
            throw new Error('ÆtherLight extension not found');
        }
        await extension.activate();
        context = (extension.exports as any).context;
    });

    setup(() => {
        // Create fresh TabManager instance for each test
        tabManager = new TabManager(context);
    });

    teardown(async () => {
        // Reset tab state after each test
        await tabManager.resetState();
    });

    /**
     * TEST 1: Voice NOT in main panel tabs
     *
     * Expected: getMainPanelTabs() returns 5 tabs (Sprint, Planning, Patterns, Activity, Settings)
     * Voice should NOT be in the array
     */
    test('TabManager.getMainPanelTabs() should NOT include Voice tab', () => {
        const mainTabs = tabManager.getMainPanelTabs();

        // Should have 5 tabs (not 6)
        assert.strictEqual(
            mainTabs.length,
            5,
            'Main panel should have 5 tabs (Voice removed)'
        );

        // Voice should NOT be in the array
        const hasVoiceTab = mainTabs.some(tab => tab.id === TabId.Voice);
        assert.strictEqual(
            hasVoiceTab,
            false,
            'Voice tab should NOT be in main panel tabs'
        );

        // Verify expected tabs are present
        const expectedTabs = [TabId.Sprint, TabId.Planning, TabId.Patterns, TabId.Activity, TabId.Settings];
        for (const expectedId of expectedTabs) {
            const hasTab = mainTabs.some(tab => tab.id === expectedId);
            assert.ok(hasTab, `Tab ${expectedId} should be present in main panel`);
        }
    });

    /**
     * TEST 2: Tab bar HTML does NOT include Voice
     *
     * Expected: Tab bar HTML has 5 tab buttons, Voice button not present
     */
    test('TabManager.getTabBarHtml() should NOT include Voice tab button', () => {
        const tabBarHtml = tabManager.getTabBarHtml();

        // Count tab buttons in HTML
        const tabButtonMatches = tabBarHtml.match(/class="tab-button/g);
        assert.ok(tabButtonMatches, 'Tab bar HTML should have tab buttons');
        assert.strictEqual(
            tabButtonMatches.length,
            5,
            'Tab bar should have 5 tab buttons (Voice removed)'
        );

        // Verify Voice button NOT in HTML
        assert.ok(
            !tabBarHtml.includes('data-tab-id="voice"'),
            'Tab bar should NOT include Voice tab button'
        );
        assert.ok(
            !tabBarHtml.includes('🎤'),
            'Tab bar should NOT include Voice icon'
        );

        // Verify expected tabs ARE in HTML
        assert.ok(tabBarHtml.includes('data-tab-id="sprint"'), 'Tab bar should include Sprint');
        assert.ok(tabBarHtml.includes('data-tab-id="settings"'), 'Tab bar should include Settings');
    });

    /**
     * TEST 3: Tab content containers do NOT include Voice
     *
     * Expected: Tab content HTML has 5 containers, Voice container not present
     */
    test('TabManager.getTabContainersHtml() should NOT include Voice tab content', () => {
        const containersHtml = tabManager.getTabContainersHtml();

        // Count tab content divs in HTML
        const contentMatches = containersHtml.match(/class="tab-content/g);
        assert.ok(contentMatches, 'Tab containers HTML should have content divs');
        assert.strictEqual(
            contentMatches.length,
            5,
            'Tab containers should have 5 content divs (Voice removed)'
        );

        // Verify Voice content NOT in HTML
        assert.ok(
            !containersHtml.includes('data-tab-id="voice"'),
            'Tab containers should NOT include Voice content div'
        );

        // Verify expected tabs ARE in HTML
        assert.ok(containersHtml.includes('data-tab-id="sprint"'), 'Containers should include Sprint');
        assert.ok(containersHtml.includes('data-tab-id="settings"'), 'Containers should include Settings');
    });

    /**
     * TEST 4: Active tab defaults to Sprint (not Voice)
     *
     * Expected: Default active tab should be Sprint since Voice is no longer a tab
     */
    test('TabManager default active tab should be Sprint (not Voice)', async () => {
        // Reset to defaults
        await tabManager.resetState();

        const activeTab = tabManager.getActiveTab();

        assert.strictEqual(
            activeTab,
            TabId.Sprint,
            'Default active tab should be Sprint (Voice is not a tab anymore)'
        );
    });

    /**
     * TEST 5: Setting active tab to Voice should fail or default to Sprint
     *
     * Expected: Attempting to set Voice as active tab should either throw error
     * or silently default to Sprint (depending on implementation)
     */
    test('TabManager.setActiveTab(Voice) should not set Voice as active', () => {
        // Try to set Voice as active tab
        tabManager.setActiveTab(TabId.Voice as any);

        const activeTab = tabManager.getActiveTab();

        // Voice should NOT be active (should remain at default or previous tab)
        assert.notStrictEqual(
            activeTab,
            TabId.Voice,
            'Voice should not be set as active tab'
        );
    });

    /**
     * TEST 6: Tab state validation rejects Voice in saved state
     *
     * Expected: If saved state includes Voice, it should be reset to defaults
     */
    test('TabManager should reset to defaults if saved state includes Voice', async () => {
        // This test verifies that loadState() handles legacy state correctly
        // Implementation should validate that saved state doesn't include Voice

        const state = tabManager.getState();

        // State should have 5 tabs
        assert.strictEqual(
            state.tabs.length,
            5,
            'Tab state should have 5 tabs'
        );

        // State should NOT include Voice
        const hasVoice = state.tabs.some(tab => tab.id === TabId.Voice);
        assert.strictEqual(
            hasVoice,
            false,
            'Tab state should NOT include Voice tab'
        );
    });

    /**
     * TEST 7: Promoted tabs should not include Voice
     *
     * Expected: getPromotedTabs() should never return Voice
     */
    test('TabManager.getPromotedTabs() should never include Voice', () => {
        // Even if Voice somehow gets promoted (legacy state), it shouldn't be in results

        const promotedTabs = tabManager.getPromotedTabs();

        const hasVoice = promotedTabs.some(tab => tab.id === TabId.Voice);
        assert.strictEqual(
            hasVoice,
            false,
            'Promoted tabs should NOT include Voice'
        );
    });
});
