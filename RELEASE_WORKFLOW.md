# ÆtherLight Release Workflow

## Overview
We follow a structured Git workflow to ensure code quality, traceability, and rollback capability.

## Release Process

### 1. Development Phase
```bash
# Create a feature/fix branch from master
git checkout master
git pull origin master
git checkout -b feature/voice-improvements  # or fix/button-bug

# Make your changes
# ... edit files ...

# Commit changes
git add .
git commit -m "feat: Add voice improvements"

# Push branch
git push origin feature/voice-improvements
```

### 2. Pull Request Phase
```bash
# Create PR on GitHub
gh pr create --title "feat: Voice improvements" --body "Description..."

# Or use GitHub web interface:
# 1. Go to https://github.com/AEtherlight-ai/lumina
# 2. Click "Pull requests" → "New pull request"
# 3. Select your branch
# 4. Add description and create PR
```

### 3. Review & Merge
- Get code reviewed
- Run tests
- Merge PR to master (use "Squash and merge" for clean history)

### 4. Release Phase
```bash
# After PR is merged, switch to master
git checkout master
git pull origin master

# Ensure you're up to date
git status

# Run the publish script FROM MASTER
node scripts/publish-release.js patch  # or minor/major
```

## Publish Script Flow (Correct Order)

1. **Verify Prerequisites**
   - npm authentication
   - Git workflow (on master, clean, up-to-date)

2. **Build & Prepare**
   - Bump version
   - Compile TypeScript
   - Package VSIX

3. **GitHub First** ✅
   - Commit version bump
   - Create git tag
   - Push to GitHub
   - Create GitHub release with VSIX

4. **npm Last** ✅
   - Publish sub-packages (analyzer, sdk, node)
   - Publish main package
   - Verify all packages

## Why This Order?

### GitHub Before npm
- **Source available first**: npm packages always have corresponding source
- **Rollback capability**: Can revert GitHub if npm fails
- **Retry-able**: npm publish can be retried if it fails
- **Traceability**: Every npm version has a git tag

### Bad Order (What NOT to do)
❌ npm → GitHub: Package live without source
❌ Direct master commits: No review, no rollback
❌ Feature branch releases: Inconsistent state

## Branch Strategy

```
master (main)
  ├── feature/voice-panel     → PR → merge → release
  ├── fix/update-checker      → PR → merge → release
  └── release/v0.13.31        → PR → merge → release
```

## Rollback Process

If something goes wrong after release:

```bash
# 1. Revert the merge commit on master
git checkout master
git revert -m 1 <merge-commit-hash>
git push origin master

# 2. Create a new patch release
node scripts/publish-release.js patch

# 3. npm packages will update to reverted version
```

## Common Issues

### Issue: Published from wrong branch
**Fix**: Always release from master after PR merge

### Issue: npm published but GitHub failed
**Fix**: Our new order prevents this (GitHub first)

### Issue: Version mismatch
**Fix**: Script handles all version syncing automatically

## Pre-Release Checklist

- [ ] All changes committed to feature branch
- [ ] PR created and reviewed
- [ ] PR merged to master
- [ ] Switched to master: `git checkout master`
- [ ] Pulled latest: `git pull origin master`
- [ ] Working directory clean: `git status`
- [ ] Ready to publish: `node scripts/publish-release.js [type]`

## Emergency Hotfix Process

For critical production bugs:

```bash
# 1. Create hotfix branch from master
git checkout master
git pull origin master
git checkout -b hotfix/critical-bug

# 2. Make minimal fix
# ... fix the bug ...

# 3. Fast-track PR
gh pr create --title "hotfix: Critical bug" --label "hotfix"

# 4. Get emergency approval and merge

# 5. Release immediately
git checkout master
git pull origin master
node scripts/publish-release.js patch
```

## Version Types

- **patch** (0.13.30 → 0.13.31): Bug fixes, small improvements
- **minor** (0.13.30 → 0.14.0): New features, backwards compatible
- **major** (0.13.30 → 1.0.0): Breaking changes

## Questions?

- Review `scripts/publish-release.js` for implementation details
- Check `PUBLISHING.md` for technical details
- See `.github/workflows/` for CI/CD automation (if configured)