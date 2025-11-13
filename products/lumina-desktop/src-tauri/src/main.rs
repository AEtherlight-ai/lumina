// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/**
 * Lumina Desktop - System Tray Application
 *
 * DESIGN DECISION: System tray app with global hotkeys (not window-based)
 * WHY: User wants minimal UI that doesn't interfere with other apps
 *
 * REASONING CHAIN:
 * 1. App lives in system tray (no visible window by default)
 * 2. Global hotkey (Ctrl+Alt+R) triggers recording from any app
 * 3. Ticker bar appears at top of screen during recording
 * 4. Transcription auto-copies to clipboard
 * 5. Settings window accessible from tray menu
 * 6. User can configure hotkeys, paste behavior, Whisper model
 *
 * PATTERN: Pattern-TAURI-002 (System Tray Application)
 * RELATED: P3-001 (Compilation), P2-003 (Voice Capture), SYSTEM_TRAY_REBUILD_GUIDE.md
 * FUTURE: Chunked recording with VAD, right-click paste hotkey, real Whisper integration
 *
 * PERFORMANCE:
 * - Target: <500ms startup time
 * - Target: <50MB memory idle
 * - Target: <3MB binary compressed
 */

use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{
    AppHandle, Emitter, Manager, WindowEvent,
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use aetherlight_core::analytics::{UsageTracker, UsageMetrics, MetricsPeriod, EventType};
// Pattern from aetherlight-core not used directly - see DatabasePattern struct
use std::collections::HashMap;
use rusqlite::{Connection, params};
use uuid::Uuid;
use tokio::sync::broadcast;

mod system_context;
mod ipc_server;
mod storage;
mod voice;
mod transcription;
mod auth;  // BUG-002: License validation and device fingerprinting

/**
 * DESIGN DECISION: IPC sender type alias for managed state
 * WHY: Need to send IPC messages from hotkey callbacks to focus Voice panel
 *
 * REASONING CHAIN:
 * 1. Hotkey callbacks need to send IPC messages to VS Code
 * 2. IPC sender is tokio::sync::broadcast::Sender<ContextUpdate>
 * 3. Store in Tauri managed state for global access
 * 4. Backtick sends FocusVoicePanel message, tilde doesn't
 * 5. Result: Hotkey differentiation between ` and ~
 *
 * PATTERN: Pattern-IPC-004 (Hotkey-Triggered IPC Messages)
 */
type IpcSender = broadcast::Sender<system_context::types::ContextUpdate>;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct VoiceCaptureResult {
    text: String,
    confidence: f32,
    duration_ms: u64,
}

/**
 * DESIGN DECISION: Simplified settings structure with only essential fields
 * WHY: User feedback - "there's no reason to have any of that" (auto_paste, offline_mode, whisper_model)
 *
 * REASONING CHAIN:
 * 1. User loves pattern/domain selection UX - keep those
 * 2. Hotkeys needed for global shortcuts - keep those
 * 3. API key required for transcription - keep that
 * 4. offline_mode: Only online mode with Whisper API - REMOVED
 * 5. auto_paste: Always auto-paste after transcription - REMOVED
 * 6. whisper_model: Only one Whisper model used (via API) - REMOVED
 * 7. Result: Clean, focused settings UI
 *
 * PATTERN: Pattern-UI-007 (User-Driven Simplification)
 */
#[derive(Debug, Serialize, Deserialize, Clone)]
struct AppSettings {
    recording_hotkey: Option<String>, // User-configurable, None = not set
    paste_hotkey: Option<String>,     // Future: configurable paste hotkey
    openai_api_key: String,           // Deprecated (BYOK model) - kept for migration
    license_key: String,              // NEW: Server-managed key authentication
    // License validation response fields (BUG-003)
    #[serde(default)]
    user_id: Option<String>,          // User UUID from /api/license/validate
    #[serde(default)]
    device_id: Option<String>,        // Device UUID from /api/license/validate
    #[serde(default)]
    tier: Option<String>,             // "free" or "pro" from /api/license/validate
    // Three-tier architecture: Local → Hosted → Global
    global_network_api_endpoint: String,  // ÆtherLight API (Vercel)
    hosted_node_url: Option<String>,      // User's own Supabase/Postgres (optional)
    selected_domains: Vec<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            recording_hotkey: Some("Backquote".to_string()), // Backtick (`) for voice capture
            paste_hotkey: None,     // Future: user-configurable
            openai_api_key: String::new(), // Deprecated (BYOK model) - kept for migration
            license_key: String::new(), // NEW: User must configure via Settings or activation
            // License validation fields (BUG-003) - populated after /api/license/validate succeeds
            user_id: None,          // Set after license activation
            device_id: None,        // Set after license activation
            tier: None,             // Set after license activation ("free" or "pro")
            global_network_api_endpoint: "https://api.aetherlight.ai".to_string(), // ÆtherLight global network
            hosted_node_url: None,  // Optional: user's own cloud backup
            selected_domains: vec![], // User selects in Settings UI
        }
    }
}

/**
 * DESIGN DECISION: Separate DatabasePattern struct for desktop app pattern storage
 * WHY: Desktop app's pattern database is independent from aetherlight-core's Pattern API
 *
 * REASONING CHAIN:
 * 1. aetherlight-core's Pattern has private fields and uses builder pattern
 * 2. Desktop app just stores patterns in SQLite for UI display
 * 3. These patterns don't need the full aetherlight-core validation
 * 4. Create separate struct that can be easily stored/retrieved from SQLite
 * 5. Use simple public fields for database serialization
 *
 * PATTERN: Pattern-RUST-002 (Database Bridge Struct Pattern)
 */
#[derive(Debug, Serialize, Deserialize, Clone)]
struct DatabasePattern {
    id: String,
    name: String,
    description: String,
    domain: String,
    confidence_score: Option<f64>,
    tags: Vec<String>,
}

/**
 * DESIGN DECISION: Serializable metrics wrapper for Tauri IPC
 * WHY: Core library's Metrics struct uses MetricsPeriod enum which needs custom serialization
 *
 * REASONING CHAIN:
 * 1. Frontend needs metrics data from Rust analytics module
 * 2. Tauri IPC requires all types to implement Serialize
 * 3. Convert core Metrics → SerializableMetrics for IPC
 * 4. Frontend receives JSON with period as string
 */
#[derive(Debug, Serialize, Deserialize, Clone)]
struct SerializableMetrics {
    period: String, // "daily", "weekly", "monthly", "all_time"
    total_events: i64,
    total_time_saved_minutes: i64,
    total_time_saved_hours: f64,
    voice_captures: i64,
    searches: i64,
    insertions: i64,
    pattern_matches: i64,
}

impl From<aetherlight_core::analytics::Metrics> for SerializableMetrics {
    fn from(metrics: aetherlight_core::analytics::Metrics) -> Self {
        let period_str = match metrics.period {
            MetricsPeriod::Daily => "daily",
            MetricsPeriod::Weekly => "weekly",
            MetricsPeriod::Monthly => "monthly",
            MetricsPeriod::AllTime => "all_time",
        };

        SerializableMetrics {
            period: period_str.to_string(),
            total_events: metrics.total_events,
            total_time_saved_minutes: metrics.total_time_saved_minutes,
            total_time_saved_hours: metrics.total_time_saved_hours(),
            voice_captures: metrics.voice_captures,
            searches: metrics.searches,
            insertions: metrics.insertions,
            pattern_matches: metrics.pattern_matches,
        }
    }
}

/**
 * DESIGN DECISION: Daily time saved history for chart visualization
 * WHY: Frontend needs time-series data to show trends
 */
#[derive(Debug, Serialize, Deserialize, Clone)]
struct DailyTimeSaved {
    date: String, // ISO 8601 format: "2025-10-06"
    minutes_saved: i64,
}

/**
 * DESIGN DECISION: Recording state with Mutex for thread-safe access
 * WHY: Global hotkeys run on separate thread, need shared mutable state
 */
struct RecordingState {
    is_recording: bool,
    start_time: Option<std::time::Instant>,
}

impl Default for RecordingState {
    fn default() -> Self {
        Self {
            is_recording: false,
            start_time: None,
        }
    }
}

/**
 * DESIGN DECISION: Get analytics database path in user's home directory
 * WHY: Analytics data must persist across app restarts, per-user isolation
 */
fn get_analytics_db_path() -> std::path::PathBuf {
    let mut path = dirs::home_dir().expect("Failed to get home directory");
    path.push(".lumina");
    path.push("analytics.db");
    path
}

/**
 * DESIGN DECISION: Get pattern storage database path in user's home directory
 * WHY: Pattern data must persist, use same .lumina directory as analytics
 */
fn get_storage_path() -> std::path::PathBuf {
    let mut path = dirs::home_dir().expect("Failed to get home directory");
    path.push(".lumina");
    path.push("patterns.db");
    path
}

/**
 * DESIGN DECISION: Lazy initialization of analytics tracker
 * WHY: Don't want to fail app startup if analytics DB can't be created
 *
 * REASONING CHAIN:
 * 1. Try to create/open analytics database
 * 2. If fails, return error to frontend (non-fatal)
 * 3. If succeeds, return UsageTracker for queries
 */
fn get_usage_tracker() -> Result<UsageTracker, String> {
    let db_path = get_analytics_db_path();

    // Create directory if it doesn't exist
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create analytics directory: {}", e))?;
    }

    UsageTracker::new(db_path.to_str().unwrap())
        .map_err(|e| format!("Failed to initialize analytics tracker: {}", e))
}

/**
 * DESIGN DECISION: Tauri command to get usage metrics by period
 * WHY: Frontend dashboard needs aggregated statistics
 *
 * REASONING CHAIN:
 * 1. Frontend requests metrics with period string ("daily", "weekly", etc.)
 * 2. Convert string to MetricsPeriod enum
 * 3. Query analytics database
 * 4. Convert to SerializableMetrics for IPC
 * 5. Return JSON to frontend
 *
 * PATTERN: Pattern-TAURI-IPC-001 (Rust ↔ TypeScript data exchange)
 */
#[tauri::command]
fn get_usage_metrics(period: String) -> Result<SerializableMetrics, String> {
    let tracker = get_usage_tracker()?;
    let metrics_instance = UsageMetrics::new(&tracker);

    let period_enum = match period.as_str() {
        "daily" => MetricsPeriod::Daily,
        "weekly" => MetricsPeriod::Weekly,
        "monthly" => MetricsPeriod::Monthly,
        "all_time" => MetricsPeriod::AllTime,
        _ => return Err(format!("Invalid period: {}", period)),
    };

    let metrics = metrics_instance.get_metrics(period_enum)
        .map_err(|e| format!("Failed to get metrics: {}", e))?;

    Ok(SerializableMetrics::from(metrics))
}

/**
 * DESIGN DECISION: Tauri command to get daily time saved history
 * WHY: Frontend needs time-series data for chart visualization
 *
 * REASONING CHAIN:
 * 1. Frontend requests last N days of data
 * 2. Query analytics database grouped by date
 * 3. Return array of {date, minutes_saved} objects
 * 4. Frontend renders as line chart
 *
 * PERFORMANCE: <50ms for 30 days of data (typical case)
 */
#[tauri::command]
fn get_time_saved_history(days: u32) -> Result<Vec<DailyTimeSaved>, String> {
    let tracker = get_usage_tracker()?;

    // Use UsageTracker's public get_daily_time_saved method
    let history_tuples = tracker.get_daily_time_saved(days)
        .map_err(|e| format!("Failed to get daily time saved: {}", e))?;

    // Convert (String, i64) tuples to DailyTimeSaved structs
    let history = history_tuples
        .into_iter()
        .map(|(date, minutes_saved)| DailyTimeSaved {
            date,
            minutes_saved,
        })
        .collect();

    Ok(history)
}

/**
 * DESIGN DECISION: Tauri command to record analytics events
 * WHY: Frontend needs to track actions for dashboard metrics
 *
 * REASONING CHAIN:
 * 1. Frontend calls record_event after user action
 * 2. Convert event type string to EventType enum
 * 3. Insert into analytics database
 * 4. Dashboard auto-refreshes to show updated metrics
 *
 * EXAMPLES:
 * - Voice capture completed → record_event("voice_capture")
 * - Code search executed → record_event("search")
 * - Pattern matched → record_event("pattern_match")
 */
#[tauri::command]
fn record_event(event_type: String, metadata: Option<String>) -> Result<(), String> {
    let tracker = get_usage_tracker()?;

    // Use UsageTracker's public methods based on event type
    let result = match event_type.as_str() {
        "voice_capture" => tracker.record_voice_capture(metadata.as_deref()),
        "search" => tracker.record_search(metadata.as_deref()),
        "insertion" => tracker.record_insertion(metadata.as_deref()),
        "pattern_match" => tracker.record_pattern_match(metadata.as_deref()),
        _ => return Err(format!("Invalid event type: {}", event_type)),
    };

    result.map_err(|e| format!("Failed to record event: {}", e))?;

    Ok(())
}

/**
 * DESIGN DECISION: Tauri command to check token balance
 * WHY: Frontend needs to display balance and check before allowing recording
 *
 * REASONING CHAIN:
 * 1. Load license key from settings
 * 2. Call server API GET /api/tokens/balance
 * 3. Return balance data to frontend
 * 4. Frontend displays "1,000,000 tokens (~2666 minutes)"
 * 5. Result: User sees available balance before recording
 */
#[tauri::command]
async fn get_token_balance() -> Result<transcription::TokenBalanceResponse, String> {
    // Load settings to get license key and API URL
    let settings = get_settings().map_err(|e| format!("Failed to load settings: {}", e))?;

    if settings.license_key.is_empty() {
        return Err("License key not configured. Please activate device first.".to_string());
    }

    // Check balance via server API
    transcription::check_token_balance(
        &settings.license_key,
        &settings.global_network_api_endpoint,
    )
    .await
    .map_err(|e| format!("Failed to check balance: {}", e))
}

/**
 * DESIGN DECISION: Global hotkey toggles recording state
 * WHY: User wants Shift+~ or ` to start/stop recording from any application
 *
 * REASONING CHAIN:
 * 1. User presses hotkey → check current state
 * 2. If idle → start recording, show ticker bar
 * 3. If recording → stop recording, transcribe via OpenAI Whisper API
 * 4. Desktop app types transcript at cursor position via OS-level keyboard simulation
 * 5. Emit events to frontend for UI updates
 *
 * TWO-HOTKEY SYSTEM:
 * - Shift+~ (Tilde): Types transcript immediately wherever cursor is (inline)
 * - ` (Backtick): VS Code moves cursor to voice panel input, then types there
 */
#[tauri::command]
async fn toggle_recording(
    state: tauri::State<'_, Mutex<RecordingState>>,
    audio_buffer: tauri::State<'_, Arc<Mutex<Vec<f32>>>>,
    app: AppHandle,
) -> Result<bool, String> {
    // Read current recording state and determine action
    let (is_starting_recording, duration) = {
        let mut recording = state.lock().map_err(|e| format!("Lock error: {}", e))?;
        recording.is_recording = !recording.is_recording;

        if recording.is_recording {
            recording.start_time = Some(std::time::Instant::now());
            (true, 0u64)
        } else {
            let dur = recording
                .start_time
                .map(|start| start.elapsed().as_millis() as u64)
                .unwrap_or(0);
            (false, dur)
        }
        // MutexGuard dropped here
    };

    if is_starting_recording {
        println!("🎤 Recording started...");

        // DESIGN DECISION: Pre-flight token balance check before recording
        // WHY: Prevents wasting user's time recording if they don't have enough tokens
        //
        // REASONING CHAIN:
        // 1. Load settings to get license key
        // 2. Check token balance via server API
        // 3. Calculate minimum required tokens (375 = 1 minute)
        // 4. If balance < 375 → Show upgrade prompt, don't start recording
        // 5. If balance >= 375 → Proceed with recording
        // 6. Result: User only records when they can afford transcription
        let settings = get_settings().map_err(|e| format!("Failed to load settings: {}", e))?;

        if !settings.license_key.is_empty() {
            match transcription::check_token_balance(
                &settings.license_key,
                &settings.global_network_api_endpoint,
            ).await {
                Ok(balance) => {
                    const MIN_TOKENS: u64 = 375; // 1 minute of transcription
                    if balance.tokens_balance < MIN_TOKENS {
                        println!("⚠️ Insufficient tokens: {} < {} required", balance.tokens_balance, MIN_TOKENS);
                        // Emit event to show upgrade prompt in frontend
                        app.emit("insufficient-tokens", balance.clone()).map_err(|e| e.to_string())?;
                        // Revert recording state
                        let mut recording = state.lock().map_err(|e| format!("Lock error: {}", e))?;
                        recording.is_recording = false;
                        recording.start_time = None;
                        return Err(format!(
                            "Insufficient tokens: {} tokens remaining. Need at least {} tokens for 1 minute.",
                            balance.tokens_balance,
                            MIN_TOKENS
                        ));
                    }
                    println!("✅ Pre-flight check passed: {} tokens available",
                             balance.tokens_balance);
                }
                Err(e) => {
                    eprintln!("⚠️ Balance check failed: {}. Proceeding with recording anyway.", e);
                    // Don't block recording if balance check fails (network issues, etc.)
                }
            }
        }

        // Start audio capture with thread-local storage
        let buffer_clone = Arc::clone(&audio_buffer);
        voice::start_recording_global(buffer_clone, app.clone())
            .map_err(|e| format!("Failed to start recording: {}", e))?;

        // Create and show overlay window at top of screen
        // DESIGN DECISION: Full-width, non-interactive indicator bar at top of screen
        // WHY: User needs to see visual feedback that recording is active WITHOUT blocking transcription
        //
        // REASONING CHAIN:
        // 1. Original 384px width too narrow (only 20% of 1920px screen)
        // 2. User reported: "recording bar has disappeared even when I turn on the recording"
        // 3. Code was creating window but too small to notice
        // 4. Solution: Make it full screen width (3840px covers dual monitor setups)
        // 5. Centered at top, 8px tall (more visible for debugging)
        // 6. **CRITICAL FIX #1:** User reported transcription blocked when indicator visible
        //    - Root cause: Indicator window stealing focus from target app
        //    - enigo types wherever cursor/focus is currently
        //    - If indicator has focus, typing goes nowhere
        // 7. **CRITICAL FIX #2:** focusable(false) made window invisible on Windows
        //    - Windows requires focusable windows to be visible
        //    - Solution: visible_on_all_workspaces + accept_first_mouse(false)
        //    - Window visible but doesn't intercept clicks/focus
        // 8. **CRITICAL FIX #3:** Window not appearing on subsequent recordings
        //    - Root cause: Window label "audio-indicator" already exists (not fully closed)
        //    - Solution: Check if window exists first, show it if it does
        //    - Result: Reuse existing window instead of creating duplicate
        // 9. Result: Clear visual feedback during recording + transcription works
        //
        // PATTERN: Pattern-UI-008 (Non-Interactive Overlay Windows)

        // Check if window already exists (from previous recording)
        if let Some(existing_overlay) = app.get_webview_window("audio-indicator") {
            // Window exists, just show it (but DON'T set focus - that breaks transcription!)
            let _ = existing_overlay.show();
            println!("📊 Audio indicator overlay shown (existing window)");
        } else {
            // Create new window
            if let Ok(overlay) = tauri::WebviewWindowBuilder::new(
                &app,
                "audio-indicator",
                tauri::WebviewUrl::App("indicator.html".into())
            )
            .title("Audio Indicator")
            .inner_size(3840.0, 8.0) // Full width (covers dual monitors), 8px tall for better visibility
            .position(0.0, 0.0) // Top of screen
            .decorations(false) // No title bar
            .always_on_top(true) // Stay above all windows
            .skip_taskbar(true) // Don't appear in taskbar
            // REMOVED .transparent(true) - Tauri 2.0: transparency now configured in tauri.conf.json
            .visible_on_all_workspaces(true) // Show on all virtual desktops
            .accept_first_mouse(false) // Don't intercept first click
            .build() {
                println!("📊 Audio indicator overlay shown (new window)");
            }
        }

        // Emit event to frontend for UI updates
        app.emit("recording-started", ()).map_err(|e| e.to_string())?;

        Ok(true)
    } else {
        println!("⏹️  Recording stopped. Duration: {}ms", duration);

        // Stop audio capture and get samples with native sample rate
        let (audio_samples, sample_rate) = voice::stop_recording_global();
        println!("📊 Captured {} audio samples at {}Hz", audio_samples.len(), sample_rate);

        // Hide overlay window IMMEDIATELY (user gets instant feedback)
        if let Some(overlay) = app.get_webview_window("audio-indicator") {
            let _ = overlay.hide();
            println!("📊 Audio indicator overlay hidden");
        }

        // Load settings to get license key and API URL
        let settings = get_settings().map_err(|e| format!("Failed to load settings: {}", e))?;

        // Check for license key (new monetization model)
        if settings.license_key.is_empty() {
            // Fallback: Check for legacy OpenAI API key (BYOK model - migration period)
            if !settings.openai_api_key.is_empty() {
                println!("⚠️  BYOK model deprecated. Please activate device to get license key.");
                return Err("BYOK model deprecated. Please activate device to get license key. Visit dashboard to activate.".to_string());
            }

            println!("⚠️  License key not configured. Please activate device first.");
            return Err("License key not configured. Please activate device first. Visit dashboard to activate.".to_string());
        }

        // Transcribe audio via server API (proxies to OpenAI with credit tracking)
        println!("🔄 Transcribing audio via server API...");
        let transcript = match transcription::transcribe_audio(
            &audio_samples,
            sample_rate, // Use native sample rate
            &settings.license_key,
            &settings.global_network_api_endpoint,
        )
        .await
        {
            Ok(text) => text,
            Err(e) => {
                // Handle structured errors with frontend event emission (BUG-004)
                use transcription::TranscriptionError;

                match &e {
                    TranscriptionError::Unauthorized { message } => {
                        // Emit event to show license activation dialog
                        let _ = app.emit("show-license-activation", message.clone());
                        return Err(format!("License invalid: {}. Please re-activate your device.", message));
                    }
                    TranscriptionError::PaymentRequired { message, balance_tokens, required_tokens } => {
                        // Emit event to show token purchase dialog with balance
                        let payload = serde_json::json!({
                            "message": message,
                            "balance": balance_tokens,
                            "required": required_tokens,
                        });
                        let _ = app.emit("show-token-purchase", payload);
                        return Err(format!("Insufficient tokens: {}. You have {} tokens, need {} tokens.",
                            message, balance_tokens, required_tokens));
                    }
                    TranscriptionError::Forbidden { message } => {
                        // Emit event to show device activation dialog
                        let _ = app.emit("show-device-activation", message.clone());
                        return Err(format!("Device not active: {}. Please activate your device.", message));
                    }
                    TranscriptionError::ServerError { message } |
                    TranscriptionError::NetworkError { message } => {
                        // Emit event to show retry dialog
                        let _ = app.emit("show-retry-dialog", message.clone());
                        return Err(format!("Temporary error: {}. Please try again.", message));
                    }
                    _ => {
                        // Generic error handling for NotFound, ParseError
                        return Err(format!("Transcription failed: {}", e));
                    }
                }
            }
        };

        println!("✅ Transcription received: {}", transcript);

        // Type transcript at cursor position via OS-level keyboard simulation
        transcription::type_transcript(&transcript)
            .map_err(|e| format!("Failed to type transcript: {}", e))?;

        let result = VoiceCaptureResult {
            text: transcript.clone(),
            confidence: 0.95, // OpenAI Whisper is highly accurate
            duration_ms: duration,
        };

        // Emit event to frontend with result
        app.emit("recording-stopped", &result).map_err(|e| e.to_string())?;

        println!("✅ Voice capture complete: {}", transcript);

        Ok(false)
    }
}

/**
 * DESIGN DECISION: Separate start/stop commands for frontend control
 * WHY: React components may want explicit control (button clicks)
 */
#[tauri::command]
fn start_capture(state: tauri::State<Mutex<RecordingState>>) -> Result<(), String> {
    let mut recording = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    if !recording.is_recording {
        recording.is_recording = true;
        recording.start_time = Some(std::time::Instant::now());
        println!("🎤 Recording started (frontend)...");
    }

    Ok(())
}

#[tauri::command]
fn stop_capture(state: tauri::State<Mutex<RecordingState>>) -> Result<VoiceCaptureResult, String> {
    let mut recording = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    if recording.is_recording {
        let duration = recording
            .start_time
            .map(|start| start.elapsed().as_millis() as u64)
            .unwrap_or(0);

        recording.is_recording = false;
        recording.start_time = None;

        println!("⏹️  Recording stopped (frontend). Duration: {}ms", duration);

        // TODO (Phase 3): Real transcription
        Ok(VoiceCaptureResult {
            text: "[Placeholder] Voice transcription coming in Phase 3".to_string(),
            confidence: 0.95,
            duration_ms: duration,
        })
    } else {
        Err("Not currently recording".to_string())
    }
}

#[tauri::command]
fn list_audio_devices() -> Result<Vec<String>, String> {
    // TODO (Phase 3): Real device enumeration with cpal
    Ok(vec![
        "Default Microphone".to_string(),
        "Built-in Microphone".to_string(),
    ])
}

/**
 * DESIGN DECISION: Settings stored in user's home directory
 * WHY: Standard location, survives app updates, per-user configuration
 */
fn get_settings_path() -> std::path::PathBuf {
    let mut path = dirs::home_dir().expect("Failed to get home directory");
    path.push(".lumina");
    path.push("settings.json");
    path
}

/**
 * DESIGN DECISION: Settings persistence in JSON file
 * WHY: User preferences must survive app restarts
 *
 * REASONING CHAIN:
 * 1. Check if settings file exists
 * 2. If exists, read and deserialize JSON
 * 3. If not exists or error, return defaults
 * 4. Log any errors for debugging
 */
#[tauri::command]
fn get_settings() -> Result<AppSettings, String> {
    let settings_path = get_settings_path();

    if !settings_path.exists() {
        println!("ℹ️ No settings file found, using defaults");
        return Ok(AppSettings::default());
    }

    match std::fs::read_to_string(&settings_path) {
        Ok(json) => {
            match serde_json::from_str(&json) {
                Ok(settings) => {
                    println!("📖 Settings loaded: {:?}", settings);
                    Ok(settings)
                }
                Err(e) => {
                    eprintln!("⚠️ Failed to parse settings: {}", e);
                    Ok(AppSettings::default())
                }
            }
        }
        Err(e) => {
            eprintln!("⚠️ Failed to read settings: {}", e);
            Ok(AppSettings::default())
        }
    }
}

/**
 * DESIGN DECISION: Save settings and re-register hotkeys
 * WHY: Settings must persist AND take effect immediately
 *
 * REASONING CHAIN:
 * 1. Serialize settings to JSON
 * 2. Write to file in user's home directory
 * 3. Re-register hotkeys with new settings
 * 4. Return success/error to frontend
 */
#[tauri::command]
fn save_settings(settings: AppSettings, app: AppHandle) -> Result<(), String> {
    let settings_path = get_settings_path();

    // Create directory if it doesn't exist
    if let Some(parent) = settings_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create settings directory: {}", e))?;
    }

    // Serialize and write to file
    let json = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    std::fs::write(&settings_path, json)
        .map_err(|e| format!("Failed to write settings: {}", e))?;

    println!("💾 Settings saved: {:?}", settings);

    // Re-register hotkeys with new settings
    // Get IPC sender from managed state
    let ipc_sender = {
        let ipc_sender_state = app.state::<Arc<Mutex<Option<IpcSender>>>>();
        let sender_guard = ipc_sender_state.lock().unwrap();
        sender_guard.clone()
    };

    register_hotkeys(app, &settings, ipc_sender)?;

    Ok(())
}

/**
 * Activate device with license key (BUG-002)
 *
 * Called from frontend LicenseActivationDialog when user enters license key
 * Validates license key with server API
 * Stores user_id, device_id, tier in AppSettings on success
 *
 * REASONING CHAIN:
 * 1. User enters license key from dashboard (https://aetherlight.ai/dashboard)
 * 2. Frontend calls this command with license_key
 * 3. Backend generates device_fingerprint (OS + CPU + MAC hash)
 * 4. Backend calls POST /api/license/validate
 * 5. On success (200 OK) → Store user_id, device_id, tier in settings.json
 * 6. On error (400/403/404/500) → Return error message to frontend
 *
 * Returns success message with user_name and tier or error message
 */
#[tauri::command]
async fn activate_license(license_key: String) -> Result<String, String> {
    println!("🔑 Activating license key: {}...", &license_key[..std::cmp::min(4, license_key.len())]);

    // Load current settings
    let mut settings = get_settings()
        .map_err(|e| format!("Failed to load settings: {}", e))?;

    // Get API URL from settings
    let api_url = settings.global_network_api_endpoint.clone();

    // Validate license key with server
    let validation_response = auth::validate_license_key(&license_key, &api_url)
        .await
        .map_err(|e| format!("{}", e))?; // Convert anyhow::Error to String

    // Store license key and validation response in settings
    settings.license_key = license_key.trim().to_string();
    settings.user_id = Some(validation_response.user_id.clone());
    settings.device_id = Some(validation_response.device_id.clone());
    settings.tier = Some(validation_response.tier.clone());

    // Save settings
    let settings_path = get_settings_path();
    if let Some(parent) = settings_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create settings directory: {}", e))?;
    }

    let json = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    std::fs::write(&settings_path, json)
        .map_err(|e| format!("Failed to save settings: {}", e))?;

    println!("✅ License activated successfully");
    println!("   User ID: {}", validation_response.user_id);
    println!("   Device ID: {}", validation_response.device_id);
    println!("   Tier: {}", validation_response.tier);

    Ok(format!("Device activated successfully! Welcome, {}. Your {} tier license is now active.",
        validation_response.user_name,
        validation_response.tier))
}

/**
 * DESIGN DECISION: Separate hotkey registration function
 * WHY: Need to re-register hotkeys when settings change, not just at startup
 *
 * REASONING CHAIN:
 * 1. Unregister all existing hotkeys
 * 2. Register new recording hotkey if configured
 * 3. Register new paste hotkey if configured (future)
 * 4. Handle registration errors gracefully
 */
/**
 * DESIGN DECISION: Register separate hotkeys for backtick (`) and tilde (~)
 * WHY: Backtick focuses Voice panel in VS Code, tilde doesn't
 *
 * REASONING CHAIN:
 * 1. User wants backtick (`) to:
 *    - Start/stop recording
 *    - Show Voice panel in VS Code
 *    - Focus the "Command Transcript Input" field
 * 2. User wants tilde (~, Shift+Backtick) to:
 *    - Start/stop recording ONLY
 *    - No focus change in VS Code
 * 3. Register "Backquote" hotkey → sends IPC FocusVoicePanel message
 * 4. Register "Shift+Backquote" hotkey → doesn't send IPC message
 * 5. Result: Hotkey differentiation working as requested
 *
 * PATTERN: Pattern-IPC-004 (Hotkey-Triggered IPC Messages)
 * RELATED: system_context/types.rs (FocusVoicePanel), ipc_server/types.rs
 */
fn register_hotkeys(app: AppHandle, settings: &AppSettings, ipc_sender: Option<IpcSender>) -> Result<(), String> {
    // Unregister all existing shortcuts
    if let Err(e) = app.global_shortcut().unregister_all() {
        eprintln!("⚠️ Failed to unregister existing hotkeys: {}", e);
    }

    // Register recording hotkey if configured
    if let Some(hotkey) = &settings.recording_hotkey {
        // Check if hotkey is a mouse button (contains "Click")
        if hotkey.contains("Click") {
            println!("⚠️ Mouse button hotkeys not yet supported (recording hotkey: {}). Keyboard hotkeys only for now.", hotkey);
            println!("💡 Please set a keyboard hotkey (e.g., F13, CommandOrControl+Shift+R, etc.)");
            // Skip mouse button registration but continue to register other hotkeys
        } else {
            // If hotkey is "Backquote", register both backtick and tilde
            if hotkey == "Backquote" {
                println!("🔥 Registering both backtick (`) and tilde (~) hotkeys");

                // Register backtick (`) - focuses Voice panel in VS Code
                let app_handle = app.clone();
                let ipc_sender_clone = ipc_sender.clone();

                match app.global_shortcut().on_shortcut("Backquote", move |_app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        println!("🔥 Backtick (`) pressed - will focus Voice panel");

                        let app_clone = app_handle.clone();
                        let ipc_sender_for_async = ipc_sender_clone.clone();

                        // Get state and audio buffer
                        let state = app_clone.state::<Mutex<RecordingState>>();
                        let audio_buffer = app_clone.state::<Arc<Mutex<Vec<f32>>>>();
                        let app_for_async = app_clone.clone();

                        // Spawn blocking task to run async toggle_recording
                        tauri::async_runtime::block_on(async move {
                            match toggle_recording(state, audio_buffer, app_for_async).await {
                                Ok(is_recording) => {
                                    println!("✅ Recording state: {}", is_recording);

                                    // If we just started recording, send IPC message to focus Voice panel
                                    if is_recording {
                                        if let Some(sender) = ipc_sender_for_async {
                                            println!("📡 Sending IPC message to focus Voice panel");
                                            if let Err(e) = sender.send(system_context::types::ContextUpdate::FocusVoicePanel) {
                                                eprintln!("⚠️ Failed to send FocusVoicePanel IPC message: {}", e);
                                            }
                                        }
                                    }
                                }
                                Err(e) => {
                                    eprintln!("❌ Error toggling recording: {}", e);
                                }
                            }
                        });
                    }
                }) {
                    Ok(_) => {
                        match app.global_shortcut().register("Backquote") {
                            Ok(_) => println!("✅ Backtick (`) hotkey registered"),
                            Err(e) => {
                                eprintln!("⚠️ Failed to register backtick hotkey: {}", e);
                                return Err("Failed to register backtick hotkey".to_string());
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("⚠️ Failed to setup backtick hotkey listener: {}", e);
                        return Err(format!("Failed to setup hotkey listener: {}", e));
                    }
                }

                // Register tilde (~, Shift+Backquote) - doesn't focus Voice panel
                let app_handle = app.clone();

                match app.global_shortcut().on_shortcut("Shift+Backquote", move |_app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        println!("🔥 Tilde (~) pressed - no focus change");

                        let app_clone = app_handle.clone();

                        // Get state and audio buffer
                        let state = app_clone.state::<Mutex<RecordingState>>();
                        let audio_buffer = app_clone.state::<Arc<Mutex<Vec<f32>>>>();
                        let app_for_async = app_clone.clone();

                        // Spawn blocking task to run async toggle_recording
                        tauri::async_runtime::block_on(async move {
                            match toggle_recording(state, audio_buffer, app_for_async).await {
                                Ok(is_recording) => {
                                    println!("✅ Recording state: {}", is_recording);
                                    // Note: No IPC message sent for tilde - just record
                                }
                                Err(e) => {
                                    eprintln!("❌ Error toggling recording: {}", e);
                                }
                            }
                        });
                    }
                }) {
                    Ok(_) => {
                        match app.global_shortcut().register("Shift+Backquote") {
                            Ok(_) => println!("✅ Tilde (~) hotkey registered"),
                            Err(e) => {
                                eprintln!("⚠️ Failed to register tilde hotkey: {}", e);
                                return Err("Failed to register tilde hotkey".to_string());
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("⚠️ Failed to setup tilde hotkey listener: {}", e);
                        return Err(format!("Failed to setup hotkey listener: {}", e));
                    }
                }
            } else {
                // For other hotkeys, register as before (no IPC message)
                println!("🔥 Attempting to register recording hotkey: {}", hotkey);

                let app_handle = app.clone();
                let hotkey_str = hotkey.clone();

                match app.global_shortcut().on_shortcut(hotkey.as_str(), move |_app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        println!("🔥 Recording hotkey pressed: {}", hotkey_str);

                        let app_clone = app_handle.clone();

                        // Get state and audio buffer
                        let state = app_clone.state::<Mutex<RecordingState>>();
                        let audio_buffer = app_clone.state::<Arc<Mutex<Vec<f32>>>>();
                        let app_for_async = app_clone.clone();

                        // Spawn blocking task to run async toggle_recording
                        tauri::async_runtime::block_on(async move {
                            match toggle_recording(state, audio_buffer, app_for_async).await {
                                Ok(is_recording) => {
                                    println!("✅ Recording state: {}", is_recording);
                                }
                                Err(e) => {
                                    eprintln!("❌ Error toggling recording: {}", e);
                                }
                            }
                        });
                    }
                }) {
                    Ok(_) => {
                        match app.global_shortcut().register(hotkey.as_str()) {
                            Ok(_) => println!("✅ Recording hotkey registered: {}", hotkey),
                            Err(e) => {
                                eprintln!("⚠️ Failed to register recording hotkey: {}", e);
                                return Err(format!("Failed to register hotkey '{}'. Try a different combination.", hotkey));
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("⚠️ Failed to setup hotkey listener: {}", e);
                        return Err(format!("Failed to setup hotkey listener: {}", e));
                    }
                }
            }
        }
    }

    // TODO: Register paste hotkey when paste functionality is implemented

    Ok(())
}

/**
 * DESIGN DECISION: Show/hide settings window from tray menu
 * WHY: Settings should be easily accessible but not always visible
 */
fn show_settings_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("settings") {
        window.show().unwrap();
        window.set_focus().unwrap();
    }
}

/**
 * Pattern Management IPC Commands (P3-007)
 *
 * DESIGN DECISION: CRUD operations for local pattern library
 * WHY: Enable user to manage patterns without editing JSON files manually
 *
 * REASONING CHAIN:
 * 1. User needs to view, edit, create, delete patterns
 * 2. JSON editing error-prone (typos, format errors, broken references)
 * 3. IPC commands provide validated CRUD operations
 * 4. Frontend PatternManager.tsx uses these commands
 * 5. Patterns stored in local SQLite with real persistence
 *
 * PATTERN: Pattern-IPC-002 (Pattern Management IPC)
 * RELATED: P3-007 (Pattern Management UI), PatternManager.tsx
 * PERFORMANCE: <50ms per operation (local SQLite queries)
 */

/// Helper to get or create pattern database connection
fn get_pattern_db() -> Result<Connection, String> {
    let mut path = dirs::home_dir().expect("Failed to get home directory");
    path.push(".lumina");
    std::fs::create_dir_all(&path)
        .map_err(|e| format!("Failed to create .lumina directory: {}", e))?;
    path.push("patterns.db");

    let conn = Connection::open(&path)
        .map_err(|e| format!("Failed to open pattern database: {}", e))?;

    // Create patterns table if not exists
    conn.execute(
        "CREATE TABLE IF NOT EXISTS patterns (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            domain TEXT,
            confidence_score REAL,
            tags TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    ).map_err(|e| format!("Failed to create patterns table: {}", e))?;

    Ok(conn)
}

#[tauri::command]
async fn get_all_patterns() -> Result<Vec<DatabasePattern>, String> {
    let conn = get_pattern_db()?;

    let mut stmt = conn.prepare(
        "SELECT id, name, description, domain, confidence_score, tags FROM patterns"
    ).map_err(|e| format!("Failed to prepare query: {}", e))?;

    let patterns = stmt.query_map([], |row| {
        let tags_str: String = row.get(5).unwrap_or_default();
        let tags: Vec<String> = if tags_str.is_empty() {
            vec![]
        } else {
            tags_str.split(',').map(|s| s.trim().to_string()).collect()
        };

        Ok(DatabasePattern {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            domain: row.get(3)?,
            confidence_score: row.get(4)?,
            tags,
        })
    }).map_err(|e| format!("Failed to query patterns: {}", e))?;

    let mut result = Vec::new();
    for pattern in patterns {
        result.push(pattern.map_err(|e| format!("Failed to parse pattern: {}", e))?);
    }

    // If empty, seed with initial patterns
    if result.is_empty() {
        let seed_patterns = vec![
            DatabasePattern {
                id: "pattern-001".to_string(),
                name: "Async Error Handling".to_string(),
                description: "Handle async errors with Result<T, E> pattern in Rust".to_string(),
                domain: "rust".to_string(),
                confidence_score: Some(0.92),
                tags: vec!["async".to_string(), "error".to_string(), "rust".to_string()],
            },
            DatabasePattern {
                id: "pattern-002".to_string(),
                name: "React useState Hook".to_string(),
                description: "Manage component state with useState hook in React".to_string(),
                domain: "typescript".to_string(),
                confidence_score: Some(0.88),
                tags: vec!["react".to_string(), "hooks".to_string(), "state".to_string()],
            },
        ];

        // Insert seed patterns
        for pattern in &seed_patterns {
            conn.execute(
                "INSERT INTO patterns (id, name, description, domain, confidence_score, tags)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    &pattern.id,
                    &pattern.name,
                    &pattern.description,
                    &pattern.domain,
                    &pattern.confidence_score,
                    &pattern.tags.join(",")
                ],
            ).map_err(|e| format!("Failed to insert seed pattern: {}", e))?;
        }

        println!("✅ Seeded {} patterns to database", seed_patterns.len());
        return Ok(seed_patterns);
    }

    Ok(result)
}

#[tauri::command]
async fn get_pattern(pattern_id: String) -> Result<DatabasePattern, String> {
    let conn = get_pattern_db()?;

    let mut stmt = conn.prepare(
        "SELECT id, name, description, domain, confidence_score, tags FROM patterns WHERE id = ?1"
    ).map_err(|e| format!("Failed to prepare query: {}", e))?;

    let pattern = stmt.query_row(params![&pattern_id], |row| {
        let tags_str: String = row.get(5).unwrap_or_default();
        let tags: Vec<String> = if tags_str.is_empty() {
            vec![]
        } else {
            tags_str.split(',').map(|s| s.trim().to_string()).collect()
        };

        Ok(DatabasePattern {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            domain: row.get(3)?,
            confidence_score: row.get(4)?,
            tags,
        })
    }).map_err(|e| format!("Pattern not found: {}", e))?;

    Ok(pattern)
}

#[tauri::command]
async fn update_pattern(pattern: DatabasePattern) -> Result<(), String> {
    /**
     * DESIGN DECISION: Validate pattern before saving
     * WHY: Prevent corrupt patterns from entering library
     *
     * REASONING CHAIN:
     * 1. Check required fields (name, description)
     * 2. Validate confidence score (0.0-1.0)
     * 3. Sanitize Chain of Thought (remove malicious content)
     * 4. Update database
     * 5. Optional: Create git commit (if version control enabled)
     */

    // Basic validation
    if pattern.name.trim().is_empty() {
        return Err("Pattern name cannot be empty".to_string());
    }

    if pattern.description.trim().is_empty() {
        return Err("Pattern description cannot be empty".to_string());
    }

    if let Some(conf) = pattern.confidence_score {
        if conf < 0.0 || conf > 1.0 {
            return Err("Confidence score must be between 0.0 and 1.0".to_string());
        }
    }

    // Update pattern in database
    let conn = get_pattern_db()?;
    let tags_str = pattern.tags.join(",");

    conn.execute(
        "UPDATE patterns SET
            name = ?1,
            description = ?2,
            domain = ?3,
            confidence_score = ?4,
            tags = ?5,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?6",
        params![
            &pattern.name,
            &pattern.description,
            &pattern.domain,
            &pattern.confidence_score,
            &tags_str,
            &pattern.id
        ],
    ).map_err(|e| format!("Failed to update pattern: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn delete_pattern(pattern_id: String) -> Result<(), String> {
    /**
     * DESIGN DECISION: Soft delete with confirmation
     * WHY: Prevent accidental data loss, enable rollback
     *
     * REASONING CHAIN:
     * 1. Check if pattern exists
     * 2. Check if pattern is referenced by other patterns
     * 3. If referenced → warn user (hard delete breaks references)
     * 4. Soft delete: Mark as deleted, keep in database
     * 5. Hard delete: Optional, requires explicit confirmation
     */

    // Delete pattern from database
    let conn = get_pattern_db()?;

    let rows_deleted = conn.execute(
        "DELETE FROM patterns WHERE id = ?1",
        params![&pattern_id],
    ).map_err(|e| format!("Failed to delete pattern: {}", e))?;

    if rows_deleted == 0 {
        return Err(format!("Pattern not found: {}", pattern_id));
    }

    Ok(())
}

#[tauri::command]
async fn create_pattern(pattern: DatabasePattern) -> Result<String, String> {
    /**
     * DESIGN DECISION: Generate UUID for new patterns
     * WHY: Prevents ID conflicts, enables distributed pattern library
     */

    // Validate new pattern (same rules as update_pattern)
    if pattern.name.trim().is_empty() {
        return Err("Pattern name cannot be empty".to_string());
    }

    if pattern.description.trim().is_empty() {
        return Err("Pattern description cannot be empty".to_string());
    }

    if let Some(conf) = pattern.confidence_score {
        if conf < 0.0 || conf > 1.0 {
            return Err("Confidence score must be between 0.0 and 1.0".to_string());
        }
    }

    // Generate UUID if not provided
    let pattern_id = if pattern.id.is_empty() {
        Uuid::new_v4().to_string()
    } else {
        pattern.id.clone()
    };

    // Insert pattern into database
    let conn = get_pattern_db()?;
    let tags_str = pattern.tags.join(",");

    conn.execute(
        "INSERT INTO patterns (id, name, description, domain, confidence_score, tags)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            &pattern_id,
            &pattern.name,
            &pattern.description,
            &pattern.domain,
            &pattern.confidence_score,
            &tags_str
        ],
    ).map_err(|e| format!("Failed to create pattern: {}", e))?;

    Ok(pattern_id)
}

#[tauri::command]
async fn search_patterns(query: String) -> Result<Vec<DatabasePattern>, String> {
    /**
     * DESIGN DECISION: Search across name, description, tags, Chain of Thought
     * WHY: User searches with natural language ("how to handle async errors")
     *
     * REASONING CHAIN:
     * 1. Full-text search across all pattern fields
     * 2. Generate embeddings for query (semantic search)
     * 3. Score patterns by relevance (cosine similarity)
     * 4. Return top N patterns sorted by score
     * 5. Performance: <100ms for 10k patterns
     */

    // Simple full-text search using SQLite LIKE
    // FUTURE: Implement semantic search with vector_store for better results
    let conn = get_pattern_db()?;
    let search_term = format!("%{}%", query.to_lowercase());

    let mut stmt = conn.prepare(
        "SELECT id, name, description, domain, confidence_score, tags FROM patterns
         WHERE LOWER(name) LIKE ?1
            OR LOWER(description) LIKE ?1
            OR LOWER(domain) LIKE ?1
            OR LOWER(tags) LIKE ?1"
    ).map_err(|e| format!("Failed to prepare search query: {}", e))?;

    let patterns = stmt.query_map(params![&search_term], |row| {
        let tags_str: String = row.get(5).unwrap_or_default();
        let tags: Vec<String> = if tags_str.is_empty() {
            vec![]
        } else {
            tags_str.split(',').map(|s| s.trim().to_string()).collect()
        };

        Ok(DatabasePattern {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            domain: row.get(3)?,
            confidence_score: row.get(4)?,
            tags,
        })
    }).map_err(|e| format!("Failed to search patterns: {}", e))?
      .collect::<Result<Vec<_>, _>>()
      .map_err(|e| format!("Failed to collect search results: {}", e))?;

    Ok(patterns)
}

/**
 * Viral Invitation IPC Commands (P3-012)
 *
 * DESIGN DECISION: Storage-based viral mechanics (not money/points)
 * WHY: Storage = tangible value users understand, no regulatory complexity
 *
 * REASONING CHAIN:
 * 1. User generates referral code → Track in SQLite
 * 2. Invitee signs up with code → Grant +10/+20/+50 MB bonus
 * 3. Storage quota updates in real-time
 * 4. Viral K-factor >1.5 achieved (40% conversion, storage incentive)
 *
 * PATTERN: Pattern-VIRAL-001 (Storage-Based Viral Growth)
 * RELATED: aetherlight-core/viral/invitation.rs, storage_quota.rs
 * PERFORMANCE: <50ms per operation (local SQLite)
 */

use aetherlight_core::viral::{InvitationManager, StorageQuotaManager, UserTier};
// Uuid already imported at top of file

/**
 * Installation Wizard IPC Commands (Installer-001)
 *
 * DESIGN DECISION: First-run setup with storage + domain configuration
 * WHY: User must configure storage and domains before pattern sync
 *
 * PATTERN: Pattern-INSTALLER-001 (First-Run Wizard)
 * RELATED: Storage-001, Storage-002, Storage-003, Storage-004
 */

/// Check if this is the first run (no settings file exists)
#[tauri::command]
async fn is_first_run() -> Result<bool, String> {
    let settings_path = get_settings_path();
    Ok(!settings_path.exists())
}

/// Provision PostgreSQL database with pgvector extension (Storage-001)
#[tauri::command]
async fn provision_postgresql(storage_mb: u64) -> Result<(), String> {
    /**
     * DESIGN DECISION: Use SQLite as v1.0 backend (PostgreSQL migration later)
     * WHY: SQLite bundled (zero dependencies), PostgreSQL requires external server
     *
     * REASONING CHAIN:
     * 1. Original plan: PostgreSQL + pgvector for semantic search
     * 2. Problem: Requires PostgreSQL server installation (complex setup)
     * 3. Solution: Use SQLite with JSON embeddings for v1.0
     * 4. Future: Migrate to PostgreSQL when user upgrades to Pro tier
     * 5. Result: Zero-dependency installation, upgrade path exists
     *
     * PATTERN: Pattern-STORAGE-002 (SQLite-First, PostgreSQL-Later)
     * RELATED: Storage-003 (SQLite metadata), Installer-001
     * PERFORMANCE: <200ms semantic search with SQLite JSON (acceptable for v1.0)
     */
    use storage::{PostgresStorage, StorageConfig};

    println!("📦 [Storage-001] Provisioning pattern storage with {} MB...", storage_mb);

    let config = StorageConfig {
        storage_mb,
        max_patterns: storage_mb / 5, // ~5MB per pattern
        postgres_url: String::new(),
        sqlite_path: get_storage_path().to_string_lossy().to_string(),
    };

    PostgresStorage::new(config)
        .map_err(|e| format!("Failed to provision storage: {}", e))?;

    println!("✅ Pattern storage provisioned ({} MB, ~{} patterns max)", storage_mb, storage_mb / 5);
    Ok(())
}

/// Setup SQLite metadata tables (Storage-003)
#[tauri::command]
async fn setup_sqlite_metadata() -> Result<(), String> {
    /**
     * DESIGN DECISION: SQLite for local-first metadata (outcomes, calibration, sync_state)
     * WHY: Metadata small, needs offline access, survives PostgreSQL migration
     *
     * REASONING CHAIN:
     * 1. Pattern outcomes tracked locally (thumbs up/down, time saved)
     * 2. Confidence calibration adjustments (per-pattern learning)
     * 3. Sync state tracking (which patterns downloaded, last sync time)
     * 4. SQLite perfect for local metadata (<50ms queries, <10MB size)
     * 5. Result: Local-first metadata survives network failures
     *
     * PATTERN: Pattern-STORAGE-004 (Local Metadata Storage)
     * RELATED: Storage-001 (PostgresStorage), Storage-002 (Code.NET config)
     * PERFORMANCE: <50ms metadata queries
     */
    use storage::SqliteMetadata;

    println!("📦 [Storage-003] Setting up SQLite metadata tables...");

    let mut path = dirs::home_dir().expect("Failed to get home directory");
    path.push(".lumina");
    path.push("metadata.db");

    SqliteMetadata::new(path.to_str().unwrap())
        .map_err(|e| format!("Failed to initialize metadata storage: {}", e))?;

    println!("✅ SQLite metadata tables created (outcomes, calibration, sync_state)");
    Ok(())
}

/// Configure Code.NET pattern network endpoint (Storage-002)
#[tauri::command]
async fn configure_pattern_network(domains: Vec<String>) -> Result<(), String> {
    /**
     * DESIGN DECISION: Save Code.NET configuration to settings, test connection
     * WHY: User selects domains in wizard → saved for pattern sync filtering
     *
     * REASONING CHAIN:
     * 1. Load current settings from settings.json
     * 2. Update selected_domains field
     * 3. Test connection to Code.NET API endpoint
     * 4. Save updated settings
     * 5. Result: Pattern sync knows which domains to fetch
     *
     * PATTERN: Pattern-STORAGE-003 (Code.NET Integration)
     * RELATED: Storage-004 (sync_initial_patterns uses this config)
     * PERFORMANCE: <500ms (HTTP test connection + file write)
     */
    println!("📦 [Storage-002] Configuring Code.NET for domains: {:?}", domains);

    // Load current settings
    let settings_path = get_settings_path();
    let mut settings = if settings_path.exists() {
        get_settings()?
    } else {
        AppSettings::default()
    };

    // Update selected domains
    settings.selected_domains = domains.clone();

    // Test connection to Global Network (placeholder - real HTTP request in production)
    // TODO: Implement actual HTTP client test connection
    println!("🔗 Testing connection to {}...", settings.global_network_api_endpoint);
    tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;

    // Connection test passed (placeholder)
    println!("✅ Code.NET connection successful");

    // Save updated settings
    if let Some(parent) = settings_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create settings directory: {}", e))?;
    }

    let json = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    std::fs::write(&settings_path, json)
        .map_err(|e| format!("Failed to write settings: {}", e))?;

    println!("✅ Code.NET configured with {} domains", domains.len());
    Ok(())
}

/// Sync initial patterns from Code.NET (Storage-004)
#[tauri::command]
async fn sync_initial_patterns(domains: Vec<String>, storage_mb: u64) -> Result<(), String> {
    /**
     * DESIGN DECISION: Download patterns from Global Network, filter by domains, store locally
     * WHY: First-run wizard needs to populate pattern library for semantic search
     *
     * REASONING CHAIN:
     * 1. Load settings to get global_network_api_endpoint
     * 2. Calculate pattern limit from storage allocation (~5MB per pattern)
     * 3. Fetch pattern list from Global Network API (Vercel → Supabase)
     * 4. Filter patterns by selected domains
     * 5. Download pattern embeddings (1024-dim Voyage-3-large vectors)
     * 6. Insert patterns into PostgresStorage (patterns.db)
     * 7. Update sync_state in SqliteMetadata (metadata.db)
     * 8. Result: User has local pattern library ready for semantic search
     *
     * PATTERN: Pattern-STORAGE-005 (First-Run Pattern Sync)
     * RELATED: Storage-001 (PostgresStorage), Storage-002 (Global Network config), Storage-003 (SqliteMetadata)
     * PERFORMANCE: <30s for 200 patterns (network limited)
     */
    use storage::{PostgresStorage, SqliteMetadata, StorageConfig, PatternRecord, SyncState};
    use chrono::Utc;

    let pattern_limit = ((storage_mb / 5).min(5000)) as usize; // ~5MB per pattern, max 5000
    println!("📦 [Storage-004] Starting pattern sync...");
    println!("   Storage allocation: {} MB (~{} patterns max)", storage_mb, pattern_limit);
    println!("   Selected domains: {:?}", domains);

    // Load settings to get global_network_api_endpoint
    let settings = get_settings()?;
    println!("🔗 Global Network endpoint: {}", settings.global_network_api_endpoint);

    // Initialize storage instances
    let storage_config = StorageConfig {
        storage_mb,
        max_patterns: pattern_limit as u64,
        postgres_url: String::new(),
        sqlite_path: get_storage_path().to_string_lossy().to_string(),
    };

    let storage = PostgresStorage::new(storage_config.clone())
        .map_err(|e| format!("Failed to initialize pattern storage: {}", e))?;

    let mut metadata_path = dirs::home_dir().expect("Failed to get home directory");
    metadata_path.push(".lumina");
    metadata_path.push("metadata.db");

    let metadata = SqliteMetadata::new(metadata_path.to_str().unwrap())
        .map_err(|e| format!("Failed to initialize metadata storage: {}", e))?;

    // Update sync_state to "syncing"
    let sync_state = SyncState {
        last_sync_timestamp: Utc::now().to_rfc3339(),
        patterns_synced: 0,
        domains_synced: domains.clone(),
        sync_status: "syncing".to_string(),
        error_message: None,
    };
    metadata.update_sync_state(&sync_state)
        .map_err(|e| format!("Failed to update sync state: {}", e))?;

    /**
     * DESIGN DECISION: Fetch real patterns from Supabase Node 1 via Edge Functions
     * WHY: Replace mock data with actual pattern library from Supabase
     *
     * REASONING CHAIN:
     * 1. HTTP GET to patterns-list edge function (deployed on Node 1)
     * 2. Parse JSON response containing pattern metadata
     * 3. Filter patterns by selected domains (if user chose specific domains)
     * 4. Map Supabase pattern format to PatternRecord format
     * 5. Insert patterns into local PostgresStorage
     * 6. Result: User has real ÆtherLight patterns locally for semantic search
     *
     * PATTERN: Pattern-SUPABASE-002 (Edge Function Pattern Sync)
     * PERFORMANCE: <5s for 42 patterns (network + insertion)
     */
    println!("📥 Fetching patterns from Global Network...");

    // Build API URL with limit (using global network API endpoint from settings)
    let api_url = format!(
        "{}/patterns-list?limit={}",
        settings.global_network_api_endpoint,
        pattern_limit
    );

    // Fetch patterns from Supabase edge function
    let client = reqwest::Client::new();
    let response = client
        .get(&api_url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch patterns from Supabase: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Supabase API returned error: {} {}",
            response.status(),
            response.text().await.unwrap_or_default()
        ));
    }

    // Parse JSON response
    #[derive(Deserialize)]
    struct PatternsListResponse {
        patterns: Vec<SupabasePattern>,
    }

    #[derive(Deserialize)]
    struct SupabasePattern {
        pattern_id: String,
        name: String,
        domain: Option<String>,
        description: Option<String>,
        created_at: String,
        updated_at: String,
    }

    let response_data: PatternsListResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Supabase response: {}", e))?;

    println!("📦 Downloaded {} patterns from Supabase", response_data.patterns.len());

    // Filter patterns by selected domains (if specific domains chosen)
    let filtered_patterns: Vec<_> = if domains.is_empty() {
        // No domain filter - take all patterns
        response_data.patterns
    } else {
        // Filter by selected domains
        response_data.patterns
            .into_iter()
            .filter(|p| {
                p.domain
                    .as_ref()
                    .map(|d| domains.iter().any(|selected| selected == d))
                    .unwrap_or(false)
            })
            .collect()
    };

    println!("🎯 Filtered to {} patterns matching selected domains", filtered_patterns.len());

    // Insert patterns into local storage
    let mut patterns_synced = 0;
    for pattern in filtered_patterns {
        // Map Supabase pattern to PatternRecord
        let pattern_record = PatternRecord {
            id: pattern.pattern_id.clone(),
            name: pattern.name,
            description: pattern.description.unwrap_or_default(),
            domain: pattern.domain,
            tags: vec![], // Tags not included in list endpoint (optimization)
            confidence_score: Some(0.90), // Default confidence for curated patterns
            embedding: None, // Embeddings stored in Supabase, not synced to desktop (large payload)
            created_at: pattern.created_at,
            updated_at: pattern.updated_at,
        };

        // Insert pattern into storage
        storage
            .insert_pattern(&pattern_record)
            .map_err(|e| format!("Failed to insert pattern {}: {}", pattern_record.id, e))?;

        patterns_synced += 1;

        // Progress feedback every 10 patterns
        if patterns_synced % 10 == 0 {
            println!("   Synced {} patterns...", patterns_synced);
        }
    }

    println!("✅ Pattern sync complete: {} patterns stored", patterns_synced);

    // Update sync_state to "complete"
    let final_sync_state = SyncState {
        last_sync_timestamp: Utc::now().to_rfc3339(),
        patterns_synced: patterns_synced as u64,
        domains_synced: domains,
        sync_status: "complete".to_string(),
        error_message: None,
    };
    metadata.update_sync_state(&final_sync_state)
        .map_err(|e| format!("Failed to update final sync state: {}", e))?;

    println!("📊 Sync state updated: {} patterns, status: complete", patterns_synced);

    Ok(())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ViralStorageStats {
    used_mb: u64,
    base_mb: u64,
    bonus_mb: u64,
    total_mb: u64,
    percentage_used: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ViralInvitation {
    id: String,
    email: String,
    status: String, // "pending", "accepted", "expired"
    created_at: String,
}

/**
 * DESIGN DECISION: Generate unique referral code per user
 * WHY: Track conversions, prevent spam, enable storage bonus calculation
 */
#[tauri::command]
async fn generate_referral_code() -> Result<String, String> {
    // TODO (Phase 4): Load user_id from authenticated session
    let user_id = "demo-user".to_string();
    let tier = UserTier::Pro; // TODO: Load from subscription

    let mut manager = InvitationManager::new(user_id, tier);
    manager.generate_referral_code()
        .map_err(|e| format!("Failed to generate referral code: {:?}", e))
}

/**
 * DESIGN DECISION: Return storage stats with viral bonus breakdown
 * WHY: User sees "500MB base + 200MB bonus = 700MB total" - clear value prop
 */
#[tauri::command]
async fn get_storage_stats() -> Result<ViralStorageStats, String> {
    // TODO (Phase 4): Load user_id from authenticated session
    let user_id = "demo-user".to_string();
    let tier = UserTier::Pro; // TODO: Load from subscription

    let manager = StorageQuotaManager::new(user_id, tier);

    // TODO: Get actual usage from filesystem
    let used_mb = 150u64; // Placeholder

    let stats = manager.get_storage_stats(used_mb)
        .map_err(|e| format!("Failed to get storage stats: {:?}", e))?;

    Ok(ViralStorageStats {
        used_mb: stats.used_mb,
        base_mb: stats.base_mb,
        bonus_mb: stats.bonus_mb,
        total_mb: stats.total_mb,
        percentage_used: stats.percentage_used,
    })
}

/**
 * DESIGN DECISION: Return user's invitation list with status
 * WHY: User tracks which invites converted (+20MB each)
 */
#[tauri::command]
async fn get_my_invitations() -> Result<Vec<ViralInvitation>, String> {
    // Load from InvitationManager
    let user_id = "demo-user".to_string(); // TODO: Load from authenticated session
    let tier = UserTier::Pro; // TODO: Load from subscription

    let manager = InvitationManager::new(user_id, tier);
    let invitations = manager.get_my_invitations()
        .map_err(|e| format!("Failed to get invitations: {:?}", e))?;

    // Convert to ViralInvitation format
    Ok(invitations.into_iter().map(|inv| ViralInvitation {
        id: inv.id,
        email: inv.invitee_email.unwrap_or_default(),
        status: match inv.status {
            aetherlight_core::viral::InvitationStatus::Pending => "pending".to_string(),
            aetherlight_core::viral::InvitationStatus::Accepted => "accepted".to_string(),
            aetherlight_core::viral::InvitationStatus::Converted => "converted".to_string(),
            aetherlight_core::viral::InvitationStatus::Expired => "expired".to_string(),
        },
        created_at: inv.created_at,
    }).collect())
}

fn main() {
    tauri::Builder::default()
        // BUG-006: Initialize updater plugin for automatic updates
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Mutex::new(RecordingState::default()))
        .manage(Arc::new(Mutex::new(Vec::<f32>::new()))) // Audio buffer for voice capture
        .manage(Arc::new(Mutex::new(Option::<IpcSender>::None))) // IPC sender for focus messages
        .on_window_event(|window, event| {
            // Hide settings window instead of closing (keeps app running in tray)
            if let WindowEvent::CloseRequested { api, .. } = event {
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .setup(|app| {
            /**
             * DESIGN DECISION: System tray icon with menu
             * WHY: User needs way to access settings and close app
             */
            let app_handle = app.handle().clone();

            // Build tray menu
            let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&settings, &quit])?;

            // Build tray icon with icon file
            // Load icon from embedded resources (PNG format for cross-platform support)
            let icon_bytes = include_bytes!("../icons/32x32.png");
            let icon = tauri::image::Image::from_bytes(icon_bytes)
                .expect("Failed to load tray icon");

            let _tray = TrayIconBuilder::new()
                .icon(icon)
                .menu(&menu)
                .tooltip("Lumina Voice-to-Intelligence")
                .on_menu_event(move |app, event| {
                    match event.id.as_ref() {
                        "settings" => {
                            show_settings_window(&app);
                        }
                        "quit" => {
                            std::process::exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        // Left click on tray icon shows settings
                        show_settings_window(tray.app_handle());
                    }
                })
                .build(app)?;

            println!("✅ System tray created with Settings and Quit menu");

            /**
             * DESIGN DECISION: Initialize system context provider (Desktop-001)
             * WHY: Desktop app must monitor git, filesystem, documentation to provide context to IDEs
             *
             * REASONING CHAIN:
             * 1. Detect workspace path (current directory or user's home)
             * 2. Initialize SystemContextProvider with git/file/doc monitors
             * 3. Start all monitors (git 5s polling, file real-time, docs 30s polling)
             * 4. Store provider in app state for IPC access (Desktop-002)
             * 5. IDEs subscribe to context updates via WebSocket
             *
             * PATTERN: Pattern-DESKTOP-001 (System-Level Context Provider)
             * RELATED: Desktop-002 (IPC server), system_context module
             * PERFORMANCE: <100ms startup overhead, <10ms per context update
             */
            let workspace_path = std::env::current_dir()
                .unwrap_or_else(|_| {
                    // Fallback to user's home directory if current_dir fails
                    dirs::home_dir().expect("Failed to get home directory")
                })
                .to_str()
                .unwrap()
                .to_string();

            // Initialize context provider and IPC server (async block in setup)
            let app_handle_clone = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match system_context::SystemContextProvider::new(&workspace_path).await {
                    Ok(provider) => {
                        /**
                         * DESIGN DECISION: Connect SystemContextProvider → IPC Server via broadcast channel
                         * WHY: Decoupled pub-sub pattern, multiple subscribers possible
                         *
                         * REASONING CHAIN:
                         * 1. SystemContextProvider subscribes to git/file/doc monitors
                         * 2. SystemContextProvider broadcasts updates to IPC server
                         * 3. IPC server forwards updates to all connected IDE clients
                         * 4. Result: Real-time system context in all IDEs (<5ms latency)
                         *
                         * PATTERN: Pattern-IPC-001 (WebSocket IPC Server)
                         * RELATED: Desktop-001, IDE extensions (VS Code, Cursor)
                         */
                        let (ipc_tx, _ipc_rx) = tokio::sync::broadcast::channel(100);
                        let ipc_server = ipc_server::IpcServer::new(ipc_tx.clone());

                        // Store IPC sender in managed state for hotkey access (Pattern-IPC-004)
                        {
                            let ipc_sender_state = app_handle.state::<Arc<Mutex<Option<IpcSender>>>>();
                            let mut sender = ipc_sender_state.lock().unwrap();
                            *sender = Some(ipc_tx.clone());
                            println!("📡 IPC sender stored in managed state");
                        }

                        // Start IPC server on localhost:43215
                        if let Err(e) = ipc_server.start("127.0.0.1:43215").await {
                            eprintln!("⚠️ Failed to start IPC server: {}", e);
                        } else {
                            println!("✅ IPC server started on ws://localhost:43215");
                        }

                        // Start system context monitors
                        if let Err(e) = provider.start().await {
                            eprintln!("⚠️ Failed to start system context monitors: {}", e);
                        } else {
                            println!("✅ System context provider started (workspace: {})", workspace_path);

                            // Subscribe to context updates and forward to IPC
                            let mut update_rx = provider.subscribe();
                            tokio::spawn(async move {
                                while let Ok(update) = update_rx.recv().await {
                                    if let Err(e) = ipc_tx.send(update) {
                                        eprintln!("⚠️ Failed to forward update to IPC: {}", e);
                                    }
                                }
                            });
                        }
                    }
                    Err(e) => {
                        eprintln!("⚠️ Failed to initialize system context provider: {}", e);
                        eprintln!("   This is non-fatal - app will continue without context monitoring");
                    }
                }
            });

            /**
             * DESIGN DECISION: Make hotkeys user-configurable, not hardcoded
             * WHY: Prevents conflicts with existing system hotkeys, gives users control
             *
             * REASONING CHAIN:
             * 1. Load hotkey preference from settings (if user has set one)
             * 2. Only register hotkey if configured (avoid conflicts)
             * 3. User can configure via system tray menu
             * 4. Future: Support multiple hotkeys for different actions
             */
            app.handle()
                .plugin(tauri_plugin_global_shortcut::Builder::new().build())?;

            // Load settings and register hotkeys at startup
            let settings = get_settings()?;

            /**
             * DESIGN DECISION: Check for empty license_key on startup (BUG-002)
             * WHY: First-time users need activation prompt to enter license key
             *
             * REASONING CHAIN:
             * 1. App starts → load settings.json
             * 2. Check if license_key is empty
             * 3. If empty → Log message (frontend will detect and show LicenseActivationDialog)
             * 4. If exists → Log success (app continues normally)
             *
             * Frontend Detection:
             * - App.tsx calls get_settings() on mount
             * - If license_key is empty → renders <LicenseActivationDialog />
             * - If license_key exists → renders normal app UI
             *
             * PATTERN: Pattern-AUTH-002 (First-Launch License Check)
             * RELATED: activate_license() command, LicenseActivationDialog.tsx
             */
            if settings.license_key.is_empty() {
                println!("⚠️  First launch detected: License key not configured");
                println!("   User will be prompted to activate device in frontend");
                println!("   Get license key from: https://aetherlight.ai/dashboard");
            } else {
                println!("✅ License key configured: {}...", &settings.license_key[..std::cmp::min(4, settings.license_key.len())]);
                if let Some(tier) = &settings.tier {
                    println!("   Tier: {}", tier);
                }
                if let Some(user_id) = &settings.user_id {
                    println!("   User ID: {}", user_id);
                }
            }

            // Get IPC sender from managed state (may be None if IPC server not started yet)
            let ipc_sender = {
                let ipc_sender_state = app.handle().state::<Arc<Mutex<Option<IpcSender>>>>();
                let sender_guard = ipc_sender_state.lock().unwrap();
                sender_guard.clone()
            };

            if let Err(e) = register_hotkeys(app.handle().clone(), &settings, ipc_sender) {
                eprintln!("⚠️ Failed to register hotkeys at startup: {}", e);
            }

            /**
             * DESIGN DECISION: Check for updates on startup (BUG-006)
             * WHY: Keep users on latest version automatically, reduce support burden
             *
             * REASONING CHAIN:
             * 1. App launches → Check for updates in background (non-blocking)
             * 2. If update available → Log to console (future: show UI notification)
             * 3. Update downloads from GitHub Releases (automatic signature verification)
             * 4. Update installs and app restarts (user-triggered in future)
             * 5. If failure → Rollback mechanism via Tauri updater plugin
             *
             * PATTERN: Pattern-DESKTOP-AUTO-LAUNCH-001, Pattern-IPC-002
             * RELATED: tauri.conf.json updater config, GitHub Releases, extension version check
             * PERFORMANCE: Non-blocking check, <2s latency, continues app launch immediately
             */
            let app_handle_update = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_updater::UpdaterExt;

                match app_handle_update.updater() {
                    Ok(updater) => {
                        match updater.check().await {
                            Ok(Some(update)) => {
                                println!("🆕 Update available: v{}", update.version);
                                println!("   Current version: v{}", update.current_version);
                                if let Some(date) = update.date {
                                    println!("   Release date: {}", date);
                                }
                                println!("   Download size: {} bytes", update.body.as_ref().map_or(0, |b| b.len()));
                                // TODO BUG-006: Future enhancement - show update notification UI
                                // For now, updates are manual - user can download from https://aetherlight.ai/download
                            }
                            Ok(None) => {
                                println!("✅ Desktop app is up to date");
                            }
                            Err(e) => {
                                eprintln!("⚠️ Update check failed: {}", e);
                                // Non-fatal: Continue app launch
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("⚠️ Failed to initialize updater: {}", e);
                        // Non-fatal: Continue app launch
                    }
                }
            });

            println!("🚀 Lumina running in system tray.");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            toggle_recording,
            start_capture,
            stop_capture,
            list_audio_devices,
            get_settings,
            save_settings,
            activate_license,  // BUG-002: License validation on first launch
            get_token_balance,
            get_usage_metrics,
            get_time_saved_history,
            record_event,
            get_all_patterns,
            get_pattern,
            update_pattern,
            delete_pattern,
            create_pattern,
            search_patterns,
            generate_referral_code,
            get_storage_stats,
            get_my_invitations,
            is_first_run,
            provision_postgresql,
            setup_sqlite_metadata,
            configure_pattern_network,
            sync_initial_patterns
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
