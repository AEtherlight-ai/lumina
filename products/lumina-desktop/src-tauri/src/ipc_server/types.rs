/**
 * IPC Server Types
 *
 * DESIGN DECISION: Minimal request/response types for IPC protocol
 * WHY: Start simple (broadcast only), expand to request-response later
 */

use serde::{Deserialize, Serialize};

/**
 * IpcRequest - Messages from IDE to desktop app
 *
 * DESIGN DECISION: Request-response pattern for queries
 * WHY: IDE may need full context snapshot on startup
 *
 * EXAMPLES:
 * - GetFullContext: IDE requests complete system context
 * - SubscribeToGit: IDE requests only git updates
 * - SubscribeToFiles: IDE requests only file updates
 */
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum IpcRequest {
    /// Request full system context snapshot
    GetFullContext,

    /// Subscribe to specific update types
    Subscribe {
        git: bool,
        files: bool,
        docs: bool,
    },

    /// Ping to keep connection alive
    Ping,
}

/**
 * IpcResponse - Messages from desktop app to IDE
 *
 * DESIGN DECISION: Tagged enum with serde(tag = "type")
 * WHY: TypeScript clients can discriminate by "type" field
 */
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum IpcResponse {
    /// Full context snapshot
    FullContext {
        context: crate::system_context::types::SystemContext,
    },

    /// Context update broadcast (git, files, docs, voice)
    #[serde(rename = "contextUpdate")]
    ContextUpdate {
        id: String,
        #[serde(rename = "updateType")]
        update_type: String,
        #[serde(rename = "recordingState", skip_serializing_if = "Option::is_none")]
        recording_state: Option<crate::system_context::types::RecordingState>,
    },

    /// Command to focus Voice panel in VS Code
    #[serde(rename = "focusVoicePanel")]
    FocusVoicePanel,

    /// Pong response
    Pong,

    /// Error response
    Error { message: String },
}
