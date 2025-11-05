# Changelog

All notable changes to ÆtherLight will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned for Beta (November 2025)
- End-to-end integration testing (Rust ↔ VS Code extension)
- NAPI bindings stabilization
- Cross-platform testing (Windows/Mac/Linux)
- Performance validation (<50ms pattern matching)
- Offline mode full implementation
- Pattern matching validation with real-world codebases

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
