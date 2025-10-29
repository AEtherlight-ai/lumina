/**
 * VERSION-003: Three-Way Merge for Skills
 *
 * DESIGN DECISION: Git-like three-way merge algorithm
 * WHY: Preserve user customizations while integrating updates
 * PATTERN: Pattern-META-001 (Version Management)
 */

/**
 * Merge result with conflict information
 */
export interface MergeResult {
    success: boolean;
    mergedContent: string;
    conflicts: MergeConflict[];
    hasConflicts: boolean;
}

/**
 * Merge conflict information
 */
export interface MergeConflict {
    lineNumber: number;
    baseContent: string;
    localContent: string;
    latestContent: string;
    conflictMarker: string;
}

/**
 * Line comparison result
 */
interface LineComparison {
    baseLines: string[];
    localLines: string[];
    latestLines: string[];
    baseToLocal: DiffResult[];
    baseToLatest: DiffResult[];
}

/**
 * Diff operation type
 */
type DiffOperation = 'keep' | 'add' | 'delete' | 'modify';

/**
 * Diff result for a line
 */
interface DiffResult {
    operation: DiffOperation;
    lineNumber: number;
    content: string;
}

/**
 * Three-way merge algorithm
 *
 * ALGORITHM:
 * 1. Compare base → local (find user changes)
 * 2. Compare base → latest (find update changes)
 * 3. Merge changes:
 *    - If both changed same line → CONFLICT
 *    - If only local changed → Keep local
 *    - If only latest changed → Keep latest
 *    - If neither changed → Keep base
 *
 * PERFORMANCE TARGET: < 500ms for typical skill file (5-20KB)
 */
export function threeWayMerge(
    base: string,
    local: string,
    latest: string
): MergeResult {
    // Split into lines
    const baseLines = base.split('\n');
    const localLines = local.split('\n');
    const latestLines = latest.split('\n');

    // Perform diffs
    const baseToLocal = simpleDiff(baseLines, localLines);
    const baseToLatest = simpleDiff(baseLines, latestLines);

    // Merge changes
    const merged: string[] = [];
    const conflicts: MergeConflict[] = [];
    let lineNumber = 0;

    const maxLines = Math.max(baseLines.length, localLines.length, latestLines.length);

    for (let i = 0; i < maxLines; i++) {
        const baseLine = baseLines[i] || '';
        const localLine = localLines[i] || '';
        const latestLine = latestLines[i] || '';

        const localChanged = localLine !== baseLine;
        const latestChanged = latestLine !== baseLine;

        if (!localChanged && !latestChanged) {
            // Neither changed - keep base
            merged.push(baseLine);
        } else if (localChanged && !latestChanged) {
            // Only local changed - keep local
            merged.push(localLine);
        } else if (!localChanged && latestChanged) {
            // Only latest changed - keep latest
            merged.push(latestLine);
        } else if (localLine === latestLine) {
            // Both changed to same value - keep either
            merged.push(localLine);
        } else {
            // CONFLICT: Both changed to different values
            const conflictMarker = generateConflictMarker(baseLine, localLine, latestLine);
            merged.push(conflictMarker);

            conflicts.push({
                lineNumber: i + 1,
                baseContent: baseLine,
                localContent: localLine,
                latestContent: latestLine,
                conflictMarker
            });
        }

        lineNumber++;
    }

    return {
        success: conflicts.length === 0,
        mergedContent: merged.join('\n'),
        conflicts,
        hasConflicts: conflicts.length > 0
    };
}

/**
 * Simple line-by-line diff
 *
 * REASONING: Full diff algorithms (Myers, etc.) are complex
 * Simple line comparison sufficient for skill files
 */
function simpleDiff(from: string[], to: string[]): DiffResult[] {
    const results: DiffResult[] = [];
    const maxLen = Math.max(from.length, to.length);

    for (let i = 0; i < maxLen; i++) {
        const fromLine = from[i];
        const toLine = to[i];

        if (fromLine === undefined && toLine !== undefined) {
            // Line added
            results.push({
                operation: 'add',
                lineNumber: i,
                content: toLine
            });
        } else if (fromLine !== undefined && toLine === undefined) {
            // Line deleted
            results.push({
                operation: 'delete',
                lineNumber: i,
                content: fromLine
            });
        } else if (fromLine !== toLine) {
            // Line modified
            results.push({
                operation: 'modify',
                lineNumber: i,
                content: toLine
            });
        } else {
            // Line unchanged
            results.push({
                operation: 'keep',
                lineNumber: i,
                content: fromLine
            });
        }
    }

    return results;
}

/**
 * Generate conflict marker (Git-style)
 *
 * Example:
 * <<<<<<< LOCAL (Your Version)
 * local content here
 * ||||||| BASE (Original)
 * base content here
 * =======
 * latest content here
 * >>>>>>> LATEST (New Version)
 */
function generateConflictMarker(
    base: string,
    local: string,
    latest: string
): string {
    return `<<<<<<< LOCAL (Your Version)
${local}
||||||| BASE (Original)
${base}
=======
${latest}
>>>>>>> LATEST (New Version)`;
}

/**
 * Extract conflict sections from merged content
 *
 * USAGE: Show user conflicts for manual resolution
 */
export function extractConflicts(mergedContent: string): MergeConflict[] {
    const conflicts: MergeConflict[] = [];
    const lines = mergedContent.split('\n');

    let inConflict = false;
    let conflictStart = -1;
    let localContent = '';
    let baseContent = '';
    let latestContent = '';
    let section: 'local' | 'base' | 'latest' = 'local';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith('<<<<<<< LOCAL')) {
            inConflict = true;
            conflictStart = i + 1;
            section = 'local';
            localContent = '';
            baseContent = '';
            latestContent = '';
        } else if (line.startsWith('||||||| BASE')) {
            section = 'base';
        } else if (line.startsWith('=======')) {
            section = 'latest';
        } else if (line.startsWith('>>>>>>> LATEST')) {
            inConflict = false;

            conflicts.push({
                lineNumber: conflictStart,
                baseContent,
                localContent,
                latestContent,
                conflictMarker: lines.slice(conflictStart - 1, i + 1).join('\n')
            });
        } else if (inConflict) {
            if (section === 'local') {
                localContent += (localContent ? '\n' : '') + line;
            } else if (section === 'base') {
                baseContent += (baseContent ? '\n' : '') + line;
            } else if (section === 'latest') {
                latestContent += (latestContent ? '\n' : '') + line;
            }
        }
    }

    return conflicts;
}

/**
 * Resolve conflict by choosing a version
 *
 * CHOICES:
 * - 'local': Keep user's version
 * - 'latest': Accept new version
 * - 'base': Revert to original
 * - 'manual': User will edit manually
 */
export function resolveConflict(
    mergedContent: string,
    conflict: MergeConflict,
    choice: 'local' | 'latest' | 'base' | 'manual'
): string {
    if (choice === 'manual') {
        return mergedContent; // User will edit in diff viewer
    }

    const lines = mergedContent.split('\n');
    const conflictLines: string[] = [];
    let inConflict = false;
    let capturing = false;

    for (const line of lines) {
        if (line.startsWith('<<<<<<< LOCAL')) {
            inConflict = true;
            capturing = (choice === 'local');
        } else if (line.startsWith('||||||| BASE')) {
            capturing = (choice === 'base');
        } else if (line.startsWith('=======')) {
            capturing = (choice === 'latest');
        } else if (line.startsWith('>>>>>>> LATEST')) {
            inConflict = false;
            capturing = false;
        } else {
            if (inConflict && capturing) {
                conflictLines.push(line);
            } else if (!inConflict) {
                conflictLines.push(line);
            }
        }
    }

    return conflictLines.join('\n');
}

/**
 * Check if merge can be performed automatically
 *
 * REASONING: Some changes are too complex for automatic merge
 * - Metadata.json structural changes
 * - Skill.md major rewrites
 */
export function canAutoMerge(base: string, local: string, latest: string): boolean {
    // Simple heuristic: If files differ by > 50%, don't auto-merge
    const baseLinesCount = base.split('\n').length;
    const localLinesCount = local.split('\n').length;
    const latestLinesCount = latest.split('\n').length;

    const localDiff = Math.abs(localLinesCount - baseLinesCount);
    const latestDiff = Math.abs(latestLinesCount - baseLinesCount);

    const localDiffPercent = (localDiff / baseLinesCount) * 100;
    const latestDiffPercent = (latestDiff / baseLinesCount) * 100;

    // If either changed > 50% of lines, require manual review
    if (localDiffPercent > 50 || latestDiffPercent > 50) {
        return false;
    }

    // Perform merge test
    const result = threeWayMerge(base, local, latest);

    // If too many conflicts (> 20% of file), require manual review
    const conflictPercent = (result.conflicts.length / baseLinesCount) * 100;
    return conflictPercent <= 20;
}

/**
 * Generate diff statistics
 */
export interface DiffStats {
    linesAdded: number;
    linesRemoved: number;
    linesModified: number;
    linesUnchanged: number;
}

export function getDiffStats(from: string, to: string): DiffStats {
    const fromLines = from.split('\n');
    const toLines = to.split('\n');
    const diff = simpleDiff(fromLines, toLines);

    const stats: DiffStats = {
        linesAdded: 0,
        linesRemoved: 0,
        linesModified: 0,
        linesUnchanged: 0
    };

    for (const result of diff) {
        switch (result.operation) {
            case 'add':
                stats.linesAdded++;
                break;
            case 'delete':
                stats.linesRemoved++;
                break;
            case 'modify':
                stats.linesModified++;
                break;
            case 'keep':
                stats.linesUnchanged++;
                break;
        }
    }

    return stats;
}
