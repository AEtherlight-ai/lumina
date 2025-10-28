/**
 * First-Run Setup Module
 *
 * DESIGN DECISION: Auto-create discoverable documentation in every workspace
 * WHY: When users install ÆtherLight in new repos, Claude Code has NO documentation
 * about ÆtherLight features, making the extension useless
 *
 * REASONING CHAIN:
 * 1. User installs ÆtherLight extension globally in VS Code
 * 2. User opens a new repository
 * 3. Extension activates but repo has no ÆtherLight documentation
 * 4. Claude Code doesn't know about Sprint Tab, Voice Panel, or operational structure
 * 5. Solution: Auto-create .vscode/aetherlight.md from template on first run
 * 6. Add references in settings.json (VS Code standard location)
 * 7. Append to existing CLAUDE.md if present (non-destructive)
 * 8. Create example sprint with proper prompt field
 * 9. Result: Claude Code can discover and use ÆtherLight features
 *
 * PATTERN: Pattern-WORKSPACE-001 (Per-Workspace Setup)
 * RELATED: USER_SETUP.md template, extension.ts activation
 * PERFORMANCE: <100ms setup time (non-blocking)
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Main entry point: Check if documentation exists, if not create it
 *
 * DESIGN DECISION: Idempotent setup (safe to call multiple times)
 * WHY: Runs on extension activate AND workspace folder changes - must not duplicate
 */
export async function checkAndSetupUserDocumentation(context: vscode.ExtensionContext): Promise<void> {
    try {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            console.log('[ÆtherLight First-Run] No workspace folder open - skipping setup');
            return;
        }

        const vscodeDir = path.join(workspaceRoot, '.vscode');
        const aetherlightDocPath = path.join(vscodeDir, 'aetherlight.md');

        // If aetherlight.md already exists, skip setup
        if (fs.existsSync(aetherlightDocPath)) {
            console.log('[ÆtherLight First-Run] Documentation already exists - skipping setup');
            return;
        }

        console.log('[ÆtherLight First-Run] Setting up documentation for new workspace...');

        // Create .vscode/ directory if needed
        if (!fs.existsSync(vscodeDir)) {
            fs.mkdirSync(vscodeDir, { recursive: true });
        }

        // Copy template to .vscode/aetherlight.md
        const templatePath = path.join(context.extensionPath, 'templates', 'USER_SETUP.md');

        if (!fs.existsSync(templatePath)) {
            console.error('[ÆtherLight First-Run] Template not found:', templatePath);
            vscode.window.showErrorMessage('ÆtherLight: Setup template not found. Please reinstall extension.');
            return;
        }

        const templateContent = fs.readFileSync(templatePath, 'utf-8');
        fs.writeFileSync(aetherlightDocPath, templateContent, 'utf-8');
        console.log('[ÆtherLight First-Run] Created .vscode/aetherlight.md');

        // Add reference in settings.json
        await addToSettings(vscodeDir);

        // Append to existing CLAUDE.md if exists
        await appendToClaude(workspaceRoot, aetherlightDocPath);

        // Create example sprint
        await createExampleSprint(workspaceRoot);

        // Show welcome notification
        const result = await vscode.window.showInformationMessage(
            '🚀 ÆtherLight installed! Documentation: .vscode/aetherlight.md',
            'View Documentation',
            'Create Sprint'
        );

        if (result === 'View Documentation') {
            const docUri = vscode.Uri.file(aetherlightDocPath);
            await vscode.window.showTextDocument(docUri);
        } else if (result === 'Create Sprint') {
            const sprintPath = path.join(workspaceRoot, 'sprints', 'ACTIVE_SPRINT.toml');
            if (fs.existsSync(sprintPath)) {
                const sprintUri = vscode.Uri.file(sprintPath);
                await vscode.window.showTextDocument(sprintUri);
            }
        }

        console.log('[ÆtherLight First-Run] Setup complete ✅');

    } catch (error) {
        console.error('[ÆtherLight First-Run] Setup failed:', error);
        vscode.window.showErrorMessage(`ÆtherLight setup failed: ${error}`);
    }
}

/**
 * Add ÆtherLight configuration to .vscode/settings.json
 *
 * DESIGN DECISION: Add comments to settings.json for discoverability
 * WHY: Claude Code reads settings.json - comments help it understand what to do
 */
async function addToSettings(vscodeDir: string): Promise<void> {
    const settingsPath = path.join(vscodeDir, 'settings.json');
    let settings: any = {};

    // Read existing settings if file exists
    if (fs.existsSync(settingsPath)) {
        try {
            const content = fs.readFileSync(settingsPath, 'utf-8');
            // Remove comments before parsing (JSON doesn't support comments officially)
            const jsonContent = content
                .replace(/\/\/.*$/gm, '') // Remove single-line comments
                .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments

            settings = JSON.parse(jsonContent);
        } catch (error) {
            console.warn('[ÆtherLight First-Run] Could not parse existing settings.json:', error);
            // Continue with empty settings object
        }
    }

    // Add ÆtherLight settings if not present
    if (!settings['aetherlight.documentation']) {
        settings['aetherlight.documentation'] = '.vscode/aetherlight.md';
        settings['aetherlight.sprintFile'] = 'sprints/ACTIVE_SPRINT.toml';
        settings['aetherlight.enforcementEnabled'] = true;

        // Write settings with helpful comment
        const settingsJson = JSON.stringify(settings, null, 2);
        const withComment = `// ÆtherLight Extension Configuration
// IMPORTANT: Claude Code should read .vscode/aetherlight.md for operational structure
// Sprint tasks: sprints/ACTIVE_SPRINT.toml (each task includes 'prompt' field with full context)
${settingsJson}`;

        fs.writeFileSync(settingsPath, withComment, 'utf-8');
        console.log('[ÆtherLight First-Run] Updated .vscode/settings.json');
    }
}

/**
 * Append ÆtherLight reference to existing CLAUDE.md
 *
 * DESIGN DECISION: APPEND, don't overwrite
 * WHY: User may have existing Claude instructions - we enhance, not destroy
 */
async function appendToClaude(workspaceRoot: string, aetherlightDocPath: string): Promise<void> {
    const claudePath = path.join(workspaceRoot, 'CLAUDE.md');

    if (!fs.existsSync(claudePath)) {
        console.log('[ÆtherLight First-Run] No CLAUDE.md found - skipping append');
        return; // Don't create if doesn't exist
    }

    let claudeContent = fs.readFileSync(claudePath, 'utf-8');

    // Check if we already added ÆtherLight section
    if (claudeContent.includes('## ÆtherLight Extension')) {
        console.log('[ÆtherLight First-Run] CLAUDE.md already has ÆtherLight section - skipping');
        return; // Already added
    }

    // Append ÆtherLight section
    const appendSection = `

---

## ÆtherLight Extension

**ÆtherLight voice-powered development extension is installed.**

**IMPORTANT:** Full documentation in \`.vscode/aetherlight.md\` - READ THIS FILE for:
- Sprint management (ACTIVE_SPRINT.toml format with \`prompt\` field per task)
- Keyboard shortcuts (backtick \` opens Voice Panel, Ctrl+\` for voice)
- Task execution workflow
- Operational structure and enforcement rules

**Sprint Tasks:** See \`sprints/ACTIVE_SPRINT.toml\` for active tasks
- Each task includes \`prompt\` field with full implementation context
- Use Sprint Tab in Voice Panel to view tasks

**Critical:** If you skip reading .vscode/aetherlight.md or ignore enforcement rules, the system fails.
`;

    claudeContent += appendSection;
    fs.writeFileSync(claudePath, claudeContent, 'utf-8');
    console.log('[ÆtherLight First-Run] Appended ÆtherLight section to CLAUDE.md');
}

/**
 * Create example sprint file with proper prompt fields
 *
 * DESIGN DECISION: Include both Chain of Thought AND practical details
 * WHY: Users need to see what good prompts look like
 */
async function createExampleSprint(workspaceRoot: string): Promise<void> {
    const sprintsDir = path.join(workspaceRoot, 'sprints');
    const sprintPath = path.join(sprintsDir, 'ACTIVE_SPRINT.toml');

    if (fs.existsSync(sprintPath)) {
        console.log('[ÆtherLight First-Run] Sprint file already exists - skipping');
        return; // Don't overwrite existing
    }

    if (!fs.existsSync(sprintsDir)) {
        fs.mkdirSync(sprintsDir, { recursive: true });
    }

    const today = new Date().toISOString().split('T')[0];
    const nextWeek = getDatePlusDays(7);

    const exampleSprint = `# ÆtherLight Sprint File
# CRITICAL: Each task must include "prompt" field with full implementation context

sprint_name = "Getting Started with ÆtherLight"
start_date = "${today}"
end_date = "${nextWeek}"

[tasks.SETUP-001]
id = "SETUP-001"
name = "Explore ÆtherLight Voice Panel"
prompt = """
DESIGN DECISION: Familiarize user with Voice Panel as central ÆtherLight interface
WHY: Voice Panel is the main UI for all features - must understand it first

REASONING CHAIN:
1. User just installed ÆtherLight extension
2. Need to understand what features are available before using them
3. Voice Panel contains 6 tabs (Voice, Sprint, Chat, History, Patterns, Settings)
4. Sprint Tab shows this task list (meta: task displaying itself)
5. Exploration → Understanding → Effective usage

Context (CRITICAL - Include all of these):
- This is your first time using ÆtherLight
- Voice Panel is the main UI for all ÆtherLight features
- Sprint Tab reads from sprints/ACTIVE_SPRINT.toml (this file)
- Backtick hotkey is fastest way to access ÆtherLight

Steps:
1. Press backtick (\`) key to open Voice Panel in VS Code sidebar
2. Explore each tab: Voice, Sprint, Chat, History, Patterns, Settings
3. Click on Sprint Tab to see this task list
4. Verify Voice Panel opens and displays correctly

Success criteria:
- Voice Panel opens when backtick pressed
- All 6 tabs are visible and clickable
- Sprint Tab shows this task (SETUP-001) ← You're looking at this right now!
- No console errors in VS Code Developer Tools

PATTERN: Pattern-ONBOARDING-001 (Guided exploration of new interface)
"""
status = "pending"
priority = "high"
estimated_hours = 0.5
dependencies = []

[tasks.SETUP-002]
id = "SETUP-002"
name = "Create Your First Real Task"
prompt = """
DESIGN DECISION: Learn by doing - create a task that solves a real problem in your project
WHY: Example tasks are fine for learning, but real value comes from using ÆtherLight on actual work

REASONING CHAIN:
1. You've explored Voice Panel and understand the interface
2. You've seen what a good task prompt looks like (SETUP-001)
3. Now apply that knowledge to your own project
4. Create a task with detailed prompt following the template
5. Let Claude execute it to see ÆtherLight in action

Context (CRITICAL):
- You now understand how tasks work in ACTIVE_SPRINT.toml
- Each task needs: id, name, prompt (with full context), status, priority, estimated_hours
- Prompts should include: tech stack, file paths, steps, success criteria
- Sprint Tab will show your new task once you save this file

Steps:
1. Think of a real task in your project (feature, bug fix, refactor)
2. Open sprints/ACTIVE_SPRINT.toml in editor
3. Add a new [tasks.YOUR-ID] section below SETUP-002
4. Write a detailed prompt following SETUP-001 example
5. Include: Context, Steps, Success criteria, Tech stack
6. Save file and refresh Sprint Tab to see it

Success criteria:
- New task appears in Sprint Tab
- Prompt includes all required context
- Task is specific enough that Claude could execute it without questions
- You feel confident the prompt has everything needed

Example task structure:
[tasks.FEAT-001]
id = "FEAT-001"
name = "Your task name here"
prompt = \"\"\"
[Your detailed prompt here with context, steps, success criteria]
\"\"\"
status = "pending"
priority = "medium"
estimated_hours = 2.0
dependencies = []

PATTERN: Pattern-SPRINT-001 (Task-based development workflow)
"""
status = "pending"
priority = "medium"
estimated_hours = 1.0
dependencies = ["SETUP-001"]

[tasks.SETUP-003]
id = "SETUP-003"
name = "Test Voice Capture (Optional)"
prompt = """
DESIGN DECISION: Optional voice testing - requires desktop app
WHY: Voice capture is powerful but requires separate desktop app install

REASONING CHAIN:
1. ÆtherLight supports voice input via Ctrl+\` hotkey
2. Requires desktop app running in background (not installed by default)
3. If no desktop app: Skip this task, all other features work fine
4. If desktop app installed: Test voice capture to speed up workflow

Context (CRITICAL):
- Desktop app: Separate download from GitHub releases
- Runs in system tray (Mac/Windows)
- Uses OpenAI Whisper for transcription
- Hotkey: Ctrl+\` (Control + backtick)
- Works with or without desktop app (voice is optional)

Steps (if desktop app installed):
1. Verify desktop app is running (check system tray)
2. Open Voice Panel (backtick key)
3. Click Voice Tab
4. Press Ctrl+\` to start recording
5. Speak: "Create a function to validate email addresses"
6. Press Ctrl+\` to stop recording
7. Wait for transcription to appear
8. Verify transcription is accurate

Steps (if NO desktop app):
1. Skip this task
2. ÆtherLight works perfectly without voice capture
3. Use Sprint Tab, typing in Chat Tab, all other features
4. Desktop app optional (for voice convenience)

Success criteria (if testing voice):
- Ctrl+\` starts recording
- Microphone picks up voice
- Transcription appears in Voice Tab
- Transcription is accurate
- Can copy transcription to use as prompt

Success criteria (if skipping):
- Understand voice is optional
- Know how to install desktop app if wanted later
- Confident using ÆtherLight without voice

PATTERN: Pattern-VOICE-001 (Voice-to-text workflow)
RELATED: Desktop app installation guide (GitHub releases)
"""
status = "pending"
priority = "low"
estimated_hours = 0.5
dependencies = ["SETUP-001"]
`;

    fs.writeFileSync(sprintPath, exampleSprint, 'utf-8');
    console.log('[ÆtherLight First-Run] Created sprints/ACTIVE_SPRINT.toml');
}

/**
 * Helper: Calculate date N days from today
 */
function getDatePlusDays(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}
