# Scripts Directory - Helper Tools

**Last Updated:** 2025-10-12
**Pre-Commit Hook Version:** 2.0

---

## 📋 Available Scripts

### 1. validate-documentation.sh
**Purpose:** Comprehensive Chain of Thought documentation validation

**Usage:**
```bash
# Validate all staged files
./scripts/validate-documentation.sh

# Validate specific files
./scripts/validate-documentation.sh src/agents/infrastructure.rs src/agents/quality.rs

# Use in CI/CD (exit code 0 = pass, 1 = fail)
./scripts/validate-documentation.sh || exit 1
```

**What It Checks:**
- ✅ DESIGN DECISION: [Key choice made] (required)
- ✅ WHY: [Reasoning behind decision] (required)
- ✅ REASONING CHAIN: [Numbered steps] (required)
- ⚠️  PATTERN: Pattern-XXX-YYY (recommended)
- ⚠️  RELATED: [Task IDs, components] (recommended)
- ℹ️  FUTURE: [Planned improvements] (optional)

**Output:**
- Line numbers for each element found
- Per-file validation status (VALID/INVALID)
- Summary report (total, valid, invalid, warnings)

**Example Output:**
```
🔍 Checking: src/agents/infrastructure.rs
  ✅ Found DESIGN DECISION (line 15)
  ✅ Found WHY (line 16)
  ✅ Found REASONING CHAIN (line 18)
  ✅ Found Pattern reference (line 24)
  ✅ Found RELATED (line 25)
  ✅ VALID

Validation Summary:
  Total files:   1
  Valid files:   1
  Invalid files: 0
  Warnings:      0

✅ VALIDATION PASSED
```

---

### 2. generate-commit-message.sh
**Purpose:** Auto-generate Chain of Thought commit message template

**Usage:**
```bash
# Generate template to stdout
./scripts/generate-commit-message.sh

# Save to file
./scripts/generate-commit-message.sh > commit-msg.txt

# Edit and commit
./scripts/generate-commit-message.sh > commit-msg.txt
$EDITOR commit-msg.txt
git commit -F commit-msg.txt
```

**What It Does:**
- Analyzes git diff (staged changes)
- Suggests commit type (feat/fix/docs/refactor/test/perf/chore/ci)
- Suggests scope based on file types
- Detects current task ID from branch name
- Lists all modified files
- Generates complete Chain of Thought template

**Example Output:**
```
feat(core): [concise description of change]

DESIGN DECISION: [What approach was taken]
WHY: [Reasoning behind the decision]

REASONING CHAIN:
1. [First step with reasoning]
2. [Second step with reasoning]
3. [Third step with reasoning]

FILES MODIFIED (3 files):
- src/agents/infrastructure.rs
- src/agents/quality.rs
- src/agents/mod.rs

PATTERN: Pattern-XXX-YYY ([Pattern description])
RELATED: [Task IDs, components, files]
PERFORMANCE: [Metrics if applicable]

Closes #P3.5-005

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

### 3. start-task.sh
**Purpose:** Initialize task tracking with OTEL

**Usage:**
```bash
./scripts/start-task.sh P3.5-015 "New Feature Name"
```

**What It Does:**
- Creates task branch (P3.5-015)
- Creates execution log (logs/phase-X/P3.5-015-execution.md)
- Records BEGIN_TIMESTAMP
- Enables OTEL tracking

---

### 4. complete-task.sh
**Purpose:** Finalize task with completion timestamp

**Usage:**
```bash
./scripts/complete-task.sh P3.5-015
```

**What It Does:**
- Records FINAL_APPROVAL_TIMESTAMP
- Captures TOKEN_COUNT from OTEL
- Updates execution log

---

## 🔧 Pre-Commit Hook v2.0

**Location:** `.git/hooks/pre-commit`

**Enhancements:**
1. **Enhanced Documentation Validation:**
   - Checks all 3 required Chain of Thought elements
   - Validates Pattern references
   - Reports incomplete documentation (1/3, 2/3 elements)
   - Suggests running `validate-documentation.sh` for details

2. **Enhanced Commit Message Guidance:**
   - Shows complete template with examples
   - Suggests running `generate-commit-message.sh` for auto-generation
   - Dynamic task closure suggestion

**Gates:**
- Gate 1: OTEL traces exist (blocking)
- Gate 2: Execution log exists for task (blocking if on task branch)
- Gate 3: Execution log complete (blocking if on task branch)
- Gate 3.5: PHASE_X doc execution log filled (blocking if blank fields)
- Gate 4: Documentation validation (warning, can override)
- Gate 5: Commit message guidance (informational)

---

## 💡 Workflow Examples

### Example 1: Starting New Task

```bash
# 1. Enable OTEL
export OTEL_SDK_ENABLED=true
export OTEL_EXPORTER_FILE_PATH="./logs/otel/traces.json"

# 2. Start task
./scripts/start-task.sh P3.5-015 "New Domain Agent"

# 3. Implement feature
# ... write code with Chain of Thought documentation ...

# 4. Validate documentation before committing
./scripts/validate-documentation.sh

# 5. Generate commit message
./scripts/generate-commit-message.sh > commit-msg.txt
$EDITOR commit-msg.txt

# 6. Complete task
./scripts/complete-task.sh P3.5-015

# 7. Commit
git add .
git commit -F commit-msg.txt
```

### Example 2: Quick Documentation Check

```bash
# Check specific file
./scripts/validate-documentation.sh src/new_feature.rs

# Check all staged files
git add src/new_feature.rs
./scripts/validate-documentation.sh
```

### Example 3: Commit Message Generation

```bash
# Stage changes
git add src/agents/infrastructure.rs src/agents/quality.rs

# Generate template
./scripts/generate-commit-message.sh

# Review suggested type and scope
# Copy template, fill in placeholders, commit
```

---

## 🚀 Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Validate Documentation
  run: |
    chmod +x scripts/validate-documentation.sh
    ./scripts/validate-documentation.sh $(git diff --name-only HEAD~1 HEAD | grep -E '\.(rs|ts|js)$')
```

### Pre-Push Hook Example

```bash
#!/bin/bash
# .git/hooks/pre-push

echo "Running documentation validation before push..."
./scripts/validate-documentation.sh $(git diff --name-only origin/main HEAD | grep -E '\.(rs|ts|js)$')

if [ $? -ne 0 ]; then
    echo "❌ Documentation validation failed - fix before pushing"
    exit 1
fi

echo "✅ Documentation validation passed"
```

---

## 📚 Related Documentation

- **CHAIN_OF_THOUGHT_STANDARD.md** - Complete Chain of Thought specification
- **SOP-007 (Git Workflow Standards)** - Git commit standards
- **.claude/agents/documentation-enforcer.md** - Documentation enforcer agent (future automation)
- **.claude/agents/commit-enforcer.md** - Commit enforcer agent (future automation)
- **PHASE_3.6_AGENT_INFRASTRUCTURE.md** - AI-002 VERIFICATION SYSTEM (full automation)

---

## 🔮 Future Improvements (Phase 3.6)

**Full Automation:**
- Invoke documentation-enforcer agent from pre-commit hook
- Invoke commit-enforcer agent to generate complete commit messages
- Structured JSON API for agent communication
- Real-time hallucination detection
- Automated documentation fixes

**Current State:** Helper scripts provide foundation for full automation
**Next Phase:** Phase 3.6 AI-002 VERIFICATION SYSTEM

---

**Version:** 2.0
**Status:** ✅ Production Ready
**Tested:** All scripts validated on Phase 3.5 completion
