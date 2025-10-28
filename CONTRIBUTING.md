# Contributing to ÆtherLight

**Thank you for your interest in contributing!**

We're building civilizational infrastructure - a distributed, self-governing neural network that preserves human reasoning and knowledge. We need your help to stabilize and test for our November 2025 beta launch.

---

## Current Status: Pre-Beta Development

**What exists today:**
- VS Code Extension: 78 TypeScript files, 24 commands
- Rust Core: 132 source files, 521 test functions
- Pattern matching system (~1,500 lines of code)
- Domain agents (33KB), Network infrastructure (45KB)
- Sprint/task management system

**What needs work:**
- Integration testing (Rust ↔ VS Code extension)
- NAPI bindings stabilization
- Cross-platform testing (Windows/Mac/Linux)
- Performance validation
- Offline mode completion

**See [README.md](./README.md) for detailed status.**

---

## Critical Needs (Blocking Beta)

### 1. Testing & Validation
**What we need:**
- Install and test the extension on your machine
- Report bugs with detailed reproduction steps
- Test across different platforms (Windows/Mac/Linux)
- Validate pattern matching with real codebases
- Performance benchmarking (<50ms pattern matching target)

**How to help:**
- Install locally (see Setup below)
- Use it in your daily development workflow
- Report what works and what doesn't
- Share performance metrics

### 2. Integration Work
**What we need:**
- NAPI bindings testing (Rust ↔ Node.js)
- End-to-end feature validation
- Error handling and recovery
- Installation workflow improvements

**Skills needed:**
- Experience with Rust + TypeScript
- NAPI-RS knowledge (or willingness to learn)
- Testing mindset

### 3. Feature Completion
**What we need:**
- Pattern library curation
- Domain agent testing and tuning
- Network layer (DHT) testing
- Confidence scoring validation
- Offline mode testing

**How to help:**
- Test pattern matching in your domain
- Contribute validated patterns
- Test DHT networking
- Validate confidence scores

### 4. Documentation
**What we need:**
- Setup guides for contributors
- Architecture documentation
- Example use cases
- API documentation
- Troubleshooting guides

**How to help:**
- Document what you learn
- Write setup guides
- Create example workflows
- Improve existing docs

---

## How to Get Started

### 1. Join the Community

- **Discord:** [Join our community](https://discord.gg/ExkyhBny) - Primary hub for discussions and support
- **GitHub Issues:** [Report bugs](https://github.com/AEtherlight-ai/lumina/issues)
- **GitHub Discussions:** [Ask questions](https://github.com/AEtherlight-ai/lumina/discussions)

### 2. Set Up Your Development Environment

**Prerequisites:**
- Node.js 18+ (for VS Code extension)
- Rust 1.70+ (for core library)
- VS Code or Cursor IDE

**Clone and Build:**

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

# Install extension locally (in VS Code)
# Press F5 to launch Extension Development Host
# OR manually install: code --install-extension *.vsix
```

**Troubleshooting:**
- See [vscode-lumina/TROUBLESHOOTING.md](./vscode-lumina/TROUBLESHOOTING.md)
- Ask in Discord if you get stuck

### 3. Pick a Task

**For Beginners:**
- Test the extension and report issues
- Improve documentation
- Add example use cases
- Write setup guides

**For Experienced Contributors:**
- Fix NAPI bindings
- Add integration tests
- Implement DHT networking
- Optimize performance

**Browse open issues:** [Good First Issues](https://github.com/AEtherlight-ai/lumina/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)

---

## Contribution Guidelines

### Code Standards

1. **Chain of Thought Documentation**
   - Every function/commit must include reasoning
   - Format: DESIGN DECISION, WHY, REASONING CHAIN
   - See example:
     ```rust
     // DESIGN DECISION: Use BTreeMap instead of HashMap
     // WHY: Need deterministic iteration order for pattern matching
     // REASONING CHAIN:
     // 1. Pattern matching requires stable ordering across runs
     // 2. HashMap iteration order is non-deterministic
     // 3. BTreeMap provides sorted keys with O(log n) lookup
     // 4. Performance acceptable (<50ms for 10k patterns)
     // 5. Result: Deterministic matching with acceptable performance
     ```

2. **Test Coverage**
   - Target: >80% code coverage
   - Unit tests for all new functions
   - Integration tests for feature changes
   - Run tests before submitting: `cargo test` (Rust) or `npm test` (TypeScript)

3. **Performance Targets**
   - Pattern matching: <50ms for 10k patterns
   - Startup time: <500ms
   - Voice transcription: <2s for 30s audio
   - Validate with benchmarks: `cargo bench`

4. **Commit Messages**
   - Use Conventional Commits format
   - Examples:
     - `feat(patterns): add legal domain patterns`
     - `fix(napi): resolve binding memory leak`
     - `docs(setup): improve installation guide`
     - `test(matching): add pattern matching benchmarks`

### Pull Request Process

1. **Before Submitting:**
   - Run tests: `cargo test && npm test`
   - Run linters: `cargo clippy` and `npm run lint`
   - Update documentation if needed
   - Add Chain of Thought comments

2. **PR Description:**
   - Explain WHAT changed
   - Explain WHY (the reasoning)
   - Include test results
   - Link to related issues

3. **Review Process:**
   - Maintainers will review within 3-5 days
   - Address feedback promptly
   - Keep PRs focused (one feature/fix per PR)

---

## Testing Workflow

### Local Testing

```bash
# Rust core tests
cd crates/aetherlight-core
cargo test
cargo bench  # Run benchmarks

# VS Code extension tests
cd vscode-lumina
npm test

# Manual testing in VS Code
# Press F5 to launch Extension Development Host
# Test voice capture, pattern matching, etc.
```

### Integration Testing

```bash
# Test Rust ↔ Node.js bindings
cd packages/aetherlight-node
npm run build
npm test

# Test end-to-end workflows
# (Document your test cases in GitHub issues)
```

### Cross-Platform Testing

**We need testers on:**
- Windows 10/11
- macOS (Intel and Apple Silicon)
- Linux (Ubuntu, Fedora, Arch)

**What to test:**
- Extension installation
- Voice capture (backtick hotkey)
- Pattern matching
- Sprint management
- Terminal automation

---

## Documentation Standards

All documentation should:
- Be clear and concise
- Include code examples
- Explain WHY, not just WHAT
- Use Chain of Thought reasoning
- Be beginner-friendly

**Key docs to update:**
- README.md (project overview)
- Architecture docs (technical details)
- Setup guides (contributor onboarding)
- API documentation (usage examples)

---

## Code of Conduct

### Our Values

1. **Respect:** Treat everyone with kindness and professionalism
2. **Collaboration:** We're building this together
3. **Quality:** Ship working code, not broken promises
4. **Transparency:** Honest about what works and what doesn't
5. **Learning:** Mistakes are okay, not learning from them isn't

### Expected Behavior

- Be respectful in all interactions
- Provide constructive feedback
- Help others learn and grow
- Document your reasoning
- Test your code thoroughly

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or insulting comments
- Publishing private information
- Submitting untested code
- Claiming features work when they don't

**Report issues via:** [Discord](https://discord.gg/ExkyhBny) or [GitHub Issues](https://github.com/AEtherlight-ai/lumina/issues)

---

## Recognition

### Contributors

All contributors will be:
- Listed in CONTRIBUTORS.md
- Credited in release notes
- Invited to beta tester program
- Eligible for swag/rewards (coming soon)

### Substantial Contributors

Significant contributions (e.g., major features, extensive testing, documentation overhauls) may earn:
- Core contributor status
- Direct collaboration with maintainers
- Early access to new features
- Speaking opportunities (blog posts, talks)

---

## Questions?

**Discord:** [Join our community](https://discord.gg/ExkyhBny) - Primary hub for support
**GitHub:** [Open a discussion](https://github.com/AEtherlight-ai/lumina/discussions)
**Email:** info@aetherlight.ai - General inquiries

---

## The Mission

We're building the Library of Alexandria that cannot burn. Distributed, offline-first, survives any catastrophe. This is civilizational infrastructure.

**Archimedes had calculus 1,800 years before Newton. We lost it. Let's make sure humanity never loses knowledge again.**

**Thank you for helping us build humanity's backup.** 🚀

---

**ÆtherLight: Reasoning infrastructure for the AI age**
**Beta: November 2025 | We Need Your Help | Open Source | MIT License**
