/**
 * SprintRenderer: Renders sprint tasks as HTML for Voice Panel
 *
 * DESIGN DECISION: Separate rendering logic from loading logic
 * WHY: SprintLoader handles TOML parsing, SprintRenderer handles HTML generation
 *
 * REASONING CHAIN:
 * 1. SprintLoader loads and parses TOML (< 5ms)
 * 2. SprintRenderer receives SprintTask[] array
 * 3. Group tasks by phase
 * 4. Render task cards with status icons
 * 5. Add click handlers for task details
 * 6. Result: Clean separation of concerns, testable rendering
 *
 * PATTERN: Pattern-SPRINT-001 (Sprint System with TOML Source of Truth)
 * PATTERN: Pattern-UI-006 (Tabbed Multi-Feature Sidebar)
 * RELATED: SprintLoader.ts, voicePanel.ts, TabManager.ts
 */

import { SprintTask, SprintMetadata, TaskStatus } from './SprintLoader';

export interface RenderOptions {
    showCompleted?: boolean;  // Show completed tasks (default: false for performance)
    filterByEngineer?: string;  // Filter by engineer ID (default: 'all')
    filterByPhase?: string;  // Filter by phase name (default: all phases)
    groupBy?: 'phase' | 'status' | 'engineer';  // Grouping strategy (default: 'phase')
    highlightTaskId?: string;  // Highlight specific task (default: none)
}

export class SprintRenderer {
    /**
     * Render sprint tasks as HTML
     *
     * @param tasks - Array of sprint tasks from SprintLoader
     * @param metadata - Sprint metadata (name, version, etc.)
     * @param options - Rendering options (filtering, grouping)
     * @returns HTML string for WebView
     */
    public renderSprintTasks(
        tasks: SprintTask[],
        metadata: SprintMetadata | null,
        options: RenderOptions = {}
    ): string {
        const {
            showCompleted = false,
            filterByEngineer = 'all',
            filterByPhase = 'all',
            groupBy = 'phase',
            highlightTaskId = ''
        } = options;

        // Filter tasks
        let filteredTasks = tasks;

        if (!showCompleted) {
            filteredTasks = filteredTasks.filter(task => task.status !== 'completed');
        }

        if (filterByEngineer !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.assigned_engineer === filterByEngineer);
        }

        if (filterByPhase !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.phase === filterByPhase);
        }

        // Generate HTML
        let html = '';

        // Header
        if (metadata) {
            html += this.renderSprintHeader(metadata, tasks);
        }

        // Filter controls
        html += this.renderFilterControls(tasks, options);

        // Task groups
        if (groupBy === 'phase') {
            html += this.renderTasksByPhase(filteredTasks, highlightTaskId);
        } else if (groupBy === 'status') {
            html += this.renderTasksByStatus(filteredTasks, highlightTaskId);
        } else if (groupBy === 'engineer') {
            html += this.renderTasksByEngineer(filteredTasks, highlightTaskId);
        }

        return html;
    }

    /**
     * Render sprint header with metadata
     */
    private renderSprintHeader(metadata: SprintMetadata, allTasks: SprintTask[]): string {
        const completedCount = allTasks.filter(t => t.status === 'completed').length;
        const inProgressCount = allTasks.filter(t => t.status === 'in_progress').length;
        const pendingCount = allTasks.filter(t => t.status === 'pending').length;
        const totalCount = allTasks.length;
        const percentComplete = Math.round((completedCount / totalCount) * 100);

        return `
            <div class="sprint-header">
                <h2>${this.escapeHtml(metadata.sprint_name)}</h2>
                <div class="sprint-meta">
                    <span class="sprint-version">v${this.escapeHtml(metadata.version)}</span>
                    <span class="sprint-status status-${metadata.status}">${this.escapeHtml(metadata.status || 'active')}</span>
                    <span class="sprint-priority priority-${metadata.priority}">${this.escapeHtml(metadata.priority)}</span>
                </div>
                <div class="sprint-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentComplete}%"></div>
                    </div>
                    <div class="progress-stats">
                        <span class="stat-completed">${completedCount} completed</span>
                        <span class="stat-in-progress">${inProgressCount} in progress</span>
                        <span class="stat-pending">${pendingCount} pending</span>
                        <span class="stat-total">${totalCount} total (${percentComplete}%)</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render filter controls
     */
    private renderFilterControls(tasks: SprintTask[], options: RenderOptions): string {
        // Get unique phases
        const phases = ['all', ...new Set(tasks.map(t => t.phase))];

        // Get unique engineers
        const engineers = ['all', ...new Set(tasks.map(t => t.assigned_engineer))];

        return `
            <div class="sprint-filters">
                <label>
                    <input type="checkbox" id="showCompleted" ${options.showCompleted ? 'checked' : ''}>
                    Show Completed
                </label>
                <select id="filterPhase" value="${options.filterByPhase || 'all'}">
                    ${phases.map(phase => `<option value="${phase}">${phase}</option>`).join('')}
                </select>
                <select id="filterEngineer" value="${options.filterByEngineer || 'all'}">
                    ${engineers.map(eng => `<option value="${eng}">${eng}</option>`).join('')}
                </select>
                <select id="groupBy" value="${options.groupBy || 'phase'}">
                    <option value="phase">Group by Phase</option>
                    <option value="status">Group by Status</option>
                    <option value="engineer">Group by Engineer</option>
                </select>
            </div>
        `;
    }

    /**
     * Render tasks grouped by phase
     */
    private renderTasksByPhase(tasks: SprintTask[], highlightTaskId: string): string {
        const phases = new Map<string, SprintTask[]>();

        // Group tasks by phase
        tasks.forEach(task => {
            if (!phases.has(task.phase)) {
                phases.set(task.phase, []);
            }
            phases.get(task.phase)!.push(task);
        });

        let html = '<div class="sprint-tasks">';

        phases.forEach((phaseTasks, phaseName) => {
            const completedCount = phaseTasks.filter(t => t.status === 'completed').length;

            html += `
                <div class="phase-section">
                    <h3 class="phase-header">
                        ${this.escapeHtml(phaseName)}
                        <span class="phase-count">(${completedCount}/${phaseTasks.length} complete)</span>
                    </h3>
                    <div class="phase-tasks">
                        ${phaseTasks.map(task => this.renderTaskCard(task, highlightTaskId)).join('')}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    /**
     * Render tasks grouped by status
     */
    private renderTasksByStatus(tasks: SprintTask[], highlightTaskId: string): string {
        const byStatus = {
            in_progress: tasks.filter(t => t.status === 'in_progress'),
            pending: tasks.filter(t => t.status === 'pending'),
            completed: tasks.filter(t => t.status === 'completed')
        };

        let html = '<div class="sprint-tasks">';

        Object.entries(byStatus).forEach(([status, statusTasks]) => {
            if (statusTasks.length === 0) return;

            html += `
                <div class="status-section">
                    <h3 class="status-header status-${status}">
                        ${this.formatStatus(status as TaskStatus)}
                        <span class="status-count">(${statusTasks.length})</span>
                    </h3>
                    <div class="status-tasks">
                        ${statusTasks.map(task => this.renderTaskCard(task, highlightTaskId)).join('')}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    /**
     * Render tasks grouped by engineer
     */
    private renderTasksByEngineer(tasks: SprintTask[], highlightTaskId: string): string {
        const engineers = new Map<string, SprintTask[]>();

        tasks.forEach(task => {
            if (!engineers.has(task.assigned_engineer)) {
                engineers.set(task.assigned_engineer, []);
            }
            engineers.get(task.assigned_engineer)!.push(task);
        });

        let html = '<div class="sprint-tasks">';

        engineers.forEach((engineerTasks, engineerId) => {
            const completedCount = engineerTasks.filter(t => t.status === 'completed').length;

            html += `
                <div class="engineer-section">
                    <h3 class="engineer-header">
                        ${this.escapeHtml(engineerId)}
                        <span class="engineer-count">(${completedCount}/${engineerTasks.length} complete)</span>
                    </h3>
                    <div class="engineer-tasks">
                        ${engineerTasks.map(task => this.renderTaskCard(task, highlightTaskId)).join('')}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    /**
     * Render individual task card
     */
    private renderTaskCard(task: SprintTask, highlightTaskId: string): string {
        const isHighlighted = task.id === highlightTaskId;
        const statusClass = `status-${task.status}`;
        const statusIcon = this.getStatusIcon(task.status);
        const hasPatterns = task.patterns && task.patterns.length > 0;
        const hasDependencies = task.dependencies && task.dependencies.length > 0;

        return `
            <div class="task-card ${statusClass} ${isHighlighted ? 'highlighted' : ''}" data-task-id="${task.id}">
                <div class="task-header">
                    <span class="task-icon">${statusIcon}</span>
                    <span class="task-id">${this.escapeHtml(task.id)}</span>
                    <span class="task-status-badge">${this.formatStatus(task.status)}</span>
                </div>
                <div class="task-title">${this.escapeHtml(task.name)}</div>
                <div class="task-description">${this.escapeHtml(task.description)}</div>
                <div class="task-meta">
                    <span class="meta-item">
                        <span class="codicon codicon-clock"></span>
                        ${this.escapeHtml(task.estimated_time)}
                    </span>
                    <span class="meta-item">
                        <span class="codicon codicon-person"></span>
                        ${this.escapeHtml(task.agent)}
                    </span>
                    ${hasDependencies ? `
                        <span class="meta-item">
                            <span class="codicon codicon-link"></span>
                            ${task.dependencies.length} dep(s)
                        </span>
                    ` : ''}
                    ${hasPatterns ? `
                        <span class="meta-item">
                            <span class="codicon codicon-library"></span>
                            ${task.patterns!.length} pattern(s)
                        </span>
                    ` : ''}
                </div>
                <div class="task-actions">
                    <button class="task-button" onclick="viewTaskDetails('${task.id}')">
                        View Details
                    </button>
                    ${task.status === 'pending' ? `
                        <button class="task-button task-button-primary" onclick="startTask('${task.id}')">
                            Start Task
                        </button>
                    ` : ''}
                    ${task.status === 'in_progress' ? `
                        <button class="task-button task-button-success" onclick="completeTask('${task.id}')">
                            Mark Complete
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Get status icon (emoji or codicon)
     */
    private getStatusIcon(status: TaskStatus): string {
        switch (status) {
            case 'pending': return '⏸️';
            case 'in_progress': return '▶️';
            case 'completed': return '✅';
            default: return '❓';
        }
    }

    /**
     * Format status as readable text
     */
    private formatStatus(status: TaskStatus): string {
        switch (status) {
            case 'pending': return 'Pending';
            case 'in_progress': return 'In Progress';
            case 'completed': return 'Completed';
            default: return 'Unknown';
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    private escapeHtml(unsafe: string): string {
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Render task details (full view)
     */
    public renderTaskDetails(task: SprintTask): string {
        return `
            <div class="task-details">
                <div class="task-details-header">
                    <h2>${this.escapeHtml(task.id)}: ${this.escapeHtml(task.name)}</h2>
                    <span class="task-status-badge status-${task.status}">${this.formatStatus(task.status)}</span>
                </div>

                <div class="task-details-section">
                    <h3>Description</h3>
                    <p>${this.escapeHtml(task.description)}</p>
                </div>

                ${task.why ? `
                    <div class="task-details-section">
                        <h3>Why (Business Justification)</h3>
                        <p>${this.escapeHtml(task.why)}</p>
                    </div>
                ` : ''}

                ${task.context ? `
                    <div class="task-details-section">
                        <h3>Context</h3>
                        <p>${this.escapeHtml(task.context)}</p>
                    </div>
                ` : ''}

                ${task.reasoning_chain && task.reasoning_chain.length > 0 ? `
                    <div class="task-details-section">
                        <h3>Reasoning Chain</h3>
                        <ol>
                            ${task.reasoning_chain.map(step => `<li>${this.escapeHtml(step)}</li>`).join('')}
                        </ol>
                    </div>
                ` : ''}

                ${task.deliverables && task.deliverables.length > 0 ? `
                    <div class="task-details-section">
                        <h3>Deliverables</h3>
                        <ul>
                            ${task.deliverables.map(d => `<li>${this.escapeHtml(d)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${task.validation_criteria && task.validation_criteria.length > 0 ? `
                    <div class="task-details-section">
                        <h3>Validation Criteria</h3>
                        <ul>
                            ${task.validation_criteria.map(c => `<li>${this.escapeHtml(c)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${task.patterns && task.patterns.length > 0 ? `
                    <div class="task-details-section">
                        <h3>Patterns</h3>
                        ${task.pattern_context ? `
                            <pre class="pattern-context">${this.escapeHtml(task.pattern_context)}</pre>
                        ` : `
                            <ul>
                                ${task.patterns.map(p => `<li><code>${this.escapeHtml(p)}</code></li>`).join('')}
                            </ul>
                        `}
                    </div>
                ` : ''}

                ${task.enhanced_prompt ? `
                    <div class="task-details-section">
                        <h3>📋 Enhanced Prompt</h3>
                        <div class="enhanced-prompt-info">
                            <p class="enhanced-prompt-path">
                                <span class="codicon codicon-file-text"></span>
                                <code>${this.escapeHtml(task.enhanced_prompt)}</code>
                            </p>
                            ${task.template ? `
                                <p class="template-info">
                                    <span class="codicon codicon-symbol-class"></span>
                                    Template: <code>${this.escapeHtml(task.template)}</code>
                                </p>
                            ` : ''}
                            <p class="enhanced-prompt-description">
                                Comprehensive implementation guide with context, validation, TDD steps, and acceptance criteria.
                            </p>
                            <button class="task-button task-button-secondary" onclick="openEnhancedPrompt('${this.escapeHtml(task.enhanced_prompt)}')">
                                <span class="codicon codicon-file-text"></span>
                                Open Enhanced Prompt
                            </button>
                        </div>
                    </div>
                ` : ''}

                ${task.dependencies && task.dependencies.length > 0 ? `
                    <div class="task-details-section">
                        <h3>Dependencies</h3>
                        <p>This task depends on:</p>
                        <ul>
                            ${task.dependencies.map(dep => `<li><code>${this.escapeHtml(dep)}</code></li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${task.files_to_modify && task.files_to_modify.length > 0 ? `
                    <div class="task-details-section">
                        <h3>Files to Modify</h3>
                        <ul>
                            ${task.files_to_modify.map(f => `<li><code>${this.escapeHtml(f)}</code></li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${task.success_impact ? `
                    <div class="task-details-section">
                        <h3>Success Impact</h3>
                        <p>${this.escapeHtml(task.success_impact)}</p>
                    </div>
                ` : ''}

                <div class="task-details-meta">
                    <p><strong>Estimated Time:</strong> ${this.escapeHtml(task.estimated_time)}</p>
                    <p><strong>Estimated Lines:</strong> ${task.estimated_lines}</p>
                    <p><strong>Agent:</strong> ${this.escapeHtml(task.agent)}</p>
                    <p><strong>Assigned Engineer:</strong> ${this.escapeHtml(task.assigned_engineer)}</p>
                    ${task.performance_target ? `<p><strong>Performance Target:</strong> ${this.escapeHtml(task.performance_target)}</p>` : ''}
                </div>

                <div class="task-details-actions">
                    <button class="task-button" onclick="closeTaskDetails()">Close</button>
                    ${task.status === 'pending' ? `
                        <button class="task-button task-button-primary" onclick="startTask('${task.id}')">
                            Start Task
                        </button>
                    ` : ''}
                    ${task.status === 'in_progress' ? `
                        <button class="task-button task-button-success" onclick="completeTask('${task.id}')">
                            Mark Complete
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
}
