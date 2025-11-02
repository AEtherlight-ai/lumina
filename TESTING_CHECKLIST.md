# ÆtherLight Testing Checklist

**Pattern:** Pattern-TESTING-001 (Manual Testing Methodology)
**Purpose:** Release gate - all items must pass before publishing
**Last Updated:** 2025-11-01

---

## How to Use This Checklist

1. **Copy this template** for each release (e.g., `TESTING_CHECKLIST_v0.15.4.md`)
2. **Check boxes** as you complete each test
3. **Take screenshots** and save to `screenshots/` directory
4. **Document failures** in TESTING_LOG.md
5. **Sign off** at bottom when all tests pass

---

## Release Information

**Version:** _____________
**Release Date:** _____________
**Tester:** _____________
**Status:** 🟡 In Progress / ✅ Complete / ❌ Blocked

---

## Phase 0: Critical Bug Fixes

### BUG-008: Record Button

- [ ] **Test:** Click record button → recording starts
- [ ] **Expected:** Recording starts < 100ms, button shows "Recording..."
- [ ] **Screenshot:** `screenshots/BUG-008-fixed.png`
- [ ] **Status:** ✅ PASS / ❌ FAIL

### BUG-009: Enhancement Button

- [ ] **Test:** Type text → click ✨ → text enhanced with context
- [ ] **Expected:** Enhanced prompt appears in textarea with project context
- [ ] **Screenshot:** `screenshots/BUG-009-fixed.png`
- [ ] **Status:** ✅ PASS / ❌ FAIL

### BUG-010: Send to Terminal

- [ ] **Test:** Type command → click "Send to Terminal" → command executes
- [ ] **Expected:** Command auto-executes in selected terminal (hybrid mode)
- [ ] **Screenshot:** `screenshots/BUG-010-fixed.png`
- [ ] **Status:** ✅ PASS / ❌ FAIL

### BUG-011: Cursor Focus

- [ ] **Test:** Type in textarea → send command → cursor returns to textarea
- [ ] **Expected:** Cursor stays in textarea after send (no focus loss)
- [ ] **Screenshot:** `screenshots/BUG-011-fixed.png`
- [ ] **Status:** ✅ PASS / ❌ FAIL

---

## Phase 1: UI Architecture

### UI-ARCH-001: Remove Voice Tab

- [ ] **Test:** Open Voice Panel → check tab bar
- [ ] **Expected:** NO "Voice" tab in tab bar (voice section always visible at top)
- [ ] **Screenshot:** `screenshots/UI-ARCH-001-no-voice-tab.png`
- [ ] **Status:** ✅ PASS / ❌ FAIL

### UI-ARCH-002: Only 2 Tabs

- [ ] **Test:** Count tabs in tab bar
- [ ] **Expected:** Only 2 tabs visible: "Default" and "Settings"
- [ ] **Screenshot:** `screenshots/UI-ARCH-002-two-tabs.png`
- [ ] **Status:** ✅ PASS / ❌ FAIL

### UI-ARCH-003: Voice Section at Top

- [ ] **Test:** Open Voice Panel → check layout order
- [ ] **Expected:** Order (top→bottom): Terminal list → Toolbar → Textarea → Tabs → Bug toolbar
- [ ] **Screenshot:** `screenshots/UI-ARCH-003-layout-order.png`
- [ ] **Status:** ✅ PASS / ❌ FAIL

---

## Phase 2: Terminal System

### TERM-001: Multi-Row Terminal List

- [ ] **Test:** Create 4+ terminals → check terminal list display
- [ ] **Expected:** Terminals display in multi-row grid (not single dropdown)
- [ ] **Screenshot:** `screenshots/TERM-001-multi-row.png`
- [ ] **Status:** ✅ PASS / ❌ FAIL

### TERM-002: Terminal Icons

- [ ] **Test:** Send command to terminal → check icon while executing
- [ ] **Expected:** Terminal shows ▶️ (busy) icon while executing, ⏸️ (idle) when done
- [ ] **Screenshot:** `screenshots/TERM-002-icons.png`
- [ ] **Status:** ✅ PASS / ❌ FAIL

### TERM-003: Smart Terminal Selection

- [ ] **Test:** Send command to Terminal A → command completes → check selection
- [ ] **Expected:** System auto-selects next idle terminal after completion
- [ ] **Screenshot:** `screenshots/TERM-003-auto-select.png`
- [ ] **Status:** ✅ PASS / ❌ FAIL

### TERM-004: Unique Terminal Naming

- [ ] **Test:** Create terminal named "Review" → create another "Review"
- [ ] **Expected:** Second terminal named "Review 2" (counter-based uniqueness)
- [ ] **Screenshot:** `screenshots/TERM-004-unique-names.png`
- [ ] **Status:** ✅ PASS / ❌ FAIL

### TERM-005: Terminal Creation

- [ ] **Test:** Click "Create Terminal" button → terminal created with semantic name
- [ ] **Expected:** New terminal appears with name like "Review", "Deploy", etc.
- [ ] **Screenshot:** `screenshots/TERM-005-creation.png`
- [ ] **Status:** ✅ PASS / ❌ FAIL

---

## Phase 3: E2E Workflows

### TEST-003: End-to-End Voice Workflow

- [ ] **Test:** Backtick key → speak → transcribe → enhance → send to terminal
- [ ] **Expected:** Complete workflow works without errors
- [ ] **Screenshot:** `screenshots/TEST-003-e2e-voice.png`
- [ ] **Status:** ✅ PASS / ❌ FAIL

**Workflow Steps:**
1. Press backtick (`) key → Voice Panel opens
2. Click record button → recording starts
3. Speak: "run tests"
4. Recording stops → transcription appears in textarea
5. Click ✨ enhancement button → context added
6. Click "Send to Terminal" → command executes
7. Verify: Tests run in terminal

---

## Sprint Tab

### C-001: SprintLoader Implementation

- [ ] **Test:** Open Sprint tab → verify sprint loads
- [ ] **Expected:** Sprint tasks display from ACTIVE_SPRINT.toml
- [ ] **Screenshot:** `screenshots/C-001-sprint-loader.png`
- [ ] **Status:** ✅ PASS / ❌ FAIL

### Sprint Tab Tasks (C-002 through C-013)

- [ ] **Test:** Sprint tab displays task list grouped by phase
- [ ] **Expected:** Tasks grouped by phase, show status icons, clickable for details
- [ ] **Screenshot:** `screenshots/sprint-tab-overview.png`
- [ ] **Status:** ✅ PASS / ❌ FAIL

---

## Performance Benchmarks

### Voice Panel Load Time

- [ ] **Test:** Open Voice Panel (first time) → measure load time
- [ ] **Target:** < 500ms
- [ ] **Actual:** _______ ms
- [ ] **Status:** ✅ PASS / ❌ FAIL

### Sprint TOML Parse Time

- [ ] **Test:** Load sprint (92 tasks) → measure parse time
- [ ] **Target:** < 10ms
- [ ] **Actual:** _______ ms
- [ ] **Status:** ✅ PASS / ❌ FAIL

### Terminal List Refresh Time

- [ ] **Test:** Create terminal → measure UI update time
- [ ] **Target:** < 50ms
- [ ] **Actual:** _______ ms
- [ ] **Status:** ✅ PASS / ❌ FAIL

### Tab Switch Latency

- [ ] **Test:** Click tab → measure switch time
- [ ] **Target:** < 50ms
- [ ] **Actual:** _______ ms
- [ ] **Status:** ✅ PASS / ❌ FAIL

### HTML Generation Time

- [ ] **Test:** Regenerate WebView HTML (full) → measure time
- [ ] **Target:** < 200ms
- [ ] **Actual:** _______ ms
- [ ] **Status:** ✅ PASS / ❌ FAIL

---

## Regression Tests

### v0.15.3 Features Still Work

- [ ] **Voice capture** (backtick key) → ✅ PASS / ❌ FAIL
- [ ] **Sprint loader** (Sprint tab) → ✅ PASS / ❌ FAIL
- [ ] **Auto-update** (Check for updates) → ✅ PASS / ❌ FAIL
- [ ] **Desktop app integration** (IPC connection) → ✅ PASS / ❌ FAIL
- [ ] **Settings persistence** (selected terminal saved) → ✅ PASS / ❌ FAIL

### Hotkeys

- [ ] **Backtick (`)** opens Voice Panel → ✅ PASS / ❌ FAIL
- [ ] **Ctrl+Shift+P** → "ÆtherLight" commands appear → ✅ PASS / ❌ FAIL

### File Watchers

- [ ] **Sprint TOML change** → UI auto-refreshes → ✅ PASS / ❌ FAIL
- [ ] **Terminal created** → appears in list immediately → ✅ PASS / ❌ FAIL
- [ ] **Terminal closed** → removed from list immediately → ✅ PASS / ❌ FAIL
- [ ] **Terminal renamed** → name updates in list → ✅ PASS / ❌ FAIL

---

## Edge Cases

### Voice Panel

- [ ] **Multiple clicks on record button** → only one recording starts → ✅ PASS / ❌ FAIL
- [ ] **Stop recording immediately** (< 1s) → no transcription sent → ✅ PASS / ❌ FAIL
- [ ] **Desktop app offline** → error message shown → ✅ PASS / ❌ FAIL
- [ ] **Empty text enhancement** → appropriate message shown → ✅ PASS / ❌ FAIL

### Terminal System

- [ ] **All terminals busy** → shows notification → ✅ PASS / ❌ FAIL
- [ ] **Terminal closed during execution** → warning shown → ✅ PASS / ❌ FAIL
- [ ] **No terminals open** → shows "Create Terminal" prompt → ✅ PASS / ❌ FAIL

### Sprint Tab

- [ ] **No ACTIVE_SPRINT.toml** → shows helpful message → ✅ PASS / ❌ FAIL
- [ ] **Invalid TOML syntax** → shows error message → ✅ PASS / ❌ FAIL
- [ ] **Large sprint (1000+ tasks)** → loads without crash → ✅ PASS / ❌ FAIL

---

## Cross-Platform Tests

### Windows

- [ ] Voice capture works → ✅ PASS / ❌ FAIL / ⏭️ SKIPPED
- [ ] Terminal integration works → ✅ PASS / ❌ FAIL / ⏭️ SKIPPED
- [ ] File paths resolve correctly → ✅ PASS / ❌ FAIL / ⏭️ SKIPPED

### macOS

- [ ] Voice capture works → ✅ PASS / ❌ FAIL / ⏭️ SKIPPED
- [ ] Terminal integration works → ✅ PASS / ❌ FAIL / ⏭️ SKIPPED
- [ ] File paths resolve correctly → ✅ PASS / ❌ FAIL / ⏭️ SKIPPED

### Linux

- [ ] Voice capture works → ✅ PASS / ❌ FAIL / ⏭️ SKIPPED
- [ ] Terminal integration works → ✅ PASS / ❌ FAIL / ⏭️ SKIPPED
- [ ] File paths resolve correctly → ✅ PASS / ❌ FAIL / ⏭️ SKIPPED

---

## Documentation Updates

- [ ] **CHANGELOG.md** updated with new features/fixes
- [ ] **README.md** updated if user-facing changes
- [ ] **KNOWN_ISSUES.md** updated (bugs marked as fixed)
- [ ] **CLAUDE.md** updated with new patterns/SOPs
- [ ] **Pattern library** updated (new patterns documented)

---

## Sign-Off

### Test Summary

**Total Tests:** _______
**Passed:** _______
**Failed:** _______
**Skipped:** _______

### Critical Issues Found

_List any blockers or critical bugs discovered during testing:_

1. ________________________________________________
2. ________________________________________________
3. ________________________________________________

### Ready for Release?

- [ ] ✅ **YES** - All critical tests pass, no blockers
- [ ] ❌ **NO** - Critical failures, see issues above
- [ ] ⚠️ **CONDITIONAL** - Minor issues, non-blocking (list below):

**Conditional Release Notes:**
_____________________________________________
_____________________________________________

### Tester Sign-Off

**Name:** _____________________
**Date:** _____________________
**Signature:** _____________________

**Approved for Release:** ✅ YES / ❌ NO

---

## Notes

_Use this section for any additional observations, warnings, or context:_

_____________________________________________
_____________________________________________
_____________________________________________
_____________________________________________

---

**Pattern Reference:** Pattern-TESTING-001
**Template Version:** 1.0
**Created:** 2025-11-01
