# Sprint v0.17.2 Manual Test: Enhanced Prompt v1.3

**Sprint**: v0.17.2 Bug Fixes + MVP-003 Prompt Enhancer
**Feature**: Enhanced Prompt Template v1.3 (Breadcrumb-Based Architecture)
**Commit**: e844d9c
**Date**: 2025-01-12
**Status**: ✅ Committed - Ready for validation testing

---

## Release Checklist

### Pre-Release Validation

✅ **Patterns Created/Updated**:
- [ ] Pattern-VALIDATION-001.md exists (`docs/patterns/Pattern-VALIDATION-001.md`)
- [ ] Pattern-TRACKING-001.md updated with Sprint TOML lifecycle section
- [ ] Both patterns validate with pattern validation hook

✅ **Skill Created**:
- [ ] sprint-task-lifecycle skill documented (`.claude/skills/sprint-task-lifecycle/skill.md`)
- [ ] Skill has start/complete/defer commands
- [ ] Fallback to manual process documented

✅ **Template Created**:
- [ ] Template v1.3 exists (`internal/sprints/enhanced_prompts/MVP-003-PromptEnhancer-TaskTemplate-v1.3.md`)
- [ ] Template uses breadcrumb-based architecture
- [ ] Token count: ~1,800-2,000 tokens (65% reduction from v1.0)

✅ **Agent Files Updated**:
- [ ] All 11 agent files have Sprint Task Lifecycle Protocol section
- [ ] VERSION fields incremented (v1.1+ or v2.3+)
- [ ] Consistent formatting across all files
- [ ] Validation: `cd internal/agents && grep -l "Sprint Task Lifecycle Protocol" *.md | wc -l` = 11

✅ **Documentation Created**:
- [ ] ENHANCED_PROMPT_V1.3_IMPLEMENTATION_SUMMARY.md exists
- [ ] AGENT_ENHANCEMENT_RELEASES.md exists (release process)
- [ ] AGENT_UPDATE_REMAINING_5_FILES.md exists (agent update guide)
- [ ] READY_TO_COMMIT_ENHANCED_PROMPT_V1.3.md exists (commit summary)

---

## Test Plan

### Test 1: Pattern Validation

**Objective**: Verify Pattern-VALIDATION-001 and Pattern-TRACKING-001 are valid

**Steps**:
1. Check Pattern-VALIDATION-001 exists:
   ```bash
   ls -l docs/patterns/Pattern-VALIDATION-001.md
   ```
   **Expected**: File exists, ~218 lines

2. Check Pattern-TRACKING-001 updated:
   ```bash
   grep -n "Sprint TOML Lifecycle Management" docs/patterns/Pattern-TRACKING-001.md
   ```
   **Expected**: Section found at line ~389

3. Validate pattern structure:
   ```bash
   grep "^##" docs/patterns/Pattern-VALIDATION-001.md
   ```
   **Expected**: Standard pattern sections (Problem, Solution, Implementation, Benefits, etc.)

**Pass Criteria**: ✅ Both patterns exist and follow pattern format

---

### Test 2: Skill Documentation

**Objective**: Verify sprint-task-lifecycle skill is documented

**Steps**:
1. Check skill file exists:
   ```bash
   ls -l .claude/skills/sprint-task-lifecycle/skill.md
   ```
   **Expected**: File exists, ~305 lines

2. Verify commands documented:
   ```bash
   grep "/sprint-task-lifecycle" .claude/skills/sprint-task-lifecycle/skill.md
   ```
   **Expected**: start, complete, defer commands found

3. Check fallback process:
   ```bash
   grep "Manual (if skill unavailable)" .claude/skills/sprint-task-lifecycle/skill.md
   ```
   **Expected**: Manual process documented for all 3 commands

**Pass Criteria**: ✅ Skill documented with commands + fallback

---

### Test 3: Template v1.3 Creation

**Objective**: Verify Template v1.3 exists and uses breadcrumb architecture

**Steps**:
1. Check template file exists:
   ```bash
   ls -l internal/sprints/enhanced_prompts/MVP-003-PromptEnhancer-TaskTemplate-v1.3.md
   ```
   **Expected**: File exists, ~582 lines

2. Verify breadcrumb architecture:
   ```bash
   grep "Pattern-TRACKING-001" internal/sprints/enhanced_prompts/MVP-003-PromptEnhancer-TaskTemplate-v1.3.md | head -5
   ```
   **Expected**: Multiple pattern references (breadcrumbs, not inline protocols)

3. Check token efficiency claim:
   ```bash
   grep "Token Efficiency" internal/sprints/enhanced_prompts/MVP-003-PromptEnhancer-TaskTemplate-v1.3.md
   ```
   **Expected**: "~1,800-2,000 tokens" and "65% reduction" mentioned

4. Verify sections removed (should NOT find inline protocols):
   ```bash
   grep -i "inline sprint toml lifecycle" internal/sprints/enhanced_prompts/MVP-003-PromptEnhancer-TaskTemplate-v1.3.md
   ```
   **Expected**: NOT FOUND (protocols in patterns, not template)

**Pass Criteria**: ✅ Template exists, uses breadcrumbs, claims 65% token reduction

---

### Test 4: Agent Files Updated

**Objective**: Verify all 11 agent files have Sprint Task Lifecycle Protocol

**Steps**:
1. Count agent files with protocol:
   ```bash
   cd internal/agents && grep -l "Sprint Task Lifecycle Protocol" *.md | wc -l
   ```
   **Expected**: 11 (all agent files)

2. Verify protocol structure in one agent:
   ```bash
   grep -A 5 "Before Starting ANY Task" internal/agents/infrastructure-agent-context.md
   ```
   **Expected**: Section exists with automated + manual options

3. Check VERSION updates:
   ```bash
   cd internal/agents && grep "^**VERSION:**" *.md
   ```
   **Expected**: All show v1.1+ or v2.3+ (incremented from previous)

4. Validate pattern references:
   ```bash
   cd internal/agents && grep "Pattern-TRACKING-001" *.md | wc -l
   ```
   **Expected**: 23 (11 files × 2 references + README)

**Pass Criteria**: ✅ All 11 agent files updated with consistent protocol

---

### Test 5: Documentation Completeness

**Objective**: Verify all 4 documentation files exist and are complete

**Steps**:
1. Check implementation summary:
   ```bash
   ls -l docs/ENHANCED_PROMPT_V1.3_IMPLEMENTATION_SUMMARY.md
   wc -l docs/ENHANCED_PROMPT_V1.3_IMPLEMENTATION_SUMMARY.md
   ```
   **Expected**: File exists, ~620 lines

2. Check agent enhancement process:
   ```bash
   ls -l docs/AGENT_ENHANCEMENT_RELEASES.md
   grep "Agent Enhancement Process" docs/AGENT_ENHANCEMENT_RELEASES.md
   ```
   **Expected**: File exists, process documented

3. Check agent update guide:
   ```bash
   ls -l docs/AGENT_UPDATE_REMAINING_5_FILES.md
   ```
   **Expected**: File exists, shows what to add to agent files

4. Check commit summary:
   ```bash
   ls -l docs/READY_TO_COMMIT_ENHANCED_PROMPT_V1.3.md
   ```
   **Expected**: File exists, has commit command

**Pass Criteria**: ✅ All 4 docs exist and complete

---

### Test 6: Commit Validation

**Objective**: Verify commit e844d9c contains all expected changes

**Steps**:
1. Check commit exists:
   ```bash
   git show e844d9c --stat
   ```
   **Expected**: 7 files changed, ~2,726 insertions

2. Verify files in commit:
   ```bash
   git show e844d9c --name-only
   ```
   **Expected Files**:
   - .claude/skills/sprint-task-lifecycle/skill.md (new)
   - docs/AGENT_ENHANCEMENT_RELEASES.md (new)
   - docs/AGENT_UPDATE_REMAINING_5_FILES.md (new)
   - docs/ENHANCED_PROMPT_V1.3_IMPLEMENTATION_SUMMARY.md (new)
   - docs/READY_TO_COMMIT_ENHANCED_PROMPT_V1.3.md (new)
   - docs/patterns/Pattern-TRACKING-001.md (modified)
   - docs/patterns/Pattern-VALIDATION-001.md (new)

3. Verify commit message:
   ```bash
   git log -1 --format=%B e844d9c | head -5
   ```
   **Expected**: "feat(prompts): Implement Enhanced Prompt Template v1.3"

**Pass Criteria**: ✅ Commit e844d9c contains all expected files

---

### Test 7: Integration Test (End-to-End)

**Objective**: Simulate using Template v1.3 to generate an enhanced prompt

**Steps**:
1. Read Template v1.3:
   ```bash
   head -50 internal/sprints/enhanced_prompts/MVP-003-PromptEnhancer-TaskTemplate-v1.3.md
   ```
   **Expected**: Template header with v1.3, breadcrumb architecture

2. Follow template to create mock enhanced prompt:
   - Use template structure
   - Replace `{TASK_ID}` with "TEST-001"
   - Replace `{FILE_PATH}` with mock file path
   - Add breadcrumbs to Pattern-TRACKING-001
   - Add breadcrumb to sprint-task-lifecycle skill

3. Count tokens in mock prompt:
   ```bash
   # Estimate: ~5 tokens per word, or use actual tokenizer
   wc -w /tmp/mock_enhanced_prompt.md
   # Divide by 5 to get rough token count
   ```
   **Expected**: ~300-400 words = ~1,500-2,000 tokens (65% reduction target met)

4. Verify no inline protocols (only breadcrumbs):
   ```bash
   grep -i "Option 1 - Automated (Preferred)" /tmp/mock_enhanced_prompt.md
   ```
   **Expected**: NOT FOUND (this is in Pattern-TRACKING-001, not inline)

**Pass Criteria**: ✅ Mock prompt uses breadcrumbs, ~1,800-2,000 tokens

---

### Test 8: Agent Protocol Consistency

**Objective**: Verify all agents follow same Sprint Task Lifecycle Protocol

**Steps**:
1. Extract protocol from first agent:
   ```bash
   sed -n '/## Sprint Task Lifecycle Protocol/,/^## /p' internal/agents/infrastructure-agent-context.md > /tmp/agent1_protocol.txt
   ```

2. Extract protocol from second agent:
   ```bash
   sed -n '/## Sprint Task Lifecycle Protocol/,/^## /p' internal/agents/api-agent-context.md > /tmp/agent2_protocol.txt
   ```

3. Compare protocols:
   ```bash
   diff /tmp/agent1_protocol.txt /tmp/agent2_protocol.txt
   ```
   **Expected**: NO DIFFERENCES (exact same protocol text)

4. Repeat for random sampling of 3 more agents

**Pass Criteria**: ✅ All agents have identical Sprint Task Lifecycle Protocol section

---

## Success Criteria

**Overall Pass Criteria**:
- ✅ All 8 tests pass
- ✅ Commit e844d9c verified
- ✅ 11/11 agent files updated
- ✅ 2 patterns created/updated
- ✅ 1 skill documented
- ✅ 1 template created (v1.3)
- ✅ 4 documentation files created
- ✅ Token efficiency: 65% reduction (4,000 → 1,800 tokens)

**Release Blocker Criteria** (any ONE failure blocks release):
- ❌ Pattern-VALIDATION-001 missing or invalid structure
- ❌ Pattern-TRACKING-001 missing Sprint TOML lifecycle section
- ❌ Template v1.3 missing or doesn't use breadcrumb architecture
- ❌ <9 agent files updated (need 11/11 for consistency)
- ❌ Agent protocols inconsistent (different text across agents)
- ❌ Commit e844d9c missing expected files

---

## Post-Release Validation

After releasing v0.17.2, validate:

1. **Pattern Usage**:
   - Agents reference Pattern-TRACKING-001 correctly
   - Pattern-VALIDATION-001 enforced in pre-flight checks
   - No agent confusion about Sprint TOML lifecycle

2. **Token Efficiency**:
   - Generate 5 real enhanced prompts using Template v1.3
   - Count tokens in each (should be ~1,800-2,000)
   - Compare to v1.2 prompts (~2,800 tokens)
   - Validate 35% reduction from v1.2, 65% from v1.0

3. **Sprint TOML Updates**:
   - Track whether agents update Sprint TOML status correctly
   - Monitor Sprint Panel UI for real-time sync
   - Verify completed_date added when tasks finish

4. **User Feedback**:
   - Survey: "Enhanced prompts provide sufficient guidance (breadcrumbs work)"
   - Survey: "Sprint Panel UI stays in sync with actual work"
   - Survey: "Pattern references are clear and findable"

---

## Rollback Plan

If critical issues found post-release:

**Rollback Commit** (revert to before e844d9c):
```bash
git revert e844d9c
git commit -m "revert: Rollback Enhanced Prompt v1.3 (critical issue: {DESCRIPTION})"
```

**Partial Rollback** (keep patterns, revert template):
```bash
# Keep Pattern-VALIDATION-001 and Pattern-TRACKING-001
# Revert Template v1.3 → use v1.2
git checkout e844d9c~1 -- internal/sprints/enhanced_prompts/MVP-003-PromptEnhancer-TaskTemplate-v1.2.md
git commit -m "fix: Revert to Template v1.2 (v1.3 issue: {DESCRIPTION})"
```

**Agent Rollback** (revert agent updates):
```bash
# Remove Sprint Task Lifecycle Protocol from agents
# Restore previous agent versions
git checkout e844d9c~1 -- internal/agents/*.md
git commit -m "fix: Revert agent Sprint Task Lifecycle Protocol (issue: {DESCRIPTION})"
```

---

## Related Commits

**Sprint v0.17.2 Branch**: `feature/v0.17.2-bug-fixes`

**Previous Commits**:
- 6cbe56a - docs(testing): Add comprehensive v0.17.2 testing document
- 3f05ea9 - feat(sprint): Add enhanced prompt system to Sprint Panel UI (MVP-003)
- 67f2d6a - fix(TaskAnalyzer): Add safety check for missing config.agents (BUG-001)

**This Commit**:
- **e844d9c** - feat(prompts): Implement Enhanced Prompt Template v1.3 (breadcrumb-based architecture)

**Expected Next Commits**:
- Implement sprint-task-lifecycle skill (TypeScript/JavaScript code)
- Generate BUG-002A enhanced prompt using Template v1.3 (validation)
- Complete MVP-003 PromptEnhancer implementation

---

## Commit Details

**Commit**: e844d9c
**Author**: Claude Code
**Date**: 2025-01-12
**Branch**: feature/v0.17.2-bug-fixes
**Files Changed**: 7 files, 2,726 insertions(+)

**Files Created**:
1. `.claude/skills/sprint-task-lifecycle/skill.md` (305 lines)
2. `docs/AGENT_ENHANCEMENT_RELEASES.md` (370 lines)
3. `docs/AGENT_UPDATE_REMAINING_5_FILES.md` (180 lines)
4. `docs/ENHANCED_PROMPT_V1.3_IMPLEMENTATION_SUMMARY.md` (620 lines)
5. `docs/READY_TO_COMMIT_ENHANCED_PROMPT_V1.3.md` (300 lines)
6. `docs/patterns/Pattern-VALIDATION-001.md` (218 lines)

**Files Modified**:
1. `docs/patterns/Pattern-TRACKING-001.md` (+357 lines)

**Files Updated (Not Tracked - internal/ directory)**:
1. `internal/sprints/enhanced_prompts/MVP-003-PromptEnhancer-TaskTemplate-v1.3.md` (582 lines)
2-12. `internal/agents/*.md` (11 files, +77 lines each)

---

## Test Execution Log

**Tester**: ___________________
**Date**: ___________________
**Sprint**: v0.17.2

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Pattern Validation | ⬜ Pass / ⬜ Fail | |
| 2 | Skill Documentation | ⬜ Pass / ⬜ Fail | |
| 3 | Template v1.3 Creation | ⬜ Pass / ⬜ Fail | |
| 4 | Agent Files Updated | ⬜ Pass / ⬜ Fail | |
| 5 | Documentation Completeness | ⬜ Pass / ⬜ Fail | |
| 6 | Commit Validation | ⬜ Pass / ⬜ Fail | |
| 7 | Integration Test | ⬜ Pass / ⬜ Fail | |
| 8 | Agent Protocol Consistency | ⬜ Pass / ⬜ Fail | |

**Overall Result**: ⬜ PASS / ⬜ FAIL
**Release Decision**: ⬜ APPROVED / ⬜ BLOCKED / ⬜ DEFER

**Blocker Issues** (if any):
- ___________________________________________________________
- ___________________________________________________________

**Sign-off**: ___________________  Date: ___________________

---

**This manual test validates Enhanced Prompt Template v1.3 architecture is complete, functional, and ready for release in Sprint v0.17.2.**
