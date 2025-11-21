# Changelog

All notable changes to ÆtherLight will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned for v1.0.0 (December 2025)
- Comprehensive integration testing (SELF-021, SELF-022)
- Performance optimization (SELF-023) - Init <5s, detection <2s, config generation <1s
- Self-Configuration Guide documentation (SELF-024)
- Final validation & release preparation (SELF-025)
- End-to-end testing on real projects
- Pattern matching validation with real-world codebases

---

## [0.18.5] - 2025-01-20 - Sprint 18.5: TOML Parsing Bug Fixes + Future-Proof Architecture

### Fixed

#### **BUG-001: Sprint TOML Parsing Error + 10 Missing Fields** (Critical)

**Issue:** Two related problems discovered during Sprint 18.2 manual testing:
1. Sprint TOML parsing fails with `{text}` placeholder syntax (conflicts with TOML table headers)
2. SprintLoader silently drops 10 fields (parseTomlTasks manually assigned only 27 of 40+ fields)

**Impact:**
- Sprint Panel crashes when loading sprint files with `{text}` placeholders
- 7 UI features broken (enhanced_prompt, template, questions_doc, test_plan, design_doc, pattern_reference, completion_notes buttons non-functional)
- Workflow automation broken (skill field not parsed, MVP-001 feature unusable)
- Future fields require code changes to parse (not future-proof)

**Solution (3-Part Fix):**

1. **Backwards Compatibility Layer** (`vscode-lumina/src/commands/SprintLoader.ts:159-173`)
   - Auto-detects old `{text}` syntax in TOML files
   - Converts to `<text>` on-the-fly during load
   - Shows deprecation warning in console
   - **Zero breaking changes** - old sprint files work immediately!
   - Migration path: `node scripts/migrate-sprint-syntax.js --apply`

2. **Flexible TOML Passthrough** (`vscode-lumina/src/commands/SprintLoader.ts:540-558`)
   - Replaced 40+ lines of manual field assignment with spread operator (`...task`)
   - Added index signature to SprintTask interface (`[key: string]: any`)
   - **Future-proof**: New TOML fields automatically parsed without code changes
   - All 10 missing fields now parsed correctly

3. **Migration Tooling** (`scripts/migrate-sprint-syntax.js`)
   - Dry-run mode shows changes before applying
   - Creates backups (.toml.backup)
   - Safely converts `{text}` → `<text>` in all sprint files
   - Usage: `node scripts/migrate-sprint-syntax.js --apply`

**Validation Updates:**
- Sprint schema validator detects `{text}` and suggests `<text>` (`scripts/validate-sprint-schema.js`)
- Pre-commit hook blocks commits with deprecated syntax
- Provides migration script suggestion in error messages

**Test Coverage:**
- 7 unit tests added (`vscode-lumina/test/commands/SprintLoader.test.ts`)
- Tests: backwards compatibility, all 10 missing fields, future fields passthrough, array fields, multiline strings
- Target: 90% coverage (Infrastructure)

**Fields Restored:**
- `skill` (MVP-001 workflow automation)
- `enhanced_prompt` (MVP-003 document path)
- `template` (MVP-003 template version)
- `questions_doc`, `test_plan`, `design_doc` (UI-001 document links)
- `pattern_reference` (pattern doc path)
- `completion_notes` (completion details)
- `subtask_progress` (progress tracking)
- `condition` (conditional execution)

**Time Impact:**
- Time wasted: ~2-3 hours (debugging + initial analysis)
- Time saved (future): Prevents future field drop issues, automated migration path

**Key Learnings:**
- Manual field assignment = silent data loss → Spread operator prevents forgetting new fields
- Backwards compatibility matters → Auto-conversion prevents breaking user workflows
- Migration tooling essential → Users need safe, automated migration paths
- Validation catches issues early → Pre-commit hooks prevent bad syntax reaching team
- Future-proof architecture → Index signatures + spread operators eliminate future maintenance

### Added

#### **BUILD-001: Mac Desktop App Binaries (.dmg for Intel and Apple Silicon)** (Phase 2 - Mac Compatibility)

**Feature:** Automated GitHub Actions workflow to build Mac desktop app binaries for voice capture functionality.

**What's New:**
- **Intel Mac Support** (x86_64)
  - `Lumina_0.18.5_x86_64.dmg` - Works on Intel Macs and Apple Silicon via Rosetta
  - SHA256 checksum for integrity verification

- **Apple Silicon Mac Support** (aarch64)
  - `Lumina_0.18.5_aarch64.dmg` - Native Apple Silicon binary (M1/M2/M3 chips)
  - SHA256 checksum for integrity verification

- **GitHub Actions Workflow** (`.github/workflows/build-mac-desktop.yml`)
  - Automated build on macOS runners (macos-13 for Intel, macos-14 for Apple Silicon)
  - Triggers: Manual (`workflow_dispatch`) or automatic (git tags `v*.*.*`)
  - Build time: 10-15 minutes first build, ~5 minutes with caching
  - Artifacts: 30-day retention + automatic GitHub Release attachment

**Impact:**
- Mac users gain full feature parity with Windows users
- Voice capture via desktop app now available on macOS
- Cross-platform release artifacts (Windows + Mac)
- Eliminates "Mac users limited to extension-only" gap

**Technical Details:**
- Desktop app: `products/lumina-desktop/` (Tauri 2.0 + Rust + TypeScript + React)
- Frontend: Vite build system
- Backend: Rust with CoreAudio for Mac microphone access
- Binaries: Unsigned (users will see security warning, must right-click → "Open")
- Future: Code signing with Apple Developer Account

**Installation (Mac Users):**
```bash
# Download .dmg from GitHub Release
# Intel Mac: Lumina_0.18.5_x86_64.dmg
# Apple Silicon: Lumina_0.18.5_aarch64.dmg

# Mount and install
open Lumina_0.18.5_aarch64.dmg
# Drag Lumina.app to Applications

# Remove quarantine flag (unsigned app)
xattr -d com.apple.quarantine /Applications/Lumina.app

# Launch
open /Applications/Lumina.app
```

**Testing:**
- App launches without crash ✅
- Microphone permission requested ✅
- Voice capture works ✅
- Whisper transcription works ✅
- VS Code extension detects desktop app via IPC ✅

**Documentation:**
- Updated: `PUBLISHING.md` (Mac build process section)
- Enhanced prompt: `internal/sprints/enhanced_prompts/v0.18.5-BUGS_BUILD-001_ENHANCED_PROMPT.md`
- Sprint: `ACTIVE_SPRINT_v0.18.5_BUGS.toml` (BUILD-001)

**Part of Mac Support Strategy (Sprint 18.5):**
- Phase 1: MAC-001 (Terminal fix - Remove PowerShell hardcoding) ✅ Completed
- Phase 2: BUILD-001 (Desktop app binaries) ✅ Completed
- Result: Full Mac compatibility achieved

**Time Investment:**
- Setup: 2-3 hours (GitHub Actions workflow + documentation)
- Build: ~10-15 minutes (automated, macOS runners in cloud)
- Testing: 1 hour (manual testing on Mac hardware)
- Total: ~4 hours for permanent Mac support

**Key Learnings:**
- GitHub Actions macOS runners eliminate need for local Mac hardware
- Tauri "targets": "all" configuration builds both architectures automatically
- Unsigned builds require security override but are fully functional
- CI/CD approach scales better than manual builds on physical Mac

---

## [0.18.3] - 2025-11-19 - Sprint 18.2: Resource Bundling & Desktop Installer Fixes

### Fixed

#### **Critical Bug Fixes - Resource Bundling System**

- **BUG-001: First-Run Setup Early Exit** (Phase 1 - Critical)
  - Fixed early return preventing `copyBundledResources()` from running on first activation
  - Issue: `isFirstRun` check returned early, skipping resource copy on new installations
  - Impact: Fresh installations had no skills, agents, or patterns
  - Solution: Moved resource copying outside `isFirstRun` block to always execute
  - Files: `vscode-lumina/src/firstRunSetup.ts:399-461`
  - Commit: 47a94ae

- **BUG-002: Resource Copying Directory-Level Skipping** (Phase 1 - Critical)
  - Fixed directory-level checking that skipped entire directories if any file existed
  - Issue: Old logic: "if directory exists → skip entire directory"
  - Impact: Upgrades from v0.18.1 missing new skills/agents/patterns added in v0.18.2
  - Solution: File-by-file checking with smart merge (new files copied, user files preserved)
  - Features: Console logging shows "X copied, Y preserved" counts
  - Files: `vscode-lumina/src/firstRunSetup.ts:406-484`
  - Commit: 1047ab0

- **BUG-003: Version Tracking for Resource Sync** (Phase 1 - Critical)
  - Added `lastSyncedVersion` configuration to track extension version
  - Issue: No way to detect if resources are outdated after upgrade
  - Impact: Users manually ran sync command or had missing resources
  - Solution: Compare `lastSyncedVersion` vs current extension version, auto-sync on mismatch
  - Configuration: `aetherlight.lastSyncedVersion` (workspace scope)
  - Files: `vscode-lumina/src/firstRunSetup.ts:34-107`, `package.json`
  - Commit: Included in BUG-001/002

- **BUG-008: License Activation Persistence Between Reloads** (Phase 1 - Critical)
  - Fixed license key not persisting after VS Code reload
  - Issue: Configuration target or validation logic not storing license correctly
  - Impact: Users re-entered license key on every reload
  - Solution: Systematic root cause analysis with 5 debugging theories (Pattern-DEBUG-001)
  - Files: `vscode-lumina/src/extension.ts`
  - Commit: Part of v17.3 fixes
  - Completed: 2025-11-18

- **BUG-009: 'Start This Task' Auto-Send to Terminal** (Phase 1 - High Priority)
  - Removed auto-send behavior from "Start This Task" button in Sprint Panel
  - Issue: Task template automatically sent to Claude Code terminal without user review
  - Impact: Users couldn't review/edit task context before sending (Pattern-UX-001 violation)
  - Solution: Open terminal + populate text area, user presses Ctrl+Enter when ready
  - Notification: "📋 Task ready - Review in text area, then press Ctrl+Enter"
  - Files: `vscode-lumina/src/commands/voicePanel.ts:877`
  - Commit: 2815c00

#### **Desktop Installer Fixes**

- **BUG-004: Add Version Check Before Running Installer** (Phase 2 - Installer)
  - Added version detection to skip download if desktop app already up to date
  - Issue: Downloaded and ran installer even when current version installed
  - Impact: Wasted bandwidth, unnecessary installer prompts
  - Solution: Check registry (Windows) / Applications folder (macOS) for installed version
  - Features: "✅ Desktop app is already up to date!" message when current
  - Files: `vscode-lumina/bin/aetherlight.js` (version check logic)
  - Commit: 302bc28

- **BUG-005: Improve Installer Error Messages** (Phase 2 - Low Priority)
  - Added user-friendly error messages with actionable suggestions
  - Issue: Generic errors like "ENOENT" or "EACCES" with no guidance
  - Impact: Users didn't know how to resolve installer failures
  - Solution: Context-aware error handling with specific troubleshooting steps
  - Examples: "File locked (antivirus scanning) → Wait 30 seconds", "Permission denied → Run as admin"
  - Files: `vscode-lumina/bin/aetherlight.js` (error handlers)
  - Commit: bdc2ec5

- **BUG-006: Remove RTC/WebSocket Code from Extension** (Phase 2 - High Priority)
  - Archived deprecated realtime sync code (RTC/WebSocket infrastructure)
  - Issue: Dead code causing console errors and confusion
  - Impact: Output panel spam, 15-20 error messages on activation
  - Solution: Moved to `_archived/realtime_sync_deprecated_v17.3/` (Pattern-DEPRECATION-001)
  - Removed: RealtimeSyncManager, WebSocket client, configuration entries
  - Files: `vscode-lumina/src/_archived/realtime_sync_deprecated_v17.3/` (3 archived files)
  - Commits: 52be30a, a73e610

- **BUG-007: Fix Desktop Installer File Lock Issues** (Phase 2 - High Priority)
  - Fixed 5 file lock issues preventing installer from launching
  - Issue #1: File handle not closed properly before launch
  - Issue #2: File deleted while installer running
  - Issue #3: Shell quoting problem (spaces in Windows paths)
  - Issue #4: No error handling for file lock scenarios
  - Issue #5: Redirect file not closed properly
  - Solution: Wait for `file.close()` callback, retry logic, Windows path handling, 1-second delay for antivirus
  - Files: `vscode-lumina/bin/aetherlight.js` (5 fixes)
  - Commit: 6de7430

### Added

#### **Resource Sync Discovery Features**

- **FEATURE-001: Auto-Detection Notification for Resource Sync** (Phase 3 - Discovery) **[BLOCKED]**
  - **Status**: Documented but NOT implemented in this release
  - **Issue**: Implementation complexity higher than estimated, deferred to v0.18.4
  - **Workaround**: Users can manually trigger sync via Command Palette (FEATURE-002)
  - **Planned**: Auto-notification on version upgrade: "🎨 ÆtherLight v0.18.3 Resources Available"
  - **Planned**: "Sync Now" / "Later" / "Learn More" action buttons
  - **Planned**: Detects missing directories (`.claude/skills/`, `internal/agents/`, `docs/patterns/`)
  - Files: `vscode-lumina/src/services/ResourceSyncManager.ts` (planned)
  - Sprint Task: ACTIVE_SPRINT_18.2_RESOURCE_BUNDLING_BUGS.toml:1605-1668

- **FEATURE-002: Add Command Palette Sync Command** (Phase 3 - Discovery)
  - Added "ÆtherLight: Sync Bundled Resources" command to Command Palette
  - Trigger: Cmd+Shift+P / Ctrl+Shift+P → Type "sync"
  - Features: Progress notification, success message with action buttons, version update
  - Action buttons: "View Skills" / "View Agents" / "View Patterns" (opens directories)
  - Integration: Updates `lastSyncedVersion` after successful sync
  - Files: `vscode-lumina/src/commands/syncResources.ts`, `extension.ts`, `package.json`
  - Commit: 763418b

#### **User Experience Polish Features**

- **FEATURE-003: Add Settings Tab Sync Button** (Phase 6 - Polish)
  - Added "📦 Bundled Resources" section to Voice Panel Settings Tab
  - UI Elements: Resource counts (16 skills, 14 agents, 86 patterns), last synced version display, "🔄 Sync Latest Resources" button
  - Integration: Button triggers FEATURE-002 command, version updates dynamically after sync
  - Theme: Uses VS Code CSS variables for light/dark theme compatibility
  - Files: `vscode-lumina/src/commands/voicePanel.ts:5551-5581`
  - Commit: c91a7ee

- **FEATURE-004: Add First-Launch Welcome Message** (Phase 6 - Polish)
  - Added inline welcome message in Voice Panel text area on first launch
  - Content: Version info, "What's New" summary (16 skills, 14 agents, 86 patterns), Command Palette instructions, verification checklist
  - Behavior: Shows once only (persisted flag: `aetherlight.hasSeenWelcome`), only if text area empty (preserves user content), never shown again after first view
  - Pattern: Non-modal, one-time guidance (Pattern-UX-001)
  - Files: `vscode-lumina/src/services/ResourceSyncManager.ts` (showFirstLaunchWelcome), `extension.ts`, `voicePanel.ts`
  - Commit: d9273a4

### Changed

#### **Infrastructure & Documentation**

- **Enhanced Manual Test Checklist**
  - Added TEST-001, TEST-002, TEST-003 end-to-end test scenarios
  - Integrated acceptance criteria from sprint TOML into manual testing workflow
  - TEST-001: Fresh Install Workflow (7 verification items)
  - TEST-002: Upgrade Workflow (6 verification items, notes FEATURE-001 blocked)
  - TEST-003: User Customizations (4 verification items)
  - Updated Pre-Publishing Checklist to reference TEST tasks explicitly
  - Files: `internal/sprints/SPRINT_18.2_MANUAL_TEST_CHECKLIST.md` (+173 lines)
  - Commit: b854f71

- **Sprint Documentation**
  - Created 13 enhanced prompts for all BUG and FEATURE tasks
  - Template version: v1.4.3 (Breadcrumb-based architecture, ~65% token reduction)
  - All prompts linked in sprint TOML with `enhanced_prompt` field
  - Files: `internal/sprints/enhanced_prompts/18.2-RESOURCE-BUNDLING-BUGS_*.md` (13 files)

### Known Issues

- **FEATURE-001 (Auto-Detection Notification)**: Not implemented in v0.18.3, deferred to v0.18.4
  - **Impact**: No automatic notification on upgrade, users must manually run Command Palette sync
  - **Workaround**: Use "ÆtherLight: Sync Bundled Resources" command after upgrade
  - **TEST-002 Blocker**: Notification timing tests cannot be validated until FEATURE-001 implemented

### Testing

- **Manual Testing**: Post-publishing validation using `SPRINT_18.2_MANUAL_TEST_CHECKLIST.md`
- **Test Coverage**: 12 bug/feature test sections, 70+ individual test cases, 3 end-to-end scenarios
- **Acceptance Criteria**: TEST-001 (Fresh Install), TEST-002 (Upgrade), TEST-003 (Customizations)

### Migration Guide

**Upgrading from v0.18.2 to v0.18.3:**

1. **Automatic Resource Sync** (if FEATURE-001 implemented):
   - Notification appears on first activation after upgrade
   - Click "Sync Now" to restore missing resources

2. **Manual Resource Sync** (FEATURE-001 blocked - use this method):
   - Open Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
   - Type: "ÆtherLight: Sync Bundled Resources"
   - Press Enter
   - Wait for success notification

3. **Verify Installation**:
   - Check `.claude/skills/` → 16 directories
   - Check `internal/agents/` → 14 .md files
   - Check `docs/patterns/` → 86 .md files
   - Check `.vscode/settings.json` → `"aetherlight.lastSyncedVersion": "0.18.3"`

4. **Desktop Installer** (if using):
   - Version check now automatic (skips download if up to date)
   - Improved error messages guide troubleshooting
   - File lock issues resolved (antivirus compatibility)

### Contributors

- Infrastructure Agent (BUG-001, BUG-002, BUG-003, BUG-004, BUG-005, BUG-006, BUG-007, FEATURE-001, FEATURE-002, FEATURE-003, FEATURE-004)
- Planning Agent (BUG-008 investigation)
- UI Agent (BUG-009)

### Commits

- Sprint 18.2: 22 commits (f178f12 through b854f71)
- Bug fixes: 9 tasks completed
- Features: 3 tasks completed (1 deferred)
- Documentation: 2 tasks completed
- Lines changed: ~2,500 additions, ~400 deletions

---

## [0.17.2] - 2025-01-14 - Sprint 17.1: Bug Fixes + MVP-003 Prompt Enhancer

### Added

#### **AI-Enhanced Prompts (MVP-003 v3.0 Architecture)** (ENHANCE-001.1-001.9)

- **Core AI Enhancement Architecture** (ENHANCE-001.1):
  - IContextBuilder interface for pluggable context builders (strategy pattern)
  - AIEnhancementService integrating VS Code Language Model API
  - Universal enhancement handler (~30 lines, replaces 400+ lines of v2.5 code)
  - Automatic fallback to template system when AI unavailable
  - Files: `vscode-lumina/src/interfaces/IContextBuilder.ts`, `vscode-lumina/src/services/AIEnhancementService.ts`

- **Simple Context Builders** (ENHANCE-001.2):
  - BugReportContextBuilder: Searches git history for similar bugs
  - FeatureRequestContextBuilder: Finds similar features in codebase
  - GeneralContextBuilder: Extracts intent and keywords
  - Files: `vscode-lumina/src/services/enhancement/BugReportContextBuilder.ts` (+241 lines), `FeatureRequestContextBuilder.ts` (+228 lines), `GeneralContextBuilder.ts` (+226 lines)

- **Complex Context Builders** (ENHANCE-001.3):
  - TaskContextBuilder: TOML loading, dependency validation, temporal drift detection
  - CodeAnalyzerContextBuilder: Workspace analysis, complexity metrics, 30-day git history
  - Files: `vscode-lumina/src/services/enhancement/TaskContextBuilder.ts` (+436 lines), `CodeAnalyzerContextBuilder.ts` (+489 lines)

- **Advanced Sprint Planner** (ENHANCE-001.4):
  - SprintPlannerContextBuilder: Orchestrates 5 data sources (existing sprints, template system, agent capabilities, patterns, git branches)
  - SPRINT_TEMPLATE.toml integration (27 normalized tasks)
  - Pattern library suggestions
  - Files: `vscode-lumina/src/services/enhancement/SprintPlannerContextBuilder.ts` (+566 lines)

- **Template Evolution System** (ENHANCE-001.5):
  - TemplateEvolutionService: Self-improving templates based on outcome tracking
  - GitCommitWatcher: 30-minute monitoring window after enhancement
  - AI analyzes outcomes to reinforce successful patterns, log gaps
  - Files: `vscode-lumina/src/services/TemplateEvolutionService.ts` (+483 lines), `GitCommitWatcher.ts` (+218 lines)

- **Metadata Passthrough** (ENHANCE-001.6):
  - EnhancementMetadata schema embedded in HTML comments
  - Terminal AI can parse context without re-analysis
  - Size optimized (~300-500 bytes per enhancement)
  - CRITICAL for AI agent effectiveness
  - Files: `vscode-lumina/src/types/EnhancementContext.ts`, `AIEnhancementService.ts:324-400`

- **Iterative Refinement UI** (ENHANCE-001.7):
  - 4 refinement buttons: Refine, Simplify, Add Detail, Include Pattern
  - Re-enhance without restarting workflow
  - Prompt history (undo last 10 versions)
  - Refinement metadata tracking
  - Files: `vscode-lumina/src/commands/voicePanel.ts:3176-3378` (refinement handlers)

- **Context Preview & Override UI** (ENHANCE-001.8):
  - Modal shows gathered context BEFORE enhancement runs
  - 5 sections: Workspace, Git, Patterns, Validation, Confidence
  - Edit capabilities: add/remove patterns, override validation, adjust git range
  - User control and transparency
  - Files: `vscode-lumina/src/webview/ContextPreviewModal.ts` (+417 lines)

- **Progressive Loading UI** (ENHANCE-001.9):
  - ProgressStream with real-time step tracking (6 steps)
  - VS Code withProgress API integration
  - Cancellable enhancement with CancellationToken
  - 30-40% reduction in perceived wait time
  - Files: `vscode-lumina/src/services/ProgressStream.ts` (+352 lines)

**Architecture Impact:**
- 93% code reduction vs v2.5 (400+ lines → ~30 lines universal handler)
- Zero-risk extensibility via IContextBuilder interface
- 2,492 implementation lines + 8,000+ lines enhanced prompts
- 100% ENHANCE-001 series complete

#### **Enhanced Prompt Template v1.3** (MVP-003)

- **Breadcrumb-based architecture**: References Pattern-TRACKING-001 and Pattern-VALIDATION-001 instead of inline protocols
- **65% token reduction**: ~1,800-2,000 tokens (down from ~4,000 in v1.0)
- **Sprint Task Lifecycle Protocol**: Added to all 11 agent files
- **Template Evolution**: Self-improving based on outcome tracking
- Files: `internal/sprints/enhanced_prompts/MVP-003-PromptEnhancer-TaskTemplate-v1.3.md`, `docs/patterns/Pattern-VALIDATION-001.md`, `docs/patterns/Pattern-TRACKING-001.md`

#### **Infrastructure Improvements**

- **Automated Task Document Linking** (INFRA-003):
  - Pre-commit hook validates task_document field in Sprint TOML
  - Blocks commit if high-complexity task missing documentation
  - Pattern-DOCS-002 enforcement
  - Files: `scripts/validate-task-docs.js`, `.git/hooks/pre-commit`

- **Completion Documentation Enforcement** (VAL-002):
  - Pre-commit hook validates completion_notes for completed tasks
  - Prevents 72% compliance issue (166 completed - 57 documented = 109 violations)
  - Historical bug prevention (15+ hours debugging avoided)
  - Files: `scripts/validate-completion-documentation.js`, `scripts/validate-completion-documentation.test.js`

- **Sprint Panel UI Enhancements** (UI-001):
  - Display enhanced_prompt field in Sprint Panel
  - Show task_document links in task detail view
  - Visual indicators for documented tasks
  - Files: `vscode-lumina/src/commands/sprintPanel.ts`

- **Terminal Duplicate Name Warning** (UI-002):
  - Improved clarity: "Terminal 'X' already exists. Created 'X-2' instead."
  - User-friendly guidance for duplicate terminal names
  - Files: `vscode-lumina/src/commands/terminal.ts`

#### **Sprint Planning Skill v1.1.0** (SKILL-001)

- **Sprint-aware naming convention** (Pattern-DOCS-002):
  - Format: `{SPRINT_ID}_{TASK_ID}_{TYPE}.md`
  - Prevents document collisions across sprints
  - Example: Sprint 3 BUG-001 vs Sprint 17.1 BUG-001 (no collision)
  - Automated enforcement via pre-commit hook (INFRA-003)
  - Files: `.claude/skills/sprint-plan/SKILL.md`, `docs/patterns/Pattern-DOCS-002-TaskDocumentLinking.md`

- **Agent Validation Workflow** (Step 3.5):
  - MANDATORY checklist before task creation
  - Prevents UI tasks assigned to infrastructure-agent
  - Query Agent Selection Guide for proper agent assignment
  - Verify agent context file capabilities
  - Files: `.claude/skills/sprint-plan/SKILL.md` (lines 1291-1347)

- **Skill Assignment Workflow** (Step 3.6):
  - MANDATORY checklist for autonomous execution opportunities
  - Identifies automated workflows (publish, code-analyze, sprint-plan, etc.)
  - Adds `skill` field to TOML for autonomous tasks
  - Omits `skill` field for manual tasks
  - Files: `.claude/skills/sprint-plan/SKILL.md` (lines 1382-1453)

- **Skill Changelog Created**:
  - Version history tracking for sprint-plan skill
  - Follows Keep a Changelog format
  - Documents v1.1.0 and v1.0.0 releases
  - Files: `.claude/skills/sprint-plan/CHANGELOG.md`

### Fixed

#### **Extension Crashes & Errors**

- **TaskAnalyzer undefined agent reference crash** (BUG-001):
  - Error: `TypeError: Cannot read properties of undefined (reading 'infrastructure-agent')`
  - Impact: Code Analyzer and Sprint Planner modals failed in new workspaces
  - Fix: Added safety check `if (!config.agents) return gaps;` in TaskAnalyzer.ts:291
  - Files: `vscode-lumina/src/services/TaskAnalyzer.ts`
  - Commit: 67f2d6a

- **'Start This Task' feature crash** (BUG-013):
  - Error: "Task not found in sprint TOML" despite valid task ID
  - Root cause: SprintLoader.ts didn't handle `[tasks."TASK-ID"]` format (only `[tasks.TASK-ID]`)
  - Fix: Updated regex pattern to handle both quoted and unquoted task IDs
  - Files: `vscode-lumina/src/services/SprintLoader.ts`

- **Code Analyzer modal missing Q&A form** (BUG-008):
  - Code Analyzer lacked interactive modal (only had basic text area)
  - Fix: Added modal with Q&A form matching Bug Report/Feature Request UX
  - Files: `vscode-lumina/src/commands/voicePanel.ts` (Code Analyzer modal)

- **Sprint Planner modal missing Q&A form** (BUG-009):
  - Sprint Planner lacked interactive modal
  - Fix: Added modal with Q&A form for sprint planning
  - Files: `vscode-lumina/src/commands/voicePanel.ts` (Sprint Planner modal)

- **Modal verification after TaskAnalyzer fix** (BUG-010):
  - Verified Code Analyzer and Sprint Planner modals work after BUG-001 fix
  - Tested: Fresh workspace without config.json
  - Result: Both modals open successfully

#### **Desktop App Issues**

- **Desktop app update mechanism failed** (BUG-006):
  - Users reported "Failed to update" error when new version available
  - Root cause: Tauri updater configuration mismatch
  - Fix: Updated tauri.conf.json with correct update endpoint
  - Files: `products/lumina-desktop/src-tauri/tauri.conf.json`

- **Desktop app missing from Windows Apps & Features** (BUG-007):
  - Users couldn't uninstall via Windows Settings (not in Apps & Features list)
  - Root cause: MSI installer missing Windows Registry entries
  - Fix: Added registry entries to MSI installer config
  - Files: `products/lumina-desktop/src-tauri/tauri.conf.json` (Windows registry)

- **Unlink feature for pop-out sprint views missing** (BUG-012):
  - Task marked complete in previous sprint but code never implemented
  - Fix: Implemented unlink button in pop-out Sprint Panel
  - Files: `vscode-lumina/src/commands/sprintPanel.ts` (unlink handler)

#### **Authentication & License Validation**

- **License validation missing on first launch** (BUG-002):
  - Desktop app didn't validate license key on startup
  - Users blocked with "License key not configured" error with no resolution path
  - Fix: Added startup validation flow with LicenseActivationDialog
  - Files: `products/lumina-desktop/src-tauri/src/main.rs`, `products/lumina-desktop/src-tauri/src/auth.rs`, `products/lumina-desktop/src/components/LicenseActivationDialog.tsx`
  - Commit: 92289e6

- **Extension license key validation on activation** (BUG-011):
  - Extension didn't validate license key when activated (only on first command)
  - Fix: Added LIVE validation on extension.activate()
  - Files: `vscode-lumina/src/extension.ts` (activation hook validation)

- **License key format validation** (BUG-002C):
  - Updated regex to accept new license key format (AL-XXXX-XXXX-XXXX-XXXX)
  - Backward compatible with old format
  - Files: `products/lumina-desktop/src-tauri/src/auth.rs`

#### **API & Authentication**

- **TranscriptionResponse struct using USD instead of tokens** (BUG-002A):
  - API returned `credits_remaining` in USD, but desktop app expects tokens
  - Fix: Migrated to token-based response format
  - Files: `website/app/api/desktop/transcribe/route.ts`

- **Token balance API missing Bearer authentication** (BUG-002B):
  - Security improvement: Added Bearer token auth to GET /api/tokens/balance
  - Files: `website/app/api/tokens/balance/route.ts`

- **Error handling for 401/402/403 API responses** (BUG-004):
  - Desktop app didn't handle authentication errors gracefully
  - Fix: Added error dialogs for unauthorized (401), insufficient tokens (402), inactive device (403)
  - Files: `products/lumina-desktop/src/components/VoiceCapture.tsx`

- **AppSettings missing user_id, device_id, tier fields** (BUG-003):
  - Settings struct incomplete for license validation
  - Fix: Added required fields for authentication flow
  - Files: `products/lumina-desktop/src-tauri/src/settings.rs`

#### **UI/UX Improvements**

- **Settings buttons non-functional** (BUG-014):
  - Settings panel buttons (Save, Reset, Import, Export) not working
  - Root cause: Event handlers not wired up
  - Fix: Implemented button handlers
  - Files: `vscode-lumina/src/commands/settingsPanel.ts`

- **License activation dialog missing** (BUG-005):
  - Frontend UI for license activation wizard incomplete
  - Fix: Created LicenseActivationDialog component
  - Files: `products/lumina-desktop/src/components/LicenseActivationDialog.tsx`

### Changed

- **Sprint Panel UI**: Now displays `enhanced_prompt` and `task_document` fields (UI-001)
- **Terminal naming**: Improved duplicate name warning message clarity (UI-002)
- **Pre-commit hooks**: Added validation for task documentation and completion notes (INFRA-003, VAL-002)

### Deprecated

- **v2.5 AI Enhancement Architecture**: Replaced with v3.0 Context Builder Pattern
  - Old architecture: 400+ lines of button-specific handlers
  - New architecture: ~30 lines universal handler + IContextBuilder strategy pattern
  - Migration: Automatic (no user action required)

### Security

- **License validation on first launch**: Desktop app now validates license key at startup (BUG-002)
- **Bearer token authentication**: Token balance API now requires Bearer token (BUG-002B)
- **Device fingerprinting**: License validation includes device ID verification (BUG-002)

---

## [0.17.0] - 2025-11-11 - Sprint 4: Key Authorization & Monetization

### Added

#### **Server-Side OpenAI Key Management** (Pattern-MONETIZATION-001)
- **Token-based pricing system**: 375 tokens per minute of transcription
  - Free tier: 250,000 tokens (~666 minutes one-time)
  - Pro tier: 1,000,000 tokens/month ($29.99/month)
  - Token purchase: 1,000,000 tokens ($24.99 one-time, never expires)
  - Files: `website/supabase/migrations/007_credit_system.sql`, `008_token_system.sql`

- **Desktop app token integration**:
  - Token balance display (shows tokens + tier, real-time updates)
  - Pre-flight checks before recording (requires 375 tokens minimum)
  - Server-driven warning system (80%, 90%, 95% thresholds)
  - License key activation wizard (Step 3 in InstallationWizard)
  - Files: `products/lumina-desktop/src-tauri/src/transcription.rs`, `products/lumina-desktop/src/components/VoiceCapture.tsx`

- **API endpoints deployed to production**:
  - `GET /api/tokens/balance` - Check token balance with warnings array
  - `POST /api/desktop/transcribe` - Server-proxied Whisper transcription with token deduction
  - `POST /api/tokens/consume` - Manual token deduction for future features
  - `POST /api/stripe/create-checkout` - Stripe Checkout Session integration
  - `POST /api/webhooks/stripe` - Stripe webhook fulfillment
  - Production URL: https://aetherlight-aelors-projects.vercel.app

- **Website dashboard UI**:
  - Token balance widget on main dashboard
  - Shows: Balance, usage, tier, minutes remaining
  - "Buy Tokens" button opens pricing page
  - Stripe integration for token purchases and subscriptions
  - Production URL: https://aetherlight.dev/dashboard

- **Monthly token refresh automation**:
  - Vercel cron job (runs 1st of each month)
  - Endpoint: `/api/cron/refresh-tokens`
  - Automatic 1M token refresh for Pro users
  - Files: `website/vercel.json`, `website/app/api/cron/refresh-tokens/route.ts`

### Changed

- **Desktop app Whisper proxy**: Transcription now goes through server API instead of direct OpenAI calls
  - Architecture: Desktop → Server API → OpenAI (server manages API key)
  - Token deduction tracked automatically per transcription
  - Error handling: 401 (invalid key), 402 (insufficient tokens), 403 (inactive device), 500 (server error)

- **Token balance UI**: Replaced client-side warning calculation with server-driven display
  - Removed 35 lines of client-side threshold logic
  - Server calculates warnings based on subscription tier
  - Desktop displays warnings from API response
  - Files: `products/lumina-desktop/src/components/VoiceCapture.tsx:54-84` (deleted)

- **Warnings API**: Enhanced with server-side threshold calculation
  - Warning levels: medium (80%), high (90%), critical (95%)
  - Thresholds calculated per subscription tier
  - Backward compatible (works with or without warnings field)

### Removed

- **BYOK (Bring Your Own Key) model removed from extension**:
  - `transcribeAudioWithWhisper()` function deleted from `voicePanel.ts`
  - `transcribeAudio()` function deleted from `voiceRecorder.ts`
  - `transcribe()` function deleted from `voice-capture.ts`
  - `api.openai.com` removed from CSP header
  - All OpenAI API calls replaced with error messages directing users to desktop app

### Deprecated

- **OpenAI-related settings** (Sprint 4):
  - `aetherlight.openaiApiKey` - No longer functional (marked [DEPRECATED Sprint 4])
  - `aetherlight.terminal.voice.autoTranscribe` - No longer functional
  - `aetherlight.terminal.voice.openaiModel` - No longer functional
  - `aetherlight.openai.apiKey` - No longer functional
  - `aetherlight.desktop.whisperModel` - No longer functional
  - `aetherlight.desktop.offlineMode` - Default changed to false, marked deprecated

### Fixed

- **RLS blocking license key authentication** (2025-11-11):
  - Changed API to use service role key (bypasses Row Level Security)
  - License key authentication now works in production
  - Files: `website/lib/supabase/server.ts`, `website/app/api/tokens/balance/route.ts`
  - Deployed: Commit 29c379e7

- **Pricing documentation mismatch** (2025-11-11):
  - Updated code comment to match production ($29.99/month for Pro)
  - File: `website/lib/stripe/config.ts`
  - Deployed: Commit 8b3c9795

### Breaking Changes

- **Extension v0.17.0 requires desktop app v0.17.0**: Both must be upgraded together
- **BYOK model removed**: Users can no longer provide their own OpenAI API keys
- **OpenAI API key settings no longer functional**: All transcription goes through server
- **License key required**: Users must sign up and activate license key in desktop app

### Migration

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for upgrading from BYOK (v0.16.x) to server-managed keys (v0.17.0).

**Key Migration Steps:**
1. Update extension to v0.17.0
2. Update desktop app to v0.17.0
3. Sign up at https://aetherlight.dev/signup
4. Get license key from dashboard
5. Enter key in desktop app installation wizard (Step 3)
6. Start recording - transcription now works through server!

### Pattern Reference

- **Pattern-MONETIZATION-001**: Server-Side Key Management
  - Architecture: Extension → Desktop → Server → OpenAI
  - Token-based pricing (375 tokens/minute)
  - Credit tracking and usage limits
  - Server-calculated warning thresholds

### Test Credentials (Production)

- Free tier: License key `CD7W-AJDK-RLQT-LUFA` (250,000 tokens)
- Pro tier: License key `W7HD-X79Q-CQJ9-XW13` (1,000,000 tokens/month)

---

## [0.16.x] - 2025-11-08 - Sprint 3: MVP-003 Prompt System, Self-Configuration & UX Polish

### Added

#### **MVP-003 Prompt System** (Pattern-CODE-001, Pattern-TASK-ANALYSIS-001)
- **PROTECT-000A**: Variable-driven task analyzer with 8-step analysis workflow
  - Gap detection (missing variables, undefined patterns, ambiguous descriptions)
  - Question generation for gathering missing context
  - Variable extraction from task descriptions
  - Agent capability validation
  - Files: `vscode-lumina/src/services/TaskAnalyzer.ts`, `test/services/taskAnalyzer.test.ts`

- **PROTECT-000D**: Generic Q&A modal wizard UI
  - Multi-question support (1-4 questions per modal)
  - Markdown rendering for question context
  - Free-text and multiple-choice question types
  - Integration with TaskAnalyzer gap detection
  - Files: `vscode-lumina/src/services/TaskQuestionModal.ts`, `test/services/taskQuestionModal.test.ts`

- **PROTECT-000B**: "Start Next Task" button with smart task selection
  - Automatic next-task detection (pending tasks, dependency resolution)
  - Integration with MVP-003 (TaskAnalyzer → Questions → Enhanced Prompt)
  - Auto-sends enhanced prompt to terminal
  - Files: `vscode-lumina/src/commands/voicePanel.ts` (Start Next Task handler)

- **PROTECT-000C**: "Start This Task" button with prompt generation
  - Single-task prompt export via TaskPromptExporter
  - Enhanced prompts with temporal drift context, project state, validation criteria
  - Same MVP-003 intelligence (gap detection, questions, variables)
  - Files: `vscode-lumina/src/services/TaskPromptExporter.ts`, `test/services/taskPromptExporter.test.ts`

- **PROTECT-000E**: Code Analyzer enhancement for project config population
  - Auto-populates `project-config.json` from workspace analysis
  - Framework detection (React, Next.js, Express, etc.)
  - Dependency extraction (package.json, Cargo.toml, requirements.txt)
  - Path structure analysis (src/, test/, docs/)
  - Files: `vscode-lumina/src/commands/voicePanel.ts` (Code Analyzer handler)

- **PROTECT-000F**: Template-based enhancement system (MVP-003 universal)
  - Extends MVP-003 to support ad-hoc enhancements (non-TOML tasks)
  - Template tasks for Bug Report, Feature Request, Code Analyzer, Sprint Planner
  - `generateEnhancedPromptFromTemplate()` method for universal enhancement
  - Files: `vscode-lumina/src/services/TemplateTaskBuilder.ts`, `test/services/templateTaskBuilder.test.ts`

- **MVP-001**: Comprehensive integration tests for MVP-003 system
  - 15+ test scenarios covering full workflow (TaskAnalyzer → Questions → Enhanced Prompt)
  - Edge cases: no gaps, multiple gaps, invalid answers, circular dependencies
  - 85% code coverage for MVP-003 components
  - Files: `vscode-lumina/test/integration/mvp003.test.ts`

#### **Sprint Template System** (Pattern-SPRINT-TEMPLATE-001)
- **TEMPLATE-001**: Created SPRINT_TEMPLATE.toml with 27 normalized tasks
  - 13 REQUIRED tasks (documentation, tests, audits, infrastructure)
  - 4 SUGGESTED tasks (performance, security, compatibility)
  - 0-8 CONDITIONAL tasks (publishing if releasing, UX if user-facing changes)
  - 2 RETROSPECTIVE tasks (sprint retrospective, pattern extraction)
  - File: `internal/SPRINT_TEMPLATE.toml`

- **TEMPLATE-002**: Enhanced sprint-plan skill with template injection
  - Automatically injects 19-27 normalized tasks into every sprint
  - User reviews task list before generation
  - Prevents forgetting CHANGELOG, tests, audits, retrospectives
  - File: `.claude/skills/sprint-plan/SKILL.md`

- **TEMPLATE-003**: Updated SprintSchemaValidator with template validation
  - Validates template structure (REQUIRED, SUGGESTED, CONDITIONAL, RETROSPECTIVE)
  - Ensures task injection preserves sprint integrity
  - File: `vscode-lumina/src/services/SprintSchemaValidator.ts`

- **TEMPLATE-004**: Updated WorkflowCheck with template enforcement
  - Pre-commit hook validates sprint completeness
  - Checks for required tasks (CHANGELOG, RETRO, DOC)
  - File: `vscode-lumina/src/services/WorkflowCheck.ts`

- **TEMPLATE-005**: Sprint template system documentation
  - Comprehensive guide (docs/SPRINT_TEMPLATE_GUIDE.md)
  - Task categories explained with examples
  - Sprint planning workflow with template injection
  - File: `internal/SPRINT_TEMPLATE_GUIDE.md`

- **TEMPLATE-006**: Tested template system by generating Phase 7 tasks
  - Validated template injection works end-to-end
  - Generated 12 documentation tasks (DOC-001 through DOC-008, AGENT-001/002, RETRO-001/002)
  - File: `internal/sprints/ACTIVE_SPRINT.toml` (Phase 7 tasks)

#### **Self-Configuration System (Phase 2-5)** (Pattern-SELF-CONFIG-001)

**Phase 2: Foundation (SELF-001 through SELF-005)**
- **SELF-001**: VariableResolver service for {{VAR}} syntax
  - Resolves variables in templates using project config
  - Fallback chains (project → defaults → user input)
  - Nested variable support ({{paths.src}}/components)
  - Files: `vscode-lumina/src/services/VariableResolver.ts`, `test/services/VariableResolver.test.ts`

- **SELF-002**: ProjectConfigGenerator service
  - Generates `project-config.json` from detection + interview results
  - Template-driven generation with variable substitution
  - Validation against schema
  - Files: `vscode-lumina/src/services/ProjectConfigGenerator.ts`, `test/services/ProjectConfigGenerator.test.ts`

- **SELF-003**: project-config.json schema definition
  - 50+ variables (language, framework, paths, tools, workflow, build, test, domain_specific)
  - JSON Schema validation (type checking, required fields)
  - File: `.aetherlight/schemas/project-config-v2.json`

- **SELF-003A**: Comprehensive variable documentation
  - All 50+ variables documented with context, examples, relationships
  - Variable categories (core, paths, tooling, workflow, domain-specific)
  - File: `docs/variable-reference.md`

- **SELF-004**: Inquirer.js CLI prompts integration
  - Interactive interview flows for missing variables
  - Support for text input, select, confirm, multiselect question types
  - Files: `vscode-lumina/src/services/InterviewEngine.ts`, `test/services/InterviewEngine.test.ts`

- **SELF-005**: Phase 2 integration tests
  - Tests VariableResolver + ProjectConfigGenerator + Schema validation
  - 85% coverage for Phase 2 services
  - File: `vscode-lumina/test/integration/phase2.test.ts`

**Phase 3: Detection (SELF-006 through SELF-010)**
- **SELF-006**: TechStackDetector service
  - Detects languages (TypeScript, Python, Rust, Go, Java) from file extensions
  - Detects frameworks (React, Next.js, Express, Django, Flask, Actix, Axum) from dependencies
  - Heuristic-based detection (package.json, Cargo.toml, requirements.txt, go.mod, pom.xml)
  - Files: `vscode-lumina/src/services/TechStackDetector.ts`, `test/services/TechStackDetector.test.ts`

- **SELF-007**: ToolDetector service
  - Detects package managers (npm, yarn, pnpm, cargo, pip, go)
  - Detects linters (ESLint, Pylint, Clippy)
  - Detects formatters (Prettier, Black, rustfmt)
  - Detects test frameworks (Jest, Pytest, Cargo test)
  - Files: `vscode-lumina/src/services/ToolDetector.ts`, `test/services/ToolDetector.test.ts`

- **SELF-008**: WorkflowDetector service
  - Detects Git hooks (pre-commit, pre-push, commit-msg)
  - Detects CI/CD (.github/workflows, .gitlab-ci.yml, .circleci/)
  - Detects Docker (Dockerfile, docker-compose.yml)
  - Files: `vscode-lumina/src/services/WorkflowDetector.ts`, `test/services/WorkflowDetector.test.ts`

- **SELF-009**: DomainDetector service (software-dev only for MVP)
  - Detects domain type (software-dev for MVP, extensible to other domains)
  - Loads domain-specific templates and interview flows
  - Foundation for multi-domain support (legal, medical, finance in future)
  - Files: `vscode-lumina/src/services/DomainDetector.ts`, `test/services/DomainDetector.test.ts`

- **SELF-010**: Phase 3 integration tests
  - Tests detection pipeline (TechStack → Tools → Workflow → Domain)
  - 85% coverage for Phase 3 services
  - File: `vscode-lumina/test/integration/phase3.test.ts`

**Phase 4: Interview (SELF-011 through SELF-015)**
- **SELF-011**: CLI interview flow implementation
  - Orchestrates detection → interview → config generation workflow
  - Question flows based on detection results
  - Retry logic for validation failures
  - Files: `vscode-lumina/src/commands/interviewFlow.ts`, `test/commands/interviewFlow.test.ts`

- **SELF-012**: Detection + Interview + Config generation integration
  - End-to-end workflow from `aetherlight init` to generated `project-config.json`
  - Handles partial detection (asks questions for missing info)
  - Generates CLAUDE.md, agent contexts, and config from templates
  - Files: `vscode-lumina/src/commands/init.ts`, `test/e2e/init.test.ts`

- **SELF-013**: Template customization system
  - Allows users to customize templates per project
  - Template variables resolved from project config
  - Overrides mechanism (project templates override defaults)
  - Files: `vscode-lumina/src/services/TemplateCustomizer.ts`, `test/services/TemplateCustomizer.test.ts`

- **SELF-014**: Variable resolution interview flow
  - Specialized interview flow for resolving undefined variables
  - Triggered when {{VAR}} resolution fails (no value in config)
  - Updates project-config.json with resolved values
  - Files: `vscode-lumina/src/commands/variableResolutionFlow.ts`, `test/commands/variableResolutionFlow.test.ts`

- **SELF-015**: Phase 4 integration tests
  - Tests full interview flow (detection → interview → config)
  - 85% coverage for Phase 4 services
  - File: `vscode-lumina/test/integration/phase4.test.ts`

**Phase 5: Migration (SELF-016 through SELF-020)**
- **SELF-016**: Upgrade command (`aetherlight upgrade`)
  - Migrates project config from v1 to v2 (schema changes)
  - User confirmation before applying changes
  - Rollback mechanism if upgrade fails
  - Files: `vscode-lumina/src/commands/upgrade.ts`, `test/commands/upgrade.test.ts`

- **SELF-017**: Version tracking system
  - Tracks schema version in `project-config.json` (schemaVersion: "2.0.0")
  - Detects when upgrade needed (v1 → v2 migration)
  - Validates schema version compatibility
  - Files: `vscode-lumina/src/services/VersionTracker.ts`, `test/services/VersionTracker.test.ts`

- **SELF-018**: Config migration service
  - Migrates config from old schema to new schema
  - Field mapping (renames, type conversions, new defaults)
  - Data preservation (no data loss during migration)
  - Files: `vscode-lumina/src/services/ConfigMigration.ts`, `test/services/ConfigMigration.test.ts`

- **SELF-019**: Backup/rollback mechanism
  - Creates `.aetherlight/backups/config-TIMESTAMP.json` before upgrade
  - Rollback command to restore previous config
  - Automatic rollback on upgrade failure
  - Files: `vscode-lumina/src/services/BackupManager.ts`, `test/services/BackupManager.test.ts`

- **SELF-020**: Phase 5 integration tests
  - Tests full upgrade flow (backup → migrate → validate → rollback on failure)
  - 85% coverage for Phase 5 services
  - File: `vscode-lumina/test/integration/phase5.test.ts`

- **SELF-021**: Comprehensive integration tests (Phase 6)
  - Tests all phases together (detection → interview → generation → upgrade)
  - Real project scenarios (TypeScript, Python, Rust projects)
  - Edge cases (missing dependencies, invalid configs, partial detection)
  - File: `vscode-lumina/test/integration/comprehensive.test.ts`

#### **Protection System** (Pattern-PROTECT-001, Pattern-PROTECT-002)
- **PROTECT-000**: Task prompt export system for AI delegation
  - Exports TOML tasks as enhanced AI prompts
  - Foundation for MVP-003 system
  - Files: `vscode-lumina/src/services/TaskPromptExporter.ts`

- **PROTECT-001**: Code protection annotations (@protected, @immutable, @maintainable)
  - Annotate passing code to prevent regressions
  - Protection levels define edit constraints
  - Files: `vscode-lumina/src/**/*.ts` (protection annotations throughout)

- **PROTECT-002**: Pre-commit protection enforcement
  - Git pre-commit hook validates no protected code modified without approval
  - Blocks commits that break protection policy
  - File: `.git/hooks/pre-commit` (installed via `vscode-lumina/scripts/install-hooks.sh`)

- **PROTECT-003**: Updated CODE_PROTECTION_POLICY.md with actual state
  - Documents protection system architecture
  - Protection level definitions and enforcement rules
  - File: `CODE_PROTECTION_POLICY.md`

### Changed

#### **UX Polish Improvements** (Phase 0b)
- **UX-001**: Improved Sprint tab task filtering
  - Added "Show/Hide Completed Tasks" checkbox
  - Persisted filter state across panel reloads
  - File: `vscode-lumina/src/commands/voicePanel.ts` (Sprint tab filter)

- **UX-003**: Show/Hide Completed Tasks checkbox
  - Checkbox in Sprint header for toggling completed task visibility
  - Default: Show all tasks
  - File: `vscode-lumina/src/commands/voicePanel.ts`

- **UX-004**: Removed button text, kept icons only
  - Cleaner toolbar with icon-only buttons
  - Saved 20-30px horizontal space
  - File: `vscode-lumina/src/commands/voicePanel.ts` (toolbar)

- **UX-005**: Moved "Start Next Task" button to sprint header
  - More prominent placement for primary action
  - Single-click access to start next task
  - File: `vscode-lumina/src/commands/voicePanel.ts` (Sprint header)

- **UX-006**: Text area UI improvements
  - Added resize handle for adjustable height
  - Removed redundant label
  - Saved 15-20px vertical space
  - File: `vscode-lumina/src/commands/voicePanel.ts` (text area)

- **UX-007**: Ctrl+Shift+Enter hotkey for send + submit
  - Send to terminal + execute immediately
  - No need to click into terminal and press Enter
  - File: `vscode-lumina/src/commands/voicePanel.ts` (keyboard handler)

- **UX-008**: Removed terminal edit button
  - Simplified terminal list UI
  - Terminal name editing was non-functional (VS Code API limitation)
  - File: `vscode-lumina/src/commands/voicePanel.ts` (terminal list)

- **UX-009**: Improved Sprint task sorting
  - Sort by: status (pending first), phase, dependencies
  - Grouped by epic/phase for better organization
  - File: `vscode-lumina/src/services/SprintLoader.ts` (task sorting)

- **UX-010**: Added task dependency visualization
  - Shows blocked tasks with dependency arrows
  - Visual indication of task readiness
  - File: `vscode-lumina/src/commands/voicePanel.ts` (task rendering)

- **UX-011**: Improved terminal auto-selection logic
  - Prefers ÆtherLight Claude terminals
  - Falls back to active terminal if no ÆtherLight terminal
  - File: `vscode-lumina/src/services/AutoTerminalSelector.ts`

- **UX-012**: Added keyboard navigation for Sprint tasks
  - Arrow keys to navigate task list
  - Enter to start selected task
  - File: `vscode-lumina/src/commands/voicePanel.ts` (keyboard navigation)

- **UX-013**: Improved error messages with actionable suggestions
  - "No terminal selected" → "Select a terminal from the dropdown"
  - "Text area empty" → "Enter a command or use voice capture"
  - File: `vscode-lumina/src/commands/voicePanel.ts` (error handling)

- **UX-014**: Added loading spinner for Sprint panel
  - Visual feedback during TOML loading
  - Prevents confusion when Sprint tab is loading
  - File: `vscode-lumina/src/commands/voicePanel.ts` (Sprint loader)

### Deprecated

- **DEPRECATE-001**: F13 quick voice capture hotkey removed
  - Reason: F13 key doesn't exist on modern keyboards (Windows/Mac)
  - Alternative: Use backtick (`) key instead
  - Files: `vscode-lumina/package.json`, `vscode-lumina/KNOWN_ISSUES.md`, `vscode-lumina/MAC_SETUP.md`

- **DEPRECATE-002**: Shift+Backtick global voice typing hotkey removed
  - Reason: Conflicted with backtick-only approach, caused user confusion
  - Alternative: Use backtick (`) key for voice capture
  - Files: `vscode-lumina/package.json`, `vscode-lumina/KNOWN_ISSUES.md`, `vscode-lumina/QUICK_START.md`

### Fixed

- **POST-001**: Fixed .vscodeignore bloat for v0.16.8
  - Reduced extension package size by excluding unnecessary files
  - File: `vscode-lumina/.vscodeignore`

- **POST-004**: Added publishing order enforcement to prevent protocol violations
  - Ensures sub-packages published before main extension
  - Prevents version mismatch bugs (v0.13.29 historical issue)
  - File: `scripts/publish-release.js`

- **POST-005**: Fixed automated publish script to handle package architecture changes
  - Updated script to publish 4 packages in correct order (analyzer → sdk → node → main)
  - File: `scripts/publish-release.js`

- **BACKLOG-001**: Completed manual testing for PROTECT-000A through PROTECT-000D
  - Validated MVP-003 system works end-to-end
  - File: `MANUAL_TEST_PHASE_1.md`

### Documentation

- **Pattern-CODE-001**: Code development workflow pattern
  - 8-step pre-code workflow (git check, pattern review, announce, implement)
  - TDD requirement enforcement
  - File: `docs/patterns/Pattern-CODE-001.md`

- **Pattern-GIT-001**: Git workflow integration pattern
  - Pre-task git status check
  - Workflow announcement before coding
  - File: `docs/patterns/Pattern-GIT-001.md`

- **Pattern-IMPROVEMENT-001**: Gap detection & self-improvement pattern
  - Identifies missing patterns/skills/agents during development
  - Self-improving system through gap detection
  - File: `docs/patterns/Pattern-IMPROVEMENT-001.md`

- **Pattern-SPRINT-PLAN-001**: Sprint planning process pattern
  - 12-step sprint planning workflow
  - Template injection and user approval
  - File: `docs/patterns/Pattern-SPRINT-PLAN-001.md`

- **Pattern-TASK-ANALYSIS-001**: 8-step pre-task analysis pattern
  - Task analysis workflow (read task → detect gaps → generate questions)
  - Integration with MVP-003 system
  - File: `docs/patterns/Pattern-TASK-ANALYSIS-001.md`

- **SPRINT_TEMPLATE_GUIDE.md**: Comprehensive sprint template system documentation
  - 27 normalized tasks explained
  - Task categories (REQUIRED, SUGGESTED, CONDITIONAL, RETROSPECTIVE)
  - Sprint planning workflow with template injection
  - File: `internal/SPRINT_TEMPLATE_GUIDE.md`

- **Variable Reference**: All 50+ project config variables documented
  - Comprehensive variable documentation with examples
  - Variable categories and relationships
  - File: `docs/variable-reference.md`

- **Pattern Refactoring**: 76 pattern files updated with Pattern-PATTERN-001 compliance
  - Added missing metadata (LANGUAGE, QUALITY SCORE, RELATED, DEPENDENCIES)
  - Files: `docs/patterns/*.md`

### Technical Details

- **Test Coverage**: 85% average across new modules
  - MVP-003 system: 85% coverage (PROTECT-000A through PROTECT-000F)
  - Self-configuration: 85% coverage (SELF-001 through SELF-020)
  - Template system: 90% coverage (TEMPLATE-001 through TEMPLATE-006)

- **Performance Targets**: Self-configuration init target <5s (Phase 6 optimization pending)
- **TypeScript Compilation**: Zero errors across all packages
- **Pattern Compliance**: Pattern-CODE-001, Pattern-TDD-001, Pattern-SPRINT-TEMPLATE-001, Pattern-SELF-CONFIG-001
- **Sprint Completion**: 57/63 tasks complete (90%)

### Breaking Changes

None. All changes are backwards compatible.

### Known Issues

- **Phase 6 Testing**: Comprehensive integration testing (SELF-021) and E2E testing (SELF-022) pending
- **Performance Optimization**: Init performance optimization (SELF-023) pending - Target <5s not yet validated
- **Documentation**: Self-Configuration Guide (SELF-024) pending
- **Final Validation**: Release preparation (SELF-025) pending

---

## [0.16.7] - 2025-11-05 - Sprint Enhancement & UI Polish

### Added
- **Sprint-plan ENHANCE Mode**: Add tasks to existing sprints without recreating entire sprint file
  - Invocation decision logic (CREATE vs ENHANCE based on user intent)
  - 10-step ENHANCE workflow documentation
  - Mode Comparison table for choosing correct workflow
  - Tested by adding 7 RELEASE tasks to v0.16 sprint
  - File: `.claude/skills/sprint-plan/SKILL.md` (lines 42-1101)

- **Bug Report Form**: Structured form with Severity, Component, Description fields
  - Form → Enhance button → Main text area → Terminal workflow
  - Integration with PromptEnhancer for AI-enhanced bug reports
  - File: `vscode-lumina/src/commands/voicePanel.ts` (lines 3638-3723)

- **Feature Request Form**: Structured form with Priority, Category, Use Case fields
  - Mirror of Bug Report pattern for consistency
  - AI enhancement via PromptEnhancer service
  - File: `vscode-lumina/src/commands/voicePanel.ts` (lines 3730-3822)

- **Sprint File Dropdown**: Multi-sprint file support via `findAvailableSprints()`
  - Format: `ACTIVE_SPRINT_[DESCRIPTOR].toml` (version/date/feature based)
  - Dropdown in Sprint panel header for easy switching
  - File: `vscode-lumina/src/commands/voicePanel.ts` (lines 2050-2054)

- **Skills Management UI**: List all installed skills with click-to-open
  - Scans `.claude/skills/` directory
  - Opens SKILL.md files in editor
  - File: `vscode-lumina/src/commands/voicePanel.ts` (lines 3829-3904)

- **Settings UI**: Minimal settings (Dev Mode, Sprint Path)
  - Removed dedicated Settings tab for simpler UX
  - Settings accessible via toolbar button → workflow area
  - File: `vscode-lumina/src/commands/voicePanel.ts` (lines 3911-3970)

### Fixed
- **UI-001**: Restore Bug/Feature/Skills/Settings button functionality (REFACTOR-005 removed them)
- **UI-002**: Fix 🎤 Record button functionality (REFACTOR-005 moved it, broke handler)
- **UI-003**: Fix Resize to Default button functionality
- **UI-004**: Fix Sprint Loader spinner positioning (overlapped toolbar)
- **UI-005**: Fix console error: Settings tab reference removed
- **UI-006**: Implement Bug/Feature forms with structured input → AI enhancement
- **UI-007**: Reduce header spacing to maximize vertical space (saved 40-60px)
- **UI-008**: Consolidate Voice/Send buttons into toolbar row (saved 50px)
- **UI-009**: Add sprint file dropdown to header row
- **UI-010**: Consolidate task statistics to single row with checkbox

### Refactored
- **REFACTOR-004**: Single-row toolbar with LEFT/CENTER/RIGHT sections
  - LEFT: Primary actions (Record, Code Analyzer, Sprint Planner, Enhance, Send, Clear)
  - CENTER: Keyboard shortcuts hint
  - RIGHT: Utilities (Bug, Feature, Skills, Settings)
  - Saved 60-80px vertical space
  - File: `vscode-lumina/src/commands/voicePanel.ts` (lines 1574-1662, 4133-4175)

- **REFACTOR-005**: Remove Settings tab, use toolbar button + workflow area
  - Simpler tab structure (Voice + Sprint only)
  - Settings accessible via ⚙️ button
  - File: `vscode-lumina/src/commands/voicePanel.ts`

- **REFACTOR-006**: Unified workflow area pattern for all interactive tools
  - One workflow visible at a time
  - ESC key closes active workflow
  - Smooth 300ms transitions
  - File: `vscode-lumina/src/commands/voicePanel.ts` (lines 3556-3608)

### Documentation
- **Sprint Planner UI Architecture**: Comprehensive component documentation
  - 9 major components documented
  - Integration points mapped (PromptEnhancer, SprintLoader, TaskStarter, AutoTerminalSelector)
  - Message handler catalog (14 IPC messages)
  - ASCII layout diagram
  - Testing checklist (35+ test cases)
  - File: `vscode-lumina/docs/SPRINT_PLANNER_UI.md`

- **README Updates**: Added v0.16.7 features to feature lists
  - Main extension README: Sprint Planning, Bug/Feature forms, Multi-sprint management
  - Root README: Sprint ENHANCE mode, single-panel UI, structured forms
  - Documentation section with Sprint Planner UI link

- **npm Package Metadata**: Updated descriptions and keywords
  - Description: Added "sprint planning with AI", "bug/feature forms"
  - Keywords: Added "sprint-planning", "agile", "bug-report", "feature-request", "claude", "prompt-enhancement"

- **Sub-Package Publish Order**: Critical publishing documentation added
  - Explains why sub-packages MUST be published first
  - Documents automated script order (analyzer → sdk → node → main)
  - References v0.13.29 historical bug (2-hour emergency fix)
  - File: `PUBLISHING.md` (lines 92-106)

### Changed
- **Sprint File Naming Convention**: `ACTIVE_SPRINT_[DESCRIPTOR].toml` format
  - Supports version-based: `ACTIVE_SPRINT_v0.16.0.toml`
  - Supports date-based: `ACTIVE_SPRINT_2025-11-05.toml`
  - Supports feature-based: `ACTIVE_SPRINT_UI_REFACTOR.toml`
  - Legacy `ACTIVE_SPRINT.toml` still works

### Known Issues
- **UI-011**: WebView sprint task list doesn't auto-refresh on TOML changes
  - User must manually reload panel to see updated tasks
  - FileSystemWatcher or message passing issue
  - Tracked for investigation post-v0.16.7 release

### Technical Details
- All packages published: aetherlight, aetherlight-analyzer, aetherlight-sdk, aetherlight-node
- TypeScript compilation: No errors
- TOML validation: All sprint files parse correctly
- Pattern compliance: Pattern-SKILL-ENHANCE-001, Pattern-WORKFLOW-001, Pattern-UI-002, Pattern-DOCS-001
- Sprint completion: 22/31 tasks complete (71%)

---

## [0.15.1] - 2025-10-31 - Critical Bug Fixes

### Fixed
- **Skill Detection from Natural Language**: Fixed critical bug where skill detection was bypassed by complexity check
  - Natural language like "initialize my project" now properly triggers `/initialize` skill
  - Moved skill detection to run BEFORE complexity assessment
  - All 4 skills (initialize, sprint-plan, code-analyze, publish) now work from natural language
  - File: `vscode-lumina/src/services/PromptEnhancer.ts:82-127`

- **Record Button Functionality**: Fixed record button calling non-existent command
  - Button now actually starts recording instead of showing error
  - Changed from `captureVoiceGlobal` to `openVoicePanel` command
  - Matches backtick hotkey behavior
  - File: `vscode-lumina/src/commands/voicePanel.ts:1061-1070`

### Technical Details
- Root cause: Early return in complexity check prevented skill detection code from running
- Impact: Core v0.15.0 feature (natural language → skill detection) was completely broken
- Fix time: ~1 hour from audit to published release
- All packages published: aetherlight, aetherlight-analyzer, aetherlight-sdk, aetherlight-node

---

## [0.15.0] - 2025-10-31 - Autonomous Agent Features

### Added
- Skill-based command system for common workflows
- Natural language enhancement with skill detection
- PromptEnhancer service for intelligent prompt generation
- SkillDetector for automatic skill matching from user intent
- Four managed skills: initialize, sprint-plan, code-analyze, publish
- Audit documentation system for release validation

### Known Issues (Fixed in 0.15.1)
- Skill detection was non-functional due to flow control bug
- Record button didn't trigger recording

---

## [0.1.0] - 2025-10-27 - Initial Public Release

### 🎉 First Public Release

This is the initial public release of ÆtherLight for community testing and contribution.

**Status:** Pre-Beta Development
**Goal:** Stabilize and test for November 2025 beta launch

### Added

#### **VS Code Extension**
- Voice-to-text capture (backtick ` hotkey)
- 6-tab Activity Panel:
  - Voice tab (voice capture and transcription)
  - Sprint tab (task management)
  - Planning tab (sprint planning)
  - Patterns tab (pattern library)
  - Activity tab (recent activity)
  - Settings tab (configuration)
- Sprint and task management system (TOML-based)
- Terminal automation and management
- 24 registered commands
- 78 TypeScript source files

#### **Rust Core Library**
- Pattern matching system (~1,500 lines of code)
  - 509 lines pattern.rs
  - 489 lines confidence.rs
  - 21KB matching.rs
- Multi-dimensional confidence scoring
- Domain agents (33KB domain_agent.rs)
- Domain routing (26KB domain_router.rs)
- Network infrastructure (45KB agent_network.rs)
- Embeddings and transcription modules
- Vector store infrastructure
- Validation and verification systems
- 132 source files
- 521 test functions across 105 test modules

#### **Documentation**
- 60+ reusable design patterns with Chain of Thought reasoning
- Setup and integration guides
- Testing guide for contributors
- Pattern library index
- Comprehensive README and CONTRIBUTING docs
- Architecture documentation
- Chain of Thought standard

#### **Tools & Scripts**
- Code analyzer CLI (`@aetherlight/analyzer`)
- Pattern ingestion scripts
- Development helper scripts
- Build automation

#### **Architecture**
- Three-tier architecture: Local → Hosted → Global
- Local-first design (works offline by default)
- Optional cloud sync via user's own Supabase
- Global pattern network via API

### Infrastructure

#### **Build System**
- Cargo workspace for Rust components
- npm/pnpm workspaces for TypeScript packages
- Tauri for desktop app
- Next.js for web app

#### **Testing**
- Comprehensive test coverage (>80% target)
- 521 test functions in Rust core
- Integration test infrastructure

#### **Configuration**
- TOML-based configuration system
- Environment variable support
- Optional Supabase configuration
- Feature toggles

### Documentation Standards

- All code includes Chain of Thought reasoning
- Design patterns referenced throughout
- Performance targets documented
- Safety guarantees defined

---

## [0.0.1] - 2024-2025 - Internal Development

### Summary

Initial development phase (not publicly released):
- Core architecture design
- Proof of concept implementations
- Pattern library extraction from production codebases
- Initial Rust core development
- VS Code extension prototype
- Design pattern documentation
- Chain of Thought methodology development

---

## Release Notes

### About This Release (v0.1.0)

**What Works:**
- VS Code extension installs and activates
- Voice capture functional (backtick ` hotkey, transcription via Whisper)
- Sprint/task management operational
- Rust core library compiles with comprehensive tests
- Pattern library accessible (60+ documented patterns)

**What Needs Work (Help Wanted!):**
- Integration testing (Rust ↔ VS Code)
- NAPI bindings hardening
- Cross-platform testing
- Performance validation
- Offline mode completion
- Real-world pattern matching validation

**How to Help:**
- Install and test the extension
- Report bugs with detailed reproduction steps
- Contribute fixes and improvements
- Share feedback on Discord
- Help with documentation

---

## Version History

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| 0.1.0 | 2025-10-27 | Pre-Beta | Initial public release |
| 0.0.1 | 2024-2025 | Internal | Internal development (not released) |

---

## Upcoming Releases

### v1.0.0-beta.1 (Target: November 2025)
- Feature complete for beta
- Integration testing complete
- NAPI bindings stabilized
- Cross-platform support verified
- Performance targets validated
- Comprehensive testing across platforms
- Documentation finalized

### v1.0.0 (Target: December 2025 - January 2026)
- Beta feedback incorporated
- Pattern matching enhancements
- Domain agent improvements
- Network layer testing complete
- Embedding generation optimization
- Production-ready (with limitations noted)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to contribute to ÆtherLight.

For questions about releases or versioning:
- **Discord:** https://discord.gg/ExkyhBny
- **GitHub Discussions:** https://github.com/AEtherlight-ai/lumina/discussions

---

**Thank you to all contributors who make ÆtherLight possible!**

[Unreleased]: https://github.com/AEtherlight-ai/lumina/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/AEtherlight-ai/lumina/releases/tag/v0.1.0
[0.0.1]: Internal development phase
