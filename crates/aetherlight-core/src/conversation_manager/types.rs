/**
 * Conversation Manager Types
 *
 * DESIGN DECISION: Track full conversation history per session
 * WHY: Context needed for resolving ambiguous follow-up queries
 *
 * PATTERN: Pattern-CONVERSATION-001 (Multi-Turn Dialog Management)
 */

use crate::function_call_generator::FunctionCall;
use chrono::{DateTime, Utc, Duration};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/**
 * Conversation Session - State for Multi-Turn Dialog
 *
 * DESIGN DECISION: 5-minute timeout, max 5 turns
 * WHY: Voice conversations are typically short, prevent stale sessions
 *
 * REASONING CHAIN:
 * 1. User starts conversation with initial query
 * 2. Session created with unique ID and timestamp
 * 3. System asks clarifying questions (up to 5 turns)
 * 4. Session expires after 5 minutes of inactivity
 * 5. Completed or expired sessions are cleaned up
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationSession {
    /// Unique session ID
    pub session_id: String,

    /// User identifier (for multi-user systems)
    pub user_id: String,

    /// Conversation turns (user input + system response)
    pub turns: Vec<ConversationTurn>,

    /// Partially filled function call (intent)
    pub intent: Option<FunctionCall>,

    /// Session creation timestamp
    pub created_at: DateTime<Utc>,

    /// Last activity timestamp (updated on each turn)
    pub last_activity: DateTime<Utc>,

    /// Session expiration timestamp (5 minutes from last activity)
    pub expires_at: DateTime<Utc>,

    /// Session state
    pub state: SessionState,
}

/**
 * Conversation Turn - Single User-System Exchange
 *
 * DESIGN DECISION: Store full turn history (not just current state)
 * WHY: Enables context-aware clarification questions
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationTurn {
    /// Turn number (1-indexed)
    pub turn_number: usize,

    /// User input (natural language)
    pub user_input: String,

    /// System response
    pub system_response: SystemResponse,

    /// Timestamp of this turn
    pub timestamp: DateTime<Utc>,
}

/**
 * System Response - What System Says/Does
 *
 * DESIGN DECISION: Enum for type-safe response handling
 * WHY: Different response types require different UI treatment
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SystemResponse {
    /// Ask for missing required parameter
    AskForMissingParam {
        param_name: String,
        param_type: String,
        prompt: String,
        examples: Vec<String>,
    },

    /// Clarification needed (multiple options)
    Clarification {
        question: String,
        options: Vec<String>,
    },

    /// Confirmation before execution
    Confirmation {
        function_call: FunctionCall,
        summary: String,
    },

    /// Function executed, return result
    Execution {
        function_id: String,
        result: serde_json::Value,
    },

    /// Error occurred
    Error {
        message: String,
        recoverable: bool,
    },
}

/**
 * Session State
 *
 * DESIGN DECISION: Explicit state machine for session lifecycle
 * WHY: Clear state transitions, easier to debug
 */
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SessionState {
    /// Gathering parameters
    Active,

    /// Waiting for confirmation
    AwaitingConfirmation,

    /// Executing function
    Executing,

    /// Session completed successfully
    Completed,

    /// Session expired (timeout)
    Expired,

    /// Session cancelled by user
    Cancelled,
}

/**
 * Session Error Types
 */
#[derive(Debug, thiserror::Error)]
pub enum SessionError {
    #[error("Session not found: {0}")]
    SessionNotFound(String),

    #[error("Session expired: {0}")]
    SessionExpired(String),

    #[error("Invalid session state: expected {expected}, got {actual}")]
    InvalidState { expected: String, actual: String },

    #[error("Maximum turns exceeded: {0}")]
    MaxTurnsExceeded(usize),

    #[error("Function call generation failed: {0}")]
    FunctionCallError(String),

    #[error("Parameter extraction failed: {0}")]
    ParameterExtractionError(String),
}

impl ConversationSession {
    /**
     * Create new conversation session
     */
    pub fn new(session_id: String, user_id: String) -> Self {
        let now = Utc::now();
        let expires_at = now + Duration::minutes(5);

        Self {
            session_id,
            user_id,
            turns: Vec::new(),
            intent: None,
            created_at: now,
            last_activity: now,
            expires_at,
            state: SessionState::Active,
        }
    }

    /**
     * Check if session is expired
     */
    pub fn is_expired(&self) -> bool {
        Utc::now() > self.expires_at
    }

    /**
     * Update last activity timestamp and extend expiration
     */
    pub fn touch(&mut self) {
        self.last_activity = Utc::now();
        self.expires_at = self.last_activity + Duration::minutes(5);
    }

    /**
     * Add turn to conversation history
     */
    pub fn add_turn(&mut self, user_input: String, system_response: SystemResponse) {
        let turn = ConversationTurn {
            turn_number: self.turns.len() + 1,
            user_input,
            system_response,
            timestamp: Utc::now(),
        };
        self.turns.push(turn);
        self.touch();
    }

    /**
     * Get number of turns so far
     */
    pub fn turn_count(&self) -> usize {
        self.turns.len()
    }
}
