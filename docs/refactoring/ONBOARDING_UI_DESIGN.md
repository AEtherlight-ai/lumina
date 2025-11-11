# Voice Panel Onboarding UI Design (REVISION 3 - Based on Actual System)

**Sprint:** ONBOARD-001 Phase 1 (REFACTOR-001)
**Date:** 2025-11-09
**Status:** 🟡 DRAFT - Based on Complete Codebase Analysis
**Revision:** 3 - Analyzed ACTUAL detection, interview, config generation, and variable resolution systems

---

## ⚠️ CRITICAL CONTEXT - Why This Redesign Exists

**Previous Design Flaws:**
- ❌ Guessed at system capabilities without reading code
- ❌ Didn't understand detection services or interview system
- ❌ Didn't know what variables are needed or how they're used
- ❌ User feedback: "You're not analyzing our actual software solution"

**This Design is Based on ACTUAL Codebase Analysis:**

### What We Actually Have (Discovered by Reading Code):

**Phase 3: Detection Services** (4 detectors run in parallel <500ms)
- `TechStackDetector.ts:78` - Detects language, framework, package manager, test framework
- `ToolDetector.ts:78` - Detects build tools, extracts build/test/lint commands
- `WorkflowDetector.ts:80` - Detects TDD, Git workflow, CI/CD, pre-commit hooks
- `DomainDetector.ts:68` - Detects project domain (CLI, web, desktop, library)
- **Returns confidence scores (0.0-1.0) for each detection**

**Phase 4: Interview System** (Smart conditional questions)
- `InterviewEngine.ts:150` - VS Code UI-based Q&A system (showInputBox, showQuickPick)
- `project-initialization.json` - Interview template with 5 questions
- **Conditional logic:** Only asks questions when detection confidence <0.8
- **Question types:** input (text), list (single select), checkbox (multi-select), confirm (yes/no)

**Config Generation** (Merge strategy)
- `ProjectConfigGenerator.ts:156` - Merges detection + interview + defaults
- **Priority:** Interview answers > Detection results > Default config
- **Output:** `.aetherlight/project-config.json` with all variables
- **Validation:** `ProjectConfigValidator` ensures config is valid

**Variable Resolution** (Agent prompt system)
- `VariableResolver.ts:114` - Replaces `{{VARIABLE}}` in agent prompts
- **Makes agents project-agnostic:** `{{BUILD_COMMAND}}` → `cargo build` (Rust) or `npm run build` (Node.js)
- **Recursive resolution:** `{{A}}` → `{{B}}` → `value`

**The Complete Pipeline** (How it actually works):
```
1. User runs: lumina init
2. InitCommand (init.ts:66) orchestrates:
3. InterviewFlowCommand (interviewFlow.ts:191):
   a. Runs 4 detectors in parallel
   b. Converts detections to initial answers with _detection metadata
   c. Loads interview template (project-initialization.json)
   d. Runs InterviewEngine (skips high-confidence questions)
   e. Returns final answers
4. ProjectConfigGenerator merges detection + interview + defaults
5. Validates and writes .aetherlight/project-config.json
6. VariableResolver can now resolve {{VARS}} in agent prompts
```

**What Variables Are Needed** (From project-initialization.json):
- `LANGUAGE` (typescript, javascript, rust, python, go, java)
- `PACKAGE_MANAGER` (npm, yarn, pnpm, cargo, pip, go mod)
- `TEST_FRAMEWORK` (jest, mocha, vitest, pytest, cargo-test, go test, none)
- `BUILD_COMMAND` (npm run build, cargo build, etc.)
- `DEPLOY_TARGET` (aws, azure, gcp, heroku, vercel, netlify, docker, local, other)

---

## 🎯 Design Goals (Updated Based on Actual System)

**CORE PRINCIPLE:** Teach users ÆtherLight's ACTUAL workflow through real usage

**The Correct Workflow:**
```
Voice/Type → Edit Prompt → Send to AI Terminal → AI Executes → Result
                                                       ↓
                                    AI uses project-config.json variables
                                    {{BUILD_COMMAND}} → npm run build (for your project)
```

**NOT THIS (What We Did Wrong Before):**
```
Click Button → TypeScript Function Executes → Done ❌
```

**What We're Teaching:**
1. ✅ How detection works (AI analyzes project structure automatically)
2. ✅ What variables are needed (language, package manager, build commands, etc.)
3. ✅ Why interview asks questions (only when detection confidence <0.8)
4. ✅ How config is generated (detection + interview → .aetherlight/project-config.json)
5. ✅ How variables are used ({{BUILD_COMMAND}} in prompts → actual command for your project)
6. ✅ Voice Panel + AI Terminal workflow (Voice → Edit → Send → Watch AI work)
7. ✅ Feature tips (Code Analyzer, Sprint Planner, Bug/Feature buttons)
8. ✅ Prompting guidance (keep AI on track, handle hallucinations)

---

## 🔄 Revised Onboarding Flow (9 Steps Based on Actual System + MVP-003 Enhancement)

### Step 1: Welcome & Safety
**Title:** "Welcome to ÆtherLight!"

**Content:**
```
🎉 Welcome to ÆtherLight - Voice-to-Intelligence for Developers

⚠️ SAFETY FIRST: Backup Your Project
Before we begin, please make sure your work is backed up (Git commit recommended).

[ ] I've backed up my project

What You'll Learn (By Actually Doing It):
1. ✅ Voice Health Check (desktop app + transcription test)
2. ✅ Edit Prompts (you control what AI sees)
3. ✅ Terminal Selection (choose where AI executes)
4. ✅ Send & Watch (see AI work in real-time)
5. ✅ Project Analysis (AI auto-detects your tech stack)
6. ✅ Configuration (AI asks smart questions)
7. ✅ Variable System (how config stores project data)
8. ✅ Enhancement System (THE INTELLIGENCE ENGINE - MVP-003)
9. ✅ Feature Tips (Code Analyzer, Sprint Planner, etc.)

Let's teach your AI about YOUR project!

[Skip]  [Next: Voice Health Check →]
```

**Actions:**
- Checkbox required before Next enabled
- Skip dismisses forever (can reopen from Help menu)

---

### Step 2: Voice Recording Health Check (REQUIRED)
**Title:** "Test Voice Recording"

**Content:**
```
🎙️ Voice Recording Health Check

Let's make sure your desktop app is working properly:

👉 Record a test message:
1. Press ` (backtick) key to START recording
2. Say: "Hello ÆtherLight, I'm ready to configure my project"
3. Press ` again to STOP recording

✅ Health Checks:
- Desktop app running? (We'll detect this)
- Microphone access? (We'll test this)
- Transcription working? (You'll see the text below)

The transcribed text will appear in the Voice Panel text area below.

💡 TIP: If recording fails, check:
- Desktop app is running in system tray
- Microphone permissions granted
- Try Option+V (Mac) or Shift+~ (Windows) as backup hotkey

[Back]  [Skip]  [Recording Failed? Manual Input →]
```

**UI Changes:**
- Highlight text area with pulse animation
- Show desktop app status indicator
- Wait for successful recording OR allow manual text input
- Next button enabled after text appears (voice OR typed)
- Show success checkmarks for each health check

**Critical:** This validates desktop app + transcription before proceeding

---

### Step 3: Edit Prompts (AI Control)
**Title:** "Edit Before Sending - You're in Control"

**Content:**
```
✏️ The Power of Editing

You just recorded/typed: "[user's input]"

ÆtherLight loads prompts into the text area for YOU to edit.
This is different from other tools - YOU control what the AI sees.

👉 Try editing the prompt now:
Add specific constraints or context:
- "Focus on the backend API code"
- "Use TypeScript strict mode"
- "Prioritize security analysis"

💡 TIP: Better prompts = better AI results!

🎯 Pro Tips for Prompting:
- Be specific about what you want
- Add constraints ("don't modify X files")
- Reference docs/patterns if available
- Ask for step-by-step explanations
- Tell AI to verify assumptions before acting

[Back]  [Next: Select Terminal →]
```

**UI Changes:**
- Text area highlighted with cursor
- Show example edits as suggestions
- No requirements - user can proceed anytime

---

### Step 4: Terminal Selection & Send
**Title:** "Choose Your AI Terminal & Send"

**Content:**
```
🖥️ Select Where AI Will Execute

ÆtherLight sends your prompt to an AI-powered terminal:

👉 Step 1: Select a terminal from the list:
- Claude Code (recommended)
- GitHub Copilot Chat
- Your custom AI terminal
- Or any open terminal

💡 TIP: We recommend Claude Code for best results

👉 Step 2: Click the 📤 Send button

What Happens Next:
1. Your edited prompt appears in the selected terminal
2. Your AI assistant receives it
3. AI starts working in real-time
4. You see everything happening!

This is THE WORKFLOW. Every ÆtherLight feature works this way:
Voice/Type → Edit → Send → AI Executes → Result

❓ What if "No terminals detected"?
- Open a new terminal (Terminal → New Terminal)
- Ensure your AI assistant is running
- Refresh terminal list (🔄 button)

[Back]  [Send & Continue →]
```

**UI Changes:**
- Highlight terminal list with pulse
- Show recommended terminal (if detected)
- Highlight Send button after terminal selected
- Wait for send action
- Show "Watching AI work..." indicator
- Next enabled after AI starts executing

**Critical:** User MUST see prompt go to terminal and AI start working

---

### Step 5: Project Analysis (AI Auto-Detection)
**Title:** "AI Is Analyzing Your Project"

**Content:**
```
🔍 Real-Time Project Analysis

Your AI is now analyzing your project!

📊 What AI is doing right now (Phase 3 Detection):
- 🔍 TechStackDetector: Finding language, framework, package manager
- 🛠️ ToolDetector: Extracting build/test/lint commands from package.json
- 🔄 WorkflowDetector: Checking for TDD, Git workflow, CI/CD
- 🏗️ DomainDetector: Identifying project type (CLI, web, desktop, library)

👀 Watch your terminal - you'll see AI:
- Reading manifest files (package.json, Cargo.toml, etc.)
- Checking config files (.eslintrc, webpack.config.js, etc.)
- Analyzing directory structure (src/, test/, public/)
- Calculating confidence scores (0.0-1.0 for each detection)

💡 WHAT'S HAPPENING BEHIND THE SCENES:
Each detector returns results with confidence scores:
- High confidence (≥0.8): AI won't ask you about it
- Low confidence (<0.8): AI will ask to confirm
- This is how ÆtherLight learns YOUR project!

🎯 Prompting Tips to Keep AI On Track:
- "Stay within the project root directory"
- "Don't modify any files yet, just analyze"
- "Generate a summary report when done"
- "Follow the detection → interview → config workflow"

[Analysis Running...]  [Analysis Complete? Next →]
```

**UI Changes:**
- Show terminal window (if not already visible)
- Streaming results highlighted
- Progress indicator showing which detector is running
- Next enabled after all detectors complete

**Critical:** User sees ACTUAL Phase 3 detection happening in terminal

---

### Step 6: Smart Interview (AI Asks Questions)
**Title:** "AI Needs Your Help (Smart Questions)"

**Content:**
```
❓ AI Interview - Conditional Questions

Based on analysis results, AI needs to confirm a few things:

📊 DETECTION RESULTS:
- Language: [DETECTED_LANGUAGE] (confidence: [X.X])
- Package Manager: [DETECTED_PM] (confidence: [X.X])
- Test Framework: [DETECTED_TF] (confidence: [X.X])
- Build Command: [DETECTED_BUILD] (confidence: [X.X])

🤔 WHY IS AI ASKING QUESTIONS?

AI uses smart conditional logic (Phase 4 Interview):
- ✅ High confidence (≥0.8): Question SKIPPED
- ❓ Low confidence (<0.8): Question ASKED (to confirm)
- ❓ Not detectable: Always asked (e.g., DEPLOY_TARGET)

👉 AI will now ask you questions in VS Code UI dialogs:

The interview template has 5 potential questions:
1. LANGUAGE (skipped if detected with ≥0.8 confidence)
2. PACKAGE_MANAGER (skipped if detected with ≥0.8 confidence)
3. TEST_FRAMEWORK (skipped if detected with ≥0.8 confidence)
4. BUILD_COMMAND (skipped if detected with ≥0.8 confidence)
5. DEPLOY_TARGET (always asked - can't be auto-detected)

💡 TIP: You're only asked 1-3 questions typically!
High detection confidence = fewer questions!

[Start Interview →]
```

**UI Changes:**
- Show detection results with confidence scores
- Launch InterviewEngine (VS Code showQuickPick/showInputBox)
- Show which questions are being asked vs. skipped
- Progress indicator (Question X of Y)
- Next enabled after interview complete

**Critical:** User understands WHY they're being asked questions (low confidence detections)

---

### Step 7: Config Generation & Variables
**Title:** "Configuration Generated!"

**Content:**
```
✅ Configuration Complete!

AI has generated your project configuration:

📄 .aetherlight/project-config.json
```json
{
  "project_name": "[PROJECT_NAME]",
  "language": {
    "language": "[LANGUAGE]",
    "package_manager": "[PACKAGE_MANAGER]",
    "test_framework": "[TEST_FRAMEWORK]",
    "build_command": "[BUILD_COMMAND]"
  },
  ...
}
```

🎯 HOW CONFIGURATION WAS CREATED:

Phase 3: Detection (auto-detected values)
  ↓
Phase 4: Interview (user confirms/corrects)
  ↓
Merge Strategy: Interview > Detection > Defaults
  ↓
Validation: Ensures config is valid
  ↓
Output: .aetherlight/project-config.json

🔧 HOW VARIABLES ARE USED:

ÆtherLight uses VariableResolver to make agent prompts project-specific:

**Agent Prompt Template:**
"Run {{BUILD_COMMAND}} to build the project, then run {{TEST_COMMAND}} to verify."

**After Variable Resolution (YOUR project):**
"Run [BUILD_COMMAND] to build the project, then run [TEST_COMMAND] to verify."

**This Makes Agents Work With ANY Project:**
- TypeScript: {{BUILD_COMMAND}} → npm run build
- Rust: {{BUILD_COMMAND}} → cargo build
- Go: {{BUILD_COMMAND}} → go build
- Python: {{BUILD_COMMAND}} → python setup.py build

💡 TIP: You can edit project-config.json anytime!
Changes take effect immediately in agent prompts.

[Next: Enhancement System →]
```

**UI Changes:**
- Show generated config (pretty-printed JSON)
- Highlight key variables
- Show example variable resolution
- Next enabled immediately

**Critical:** User understands HOW config was created

---

### Step 8: Enhancement System - The Intelligence Engine (NEW)
**Title:** "How AI Understands YOUR Project"

**Content:**
```
🧠 The Enhancement System (MVP-003)

You now have a project configuration. But how does AI actually USE it?

Let's see the magic happen!

👉 DEMO: Type this in the text area below:
"Analyze my code"

👉 Now click the ✨ Enhance button

---

✨ WATCH WHAT JUST HAPPENED:

**Your simple text:**
"Analyze my code"

**Became this enhanced prompt:**
"""
Analyze code for [YOUR_PROJECT_NAME]

PROJECT CONTEXT (from your .aetherlight/project-config.json):
- Language: [LANGUAGE]
- Package Manager: [PACKAGE_MANAGER]
- Build Command: [BUILD_COMMAND]
- Test Framework: [TEST_FRAMEWORK]
- Source Directory: [SOURCE_DIRECTORY]
- Test Directory: [TEST_DIRECTORY]

CURRENT STATE (Temporal Drift Detection):
- Modified files: [GIT_STATUS]
- Recent commits: [LAST_20_COMMITS]
- Completed tasks: [FROM_SPRINT_TOML]
- Git diff since last task: [GIT_DIFF]

PATTERNS TO FOLLOW:
- Pattern-CODE-001 (Code development workflow)
- Pattern-TDD-001 (Test-driven development)
- Pattern-IMPROVEMENT-001 (Gap detection)

WORKSPACE ANALYSIS:
- Root: [WORKSPACE_ROOT]
- Languages detected: [LANGUAGES]
- Frameworks: [FRAMEWORKS]

INSTRUCTIONS:
Analyze the workspace focusing on code quality, architecture,
patterns, and improvement recommendations. Use {{BUILD_COMMAND}}
to verify build succeeds. Run {{TEST_COMMAND}} to check tests pass.
Generate detailed report with actionable recommendations.
"""

---

🎯 THIS IS THE CORE OF ÆTHERLIGHT:

**Every button uses this enhancement engine:**

🔍 **Code Analyzer** → Injects workspace structure, languages, patterns
📋 **Sprint Planner** → Adds sprint template, 27 normalized tasks, patterns
🐛 **Bug Report** → Includes severity, reproduction steps, project state
🔧 **Feature Request** → Adds priority, use case, architectural context
▶️ **Start Task** → Injects task definition + current git state + completed tasks
⏭️ **Next Task** → Finds next ready task + dependency chain + temporal context

---

💡 WHY THIS IS POWERFUL:

1. **Project-Specific Intelligence**
   - AI knows YOUR language, tools, commands
   - {{BUILD_COMMAND}} → your actual build command
   - {{TEST_COMMAND}} → your actual test command

2. **Context-Aware Execution**
   - AI sees what changed since last task (git diff)
   - AI knows what's completed (sprint TOML)
   - AI detects temporal drift (outdated assumptions)

3. **Pattern-Driven Workflow**
   - AI follows YOUR documented patterns
   - References docs/patterns/ automatically
   - Consistent behavior across all features

4. **Gap Detection (MVP-003)**
   - If critical info missing, AI asks questions
   - Modal dialogs for user input
   - Prompts regenerated with answers

5. **Universal Enhancement**
   - Same intelligence for ALL features
   - Consistent context injection
   - One system, infinite uses

---

🔧 VARIABLES IN ACTION:

Remember {{BUILD_COMMAND}} from Step 7?

**Before Enhancement:**
"Run my build command"

**After Enhancement (VariableResolver):**
"Run npm run build" (YOUR actual command)

**This makes agents work with ANY project:**
- TypeScript: {{BUILD_COMMAND}} → npm run build
- Rust: {{BUILD_COMMAND}} → cargo build
- Go: {{BUILD_COMMAND}} → go build
- Python: {{BUILD_COMMAND}} → python setup.py build

---

✨ TRY IT YOURSELF:

**Example 1: Build Command**
Type: "Run my build command and check for errors"
Click Enhance → See {{BUILD_COMMAND}} become YOUR command!

**Example 2: Test Command**
Type: "Run tests"
Click Enhance → See {{TEST_COMMAND}} + test directory injected!

**Example 3: Code Analysis**
Type: "Find bugs"
Click Enhance → See full analysis prompt with patterns, context, instructions!

---

🎓 WHAT YOU LEARNED:

✅ Configuration (Step 7) stores your project variables
✅ Enhancement (Step 8) injects variables into prompts
✅ VariableResolver replaces {{VARS}} with actual values
✅ Every feature uses this same enhancement engine
✅ This is WHY ÆtherLight works with any project type

**Next step: Learn what each feature button does!**

[Next: Feature Tips →]
```

**UI Changes:**
- Pre-fill text area with "Analyze my code"
- Highlight ✨ Enhance button with pulse
- Wait for user to click Enhance
- Show before/after comparison in modal
- Highlight variable replacements in color
- Show "Try it yourself" examples as clickable buttons
- Next enabled after user clicks Enhance at least once

**Critical:** User sees ACTUAL enhancement in action, understands this is THE CORE INTELLIGENCE

---

### Step 9: Feature Tips & Best Practices
**Title:** "ÆtherLight Features & Best Practices"

**Content:**
```
✨ What Else Can ÆtherLight Do?

Now that you understand the workflow, here are key features:

🔍 **Code Analyzer Button**
- Loads analysis prompt with {{LANGUAGE}}, {{BUILD_COMMAND}} variables
- You edit it, send to AI terminal
- AI analyzes code quality, patterns, issues
- TIP: Add "focus on security" to catch vulnerabilities
- Expected: AI reads your code, generates analysis report

📋 **Sprint Planner Button**
- Loads sprint planning prompt template
- AI generates TOML sprint file
- You review/edit before saving
- TIP: Reference existing sprints in prompts
- Expected: AI creates sprint with tasks, dependencies, timeline

✨ **Enhance Button**
- Adds patterns/context to your prompt
- AI gets better context about your project
- Still editable before sending!
- TIP: Use this for complex multi-step tasks
- Expected: AI follows patterns from docs/

🐛 **Bug Report Button**
- Template for reporting issues
- AI helps format the report
- Includes diagnostics automatically
- TIP: Describe expected vs actual behavior
- Expected: AI creates detailed bug report with repro steps

🔧 **Feature Request Button**
- Template for new feature requests
- AI helps refine the request
- Links to relevant patterns
- TIP: Explain the "why" not just "what"
- Expected: AI drafts feature proposal with impact analysis

⚠️ **If AI Hallucinates or Gets Off Track:**

1. **Send correction prompt immediately:**
   - "That's not correct, the actual path is..."
   - "Stop and verify your assumptions"

2. **Reference documentation:**
   - "Check the CLAUDE.md file for the correct process"
   - "Follow Pattern-XYZ from docs/patterns/"

3. **Redirect with specifics:**
   - "Focus only on the authentication module"
   - "Don't modify any protected files"

4. **Reset if needed:**
   - "Start over and follow the TDD workflow"
   - "Regenerate the sprint plan using the template"

💡 **Best Practices:**
- Always review AI's work before accepting
- Edit prompts to add constraints ("don't modify X")
- Reference patterns/docs for consistency
- Watch terminal output - catch issues early
- Keep project-config.json up to date

🎯 **You're Ready!**

You now understand:
- ✅ Voice → Edit → Send → Watch AI work workflow
- ✅ How detection auto-discovers your project
- ✅ Why interview asks smart conditional questions
- ✅ How config is generated and variables are used
- ✅ What each feature does and how to use it
- ✅ How to keep AI on track and handle issues

[Finish Onboarding]  [Re-run Init Command]
```

**Actions:**
- "Finish" dismisses onboarding
- "Re-run Init" loads init prompt for another project
- Mark onboarding complete

**Critical:** Comprehensive feature guide + best practices for real-world usage

---

## 🏗️ Component Architecture

### New Components to Build

**1. OnboardingManager Service** (`src/services/OnboardingManager.ts`)
```typescript
class OnboardingManager {
  // State management
  - currentStep: number (1-9)
  - completedSteps: Set<number>
  - isFirstRun: boolean
  - isOnboardingActive: boolean
  - detectionResults: DetectionResults | null
  - interviewAnswers: InterviewAnswers | null
  - generatedConfig: ProjectConfig | null

  // Methods
  + showOnboarding(): void
  + hideOnboarding(): void
  + nextStep(): void
  + previousStep(): void
  + skipOnboarding(): void
  + markStepComplete(step: number): void
  + isStepComplete(step: number): boolean
  + getProgress(): { current: number, total: number }

  // Detection & Interview integration
  + runDetection(projectRoot: string): Promise<DetectionResults>
  + runInterview(detectionResults: DetectionResults): Promise<InterviewAnswers>
  + generateConfig(detection: DetectionResults, interview: InterviewAnswers): ProjectConfig

  // Persistence
  + saveState(): void
  + loadState(): void
  + resetProgress(): void
}
```

**2. Onboarding UI HTML/CSS** (injected into Voice Panel)
```html
<!-- Modal overlay -->
<div id="onboarding-overlay" class="onboarding-overlay hidden">
  <div class="onboarding-modal">
    <!-- Header with progress -->
    <div class="onboarding-header">
      <h2 id="onboarding-title"></h2>
      <div class="progress-dots">
        <span class="dot active"></span>
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    </div>

    <!-- Content area (changes per step) -->
    <div id="onboarding-content" class="onboarding-content"></div>

    <!-- Navigation buttons -->
    <div class="onboarding-nav">
      <button id="onboarding-skip" class="btn-secondary">Skip</button>
      <button id="onboarding-back" class="btn-secondary">Back</button>
      <button id="onboarding-next" class="btn-primary">Next →</button>
    </div>
  </div>
</div>
```

**3. Integration with VoiceViewProvider**
```typescript
// In voicePanel.ts constructor:
this.onboardingManager = new OnboardingManager(
  _context,
  techStackDetector,
  toolDetector,
  workflowDetector,
  domainDetector,
  interviewEngine,
  projectConfigGenerator
);

// In resolveWebviewView():
if (this.onboardingManager.isFirstRun()) {
  setTimeout(() => {
    this.onboardingManager.showOnboarding();
  }, 1000); // Show after 1 second
}

// Message handlers for onboarding actions:
case 'onboardingNext':
  await this.onboardingManager.nextStep();
  break;
case 'onboardingRunDetection':
  const results = await this.onboardingManager.runDetection(workspaceRoot);
  // Update UI with results
  break;
case 'onboardingRunInterview':
  const answers = await this.onboardingManager.runInterview(detectionResults);
  // Update UI with answers
  break;
```

---

## 🎨 UI Styling

### Modal Overlay
```css
.onboarding-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5); /* Dim background */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.onboarding-overlay.hidden {
  display: none;
}

.onboarding-modal {
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  width: 90%;
  max-width: 700px;
  max-height: 85vh;
  overflow-y: auto;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.progress-dots {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin: 16px 0;
}

.progress-dots .dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--vscode-button-secondaryBackground);
}

.progress-dots .dot.active {
  background: var(--vscode-button-background);
}

.progress-dots .dot.completed {
  background: var(--vscode-testing-iconPassed);
}
```

### Highlight/Pulse Effects
```css
/* Highlight Voice Panel elements during onboarding */
.onboarding-highlight {
  position: relative;
  animation: pulse 2s infinite;
  box-shadow: 0 0 0 4px var(--vscode-focusBorder);
  border-radius: 4px;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 4px var(--vscode-focusBorder);
  }
  50% {
    box-shadow: 0 0 0 8px var(--vscode-focusBorder);
    opacity: 0.8;
  }
}
```

---

## 📊 State Management

### Persistence (VS Code globalState)
```typescript
// Stored in ExtensionContext.globalState
{
  "onboarding.completed": false,
  "onboarding.currentStep": 1,
  "onboarding.completedSteps": [1, 2, 3],
  "onboarding.skipped": false,
  "onboarding.lastShown": "2025-11-09T10:00:00Z",
  "onboarding.detectionResults": { ... },
  "onboarding.interviewAnswers": { ... },
  "onboarding.configGenerated": true
}
```

### First-Run Detection
```typescript
isFirstRun(): boolean {
  const completed = this._context.globalState.get('onboarding.completed', false);
  const skipped = this._context.globalState.get('onboarding.skipped', false);
  return !completed && !skipped;
}
```

---

## 🔄 Integration Points

### With Existing Voice Panel
1. **Text Area:** Highlight during Step 2-3
2. **Terminal List:** Highlight during Step 4
3. **Send Button:** Highlight during Step 4
4. **Toolbar Buttons:** Available but not highlighted

### With Detection Services (Step 5)
- Call `InterviewFlowCommand.runDetection(projectRoot)`
- Returns `DetectionResults` with confidence scores
- Show results in modal with confidence indicators
- Target: <500ms for all 4 detectors

### With Interview Flow (Step 6)
- Call `InterviewEngine.runInterview(template, initialAnswers)`
- Uses VS Code showQuickPick/showInputBox
- Conditional questions based on `_detection.*.confidence < 0.8`
- Returns `InterviewAnswers`

### With Config Generation (Step 7)
- Call `ProjectConfigGenerator.generate(detection, interview)`
- Merges detection + interview + defaults
- Validates result
- Writes `.aetherlight/project-config.json`

---

## ✅ Validation Criteria

**Design Approval Checklist:**
- [ ] User approves 9-step flow with Enhancement System (MVP-003)
- [ ] User approves teaching detection → interview → config generation
- [ ] User approves showing confidence scores and conditional logic
- [ ] User approves explaining variable resolution system
- [ ] User approves comprehensive feature tips
- [ ] User approves integration with actual services

**Implementation Readiness:**
- [ ] OnboardingManager has access to all Phase 3/4 services + MVP-003 enhancement
- [ ] HTML/CSS structure defined for 9 steps
- [ ] Integration points with real services identified
- [ ] State management includes detection/interview results
- [ ] No conflicts with existing Voice Panel code

---

## 🚀 Next Steps After Approval

1. **REFACTOR-002:** Build OnboardingManager service with Phase 3/4 + MVP-003 integration
2. **REFACTOR-003:** Create onboarding modal HTML with 9 steps
3. **REFACTOR-004:** Add CSS styling and animations
4. **REFACTOR-005:** Integrate with VoiceViewProvider + detection services
5. **REFACTOR-006:** Wire up message handlers for detection/interview
6. **REFACTOR-007:** Add highlight/pulse effects
7. **REFACTOR-008:** Test first-run experience with real detection/interview

---

## 📊 Comparison: Old vs New Design

| Aspect | Old Design (Guessed) | New Design (Analyzed) |
|--------|----------------------|----------------------|
| Steps | 7 steps | 9 steps (added variables + enhancement system) |
| Detection | Generic "AI analyzes" | Specific: 4 detectors, confidence scores |
| Interview | Not mentioned | Explained: conditional questions, why asked |
| Config | "AI generates" | Detailed: merge strategy, validation, output |
| Variables | Not explained | Comprehensive: how {{VARS}} work, examples |
| System Understanding | Assumed | Based on actual code analysis |
| Teaching Approach | Generic demo | Teach actual implementation |

**Key Improvements:**
- ✅ Step 5: Shows ACTUAL Phase 3 detection services in action
- ✅ Step 6: Explains WHY interview asks questions (confidence <0.8)
- ✅ Step 7: Teaches HOW config is generated and variables stored
- ✅ Step 8: REVEALS THE INTELLIGENCE ENGINE (MVP-003 enhancement system)
- ✅ Step 8: Live demo of enhancement with before/after comparison
- ✅ Step 9: Feature tips now make sense (user knows enhancement powers them all)
- ✅ Throughout: Uses real service names, file paths, confidence scores

---

## 🎯 User Value Proposition

**After Completing Onboarding, Users Will Understand:**

1. **The Workflow:** Voice → Edit → Send → Watch AI work (not hidden execution)
2. **The Detection:** How ÆtherLight auto-discovers their project (4 detectors, confidence scores)
3. **The Interview:** Why AI asks questions (only when confidence <0.8)
4. **The Config:** How .aetherlight/project-config.json is created (detection + interview + validation)
5. **The Variables:** How {{BUILD_COMMAND}} becomes their actual build command (VariableResolver)
6. **The Features:** What each button does and expected behavior
7. **The Best Practices:** How to keep AI on track and handle issues

**Result:** Users can confidently use ÆtherLight with ANY project type (TypeScript, Rust, Go, Python, etc.)

---

**Status:** 🟡 AWAITING USER APPROVAL (Based on Complete Codebase Analysis)

**Should I proceed to REFACTOR-002 (build OnboardingManager with Phase 3/4 integration)?**
