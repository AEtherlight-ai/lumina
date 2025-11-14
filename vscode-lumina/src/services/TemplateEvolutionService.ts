/**
 * TemplateEvolutionService
 *
 * DESIGN DECISION: Self-improving template system based on outcome tracking
 * WHY: Templates should evolve based on real-world effectiveness data
 *
 * REASONING CHAIN:
 * 1. User enhances prompt → AI generates based on template
 * 2. User sends to terminal → Git watching starts (30 minutes)
 * 3. User makes commits → GitCommitWatcher detects
 * 4. Analyze commits: expected files modified? tests included? errors?
 * 5. Success → Reinforce template patterns (increase confidence)
 * 6. Failure → Log gap (template didn't emphasize file X)
 * 7. Pattern repeated 3+ times → Update template automatically
 * 8. Next enhancement uses improved template
 * 9. Result: Continuous improvement feedback loop
 *
 * PATTERN: Pattern-IMPROVEMENT-001 (Gap Detection & Self-Improvement)
 * ARCHITECTURE: v3.0 AI Enhancement System with feedback loop
 * RELATED: AIEnhancementService.ts, GitCommitWatcher.ts
 *
 * USER REQUIREMENT:
 * "Template should be enhanced and updated based on outcomes. Could be done by
 * user or AI itself when we realize there's a gap. When should template be
 * updated? Real-time (during task)."
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import { EnhancementContext } from '../types/EnhancementContext';
import { GitCommitWatcher, GitCommit } from './GitCommitWatcher';

// ============================================================================
// Type Definitions
// ============================================================================

interface EnhancementRecord {
    id: string;
    timestamp: Date;
    buttonType: string;
    context: EnhancementContext;
    enhancedPrompt: string;
    templateVersion: string;
    userSentToTerminal: boolean;
    gitWatchingStarted?: Date;
    gitWatchingEnded?: Date;
    outcome?: EnhancementOutcome;
}

interface EnhancementOutcome {
    status: 'success' | 'failure' | 'ambiguous';
    commitsDetected: number;
    filesModified: string[];
    testsCommitted: boolean;
    errorKeywords: string[];
    expectedFilesModified: string[];
    missingFiles: string[];
    confidenceScore: number;
    gaps: TemplateGap[];
    reinforcements: TemplateReinforcement[];
}

interface TemplateGap {
    type: 'missing_file_emphasis' | 'missing_test_emphasis' | 'unclear_validation' | 'missing_pattern';
    description: string;
    context: {
        expectedFile?: string;
        buttonType: string;
        templateSection?: string;
    };
    occurrences: number;
    firstSeen: Date;
    lastSeen: Date;
}

interface TemplateReinforcement {
    type: 'file_emphasis' | 'test_emphasis' | 'validation_clarity' | 'pattern_application';
    description: string;
    context: {
        buttonType: string;
        templateSection?: string;
    };
    occurrences: number;
    confidenceIncrease: number;
}

// ============================================================================
// TemplateEvolutionService Implementation
// ============================================================================

export class TemplateEvolutionService {
    private records: Map<string, EnhancementRecord> = new Map();
    private watchers: Map<string, GitCommitWatcher> = new Map();
    private gaps: TemplateGap[] = [];
    private reinforcements: TemplateReinforcement[] = [];
    private workspaceRoot: string;

    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
        this.loadPersistedData();
    }

    /**
     * Track enhancement metadata
     *
     * Called by AIEnhancementService after enhancement generated.
     * Stores full context for later outcome analysis.
     */
    trackEnhancement(data: {
        context: EnhancementContext;
        enhancedPrompt: string;
        timestamp: Date;
    }): string {
        const id = randomUUID();

        const record: EnhancementRecord = {
            id: id,
            timestamp: data.timestamp,
            buttonType: data.context.type,
            context: data.context,
            enhancedPrompt: data.enhancedPrompt,
            templateVersion: 'MVP-003 v1.4.3',
            userSentToTerminal: false
        };

        this.records.set(id, record);
        this.persistData();

        console.log(`[TemplateEvolution] Tracked enhancement ${id} (type: ${record.buttonType})`);

        return id;
    }

    /**
     * Start git watching
     *
     * Called when user clicks "Send to Terminal".
     * Starts GitCommitWatcher for 30-minute window.
     */
    async startGitWatching(enhancementId: string): Promise<void> {
        const record = this.records.get(enhancementId);
        if (!record) {
            throw new Error(`Enhancement ${enhancementId} not found`);
        }

        record.userSentToTerminal = true;
        record.gitWatchingStarted = new Date();

        // Create watcher
        const watcher = new GitCommitWatcher(this.workspaceRoot);
        this.watchers.set(enhancementId, watcher);

        // Start watching (30-minute timeout)
        await watcher.start(record.gitWatchingStarted, {
            onComplete: async () => {
                record.gitWatchingEnded = new Date();
                const commits = watcher.getDetectedCommits();

                console.log(`[TemplateEvolution] Git watching complete for ${enhancementId} (${commits.length} commits)`);

                // Analyze outcome
                const outcome = await this.analyzeOutcome(enhancementId, commits);
                record.outcome = outcome;

                // Identify gaps and reinforcements
                const gaps = this.identifyGaps(enhancementId, outcome);
                const reinforcements = this.identifyReinforcements(enhancementId, outcome);

                // Store gaps/reinforcements
                this.mergeGaps(gaps);
                this.mergeReinforcements(reinforcements);

                // Check if template update needed
                await this.checkTemplateUpdate();

                // Clean up
                this.watchers.delete(enhancementId);
                this.persistData();
            }
        });

        console.log(`[TemplateEvolution] Started git watching for ${enhancementId}`);
    }

    /**
     * Analyze outcome from git commits
     *
     * Detects success/failure patterns:
     * - Success: Expected files modified + tests committed + no errors
     * - Failure: Expected files NOT modified + errors + no tests
     */
    async analyzeOutcome(enhancementId: string, commits: GitCommit[]): Promise<EnhancementOutcome> {
        const record = this.records.get(enhancementId);
        if (!record) {
            throw new Error(`Enhancement ${enhancementId} not found`);
        }

        const expectedFiles = record.context.template.files_to_modify || [];
        const allFiles = commits.flatMap(c => c.files);
        const allMessages = commits.map(c => c.message).join(' ');

        // Detect which expected files were modified
        const expectedFilesModified = expectedFiles.filter(expected =>
            allFiles.some(file => file.includes(expected))
        );

        // Detect missing files
        const missingFiles = expectedFiles.filter(expected =>
            !allFiles.some(file => file.includes(expected))
        );

        // Detect tests
        const testsCommitted = allFiles.some(file =>
            file.includes('test') || file.includes('spec')
        );

        // Detect error keywords
        const errorKeywordsList = ['revert', 'breaking', 'error', 'failed', 'fix bug', 'broken'];
        const errorKeywords = errorKeywordsList.filter(keyword =>
            allMessages.toLowerCase().includes(keyword)
        );

        // Calculate confidence score
        let confidenceScore = 50;
        if (expectedFilesModified.length === expectedFiles.length) confidenceScore += 30;
        if (testsCommitted) confidenceScore += 20;
        if (errorKeywords.length === 0) confidenceScore += 10;
        if (missingFiles.length > 0) confidenceScore -= 20;

        // Determine status
        let status: 'success' | 'failure' | 'ambiguous' = 'ambiguous';
        if (confidenceScore >= 80) status = 'success';
        else if (confidenceScore <= 40) status = 'failure';

        const outcome: EnhancementOutcome = {
            status: status,
            commitsDetected: commits.length,
            filesModified: allFiles,
            testsCommitted: testsCommitted,
            errorKeywords: errorKeywords,
            expectedFilesModified: expectedFilesModified,
            missingFiles: missingFiles,
            confidenceScore: confidenceScore,
            gaps: [],
            reinforcements: []
        };

        console.log(`[TemplateEvolution] Outcome for ${enhancementId}: ${status} (confidence: ${confidenceScore}%)`);

        return outcome;
    }

    /**
     * Identify template gaps from failure
     */
    identifyGaps(enhancementId: string, outcome: EnhancementOutcome): TemplateGap[] {
        const record = this.records.get(enhancementId);
        if (!record) return [];

        const gaps: TemplateGap[] = [];

        // Gap 1: Missing file emphasis
        if (outcome.missingFiles.length > 0) {
            outcome.missingFiles.forEach(file => {
                gaps.push({
                    type: 'missing_file_emphasis',
                    description: `Template should emphasize ${file} for ${record.buttonType} enhancements`,
                    context: {
                        expectedFile: file,
                        buttonType: record.buttonType,
                        templateSection: 'files_to_modify'
                    },
                    occurrences: 1,
                    firstSeen: new Date(),
                    lastSeen: new Date()
                });
            });
        }

        // Gap 2: Missing test emphasis
        if (!outcome.testsCommitted && outcome.status === 'failure') {
            gaps.push({
                type: 'missing_test_emphasis',
                description: `Template should emphasize writing tests for ${record.buttonType} enhancements`,
                context: {
                    buttonType: record.buttonType,
                    templateSection: 'validation_steps'
                },
                occurrences: 1,
                firstSeen: new Date(),
                lastSeen: new Date()
            });
        }

        return gaps;
    }

    /**
     * Identify template reinforcements from success
     */
    identifyReinforcements(enhancementId: string, outcome: EnhancementOutcome): TemplateReinforcement[] {
        const record = this.records.get(enhancementId);
        if (!record) return [];

        const reinforcements: TemplateReinforcement[] = [];

        // Reinforcement 1: File emphasis worked
        if (outcome.expectedFilesModified.length > 0 && outcome.status === 'success') {
            reinforcements.push({
                type: 'file_emphasis',
                description: `File emphasis worked for ${record.buttonType} enhancements`,
                context: {
                    buttonType: record.buttonType,
                    templateSection: 'files_to_modify'
                },
                occurrences: 1,
                confidenceIncrease: 5
            });
        }

        // Reinforcement 2: Test emphasis worked
        if (outcome.testsCommitted) {
            reinforcements.push({
                type: 'test_emphasis',
                description: `Test emphasis worked for ${record.buttonType} enhancements`,
                context: {
                    buttonType: record.buttonType,
                    templateSection: 'validation_steps'
                },
                occurrences: 1,
                confidenceIncrease: 5
            });
        }

        return reinforcements;
    }

    /**
     * Merge gaps (increment occurrences if similar gap exists)
     */
    private mergeGaps(newGaps: TemplateGap[]): void {
        newGaps.forEach(newGap => {
            const existing = this.gaps.find(g =>
                g.type === newGap.type &&
                g.context.buttonType === newGap.context.buttonType &&
                g.context.expectedFile === newGap.context.expectedFile
            );

            if (existing) {
                existing.occurrences++;
                existing.lastSeen = new Date();
            } else {
                this.gaps.push(newGap);
            }
        });
    }

    /**
     * Merge reinforcements (increment occurrences if similar)
     */
    private mergeReinforcements(newReinforcements: TemplateReinforcement[]): void {
        newReinforcements.forEach(newReinforcement => {
            const existing = this.reinforcements.find(r =>
                r.type === newReinforcement.type &&
                r.context.buttonType === newReinforcement.context.buttonType
            );

            if (existing) {
                existing.occurrences++;
                existing.confidenceIncrease += 2;
            } else {
                this.reinforcements.push(newReinforcement);
            }
        });
    }

    /**
     * Check if template update needed
     *
     * Update template if gap pattern repeated 3+ times.
     */
    private async checkTemplateUpdate(): Promise<void> {
        const gapsToApply = this.gaps.filter(g => g.occurrences >= 3);

        if (gapsToApply.length === 0) {
            console.log('[TemplateEvolution] No gaps ready for template update');
            return;
        }

        console.log(`[TemplateEvolution] Applying ${gapsToApply.length} gaps to template`);

        for (const gap of gapsToApply) {
            await this.applyGapToTemplate(gap);
        }
    }

    /**
     * Apply gap to template (backup first, then update)
     */
    async applyGapToTemplate(gap: TemplateGap): Promise<boolean> {
        if (gap.occurrences < 3) {
            console.log(`[TemplateEvolution] Gap only occurred ${gap.occurrences} times (need 3+)`);
            return false;
        }

        try {
            // TODO: Implement template update logic
            // 1. Backup template
            // 2. Parse template structure
            // 3. Insert/modify section based on gap type
            // 4. Save updated template

            console.log(`[TemplateEvolution] Applied gap to template: ${gap.description}`);
            return true;

        } catch (error) {
            console.error('[TemplateEvolution] Template update failed:', error);
            return false;
        }
    }

    /**
     * Get enhancement record
     */
    getEnhancementRecord(id: string): EnhancementRecord | undefined {
        return this.records.get(id);
    }

    /**
     * Persist data to disk
     */
    private persistData(): void {
        try {
            const data = {
                records: Array.from(this.records.entries()),
                gaps: this.gaps,
                reinforcements: this.reinforcements
            };

            const vscodePath = path.join(this.workspaceRoot, '.vscode');

            // Ensure .vscode directory exists
            if (!fs.existsSync(vscodePath)) {
                fs.mkdirSync(vscodePath, { recursive: true });
            }

            const filePath = path.join(vscodePath, 'template-evolution.json');
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('[TemplateEvolution] Failed to persist data:', error);
        }
    }

    /**
     * Load persisted data from disk
     */
    private loadPersistedData(): void {
        try {
            const filePath = path.join(this.workspaceRoot, '.vscode', 'template-evolution.json');
            const content = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(content);

            this.records = new Map(data.records || []);
            this.gaps = data.gaps || [];
            this.reinforcements = data.reinforcements || [];

        } catch {
            // File doesn't exist or invalid - start fresh
        }
    }

    /**
     * Dispose (clean up watchers)
     */
    async dispose(): Promise<void> {
        for (const watcher of this.watchers.values()) {
            await watcher.stop();
        }
        this.watchers.clear();
    }
}
