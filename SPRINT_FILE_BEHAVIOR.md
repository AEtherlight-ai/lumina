# Sprint File Behavior Reference

## How the Extension Handles Different Scenarios

### Scenario 1: File Doesn't Exist (First Time)
```
State: internal/sprints/ACTIVE_SPRINT.toml does not exist
Action: ✅ Auto-creates template file with example task
Result: Sprint features work immediately
User Sees: "Created template sprint file" notification with "Open Sprint File" button
```

### Scenario 2: File Has Syntax Error
```
State: File exists but has invalid TOML syntax
Action: ✅ Preserves file, shows error message
Result: Sprint features disabled until syntax fixed
User Sees: "Sprint file has syntax error: [details]" with "Open Sprint File" button
Behavior: ❌ NEVER DELETES THE FILE - Your work is safe!
Throttling: Shows error max once per 30 seconds (prevents spam)
```

### Scenario 3: File is Empty
```
State: File exists but is empty (0 bytes)
Action: ✅ Preserves file, shows parsing error
Result: Sprint features disabled until content added
User Sees: "Sprint file has syntax error" with "Open Sprint File" button
Behavior: ❌ NEVER DELETES THE FILE
```

### Scenario 4: File is Valid
```
State: File exists and has valid TOML
Action: ✅ Loads tasks and metadata
Result: Sprint features work normally
User Sees: Sprint tab shows tasks, progress, etc.
```

### Scenario 5: User Deletes File While Running
```
State: File existed, user deletes it
Action: ✅ Auto-creates new template on next load
Result: Sprint features work with fresh template
User Sees: "Created template sprint file" notification
Note: This is intentional - user deleted it, so we give them a fresh start
```

### Scenario 6: File Watcher Detects Changes
```
State: File is modified externally
Action: ✅ Reloads sprint data automatically
Result: UI updates within 500ms (debounced)
User Sees: Sprint tab refreshes with new data
Errors: If syntax error introduced, shows ONE error message (throttled)
```

## Key Safety Rules

### ❌ NEVER HAPPENS
- Deleting an existing file due to syntax errors
- Overwriting user's work
- Infinite error notification loops
- Losing sprint task data

### ✅ ALWAYS HAPPENS
- File preservation when errors occur
- Error throttling (30 second cooldown)
- Helpful error messages with recovery actions
- Auto-creation only when file truly missing

## Dev Mode vs Production Mode

### Dev Mode (`"aetherlight.devMode": true`)

**Path Resolution:**
1. `internal/sprints/ACTIVE_SPRINT.toml` (preferred)
2. `sprints/ACTIVE_SPRINT.toml` (fallback)

**Auto-Creation:**
- Creates `internal/sprints/ACTIVE_SPRINT.toml` if both missing

**Use Case:**
- Developing AetherLight itself
- Dogfooding with internal sprints
- Keeping dev work out of git

### Production Mode (`"aetherlight.devMode": false`)

**Path Resolution:**
1. `sprints/ACTIVE_SPRINT.toml` ONLY

**Auto-Creation:**
- Creates `sprints/ACTIVE_SPRINT.toml` if missing

**Use Case:**
- Testing production user experience
- Verifying extension behavior for customers
- Release validation

## Error Messages Explained

### "Sprint file has syntax error: ..."
**Cause:** Invalid TOML syntax (missing quote, unclosed bracket, etc.)
**Action:** Click "Open Sprint File" → Fix syntax → Save
**Safety:** Your file is preserved, nothing deleted

### "Created template sprint file at ..."
**Cause:** No sprint file existed
**Action:** Click "Open Sprint File" → Customize template
**Safety:** New file created, nothing overwritten

### No Message (Silent)
**Cause:** File loaded successfully
**Action:** None needed - sprint features working
**Safety:** Everything working correctly

## Best Practices

### For Users
1. **Backup important sprints** - Use git to track sprint file changes
2. **Fix syntax errors promptly** - Click "Open Sprint File" when errors occur
3. **Use TOML validator** - Check syntax before saving large changes
4. **Test in dev mode first** - Verify changes work before production

### For Developers
1. **Never delete existing files** - Only create when truly missing
2. **Throttle error messages** - Prevent notification spam
3. **Provide recovery actions** - Always offer "Open Sprint File" button
4. **Validate before ship** - Test both dev and production modes

## Code Flow

```
Extension Loads
    ↓
resolveSprintFilePath()
    ↓
File exists?
    YES → loadSprint() → Parse TOML
              ↓
         Parse success?
              YES → Load tasks, show UI ✅
              NO → Show error, preserve file ✅
    NO → createDefaultSprintFile() → Create template ✅
```

## Summary

The extension is designed with **safety first**:
- ✅ Auto-creates missing files
- ✅ Preserves existing files always
- ✅ Throttles error notifications
- ✅ Provides helpful recovery actions
- ✅ Never loses user's work

**You can't lose your sprint data!** 🎉
