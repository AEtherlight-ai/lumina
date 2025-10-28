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
