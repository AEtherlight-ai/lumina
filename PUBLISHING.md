# ÆtherLight Publishing Guide

**Owner:** Aelor (aelor on npm)
**Last Updated:** 2025-10-28
**Purpose:** How to publish ÆtherLight packages to npm registry

---

## 🔐 Access Control

**Only Aelor can publish** - requires npm authentication as `aelor`

**Public can see:**
- ✅ This publishing guide (transparent process)
- ✅ Version bump scripts
- ✅ GitHub Actions workflows
- ❌ NPM authentication tokens (not in repo)

---

## Quick Publish (Automated)

**RECOMMENDED:** Use the automated release script (prevents version mismatch bugs):

```bash
# One command does everything:
node scripts/publish-release.js patch   # or minor/major
```

**What it does:**
1. ✓ Verifies npm authentication and clean git state
2. ✓ Bumps version across all packages
3. ✓ Compiles TypeScript and verifies build
4. ✓ Packages VS Code extension (.vsix)
5. ✓ Verifies all artifacts BEFORE publishing
6. ✓ Publishes to npm registry
7. ✓ Creates git tag and pushes to GitHub
8. ✓ Creates GitHub release

**Benefits:**
- No timing issues - everything is verified before publishing
- Can't accidentally publish uncompiled code
- Automatic rollback if any step fails
- Consistent versioning across all artifacts

---

## Manual Publish (Not Recommended)

If you need to publish manually:

```bash
# 1. Bump version (updates all packages)
node scripts/bump-version.js patch

# 2. Compile TypeScript
cd vscode-lumina
npm run compile

# 3. Package extension
npm run package

# 4. Verify .vsix exists
ls aetherlight-*.vsix

# 5. Publish to npm
npm publish --access public

# 6. Commit and tag
cd ..
git add .
git commit -m "chore: release vX.X.X"
git tag vX.X.X
git push origin master --tags
```

**Warning:** Manual publishing can lead to version mismatches if steps are done out of order.

---

## Package Structure

| Package | Path | Published Name | Purpose |
|---------|------|----------------|---------|
| Main Extension | `vscode-lumina/` | `aetherlight` | VS Code extension + CLI |
| SDK | `packages/aetherlight-sdk/` | `aetherlight-sdk` | App integration SDK |
| Analyzer | `packages/aetherlight-analyzer/` | `aetherlight-analyzer` | Code analyzer CLI |
| Node Bindings | `packages/aetherlight-node/` | `aetherlight-node` | Native Rust bindings |

**Note:** All packages use **unscoped names** (not `@aetherlight/...`)

---

## Version Bump Script

**Location:** `scripts/bump-version.js`

**Usage:**
```bash
node scripts/bump-version.js patch  # 0.13.18 -> 0.13.19
node scripts/bump-version.js minor  # 0.13.18 -> 0.14.0
node scripts/bump-version.js major  # 0.13.18 -> 1.0.0
```

**What it does:**
- Updates version in ALL package.json files
- Updates internal dependencies to match
- Keeps versions synchronized across ecosystem

---

## Publishing Individual Packages

Publish in dependency order:

### 1. SDK (no dependencies)
```bash
cd packages/aetherlight-sdk
npm run build
npm publish --access public
```

### 2. Analyzer (no dependencies)
```bash
cd packages/aetherlight-analyzer
npm run build
npm publish --access public
```

### 3. Node Bindings (native)
```bash
cd packages/aetherlight-node
npm run build  # Builds for current platform
npm publish --access public
```

### 4. Main Extension (depends on above)
```bash
cd vscode-lumina
npm run compile
npm publish --access public
```

---

## Verification

After publishing:

```bash
# Check version on npm
npm view aetherlight version

# Check all packages
npm view aetherlight-sdk version
npm view aetherlight-analyzer version
npm view aetherlight-node version
```

---

## Auto-Update System

Users are notified of updates via:

1. **VS Code Marketplace** (when published there)
   - Auto-updates every 12 hours
   - Handled by VS Code automatically

2. **npm Update Checker** (built into extension)
   - Checks every 1 hour (configurable)
   - Shows notification with update button
   - Implementation: `vscode-lumina/src/services/updateChecker.ts`

---

## GitHub Actions

**Workflow:** `.github/workflows/publish.yml`

**Triggers:** Git tags matching `v*.*.*`

**What it does:**
- Builds native bindings for all platforms
- Publishes all packages to npm
- Creates GitHub Release

**Current Status:** Requires secrets to be configured:
- `NPM_TOKEN` - npm automation token (not configured)
- `VSCE_PAT` - VS Code Marketplace token (not configured)

**Fallback:** Manual publishing (current method)

---

## Authentication

**Required:** npm login as `aelor`

**Check status:**
```bash
npm whoami  # Should return: aelor
```

**Login if needed:**
```bash
npm login
# Username: aelor
# Password: [from password manager]
# Email: bb@adhubaudience.com
```

---

## Common Issues

### "You must be logged in"
→ Run: `npm login`

### "Version already exists"
→ Bump version first: `node scripts/bump-version.js patch`

### "Package access denied"
→ Add `--access public` flag

### Compile errors
→ Run `npm install` first, then `npm run compile`

---

## Release Checklist

- [ ] Test changes locally
- [ ] Run `node scripts/bump-version.js [patch|minor|major]`
- [ ] Review version changes: `git diff`
- [ ] Compile: `cd vscode-lumina && npm run compile`
- [ ] Publish: `npm publish --access public`
- [ ] Verify: `npm view aetherlight version`
- [ ] Commit: `git add . && git commit -m "chore: bump version"`
- [ ] Tag: `git tag vX.X.X`
- [ ] Push: `git push origin master --tags`
- [ ] Announce in Discord (optional)

---

## For Contributors

**Can contributors publish?** No - requires npm authentication as `aelor`

**What can contributors do?**
- Submit pull requests with changes
- Test locally with `npm link`
- Review publishing workflow (this doc is public)
- Suggest improvements to automation

**Maintainer will:**
- Review and merge PRs
- Bump version appropriately
- Publish to npm registry
- Create GitHub release

---

## Related Documentation

- [VERSION_MANAGEMENT.md](./VERSION_MANAGEMENT.md) - Version sync and auto-updates
- [NPM_PUBLISHING_GUIDE.md](./NPM_PUBLISHING_GUIDE.md) - Initial setup guide
- [PUBLISHING_STATUS.md](./PUBLISHING_STATUS.md) - Current status
- [scripts/bump-version.js](./scripts/bump-version.js) - Version bump script
- [.github/workflows/publish.yml](./.github/workflows/publish.yml) - CI/CD workflow
