# aetherlight-analyzer

> **Code analysis tool to generate ÆtherLight sprint plans from any codebase**

Transform any TypeScript/JavaScript codebase into actionable sprint plans with Chain of Thought reasoning. Built on ÆtherLight's meta-learning philosophy.

[![npm version](https://img.shields.io/npm/v/aetherlight-analyzer.svg)](https://www.npmjs.com/package/aetherlight-analyzer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📦 Installation

### Option 1: Install with main ÆtherLight package (Recommended)
```bash
npm install -g aetherlight
```
This installs the analyzer along with the VS Code extension and native bindings.

### Option 2: Install analyzer only
```bash
npm install -g aetherlight-analyzer
```
Use this if you only need the CLI tool without the VS Code extension.

---

## 🎯 What is this?

**The Problem:** You inherit a codebase with zero documentation. You need to understand its architecture, identify technical debt, and plan improvements.

**The Solution:** `aetherlight-analyzer` automates the entire process:

1. **Analyze:** Parse TypeScript/JS code → extract architecture patterns, complexity metrics, technical debt
2. **Generate:** Create Phase A/B/C sprint plans with Chain of Thought reasoning
3. **Execute:** Autonomous sprint execution (coming in Phase 4)

**DESIGN DECISION:** Build npm-installable CLI before applying ÆtherLight to external codebases
**WHY:** Need automated bridge between external repos and our sprint/pattern system

---

## ⚡ Quick Start

```bash
# Run with npx (no install needed)
npx aetherlight-analyzer --help

# Or use the installed command
aetherlight-analyzer --help
```

**5-Minute Walkthrough:**

```bash
# 1. Initialize ÆtherLight workspace
aetherlight-analyzer init ./target-codebase

# 2. Analyze codebase
cd target-codebase
aetherlight-analyzer analyze

# 3. Generate sprint plans
aetherlight-analyzer generate-sprints

# 4. Execute sprints (dry-run)
npx @aetherlight/analyzer execute-sprint A --dry-run

# 5. Generate reports
npx @aetherlight/analyzer report --format html
```

**Result:** You now have:
- ✅ `.aetherlight/analysis.json` - Complete codebase analysis
- ✅ `PHASE_A_ENHANCEMENT.md` - Sprint plan for new features
- ✅ `PHASE_B_RETROFIT.md` - Sprint plan for refactoring legacy code
- ✅ `PHASE_C_DOGFOOD.md` - Sprint plan for integration testing

---

## 📚 Commands

### `init [path]`

Initialize `.aetherlight/` workspace in target directory.

```bash
npx @aetherlight/analyzer init ./my-project

# Creates:
# my-project/.aetherlight/
# ├── config.json         # Analysis configuration
# ├── README.md           # Next steps guide
# └── analysis/           # Directory for analysis results
```

**Options:** None (uses sensible defaults)

---

### `analyze [options]`

Parse and analyze codebase (TypeScript/JavaScript).

```bash
npx @aetherlight/analyzer analyze

# Options:
--languages <langs>  # Languages to parse (default: "ts,js")
--output <file>      # Output file (default: ".aetherlight/analysis.json")
--verbose            # Show detailed progress
```

**Example:**

```bash
# Analyze only TypeScript files
npx @aetherlight/analyzer analyze --languages ts --verbose

# Output:
# 🔍 Analyzing codebase
# ✅ Parsed 47 files (12,345 LOC) in 1,234ms
# ✅ Architecture: Clean Architecture (confidence: 87%)
# ✅ Complexity: avg 4.2, 3 functions need refactoring
# ✅ Technical Debt: score 28/100, 12 issues
# ✅ Results saved to .aetherlight/analysis.json
```

**Analysis includes:**
- **Architecture Pattern:** MVC, Clean, Layered, Modular, Microservices, or Monolithic
- **Complexity Analysis:** Cyclomatic complexity per function, average complexity
- **Technical Debt:** TODOs, FIXMEs, console.log, duplicated code, long functions
- **Dependency Graph:** Import/export relationships

---

### `generate-sprints [options]`

Generate Phase A/B/C sprint plans from analysis results.

```bash
npx @aetherlight/analyzer generate-sprints

# Options:
--input <file>      # Analysis results file (default: ".aetherlight/analysis.json")
--output <dir>      # Output directory (default: "./")
--min-tasks <n>     # Minimum tasks per sprint (default: 5)
--max-tasks <n>     # Maximum tasks per sprint (default: 15)
```

**Example:**

```bash
npx @aetherlight/analyzer generate-sprints

# Output:
# 📋 Generating sprint plans
# ✅ Analysis loaded
# ✅ All sprint plans generated
#
# 📂 Generated files:
#   ✓ PHASE_A_ENHANCEMENT.md (12 tasks, 4 weeks)
#   ✓ PHASE_B_RETROFIT.md (8 tasks, 3 weeks)
#   ✓ PHASE_C_DOGFOOD.md (5 tasks, 2 weeks)
```

**Sprint Phases:**
- **Phase A (Enhancement):** Add new features with Chain of Thought documentation
- **Phase B (Retrofit):** Refactor legacy code, reduce technical debt
- **Phase C (Dogfood):** Integrate ÆtherLight patterns, enable autonomous sprints

---

### `execute-sprint <phase> [options]`

Execute sprint autonomously (requires Phase 4 orchestrator).

```bash
npx @aetherlight/analyzer execute-sprint A --dry-run

# Options:
--dry-run           # Preview execution without running tasks
```

**Example:**

```bash
npx @aetherlight/analyzer execute-sprint A --dry-run

# Output:
# 🚀 Executing Sprint Phase A
# ✅ Loaded PHASE_A_ENHANCEMENT.md
# ✅ Found 12 tasks
#
# 📋 Dry Run - Tasks to Execute:
#   1. Implement TypeScript parser (Estimated: 4h)
#   2. Add complexity analyzer (Estimated: 3h)
#   3. Create sprint generator (Estimated: 5h)
#   ...
# ⚠️  Dry run complete. No changes made.
```

**Status:** Phase 4 orchestrator not yet implemented. This command previews execution order and validates sprint plans.

---

### `report [options]`

Generate summary report from analysis results.

```bash
npx @aetherlight/analyzer report --format html

# Options:
--input <file>      # Analysis results file (default: ".aetherlight/analysis.json")
--output <file>     # Output report file (default: "ANALYSIS_REPORT.md")
--format <type>     # Report format: md, html, json (default: "md")
```

**Example:**

```bash
npx @aetherlight/analyzer report --format html --output report.html

# Output:
# 📊 Generating analysis report
# ✅ Analysis loaded
# ✅ Report generated: report.html
```

**Report includes:**
- **Executive Summary:** Files analyzed, LOC, architecture pattern, complexity, debt score
- **Architecture Analysis:** Pattern detected, confidence score, key components
- **Complexity Analysis:** Average complexity, high-complexity functions
- **Technical Debt Analysis:** Debt score, issues by category
- **Recommendations:** Actionable improvements

---

## 🏗️ Architecture

```
@aetherlight/analyzer/
├── src/
│   ├── cli/                      # CLI commands ✅
│   │   ├── index.ts              # Commander.js entry point (141 lines)
│   │   └── commands/
│   │       ├── init.ts           # Initialize workspace (153 lines)
│   │       ├── analyze.ts        # Run analysis (180 lines)
│   │       ├── generate.ts       # Generate sprints (71 lines)
│   │       ├── execute.ts        # Execute sprint (161 lines)
│   │       └── report.ts         # Generate reports (318 lines)
│   │
│   ├── parsers/                  # Week 1: Analysis Engine ✅
│   │   ├── types.ts              # Shared types (150 lines)
│   │   ├── typescript-parser.ts  # TypeScript/JS parser (387 lines)
│   │   └── index.ts              # Barrel exports
│   │
│   ├── analyzers/                # Week 1: Analysis Engine ✅
│   │   ├── types.ts              # Analyzer types (120 lines)
│   │   ├── architecture-analyzer.ts   # Detect MVC/Clean/etc (280 lines)
│   │   ├── complexity-analyzer.ts     # Cyclomatic complexity (220 lines)
│   │   ├── technical-debt-analyzer.ts # TODOs, FIXMEs, etc (310 lines)
│   │   └── index.ts              # Barrel exports
│   │
│   ├── generators/               # Week 2: Sprint Generation ✅
│   │   ├── types.ts              # Generator types (180 lines)
│   │   ├── sprint-generator.ts   # Generate Phase A/B/C (450 lines)
│   │   ├── pattern-extractor.ts  # Extract patterns (320 lines)
│   │   ├── cot-documenter.ts     # Chain of Thought docs (280 lines)
│   │   └── index.ts              # Barrel exports
│   │
│   ├── executors/                # Week 3: Sprint Execution ✅
│   │   ├── sprint-executor.ts    # Wave-based execution (598 lines)
│   │   └── sprint-executor.test.ts # 25 tests, 577 lines
│   │
│   └── index.ts                  # Main entry point
│
├── dist/                         # Compiled TypeScript output
├── templates/                    # Handlebars templates (future)
├── package.json                  # npm package configuration
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

**Total:** ~4,800 lines of production code + ~1,200 lines of tests

---

## 📊 Performance Targets

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| TypeScript parsing | <5s for 50k LOC | ~10k LOC/s | ✅ |
| Complexity analysis | <2s for 100 files | <1s | ✅ |
| Architecture detection | <1s | <500ms | ✅ |
| Sprint generation | <5s | <2s | ✅ |
| CLI startup time | <500ms | ~200ms | ✅ |
| Memory usage | <100MB | <50MB | ✅ |

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test suite
npm test -- sprint-executor.test.ts
```

**Test Coverage:**
- Parsers: >80% coverage (13+ tests)
- Analyzers: >80% coverage (15+ tests)
- Generators: >75% coverage (10+ tests)
- Executors: >90% coverage (25 tests)

**Total:** 63+ test cases, all passing ✅

---

## 💡 Chain of Thought Documentation

All code follows ÆtherLight's Chain of Thought standard:

```typescript
/**
 * DESIGN DECISION: Use ts-morph for TypeScript AST parsing
 * WHY: Official TypeScript compiler API, type-safe, comprehensive AST access
 *
 * REASONING CHAIN:
 * 1. Evaluated alternatives: @babel/parser, acorn, esprima
 * 2. Babel parser: Fast but less type information
 * 3. Acorn: Lightweight but JavaScript-only
 * 4. ts-morph: Full TypeScript support, type checking, refactoring APIs
 * 5. Result: ts-morph chosen for type safety and completeness
 *
 * PATTERN: Pattern-ANALYZER-001 (AST-Based Code Analysis)
 * PERFORMANCE: <5s for 50k LOC (target met)
 */
export class TypeScriptParser {
  // Implementation...
}
```

**Why this matters:**
- AI assistants understand WHY decisions were made
- Human developers learn the reasoning behind code
- Enables meta-learning (pattern extraction from decisions)

---

## 🎯 Use Cases

### 1. Inheriting Legacy Codebases

```bash
# Analyze unknown codebase
npx @aetherlight/analyzer init ./legacy-app
cd legacy-app
npx @aetherlight/analyzer analyze --verbose

# Generate refactoring plan
npx @aetherlight/analyzer generate-sprints

# Review PHASE_B_RETROFIT.md for step-by-step refactoring
```

### 2. Pre-Hire Code Audits

```bash
# Analyze candidate's portfolio
npx @aetherlight/analyzer analyze --languages ts,js
npx @aetherlight/analyzer report --format html

# Review report.html for:
# - Architecture quality
# - Code complexity
# - Technical debt level
```

### 3. Continuous Quality Monitoring

```bash
# Run weekly analysis in CI/CD
npx @aetherlight/analyzer analyze
npx @aetherlight/analyzer report --format json > metrics.json

# Track complexity and debt over time
```

### 4. Onboarding New Developers

```bash
# Generate architecture documentation
npx @aetherlight/analyzer analyze
npx @aetherlight/analyzer report --format md

# New developer reads ANALYSIS_REPORT.md to understand codebase
```

---

## 🚀 Roadmap

### ✅ Week 1: Analysis Engine (COMPLETE)
- [x] **A-001:** TypeScript AST Parser (387 lines, 10+ tests)
- [x] **A-002:** Rust AST Parser (SKIPPED - not needed for Phase 0)
- [x] **A-003:** Architecture Analyzer (280 lines, pattern detection)
- [x] **A-004:** Complexity Analyzer (220 lines, cyclomatic complexity)
- [x] **A-005:** Technical Debt Analyzer (310 lines, 8 debt categories)

### ✅ Week 2: Sprint Generation (COMPLETE)
- [x] **B-001:** Sprint Plan Generator (450 lines, Phase A/B/C)
- [x] **B-002:** Pattern Extractor (320 lines, extract reusable patterns)
- [x] **B-003:** Chain of Thought Documenter (280 lines, CoT templates)

### ✅ Week 3: CLI & Execution (COMPLETE)
- [x] **C-001:** CLI Interface (883 lines, 5 commands)
- [x] **C-002:** Sprint Executor (598 lines, wave-based execution, 25 tests)
- [x] **C-003:** Package & Publish (README, LICENSE, npm ready)

### 🔮 Phase 4: Autonomous Sprints (FUTURE)
- [ ] Multi-agent orchestration (database, UI, API, infrastructure agents)
- [ ] Human approval gates (strategic oversight)
- [ ] Real-time progress tracking
- [ ] Automated git commits with Chain of Thought

---

## 📝 Examples

### Example 1: Analyze TypeScript project

```bash
$ npx @aetherlight/analyzer init
$ npx @aetherlight/analyzer analyze

🔍 Analyzing codebase

✅ Parsed 47 files (12,345 LOC) in 1,234ms
✅ Architecture: Clean Architecture (confidence: 87%)
✅ Complexity: avg 4.2, 3 functions need refactoring
✅ Technical Debt: score 28/100, 12 issues
✅ Results saved to .aetherlight/analysis.json

📊 Analysis Summary:
  Files analyzed: 47
  Lines of code: 12,345
  Architecture: Clean Architecture
  Avg complexity: 4.2
  Debt score: 28/100

📝 Next step:
  Generate sprints: npx @aetherlight/analyzer generate-sprints
```

### Example 2: Generate sprint plans

```bash
$ npx @aetherlight/analyzer generate-sprints

📋 Generating sprint plans

✅ Analysis loaded
✅ All sprint plans generated

📂 Generated files:
  ✓ PHASE_A_ENHANCEMENT.md (12 tasks, 4 weeks)
  ✓ PHASE_B_RETROFIT.md (8 tasks, 3 weeks)
  ✓ PHASE_C_DOGFOOD.md (5 tasks, 2 weeks)

📝 Next steps:
  1. Review sprint plans
  2. Execute: npx @aetherlight/analyzer execute-sprint A
```

### Example 3: Generate HTML report

```bash
$ npx @aetherlight/analyzer report --format html --output report.html

📊 Generating analysis report

✅ Analysis loaded
✅ Report generated: report.html

📂 Open report.html in browser to view detailed analysis
```

---

## 🔧 Configuration

Configuration is stored in `.aetherlight/config.json`:

```json
{
  "project": {
    "name": "my-project",
    "rootDir": "./",
    "exclude": ["node_modules", "dist", "build"]
  },
  "analysis": {
    "languages": ["typescript", "javascript"],
    "includeTests": false,
    "minComplexity": 10,
    "debtThreshold": 50
  },
  "sprints": {
    "minTasksPerSprint": 5,
    "maxTasksPerSprint": 15,
    "estimatedStartDate": "2025-10-14"
  }
}
```

**Auto-generated by `init` command.** Edit as needed.

---

## 🤝 Contributing

This is Phase 0 of the ÆtherLight project. Contributions welcome!

**How to contribute:**
1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Follow Chain of Thought documentation standard
4. Write tests (>80% coverage required)
5. Submit PR with detailed explanation

**Chain of Thought is mandatory.** All code must include:
- DESIGN DECISION
- WHY
- REASONING CHAIN
- PATTERN (reference existing patterns)

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

---

## 👥 Author

**ÆtherLight Team** <team@aetherlight.ai>

Built with Chain of Thought methodology ✨

---

## 🔗 Links

- **npm package:** https://www.npmjs.com/package/@aetherlight/analyzer
- **GitHub repository:** https://github.com/AEtherlight-ai/lumina
- **Documentation:** https://docs.aetherlight.ai
- **Pattern library:** https://patterns.aetherlight.ai

---

**Pattern:** Pattern-ANALYZER-001 (AST-Based Code Analysis)
**Phase 0:** Code Analyzer & Rebuild Tool
**Status:** Week 3 COMPLETE ✅
**Version:** 1.0.0
