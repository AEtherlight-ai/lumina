# npm Publishing Guide for ÆtherLight

**DESIGN DECISION:** Full suite npm installer that downloads binaries from GitHub Releases
**WHY:** User requested simple `npm install` that handles everything (VS Code extension + Desktop app)

## What We Built

### 1. Full Suite Installer (`bin/aetherlight.js`)
- ✅ Detects OS (Windows, Mac, Linux)
- ✅ Downloads latest release from GitHub
- ✅ Installs VS Code extension (.vsix)
- ✅ Installs Desktop app (Windows .exe / Mac .app)
- ✅ Installs Cursor extension (if detected)
- ✅ Graceful degradation (skips unavailable components)

### 2. package.json Configuration
- ✅ `bin` entry for global command
- ✅ `files` array (what gets published)
- ✅ `keywords` for npm discoverability
- ✅ `readme` field pointing to NPM_README.md
- ✅ `postinstall` script with usage instructions

### 3. User Experience
```bash
# User runs:
npm install -g aetherlight

# Output:
# ✅ ÆtherLight installed!
# Next step: Run "aetherlight" to install VS Code extension + Desktop app

# User then runs:
aetherlight

# Installer:
# 📥 Downloading VS Code extension...
# 📥 Downloading Desktop app...
# 📦 Installing VS Code extension... ✅
# 🖥️  Installing Desktop app... ✅
# 🎉 Installation Complete!
```

## Testing Locally (Before Publishing)

### Step 1: Build the Package

```bash
cd vscode-lumina

# Compile TypeScript
npm run compile

# Create .vsix package (for reference)
npm run package

# Pack npm package (creates .tgz file)
npm pack
```

This creates `aetherlight-0.13.2.tgz`.

### Step 2: Test Global Install

```bash
# Install locally from .tgz file
npm install -g ./aetherlight-0.13.2.tgz

# Test the command
aetherlight

# Expected: Installer runs and downloads binaries from GitHub
```

### Step 3: Test Installation Flow

**Windows:**
```powershell
# Remove previous installation
npm uninstall -g aetherlight
code --uninstall-extension aetherlight

# Install fresh
npm install -g ./aetherlight-0.13.2.tgz
aetherlight

# Verify:
# - VS Code extension listed: code --list-extensions | findstr aetherlight
# - Desktop app shortcut in Start Menu
```

**Mac:**
```bash
# Remove previous installation
npm uninstall -g aetherlight
code --uninstall-extension aetherlight

# Install fresh
npm install -g ./aetherlight-0.13.2.tgz
aetherlight

# Verify:
# - VS Code extension listed: code --list-extensions | grep aetherlight
# - Desktop app in /Applications/ÆtherLight.app
```

## Publishing to npm

### Prerequisites

1. **npm Account:**
   ```bash
   npm login
   # Enter your npm credentials
   ```

2. **GitHub Releases Ready:**
   - v0.13.2 release must exist
   - Must contain:
     - `aetherlight-0.13.2-discoverable.vsix` (VS Code extension)
     - `aetherlight-0.13.2-windows.exe` (Windows installer)
     - `aetherlight-0.13.2-mac.app.zip` (Mac app bundle)

3. **Version Bumped:**
   ```bash
   # Already done - package.json shows 0.13.2
   # For next release:
   npm version patch  # 0.13.2 → 0.13.3
   ```

### Publish Steps

```bash
cd vscode-lumina

# 1. Final build
npm run compile

# 2. Dry run (see what will be published)
npm publish --dry-run

# 3. Publish (first time - mark as public)
npm publish --access public

# 4. Verify on npm
npm view aetherlight
```

### Update Commands

```bash
# Publish patch version (0.13.2 → 0.13.3)
npm version patch
git push && git push --tags
npm publish

# Publish minor version (0.13.3 → 0.14.0)
npm version minor
git push && git push --tags
npm publish

# Publish major version (0.14.0 → 1.0.0)
npm version major
git push && git push --tags
npm publish
```

## CI/CD Integration (Optional)

Add to `.github/workflows/release.yml`:

```yaml
- name: Publish to npm
  if: github.ref == 'refs/tags/v*'
  env:
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
  run: |
    cd vscode-lumina
    echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > ~/.npmrc
    npm run compile
    npm publish --access public
```

**Setup:**
1. Get npm access token: https://www.npmjs.com/settings/USERNAME/tokens
2. Add to GitHub Secrets: `Settings → Secrets → NPM_TOKEN`

## Fixing Desktop Build Issues

**Current Status:** Desktop binaries (Windows .exe and Mac .app) are missing from v0.13.2 release.

### Debugging Failed Builds

```bash
# Check latest workflow run
gh run list --workflow=release.yml --limit 1

# View failed job logs
gh run view 18826022564 --log-failed | grep -A 20 "error"
```

### Common Issues

**Windows Build:**
- DXCORE.lib linking errors (requires Windows SDK)
- Rust compilation errors (Tauri dependencies)
- Missing Visual Studio build tools

**Mac Build:**
- Xcode command line tools missing
- Code signing issues
- macOS SDK version mismatch

### Fix Workflow

1. **Local Testing:**
   ```bash
   # Test Windows build locally (on Windows machine)
   cd products/lumina-desktop
   npm run tauri build

   # Test Mac build locally (on Mac machine)
   cd products/lumina-desktop
   npm run tauri build
   ```

2. **Fix Errors:**
   - Update `products/lumina-desktop/src-tauri/Cargo.toml`
   - Fix Rust code in `products/lumina-desktop/src-tauri/src/`

3. **Rebuild Release:**
   ```bash
   # Delete failed tag
   git tag -d v0.13.2
   git push origin :refs/tags/v0.13.2

   # Recreate tag
   git tag -a v0.13.2 -m "Release v0.13.2 - Desktop builds fixed"
   git push origin v0.13.2
   ```

## User Feedback Loop

Once published:

1. **Monitor Issues:**
   - Watch GitHub Issues for installation problems
   - Check npm download stats: `npm info aetherlight`

2. **Common User Issues:**
   - "Desktop app not found" → Builds failed, need to fix workflow
   - "Permission denied" → chmod +x issue on Linux/Mac
   - "VS Code not detected" → PATH issue, need clearer error message

3. **Iterate:**
   - Fix issues in `bin/aetherlight.js`
   - Bump version: `npm version patch`
   - Republish: `npm publish`

## Current Gaps

**Before full npm publish:**
- ❌ Desktop app Windows build failing (Rust errors)
- ❌ Desktop app Mac build failing (Rust errors)
- ✅ VS Code extension builds successfully

**Recommendation:**
- ✅ Publish now (extension-only works fine)
- 🔧 Fix desktop builds separately
- 📦 Update npm package once desktop builds succeed
- 📝 Document known limitations in NPM_README.md

## Next Steps

1. **Immediate (Extension-Only):**
   ```bash
   npm publish --access public
   # Users get VS Code extension, desktop app skipped gracefully
   ```

2. **Short-term (Fix Desktop Builds):**
   - Debug Rust compilation errors
   - Fix GitHub Actions workflow
   - Re-release with desktop binaries

3. **Long-term (Full Automation):**
   - Add npm publish to release workflow
   - Add marketplace publish to release workflow
   - Auto-update mechanism in extension

---

**STATUS:** npm package ready for publishing (extension-only)
**NEXT:** Decide if you want to publish now or wait for desktop builds to succeed
