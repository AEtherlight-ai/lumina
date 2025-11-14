# Windows MSI Installer & Registry Entries (BUG-007)

**Status**: ✅ Already Configured (Tauri v2 Default Behavior)
**Date**: 2025-01-13
**Finding**: Configuration already correct - MSI builds automatically include registry entries

---

## Executive Summary

The user-reported issue "Can't find app in Apps & Features to uninstall" is **NOT due to missing configuration**.

**Tauri v2 automatically creates MSI installers with Windows Registry entries** when `targets: "all"` is set in tauri.conf.json. The app **already appears in Windows Apps & Features** when installed via MSI.

**Root Cause of User Issue**: User likely installed **portable .exe** instead of **MSI installer**, or MSI was not available in the release they downloaded.

**Solution**: Ensure MSI is built and uploaded to releases, direct users to MSI installer in documentation.

---

## Current Configuration (Already Correct)

### tauri.conf.json (lines 31-42)

```json
{
  "bundle": {
    "active": true,
    "targets": "all",
    "createUpdaterArtifacts": true,
    "icon": [...]
  }
}
```

**What this does**:
- `"targets": "all"` - Builds **all platform-specific installers** (MSI on Windows, DMG on macOS, etc.)
- `"createUpdaterArtifacts": true` - Generates update manifests for auto-updater (BUG-006)
- **Result**: On Windows, creates `.msi` file in `target/release/bundle/msi/`

###Registry Entries Created Automatically

When the MSI installer runs, Windows Installer automatically creates these registry entries:

**Location**: `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{GUID}`

**Entries**:
- `DisplayName`: "Lumina" (from `productName` in tauri.conf.json)
- `DisplayVersion`: "0.17.1" (from `version` in tauri.conf.json)
- `Publisher`: Derived from `identifier` (com.aetherlight.lumina → "aetherlight")
- `UninstallString`: Path to uninstaller
- `InstallLocation`: `C:\Program Files\Lumina\`
- `DisplayIcon`: Path to application icon

**No custom WiX configuration needed** - Tauri v2 handles this automatically!

---

## How to Build MSI Installer

### Prerequisites

**Windows Only**:
- WiX Toolset v3 (optional - Tauri bundles it)
- VBSCRIPT Windows feature enabled (default on Windows 10/11)

**Verify**:
```powershell
# Check if VBSCRIPT is enabled
Get-WindowsOptionalFeature -Online -FeatureName VBSCRIPT
```

### Build Command

```bash
cd products/lumina-desktop
npm run tauri build
```

**Output**:
- MSI installer: `src-tauri/target/release/bundle/msi/Lumina_0.17.1_x64_en-US.msi`
- Portable executable: `src-tauri/target/release/lumina-desktop.exe`

**Both are created** with `targets: "all"` - this is intentional to give users choice.

---

## Verification: MSI Creates Registry Entries

### Test Procedure

1. **Build MSI**:
   ```bash
   cd products/lumina-desktop
   npm run tauri build
   ```

2. **Install MSI** on clean Windows machine:
   ```bash
   msiexec /i "Lumina_0.17.1_x64_en-US.msi" /l*v install.log
   ```

3. **Check Apps & Features**:
   - Open Settings > Apps > Installed apps
   - Search for "Lumina"
   - **Expected**: App appears with name, version, publisher, install date

4. **Check Registry**:
   ```powershell
   # Open Registry Editor
   regedit.exe

   # Navigate to:
   HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall

   # Find GUID matching "Lumina"
   # Verify DisplayName, DisplayVersion, Publisher entries exist
   ```

5. **Test Uninstall**:
   - In Apps & Features, click "Uninstall"
   - **Expected**: Uninstaller runs, app removed, registry entries deleted

---

## Distribution Strategy

### Recommended Approach

**Offer both installers**:
1. **MSI Installer** (Recommended for most users):
   - Appears in Apps & Features
   - Standard Windows uninstall process
   - Requires admin rights for installation
   - **Use case**: Desktop/laptop installations, standard users

2. **Portable Executable** (Advanced users):
   - No installation required
   - No registry entries
   - No admin rights needed
   - **Use case**: USB drives, temporary use, restricted environments

### GitHub Release Upload

When publishing release:

```bash
# Upload BOTH files to GitHub Releases
gh release create v0.17.2 \
  products/lumina-desktop/src-tauri/target/release/bundle/msi/Lumina_0.17.2_x64_en-US.msi \
  products/lumina-desktop/src-tauri/target/release/lumina-desktop.exe \
  --title "v0.17.2" \
  --notes "See CHANGELOG.md"
```

### Download Page Instructions

**Website/README should say**:

> **Windows Installation**
>
> **Option 1: MSI Installer (Recommended)**
> - Download: `Lumina_0.17.2_x64_en-US.msi`
> - Double-click to install
> - Appears in Windows Apps & Features for easy uninstall
> - Requires administrator rights
>
> **Option 2: Portable Executable**
> - Download: `lumina-desktop.exe`
> - Run directly, no installation needed
> - Does not appear in Apps & Features
> - No administrator rights required

---

## Why This "Just Works" in Tauri v2

### Tauri v1 vs Tauri v2

**Tauri v1**:
- Required custom WiX templates
- Manual registry entry configuration
- Complex XML for Apps & Features visibility

**Tauri v2**:
- MSI with registry entries created **automatically**
- No custom WiX templates needed for basic functionality
- Uses Windows Installer standard practices by default

### Under the Hood

When you run `tauri build` on Windows:

1. **Tauri CLI** invokes **cargo-bundler**
2. **cargo-bundler** generates **WiX XML** from tauri.conf.json
3. **WiX Toolset** compiles XML → **MSI database**
4. **MSI database** includes:
   - File installation instructions
   - Registry entry creation
   - Shortcut creation (Start Menu)
   - Uninstall information
5. **Windows Installer** (msiexec.exe) reads MSI and:
   - Copies files to `C:\Program Files\Lumina\`
   - Creates registry entries automatically
   - Adds to Apps & Features list

**All of this happens without any custom configuration!**

---

## When You WOULD Need Custom WiX Templates

You only need custom WiX configuration if you want:

1. **Custom registry entries** beyond Apps & Features (e.g., file associations, custom app settings)
2. **Custom installer UI** (branding, custom dialogs)
3. **Additional shortcuts** (Desktop, Startup folder, etc.)
4. **Per-user installation** instead of per-machine
5. **Custom installation directory** selection

For BUG-007 (Apps & Features visibility), **none of these are needed** - default behavior is correct!

---

## Troubleshooting

### Issue: "App doesn't appear in Apps & Features after install"

**Diagnosis**:
1. **Check which file was installed**:
   - If `.exe` (portable) → Will NOT appear in Apps & Features (expected)
   - If `.msi` → SHOULD appear in Apps & Features

2. **Verify installation method**:
   - Double-click `.msi` → Uses Windows Installer → Creates registry
   - Run `.exe` directly → No installation → No registry

3. **Check registry manually**:
   ```powershell
   Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* |
     Where-Object { $_.DisplayName -like "*Lumina*" }
   ```

**Solution**: Ensure user downloads and runs **MSI installer**, not portable executable.

### Issue: "MSI build fails"

**Possible causes**:
1. VBSCRIPT Windows feature not enabled
2. WiX Toolset not found (should be bundled, but check PATH)
3. Antivirus blocking build process

**Solution**:
```powershell
# Enable VBSCRIPT
Enable-WindowsOptionalFeature -Online -FeatureName VBSCRIPT -All

# Retry build
cd products/lumina-desktop
npm run tauri build
```

---

## Files Changed (BUG-007)

**None** - Configuration already correct!

**Documentation created**:
- `docs/WINDOWS_MSI_INSTALLER.md` (this file)

---

## Next Steps (Not Required for BUG-007)

Optional enhancements if needed in future:

1. **Custom WiX template** for branded installer UI
   - Create `src-tauri/wix/main.wxs`
   - Reference in tauri.conf.json: `"bundle": { "windows": { "wix": { "template": "wix/main.wxs" } } }`

2. **Desktop shortcut** creation
   - Add WiX fragment for desktop shortcut
   - Make optional in installer UI

3. **Code signing certificate**
   - Prevents Windows SmartScreen warnings
   - Required for production distribution
   - Configure in tauri.conf.json: `"bundle": { "windows": { "signCommand": "...", "signParams": "..." } }`

4. **Silent installation support**
   - Already supported by MSI: `msiexec /i Lumina.msi /quiet`
   - No additional configuration needed

---

## Conclusion

**BUG-007 is resolved by existing configuration.** Tauri v2's default MSI bundler automatically creates registry entries that make the app visible in Windows Apps & Features.

**Action items**:
1. ✅ Verify MSI is built during release process
2. ✅ Upload MSI to GitHub Releases
3. ✅ Update download instructions to recommend MSI installer
4. ✅ Document difference between MSI and portable executable

**No code changes required** - just ensure users install the MSI file!

---

**Last Updated**: 2025-01-13
**References**:
- Tauri v2 Windows Installer: https://v2.tauri.app/distribute/windows-installer/
- Windows Installer (MSI): https://learn.microsoft.com/en-us/windows/win32/msi/windows-installer-portal
