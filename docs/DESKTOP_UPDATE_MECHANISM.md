# Desktop App Auto-Update Mechanism (BUG-006)

**Status**: ✅ Implemented (v0.17.2)
**Pattern**: Pattern-DESKTOP-AUTO-LAUNCH-001
**Related**: tauri-plugin-updater, GitHub Releases, extension version check

---

## Overview

The desktop app now supports automatic updates via Tauri's built-in updater plugin. Updates are distributed through GitHub Releases and verified with cryptographic signatures.

**Design Decision**: Use Tauri v2 updater plugin + GitHub Releases
**Why**: Battle-tested, free hosting, automatic signature verification, no custom server needed

---

## How It Works

### Update Flow

1. **Desktop app launches** → Update check runs in background (non-blocking)
2. **Check GitHub Releases** → Tauri fetches latest version from endpoint
3. **Version comparison** → If newer version available, log to console
4. **User action** → (Future) Show UI notification, user clicks "Update"
5. **Download** → Tauri downloads installer + signature from GitHub Releases
6. **Verify signature** → Tauri verifies cryptographic signature (prevents MITM attacks)
7. **Install** → User-triggered installation, app restarts
8. **Rollback** → If installation fails, Tauri rolls back to previous version

### Extension Version Check

Before launching the desktop app, the VS Code extension checks version compatibility:

- **Major version MUST match** (e.g., extension v1.x requires desktop app v1.x)
- **Minor version can be 1 behind** (e.g., extension v0.18.x works with desktop app v0.17.x)
- **Warning shown if incompatible** → User prompted to rebuild desktop app

---

## Configuration Files

### 1. `tauri.conf.json` (Desktop App)

```json
{
  "bundle": {
    "createUpdaterArtifacts": true
  },
  "plugins": {
    "updater": {
      "endpoints": [
        "https://github.com/aetherlight-ai/lumina/releases/latest/download/{{target}}-{{arch}}.json"
      ],
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

**Variables**:
- `{{target}}`: OS (windows, darwin, linux)
- `{{arch}}`: Architecture (x86_64, aarch64, etc.)

### 2. `main.rs` (Desktop App Startup)

Update check runs in background via `tauri::async_runtime::spawn()`:

```rust
use tauri_plugin_updater::UpdaterExt;

match app_handle.updater()?.check().await {
    Ok(Some(update)) => {
        println!("🆕 Update available: v{}", update.version);
        // TODO: Show UI notification
    }
    Ok(None) => println!("✅ Desktop app is up to date"),
    Err(e) => eprintln!("⚠️ Update check failed: {}", e),
}
```

### 3. `extension.ts` (VS Code Extension)

Version check before launching desktop app:

```typescript
const extensionVersion = vscode.extensions.getExtension('aetherlight.lumina')?.packageJSON?.version;
const desktopAppVersion = getDesktopAppVersion(workspaceRoot);

if (!checkVersionCompatibility(extensionVersion, desktopAppVersion)) {
    vscode.window.showWarningMessage('Desktop app outdated. Please rebuild.');
}
```

---

## Signing Keys Setup

### ⚠️ IMPORTANT: Current Status

**Signing keys are NOT YET configured.** The system currently uses placeholder signatures (SHA-256 hashes), which are **NOT SECURE**.

For production releases, you MUST generate and configure Tauri signing keys.

### Step-by-Step Setup

#### 1. Generate Signing Keys

```bash
cd products/lumina-desktop
npm run tauri signer generate -- -w ~/.tauri/lumina.key
```

**Output**:
- **Private key**: `~/.tauri/lumina.key` (keep secure, NEVER commit to git)
- **Public key**: Printed to console (copy this)

#### 2. Add Public Key to `tauri.conf.json`

Replace `PLACEHOLDER_WILL_BE_GENERATED_ON_FIRST_BUILD` with the generated public key:

```json
{
  "plugins": {
    "updater": {
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEFCK..."
    }
  }
}
```

#### 3. Set Environment Variable for Builds

Set `TAURI_SIGNING_PRIVATE_KEY` to the contents of your private key file:

**On Windows (PowerShell)**:
```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content ~/.tauri/lumina.key -Raw
npm run tauri build
```

**On macOS/Linux**:
```bash
export TAURI_SIGNING_PRIVATE_KEY=$(cat ~/.tauri/lumina.key)
npm run tauri build
```

**For CI/CD (GitHub Actions)**:
1. Add private key as GitHub Secret: `TAURI_SIGNING_PRIVATE_KEY`
2. Set in workflow:
   ```yaml
   env:
     TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
   ```

#### 4. Rebuild Desktop App

```bash
cd products/lumina-desktop
npm run tauri build
```

Tauri will now generate `.sig` signature files alongside installers.

#### 5. Regenerate Update Manifests

```bash
node scripts/generate-update-manifest.js
```

Now manifests will include real signatures instead of placeholders.

---

## Publishing Updates

### Manual Process (Current)

1. **Build desktop app** (with signing keys configured):
   ```bash
   cd products/lumina-desktop
   npm run tauri build
   ```

2. **Generate update manifests**:
   ```bash
   node scripts/generate-update-manifest.js
   ```

3. **Create GitHub Release**:
   ```bash
   gh release create v0.17.2 \
     products/lumina-desktop/src-tauri/target/release/bundle/msi/*.msi \
     products/lumina-desktop/src-tauri/target/release/bundle/msi/*.msi.sig \
     products/lumina-desktop/src-tauri/target/release/bundle/windows-x86_64.json \
     --title "v0.17.2" \
     --notes "See CHANGELOG.md"
   ```

4. **Desktop apps auto-check for updates** on next launch.

### Automated Process (Future)

Integrate `generate-update-manifest.js` into `scripts/publish-release.js`:

```javascript
// In publish-release.js, after building desktop app:
console.log('📝 Step 6.5: Generating update manifests...');
execSync('node scripts/generate-update-manifest.js', { stdio: 'inherit' });
```

---

## Testing Updates

### Test Update Check (Without Release)

1. Change desktop app version to simulate older version:
   ```json
   // products/lumina-desktop/package.json
   { "version": "0.17.0" }
   ```

2. Rebuild desktop app:
   ```bash
   cd products/lumina-desktop
   npm run tauri build
   ```

3. Launch desktop app → Should log "Update available: v0.17.1" (if v0.17.1 release exists)

### Test Full Update Flow (With Release)

1. Create a test GitHub Release (v0.17.2-test)
2. Upload installer + signature + manifest
3. Launch desktop app v0.17.1
4. Verify update check detects v0.17.2-test
5. (Future) Trigger update download and installation

---

## Files Modified (BUG-006)

- `products/lumina-desktop/src-tauri/Cargo.toml` - Added tauri-plugin-updater
- `products/lumina-desktop/package.json` - Added @tauri-apps/plugin-updater
- `products/lumina-desktop/src-tauri/tauri.conf.json` - Updater configuration
- `products/lumina-desktop/src-tauri/src/main.rs:1825` - Plugin initialization
- `products/lumina-desktop/src-tauri/src/main.rs:2022-2066` - Update check logic
- `vscode-lumina/src/extension.ts:98-130` - Version check functions
- `vscode-lumina/src/extension.ts:146-167` - Version compatibility check in launchDesktopApp
- `scripts/generate-update-manifest.js` - NEW - Update manifest generator
- `docs/DESKTOP_UPDATE_MECHANISM.md` - NEW - This documentation

---

## Future Enhancements

- [ ] **Update notification UI** in desktop app (currently console logs only)
- [ ] **Automatic silent updates** (install without user confirmation)
- [ ] **Delta updates** (download only changed files, reduce bandwidth)
- [ ] **Update scheduling** (check once per day, not every launch)
- [ ] **Rollback UI** (allow users to revert to previous version)
- [ ] **Release channel selection** (stable, beta, alpha)

---

## Known Issues

### Issue 1: Placeholder Signatures (Current)

**Problem**: Without signing keys, manifests use SHA-256 hashes instead of real signatures.

**Impact**: Updates will fail signature verification.

**Solution**: Follow "Signing Keys Setup" section above.

### Issue 2: GitHub Releases Endpoint 404 (First Launch)

**Problem**: No GitHub Release exists yet, update check fails with 404.

**Impact**: Desktop app logs "Update check failed: 404 Not Found" (non-fatal).

**Solution**: Create first GitHub Release with desktop app installers.

### Issue 3: Extension Version Mismatch During Development

**Problem**: Developer builds desktop app but forgets to update version in package.json.

**Impact**: Extension shows "Desktop app outdated" warning even though it's the latest dev build.

**Solution**: Keep versions in sync:
- `vscode-lumina/package.json`
- `products/lumina-desktop/package.json`

Use `node scripts/bump-version.js` to sync all versions automatically.

---

## Security Considerations

1. **Private key must be secret** - NEVER commit to git, store in secure location
2. **Public key is safe to share** - Included in tauri.conf.json (public repo)
3. **Signature verification prevents MITM attacks** - Users can't be tricked into installing malicious updates
4. **GitHub Releases uses HTTPS** - Encrypted download, prevents eavesdropping
5. **Rollback mechanism** - If update fails, Tauri automatically restores previous version

---

## Support

For issues with the update mechanism:

1. Check if signing keys are configured: `~/.tauri/lumina.key` exists
2. Verify public key in `tauri.conf.json` is not placeholder
3. Check GitHub Release exists: https://github.com/aetherlight-ai/lumina/releases
4. Review desktop app console logs for update check errors

---

**Last Updated**: 2025-01-13 (BUG-006 implementation)
**Next Steps**: Generate signing keys, test full update flow with real GitHub Release
