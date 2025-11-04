# Project Instructions - Claude Code

**Project:** [Your Project Name]
**Last Updated:** [Date]

---

## Project Overview

[Brief description of your project]

**Tech Stack:**
- [Language/Framework 1]
- [Language/Framework 2]
- [Key dependencies]

---

## Critical Rules

### Code Quality

1. **Always compile before testing:**
   ```bash
   # Add your build command here
   npm run build
   ```

2. **Pattern for code:**
   - Add Chain of Thought comments explaining WHY
   - Reference related files and patterns
   - Document design decisions

3. **Testing:**
   - **TDD REQUIRED (Test-Driven Development)**
   - Test in your development environment
   - Verify all features work

### Test-Driven Development (TDD) - MANDATORY

**CRITICAL: All code changes MUST follow Test-Driven Development**

**TDD Workflow (Red-Green-Refactor):**
1. **RED:** Write test FIRST → Run → Test FAILS (expected)
2. **GREEN:** Implement minimum code to pass → Run → Test PASSES
3. **REFACTOR:** Improve code → Run → Test STILL PASSES
4. **COMMIT:** Tests + implementation together

**Pre-Publish Checklist:**
- [ ] All tests passing
- [ ] Test coverage ≥ 80%
- [ ] No skipped tests
- [ ] No TODO tests

---

## Project Structure

```
your-project/
├── src/                 # Source code
├── tests/               # Test files
├── .claude/             # Claude Code context
│   ├── CLAUDE.md        # This file
│   └── skills/          # Custom skills
├── scripts/             # Validation scripts
└── package.json         # Dependencies
```

---

## Common Tasks

### Running Tests

```bash
# Add your test command here
npm test
```

### Building Project

```bash
# Add your build command here
npm run build
```

### Starting Development Server

```bash
# Add your dev server command here
npm run dev
```

---

## Design Patterns

### Pattern-TDD-001: Test-Driven Development
Always write tests first, then implement to make them pass.

### Pattern-VALIDATION-001: Pre-Commit Validation
Run validation scripts before committing to catch issues early.

---

## Git Workflow

### Committing Changes

```bash
# Stage changes
git add .

# Commit (pre-commit hook runs validators)
git commit -m "feat: description of changes"

# Push to remote
git push
```

### Pre-Commit Hooks

The `.git/hooks/pre-commit` hook runs automatically before each commit to:
- Validate code compiles
- Check test coverage ≥80%
- Verify git workflow state

**Bypass (NOT RECOMMENDED):**
```bash
git commit --no-verify
```

---

## Known Issues & Fixes

[Document known issues and their solutions here]

---

## Questions?

- Check project documentation
- Review test files for examples
- Check `.claude/skills/` for custom commands

---

**Remember:** Follow TDD workflow for all code changes. Write tests first!
