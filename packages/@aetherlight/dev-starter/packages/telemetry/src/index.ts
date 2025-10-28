/**
 * @aetherlight/telemetry
 *
 * DESIGN DECISION: Opt-in telemetry with three levels of data collection
 * WHY: Build collective intelligence while respecting user privacy
 *
 * REASONING CHAIN:
 * 1. Free tier: Anonymous usage stats only (opt-in, default off)
 * 2. Network tier: Pattern metadata from circle of trust (opt-in)
 * 3. Pro tier: Full patterns for collective intelligence (mandatory)
 * 4. All tiers: PII automatically stripped, human-reviewable
 * 5. User controls: Opt-out anytime, exclude patterns, delete data
 *
 * PATTERN: Pattern-TELEMETRY-001 (Privacy-First Collective Intelligence)
 * RELATED: SDK_LICENSING_MODEL_V2.md, BUSINESS_MODEL_V2.md
 *
 * PRIVACY GUARANTEES:
 * - NO keystroke logging
 * - NO API keys or credentials
 * - NO proprietary code (without consent)
 * - NO user identifiable information (PII)
 * - YES to GDPR compliance (export, delete, opt-out)
 */

export * from './types';
export * from './consent';
export * from './collector';
export * from './anonymizer';
export * from './validator';
