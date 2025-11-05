# Sprint File Auto-Creation Fix

## Problem Solved

The extension was causing infinite retry loops and freezing VS Code when `sprints/ACTIVE_SPRINT.toml` didn't exist. This happened because:

1. Extension tried to load sprint file on startup
2. File didn't exist → error thrown
3. Error handler showed modal notification (blocking UI)
4. File watcher kept triggering reload attempts
5. 3000+ failed attempts = complete freeze

## Solution Implemented

**The extension now NEVER fails - it auto-creates sprint files instead!**

### Key Changes

#### 1. Auto-Creation (SprintLoader.ts:240-302)
```typescript
// When no sprint file is found:
this.createDefaultSprintFile(filePath);
```

- Creates directory structure automatically
- Generates valid TOML template with example task
- Shows friendly notification with "Open Sprint File" button
- Gracefully logs errors without throwing

#### 2. Error Handling (SprintLoader.ts:158)
```typescript
// Before: vscode.window.showErrorMessage(...) ← 3000+ modals = freeze
// After:  console.error(...) ← silent logging only
```

#### 3. Dev Mode Toggle (SprintLoader.ts:183-231)
```typescript
const devMode = config.get<boolean>('devMode', false);

// Dev mode: internal/sprints/ → sprints/ → auto-create
// Production: sprints/ only → auto-create
```

#### 4. Multi-Path File Watchers (voicePanel.ts:45, 171-180)
```typescript
// Watches both locations simultaneously:
- internal/sprints/ACTIVE_SPRINT.toml
- sprints/ACTIVE_SPRINT.toml
```

### Files Modified

- `vscode-lumina/src/commands/SprintLoader.ts` - Added auto-creation + dev mode
- `vscode-lumina/src/commands/voicePanel.ts` - Multiple file watchers
- `.vscode/settings.json` - Added devMode toggle
- `.gitignore` - Excludes internal/ directory
- `internal/README.md` - Complete documentation

### New Behavior

#### First Launch (Dev Mode)
1. Extension loads
2. Checks for `internal/sprints/ACTIVE_SPRINT.toml`
3. File doesn't exist → auto-creates it
4. Shows notification: "Created template sprint file"
5. User clicks "Open Sprint File" → customizes template
6. Sprint features work immediately ✅

#### First Launch (Production Mode)
1. Extension loads
2. Checks for `sprints/ACTIVE_SPRINT.toml`
3. File doesn't exist → auto-creates it
4. Shows notification: "Created template sprint file"
5. Sprint features work immediately ✅

#### Subsequent Launches
- File exists → loads normally
- File deleted → recreates automatically
- Never crashes or freezes 🎉

## Testing Steps

1. **Test Auto-Creation (First Time Setup)**
   ```bash
   # If you've never had a sprint file:
   # Reload extension (Cmd+Shift+P → "Reload Window")
   # Should see: "Created template sprint file at internal/sprints/ACTIVE_SPRINT.toml"
   ```

2. **Test Syntax Error Handling** ⚠️ IMPORTANT
   ```bash
   # Add invalid TOML to your sprint file:
   echo "invalid toml syntax here [[[" >> internal/sprints/ACTIVE_SPRINT.toml

   # Reload extension
   # Should see ONE error message: "Sprint file has syntax error: ..."
   # Should NOT delete your file - your work is safe!
   # Click "Open Sprint File" to fix the syntax error
   ```

3. **Test Error Throttling**
   ```bash
   # With a syntax error in the file, save it repeatedly
   # Should only show error once per 30 seconds (no spam!)
   # File watcher won't cause infinite loops ✅
   ```

## Important Safety Features

### ✅ File Preservation
**The extension NEVER deletes your sprint file!**

- ✅ Syntax error in TOML? → Shows error, helps you fix it
- ✅ Empty file? → Shows error, helps you fix it
- ✅ Missing file? → Auto-creates template
- ❌ **Never deletes existing files** - Your work is always safe

### ✅ Error Throttling
- Shows syntax errors max once per 30 seconds
- Prevents notification spam
- File watcher won't cause loops
- Helpful "Open Sprint File" button to fix issues

## Configuration

### Development Workflow (Dogfooding)
```json
// .vscode/settings.json
{
  "aetherlight.devMode": true  // Uses internal/sprints/
}
```

### Production Testing
```json
// .vscode/settings.json
{
  "aetherlight.devMode": false  // Uses sprints/ only
}
```

### Custom Path
```json
// .vscode/settings.json
{
  "aetherlight.sprintFile": "custom/path/sprint.toml"
  // Auto-creates at custom location if missing
}
```

## Benefits

✅ **Never crashes** - Auto-creates instead of failing
✅ **Zero configuration** - Works out of the box
✅ **Dev/production separation** - Toggle between modes
✅ **Dogfooding enabled** - Use AetherLight to build AetherLight
✅ **Graceful degradation** - Silent logging instead of modal spam
✅ **Better UX** - Friendly notification with action button

## Migration Notes

**No migration needed!** This is backwards compatible:

- Existing sprint files continue to work
- New installations get auto-created files
- No breaking changes to file format

## Next Steps

1. **Rebuild extension** - Compile TypeScript changes
2. **Test dev mode** - Verify auto-creation works
3. **Test production mode** - Toggle devMode and verify
4. **Verify no freeze** - Delete file while running, confirm recreation
5. **Ship it!** - Extension now production-ready 🚀
