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
 * Pattern status lifecycle
 */
export type PatternStatus = 'Active' | 'Deprecated' | 'Superseded' | 'Design' | 'Production-Validated';

/**
 * Edge case documentation
 */
export interface EdgeCase {
    scenario: string;
    handling: string;
    example?: string;
}

/**
 * Alternative approach considered
 */
export interface Alternative {
    approach: string;
    rejected: string;  // Why it was rejected
}

/**
 * Code example with Chain of Thought
 */
export interface CodeExample {
    language: string;
    code: string;
    explanation: string;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
    latency?: string;      // "< 100ms"
    throughput?: string;   // "1000 req/s"
    memory?: string;       // "< 50MB"
    benchmarks?: string;   // Free-form benchmark results
}

/**
 * Enhanced Chain of Thought structure
 */
export interface ChainOfThought {
    designDecision: string;
    why: string;
    reasoningChain: string[];
    context?: string;           // Problem context
    problem?: string;           // Specific challenges
    solution?: string;          // How it solves
    whenToUse?: string[];       // Use cases
    whenNotToUse?: string[];    // Anti-patterns
    edgeCases?: EdgeCase[];     // Edge cases
    alternatives?: Alternative[]; // What was rejected
    examples?: CodeExample[];   // Actual usage
    metrics?: PerformanceMetrics; // Performance data
}

/**
 * Pattern metadata extracted from Pattern-XXX-NNN.md files
 *
 * NEURAL NETWORK FOUNDATION:
 * This interface represents a node in the pattern knowledge graph.
 * Relationships (relatedPatterns, crossLinks, dependencies) are the edges
 * that enable neural routing, cross-domain discovery, and meta-learning.
 */
export interface Pattern {
    // Core Identity:
    id: string;              // Pattern-API-001
    name: string;            // REST Endpoint Structure
    category: string;        // API Architecture
    description: string;     // First paragraph of Context section (50-100 tokens)
    keywords: string[];      // Extracted from content (lowercase)

    // Relationship Graph (CRITICAL - Neural Network Edges):
    relatedPatterns: string[];   // Links to related patterns (e.g., ['Pattern-AUTH-001', 'Pattern-JWT-001'])
    supersedes?: string;         // Pattern this replaces (e.g., 'Pattern-API-000')
    supersededBy?: string;       // Pattern that replaces this one (e.g., 'Pattern-API-002')
    crossLinks: string[];        // Cross-domain references (e.g., patterns from other domains)
    dependencies: string[];      // Required patterns (e.g., ['Pattern-BASE-001'])

    // Domain Classification (for neural routing):
    domain: string;              // Semantic domain (legal, agriculture, tech, api, auth, etc.)
    region?: string;             // Geographic applicability (us-midwest, eu, global, etc.)
    language: string;            // Implementation language (TypeScript, Rust, Python, Architecture)

    // Quality & Status:
    qualityScore?: number;       // 0.0-1.0 (production-validated patterns)
    status: PatternStatus;       // Active | Deprecated | Superseded | Design | Production-Validated
    applicability?: string;      // When to use this pattern

    // Chain of Thought (enhanced):
    chainOfThought?: ChainOfThought;

    // Implementation Details:
    sourceFiles?: string[];      // Actual usage locations in codebase
    usageFrequency?: number;     // How often used (for optimization)
    testCoverage?: number;       // Test coverage percentage (0.0-1.0)
    complexity?: number;         // Cyclomatic complexity
    performance?: PerformanceMetrics; // Benchmarks
    source?: string;             // Where pattern was extracted from

    // Lifecycle:
    created?: Date;              // Creation timestamp
    lastUpdated?: Date;          // Last modification
    nextReview?: Date;           // When to review pattern

    // Content-Addressable Storage (Pattern-CONTEXT-002):
    contentHash?: string;        // SHA-256 hash of pattern content (for change detection)
    address?: string;            // Hierarchical address (DOC-ID.SEC-ID.PARA-ID.LINE-ID)
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

            // Extract relationship fields (CRITICAL for neural network)
            const relatedPatterns = this.extractRelationships(content, /\*\*RELATED:\*\*\s*(.+)/i);
            const supersedes = this.extractSingleRelation(content, /\*\*SUPERSEDES:\*\*\s*(.+)/i);
            const supersededBy = this.extractSingleRelation(content, /\*\*SUPERSEDED BY:\*\*\s*(.+)/i);
            const crossLinks = this.extractCrossLinks(content);
            const dependencies = this.extractRelationships(content, /\*\*DEPENDENCIES:\*\*\s*(.+)/i);

            // Extract domain and region
            const domain = this.extractDomain(category, content);
            const region = this.extractRegion(content);

            // Extract language
            const languageMatch = content.match(/\*\*Language:\*\*\s*(.+)/i);
            const language = languageMatch ? languageMatch[1].trim() : 'Architecture';

            // Extract status
            const statusMatch = content.match(/\*\*STATUS:\*\*\s*(.+)/i);
            const status: PatternStatus = statusMatch
                ? (statusMatch[1].trim() as PatternStatus)
                : 'Active';

            // Extract source
            const sourceMatch = content.match(/\*\*SOURCE:\*\*\s*(.+)/i);
            const source = sourceMatch ? sourceMatch[1].trim() : undefined;

            // Extract timestamps
            const createdMatch = content.match(/\*\*CREATED:\*\*\s*(\d{4}-\d{2}-\d{2})/i);
            const created = createdMatch ? new Date(createdMatch[1]) : undefined;

            const updatedMatch = content.match(/\*\*LAST UPDATED:\*\*\s*(\d{4}-\d{2}-\d{2})/i);
            const lastUpdated = updatedMatch ? new Date(updatedMatch[1]) : undefined;

            // Calculate content hash
            const contentHash = this.calculateContentHash(content);

            return {
                id,
                name,
                category,
                description,
                keywords,
                relatedPatterns,
                supersedes,
                supersededBy,
                crossLinks,
                dependencies,
                domain,
                region,
                language,
                qualityScore,
                status,
                applicability,
                source,
                created,
                lastUpdated,
                contentHash
            };
        } catch (error) {
            console.error(`Error parsing pattern file ${filename}:`, error);
            return null;
        }
    }

    /**
     * Extract relationship patterns from content
     *
     * @param content - Full pattern content
     * @param regex - Regex to match relationship field
     * @returns Array of pattern IDs
     *
     * EXAMPLE:
     * **RELATED:** Pattern-API-001, Pattern-AUTH-001, Pattern-JWT-001
     * → ['Pattern-API-001', 'Pattern-AUTH-001', 'Pattern-JWT-001']
     */
    private extractRelationships(content: string, regex: RegExp): string[] {
        const match = content.match(regex);
        if (!match) {
            return [];
        }

        // Split by comma, trim, filter empty
        return match[1]
            .split(/[,;]/)
            .map(p => p.trim())
            .filter(p => p.match(/^Pattern-[A-Z]+-\d+$/i));
    }

    /**
     * Extract single relationship pattern
     *
     * @param content - Full pattern content
     * @param regex - Regex to match relationship field
     * @returns Pattern ID or undefined
     */
    private extractSingleRelation(content: string, regex: RegExp): string | undefined {
        const match = content.match(regex);
        if (!match) {
            return undefined;
        }

        const patternId = match[1].trim();
        return patternId.match(/^Pattern-[A-Z]+-\d+$/i) ? patternId : undefined;
    }

    /**
     * Extract cross-links from content (patterns referenced in text)
     *
     * @param content - Full pattern content
     * @returns Array of pattern IDs found in content
     *
     * DESIGN DECISION: Extract all Pattern-XXX-NNN references from text
     * WHY: Patterns often reference other patterns in Context/Solution sections
     */
    private extractCrossLinks(content: string): string[] {
        const patternRefs = content.match(/Pattern-[A-Z]+-\d+/gi) || [];
        // Deduplicate and sort
        return Array.from(new Set(patternRefs.map(p => p.toUpperCase())));
    }

    /**
     * Extract domain from category and content
     *
     * @param category - Pattern category
     * @param content - Full pattern content
     * @returns Semantic domain
     *
     * DESIGN DECISION: Map category to semantic domain
     * WHY: Enable domain-specific neural routing
     */
    private extractDomain(category: string, content: string): string {
        const categoryLower = category.toLowerCase();

        // Domain mapping
        if (categoryLower.includes('api') || categoryLower.includes('rest') || categoryLower.includes('endpoint')) {
            return 'api';
        }
        if (categoryLower.includes('auth') || categoryLower.includes('jwt') || categoryLower.includes('oauth')) {
            return 'authentication';
        }
        if (categoryLower.includes('data') || categoryLower.includes('database') || categoryLower.includes('sql')) {
            return 'data';
        }
        if (categoryLower.includes('ui') || categoryLower.includes('interface') || categoryLower.includes('component')) {
            return 'ui';
        }
        if (categoryLower.includes('test') || categoryLower.includes('quality')) {
            return 'testing';
        }
        if (categoryLower.includes('performance') || categoryLower.includes('optimization')) {
            return 'performance';
        }
        if (categoryLower.includes('security') || categoryLower.includes('encryption')) {
            return 'security';
        }
        if (categoryLower.includes('network') || categoryLower.includes('distribution')) {
            return 'networking';
        }

        // Default: use category as domain
        return category.toLowerCase().replace(/\s+/g, '-');
    }

    /**
     * Extract region from content
     *
     * @param content - Full pattern content
     * @returns Geographic region or undefined
     *
     * EXAMPLE:
     * **REGION:** us-midwest
     * → 'us-midwest'
     */
    private extractRegion(content: string): string | undefined {
        const regionMatch = content.match(/\*\*REGION:\*\*\s*(.+)/i);
        return regionMatch ? regionMatch[1].trim().toLowerCase() : undefined;
    }

    /**
     * Calculate SHA-256 content hash for pattern
     *
     * @param content - Full pattern content
     * @returns SHA-256 hash (hex string)
     *
     * DESIGN DECISION: Use Node's crypto module for hashing
     * WHY: Standard, fast, collision-resistant
     * PATTERN: Pattern-CONTEXT-002 (Content-Addressable Context System)
     */
    private calculateContentHash(content: string): string {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(content).digest('hex');
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

    /**
     * NEURAL NETWORK GRAPH TRAVERSAL METHODS
     *
     * These methods enable navigating the pattern knowledge graph to:
     * - Discover related patterns across domains
     * - Track pattern dependencies
     * - Follow supersession chains
     * - Detect ripple effects from pattern changes
     *
     * DESIGN DECISION: Breadth-first traversal with cycle detection
     * WHY: Avoid infinite loops in circular relationships, explore nearest neighbors first
     * PATTERN: Pattern-CONTEXT-002 (Content-Addressable Context System)
     */

    /**
     * Find related patterns by traversing relationship graph
     *
     * @param patternId - Starting pattern ID
     * @param depth - How many levels deep to traverse (default 2)
     * @returns Array of related patterns with distance
     *
     * REASONING CHAIN:
     * 1. Start with Pattern-API-001
     * 2. Find relatedPatterns: [Pattern-AUTH-001, Pattern-JWT-001]
     * 3. For each related pattern, find THEIR related patterns (depth 2)
     * 4. Result: Complete context of related patterns within 2 hops
     * 5. Token savings: Only load what's needed, not entire pattern library
     */
    public findRelatedPatterns(patternId: string, depth: number = 2): Array<{ pattern: Pattern; distance: number }> {
        const result: Array<{ pattern: Pattern; distance: number }> = [];
        const visited = new Set<string>();
        const queue: Array<{ id: string; distance: number }> = [{ id: patternId, distance: 0 }];

        while (queue.length > 0) {
            const current = queue.shift()!;

            // Skip if already visited
            if (visited.has(current.id)) {
                continue;
            }

            visited.add(current.id);

            // Get pattern
            const pattern = this.getPatternById(current.id);
            if (!pattern) {
                continue;
            }

            // Add to results (skip the starting pattern itself)
            if (current.distance > 0) {
                result.push({ pattern, distance: current.distance });
            }

            // Stop at depth limit
            if (current.distance >= depth) {
                continue;
            }

            // Queue related patterns
            for (const relatedId of pattern.relatedPatterns) {
                if (!visited.has(relatedId)) {
                    queue.push({ id: relatedId, distance: current.distance + 1 });
                }
            }

            // Queue cross-links (patterns referenced in content)
            for (const crossLinkId of pattern.crossLinks) {
                if (!visited.has(crossLinkId)) {
                    queue.push({ id: crossLinkId, distance: current.distance + 1 });
                }
            }
        }

        // Sort by distance (nearest first)
        result.sort((a, b) => a.distance - b.distance);

        return result;
    }

    /**
     * Find all dependencies for a pattern (recursive)
     *
     * @param patternId - Pattern ID
     * @returns Array of required patterns (dependencies)
     *
     * DESIGN DECISION: Recursive dependency resolution with cycle detection
     * WHY: Agent needs to know ALL required patterns before implementing one
     *
     * EXAMPLE:
     * Pattern-API-001 depends on Pattern-AUTH-001
     * Pattern-AUTH-001 depends on Pattern-JWT-001
     * → Result: [Pattern-JWT-001, Pattern-AUTH-001] (dependency order)
     */
    public findDependencies(patternId: string): Pattern[] {
        const result: Pattern[] = [];
        const visited = new Set<string>();

        const traverse = (id: string) => {
            if (visited.has(id)) {
                return;  // Cycle detection
            }

            visited.add(id);

            const pattern = this.getPatternById(id);
            if (!pattern) {
                return;
            }

            // Recursively get dependencies FIRST (depth-first)
            for (const depId of pattern.dependencies) {
                traverse(depId);
            }

            // Add this pattern after its dependencies
            result.push(pattern);
        };

        traverse(patternId);

        // Remove the starting pattern from results
        return result.filter(p => p.id !== patternId);
    }

    /**
     * Follow supersession chain to find current pattern
     *
     * @param patternId - Pattern ID (may be deprecated)
     * @returns Current active pattern (or original if not superseded)
     *
     * DESIGN DECISION: Follow supersededBy chain until we reach active pattern
     * WHY: Agent should always use latest pattern, not deprecated ones
     *
     * EXAMPLE:
     * Pattern-API-000 → supersededBy: Pattern-API-001 → supersededBy: Pattern-API-002
     * → Result: Pattern-API-002 (latest)
     */
    public findSupersededBy(patternId: string): Pattern | null {
        let currentId = patternId;
        const visited = new Set<string>();

        while (true) {
            if (visited.has(currentId)) {
                return null;  // Cycle detection
            }

            visited.add(currentId);

            const pattern = this.getPatternById(currentId);
            if (!pattern) {
                return null;  // Pattern not found
            }

            // If pattern has supersededBy, follow the chain
            if (pattern.supersededBy) {
                currentId = pattern.supersededBy;
            } else {
                // Reached the end of the chain
                return pattern;
            }
        }
    }

    /**
     * Detect ripple effects: which patterns are affected by changes to this pattern
     *
     * @param patternId - Pattern ID that changed
     * @returns Array of patterns that depend on or reference this pattern
     *
     * DESIGN DECISION: Find patterns that depend on or reference this pattern
     * WHY: SHA-256 hash changed → notify dependent patterns → prevent silent breakage
     * PATTERN: Pattern-CONTEXT-002 (Content-Addressable Context System)
     *
     * REASONING CHAIN:
     * 1. Pattern-AUTH-001 content changes → SHA-256 hash changes
     * 2. detectRippleEffects('Pattern-AUTH-001') finds:
     *    - Patterns with dependencies: ['Pattern-AUTH-001']
     *    - Patterns with relatedPatterns: ['Pattern-AUTH-001']
     *    - Patterns with crossLinks: ['Pattern-AUTH-001']
     * 3. Result: [Pattern-API-001, Pattern-JWT-001] need review
     * 4. Agent notified: "Pattern-AUTH-001 changed, review these patterns"
     * 5. Token savings: 90% (reference by hash until change detected)
     */
    public detectRippleEffects(patternId: string): Pattern[] {
        const affected: Pattern[] = [];

        for (const pattern of this.patterns) {
            // Skip the pattern itself
            if (pattern.id === patternId) {
                continue;
            }

            // Check if this pattern depends on the changed pattern
            if (pattern.dependencies.includes(patternId)) {
                affected.push(pattern);
                continue;
            }

            // Check if this pattern is related to the changed pattern
            if (pattern.relatedPatterns.includes(patternId)) {
                affected.push(pattern);
                continue;
            }

            // Check if this pattern cross-links to the changed pattern
            if (pattern.crossLinks.includes(patternId)) {
                affected.push(pattern);
                continue;
            }

            // Check if this pattern is superseded by the changed pattern
            if (pattern.supersededBy === patternId) {
                affected.push(pattern);
                continue;
            }
        }

        return affected;
    }

    /**
     * Get pattern graph structure for visualization
     *
     * @returns Graph with nodes (patterns) and edges (relationships)
     *
     * DESIGN DECISION: Return graph structure for visualization/analysis
     * WHY: Enable graph visualization in UI, pattern analysis, etc.
     */
    public getPatternGraph(): PatternGraph {
        const nodes: PatternNode[] = [];
        const edges: PatternEdge[] = [];

        for (const pattern of this.patterns) {
            // Add node
            nodes.push({
                id: pattern.id,
                name: pattern.name,
                domain: pattern.domain,
                status: pattern.status,
                qualityScore: pattern.qualityScore
            });

            // Add edges (relationships)
            for (const relatedId of pattern.relatedPatterns) {
                edges.push({
                    source: pattern.id,
                    target: relatedId,
                    type: 'related'
                });
            }

            // Add dependency edges
            for (const depId of pattern.dependencies) {
                edges.push({
                    source: pattern.id,
                    target: depId,
                    type: 'depends'
                });
            }

            // Add supersession edge
            if (pattern.supersedes) {
                edges.push({
                    source: pattern.id,
                    target: pattern.supersedes,
                    type: 'supersedes'
                });
            }
        }

        return { nodes, edges };
    }
}

/**
 * Pattern graph node for visualization
 */
export interface PatternNode {
    id: string;
    name: string;
    domain: string;
    status: PatternStatus;
    qualityScore?: number;
}

/**
 * Pattern graph edge for visualization
 */
export interface PatternEdge {
    source: string;
    target: string;
    type: 'related' | 'depends' | 'supersedes' | 'crossLink';
}

/**
 * Pattern graph structure
 */
export interface PatternGraph {
    nodes: PatternNode[];
    edges: PatternEdge[];
}
