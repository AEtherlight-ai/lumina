/**
 * Human Escalation Module - Barrel Exports
 *
 * DESIGN DECISION: Export all public APIs from single entry point
 * WHY: Clean imports, easier to refactor internal structure
 *
 * Usage:
 * ```typescript
 * import { EscalationManager, EscalationTier, HumanEscalation } from './escalation';
 * ```
 */

// Type exports
export type {
    HumanEscalation,
    EscalationConfig,
    EscalationStats
} from './types';

export {
    EscalationTier,
    EscalationReason,
    DEFAULT_ESCALATION_CONFIG
} from './types';

// Class exports
export { EscalationManager } from './EscalationManager';
export type { EscalationDecision } from './EscalationManager';
export { EscalationUI } from './EscalationUI';
