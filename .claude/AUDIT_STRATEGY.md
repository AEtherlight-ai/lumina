# Audit Documentation Strategy

**Last Updated:** 2025-10-31
**Status:** Active Policy

---

## File Types & Their Purpose

### 1. AUDIT_PROMPT_v*.md (PRIVATE - Gitignored)
**Location:** Project root
**Purpose:** Internal audit checklists for testing releases
**Audience:** Development team, AI assistants
**Lifecycle:** Created pre-release, used for testing, archived after validation

**Examples:**
- `AUDIT_PROMPT_v0.15.0.md` - Initial audit that found bugs
- `AUDIT_PROMPT_v0.15.1.md` - Post-fix validation checklist

**Git Status:** ❌ IGNORED (via `.gitignore`: `*_AUDIT_*.md`)

**Why Private:**
- Contains internal testing procedures
- May expose vulnerabilities during testing
- Work-in-progress findings not ready for public
- Includes detailed failure analysis

---

### 2. *_AUDIT_RESULTS.md (PRIVATE - Gitignored)
**Location:** Project root
**Purpose:** Detailed bug reports and root cause analysis
**Audience:** Development team
**Lifecycle:** Created during audit, used to track fixes, archived after release

**Examples:**
- `v0.15.0_AUDIT_RESULTS.md` - Bug findings and analysis
- `v0.15.1_FIXES_APPLIED.md` - Fix documentation

**Git Status:** ❌ IGNORED (via `.gitignore`: `*_AUDIT_*.md`)

**Why Private:**
- Exposes bugs before they're fixed
- Contains detailed failure scenarios
- Internal-only root cause analysis
- May include sensitive debugging info

---

### 3. POST_MORTEM_v*.md (PUBLIC - Tracked)
**Location:** `docs/`
**Purpose:** Public retrospective after critical incidents
**Audience:** Community, users, contributors
**Lifecycle:** Created after incident resolved, permanent documentation

**Examples:**
- `docs/POST_MORTEM_v0.13.23.md` - 9-hour bug incident analysis

**Git Status:** ✅ TRACKED (committed to repository)

**Why Public:**
- Shows transparency in handling issues
- Educates community about what went wrong
- Prevents repeat of similar issues
- Demonstrates accountability

**Content:**
- Timeline of incident
- User impact
- Root cause analysis
- Fixes applied
- Prevention measures
- Lessons learned

---

### 4. CHANGELOG.md (PUBLIC - Tracked)
**Location:** Project root
**Purpose:** User-facing release notes
**Audience:** All users
**Lifecycle:** Updated with every release

**Content:**
- New features
- Bug fixes (high-level)
- Breaking changes
- Deprecations

**Git Status:** ✅ TRACKED

---

## When to Create Each Type

### AUDIT_PROMPT
**Trigger:** Before testing a new release
**Creator:** Development team or AI assistant
**Process:**
1. Create comprehensive test checklist
2. Cover all features and edge cases
3. Include success criteria
4. Add scoring system

### AUDIT_RESULTS
**Trigger:** After running audit and finding issues
**Creator:** Whoever runs the audit
**Process:**
1. Document all bugs found
2. Analyze root causes
3. Prioritize fixes
4. Track fix status

### POST_MORTEM
**Trigger:** After resolving a critical incident
**Criteria:**
- Incident caused user impact (broken features, inability to use extension)
- Incident took >4 hours to resolve
- Incident exposed architectural issues
- Lessons learned benefit the community

**Creator:** Lead developer
**Process:**
1. Wait until incident fully resolved
2. Gather timeline and facts
3. Conduct root cause analysis
4. Write retrospective
5. Add to `docs/` directory
6. Commit to repository

### CHANGELOG
**Trigger:** Every release (patch, minor, major)
**Process:**
1. Update before publishing
2. Follow Keep a Changelog format
3. Commit with release

---

## Audit Workflow Example

### Phase 1: Pre-Release Audit
```
v0.15.0 development complete
↓
Create AUDIT_PROMPT_v0.15.0.md (private)
↓
Run comprehensive tests
↓
Create v0.15.0_AUDIT_RESULTS.md (private)
↓
Find critical bugs
```

### Phase 2: Fix and Validate
```
Apply fixes
↓
Create AUDIT_PROMPT_v0.15.1.md (private)
↓
Run validation tests
↓
Create v0.15.1_FIXES_APPLIED.md (private)
↓
Verify all bugs fixed
```

### Phase 3: Public Documentation
```
Assess incident severity
↓
IF critical incident (>4hrs, user impact):
  ↓
  Create docs/POST_MORTEM_v0.15.0.md (public)
  ↓
  Commit to repository
↓
Update CHANGELOG.md (public)
↓
Publish release
```

---

## Gitignore Configuration

**Current `.gitignore` rules:**
```gitignore
# Audit files (internal testing only)
COMPREHENSIVE_AUDIT_*.md
*_AUDIT_*.md
```

**What this catches:**
- ✅ `AUDIT_PROMPT_v0.15.0.md`
- ✅ `v0.15.0_AUDIT_RESULTS.md`
- ✅ `v0.15.1_FIXES_APPLIED.md`
- ✅ `COMPREHENSIVE_AUDIT_123.md`

**What this allows:**
- ✅ `docs/POST_MORTEM_v0.13.23.md` (in docs/ directory)
- ✅ `CHANGELOG.md` (doesn't match pattern)

---

## Archive Strategy

### Short-Term (During Development)
Keep all audit files in project root for active reference:
- Current version audit prompts
- Recent audit results
- Fix documentation

### Long-Term (After Release)
**Option A: Local Archive (Recommended)**
- Move old audits to `~/.aetherlight/audits/archive/`
- Keep out of repository
- Available locally if needed for reference

**Option B: Delete**
- After 30 days post-release
- Only if no critical incident occurred
- Keep post-mortems forever (they're in docs/)

**Option C: Private Repository**
- Create separate private repo for audit history
- Push old audits there
- Reference from main repo if needed

---

## Examples of Each Type

### Audit Prompt (Private)
```markdown
# AUDIT_PROMPT_v0.15.1.md

Test A: Skill Detection
Type: "initialize my project"
Expected: Text changes to `/initialize`
Success Criteria: [...]
```

### Audit Results (Private)
```markdown
# v0.15.0_AUDIT_RESULTS.md

BUG-001: Skill detection bypassed
Severity: CRITICAL
Root Cause: Early return in line 86
Fix: Reorder lines 82-96
```

### Post-Mortem (Public)
```markdown
# docs/POST_MORTEM_v0.13.23.md

## Incident Timeline
- 10:00 AM: v0.13.23 published
- 10:15 AM: User reports activation failure
- 7:00 PM: Root cause identified (native deps)
- 8:00 PM: v0.13.24 published

## Lessons Learned
Never add native dependencies to VS Code extensions...
```

### Changelog (Public)
```markdown
# CHANGELOG.md

## [0.15.1] - 2025-10-31

### Fixed
- Skill detection now works from natural language
- Record button triggers recording correctly
```

---

## Decision Matrix

| Situation | Create | Public/Private |
|-----------|--------|----------------|
| Planning release testing | AUDIT_PROMPT | Private |
| Found bugs during testing | AUDIT_RESULTS | Private |
| Fixed bugs, need validation | New AUDIT_PROMPT | Private |
| Critical incident (>4hrs) | POST_MORTEM | Public (docs/) |
| Regular release | Update CHANGELOG | Public |
| Minor bug fix | Update CHANGELOG only | Public |

---

## Q&A

**Q: Should I commit my audit files?**
A: No. They're automatically gitignored. They're for internal use only.

**Q: When do I create a post-mortem?**
A: Only for critical incidents that took >4 hours to resolve and had user impact.

**Q: What if I want to reference an old audit?**
A: Keep them locally or in a separate private archive repo.

**Q: Can users see audit files?**
A: No. They're gitignored. Users see CHANGELOG and post-mortems.

**Q: Should every bug get a post-mortem?**
A: No. Only critical incidents that are learning opportunities for the community.

---

## Summary

✅ **Private (Gitignored):**
- AUDIT_PROMPT_*.md
- *_AUDIT_RESULTS.md
- *_FIXES_APPLIED.md

✅ **Public (Tracked):**
- docs/POST_MORTEM_*.md
- CHANGELOG.md

**Rule of Thumb:**
- If it's about TESTING → Private
- If it's about LEARNING → Public (after incident resolved)