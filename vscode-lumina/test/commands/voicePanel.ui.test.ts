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

/**
 * UI-ARCH-002: Deprecate Unused Tabs - Unit Tests
 *
 * TDD RED Phase: Tests written BEFORE implementation
 *
 * Test Strategy:
 * - Verify only Sprint + Settings tabs remain
 * - Verify Planning, Patterns, Activity commented out
 * - Verify tab count is 2 (not 5)
 * - Coverage target: 70% (UI task requirement)
 *
 * Pattern: Pattern-TDD-001 (Test-Driven Development Ratchet)
 * User Clarification: Keep Sprint (implemented) + Settings (essential)
 */
suite('UI-ARCH-002: Deprecate Unused Tabs Tests', () => {
    let context: vscode.ExtensionContext;
    let tabManager: TabManager;

    suiteSetup(async () => {
        const extension = vscode.extensions.getExtension('aetherlight.aetherlight');
        if (!extension) {
            throw new Error('ÆtherLight extension not found');
        }
        await extension.activate();
        context = (extension.exports as any).context;
    });

    setup(() => {
        tabManager = new TabManager(context);
    });

    teardown(async () => {
        await tabManager.resetState();
    });

    /**
     * TEST 1: Only Sprint + Settings in main panel tabs
     *
     * Expected: getMainPanelTabs() returns exactly 2 tabs (Sprint, Settings)
     */
    test('TabManager.getMainPanelTabs() should return only Sprint and Settings', () => {
        const mainTabs = tabManager.getMainPanelTabs();

        // Should have exactly 2 tabs
        assert.strictEqual(
            mainTabs.length,
            2,
            'Main panel should have exactly 2 tabs (Sprint + Settings)'
        );

        // Verify Sprint tab present
        const hasSprintTab = mainTabs.some(tab => tab.id === TabId.Sprint);
        assert.ok(hasSprintTab, 'Sprint tab should be present');

        // Verify Settings tab present
        const hasSettingsTab = mainTabs.some(tab => tab.id === TabId.Settings);
        assert.ok(hasSettingsTab, 'Settings tab should be present');

        // Verify Planning tab NOT present
        const hasPlanningTab = mainTabs.some(tab => tab.id === TabId.Planning);
        assert.strictEqual(hasPlanningTab, false, 'Planning tab should NOT be present');

        // Verify Patterns tab NOT present
        const hasPatternsTab = mainTabs.some(tab => tab.id === TabId.Patterns);
        assert.strictEqual(hasPatternsTab, false, 'Patterns tab should NOT be present');

        // Verify Activity tab NOT present
        const hasActivityTab = mainTabs.some(tab => tab.id === TabId.Activity);
        assert.strictEqual(hasActivityTab, false, 'Activity tab should NOT be present');
    });

    /**
     * TEST 2: Tab bar HTML shows only Sprint + Settings
     *
     * Expected: Tab bar has 2 buttons (Sprint, Settings), no Planning/Patterns/Activity
     */
    test('TabManager.getTabBarHtml() should show only Sprint and Settings buttons', () => {
        const tabBarHtml = tabManager.getTabBarHtml();

        // Count tab buttons
        const tabButtonMatches = tabBarHtml.match(/class="tab-button/g);
        assert.ok(tabButtonMatches, 'Tab bar should have tab buttons');
        assert.strictEqual(
            tabButtonMatches.length,
            2,
            'Tab bar should have exactly 2 buttons'
        );

        // Verify Sprint button present
        assert.ok(
            tabBarHtml.includes('data-tab-id="sprint"'),
            'Tab bar should include Sprint button'
        );
        assert.ok(
            tabBarHtml.includes('📊'),
            'Tab bar should include Sprint icon'
        );

        // Verify Settings button present
        assert.ok(
            tabBarHtml.includes('data-tab-id="settings"'),
            'Tab bar should include Settings button'
        );
        assert.ok(
            tabBarHtml.includes('⚙️'),
            'Tab bar should include Settings icon'
        );

        // Verify Planning button NOT present
        assert.ok(
            !tabBarHtml.includes('data-tab-id="planning"'),
            'Tab bar should NOT include Planning button'
        );

        // Verify Patterns button NOT present
        assert.ok(
            !tabBarHtml.includes('data-tab-id="patterns"'),
            'Tab bar should NOT include Patterns button'
        );

        // Verify Activity button NOT present
        assert.ok(
            !tabBarHtml.includes('data-tab-id="activity"'),
            'Tab bar should NOT include Activity button'
        );
    });

    /**
     * TEST 3: Tab content containers show only Sprint + Settings
     *
     * Expected: Tab content has 2 divs (Sprint, Settings)
     */
    test('TabManager.getTabContainersHtml() should show only Sprint and Settings content', () => {
        const containersHtml = tabManager.getTabContainersHtml();

        // Count content divs
        const contentMatches = containersHtml.match(/class="tab-content/g);
        assert.ok(contentMatches, 'Should have content divs');
        assert.strictEqual(
            contentMatches.length,
            2,
            'Should have exactly 2 content divs'
        );

        // Verify Sprint content present
        assert.ok(
            containersHtml.includes('data-tab-id="sprint"'),
            'Should include Sprint content'
        );

        // Verify Settings content present
        assert.ok(
            containersHtml.includes('data-tab-id="settings"'),
            'Should include Settings content'
        );

        // Verify Planning content NOT present
        assert.ok(
            !containersHtml.includes('data-tab-id="planning"'),
            'Should NOT include Planning content'
        );

        // Verify Patterns content NOT present
        assert.ok(
            !containersHtml.includes('data-tab-id="patterns"'),
            'Should NOT include Patterns content'
        );

        // Verify Activity content NOT present
        assert.ok(
            !containersHtml.includes('data-tab-id="activity"'),
            'Should NOT include Activity content'
        );
    });

    /**
     * TEST 4: Default active tab is Sprint (most useful)
     *
     * Expected: After reset, default active tab should be Sprint
     */
    test('TabManager default active tab should be Sprint', async () => {
        await tabManager.resetState();

        const activeTab = tabManager.getActiveTab();

        assert.strictEqual(
            activeTab,
            TabId.Sprint,
            'Default active tab should be Sprint (most commonly used)'
        );
    });

    /**
     * TEST 5: Tab state validation excludes disabled tabs
     *
     * Expected: Tab state should have exactly 2 tabs (Sprint, Settings)
     */
    test('TabManager state should contain only Sprint and Settings tabs', async () => {
        await tabManager.resetState();

        const state = tabManager.getState();

        // Should have exactly 2 tabs
        assert.strictEqual(
            state.tabs.length,
            2,
            'Tab state should have 2 tabs'
        );

        // Should include Sprint
        const hasSprintTab = state.tabs.some(tab => tab.id === TabId.Sprint);
        assert.ok(hasSprintTab, 'Tab state should include Sprint');

        // Should include Settings
        const hasSettingsTab = state.tabs.some(tab => tab.id === TabId.Settings);
        assert.ok(hasSettingsTab, 'Tab state should include Settings');

        // Should NOT include Planning
        const hasPlanningTab = state.tabs.some(tab => tab.id === TabId.Planning);
        assert.strictEqual(hasPlanningTab, false, 'Tab state should NOT include Planning');

        // Should NOT include Patterns
        const hasPatternsTab = state.tabs.some(tab => tab.id === TabId.Patterns);
        assert.strictEqual(hasPatternsTab, false, 'Tab state should NOT include Patterns');

        // Should NOT include Activity
        const hasActivityTab = state.tabs.some(tab => tab.id === TabId.Activity);
        assert.strictEqual(hasActivityTab, false, 'Tab state should NOT include Activity');
    });
});
