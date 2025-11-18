/**
 * PromptTerminalManager
 *
 * DESIGN DECISION: Dedicated terminal for prompt enhancement workflow
 * WHY: Keep prompt engineering separate from regular terminal work
 *
 * REASONING CHAIN:
 * 1. User clicks enhancement button (Bug Report, Feature Request, etc.)
 * 2. Generate template, load into text area
 * 3. Open/focus "ÆtherLight Prompt Terminal" (reuse if exists)
 * 4. User reviews template, hits Ctrl+Enter to send to Claude Code
 * 5. Claude Code generates enhanced prompt + creates .md file
 * 6. File watcher detects .md, loads into text area
 *
 * PATTERN: Reused from voicePanel.ts:1020-1035 (ÆtherLight Claude terminal)
 * ARCHITECTURE: Singleton terminal management
 * RELATED: AutoTerminalSelector.ts, voicePanel.ts
 */

import * as vscode from 'vscode';

export class PromptTerminalManager {
    private static promptTerminal: vscode.Terminal | undefined;
    private static readonly TERMINAL_NAME = 'ÆtherLight Prompt Terminal';

    /**
     * Get or create the ÆtherLight Prompt Terminal
     *
     * PATTERN: Find-or-create singleton (from voicePanel.ts:1020-1032)
     * WHY: Single instance for all prompt enhancement work
     * REASONING: Don't clutter terminal list with multiple instances
     */
    public static getOrCreatePromptTerminal(): vscode.Terminal {
        // Check if terminal still exists (pattern from voicePanel.ts:1021)
        let terminal = vscode.window.terminals.find(
            t => t.name === this.TERMINAL_NAME
        );

        if (terminal) {
            console.log('[ÆtherLight] Reusing existing Prompt Terminal');
            this.promptTerminal = terminal;
            return terminal;
        }

        // Create new terminal (pattern from voicePanel.ts:1023-1032)
        console.log('[ÆtherLight] Creating new Prompt Terminal');
        terminal = vscode.window.createTerminal({
            name: this.TERMINAL_NAME,
            iconPath: new vscode.ThemeIcon('sparkle'),
            location: vscode.TerminalLocation.Editor // Show in main editor area
        });

        this.promptTerminal = terminal;
        return terminal;
    }

    /**
     * Show and focus the Prompt Terminal
     * WHY: Make it visible to user after generating template
     */
    public static showPromptTerminal(): void {
        const terminal = this.getOrCreatePromptTerminal();
        terminal.show(false); // Show but don't steal focus from text area
    }

    /**
     * Send welcome message to terminal
     * WHY: Guide user on what to do next
     *
     * @param templateType - Type of template (bug-report, feature-request, etc.)
     * @param templateContent - Optional: The actual template content to display
     */
    public static sendWelcomeMessage(templateType: string, templateContent?: string): void {
        const terminal = this.getOrCreatePromptTerminal();

        // Clear and show welcome
        const timestamp = new Date().toLocaleTimeString();

        terminal.sendText(`# ════════════════════════════════════════════`, true);
        terminal.sendText(`# ÆtherLight Prompt Terminal 🎨`, true);
        terminal.sendText(`# ════════════════════════════════════════════`, true);
        terminal.sendText(`echo ""`, true);
        terminal.sendText(`echo "📋 ${templateType.replace('-', ' ').toUpperCase()}"`, true);
        terminal.sendText(`echo "⏰ ${timestamp}"`, true);
        terminal.sendText(`echo ""`, true);

        // Show template content if provided
        if (templateContent) {
            terminal.sendText(`echo "════════════════════════════════════════════"`, true);
            // Display template content line by line
            const lines = templateContent.split('\n');
            for (const line of lines) {
                // Escape special characters for echo
                const escapedLine = line
                    .replace(/\\/g, '\\\\')
                    .replace(/"/g, '\\"')
                    .replace(/`/g, '\\`')
                    .replace(/\$/g, '\\$');
                terminal.sendText(`echo "${escapedLine}"`, true);
            }
            terminal.sendText(`echo "════════════════════════════════════════════"`, true);
            terminal.sendText(`echo ""`, true);
            terminal.sendText(`echo "👉 Template loaded in text area above"`, true);
            terminal.sendText(`echo "   Review and press Ctrl+Enter to send"`, true);
        } else {
            terminal.sendText(`echo "👉 NEXT STEPS:"`, true);
            terminal.sendText(`echo "   1. Review template above (in text area)"`, true);
            terminal.sendText(`echo "   2. Press Ctrl+Enter to send to Claude Code"`, true);
        }

        terminal.sendText(`echo ""`, true);
    }

    /**
     * Dispose of the Prompt Terminal
     * WHY: Cleanup when extension deactivates
     */
    public static dispose(): void {
        if (this.promptTerminal) {
            console.log('[ÆtherLight] Disposing Prompt Terminal');
            // Don't dispose - let user close manually
            this.promptTerminal = undefined;
        }
    }
}
