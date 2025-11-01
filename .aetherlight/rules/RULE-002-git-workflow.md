# RULE-002: Git Workflow Enforcement

**Status:** ENFORCED
**Created:** 2025-10-31
**Severity:** HIGH

## Rule Statement

ALL code changes MUST follow proper Git workflow. NO direct commits to master.

## Required Workflow

```bash
# 1. Create feature branch
git checkout -b feature/[version]-[description]
# or for bugs:
git checkout -b bugfix/[BUG-ID]-[short-description]

# 2. Make changes
# ... edit files ...

# 3. Test BEFORE committing
npm run compile
# Launch Extension Host (F5)
# Test ALL affected features

# 4. Commit with conventional commits
git add -A
git commit -m "fix: [BUG-ID] description"

# 5. Push and create PR
git push -u origin feature/branch-name
gh pr create

# 6. Only merge after review/tests
```

## Forbidden Actions

❌ `git commit` on master branch
❌ Publishing without feature branch
❌ Skipping test phase
❌ Direct push to master (except for releases)

## Emergency Hotfix Exception

ONLY for catastrophic production bugs:
1. Create `hotfix/` branch
2. Fix and test minimally
3. Merge directly with clear documentation

## Enforcement

The publish skill will check:
- Current branch is NOT master (except for release tags)
- All tests pass before merge
- PR exists for non-hotfix changes