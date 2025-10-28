#!/bin/bash

# Export ÆtherLight Memory System v1.0
# Creates a portable package for other Claude Code projects

set -e  # Exit on error

echo "🎯 ÆtherLight Memory System - Export Script"
echo "=============================================="
echo ""

# Create export directory
export_dir="export-package"
templates_dir="$export_dir/templates"
scripts_dir="$export_dir/scripts"

echo "📁 Creating export directory structure..."
mkdir -p "$templates_dir"
mkdir -p "$scripts_dir"

# Copy universal templates
echo "📄 Copying universal templates..."

# 1. Main export package document
cp MEMORY_SYSTEM_STARTER_KIT.md "$export_dir/"

# 2. Chain of Thought standard (universal)
cp docs/vision/CHAIN_OF_THOUGHT_STANDARD.md "$templates_dir/"

# 3. Scripts (universal)
cp scripts/start-task.sh "$scripts_dir/"
cp scripts/complete-task.sh "$scripts_dir/"

# 4. Pre-commit hook (universal)
mkdir -p "$templates_dir/git-hooks"
cp .git/hooks/pre-commit "$templates_dir/git-hooks/"

# 5. Create generic CLAUDE.md template (stripped of ÆtherLight specifics)
echo "✂️  Creating generic CLAUDE.md template..."
cat > "$templates_dir/CLAUDE.md.template" <<'EOF'
# [Your Project Name] - Claude Code Memory

**VERSION:** 1.0
**STATUS:** [Your Status]
**LAST UPDATED:** [Date]

---

# ⚠️ MANDATORY PROCESS - READ THIS BEFORE EVERY TASK

**CRITICAL INSIGHT:** You are an AI assistant with a documented flaw: **You forget process requirements during flow state coding.**

**Solution:** Make documentation ATOMIC with code, not separate step.

---

## 🔴 TASK COMPLETENESS DEFINITION (ATOMIC)

A task is NOT complete until ALL of these exist:

```
✅ Code implementation finished
✅ Unit tests written AND EXECUTED
✅ PHASE_X_IMPLEMENTATION.md execution log FILLED (all fields)
✅ Validation criteria checkboxes CHECKED (✅ not [ ])
✅ Git commit created with Chain of Thought
✅ Living Progress Log updated with milestone

If ANY unchecked → Task status = IN PROGRESS
```

**This is NOT optional. This is NOT "later". This is ATOMIC COMPLETENESS.**

---

## 📋 REQUIRED SEQUENCE FOR EVERY TASK

### **BEFORE Writing ANY Code:**

```bash
# 1. Read task requirements
□ Open PHASE_X_IMPLEMENTATION.md
□ Find your task (P1-XXX)
□ Read description + validation criteria
□ Read execution log template (the fields you MUST fill)

# 2. Enable tracking
□ export OTEL_SDK_ENABLED=true
□ export OTEL_EXPORTER_FILE_PATH="./logs/otel/traces.json"
□ Verify: echo $OTEL_SDK_ENABLED (must return "true")

# 3. Initialize task
□ Run: ./scripts/start-task.sh P1-XXX "Task Name"
□ Verify execution log created: logs/phase-1/P1-XXX-execution.md

# 4. Create TODO list
□ Use TodoWrite tool
□ ALWAYS include as FINAL item: "Fill PHASE_X execution log"
□ Mark it in_progress BEFORE saying task complete
```

---

### **WHILE Writing Code:**

```
□ Update logs/phase-1/P1-XXX-execution.md in REAL-TIME
  - Add progress entries with timestamps
  - Document design decisions as you make them
  - Note blockers immediately when encountered
  - Record iterations (attempt 1, attempt 2, etc.)

□ This prevents retroactive hallucinations
```

---

### **AFTER Code Works (CRITICAL SECTION):**

**DO NOT skip to next task. DO NOT say "task complete" yet.**

**Your IMMEDIATE next actions are:**

```bash
# 1. Finalize task tracking
□ Run: ./scripts/complete-task.sh P1-XXX
□ Records FINAL_APPROVAL_TIMESTAMP

# 2. OPEN PHASE_X_IMPLEMENTATION.md
□ Find task section: "### Task P1-XXX: [Task Name]"
□ Scroll to "**Execution Log:**" section
□ Fill EVERY field (20+ fields):
  - BEGIN_TIMESTAMP (from logs/phase-1/P1-XXX-execution.md)
  - INITIAL_COMPLETION_TIMESTAMP
  - TESTS_COMPLETION_TIMESTAMP
  - VALIDATION_TIMESTAMP
  - FINAL_APPROVAL_TIMESTAMP
  - ESTIMATED_DURATION vs ACTUAL_DURATION
  - ITERATIONS_COUNT
  - TEST_COVERAGE_ACTUAL
  - PERFORMANCE_ACTUAL (with proof/benchmark)
  - TOKEN_COUNT_USED (from OTEL or /cost command)
  - PROJECTED_OUTCOME vs ACTUAL_OUTCOME
  - SUCCESS_CRITERIA (Pass/Partial/Fail with explanation)
  - BLOCKERS_ENCOUNTERED
  - LESSONS_LEARNED

# 3. CHECK validation criteria
□ Find "**Validation Criteria:**" section in task
□ Change EVERY [ ] to [x] for completed criteria
□ If criteria not met, mark [ ] and note why

# 4. Say to user:
"Code complete. Now filling PHASE_X_IMPLEMENTATION.md execution log."

# 5. Show user the filled section
□ Copy the filled execution log
□ Show user for verification

# 6. Run tests (if not already run)
□ cargo test (Rust) or npm test (TypeScript) or python -m pytest
□ Capture output
□ If tests fail, task is NOT complete (go fix tests)

# 7. Git commit
□ Stage files: git add <files>
□ Commit with Chain of Thought message
□ Include: DESIGN DECISION, WHY, REASONING CHAIN, PATTERN, Closes #P1-XXX

# 8. Update Living Progress Log
□ Open docs/execution/LIVING_PROGRESS_LOG.md
□ Add entry for completed task
□ Include: metrics, key decisions, patterns extracted

# 9. Mark TODO complete
□ Use TodoWrite to mark "Fill PHASE_X execution log" as completed
```

**ONLY AFTER ALL 9 STEPS → Say: "Task P1-XXX COMPLETE ✅"**

---

## 🚨 RED FLAGS - STOP IMMEDIATELY IF YOU CATCH YOURSELF DOING THIS

### **Red Flag #1: You're about to say "Task complete"**

**STOP. Ask yourself:**
- Did I fill PHASE_X_IMPLEMENTATION.md execution log? (Not just logs/phase-1/)
- Did I check all validation criteria boxes?
- Did I run tests AND capture output?
- Did I update Living Progress Log?

**If ANY "no" → Task is NOT complete. Go do those steps NOW.**

---

### **Red Flag #2: User says "continue" or "next task"**

**STOP. Ask user:**
"Before starting next task, should I fill execution logs for previous task in PHASE_X_IMPLEMENTATION.md?"

**Do NOT assume "continue" means "skip docs".**

---

### **Red Flag #3: You're excited about shipping code**

**This is Pattern-FAILURE-003 trigger.**

**Pause. Review checklist above. Verify all 9 steps complete. THEN ship.**

**Principle:** Excitement leads to cutting corners. Process prevents this.

---

### **Red Flag #4: You think "I'll document later"**

**NO. "Later" = never.**

**Documentation is ATOMIC with code, like tests are.**

**You wouldn't say "function works" without tests.**
**Don't say "task complete" without filled execution log.**

---

## 📊 AGENT SELF-MONITORING

After EVERY task completion, run this mental checklist:

```
Self-Check Questions:
1. Did I fill logs/phase-1/P1-XXX-execution.md? (✅ or ❌)
2. Did I fill PHASE_X_IMPLEMENTATION.md execution log? (✅ or ❌)
3. Did I check validation criteria boxes? (✅ or ❌)
4. Did I run tests? (✅ or ❌)
5. Did I create git commit? (✅ or ❌)
6. Did I update Living Progress Log? (✅ or ❌)

If ANY ❌ → DO NOT tell user "complete" → Fix gaps FIRST
```

**This self-check is NOT optional. Run it EVERY task.**

---

## 🎯 Project Identity

### **What This Is**

[CUSTOMIZE THIS SECTION - Replace with YOUR project details]

**Example:**
[Your Project] is a [description]. It solves [problem] by [solution].

**The Core Breakthrough:**
1. [Your Breakthrough #1]
2. [Your Breakthrough #2]
3. [Your Breakthrough #3]

---

## 📚 Technical Stack

[CUSTOMIZE THIS - Replace with YOUR stack]

**Core Library:**
- [Your Language] - [Why you chose it]
- [Your Frameworks]

**Key Dependencies:**
- [Dependency 1] - [Purpose]
- [Dependency 2] - [Purpose]

---

## 🗺️ Roadmap

[CUSTOMIZE THIS - Replace with YOUR roadmap]

### **Phase 1: [Phase Name] (Weeks 1-2)**
- Task P1-001: [Task description]
- Task P1-002: [Task description]

### **Phase 2: [Phase Name] (Weeks 3-4)**
- Task P2-001: [Task description]
- Task P2-002: [Task description]

---

## 📖 Standard Operating Procedures (SOPs)

### **SOP-001: Chain of Thought Documentation**
Every function, class, file, and commit must include:
- DESIGN DECISION
- WHY
- REASONING CHAIN (numbered steps)
- PATTERN (reference existing patterns)
- RELATED (connections)
- FUTURE (planned improvements)

---

## 🔑 Key Patterns

[START EMPTY - Extract YOUR patterns during implementation]

### **Pattern-[PROJECT]-001: [Pattern Name]**
[Description of pattern discovered in your codebase]

---

## 📊 Living Progress Log

**IMPORTANT FOR AGENTS:** Project milestones tracked in separate file.

**See:** @docs/execution/LIVING_PROGRESS_LOG.md

**Why separate:** Log grows continuously, extracting prevents CLAUDE.md token bloat.

---

**END OF PRIMARY PROJECT MEMORY**

**Status:** Active
**Next Update:** When significant project changes occur
**Last Verified:** [Date]
EOF

# 6. Create template LIVING_PROGRESS_LOG.md
echo "📝 Creating LIVING_PROGRESS_LOG.md template..."
cat > "$templates_dir/LIVING_PROGRESS_LOG.md" <<'EOF'
# Living Progress Log

**LOCATION:** Extracted from CLAUDE.md for token efficiency
**LAST UPDATED:** [Date]

---

## Purpose

This log tracks major milestones, decisions, and pattern discoveries throughout the project lifecycle. Each entry documents:
- What was accomplished
- Patterns extracted or applied
- Metrics captured (code, tests, tokens, etc.)
- Key learnings and insights
- Next milestones

**WHY SEPARATE FILE:** Living Progress Log grows continuously. Extracting it reduces CLAUDE.md token load while preserving project memory via hierarchical imports.

---

## [Date]: [Milestone Name]

### Summary

[Brief summary of what was accomplished]

**DESIGN DECISION:** [Key decision made]
**WHY:** [Reasoning behind decision]

### What Was Created

[List of deliverables]

### Key Technical Decisions

**Decision 1: [Name]**
- **Decision:** [What was decided]
- **Why:** [Reasoning]
- **Impact:** [Effect on project]

### Metrics

- **Code:** [LOC count]
- **Tests:** [Test count]
- **Time:** [Duration]
- **Tokens:** [Token usage]

### Patterns Extracted

- **Pattern-XXX-001:** [Pattern name and description]

### Key Learnings

1. [Learning 1]
2. [Learning 2]

### Next Steps

[What comes next]

---

**END OF LIVING PROGRESS LOG**
EOF

# 7. Create README.md for export package
echo "📖 Creating export package README..."
cat > "$export_dir/README.md" <<'EOF'
# ÆtherLight Memory System - Export Package v1.0

This package contains everything you need to implement the ÆtherLight memory system in your Claude Code project.

## 📦 What's Included

- **MEMORY_SYSTEM_STARTER_KIT.md** - Complete implementation guide
- **templates/CLAUDE.md.template** - Primary project memory template
- **templates/CHAIN_OF_THOUGHT_STANDARD.md** - Universal documentation protocol
- **templates/LIVING_PROGRESS_LOG.md** - Milestone tracking template
- **scripts/start-task.sh** - Task initialization automation
- **scripts/complete-task.sh** - Task completion automation
- **templates/git-hooks/pre-commit** - Automated validation

## 🚀 Quick Start (5 Minutes)

1. **Copy to your project:**
   ```bash
   cp templates/CLAUDE.md.template your-project/CLAUDE.md
   cp templates/CHAIN_OF_THOUGHT_STANDARD.md your-project/docs/vision/
   cp templates/LIVING_PROGRESS_LOG.md your-project/docs/execution/
   cp scripts/*.sh your-project/scripts/
   cp templates/git-hooks/pre-commit your-project/.git/hooks/
   chmod +x your-project/scripts/*.sh your-project/.git/hooks/pre-commit
   ```

2. **Customize CLAUDE.md:**
   - Replace [Your Project Name] with your project name
   - Fill in Project Identity section
   - Fill in Technical Stack section
   - Fill in Roadmap section

3. **Enable OTEL tracking:**
   ```bash
   export OTEL_SDK_ENABLED=true
   export OTEL_EXPORTER_FILE_PATH="./logs/otel/traces.json"
   ```

4. **Start first task:**
   ```bash
   ./scripts/start-task.sh P1-001 "Your First Task"
   ```

## 📚 Documentation

Read **MEMORY_SYSTEM_STARTER_KIT.md** for:
- Complete implementation guide
- Proven results (61.5% → 100% SOP compliance)
- Three-phase rollout strategy
- Full template examples
- FAQ and troubleshooting

## 📄 License

Creative Commons Attribution 4.0 International (CC BY 4.0)

**You are free to:**
- Use commercially
- Modify and adapt
- Distribute and share
- Build proprietary systems on top

**Requirements:**
- Give credit to ÆtherLight/Lumina project
- Link back to this package
- Indicate if changes were made

## 🌟 Source

**Project:** ÆtherLight/Lumina
**Version:** 1.0 (2025-10-05)
**Status:** Battle-tested (Phase 1 & 2 complete)
**License:** CC BY 4.0

---

**Apply this system. Eliminate hallucinations. Compound intelligence.** ✨
EOF

# Create tarball
echo ""
echo "📦 Creating tarball..."
tar -czf aetherlight-memory-system-v1.0.tar.gz "$export_dir/"

echo ""
echo "✅ Export complete!"
echo ""
echo "📁 Created:"
echo "   - export-package/ (directory)"
echo "   - aetherlight-memory-system-v1.0.tar.gz (tarball)"
echo ""
echo "🎯 To use:"
echo "   1. Share aetherlight-memory-system-v1.0.tar.gz with target project"
echo "   2. Extract: tar -xzf aetherlight-memory-system-v1.0.tar.gz"
echo "   3. Follow export-package/README.md"
echo ""
echo "🚀 Ready for deployment!"
