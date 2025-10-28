/**
 * TypeScript Definitions for @aetherlight/node
 *
 * DESIGN DECISION: Hand-crafted TypeScript definitions matching NAPI-RS FFI bindings
 * WHY: Provide type safety for JavaScript/TypeScript consumers until Rust build available
 *
 * REASONING CHAIN:
 * 1. NAPI-RS auto-generates these from Rust types at build time
 * 2. Hand-crafted definitions enable development before Rust toolchain installed
 * 3. Types must match lib.rs FFI signatures exactly
 * 4. Auto-generated definitions will replace these after cargo build
 * 5. JSDoc comments provide IDE documentation
 *
 * PATTERN: Pattern-007 (Language Bindings via NAPI)
 * RELATED: lib.rs (FFI implementation), package.json (module entry)
 * FUTURE: Replace with auto-generated definitions after Rust build
 */

/**
 * Pattern metadata for context-aware matching
 */
export interface PatternMetadata {
  /** Programming language (e.g., "rust", "typescript", "python") */
  language?: string | null;
  /** Framework/library (e.g., "tokio", "react", "flutter") */
  framework?: string | null;
  /** Domain context (e.g., "error-handling", "async", "testing") */
  domain?: string | null;
}

/**
 * Individual dimension scores for confidence breakdown
 *
 * All scores in range [0.0, 1.0]:
 * - 0.0: No match/confidence
 * - 0.5: Neutral (insufficient data)
 * - 1.0: Perfect match/high confidence
 */
export interface ConfidenceBreakdown {
  /** Semantic similarity (embedding cosine distance) */
  semanticSimilarity: number;
  /** Context match (language/framework/domain fit) */
  contextMatch: number;
  /** Keyword overlap (tag matching) */
  keywordOverlap: number;
  /** Historical success rate (pattern usage outcomes) */
  historicalSuccessRate: number;
  /** Pattern recency (newer patterns weighted higher) */
  patternRecency: number;
  /** User preference (user-specific pattern affinity) */
  userPreference: number;
  /** Team usage (team pattern popularity) */
  teamUsage: number;
  /** Global usage (community pattern popularity) */
  globalUsage: number;
  /** Security score (zero vulnerabilities = 1.0) */
  securityScore: number;
  /** Code quality score (static analysis metrics) */
  codeQualityScore: number;
}

/**
 * Confidence score with transparent breakdown
 *
 * Provides total confidence score [0.0, 1.0] and individual dimension scores
 * for debugging and user trust.
 */
export class ConfidenceScore {
  /**
   * Get total confidence score [0.0, 1.0]
   *
   * Weighted sum of all dimension scores:
   * - 0.85+: High confidence (recommended threshold)
   * - 0.60-0.85: Medium confidence
   * - <0.60: Low confidence (not recommended)
   */
  get totalScore(): number;

  /**
   * Get individual dimension scores for transparency
   *
   * Enables debugging and understanding of WHY a pattern matched.
   */
  get breakdown(): ConfidenceBreakdown;

  /**
   * Check if confidence meets threshold
   *
   * @param threshold - Minimum confidence required [0.0, 1.0]
   * @returns true if totalScore >= threshold
   *
   * @example
   * ```typescript
   * if (score.meetsThreshold(0.85)) {
   *   console.log("High confidence match!");
   * }
   * ```
   */
  meetsThreshold(threshold: number): boolean;
}

/**
 * Pattern in the ÆtherLight pattern library
 *
 * Represents reusable knowledge captured from past coding sessions.
 * Patterns are immutable once created.
 */
export class Pattern {
  /**
   * Create a new pattern
   *
   * @param title - Short description of the pattern
   * @param content - Full explanation with Chain of Thought reasoning
   * @param tags - Tags for keyword matching
   *
   * @example
   * ```typescript
   * const pattern = new Pattern(
   *   "Rust error handling",
   *   "Use Result<T, E> for fallible operations",
   *   ["rust", "error-handling"]
   * );
   * ```
   */
  constructor(title: string, content: string, tags: string[]);

  /** Unique identifier (UUID v4 as string) */
  get id(): string;

  /** Pattern title (short description) */
  get title(): string;

  /** Pattern content (full explanation with Chain of Thought reasoning) */
  get content(): string;

  /** Tags for keyword matching */
  get tags(): string[];

  /** Pattern metadata (context for multi-dimensional matching) */
  get metadata(): PatternMetadata;

  /** Creation timestamp (ISO 8601 string) */
  get createdAt(): string;

  /** Last modification timestamp (ISO 8601 string) */
  get modifiedAt(): string;

  /**
   * Serialize pattern to JSON string
   *
   * @returns JSON string representation of pattern
   *
   * @example
   * ```typescript
   * const json = pattern.toJSON();
   * localStorage.setItem('pattern', json);
   * ```
   */
  toJSON(): string;

  /**
   * Deserialize pattern from JSON string
   *
   * @param json - JSON string representation of pattern
   * @returns Deserialized pattern instance
   *
   * @example
   * ```typescript
   * const json = localStorage.getItem('pattern');
   * const pattern = Pattern.fromJSON(json);
   * ```
   */
  static fromJSON(json: string): Pattern;
}

/**
 * Match result with pattern and confidence score
 */
export interface MatchResult {
  /** Matched pattern */
  pattern: Pattern;
  /** Confidence score with breakdown */
  confidence: ConfidenceScore;
}

/**
 * Pattern matcher with in-memory pattern library
 *
 * Performs multi-dimensional pattern matching against user queries.
 * Performance target: <50ms for 10,000 patterns.
 */
export class PatternMatcher {
  /**
   * Create a new empty pattern matcher
   *
   * @example
   * ```typescript
   * const matcher = new PatternMatcher();
   * ```
   */
  constructor();

  /**
   * Add a pattern to the library
   *
   * @param pattern - Pattern to add
   * @throws Error if pattern with same ID already exists
   *
   * @example
   * ```typescript
   * const pattern = new Pattern("Title", "Content", ["tag"]);
   * matcher.addPattern(pattern);
   * ```
   */
  addPattern(pattern: Pattern): void;

  /**
   * Remove a pattern from the library by ID
   *
   * @param id - UUID string of pattern to remove
   * @throws Error if pattern not found
   *
   * @example
   * ```typescript
   * matcher.removePattern(pattern.id);
   * ```
   */
  removePattern(id: string): void;

  /**
   * Get a pattern by ID
   *
   * @param id - UUID string of pattern to retrieve
   * @returns Pattern instance
   * @throws Error if pattern not found
   *
   * @example
   * ```typescript
   * const pattern = matcher.getPattern(id);
   * console.log(pattern.title);
   * ```
   */
  getPattern(id: string): Pattern;

  /**
   * Get total pattern count
   *
   * @returns Number of patterns in library
   *
   * @example
   * ```typescript
   * console.log(`Library has ${matcher.count()} patterns`);
   * ```
   */
  count(): number;

  /**
   * Check if library is empty
   *
   * @returns true if no patterns in library
   *
   * @example
   * ```typescript
   * if (matcher.isEmpty()) {
   *   console.log("No patterns in library");
   * }
   * ```
   */
  isEmpty(): boolean;

  /**
   * Find matching patterns for a user query
   *
   * Performs multi-dimensional pattern matching combining:
   * - Semantic similarity (30% weight)
   * - Context match (15% weight)
   * - Keyword overlap (10% weight)
   * - Historical success rate (15% weight)
   * - And 6 additional dimensions
   *
   * Results sorted by confidence (descending).
   *
   * @param query - User query string
   * @param maxResults - Maximum number of results to return
   * @returns Array of match results sorted by confidence
   * @throws Error if query is empty or library is empty
   *
   * @example
   * ```typescript
   * const results = matcher.findMatches("How do I handle errors in Rust?", 5);
   * for (const result of results) {
   *   console.log(`${result.pattern.title}: ${result.confidence.totalScore * 100}%`);
   * }
   * ```
   */
  findMatches(query: string, maxResults: number): MatchResult[];
}

/**
 * Get library version
 *
 * @returns Semantic version string (e.g., "0.1.0")
 *
 * @example
 * ```typescript
 * import { version } from '@aetherlight/node';
 * console.log(`ÆtherLight Core v${version()}`);
 * ```
 */
export function version(): string;
