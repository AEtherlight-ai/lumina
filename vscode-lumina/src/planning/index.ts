/**
 * Planning Module - AI-assisted collaborative sprint planning
 *
 * DESIGN DECISION: Unified planning module for agent, chat interface, builder
 * WHY: Single interface for all planning components
 *
 * EXPORTS:
 * - PlanningAgent: Conversational AI agent for sprint creation
 * - PlanningChatInterface: VS Code webview chat UI
 * - PlanningState: State enum (IDLE, GATHERING, GENERATING, REVIEWING, READY)
 * - PlanningMessage: Chat message type
 * - PlanningRequirements: Requirements gathered from user
 * - DraftSprintPlan: Generated sprint plan with reasoning
 *
 * PATTERN: Pattern-MODULE-001 (Unified Module Exports)
 * RELATED: AS-018 (Collaborative Planning Agent)
 */

export {
    PlanningAgent,
    PlanningState,
    PlanningMessage,
    PlanningRequirements,
    DraftSprintPlan,
} from './agent';

export {
    PlanningChatInterface,
} from './chat_interface';
