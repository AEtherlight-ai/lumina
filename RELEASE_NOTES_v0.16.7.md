# ÆtherLight v0.16.7 - Sprint Enhancement & UI Polish

**Release Date:** 2025-11-05
**Type:** Patch Release (Bug Fixes + Features)

---

## 🎉 Highlights

### Sprint Enhancement Mode
Add tasks to existing sprints without recreating the entire sprint file! The sprint-plan skill now supports **ENHANCE mode** alongside CREATE mode.

- **Use case:** Mid-sprint requirement changes, discovered tasks, release validations
- **Workflow:** 10-step process with TOML validation
- **Tested:** Successfully added 7 RELEASE tasks to v0.16 sprint
- **Documentation:** Mode comparison table, tips for both modes

### Structured Bug & Feature Forms
Professional structured forms with AI enhancement for bug reports and feature requests.

- **Bug Report Form:** Severity, Component, Description, Context fields
- **Feature Request Form:** Priority, Category, Use Case, Solution fields
- **Workflow:** Fill form → Enhance with AI → Review in text area → Send to terminal
- **Integration:** PromptEnhancer service adds patterns and SOPs

### Multi-Sprint File Management
Switch between multiple sprint files via dropdown in Sprint panel header.

- **Format:** `ACTIVE_SPRINT_[DESCRIPTOR].toml`
- **Supports:** Version-based, date-based, feature-based descriptors
- **Example:** `ACTIVE_SPRINT_v0.16.7.toml`, `ACTIVE_SPRINT_2025-11-05.toml`
- **Backward compatible:** Legacy `ACTIVE_SPRINT.toml` still works

---

## 🐛 Bug Fixes

Fixed **10 UI bugs** from v0.16.0 refactoring:

- **UI-001 to UI-006:** Restored button functionality, implemented Bug/Feature forms
- **UI-007 to UI-010:** Maximized vertical space (saved 150px+), consolidated layouts

**Most impactful fix:** Sprint task statistics now on single row with checkbox (UI-010)

---

## 🎨 UI Polish

### Single-Row Toolbar (REFACTOR-004)
Consolidated all buttons into single row with LEFT/CENTER/RIGHT sections:
- **LEFT:** Primary actions (🎤 Record, 🔍 Code Analyzer, 📋 Sprint Planner, ✨ Enhance, 📤 Send, 🗑️ Clear)
- **CENTER:** Keyboard shortcuts (`` ` `` to record, `Ctrl+Enter` to send)
- **RIGHT:** Utilities (🐛 Bug, 🔧 Feature, 📦 Skills, ⚙️ Settings)

**Benefit:** Saved 60-80px vertical space for more task visibility

### Unified Workflow Area (REFACTOR-006)
All interactive tools (Bug Report, Feature Request, Skills, Settings) share single workflow area:
- One workflow visible at a time
- ESC key closes active workflow
- Smooth 300ms transitions
- No layout shift

---

## 📚 Documentation

### Sprint Planner UI Architecture Guide
Comprehensive 400+ line documentation covering:
- 9 major UI components with implementation details
- Integration points (PromptEnhancer, SprintLoader, TaskStarter)
- 14 IPC message handlers cataloged
- ASCII layout diagram
- 35+ test cases in testing checklist

**Location:** `vscode-lumina/docs/SPRINT_PLANNER_UI.md`

### Sub-Package Publishing Order
Critical documentation added to prevent v0.13.29-style bugs:
- Explains why sub-packages must publish first
- Documents automated script order
- References historical bugs and fixes

**Location:** `PUBLISHING.md` (lines 92-106)

---

## 🔧 Technical Details

**Packages Published:**
- `aetherlight@0.16.7` (main extension + CLI)
- `aetherlight-analyzer@0.16.7` (code analyzer)
- `aetherlight-sdk@0.16.7` (app integration SDK)
- `aetherlight-node@0.16.7` (native Rust bindings)

**Sprint Progress:** 22/31 tasks complete (71%)

**Pattern Compliance:**
- Pattern-SKILL-ENHANCE-001 (Sprint Enhancement During Iteration)
- Pattern-WORKFLOW-001 (Unified Workflow Area)
- Pattern-UI-002 (Maximize Vertical Space)
- Pattern-DOCS-001 (Documentation Philosophy)

**Build Status:**
- ✅ TypeScript compilation: No errors
- ✅ TOML validation: All sprint files parse correctly
- ✅ Sub-package verification: Automated in publish script

---

## ⚠️ Known Issues

### UI-011: WebView Sprint Task List Auto-Refresh
**Issue:** WebView doesn't automatically refresh when sprint TOML file is updated.

**Workaround:** Close and reopen Sprint panel to see updated tasks.

**Status:** Tracked for investigation post-v0.16.7 release.

**Root Cause:** FileSystemWatcher or message passing issue between extension and WebView.

---

## 📦 Installation

### New Users
```bash
npm install -g aetherlight@latest
```

### Existing Users
```bash
npm update -g aetherlight
```

Or use the automatic update notification in VS Code (appears within 1 hour of release).

---

## 🔗 Links

- **npm Package:** https://www.npmjs.com/package/aetherlight
- **GitHub Repository:** https://github.com/AEtherlight-ai/lumina
- **Documentation:** https://github.com/AEtherlight-ai/lumina#readme
- **Issue Tracker:** https://github.com/AEtherlight-ai/lumina/issues

---

## 🙏 Thank You

Thank you for using ÆtherLight! This release focused on sprint management workflow improvements and UI polish based on dogfooding feedback.

Report bugs or request features using the new **🐛 Bug Report** and **🔧 Feature Request** forms in the sidebar!

---

**Full Changelog:** [CHANGELOG.md](https://github.com/AEtherlight-ai/lumina/blob/master/CHANGELOG.md)
