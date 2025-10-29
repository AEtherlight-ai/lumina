# ÆtherLight Project - Claude Code Instructions

**Project:** ÆtherLight (Voice-to-intelligence platform for developers)
**Last Updated:** 2025-10-28

---

## Project Overview

ÆtherLight is a VS Code extension + desktop app that provides:
- Voice capture and transcription (Whisper API)
- Pattern matching to prevent AI hallucinations
- Real-time context sync
- Sprint management and workspace analysis

**Tech Stack:**
- VS Code Extension: TypeScript
- Desktop App: Tauri (Rust + TypeScript)
- Packages: Node.js, native bindings (NAPI)

---

## Critical Rules

### Publishing & Releases

**ALWAYS use the automated publishing script:**
```bash
node scripts/publish-release.js [patch|minor|major]
```

**NEVER manually run individual publish steps** - this causes version mismatch bugs.

**Why:** The script ensures:
- Everything is compiled before publishing
- All artifacts are verified
- Versions are synced across all packages
- No timing issues or partial deploys

**Related Files:**
- `scripts/publish-release.js` - Automated release pipeline
- `scripts/bump-version.js` - Version synchronization
- `.claude/commands/publish.md` - Publishing command
- `PUBLISHING.md` - Publishing documentation

### Version Management

All packages MUST stay in sync:
- `vscode-lumina/package.json` (main extension)
- `packages/aetherlight-sdk/package.json`
- `packages/aetherlight-analyzer/package.json`
- `packages/aetherlight-node/package.json`

The bump-version script handles this automatically.

### Code Quality

1. **Always compile TypeScript before testing:**
   ```bash
   cd vscode-lumina && npm run compile
   ```

2. **Pattern for extension code:**
   - Add Chain of Thought comments explaining WHY
   - Reference related files and patterns
   - Document design decisions

3. **Testing:**
   - Manual testing required (no automated tests yet)
   - Test in VS Code extension host (F5)
   - Verify all commands work

---

## Common Tasks

### Publishing a New Version

Use the `/publish` command or:
```bash
node scripts/publish-release.js patch   # Bug fixes (0.13.20 → 0.13.21)
node scripts/publish-release.js minor   # New features (0.13.20 → 0.14.0)
node scripts/publish-release.js major   # Breaking changes (0.13.20 → 1.0.0)
```

### Making Changes to Extension

1. Edit TypeScript files in `vscode-lumina/src/`
2. Compile: `cd vscode-lumina && npm run compile`
3. Test: Press F5 in VS Code to launch Extension Development Host
4. Verify changes work
5. Commit changes
6. Publish using automated script

### Updating Auto-Update System

The update checker is in `vscode-lumina/src/services/updateChecker.ts`

**Important:** Any changes here affect how users receive updates. Test thoroughly.

---

## Project Structure

```
lumina-clean/
├── vscode-lumina/           # Main VS Code extension
│   ├── src/
│   │   ├── extension.ts     # Entry point
│   │   ├── services/
│   │   │   └── updateChecker.ts  # Auto-update system
│   │   └── commands/        # Command handlers
│   ├── out/                 # Compiled JavaScript (git-ignored)
│   └── package.json         # Main package manifest
├── packages/
│   ├── aetherlight-sdk/     # SDK for app integration
│   ├── aetherlight-analyzer/# Workspace analyzer
│   └── aetherlight-node/    # Native Rust bindings
├── scripts/
│   ├── publish-release.js   # Automated publishing (USE THIS!)
│   └── bump-version.js      # Version sync utility
├── .claude/
│   ├── commands/
│   │   └── publish.md       # /publish command
│   └── settings.local.json  # Local settings
├── CLAUDE.md               # This file - project instructions
└── PUBLISHING.md           # Publishing guide
```

---

## Known Issues & Fixes

### Issue: Extension shows old version after update
**Status:** FIXED in 0.13.21
**Cause:** Update command only updated npm, not VS Code extension directory
**Fix:** Updated `updateChecker.ts` to run full install cycle
**Files:** `vscode-lumina/src/services/updateChecker.ts:228`

### Issue: Version mismatches between packages
**Status:** PREVENTED by automated script
**Prevention:** Always use `scripts/publish-release.js`
**Never:** Manually publish individual packages

### Issue: npm published but GitHub release missing (v0.13.20)
**Status:** FIXED in publish script
**Cause:** GitHub release creation was "optional" and could fail silently
**Impact:** Users got v0.13.19 .vsix even though npm showed 0.13.20
**Why Critical:** CLI installer downloads .vsix from GitHub releases, not npm
**Fix:** Made GitHub release mandatory with verification step
**Files:**
- `scripts/publish-release.js:232-297` - Now requires gh CLI auth and verifies release
- `.claude/skills/publish/SKILL.md` - Updated to document new checks
**Prevention:** Script now:
1. Fails if gh CLI not installed (not optional anymore)
2. Fails if not authenticated to GitHub
3. Verifies the .vsix exists in the release after creation
4. All checks happen BEFORE "Release Complete!" message

---

## Design Patterns

### Pattern-UPDATE-002: VS Code Extension Update Flow
When updating the extension:
1. `npm install -g aetherlight@latest` downloads package
2. `aetherlight` CLI compiles, packages, and installs .vsix
3. VS Code reload picks up new version from extensions directory

### Pattern-PUBLISH-001: Automated Release Pipeline
All releases go through:
1. Prerequisites check (auth, git state)
2. Build and compile
3. Verify artifacts
4. User confirmation
5. Publish to npm
6. Create git tag and GitHub release

---

## Authentication

**npm Publishing:**
- Requires login as `aelor`
- Check: `npm whoami`
- Login: `npm login`

**GitHub:**
- Uses local git credentials
- GitHub CLI (`gh`) optional but recommended for releases

---

## Testing Checklist

Before publishing:
- [ ] Extension compiles without errors
- [ ] All commands work in test environment
- [ ] Version numbers are correct
- [ ] Git working directory is clean
- [ ] Logged in to npm as `aelor`

The automated script checks most of these automatically.

---

## Questions?

- Read `PUBLISHING.md` for publishing process
- Read `UPDATE_FIX_SUMMARY.md` for update system details
- Check `.claude/commands/` for available slash commands
- Review `vscode-lumina/src/extension.ts` for architecture

---

**Remember:** Use the automated publishing script. Don't repeat the version mismatch bug.
