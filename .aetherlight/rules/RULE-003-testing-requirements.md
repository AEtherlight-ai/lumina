# RULE-003: Testing Requirements

**Status:** ENFORCED
**Created:** 2025-10-31
**Severity:** HIGH

## Rule Statement

ALL changes MUST be tested before committing. NO exceptions.

## Minimum Testing Checklist

### Before ANY Commit:
```bash
# 1. Compile TypeScript
cd vscode-lumina && npm run compile
# ✅ Must complete without errors

# 2. Test in Extension Host
# Press F5 in VS Code
# ✅ Extension must activate
# ✅ No errors in Output panel
# ✅ Test changed functionality

# 3. For UI changes:
# - Open affected panels
# - Click all buttons
# - Verify visual appearance
```

### Before Publishing:
```bash
# 4. Package and test .vsix
vsce package
code --install-extension aetherlight-[version].vsix

# 5. Test critical paths:
# ✅ Extension activates
# ✅ Voice panel opens (backtick)
# ✅ Commands work (Cmd+Shift+P)
# ✅ Sprint panel loads
# ✅ No console errors
```

## Testing Matrix

| Change Type | Required Testing |
|------------|-----------------|
| Bug fix | Compile + Extension Host + Specific fix verification |
| New feature | Full test suite + Manual testing |
| UI change | Visual testing + All interactions |
| Publishing | Package test + Install test + Smoke tests |

## Skip Testing = Build Failure

The publish script will enforce:
- TypeScript compiles
- No TypeScript errors
- Package builds successfully

## Reference Incidents

- **v0.13.23**: No packaged testing → 9-hour outage
- **v0.13.29**: No dependency testing → Users couldn't install