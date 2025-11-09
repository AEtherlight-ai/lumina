# Help & Getting Started Menu Proposal

**Date:** 2025-11-08
**Requested by:** User
**Status:** 📋 Proposal

---

## Problem Statement

Currently, helpful features like the walkthrough are:
- Only accessible via Command Palette (low discoverability)
- Auto-show only on first run (users may miss it)
- No centralized "Help" menu for documentation and learning resources

**User Quote:**
> "maybe we add a button up next to the refresh button that is a dropdown menu that allows us to start putting these types of features in moving forward. Eventually a help or docs link and so on"

---

## Proposed Solution

Add a **unified Help & Getting Started dropdown menu** to the Sprint Progress view toolbar.

### Location
- **View:** Sprint Progress (Explorer sidebar)
- **Position:** Top-right toolbar, next to existing actions
- **Icon:** `$(question)` (VS Code codicon for help/question mark)

### Menu Structure (Initial)

```
🛈 Help & Getting Started ▼
├── 📖 Getting Started Walkthrough
├── 📚 Documentation
│   ├── User Guide (opens docs.aetherlight.com/user-guide)
│   ├── API Reference (opens docs.aetherlight.com/api)
│   └── Pattern Library (opens docs/patterns/INDEX.md)
├── ⚙️ Configuration
│   ├── Open Project Config (.aetherlight/project-config.json)
│   └── Extension Settings
├── 🔧 Troubleshooting
│   ├── Clear Sprint Cache
│   ├── Reset Walkthrough Progress
│   └── View Logs
└── ℹ️ About ÆtherLight
    ├── Version Info
    ├── What's New (CHANGELOG.md)
    └── Report Issue (GitHub)
```

### Future Extensions

As the system grows, additional items can be easily added:
- Video tutorials
- Interactive demos
- Quick tips / keyboard shortcuts
- Community links (Discord, forum)
- Export/import configuration
- Backup & restore settings

---

## Implementation Plan

### Phase 1: Core Infrastructure (2 hours)

**Task 1: Add Menu Contributions to package.json**

```json
"menus": {
  "view/title": [
    {
      "command": "aetherlight.helpMenu",
      "when": "view == luminaSprintProgress",
      "group": "navigation"
    }
  ]
}
```

**Task 2: Create Help Menu Command**

File: `src/commands/helpMenu.ts`

```typescript
/**
 * Help & Getting Started Menu Command
 *
 * DESIGN DECISION: QuickPick menu for discoverability
 * WHY: Users need easy access to learning resources
 */
export async function showHelpMenu() {
    const items = [
        {
            label: '$(book) Getting Started Walkthrough',
            description: 'Interactive guide to configure your project',
            command: 'aetherlight.startGettingStarted'
        },
        {
            label: '$(file-text) Open Project Configuration',
            description: '.aetherlight/project-config.json',
            command: 'aetherlight.openConfig'
        },
        {
            label: '$(gear) Extension Settings',
            description: 'Configure ÆtherLight preferences',
            command: 'workbench.action.openSettings',
            args: '@ext:aetherlight.aetherlight'
        },
        {
            label: '$(info) About ÆtherLight',
            description: 'Version and system information',
            command: 'aetherlight.showAbout'
        }
    ];

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Help & Getting Started'
    });

    if (selected) {
        await vscode.commands.executeCommand(selected.command, selected.args);
    }
}
```

**Task 3: Register Command**

Update `src/extension.ts`:

```typescript
context.subscriptions.push(
    vscode.commands.registerCommand('aetherlight.helpMenu', showHelpMenu)
);
```

---

### Phase 2: Additional Menu Items (3 hours)

**Task 4: Add Documentation Links**

```typescript
{
    label: '$(book) User Guide',
    description: 'Complete user documentation',
    command: 'vscode.open',
    args: vscode.Uri.parse('https://docs.aetherlight.com/user-guide')
}
```

**Task 5: Add Troubleshooting Commands**

```typescript
{
    label: '$(tools) Clear Sprint Cache',
    description: 'Force reload sprint TOML files',
    command: 'aetherlight.clearSprintCache'
},
{
    label: '$(refresh) Reset Walkthrough Progress',
    description: 'Restart getting started experience',
    command: 'aetherlight.resetWalkthrough'
}
```

**Task 6: Add About Dialog**

File: `src/commands/showAbout.ts`

```typescript
export async function showAbout(context: vscode.ExtensionContext) {
    const version = context.extension.packageJSON.version;
    const info = [
        '# ÆtherLight',
        '',
        `**Version:** ${version}`,
        `**Node.js:** ${process.version}`,
        `**Platform:** ${process.platform}`,
        '',
        '## What\'s New',
        '- Getting Started Walkthrough',
        '- Sprint Template System',
        '- Code Protection',
        '',
        '[View Full Changelog](command:aetherlight.openChangelog)',
        '[Report Issue](https://github.com/aetherlight/aetherlight/issues)'
    ].join('\n');

    const doc = await vscode.workspace.openTextDocument({
        content: info,
        language: 'markdown'
    });
    await vscode.window.showTextDocument(doc);
}
```

---

### Phase 3: Icon & Visual Polish (1 hour)

**Task 7: Add Help Icon to Toolbar**

Use VS Code's built-in codicons:
- Primary: `$(question)` - Standard help icon
- Alternative: `$(info)` - Information icon
- Alternative: `$(book)` - Documentation icon

**Task 8: Add Keyboard Shortcut (Optional)**

```json
{
    "command": "aetherlight.helpMenu",
    "key": "ctrl+shift+h",
    "mac": "cmd+shift+h",
    "when": "view == luminaSprintProgress"
}
```

---

## Benefits

### Discoverability ✅
- Visible button in UI (no Command Palette required)
- Contextual to Sprint Progress view
- Logical placement (top-right toolbar)

### Scalability ✅
- Easy to add new items as features grow
- QuickPick menu supports categories and search
- Can link to external docs, internal commands, or both

### User Experience ✅
- Single entry point for all help resources
- Matches VS Code UX patterns (similar to VS Code's own help menu)
- Reduces cognitive load (one place for everything)

### Maintenance ✅
- Centralized help menu logic
- Easy to update/reorganize menu items
- Testable via integration tests

---

## Testing Strategy

### Manual Tests (6 tests)

1. **Test HM-1:** Click help icon → menu opens with all items
2. **Test HM-2:** Select "Getting Started" → walkthrough opens
3. **Test HM-3:** Select "Open Config" → config file opens
4. **Test HM-4:** Select "Extension Settings" → settings open
5. **Test HM-5:** Press Escape in menu → menu closes, no error
6. **Test HM-6:** Test keyboard shortcut (Ctrl+Shift+H)

### Automated Tests (8 tests)

```typescript
suite('Help Menu Integration Tests', () => {
    test('should show help menu with all items', async () => {
        const stub = sinon.stub(vscode.window, 'showQuickPick');
        await showHelpMenu();
        assert.ok(stub.calledOnce);
        assert.strictEqual(stub.args[0][0].length, 4); // 4 initial items
    });

    test('should execute walkthrough command when selected', async () => {
        const executeStub = sinon.stub(vscode.commands, 'executeCommand');
        // ... test command execution
    });
});
```

---

## Migration Path

### Immediate (v0.16.16)
- Phase 1: Core menu with 4 items (2 hours)
- Add to sprint: 1 task (HELP-001)

### Short-term (v0.17.0)
- Phase 2: Documentation links + troubleshooting (3 hours)
- Phase 3: Visual polish + keyboard shortcut (1 hour)

### Long-term (v1.0+)
- Add video tutorials
- Add interactive demos
- Add community links
- Integrate with telemetry (most-clicked items)

---

## Technical Decisions

### Why QuickPick instead of native submenu?

**VS Code API Limitation:** View title menus don't support submenus natively. Options:

1. **QuickPick (Recommended)** ✅
   - Pros: Full control, supports categories, searchable, VS Code native pattern
   - Cons: One extra click (menu → item vs. direct submenu)
   - Example: VS Code's own "More Actions..." menus use this

2. **Flat menu with separators**
   - Pros: Direct access
   - Cons: Cluttered toolbar, no hierarchy, poor scalability

3. **Custom webview popup**
   - Pros: Full customization
   - Cons: High complexity, non-standard UX, accessibility issues

**Decision:** QuickPick provides the best balance of UX, scalability, and maintainability.

---

## Alternatives Considered

### Alt 1: Command Palette Only
- ❌ Low discoverability
- ❌ Requires users to know commands exist
- ✅ Already works, no dev needed

### Alt 2: Separate Help View
- ✅ More space for content
- ❌ Takes up sidebar real estate
- ❌ Higher complexity

### Alt 3: Status Bar Button
- ✅ Always visible
- ❌ Status bar is already crowded
- ❌ Less contextual to sprint workflow

---

## User Impact

### Before
- Users must discover commands via Command Palette
- Walkthrough only accessible via auto-show (first run) or command
- No central help location

### After
- One-click access to all help resources
- Visible help icon in Sprint Progress view
- Easy to add new learning resources
- Walkthrough accessible anytime

---

## Next Steps

1. **User approval:** Confirm menu structure and priorities
2. **Create task:** Add HELP-001 to sprint (or standalone)
3. **Implement Phase 1:** Core menu infrastructure
4. **Test:** Manual + automated tests
5. **Iterate:** Add Phase 2 items based on user feedback

---

## Questions for User

1. **Priority:** Should this be in current sprint or next sprint?
2. **Menu items:** Any specific items you want in Phase 1?
3. **Icon:** Prefer `$(question)`, `$(info)`, or `$(book)`?
4. **Keyboard shortcut:** Want Ctrl+Shift+H or different?
5. **Documentation:** Do you have a docs site URL yet, or use GitHub wiki?

---

## Success Metrics

- ✅ Help menu accessible in <2 clicks
- ✅ Walkthrough usage increases (track via telemetry)
- ✅ Support questions decrease (easier self-service)
- ✅ Users discover features faster (onboarding time ↓)

---

**Status:** Ready for user review and approval
