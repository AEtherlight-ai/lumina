# 🚨 URGENT: Repository History Rewritten - Re-Clone Required

**Date:** 2025-11-09
**Severity:** HIGH (Action Required)
**Affected:** All developers with local clones of `lumina` repository

---

## What Happened

The lumina repository history has been cleaned to remove accidentally leaked private code.

**Summary:**
- Private website code (`products/lumina-web/`) was committed to the PUBLIC repo (security violation)
- History purged using BFG Repo-Cleaner (322 commits cleaned)
- Force push completed to GitHub at 13:05 UTC
- Proper submodule architecture now in place

**Security Impact:**
- ✅ No API keys or secrets leaked (.env.local was gitignored)
- ✅ Pre-launch timing = zero production impact
- ✅ History successfully cleaned and verified

**See full incident report:** `docs/incidents/REPO_LEAK_2025-11-09.md`

---

## What You MUST Do NOW

### Step 1: Backup Your Local Work

```bash
cd lumina

# Option A: Stash uncommitted changes
git stash save "Pre-reclone backup $(date)"

# Option B: Commit to temporary branch
git checkout -b backup-before-reclone
git add .
git commit -m "Backup before re-clone"
```

### Step 2: Delete Your Local Clone

```bash
cd ..
rm -rf lumina/

# On Windows PowerShell:
# Remove-Item -Recurse -Force lumina\
```

### Step 3: Fresh Clone WITH SUBMODULES

**CRITICAL: You MUST use `--recurse-submodules` flag**

```bash
git clone --recurse-submodules https://github.com/AEtherlight-ai/lumina.git
cd lumina/
```

### Step 4: Verify Submodule Setup

```bash
# Check submodule status
git submodule status
# Expected output: 76fe41848715dd82bef12937874b4f2fc5ecdcca website (heads/main)

# Verify integration docs exist
ls website/.integration/
# Expected output: LUMINA_REPO_ONBOARDING.md, specs/, status/, tasks/

# Verify products/ directory structure
ls products/
# Expected output: lumina-desktop (only)
```

### Step 5: Restore Your Work

```bash
# If you used git stash:
git stash pop

# If you committed to backup branch:
git cherry-pick <commit-sha>
```

---

## What Changed in the Repository

### Directory Structure

**Before (WRONG):**
```
lumina/
├── products/
│   ├── lumina-desktop/  ✅ Public
│   └── lumina-web/      ❌ Private code in public repo!
```

**After (CORRECT):**
```
lumina/
├── products/
│   └── lumina-desktop/  ✅ Public
└── website/             ✅ Submodule → private repo
    └── .integration/    ✅ Integration docs only
```

### Key Changes

1. **Removed:** `products/lumina-web/` (now in private repo)
2. **Added:** `website/` submodule (integration docs from private repo)
3. **Updated:** `.gitignore` (prevents future accidents)
4. **Pattern:** `docs/patterns/Pattern-GIT-002.md` (submodule architecture guide)

---

## Why Re-Clone is Required

**Force push rewrites git history** - your local clone has broken references.

**Symptoms if you DON'T re-clone:**
- `git pull` fails with "divergent branches" error
- `git status` shows corrupted state
- Commits reference objects that no longer exist
- Submodule won't initialize properly

**Solution:** Fresh clone is the ONLY reliable fix.

---

## Timeline

| Time (UTC) | Event |
|------------|-------|
| 11:00 | Incident discovered |
| 12:00 | Emergency sprint created |
| 12:40 | BFG cleaned 322 commits |
| 13:05 | **Force push complete** |
| 13:30 | Submodule architecture implemented |
| 13:50 | Verification complete |
| 14:30 | Team notification issued |

---

## Troubleshooting

### Problem: Submodule Not Initialized

```bash
# Initialize submodules manually
git submodule update --init --recursive
```

### Problem: Authentication Failed for Submodule

The `website/` submodule is a **private repo** - ensure you have GitHub access:

```bash
# Check GitHub authentication
gh auth status

# If not authenticated:
gh auth login
```

### Problem: Lost Uncommitted Work

If you forgot to backup before deleting:

1. Check if directory still exists in Recycle Bin / Trash
2. Look for IDE autosave files
3. Check for `.git/stash` backups in backup tools

**Prevention:** Always `git stash` before major operations.

---

## Prevention for Future

**Pre-Flight Checklist Added to `.claude/CLAUDE.md`:**

Before adding ANY new directory, check:
1. ✅ Is this private/proprietary code? → Use submodule
2. ✅ Does this belong in the public repo? → Ask if unsure
3. ✅ Is there a .gitignore entry? → Add protection
4. ✅ Did I check Pattern-GIT-002? → Follow submodule guide

**See:** `docs/patterns/Pattern-GIT-002.md` for submodule architecture guide.

---

## Need Help?

**Documentation:**
- Full incident report: `docs/incidents/REPO_LEAK_2025-11-09.md`
- Pattern guide: `docs/patterns/Pattern-GIT-002.md`
- Sprint file: `internal/sprints/ACTIVE_SPRINT_EMERGENCY_REPO_CLEANUP.toml`

**Support:**
- Open GitHub issue with `[RE-CLONE]` prefix
- Ping in Discord #tech-support channel
- Contact incident commander: BB_Aelor

---

## Acknowledgment

**Once you have successfully re-cloned and verified, please confirm:**

- [ ] I have re-cloned the repository with `--recurse-submodules`
- [ ] Submodule status shows `website` initialized
- [ ] Integration docs exist at `website/.integration/`
- [ ] My local work has been restored
- [ ] I understand the new submodule architecture

**Thank you for your cooperation during this security fix.**

---

**Status:** 🚨 ACTION REQUIRED
**Deadline:** Re-clone BEFORE starting new work
**Impact:** 15+ hours of debugging prevented (historical lessons applied)
