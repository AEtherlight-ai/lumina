/**
 * Terminal Middleware - Exports
 *
 * PATTERN: Pattern-TERMINAL-001 (Inline AI Assistance)
 * PATTERN: Pattern-VOICE-002 (Unified Input Processing)
 * PATTERN: Pattern-CONTEXT-003 (Multi-Source Context Aggregation)
 * PATTERN: Pattern-PROMPT-001 (Structured Prompt Generation)
 */

export { TerminalMiddleware, registerTerminalMiddleware } from './middleware';
export { VoiceCapture } from './voice-capture';
export { InputProcessor, VoiceInput, TextInput } from './input-processor';
export {
    ContextEnhancer,
    EnhancedPrompt,
    PatternMatch,
    FileContext,
    ProjectState,
    ErrorContext,
    HistoryEntry,
} from './context-enhancer';
export { PromptGenerator } from './prompt-generator';
