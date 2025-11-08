# ÆtherLight Project - Claude Code Instructions

**Project:** ÆtherLight (Voice-to-intelligence platform for developers)
**Last Updated:** 2025-01-06 (v2.0 - Pattern-based refactoring)

---

## ⚠️ PRE-FLIGHT CHECKLIST (MANDATORY - READ BEFORE EVERY EDIT/WRITE)

**CRITICAL: You MUST complete this checklist BEFORE using Edit or Write tools.**

**Pattern-VALIDATION-001 Enforcement: If you skip this checklist, you WILL break the system.**

### Before Modifying ACTIVE_SPRINT.toml:

**STOP. Answer these questions OUT LOUD in your response:**

1. ✅ **Did I read `SprintLoader.ts:292-333` to verify the parser format?**
   - If NO → Read it NOW before proceeding
   - Expected format: `[tasks.TASK-ID]` NOT `[[epic.*.tasks]]`

2. ✅ **Did I check an existing task in ACTIVE_SPRINT.toml for format example?**
   - If NO → Read one task NOW (lines 72-150)
   - Copy the exact structure, don't invent

3. ✅ **Did I validate required fields are present?**
   - Required: id, name, status, phase, agent, estimated_time, dependencies
   - If missing any → Add them before proceeding

4. ✅ **Did I check for template literals in code examples?**
   - Search for: backticks with ${}
   - If found → Replace with string concatenation (+ operator)
   - Example: `` `Error: ${msg}` `` → `'Error: ' + msg`

5. ✅ **Did I validate the TOML will parse?**
   - If NO → Run: `node scripts/validate-sprint-schema.js` BEFORE committing
   - If script doesn't exist yet → Use: `node -e "const toml = require('@iarna/toml'); toml.parse(require('fs').readFileSync('internal/sprints/ACTIVE_SPRINT.toml', 'utf-8'));"`

**If you answered NO to ANY question, STOP and complete it NOW.**

### Before Adding Dependencies to package.json:

**STOP. Answer these questions OUT LOUD in your response:**

1. ✅ **Is this a native dependency?**
   - Check for: node-gyp, napi, bindings, .node, robotjs, @nut-tree-fork
   - If YES → **FORBIDDEN** - Use VS Code APIs instead
   - See: Pattern-PUBLISH-003 in docs/patterns/

2. ✅ **Is this a runtime npm dependency?**
   - Check for: glob, lodash, moment, axios, chalk, colors
   - If YES → **FORBIDDEN** - Use Node.js built-ins instead
   - Exception: Whitelisted (@iarna/toml, form-data, node-fetch, ws)

3. ✅ **Did I check the whitelist?**
   - Allowed: aetherlight-analyzer, aetherlight-sdk, aetherlight-node
   - Allowed: @iarna/toml, form-data, node-fetch, ws
   - Everything else → Use built-ins (fs, path, util, crypto, https)

**If you're adding a forbidden dependency, STOP and find an alternative NOW.**

### Before Using Edit/Write Tools:

**STOP. Answer these questions OUT LOUD in your response:**

1. ✅ **Did I read the target file first?**
   - If NO → Read it NOW with Read tool
   - Never edit a file you haven't read in this session

2. ✅ **Did I verify the format/structure I'm following?**
   - If NO → Read the parser/loader code that will read this file
   - Never guess the format

3. ✅ **Am I following an existing pattern?**
   - If NO → Search for similar code and copy the pattern
   - Never invent new patterns without user approval

**If you answered NO to ANY question, STOP and complete it NOW.**

---

## Enforcement Mechanism

**This checklist is NOT optional. It is MANDATORY.**

**Historical bugs caused by skipping this checklist:**
- **2025-11-03:** Used `[[epic.*.tasks]]` instead of `[tasks.ID]` → Sprint panel broken (2 hours debugging)
- **v0.15.31-32:** Added `glob` runtime dependency → Extension activation failed (2 hours debugging)
- **v0.13.23:** Added `@nut-tree-fork/nut-js` native dependency → Extension broken (9 hours debugging)
- **v0.13.28, v0.13.29:** Version mismatch → User installs broken (2 hours debugging)

**Total time wasted: 15+ hours**

**If you skip this checklist, you WILL break something. User WILL be frustrated. Time WILL be wasted.**

**Your commitment: I will answer these questions OUT LOUD in my response BEFORE using Edit/Write tools.**

---

## 📋 Project Overview

ÆtherLight is a VS Code extension + desktop app providing:
- Voice capture and transcription (Whisper API)
- Pattern matching to prevent AI hallucinations
- Real-time context sync
- Sprint management and workspace analysis

**Tech Stack:**
- VS Code Extension: TypeScript 5.3.3
- Desktop App: Tauri (Rust + TypeScript)
- Packages: Node.js, native bindings (NAPI)
- VS Code API: ^1.80.0
- Node.js: >=18.0.0

---

## 📚 Pattern Library (Complete Reference)

All detailed protocols are now in `docs/patterns/`. Reference them for deep dives.

### 🔄 Workflow Protocols (Always Follow These)

| Pattern | Purpose | When to Use |
|---------|---------|-------------|
| **[Pattern-TASK-ANALYSIS-001](../docs/patterns/Pattern-TASK-ANALYSIS-001.md)** | 8-step pre-task analysis | Before starting ANY task |
| **[Pattern-CODE-001](../docs/patterns/Pattern-CODE-001.md)** | Code development workflow | Before writing ANY code |
| **[Pattern-SPRINT-PLAN-001](../docs/patterns/Pattern-SPRINT-PLAN-001.md)** | Sprint planning process | Before creating ANY sprint |
| **[Pattern-SPRINT-TEMPLATE-001](../internal/SPRINT_TEMPLATE_GUIDE.md)** | Sprint template with 27 normalized tasks | Creating new sprints |
| **[Pattern-TDD-001](../docs/patterns/Pattern-TDD-001.md)** | Test-driven development | All production code |
| **[Pattern-GIT-001](../docs/patterns/Pattern-GIT-001.md)** | Git workflow integration | Before every workflow |
| **[Pattern-IMPROVEMENT-001](../docs/patterns/Pattern-IMPROVEMENT-001.md)** | Gap detection & self-improvement | When gaps detected |
| **[Pattern-TRACKING-001](../docs/patterns/Pattern-TRACKING-001.md)** | Task tracking & pre-commit | During task execution |
| **[Pattern-DOCS-001](../docs/patterns/Pattern-DOCS-001.md)** | Documentation philosophy | Before creating docs |

### 🚀 Publishing & Release Protocols

| Pattern | Purpose | When to Use |
|---------|---------|-------------|
| **[Pattern-PUBLISH-001](../docs/patterns/Pattern-PUBLISH-001.md)** | Automated release pipeline | Every release |
| **[Pattern-PUBLISH-002](../docs/patterns/Pattern-PUBLISH-002.md)** | Publishing enforcement | User requests publish |
| **[Pattern-PUBLISH-003](../docs/patterns/Pattern-PUBLISH-003.md)** | Avoid runtime npm dependencies | Adding dependencies |
| **[Pattern-PUBLISH-004](../docs/patterns/Pattern-PUBLISH-004.md)** | Pre-publish validation | Before publishing |
| **[Pattern-PKG-001](../docs/patterns/Pattern-PKG-001.md)** | Package architecture (4 packages) | Understanding structure |

### 📖 Reference Documentation

- **[KNOWN_ISSUES.md](../docs/KNOWN_ISSUES.md)** - Historical bugs & fixes (15+ hours of debugging lessons)
- **[PUBLISHING.md](../PUBLISHING.md)** - Publishing guide
- **[SPRINT_TEMPLATE_GUIDE.md](../internal/SPRINT_TEMPLATE_GUIDE.md)** - Sprint template system guide (27 normalized tasks)
- **[Pattern Library Index](../docs/patterns/INDEX.md)** - All 76+ patterns

---

## 🎯 Quick Start Guide

### Common Tasks

#### Publishing a New Version
```bash
# ALWAYS use automated script (Pattern-PUBLISH-002)
node scripts/publish-release.js patch   # Bug fixes (0.13.20 → 0.13.21)
node scripts/publish-release.js minor   # New features (0.13.20 → 0.14.0)
node scripts/publish-release.js major   # Breaking changes (0.13.20 → 1.0.0)
```

**Never:** Manually publish packages OR run individual steps

#### Making Changes to Extension
```bash
# 1. Edit TypeScript files in vscode-lumina/src/
# 2. Compile
cd vscode-lumina && npm run compile

# 3. Test (F5 in VS Code launches Extension Development Host)
# 4. Verify changes work
# 5. Commit changes (follow Pattern-TRACKING-001)
# 6. Publish using automated script
```

#### Creating a Sprint
```bash
# Follow Pattern-SPRINT-PLAN-001 (ALWAYS ask user to review plan first)
# User approval required before creating sprint file
```

**Template Injection (Pattern-SPRINT-TEMPLATE-001):**
- Sprint-plan skill automatically injects 19-27 normalized tasks from SPRINT_TEMPLATE.toml
- REQUIRED tasks (13): Documentation, quality assurance, agent sync, infrastructure
- SUGGESTED tasks (4): Performance, security, compatibility (can skip with justification)
- CONDITIONAL tasks (0-8): Publishing tasks if releasing, UX tasks if user-facing changes
- RETROSPECTIVE tasks (2): Sprint retrospective, pattern extraction
- Benefits: Never forget CHANGELOG, tests, audits, or retrospectives
- Historical bug prevention: 15+ hours of debugging avoided per sprint

---

## ⚙️ Critical Rules (Summary)

### Publishing & Releases

- **ALWAYS use `/publish` command or `node scripts/publish-release.js`**
- **NEVER manually run individual publish steps** (causes version mismatch bugs)
- **Pattern-PUBLISH-002:** Use Skill tool first, ask user before manual bypass
- See: [Pattern-PUBLISH-001](../docs/patterns/Pattern-PUBLISH-001.md) for detailed workflow

### Version Management

All 4 packages MUST stay in sync:
- `vscode-lumina/package.json` (main extension)
- `packages/aetherlight-sdk/package.json`
- `packages/aetherlight-analyzer/package.json`
- `packages/aetherlight-node/package.json`

Use `node scripts/bump-version.js` to sync automatically.

### Code Quality

1. **Always compile TypeScript before testing:**
   ```bash
   cd vscode-lumina && npm run compile
   ```

2. **Pattern for extension code:**
   - Add Chain of Thought comments explaining WHY
   - Reference related files and patterns
   - Document design decisions

3. **Testing (TDD REQUIRED):**
   - **Pattern-TDD-001:** RED → GREEN → REFACTOR
   - Test in VS Code extension host (F5)
   - Coverage requirements: Infrastructure 90%, API 85%, UI 70%

### Workflow Protocols (MANDATORY)

**Before ANY code:**
1. ✅ **Pattern-TASK-ANALYSIS-001:** 8-step pre-task analysis
2. ✅ **Pattern-CODE-001:** Code workflow check (announce before writing code)
3. ✅ **Pattern-GIT-001:** Git status check (included in workflow)
4. ✅ **Pattern-TDD-001:** Write tests FIRST (RED phase)
5. ✅ **Pattern-TRACKING-001:** Use TodoWrite to track progress

**Edge Cases:**
- Typo fix (comment/variable name) → Skip workflow check
- Bug fix → Always run workflow check + write test first
- Experimental code → Run workflow check, mark as "spike"
- Refactoring → Run workflow check, existing tests must pass

---

## 🗂️ Project Structure

```
lumina-clean/
├── vscode-lumina/           # Main VS Code extension
│   ├── src/
│   │   ├── extension.ts     # Entry point
│   │   ├── services/        # Core services
│   │   └── commands/        # Command handlers
│   ├── test/                # Test files (Mocha/Chai)
│   ├── out/                 # Compiled JavaScript (git-ignored)
│   └── package.json         # Main package manifest
├── packages/
│   ├── aetherlight-sdk/     # SDK for app integration
│   ├── aetherlight-analyzer/# Workspace analyzer
│   └── aetherlight-node/    # Native Rust bindings
├── scripts/
│   ├── publish-release.js   # Automated publishing (USE THIS!)
│   ├── bump-version.js      # Version sync utility
│   └── validate-sprint-schema.js  # Sprint TOML validator
├── internal/
│   ├── agents/              # Agent context files (9 agents)
│   └── sprints/             # Sprint TOML files
├── docs/
│   ├── patterns/            # Pattern library (77+ patterns)
│   └── KNOWN_ISSUES.md      # Historical bugs & fixes
├── .claude/
│   ├── commands/            # Slash commands
│   │   └── publish.md       # /publish command
│   ├── skills/              # Skills (publish, sprint-plan, etc.)
│   └── settings.local.json  # Local settings
├── CLAUDE.md                # This file - concise reference
└── PUBLISHING.md            # Publishing guide
```

---

## 🚨 Known Issues (Quick Reference)

**See [KNOWN_ISSUES.md](../docs/KNOWN_ISSUES.md) for full details (500+ lines)**

### Top Issues to Avoid:

1. **v0.13.23 (9 hours):** Native dependency added → Extension broken
   - ✅ Prevention: Check Pattern-PUBLISH-003 before adding ANY dependency

2. **v0.15.31-32 (2 hours):** Runtime npm dependency → Extension activation failed
   - ✅ Prevention: Use Node.js built-ins (fs, path) instead of npm packages

3. **v0.16.15 (2 hours):** Automated publish script failed → Manual bypass
   - ✅ Prevention: Pattern-PUBLISH-002 enforcement + pre-publish validation

4. **v0.13.28-29 (2 hours):** Version mismatch → User installs broken
   - ✅ Prevention: Use automated script, never manual version bumps

5. **2025-11-03 (2 hours):** Wrong TOML format → Sprint panel broken
   - ✅ Prevention: Pre-flight checklist (read SprintLoader.ts first)

**Total time wasted (historical): 15+ hours** → All preventable with pre-flight checklist

---

## 🔍 Sprint Schema Validation (VAL-001)

**Implemented:** 2025-11-03
**Status:** ✅ Active - 4-layer validation

### Validation Layers

1. **Real-time (FileSystemWatcher)** - Validates on file save
2. **Pre-commit (Git Hook)** - Blocks commit if invalid
3. **Manual Check** - `node scripts/validate-sprint-schema.js`
4. **Extension Activation** - Validates on VS Code startup

### Validation Rules

✅ Tasks must use `[tasks.ID]` format (NOT `[[epic.*.tasks]]`)
✅ Required fields present: id, name, status, phase, agent
✅ Status must be valid: pending, in_progress, completed
✅ No circular dependencies
✅ ID consistency (task id matches section key)

**Files:**
- `vscode-lumina/src/services/SprintSchemaValidator.ts` - Validation service
- `scripts/validate-sprint-schema.js` - Pre-commit hook script

---

## 🔐 Authentication

**npm Publishing:**
- Requires login as `aelor`
- Check: `npm whoami`
- Login: `npm login`

**GitHub:**
- Uses local git credentials
- GitHub CLI (`gh`) optional but recommended for releases

---

## 🎓 Pattern-Based Development Culture

**How This System Works:**

1. **Pre-Flight Checklist:** ALWAYS run before Edit/Write (prevents 15+ hours bugs)
2. **Workflow Protocols:** Follow Pattern-TASK-ANALYSIS-001 → Pattern-CODE-001 → Pattern-TDD-001
3. **Gap Detection:** Use Pattern-IMPROVEMENT-001 when missing patterns/skills/agents
4. **Documentation:** Use Pattern-DOCS-001 to assess reusability before creating files
5. **Tracking:** Use Pattern-TRACKING-001 with TodoWrite for visibility

**Benefits:**
- ✅ 57% token savings (tests catch bugs early vs. debugging after)
- ✅ 75-80% context reduction (2,126 → 400-500 lines)
- ✅ Reusable patterns (77+ patterns, all indexed)
- ✅ Self-improving system (Pattern-IMPROVEMENT-001)
- ✅ User visibility and control (AskUserQuestion integration)

---

## ❓ Questions?

- **Workflow protocols:** See `docs/patterns/Pattern-*-001.md`
- **Publishing process:** See `PUBLISHING.md` + Pattern-PUBLISH-001
- **Historical bugs:** See `docs/KNOWN_ISSUES.md` (15+ hours of lessons)
- **Pattern library:** See `docs/patterns/INDEX.md` (77+ patterns)
- **Available commands:** Check `.claude/commands/`
- **Architecture:** Review `vscode-lumina/src/extension.ts`

---

## 📊 Refactoring Summary (v2.1 - Sprint 3 Complete)

**Before (v1.0):**
- CLAUDE.md: 2,126 lines
- Context burden: ~60k tokens
- Protocols embedded inline (hard to find)

**After (v2.1 - Sprint 3):**
- CLAUDE.md: ~400-500 lines (75-80% reduction)
- Context burden: ~15k tokens (75% reduction)
- 5 new patterns extracted: Pattern-TASK-ANALYSIS-001, Pattern-CODE-001, Pattern-SPRINT-PLAN-001, Pattern-GIT-001, Pattern-IMPROVEMENT-001
- KNOWN_ISSUES.md created: 500+ lines of historical bug data
- Pattern-based system: 76+ patterns, all indexed and reusable
- Sprint 3 completed: MVP-003 Prompt System, Sprint Template System (27 normalized tasks), Self-Configuration System (Phases 2-5), Protection System, UX Polish (14 improvements)

**Benefits:**
- ✅ Massive context reduction (1,600+ lines → on-demand patterns)
- ✅ Better organization (each protocol self-contained)
- ✅ Easier maintenance (update one pattern vs. searching 2k lines)
- ✅ Follows our own rules (Pattern-DOCS-001: high reusability → patterns)
- ✅ Self-improving system (Pattern-IMPROVEMENT-001)

---

**Remember:** Use the automated publishing script. Follow the pre-flight checklist. Reference patterns for detailed workflows. Don't repeat the 15+ hours of historical bugs.
