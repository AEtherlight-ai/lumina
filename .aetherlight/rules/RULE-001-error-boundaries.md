# RULE-001: Mandatory Error Boundaries

**Status:** ENFORCED
**Created:** 2025-10-31
**Severity:** CRITICAL

## Rule Statement

ALL code that can throw exceptions MUST be wrapped in try-catch blocks with proper error handling.

## Applies To

- File parsing (JSON, TOML, YAML, etc.)
- API calls
- File system operations
- Extension initialization
- Command handlers
- WebView creation

## Required Pattern

```typescript
// ❌ FORBIDDEN - Will crash extension
const data = toml.parse(content);

// ✅ REQUIRED - Graceful error handling
try {
    const data = toml.parse(content);
} catch (error) {
    console.error('Parse error:', error);
    vscode.window.showErrorMessage(`Error: ${error.message}`);
    return defaultValue; // Continue with defaults
}
```

## Enforcement

Before ANY commit:
1. Search for uncaught operations: `grep -r "parse(" --include="*.ts" | grep -v "try"`
2. Search for uncaught file ops: `grep -r "readFileSync\|writeFileSync" --include="*.ts" | grep -v "try"`
3. ALL matches must be wrapped in try-catch

## Violations

Committing code without error boundaries is a CRITICAL violation requiring immediate fix.

## Reference Incident

**BUG-012 (2025-10-31)**: Duplicate task ID crashed entire VS Code instance due to missing error boundary on toml.parse()
- Time lost: 9+ hours
- Impact: Complete VS Code failure
- Root cause: No try-catch around parsing