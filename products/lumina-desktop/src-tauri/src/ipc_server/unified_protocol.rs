/**
 * Unified IPC Protocol - Voice Capture + System Context
 *
 * DESIGN DECISION: Single protocol supporting both voice capture and system context sync
 * WHY: Simpler architecture, single WebSocket port, unified message handling
 *
 * REASONING CHAIN:
 * 1. Extension needs voice capture (CaptureVoiceRequest → CaptureVoiceResponse)
 * 2. Extension needs system context (git/file/doc updates)
 * 3. Separate ports = complexity, port conflicts, doubled code
 * 4. Unified protocol = single WebSocket, message type routing, shared connection
 * 5. Result: Extension connects once, gets all features
 *
 * PATTERN: Pattern-IPC-002 (Unified IPC Protocol)
 * RELATED: products/lumina-desktop/src-tauri/src/ipc_server/mod.rs
 * FUTURE: Add streaming support, compression
 */

use serde::{Deserialize, Serialize};

/**
 * Code context extracted from IDE editor
 *
 * DESIGN DECISION: Match TypeScript CodeContext interface exactly
 * WHY: Zero friction serialization/deserialization across language boundary
 */
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CodeContext {
    /// Programming language (e.g., "typescript", "rust", "python")
    pub language: String,
    /// Absolute file path
    pub current_file: String,
    /// Cursor position for precise context
    pub cursor_position: CursorPosition,
    /// Surrounding code (50 lines before/after cursor)
    pub surrounding_code: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CursorPosition {
    pub line: u32,
    pub character: u32,
}

/**
 * Pattern match result from pattern matching engine
 */
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PatternMatch {
    /// Pattern ID from pattern library
    pub id: String,
    /// Human-readable pattern name
    pub name: String,
    /// Chain of Thought reasoning for why pattern matched
    pub reasoning: String,
    /// Confidence score (0.0 - 1.0)
    pub confidence: f32,
}

/**
 * Settings sync payload from VS Code to desktop app
 *
 * DESIGN DECISION: Sync only VS Code-relevant settings, not all desktop settings
 * WHY: VS Code is single source of truth for voice/API settings, desktop manages UI/system settings
 *
 * REASONING CHAIN:
 * 1. User configures OpenAI API key in VS Code settings (aetherlight.desktop.openaiApiKey)
 * 2. Extension syncs this to desktop app via IPC when connection established
 * 3. Desktop app merges synced settings with existing settings (VS Code overrides defaults)
 * 4. Desktop app saves merged settings to ~/.lumina/settings.json
 * 5. Result: Single source of truth (VS Code settings), zero duplicate configuration
 *
 * PATTERN: Pattern-SETTINGS-SYNC-001 (VS Code → Desktop Settings Sync)
 */
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SettingsSync {
    /// OpenAI API key for Whisper voice transcription
    pub openai_api_key: String,
    /// Whisper model to use (base.en, small.en, medium.en, large)
    pub whisper_model: String,
    /// Whether to use offline mode (local Whisper.cpp) or OpenAI API
    pub offline_mode: bool,
}

/**
 * Error codes for structured error handling
 *
 * DESIGN DECISION: Match TypeScript ErrorCode enum exactly
 * WHY: Consistent error handling across language boundary
 */
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCode {
    MicrophoneDenied,
    MicrophoneNotFound,
    TranscriptionFailed,
    PatternMatchingFailed,
    Timeout,
    DesktopNotRunning,
    ConnectionError,
    InvalidMessage,
    Unknown,
}

/**
 * Unified IPC Message - All message types in one enum
 *
 * DESIGN DECISION: Tagged enum with serde(tag = "type")
 * WHY: TypeScript can discriminate by "type" field, Rust gets type safety
 *
 * REASONING CHAIN:
 * 1. WebSocket message arrives as JSON string
 * 2. Deserialize to UnifiedIpcMessage enum
 * 3. Match on message type
 * 4. Route to appropriate handler (voice, context, etc.)
 * 5. Send response back to client
 */
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum UnifiedIpcMessage {
    // ==================== Voice Capture Messages ====================
    /// Request: Extension → Desktop - Capture voice with code context
    #[serde(rename = "captureVoice")]
    CaptureVoiceRequest {
        id: String,
        context: CodeContext,
    },

    /// Response: Desktop → Extension - Voice capture result
    #[serde(rename = "captureVoiceResponse")]
    CaptureVoiceResponse {
        id: String,
        success: bool,
        text: String,
        confidence: f32,
        #[serde(skip_serializing_if = "Option::is_none")]
        pattern: Option<PatternMatch>,
        #[serde(skip_serializing_if = "Option::is_none")]
        error: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        error_code: Option<ErrorCode>,
    },

    /// Status: Desktop → Extension - Real-time voice capture status
    #[serde(rename = "voiceStatus")]
    VoiceStatus {
        id: String,
        /// Current voice capture status
        status: VoiceStatusType,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        /// Request ID this status update belongs to
        request_id: String,
    },

    // ==================== System Context Messages ====================
    /// Request: Extension → Desktop - Get full system context snapshot
    #[serde(rename = "getFullContext")]
    GetFullContext { id: String },

    /// Request: Extension → Desktop - Subscribe to specific update types
    #[serde(rename = "subscribe")]
    Subscribe {
        id: String,
        git: bool,
        files: bool,
        docs: bool,
    },

    /// Response: Desktop → Extension - Full context snapshot
    #[serde(rename = "fullContext")]
    FullContext {
        id: String,
        context: crate::system_context::types::SystemContext,
    },

    /// Update: Desktop → Extension - Incremental system context update
    #[serde(rename = "contextUpdate")]
    ContextUpdate {
        id: String,
        update: crate::system_context::types::ContextUpdate,
    },

    // ==================== Settings Synchronization ====================
    /// Request: Extension → Desktop - Sync settings from VS Code to desktop app
    #[serde(rename = "syncSettings")]
    SyncSettings {
        id: String,
        settings: SettingsSync,
    },

    /// Response: Desktop → Extension - Settings sync confirmation
    #[serde(rename = "syncSettingsResponse")]
    SyncSettingsResponse {
        id: String,
        success: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        error: Option<String>,
    },

    // ==================== Connection Management ====================
    /// Ping to keep connection alive
    #[serde(rename = "ping")]
    Ping { id: String },

    /// Pong response
    #[serde(rename = "pong")]
    Pong { id: String },

    /// Error response
    #[serde(rename = "error")]
    Error { id: String, message: String },
}

/**
 * Voice capture status enum
 *
 * DESIGN DECISION: Match TypeScript VoiceStatus.status exactly
 * WHY: TypeScript can use string literal types, Rust gets exhaustive match
 */
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum VoiceStatusType {
    Listening,
    Transcribing,
    Matching,
    Complete,
    Error,
}

/**
 * Helper to create error response
 */
impl UnifiedIpcMessage {
    pub fn error(id: String, message: String) -> Self {
        UnifiedIpcMessage::Error { id, message }
    }

    pub fn pong(id: String) -> Self {
        UnifiedIpcMessage::Pong { id }
    }
}
