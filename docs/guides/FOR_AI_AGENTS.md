# Instructions for AI Agents

**VERSION:** 1.0
**DATE:** 2025-10-10
**PURPOSE:** Enable ALL AI coding assistants to understand ÆtherLight structure
**CLASSIFICATION:** 🌐 PUBLIC

---

## 🚨 IMPORTANT: Read Conceptual Guide FIRST

**If you're an AI assistant helping a user implement ÆtherLight:**

👉 **Read [docs/build/AI_ASSISTANT_GUIDE.md](docs/build/AI_ASSISTANT_GUIDE.md) FIRST**

This guide explains:
- **What ÆtherLight IS** (conceptually) - Not just config files
- **Why your user needs it** - Persistent memory + confidence validation
- **How to help them implement it** - Step-by-step guidance
- **How to avoid hallucinations** - Verify features, check confidence scores
- **Implementation patterns** - Specific guidance for common scenarios

**THIS DOCUMENT (FOR_AI_AGENTS.md)** explains *how* to configure ÆtherLight for 21+ AI tools.
**AI_ASSISTANT_GUIDE.md** explains *what* ÆtherLight is and *how* to use it properly.

**Read both:** Concepts first, configuration second.

---

## 🎯 Quick Context Check

**After reading AI_ASSISTANT_GUIDE.md, verify your context:**

### **Am I in the ÆtherLight repo or a user's project?**

```bash
# Step 1: Check current directory
pwd
# Example: /path/to/ÆtherLight_Lumina → ÆtherLight repo
# Example: /path/to/user-project → User's project (ÆtherLight may be sub-directory)

# Step 2: Check CLAUDE.md content (if exists)
head -10 CLAUDE.md | grep "ÆtherLight"
# If found → ÆtherLight repo
# If not found → User's project

# Step 3: Check package.json (if Node.js project)
cat package.json | grep "name"
# "name": "@aetherlight/sdk" → ÆtherLight repo
# "name": "something-else" → User's project
```

---

## 📋 Primary Project Memory (Read These FIRST)

**CRITICAL:** ÆtherLight uses a hierarchical memory system. Always read in this order:

### **1. CLAUDE.md (Primary Project Memory)**
**Location:** Root directory
**Purpose:** Project identity, agents, SOPs, patterns, principles
**Read first:** This is the "brain" of the project

**Key sections:**
- Project Identity (What is ÆtherLight?)
- Claude Agents (4 agents: rust-core-dev, tauri-desktop-dev, documentation-enforcer, commit-enforcer)
- Standard Operating Procedures (SOPs)
- Task Execution Gates (mandatory checklists)
- Key Patterns (22+ patterns extracted)

### **2. LIVING_PROGRESS_LOG.md (Execution History)**
**Location:** `docs/execution/LIVING_PROGRESS_LOG.md`
**Purpose:** Milestones, metrics, learnings, meta-realizations
**Read second:** This is the "memory" of what happened

**Key sections:**
- Sprint System Installation (2025-10-07)
- Phase 3.5 Intelligence Layer Sprint Start
- P3.5-001 Complete (Domain Agent Trait)
- P3.5-002 Complete (Domain Pattern Library)

### **3. PHASE_X_IMPLEMENTATION.md (Current Tasks)**
**Location:** Root directory (PHASE_1_IMPLEMENTATION.md, PHASE_2_IMPLEMENTATION.md, etc.)
**Purpose:** Detailed task breakdown, validation criteria, execution logs
**Read third:** This is the "roadmap" for current work

---

## 🤖 Agent-Specific Instructions

ÆtherLight supports multiple AI coding assistants. Find your agent below:

---

### **Claude Code (Anthropic)**

**Config files:**
- `CLAUDE.md` (primary project memory)
- `.claude/agents/` (specialized agents)
- `.claude/settings.local.json` (user preferences)

**How to use ÆtherLight with Claude Code:**

1. **Read CLAUDE.md FIRST:**
   ```
   This file contains:
   - Project identity
   - 4 specialized agents
   - SOPs (Chain of Thought, Git workflow, etc.)
   - Task execution gates (MANDATORY checklists)
   ```

2. **Check current phase:**
   ```bash
   # Look for PHASE_X_IMPLEMENTATION.md in root
   ls PHASE_*.md
   # Read the highest phase number (current work)
   ```

3. **Before ANY task:**
   - Enable OTEL tracking: `export OTEL_SDK_ENABLED=true`
   - Run `./scripts/start-task.sh P3-XXX "Task Name"`
   - Verify execution log created

4. **Use specialized agents:**
   - Rust code: Invoke `rust-core-dev` agent
   - Tauri desktop: Invoke `tauri-desktop-dev` agent
   - Documentation: Invoke `documentation-enforcer` agent
   - Git commits: Invoke `commit-enforcer` agent

**Context boundaries:**
- ÆtherLight repo: Work on ÆtherLight features
- User's project: NEVER modify ÆtherLight's CLAUDE.md, use user's CLAUDE.md

---

### **Cursor (Anysphere)**

**Config files:**
- `.cursorrules` (rules-based prompting)
- `.cursor/` (workspace settings)

**How to use ÆtherLight with Cursor:**

1. **Create `.cursorrules` in project root:**
   ```
   # ÆtherLight Project Rules

   ## Primary Memory
   - Read CLAUDE.md before ANY task
   - Read docs/execution/LIVING_PROGRESS_LOG.md for context
   - Follow Chain of Thought documentation standard

   ## Task Execution
   - Enable OTEL: export OTEL_SDK_ENABLED=true
   - Use ./scripts/start-task.sh before coding
   - Use ./scripts/complete-task.sh after coding

   ## Documentation
   - ALL functions need Chain of Thought docstrings
   - Format: DESIGN DECISION, WHY, REASONING CHAIN, PATTERN
   - See docs/vision/CHAIN_OF_THOUGHT_STANDARD.md

   ## Git Commits
   - Conventional commits format (feat, fix, docs, etc.)
   - Include Chain of Thought in commit body
   - Reference task ID: Closes #P3-XXX
   ```

2. **Quick start:**
   - Cursor will read `.cursorrules` automatically
   - No additional setup needed

**Context boundaries:**
- If `.cursorrules` mentions ÆtherLight → ÆtherLight repo
- If `.cursorrules` mentions user project → User's project

---

### **Warp (Terminal AI)**

**Config files:**
- `.warp/` (AI terminal settings)

**How to use ÆtherLight with Warp:**

1. **Warp doesn't have standardized project memory, so:**
   - Create alias in `~/.zshrc` or `~/.bashrc`:
     ```bash
     alias aetherlight-context='cat CLAUDE.md | head -100'
     ```
   - Run `aetherlight-context` before asking Warp AI questions

2. **Quick commands for Warp:**
   ```bash
   # Check if in ÆtherLight repo
   aetherlight-context

   # Start task
   ./scripts/start-task.sh P3-XXX "Task Name"

   # Complete task
   ./scripts/complete-task.sh P3-XXX
   ```

**Context boundaries:**
- Warp operates at terminal level (no file-level context)
- Manually specify: "I'm working on ÆtherLight" or "I'm working on my project"

---

### **Aider (command-line AI pair programmer)**

**Config files:**
- `.aider.conf.yml` (project-specific config)

**How to use ÆtherLight with Aider:**

1. **Create `.aider.conf.yml` in project root:**
   ```yaml
   # ÆtherLight project configuration

   # Auto-add project memory files to context
   auto-commits: true
   dirty-commits: false

   # Always include these files in context
   read:
     - CLAUDE.md
     - docs/execution/LIVING_PROGRESS_LOG.md
     - PHASE_3.5_IMPLEMENTATION.md

   # Git commit message format
   commit-prompt: |
     Follow conventional commits format.
     Include Chain of Thought reasoning.
     Reference task ID: Closes #P3-XXX

   # Model selection
   model: claude-3-5-sonnet-20241022
   ```

2. **Usage:**
   ```bash
   # Start Aider (will auto-load CLAUDE.md)
   aider

   # Ask about project
   > What is ÆtherLight?
   # (Aider reads CLAUDE.md, gives accurate answer)

   # Implement feature
   > Implement P3.5-003 Breadcrumb Escalation Engine
   # (Aider reads PHASE_3.5_IMPLEMENTATION.md, follows task spec)
   ```

**Context boundaries:**
- Aider is Git-centric (works in single repo)
- If in ÆtherLight repo: Commits to ÆtherLight
- If in user repo: Commits to user's project

---

### **Continue (VS Code Extension)**

**Config files:**
- `.continuerc.json` (workspace settings)

**How to use ÆtherLight with Continue:**

1. **Create `.continuerc.json` in project root:**
   ```json
   {
     "contextProviders": [
       {
         "name": "file",
         "params": {
           "files": [
             "CLAUDE.md",
             "docs/execution/LIVING_PROGRESS_LOG.md",
             "PHASE_3.5_IMPLEMENTATION.md"
           ]
         }
       }
     ],
     "slashCommands": [
       {
         "name": "context",
         "description": "Show ÆtherLight context",
         "prompt": "Read CLAUDE.md and summarize project identity"
       },
       {
         "name": "task",
         "description": "Start new task",
         "prompt": "Run ./scripts/start-task.sh with task ID from user"
       }
     ],
     "models": {
       "default": "claude-3-5-sonnet-20241022"
     }
   }
   ```

2. **Usage in VS Code:**
   - Cmd/Ctrl+L to open Continue
   - Type `/context` → See ÆtherLight project summary
   - Type `/task P3.5-003` → Start task with tracking

**Context boundaries:**
- Continue uses VS Code workspace (single project)
- Check workspace root to determine ÆtherLight vs user project

---

### **Cody (Sourcegraph)**

**Config files:**
- `.cody/` (enterprise code search config)

**How to use ÆtherLight with Cody:**

1. **Cody is enterprise-focused, typically used in monorepos:**
   ```bash
   # If ÆtherLight is sub-repo in monorepo:
   monorepo/
   ├── apps/
   │   └── your-app/
   ├── libs/
   │   └── aetherlight/  ← ÆtherLight here
   └── .cody/
   ```

2. **Cody will index entire monorepo:**
   - ÆtherLight's CLAUDE.md will be indexed
   - Ask Cody: "What is ÆtherLight?" → Searches all indexed code

**Context boundaries:**
- Cody operates at monorepo level (multi-project)
- Always specify: "In the aetherlight library..." or "In the your-app application..."

---

### **Replit AI (Ghostwriter)**

**Config files:**
- `.replit` (Replit environment config)

**How to use ÆtherLight with Replit:**

1. **Create `.replit` file:**
   ```toml
   [env]
   OTEL_SDK_ENABLED = "true"
   OTEL_EXPORTER_FILE_PATH = "./logs/otel/traces.json"

   [nix]
   channel = "stable-24_05"

   [[hints]]
   regex = "P3\\.5-\\d+"
   message = "ÆtherLight task ID detected. Run ./scripts/start-task.sh first."
   ```

2. **Using Ghostwriter (Replit AI):**
   - Ghostwriter has access to all files in Repl
   - Ask: "Read CLAUDE.md and explain ÆtherLight"
   - Ghostwriter will read and summarize

**Context boundaries:**
- Replit is single-project (one Repl = one project)
- If Repl is ÆtherLight: Work on ÆtherLight
- If Repl is user's project: Don't modify ÆtherLight's internals

---

### **Bolt (StackBlitz AI)**

**Config files:**
- No config file (browser-based IDE)

**How to use ÆtherLight with Bolt:**

1. **Bolt is instant, browser-based:**
   - Fork ÆtherLight repo on StackBlitz
   - Bolt AI will auto-detect project structure

2. **Ask Bolt to read context:**
   ```
   "Read CLAUDE.md and summarize the ÆtherLight project"
   "Read PHASE_3.5_IMPLEMENTATION.md and show me current tasks"
   ```

**Context boundaries:**
- Bolt operates on single StackBlitz project
- If project is ÆtherLight: Work on ÆtherLight
- If project is user's: Don't modify ÆtherLight

---

### **GitHub Copilot (Microsoft)**

**Config files:**
- No project-specific config (uses open files + GitHub context)

**How to use ÆtherLight with Copilot:**

1. **Copilot doesn't read project memory by default:**
   - Open `CLAUDE.md` in editor → Copilot includes in context
   - Open `PHASE_3.5_IMPLEMENTATION.md` → Copilot includes in context

2. **Best practice:**
   - Keep CLAUDE.md open in a split pane
   - Copilot will reference it when suggesting code

**Context boundaries:**
- Copilot uses currently open files (no persistent memory)
- Explicitly open ÆtherLight's CLAUDE.md when working on ÆtherLight

---

### **Tabnine (AI code completion)**

**Config files:**
- `.tabnine/` (local model training)

**How to use ÆtherLight with Tabnine:**

1. **Tabnine is code completion focused (not full assistant):**
   - Will learn from ÆtherLight's code patterns
   - Suggest completions based on Chain of Thought comments

2. **No special setup needed:**
   - Tabnine auto-trains on local code
   - Respects Chain of Thought docstrings

**Context boundaries:**
- Tabnine operates per-project (learns from current project only)

---

### **Amazon CodeWhisperer**

**Config files:**
- No project-specific config (uses AWS credentials)

**How to use ÆtherLight with CodeWhisperer:**

1. **Similar to Copilot:**
   - Open CLAUDE.md to give context
   - CodeWhisperer will reference open files

**Context boundaries:**
- Uses open files (no persistent memory)

---

### **Gemini Code Assist (Google)**

**Config files:**
- `.google/` or `.gemini/` (Google Cloud Project context)
- Uses Google Cloud credentials

**How to use ÆtherLight with Gemini:**

1. **Gemini Code Assist reads workspace context:**
   - Open `CLAUDE.md` → Gemini includes in context
   - Ask: "Read CLAUDE.md and explain ÆtherLight"

2. **For Google Cloud IDE:**
   ```bash
   # Add workspace instructions
   echo "Read CLAUDE.md first for project context" > .gemini/instructions.txt
   ```

**Context boundaries:**
- Uses workspace files (similar to Copilot)
- Explicitly open ÆtherLight's CLAUDE.md when working on ÆtherLight

---

### **v0 by Vercel (UI Generation)**

**Config files:**
- No config file (web-based, component-focused)

**How to use ÆtherLight with v0:**

1. **v0 generates UI components from prompts:**
   - ÆtherLight patterns can inform v0 prompts
   - Example: "Generate a React button using Pattern-REACT-002 style"

2. **Integration workflow:**
   ```bash
   # Extract UI patterns from your code
   npx @aetherlight/sdk extract-patterns --type ui

   # Reference in v0 prompt
   "Create a dashboard component following the patterns in .aetherlight/patterns/Pattern-UI-001.md"
   ```

**Context boundaries:**
- v0 is component-level (not full project)
- Use ÆtherLight to maintain UI consistency across v0 generations

---

### **Figma AI (Design-to-Code)**

**Config files:**
- Figma plugin settings (no file-based config)

**How to use ÆtherLight with Figma AI:**

1. **Figma AI generates code from designs:**
   - ÆtherLight validates generated code quality
   - Check generated code against existing patterns

2. **Workflow:**
   ```bash
   # 1. Figma AI generates component code
   # 2. Save to your project
   # 3. Validate with ÆtherLight
   npx @aetherlight/sdk validate-code src/components/FigmaGenerated.tsx

   # 4. Extract as pattern if good
   npx @aetherlight/sdk extract-patterns --file src/components/FigmaGenerated.tsx
   ```

**Context boundaries:**
- Figma AI operates at component level
- Use ÆtherLight to ensure consistency with project patterns

---

### **Snowflake Cortex (Data + AI Platform)**

**Config files:**
- Snowflake connection config (database credentials)
- `.snowflake/` (project-specific settings)

**How to use ÆtherLight with Snowflake Cortex:**

1. **Cortex is SQL-focused (data queries + ML):**
   - ÆtherLight can store SQL query patterns
   - Reuse proven queries instead of regenerating

2. **Setup:**
   ```sql
   -- In Snowflake
   CREATE SCHEMA IF NOT EXISTS aetherlight_patterns;

   CREATE TABLE aetherlight_patterns.query_patterns (
     pattern_id VARCHAR,
     query_text TEXT,
     reasoning TEXT,
     confidence_score FLOAT
   );
   ```

3. **Usage:**
   ```bash
   # Extract SQL patterns
   npx @aetherlight/sdk extract-patterns --type sql

   # Store in Snowflake (optional)
   snowsql -f .aetherlight/patterns/Pattern-SQL-001.sql
   ```

**Context boundaries:**
- Cortex operates at database level
- ÆtherLight stores query patterns (not data)

---

### **Grok / Grok Code Fast 1 (xAI)**

**Config files:**
- Integrated via GitHub Copilot, Cursor, Cline, Windsurf (no standalone config)

**How to use ÆtherLight with Grok:**

1. **Grok has massive 256K token context window:**
   - Can process entire codebases at once
   - Maintains context across complex projects

2. **Integration via host editors:**
   ```bash
   # If using Cursor with Grok backend:
   # Configure Cursor to use Grok model
   # Then follow Cursor instructions above

   # If using GitHub Copilot with Grok:
   # GitHub Copilot settings → Select Grok model
   # Then use Copilot normally
   ```

3. **Context loading:**
   - Grok can load entire ÆtherLight repo at once (256K tokens)
   - Ask: "Read all of ÆtherLight and explain the architecture"

**Context boundaries:**
- Grok operates through host editor (Cursor, Copilot, etc.)
- Follow host editor's context rules

---

### **DeepSeek Coder V2 (Chinese Open-Source)**

**Config files:**
- No standardized config (available via API or local deployment)
- `.deepseek/` (if self-hosted)

**How to use ÆtherLight with DeepSeek:**

1. **DeepSeek has 128K context window:**
   - Can process large portions of ÆtherLight codebase
   - Supports 338 programming languages

2. **Access methods:**
   ```bash
   # Via API
   export DEEPSEEK_API_KEY="your-key"
   # Use in your editor with DeepSeek model

   # Self-hosted (advanced)
   git clone https://github.com/deepseek-ai/DeepSeek-Coder-V2
   # Follow deployment instructions
   ```

3. **Context loading:**
   - Provide CLAUDE.md in prompt
   - DeepSeek will maintain context across 128K tokens

**Context boundaries:**
- DeepSeek operates per-session (API calls or local deployment)
- Explicitly provide ÆtherLight context in prompts

---

### **OpenAI Codex CLI (Terminal Agent)**

**Config files:**
- No config file (runs in terminal)
- Authenticated via ChatGPT account

**How to use ÆtherLight with Codex CLI:**

1. **Install Codex CLI:**
   ```bash
   # Installation (requires ChatGPT Plus/Pro/Team)
   curl -fsSL https://openai.com/codex/install.sh | sh

   # Authenticate
   codex auth

   # Select model (o3 or o4-mini)
   codex --model o3
   ```

2. **Usage in ÆtherLight repo:**
   ```bash
   # Navigate to ÆtherLight
   cd path/to/ÆtherLight_Lumina

   # Ask Codex about project
   codex "Explain the domain agent architecture"
   # Codex reads codebase, CLAUDE.md, and answers

   # Implement feature
   codex "Implement P3.5-003 Breadcrumb Escalation Engine"
   # Codex reads PHASE_3.5_IMPLEMENTATION.md, writes code
   ```

3. **Context:**
   - Codex CLI reads current directory automatically
   - Include CLAUDE.md in responses: `codex "Read CLAUDE.md first, then..."`

**Context boundaries:**
- Codex CLI operates in current directory (like Aider)
- Check `pwd` before running commands

---

### **Windsurf (Codeium IDE)**

**Config files:**
- `.windsurf/` (workspace settings)
- Cascade system for session memory

**How to use ÆtherLight with Windsurf:**

1. **Windsurf has best session memory (Cascade system):**
   - Maintains context across development session
   - Anticipates issues before they arise

2. **Setup:**
   ```bash
   # Open ÆtherLight in Windsurf
   windsurf /path/to/ÆtherLight_Lumina

   # Cascade auto-detects project structure
   # Ask: "Explain ÆtherLight architecture"
   # Cascade reads CLAUDE.md, docs/, and responds
   ```

3. **Session memory:**
   - Cascade remembers previous conversations
   - Maintains context throughout session
   - Clear diff previews for code changes

**Context boundaries:**
- Windsurf operates per-workspace (like VS Code)
- Session memory persists within workspace

---

### **Supermaven (Now part of Cursor)**

**Config files:**
- Integrated into Cursor IDE (no standalone config)

**How to use ÆtherLight with Supermaven:**

1. **Supermaven powers Cursor's autocomplete:**
   - 1 million token context window
   - Blazing-fast code completions

2. **Usage:**
   - Follow Cursor instructions above
   - Supermaven runs automatically in background
   - No additional setup needed

**Context boundaries:**
- Supermaven is autocomplete layer (not full assistant)
- Context managed by Cursor IDE

---

### **Qwen3-Coder (Alibaba Cloud)**

**Config files:**
- No standardized config (API or self-hosted)
- `.qwen/` (if self-hosted)

**How to use ÆtherLight with Qwen3-Coder:**

1. **Qwen3-Coder capabilities:**
   - 480B parameter Mixture-of-Experts model
   - 35B active parameters
   - Strong coding and agentic tasks

2. **Access methods:**
   ```bash
   # Via Alibaba Cloud API
   export QWEN_API_KEY="your-key"

   # Self-hosted (advanced)
   git clone https://github.com/QwenLM/Qwen3-Coder
   # Follow deployment instructions
   ```

3. **Qwen-Agent framework:**
   ```python
   from qwen_agent import Agent

   agent = Agent(
       llm_model='qwen3-coder',
       system_message='You are helping develop ÆtherLight. Read CLAUDE.md first.'
   )

   response = agent.run('Explain domain agent architecture')
   ```

**Context boundaries:**
- Qwen operates per-session (API or local)
- Provide ÆtherLight context explicitly

---

### **Amazon Q Developer (AWS)**

**Config files:**
- AWS credentials (~/.aws/credentials)
- IDE plugins (VS Code, IntelliJ)

**How to use ÆtherLight with Amazon Q:**

1. **Amazon Q is AWS-focused coding assistant:**
   - Code generation and suggestions
   - AWS service integration
   - Security scanning

2. **Setup:**
   ```bash
   # Install VS Code extension
   code --install-extension amazonwebservices.q-developer

   # Authenticate with AWS
   aws configure
   ```

3. **Usage:**
   - Ask Q: "Read CLAUDE.md and explain ÆtherLight"
   - Q will provide context-aware suggestions

**Context boundaries:**
- Q operates in IDE (VS Code, IntelliJ)
- Uses open files for context

---

## 🛡️ Critical Safety Rules (ALL AGENTS)

**BEFORE executing ANY task, verify:**

### **Rule #1: Context Isolation**

```bash
# Check which project you're in
pwd
# /path/to/ÆtherLight_Lumina → ÆtherLight repo ✅
# /path/to/user-project → User's project ✅
# /path/to/user-project/libs/aetherlight → ÆtherLight as sub-repo ⚠️

# If sub-repo: Which directory am I modifying?
# Modifying libs/aetherlight/ → ÆtherLight code ✅
# Modifying apps/user-app/ → User's code ✅
# Modifying both → ❌ DANGER, pick one
```

### **Rule #2: Pattern Library Isolation**

```bash
# ÆtherLight has 22+ patterns in docs/patterns/
# User's project has their own patterns in .aetherlight/patterns/

# NEVER mix these!
# Extract pattern from ÆtherLight code → Add to docs/patterns/ ✅
# Extract pattern from user's code → Add to .aetherlight/patterns/ ✅
# Extract pattern from user's code → Add to docs/patterns/ ❌ WRONG
```

### **Rule #3: CLAUDE.md Separation**

```bash
# ÆtherLight's CLAUDE.md:
# - Line 12: "ÆtherLight is reasoning infrastructure..."
# - Contains: 4 Claude agents, 22+ patterns, ÆtherLight identity

# User's CLAUDE.md:
# - Line 12: "[User's project] is [their description]..."
# - Contains: User's agents, user's patterns, user's identity

# NEVER modify wrong CLAUDE.md!
# Check line 12 before editing:
head -20 CLAUDE.md | grep "ÆtherLight"
# Found? → You're in ÆtherLight repo ✅
# Not found? → You're in user's repo ✅
```

### **Rule #4: Git Commit Separation**

```bash
# Check which repo you're committing to
git remote -v
# origin  https://github.com/aetherlight/aetherlight → ÆtherLight ✅
# origin  https://github.com/user/their-project → User's project ✅

# NEVER commit to wrong repo!
# If unsure: git status (shows which .git directory)
```

---

## 📦 Integration Patterns

### **Pattern 1: ÆtherLight as Standalone Repo**

```
ÆtherLight_Lumina/
├── CLAUDE.md                    # ÆtherLight project memory
├── docs/patterns/               # ÆtherLight's 22+ patterns
├── crates/aetherlight-core/     # Rust core
└── .git/                        # ÆtherLight git repo
```

**Usage:** You're developing ÆtherLight itself
**Context:** Work on ÆtherLight features

---

### **Pattern 2: ÆtherLight as Sub-Repo**

```
user-project/
├── CLAUDE.md                    # User's project memory
├── .aetherlight/patterns/       # User's patterns
├── libs/
│   └── aetherlight/             # ÆtherLight sub-repo
│       ├── CLAUDE.md            # ÆtherLight project memory
│       ├── docs/patterns/       # ÆtherLight's patterns
│       └── .git/                # ÆtherLight git repo
└── .git/                        # User's git repo
```

**Usage:** User integrated ÆtherLight into their project
**Context:** Work on user's features (use ÆtherLight as library)

---

### **Pattern 3: ÆtherLight as npm Package**

```
user-project/
├── CLAUDE.md                    # User's project memory
├── .aetherlight/patterns/       # User's patterns
├── node_modules/
│   └── @aetherlight/sdk/        # ÆtherLight npm package
│       ├── CLAUDE.md            # ÆtherLight project memory (read-only)
│       └── docs/patterns/       # ÆtherLight's patterns (read-only)
└── .git/                        # User's git repo
```

**Usage:** User installed ÆtherLight via npm
**Context:** Work on user's features (ÆtherLight is dependency)

---

## 🎯 Task Execution Checklist (ALL AGENTS)

**BEFORE starting ANY task:**

- [ ] `pwd` - Verified current directory
- [ ] `head -20 CLAUDE.md | grep "ÆtherLight"` - Confirmed context
- [ ] `git remote -v` - Verified correct repo
- [ ] Read CLAUDE.md (project identity)
- [ ] Read LIVING_PROGRESS_LOG.md (execution history)
- [ ] Read PHASE_X_IMPLEMENTATION.md (current tasks)

**DURING task execution:**

- [ ] `export OTEL_SDK_ENABLED=true` - Enabled tracking
- [ ] `./scripts/start-task.sh P3-XXX "Task Name"` - Started task
- [ ] Update execution log in real-time (logs/phase-3/P3-XXX-execution.md)
- [ ] Document design decisions (Chain of Thought comments)

**AFTER task completion:**

- [ ] `./scripts/complete-task.sh P3-XXX` - Completed task
- [ ] Fill PHASE_X_IMPLEMENTATION.md execution log
- [ ] Check validation criteria (mark [x] when met)
- [ ] Create git commit (Chain of Thought format)
- [ ] Update LIVING_PROGRESS_LOG.md (if milestone)

---

## 🧠 Chain of Thought Documentation Standard

**ALL AI agents must follow this format when documenting code:**

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
 * RELATED: [Other components, files, tasks]
 * FUTURE: [Planned improvements]
 */
```

**Example:**

```typescript
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
async function solveProblem(problem: Problem): Promise<Solution> {
  // Implementation...
}
```

**See:** `docs/vision/CHAIN_OF_THOUGHT_STANDARD.md` for complete spec

---

## 🔍 Quick Reference Commands

### **Verify Context:**
```bash
# Am I in ÆtherLight repo?
head -20 CLAUDE.md | grep "ÆtherLight"  # Should find match

# Which git repo?
git remote -v  # Check origin URL

# Which patterns exist?
ls docs/patterns/  # ÆtherLight's patterns
ls .aetherlight/patterns/  # User's patterns (if integrated)
```

### **Read Project Memory:**
```bash
# Project identity
head -100 CLAUDE.md

# Execution history
tail -100 docs/execution/LIVING_PROGRESS_LOG.md

# Current tasks
cat PHASE_3.5_IMPLEMENTATION.md | grep "### Task"
```

### **Start/Complete Task:**
```bash
# Enable tracking
export OTEL_SDK_ENABLED=true
export OTEL_EXPORTER_FILE_PATH="./logs/otel/traces.json"

# Start task
./scripts/start-task.sh P3.5-003 "Breadcrumb Escalation Engine"

# Complete task
./scripts/complete-task.sh P3.5-003
```

---

## 📚 Document Map

| Want to... | Read this |
|------------|-----------|
| **Understand ÆtherLight conceptually (START HERE)** | **`docs/build/AI_ASSISTANT_GUIDE.md`** |
| Understand project identity | `CLAUDE.md` (root) |
| See execution history | `docs/execution/LIVING_PROGRESS_LOG.md` |
| View current tasks | `PHASE_3.5_IMPLEMENTATION.md` (or highest phase) |
| Learn Chain of Thought | `docs/vision/CHAIN_OF_THOUGHT_STANDARD.md` |
| Understand patterns | `docs/patterns/README.md` |
| See Git workflow | `docs/build/GIT_SOPs.md` |
| Integrate safely | `INTEGRATION_SAFETY.md` |
| Contribute | `CONTRIBUTING.md` |

---

## ⚠️ Common Mistakes (AVOID THESE)

### **Mistake #1: Context Pollution**
```bash
# WRONG: Adding ÆtherLight pattern to user's library
cd user-project
echo "Pattern from ÆtherLight" > .aetherlight/patterns/Pattern-BUSINESS-001.md
# ❌ This pollutes user's pattern library!

# RIGHT: Reference ÆtherLight pattern in user's code
cd user-project
echo "Uses @aetherlight/sdk Pattern-BUSINESS-001" > .aetherlight/patterns/Pattern-USERAPP-001.md
# ✅ User's pattern references ÆtherLight pattern
```

### **Mistake #2: Wrong CLAUDE.md**
```bash
# WRONG: Editing ÆtherLight's CLAUDE.md while in user's project
cd user-project
vim libs/aetherlight/CLAUDE.md  # Editing ÆtherLight's memory
# ❌ User's tasks shouldn't modify ÆtherLight's CLAUDE.md!

# RIGHT: Editing user's CLAUDE.md
cd user-project
vim CLAUDE.md  # Editing user's memory
# ✅ User's tasks go in user's CLAUDE.md
```

### **Mistake #3: Cross-Repo Commits**
```bash
# WRONG: Committing both repos at once
git add .
git commit -m "Updated both ÆtherLight and user code"
# ❌ Can't commit two repos in one commit!

# RIGHT: Commit separately
cd user-project/libs/aetherlight
git add .
git commit -m "fix(aetherlight): bug fix"

cd ../..
git add .
git commit -m "feat(app): integrated fix from ÆtherLight"
# ✅ Two commits, two repos
```

---

## 🎓 Agent Self-Check (Before Responding)

**If you're an AI agent, ask yourself:**

1. ✅ Did I read CLAUDE.md to understand project identity?
2. ✅ Did I check `pwd` to verify which directory I'm in?
3. ✅ Did I verify `git remote -v` to confirm correct repo?
4. ✅ Did I separate ÆtherLight context from user context?
5. ✅ Did I avoid mixing pattern libraries?
6. ✅ Did I follow Chain of Thought documentation standard?
7. ✅ Did I reference correct PHASE_X_IMPLEMENTATION.md?

**If ANY "no" → STOP and clarify context with user first**

---

## 🚀 Ready to Start

**For AI agents:** You now understand ÆtherLight's structure!

**Quick start:**
1. Read CLAUDE.md (project identity)
2. Read LIVING_PROGRESS_LOG.md (execution history)
3. Read PHASE_3.5_IMPLEMENTATION.md (current tasks)
4. Follow Task Execution Checklist (this document)
5. Execute task with Chain of Thought documentation

**Questions?** Ask user to clarify context:
- "Am I working on ÆtherLight features or integrating ÆtherLight into your project?"
- "Should I modify ÆtherLight's code or use ÆtherLight as a library?"
- "Which CLAUDE.md should I reference (ÆtherLight's or yours)?"

---

**VERSION:** 1.0
**LAST UPDATED:** 2025-10-10
**MAINTAINED BY:** ÆtherLight Core Team
**PATTERN:** Pattern-META-003 (Multi-Agent Interoperability)

🌟 **ÆtherLight: The first reasoning infrastructure designed for ALL AI agents** 🌟
