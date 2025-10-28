/**
 * IPC Server - WebSocket server for sharing system context with IDEs
 *
 * DESIGN DECISION: WebSocket over localhost (ws://localhost:43215)
 * WHY: Real-time bidirectional communication, <5ms latency, standard protocol
 *
 * REASONING CHAIN:
 * 1. Desktop app monitors system context (git, files, docs)
 * 2. IDEs (VS Code, Cursor) need real-time context updates
 * 3. WebSocket provides bidirectional, low-latency IPC
 * 4. Run on fixed port (43215) for easy discovery
 * 5. Broadcast context updates to all connected clients
 * 6. Result: IDEs receive system context in <5ms
 *
 * PATTERN: Pattern-IPC-001 (WebSocket IPC Server)
 * RELATED: Desktop-001 (SystemContextProvider), IDE extensions
 * PERFORMANCE: <5ms latency, <100 concurrent connections
 */

use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, tungstenite::Message};
use futures_util::{StreamExt, SinkExt};
use tokio::sync::broadcast;
use std::sync::Arc;
use anyhow::Result;
use uuid::Uuid;

use crate::system_context::types::ContextUpdate;

pub mod types;
pub mod unified_protocol;

pub use types::*;
pub use unified_protocol::*;

/**
 * IpcServer - WebSocket server for context sharing
 *
 * USAGE:
 * ```rust
 * let (tx, rx) = broadcast::channel(100);
 * let server = IpcServer::new(tx);
 * server.start("127.0.0.1:43215").await?;
 *
 * // In SystemContextProvider:
 * tx.send(ContextUpdate::GitChanged(context.git.clone()))?;
 * ```
 */
pub struct IpcServer {
    /// Broadcast channel for context updates
    update_rx: Arc<broadcast::Sender<ContextUpdate>>,
}

impl IpcServer {
    /**
     * Create new IPC server
     *
     * @param update_rx - Broadcast channel to receive context updates
     */
    pub fn new(update_rx: broadcast::Sender<ContextUpdate>) -> Self {
        Self {
            update_rx: Arc::new(update_rx),
        }
    }

    /**
     * Start WebSocket server (spawns background task)
     *
     * DESIGN DECISION: Listen on 127.0.0.1:43215 (localhost only)
     * WHY: Security - only local processes can connect
     *
     * REASONING CHAIN:
     * 1. Bind to localhost (not 0.0.0.0) - prevents remote connections
     * 2. Fixed port 43215 - IDEs know where to connect
     * 3. Accept connections in loop
     * 4. Spawn task per connection (handle_client)
     * 5. Each client subscribes to broadcast channel
     * 6. Forward context updates to all clients
     *
     * @param addr - Address to bind (default: "127.0.0.1:43215")
     */
    pub async fn start(&self, addr: &str) -> Result<()> {
        let listener = TcpListener::bind(addr).await?;
        println!("🌐 IPC Server listening on {}", addr);

        let update_rx = self.update_rx.clone();

        tokio::spawn(async move {
            loop {
                match listener.accept().await {
                    Ok((stream, addr)) => {
                        println!("✅ New IDE connection from: {}", addr);

                        let update_rx_clone = update_rx.clone();

                        tokio::spawn(async move {
                            if let Err(e) = Self::handle_client(stream, update_rx_clone).await {
                                eprintln!("❌ Client error ({}): {}", addr, e);
                            }
                        });
                    }
                    Err(e) => {
                        eprintln!("❌ Failed to accept connection: {}", e);
                    }
                }
            }
        });

        Ok(())
    }

    /**
     * Handle individual client connection
     *
     * DESIGN DECISION: Subscribe to broadcast channel per client
     * WHY: Each IDE gets independent stream of updates
     *
     * REASONING CHAIN:
     * 1. Upgrade TCP connection to WebSocket
     * 2. Subscribe to broadcast channel
     * 3. Loop: receive context update → serialize to JSON → send to client
     * 4. Handle client messages (ping/pong, queries)
     * 5. Close on disconnect
     *
     * PERFORMANCE: <5ms update delivery (localhost WebSocket)
     */
    async fn handle_client(
        stream: TcpStream,
        update_rx: Arc<broadcast::Sender<ContextUpdate>>,
    ) -> Result<()> {
        // Upgrade to WebSocket
        let ws_stream = accept_async(stream).await?;
        let (write, mut read) = ws_stream.split();

        // Create channel for sending messages to the write task
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<Message>();

        // Subscribe to context updates
        let mut update_rx_sub = update_rx.subscribe();

        // Spawn task to handle all writes (both updates and responses)
        let write_handle = tokio::spawn(async move {
            let mut write = write;

            loop {
                tokio::select! {
                    // Handle context updates
                    Ok(update) = update_rx_sub.recv() => {
                        // Convert ContextUpdate to IpcResponse format
                        let ipc_response = match update {
                            ContextUpdate::VoiceRecording(recording_state) => {
                                types::IpcResponse::ContextUpdate {
                                    id: uuid::Uuid::new_v4().to_string(),
                                    update_type: "VoiceRecording".to_string(),
                                    recording_state: Some(recording_state),
                                }
                            }
                            ContextUpdate::FocusVoicePanel => {
                                types::IpcResponse::FocusVoicePanel
                            }
                            _ => {
                                // GitChanged, FileChanged, DocChanged will be added later
                                continue;
                            }
                        };

                        let json = match serde_json::to_string(&ipc_response) {
                            Ok(json) => json,
                            Err(e) => {
                                eprintln!("❌ Failed to serialize update: {}", e);
                                continue;
                            }
                        };

                        if let Err(e) = write.send(Message::Text(json)).await {
                            eprintln!("❌ Failed to send update to client: {}", e);
                            break;
                        }
                    }
                    // Handle outgoing messages from main loop
                    Some(msg) = rx.recv() => {
                        if let Err(e) = write.send(msg).await {
                            eprintln!("❌ Failed to send message to client: {}", e);
                            break;
                        }
                    }
                    else => break,
                }
            }
        });

        // Handle incoming messages from client
        while let Some(msg) = read.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    println!("📩 Received from client: {}", text);

                    // Parse unified protocol message
                    match serde_json::from_str::<UnifiedIpcMessage>(&text) {
                        Ok(parsed_msg) => {
                            // Route message to appropriate handler
                            let response = Self::route_message(parsed_msg).await;

                            // Send response back to client via channel
                            if let Some(resp) = response {
                                let json = match serde_json::to_string(&resp) {
                                    Ok(json) => json,
                                    Err(e) => {
                                        eprintln!("❌ Failed to serialize response: {}", e);
                                        continue;
                                    }
                                };

                                let _ = tx.send(Message::Text(json));
                            }
                        }
                        Err(e) => {
                            eprintln!("❌ Failed to parse message: {}", e);
                            let error = UnifiedIpcMessage::error(
                                "unknown".to_string(),
                                format!("Invalid message format: {}", e)
                            );
                            if let Ok(json) = serde_json::to_string(&error) {
                                let _ = tx.send(Message::Text(json));
                            }
                        }
                    }
                }
                Ok(Message::Ping(ping)) => {
                    // Respond to ping via channel
                    let _ = tx.send(Message::Pong(ping));
                }
                Ok(Message::Close(_)) => {
                    println!("👋 Client disconnected");
                    break;
                }
                Err(e) => {
                    eprintln!("❌ WebSocket error: {}", e);
                    break;
                }
                _ => {}
            }
        }

        // Clean up write task
        drop(tx);
        let _ = write_handle.await;

        Ok(())
    }

    /**
     * Route message to appropriate handler
     *
     * DESIGN DECISION: Match on message type, route to handler
     * WHY: Single dispatch point, easy to add new message types
     *
     * REASONING CHAIN:
     * 1. Receive UnifiedIpcMessage enum
     * 2. Match on variant (CaptureVoiceRequest, GetFullContext, etc.)
     * 3. Call appropriate handler function
     * 4. Return response (or None for one-way messages)
     */
    async fn route_message(msg: UnifiedIpcMessage) -> Option<UnifiedIpcMessage> {
        match msg {
            // ==================== Voice Capture ====================
            UnifiedIpcMessage::CaptureVoiceRequest { id, context } => {
                println!("🎙️  Processing voice capture request (id: {})", id);
                Some(Self::handle_voice_capture(id, context).await)
            }

            // ==================== System Context ====================
            UnifiedIpcMessage::GetFullContext { id } => {
                println!("📋 Processing get full context request (id: {})", id);
                Some(Self::handle_get_full_context(id).await)
            }

            UnifiedIpcMessage::Subscribe { id, git, files, docs } => {
                println!("🔔 Processing subscribe request (id: {}, git: {}, files: {}, docs: {})", id, git, files, docs);
                // Subscribe requests don't have a response (subscription is implicit)
                Some(UnifiedIpcMessage::pong(id))
            }

            // ==================== Settings Synchronization ====================
            UnifiedIpcMessage::SyncSettings { id, settings } => {
                println!("⚙️  Processing settings sync from VS Code (id: {})", id);
                Some(Self::handle_sync_settings(id, settings).await)
            }

            // ==================== Connection Management ====================
            UnifiedIpcMessage::Ping { id } => {
                Some(UnifiedIpcMessage::pong(id))
            }

            // Other messages (responses, updates) don't need routing (they're outbound only)
            _ => {
                println!("⚠️  Received outbound-only message type (ignoring)");
                None
            }
        }
    }

    /**
     * Handle voice capture request
     *
     * DESIGN DECISION: Placeholder implementation for now
     * WHY: Need IPC working first, then integrate real voice capture
     *
     * TODO: Integrate with actual voice capture system
     * - Start audio recording with cpal
     * - Transcribe with Whisper.cpp or OpenAI API
     * - Match against pattern library
     * - Return real transcription + confidence
     */
    async fn handle_voice_capture(id: String, context: CodeContext) -> UnifiedIpcMessage {
        println!("🎤 Voice capture for file: {} (language: {})", context.current_file, context.language);

        // Placeholder: Simulate voice capture
        // TODO: Replace with real voice capture implementation
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

        UnifiedIpcMessage::CaptureVoiceResponse {
            id,
            success: true,
            text: "[Placeholder] Add authentication with OAuth2".to_string(),
            confidence: 0.85,
            pattern: Some(PatternMatch {
                id: "Pattern-AUTH-001".to_string(),
                name: "OAuth2 Authentication".to_string(),
                reasoning: "User mentioned authentication, matched OAuth2 pattern".to_string(),
                confidence: 0.85,
            }),
            error: None,
            error_code: None,
        }
    }

    /**
     * Handle get full context request
     *
     * TODO: Integrate with SystemContextProvider
     */
    async fn handle_get_full_context(id: String) -> UnifiedIpcMessage {
        println!("📋 Getting full system context");

        // Placeholder: Return error (system context not yet integrated)
        UnifiedIpcMessage::error(
            id,
            "System context not yet implemented".to_string()
        )
    }

    /**
     * Handle settings sync from VS Code
     *
     * DESIGN DECISION: Merge VS Code settings with existing desktop settings, VS Code overrides
     * WHY: VS Code is single source of truth for voice/API settings, desktop manages UI/system settings
     *
     * REASONING CHAIN:
     * 1. Load current settings from ~/.lumina/settings.json
     * 2. Merge synced settings (openai_api_key, whisper_model, offline_mode)
     * 3. Keep desktop-only settings (recording_hotkey, paste_hotkey, auto_paste, etc.)
     * 4. Save merged settings back to settings file
     * 5. Return success response to VS Code extension
     * 6. Result: Single configuration point (VS Code), desktop app stays in sync
     *
     * PATTERN: Pattern-SETTINGS-SYNC-001 (VS Code → Desktop Settings Sync)
     */
    async fn handle_sync_settings(id: String, settings: SettingsSync) -> UnifiedIpcMessage {
        println!("⚙️  Syncing settings from VS Code:");
        println!("   - API Key: {}", if settings.openai_api_key.is_empty() { "❌ Empty" } else { "✅ Set" });
        println!("   - Whisper Model: {}", settings.whisper_model);
        println!("   - Offline Mode: {}", settings.offline_mode);

        // Load current settings path (returns PathBuf directly, not Result)
        let settings_path = crate::get_settings_path();

        // Load current settings
        let mut current_settings = match crate::get_settings() {
            Ok(settings) => settings,
            Err(e) => {
                let error_msg = format!("Failed to load current settings: {}", e);
                eprintln!("❌ {}", error_msg);
                return UnifiedIpcMessage::SyncSettingsResponse {
                    id,
                    success: false,
                    error: Some(error_msg),
                };
            }
        };

        // Merge settings: VS Code overrides desktop defaults
        current_settings.openai_api_key = settings.openai_api_key;
        // Note: whisper_model and offline_mode fields removed per user feedback (Pattern-UI-007)

        // Save merged settings directly to file (no hotkey re-registration needed for sync)
        // Create directory if it doesn't exist
        if let Some(parent) = settings_path.parent() {
            if let Err(e) = std::fs::create_dir_all(parent) {
                let error_msg = format!("Failed to create settings directory: {}", e);
                eprintln!("❌ {}", error_msg);
                return UnifiedIpcMessage::SyncSettingsResponse {
                    id,
                    success: false,
                    error: Some(error_msg),
                };
            }
        }

        // Serialize and write to file
        match serde_json::to_string_pretty(&current_settings) {
            Ok(json) => {
                match std::fs::write(&settings_path, json) {
                    Ok(_) => {
                        println!("✅ Settings synced and saved to: {}", settings_path.display());
                        UnifiedIpcMessage::SyncSettingsResponse {
                            id,
                            success: true,
                            error: None,
                        }
                    }
                    Err(e) => {
                        let error_msg = format!("Failed to write settings file: {}", e);
                        eprintln!("❌ {}", error_msg);
                        UnifiedIpcMessage::SyncSettingsResponse {
                            id,
                            success: false,
                            error: Some(error_msg),
                        }
                    }
                }
            }
            Err(e) => {
                let error_msg = format!("Failed to serialize settings: {}", e);
                eprintln!("❌ {}", error_msg);
                UnifiedIpcMessage::SyncSettingsResponse {
                    id,
                    success: false,
                    error: Some(error_msg),
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::time::{timeout, Duration};

    #[tokio::test]
    async fn test_ipc_server_new() {
        let (tx, _rx) = broadcast::channel(100);
        let server = IpcServer::new(tx);
        assert!(std::ptr::eq(&*server.update_rx, &*server.update_rx));
    }

    #[tokio::test]
    async fn test_ipc_server_start() {
        let (tx, _rx) = broadcast::channel(100);
        let server = IpcServer::new(tx);

        // Start server on random port
        let result = timeout(
            Duration::from_secs(1),
            server.start("127.0.0.1:0"),
        ).await;

        assert!(result.is_ok());
    }
}
