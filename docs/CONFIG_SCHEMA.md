# ÆtherLight Config Schema

**Version:** 1.0.0
**File:** `.aetherlight/config.json`
**Purpose:** Project-specific configuration for ÆtherLight platform

---

## Overview

The `.aetherlight/config.json` file configures ÆtherLight for your project. It contains:
- Project metadata (name, type, description)
- File structure (source, tests, docs, sprints)
- Testing configuration (framework, coverage targets, TDD requirements)
- Workflow preferences (patterns, pre-flight checklists)
- Git settings (branch, commit format, hooks)
- Performance targets

This file is **auto-generated** by ConfigGenerator (PROTECT-000E) during:
1. First workspace analysis (`ÆtherLight: Analyze Workspace`)
2. Manual initialization (`aetherlight init`)

---

## Schema

### Root Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$schema` | string | Yes | JSON Schema URL (for IDE autocomplete) |
| `version` | string | Yes | Config schema version (currently `1.0.0`) |
| `project` | object | Yes | Project metadata |
| `structure` | object | Yes | Directory structure |
| `testing` | object | Yes | Test framework and coverage targets |
| `workflows` | object | Yes | Pattern requirements and pre-flight checklists |
| `git` | object | Yes | Git workflow settings |
| `dependencies` | object | No | Dependency whitelist/forbidden lists (VS Code extensions only) |
| `agents` | object | No | Agent-specific settings (coverage, patterns) |
| `performance` | object | No | Performance targets |

---

## Section Details

### `project`

Project identification and metadata.

```json
{
  "project": {
    "name": "my-project",
    "type": "vscode-extension",
    "description": "VS Code extension for..."
  }
}
```

| Field | Type | Required | Values | Description |
|-------|------|----------|--------|-------------|
| `name` | string | Yes | Any | Project name (from package.json or directory) |
| `type` | string | Yes | `vscode-extension`, `web-app`, `cli-tool`, `library`, `mobile-app`, `desktop-app` | Project type (auto-detected) |
| `description` | string | Yes | Any | Short description |

---

### `structure`

Directory structure for sprints, patterns, source, tests, and docs.

```json
{
  "structure": {
    "sprintDir": "internal/sprints",
    "activeSprint": "ACTIVE_SPRINT.toml",
    "patternsDir": "docs/patterns",
    "testsDir": "test",
    "sourceDir": "src",
    "docsDir": "docs"
  }
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sprintDir` | string | Yes | `sprints` | Sprint TOML files directory |
| `activeSprint` | string | Yes | `ACTIVE_SPRINT.toml` | Active sprint filename |
| `patternsDir` | string | Yes | `docs/patterns` | Pattern library directory |
| `testsDir` | string | Yes | `test` | Test files directory |
| `sourceDir` | string | Yes | `src` | Source code directory |
| `docsDir` | string | No | `docs` | Documentation directory |

**Auto-Detection:**
- Source: Checks for `src/`, `lib/`, `app/`, `source/`
- Tests: Checks for `test/`, `tests/`, `spec/`, `__tests__/`
- Docs: Checks for `docs/`, `documentation/`, `doc/`
- Sprints: Checks for `sprints/`, `internal/sprints/`, `.aetherlight/sprints/`

---

### `testing`

Test framework, runner command, and coverage targets.

```json
{
  "testing": {
    "framework": "mocha",
    "runner": "npm test",
    "coverage": {
      "infrastructure": 90,
      "api": 85,
      "ui": 70
    },
    "manualTestingRequired": true,
    "reason": "VS Code extensions require manual testing after publish"
  }
}
```

| Field | Type | Required | Values | Description |
|-------|------|----------|--------|-------------|
| `framework` | string | Yes | `mocha`, `jest`, `vitest`, `pytest`, `cargo-test`, `unknown` | Testing framework (auto-detected) |
| `runner` | string | Yes | `npm test`, `pytest`, `cargo test` | Command to run tests |
| `coverage` | object | Yes | See below | Coverage targets by code type |
| `manualTestingRequired` | boolean | No | `true`, `false` | Whether manual testing is required |
| `reason` | string | No | Any | Reason for manual testing requirement |

**Coverage Targets:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `infrastructure` | number | Yes | 90 | Infrastructure code coverage (%) |
| `api` | number | Yes | 85 | API code coverage (%) |
| `ui` | number | Yes | 70 | UI code coverage (%) |

**Auto-Detection:**
- Framework: Checks `devDependencies` in package.json
- Manual Testing: Set `true` for `vscode-extension`, `web-app`, `mobile-app`, `desktop-app`

---

### `workflows`

Pattern requirements and pre-flight checklist settings.

```json
{
  "workflows": {
    "preFlightChecklistPath": ".claude/CLAUDE.md",
    "preFlightSections": [
      "Before Modifying ACTIVE_SPRINT.toml",
      "Before Adding Dependencies to package.json",
      "Before Using Edit/Write Tools"
    ],
    "patternsDir": "docs/patterns",
    "requiredPatterns": [
      "Pattern-TASK-ANALYSIS-001",
      "Pattern-CODE-001",
      "Pattern-TDD-001",
      "Pattern-TRACKING-001"
    ]
  }
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `preFlightChecklistPath` | string | Yes | `.claude/CLAUDE.md` | Pre-flight checklist file path |
| `preFlightSections` | string[] | Yes | See above | Checklist sections to enforce |
| `patternsDir` | string | Yes | `docs/patterns` | Pattern library directory |
| `requiredPatterns` | string[] | Yes | See above | Required workflow patterns |

**Required Patterns (TDD Enabled):**
- `Pattern-TASK-ANALYSIS-001` (8-step pre-task analysis)
- `Pattern-CODE-001` (Code development workflow)
- `Pattern-TDD-001` (Test-driven development)
- `Pattern-TRACKING-001` (Task tracking with TodoWrite)

**Required Patterns (TDD Disabled):**
- `Pattern-TASK-ANALYSIS-001`
- `Pattern-CODE-001`
- `Pattern-TRACKING-001`

---

### `git`

Git workflow settings.

```json
{
  "git": {
    "mainBranch": "main",
    "commitMessageFormat": "conventional",
    "preCommitHooks": true
  }
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `mainBranch` | string | Yes | `main` | Main branch name (used for PRs) |
| `commitMessageFormat` | string | Yes | `conventional` | Commit message format (`conventional` or `freeform`) |
| `preCommitHooks` | boolean | Yes | `true` | Enable pre-commit validation hooks |

---

### `dependencies` (Optional, VS Code Extensions Only)

Dependency whitelist and forbidden lists to prevent breaking changes.

```json
{
  "dependencies": {
    "whitelist": [
      "@iarna/toml",
      "form-data",
      "node-fetch",
      "ws",
      "aetherlight-analyzer",
      "aetherlight-sdk",
      "aetherlight-node"
    ],
    "forbidden": {
      "native": ["node-gyp", "napi", "bindings", ".node", "robotjs", "@nut-tree-fork"],
      "runtime": ["glob", "lodash", "moment", "axios", "chalk", "colors"]
    }
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `whitelist` | string[] | No | Allowed runtime dependencies |
| `forbidden.native` | string[] | No | Forbidden native dependencies (cause activation failures) |
| `forbidden.runtime` | string[] | No | Forbidden runtime npm dependencies (use Node.js built-ins) |

**Why?**
- Native dependencies break VS Code extension activation
- Runtime npm dependencies increase bundle size and activation time
- Use VS Code APIs and Node.js built-ins instead

---

### `agents` (Optional)

Agent-specific coverage targets and required patterns.

```json
{
  "agents": {
    "infrastructure-agent": {
      "coverage": 90,
      "patterns": ["Pattern-CODE-001", "Pattern-TDD-001"]
    },
    "api-agent": {
      "coverage": 85,
      "patterns": ["Pattern-API-001", "Pattern-TDD-001"]
    },
    "ui-agent": {
      "coverage": 70,
      "patterns": ["Pattern-UI-001"]
    }
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `<agent-name>.coverage` | number | No | Coverage target for this agent (%) |
| `<agent-name>.patterns` | string[] | No | Required patterns for this agent |

---

### `performance` (Optional)

Performance targets for extension/app.

```json
{
  "performance": {
    "initTime": "5s",
    "activationTime": "200ms",
    "analysisTime": "2s"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `initTime` | string | No | Maximum initialization time |
| `activationTime` | string | No | Maximum activation time (VS Code extensions) |
| `analysisTime` | string | No | Maximum workspace analysis time |

---

## Generation Workflow

### First-Time Setup

1. **User runs:** `ÆtherLight: Analyze Workspace` (Command Palette)
2. **ConfigGenerator checks:** Does `.aetherlight/config.json` exist?
3. **If NO:**
   - Auto-detect project type from `package.json`
   - Auto-detect testing framework from `devDependencies`
   - Auto-detect file structure (source, tests, docs)
   - Prompt user for preferences:
     - Coverage targets (default or custom)
     - TDD requirement (yes/no)
     - Sprint directory location (`sprints/`, `internal/sprints/`, `.aetherlight/sprints/`)
   - Generate config with detected values + user preferences + defaults
   - Save to `.aetherlight/config.json`
4. **If YES:**
   - Skip generation (don't overwrite user customizations)
   - Proceed with analysis

### Manual Regeneration

If you need to regenerate the config:

1. Delete `.aetherlight/config.json`
2. Run `ÆtherLight: Analyze Workspace`
3. Answer prompts again

**Warning:** Manual edits to config.json will be lost if you regenerate.

---

## Example Configs

### VS Code Extension

```json
{
  "$schema": "https://aetherlight.dev/schema/config.json",
  "version": "1.0.0",
  "project": {
    "name": "my-vscode-extension",
    "type": "vscode-extension",
    "description": "VS Code extension project"
  },
  "structure": {
    "sprintDir": "internal/sprints",
    "activeSprint": "ACTIVE_SPRINT.toml",
    "patternsDir": "docs/patterns",
    "testsDir": "test",
    "sourceDir": "src"
  },
  "testing": {
    "framework": "mocha",
    "runner": "npm test",
    "coverage": {
      "infrastructure": 90,
      "api": 85,
      "ui": 70
    },
    "manualTestingRequired": true,
    "reason": "VS Code extensions require manual testing after publish"
  },
  "workflows": {
    "preFlightChecklistPath": ".claude/CLAUDE.md",
    "preFlightSections": [
      "Before Modifying ACTIVE_SPRINT.toml",
      "Before Adding Dependencies to package.json",
      "Before Using Edit/Write Tools"
    ],
    "patternsDir": "docs/patterns",
    "requiredPatterns": [
      "Pattern-TASK-ANALYSIS-001",
      "Pattern-CODE-001",
      "Pattern-TDD-001",
      "Pattern-TRACKING-001"
    ]
  },
  "git": {
    "mainBranch": "main",
    "commitMessageFormat": "conventional",
    "preCommitHooks": true
  }
}
```

### Web App (React)

```json
{
  "$schema": "https://aetherlight.dev/schema/config.json",
  "version": "1.0.0",
  "project": {
    "name": "my-react-app",
    "type": "web-app",
    "description": "React web application"
  },
  "structure": {
    "sprintDir": "sprints",
    "activeSprint": "ACTIVE_SPRINT.toml",
    "patternsDir": "docs/patterns",
    "testsDir": "src/__tests__",
    "sourceDir": "src"
  },
  "testing": {
    "framework": "jest",
    "runner": "npm test",
    "coverage": {
      "infrastructure": 90,
      "api": 85,
      "ui": 70
    },
    "manualTestingRequired": true,
    "reason": "UI/UX requires visual testing across browsers"
  },
  "workflows": {
    "preFlightChecklistPath": ".claude/CLAUDE.md",
    "preFlightSections": [],
    "patternsDir": "docs/patterns",
    "requiredPatterns": [
      "Pattern-TASK-ANALYSIS-001",
      "Pattern-CODE-001",
      "Pattern-TRACKING-001"
    ]
  },
  "git": {
    "mainBranch": "main",
    "commitMessageFormat": "conventional",
    "preCommitHooks": true
  }
}
```

### CLI Tool (Node.js)

```json
{
  "$schema": "https://aetherlight.dev/schema/config.json",
  "version": "1.0.0",
  "project": {
    "name": "my-cli-tool",
    "type": "cli-tool",
    "description": "Command-line tool"
  },
  "structure": {
    "sprintDir": "sprints",
    "activeSprint": "ACTIVE_SPRINT.toml",
    "patternsDir": "docs/patterns",
    "testsDir": "test",
    "sourceDir": "src"
  },
  "testing": {
    "framework": "mocha",
    "runner": "npm test",
    "coverage": {
      "infrastructure": 90,
      "api": 85,
      "ui": 70
    },
    "manualTestingRequired": false
  },
  "workflows": {
    "preFlightChecklistPath": ".claude/CLAUDE.md",
    "preFlightSections": [],
    "patternsDir": "docs/patterns",
    "requiredPatterns": [
      "Pattern-TASK-ANALYSIS-001",
      "Pattern-CODE-001",
      "Pattern-TDD-001",
      "Pattern-TRACKING-001"
    ]
  },
  "git": {
    "mainBranch": "main",
    "commitMessageFormat": "conventional",
    "preCommitHooks": true
  }
}
```

---

## Validation

ConfigGenerator validates the schema before saving:

1. **Required fields:** `project`, `structure`, `testing`, `workflows`, `git`
2. **Coverage targets:** Must be 0-100 (%)
3. **Directory paths:** Must be valid relative paths
4. **Framework:** Must be supported (`mocha`, `jest`, `vitest`, `pytest`, `cargo-test`, or `unknown`)
5. **Patterns:** Pattern files must exist in `patternsDir`

---

## FAQ

### Q: Can I manually edit config.json?

**A:** Yes! Manual edits are preserved unless you delete and regenerate the file. ConfigGenerator only runs if config doesn't exist.

### Q: What if auto-detection fails?

**A:** ConfigGenerator uses sensible defaults:
- Project type: `library`
- Framework: `unknown` (runner: `npm test`)
- Source dir: `src`
- Tests dir: `test`
- Coverage: Infrastructure 90%, API 85%, UI 70%

You can manually edit the config after generation.

### Q: Do I need to commit .aetherlight/ to Git?

**A:** **Yes**, commit `.aetherlight/config.json` so your team shares the same configuration. Add `.aetherlight/analysis.json` to `.gitignore` (it's workspace-specific).

### Q: Can I disable TDD requirement?

**A:** Yes, select "No" when prompted during config generation. This removes `Pattern-TDD-001` from `requiredPatterns`.

---

## Related

- **PROTECT-000E:** Config Generator implementation
- **PROTECT-000A:** TaskAnalyzer (uses config for variable resolution)
- **ConfigGenerator.ts:** Service that generates this file
- **analyzeWorkspace.ts:** Command that triggers generation

---

**Version:** 1.0.0
**Last Updated:** 2025-11-07
**Status:** ✅ Active
