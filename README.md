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
- Voice-to-text capture (multiple variants)
- Sprint and task management (TOML-based)
- Terminal automation and management
- 6-tab Activity Panel (Voice, Sprint, Planning, Patterns, Activity, Settings)
- Works in VS Code, Cursor, and compatible editors
- 24 registered commands

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

**Beta Preparation:**
- Installation and setup workflow
- Documentation for contributors
- Example patterns and use cases
- Performance benchmarking
- Security audit

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

```bash
# Clone repository
git clone https://github.com/AEtherlight-ai/lumina.git
cd lumina

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
