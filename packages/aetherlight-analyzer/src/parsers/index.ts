/**
 * Parser module exports
 *
 * DESIGN DECISION: Barrel export pattern for clean imports
 * WHY: Consumers import from single entry point: import { TypeScriptParser } from './parsers'
 */

export * from './types';
export * from './typescript-parser';
