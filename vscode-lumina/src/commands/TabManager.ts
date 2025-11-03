import * as vscode from 'vscode';

/**
 * TabManager: Manages tabbed interface for ÆtherLight Voice Panel
 *
 * DESIGN DECISION: Single panel with 6 tabs + promote/detach capability
 * WHY: Clean default (1 icon) with power user flexibility (promote tabs to Activity Bar)
 *
 * REASONING CHAIN:
 * 1. User opens ÆtherLight icon → See tabbed interface
 * 2. Tabs: Voice | Sprint | Planning | Patterns | Activity | Settings
 * 3. User can right-click tab → "Promote to Activity Bar"
 * 4. Promoted tab becomes separate activity icon
 * 5. User can move back to main panel later
 * 6. Result: Flexible from 1 icon (casual) to 6+ icons (power user)
 *
 * PATTERN: Pattern-UI-006 (Hybrid Tabbed Multi-Feature Sidebar)
 */

export enum TabId {
    Voice = 'voice',
    Sprint = 'sprint',
    Planning = 'planning',
    Patterns = 'patterns',
    Activity = 'activity',
    Settings = 'settings'
}

export interface Tab {
    id: TabId;
    icon: string;
    name: string;
    tooltip: string;
    isPromoted: boolean;  // Promoted to Activity Bar?
}

export interface TabState {
    activeTab: TabId;
    tabs: Tab[];
    promotedTabs: TabId[];  // Tabs promoted to Activity Bar
}

/**
 * TabManager: Handles tab state, switching, and persistence
 */
export class TabManager {
    private state: TabState;
    private readonly storageKey = 'aetherlight.tabState';

    constructor(private readonly context: vscode.ExtensionContext) {
        // Initialize state from workspace storage
        this.state = this.loadState();
    }

    /**
     * Get current tab state
     */
    public getState(): TabState {
        return { ...this.state };
    }

    /**
     * Get active tab ID
     */
    public getActiveTab(): TabId {
        return this.state.activeTab;
    }

    /**
     * Set active tab and persist state
     */
    public setActiveTab(tabId: TabId): void {
        this.state.activeTab = tabId;
        this.saveState();
    }

    /**
     * Check if tab is promoted to Activity Bar
     */
    public isTabPromoted(tabId: TabId): boolean {
        return this.state.promotedTabs.includes(tabId);
    }

    /**
     * Promote tab to Activity Bar (becomes separate icon)
     */
    public promoteTab(tabId: TabId): void {
        if (!this.state.promotedTabs.includes(tabId)) {
            this.state.promotedTabs.push(tabId);
            const tab = this.state.tabs.find(t => t.id === tabId);
            if (tab) {
                tab.isPromoted = true;
            }
            this.saveState();
        }
    }

    /**
     * Move tab back to main panel from Activity Bar
     */
    public demoteTab(tabId: TabId): void {
        const index = this.state.promotedTabs.indexOf(tabId);
        if (index !== -1) {
            this.state.promotedTabs.splice(index, 1);
            const tab = this.state.tabs.find(t => t.id === tabId);
            if (tab) {
                tab.isPromoted = false;
            }
            this.saveState();
        }
    }

    /**
     * Get tabs that should be shown in main panel (non-promoted)
     */
    public getMainPanelTabs(): Tab[] {
        const mainTabs = this.state.tabs.filter(t => !t.isPromoted);
        console.log('[ÆtherLight TabManager] Main panel tabs:', mainTabs.map(t => `${t.name} (promoted: ${t.isPromoted})`).join(', '));
        console.log('[ÆtherLight TabManager] Promoted tabs:', this.state.tabs.filter(t => t.isPromoted).map(t => t.name).join(', ') || 'none');
        return mainTabs;
    }

    /**
     * Get tabs that are promoted to Activity Bar
     */
    public getPromotedTabs(): Tab[] {
        return this.state.tabs.filter(t => t.isPromoted);
    }

    /**
     * Load state from workspace storage
     */
    private loadState(): TabState {
        const saved = this.context.workspaceState.get<TabState>(this.storageKey);

        if (saved) {
            // UI-ARCH-002: Validate 2 expected tabs (Sprint + Settings only)
            // Chain of Thought: Only show implemented/essential features
            // Planning, Patterns, Activity disabled (not implemented yet)
            const expectedTabIds = [TabId.Sprint, TabId.Settings];
            const savedTabIds = saved.tabs.map(t => t.id);

            // Filter out disabled tabs from saved state (legacy migration)
            const filteredTabs = saved.tabs.filter(t =>
                t.id === TabId.Sprint || t.id === TabId.Settings
            );

            const hasAllTabs = expectedTabIds.every(id => savedTabIds.includes(id));

            if (hasAllTabs && filteredTabs.length === expectedTabIds.length) {
                console.log('[ÆtherLight TabManager] Loaded valid state from workspace storage');
                // Return filtered state (disabled tabs removed if present)
                return {
                    ...saved,
                    tabs: filteredTabs,
                    // Ensure active tab is valid (Sprint or Settings)
                    activeTab: (saved.activeTab === TabId.Sprint || saved.activeTab === TabId.Settings)
                        ? saved.activeTab
                        : TabId.Sprint
                };
            }

            console.warn('[ÆtherLight TabManager] Invalid tab state detected (missing tabs or wrong count), resetting to defaults');
            console.warn('[ÆtherLight TabManager] Expected tabs:', expectedTabIds);
            console.warn('[ÆtherLight TabManager] Saved tabs:', savedTabIds);
        }

        // UI-ARCH-002: Default state with 2 tabs (Sprint + Settings only)
        // Chain of Thought: Only show implemented/essential features (Progressive Disclosure)
        // Planning, Patterns, Activity commented out (not implemented yet)
        return {
            activeTab: TabId.Sprint,  // Default to Sprint tab (most useful)
            promotedTabs: [],         // No promoted tabs by default
            tabs: [
                // Voice tab removed in UI-ARCH-001 - voice section is now permanent at top
                {
                    id: TabId.Sprint,
                    icon: '📊',
                    name: 'Sprint',
                    tooltip: 'Sprint progress and task monitoring',
                    isPromoted: false
                },
                // TODO: UI-ARCH-002 - Planning tab disabled (placeholder, backend incomplete)
                // {
                //     id: TabId.Planning,
                //     icon: '🗂️',
                //     name: 'Planning',
                //     tooltip: 'Sprint planning and dependency graph',
                //     isPromoted: false
                // },
                // TODO: UI-ARCH-002 - Patterns tab disabled (waiting for PatternLibrary UI integration)
                // {
                //     id: TabId.Patterns,
                //     icon: '🧩',
                //     name: 'Patterns',
                //     tooltip: 'Pattern library search and management',
                //     isPromoted: false
                // },
                // TODO: UI-ARCH-002 - Activity tab disabled (multi-user features not implemented)
                // {
                //     id: TabId.Activity,
                //     icon: '📡',
                //     name: 'Activity',
                //     tooltip: 'Real-time team activity feed',
                //     isPromoted: false
                // },
                {
                    id: TabId.Settings,
                    icon: '⚙️',
                    name: 'Settings',
                    tooltip: 'ÆtherLight configuration',
                    isPromoted: false
                }
            ]
        };
    }

    /**
     * Save state to workspace storage
     */
    private saveState(): void {
        this.context.workspaceState.update(this.storageKey, this.state);
    }

    /**
     * Reset tab state to defaults (clears workspace storage)
     *
     * DESIGN DECISION: Public method for debugging/recovery
     * WHY: Allow users to reset corrupted state without restarting VS Code
     *
     * REASONING CHAIN:
     * 1. User reports tabs not showing (workspace state corrupted)
     * 2. Without this method, user must manually delete workspace storage files
     * 3. Add command to reset state programmatically
     * 4. Result: One-command recovery from state corruption
     */
    public async resetState(): Promise<void> {
        console.log('[ÆtherLight TabManager] Resetting tab state to defaults');
        await this.context.workspaceState.update(this.storageKey, undefined);
        this.state = this.loadState();
        console.log('[ÆtherLight TabManager] Tab state reset complete');
    }

    /**
     * Generate HTML for tab bar
     */
    public getTabBarHtml(): string {
        const tabs = this.getMainPanelTabs();
        const activeTab = this.getActiveTab();

        const tabButtons = tabs.map(tab => {
            const isActive = tab.id === activeTab;
            const activeClass = isActive ? 'active' : '';

            return `
                <button
                    class="tab-button ${activeClass}"
                    data-tab-id="${tab.id}"
                    title="${tab.tooltip}"
                    aria-label="${tab.tooltip}"
                    aria-selected="${isActive}"
                >
                    ${tab.icon}
                </button>
            `;
        }).join('');

        return `
            <div class="tab-bar">
                ${tabButtons}
            </div>
        `;
    }

    /**
     * Generate HTML for tab content containers
     */
    public getTabContainersHtml(): string {
        const tabs = this.getMainPanelTabs();
        const activeTab = this.getActiveTab();

        const containers = tabs.map(tab => {
            const isActive = tab.id === activeTab;
            const activeClass = isActive ? 'active' : '';

            return `
                <div
                    class="tab-content ${activeClass}"
                    data-tab-id="${tab.id}"
                    role="tabpanel"
                    aria-labelledby="tab-${tab.id}"
                    ${!isActive ? 'hidden' : ''}
                >
                    ${this.getTabPlaceholderContent(tab.id)}
                </div>
            `;
        }).join('');

        return `
            <div class="tab-container">
                ${containers}
            </div>
        `;
    }

    /**
     * Get placeholder content for each tab (Phase 1 - skeleton only)
     *
     * UI-ARCH-002: Only Sprint + Settings tabs active
     * Planning, Patterns, Activity commented out (not implemented yet)
     */
    private getTabPlaceholderContent(tabId: TabId): string {
        switch (tabId) {
            // Voice case removed in UI-ARCH-001 - voice section is now permanent at top
            case TabId.Sprint:
                return `<div class="placeholder">Sprint Tab - To be implemented</div>`;
            // TODO: UI-ARCH-002 - Planning tab disabled
            // case TabId.Planning:
            //     return `<div class="placeholder">Planning Tab - To be implemented</div>`;
            // TODO: UI-ARCH-002 - Patterns tab disabled
            // case TabId.Patterns:
            //     return `<div class="placeholder">Patterns Tab - To be implemented</div>`;
            // TODO: UI-ARCH-002 - Activity tab disabled
            // case TabId.Activity:
            //     return `<div class="placeholder">Activity Tab - To be implemented</div>`;
            case TabId.Settings:
                return `<div class="placeholder">Settings Tab - To be implemented</div>`;
            default:
                return `<div class="placeholder">Unknown Tab</div>`;
        }
    }

    /**
     * Get CSS styles for tab UI
     */
    public getTabStyles(): string {
        return `
            .tab-bar {
                display: flex;
                background-color: var(--vscode-editorGroupHeader-tabsBackground);
                border-bottom: 1px solid var(--vscode-editorGroupHeader-tabsBorder);
                height: 32px;
                padding: 0 4px;
                gap: 2px;
                align-items: center;
            }

            .tab-button {
                background: none;
                border: none;
                color: var(--vscode-tab-inactiveForeground);
                cursor: pointer;
                font-size: 18px;
                padding: 4px 12px;
                height: 28px;
                border-radius: 4px;
                transition: background-color 0.1s, color 0.1s;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .tab-button:hover {
                background-color: var(--vscode-tab-hoverBackground);
                color: var(--vscode-tab-hoverForeground);
            }

            .tab-button.active {
                background-color: var(--vscode-tab-activeBackground);
                color: var(--vscode-tab-activeForeground);
                border-bottom: 2px solid var(--vscode-tab-activeBorder);
            }

            .tab-button:focus {
                outline: 1px solid var(--vscode-focusBorder);
                outline-offset: -1px;
            }

            .tab-container {
                flex: 1;
                overflow-y: auto;
                position: relative;
            }

            .tab-content {
                display: none;
                padding: 16px;
                height: 100%;
            }

            .tab-content.active {
                display: block;
            }

            .placeholder {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: var(--vscode-descriptionForeground);
                font-style: italic;
            }
        `;
    }
}
