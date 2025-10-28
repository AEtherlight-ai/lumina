# ÆtherLight Integration Guide - Consumption Patterns

**VERSION:** 1.0
**DATE:** 2025-10-10
**AUDIENCE:** All Projects (Generic)
**PURPOSE:** Universal guide for consuming ÆtherLight via Git submodule or NPM
**CLASSIFICATION:** 🌐 PUBLIC

---

## 🎯 Overview

This guide explains how to integrate ÆtherLight into **any** project using three consumption patterns:

1. **Git Submodule** (Beta, recommended for early adopters)
2. **NPM Package** (Post-beta, recommended for most users)
3. **Direct Source** (Contributors only)

**What is ÆtherLight?**
Reasoning infrastructure for AI-powered development. Extract patterns from your codebase, match against proven solutions, prevent hallucinations through confidence scoring.

---

## ⚡ Quick Start (60 Seconds)

**Choose your integration method:**

### Option A: Git Submodule (Beta - Week 0 to Week 8)

```bash
# 1. Fork ÆtherLight on GitHub
# github.com/aetherlight/aetherlight → github.com/YOUR_ORG/aetherlight

# 2. Add as submodule to your project
cd your-project
git submodule add https://github.com/YOUR_ORG/aetherlight.git external/aetherlight
git submodule update --init --recursive

# 3. Install dependencies
cd external/aetherlight
npm install
cd ../..

# 4. Test integration
npm test
```

**Daily workflow:**
```bash
git config --global alias.gps '!git pull && git submodule update --init --recursive'
git gps  # Pull parent repo + update submodule
```

### Option B: NPM Package (Post-Beta - Week 9+)

```bash
# Install from NPM (available after Week 9)
npm install @aetherlight/sdk

# Import in your code
import { AetherlightClient } from '@aetherlight/sdk';
```

---

## 📋 Table of Contents

1. [Integration Patterns](#1-integration-patterns)
2. [Configuration Management](#2-configuration-management)
3. [Version Management](#3-version-management)
4. [Platform Compatibility](#4-platform-compatibility)
5. [Usage Examples](#5-usage-examples)
6. [Contribution Workflow](#6-contribution-workflow)
7. [Support & Community](#7-support--community)
8. [Troubleshooting](#8-troubleshooting)
9. [Performance Expectations](#9-performance-expectations)
10. [Common Mistakes](#10-common-mistakes)
11. [FAQ](#11-faq)

---

## 1. Integration Patterns

### Pattern 1: Git Submodule (Early Adopters)

**When to use:**
- Beta participation (Week 0-8)
- Contributing improvements back to ÆtherLight
- Need bleeding-edge features
- Comfortable with Git submodules

**Pros:**
- ✅ Full source access
- ✅ Can contribute fixes immediately
- ✅ Beta benefits (free tier, priority support)

**Cons:**
- ❌ More complex (Git submodule management)
- ❌ Beta breaking changes possible (mitigated by 2-week notice)

**Setup:**
```bash
git submodule add https://github.com/YOUR_ORG/aetherlight.git external/aetherlight
git submodule update --init --recursive
cd external/aetherlight && npm install && cd ../..
```

**Import pattern:**
```typescript
import { AetherlightClient } from '../external/aetherlight/packages/aetherlight-node';
```

---

### Pattern 2: NPM Package (Recommended for Most)

**When to use:**
- Post-beta (Week 9+)
- Want stable, versioned releases
- Simple integration preferred
- Not contributing to core

**Pros:**
- ✅ Simple (standard npm install)
- ✅ Semantic versioning
- ✅ No Git complexity

**Cons:**
- ❌ Less control (can't patch immediately)
- ❌ Slower to get fixes (wait for release)

**Setup:**
```bash
npm install @aetherlight/sdk
```

**Import pattern:**
```typescript
import { AetherlightClient } from '@aetherlight/sdk';
```

---

### Pattern 3: Direct Source (Contributors)

**When to use:**
- Contributing to ÆtherLight core
- Developing ÆtherLight features
- Testing unreleased changes

**Setup:**
```bash
git clone https://github.com/YOUR_ORG/aetherlight.git
cd aetherlight
npm install
cargo build --release
```

---

## 2. Configuration Management

### Project Configuration

**Create project-specific config:**

```json
// your-project/.aetherlight/config/project-config.json
{
  "project": {
    "name": "your-project-name",
    "team": "your-org-name",
    "version": "1.0.0"
  },
  "patterns": {
    "autoExtract": false,
    "autoSanitize": true,
    "minConfidence": 0.85
  },
  "otel": {
    "enabled": true,
    "exporter": "file",
    "exportPath": "./logs/otel/traces.json"
  }
}
```

**Environment variables:**
```bash
export OTEL_SDK_ENABLED=true
export OTEL_EXPORTER_FILE_PATH="./logs/otel/traces.json"
```

---

### Multi-Layer Configuration

**Layer 1: ÆtherLight defaults** (don't modify)
```
external/aetherlight/.aetherlight/config/defaults.json
```

**Layer 2: Project config** (committed to Git)
```
your-project/.aetherlight/config/project-config.json
```

**Layer 3: Local overrides** (gitignored)
```
your-project/.aetherlight/config/config.local.json
```

**Merge priority:** Layer 3 > Layer 2 > Layer 1

---

## 3. Version Management

### Semantic Versioning

ÆtherLight follows **Semantic Versioning 2.0.0**:

- **MAJOR (1.x.x):** Breaking changes (API changes, config format)
- **MINOR (x.1.x):** New features (backward compatible)
- **PATCH (x.x.1):** Bug fixes (backward compatible)

**Current version:** `0.3.0` (beta)
**Stable version:** `1.0.0` (expected Week 9)

---

### Release Cadence

**Beta (Current, Week 0-8):**
- **Release cadence:** Weekly
- **Stability:** Experimental (breaking changes possible with 2-week notice)
- **Support:** Best-effort (Discord, GitHub issues)

**Stable (Post-Beta, Week 9+):**
- **Release cadence:** Monthly
- **Stability:** Semantic versioning enforced
- **Support:** Guaranteed (24-48 hour response)

**LTS (Long-Term Support):**
- **Frequency:** Every 6 months
- **Support:** 1 year (security patches only)

---

### Pinning vs Tracking

**Development (track main):**
```bash
cd external/aetherlight
git checkout main
git pull origin main
```

**Production (pin to release):**
```bash
cd external/aetherlight
git checkout v1.3.2  # Specific release tag
git submodule update
```

---

## 4. Platform Compatibility

### Supported Platforms

| Platform | Support Level | Notes |
|----------|--------------|-------|
| **macOS ARM64** | ✅ Full | Pre-compiled binaries |
| **macOS x64** | ✅ Full | Pre-compiled binaries |
| **Linux x64** | ✅ Full | Pre-compiled binaries |
| **Windows x64** | ✅ Full | Pre-compiled binaries, Git Bash recommended |
| **WSL2** | ✅ Full | Faster builds than native Windows |

---

### Windows-Specific Setup

**1. Enable long paths:**
```powershell
# Run as Administrator
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
  -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force

git config --system core.longpaths true
```

**2. Use Git Bash (recommended):**
```bash
# Install Git for Windows (includes Git Bash)
# Run all ÆtherLight commands in Git Bash, not PowerShell
```

**3. Fix line endings:**
```bash
# Add to your project's .gitattributes
external/aetherlight/**/*.sh text eol=lf
external/aetherlight/**/*.md text eol=lf
```

---

## 5. Usage Examples

### Basic Integration

```typescript
// your-project/src/integrations/aetherlight.ts

import {
  AetherlightClient,
  extractPatterns,
  findPatterns,
  type Pattern
} from '../external/aetherlight/packages/aetherlight-node';

// Initialize client
const client = new AetherlightClient({
  mode: 'local-only',
  config: {
    project: 'your-project-name',
    team: 'your-org-name'
  }
});

// Load seed patterns (50 included)
await client.initialize();

// Extract patterns from your codebase
const patterns = await extractPatterns('./your-project/src', {
  minConfidence: 0.75,
  includeDocstrings: true
});

console.log(`Extracted ${patterns.length} patterns`);

// Find matching patterns
const matches = await findPatterns('implement OAuth2 login', {
  maxResults: 10,
  minConfidence: 0.85
});

console.log(`Found ${matches.length} matches`);
matches.forEach(match => {
  console.log(`- ${match.pattern.title} (${match.confidence})`);
});
```

---

### Advanced: Pattern Extraction with Categories

```typescript
const patterns = await extractPatterns('./src', {
  categories: [
    'authentication',
    'database',
    'api-integration',
    'error-handling'
  ],
  minConfidence: 0.80,
  includeTests: true,
  includeDocstrings: true
});

// Save to project library
await client.savePatterns('./.aetherlight/patterns', patterns);
```

---

## 6. Contribution Workflow

### Fork → Develop → Submit PR

**1. Create feature branch in your fork:**
```bash
cd external/aetherlight
git checkout -b feat/your-improvement
# Make changes
git commit -m "feat: add your improvement"
git push origin feat/your-improvement
```

**2. Test in your project:**
```bash
cd ../..  # Back to your project
npm test  # Verify integration still works
```

**3. Submit PR to official ÆtherLight:**
- Create PR on GitHub: `YOUR_ORG/aetherlight` → `aetherlight/aetherlight`
- Include Chain of Thought documentation (DESIGN DECISION, WHY, REASONING CHAIN)
- Add tests for new features

**4. PR review timeline:**
- Small PRs (<100 lines): 24 hours
- Medium PRs (100-500 lines): 48 hours
- Large PRs (>500 lines): 3-5 days

---

### Coding Standards

**Mandatory Chain of Thought documentation:**

```typescript
/**
 * DESIGN DECISION: [Key choice made]
 * WHY: [Reasoning behind decision]
 *
 * REASONING CHAIN:
 * 1. [Step with reasoning]
 * 2. [Step with reasoning]
 * 3. [Step with reasoning]
 *
 * PATTERN: Uses Pattern-XXX-YYY
 * RELATED: [Other components, files]
 * FUTURE: [Planned improvements]
 */
function yourFunction() {
  // Implementation
}
```

**Test coverage:** >80% for new code

**Conventional commits:**
```
feat(scope): add feature
fix(scope): fix bug
docs(scope): update docs
test(scope): add tests
```

---

## 7. Support & Community

### Three-Tier Support

**Tier 1: Real-time (Discord)**
- **URL:** [https://discord.gg/gdFxbJET](https://discord.gg/gdFxbJET)
- **Channels:** `#integration-help`, `#contributors`, `#support`
- **Response time:** <1 hour during business hours

**Tier 2: Async (GitHub Discussions)**
- **URL:** [GitHub Discussions](https://github.com/aetherlight/aetherlight/discussions)
- **Use for:** Complex questions, design discussions
- **Response time:** 24-48 hours

**Tier 3: Bug Reports (GitHub Issues)**
- **URL:** [GitHub Issues](https://github.com/aetherlight/aetherlight/issues)
- **Use for:** Bugs, reproducible issues
- **Response time:** 24-48 hours

---

### Office Hours

**Weekly Office Hours:**
- **When:** Every Wednesday, 10 AM PST / 1 PM EST
- **Where:** Discord voice channel `#office-hours`
- **Duration:** 1 hour
- **Format:** Open Q&A, screen sharing for troubleshooting

**Monthly Community Calls:**
- **When:** First Friday of each month, 11 AM PST
- **Format:** Product updates, roadmap, community showcase
- **Recording:** Posted to YouTube

---

## 8. Troubleshooting

### Decision Tree

```
Integration failing?
├─ Submodule not updating?
│  ├─ Run: git submodule update --init --recursive
│  └─ Check: cd external/aetherlight && git status
│
├─ Imports failing?
│  ├─ Check path: '../external/aetherlight/packages/aetherlight-node'
│  └─ Run: npm install in submodule
│
├─ Scripts won't execute?
│  ├─ Windows: Use Git Bash (not PowerShell)
│  ├─ Permissions: chmod +x external/aetherlight/scripts/*.sh
│  └─ Line endings: git config core.autocrlf false
│
└─ Pattern matching not working?
   ├─ Empty results: Lower confidence threshold to 0.7
   ├─ Slow: Check if using local mode
   └─ Wrong patterns: Verify category filter
```

**Still stuck?** Ask in Discord `#integration-help`

---

## 9. Performance Expectations

### Initial Setup

| Task | Windows | WSL2/Linux | macOS |
|------|---------|-----------|-------|
| Fork + submodule | 5 min | 5 min | 5 min |
| First Rust build | 10-15 min | 5-8 min | 5-8 min |
| npm install | 2-3 min | 2-3 min | 2-3 min |
| **Total** | **20-25 min** | **15 min** | **15 min** |

### Daily Operations

| Operation | Time |
|-----------|------|
| `git gps` (pull + submodule update) | 10-30 sec |
| Pattern extraction (1000 files) | 5-10 min |
| Find patterns (local) | <1 sec |
| Find patterns (network) | <3 sec (first), <1 sec (cached) |

### Build Operations

| Operation | Windows | WSL2/Linux |
|-----------|---------|-----------|
| Incremental Rust build | 30-60 sec | 20-40 sec |
| Full Rust rebuild | 5-10 min | 3-5 min |
| npm build | 10-30 sec | 10-30 sec |

**Performance tips:**
1. Use WSL2 on Windows (30-50% faster)
2. Add antivirus exclusions for `target/` directory
3. Use SSD (2-3× faster than HDD)
4. Close unnecessary applications during builds

---

## 10. Common Mistakes

### Mistake #1: Forgetting `git submodule update`

**Symptom:** Code references features that don't exist

**Fix:**
```bash
git submodule update --init --recursive
cd external/aetherlight && git checkout main && git pull
```

**Prevention:** Use `gps` alias
```bash
git config --global alias.gps '!git pull && git submodule update --init --recursive'
```

---

### Mistake #2: Modifying submodule directly

**Symptom:** Changes lost on next update

**Fix:** Work in your fork, not the submodule directory
```bash
# WRONG: cd external/aetherlight && edit files
# RIGHT: cd ../aetherlight-fork && edit files
```

---

### Mistake #3: Using PowerShell for Bash scripts

**Symptom:** Scripts fail with syntax errors

**Fix:** Use Git Bash on Windows
```bash
# Install Git for Windows (includes Git Bash)
# Run all ÆtherLight scripts in Git Bash
```

---

### Mistake #4: Not testing before merging updates

**Symptom:** Production breaks after submodule update

**Fix:** Test on feature branch first
```bash
git checkout -b update-aetherlight-v1.3.2
git submodule update --remote
npm test  # Test integration
# Create PR, review, test in staging, THEN merge
```

---

## 11. FAQ

### Q1: Is the repository public?

**A:** Repository goes public Week 0 (within 7 days). Official URL: `https://github.com/aetherlight/aetherlight`

**Beta timeline:**
- **Week 0:** Public release, you fork and add submodule
- **Weeks 1-8:** Beta period (free, all features unlocked)
- **Week 9+:** Stable release (pricing tiers begin)

---

### Q2: Do I need Rust installed?

**A:** **No** for most users. Pre-compiled binaries included for Windows/macOS/Linux.

**Only install Rust if:**
- Contributing to Rust core
- Building from source
- Using unsupported platform

**Pre-compiled binaries available for:**
- Windows x64
- macOS ARM64/x64
- Linux x64

---

### Q3: What are the actual runtime dependencies?

**A:** Minimal - everything embedded.

**Required:**
- Node.js ≥18.0.0
- npm ≥9.0.0
- Git ≥2.30.0

**NOT required:**
- ❌ Python
- ❌ PostgreSQL/MySQL
- ❌ Redis
- ❌ ChromaDB server (embedded SQLite)
- ❌ External APIs (local-only mode)

---

### Q4: Where are the 50 seed patterns?

**A:** Included in submodule at `external/aetherlight/data/patterns/seed-patterns.json`

**Auto-loaded:**
```typescript
await client.initialize();  // Loads 50 seed patterns automatically
```

**Manual access:**
```typescript
import seedPatterns from '../external/aetherlight/data/patterns/seed-patterns.json';
console.log(seedPatterns.length);  // 50
```

---

### Q5: How are breaking changes communicated?

**A:** 4-tier notification system:

1. **Advance notice** (2 weeks minimum) via Discord `#breaking-changes`
2. **Deprecation period** (1 week minimum) - old API warns but works
3. **Auto-migration script** provided (`npm run migrate:vX`)
4. **Direct DM** for high-impact changes

**Guarantee:** NEVER break without 2-week notice + auto-migration script

---

### Q6: When should I fork?

**A:** Depends on risk tolerance:

| Fork Week 0 (Early) | Fork Week 9 (Stable) |
|---------------------|---------------------|
| ✅ Priority support | ❌ Standard support |
| ✅ Free beta (all features) | ❌ Pay $4.99/mo |
| ✅ Influence roadmap | - No influence |
| ✅ Early adopter recognition | - No recognition |
| ❌ Beta risk (mitigated) | ✅ Zero breaking changes |

**Recommendation:**
- **Fork Week 0** if technically sophisticated, can handle beta
- **Fork Week 9** if risk-averse, need guarantees

---

## 📞 Contact & Support

**Discord:** [https://discord.gg/gdFxbJET](https://discord.gg/gdFxbJET)
**GitHub:** [https://github.com/aetherlight/aetherlight](https://github.com/aetherlight/aetherlight)
**Email:** beta@lumina.ai
**Office Hours:** Every Wednesday, 10 AM PST

---

## 🎉 Welcome to the ÆtherLight Community!

We're building reasoning infrastructure for the AI age. Your integration makes the ecosystem stronger.

**What you'll get:**
- 50 seed patterns (included)
- Pattern extraction from your code
- Confidence-based matching
- Chain of Thought tooling
- Execution tracking (OTEL)
- Community support (Discord)

**What we ask:**
- Follow Chain of Thought standards
- Contribute improvements back (optional but appreciated)
- Share learnings with community

**Let's build the future of AI-powered development together!** 🚀

---

**VERSION:** 1.0
**LAST UPDATED:** 2025-10-10
**MAINTAINED BY:** ÆtherLight Core Team
**CLASSIFICATION:** 🌐 PUBLIC
**PATTERN:** Pattern-INTEGRATION-001 (Generic integration guide)

**See also:**
- **CONTRIBUTING.md** - How to contribute to ÆtherLight
- **CHAIN_OF_THOUGHT_STANDARD.md** - Documentation standard
- **docs/examples/integrations/** - Project-specific integration examples
