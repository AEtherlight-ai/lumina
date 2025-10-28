/**
 * Telemetry Types
 *
 * DESIGN DECISION: Three-tier telemetry model aligned with subscription tiers
 * WHY: Balance collective intelligence training with user privacy control
 */

/**
 * Telemetry level determines what data is collected
 */
export enum TelemetryLevel {
  /** No data collected (user opted out) */
  DISABLED = 'disabled',

  /** Anonymous usage statistics only (Free tier default) */
  ANONYMOUS = 'anonymous',

  /** Pattern metadata without content (Network tier) */
  METADATA = 'metadata',

  /** Full pattern contribution (Pro tier - mandatory) */
  FULL_PATTERN = 'full_pattern',
}

/**
 * Subscription tier (determines available telemetry levels)
 */
export enum SubscriptionTier {
  FREE = 'free',
  NETWORK = 'network',
  PRO = 'pro',
}

/**
 * User consent state
 *
 * PATTERN: Explicit consent tracking for GDPR compliance
 */
export interface ConsentState {
  /** User ID (anonymized hash) */
  userId: string;

  /** Current subscription tier */
  tier: SubscriptionTier;

  /** Current telemetry level */
  level: TelemetryLevel;

  /** When consent was given */
  consentDate: string; // ISO 8601

  /** When consent was last updated */
  lastUpdated: string; // ISO 8601

  /** Patterns excluded from contribution (by pattern ID) */
  excludedPatterns: string[];

  /** Can we share data with circle of trust? (Network tier) */
  shareWithCircle: boolean;

  /** Can we use data for ML training? (Pro tier) */
  allowTraining: boolean;
}

/**
 * Anonymous usage event (Free tier)
 *
 * COLLECTED:
 * - Pattern category
 * - Success/failure signal
 * - Confidence score
 * - Model used
 *
 * NOT COLLECTED:
 * - Pattern content
 * - User identity
 * - API keys
 * - Code snippets
 */
export interface AnonymousEvent {
  /** Event type */
  type: 'pattern_match' | 'pattern_creation' | 'search_query';

  /** Event timestamp */
  timestamp: string; // ISO 8601

  /** Pattern category (e.g., "Infrastructure", "Quality") */
  category?: string;

  /** Pattern domain (e.g., "Rust", "TypeScript") */
  domain?: string;

  /** Success/failure signal */
  success?: boolean;

  /** Confidence score (0-1) */
  confidence?: number;

  /** AI model used (e.g., "Claude Sonnet") */
  model?: string;

  /** Response time in milliseconds */
  responseTime?: number;
}

/**
 * Pattern metadata event (Network tier)
 *
 * COLLECTED:
 * - Everything in AnonymousEvent
 * - Pattern ID (for circle tracking)
 * - Tags and keywords
 * - Version history
 *
 * NOT COLLECTED:
 * - Pattern content/code
 * - User identity (only anonymized hash)
 * - API keys or credentials
 */
export interface MetadataEvent extends AnonymousEvent {
  /** Pattern ID (anonymized hash) */
  patternId: string;

  /** Pattern title (sanitized) */
  title?: string;

  /** Tags (sanitized) */
  tags?: string[];

  /** Pattern version */
  version?: string;

  /** Last modified timestamp */
  lastModified?: string; // ISO 8601

  /** Usage count */
  usageCount?: number;

  /** Average confidence score across uses */
  avgConfidence?: number;
}

/**
 * Full pattern event (Pro tier)
 *
 * COLLECTED:
 * - Everything in MetadataEvent
 * - Pattern content (anonymized)
 * - Chain of Thought reasoning
 * - Solution code (PII stripped)
 *
 * PRIVACY GUARANTEES:
 * - PII automatically stripped
 * - Human-reviewed before training
 * - Anonymized identifiers
 * - User can exclude specific patterns
 */
export interface FullPatternEvent extends MetadataEvent {
  /** Problem description (PII stripped) */
  problem: string;

  /** Solution code (PII stripped) */
  solution: string;

  /** Chain of Thought reasoning */
  reasoning: string;

  /** Related patterns (by ID) */
  relatedPatterns?: string[];

  /** Success metrics */
  metrics?: {
    /** Time saved (estimated) */
    timeSaved?: number; // minutes

    /** Lines of code */
    linesOfCode?: number;

    /** Test coverage */
    testCoverage?: number; // percentage
  };

  /** Validation status */
  validated?: boolean;

  /** Human review status */
  reviewed?: boolean;
}

/**
 * Telemetry configuration
 */
export interface TelemetryConfig {
  /** Is telemetry enabled? */
  enabled: boolean;

  /** Telemetry level */
  level: TelemetryLevel;

  /** API endpoint for telemetry data */
  endpoint?: string;

  /** API key (if using Network/Pro tier) */
  apiKey?: string;

  /** Send interval in milliseconds */
  sendInterval?: number;

  /** Maximum batch size */
  maxBatchSize?: number;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Telemetry validation result
 *
 * DESIGN DECISION: Validate data before sending
 * WHY: Prevent PII leaks, ensure data quality
 */
export interface ValidationResult {
  /** Is data valid for sending? */
  valid: boolean;

  /** Validation errors (if any) */
  errors: string[];

  /** Warnings (data will be sent but flagged) */
  warnings: string[];

  /** PII detected? */
  piiDetected: boolean;

  /** Sanitized data (if PII was removed) */
  sanitized?: any;
}

/**
 * Telemetry batch for sending
 */
export interface TelemetryBatch {
  /** Batch ID */
  batchId: string;

  /** User ID (anonymized) */
  userId: string;

  /** Subscription tier */
  tier: SubscriptionTier;

  /** Telemetry level */
  level: TelemetryLevel;

  /** Events in this batch */
  events: (AnonymousEvent | MetadataEvent | FullPatternEvent)[];

  /** Batch timestamp */
  timestamp: string; // ISO 8601

  /** Batch size in bytes */
  sizeBytes: number;
}
