# Sprint Planner UI Architecture

**Version:** v0.16.7
**Last Updated:** 2025-11-05
**Status:** ✅ Production

---

## Overview

The Sprint Planner UI is a comprehensive WebView-based interface embedded in the VS Code sidebar. It provides voice capture, prompt enhancement, sprint management, and workflow tools in a single, unified panel.

**Design Philosophy:** Single-panel UI with all features accessible without tab navigation. Voice section at top, Sprint section below, with unified workflow area for interactive tools.

---

## Architecture Components

### 1. Single-Panel Layout (No Tabs)

**Design Decision (v0.16.2):** Reverted from tabbed UI to clean single-panel layout.

**WHY:** User preference for streamlined workflow without tab switching.

**Layout:**
```
┌─────────────────────────────────────┐
│ ÆtherLight Voice (Header)           │
├─────────────────────────────────────┤
│ Toolbar (Single Row)                │
│  LEFT: 🔍📋🎤✨📤🗑️                │
│  CENTER: Keyboard shortcuts         │
│  RIGHT: 🐛🔧📦⚙️                     │
├─────────────────────────────────────┤
│ Text Area (Expandable)              │
├─────────────────────────────────────┤
│ Workflow Area (Hidden by default)   │
│  Shows: Bug Report, Feature Request,│
│         Skills, Settings, etc.      │
├─────────────────────────────────────┤
│ Sprint Section                      │
│  - Sprint File Dropdown             │
│  - Task List                        │
│  - Task Details Panel               │
└─────────────────────────────────────┘
```

---

### 2. Consolidated Toolbar (REFACTOR-004)

**Single-row toolbar with LEFT/CENTER/RIGHT sections.**

#### LEFT: Primary Actions
| Button | Icon | Function | Status |
|--------|------|----------|---------|
| Code Analyzer | 🔍 | Opens workspace analyzer workflow | ⚠️ Placeholder |
| Sprint Planner | 📋 | Opens sprint planning workflow | ⚠️ Placeholder |
| Record | 🎤 | Toggle voice recording (backtick key) | ✅ Functional |
| Enhance | ✨ | Enhance text with patterns | ✅ Functional |
| Send | 📤 | Send to terminal (Ctrl+Enter) | ✅ Functional |
| Clear | 🗑️ | Clear text area | ✅ Functional |

#### CENTER: Keyboard Shortcuts
- Displays: `` ` `` to record | `Ctrl+Enter` to send
- Font size: 10px, subtle hint text

#### RIGHT: Utilities
| Button | Icon | Function | Status |
|--------|------|----------|---------|
| Bug Report | 🐛 | Opens bug report form | ✅ Functional |
| Feature Request | 🔧 | Opens feature request form | ✅ Functional |
| Skills | 📦 | Opens skills list | ✅ Functional |
| Settings | ⚙️ | Opens minimal settings UI | ✅ Functional |

**CSS Classes:**
- `.main-toolbar` - Flex container with space-between
- `.toolbar-section` - LEFT/CENTER/RIGHT grouping
- `.toolbar-btn` - 28px width, 24px height, rounded buttons
- `.toolbar-btn.primary` - Blue accent for primary actions

**Files:** `voicePanel.ts:1574-1662` (CSS), `voicePanel.ts:4133-4175` (HTML)

---

### 3. Unified Workflow Area System (REFACTOR-006)

**Pattern:** Single workflow area shared by all interactive tools.

#### Behavior
- **Hidden by default** - No workflow visible on panel load
- **Expands on button click** - Shows below text area
- **One at a time** - Clicking new button closes previous
- **Toggle behavior** - Clicking same button again closes workflow
- **ESC key** - Closes active workflow

#### Workflow Types
1. **code-analyzer** - Workspace analysis configuration (placeholder)
2. **sprint-planner** - AI-assisted sprint planning (placeholder)
3. **bug-report** - Structured bug report form ✅
4. **feature-request** - Structured feature request form ✅
5. **skills** - Skills list with file navigation ✅
6. **settings** - Dev mode and sprint path settings ✅

#### API Functions

**`window.showWorkflow(workflowType, title, content)`**
- **Purpose:** Show workflow area with specified content
- **Parameters:**
  - `workflowType` - Unique workflow identifier
  - `title` - Display title (with emoji prefix)
  - `content` - HTML content string
- **Effect:** Displays workflow area, sets `activeWorkflow` state

**`window.closeWorkflow()`**
- **Purpose:** Hide workflow area with animation
- **Effect:** Removes `visible` class, hides container after transition

**`window.toggleWorkflow(workflowType, title, content)`**
- **Purpose:** Toggle workflow (open if closed, close if same workflow)
- **Behavior:** If `activeWorkflow === workflowType`, close; otherwise, show

**Files:** `voicePanel.ts:3556-3608` (JS), `voicePanel.ts:1896-1999` (CSS)

---

### 4. Bug Report Form (UI-006)

**Pattern:** Structured Form → Enhance → Main Text Area → Terminal

#### Form Fields
| Field | Type | Required | Options |
|-------|------|----------|---------|
| Title | Text input | ✅ | Brief bug description |
| Severity | Dropdown | ❌ | Low, Medium (default), High, Critical |
| Component | Dropdown | ❌ | Voice Capture, Sprint, Patterns, UI/UX, Extension Core, Desktop App, Other |
| Description | Textarea (4 rows) | ✅ | What happened? Steps to reproduce? |
| Context | Textarea (2 rows) | ❌ | Error messages, logs, environment details |

#### Workflow
1. User fills out form fields
2. Clicks **✨ Enhance** button
3. Extension receives `enhanceBugReport` message with form data
4. PromptEnhancer generates enhanced prompt with patterns
5. Enhanced text populates main text area
6. Workflow closes automatically
7. User reviews/edits in text area
8. User sends to terminal with **📤 Send** button

#### Message Handler
```typescript
case 'enhanceBugReport':
    const bugData = message.data;
    // Extract: title, severity, component, description, context
    const enhancedPrompt = await this.promptEnhancer.enhance(
        `Bug Report: ${bugData.title}\n...`
    );
    webview.postMessage({
        type: 'enhancedText',
        text: enhancedPrompt
    });
```

**Files:** `voicePanel.ts:3638-3723` (Form + handler)

---

### 5. Feature Request Form (UI-006)

**Pattern:** Structured Form → Enhance → Main Text Area → Terminal

#### Form Fields
| Field | Type | Required | Options |
|-------|------|----------|---------|
| Feature Title | Text input | ✅ | Brief feature description |
| Priority | Dropdown | ❌ | Low, Medium (default), High, Critical |
| Category | Dropdown | ❌ | Voice, Sprint, Patterns, UI/UX, Skills, Performance, Other |
| Use Case | Textarea (3 rows) | ✅ | What problem does this solve? |
| Solution | Textarea (3 rows) | ❌ | How should this work? |
| Context | Textarea (2 rows) | ❌ | Examples, mockups, alternatives |

#### Workflow
Same pattern as Bug Report:
1. Fill form → 2. Enhance → 3. Text area → 4. Review → 5. Send

#### Message Handler
```typescript
case 'enhanceFeatureRequest':
    const featureData = message.data;
    const enhancedPrompt = await this.promptEnhancer.enhance(
        `Feature Request: ${featureData.title}\n...`
    );
    // ... (same as bug report)
```

**Files:** `voicePanel.ts:3730-3822` (Form + handler)

---

### 6. Skills Management (UI-006)

**Purpose:** List all installed skills and allow editing.

#### Workflow
1. Click **📦 Skills** button
2. Extension scans `.claude/skills/` directory
3. Returns list of skills with metadata
4. UI renders clickable skill list
5. Clicking skill opens file in VS Code editor

#### Message Handlers

**Request:**
```typescript
case 'getSkills':
    const skillsPath = path.join(workspaceRoot, '.claude', 'skills');
    const skillDirs = fs.readdirSync(skillsPath);
    const skills = skillDirs.map(dir => ({
        name: dir,
        path: path.join(skillsPath, dir, 'SKILL.md')
    }));
    webview.postMessage({
        type: 'skillsList',
        skills: skills
    });
```

**Open Skill:**
```typescript
case 'openSkill':
    const skillPath = message.path;
    const doc = await vscode.workspace.openTextDocument(skillPath);
    await vscode.window.showTextDocument(doc);
```

**UI Rendering:**
- Each skill: Name + description + click handler
- Grid layout: 2 columns on wide screens
- Hover effect: Background highlight
- Click: Opens `SKILL.md` in editor

**Files:** `voicePanel.ts:3829-3904` (Skills UI)

---

### 7. Settings UI (UI-006)

**Minimal settings approach:** Only essential configuration options.

#### Settings
| Setting | Type | Default | Purpose |
|---------|------|---------|---------|
| Dev Mode | Checkbox | `false` | Use `internal/sprints` vs `sprints` |
| Sprint File Path | Text input | `internal/sprints/ACTIVE_SPRINT.toml` | Custom sprint file location |

#### Workflow
1. Click **⚙️ Settings** button
2. Extension reads current configuration
3. UI displays settings form
4. User changes setting
5. `updateSetting` message sent immediately
6. Extension saves to VS Code workspace configuration

#### Message Handlers

**Get Settings:**
```typescript
case 'getSettings':
    const config = vscode.workspace.getConfiguration('aetherlight');
    webview.postMessage({
        type: 'settingsData',
        settings: {
            devMode: config.get('devMode', false),
            sprintPath: config.get('sprintPath', 'internal/sprints/ACTIVE_SPRINT.toml')
        }
    });
```

**Update Setting:**
```typescript
case 'updateSetting':
    const { key, value } = message;
    await vscode.workspace.getConfiguration('aetherlight').update(
        key,
        value,
        vscode.ConfigurationTarget.Workspace
    );
```

**Files:** `voicePanel.ts:3911-3970` (Settings UI)

---

### 8. Sprint File Dropdown (DEBUG-004)

**Multi-file sprint support via `findAvailableSprints()`**

#### Purpose
Allow users to switch between multiple sprint files without manually editing configuration.

#### Naming Convention
- Format: `ACTIVE_SPRINT_[DESCRIPTOR].toml`
- Examples:
  - `ACTIVE_SPRINT.toml` (legacy, default)
  - `ACTIVE_SPRINT_v0.16.0.toml` (version-based)
  - `ACTIVE_SPRINT_2025-11-04.toml` (date-based)
  - `ACTIVE_SPRINT_UI_REFACTOR.toml` (feature-based)

#### Implementation

**SprintLoader.findAvailableSprints():**
```typescript
findAvailableSprints(): string[] {
    const sprintsDir = path.join(workspaceRoot, 'internal', 'sprints');
    const files = fs.readdirSync(sprintsDir);
    return files.filter(f => f.startsWith('ACTIVE_SPRINT') && f.endsWith('.toml'));
}
```

**Dropdown Population:**
```typescript
case 'getAvailableSprints':
    const sprintFiles = this.sprintLoader.findAvailableSprints();
    const currentFile = path.basename(this.sprintLoader.currentSprintPath);
    webview.postMessage({
        type: 'availableSprints',
        files: sprintFiles,
        current: currentFile
    });
```

**Sprint Switching:**
```typescript
function switchSprint(filename) {
    vscode.postMessage({
        type: 'switchSprint',
        filename: filename
    });
}
```

**UI:**
- Location: Sprint panel header (between "Sprint" title and action icons)
- Width: 180-250px
- Font: 12px
- Disabled state: Cursor not-allowed, opacity 0.8
- Enabled state: Cursor pointer, opacity 1.0

**Files:**
- `voicePanel.ts:1073-1099` (Message handler)
- `voicePanel.ts:2050-2054` (HTML)
- `voicePanel.ts:2949-2966` (CSS)

---

### 9. Message Passing (IPC)

**WebView ↔ Extension communication via `vscode.postMessage()`**

#### Key Messages

| Message Type | Direction | Purpose |
|--------------|-----------|---------|
| `enhanceText` | → Extension | Enhance text in main text area |
| `enhanceBugReport` | → Extension | Enhance bug report form data |
| `enhanceFeatureRequest` | → Extension | Enhance feature request form data |
| `getSkills` | → Extension | Request list of installed skills |
| `openSkill` | → Extension | Open skill file in editor |
| `getSettings` | → Extension | Request current settings |
| `updateSetting` | → Extension | Save setting change |
| `getAvailableSprints` | → Extension | Request sprint file list |
| `switchSprint` | → Extension | Load different sprint file |
| `enhancedText` | ← WebView | Deliver enhanced prompt to text area |
| `skillsList` | ← WebView | Deliver skills list |
| `settingsData` | ← WebView | Deliver settings data |
| `availableSprints` | ← WebView | Deliver sprint file list |

**Pattern:**
1. WebView sends request message
2. Extension processes (reads files, enhances prompts, etc.)
3. Extension sends response message
4. WebView updates UI

---

## Integration Points

### 1. PromptEnhancer Service
- **File:** `src/services/PromptEnhancer.ts`
- **Purpose:** Add patterns, SOPs, and context to user prompts
- **Used by:** Bug Report form, Feature Request form, Enhance button
- **API:** `enhance(text: string): Promise<string>`

### 2. SprintLoader Service
- **File:** `src/commands/SprintLoader.ts`
- **Purpose:** Parse TOML sprint files, provide task data
- **Used by:** Sprint panel, task list rendering
- **API:**
  - `loadSprintFromFile(filePath: string): Promise<void>`
  - `findAvailableSprints(): string[]`
  - `getCurrentTasks(): SprintTask[]`

### 3. TaskStarter Service
- **File:** `src/services/TaskStarter.ts`
- **Purpose:** Enforce TDD, dependencies, workflow protocols
- **Used by:** Sprint panel task starter buttons (future)
- **API:** `startTask(taskId: string): Promise<void>`

### 4. AutoTerminalSelector Service
- **File:** `src/commands/AutoTerminalSelector.ts`
- **Purpose:** Intelligent terminal selection for command execution
- **Used by:** Send button, terminal list (future)
- **API:** `selectNextTerminal(): Terminal`

---

## Removed Features (v0.16.7)

### Settings Tab → Settings Button
- **Previously:** Dedicated Settings tab
- **Now:** Settings button in toolbar → Workflow area
- **Reason:** Simpler tab structure, contextual settings UI
- **Related:** REFACTOR-005

### Multi-Row Toolbar → Single-Row Toolbar
- **Previously:** Separate rows for voice/send buttons, workflow dropdown
- **Now:** Single consolidated row with LEFT/CENTER/RIGHT sections
- **Savings:** ~60-80px vertical space
- **Related:** REFACTOR-004, UI-007, UI-008

---

## Known Issues (v0.16.7)

### 1. WebView Not Refreshing on TOML Changes
**Status:** 🔴 Active Issue
**Description:** When sprint TOML file is updated, the WebView task list doesn't automatically refresh.
**Expected:** FileSystemWatcher should trigger refresh
**Actual:** WebView displays stale data until manual reload
**Investigation Needed:** Check FileSystemWatcher setup, message passing to WebView
**Priority:** P1 (user frustration, requires manual reload)

---

## Performance Characteristics

### Workflow Area Transitions
- **Show animation:** 300ms opacity fade-in
- **Hide animation:** 300ms opacity fade-out
- **No layout shift:** Container height fixed during transition

### Sprint File Switching
- **Load time:** <200ms for typical sprint (<100 tasks)
- **Caching:** Phase files cached in `Map<string, string>`
- **Auto-refresh:** FileSystemWatcher monitors `**/*ACTIVE_SPRINT*.toml`

---

## Future Enhancements

### Planned (Not Yet Implemented)
1. **Code Analyzer Workflow** - Workspace analysis configuration
2. **Sprint Planner Workflow** - AI-assisted sprint creation
3. **Terminal List (Horizontal)** - Clickable terminal chips below text area
4. **Task Starter Buttons** - Start task with dependency validation
5. **Enhanced Prompt Display** - Real-time prompt enhancement preview

### Deferred
- **Multi-tab Layout** - Removed in favor of single-panel
- **Settings Tab** - Moved to toolbar button

---

## Testing Checklist

### Toolbar Buttons
- [ ] 🔍 Code Analyzer opens placeholder workflow
- [ ] 📋 Sprint Planner opens placeholder workflow
- [ ] 🎤 Record toggles voice recording
- [ ] ✨ Enhance enhances text in text area
- [ ] 📤 Send sends text to active terminal
- [ ] 🗑️ Clear clears text area
- [ ] 🐛 Bug Report opens form workflow
- [ ] 🔧 Feature Request opens form workflow
- [ ] 📦 Skills opens skills list workflow
- [ ] ⚙️ Settings opens settings workflow

### Bug Report Form
- [ ] All fields render correctly
- [ ] Severity dropdown has 4 options
- [ ] Component dropdown has 7 options
- [ ] Validation: Title and Description required
- [ ] Enhance button populates main text area
- [ ] Workflow closes after enhancement
- [ ] Enhanced text includes bug report structure

### Feature Request Form
- [ ] All fields render correctly
- [ ] Priority dropdown has 4 options
- [ ] Category dropdown has 7 options
- [ ] Validation: Title and Use Case required
- [ ] Enhance button populates main text area
- [ ] Workflow closes after enhancement
- [ ] Enhanced text includes feature request structure

### Skills Management
- [ ] Skills list loads on button click
- [ ] Shows all skills in `.claude/skills/`
- [ ] Clicking skill opens SKILL.md in editor
- [ ] Handles missing skills directory gracefully
- [ ] Error message displayed if no skills found

### Settings UI
- [ ] Dev Mode checkbox displays current state
- [ ] Sprint File Path input displays current path
- [ ] Changes saved immediately (no save button)
- [ ] Settings persist across VS Code reloads
- [ ] Invalid paths show error message

### Sprint File Dropdown
- [ ] Dropdown populates with all ACTIVE_SPRINT_*.toml files
- [ ] Current file selected by default
- [ ] Switching loads new sprint file
- [ ] Task list updates after switch
- [ ] Selection persists (saved in workspace state)

### Workflow Area
- [ ] Hidden on initial load
- [ ] Shows with smooth animation (300ms)
- [ ] Only one workflow visible at a time
- [ ] Clicking same button closes workflow
- [ ] ESC key closes active workflow
- [ ] Close button (X) works correctly

---

## Code References

### Key Files
- `vscode-lumina/src/commands/voicePanel.ts` - Main WebView provider (4500+ lines)
- `vscode-lumina/src/commands/SprintLoader.ts` - Sprint TOML parsing
- `vscode-lumina/src/services/PromptEnhancer.ts` - Prompt enhancement
- `vscode-lumina/src/services/TaskStarter.ts` - Task dependency validation
- `vscode-lumina/src/commands/AutoTerminalSelector.ts` - Terminal selection

### CSS Classes
- `.main-toolbar` - Single-row toolbar container (line 1575)
- `.toolbar-btn` - Toolbar button styling (line 1628)
- `.workflow-area` - Workflow container (line 1896)
- `.sprint-file-dropdown` - Sprint dropdown styling (line 2949)

### JavaScript Functions
- `window.showWorkflow(type, title, content)` - Show workflow area (line 3562)
- `window.closeWorkflow()` - Hide workflow area (line 3583)
- `window.toggleWorkflow(type, title, content)` - Toggle workflow (line 3591)
- `window.openBugReport()` - Open bug report form (line 3638)
- `window.openFeatureRequest()` - Open feature request form (line 3730)
- `window.openSkills()` - Open skills list (line 3829)
- `window.openSettings()` - Open settings UI (line 3911)

---

## Patterns Referenced

- **Pattern-WORKFLOW-001:** Unified workflow area for all interactive tools
- **Pattern-SPRINT-002:** Multi-sprint file management
- **Pattern-UI-002:** Maximize vertical space, minimize UI chrome
- **Pattern-PUBLISH-003:** Avoid runtime npm dependencies

---

**End of Sprint Planner UI Documentation**
