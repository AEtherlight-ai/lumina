# ÆtherLight Configuration System

**VERSION:** 1.0
**CREATED:** 2025-10-17
**STATUS:** Active
**PATTERN:** Pattern-CONFIG-001 (Feature Toggle Configuration)

---

## Overview

The ÆtherLight configuration system provides developers with granular control over all system features through a `.aetherlight.toml` file. This enables developers to:

- Disable features they don't need (e.g., autonomous workflow agents)
- Customize behavior for their specific use case
- Control resource usage and performance
- Maintain security and privacy preferences

**DESIGN DECISION:** TOML-based configuration with feature toggles
**WHY:** Developers should have full control over which features to enable/disable

**REASONING CHAIN:**
1. User requested ability to disable autonomous workflow agents
2. Different developers have different needs (some want full automation, others want manual control)
3. TOML format is human-readable and easy to edit
4. Feature flags enable/disable components without code changes
5. Result: Developer-friendly configuration with sensible defaults

---

## Configuration File Location

**.aetherlight.toml**
- Location: Project root directory
- Format: TOML (Tom's Obvious, Minimal Language)
- Precedence: Project config > User config > System defaults

**Hierarchy (planned for Phase 3.9):**
1. **System:** `/etc/aetherlight/config.toml` (global defaults)
2. **User:** `~/.aetherlight/config.toml` (user preferences)
3. **Project:** `./.aetherlight.toml` (project-specific, highest priority)

---

## Configuration Sections

### **[features]** - Core Feature Toggles

Controls high-level system features:

```toml
[features]
autonomous_agents = true          # Phase 4 autonomous workflow agents
pattern_search = true             # Pattern library search
voice_input = true                # Voice transcription
realtime_sync = true              # Phase 3.9 real-time context sync
terminal_middleware = true        # Phase 3.10 terminal middleware
```

**Impact:**
- `autonomous_agents = false` → Disables all Phase 4 agents (manual workflow only)
- `pattern_search = false` → Disables pattern matching (code-only mode)
- `voice_input = false` → Disables voice features (keyboard-only)
- `realtime_sync = false` → Disables team collaboration features
- `terminal_middleware = false` → No input enhancement (raw commands)

---

### **[autonomous_agents]** - Agent Control

Controls Phase 4 autonomous sprint execution:

```toml
[autonomous_agents]
enabled = true

[autonomous_agents.agents]
project_manager = true            # Sprint orchestration
database_agent = true             # Database tasks
ui_agent = true                   # UI components
api_agent = true                  # API endpoints
infrastructure_agent = true       # DevOps tasks
test_agent = true                 # Testing
docs_agent = true                 # Documentation
review_agent = true               # Code review
commit_agent = true               # Git commits
planning_agent = true             # Sprint planning
```

**Use Cases:**
- **Full Automation:** All agents enabled (default)
- **Selective Automation:** Enable only DB + API agents, disable UI (external UI team)
- **Manual Mode:** Disable all agents (`enabled = false`)
- **Testing Only:** Enable only test_agent (CI/CD integration)

**Example - Disable UI Agent:**
```toml
[autonomous_agents.agents]
ui_agent = false                  # External UI team handles frontend
```

---

### **[approval_gates]** - Human Oversight

Controls when humans are prompted during autonomous sprints:

```toml
[approval_gates]
pre_sprint = true                 # Review sprint plan before execution
mid_sprint = true                 # Check progress at critical milestones
error_recovery = true             # Prompt for retry/skip/manual/abort
post_sprint = true                # Final review before merge
```

**Impact:**
- `pre_sprint = false` → Sprint starts immediately (trust the plan)
- `mid_sprint = false` → No interruptions during execution
- `error_recovery = false` → Auto-retry on errors (no prompts)
- `post_sprint = false` → Auto-merge after completion (trust the agents)

**Safety Note:** Setting all to `false` enables fully autonomous execution (use with caution)

---

### **[realtime_sync]** - Phase 3.9 Team Collaboration

Controls WebSocket-based team context sharing:

```toml
[realtime_sync]
enabled = true
websocket_port = 43216
broadcast_design_decisions = true # Share design decisions with team
broadcast_blockers = true         # Alert team to blockers
broadcast_discoveries = true      # Share pattern discoveries
privacy_mode = "team"             # "private", "team", or "network"
```

**Privacy Modes:**
- `private`: No broadcasting (local only)
- `team`: Broadcast to project team (default)
- `network`: Broadcast to entire ÆtherLight network (public patterns)

---

### **[terminal]** - Phase 3.10 Input Enhancement

Controls terminal input interception and enhancement:

```toml
[terminal]
enabled = true

[terminal.voice]
enabled = true
hotkey = "F13"
auto_transcribe = true
show_transcription = true

[terminal.typing]
multiline_shortcut = "Ctrl+Enter"
auto_enhance = true
show_preview = true

[terminal.enhancement]
enabled = true
include_patterns = true
include_file_context = true
include_project_state = true
include_error_context = true
include_history = false            # Command history (may expose sensitive data)
max_history_messages = 5

[terminal.patterns]
confidence_threshold = 0.75
max_patterns_shown = 3
auto_apply_top_pattern = false

[terminal.performance]
max_enhancement_time_ms = 500
cache_file_context = true
cache_project_state = true
```

**Use Cases:**
- **Full Enhancement:** All sources enabled (default)
- **Pattern-Only:** Disable file/project/error context (faster)
- **Privacy Mode:** `include_history = false` (no command history tracking)
- **Low Confidence:** `confidence_threshold = 0.5` (more suggestions, lower quality)
- **Voice-Only:** `terminal.typing.auto_enhance = false` (manual trigger for typing)

---

### **[pattern_library]** - Pattern Search Configuration

Controls pattern library search and Supabase Node 1 connection:

```toml
[pattern_library]
enabled = true
supabase_node1_url = "https://your-node1-project.supabase.co"
embedding_model = "voyage-3-code"
embedding_dimensions = 1024
hybrid_search_weight = 0.6        # 60% semantic, 40% keyword
min_confidence = 0.70             # Min pattern confidence threshold

[pattern_library.cache]
enabled = true
ttl_seconds = 3600                # Cache for 1 hour
max_entries = 1000                # Max cached patterns
```

**Performance Tuning:**
- `hybrid_search_weight = 0.8` → More semantic, less keyword (slower, higher quality)
- `hybrid_search_weight = 0.4` → More keyword, less semantic (faster, lower quality)
- `min_confidence = 0.9` → Only high-confidence patterns (fewer results)
- `cache.ttl_seconds = 7200` → Cache for 2 hours (less API calls)

---

### **[voice_input]** - Voice Capture Settings

Controls voice transcription (Whisper.cpp):

```toml
[voice_input]
enabled = true
hotkey = "F13"                    # Voice activation hotkey
auto_transcribe = true            # Auto-transcribe when stopped
whisper_model = "base.en"         # Model: tiny, base, small, medium, large
```

**Model Trade-offs:**
- `tiny.en`: Fastest (32x realtime), 39M params, 74MB, lower accuracy
- `base.en`: Fast (16x realtime), 74M params, 142MB, good accuracy (default)
- `small.en`: Balanced (6x realtime), 244M params, 466MB, better accuracy
- `medium.en`: Slow (2x realtime), 769M params, 1.5GB, high accuracy
- `large-v3`: Slowest (1x realtime), 1550M params, 2.9GB, highest accuracy

---

### **[performance]** - Performance Optimization

Controls resource usage during autonomous sprints:

```toml
[performance]
parallel_execution = true         # Run independent agents in parallel
max_concurrent_agents = 4         # Max agents at once
task_timeout_minutes = 60         # Task timeout
agent_spawn_delay_ms = 500        # Delay between spawning agents
```

**Tuning for Different Environments:**
- **High-End Workstation:** `max_concurrent_agents = 8` (more parallelism)
- **Laptop:** `max_concurrent_agents = 2` (conserve resources)
- **CI/CD:** `task_timeout_minutes = 30` (fail fast)
- **Complex Tasks:** `task_timeout_minutes = 120` (allow more time)

---

### **[logging]** - Logging and Observability

Controls logging verbosity and OpenTelemetry tracing:

```toml
[logging]
level = "info"                    # trace, debug, info, warn, error
otel_enabled = true               # OpenTelemetry tracing
otel_export_path = "./logs/otel/traces.json"
session_logs = true               # Log session handoffs
pattern_queries = true            # Log pattern searches
```

**Log Levels:**
- `trace`: Everything (very verbose, for debugging)
- `debug`: Detailed execution info
- `info`: Normal operation (default)
- `warn`: Warnings only
- `error`: Errors only (minimal logging)

---

### **[developer]** - Developer Experience

Developer-specific settings:

```toml
[developer]
show_reasoning = true             # Show agent Chain of Thought
debug_mode = false                # Verbose debugging output
dry_run = false                   # Simulate without executing
```

**Use Cases:**
- **Understanding Agents:** `show_reasoning = true` (see why agents make decisions)
- **Debugging Issues:** `debug_mode = true` (verbose output)
- **Testing Configuration:** `dry_run = true` (simulate without changing files)

---

## Loading Configuration

### **TypeScript (VS Code Extension):**

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as toml from 'toml';

interface AetherlightConfig {
  features: {
    autonomous_agents: boolean;
    pattern_search: boolean;
    voice_input: boolean;
    realtime_sync: boolean;
    terminal_middleware: boolean;
  };
  autonomous_agents: {
    enabled: boolean;
    agents: {
      project_manager: boolean;
      database_agent: boolean;
      ui_agent: boolean;
      // ... etc
    };
  };
  // ... other sections
}

export function loadConfig(workspaceRoot: string): AetherlightConfig {
  const configPath = path.join(workspaceRoot, '.aetherlight.toml');

  if (!fs.existsSync(configPath)) {
    return getDefaultConfig();
  }

  const configContent = fs.readFileSync(configPath, 'utf-8');
  const config = toml.parse(configContent) as AetherlightConfig;

  return config;
}

export function getDefaultConfig(): AetherlightConfig {
  return {
    features: {
      autonomous_agents: true,
      pattern_search: true,
      voice_input: true,
      realtime_sync: true,
      terminal_middleware: true,
    },
    autonomous_agents: {
      enabled: true,
      agents: {
        project_manager: true,
        database_agent: true,
        ui_agent: true,
        api_agent: true,
        infrastructure_agent: true,
        test_agent: true,
        docs_agent: true,
        review_agent: true,
        commit_agent: true,
        planning_agent: true,
      },
    },
    // ... other defaults
  };
}
```

### **Rust (Tauri Desktop App):**

```rust
use serde::Deserialize;
use std::fs;
use std::path::Path;

#[derive(Deserialize, Debug)]
pub struct AetherlightConfig {
    pub features: Features,
    pub autonomous_agents: AutonomousAgents,
    // ... other sections
}

#[derive(Deserialize, Debug)]
pub struct Features {
    pub autonomous_agents: bool,
    pub pattern_search: bool,
    pub voice_input: bool,
    pub realtime_sync: bool,
    pub terminal_middleware: bool,
}

#[derive(Deserialize, Debug)]
pub struct AutonomousAgents {
    pub enabled: bool,
    pub agents: Agents,
}

#[derive(Deserialize, Debug)]
pub struct Agents {
    pub project_manager: bool,
    pub database_agent: bool,
    pub ui_agent: bool,
    // ... etc
}

pub fn load_config(workspace_root: &Path) -> AetherlightConfig {
    let config_path = workspace_root.join(".aetherlight.toml");

    if !config_path.exists() {
        return get_default_config();
    }

    let config_content = fs::read_to_string(config_path)
        .expect("Failed to read .aetherlight.toml");

    toml::from_str(&config_content)
        .expect("Failed to parse .aetherlight.toml")
}

pub fn get_default_config() -> AetherlightConfig {
    AetherlightConfig {
        features: Features {
            autonomous_agents: true,
            pattern_search: true,
            voice_input: true,
            realtime_sync: true,
            terminal_middleware: true,
        },
        autonomous_agents: AutonomousAgents {
            enabled: true,
            agents: Agents {
                project_manager: true,
                database_agent: true,
                ui_agent: true,
                api_agent: true,
                infrastructure_agent: true,
                test_agent: true,
                docs_agent: true,
                review_agent: true,
                commit_agent: true,
                planning_agent: true,
            },
        },
        // ... other defaults
    }
}
```

---

## Integration Points

### **Phase 4 Autonomous Sprints:**

```typescript
// Check if autonomous agents are enabled before spawning
const config = loadConfig(workspaceRoot);

if (!config.features.autonomous_agents || !config.autonomous_agents.enabled) {
  vscode.window.showInformationMessage(
    'Autonomous agents are disabled in .aetherlight.toml. ' +
    'Enable them to use autonomous sprint execution.'
  );
  return;
}

// Spawn only enabled agents
const agentsToSpawn = [];
if (config.autonomous_agents.agents.database_agent) {
  agentsToSpawn.push(new DatabaseAgent());
}
if (config.autonomous_agents.agents.ui_agent) {
  agentsToSpawn.push(new UIAgent());
}
// ... etc
```

### **Phase 3.9 Real-Time Sync:**

```typescript
const config = loadConfig(workspaceRoot);

if (!config.features.realtime_sync || !config.realtime_sync.enabled) {
  return; // Real-time sync disabled, skip WebSocket connection
}

const wsClient = new WebSocketClient({
  port: config.realtime_sync.websocket_port,
  broadcastDesignDecisions: config.realtime_sync.broadcast_design_decisions,
  broadcastBlockers: config.realtime_sync.broadcast_blockers,
  broadcastDiscoveries: config.realtime_sync.broadcast_discoveries,
  privacyMode: config.realtime_sync.privacy_mode,
});

wsClient.connect();
```

### **Phase 3.10 Terminal Middleware:**

```typescript
const config = loadConfig(workspaceRoot);

if (!config.features.terminal_middleware || !config.terminal.enabled) {
  return rawInput; // No enhancement, pass through
}

const enhancer = new ContextEnhancer({
  patternMatching: config.terminal.enhancement.include_patterns,
  fileContext: config.terminal.enhancement.include_file_context,
  projectState: config.terminal.enhancement.include_project_state,
  errorContext: config.terminal.enhancement.include_error_context,
  historyContext: config.terminal.enhancement.include_history,
  maxHistoryMessages: config.terminal.enhancement.max_history_messages,
  confidenceThreshold: config.terminal.patterns.confidence_threshold,
  maxPatternsShown: config.terminal.patterns.max_patterns_shown,
  maxEnhancementTimeMs: config.terminal.performance.max_enhancement_time_ms,
});

const enhancedPrompt = await enhancer.enhance(rawInput);

if (config.terminal.typing.show_preview) {
  await showPreview(enhancedPrompt);
}

return enhancedPrompt;
```

---

## Configuration Validation

### **Schema Validation (TypeScript):**

```typescript
import Ajv from 'ajv';

const configSchema = {
  type: 'object',
  properties: {
    features: {
      type: 'object',
      properties: {
        autonomous_agents: { type: 'boolean' },
        pattern_search: { type: 'boolean' },
        voice_input: { type: 'boolean' },
        realtime_sync: { type: 'boolean' },
        terminal_middleware: { type: 'boolean' },
      },
      required: ['autonomous_agents', 'pattern_search'],
    },
    // ... other sections
  },
  required: ['features'],
};

export function validateConfig(config: unknown): boolean {
  const ajv = new Ajv();
  const validate = ajv.compile(configSchema);
  const valid = validate(config);

  if (!valid) {
    console.error('Configuration validation errors:', validate.errors);
    return false;
  }

  return true;
}
```

---

## Example Configurations

### **Example 1: Full Automation (Default)**

```toml
[features]
autonomous_agents = true
pattern_search = true
voice_input = true
realtime_sync = true
terminal_middleware = true

[autonomous_agents]
enabled = true
# All agents enabled (default)

[approval_gates]
pre_sprint = true
mid_sprint = true
error_recovery = true
post_sprint = true
```

**Use Case:** Trust the system, want maximum automation with human checkpoints

---

### **Example 2: Manual Workflow (No Agents)**

```toml
[features]
autonomous_agents = false         # Disable all agents
pattern_search = true             # Still use pattern library
voice_input = true                # Voice capture enabled
realtime_sync = false             # No team sync
terminal_middleware = true        # Terminal enhancement enabled
```

**Use Case:** Want pattern matching and voice input, but manual coding workflow

---

### **Example 3: Backend-Only Automation**

```toml
[autonomous_agents]
enabled = true

[autonomous_agents.agents]
database_agent = true             # Enable DB agent
api_agent = true                  # Enable API agent
infrastructure_agent = true       # Enable infra agent
test_agent = true                 # Enable test agent
docs_agent = true                 # Enable docs agent
review_agent = true               # Enable review agent
commit_agent = true               # Enable commit agent

# Disable frontend agents (external team)
ui_agent = false
project_manager = false           # Manual sprint management
planning_agent = false            # Manual planning
```

**Use Case:** Backend team with external frontend developers

---

### **Example 4: Privacy-First (Minimal Data)**

```toml
[realtime_sync]
privacy_mode = "private"          # No broadcasting

[terminal.enhancement]
include_history = false           # No command history
include_patterns = true
include_file_context = true
include_project_state = true
include_error_context = true

[pattern_library]
supabase_node1_url = ""           # Use local patterns only
```

**Use Case:** Sensitive project, no network communication, local-only

---

### **Example 5: CI/CD Integration (Tests Only)**

```toml
[features]
autonomous_agents = true

[autonomous_agents.agents]
test_agent = true                 # Only run tests
# All other agents disabled
project_manager = false
database_agent = false
ui_agent = false
api_agent = false
infrastructure_agent = false
docs_agent = false
review_agent = false
commit_agent = false
planning_agent = false

[performance]
task_timeout_minutes = 30         # Fail fast in CI/CD
max_concurrent_agents = 1         # Sequential execution

[logging]
level = "error"                   # Minimal logging
```

**Use Case:** CI/CD pipeline, only run automated tests

---

## Migration Guide

### **From No Config to .aetherlight.toml:**

1. Copy default config to project root:
   ```bash
   cp .aetherlight.toml.example .aetherlight.toml
   ```

2. Edit `.aetherlight.toml` to customize for your needs

3. Restart VS Code / Tauri desktop app to load config

4. Verify config loaded:
   ```bash
   # Check logs for "Configuration loaded from .aetherlight.toml"
   ```

---

## Troubleshooting

### **Issue: Config not loading**

**Symptoms:** Features still enabled despite `enabled = false`

**Solution:**
1. Check file location: `.aetherlight.toml` must be in project root
2. Check file syntax: Use TOML validator (https://www.toml-lint.com/)
3. Check logs: Search for "Configuration" in logs
4. Restart VS Code / desktop app

### **Issue: Invalid TOML syntax**

**Symptoms:** Error parsing config file

**Solution:**
- Validate TOML syntax online: https://www.toml-lint.com/
- Common errors:
  - Missing quotes around strings
  - Incorrect boolean (use `true`/`false`, not `True`/`False`)
  - Missing `=` between key and value

### **Issue: Config changes not applying**

**Symptoms:** Changed config but behavior unchanged

**Solution:**
- Restart VS Code window (Ctrl+Shift+P → "Reload Window")
- Restart Tauri desktop app
- Check if config file was saved

---

## Future Enhancements

**Planned for Phase 3.9:**
- Config hierarchy (System → User → Project)
- Config UI in VS Code settings panel
- Live config reload (no restart required)
- Config import/export

**Planned for Phase 4:**
- Per-agent configuration (custom timeouts, context limits)
- Sprint templates with embedded config
- Config profiles (dev, staging, production)

---

## Patterns

**Pattern-CONFIG-001:** Feature Toggle Configuration System
- Granular control over all system features
- TOML format for human readability
- Sensible defaults with full customization
- Integration with all phases (3.9, 3.10, 4)

---

**STATUS:** Active configuration system
**NEXT:** Integrate with Phase 3.9 and 3.10 agents
**OWNER:** Core team
