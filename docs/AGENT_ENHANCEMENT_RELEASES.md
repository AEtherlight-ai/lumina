# Agent Enhancement for Releases

**Purpose**: Document how to enhance all agents when new system-wide capabilities are added
**Created**: 2025-01-12
**Pattern**: Pattern-IMPROVEMENT-001 (Gap Detection & Self-Improvement)

---

## When to Enhance Agents

Enhance all agent context files when:

1. **New System-Wide Protocol Added**
   - Example: Sprint Task Lifecycle Protocol (Pattern-TRACKING-001)
   - All agents need to know the new workflow
   - Consistency across all agent types required

2. **New Skill Available**
   - Example: sprint-task-lifecycle skill
   - All agents should reference the skill
   - Automation benefits all agent types

3. **New Pattern Created (Universal)**
   - Example: Pattern-VALIDATION-001 (Pre-flight checklist)
   - All agents must follow the pattern
   - Enforcement required across all agent types

4. **New Tool/API Available**
   - Example: New VS Code API, new git command
   - All agents should know about the capability
   - Prevents inconsistent tool usage

5. **Breaking Change in Infrastructure**
   - Example: Sprint TOML format change
   - All agents must update to new format
   - Prevents parser failures

---

## Agent Enhancement Process

### Step 1: Identify Need for Enhancement (Pattern-IMPROVEMENT-001)

**Triggers**:
- New pattern created with "Universal" applicability
- New skill created that all agents can use
- Infrastructure change affecting all agents
- User feedback about inconsistent agent behavior

**Decision Criteria**:
- **YES, enhance all agents** if:
  - Protocol applies to >80% of agent types
  - Capability is task-type agnostic
  - Consistency is critical for system function
- **NO, enhance specific agents** if:
  - Protocol specific to 1-3 agent types
  - Capability domain-specific (e.g., UI-only)
  - Inconsistency acceptable

**Example (2025-01-12)**: Sprint Task Lifecycle Protocol
- Applies to: ALL agents (100%)
- Task-type agnostic: Every task needs status updates
- Consistency critical: Sprint Panel UI depends on it
- **Decision**: Enhance all 10+ agent files

---

### Step 2: Create Enhancement Specification

Document WHAT to add to each agent file:

```markdown
## Enhancement Specification

**Date**: {YYYY-MM-DD}
**Type**: {Protocol|Skill|Pattern|API|Breaking Change}
**Scope**: {All Agents|Specific Agents}
**Priority**: {Critical|High|Medium|Low}

### What to Add

{MARKDOWN_SECTION_TO_ADD}

### Where to Add

- **Location**: After "{SECTION_NAME}" section
- **Before**: "{NEXT_SECTION_NAME}" section
- **Alternative**: Before final "You are now ready..." statement

### Fields to Update

- **VERSION**: Increment minor version (e.g., 1.0 → 1.1, 2.2 → 2.3)
- **LAST_UPDATED**: {YYYY-MM-DD}

### Validation

```bash
# Verify all files updated
cd internal/agents && grep -l "{SEARCH_PATTERN}" *.md | wc -l
# Expected: {N} files
```
```

**Example**: See `docs/AGENT_UPDATE_REMAINING_5_FILES.md` for Sprint Task Lifecycle Protocol specification

---

### Step 3: Update All Agent Files

**Methods**:

**Method 1 - Manual (Safest, Recommended)**:
1. Read enhancement specification
2. Open each agent file in editor
3. Find insertion point (use grep -n "^##" to find sections)
4. Add enhancement section
5. Update VERSION and LAST_UPDATED fields
6. Save file
7. Repeat for all N files

**Method 2 - Semi-Automated (Faster, Riskier)**:
```bash
# Create template file
cat > /tmp/enhancement.txt <<'EOF'
{ENHANCEMENT_SECTION_MARKDOWN}
EOF

# For each agent file
for file in internal/agents/*.md; do
  # Find insertion point (varies per file)
  # Use sed/awk to insert enhancement section
  # Update VERSION field
done
```

**Method 3 - AI-Assisted (Recommended for 5+ files)**:
1. Provide enhancement specification to AI
2. AI updates files systematically
3. Human validates each file
4. Commit changes

**Time Estimates**:
- Manual: 5-10 min per file (~50-100 min for 10 files)
- Semi-Automated: 20-30 min (script writing + validation)
- AI-Assisted: 30-60 min (AI updates + human validation)

---

### Step 4: Validate Consistency

**Validation Checklist**:

✅ **All files updated**:
```bash
cd internal/agents && grep -l "{SEARCH_PATTERN}" *.md | wc -l
# Expected: {N} (all agent files except backups)
```

✅ **Consistent formatting**:
```bash
cd internal/agents && grep -A 2 "{SECTION_HEADER}" *.md
# Verify all match expected format
```

✅ **VERSION fields incremented**:
```bash
cd internal/agents && grep "^**VERSION:**" *.md
# Verify all show new version (e.g., 1.1, 2.3)
```

✅ **LAST_UPDATED fields current**:
```bash
cd internal/agents && grep "^**LAST_UPDATED:**" *.md
# Verify all show current date
```

✅ **No syntax errors**:
```bash
# Markdown lint (if available)
markdownlint internal/agents/*.md

# OR manual spot-check
for file in internal/agents/*.md; do
  echo "=== $file ===" && tail -20 "$file"
done
```

---

### Step 5: Document Enhancement

Create documentation in `docs/`:

1. **Update CHANGELOG.md** (if releasing):
   ```markdown
   ## [v0.X.Y] - YYYY-MM-DD

   ### Changed
   - **Agents**: All 10+ agent context files updated with {ENHANCEMENT_NAME}
     - {BENEFIT_1}
     - {BENEFIT_2}
     - See Pattern-{ID} for full protocol
   ```

2. **Create Enhancement Summary** (for internal reference):
   - File: `docs/AGENT_ENHANCEMENT_{DATE}_{NAME}.md`
   - Content: Specification, validation results, lessons learned
   - Example: `docs/AGENT_UPDATE_REMAINING_5_FILES.md`

3. **Update Implementation Summary** (if part of larger feature):
   - File: `docs/{FEATURE}_IMPLEMENTATION_SUMMARY.md`
   - Add agent enhancement as completed task
   - Example: `docs/ENHANCED_PROMPT_V1.3_IMPLEMENTATION_SUMMARY.md`

---

### Step 6: Commit Changes

**Commit Strategy**:

**Option 1 - Single Commit (Recommended)**:
```bash
git add internal/agents/*.md
git commit -m "$(cat <<'EOF'
chore(agents): Add {ENHANCEMENT_NAME} to all agent context files

- Update 10+ agent files with {PROTOCOL/SKILL/PATTERN} reference
- Increment VERSION to {NEW_VERSION} for all agents
- Add {SECTION_NAME} section after workflow
- Ensures consistent {BEHAVIOR} across all agent types

{ADDITIONAL_CONTEXT}

See Pattern-{ID} for full protocol details.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**Option 2 - Batch Commits (if large changeset)**:
```bash
# Commit 1: Core agents (infrastructure, api, database)
git add internal/agents/infrastructure-agent-context.md
git add internal/agents/api-agent-context.md
git add internal/agents/database-agent-context.md
git commit -m "chore(agents): Add {ENHANCEMENT_NAME} to core agents (3/10)"

# Commit 2: Remaining agents
git add internal/agents/*.md
git commit -m "chore(agents): Add {ENHANCEMENT_NAME} to remaining agents (7/10)"
```

**Option 3 - Combined Commit (if part of feature release)**:
```bash
# Include agent updates in feature commit
git add docs/patterns/*.md
git add .claude/skills/*/skill.md
git add internal/agents/*.md
git add docs/*.md
git commit -m "feat({FEATURE}): Implement {FEATURE_NAME} + update all agents"
```

---

## Agent File Inventory

**Current Agent Files** (as of 2025-01-12):

1. ✅ `infrastructure-agent-context.md` (v2.3) - Core infrastructure services
2. ✅ `api-agent-context.md` (v1.2) - REST/GraphQL APIs
3. ✅ `commit-agent-context.md` (v1.1) - Git commits
4. ✅ `database-agent-context.md` (v1.1) - Database migrations
5. ✅ `docs-agent-context.md` (v1.1) - Documentation (short template)
6. ✅ `documentation-agent-context.md` (v1.1) - Documentation (full)
7. ✅ `planning-agent-context.md` (v1.1) - Planning/architecture
8. ✅ `project-manager-context.md` (v1.1) - Sprint management
9. ✅ `review-agent-context.md` (v1.1) - Code review
10. ✅ `test-agent-context.md` (v1.1) - Testing
11. ✅ `ui-agent-context.md` (v1.1) - UI/UX

**Files to SKIP**:
- `test-agent-complete-{TIMESTAMP}-context.md` - Backup/generated file
- `README.md` - Index file, not agent context

**Total Agent Files**: 11 (as of 2025-01-12)

---

## Example Enhancement: Sprint Task Lifecycle Protocol (2025-01-12)

### Specification

**What**: Add Sprint Task Lifecycle Protocol section to all agents
**Why**: Standardize Sprint TOML status management across all agent types
**Pattern**: Pattern-TRACKING-001 (Sprint TOML Lifecycle Management)
**Skill**: sprint-task-lifecycle (automated updates)

### What Was Added

77 lines per agent file:
- Section header: "Sprint Task Lifecycle Protocol (Pattern-TRACKING-001)"
- Before Starting ANY Task (automated + manual process)
- After Completing ANY Task (automated + manual process)
- If Blocked/Deferred (automated + manual process)
- Pattern reference + validation note

### Where Added

- **After**: "Your Workflow" section
- **Before**: "Performance Targets" section (or final statement)

### Validation Results

✅ All 11 agent files updated
✅ VERSION incremented (e.g., 1.0 → 1.1, 2.2 → 2.3)
✅ LAST_UPDATED set to 2025-01-12
✅ Consistent formatting across all files
✅ grep confirms all 11 files have "Sprint Task Lifecycle Protocol"

### Commit

```bash
git add internal/agents/*.md
git commit -m "chore(agents): Add Sprint Task Lifecycle Protocol to all 11 agents"
```

### Impact

**Before**: Agents didn't know about Sprint TOML lifecycle
- No standardized status update process
- Sprint Panel UI out of sync
- No TodoWrite integration

**After**: All agents follow consistent protocol
- ✅ Update status before/after every task
- ✅ Sprint Panel UI stays in sync
- ✅ TodoWrite integration explicit
- ✅ Automated skill available (when implemented)

---

## Best Practices

### DO

✅ **Create enhancement specification first** - Document WHAT/WHERE/WHY before updating files
✅ **Update all agents simultaneously** - Prevents inconsistent behavior
✅ **Validate consistency** - Check all files match expected format
✅ **Increment VERSION fields** - Track agent file updates
✅ **Document in CHANGELOG** - Users see agent improvements
✅ **Reference patterns/skills** - Don't duplicate full protocols in agent files

### DON'T

❌ **Update agents one-by-one over weeks** - Creates inconsistency window
❌ **Skip validation** - Syntax errors break agent loading
❌ **Forget VERSION updates** - Can't track which agents have enhancement
❌ **Embed full protocols** - Agents should reference patterns, not duplicate
❌ **Update without specification** - Inconsistent additions across files

---

## Troubleshooting

### Issue 1: Insertion Point Varies Per File

**Problem**: Some agent files have different section structures
**Solution**:
- Check each file individually: `grep -n "^##" {file}.md`
- Find common anchor (e.g., "Performance Targets", final `---`)
- Adjust insertion point per file (manual safer than automated)

### Issue 2: Markdown Syntax Errors

**Problem**: Code blocks not closed, list formatting broken
**Solution**:
- Use markdown linter: `markdownlint internal/agents/*.md`
- Spot-check with `cat` or editor preview
- Fix syntax errors before committing

### Issue 3: VERSION Field Inconsistent

**Problem**: Some files use different version formats (1.0 vs v1.0 vs 1.0.0)
**Solution**:
- Standardize on format: `{MAJOR}.{MINOR}` (e.g., 1.1, 2.3)
- Update all files to match format
- Document version scheme in `internal/agents/README.md`

### Issue 4: Forgot to Update LAST_UPDATED

**Problem**: Some files have old dates after enhancement
**Solution**:
- Check all dates: `grep "LAST_UPDATED" internal/agents/*.md`
- Update to current date (YYYY-MM-DD format)
- Automate in future: `sed -i "s/LAST_UPDATED: .*/LAST_UPDATED: $(date +%Y-%m-%d)/" *.md`

---

## Future Improvements

**v1.1** (planned):
- Automated agent enhancement script (parse spec → update files → validate)
- Agent file schema validation (ensure required sections present)
- Diff tool (compare agent files, highlight missing sections)

**v1.2** (planned):
- Agent enhancement CI check (PR blocks if agents inconsistent)
- Agent version tracking (database of agent versions + enhancements)
- Rollback capability (revert enhancement if issues found)

**v2.0** (future):
- AI-powered agent enhancement (AI reads spec, updates all files)
- Real-time consistency monitoring (detect drift, auto-fix)
- Agent enhancement analytics (track enhancement frequency, impact)

---

## Related Documentation

- **Pattern-IMPROVEMENT-001**: Gap detection & self-improvement
- **Pattern-TRACKING-001**: Sprint TOML lifecycle management
- **docs/AGENT_UPDATE_REMAINING_5_FILES.md**: Example enhancement specification
- **docs/ENHANCED_PROMPT_V1.3_IMPLEMENTATION_SUMMARY.md**: Feature context for Sprint Task Lifecycle Protocol

---

**This document ensures consistent, systematic agent enhancements across all releases, maintaining system-wide protocol compliance and agent capability parity.**

---

**DOCUMENT STATUS:** ✅ Active - Use for ALL future agent enhancements
**LAST_UPDATED:** 2025-01-12
**NEXT REVIEW:** After next agent enhancement (validate process effectiveness)
