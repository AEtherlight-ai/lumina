# ÆtherLight NPM Publishing Guide

**Created:** 2025-10-27
**Status:** Ready for Publishing

---

## 📦 Package Structure

The ÆtherLight ecosystem consists of 4 npm packages:

### 1. `aetherlight` (VS Code Extension)
- **Location:** `vscode-lumina/`
- **Current Version:** v0.13.11 (published ✅)
- **Repository:** https://github.com/AEtherlight-ai/lumina
- **Installation:** `npm install -g aetherlight`
- **Purpose:** VS Code extension with voice capture, pattern matching, and CLI tools

### 2. `@aetherlight/analyzer` (Code Analyzer CLI)
- **Location:** `packages/aetherlight-analyzer/`
- **Version:** v1.0.0 (not published ❌)
- **Repository:** https://github.com/AEtherlight-ai/lumina
- **Installation (after publishing):** `npm install -g @aetherlight/analyzer`
- **Purpose:** Standalone CLI for analyzing codebases and generating sprint plans
- **Status:** ✅ Ready to publish (TypeScript builds, tests pass)

### 3. `@aetherlight/sdk` (Application Integration SDK)
- **Location:** `packages/aetherlight-sdk/`
- **Version:** v0.1.0 (not published ❌)
- **Repository:** https://github.com/AEtherlight-ai/lumina
- **Installation (after publishing):** `npm install @aetherlight/sdk`
- **Purpose:** SDK for integrating ÆtherLight into any application
- **Status:** ✅ Ready to publish (TypeScript errors fixed)

### 4. `@aetherlight/node` (Native Rust Bindings)
- **Location:** `packages/aetherlight-node/`
- **Version:** v0.1.0 (not published ❌)
- **Repository:** https://github.com/AEtherlight-ai/lumina
- **Installation (after publishing):** Automatic via `aetherlight` dependency
- **Purpose:** Native Node.js bindings for pattern matching engine
- **Status:** ⚠️ Only Windows x64 binary exists
- **Requires:** Cross-platform binary builds via GitHub Actions

---

## 🎯 Publishing Plan

### Phase 1: Publish Pure TypeScript Packages ✅

These packages are ready now (no binaries required):

1. **@aetherlight/analyzer**
   ```bash
   cd packages/aetherlight-analyzer
   npm publish --access public
   ```

2. **@aetherlight/sdk**
   ```bash
   cd packages/aetherlight-sdk
   npm publish --access public
   ```

### Phase 2: Build Cross-Platform Binaries

**@aetherlight/node** needs binaries for:
- ✅ Windows x64 (exists: `aetherlight-node.win32-x64-msvc.node`)
- ❌ Windows ARM64
- ❌ macOS x64
- ❌ macOS ARM64 (Apple Silicon)
- ❌ Linux x64
- ❌ Linux ARM64

**GitHub Actions workflow created:** `.github/workflows/build-native-bindings.yml`

**To build binaries:**
```bash
# Push changes to trigger build
git add .
git commit -m "chore: add cross-platform build workflow"
git push

# OR manually trigger workflow dispatch in GitHub UI
# Then publish with: npm publish --access public
```

### Phase 3: Update VS Code Extension

Once @aetherlight/analyzer is published, update `vscode-lumina/package.json`:

**Change:**
```json
"dependencies": {
  "@aetherlight/analyzer": "file:../packages/aetherlight-analyzer",
  ...
}
```

**To:**
```json
"dependencies": {
  "@aetherlight/analyzer": "^1.0.0",
  ...
}
```

**Then bump version and publish:**
```bash
cd vscode-lumina
npm version patch  # or minor/major
npm publish --access public
```

---

## 🚀 Installation After Publishing

### For Users

**Install everything (recommended):**
```bash
npm install -g aetherlight
```

This installs:
- VS Code extension
- Analyzer CLI
- All dependencies

**Install just the analyzer CLI:**
```bash
npm install -g @aetherlight/analyzer

# Then use:
aetherlight-analyzer analyze ./my-project
```

**Install SDK for app integration:**
```bash
npm install @aetherlight/sdk

# Then use in your app:
import { AetherlightClient } from '@aetherlight/sdk';
```

---

## 🔧 Current Issues & Solutions

### Issue: VS Code Extension References Local Analyzer

**Problem:** `vscode-lumina/package.json` uses file reference:
```json
"@aetherlight/analyzer": "file:../packages/aetherlight-analyzer"
```

**Solution:** After publishing analyzer, update to use npm version:
```json
"@aetherlight/analyzer": "^1.0.0"
```

### Issue: Only Windows Binary Exists

**Problem:** `@aetherlight/node` only has Windows x64 binary

**Solutions:**
1. **Short-term:** Document that macOS/Linux users need Rust toolchain
2. **Long-term:** Use GitHub Actions to build all platform binaries

**GitHub Actions Workflow:**
- File: `.github/workflows/build-native-bindings.yml`
- Builds binaries for all platforms on push
- Can manually trigger with publish flag

---

## 📝 Pre-Publishing Checklist

Before publishing packages, ensure:

- [ ] All repository URLs point to https://github.com/AEtherlight-ai/lumina ✅
- [ ] Logged into npm as `aelor` ✅
- [ ] Package versions are correct
- [ ] README files are up-to-date
- [ ] LICENSE files exist
- [ ] TypeScript compiles without errors ✅
- [ ] Tests pass (or known failures documented)
- [ ] .npmignore excludes unnecessary files

---

## 🔐 NPM Authentication

**Current Status:** Logged in as `aelor`

**Verify login:**
```bash
npm whoami
```

**Login if needed:**
```bash
npm login
```

**Required:** NPM_TOKEN secret in GitHub for Actions publishing

---

## 📊 Package Dependency Graph

```
aetherlight (VS Code Extension)
├── @aetherlight/analyzer (file: → npm after publish)
├── @aetherlight/node (optional, for native perf)
└── other deps (ws, form-data, etc.)

@aetherlight/analyzer (standalone)
├── no external package deps
└── dev deps (TypeScript, Jest)

@aetherlight/sdk (standalone)
├── ws
├── reflect-metadata
└── dev deps (TypeScript, Jest)

@aetherlight/node (native bindings)
├── built from Rust (crates/aetherlight-core)
└── platform-specific .node files
```

---

## 🎯 Success Criteria

After publishing, verify:

1. **Packages are discoverable:**
   ```bash
   npm view aetherlight
   npm view @aetherlight/analyzer
   npm view @aetherlight/sdk
   npm view @aetherlight/node
   ```

2. **Installation works:**
   ```bash
   npm install -g aetherlight
   aetherlight --version
   aetherlight-analyzer --version
   ```

3. **Repository links work:**
   - npm package pages link to GitHub
   - GitHub repo shows npm badges

---

## 🚨 If Publishing Fails

### Common Issues

**Error: 404 Not Found**
- Package name doesn't exist or not scoped correctly
- For scoped packages (@aetherlight/*), ensure `--access public`

**Error: 403 Forbidden**
- Not logged in: `npm login`
- No publish rights to @aetherlight scope

**Error: Version Already Exists**
- Bump version: `npm version patch`
- Or use specific version in package.json

**Error: Missing Files**
- Check `files` array in package.json
- Check .npmignore isn't excluding too much

---

## 📚 Resources

- **Main Repo:** https://github.com/AEtherlight-ai/lumina
- **Discord Automation:** https://github.com/AEtherlight-ai/aetherlight_discord
- **npm Registry:** https://www.npmjs.com/~aelor
- **Publishing Docs:** https://docs.npmjs.com/cli/v9/commands/npm-publish

---

**Next Steps:**
1. Publish @aetherlight/analyzer
2. Publish @aetherlight/sdk
3. Set up cross-platform builds for @aetherlight/node
4. Update aetherlight to use published packages
5. Publish new version of aetherlight

**Status:** Ready to execute ✅
