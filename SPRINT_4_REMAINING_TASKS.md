# Sprint 4 (Key Authorization) - Remaining Tasks

**Sprint:** ACTIVE_SPRINT_KEY_AUTHORIZATION.toml
**Version:** 0.17.0
**Status:** 30/43 complete (70%) - 3 publishing tasks remaining

---

## ✅ What's Already Done

### Extension VSIX ✅
- **File:** `vscode-lumina/aetherlight-0.17.0.vsix`
- **Size:** 18.3 MB (4,727 files)
- **Created:** 2025-11-11 17:02
- **Status:** ✅ Ready to publish

### Desktop App Compilation ✅
- **Status:** Compiles successfully (cargo check passed)
- **Warnings:** 29 warnings (unused code - not critical)
- **Errors:** 0 errors
- **Ready for:** Release build

### Git & Version ✅
- **Commit:** 88dbbba created
- **Tag:** v0.17.0 created
- **Needs:** Push to GitHub (`git push origin master --tags`)

### Documentation ✅
- **CHANGELOG.md:** v0.17.0 section complete (145 lines)
- **README.md:** Updated with monetization features
- **MIGRATION_GUIDE.md:** Complete (320 lines)
- **Pattern-MONETIZATION-001.md:** Complete (568 lines)
- **Agent context files:** All updated

### Validation ✅
- **PRE_PUBLISH_VALIDATION_v0.17.0.md:** 8/10 checks passed
- **Security audit:** 0 vulnerabilities
- **TypeScript compilation:** 0 errors
- **Version sync:** All packages at 0.17.0

---

## ⏳ What's Left (3 Tasks)

### Task 1: PUB-002 - Build Release Artifacts
**Status:** Pending
**Time:** 1-2 hours
**Dependencies:** PUB-001 (complete)

**What needs to be built:**

#### 1. Desktop App Binaries (Tauri)
```bash
cd products/lumina-desktop
npm run tauri build
```

**Builds for current platform:**
- **Windows:** `.exe` installer + `.msi` installer
- **macOS:** `.dmg` + `.app` bundle
- **Linux:** `.AppImage` + `.deb`

**Output location:** `products/lumina-desktop/src-tauri/target/release/bundle/`

**Cross-compilation notes:**
- Windows builds require Windows machine (you're on Windows ✅)
- macOS builds require macOS machine (need separate build)
- Linux builds can be done via Docker/WSL

**Recommendation:** Build Windows binaries now, macOS/Linux later (or skip for initial release)

#### 2. Extension VSIX
**Status:** ✅ ALREADY DONE
- `vscode-lumina/aetherlight-0.17.0.vsix` (18.3 MB)

#### 3. Website
**Status:** ✅ ALREADY DEPLOYED
- Website at https://aetherlight.ai
- Vercel auto-deploys on push

**PUB-002 Completion checklist:**
- [ ] Build Windows desktop binaries
- [x] Extension VSIX (already built)
- [x] Website deployed
- [ ] Verify all artifacts built without errors

---

### Task 2: PUB-003 - Publish to Marketplace & npm
**Status:** Pending
**Time:** 30 minutes
**Dependencies:** PUB-002

**What needs to be published:**

#### 1. VS Code Marketplace (Extension)
```bash
cd vscode-lumina
vsce publish 0.17.0
```

**Prerequisites:**
- [x] VSIX built
- [x] Version 0.17.0 in package.json
- [ ] Logged in as `aelor` (`npm whoami` to check)
- [ ] VS Code publisher token valid

**Verification:**
- Extension visible at: https://marketplace.visualstudio.com/items?itemName=aetherlight.aetherlight
- Version shows 0.17.0
- Users can install via VS Code

#### 2. npm Packages
**Packages to publish (4):**
1. `vscode-lumina` (main extension)
2. `packages/aetherlight-sdk`
3. `packages/aetherlight-analyzer`
4. `packages/aetherlight-node`

**Commands:**
```bash
# Option 1: Use automated script (RECOMMENDED)
node scripts/publish-release.js patch

# Option 2: Manual (if script fails)
cd vscode-lumina && npm publish
cd ../packages/aetherlight-sdk && npm publish
cd ../packages/aetherlight-analyzer && npm publish
cd ../packages/aetherlight-node && npm publish
```

**Prerequisites:**
- [x] Version 0.17.0 in all package.json files
- [ ] Logged in to npm as `aelor`
- [ ] npm registry accessible

**Verification:**
- Check https://www.npmjs.com/package/aetherlight
- Version shows 0.17.0
- `npm install aetherlight` works

**PUB-003 Completion checklist:**
- [ ] Extension published to VS Code Marketplace
- [ ] All 4 packages published to npm
- [ ] Verify extension visible on marketplace
- [ ] Verify packages visible on npm

---

### Task 3: PUB-004 - Create GitHub Release
**Status:** Pending
**Time:** 30 minutes
**Dependencies:** PUB-003

**What needs to be created:**

#### 1. GitHub Release
**Method:** Use GitHub CLI (`gh`)

```bash
# Create release with assets
gh release create v0.17.0 \
  --title "v0.17.0 - Key Authorization & Monetization" \
  --notes-file RELEASE_NOTES_v0.17.0.md \
  vscode-lumina/aetherlight-0.17.0.vsix \
  products/lumina-desktop/src-tauri/target/release/bundle/windows/*.exe \
  products/lumina-desktop/src-tauri/target/release/bundle/windows/*.msi
```

**Release notes content:**
- Summary of v0.17.0 changes
- Link to CHANGELOG.md v0.17.0 section
- Link to MIGRATION_GUIDE.md
- Breaking changes highlighted
- Installation instructions

#### 2. Release Notes File
**Create:** `RELEASE_NOTES_v0.17.0.md`

**Content structure:**
```markdown
# v0.17.0 - Key Authorization & Monetization

## Summary
Major release introducing server-side key management and token-based pricing.

## Breaking Changes
- BYOK (Bring Your Own Key) model removed
- Extension v0.17.0 requires desktop app v0.17.0
- OpenAI API key no longer configurable

## Features
- Server-side key management (Pattern-MONETIZATION-001)
- Token-based pricing tiers (Free, Pro, Token purchase)
- License key activation wizard
- Real-time token balance display
- Monthly token refresh automation

## Migration
See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for upgrade instructions.

## Full Changelog
See [CHANGELOG.md](CHANGELOG.md#v0170---2025-11-11)
```

**PUB-004 Completion checklist:**
- [ ] Create RELEASE_NOTES_v0.17.0.md
- [ ] Create GitHub release v0.17.0
- [ ] Upload extension VSIX asset
- [ ] Upload desktop binaries (Windows)
- [ ] Release notes include all links
- [ ] Release marked as "Latest"

---

## Quick Start Guide

### Fastest Path to Release (Skip Desktop Binaries)

If you want to release the extension now and add desktop binaries later:

1. **Push to GitHub** (30 seconds)
   ```bash
   git push origin master --tags
   ```

2. **Publish Extension** (2 minutes)
   ```bash
   cd vscode-lumina
   npm whoami  # Verify logged in as aelor
   vsce publish 0.17.0
   ```

3. **Create GitHub Release** (5 minutes)
   ```bash
   # Create release notes
   echo "# v0.17.0 - Key Authorization & Monetization..." > RELEASE_NOTES_v0.17.0.md

   # Create release
   gh release create v0.17.0 \
     --title "v0.17.0 - Key Authorization & Monetization" \
     --notes-file RELEASE_NOTES_v0.17.0.md \
     vscode-lumina/aetherlight-0.17.0.vsix
   ```

**Total time:** ~7 minutes
**Desktop binaries:** Add later via `gh release upload v0.17.0 <files>`

---

### Full Release (With Desktop Binaries)

1. **Build Desktop Binaries** (1-2 hours)
   ```bash
   cd products/lumina-desktop
   npm run tauri build
   ```

2. **Push to GitHub** (30 seconds)
   ```bash
   git push origin master --tags
   ```

3. **Publish Extension & Packages** (5 minutes)
   ```bash
   node scripts/publish-release.js patch
   ```

4. **Create GitHub Release** (5 minutes)
   ```bash
   gh release create v0.17.0 \
     --title "v0.17.0 - Key Authorization & Monetization" \
     --notes-file RELEASE_NOTES_v0.17.0.md \
     vscode-lumina/aetherlight-0.17.0.vsix \
     products/lumina-desktop/src-tauri/target/release/bundle/windows/*.exe \
     products/lumina-desktop/src-tauri/target/release/bundle/windows/*.msi
   ```

**Total time:** ~2-3 hours

---

## Prerequisites Check

### Required for Publishing:
- [x] **Git commit & tag:** Created (88dbbba, v0.17.0)
- [x] **Extension VSIX:** Built (aetherlight-0.17.0.vsix)
- [ ] **Desktop binaries:** Not built yet (optional for initial release)
- [ ] **npm login:** Need to verify (`npm whoami`)
- [ ] **GitHub CLI:** Need to verify (`gh auth status`)

### Required for Desktop Build:
- [x] **Rust toolchain:** Installed (cargo check passed)
- [x] **Node.js & npm:** Installed (npm commands working)
- [x] **Tauri CLI:** Installed (@tauri-apps/cli in devDependencies)
- [ ] **Windows build tools:** Need to verify (Visual Studio Build Tools)

---

## Post-Release Actions

After publishing v0.17.0:

1. **Install published extension** (not dev version)
2. **Install desktop app** from release binaries
3. **Execute manual tests** from SPRINT_4_MANUAL_TEST_PLAN.md
4. **Execute deferred Sprint 3 tests** (from Sprint 3 cleanup)
5. **Document results** in TEST_RESULTS_v0.17.0.md
6. **Create hotfix v0.17.1** if critical issues found
7. **Sprint retrospectives** (RETRO-001, RETRO-002)

---

## Troubleshooting

### Issue: "npm ERR! need auth"
**Solution:** Login to npm
```bash
npm login
# Username: aelor
# Email: (your email)
# Password: (your password)
```

### Issue: "vsce ERR! Missing publisher"
**Solution:** Login to VS Code publisher
```bash
vsce login aetherlight
# Enter Personal Access Token
```

### Issue: "gh: command not found"
**Solution:** Install GitHub CLI
```bash
winget install GitHub.cli
# Or download from: https://cli.github.com/
```

### Issue: Tauri build fails
**Solution:** Check logs, may need Visual Studio Build Tools
```bash
cargo build --release
# Check error messages
```

---

**Last Updated:** 2025-11-11
**Status:** 3 tasks remaining (PUB-002, PUB-003, PUB-004)
**Estimated Time to Complete:** 2-3 hours (with desktop binaries) OR 7 minutes (extension only)
