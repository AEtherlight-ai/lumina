# Sprint 4 Manual Test Plan - Pop-Out Panel Link/Unlink Toggle

**Sprint:** Sprint 4 (v0.18.0)
**Feature:** UNLINK-001 through UNLINK-008
**Test Date:** 2025-11-09
**Tester:** [Your Name]

---

## Test Environment Setup

**Prerequisites:**
- [ ] ÆtherLight extension compiled (run `npm run compile` in vscode-lumina/)
- [ ] At least 2 sprint files available in `internal/sprints/` directory
- [ ] Extension activated in VS Code (F5 to launch Extension Development Host)

**Sprint Files Used:**
- Sprint A: ACTIVE_SPRINT.toml (default)
- Sprint B: ACTIVE_SPRINT_UNLINK_SPRINT_VIEW.toml

---

## Phase 1: Basic Functionality Tests

### Test 1.1: Pop-Out Panel Creation
**Objective:** Verify pop-out panel can be created

**Steps:**
1. Open ÆtherLight Voice panel (sidebar)
2. Click "Pop Out Sprint View" button (⧉ icon)
3. Observe new editor panel opens

**Expected Results:**
- [ ] New editor panel opens titled "ÆtherLight Sprint"
- [ ] Pop-out panel shows same sprint as main panel
- [ ] Pop-out panel displays 🔗 (link) icon in header actions

**Actual Results:**
```
[Record observations here]
```

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 1.2: Toggle Button Visibility
**Objective:** Verify toggle button only appears in pop-out panels

**Steps:**
1. Examine main panel (sidebar) header actions
2. Pop out sprint view
3. Examine pop-out panel header actions

**Expected Results:**
- [ ] Main panel: NO toggle button (🔗/🔓) present
- [ ] Pop-out panel: Toggle button (🔗) present
- [ ] Toggle button positioned left of 🔄 (reload) button

**Actual Results:**
```
[Record observations here]
```

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 1.3: Default Link State
**Objective:** Verify pop-out panels start linked by default

**Steps:**
1. Pop out sprint view (Panel A)
2. Verify Panel A shows 🔗 icon
3. Change sprint in main panel to Sprint B
4. Observe Panel A

**Expected Results:**
- [ ] Panel A initially shows 🔗 icon (linked)
- [ ] Panel A automatically switches to Sprint B (synced with main panel)
- [ ] Notification shown: "✅ Switched to sprint: ACTIVE_SPRINT_UNLINK_SPRINT_VIEW.toml"

**Actual Results:**
```
[Record observations here]
```

**Status:** ⬜ Pass / ⬜ Fail

---

## Phase 2: Toggle Functionality Tests

### Test 2.1: Unlink Panel
**Objective:** Verify panel can be unlinked

**Steps:**
1. Pop out sprint view (Panel A shows 🔗)
2. Click 🔗 toggle button in Panel A
3. Observe icon change and notification

**Expected Results:**
- [ ] Icon changes from 🔗 to 🔓 immediately
- [ ] Notification shown: "🔓 Panel unlinked - independent sprint selection enabled"
- [ ] Tooltip updates: "Independent sprint selection (click to link)"

**Actual Results:**
```
[Record observations here]
```

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 2.2: Independent Sprint Selection (Unlinked)
**Objective:** Verify unlinked panel maintains independent sprint

**Steps:**
1. Unlink Panel A (shows 🔓)
2. Change Panel A to Sprint B (using dropdown)
3. Change main panel to Sprint A
4. Observe Panel A

**Expected Results:**
- [ ] Panel A stays on Sprint B (does NOT sync)
- [ ] Main panel shows Sprint A
- [ ] Panel A icon remains 🔓 (unlinked)

**Actual Results:**
```
[Record observations here]
```

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 2.3: Relink Panel
**Objective:** Verify panel can be relinked

**Steps:**
1. Panel A unlinked (shows 🔓), displaying Sprint B
2. Main panel showing Sprint A
3. Click 🔓 toggle button in Panel A
4. Observe icon change and notification

**Expected Results:**
- [ ] Icon changes from 🔓 to 🔗 immediately
- [ ] Notification shown: "🔗 Panel linked - sprint selection will sync with main panel"
- [ ] Panel A does NOT immediately switch to Sprint A (stays on Sprint B until next sprint change)
- [ ] Tooltip updates: "Linked to main panel (click to unlink)"

**Actual Results:**
```
[Record observations here]
```

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 2.4: Relinked Panel Syncs on Next Change
**Objective:** Verify relinked panel syncs with next sprint change

**Steps:**
1. Panel A relinked (shows 🔗), currently showing Sprint B
2. Main panel showing Sprint A
3. Change main panel to Sprint C
4. Observe Panel A

**Expected Results:**
- [ ] Panel A switches to Sprint C (synced with main panel)
- [ ] Icon remains 🔗 (linked)

**Actual Results:**
```
[Record observations here]
```

**Status:** ⬜ Pass / ⬜ Fail

---

## Phase 3: Multi-Panel Scenarios

### Test 3.1: Multiple Linked Panels
**Objective:** Verify multiple linked panels sync together

**Steps:**
1. Pop out Panel A (linked, 🔗)
2. Pop out Panel B (linked, 🔗)
3. Change main panel to Sprint B
4. Observe Panel A and Panel B

**Expected Results:**
- [ ] Both Panel A and Panel B switch to Sprint B
- [ ] Both panels show 🔗 icon
- [ ] All 3 views (main + 2 pop-outs) display identical sprint

**Actual Results:**
```
[Record observations here]
```

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 3.2: Mixed Link States (2 Linked + 1 Unlinked)
**Objective:** Verify mixed link states work correctly

**Steps:**
1. All panels showing Sprint A
2. Pop out Panel A (linked, 🔗)
3. Pop out Panel B (linked, 🔗)
4. Unlink Panel B → change to Sprint B
5. Change main panel to Sprint C
6. Observe all panels

**Expected Results:**
- [ ] Main panel: Sprint C
- [ ] Panel A: Sprint C (linked, synced)
- [ ] Panel B: Sprint B (unlinked, independent)
- [ ] Panel A shows 🔗, Panel B shows 🔓

**Actual Results:**
```
[Record observations here]
```

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 3.3: All Panels Unlinked (3 Independent Sprints)
**Objective:** Verify all panels can be independent simultaneously

**Steps:**
1. Main panel: Sprint A
2. Pop out Panel A → unlink → change to Sprint B
3. Pop out Panel B → unlink → change to Sprint C
4. Verify each panel shows different sprint

**Expected Results:**
- [ ] Main panel: Sprint A
- [ ] Panel A: Sprint B (🔓 icon)
- [ ] Panel B: Sprint C (🔓 icon)
- [ ] Changing main panel does NOT affect Panel A or Panel B

**Actual Results:**
```
[Record observations here]
```

**Status:** ⬜ Pass / ⬜ Fail

---

## Phase 4: Edge Cases & Error Handling

### Test 4.1: Rapid Toggle Clicks
**Objective:** Verify rapid toggle clicks handled correctly

**Steps:**
1. Pop out Panel A
2. Click toggle button 5 times rapidly (🔗 → 🔓 → 🔗 → 🔓 → 🔗)
3. Observe final state

**Expected Results:**
- [ ] Icon updates correctly on each click (no lag or desync)
- [ ] Final state: 🔗 (linked) after 5 clicks
- [ ] No errors in console
- [ ] No duplicate notifications

**Actual Results:**
```
[Record observations here]
```

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 4.2: Panel Disposal (Close Pop-Out)
**Objective:** Verify panel disposal cleans up link state

**Steps:**
1. Pop out Panel A → unlink (🔓)
2. Pop out Panel B → keep linked (🔗)
3. Close Panel A (X button)
4. Change main panel to different sprint
5. Observe Panel B still syncs correctly

**Expected Results:**
- [ ] Panel A closes cleanly (no errors)
- [ ] Panel B continues to sync with main panel (still linked)
- [ ] Console log shows: "Panel link state set: isLinked=false" removed from memory

**Actual Results:**
```
[Record observations here]
```

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 4.3: Toggle from Pop-Out (Not Main Panel)
**Objective:** Verify toggle only works in pop-out panels

**Steps:**
1. Attempt to toggle link state from main panel (sidebar)
   - Note: Toggle button should NOT be visible
2. Pop out panel and toggle successfully

**Expected Results:**
- [ ] Main panel: No toggle button visible
- [ ] Attempting to call togglePanelLink() from main panel logged as warning
- [ ] Console log: "[ÆtherLight] togglePanelLink called from non-popped-out panel (ignored)"

**Actual Results:**
```
[Record observations here]
```

**Status:** ⬜ Pass / ⬜ Fail

---

## Phase 5: User Experience Tests

### Test 5.1: Tooltip Accuracy
**Objective:** Verify tooltip text matches current state

**Steps:**
1. Pop out panel (linked, 🔗)
2. Hover over toggle button
3. Click toggle (unlink)
4. Hover over toggle button again

**Expected Results:**
- [ ] Linked state tooltip: "Linked to main panel (click to unlink)"
- [ ] Unlinked state tooltip: "Independent sprint selection (click to link)"
- [ ] Tooltip updates immediately after toggle

**Actual Results:**
```
[Record observations here]
```

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 5.2: Notification Messages
**Objective:** Verify notification messages are clear and accurate

**Steps:**
1. Toggle panel from linked → unlinked
2. Toggle panel from unlinked → linked
3. Change sprint while linked
4. Change sprint while unlinked

**Expected Results:**
- [ ] Unlink notification: "🔓 Panel unlinked - independent sprint selection enabled"
- [ ] Relink notification: "🔗 Panel linked - sprint selection will sync with main panel"
- [ ] Sprint change (linked): "✅ Switched to sprint: [filename]"
- [ ] Sprint change (unlinked): No sync notification for unlinked panels

**Actual Results:**
```
[Record observations here]
```

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 5.3: Visual Feedback Speed
**Objective:** Verify real-time feedback (Pattern-UX-001)

**Steps:**
1. Pop out panel
2. Click toggle button
3. Observe time between click and icon change

**Expected Results:**
- [ ] Icon change is immediate (<100ms perceived delay)
- [ ] No UI freeze or lag during toggle
- [ ] Notification appears within 200ms

**Actual Results:**
```
[Record observations here]
```

**Status:** ⬜ Pass / ⬜ Fail

---

## Phase 6: Regression Tests

### Test 6.1: Existing Functionality Not Broken
**Objective:** Verify existing sprint panel features still work

**Steps:**
1. Test sprint selection dropdown
2. Test task selection
3. Test "Start Next Task" button
4. Test sprint reload (🔄) button
5. Test hide completed tasks filter

**Expected Results:**
- [ ] All existing features work as before
- [ ] No new errors in console
- [ ] No performance degradation

**Actual Results:**
```
[Record observations here]
```

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 6.2: Backward Compatibility
**Objective:** Verify main panel behavior unchanged

**Steps:**
1. Use main panel without popping out
2. Switch between sprints
3. Select tasks
4. Verify no toggle button appears

**Expected Results:**
- [ ] Main panel works exactly as before
- [ ] No visual changes to main panel
- [ ] No toggle button in main panel
- [ ] Sprint switching works normally

**Actual Results:**
```
[Record observations here]
```

**Status:** ⬜ Pass / ⬜ Fail

---

## Test Summary

**Total Tests:** 18
**Passed:** ___
**Failed:** ___
**Blocked:** ___

**Overall Status:** ⬜ Pass / ⬜ Fail

---

## Issues Found

| Issue # | Test | Severity | Description | Status |
|---------|------|----------|-------------|--------|
| 1       |      |          |             |        |
| 2       |      |          |             |        |
| 3       |      |          |             |        |

---

## Notes & Observations

```
[Additional observations, performance notes, UX feedback, etc.]
```

---

## Tester Sign-Off

**Tester:** _____________________
**Date:** _____________________
**Approved:** ⬜ Yes / ⬜ No (with issues)

---

## Pattern References

- **Pattern-TDD-001:** Test-Driven Development Ratchet (RED → GREEN → REFACTOR)
- **Pattern-UX-001:** Real-time feedback for state changes (<100ms perceived delay)
- **Pattern-CODE-001:** Code Development Workflow (8-step pre-code workflow)

---

**Manual Test Plan Complete** ✅
