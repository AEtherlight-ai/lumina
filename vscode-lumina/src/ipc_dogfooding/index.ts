/**
 * IPC Dogfooding Module - Barrel Exports
 *
 * DESIGN DECISION: Export all public APIs from single entry point
 * WHY: Clean imports, easier to refactor internal structure
 *
 * Usage:
 * ```typescript
 * import { BreadcrumbManager, PatternRecommender, Breadcrumb } from './ipc_dogfooding';
 * ```
 */

// Type exports
export type {
    PatternReference,
    ChainOfThought,
    Breadcrumb,
    FileCitation,
    DogfoodingIPCMessage,
    BreadcrumbQuery,
    PatternRecommendationContext,
    PatternRecommendationResult
} from './types';

// Class exports
export { BreadcrumbManager, BreadcrumbUtils } from './BreadcrumbManager';
export { PatternRecommender } from './PatternRecommender';
export { AgentMessaging } from './AgentMessaging';
export { IPCSender } from './IPCSender';
