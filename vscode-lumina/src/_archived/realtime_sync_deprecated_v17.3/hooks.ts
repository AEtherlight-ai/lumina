/**
 * Real-Time Sync Event Emission Hooks
 *
 * DESIGN DECISION: Hook into Claude Code tool usage to detect events
 * WHY: Capture design decisions, blockers, discoveries at thought speed
 *
 * REASONING CHAIN:
 * 1. TodoWrite with "DESIGN DECISION:" = design decision event
 * 2. Bash tool failure + "error" = blocker event
 * 3. Pattern extraction with "Pattern-XXX-YYY" = discovery event
 * 4. Deduplicate events (same event within 5 min = ignore)
 * 5. Emit via RealtimeSyncClient → all terminals notified
 *
 * PATTERN: Pattern-EVENT-001 (Event Detection Heuristics)
 * RELATED: client.ts, Pattern-WEBSOCKET-002
 * PERFORMANCE: <10ms overhead, <5% false positives
 */

import { v4 as uuidv4 } from 'uuid';
import { SyncEvent, SyncEventType } from './types';
import { RealtimeSyncClient } from './client';

/**
 * Event deduplication cache
 *
 * DESIGN DECISION: In-memory cache with 5-minute TTL
 * WHY: Prevent duplicate events from rapid tool usage
 */
interface EventCacheEntry {
    hash: string;
    timestamp: number;
}

export class EventEmissionHooks {
    private client: RealtimeSyncClient;
    private user: string;
    private terminalId: string;
    private project?: string;

    // Event deduplication cache (hash -> timestamp)
    private eventCache: Map<string, EventCacheEntry> = new Map();
    private readonly DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

    constructor(client: RealtimeSyncClient, user: string, terminalId: string, project?: string) {
        this.client = client;
        this.user = user;
        this.terminalId = terminalId;
        this.project = project;

        // Clean cache every 5 minutes
        setInterval(() => this.cleanCache(), this.DEDUP_WINDOW_MS);
    }

    /**
     * Hook: TodoWrite tool usage
     *
     * DESIGN DECISION: Detect "DESIGN DECISION:" pattern in content
     * WHY: TodoWrite is where design decisions are documented
     *
     * HEURISTIC:
     * - If content contains "DESIGN DECISION:" → extract as design decision
     * - If content contains "BLOCKER:" or "BLOCKED:" → extract as blocker
     */
    public onTodoWrite(content: string, files: string[]): void {
        const startTime = Date.now();

        // Extract design decision
        const designDecisionMatch = content.match(/DESIGN DECISION:\s*(.+?)(?:\n|$)/i);
        if (designDecisionMatch) {
            const title = designDecisionMatch[1].trim();

            // Extract full description (everything after "DESIGN DECISION:")
            const descStartIdx = content.indexOf(designDecisionMatch[0]) + designDecisionMatch[0].length;
            const description = content.substring(descStartIdx).trim().substring(0, 500); // Max 500 chars

            this.emitEvent({
                event_type: SyncEventType.DesignDecision,
                title,
                description,
                files,
                tags: ['todo', 'design'],
            });
        }

        // Extract blocker
        const blockerMatch = content.match(/(?:BLOCKER|BLOCKED):\s*(.+?)(?:\n|$)/i);
        if (blockerMatch) {
            const title = blockerMatch[1].trim();
            const descStartIdx = content.indexOf(blockerMatch[0]) + blockerMatch[0].length;
            const description = content.substring(descStartIdx).trim().substring(0, 500);

            this.emitEvent({
                event_type: SyncEventType.Blocker,
                title,
                description,
                files,
                tags: ['todo', 'blocker'],
            });
        }

        const duration = Date.now() - startTime;
        if (duration > 10) {
            console.warn(`[RTC Hooks] onTodoWrite took ${duration}ms (target: <10ms)`);
        }
    }

    /**
     * Hook: Bash tool execution result
     *
     * DESIGN DECISION: Detect failures + "error" keyword = blocker
     * WHY: Failed commands indicate blockers that need team awareness
     *
     * HEURISTIC:
     * - Non-zero exit code + stderr contains "error" → blocker
     * - Extract error message from stderr (first 500 chars)
     */
    public onBashResult(
        command: string,
        exitCode: number,
        stdout: string,
        stderr: string,
        files: string[]
    ): void {
        const startTime = Date.now();

        // Only detect blockers on failures
        if (exitCode !== 0 && stderr.toLowerCase().includes('error')) {
            // Extract error message (first line with "error" or first 200 chars)
            const errorLines = stderr.split('\n').filter(line => line.toLowerCase().includes('error'));
            const errorMsg = errorLines.length > 0 ? errorLines[0] : stderr.substring(0, 200);

            this.emitEvent({
                event_type: SyncEventType.Blocker,
                title: `Command failed: ${command.substring(0, 50)}`,
                description: `Exit code: ${exitCode}\n${errorMsg}`,
                files,
                tags: ['bash', 'error', 'blocker'],
            });
        }

        const duration = Date.now() - startTime;
        if (duration > 10) {
            console.warn(`[RTC Hooks] onBashResult took ${duration}ms (target: <10ms)`);
        }
    }

    /**
     * Hook: Pattern extraction
     *
     * DESIGN DECISION: Detect "Pattern-XXX-YYY" = discovery
     * WHY: New patterns are valuable discoveries to share with team
     *
     * HEURISTIC:
     * - Content contains "Pattern-[A-Z]+-\d{3}" → discovery
     * - Extract pattern ID and description
     */
    public onPatternExtraction(
        patternId: string,
        patternContent: string,
        files: string[]
    ): void {
        const startTime = Date.now();

        // Extract title from pattern (first line after "# ")
        const titleMatch = patternContent.match(/^#\s+(.+?)$/m);
        const title = titleMatch ? titleMatch[1].trim() : patternId;

        // Extract description (first paragraph after title)
        const descMatch = patternContent.match(/^#\s+.+?\n\n(.+?)(?:\n\n|$)/ms);
        const description = descMatch ? descMatch[1].trim().substring(0, 500) : 'Pattern extracted';

        this.emitEvent({
            event_type: SyncEventType.Discovery,
            title: `New pattern: ${title}`,
            description,
            files,
            tags: ['pattern', 'discovery', patternId],
        });

        const duration = Date.now() - startTime;
        if (duration > 10) {
            console.warn(`[RTC Hooks] onPatternExtraction took ${duration}ms (target: <10ms)`);
        }
    }

    /**
     * Hook: File save (generic)
     *
     * DESIGN DECISION: Allow manual event emission from code
     * WHY: Developers can explicitly mark important changes
     *
     * USAGE:
     * ```typescript
     * hooks.onFileSave('feat: Add OAuth2 authentication', 'Implemented OAuth2...', ['auth.ts']);
     * ```
     */
    public onFileSave(title: string, description: string, files: string[]): void {
        this.emitEvent({
            event_type: SyncEventType.Discovery,
            title,
            description,
            files,
            tags: ['file-save', 'discovery'],
        });
    }

    /**
     * Emit event with deduplication
     *
     * DESIGN DECISION: Hash-based deduplication with 5-minute window
     * WHY: Rapid tool usage shouldn't spam team with duplicate events
     */
    private emitEvent(partial: Omit<SyncEvent, 'id' | 'user' | 'terminal_id' | 'project' | 'timestamp'>): void {
        // Create hash from title + description + event_type
        const hash = this.hashEvent(partial.title, partial.description, partial.event_type);

        // Check if duplicate within 5-minute window
        const cached = this.eventCache.get(hash);
        if (cached && (Date.now() - cached.timestamp) < this.DEDUP_WINDOW_MS) {
            console.log(`[RTC Hooks] Skipping duplicate event: ${partial.title}`);
            return;
        }

        // Build full event
        const event: SyncEvent = {
            id: uuidv4(),
            user: this.user,
            terminal_id: this.terminalId,
            project: this.project,
            timestamp: new Date().toISOString(),
            ...partial,
        };

        // Cache event
        this.eventCache.set(hash, { hash, timestamp: Date.now() });

        // Publish to all terminals
        try {
            this.client.publish(event);
            console.log(`[RTC Hooks] Emitted ${event.event_type}: ${event.title}`);
        } catch (error) {
            console.error('[RTC Hooks] Failed to emit event:', error);
        }
    }

    /**
     * Hash event for deduplication
     *
     * DESIGN DECISION: Simple string concatenation + hash
     * WHY: Fast (<1ms), good enough for 5-minute window
     */
    private hashEvent(title: string, description: string, eventType: SyncEventType): string {
        const str = `${eventType}:${title}:${description}`;
        // Simple hash (not cryptographic, just for deduplication)
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    /**
     * Clean expired entries from cache
     *
     * DESIGN DECISION: Run every 5 minutes
     * WHY: Prevent unbounded memory growth
     */
    private cleanCache(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [hash, entry] of this.eventCache.entries()) {
            if (now - entry.timestamp >= this.DEDUP_WINDOW_MS) {
                this.eventCache.delete(hash);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`[RTC Hooks] Cleaned ${cleaned} expired cache entries`);
        }
    }

    /**
     * Get cache statistics (for monitoring)
     */
    public getCacheStats() {
        return {
            size: this.eventCache.size,
            maxSize: 1000, // Theoretical max (not enforced, but typical)
            dedupWindowMs: this.DEDUP_WINDOW_MS,
        };
    }
}
