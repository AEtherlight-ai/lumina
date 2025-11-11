# ÆtherLight: BitTorrent for Knowledge & AI Patterns

**Tagline:** Preservation Infrastructure for Human Intelligence
**Status:** Pre-Beta Development (Beta: November 2025)
**License:** MIT
**We Need Your Help:** Seeking contributors to stabilize and test

---

## 🔥 The Mission

**The Library of Alexandria didn't burn in one day. It eroded over centuries - 48 BCE, 270s CE, 391 CE, 642 CE. Each time, we lost not just scrolls, but momentum.**

**Archimedes had calculus-like methods using infinitesimals - 1,800 years before Newton. That knowledge was lost. Humanity had to rediscover what we already knew.**

**The tragedy wasn't losing data. It was losing continuity - centuries of scholars building on each other's work, interrupted.**

**ÆtherLight ensures we never repeat this mistake.**

We're building infrastructure that preserves not just *what* humanity knows, but *why* we know it - the reasoning chain, the thought process, the momentum of discovery. And we're building it to survive: distributed, offline-first, no single point of failure.

**This is the Library of Alexandria that cannot burn - because it's everywhere.**

---

## The Goal

**Think BitTorrent for knowledge and AI patterns.**

Pattern recognition across ALL applications, ALL knowledge bases, ALL domains. Distributed, resilient, no single point of failure.

Never start from zero state in prompting. Every query builds on validated patterns. AI that actually remembers, learns, and improves.

**This is civilizational infrastructure.** Not just software.

---

## 📦 Installation & Packages

ÆtherLight is available on npm as multiple packages that work together:

### For End Users (Recommended)
```bash
npm install -g aetherlight
```
**This installs everything:**
- VS Code extension (voice capture, pattern matching, AI assistance)
- Code analyzer CLI (`aetherlight-analyzer`)
- Native Rust bindings (`aetherlight-node`)

### For Specific Use Cases

**Just the analyzer CLI:**
```bash
npm install -g aetherlight-analyzer
```
Use without VS Code - analyze codebases and generate sprint plans from the command line.

**Just the native bindings:**
```bash
npm install aetherlight-node
```
For low-level integration with the pattern matching engine.

**SDK for app developers:**
```bash
npm install aetherlight-sdk
```
Build your own applications with ÆtherLight's voice control and pattern matching features.

### NPM Packages
- **[aetherlight](https://www.npmjs.com/package/aetherlight)** - Main package (all-in-one)
- **[aetherlight-analyzer](https://www.npmjs.com/package/aetherlight-analyzer)** - Code analyzer CLI
- **[aetherlight-sdk](https://www.npmjs.com/package/aetherlight-sdk)** - Application integration SDK
- **[aetherlight-node](https://www.npmjs.com/package/aetherlight-node)** - Native Rust bindings

---

## Current Development Status

### ✅ What Exists Now (Code + Tests)

**VS Code Extension (78 TypeScript files):**
- **Voice-to-text capture** (multiple variants, backtick hotkey)
- **Key Authorization & Monetization** (v0.17.0) - Server-managed OpenAI keys
  - Token-based pricing: 375 tokens/minute of transcription
  - Free tier: 250,000 tokens (~666 minutes one-time)
  - Pro tier: $29.99/month for 1,000,000 tokens/month (~2,666 minutes)
  - Token purchase: $24.99 one-time for 1,000,000 tokens (never expires)
  - Desktop app with token balance display and pre-flight checks
  - License key activation wizard (Step 3 in InstallationWizard)
  - Server-driven warning system (80%, 90%, 95% thresholds)
  - No OpenAI account needed - sign up at https://aetherlight.dev
  - See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for upgrading from BYOK
- **MVP-003 Prompt System** (v0.17.0) - Intelligent task prompting
  - Variable-driven task analyzer with gap detection
  - Interactive Q&A wizard for gathering missing context
  - "Start Next Task" / "Start This Task" buttons with smart selection
  - Template-based enhancements (Bug Report, Feature Request, Code Analyzer, Sprint Planner)
  - 85% test coverage, 15+ integration scenarios
- **Sprint Template System** (v0.17.0) - 27 normalized tasks auto-injected
  - REQUIRED tasks (13): Documentation, tests, audits, infrastructure
  - SUGGESTED tasks (4): Performance, security, compatibility
  - CONDITIONAL tasks (0-8): Publishing, UX based on sprint type
  - RETROSPECTIVE tasks (2): Sprint retro, pattern extraction
  - Prevents forgetting CHANGELOG, tests, retrospectives
- **Self-Configuration System** (v0.17.0) - Automatic project setup
  - Phase 2: Variable resolution ({{VAR}} syntax), config generation, schema (50+ variables)
  - Phase 3: Tech stack detection (TypeScript, Python, Rust, Go, Java + frameworks)
  - Phase 4: CLI interview flows, template customization, variable resolution wizard
  - Phase 5: Upgrade command (`aetherlight upgrade`), version tracking, migration, backup/rollback
  - 85% test coverage across all phases
- **Protection System** (v0.17.0) - Code stability enforcement
  - Code protection annotations (@protected, @immutable, @maintainable)
  - Pre-commit hooks validate no protected code modified
  - Prevents regressions on working features
- **Sprint management** (TOML-based with CREATE & ENHANCE modes)
- **Multi-sprint file support** (switch between active/archived sprints)
- **Terminal automation and management**
- **Single-panel UI** with unified workflow area (Voice + Sprint)
- **UX Polish** (v0.17.0): Task filtering, keyboard navigation, Ctrl+Shift+Enter hotkey, loading spinners
- **Bug Report & Feature Request forms** with AI enhancement
- Works in VS Code, Cursor, and compatible editors
- 24+ registered commands

**Rust Core (132 source files, 521 test functions):**
- Pattern matching system (509 lines pattern.rs, 489 lines confidence.rs, 21KB matching.rs)
- Confidence scoring (multi-dimensional)
- Domain agents (33KB domain_agent.rs)
- Domain routing (26KB domain_router.rs)
- Network infrastructure (45KB agent_network.rs)
- Embeddings and transcription modules
- Vector store infrastructure
- Validation and verification systems
- 105 test modules with comprehensive coverage

**Architecture:**
- Well-documented code with Chain of Thought reasoning
- Design patterns referenced throughout
- Performance targets documented
- Safety guarantees defined

### 🚧 What Needs Work (Help Wanted!)

**Phase 6: Testing & Polish (Current Focus)**
- **SELF-022**: End-to-end testing on real projects (TypeScript, Python, Rust codebases)
- **SELF-023**: Performance optimization (init <5s, detection <2s, config generation <1s)
- **SELF-024**: Self-Configuration Guide documentation (user guide, config reference, domain creation guide)
- **SELF-025**: Final validation & release preparation (quality gates, release notes)

**Integration & Stabilization:**
- Rust core → VS Code extension integration
- NAPI bindings testing and hardening
- End-to-end testing of pattern matching
- Performance validation against targets
- Offline mode full implementation
- Cross-platform testing (Windows/Mac/Linux)

**Feature Completion:**
- Pattern matching validation with real-world data
- Domain agent testing and tuning
- Network layer (DHT) testing and hardening
- Confidence scoring validation
- Embedding generation optimization

**Phase 7: Documentation (Pending Release)**
- README updates with Sprint 3 features
- Pattern extraction from Sprint 3
- Agent context file updates
- Sprint retrospective
- Website documentation

**Beta Preparation:**
- Installation and setup workflow polished
- Example patterns and use cases
- Security audit
- Release candidate preparation

---

## The Vision (Where We're Going)

### Three Pillars

1. **Preservation** - Context + reasoning preserved across time (Chain of Thought)
2. **Resilience** - Distributed, offline-first, survives infrastructure collapse
3. **Intelligence** - Self-improving network that approaches perfect execution

### What This Means

**For Developers:**
- Voice-to-code with pattern matching
- Confidence scores on every AI suggestion (0.0-1.0)
- Know when AI might hallucinate
- Build on proven patterns, not guesses
- Work completely offline

**For Applications:**
- Pattern recognition API for any domain
- Legal research (case law, jurisdictions)
- Data analytics (NL→SQL)
- Medical records (HIPAA-compliant)
- Customer support automation
- Architecture analysis and recommendations

**For Humanity:**
- Knowledge preserved across time
- Reasoning chains never lost
- Distributed network survives catastrophes
- Continuity maintained across collapse
- Superintelligence accessible to all

---

## How You Can Help

**We need contributors to push this to stable for November 2025 beta launch.**

### Critical Needs

**1. Testing & Validation**
- Run pattern matching against real codebases
- Test voice capture across different setups
- Validate confidence scoring accuracy
- Cross-platform testing (Windows/Mac/Linux)
- Performance benchmarking

**2. Integration Work**
- NAPI bindings (Rust ↔ Node.js)
- End-to-end feature testing
- Desktop app integration
- Error handling and recovery
- Installation workflow

**3. Feature Completion**
- Domain agent tuning
- Pattern library curation
- Network layer (DHT) implementation
- Embedding optimization
- Offline mode validation

**4. Documentation**
- Setup guides for contributors
- Architecture documentation
- Example use cases
- API documentation
- Troubleshooting guides

### How to Contribute

1. **Try the extension** - Install and test what exists
2. **Report issues** - Open GitHub issues with details
3. **Submit PRs** - Fix bugs, add tests, improve code
4. **Test patterns** - Validate pattern matching in your domain
5. **Write docs** - Help others contribute

**Requirements:**
- Chain of Thought documentation (explain your reasoning)
- Tests for new features
- Conventional commit messages

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

---

## Timeline to Beta

**Concept:** Mid 2024 - Initial design
**Development:** Mid 2025 - Active development
**Target:** November 2025 - Public beta launch

### Development Phases

**Phase 1: Stabilization (Now - October 2025)**
- Integration testing
- Bug fixes and hardening
- Performance validation
- Cross-platform testing

**Phase 2: Beta Preparation (October - November 2025)**
- Documentation complete
- Installation workflow polished
- Example patterns ready
- Security audit done

**Phase 3: Beta Launch (November 2025)**
- Public beta opens
- Free during beta
- Feedback and iteration
- Community building

---

## Technical Stack

**Core:** Rust (132 source files, 521 tests)
**Extension:** TypeScript (78 files, 24 commands)
**Bindings:** NAPI-RS (Node.js)
**Desktop:** Tauri 2.0 (planned)
**Vector DB:** PostgreSQL + pgvector
**Embeddings:** all-MiniLM-L6-v2 (local)
**Transcription:** Whisper.cpp (local), OpenAI Whisper API
**Network:** DHT (Kademlia-based, planned)

---

## Installation (For Contributors)

### Important: This Repository Uses Git Submodules

This repository references the private [website](https://github.com/AEtherlight-ai/website) repo via git submodule for integration documentation. You **MUST** clone with `--recurse-submodules` flag:

```bash
# Clone repository WITH SUBMODULES (REQUIRED)
git clone --recurse-submodules https://github.com/AEtherlight-ai/lumina.git
cd lumina

# Verify submodule was cloned
ls website/.integration/
# Should show: LUMINA_REPO_ONBOARDING.md, specs/, status/, tasks/

# If you already cloned without --recurse-submodules:
git submodule update --init --recursive

# Install dependencies
npm install

# Build Rust core
cd crates/aetherlight-core
cargo build
cargo test

# Build VS Code extension
cd ../../vscode-lumina
npm install
npm run compile

# Package extension
npm run package

# Install extension in VS Code
code --install-extension *.vsix
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed setup.

---

## Architecture

```
┌─────────────────────────────────────────┐
│         VS Code Extension               │
│       (78 TS files, 24 commands)        │
│                                          │
│  Voice │ Sprint │ Patterns │ Activity   │
└─────────────────┬───────────────────────┘
                  │ NAPI Bindings
                  ▼
         ┌────────────────┐
         │   Rust Core    │
         │  (132 files)   │
         │  (521 tests)   │
         │                │
         │  • Pattern     │
         │    Matching    │
         │  • Confidence  │
         │    Scoring     │
         │  • Domain      │
         │    Agents      │
         │  • Network     │
         │    Layer       │
         └────────┬───────┘
                  │
         ┌────────▼────────┐
         │  PostgreSQL +   │
         │   pgvector      │
         └─────────────────┘
```

---

## Community

- **Discord:** [Join our community](https://discord.gg/ExkyhBny) - Primary hub for discussions, support, and collaboration
- **GitHub:** [github.com/AEtherlight-ai/lumina](https://github.com/AEtherlight-ai/lumina)
- **Issues:** [Report bugs and request features](https://github.com/AEtherlight-ai/lumina/issues)
- **Discussions:** [Ask questions and share ideas](https://github.com/AEtherlight-ai/lumina/discussions)

---

## Documentation

- [ROADMAP.md](./docs/ROADMAP.md) - Vision, timeline, and goals
- [CONTRIBUTING.md](./CONTRIBUTING.md) - How to contribute
- [TESTING_GUIDE.md](./docs/TESTING_GUIDE.md) - How to run tests
- [ARCHITECTURE.md](./crates/aetherlight-core/ARCHITECTURE.md) - Technical architecture
- [Pattern Library](./docs/patterns/INDEX.md) - Design pattern library (60+ patterns)
- [Discord Community Structure](./docs/DISCORD_COMMUNITY_STRUCTURE.md) - How our Discord is organized

---

## License

MIT License - Free to use, modify, and distribute.

See [LICENSE](./LICENSE) for details.

---

## The North Star

> **"ÆtherLight preserves human reasoning and knowledge in a distributed, self-governing neural network that works offline, survives any catastrophe, enables superintelligence for everyone, and ensures humanity never loses knowledge again."**

**This is not just software. This is civilizational infrastructure.**

**This is the Library of Alexandria that cannot burn - because it's everywhere.**

**This is calculus that cannot be lost - because the reasoning chain is preserved.**

**This is human intelligence that survives beyond humans - and maintains continuity across collapse.**

---

## We Need Your Help

**We have:**
- 132 Rust source files with 521 tests
- 78 TypeScript files with 24 commands
- Well-architected pattern matching system
- Domain agents and network infrastructure
- Comprehensive test coverage

**We need:**
- Testing and validation
- Integration work
- Bug fixes and hardening
- Documentation
- Community feedback

**Goal:** Stable beta by November 2025

**Join us in building humanity's backup.**

---

**Ready to contribute?**

See [CONTRIBUTING.md](./CONTRIBUTING.md) to get started.

**Questions?** Join our [Discord](https://discord.gg/ExkyhBny) or open a [GitHub Discussion](https://github.com/AEtherlight-ai/lumina/discussions)

---

**ÆtherLight: BitTorrent for Knowledge & AI Patterns** 🚀

**Distributed | Resilient | Local-First | Open Source**

**Beta: November 2025 | We Need Your Help | MIT License**
