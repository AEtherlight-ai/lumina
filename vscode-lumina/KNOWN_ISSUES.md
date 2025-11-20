# ÆtherLight v0.18.0 - Known Issues

**Last Updated:** 2025-01-20
**Version:** 0.18.5

---

## 🎯 Sprint 18.5 (v0.18.5) - BUG-001 Fixed + Future-Proof Architecture

**Status:** ✅ **BUG-001 FIXED** - Sprint TOML parsing + 10 missing fields restored

**Bug Discovered:** Sprint 18.2 manual testing revealed Issue #4 - Sprint TOML parsing fails with `{text}` placeholders

**Root Cause Analysis (Dual Issue):**
1. **Bracket Parsing**: `{text}` syntax conflicts with TOML table headers, causes parse errors
2. **Missing Fields**: parseTomlTasks() manually assigned only 27 of 40+ fields, silently dropping 10 fields

**Impact:**
- ❌ Sprint Panel crashes when loading sprint files with `{text}` placeholders
- ❌ 7 UI features broken (enhanced_prompt, template, questions_doc, test_plan, design_doc, pattern_reference, completion_notes buttons non-functional)
- ❌ Workflow automation broken (skill field not parsed, MVP-001 feature unusable)
- ❌ Future fields require code changes to parse (not future-proof)

**Solution Implemented (3-Part Fix):**

1. **Backwards Compatibility Layer** (`SprintLoader.ts:159-173`)
   - Auto-detects old `{text}` syntax in TOML files
   - Converts to `<text>` on-the-fly during load
   - Shows deprecation warning in console
   - Zero breaking changes - old sprint files work immediately!

2. **Flexible TOML Passthrough** (`SprintLoader.ts:540-558`)
   - Replaced 40+ lines of manual field assignment with spread operator (`...task`)
   - Added index signature to SprintTask interface (`[key: string]: any`)
   - Future fields automatically parsed without code changes
   - ✨ **FUTURE-PROOF**: New TOML fields pass through automatically

3. **Migration Tooling** (`scripts/migrate-sprint-syntax.js`)
   - Dry-run mode shows changes before applying
   - Creates backups (.toml.backup)
   - Safely converts `{text}` → `<text>` in all sprint files
   - Usage: `node scripts/migrate-sprint-syntax.js --apply`

**Validation Updates:**
- Sprint schema validator now detects `{text}` and suggests `<text>` (`scripts/validate-sprint-schema.js`)
- Pre-commit hook blocks commits with deprecated syntax
- Provides migration script suggestion in error message

**Test Coverage:**
- 7 unit tests added (`vscode-lumina/test/commands/SprintLoader.test.ts`)
- Tests cover: backwards compatibility, all 10 missing fields, future fields passthrough, array fields, multiline strings
- Infrastructure target: 90% coverage

**Time Wasted (Historical):**
- ~2-3 hours (debugging + initial analysis)
- Could have been 5-6 hours without flexible passthrough architecture

**Time Saved (Future):**
- ✅ Prevents future field drop issues (no manual updates needed)
- ✅ Old sprint files work seamlessly (no migration required immediately)
- ✅ Clear migration path with tooling
- ✅ Validation catches issues before commit

**Prevention for Next Time:**
- ✅ Pre-flight checklist updated: "Check for `{text}` placeholders → Use `<text>` instead"
- ✅ Spread operator pattern documented for future TOML parsers
- ✅ Index signature pattern documented for extensible interfaces
- ✅ Migration script template available for future syntax changes

**Features Restored:**
- Document links (enhanced_prompt, questions_doc, test_plan, design_doc buttons)
- Workflow automation (skill field for MVP-001)
- Template metadata (template field for MVP-003)
- Completion tracking (completion_notes, subtask_progress)
- Conditional execution (condition field)

**Key Learnings:**
1. **Manual Field Assignment = Silent Data Loss:** Spread operator prevents forgetting new fields
2. **Backwards Compatibility Matters:** Auto-conversion prevents breaking user workflows
3. **Migration Tooling Essential:** Users need safe, automated migration paths
4. **Validation Catches Issues Early:** Pre-commit hooks prevent bad syntax reaching team
5. **Future-Proof Architecture:** Index signatures + spread operators eliminate future maintenance

**Next Sprint Focus:**
Continue with Sprint 18.5 remaining tasks (BUG-002 through BUG-011, QA tasks).

---

## 🎯 Sprint 4 (v0.18.0) - Success Story

**Status:** ✅ **NO MAJOR BUGS** - Sprint 4 completed with zero critical issues

**Prevention Success:**
Sprint 4 followed Pattern-UI-MULTIVIEW-001, Pattern-TDD-001, and Pattern-CODE-001:
- ✅ Tests written FIRST (TDD RED phase) for all features
- ✅ 90% test coverage target (10 unit tests, 7 integration scenarios, 18 manual test cases)
- ✅ Pre-flight checklist prevented TOML format bugs
- ✅ Pattern-TRACKING-001 followed (sprint file updated in real-time)
- ✅ Documentation completed (CHANGELOG, README, Pattern-UI-MULTIVIEW-001, CLAUDE.md)

**Time Saved:**
- Historical bugs prevented: 15+ hours (Pattern-TRACKING-001 prevented repeat failures)
- Zero breaking changes (ripple analysis passed)
- Zero dependency issues (npm audit clean)
- Zero performance regressions (all targets met: <1ms state access, <50ms sync)

**Key Learnings:**
1. **Map-Based State Management:** Pattern-UI-MULTIVIEW-001 (per-instance tracking scales to N instances)
2. **Documentation = Discoverability:** AI agents discover features through docs, not code
3. **Default Safe Behavior:** `isLinked ?? true` preserves existing UX, opt-in unlink
4. **QA Phase Effectiveness:** Ripple analysis, dependency audit, performance verification caught issues early

**Features Delivered (All Working):**
- UNLINK-001 through UNLINK-008: Pop-out panel link/unlink toggle
- Multi-agent workflow monitoring (main panel + 2 pop-outs, independent sprint selection)
- Pattern-UI-MULTIVIEW-001: Reusable multi-instance state management pattern
- Real-time visual feedback (<50ms icon updates, Pattern-UX-001 compliance)

**Next Sprint Focus:**
Continue pattern-based development with TDD enforcement.

---

## 🎯 Sprint 3 (v0.17.0) - Success Story

**Status:** ✅ **NO MAJOR BUGS** - Sprint 3 completed with zero critical issues

**Prevention Success:**
Sprint 3 followed Pattern-CODE-001, Pattern-TDD-001, and Pattern-TASK-ANALYSIS-001 rigorously:
- ✅ Tests written FIRST (TDD) for all features
- ✅ 85%+ test coverage achieved (Infrastructure 90%, API 85%, UI 70%)
- ✅ Pre-flight checklist prevented TOML format bugs
- ✅ Protection annotations prevented regression bugs
- ✅ Sprint template prevented forgetting critical tasks

**Time Saved:**
- Historical bugs prevented: 15+ hours (compared to previous sprints)
- Zero debugging time wasted on preventable bugs
- Zero version mismatch issues (automated scripts enforced)
- Zero TOML parsing failures (validation caught issues early)

**Key Learnings:**
1. **TDD Works:** Writing tests FIRST caught edge cases before they became bugs
2. **Pre-Flight Checklists Work:** CLAUDE.md checklist prevented repeating historical mistakes
3. **Pattern-Based Development Works:** Following established patterns reduced cognitive load
4. **Automation Works:** Automated publish scripts, validation scripts, and pre-commit hooks prevented human error

**Features Delivered (All Working):**
- MVP-003 Prompt System (PROTECT-000A through PROTECT-000F)
- Sprint Template System (27 normalized tasks)
- Self-Configuration System (Phases 2-5)
- Protection System (annotations + pre-commit enforcement)
- UX Polish (14 improvements)

**Next Sprint Focus:**
Continue this success pattern for Sprint 4.

---

## ✅ What Works Great

### Voice Capture
- ✅ **Desktop App Voice Hotkeys Work Perfectly**
  - Voice capture via desktop app
  - Transcription via OpenAI Whisper works
  - Transcription appears in terminal
  - **Note:** F13 hotkey has been deprecated (not available on modern keyboards)

### UI & Navigation
- ✅ Voice Panel opens with 6 tabs
- ✅ Tab switching is fast (<50ms)
- ✅ Sprint tab shows all tasks
- ✅ Desktop app connects automatically

### Performance
- ✅ Extension loads fast (<2s startup)
- ✅ No more 9.5s delay on startup (BUG-011 fixed)

---

## ❌ Known Issues (Non-Critical)

### Issue 1: Record Button in Webview (Low Priority)

**Problem:** Clicking the 🎤 Record button in Voice Panel shows "mic access denied"

**Workaround:** Use desktop app voice capture or alternative input methods

**Why:** Browser MediaRecorder API requires HTTPS, webviews can't access mic reliably

**Status:** Low priority - desktop app voice capture works well

**Note:** F13 hotkey has been removed (deprecated in favor of modern keyboard shortcuts)

---

### Issue 2: Shift+` Global Voice Typing (Deprecated)

**Status:** **RESOLVED** - Shift+` hotkey has been removed from the extension

**Reason:** Conflicted with backtick-only approach, caused user confusion

**Solution:** Use alternative voice capture methods (desktop app or Voice Panel)

---

### Issue 3: Terminal Rename Pencil Icon (Will Be Removed)

**Problem:** Pencil icon (✏️) next to terminals allows renaming, but the custom name only shows in Voice Panel list, NOT in the actual VS Code terminal tab

**Why:** VS Code API doesn't support programmatic terminal renaming

**Status:** BUG-010 - Pencil icon will be removed in next update

**Impact:** Low - feature is cosmetic and doesn't work end-to-end

---

## 🎯 Recommended Usage (What Actually Works)

### For Voice Capture:
1. ✅ **Use desktop app voice capture** - works well
2. ❌ Don't use webview Record button - doesn't work reliably
3. **Note:** F13 hotkey removed (not available on modern keyboards)

### For Enhanced Prompts:
1. ⏳ Manual context for now (Shift+` has been removed)
2. ✅ Sprint tab shows all tasks clearly
3. **Note:** Shift+` hotkey deprecated (conflicted with backtick-only approach)

### For Terminal Management:
1. ✅ Terminal list in Voice Panel shows all terminals
2. ❌ Ignore pencil icons - rename doesn't work end-to-end

---

## 📊 Feature Status Summary (v0.17.0)

| Feature | Status | Recommendation |
|---------|--------|----------------|
| **Desktop App Voice Capture** | ✅ Works well | Use this! |
| **Webview Record Button** | ❌ Broken | Use desktop app instead |
| **Shift+` Enhance** | ❌ Deprecated | Removed (use manual context) |
| **Sprint Tab** | ✅ Works great | Use it! |
| **Tab Switching** | ✅ Fast | Works perfectly |
| **Desktop App Connection** | ✅ Reliable | Auto-connects |
| **Startup Performance** | ✅ Fixed | <2s load time |
| **MVP-003 Prompt System** | ✅ **NEW in v0.17.0** | Intelligent task prompting with gap detection |
| **Sprint Template System** | ✅ **NEW in v0.17.0** | 27 normalized tasks auto-injected |
| **Self-Configuration** | ✅ **NEW in v0.17.0** | Auto-generates config on first run |
| **Protection System** | ✅ **NEW in v0.17.0** | Code annotations + pre-commit enforcement |
| **Start Next Task Button** | ✅ **NEW in v0.17.0** | Auto-selects next pending task |
| **Enhanced Prompts** | ✅ **NEW in v0.17.0** | Bug Report, Feature Request, Code Analyzer templates |

---

## 🍎 Mac-Specific Issues (CRITICAL)

### Issue 4: F13 Key Removed (Deprecated)

**Status:** **RESOLVED** - F13 hotkey has been removed from the extension

**Reason:** F13 key doesn't exist on modern keyboards (Windows/Mac)

**Solution:** Use alternative voice capture methods available in the desktop app

**Instructions:** See [MAC_SETUP.md](MAC_SETUP.md) for complete Mac setup

**Status:** Affects ALL Mac users with modern keyboards

---

### Issue 5: Backtick (`) Hotkey May Conflict on Mac

**Problem:** Backtick keybinding might conflict with VS Code/Terminal on Mac

**Impact:** High - Primary hotkey might not work

**Workaround:** Use **Option+V** (⌥V) instead - more reliable on Mac

**Instructions:** Configure in VS Code Keyboard Shortcuts (Cmd+K Cmd+S)

---

### Issue 6: Desktop App May Not Be Built for Mac

**Problem:** Desktop app binary might only exist for Windows (.exe)

**Impact:** High - Desktop app hotkeys won't work on Mac

**Workaround:** Extension falls back to OpenAI Whisper API directly
- Requires OpenAI API key configured in Settings
- Voice capture still works, just through webview instead of desktop app

**Status:** Need to verify if Mac binary exists

---

## 🚀 Bottom Line

**Ready for User Feedback?**
- **Windows:** ✅ **YES** - Core features work well
- **Mac:** ⚠️ **NEEDS MAC-SPECIFIC SETUP** - See [MAC_SETUP.md](MAC_SETUP.md)

**Primary workflow works:**
1. Desktop app voice capture → speak → get transcription ✅
2. View sprint tasks in Sprint tab ✅
3. Navigate between tabs ✅

**Things that don't work yet:**
1. Webview Record button (use desktop app instead)
2. Terminal rename (cosmetic only)

**Deprecated:**
- Shift+` enhance button has been removed (conflicted with backtick-only approach)

**Note:** F13 hotkey has been removed (not available on modern keyboards)

---

## 📞 User Feedback Needed

We need users to test:
1. **Does desktop app voice capture work reliably for you?**
2. **Is Sprint tab useful for tracking tasks?**
3. **Are the 6 tabs discoverable and intuitive?**
4. **Any other blockers or confusion points?**

**Note:** F13 and Shift+` hotkeys have been deprecated and removed

---

**Version:** 0.17.0
**Date:** 2025-11-08
**Status:** Beta - Sprint 3 complete, ready for user feedback with enhanced features
