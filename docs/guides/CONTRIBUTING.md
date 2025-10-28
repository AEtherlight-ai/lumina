# Contributing to ÆtherLight

**VERSION:** 1.0
**DATE:** 2025-10-10
**STATUS:** Open Beta
**CLASSIFICATION:** 🌐 PUBLIC

---

## 🎯 Welcome Contributors!

Thank you for your interest in contributing to ÆtherLight! This project aims to build reasoning infrastructure for AI systems, and we welcome contributions from developers of all skill levels.

**Quick Links:**
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Ways to Contribute](#ways-to-contribute)
- [Development Workflow](#development-workflow)
- [Chain of Thought Documentation](#chain-of-thought-documentation-mandatory)
- [Submitting PRs](#submitting-pull-requests)

---

## 📋 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. We pledge to make participation in our project harassment-free for everyone.

### Our Standards

**Examples of behavior that contributes to a positive environment:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Examples of unacceptable behavior:**
- Trolling, insulting/derogatory comments, personal or political attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

### Enforcement

Instances of abusive behavior may be reported to the project team at conduct@lumina.ai. All complaints will be reviewed and investigated promptly and fairly.

---

## 🚀 Getting Started

### **Prerequisites**

- **Rust** (1.70+) for core library development
- **Node.js** (18+) for SDK/bindings development
- **Git** for version control
- **Claude Code** (optional but recommended) for AI-assisted development

### **Step 1: Fork & Clone**

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/aetherlight.git
cd aetherlight
```

### **Step 2: Set Up Development Environment**

```bash
# Install Rust dependencies
cargo build

# Install Node.js dependencies (if working on SDK)
cd packages/aetherlight-node
npm install

# Run tests to verify setup
cargo test
npm test
```

### **Step 3: Create Branch**

```bash
# Create feature branch
git checkout -b feat/your-feature-name

# Or bug fix branch
git checkout -b fix/bug-description
```

---

## 🎨 Ways to Contribute

### **1. Code Contributions**

#### **Areas Needing Help:**
- **Rust Core Library** - Pattern matching, confidence scoring
- **Node.js Bindings** - NAPI-RS FFI improvements
- **Desktop App** - Tauri UI components
- **Mobile App** - Flutter integration
- **Documentation** - Tutorials, examples, translations
- **Tests** - Unit tests, integration tests, benchmarks

#### **Good First Issues:**
Look for issues labeled `good-first-issue` on GitHub Issues

---

### **2. Pattern Contributions**

ÆtherLight learns from proven patterns. You can contribute patterns from your experience:

```bash
# Extract patterns from your code
npx @aetherlight/sdk extract-patterns --dry-run

# Review patterns
cat .aetherlight/patterns/Pattern-*.md

# If valuable, submit PR with patterns
git add .aetherlight/patterns/
git commit -m "docs(patterns): add OAuth2 implementation pattern"
```

**Pattern Quality Standards:**
- ✅ Must follow Chain of Thought format
- ✅ Include DESIGN DECISION, WHY, REASONING CHAIN
- ✅ Include performance metrics (if applicable)
- ✅ No sensitive information (API keys, credentials)
- ✅ Tested in real projects (not theoretical)

---

### **3. Documentation Contributions**

**Types of Documentation:**
- **Tutorials** - "How to integrate ÆtherLight in Next.js app"
- **Examples** - Complete working examples
- **Translations** - Translate docs to other languages
- **API Reference** - Document SDK methods
- **Guides** - Best practices, optimization tips

**Documentation Standards:**
- Clear, concise writing
- Code examples that run
- Screenshots/diagrams where helpful
- Follow existing documentation style

---

### **4. Bug Reports**

Found a bug? Help us fix it!

**Good Bug Reports Include:**
1. **Clear title** - "Pattern matching crashes with empty query"
2. **Steps to reproduce** - Exact steps to trigger bug
3. **Expected behavior** - What should happen
4. **Actual behavior** - What actually happens
5. **Environment** - OS, ÆtherLight version, Node.js version
6. **Logs/Screenshots** - Error messages, stack traces

**Template:**
```markdown
## Bug Description
[Clear description of the bug]

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- OS: [e.g., macOS 14.1]
- ÆtherLight version: [e.g., 0.3.0]
- Node.js version: [e.g., 18.17.0]

## Logs/Screenshots
[Paste error logs or screenshots]
```

---

### **5. Feature Requests**

Have an idea? We'd love to hear it!

**Good Feature Requests Include:**
1. **Clear use case** - Why is this needed?
2. **Proposed solution** - How might it work?
3. **Alternatives considered** - Other approaches you've thought about
4. **Impact** - Who benefits from this feature?

**Template:**
```markdown
## Feature Request
[Clear description]

## Use Case
[Why is this needed? What problem does it solve?]

## Proposed Solution
[How might this work?]

## Alternatives Considered
[Other approaches you've thought about]

## Impact
[Who benefits? How many users?]
```

---

## 🔧 Development Workflow

### **1. Read Project Memory**

**BEFORE starting ANY task:**

```bash
# Read primary project memory
cat CLAUDE.md | head -200

# Read execution history
tail -100 docs/execution/LIVING_PROGRESS_LOG.md

# Read current phase tasks
cat PHASE_3.5_IMPLEMENTATION.md | grep "### Task"
```

**Why?** ÆtherLight uses hierarchical project memory. Understanding context prevents duplicate work and ensures consistency.

---

### **2. Follow Task Execution Gates**

**ÆtherLight has mandatory process gates:**

#### **Before Starting:**
- [ ] Enable OTEL tracking: `export OTEL_SDK_ENABLED=true`
- [ ] Run `./scripts/start-task.sh P3-XXX "Task Name"` (if implementing task)
- [ ] Verify execution log created

#### **During Development:**
- [ ] Update execution log in real-time
- [ ] Document design decisions (Chain of Thought comments)
- [ ] Write tests BEFORE implementing (TDD)

#### **After Completion:**
- [ ] Run `./scripts/complete-task.sh P3-XXX`
- [ ] Fill PHASE_X_IMPLEMENTATION.md execution log
- [ ] Run tests: `cargo test` or `npm test`
- [ ] Create git commit (Chain of Thought format)

**See:** CLAUDE.md for complete task execution gates

---

### **3. Chain of Thought Documentation (MANDATORY)**

**ALL code MUST include Chain of Thought documentation:**

```rust
/**
 * DESIGN DECISION: [Key choice made]
 * WHY: [Reasoning behind decision]
 *
 * REASONING CHAIN:
 * 1. [Step with reasoning]
 * 2. [Step with reasoning]
 * 3. [Step with reasoning]
 *
 * PATTERN: Uses Pattern-XXX-YYY (pattern name)
 * RELATED: [Other components, files]
 * FUTURE: [Planned improvements]
 */
```

**Example (Rust):**

```rust
/**
 * DESIGN DECISION: Use async trait with default solve_with_escalation()
 * WHY: Eliminates code duplication across 7 domain agents
 *
 * REASONING CHAIN:
 * 1. Each domain agent needs 5-level breadcrumb search
 * 2. Default implementation in trait = DRY principle
 * 3. Agents override only domain-specific methods
 * 4. Result: 487 lines in trait vs 3,400 lines duplicated
 *
 * PATTERN: Uses Pattern-DOMAIN-001 (Domain Agent Trait)
 * RELATED: P3.5-001, DomainAgent trait, solve_with_escalation()
 * FUTURE: Add confidence threshold tuning per domain
 */
async fn solve_with_escalation(&self, problem: Problem) -> Solution {
    // Implementation...
}
```

**See:** `docs/vision/CHAIN_OF_THOUGHT_STANDARD.md` for complete standard

---

### **4. Test-Driven Development (TDD)**

**MANDATORY: Tests BEFORE implementation**

```bash
# 1. Write test first (fails)
cargo test test_pattern_matching
# FAIL: function not implemented

# 2. Implement feature (test passes)
# ... write code ...
cargo test test_pattern_matching
# PASS

# 3. Refactor (tests still pass)
# ... improve code ...
cargo test
# ALL PASS
```

**Test Coverage Requirements:**
- >80% coverage for new code
- 100% coverage for critical paths (pattern matching, confidence scoring)
- Benchmarks for performance-critical code

---

### **5. Git Commit Standards**

**ÆtherLight uses Conventional Commits:**

**Format:**
```
<type>(<scope>): <subject>

<body with Chain of Thought>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `refactor`: Code restructuring (no behavior change)
- `test`: Adding/updating tests
- `perf`: Performance improvement
- `chore`: Build process, dependencies

**Example:**
```
feat(matching): implement multi-dimensional pattern matching

DESIGN DECISION: Use 10+ dimensions for pattern matching
WHY: Single-dimension achieves only 60% accuracy; multi-dimensional achieves 87%

REASONING CHAIN:
1. Implemented semantic similarity via embeddings (30% weight)
2. Added context matching for domain/geo/tech fit (15% weight)
3. Added keyword overlap scoring (10% weight)
4. Implemented weighted combination algorithm
5. Validated against test dataset (87% accuracy achieved)

PATTERN: Pattern-RUST-007 (Multi-factor confidence calculation)
RELATED: Task P3.5-005, confidence scoring system
PERFORMANCE: <50ms for 10k patterns ✅

Tests included:
- test_pattern_matching_accuracy
- test_pattern_matching_performance

Closes #P3.5-005
```

**Use commit-enforcer agent:**
```bash
# Before committing
claude-code --agent commit-enforcer "Review my staged changes"
```

---

## 📤 Submitting Pull Requests

### **PR Checklist**

Before submitting PR, verify:

- [ ] **Tests pass:** `cargo test` or `npm test`
- [ ] **Linting passes:** `cargo clippy` or `npm run lint`
- [ ] **Formatting passes:** `cargo fmt` or `npm run format`
- [ ] **Documentation updated:** Chain of Thought docstrings added
- [ ] **CHANGELOG updated:** Add entry for your changes
- [ ] **No secrets:** No API keys, credentials, or sensitive data
- [ ] **Branch up-to-date:** Rebased on latest main

### **PR Template**

```markdown
## Summary
[Brief description of changes]

## Motivation
[Why is this change needed? What problem does it solve?]

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
[How was this tested?]
- Unit tests: [list new tests]
- Manual testing: [steps taken]
- Performance benchmarks: [if applicable]

## Chain of Thought
DESIGN DECISION: [Key technical choice]
WHY: [Reasoning]

REASONING CHAIN:
1. [Step 1 with reasoning]
2. [Step 2 with reasoning]
3. [Step 3 with reasoning]

PATTERN: [Pattern used, if applicable]

## Screenshots/Logs
[If UI changes or significant output]

## Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No secrets committed
- [ ] Changelog updated
- [ ] Chain of Thought docs added

## Related Issues
Closes #[issue-number]
```

### **PR Review Process**

1. **Automated Checks:**
   - CI runs tests, linting, formatting
   - Documentation-enforcer validates Chain of Thought
   - Commit-enforcer validates commit messages

2. **Maintainer Review (24-48 hours):**
   - Code quality
   - Pattern adherence
   - Test coverage
   - Performance impact

3. **Community Feedback (optional):**
   - Other contributors may comment
   - Suggest improvements

4. **Merge:**
   - Maintainer merges when approved
   - PR appears in next release

---

## 🎓 Development Resources

### **Documentation**
- [Chain of Thought Standard](docs/vision/CHAIN_OF_THOUGHT_STANDARD.md)
- [Git SOPs](docs/build/GIT_SOPs.md)
- [For AI Agents](FOR_AI_AGENTS.md)
- [Integration Safety](INTEGRATION_SAFETY.md)

### **Architecture**
- [Technical Architecture](docs/build/AETHERLIGHT_TECHNICAL_ARCHITECTURE_2025.md)
- [Pattern Library Format](docs/patterns/README.md)
- [Confidence Scoring System](docs/build/CONFIDENCE_SCORING_SYSTEM.md)

### **Community**
- **Discord:** [https://discord.gg/gdFxbJET](https://discord.gg/gdFxbJET)
- **GitHub Discussions:** [Ask questions](https://github.com/aetherlight/aetherlight/discussions) (after launch)
- **Twitter:** [@aetherlight_ai](https://twitter.com/aetherlight_ai)

---

## 🏆 Recognition

### **Contributors Wall**
All contributors are recognized in:
- `CONTRIBUTORS.md` (public recognition)
- GitHub contributor graph
- Release notes (for significant contributions)

### **Types of Recognition**
- **Pattern Contributor:** Contributed valuable patterns
- **Code Contributor:** Merged PRs
- **Documentation Contributor:** Improved docs
- **Community Helper:** Active in Discord/Discussions

---

## ❓ FAQ

### **Q: I'm new to Rust. Can I still contribute?**
A: Yes! Start with:
- Documentation improvements
- Pattern contributions
- Node.js SDK (TypeScript)
- Test writing

### **Q: Do I need to sign a CLA?**
A: No CLA required during open beta (MIT license). This may change post-beta.

### **Q: How long until my PR is reviewed?**
A: We aim for 24-48 hours. Complex PRs may take longer.

### **Q: My PR was rejected. Now what?**
A: Don't be discouraged! Reviewers will explain why and suggest improvements. You can update your PR and re-submit.

### **Q: Can I contribute if I work for a competitor?**
A: Yes, as long as contributions are your own work and don't violate your employer's IP policies.

### **Q: How do I become a maintainer?**
A: Active contributors (5+ quality PRs) may be invited to join as maintainers.

---

## 📞 Getting Help

**Stuck? Have questions?**

1. **Read documentation** - Most questions are answered in docs
2. **Search GitHub Issues** - Your question may already be answered (after launch)
3. **Ask in Discord** - [https://discord.gg/gdFxbJET](https://discord.gg/gdFxbJET) (#contributors channel)
4. **Open GitHub Discussion** - For longer questions (after launch)
5. **Email** - contribute@lumina.ai (for private inquiries)

---

## 🙏 Thank You!

Every contribution makes ÆtherLight better. Whether you're fixing a typo, submitting a pattern, or implementing a major feature - thank you for being part of the reasoning infrastructure revolution!

---

**VERSION:** 1.0
**LAST UPDATED:** 2025-10-10
**MAINTAINED BY:** ÆtherLight Core Team

🌟 **Welcome to the community!** 🌟
