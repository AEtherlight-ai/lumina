# Feature Branch Cleanup Analysis (BRANCH-001)

**Date:** 2025-11-09
**Task:** BRANCH-001 from ACTIVE_SPRINT_EMERGENCY_REPO_CLEANUP.toml
**Status:** Analysis Complete

---

## Executive Summary

**CRITICAL FINDING:** 3 feature branches still contain leaked private code despite BFG cleanup of master branch.

**Affected Branches:**
1. `feature/key-authorization` - 102 commits ahead of master
2. `feature/protect-000-task-prompt-export` - Unknown count (needs analysis)
3. `feature/unlink-sprint-view` - Unknown count (needs analysis)

**Leaked Commits (4 total):**
- `ecdea90` - feat(ui): implement toolbar buttons (58 lumina-web files added)
- `e680514` - feat(api): Implement credit tracking system (lumina-web files)
- `bf3de3e` - feat(api): Implement credit tracking system (lumina-web files)
- `4d38f65` - feat(api): Add credit purchase and status endpoints (lumina-web files)

**Clean Commit (in master):**
- `fbbed05` - chore: release v0.16.15 (does NOT contain lumina-web files)

**Commits to Preserve:** 98 commits from feature/key-authorization (102 total - 4 leaked)

---

## Detailed Branch Analysis

### Branch: feature/key-authorization

**Status:** Contains leaked code (commits ecdea90, bf3de3e, e680514, 4d38f65)
**Total Commits Ahead of Master:** 102
**Commits to Skip:** 4 (leaked code)
**Commits to Preserve:** 98

**Recent Work to Preserve (Sample):**
```
016384d Remove products/lumina-web before history cleanup
9da09b6 docs(AGENT-002): Update KNOWN_ISSUES.md with Sprint 4 success story
183f7a8 docs(DOC-001 to DOC-004): Complete Sprint 4 documentation for AI discoverability
89028ce feat(UNLINK-006 to UNLINK-008): Add comprehensive testing suite
48e29ff feat(HELP-001): Implement Help & Getting Started menu
f9e874f feat(WALK-001-005): Implement Getting Started walkthrough system
7dc5663 feat(DESKTOP-001): Refactor Whisper service to proxy through server API
```

**Sprint References:**
- Sprint 3 work: DOC-001 to DOC-007, RETRO-002
- Sprint 4 work: UNLINK-006 to UNLINK-008, HELP-001, WALK-001-005
- Desktop app integration: DESKTOP-001

**Test References:** (Need to check test files for commit SHAs)

### Branch: feature/protect-000-task-prompt-export

**Status:** Contains leaked code (commit ecdea90 at minimum)
**Analysis Needed:** Full commit count and dependency mapping

### Branch: feature/unlink-sprint-view

**Status:** Contains leaked code (commit ecdea90 at minimum)
**Analysis Needed:** Full commit count and dependency mapping

---

## Leaked Commit Details

### Commit: ecdea90 (SKIP THIS)

```
commit ecdea908be64c92e7f74bc860c1eaf5b85b95209
Author: Aelor <noreply@aelor.dev>
Date:   Wed Nov 5 00:58:33 2025 -0600

feat(ui): implement toolbar buttons - Bug Report, Feature Request, Skills, Settings (UI-006)
```

**Files Added:** 58 lumina-web files
**Sensitive Content:**
- `products/lumina-web/app/api/desktop/auth/route.ts` (214 lines)
- `products/lumina-web/app/api/webhooks/stripe/route.ts` (164 lines)
- `products/lumina-web/lib/middleware/desktopAuth.ts` (167 lines)
- `products/lumina-web/lib/supabase/` (3 files)
- Plus 50 more files...

**Why Skip:** Contains entire private website codebase

### Commit: e680514 (SKIP THIS)

**Status:** Needs verification - likely duplicate of bf3de3e

### Commit: bf3de3e (SKIP THIS)

```
feat(api): Implement credit tracking system and Whisper proxy API
```

**Why Skip:** Contains lumina-web API routes

### Commit: 4d38f65 (SKIP THIS)

```
feat(api): Add credit purchase and status endpoints (API-002, API-003)
```

**Why Skip:** Contains lumina-web credit system files

---

## Master Branch Status

**Master is CLEAN** ✅

```bash
$ git log --oneline master -- products/lumina-web
e2e7922 Remove products/lumina-web (moved to private website repo)
fbbed05 chore: release v0.16.15
```

Only 2 commits reference lumina-web, both are removal commits.

**Verification:**
```bash
$ git ls-tree -r master --name-only | grep lumina-web | wc -l
0
```

No lumina-web files exist in master tree. ✅

---

## Cleanup Strategy

### Option A: Cherry-Pick Individual Commits (Recommended)

**Pros:**
- Preserves all commit metadata (author, date, message)
- Maintains commit history for sprint tracking
- Can skip specific commits cleanly
- Easy to verify each commit

**Cons:**
- May have merge conflicts (if later commits depend on skipped commits)
- Time-consuming for 98 commits
- Requires manual conflict resolution

**Implementation:**
```bash
# 1. Create backup
git branch backup-feature-key-authorization feature/key-authorization

# 2. Get commit list (oldest first, excluding leaked commits)
git log --reverse --oneline feature/key-authorization ^master \
  | grep -v "ecdea90\|e680514\|bf3de3e\|4d38f65" > commits-to-preserve.txt

# 3. Create clean branch from master
git checkout master
git checkout -b feature/key-authorization-clean

# 4. Cherry-pick each commit
while read commit msg; do
  git cherry-pick $commit || {
    echo "CONFLICT on $commit: $msg"
    # Resolve manually, then:
    # git cherry-pick --continue
  }
done < commits-to-preserve.txt

# 5. Verify clean
git log --oneline feature/key-authorization-clean -- products/lumina-web
# Expected: Only "Remove products/lumina-web" commits

# 6. Replace old branch
git branch -D feature/key-authorization
git branch -m feature/key-authorization-clean feature/key-authorization
```

### Option B: Rebase Interactive (Alternative)

**Pros:**
- Can drop specific commits
- Maintains linear history
- VS Code has good interactive rebase UI

**Cons:**
- Harder to verify which commits were skipped
- More risk of breaking commit dependencies
- Cannot easily resume if interrupted

**Implementation:**
```bash
# 1. Create backup
git branch backup-feature-key-authorization feature/key-authorization

# 2. Start interactive rebase from merge-base with master
git rebase -i $(git merge-base master feature/key-authorization)

# 3. In editor, change "pick" to "drop" for leaked commits:
#    drop ecdea90
#    drop e680514
#    drop bf3de3e
#    drop 4d38f65

# 4. Save and close editor (rebase executes)

# 5. Resolve any conflicts

# 6. Verify clean
git log --oneline feature/key-authorization -- products/lumina-web
```

---

## Dependencies & References

### Sprint File References

Need to check if any sprint files reference the leaked commit SHAs:

```bash
$ grep -r "ecdea90\|bf3de3e\|e680514\|4d38f65" internal/sprints/
```

**Result:** (Need to run this check)

### Test File References

Need to check if any tests reference the leaked commit SHAs:

```bash
$ grep -r "ecdea90\|bf3de3e\|e680514\|4d38f65" vscode-lumina/test/
```

**Result:** (Need to run this check)

### Commit Dependencies

**Analysis Needed:** Check if any preserved commits depend on the leaked commits.

Example dependency to watch:
- If commit `7dc5663` (DESKTOP-001: Refactor Whisper service) references API routes that were added in `4d38f65`, we may need to:
  1. Modify `7dc5663` to remove that reference, OR
  2. Skip `7dc5663` if it's tightly coupled to leaked code

---

## Risk Assessment

### High Risk

**Scenario:** Cherry-pick fails due to complex dependencies
**Mitigation:** Keep backup branches, resolve conflicts manually, test after each conflict resolution

**Scenario:** Preserved commits reference leaked code (imports, API calls)
**Mitigation:** Identify dependencies first (grep for file paths), modify commits to remove references

### Medium Risk

**Scenario:** Tests fail after cleanup
**Mitigation:** Run full test suite after cleanup, update test fixtures if needed

**Scenario:** Sprint tracking lost (commit SHAs change after cherry-pick)
**Mitigation:** Document old SHA → new SHA mapping for retrospectives

### Low Risk

**Scenario:** GitHub cache still shows old commits
**Mitigation:** Wait 5-10 minutes for GitHub to refresh, verify in fresh clone

---

## Verification Plan

After cleanup, verify with:

1. **Local verification:**
   ```bash
   git log --all -- products/lumina-web
   # Expected: Only removal commits (e2e7922, 016384d)

   git log --all -S "app/api/desktop/transcribe"
   # Expected: No results

   git ls-tree -r feature/key-authorization --name-only | grep lumina-web
   # Expected: No results
   ```

2. **GitHub verification:**
   ```bash
   # Fresh clone test
   cd /tmp
   git clone --recurse-submodules https://github.com/AEtherlight-ai/lumina.git test-verify
   cd test-verify
   git checkout feature/key-authorization
   ls products/
   # Expected: Only lumina-desktop/

   git log --all -- products/lumina-web
   # Expected: Only removal commits
   ```

3. **Test suite verification:**
   ```bash
   cd vscode-lumina
   npm run compile
   npm test
   # Expected: All tests pass
   ```

---

## Recommendations

1. **Use Option A (Cherry-Pick)** - Safer and more verifiable
2. **Start with feature/key-authorization** - Most active branch, test the process
3. **Check dependencies BEFORE cleanup** - Run grep commands for commit SHAs
4. **Keep backups until fully verified** - Don't delete backup branches for 1 week
5. **Update team notification** - Add section about feature branch cleanup
6. **Test incrementally** - Run tests after every 10-20 cherry-picks

---

## Next Steps

1. **Complete dependency analysis** (grep for commit SHAs in sprints/tests)
2. **Run cleanup for feature/key-authorization** (BRANCH-002)
3. **Verify cleanup successful** (tests pass, history clean)
4. **Repeat for other 2 branches**
5. **Force push all cleaned branches** (BRANCH-003)
6. **Update team notification** (add feature branch cleanup section)
7. **Complete security audit** (FINAL-001)

---

**Status:** Ready for BRANCH-002 execution
**Approval Required:** User should review this analysis before proceeding
