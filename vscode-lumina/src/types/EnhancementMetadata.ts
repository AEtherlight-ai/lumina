/**
 * EnhancementMetadata - Stub implementation for v0.17.5 API URL fix
 *
 * REASON: This file was imported in v0.17.4 but never created, causing compilation failures.
 * This stub allows v0.17.5 to compile and fixes the critical API URL bug.
 *
 * TODO: Implement full enhancement metadata types in future release
 */

/**
 * Metadata for AI enhancement operations (stub)
 */
export interface EnhancementMetadata {
  timestamp?: string;
  modelUsed?: string;
  contextType?: string;
  [key: string]: any;
}

/**
 * Options for formatting metadata (stub)
 */
export interface MetadataFormatterOptions {
  includeTimestamp?: boolean;
  includeModel?: boolean;
  [key: string]: any;
}
