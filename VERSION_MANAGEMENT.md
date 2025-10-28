# ÆtherLight Version Management & Auto-Update

**Last Updated:** 2025-10-28
**Pattern:** Pattern-UPDATE-001 (Auto-Update Detection)

---

## 🎯 Overview

ÆtherLight has automated version management and update systems to ensure users always have the latest features and fixes.

### Update Mechanisms

1. **VS Code Marketplace Auto-Update** - Automatic (no code needed)
2. **npm Registry Update Checker** - In-extension notification system
3. **GitHub Actions Publishing** - Automated multi-platform releases
4. **Version Synchronization** - Single command updates all packages

---

## 🚀 How Auto-Updates Work

### For VS Code Extension Users

**VS Code Marketplace (Primary Method):**
- VS Code checks for extension updates every 12 hours automatically
- When new version published → Auto-downloads and installs
- User sees "Extension updated" notification
- Requires VS Code reload to activate

**User Control:**
- `"extensions.autoUpdate": true` (default) - Auto-updates enabled
- `"extensions.autoUpdate": false` - Manual updates only
- Can disable per extension in Extensions panel

### For npm Global Install Users

**npm Update Checker (Built-in):**
- Extension checks npm registry on activation (after 10s delay)
- Checks every 12 hours in background
- Compares installed version vs latest on npm
- Shows notification when update available

**User Configuration:**
```json
{
  "aetherlight.updates.autoCheck": true,     // Check for updates (default: true)
  "aetherlight.updates.autoUpdate": false    // Auto-update via npm (default: false)
}
```

**Manual Update Command:**
- `ÆtherLight: Check for Updates` in Command Palette
- Shows current version and latest available
- One-click update via terminal

---

## 📦 Version Bump Process

### Using the Automation Script

```bash
# Bump patch version (1.0.0 -> 1.0.1)
node scripts/bump-version.js patch

# Bump minor version (1.0.0 -> 1.1.0)
node scripts/bump-version.js minor

# Bump major version (1.0.0 -> 2.0.0)
node scripts/bump-version.js major

# Set specific version
node scripts/bump-version.js 1.2.3
```

**What it does:**
1. Updates version in ALL package.json files:
   - `vscode-lumina/package.json`
   - `packages/aetherlight-sdk/package.json`
   - `packages/aetherlight-analyzer/package.json`
   - `packages/aetherlight-node/package.json`

2. Updates internal dependencies to match new version:
   ```json
   {
     "dependencies": {
       "aetherlight-analyzer": "^1.2.3",
       "aetherlight-node": "^1.2.3"
     }
   }
   ```

3. Outputs next steps for publishing

---

## 🔄 Publishing Workflow

### Automated Publishing (Recommended)

**Trigger via Git Tag:**
```bash
# 1. Bump version
node scripts/bump-version.js patch

# 2. Review changes
git diff

# 3. Commit and tag
git add .
git commit -m "chore: bump version to 0.13.18"
git tag v0.13.18

# 4. Push to GitHub
git push origin master --tags
```

**What happens automatically:**
1. GitHub Actions workflow triggers on `v*.*.*` tag
2. Builds native bindings for all platforms (Windows, macOS, Linux x64/ARM64)
3. Publishes to npm:
   - `aetherlight-sdk`
   - `aetherlight-analyzer`
   - `aetherlight-node`
   - `aetherlight` (main package)
4. Publishes to VS Code Marketplace
5. Creates GitHub Release with install instructions

**Estimated Time:** 20-30 minutes for complete deployment

### Manual Publishing (Fallback)

```bash
# Publish SDK
cd packages/aetherlight-sdk
npm publish --access public

# Publish Analyzer
cd ../aetherlight-analyzer
npm publish --access public

# Publish Node bindings (requires all platform builds)
cd ../aetherlight-node
npm publish --access public

# Publish main extension
cd ../../vscode-lumina
npm run compile
npm publish --access public

# Publish to VS Code Marketplace
vsce publish
```

---

## 🛠️ Update Checker Implementation

**Location:** `vscode-lumina/src/services/updateChecker.ts`

**Features:**
- ✅ Checks npm registry via HTTPS
- ✅ Semantic version comparison
- ✅ Respects user preferences (auto-check/auto-update)
- ✅ 12-hour check interval (configurable)
- ✅ Skip version feature (don't nag about old versions)
- ✅ One-click update via terminal
- ✅ Opens release notes in browser
- ✅ Auto-reload after update

**Activation:**
```typescript
// In extension.ts activate() function
const updateChecker = new UpdateChecker(context);
updateChecker.start();

// Register manual check command
context.subscriptions.push(
  vscode.commands.registerCommand('aetherlight.checkForUpdates', () => {
    updateChecker.checkNow();
  })
);
```

**User Experience:**
1. User installs via `npm install -g aetherlight`
2. Opens VS Code → Extension activates
3. After 10 seconds → Checks npm registry
4. If newer version → Shows notification:
   ```
   ÆtherLight v0.13.18 is available (current: v0.13.17)
   [Update Now] [View Changes] [Dismiss] [Skip This Version]
   ```
5. User clicks "Update Now" → Terminal opens with `npm update -g aetherlight`
6. After install → Prompt to reload VS Code
7. Extension now running latest version

---

## 📊 Version States

### Current Versions (as of 2025-10-28)

| Package | Version | Status | Published |
|---------|---------|--------|-----------|
| `aetherlight` | v0.13.17 | ✅ Stable | npm + Marketplace |
| `aetherlight-sdk` | v0.1.1 | ✅ Stable | npm |
| `aetherlight-analyzer` | v1.0.0 | ✅ Stable | npm |
| `aetherlight-node` | v0.1.0 | 🚧 Partial | Windows only |

### Version Synchronization Rules

**Main Extension Version (vscode-lumina):**
- Follows semantic versioning: `MAJOR.MINOR.PATCH`
- Increments independently based on features/fixes

**Package Dependencies:**
- SDK, Analyzer, Node use same version as main extension
- Ensures compatibility across ecosystem
- Simplifies user understanding

**Breaking Changes:**
- Major version bump (1.0.0 → 2.0.0)
- Update all packages simultaneously
- Document migration guide

---

## 🔐 Required Secrets

For automated publishing, configure GitHub repository secrets:

### npm Token
```bash
# Create token at https://www.npmjs.com/settings/[username]/tokens
# Type: Automation (recommended for CI/CD)
# Add to GitHub: Settings → Secrets → Actions → NPM_TOKEN
```

### VS Code Marketplace Token
```bash
# Create PAT at https://dev.azure.com/[org]/_usersSettings/tokens
# Scopes: Marketplace (Acquire, Manage)
# Add to GitHub: Settings → Secrets → Actions → VSCE_PAT
```

---

## 🧪 Testing Updates

### Test Update Checker Locally

```bash
# 1. Edit vscode-lumina/package.json - set version to older (e.g., 0.1.0)
{
  "version": "0.1.0"
}

# 2. Recompile extension
cd vscode-lumina
npm run compile

# 3. Reload VS Code extension (F5 in Extension Development Host)

# 4. Check Output panel → "ÆtherLight" channel
# Should see: "ÆtherLight v0.13.17 is available (current: v0.1.0)"
```

### Test Version Bump Script

```bash
# Test patch bump
node scripts/bump-version.js patch

# Verify changes
git diff vscode-lumina/package.json
git diff packages/aetherlight-sdk/package.json
git diff packages/aetherlight-analyzer/package.json
git diff packages/aetherlight-node/package.json

# Reset if testing
git checkout -- .
```

---

## 📝 Changelog Maintenance

**Location:** `CHANGELOG.md` (create if missing)

**Format:**
```markdown
# Changelog

## [0.13.18] - 2025-10-28

### Added
- Auto-update checker with 12-hour interval
- Manual "Check for Updates" command
- Version synchronization script

### Changed
- Updated dependencies to latest versions

### Fixed
- Fixed bug in pattern matching confidence scoring

## [0.13.17] - 2025-10-27
...
```

**Update on each release:**
1. Add new version section at top
2. Document user-facing changes
3. Commit with version bump
4. GitHub Actions will include in release notes

---

## 🎯 Success Criteria

### For Users
- ✅ VS Code Marketplace auto-updates work out of the box
- ✅ npm global installs get update notifications
- ✅ One-click update process (no manual commands needed)
- ✅ Clear version visibility (current vs latest)
- ✅ Release notes easily accessible

### For Developers
- ✅ Single command bumps all package versions
- ✅ Git tag triggers automated publishing
- ✅ All platforms built and published automatically
- ✅ Version consistency across ecosystem
- ✅ Clear documentation for publishing process

---

## 🐛 Troubleshooting

### Update Checker Not Working

**Check settings:**
```json
{
  "aetherlight.updates.autoCheck": true  // Must be true
}
```

**Check logs:**
1. Open Output panel (`Ctrl+Shift+U`)
2. Select "ÆtherLight" from dropdown
3. Look for update check messages

**Manual test:**
1. Open Command Palette (`Ctrl+Shift+P`)
2. Run: `ÆtherLight: Check for Updates`
3. Should see result immediately

### Publishing Fails

**npm Authentication:**
```bash
# Verify logged in
npm whoami

# Login if needed
npm login
```

**VS Code Marketplace:**
```bash
# Verify token
vsce ls-publishers

# Verify package
cd vscode-lumina
vsce ls
```

**GitHub Actions:**
- Check Actions tab for error logs
- Verify secrets are configured
- Check workflow permissions

---

## 📚 Related Documentation

- [NPM_PUBLISHING_GUIDE.md](./NPM_PUBLISHING_GUIDE.md) - Initial publishing setup
- [PUBLISHING_STATUS.md](./PUBLISHING_STATUS.md) - Current publishing status
- [NPM_SCOPE_SETUP.md](./NPM_SCOPE_SETUP.md) - Creating @aetherlight org
- [.github/workflows/publish.yml](./.github/workflows/publish.yml) - Publishing workflow
- [scripts/bump-version.js](./scripts/bump-version.js) - Version bump script

---

## 🎉 Summary

**Version Management:**
- ✅ Automated version bumping across all packages
- ✅ Git tag triggers publishing workflow
- ✅ Cross-platform native binding builds
- ✅ Multi-registry publishing (npm + VS Code Marketplace)

**Auto-Updates:**
- ✅ VS Code Marketplace auto-updates (built-in)
- ✅ npm update checker (in-extension)
- ✅ User-configurable preferences
- ✅ One-click update process

**Developer Experience:**
1. `node scripts/bump-version.js patch`
2. `git add . && git commit -m "chore: bump version"`
3. `git tag v0.13.18 && git push origin master --tags`
4. ☕ Wait 20-30 minutes
5. ✅ Published to npm + VS Code Marketplace

**User Experience:**
1. Install: `npm install -g aetherlight`
2. Use VS Code normally
3. See notification when update available
4. Click "Update Now" button
5. ✅ Latest version installed
