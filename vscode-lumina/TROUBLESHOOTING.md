# ÆtherLight Extension Troubleshooting Guide

**VERSION:** 1.0
**LAST UPDATED:** 2025-10-21

---

## Common Issues

### Extension Not Loading / Commands Not Found

**Symptoms:**
- Terminal profile provider not registered
- Commands like `aetherlight.openVoicePanel` not found
- Activity Feed or Voice Panel not showing

**Root Cause:**
The extension uses native modules (robotjs) that must be rebuilt for the specific Electron version used by VS Code. When VS Code updates, the Electron version changes, breaking native modules.

**Solution:**

1. **Rebuild native modules:**
   ```bash
   cd vscode-lumina
   npm run rebuild
   ```

2. **Recompile the extension:**
   ```bash
   npm run compile
   ```

3. **Reload VS Code:**
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "Developer: Reload Window"
   - Press Enter

4. **Verify extension loaded:**
   - Check for ÆtherLight icon in activity bar (left sidebar)
   - Try pressing `` ` `` (backtick) to open voice panel
   - Check status bar for Æ icon

**Prevention:**
The extension now automatically rebuilds native modules when you run `npm run compile`. If you update VS Code and the extension stops working, just run:
```bash
cd vscode-lumina && npm run compile
```

---

### Activity Feed Not Showing

**Symptoms:**
- Activity Feed view missing from Explorer sidebar

**Root Cause:**
The Activity Feed requires real-time sync to be enabled in settings.

**Solution:**

1. **Enable real-time sync:**
   - Press `Ctrl+,` (or `Cmd+,` on Mac) to open Settings
   - Search for "aetherlight sync enabled"
   - Check the box for "Aetherlight › Sync: Enabled"

2. **Or via settings.json:**
   ```json
   {
     "aetherlight.sync.enabled": true
   }
   ```

3. **Reload VS Code** (Ctrl+Shift+P → "Developer: Reload Window")

---

### Voice Recording Not Working

**Symptoms:**
- Clicking record button does nothing
- Microphone permission errors

**Root Cause:**
Browser/webview needs microphone permissions.

**Solution:**

1. **Grant microphone permissions:**
   - When prompted, allow microphone access
   - On Windows: Check Windows Settings → Privacy → Microphone
   - On Mac: Check System Preferences → Security & Privacy → Microphone

2. **Verify OpenAI API key:**
   - Press `Ctrl+,` to open Settings
   - Search for "aetherlight whisper"
   - Set "Aetherlight › Whisper: Api Key"

---

### Keyboard Simulation Not Typing

**Symptoms:**
- Transcription appears in Voice panel but not typed into text fields
- robotjs errors in console

**Root Cause:**
robotjs not rebuilt for current Electron version, or permissions issue.

**Solution:**

1. **Rebuild robotjs:**
   ```bash
   cd vscode-lumina
   npm run rebuild
   npm run compile
   ```

2. **On Mac: Grant accessibility permissions:**
   - System Preferences → Security & Privacy → Privacy → Accessibility
   - Add VS Code to allowed apps

3. **Reload VS Code**

---

### Extension Compilation Errors

**Symptoms:**
- TypeScript errors when running `npm run compile`
- Extension fails to activate

**Root Cause:**
Missing dependencies or TypeScript version mismatch.

**Solution:**

1. **Clean install dependencies:**
   ```bash
   cd vscode-lumina
   rm -rf node_modules
   rm package-lock.json
   npm install
   npm run compile
   ```

2. **Check TypeScript version:**
   ```bash
   npm list typescript
   ```
   Should be ^5.0.0 or compatible with VS Code 1.85+

---

## Debugging Tools

### View Extension Logs

1. **Open VS Code Developer Tools:**
   - Press `Ctrl+Shift+I` (or `Cmd+Shift+I` on Mac)
   - Or: Help → Toggle Developer Tools

2. **Check Console tab:**
   - Look for `[ÆtherLight]` or `[Lumina]` log messages
   - Check for errors (red text)

3. **Check Extension Host logs:**
   - Press `Ctrl+Shift+P`
   - Type "Developer: Show Logs"
   - Select "Extension Host"

### Test Extension Loading

1. **Check extension is installed:**
   ```
   Ctrl+Shift+P → "Extensions: Show Installed Extensions"
   Search for "ÆtherLight"
   ```

2. **Check extension is activated:**
   - Open Developer Tools (Ctrl+Shift+I)
   - Console tab → Type: `vscode.extensions.getExtension('aetherlight.aetherlight')`
   - Should return extension object (not undefined)

3. **Check registered commands:**
   - Console tab → Type: `vscode.commands.getCommands()`
   - Search for "aetherlight" in results

---

## Contact & Support

If these solutions don't resolve your issue:

1. **Check GitHub Issues:** [AEtherlight-ai/lumina/issues](https://github.com/AEtherlight-ai/lumina/issues)
2. **File a new issue** with:
   - VS Code version (Help → About)
   - Extension version
   - Operating system
   - Console error logs (from Developer Tools)
   - Steps to reproduce

---

**PATTERN:** Pattern-SUPPORT-001 (Extension Troubleshooting Guide)
**RELATED:** README.md, KEYBOARD_SIMULATION_IMPLEMENTATION.md
**STATUS:** Living Document (update as new issues discovered)
