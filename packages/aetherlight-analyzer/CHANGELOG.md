# Changelog

All notable changes to @aetherlight/analyzer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-14

### Added
- **Parsers:**
  - TypeScript/JavaScript parser using ts-morph
  - Rust parser using syn crate (via subprocess)
  - AST extraction with classes, functions, imports, exports
  - Cyclomatic complexity calculation per function
  - Dependency graph generation

- **Analyzers:**
  - Architecture analyzer (detects MVC, MVVM, Clean, Hexagonal, Layered, Microservices patterns)
  - Complexity analyzer (McCabe's cyclomatic complexity with refactoring recommendations)
  - Technical debt analyzer (10 categories: TODO, FIXME, HACK, magic numbers, hardcoded values, etc.)

- **Generators:**
  - Sprint plan generator (Phase A: Enhancement, Phase B: Retrofit, Phase C: Dogfood)
  - Pattern extractor (extracts reusable patterns from high-quality code)
  - Chain of Thought documenter (generates comprehensive CoT documentation)

- **CLI:**
  - `init` command - Initialize .aetherlight workspace
  - `analyze` command - Analyze codebase with all analyzers
  - `generate-sprints` command - Generate Phase A/B/C sprint plans
  - `extract-patterns` command - Extract reusable patterns
  - `status` command - Show workspace progress

- **Documentation:**
  - Comprehensive README with examples
  - Chain of Thought documentation for all code
  - API reference documentation
  - Integration guide

### Performance
- Parser: <5s for 50k LOC TypeScript ✅
- Parser: <3s for 30k LOC Rust ✅
- Architecture analysis: <2s for 100 files ✅
- Complexity analysis: <1s for 1,000 functions ✅
- Technical debt analysis: <2s for 100 files ✅
- Sprint generation: <2s ✅
- Pattern extraction: <1s ✅

### Testing
- 22 CLI integration tests (100% passing)
- 33 sprint generator tests (100% passing)
- 23 pattern extractor tests (100% passing)
- 26 CoT documenter tests (100% passing)
- Total: 104 comprehensive tests

[1.0.0]: https://github.com/AEtherlight-ai/lumina/releases/tag/@aetherlight/analyzer@1.0.0
