/**
 * Configuration Module - TypeScript Client
 *
 * DESIGN DECISION: Centralized config management for VS Code extension
 * WHY: Single source of truth for all configuration needs
 *
 * REASONING CHAIN:
 * 1. VS Code extension needs config management
 * 2. ConfigManager bridges VS Code settings ↔ Rust config loader
 * 3. Type definitions enable type-safe config access
 * 4. Validation ensures config correctness
 * 5. Result: Robust config management with native VS Code UI
 *
 * PATTERN: Pattern-CONFIG-001 (Hierarchical Configuration)
 * RELATED: crates/aetherlight-core/src/config/
 * PERFORMANCE: <50ms load, <100ms save
 */

export * from './types';
export * from './manager';
