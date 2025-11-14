/**
 * IContextBuilder Interface
 *
 * DESIGN DECISION: Strategy Pattern for context gathering
 * WHY: Each button type needs different context (bugs need severity, features need use cases)
 *
 * REASONING CHAIN:
 * 1. Different button types require different input forms and context
 * 2. Bug Report: severity, steps to reproduce, expected/actual behavior
 * 3. Feature Request: priority, use case, proposed solution
 * 4. Code Analyzer: languages, frameworks, analysis scope
 * 5. Sprint Planner: sprint goal, languages, frameworks
 * 6. General Enhance: free-form text
 * 7. Each needs specialized context builder with shared contract
 * 8. Strategy pattern allows adding new button types without changing existing code
 * 9. Result: Open/Closed Principle (open for extension, closed for modification)
 *
 * PATTERN: Pattern-STRATEGY-001 (Strategy Pattern for Pluggable Behavior)
 * ARCHITECTURE: v3.0 Context Builder Pattern
 * RELATED: EnhancementContext.ts, AIEnhancementService.ts
 *
 * EXTENSIBILITY:
 * To add new button type:
 * 1. Create new class implementing IContextBuilder
 * 2. Implement build(input: any): Promise<EnhancementContext>
 * 3. Register in voicePanel.ts message handler
 * 4. ~50 lines of code, zero risk to existing buttons
 *
 * MIGRATION: v2.0 → v3.0
 * - v2.0: PromptEnhancer orchestrates 4 services (500+ lines)
 * - v3.0: IContextBuilder implementations (50-150 lines each)
 * - Benefit: 75% less code, 100% safer extensibility
 */

import { EnhancementContext } from '../types/EnhancementContext';

/**
 * Interface for context builders
 *
 * Contract:
 * - build() accepts any input type (flexibility for different forms)
 * - build() returns Promise<EnhancementContext> (normalized output)
 * - Implementations must handle their own input validation
 * - Implementations must provide all required EnhancementContext fields
 * - Errors should be thrown as descriptive Error objects
 */
export interface IContextBuilder {
    /**
     * Build EnhancementContext from input data
     *
     * @param input - Input data from button form (structure varies by button type)
     * @returns Promise resolving to normalized EnhancementContext
     * @throws Error if context building fails (invalid input, missing files, etc.)
     *
     * Example inputs:
     * - Bug Report: { title: string, severity: string, description: string, context?: string }
     * - Feature Request: { title: string, priority: string, useCase: string, solution: string }
     * - Code Analyzer: { languages: string[], frameworks: string[] }
     * - Sprint Planner: { goal: string, languages: string[], frameworks: string[] }
     * - General Enhance: { text: string }
     */
    build(input: any): Promise<EnhancementContext>;
}
