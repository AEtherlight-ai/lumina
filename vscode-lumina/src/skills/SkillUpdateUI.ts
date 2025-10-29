/**
 * VERSION-002: Skill Update UI
 *
 * DESIGN DECISION: WebView panel showing skill updates with Accept/Merge/Deny options
 * WHY: Users need control over skill updates to avoid breaking workflows
 * PATTERN: Pattern-UI-006 (Tabbed Multi-Feature Sidebar)
 */

import * as vscode from 'vscode';
import { SkillUpdate, UpdateCheckResult } from './SkillUpdateManager';

/**
 * Generate HTML for skill updates panel
 *
 * REASONING: Show updates in Skills Management tab (📦 icon)
 * ACTIONS: Accept (overwrite), Merge (3-way), Deny (ignore), View Diff
 */
export function getSkillUpdatesHTML(updateResult: UpdateCheckResult): string {
    if (!updateResult.hasUpdates) {
        return getNoUpdatesHTML();
    }

    return `
    <div class="skill-updates-panel">
        <div class="updates-header">
            <h2>📦 Skill Updates Available</h2>
            <p class="updates-subtitle">${updateResult.updates.length} skill${updateResult.updates.length > 1 ? 's' : ''} have updates</p>
        </div>

        <div class="updates-list">
            ${updateResult.updates.map(update => getUpdateItemHTML(update)).join('')}
        </div>

        ${updateResult.errors.length > 0 ? `
        <div class="updates-errors">
            <h3>⚠️ Errors</h3>
            <ul>
                ${updateResult.errors.map(error => `<li>${escapeHtml(error)}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
    </div>
    `;
}

/**
 * Generate HTML for single update item
 */
function getUpdateItemHTML(update: SkillUpdate): string {
    const breakingBadge = update.isBreaking ? '<span class="badge badge-breaking">BREAKING</span>' : '';

    return `
    <div class="update-item" data-skill="${escapeHtml(update.skillName)}">
        <div class="update-header">
            <div class="update-title">
                <h3>${escapeHtml(update.skillName)}</h3>
                <span class="version-badge">
                    ${escapeHtml(update.currentVersion)} → ${escapeHtml(update.latestVersion)}
                </span>
                ${breakingBadge}
            </div>
        </div>

        <div class="update-changes">
            <h4>Changes:</h4>
            <ul>
                ${update.changes.map(change => `<li>${escapeHtml(change)}</li>`).join('')}
            </ul>
        </div>

        ${update.isBreaking ? `
        <div class="update-warning">
            <strong>⚠️ Breaking Change:</strong> This update may change skill behavior. Review carefully before accepting.
        </div>
        ` : ''}

        <div class="update-actions">
            <button class="update-button accept" onclick="acceptUpdate('${escapeHtml(update.skillName)}')">
                ✅ Accept Update
            </button>
            <button class="update-button merge" onclick="mergeUpdate('${escapeHtml(update.skillName)}')">
                🔀 Merge & Review
            </button>
            <button class="update-button deny" onclick="denyUpdate('${escapeHtml(update.skillName)}')">
                ❌ Deny Update
            </button>
            <button class="update-button view-diff" onclick="viewDiff('${escapeHtml(update.skillName)}')">
                👁️ View Diff
            </button>
        </div>

        <div class="update-footer">
            <a href="${escapeHtml(update.downloadUrl)}" target="_blank">View on GitHub →</a>
        </div>
    </div>
    `;
}

/**
 * Generate HTML when no updates available
 */
function getNoUpdatesHTML(): string {
    return `
    <div class="skill-updates-panel no-updates">
        <div class="updates-header">
            <h2>📦 Skill Management</h2>
            <p class="updates-subtitle">All skills are up to date!</p>
        </div>

        <div class="no-updates-content">
            <div class="no-updates-icon">✅</div>
            <h3>Your skills are current</h3>
            <p>We'll notify you when updates are available.</p>
        </div>

        <div class="skills-info">
            <h4>Installed Skills</h4>
            <p>Skills are located in <code>.claude/skills/</code></p>
            <p>You can customize skills or create new ones following the same structure.</p>
        </div>
    </div>
    `;
}

/**
 * Get CSS styles for skill updates panel
 */
export function getSkillUpdatesStyles(): string {
    return `
    /* VERSION-002: Skill Updates Panel Styling */
    .skill-updates-panel {
        padding: 16px;
        max-width: 900px;
    }

    .updates-header {
        margin-bottom: 24px;
        border-bottom: 1px solid var(--vscode-panel-border);
        padding-bottom: 12px;
    }

    .updates-header h2 {
        margin: 0 0 8px 0;
        color: var(--vscode-foreground);
    }

    .updates-subtitle {
        margin: 0;
        color: var(--vscode-descriptionForeground);
        font-size: 13px;
    }

    .updates-list {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .update-item {
        padding: 16px;
        background-color: var(--vscode-sideBar-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 6px;
    }

    .update-header {
        margin-bottom: 12px;
    }

    .update-title {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
    }

    .update-title h3 {
        margin: 0;
        font-size: 16px;
        color: var(--vscode-foreground);
    }

    .version-badge {
        display: inline-block;
        padding: 4px 8px;
        background-color: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        border-radius: 3px;
        font-size: 12px;
        font-weight: 600;
        font-family: var(--vscode-editor-font-family);
    }

    .badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 3px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
    }

    .badge-breaking {
        background-color: #d13438;
        color: white;
    }

    .update-changes {
        margin-bottom: 12px;
    }

    .update-changes h4 {
        margin: 0 0 8px 0;
        font-size: 13px;
        color: var(--vscode-foreground);
    }

    .update-changes ul {
        margin: 0;
        padding-left: 20px;
        list-style-type: none;
    }

    .update-changes li {
        margin-bottom: 4px;
        font-size: 13px;
        color: var(--vscode-descriptionForeground);
    }

    .update-changes li::before {
        content: "• ";
        margin-right: 6px;
    }

    .update-warning {
        padding: 12px;
        margin-bottom: 12px;
        background-color: rgba(209, 52, 56, 0.1);
        border-left: 3px solid #d13438;
        border-radius: 3px;
        font-size: 12px;
    }

    .update-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 12px;
    }

    .update-button {
        padding: 6px 12px;
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
    }

    .update-button:hover {
        background-color: var(--vscode-button-hoverBackground);
        transform: scale(1.02);
    }

    .update-button.accept {
        background-color: #28a745;
        color: white;
    }

    .update-button.accept:hover {
        background-color: #218838;
    }

    .update-button.merge {
        background-color: #0078D4;
        color: white;
    }

    .update-button.merge:hover {
        background-color: #005a9e;
    }

    .update-button.deny {
        background-color: transparent;
        border: 1px solid var(--vscode-button-border);
    }

    .update-button.view-diff {
        background-color: transparent;
        border: 1px solid var(--vscode-button-border);
    }

    .update-footer {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
    }

    .update-footer a {
        color: var(--vscode-textLink-foreground);
        text-decoration: none;
    }

    .update-footer a:hover {
        text-decoration: underline;
    }

    /* No updates state */
    .no-updates-content {
        text-align: center;
        padding: 40px 20px;
    }

    .no-updates-icon {
        font-size: 64px;
        margin-bottom: 16px;
    }

    .no-updates-content h3 {
        margin: 0 0 8px 0;
        color: var(--vscode-foreground);
    }

    .no-updates-content p {
        margin: 0;
        color: var(--vscode-descriptionForeground);
    }

    .skills-info {
        margin-top: 32px;
        padding: 16px;
        background-color: var(--vscode-sideBar-background);
        border-radius: 4px;
    }

    .skills-info h4 {
        margin: 0 0 12px 0;
        color: var(--vscode-foreground);
    }

    .skills-info p {
        margin: 0 0 8px 0;
        font-size: 13px;
        color: var(--vscode-descriptionForeground);
    }

    .skills-info code {
        padding: 2px 6px;
        background-color: var(--vscode-textCodeBlock-background);
        border-radius: 3px;
        font-family: var(--vscode-editor-font-family);
        font-size: 12px;
    }

    .updates-errors {
        margin-top: 20px;
        padding: 16px;
        background-color: rgba(209, 52, 56, 0.1);
        border-left: 3px solid #d13438;
        border-radius: 3px;
    }

    .updates-errors h3 {
        margin: 0 0 12px 0;
        color: #d13438;
        font-size: 14px;
    }

    .updates-errors ul {
        margin: 0;
        padding-left: 20px;
    }

    .updates-errors li {
        margin-bottom: 4px;
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
    }
    `;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
