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

**Note (v0.16.15):** Automation improvements in progress (Sprint Task POST-005):
- v0.16.15 required manual bypass due to missing @types/mocha and old import paths
- Task POST-005 adds pre-publish validation integration (7 automated checks)
- Goal: v0.16.16+ publishes with ZERO manual intervention
- See `.claude/CLAUDE.md` Known Issues section for details

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

### Sub-Package Publish Order

**CRITICAL:** Sub-packages MUST be published BEFORE the main package.

**Why:** The main package (`aetherlight`) depends on sub-packages at the same version. If sub-packages aren't published first, users will get dependency resolution errors when installing.

**Automated script order** (`scripts/publish-release.js`):
1. `aetherlight-analyzer` (no dependencies)
2. `aetherlight-sdk` (no dependencies)
3. `aetherlight-node` (no dependencies)
4. `aetherlight` (depends on analyzer, sdk, node) - **PUBLISHED LAST**

**Historical Bug:** v0.13.29 published main package without sub-packages → users couldn't install → 2-hour emergency fix

**Prevention:** The automated publish script (lines 437-455) publishes sub-packages first, then verifies them (lines 459-485), and only then publishes the main package. Manual publishing bypasses this safety check.

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

## Mac Desktop App Builds

**NEW in v0.18.5:** Automated Mac .dmg builds for desktop app voice capture

**Workflow:** `.github/workflows/build-mac-desktop.yml`

**Triggers:**
- Manual: `workflow_dispatch` with version input
- Automatic: Git tags matching `v*.*.*`

**What it builds:**
- `Lumina_0.18.5_x86_64.dmg` - Intel Mac binary
- `Lumina_0.18.5_aarch64.dmg` - Apple Silicon Mac binary

### Running the Mac Build Manually

**Via GitHub Actions UI:**
1. Go to repository → Actions tab
2. Select "Build Mac Desktop App" workflow
3. Click "Run workflow"
4. Enter version (e.g., `0.18.5`)
5. Click "Run workflow" button
6. Wait 10-15 minutes for builds to complete
7. Download artifacts from workflow run

**Via GitHub CLI:**
```bash
gh workflow run build-mac-desktop.yml -f version=0.18.5
```

### Build Process

The workflow:
1. **Spins up macOS runners:**
   - `macos-13` for Intel (x86_64)
   - `macos-14` for Apple Silicon (aarch64)

2. **Installs dependencies:**
   - Node.js 20
   - Rust toolchain
   - Tauri CLI (via npm)

3. **Builds desktop app:**
   - Compiles frontend (TypeScript + Vite)
   - Compiles backend (Rust + Tauri)
   - Creates .dmg installers

4. **Generates artifacts:**
   - Versioned .dmg files
   - SHA256 checksums

5. **Uploads to GitHub:**
   - Workflow artifacts (30-day retention)
   - GitHub Release (if triggered by tag)

### Testing Mac Builds

**After workflow completes:**
1. Download .dmg artifacts from workflow run
2. Test on Intel Mac (or Rosetta on Apple Silicon)
3. Test on Apple Silicon Mac (native)

**Installation test:**
```bash
# Mount .dmg
open Lumina_0.18.5_x86_64.dmg

# Drag Lumina.app to Applications
cp -R /Volumes/Lumina/Lumina.app /Applications/

# Remove quarantine flag (unsigned app)
xattr -d com.apple.quarantine /Applications/Lumina.app

# Launch app
open /Applications/Lumina.app
```

**Functional test:**
- App launches without crash ✅
- Microphone permission requested ✅
- Voice capture works ✅
- Whisper transcription works ✅
- VS Code extension detects desktop app via IPC ✅

### Versioning

Desktop app version managed separately:
- **Location:** `products/lumina-desktop/package.json`
- **Current:** `0.18.5`
- **Update manually** when bumping extension version

### Code Signing (Optional)

**Current Status:** Unsigned builds (v0.18.5)
- Users will see security warning
- Must right-click → "Open" or remove quarantine flag
- App works fully after override

**Future:** Add code signing for trusted distribution
- Requires Apple Developer Account
- Requires code signing certificate
- Workflow has placeholder secrets: `TAURI_PRIVATE_KEY`, `TAURI_KEY_PASSWORD`

### Troubleshooting

**Build fails with "xcrun: error: unable to find utility 'metal'"**
→ Xcode Command Line Tools missing on runner (should be pre-installed)

**Build succeeds but no .dmg files**
→ Check Tauri config: `products/lumina-desktop/src-tauri/tauri.conf.json` line 33 (`"targets": "all"`)

**.dmg created but app crashes on launch**
→ Check workflow logs for Rust compilation errors
→ Test locally on Mac if available

**GitHub Actions runner times out (>2 hours)**
→ First build takes 10-15 minutes (Rust dependency compilation)
→ Subsequent builds faster due to caching (~5 minutes)

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
