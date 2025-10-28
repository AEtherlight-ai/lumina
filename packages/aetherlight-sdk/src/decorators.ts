/**
 * ÆtherLight SDK Decorators
 *
 * DESIGN DECISION: TypeScript decorators for function registration
 * WHY: Clean, declarative syntax that auto-generates metadata
 *
 * REASONING CHAIN:
 * 1. @Lumina decorator marks function as voice-accessible
 * 2. @param decorator provides parameter descriptions
 * 3. Reflect.metadata stores metadata at compile-time
 * 4. Client.register() reads metadata at runtime
 * 5. Sends function schema to ÆtherLight daemon
 *
 * PATTERN: Pattern-SDK-001 (Application Integration SDK)
 */

import 'reflect-metadata';
import { FunctionMetadata } from './client';

/**
 * @Lumina decorator - Marks method as voice-accessible
 *
 * DESIGN DECISION: Decorator stores metadata via reflect-metadata
 * WHY: Enables runtime inspection of function schema
 *
 * USAGE:
 * ```typescript
 * @Lumina({
 *   description: "Search for cases by client name",
 *   examples: ["Find John Doe's cases", "Show Jane Smith's matters"],
 *   tags: ["legal", "search"]
 * })
 * async searchCases(clientName: string): Promise<Case[]> {
 *   return this.database.query('cases', { clientName });
 * }
 * ```
 */
export function Lumina(metadata: FunctionMetadata) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata('voiceCommand', metadata, target, propertyKey);
  };
}

/**
 * @param decorator - Provides parameter description
 *
 * DESIGN DECISION: Parameter decorator extracts type information
 * WHY: TypeScript provides compile-time type information via reflection
 *
 * REASONING CHAIN:
 * 1. Decorator executes during class definition
 * 2. parameterIndex identifies which parameter (0, 1, 2, ...)
 * 3. design:paramtypes reflects the parameter types
 * 4. Store array of parameter metadata
 * 5. Client.register() reads this array
 *
 * USAGE:
 * ```typescript
 * async searchCases(
 *   @param("Client's full name") clientName: string,
 *   @param("Case status: open, closed, or all") status: 'open' | 'closed' | 'all'
 * ): Promise<Case[]> {
 *   // ...
 * }
 * ```
 */
export function param(description: string, required: boolean = true) {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    const existingParams = Reflect.getMetadata('voiceParams', target, propertyKey) || [];
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) || [];

    // Extract parameter name from function signature (best effort)
    const functionString = target[propertyKey].toString();
    const paramMatch = functionString.match(/\(([^)]+)\)/);
    const paramNames = paramMatch
      ? paramMatch[1].split(',').map((p: string) => p.trim().split(/[:\s]/)[0])
      : [];

    existingParams[parameterIndex] = {
      name: paramNames[parameterIndex] || `param${parameterIndex}`,
      type: paramTypes[parameterIndex]?.name || 'any',
      description,
      required,
    };

    Reflect.defineMetadata('voiceParams', existingParams, target, propertyKey);
  };
}

/**
 * Helper function to extract parameter names from function
 *
 * DESIGN DECISION: Parse function.toString() as fallback
 * WHY: TypeScript doesn't preserve parameter names in metadata
 *
 * NOTE: This is a best-effort approach. Works for simple cases but may fail
 * with minified code or complex parameter patterns.
 */
function extractParameterNames(func: Function): string[] {
  const functionString = func.toString();
  const paramMatch = functionString.match(/\(([^)]*)\)/);

  if (!paramMatch) return [];

  return paramMatch[1]
    .split(',')
    .map(param => {
      // Handle destructuring, default values, type annotations
      const cleaned = param.trim().split(/[=:]/)[0].trim();
      return cleaned || 'unknown';
    })
    .filter(name => name !== '');
}
