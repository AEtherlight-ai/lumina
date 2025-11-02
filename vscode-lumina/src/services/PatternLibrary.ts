/**
 * PatternLibrary: Load and search pattern library with keyword-based search
 *
 * DESIGN DECISION: Pattern metadata extraction without loading full files
 * WHY: Full pattern files are 500-1000 tokens, descriptions are 50-100 tokens (70% savings)
 *
 * REASONING CHAIN:
 * 1. Task references: patterns = ['Pattern-API-001', 'Pattern-AUTH-001']
 * 2. Agent needs to know WHAT these patterns do (not full implementation details)
 * 3. PatternLibrary extracts: id, name, description, keywords, category
 * 4. Keyword search finds relevant patterns for task context
 * 5. Return pattern descriptions: "Pattern-API-001: REST endpoint structure with validation"
 * 6. Agent gets context without loading 500-token file
 * 7. Result: 70% token savings per pattern reference
 *
 * PATTERN: Pattern-CONTEXT-004 (Pattern-Aware Task Context)
 * PATTERN: Pattern-ANALYZER-004 (Pattern Extraction from Code)
 * RELATED: MultiFormatParser.ts (loads tasks with pattern IDs), ConfidenceScorer.ts (scores pattern completeness)
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Pattern metadata extracted from Pattern-XXX-NNN.md files
 */
export interface Pattern {
    id: string;              // Pattern-API-001
    name: string;            // REST Endpoint Structure
    category: string;        // API Architecture
    description: string;     // First paragraph of Context section (50-100 tokens)
    keywords: string[];      // Extracted from content (lowercase)
    qualityScore?: number;   // From **QUALITY SCORE:** metadata
    applicability?: string;  // From **APPLICABILITY:** metadata
}

/**
 * Search result with relevance score
 */
export interface PatternSearchResult {
    pattern: Pattern;
    relevance: number;  // 0.0-1.0 based on keyword match count
}

/**
 * Pattern library loader and searcher
 *
 * DESIGN DECISION: In-memory cache after first load
 * WHY: Pattern library doesn't change during runtime, load once for fast searches
 */
export class PatternLibrary {
    private patterns: Pattern[] = [];
    private loaded: boolean = false;

    /**
     * Load patterns from filesystem directory
     *
     * @param patternsDir - Path to patterns directory (e.g., docs/patterns/)
     * @returns Array of loaded patterns
     *
     * DESIGN DECISION: Parse Pattern-XXX-NNN.md files, extract metadata
     * WHY: Pattern files follow predictable structure, regex extraction is fast
     */
    public async loadPatterns(patternsDir: string): Promise<Pattern[]> {
        // If already loaded, return cached patterns
        if (this.loaded) {
            return this.patterns;
        }

        const patterns: Pattern[] = [];

        try {
            // Check if directory exists
            if (!fs.existsSync(patternsDir)) {
                console.warn(`Pattern directory not found: ${patternsDir}`);
                return [];
            }

            // Read all .md files matching Pattern-XXX-NNN.md
            const files = fs.readdirSync(patternsDir)
                .filter(f => f.match(/^Pattern-[A-Z]+-\d+\.md$/i));

            for (const file of files) {
                const filePath = path.join(patternsDir, file);
                const content = fs.readFileSync(filePath, 'utf-8');

                // Parse pattern
                const pattern = this.parsePattern(file, content);
                if (pattern) {
                    patterns.push(pattern);
                }
            }

            this.patterns = patterns;
            this.loaded = true;

            return patterns;
        } catch (error) {
            console.error(`Error loading patterns from ${patternsDir}:`, error);
            return [];
        }
    }

    /**
     * Parse individual pattern file
     *
     * @param filename - Pattern filename (Pattern-API-001.md)
     * @param content - File content
     * @returns Parsed Pattern or null if invalid
     *
     * PATTERN FILE STRUCTURE:
     * # Pattern-API-001: REST Endpoint Structure
     * **CREATED:** 2025-10-15
     * **CATEGORY:** API Architecture
     * **QUALITY SCORE:** 0.92
     * **APPLICABILITY:** REST APIs with validation
     * ## Context
     * REST endpoints need consistent structure...
     */
    private parsePattern(filename: string, content: string): Pattern | null {
        try {
            // Extract ID from filename (Pattern-API-001.md → Pattern-API-001)
            const idMatch = filename.match(/^(Pattern-[A-Z]+-\d+)\.md$/i);
            if (!idMatch) {
                return null;
            }
            const id = idMatch[1];

            // Extract name from title (# Pattern-API-001: REST Endpoint Structure)
            const titleMatch = content.match(/^#\s+Pattern-[A-Z]+-\d+:\s+(.+)$/im);
            const name = titleMatch ? titleMatch[1].trim() : 'Unnamed Pattern';

            // Extract category
            const categoryMatch = content.match(/\*\*CATEGORY:\*\*\s*(.+)/i);
            const category = categoryMatch ? categoryMatch[1].trim() : 'Uncategorized';

            // Extract quality score
            const qualityMatch = content.match(/\*\*QUALITY SCORE:\*\*\s*(\d+\.?\d*)/i);
            const qualityScore = qualityMatch ? parseFloat(qualityMatch[1]) : undefined;

            // Extract applicability
            const applicabilityMatch = content.match(/\*\*APPLICABILITY:\*\*\s*(.+)/i);
            const applicability = applicabilityMatch ? applicabilityMatch[1].trim() : undefined;

            // Extract description from Context section (first paragraph)
            const contextMatch = content.match(/##\s+Context\s+(.+?)(?=\n\n|##|$)/is);
            const description = contextMatch
                ? contextMatch[1].trim().split('\n')[0]  // First paragraph only
                : `${name} pattern`;

            // Extract keywords from content (simple approach: lowercase words, filter common words)
            const keywords = this.extractKeywords(content, name, category);

            return {
                id,
                name,
                category,
                description,
                keywords,
                qualityScore,
                applicability
            };
        } catch (error) {
            console.error(`Error parsing pattern file ${filename}:`, error);
            return null;
        }
    }

    /**
     * Extract keywords from pattern content
     *
     * @param content - Full pattern content
     * @param name - Pattern name
     * @param category - Pattern category
     * @returns Array of keywords (lowercase)
     *
     * DESIGN DECISION: Extract from name, category, and content
     * WHY: Keywords enable semantic search without full-text indexing
     */
    private extractKeywords(content: string, name: string, category: string): string[] {
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
            'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
        ]);

        const words = new Set<string>();

        // Extract from name and category
        const sourceText = `${name} ${category} ${content}`.toLowerCase();

        // Split by non-alphanumeric characters
        const tokens = sourceText.match(/[a-z0-9]+/g) || [];

        for (const token of tokens) {
            // Filter: length > 2, not a stop word
            if (token.length > 2 && !stopWords.has(token)) {
                words.add(token);
            }
        }

        return Array.from(words);
    }

    /**
     * Search patterns by keywords
     *
     * @param query - Search query (e.g., "REST API endpoint validation")
     * @param topN - Number of results to return (default 5)
     * @returns Array of patterns ranked by relevance
     *
     * DESIGN DECISION: Simple keyword matching with relevance scoring
     * WHY: Fast, no dependencies, good enough for pattern library size (~50-100 patterns)
     * FUTURE: Could use TF-IDF or embeddings for better semantic search
     */
    public searchPatterns(query: string, topN: number = 5): PatternSearchResult[] {
        if (!this.loaded || this.patterns.length === 0) {
            return [];
        }

        // Extract keywords from query
        const queryKeywords = query.toLowerCase().match(/[a-z0-9]+/g) || [];

        // Score each pattern by keyword overlap
        const scored: PatternSearchResult[] = [];

        for (const pattern of this.patterns) {
            let matchCount = 0;
            let totalKeywords = queryKeywords.length;

            // Count matches
            for (const qKeyword of queryKeywords) {
                if (pattern.keywords.includes(qKeyword)) {
                    matchCount++;
                }
            }

            // Calculate relevance (0.0-1.0)
            const relevance = totalKeywords > 0 ? matchCount / totalKeywords : 0;

            // Only include patterns with at least one match
            if (relevance > 0) {
                scored.push({ pattern, relevance });
            }
        }

        // Sort by relevance (highest first)
        scored.sort((a, b) => b.relevance - a.relevance);

        // Return top N
        return scored.slice(0, topN);
    }

    /**
     * Get all loaded patterns
     *
     * @returns Array of all patterns
     */
    public getAllPatterns(): Pattern[] {
        return this.patterns;
    }

    /**
     * Get pattern by ID
     *
     * @param id - Pattern ID (e.g., "Pattern-API-001")
     * @returns Pattern or undefined if not found
     */
    public getPatternById(id: string): Pattern | undefined {
        return this.patterns.find(p => p.id === id);
    }

    /**
     * Format pattern context for task description
     *
     * @param patternIds - Array of pattern IDs
     * @returns Formatted pattern context string
     *
     * DESIGN DECISION: Inline pattern descriptions in task context
     * WHY: Agent sees pattern descriptions without loading full files (70% token savings)
     *
     * EXAMPLE OUTPUT:
     * Pattern-API-001: REST endpoint structure with validation
     * Pattern-AUTH-001: JWT authentication middleware with token refresh
     */
    public formatPatternContext(patternIds: string[]): string {
        const lines: string[] = [];

        for (const id of patternIds) {
            const pattern = this.getPatternById(id);
            if (pattern) {
                lines.push(`${pattern.id}: ${pattern.description}`);
            }
        }

        return lines.join('\n');
    }
}
