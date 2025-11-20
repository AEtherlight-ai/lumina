# ÆtherLight Mac Support Strategy
**Version**: 0.18.5
**Status**: In Progress
**Created**: 2025-11-19
**Sprint**: 18.2.2 (v0.18.5 Critical Bugs + Mac Compatibility)

---

## Executive Summary

**Goal**: Achieve full feature parity between Windows and Mac platforms for ÆtherLight v0.18.5.

**Current State**: Extension partially works on Mac but has 2 critical issues blocking full functionality.

**Timeline**: 2-3 days (includes quick fix + desktop app build + testing)

**Impact**: Mac users gain full ÆtherLight functionality (VS Code extension + voice capture)

---

## Issues Found (Mac Compatibility Audit - 2025-11-19)

### Issue 1: PowerShell Terminal Hardcoding 🔴 CRITICAL
**Status**: ✅ Task Created (MAC-001)
**Location**: `vscode-lumina/src/commands/voicePanel.ts:1063`
**Problem**: Hardcoded `shellPath: 'powershell.exe'` breaks terminal creation on Mac
**Impact**: Extension unusable on Mac (cannot create ÆtherLight terminal)
**Root Cause**: Windows-specific shell hardcoded instead of letting VS Code auto-select
**Fix Time**: 15-30 minutes

**Current Code** (Broken on Mac):
```typescript
aetherlightTerminal = vscode.window.createTerminal({
    name: 'ÆtherLight Claude',
    shellPath: 'powershell.exe',  // ❌ Windows-only
    shellArgs: [
        '-NoExit',
        '-Command',
        '& { Write-Host "ÆtherLight Terminal Ready 🎤" -ForegroundColor Cyan }'
    ],
    location: vscode.TerminalLocation.Editor
});
```

**Fixed Code** (Cross-platform):
```typescript
aetherlightTerminal = vscode.window.createTerminal({
    name: 'ÆtherLight Claude',
    // ✅ No shellPath/shellArgs - VS Code auto-selects zsh/bash/PowerShell
    location: vscode.TerminalLocation.Editor
});
```

---

### Issue 2: No Mac Desktop App Binaries 🔴 CRITICAL
**Status**: ✅ Task Created (BUILD-001)
**Location**: GitHub releases (only Windows .exe and .msi exist)
**Problem**: No `.dmg` files for Mac (Intel or Apple Silicon)
**Impact**: Mac users cannot use voice transcription (requires desktop app)
**Root Cause**: Mac builds never created or published
**Build Time**: 4-6 hours (includes setup + build + testing)

**Required Outputs**:
- `Lumina_0.18.5_x64.dmg` (Intel Mac)
- `Lumina_0.18.5_aarch64.dmg` (Apple Silicon Mac)

**Build Location**: `products/lumina-desktop/target/release/bundle/dmg/`

---

## Sprint 18.2.2 Tasks (Complete Mac Support)

### Phase 1: Quick Fix (15-30 minutes)
**Task**: MAC-001 - Fix Terminal Creation
**Agent**: ui-agent
**Priority**: High (blocks basic Mac usage)
**Dependencies**: None
**Parallel**: Can work alongside bug fixes

**Steps**:
1. Open `vscode-lumina/src/commands/voicePanel.ts`
2. Navigate to line 1061 (`getTerminals` case)
3. Remove `shellPath: 'powershell.exe'` from `createTerminal()` call
4. Remove `shellArgs: [...]` array (platform-specific PowerShell commands)
5. Keep only: `name`, `location`
6. Compile: `npm run compile`
7. Test in Extension Development Host (F5)
8. Verify terminal creates with default shell (zsh/bash on Mac)

**Testing**:
- Mac: Terminal uses zsh/bash ✓
- Windows: Terminal still uses PowerShell ✓
- Linux: Terminal uses bash/zsh ✓
- Terminal name: "ÆtherLight Claude" ✓
- Terminal location: Editor area ✓

**After MAC-001**:
✅ Extension works on Mac (basic features)
✅ Users can send prompts to terminal
✅ Terminal integration functional
❌ Voice capture still unavailable (needs BUILD-001)

---

### Phase 2: Desktop App Build (4-6 hours)
**Task**: BUILD-001 - Build Mac Desktop Binaries
**Agent**: infrastructure-agent
**Priority**: High (enables voice capture)
**Dependencies**: None (can run parallel with MAC-001)
**Requirements**: Mac build environment (macOS + Xcode + Rust + Tauri CLI)

**Build Steps**:
1. **Setup Mac Build Environment** (1-2 hours if fresh setup)
   ```bash
   # Install Xcode Command Line Tools
   xcode-select --install

   # Install Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

   # Install Node.js (if not already installed)
   # Recommended: nvm or Homebrew

   # Install Tauri CLI
   cargo install tauri-cli
   ```

2. **Build Desktop App** (2-3 hours)
   ```bash
   cd products/lumina-desktop/

   # Install frontend dependencies
   npm install

   # Build for macOS (creates .dmg for both Intel and Apple Silicon)
   npm run tauri build

   # Outputs:
   # - target/release/bundle/dmg/Lumina_0.18.5_x64.dmg (Intel)
   # - target/release/bundle/dmg/Lumina_0.18.5_aarch64.dmg (Apple Silicon)
   ```

3. **Test Installation** (30-60 minutes)
   - Test on Intel Mac (or Rosetta on Apple Silicon)
   - Test on Apple Silicon Mac (native)
   - Verify app launches without errors
   - Verify microphone access prompt
   - Verify voice capture works
   - Verify Whisper transcription works
   - Verify IPC connection to VS Code extension

4. **Code Signing** (Optional, 30-60 minutes)
   ```bash
   # If you have Apple Developer account + certificates
   # Sign the app to avoid "unverified developer" warnings

   # See: https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution
   ```

5. **Publish to GitHub Releases** (15 minutes)
   ```bash
   # Upload .dmg files to GitHub release
   gh release upload v0.18.5 \
     target/release/bundle/dmg/Lumina_0.18.5_x64.dmg \
     target/release/bundle/dmg/Lumina_0.18.5_aarch64.dmg
   ```

**After BUILD-001**:
✅ Mac desktop app available for download
✅ Mac users can install from .dmg
✅ Voice capture works on Mac
✅ Full feature parity with Windows

---

## Architecture Review (Mac Compatibility)

### ✅ Already Cross-Platform

These parts of the codebase are already Mac-compatible:

1. **Platform Detection** (`extension.ts:160-210`)
   ```typescript
   const platform = process.platform;
   if (platform === 'darwin') {
       // Mac-specific paths
       executableName = 'Lumina Desktop.app';
       // ...
   }
   ```

2. **Terminal Creation** (Most places)
   - `spawner.ts:74` ✅ No shellPath
   - `PromptTerminalManager.ts:47` ✅ No shellPath
   - `updateChecker.ts:211` ✅ No shellPath
   - `enhanceTerminalInput.ts:226` ✅ No shellPath

3. **Sprint TOML Parsing** (`SprintLoader.ts`)
   - Uses Node.js `fs` module (cross-platform)
   - No PowerShell/Windows-specific commands
   - Works on all platforms

4. **File System Operations**
   - All use Node.js path/fs modules (cross-platform)

### ❌ Mac-Incompatible (Fixed in This Sprint)

1. **Terminal Creation** (`voicePanel.ts:1063`) ❌ → MAC-001 fixes this
2. **Desktop App Binaries** (GitHub releases) ❌ → BUILD-001 adds Mac builds

---

## Testing Matrix

### Terminal Creation (MAC-001)
| Platform | Shell | Expected | Status |
|----------|-------|----------|--------|
| Windows | PowerShell | ✅ Works | Need test |
| Windows | CMD | ✅ Works | Need test |
| Mac Intel | zsh | ✅ Works | Need test |
| Mac Intel | bash | ✅ Works | Need test |
| Mac M1/M2 | zsh | ✅ Works | Need test |
| Linux | bash | ✅ Works | Need test |

### Desktop App (BUILD-001)
| Platform | Architecture | Expected | Status |
|----------|--------------|----------|--------|
| Mac Intel | x64 | ✅ Works | Need build |
| Mac M1/M2 | aarch64 | ✅ Works | Need build |
| Mac M1/M2 | x64 (Rosetta) | ✅ Works | Need test |

### Voice Capture (BUILD-001)
| Platform | Feature | Expected | Status |
|----------|---------|----------|--------|
| Mac | Microphone access | ✅ Works | Need test |
| Mac | Voice capture | ✅ Works | Need test |
| Mac | Whisper transcription | ✅ Works | Need test |
| Mac | IPC to extension | ✅ Works | Need test |
| Mac | Global hotkeys | ✅ Works | Need test |

---

## Dependencies & Requirements

### MAC-001 (Terminal Fix)
**Required**:
- TypeScript knowledge
- VS Code Extension API knowledge
- 15-30 minutes

**No external dependencies**

### BUILD-001 (Desktop App)
**Required**:
- **Mac hardware** (macOS machine or cloud Mac instance)
- **Xcode Command Line Tools**
- **Rust toolchain** (`rustc`, `cargo`)
- **Node.js** (v18+)
- **Tauri CLI** (`cargo install tauri-cli`)
- 4-6 hours

**Optional**:
- Apple Developer account (for code signing)
- Certificates (for notarization)

---

## Release Plan (v0.18.5)

### Release Artifacts

**Before This Sprint** (Windows only):
- `aetherlight-0.18.5.vsix` (VS Code extension)
- `Lumina_0.18.5_x64_en-US.msi` (Windows installer)
- `Lumina_0.18.5_x64-setup.exe` (Windows portable)

**After This Sprint** (Windows + Mac):
- `aetherlight-0.18.5.vsix` (VS Code extension) ← Updated with MAC-001 fix
- `Lumina_0.18.5_x64_en-US.msi` (Windows installer)
- `Lumina_0.18.5_x64-setup.exe` (Windows portable)
- **`Lumina_0.18.5_x64.dmg`** (Mac Intel) ← NEW
- **`Lumina_0.18.5_aarch64.dmg`** (Mac Apple Silicon) ← NEW

### Release Notes (v0.18.5)

```markdown
## v0.18.5 - Mac Compatibility Release (2025-11-XX)

### 🎉 Mac Support
- **NEW**: Mac desktop app binaries (.dmg for Intel and Apple Silicon)
- **FIXED**: Extension now works on macOS (removed Windows-only terminal code)
- **FEATURE**: Full voice capture support on Mac (CoreAudio integration)
- **PARITY**: Feature parity achieved between Windows and Mac

### 🐛 Bug Fixes
- Fixed Sprint TOML parsing error (brackets in templates) (BUG-001)
- Fixed "Start This Task" template loading (BUG-002)
- Fixed welcome message not appearing (BUG-003)
- Investigated and resolved console warnings (BUG-004)

### 📚 Documentation
- Updated README with Mac installation instructions
- Added Mac build guide (BUILD-001 deliverables)
- Updated CHANGELOG with all changes

### 🏗️ Infrastructure
- Cross-platform terminal creation (MAC-001)
- Mac build pipeline documentation (BUILD-001)

**Download**:
- **Mac (Intel)**: `Lumina_0.18.5_x64.dmg`
- **Mac (Apple Silicon)**: `Lumina_0.18.5_aarch64.dmg`
- **Windows**: `Lumina_0.18.5_x64-setup.exe` or `.msi`
- **Extension**: Install from VS Code Marketplace or manual `.vsix`
```

---

## Success Criteria

### MAC-001 Success
- [  ] shellPath removed from `voicePanel.ts:1063`
- [  ] Terminal creates successfully on Mac
- [  ] Terminal uses default shell (zsh/bash on Mac)
- [  ] Terminal still works on Windows (PowerShell/CMD)
- [  ] No platform-specific code in terminal creation
- [  ] Extension activates without errors on Mac

### BUILD-001 Success
- [  ] Mac build environment set up
- [  ] `.dmg` files created for both architectures
- [  ] Intel .dmg tested on Intel Mac
- [  ] Apple Silicon .dmg tested on M1/M2 Mac
- [  ] Desktop app launches without errors
- [  ] Voice capture works on Mac
- [  ] Whisper transcription works on Mac
- [  ] Extension detects desktop app via IPC
- [  ] Release workflow includes Mac builds

### Complete Mac Support Success
- [  ] All MAC-001 criteria met
- [  ] All BUILD-001 criteria met
- [  ] v0.18.5 released with Mac binaries
- [  ] Mac users report successful installation
- [  ] Mac users report voice capture working
- [  ] No Mac-specific bugs reported
- [  ] Documentation complete (README, PUBLISHING.md)

---

## Timeline Estimate

| Phase | Task | Time | Cumulative |
|-------|------|------|------------|
| **Phase 1** | MAC-001: Terminal fix | 15-30 min | 30 min |
| **Phase 1** | Compile + Test MAC-001 | 15 min | 45 min |
| **Phase 1** | Commit + PR | 15 min | 1 hour |
| **Phase 2** | Setup Mac build environment | 1-2 hours | 3 hours |
| **Phase 2** | BUILD-001: Build desktop app | 2-3 hours | 6 hours |
| **Phase 2** | Test on Intel Mac | 30 min | 6.5 hours |
| **Phase 2** | Test on Apple Silicon Mac | 30 min | 7 hours |
| **Phase 2** | Code signing (optional) | 30-60 min | 8 hours |
| **Phase 2** | Upload to GitHub release | 15 min | 8.25 hours |
| **Phase 3** | Documentation updates | 1 hour | 9.25 hours |
| **Phase 3** | Release v0.18.5 | 30 min | 10 hours |

**Total Time**: ~10 hours (1.25 days)

**With setup overhead**: 2-3 days (includes Mac machine access, first-time Rust install, etc.)

---

## Next Steps (Immediate Actions)

### Step 1: Start MAC-001 (Do Now)
```bash
# 1. Open file
code vscode-lumina/src/commands/voicePanel.ts

# 2. Navigate to line 1061 (getTerminals case)

# 3. Remove shellPath and shellArgs:
# BEFORE (lines 1061-1070):
# aetherlightTerminal = vscode.window.createTerminal({
#     name: 'ÆtherLight Claude',
#     shellPath: 'powershell.exe',
#     shellArgs: [...],
#     location: vscode.TerminalLocation.Editor
# });

# AFTER (simplified):
# aetherlightTerminal = vscode.window.createTerminal({
#     name: 'ÆtherLight Claude',
#     location: vscode.TerminalLocation.Editor
# });

# 4. Compile
npm run compile

# 5. Test (F5 in VS Code)
# 6. Commit
git add vscode-lumina/src/commands/voicePanel.ts
git commit -m "fix(mac): Remove PowerShell hardcoding for cross-platform terminal creation"
```

### Step 2: Prepare for BUILD-001
```bash
# If on Mac machine:
# 1. Install Xcode Command Line Tools
xcode-select --install

# 2. Install Rust (if not installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 3. Install Tauri CLI
cargo install tauri-cli

# 4. Ready to build!
cd products/lumina-desktop/
npm install
npm run tauri build
```

---

## Risk Assessment

### Low Risk
- **MAC-001** (Terminal fix)
  - Simple code change (remove 2 parameters)
  - Well-tested pattern (used elsewhere in codebase)
  - Easy to revert if issues
  - Fast to implement (15-30 min)

### Medium Risk
- **BUILD-001** (Desktop app build)
  - Requires Mac hardware (may need cloud Mac or physical machine)
  - Build time investment (4-6 hours)
  - First-time Mac build (potential for platform-specific issues)
  - Code signing optional (can skip for first release)

### Mitigation Strategies
- **MAC-001**: Test on Windows first to ensure no regression
- **BUILD-001**: Use unsigned .dmg for first release (users can allow in System Preferences)
- **BUILD-001**: Test on both Intel and Apple Silicon before release
- **BUILD-001**: Document build process for future releases

---

## References

**Sprint File**: `internal/sprints/ACTIVE_SPRINT_v0.18.5_BUGS.toml`

**Related Tasks**:
- MAC-001: `internal/sprints/ACTIVE_SPRINT_v0.18.5_BUGS.toml` (line 1888)
- BUILD-001: `internal/sprints/ACTIVE_SPRINT_v0.18.5_BUGS.toml` (line 573)

**Code Locations**:
- Terminal hardcoding: `vscode-lumina/src/commands/voicePanel.ts:1063`
- Platform detection: `vscode-lumina/src/extension.ts:160-210`
- Desktop app: `products/lumina-desktop/`
- Tauri config: `products/lumina-desktop/src-tauri/tauri.conf.json`

**Documentation**:
- Tauri macOS setup: https://tauri.app/v1/guides/building/macos
- VS Code extension: https://code.visualstudio.com/api/get-started/your-first-extension
- ÆtherLight Mac setup: `vscode-lumina/MAC_SETUP.md`

---

**Status**: Ready to execute
**Next Action**: Start MAC-001 (terminal fix)
**Estimated Completion**: 2-3 days (with Mac build environment setup)
