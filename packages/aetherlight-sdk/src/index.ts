/**
 * ÆtherLight Application Integration SDK
 *
 * DESIGN DECISION: Single entry point exports all public APIs
 * WHY: Simplifies imports for SDK users
 *
 * USAGE:
 * ```typescript
 * import { AetherlightClient, Lumina, param } from '@aetherlight/sdk';
 *
 * const client = new AetherlightClient({ port: 9876 });
 *
 * class MyApp {
 *   @Lumina({
 *     description: "Search for items",
 *     examples: ["Find item X", "Show item Y"]
 *   })
 *   async searchItems(
 *     @param("Search query") query: string
 *   ): Promise<Item[]> {
 *     return this.database.search(query);
 *   }
 * }
 *
 * client.register(new MyApp());
 * await client.connect();
 * ```
 *
 * PATTERN: Pattern-SDK-001 (Application Integration SDK)
 */

export { AetherlightClient } from './client';
export type { AetherlightConfig, FunctionMetadata, ParamMetadata } from './client';
export { Lumina, param } from './decorators';
