/**
 * Conversation Manager Module - Multi-Turn Dialog Management
 *
 * DESIGN DECISION: Session-based conversation tracking with timeout
 * WHY: Voice interactions may span multiple turns (missing params, clarifications)
 *
 * REASONING CHAIN:
 * 1. User: "Show me John Doe's cases"
 * 2. System detects missing `status` parameter
 * 3. System: "Which status? Open, closed, or all?"
 * 4. User: "Open cases"
 * 5. System extracts `status = "open"`, executes function
 *
 * PATTERN: Pattern-CONVERSATION-001 (Multi-Turn Dialog Management)
 * RELATED: P3.7-003, Function Call Generator, IPC Protocol
 * PERFORMANCE: <50ms to generate follow-up question
 */

pub mod types;
pub mod manager;

pub use types::{
    ConversationSession, ConversationTurn, SystemResponse, SessionError
};
pub use manager::ConversationManager;
