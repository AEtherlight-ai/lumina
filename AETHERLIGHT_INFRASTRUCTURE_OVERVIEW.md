# ÆtherLight Infrastructure Overview

**The AI-Enhanced Workflow Management System for Developers**

**Version:** 1.0.0
**Date:** 2025-01-11
**Audience:** Engineers, Technical Leaders, Potential Users

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [The Problem We Solve](#the-problem-we-solve)
3. [System Architecture](#system-architecture)
4. [Sprint Management System](#sprint-management-system)
5. [AI Terminal Enhancement](#ai-terminal-enhancement)
6. [Agent System](#agent-system)
7. [Pattern Library](#pattern-library)
8. [Code Analysis](#code-analysis)
9. [Publishing & Testing](#publishing--testing)
10. [Complete Workflow Examples](#complete-workflow-examples)
11. [Why Engineers Love This](#why-engineers-love-this)
12. [Getting Started](#getting-started)

---

## Executive Summary

ÆtherLight is a VS Code extension + desktop app that transforms how developers work with AI assistants. Instead of treating AI as a black box, we provide:

- **Structured Sprint Management** - TOML-based task tracking with dependency management
- **AI-Enhanced Prompting** - Automatic context injection with project state, patterns, and agent expertise
- **Multi-Agent Orchestration** - 9 specialized agents working in parallel (71% token reduction)
- **Pattern-Driven Development** - 77+ reusable patterns preventing historical bugs (15+ hours saved per sprint)
- **Quality Enforcement** - 27 normalized template tasks ensuring documentation, tests, and retrospectives never get skipped

**Key Metrics:**
- ⚡ **75-80% context reduction** (2,126 → 400-500 lines in CLAUDE.md)
- 💰 **57% cost savings** via early bug detection (tests catch issues before AI debugging loops)
- 🧠 **71% token reduction** with hierarchical agent contexts
- 🛡️ **15+ hours saved per sprint** via template task enforcement
- 📊 **4-layer validation** catches bugs before they reach production

---

## The Problem We Solve

### Common Developer Pain Points

**1. Context Overload**
```
Traditional AI Assistant:
❌ "Here's my 5,000-line codebase, figure it out"
❌ AI hallucinates patterns that don't exist
❌ Suggestions break existing conventions
❌ 10+ message loops to explain project structure
```

**ÆtherLight Solution:**
```
✅ Structured agent contexts (infrastructure, UI, API, database, etc.)
✅ Pattern library with 77+ proven solutions
✅ Automatic workspace analysis
✅ 71% token reduction = faster responses + lower cost
```

---

**2. Task Management Chaos**
```
Traditional Project:
❌ Scattered tasks across GitHub Issues, Notion, Slack
❌ No visibility into task dependencies
❌ AI doesn't know what you're working on
❌ Forgotten documentation, tests, retrospectives
```

**ÆtherLight Solution:**
```
✅ Single source of truth (ACTIVE_SPRINT.toml)
✅ Automatic dependency validation
✅ Phase-aware smart task selection
✅ 27 normalized template tasks (DOC, QA, AGENT, INFRA, RETRO)
✅ 4-layer enforcement prevents skipping critical tasks
```

---

**3. Prompt Engineering Fatigue**
```
Traditional Workflow:
❌ Manually write prompts for every task
❌ Forget to include critical context
❌ No consistency across team members
❌ AI suggestions don't align with project conventions
```

**ÆtherLight Solution:**
```
✅ One-click task start with comprehensive prompt generation
✅ Automatic context injection (git diff, patterns, agent expertise)
✅ Pre-flight checklists prevent common mistakes
✅ TDD enforcement with coverage requirements
```

---

**4. Historical Bugs Repeat**
```
Traditional Codebase:
❌ v0.13.23: Added native dependency → 9 hours debugging
❌ v0.15.31: Forgot to run tests → 2 hours debugging
❌ v0.13.28: Version mismatch → 2 hours debugging
❌ Total: 15+ hours wasted on preventable bugs
```

**ÆtherLight Solution:**
```
✅ Pattern library documents all historical bugs + fixes
✅ Pre-flight checklists block dangerous operations
✅ Template tasks enforce quality gates (tests, docs, audits)
✅ Retrospective tasks extract patterns from every sprint
```

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          VS Code Extension                           │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐   │
│  │  Voice Panel   │  │  Sprint Panel  │  │  Status Bar        │   │
│  │  UI Component  │  │  (Task List)   │  │  (Active Task)     │   │
│  └────────┬───────┘  └────────┬───────┘  └──────────┬─────────┘   │
│           │                   │                       │              │
│  ┌────────▼───────────────────▼───────────────────────▼─────────┐  │
│  │              Extension Core (extension.ts)                    │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────────┐  │  │
│  │  │ SprintLoader│  │ TaskStarter │  │ AgentRegistry      │  │  │
│  │  │ (TOML Parse)│  │ (Smart Task │  │ (9 Agents)         │  │  │
│  │  │             │  │  Selection) │  │                    │  │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬─────────────┘  │  │
│  │         │                │                 │                 │  │
│  │  ┌──────▼────────────────▼─────────────────▼─────────────┐  │  │
│  │  │          Context & Prompt Enhancement                  │  │  │
│  │  │  • TaskPromptExporter (AI prompt generation)           │  │  │
│  │  │  • PromptEnhancer (skill detection, pattern matching)  │  │  │
│  │  │  • ContextGatherer (workspace analysis)                │  │  │
│  │  │  • PatternLibrary (77+ patterns)                       │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ IPC (WebSocket)
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                    Desktop App (Tauri)                               │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐   │
│  │ Voice Capture  │  │  Transcription │  │  System Tray       │   │
│  │ (Global ` key)│  │  (Whisper API) │  │  (Always Running)  │   │
│  └────────────────┘  └────────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    File System (Project Root)                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ internal/sprints/ACTIVE_SPRINT.toml                          │  │
│  │ • Single source of truth for task management                 │  │
│  │ • Phase-organized tasks with dependencies                    │  │
│  │ • Agent assignments, estimates, deliverables                 │  │
│  │ • Watched by FileSystemWatcher (auto-refresh UI)             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ internal/agents/*.md                                         │  │
│  │ • 9 specialized agent contexts (infrastructure, ui, api...)  │  │
│  │ • Responsibilities, patterns, performance targets            │  │
│  │ • 71% token reduction vs monolithic context                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ docs/patterns/Pattern-*.md                                   │  │
│  │ • 77+ reusable patterns (workflows, publishing, testing)     │  │
│  │ • Problem/Solution/When-to-Use format                        │  │
│  │ • Historical bug prevention documentation                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Sprint Management System

### TOML-Based Task Tracking

**Why TOML?**
- ⚡ **10-20× faster parsing** (<5ms vs ~50ms for Markdown)
- 🤖 **Machine-readable** - Autonomous agents can parse dependencies
- 🔍 **Structured metadata** - Enables smart task selection algorithms
- ✅ **Validated** - 4-layer validation prevents malformed sprints

---

### Task Schema

```toml
[tasks.FEAT-001]
id = "FEAT-001"
name = "Implement user authentication API"
status = "pending"  # pending | in_progress | completed
phase = "backend"
agent = "api-agent"

# WHY (User Pain Point)
why = """
Users cannot securely access the dashboard without authentication.
Need JWT-based auth with refresh tokens for session management.
"""

# CONTEXT (Background Information)
context = """
- Using Supabase Auth for user management
- Need to integrate with existing license key system
- Must support OAuth providers (Google, GitHub)
"""

# REASONING CHAIN (Step-by-Step Logic)
reasoning_chain = [
    "1. Design JWT token structure (access + refresh)",
    "2. Create /api/auth/login endpoint",
    "3. Create /api/auth/refresh endpoint",
    "4. Add middleware for protected routes",
    "5. Write integration tests"
]

# TDD REQUIREMENTS
test_requirements = """
RED: Write failing tests first
- Test login with valid credentials → returns tokens
- Test login with invalid credentials → returns 401
- Test refresh with valid token → returns new access token
- Test refresh with expired token → returns 401

GREEN: Implement minimal code to pass tests

REFACTOR: Extract token generation logic to utility
"""

test_files = [
    "test/integration/auth.test.ts"
]
test_coverage_requirement = 0.85  # 85% for API code

# FILE TRACKING
estimated_time = "4-6 hours"
estimated_lines = 350
files_to_create = [
    "src/api/auth/login.ts",
    "src/api/auth/refresh.ts",
    "src/middleware/auth.ts",
    "src/utils/jwt.ts"
]
files_to_modify = [
    "src/api/routes.ts:45-60 (add auth routes)",
    "src/types/user.ts:1-20 (add User type)"
]

# DELIVERABLES & VALIDATION
deliverables = [
    "POST /api/auth/login endpoint (returns JWT tokens)",
    "POST /api/auth/refresh endpoint (returns new access token)",
    "Auth middleware for protected routes",
    "Integration tests with 85%+ coverage"
]

validation_criteria = [
    "Login with valid credentials returns 200 + tokens",
    "Login with invalid credentials returns 401",
    "Protected routes reject requests without valid token",
    "Tests pass with coverage >= 85%"
]

dependencies = []  # No blocking dependencies
```

---

### Sprint Structure Example

```toml
[meta]
sprint_name = "Sprint 4 - Key Authorization & Monetization"
sprint_number = 4
version = "0.17.0"
start_date = "2025-11-07"
estimated_duration = "2-3 weeks"
total_tasks = 24  # 10 feature + 14 template tasks

[description]
overview = """
Implement license key system for desktop app and website.
Users purchase keys, enter into apps, system validates and tracks usage.
"""

success_criteria = [
    "Users can generate license keys from website dashboard",
    "Desktop app validates keys against server API",
    "Server tracks credit usage per key",
    "Admin panel shows key usage analytics"
]

# ============================================================================
# PHASE 1: Backend Foundation
# ============================================================================

[tasks.DATABASE-001]
id = "DATABASE-001"
name = "Design Supabase schema for license keys"
status = "completed"
phase = "backend"
agent = "database-agent"
# ... (full task definition)

[tasks.API-001]
id = "API-001"
name = "Create license validation API endpoint"
status = "in_progress"
phase = "backend"
agent = "api-agent"
dependencies = ["DATABASE-001"]
# ... (full task definition)

# ============================================================================
# PHASE 2: Frontend Dashboard
# ============================================================================

[tasks.UI-001]
id = "UI-001"
name = "Build license key display component"
status = "pending"
phase = "frontend"
agent = "ui-agent"
dependencies = ["API-001"]
# ... (full task definition)

# ============================================================================
# TEMPLATE TASKS (Auto-Injected by sprint-plan skill)
# ============================================================================

[tasks.DOC-001]
id = "DOC-001"
name = "Update CHANGELOG.md"
status = "pending"
phase = "documentation"
agent = "documentation-agent"
why = "Users need to know what changed in this release"
# ... (full task definition)

[tasks.QA-002]
id = "QA-002"
name = "Run full test suite"
status = "pending"
phase = "quality_assurance"
agent = "test-agent"
why = "Prevent regressions (v0.15.31 bug: published without running tests)"
# ... (full task definition)

[tasks.RETRO-001]
id = "RETRO-001"
name = "Sprint retrospective"
status = "pending"
phase = "retrospective"
agent = "planning-agent"
why = "System learns from every sprint (Pattern-SELF-IMPROVEMENT-001)"
# ... (full task definition)
```

---

### Phase-Aware Smart Task Selection

**Algorithm:** `TaskStarter.findNextReadyTask()`

```typescript
/**
 * GOAL: Maintain momentum by staying in current phase
 * FALLBACK: Move to next phase if current exhausted
 * OPTIMIZATION: Prefer quick wins (fewest deps, shortest time)
 */

function findNextReadyTask(sprint: Sprint): Task | null {
    // 1. Filter to pending tasks
    const pending = sprint.tasks.filter(t => t.status === 'pending');

    // 2. Check dependencies (all must be completed)
    const ready = pending.filter(task => {
        return task.dependencies.every(depId => {
            const dep = sprint.tasks.find(t => t.id === depId);
            return dep && dep.status === 'completed';
        });
    });

    if (ready.length === 0) return null;

    // 3. Find last completed task's phase
    const completed = sprint.tasks.filter(t => t.status === 'completed');
    const lastCompleted = completed[completed.length - 1];
    const currentPhase = lastCompleted?.phase;

    // 4. Sort by priority
    ready.sort((a, b) => {
        // Priority 1: Same phase as last completed (maintain momentum)
        if (currentPhase) {
            const aInPhase = a.phase === currentPhase ? 0 : 1;
            const bInPhase = b.phase === currentPhase ? 0 : 1;
            if (aInPhase !== bInPhase) return aInPhase - bInPhase;
        }

        // Priority 2: Earlier phase number (sequential progression)
        const phaseOrder = ['backend', 'frontend', 'testing', 'documentation'];
        const aPhaseIdx = phaseOrder.indexOf(a.phase);
        const bPhaseIdx = phaseOrder.indexOf(b.phase);
        if (aPhaseIdx !== bPhaseIdx) return aPhaseIdx - bPhaseIdx;

        // Priority 3: Fewest dependencies (quick wins, reduce blocking)
        if (a.dependencies.length !== b.dependencies.length) {
            return a.dependencies.length - b.dependencies.length;
        }

        // Priority 4: Shortest time (quick wins, maintain velocity)
        const aTime = parseTime(a.estimated_time);
        const bTime = parseTime(b.estimated_time);
        return aTime - bTime;
    });

    // 5. Return first match
    return ready[0];
}
```

**Example Output:**

```
Current Sprint: Sprint 4 (24 tasks)
Completed: DATABASE-001, API-001 (Phase: backend)
Pending: API-002, API-003, UI-001, UI-002, DOC-001, QA-002

Smart Selection:
1. ✅ API-002 (same phase "backend", 0 deps, 3 hours)
2. ✅ API-003 (same phase "backend", 0 deps, 4 hours)
3. ⏭️ UI-001 (different phase "frontend", 1 dep on API-003, 6 hours)
4. ⏭️ DOC-001 (different phase "documentation", 0 deps, 2 hours)

Recommendation: Start API-002 (maintain backend momentum)
```

---

### Dependency Validation

**Scenario:** User clicks "Start This Task" on UI-001

```
UI-001: Build license key display component
Dependencies: [API-001, API-002]

Dependency Check:
✅ API-001: completed
❌ API-002: pending

Result: BLOCKED
```

**Alternative Task Modal:**

```
┌─────────────────────────────────────────────────────────────┐
│  Task UI-001 is blocked by incomplete dependencies          │
│                                                              │
│  Blocking Dependencies:                                      │
│  ❌ API-002: Create license generation endpoint (pending)    │
│                                                              │
│  Would you like to start a different task?                  │
│                                                              │
│  Ready Tasks:                                                │
│  ✅ API-002: Create license generation endpoint (4 hours)    │
│  ✅ API-003: Create license revocation endpoint (3 hours)    │
│  ✅ DOC-001: Update CHANGELOG.md (2 hours)                   │
│                                                              │
│  [Start API-002]  [Start API-003]  [Cancel]                 │
└─────────────────────────────────────────────────────────────┘
```

---

### Template Task System (27 Normalized Tasks)

**Problem:** Engineers forget critical tasks (documentation, tests, retrospectives)

**Solution:** Auto-inject 19-27 normalized tasks into every sprint

**Categories:**

1. **REQUIRED (13 tasks)** - Cannot skip, blocks sprint completion
   - `DOC-001` to `DOC-004` (CHANGELOG, README, patterns, CLAUDE.md)
   - `QA-001` to `QA-004` (ripple detection, tests, dependencies, types)
   - `AGENT-001` to `AGENT-002` (agent contexts, pitfalls)
   - `INFRA-001` to `INFRA-002` (pre-commit hooks, validation scripts)
   - `CONFIG-001` (settings schema)

2. **SUGGESTED (4 tasks)** - Can skip with justification
   - `PERF-001` (performance testing)
   - `SEC-001` (security scan)
   - `COMPAT-001` to `COMPAT-002` (cross-platform, backwards compatibility)

3. **CONDITIONAL (8 tasks)** - Auto-included based on sprint type
   - **Publishing (5 tasks)** - If sprint name contains "release", "publish", "v1.0"
     - `PUB-001` to `PUB-005` (audit, version sync, compile, tag, publish)
   - **UX (3 tasks)** - If sprint name contains "ui", "ux", "interface"
     - `UX-001` to `UX-003` (upgrade guide, release notes, user workflows)

4. **RETROSPECTIVE (2 tasks)** - Every sprint
   - `RETRO-001` (sprint retrospective)
   - `RETRO-002` (pattern extraction)

---

### 4-Layer Template Enforcement

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: Auto-Injection (Creation Time)                        │
│  • sprint-plan skill detects sprint type                        │
│  • Injects 19-27 template tasks from SPRINT_TEMPLATE.toml       │
│  • Task ID collision avoidance (DOC-*, QA-* reserved)           │
│  • Confidence: N/A (automatic, no human intervention)           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 2: Static Validation (File Save)                         │
│  • FileSystemWatcher monitors ACTIVE_SPRINT.toml                │
│  • SprintSchemaValidator checks REQUIRED tasks present          │
│  • Warns if SUGGESTED tasks skipped without justification       │
│  • Blocks sprint loading if validation fails                    │
│  • Confidence: 0.0 (blocking) if REQUIRED missing               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 3: Runtime Enforcement (Sprint Completion)               │
│  • WorkflowCheck runs when starting new sprint                  │
│  • Verifies all REQUIRED tasks status = "completed"             │
│  • Verifies RETROSPECTIVE tasks completed                       │
│  • Verifies CONDITIONAL tasks completed (if applicable)         │
│  • Blocks sprint promotion if tasks incomplete                  │
│  • Confidence: 0.0 (blocking) if incomplete                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 4: Retrospective Learning (Every Sprint)                 │
│  • RETRO-001: Review sprint goals vs actual outcomes            │
│  • RETRO-002: Extract reusable patterns from sprint             │
│  • Identify gaps (missing skills, agents, patterns)             │
│  • Continuous system improvement                                │
│  • Confidence: 0.95 (bonus) if completed                        │
└─────────────────────────────────────────────────────────────────┘
```

**Historical Bug Prevention:**

| Bug | Version | Time Lost | Template Task | Prevention |
|-----|---------|-----------|---------------|------------|
| Version mismatch | v0.13.28-29 | 2 hours | PUB-002 | Blocks publish without version sync |
| Runtime npm deps | v0.15.31-32 | 2 hours | QA-003 | Blocks sprint without dependency check |
| Native dependency | v0.13.23 | 9 hours | QA-003 | Pre-flight checklist catches forbidden deps |
| CHANGELOG forgotten | Multiple | 1 hour each | DOC-001 | Blocks sprint without CHANGELOG update |
| Tests not run | Multiple | 2 hours each | QA-002 | Blocks sprint without test execution |
| Agent context stale | Multiple | 1 hour each | AGENT-001 | Blocks sprint without agent sync |

**Total Time Saved:** 15+ hours per sprint

---

## AI Terminal Enhancement

### "Start New Task" Workflow

**User Action:** Click "Start Next Task" in Voice Panel

**System Flow:**

```
1. Smart Task Selection
   ├─ TaskStarter.findNextReadyTask()
   ├─ Phase-aware algorithm
   ├─ Dependency validation
   └─ Returns optimal task

2. Task Analysis (Pattern-TASK-ANALYSIS-001)
   ├─ Agent verification (correct expert assigned?)
   ├─ Tech stack analysis (dependencies compatible?)
   ├─ Dependency check (Pattern-PUBLISH-003 compliance?)
   ├─ Test strategy (coverage requirements by task type)
   ├─ Integration points (affected services identified?)
   ├─ Pattern compliance (existing patterns referenced?)
   ├─ Pre-flight checklist (CLAUDE.md mandatory checks)
   └─ Documentation requirements (Chain of Thought comments needed?)

3. Context Gathering
   ├─ Git diff (files changed since sprint creation)
   ├─ TOML task definition (description, why, context, reasoning_chain)
   ├─ Relevant patterns (from docs/patterns/)
   ├─ Agent context (from internal/agents/{agent}-context.md)
   └─ Workspace state (modified files, diagnostics)

4. AI Prompt Generation
   ├─ Task description + enriched context
   ├─ Pre-flight checklist (Pattern-VALIDATION-001)
   ├─ TDD requirements (RED/GREEN/REFACTOR)
   ├─ Validation criteria (how to verify completion)
   ├─ File paths with line numbers
   └─ Error handling requirements

5. Prompt Display (TaskPromptViewer)
   ├─ User reviews generated prompt
   ├─ One-click copy to clipboard
   └─ Send to external terminal/AI system

6. Task Execution (External AI)
   ├─ AI has complete context to execute
   ├─ AI follows TDD workflow (write tests first)
   └─ AI updates sprint TOML on completion

7. Sprint Auto-Refresh
   ├─ FileSystemWatcher detects TOML change
   ├─ Debounced 500ms
   ├─ Reload sprint tasks
   └─ Update Voice Panel UI
```

---

### Example: Generated AI Prompt

**Task:** API-001: Create license validation API endpoint

**Generated Prompt:**

````markdown
# Task: API-001 - Create License Validation API Endpoint

## Context

**Sprint:** Sprint 4 - Key Authorization & Monetization
**Phase:** Backend
**Agent:** api-agent
**Estimated Time:** 4-6 hours
**Dependencies:** DATABASE-001 (completed ✅)

---

## Why (User Pain Point)

Users cannot use the desktop app without a valid license key. We need a server endpoint that:
- Validates license keys against database
- Checks credit balance
- Returns usage limits
- Tracks API calls per key

**Pain Point:** Desktop app currently calls OpenAI directly with user's API key (BYOK model). We're removing this and replacing with our server proxy that validates license keys before proxying to OpenAI.

---

## Task Description

Create POST /api/desktop/transcribe endpoint that:
1. Accepts license_key + audio_data in request body
2. Validates license_key exists in database
3. Checks credit balance > 0
4. Proxies request to OpenAI Whisper API
5. Deducts 1 credit from balance
6. Returns transcription result

---

## Reasoning Chain (Step-by-Step)

1. Design API request/response types
2. Create POST /api/desktop/transcribe endpoint
3. Add license key validation logic
   - Query database for key
   - Check key is active (not expired/revoked)
   - Check credit balance > 0
4. Add OpenAI proxy logic
   - Forward audio to Whisper API
   - Handle errors (invalid audio, API timeout)
5. Add credit deduction logic
   - Atomic transaction (check + deduct)
   - Prevent race conditions
6. Write integration tests (TDD)
7. Add error handling for edge cases

---

## Pre-Flight Checklist (MANDATORY - Answer OUT LOUD)

**Pattern-VALIDATION-001 Enforcement:**

### Before Adding Dependencies:

1. ✅ **Is this a native dependency?**
   - Check for: node-gyp, napi, bindings, .node
   - If YES → **FORBIDDEN** - Use Node.js built-ins or VS Code APIs
   - Pattern-PUBLISH-003 prevents native dependencies

2. ✅ **Is this a runtime npm dependency?**
   - Check for: glob, lodash, moment, axios, chalk
   - If YES → **FORBIDDEN** - Use Node.js built-ins (fs, path, https)
   - Exception: Whitelisted (form-data, node-fetch, ws)

3. ✅ **Did I check the whitelist?**
   - Allowed: form-data, node-fetch, ws
   - Everything else → Use built-ins

### Before Writing Code:

1. ✅ **Did I verify tech stack compatibility?**
   - Next.js API routes (not Express)
   - Supabase for database queries
   - TypeScript with strict mode

2. ✅ **Did I check existing patterns?**
   - See: docs/patterns/Pattern-API-001.md (API endpoint structure)
   - See: docs/patterns/Pattern-TDD-001.md (test-first development)

---

## TDD Requirements (RED/GREEN/REFACTOR)

**RED Phase: Write Failing Tests First**

```typescript
// test/integration/api/desktop/transcribe.test.ts

describe('POST /api/desktop/transcribe', () => {
    test('valid license key with credits returns transcription', async () => {
        // Given: Valid license key with 100 credits
        const licenseKey = 'test-key-with-credits';
        const audioData = Buffer.from('fake-audio-data');

        // When: POST request with valid key
        const response = await fetch('/api/desktop/transcribe', {
            method: 'POST',
            body: JSON.stringify({ license_key: licenseKey, audio_data: audioData })
        });

        // Then: Returns 200 with transcription
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.transcription).toBeDefined();
        expect(data.credits_remaining).toBe(99); // Deducted 1 credit
    });

    test('invalid license key returns 401', async () => {
        // Given: Invalid license key
        const licenseKey = 'invalid-key';
        const audioData = Buffer.from('fake-audio-data');

        // When: POST request with invalid key
        const response = await fetch('/api/desktop/transcribe', {
            method: 'POST',
            body: JSON.stringify({ license_key: licenseKey, audio_data: audioData })
        });

        // Then: Returns 401 Unauthorized
        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toBe('Invalid license key');
    });

    test('license key with 0 credits returns 402', async () => {
        // Given: Valid license key with 0 credits
        const licenseKey = 'test-key-no-credits';
        const audioData = Buffer.from('fake-audio-data');

        // When: POST request with zero balance
        const response = await fetch('/api/desktop/transcribe', {
            method: 'POST',
            body: JSON.stringify({ license_key: licenseKey, audio_data: audioData })
        });

        // Then: Returns 402 Payment Required
        expect(response.status).toBe(402);
        const data = await response.json();
        expect(data.error).toBe('Insufficient credits');
    });

    // ... (4 more tests for edge cases)
});
```

**Coverage Requirement:** 85% (API code)

**GREEN Phase:** Implement minimal code to pass tests

**REFACTOR Phase:** Extract validation logic to separate module

---

## File Structure

**Files to Create:**
- `website/pages/api/desktop/transcribe.ts` (main endpoint, ~150 lines)
- `website/lib/license-validator.ts` (validation logic, ~80 lines)
- `website/lib/openai-proxy.ts` (proxy logic, ~100 lines)
- `test/integration/api/desktop/transcribe.test.ts` (tests, ~300 lines)

**Files to Modify:**
- `website/lib/supabase.ts:25-40` (add credit deduction query)
- `website/types/license.ts:1-15` (add LicenseValidationResult type)

**Estimated Lines:** 630 lines total

---

## Validation Criteria

✅ POST /api/desktop/transcribe endpoint created
✅ License key validation works (valid/invalid/expired)
✅ Credit balance check works (sufficient/insufficient)
✅ OpenAI proxy works (success/error handling)
✅ Credit deduction atomic (no race conditions)
✅ Integration tests pass with 85%+ coverage
✅ Error responses include helpful messages
✅ Performance < 5 seconds end-to-end

---

## Agent Context (api-agent)

**Responsibilities:**
- REST API endpoint design
- Request validation
- Error handling (4xx, 5xx)
- Integration with external APIs
- Database queries via ORM

**Performance Targets:**
- API response time: < 500ms (excluding OpenAI)
- End-to-end latency: < 5 seconds (including OpenAI)
- Error rate: < 0.1%

**Common Pitfalls:**
- ❌ Not handling OpenAI rate limits (429 errors)
- ❌ Not using atomic transactions for credit deduction
- ❌ Not validating request body schema
- ❌ Not logging errors for debugging

**Relevant Patterns:**
- Pattern-API-001: API endpoint structure
- Pattern-TDD-001: Test-driven development
- Pattern-ERROR-001: Error handling conventions

---

## Current Project State

**Git Diff (files changed since sprint start):**
```diff
M supabase/migrations/20251018000007_credit_system.sql
  (Added license_keys table with credits column)

M website/lib/supabase.ts
  (Added Supabase client initialization)
```

**Modified Files (not committed):**
```
M website/types/license.ts (added License type)
```

**Recent Commits:**
```
5077f3f refactor(ONBOARD-001): Remove remaining walkthrough documentation
237ae28 refactor(ONBOARD-001): Remove deprecated walkthrough implementation
667f318 docs(EMERGENCY): Complete emergency sprint - all 23 tasks done
```

---

## Error Handling Requirements

**Expected Errors:**

1. **Invalid License Key (401)**
   ```json
   { "error": "Invalid license key", "code": "INVALID_KEY" }
   ```

2. **Insufficient Credits (402)**
   ```json
   { "error": "Insufficient credits", "code": "INSUFFICIENT_CREDITS", "credits_remaining": 0 }
   ```

3. **OpenAI API Error (502)**
   ```json
   { "error": "Transcription service unavailable", "code": "UPSTREAM_ERROR" }
   ```

4. **Invalid Audio Data (400)**
   ```json
   { "error": "Invalid audio data", "code": "INVALID_AUDIO" }
   ```

---

## Success Criteria

**Definition of Done:**
- [ ] All tests pass (RED → GREEN)
- [ ] Coverage >= 85%
- [ ] Endpoint responds < 5 seconds
- [ ] Error messages are helpful
- [ ] Code follows existing patterns
- [ ] Chain of Thought comments explain WHY
- [ ] Update ACTIVE_SPRINT.toml: status = "completed"

---

**Ready to start? Follow TDD workflow: RED → GREEN → REFACTOR**
````

---

### Prompt Enhancement Tiers

**PromptEnhancer.ts** analyzes user input and applies appropriate enhancement:

**Tier 1: Simple (Pass-Through)**
```
User: "Fix typo in README.md line 42"

Enhancement: None (clear, concise, no context needed)

Result: Pass through to terminal without modification
```

---

**Tier 2: Medium (Lightweight Context)**
```
User: "Add error handling to the API endpoint"

Enhancement:
- Detect patterns related to error handling
- Add relevant pattern references (Pattern-ERROR-001)
- Include code examples from similar endpoints

Result: Enhanced prompt with pattern references
```

---

**Tier 3: Complex (Full Structure)**
```
User: "Implement user authentication"

Enhancement:
- Detect skill match (code-analyze? sprint-plan?)
- Add comprehensive context:
  • Workspace structure
  • Tech stack (React, Next.js, Supabase)
  • Existing patterns (Pattern-AUTH-001)
  • Agent assignment (api-agent + security-agent)
  • TDD requirements
  • Validation criteria

Result: Comprehensive prompt with full structure
```

---

## Agent System

### 9 Specialized Agents

**Pattern-CONTEXT-003: Hierarchical Agent Contexts (71% token reduction)**

```
┌─────────────────────────────────────────────────────────────────┐
│  Before (Monolithic Context)                                    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  CLAUDE.md: 1,500 lines (11,250 tokens)                │    │
│  │  • All patterns (77+)                                   │    │
│  │  • All workflows                                        │    │
│  │  • All historical bugs                                  │    │
│  │  • All agent responsibilities                           │    │
│  │  Total: 27,250 tokens per agent                         │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼ REFACTORED (Pattern-CONTEXT-003)
┌─────────────────────────────────────────────────────────────────┐
│  After (Hierarchical Context)                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Core (CLAUDE.md): 500 lines (3,750 tokens)            │    │
│  │  • Project overview                                     │    │
│  │  • High-level patterns                                  │    │
│  │  • Publishing process                                   │    │
│  │  • Pre-flight checklist                                 │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Specialized Context: 400 lines (3,000 tokens)          │    │
│  │  • Agent-specific responsibilities                      │    │
│  │  • Relevant code examples                               │    │
│  │  • Performance targets                                  │    │
│  │  • Common pitfalls                                      │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Relevant Patterns: 150 lines (1,125 tokens)            │    │
│  │  • 3-5 patterns relevant to current task               │    │
│  │  • On-demand loading (not all 77 patterns)              │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Total: 7,875 tokens per agent (71% reduction)                  │
└─────────────────────────────────────────────────────────────────┘
```

**Savings: 19,375 tokens per agent**
**For 5 parallel agents: 96,875 tokens saved = ~$0.14 per sprint**

---

### Agent Expertise Map

| Agent | Domain | Responsibilities | Performance Targets |
|-------|--------|------------------|---------------------|
| **infrastructure-agent** | Services, Middleware, CI/CD | Service orchestration, dependency injection, deployment pipelines | Service startup < 200ms, Pipeline < 5min |
| **api-agent** | REST/GraphQL APIs | Endpoint design, route handlers, request validation, error responses | API response < 500ms, Error rate < 0.1% |
| **ui-agent** | React Components | Component design, state management, user interactions, accessibility | First paint < 1s, Interaction < 100ms |
| **database-agent** | Schema, Migrations | Database design, schema migrations, query optimization, indexing | Query < 100ms, Migration rollback safe |
| **test-agent** | TDD, Coverage, Integration | Test design, mocking, coverage analysis, CI integration | Coverage: Infra 90%, API 85%, UI 70% |
| **documentation-agent** | Technical Writing | Chain of Thought docs, pattern extraction, user guides, API docs | Docs updated within 24h of code changes |
| **review-agent** | Code Review, Security | Code quality review, security scan, performance analysis, best practices | Review completeness score > 0.8 |
| **planning-agent** | Sprint Planning | Sprint parsing, task breakdown, dependency analysis, estimation | Sprint generation < 5 minutes |
| **commit-agent** | Git Workflow | Commit messages, PR descriptions, git history cleanup, branch strategy | Commit message quality score > 0.9 |

---

### Agent Context Structure

**Example:** `internal/agents/api-agent-context.md`

```markdown
# API Agent Context

**Agent ID:** api-agent
**Type:** Specialized Agent
**Domain:** REST/GraphQL API Development

---

## Responsibilities

1. **Endpoint Design**
   - RESTful route structure
   - Request/response schemas
   - HTTP status codes
   - API versioning

2. **Request Validation**
   - Schema validation (Zod, Yup)
   - Type safety (TypeScript)
   - Input sanitization
   - Error messages

3. **Error Handling**
   - Structured error responses
   - 4xx vs 5xx semantics
   - Logging for debugging
   - User-friendly messages

4. **Integration with External APIs**
   - HTTP clients (node-fetch, axios)
   - Rate limiting
   - Retry logic
   - Circuit breakers

5. **Database Queries via ORM**
   - Supabase client
   - Query optimization
   - Transaction handling
   - N+1 prevention

---

## Performance Targets

- **API Response Time:** < 500ms (excluding upstream services)
- **End-to-End Latency:** < 5 seconds (including upstream)
- **Error Rate:** < 0.1%
- **Uptime:** 99.9%

---

## Common Pitfalls

### ❌ Not Handling Rate Limits
**Problem:** External API returns 429, app crashes
**Solution:** Implement exponential backoff with jitter

### ❌ Not Using Atomic Transactions
**Problem:** Race condition in credit deduction
**Solution:** Use database transactions for multi-step operations

### ❌ Not Validating Request Body
**Problem:** Invalid data reaches business logic
**Solution:** Schema validation middleware (Zod)

### ❌ Not Logging Errors
**Problem:** Production bugs impossible to debug
**Solution:** Structured logging with context (request ID, user ID)

---

## Relevant Patterns

- **Pattern-API-001:** API endpoint structure
- **Pattern-ERROR-001:** Error handling conventions
- **Pattern-TDD-001:** Test-driven development
- **Pattern-PERF-001:** Performance optimization

---

## Code Examples

### Endpoint Structure (Pattern-API-001)

```typescript
// pages/api/desktop/transcribe.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { validateLicenseKey } from '@/lib/license-validator';
import { proxyToOpenAI } from '@/lib/openai-proxy';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // 1. Method check
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 2. Validate request body
    const { license_key, audio_data } = req.body;
    if (!license_key || !audio_data) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // 3. Validate license key
    const validation = await validateLicenseKey(license_key);
    if (!validation.valid) {
        return res.status(401).json({ error: validation.error });
    }

    // 4. Check credits
    if (validation.credits_remaining < 1) {
        return res.status(402).json({
            error: 'Insufficient credits',
            credits_remaining: 0
        });
    }

    // 5. Proxy to OpenAI
    try {
        const result = await proxyToOpenAI(audio_data, license_key);
        return res.status(200).json({
            transcription: result.text,
            credits_remaining: validation.credits_remaining - 1
        });
    } catch (error) {
        console.error('OpenAI proxy error:', error);
        return res.status(502).json({ error: 'Transcription service unavailable' });
    }
}
```

---

## Files Under Management

**Primary:**
- `website/pages/api/**/*.ts` (API routes)
- `website/lib/*-client.ts` (External API clients)
- `website/lib/*-validator.ts` (Request validators)
- `test/integration/api/**/*.test.ts` (API integration tests)

**Secondary:**
- `website/types/**/*.ts` (Type definitions)
- `website/middleware/**/*.ts` (Express-like middleware)

---

## Skills Available

- `api-design` - Generate OpenAPI spec from requirements
- `api-test` - Generate integration tests for endpoint
- `api-optimize` - Analyze and optimize API performance

---

## Token Budget

**Maximum:** 8,000 tokens per task
**Breakdown:**
- Core context: 3,750 tokens
- Agent context: 3,000 tokens
- Relevant patterns (3-5): 1,125 tokens
- Remaining: 125 tokens buffer

---

## Current Tasks

*(Dynamically populated from ACTIVE_SPRINT.toml)*

- API-001: Create license validation endpoint (in_progress)
- API-002: Create license generation endpoint (pending)
- API-003: Create license revocation endpoint (pending)

---

## Max Parallel Tasks

**Recommended:** 2 tasks
**Maximum:** 3 tasks (with high confidence)

**Reasoning:** API endpoints often have shared dependencies (database, types). Running 3+ in parallel increases merge conflicts.
```

---

### Agent Assignment Logic

```typescript
interface TaskContext {
    id: string;
    name: string;
    category: string;  // 'api', 'ui', 'database', 'test', 'docs'
    files_to_modify: string[];
    files_to_create: string[];
    dependencies: string[];
}

function assignAgent(task: TaskContext): Agent {
    // 1. Match task category to agent expertise
    const agentsByCategory: Record<string, string> = {
        'api': 'api-agent',
        'ui': 'ui-agent',
        'database': 'database-agent',
        'test': 'test-agent',
        'docs': 'documentation-agent',
        'infra': 'infrastructure-agent',
        'security': 'security-agent',
        'performance': 'performance-agent',
        'planning': 'planning-agent',
        'git': 'commit-agent'
    };

    const primaryAgent = agentsByCategory[task.category] || 'infrastructure-agent';

    // 2. Check agent availability (current workload)
    const agent = AgentRegistry.get(primaryAgent);
    if (agent.currentTasks.length >= agent.maxParallelTasks) {
        // Agent at capacity, find alternative
        return findAlternativeAgent(task, agentsByCategory);
    }

    // 3. Verify required patterns available
    const requiredPatterns = detectRequiredPatterns(task);
    const agentPatterns = agent.patterns;
    const missing = requiredPatterns.filter(p => !agentPatterns.includes(p));

    if (missing.length > 0) {
        // Load missing patterns into agent context
        agent.patterns.push(...missing);
    }

    // 4. Return agent with specialized context loaded
    return agent;
}
```

---

## Pattern Library

### 77+ Reusable Patterns

**Categories:**

1. **Workflow Protocols (9 patterns)**
   - Pattern-TASK-ANALYSIS-001: 8-step pre-task analysis
   - Pattern-CODE-001: Code development workflow
   - Pattern-SPRINT-PLAN-001: Sprint planning process
   - Pattern-TDD-001: Test-driven development
   - Pattern-GIT-001: Git workflow integration
   - Pattern-IMPROVEMENT-001: Gap detection & self-improvement
   - Pattern-TRACKING-001: Task tracking & pre-commit
   - Pattern-DOCS-001: Documentation philosophy
   - Pattern-SPRINT-TEMPLATE-001: Sprint template system

2. **Publishing & Release (5 patterns)**
   - Pattern-PUBLISH-001: Automated release pipeline
   - Pattern-PUBLISH-002: Publishing enforcement
   - Pattern-PUBLISH-003: Avoid runtime npm dependencies
   - Pattern-PUBLISH-004: Pre-publish validation
   - Pattern-PKG-001: Package architecture (4 packages)

3. **Context Management (3 patterns)**
   - Pattern-CONTEXT-001: Content-addressable context system
   - Pattern-CONTEXT-002: Hierarchical documentation
   - Pattern-CONTEXT-003: Hierarchical agent contexts (71% token reduction)

4. **Agent Infrastructure (1 pattern)**
   - Pattern-AGENT-001: Intelligent agent assignment

5. **Validation (1 pattern)**
   - Pattern-VALIDATION-001: Pre-flight checklists

6. **UI/UX (6 patterns)**
   - Pattern-UI-001: Tabbed sidebar navigation
   - Pattern-UI-002: Real-time feedback indicators
   - Pattern-UI-003: Collapsible sections
   - Pattern-UI-004: Keyboard shortcuts
   - Pattern-UI-005: Accessibility compliance
   - Pattern-UI-006: Responsive design

7. **Documentation (1 pattern)**
   - Pattern-DOCS-001: Documentation philosophy (reusability-driven)

8. **Domain-Specific (51+ patterns)**
   - Pattern-API-001 through Pattern-API-015: API design
   - Pattern-AUTH-001 through Pattern-AUTH-008: Authentication
   - Pattern-ERROR-001 through Pattern-ERROR-005: Error handling
   - Pattern-PERF-001 through Pattern-PERF-010: Performance
   - Pattern-SEC-001 through Pattern-SEC-013: Security
   - *(and more)*

---

### Pattern Structure

**Format:** Problem/Solution/When-to-Use

**Example:** `docs/patterns/Pattern-PUBLISH-003.md`

```markdown
# Pattern-PUBLISH-003: Avoid Runtime npm Dependencies

**CREATED:** 2025-11-05
**CATEGORY:** Publishing
**LANGUAGE:** JavaScript
**QUALITY SCORE:** 0.95
**APPLICABILITY:** General use
**STATUS:** Active

---

## Problem

VS Code extensions that use runtime npm dependencies fail to activate:

**Historical Bug (v0.15.31-32):**
```javascript
// ❌ BAD: Runtime dependency on 'glob' package
import glob from 'glob';

// Extension activation fails:
// Error: Cannot find module 'glob'
```

**Root Cause:**
- VS Code extensions run in sandboxed environment
- npm dependencies not bundled by default
- Extension activation fails with "Cannot find module"

**Time Lost:** 2 hours debugging per incident

---

## Solution

**Use Node.js built-ins instead of npm packages**

**Allowed:**
- `fs`, `path`, `util`, `crypto`, `https` (Node.js built-ins)
- VS Code APIs (`vscode.workspace.findFiles`)
- Whitelisted packages: `@iarna/toml`, `form-data`, `node-fetch`, `ws`

**Forbidden:**
- `glob`, `lodash`, `moment`, `axios`, `chalk`, `colors`
- Any package not in whitelist

**Example Refactor:**

```javascript
// ❌ BEFORE: Runtime dependency on 'glob'
import glob from 'glob';

const files = glob.sync('**/*.toml', { cwd: sprintDir });

// ✅ AFTER: VS Code API
import * as vscode from 'vscode';

const files = await vscode.workspace.findFiles(
    new vscode.RelativePattern(sprintDir, '**/*.toml')
);
```

---

## When to Use

**ALWAYS** check before adding any dependency to package.json:

1. Is this a runtime dependency? (used by extension code)
2. Is this in the whitelist? (check CLAUDE.md)
3. Can I use a Node.js built-in instead?

**Pre-flight Checklist:**
- [ ] Check Pattern-PUBLISH-003
- [ ] Search for built-in alternative
- [ ] Test extension activation after adding dependency
- [ ] Run `npm run compile && F5` to verify

---

## Related Patterns

- Pattern-PUBLISH-001: Automated release pipeline
- Pattern-PUBLISH-004: Pre-publish validation
- Pattern-VALIDATION-001: Pre-flight checklists

---

## Version History

- **v1.0.0** (2025-11-05): Initial extraction from KNOWN_ISSUES.md
  - Documented historical v0.15.31-32 bug
  - Added whitelist of allowed packages
  - Created pre-flight checklist
```

---

### Pattern Discovery & Application

**Scenario:** Engineer starting API-001 (Create license validation endpoint)

```
1. Task Analysis Detects Category: "api"
   ├─ Agent assignment: api-agent
   └─ Relevant patterns: Pattern-API-*, Pattern-ERROR-*, Pattern-TDD-*

2. Pattern Library Search
   ├─ Query: "api endpoint design"
   ├─ Results: Pattern-API-001, Pattern-API-002, Pattern-API-003
   └─ Load patterns into prompt

3. Pattern Application
   ├─ Pattern-API-001: Endpoint structure
   │  └─ Template: Method check → Validate → Business logic → Response
   ├─ Pattern-ERROR-001: Error handling conventions
   │  └─ Template: 4xx client errors, 5xx server errors, structured responses
   └─ Pattern-TDD-001: Test-driven development
      └─ Template: RED → GREEN → REFACTOR

4. Prompt Generation
   ├─ Include pattern code examples
   ├─ Include common pitfalls
   └─ Include validation criteria from patterns
```

---

## Code Analysis

### Workspace Analyzer

**Command:** `ÆtherLight: Analyze Workspace`

**Features:**

```typescript
interface WorkspaceAnalysisResult {
    projectType: string;          // 'node', 'react', 'vue', 'tauri', 'monorepo'
    techStack: {
        languages: string[];      // ['TypeScript', 'Rust', 'JavaScript']
        frameworks: string[];     // ['React', 'Next.js', 'Tauri']
        tools: string[];          // ['Webpack', 'Vite', 'esbuild']
    };
    structure: {
        rootPath: string;
        mainDirectories: string[];  // ['src', 'test', 'docs', 'packages']
        entryPoints: string[];      // ['src/index.ts', 'src/extension.ts']
    };
    patterns: {
        detected: Pattern[];        // Patterns found in docs/patterns/
        suggested: Pattern[];       // Patterns from library that match project
    };
    gitHistory: {
        recentCommits: Commit[];
        branches: string[];
        remoteUrl: string;
    };
    diagnostics: {
        errors: Diagnostic[];       // VS Code diagnostics (red squiggles)
        warnings: Diagnostic[];
    };
}
```

**Output:** JSON written to `.aetherlight/workspace-analysis.json`

---

### aetherlight-analyzer Package

**Public API:**

```typescript
import { TypeScriptParser, ArchitectureAnalyzer, SprintGenerator } from 'aetherlight-analyzer';

// 1. Parse TypeScript codebase
const parser = new TypeScriptParser();
const ast = await parser.parse('src/**/*.ts');

// 2. Analyze architecture
const analyzer = new ArchitectureAnalyzer(ast);
const report = await analyzer.analyze();

console.log(report);
// {
//   modules: [{ name: 'services', dependencies: ['utils', 'types'] }],
//   complexity: { average: 5.2, max: 15, files: [...] },
//   technicalDebt: [
//     { file: 'src/legacy.ts', issue: 'High cyclomatic complexity', severity: 'high' }
//   ]
// }

// 3. Generate sprint from analysis
const generator = new SprintGenerator(report);
const sprint = await generator.generate({
    goal: 'Refactor high-complexity modules',
    timeframe: '2 weeks'
});

// Writes: internal/sprints/SPRINT_REFACTORING.toml
```

**CLI Usage:**

```bash
# Analyze entire project
aetherlight-analyzer analyze .

# Generate sprint from analysis
aetherlight-analyzer sprint --goal "Refactor services" --time "2 weeks"

# Extract patterns
aetherlight-analyzer patterns --output docs/patterns/

# Complexity report
aetherlight-analyzer complexity --threshold 10
```

---

### Pattern Extraction

**RETRO-002 Task:** Extract reusable patterns from sprint

**Process:**

```
1. Review Code Written During Sprint
   ├─ Identify recurring solutions
   ├─ Find novel approaches
   └─ Detect anti-patterns avoided

2. Assess Reusability (Pattern-DOCS-001)
   ├─ Used 1-2 times → Inline comment
   ├─ Used 3-5 times → Extract to function/class
   ├─ Used 6+ times → Create Pattern-*.md

3. Create Pattern Document
   ├─ Problem statement
   ├─ Solution with code example
   ├─ When to use
   ├─ Related patterns
   └─ Version history

4. Add to Pattern Library Index
   ├─ Update docs/patterns/INDEX.md
   ├─ Add to PatternLibrary search index
   └─ Update agent contexts with new pattern

5. Update CLAUDE.md
   └─ Add pattern to relevant section
```

---

## Publishing & Testing

### Automated Release Pipeline (Pattern-PUBLISH-001)

**Command:** `node scripts/publish-release.js patch`

**Pipeline Steps:**

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Pre-Publish Validation (Pattern-PUBLISH-004)                │
│     • Verify git status clean (no uncommitted changes)          │
│     • Verify on master branch                                   │
│     • Verify npm logged in as 'aelor'                           │
│     • Verify all 4 packages have matching versions              │
│     • Estimated time: 5 seconds                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Version Bump (bump-version.js)                              │
│     • Update package.json in 4 packages:                        │
│       - vscode-lumina/package.json                              │
│       - packages/aetherlight-sdk/package.json                   │
│       - packages/aetherlight-analyzer/package.json              │
│       - packages/aetherlight-node/package.json                  │
│     • Bump type: patch (0.16.0 → 0.16.1)                        │
│     • Estimated time: 2 seconds                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. TypeScript Compilation                                      │
│     • Compile vscode-lumina: npm run compile                    │
│     • Compile aetherlight-sdk: npm run build                    │
│     • Compile aetherlight-analyzer: npm run build               │
│     • Output: vscode-lumina/out/, packages/*/dist/              │
│     • Estimated time: 30 seconds                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Test Execution                                              │
│     • Run test suite: npm test                                  │
│     • Framework: Mocha + Chai                                   │
│     • Coverage requirements:                                    │
│       - Infrastructure: 90%                                     │
│       - API: 85%                                                │
│       - UI: 70%                                                 │
│     • Estimated time: 45 seconds                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. VSIX Packaging                                              │
│     • Bundle extension: vsce package                            │
│     • Output: lumina-0.16.1.vsix                                │
│     • Size check: < 10 MB                                       │
│     • Estimated time: 15 seconds                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. npm Publishing (4 packages)                                 │
│     • Publish aetherlight-sdk: npm publish                      │
│     • Publish aetherlight-analyzer: npm publish                 │
│     • Publish aetherlight-node: npm publish                     │
│     • Verify on npmjs.com                                       │
│     • Estimated time: 30 seconds                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. Git Tagging                                                 │
│     • Create tag: git tag v0.16.1                               │
│     • Push tag: git push origin v0.16.1                         │
│     • Estimated time: 5 seconds                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  8. GitHub Release                                              │
│     • Create release: gh release create v0.16.1                 │
│     • Attach VSIX: lumina-0.16.1.vsix                           │
│     • Generate release notes from CHANGELOG.md                  │
│     • Estimated time: 10 seconds                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  9. CHANGELOG Update                                            │
│     • Add section for v0.16.1                                   │
│     • Extract changes from git log                              │
│     • Commit: docs: Update CHANGELOG for v0.16.1                │
│     • Estimated time: 5 seconds                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  10. Post-Publish Verification                                  │
│      • Verify npm package versions match                        │
│      • Verify GitHub release exists                             │
│      • Verify VSIX download link works                          │
│      • Send success notification                                │
│      • Total time: ~2-3 minutes                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Why Automated?**

**Before (Manual):**
```
❌ v0.13.28-29: Version mismatch (2 hours debugging)
   - Manually bumped vscode-lumina to 0.13.28
   - Forgot to bump aetherlight-sdk
   - Extension activated but SDK API mismatch
   - User installs broken

❌ v0.15.31-32: Published without tests (2 hours debugging)
   - Manually ran npm publish
   - Forgot to run npm test
   - Tests were failing
   - Published broken extension

❌ v0.16.15: Manual bypass (2 hours wasted)
   - Automated script failed (missing devDependency)
   - Manually ran individual steps
   - Forgot git tag step
   - GitHub release missing
```

**After (Automated):**
```
✅ One command: node scripts/publish-release.js patch
✅ All 4 packages stay in sync
✅ Tests always run before publish
✅ Git tags never forgotten
✅ CHANGELOG always updated
✅ 2-3 minutes start-to-finish
```

---

### Test-Driven Development (Pattern-TDD-001)

**Mandatory Workflow:**

```
┌─────────────────────────────────────────────────────────────────┐
│  RED Phase: Write Failing Tests First                           │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  1. Write test for desired behavior                    │    │
│  │  2. Run test → FAILS (expected)                        │    │
│  │  3. Verify test fails for correct reason                │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  GREEN Phase: Implement Minimal Code                            │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  1. Write simplest code to pass test                   │    │
│  │  2. Run test → PASSES                                  │    │
│  │  3. All previous tests still pass                       │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  REFACTOR Phase: Improve Code Quality                           │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  1. Extract duplicated code                             │    │
│  │  2. Rename variables for clarity                        │    │
│  │  3. Optimize performance                                │    │
│  │  4. Run tests → ALL PASS                               │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ Repeat for next feature
```

**Coverage Requirements:**

| Task Type | Minimum Coverage | Rationale |
|-----------|------------------|-----------|
| Infrastructure | 90% | Service failures affect entire system |
| API | 85% | Endpoints exposed to users |
| UI | 70% | Visual testing catches some issues |
| Database | 85% | Data integrity critical |
| Security | 95% | No tolerance for security bugs |

**Enforcement:**

```javascript
// vscode-lumina/test/mocha.opts
--require test/setup.js
--reporter spec
--timeout 5000
--check-leaks
--coverage
--coverage-threshold 85  // Fail if < 85%
```

---

## Complete Workflow Examples

### Example 1: Starting Next Sprint Task

**User Action:** Click "Start Next Task"

**System Response:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Smart Task Selection (TaskStarter.findNextReadyTask)           │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Analyzing sprint: Sprint 4 (24 tasks)                 │    │
│  │  Completed: DATABASE-001, API-001 (Phase: backend)     │    │
│  │  Pending: API-002, API-003, UI-001, DOC-001, QA-002    │    │
│  │                                                          │    │
│  │  Phase-aware sort:                                      │    │
│  │  1. ✅ API-002 (backend, 0 deps, 4h) ← RECOMMENDED      │    │
│  │  2. ✅ API-003 (backend, 0 deps, 3h)                    │    │
│  │  3. ⏭️ UI-001 (frontend, 1 dep, 6h) ← BLOCKED          │    │
│  │  4. ⏭️ DOC-001 (docs, 0 deps, 2h)                       │    │
│  │                                                          │    │
│  │  Selected: API-002 (maintain backend momentum)          │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Dependency Validation                                           │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Task: API-002                                          │    │
│  │  Dependencies: [API-001]                                │    │
│  │                                                          │    │
│  │  Check:                                                 │    │
│  │  ✅ API-001: completed                                  │    │
│  │                                                          │    │
│  │  Result: READY ✅                                        │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task Analysis (Pattern-TASK-ANALYSIS-001)                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  1. Agent verification: api-agent ✅                    │    │
│  │  2. Tech stack: Next.js + Supabase ✅                   │    │
│  │  3. Dependencies: No runtime npm ✅                     │    │
│  │  4. Test strategy: Integration tests, 85% coverage ✅   │    │
│  │  5. Integration points: Database, OpenAI API ✅         │    │
│  │  6. Patterns: Pattern-API-001, Pattern-TDD-001 ✅       │    │
│  │  7. Pre-flight checklist: Passed ✅                     │    │
│  │  8. Documentation: Chain of Thought required ✅         │    │
│  │                                                          │    │
│  │  Gaps: None                                             │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Context Gathering                                               │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  • Git diff: 3 files modified since sprint start        │    │
│  │  • TOML task: description, why, context, reasoning      │    │
│  │  • Patterns: Pattern-API-001, Pattern-TDD-001           │    │
│  │  • Agent: api-agent context (3,000 tokens)              │    │
│  │  • Workspace: Modified files, diagnostics               │    │
│  │                                                          │    │
│  │  Total context: 7,875 tokens (71% reduction)            │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  AI Prompt Generation (TaskPromptExporter)                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Generated prompt includes:                             │    │
│  │  • Task description + enriched context                  │    │
│  │  • Pre-flight checklist (Pattern-VALIDATION-001)        │    │
│  │  • TDD requirements (RED/GREEN/REFACTOR)                │    │
│  │  • Validation criteria (how to verify)                  │    │
│  │  • File paths with line numbers                         │    │
│  │  • Error handling requirements                          │    │
│  │  • Code examples from patterns                          │    │
│  │                                                          │    │
│  │  Length: ~1,200 lines markdown                          │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Prompt Display (TaskPromptViewer)                              │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  [Task Prompt Viewer]                                   │    │
│  │                                                          │    │
│  │  # Task: API-002 - Create license generation endpoint  │    │
│  │                                                          │    │
│  │  ## Context                                             │    │
│  │  Sprint: Sprint 4 - Key Authorization                   │    │
│  │  Agent: api-agent                                       │    │
│  │  ...                                                     │    │
│  │                                                          │    │
│  │  [Copy to Clipboard]  [Send to Terminal]                │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ User copies prompt
┌─────────────────────────────────────────────────────────────────┐
│  External AI Execution                                           │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  User pastes prompt into Claude/GPT terminal            │    │
│  │  AI executes with complete context:                     │    │
│  │  • Writes tests first (RED phase)                       │    │
│  │  • Implements endpoint (GREEN phase)                    │    │
│  │  • Refactors code (REFACTOR phase)                      │    │
│  │  • Updates ACTIVE_SPRINT.toml: status = "completed"     │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Sprint Auto-Refresh (FileSystemWatcher)                        │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Detected: ACTIVE_SPRINT.toml modified                  │    │
│  │  Debounce: 500ms                                        │    │
│  │  Action: Reload sprint tasks                            │    │
│  │  Result: Voice Panel UI updated                         │    │
│  │                                                          │    │
│  │  Task list now shows:                                   │    │
│  │  ✅ DATABASE-001: completed                             │    │
│  │  ✅ API-001: completed                                  │    │
│  │  ✅ API-002: completed ← JUST UPDATED                   │    │
│  │  ⏭️ API-003: pending                                    │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

### Example 2: Creating New Sprint

**User Action:** Run `/sprint-plan 'build user authentication'`

**System Response:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Workflow Check (Pattern-SPRINT-PLAN-001)                       │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Prerequisites:                                         │    │
│  │  ✅ Workspace analyzed (77 patterns indexed)            │    │
│  │  ✅ Git status: Clean (master branch)                   │    │
│  │  ✅ Agent Registry: 9 agents loaded                     │    │
│  │  ✅ Patterns available: 77 patterns                     │    │
│  │  ✅ Skill system: AgentRegistry initialized             │    │
│  │                                                          │    │
│  │  Gaps: None                                             │    │
│  │  Critical Junction: YES (always ask user for approval)  │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Sprint Planning (sprint-plan skill)                            │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  1. Analyze requirements: User authentication system    │    │
│  │  2. Break into phases:                                  │    │
│  │     • Phase 1: Backend (JWT, API endpoints)             │    │
│  │     • Phase 2: Frontend (Login forms, session)          │    │
│  │     • Phase 3: Testing (Integration, E2E)               │    │
│  │     • Phase 4: Documentation (API docs, guides)         │    │
│  │                                                          │    │
│  │  3. Assign agents:                                      │    │
│  │     • Backend: api-agent + security-agent               │    │
│  │     • Frontend: ui-agent                                │    │
│  │     • Testing: test-agent                               │    │
│  │     • Docs: documentation-agent                         │    │
│  │                                                          │    │
│  │  4. Estimate time: 2-3 weeks (12 feature tasks)         │    │
│  │                                                          │    │
│  │  5. Template injection: Detected feature-only sprint    │    │
│  │     • REQUIRED (13): DOC-*, QA-*, AGENT-*, INFRA-*      │    │
│  │     • SUGGESTED (4): PERF-*, SEC-*, COMPAT-*            │    │
│  │     • RETROSPECTIVE (2): RETRO-*                        │    │
│  │     • Total template tasks: 19                          │    │
│  │                                                          │    │
│  │  Total sprint tasks: 31 (12 feature + 19 template)      │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  User Approval (AskUserQuestion)                                │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Sprint Plan Generated:                                 │    │
│  │                                                          │    │
│  │  Name: Sprint 5 - User Authentication                   │    │
│  │  Duration: 2-3 weeks                                    │    │
│  │  Total Tasks: 31 (12 feature + 19 template)             │    │
│  │                                                          │    │
│  │  Phase 1: Backend (4 tasks) - 1 week                    │    │
│  │  Phase 2: Frontend (5 tasks) - 1 week                   │    │
│  │  Phase 3: Testing (3 tasks) - 3 days                    │    │
│  │  Phase 4: Documentation (19 tasks) - 2 days             │    │
│  │                                                          │    │
│  │  Review this plan. Does it match your expectations?     │    │
│  │                                                          │    │
│  │  [Approve and create]  [Modify plan]  [Cancel]          │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────┘
                         │ User selects "Approve and create"
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Sprint Creation                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  1. Create feature branch                               │    │
│  │     git checkout -b feature/user-authentication         │    │
│  │     ✅ Branch created                                    │    │
│  │                                                          │    │
│  │  2. Generate sprint TOML                                │    │
│  │     File: internal/sprints/ACTIVE_SPRINT_AUTH.toml      │    │
│  │     ✅ 31 tasks generated                                │    │
│  │                                                          │    │
│  │  3. Commit sprint file                                  │    │
│  │     git add internal/sprints/ACTIVE_SPRINT_AUTH.toml    │    │
│  │     git commit -m "feat: Add user auth sprint plan"     │    │
│  │     ✅ Committed                                         │    │
│  │                                                          │    │
│  │  Ready to start sprint! 🚀                               │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Why Engineers Love This

### 1. **Eliminates Context Switching**

**Problem:**
```
Traditional workflow:
1. Open GitHub Issues
2. Find task
3. Open Notion for specs
4. Open Slack for context
5. Open documentation site
6. Copy/paste into AI
7. Wait for response
8. Realize AI doesn't have critical context
9. Re-explain project structure
10. Loop 3-4 times

Time: 15-30 minutes per task
```

**ÆtherLight:**
```
1. Click "Start Next Task"
2. Comprehensive prompt generated with all context
3. Copy to AI
4. Done

Time: 30 seconds
```

**Savings:** 14-29 minutes per task × 20 tasks/sprint = **4-10 hours per sprint**

---

### 2. **Prevents Historical Bugs**

**Value Proposition:**

Every engineer has war stories:
- "I published without running tests" (2 hours debugging)
- "I forgot to update CHANGELOG" (1 hour cleanup)
- "I added a native dependency" (9 hours debugging)

**ÆtherLight's template system prevents these:**

```
✅ DOC-001: Update CHANGELOG.md (REQUIRED)
✅ QA-002: Run full test suite (REQUIRED)
✅ QA-003: Check runtime dependencies (REQUIRED)
✅ RETRO-001: Sprint retrospective (REQUIRED)

4-layer enforcement = 0% chance of skipping
```

**ROI:** 15+ hours saved per sprint on preventable bugs

---

### 3. **Enforces Best Practices**

**TDD Without the Hassle:**

Most engineers know TDD is valuable but skip it because:
- "Tests take too long to write"
- "I'll write tests later" (never happens)
- "My team doesn't enforce it"

**ÆtherLight makes it automatic:**

```
1. Task prompt includes RED phase test stubs
2. AI writes tests first (because prompt says so)
3. Coverage requirements enforced (85% API, 70% UI)
4. Task can't be marked complete without tests
```

**Result:** 100% TDD compliance with zero discipline required

---

### 4. **Scales Team Knowledge**

**Problem:** Knowledge silos

```
❌ Only senior dev knows publishing process
❌ Only frontend dev knows component patterns
❌ Only backend dev knows database migration process
```

**ÆtherLight:** Knowledge baked into patterns

```
✅ Pattern-PUBLISH-001: Publishing process (anyone can publish)
✅ Pattern-UI-001: Component structure (any dev can build UI)
✅ Pattern-DATABASE-001: Migration workflow (any dev can migrate)

New dev ramps up in days, not weeks
```

---

### 5. **Makes AI Actually Useful**

**Common AI Failure Modes:**

```
❌ AI: "Here's how to do authentication with Express"
   Dev: "We use Next.js API routes"

❌ AI: "Use axios for HTTP requests"
   Dev: "We forbid runtime npm deps"

❌ AI: "Just add this to package.json"
   Dev: "That's a native dependency, extension will break"
```

**ÆtherLight-enhanced AI:**

```
✅ AI has tech stack context (Next.js, Supabase)
✅ AI has dependency constraints (no runtime npm, no native)
✅ AI has project conventions (Pattern-API-001 structure)
✅ AI has historical pitfalls (see KNOWN_ISSUES.md)

First suggestion = correct suggestion
```

---

## Getting Started

### Installation

```bash
# 1. Install VS Code extension
code --install-extension aetherlight.lumina

# 2. Verify extension activated
code --list-extensions | grep aetherlight

# 3. Desktop app auto-launches on extension activation
# (System tray icon should appear)
```

---

### Initial Setup

```bash
# 1. Clone project
git clone --recurse-submodules https://github.com/AEtherlight-ai/lumina.git
cd lumina

# 2. Open in VS Code
code .

# 3. Run workspace analysis
# Command Palette (Ctrl+Shift+P): "ÆtherLight: Analyze Workspace"

# 4. Review analysis results
cat .aetherlight/workspace-analysis.json

# 5. Create first sprint
# Command Palette: "ÆtherLight: Create Sprint"
# OR: /sprint-plan 'your sprint description'
```

---

### First Task

```
1. Open Voice Panel (Activity Bar icon)
2. Select sprint from dropdown (Sprint panel section)
3. Click "Start Next Task"
4. Review generated prompt
5. Copy to clipboard
6. Paste into Claude/GPT terminal
7. AI executes task
8. Sprint auto-refreshes when task completes
```

---

### Configuration

**Project-Specific Instructions:** `.claude/CLAUDE.md`

```markdown
# Your Project - Claude Code Instructions

**Project:** Your Amazing App
**Tech Stack:** Next.js, React, Supabase, TypeScript

---

## Pre-Flight Checklist

Before ANY code:
1. Read target file first
2. Follow existing patterns
3. Write tests first (TDD)
4. Update sprint TOML on completion

---

## Project Conventions

### API Endpoints
- Use Next.js API routes (pages/api/)
- Validate with Zod schemas
- Error responses: { error: string, code: string }

### Database
- Use Supabase client
- Migrations in supabase/migrations/
- RLS policies for security

### Testing
- Integration tests: test/integration/
- Coverage: 85% minimum
- Framework: Jest
```

---

## Summary

### Core Value Propositions

1. **75-80% Context Reduction**
   - From 2,126 → 400-500 lines in CLAUDE.md
   - Hierarchical agent contexts (71% token reduction)
   - On-demand pattern loading

2. **57% Cost Savings**
   - Tests catch bugs early (before AI debugging loops)
   - Fewer tokens = lower cost per task

3. **15+ Hours Saved Per Sprint**
   - Template tasks prevent forgotten work
   - Pre-flight checklists block dangerous operations
   - Pattern library documents historical bugs

4. **4-Layer Quality Enforcement**
   - Auto-injection (sprint creation)
   - Static validation (file save)
   - Runtime enforcement (sprint completion)
   - Retrospective learning (every sprint)

5. **100% TDD Compliance**
   - Prompts include test stubs
   - Coverage requirements enforced
   - No discipline required

---

### Technology

- **VS Code Extension:** TypeScript 5.3.3, VS Code API ^1.80.0
- **Desktop App:** Tauri (Rust + TypeScript), Whisper API
- **Sprint Management:** TOML (10-20× faster than Markdown)
- **Code Analysis:** ts-morph, syn (Rust parser)
- **Publishing:** Automated 10-step pipeline (2-3 minutes)

---

### Get Involved

- **GitHub:** [github.com/AEtherlight-ai/lumina](https://github.com/AEtherlight-ai/lumina)
- **Discord:** [Join our community](https://discord.gg/ExkyhBny) - Primary hub for discussions, support, and collaboration
- **Website:** [aetherlight.dev](https://aetherlight.dev) (Documentation coming soon)

---

**ÆtherLight: Making AI assistants actually useful for professional software development.**
