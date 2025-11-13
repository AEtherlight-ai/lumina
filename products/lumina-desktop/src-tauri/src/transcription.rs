/**
 * Server-Proxied Whisper Transcription + Credit Tracking + Keyboard Typing Module
 *
 * DESIGN DECISION: Desktop app proxies transcription through server API for credit tracking
 * WHY: Server manages OpenAI key + tracks usage + enforces credit limits (monetization)
 *
 * REASONING CHAIN:
 * 1. User presses hotkey (Shift+~ or `) while cursor is positioned
 * 2. Desktop app captures audio → sends to server API with license_key
 * 3. Server API authenticates device → checks credits → calls OpenAI Whisper API
 * 4. Server tracks cost + deducts from balance → returns transcript + cost + balance
 * 5. Desktop app receives transcript → **types character-by-character at OS level**
 * 6. Works in: VS Code, Cursor, Claude Code, Notepad, browser, ANY app
 * 7. Result: Seamless voice-to-text with built-in usage tracking
 *
 * PATTERN: Pattern-MONETIZATION-001 (Server-Side Key Management)
 * PATTERN: Pattern-WHISPER-001 (OpenAI Whisper API Proxy)
 * PATTERN: Pattern-KEYBOARD-001 (OS-Level Typing)
 * PERFORMANCE: ~2-5s transcription + ~50ms/char typing (feels natural)
 * RELATED: voice.rs (audio capture), main.rs (hotkey handling), /api/desktop/transcribe (server endpoint)
 */

use anyhow::{Context, Result};
use reqwest::multipart;
use serde::{Deserialize, Serialize};
use std::io::Write;
use enigo::Enigo;
use std::thread;
use std::time::Duration;

/// Server API transcription response (token-based)
/// Matches API contract: website/app/api/desktop/transcribe/route.ts:338-345
#[derive(Debug, Deserialize, Serialize)]
pub struct TranscriptionResponse {
    pub success: bool,
    pub text: String,
    pub duration_seconds: u64,
    pub tokens_used: u64,
    pub tokens_balance: u64,
    pub transaction_id: String,
}

/// Warning level from server (80%, 90%, 95% thresholds)
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct TokenWarning {
    pub level: String,        // "medium" | "high" | "critical"
    pub threshold: u8,        // 80 | 90 | 95
    pub message: String,      // User-friendly warning message
    pub percentage_used: u8,  // Actual percentage used
}

/// Token balance API response
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct TokenBalanceResponse {
    pub success: bool,
    pub tokens_balance: u64,
    pub tokens_used_this_month: u64,
    pub subscription_tier: String,
    pub minutes_remaining: u64,
    #[serde(default)]
    pub warnings: Vec<TokenWarning>,  // NEW: Server-calculated warnings
}

/// Server API error response (for 402 Insufficient Credits, etc.)
/// Supports both token-based (new) and USD-based (legacy) responses
/// API contract: website/app/api/desktop/transcribe/route.ts:172-182
#[derive(Debug, Deserialize)]
struct ApiErrorResponse {
    error: String,

    // Token-based fields (NEW - API uses these for 402 errors)
    #[serde(default)]
    balance_tokens: u64,
    #[serde(default)]
    required_tokens: u64,
    #[serde(default)]
    shortfall_tokens: u64,

    // USD-based fields (LEGACY - backward compatibility)
    #[serde(default)]
    balance_usd: f64,
    #[serde(default)]
    required_usd: f64,

    #[serde(default)]
    message: String,
}

/// Transcription errors with HTTP status code classification (BUG-004)
///
/// DESIGN DECISION: Structured error enum for actionable user feedback
/// WHY: Different error types require different user actions (re-activate, upgrade, retry)
///
/// Error Type Mapping:
/// - 401: Invalid/revoked license → Show license activation dialog
/// - 402: Insufficient tokens → Show upgrade/purchase dialog with balance
/// - 403: Device not active → Show device activation dialog
/// - 404: API endpoint missing → Log error, show support message
/// - 500-599: Server error → Show retry dialog
/// - Network: Connection failed → Show retry dialog with connectivity check
/// - Parse: Malformed response → Log error, show support message
#[derive(Debug)]
pub enum TranscriptionError {
    Unauthorized {
        message: String,
    },
    PaymentRequired {
        message: String,
        balance_tokens: u64,
        required_tokens: u64,
    },
    Forbidden {
        message: String,
    },
    NotFound {
        message: String,
    },
    ServerError {
        message: String,
    },
    NetworkError {
        message: String,
    },
    ParseError {
        message: String,
    },
}

impl std::fmt::Display for TranscriptionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Unauthorized { message } => write!(f, "Unauthorized: {}", message),
            Self::PaymentRequired { message, balance_tokens, required_tokens } => {
                write!(f, "Payment Required: {} (balance: {} tokens, required: {} tokens)",
                    message, balance_tokens, required_tokens)
            }
            Self::Forbidden { message } => write!(f, "Forbidden: {}", message),
            Self::NotFound { message } => write!(f, "Not Found: {}", message),
            Self::ServerError { message } => write!(f, "Server Error: {}", message),
            Self::NetworkError { message } => write!(f, "Network Error: {}", message),
            Self::ParseError { message } => write!(f, "Parse Error: {}", message),
        }
    }
}

impl std::error::Error for TranscriptionError {}

/**
 * DESIGN DECISION: Send audio at native sample rate to OpenAI Whisper API
 * WHY: OpenAI Whisper API accepts various formats and handles conversion internally
 *
 * REASONING CHAIN:
 * 1. OpenAI Whisper API documentation says it accepts multiple audio formats
 * 2. The API performs its own preprocessing and resampling internally
 * 3. Problem was: We were labeling 44.1kHz audio as 16kHz in WAV header
 * 4. Solution: Create WAV with CORRECT sample rate in header
 * 5. Let OpenAI handle any necessary resampling on their end
 *
 * PATTERN: Pattern-AUDIO-002 (Correct WAV Header Metadata)
 * PERFORMANCE: Zero overhead - no resampling needed
 */

/**
 * DESIGN DECISION: Convert f32 audio samples to WAV file in memory
 * WHY: OpenAI Whisper API requires audio file (WAV, MP3, etc.), not raw samples
 *
 * REASONING CHAIN:
 * 1. Audio captured as Vec<f32> (range -1.0 to 1.0) from cpal
 * 2. WAV format requires i16 samples (range -32768 to 32767)
 * 3. Convert f32 → i16 using hound crate
 * 4. Write to in-memory buffer (no disk I/O for speed)
 * 5. Return WAV bytes for API upload
 */
fn audio_to_wav(samples: &[f32], sample_rate: u32) -> Result<Vec<u8>> {
    let mut cursor = std::io::Cursor::new(Vec::new());

    let spec = hound::WavSpec {
        channels: 1,           // Mono audio
        sample_rate,           // 16kHz from voice.rs
        bits_per_sample: 16,   // i16 format
        sample_format: hound::SampleFormat::Int,
    };

    let mut writer = hound::WavWriter::new(&mut cursor, spec)
        .context("Failed to create WAV writer")?;

    // Convert f32 (-1.0 to 1.0) to i16 (-32768 to 32767)
    for &sample in samples {
        let sample_i16 = (sample * 32767.0) as i16;
        writer.write_sample(sample_i16)
            .context("Failed to write WAV sample")?;
    }

    writer.finalize()
        .context("Failed to finalize WAV file")?;

    Ok(cursor.into_inner())
}

/**
 * DESIGN DECISION: Check token balance before recording
 * WHY: Prevents starting recording if user has insufficient tokens (< 375 for 1 minute)
 *
 * API Endpoint: {api_url}/api/tokens/balance
 * Method: GET
 * Headers: Authorization: Bearer {license_key}
 *
 * Response (200):
 *   - success: bool
 *   - tokens_balance: number (current balance)
 *   - tokens_used_this_month: number (usage tracking)
 *   - subscription_tier: string (free, network, pro, enterprise)
 *   - minutes_remaining: number (calculated: tokens / 375)
 *
 * Error Responses:
 *   - 401: Invalid or missing license_key
 *   - 403: Device not active
 *   - 500: Server error
 */
pub async fn check_token_balance(
    license_key: &str,
    api_url: &str,
) -> Result<TokenBalanceResponse> {
    if license_key.is_empty() {
        anyhow::bail!("License key not configured. Please activate device first.");
    }

    // Build server API endpoint URL
    let balance_endpoint = format!("{}/api/tokens/balance", api_url);

    // Send GET request to server API
    println!("📊 Checking token balance...");
    let client = reqwest::Client::new();
    let response = client
        .get(&balance_endpoint)
        .header("Authorization", format!("Bearer {}", license_key))
        .send()
        .await
        .context("Failed to send balance request to server API")?;

    // Check for API errors
    let status = response.status();

    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_default();
        anyhow::bail!("Balance check failed ({}): {}", status, error_text);
    }

    // Parse JSON response
    let balance_response: TokenBalanceResponse = response
        .json()
        .await
        .context("Failed to parse balance response")?;

    println!("✅ Balance: {} tokens (~{} minutes remaining)",
             balance_response.tokens_balance,
             balance_response.minutes_remaining);

    Ok(balance_response)
}

/**
 * DESIGN DECISION: Proxy Whisper transcription through server API with credit tracking
 * WHY: Server manages OpenAI key + tracks usage + enforces credit limits (Pattern-MONETIZATION-001)
 *
 * API Endpoint: {api_url}/api/desktop/transcribe
 * Method: POST
 * Headers: Authorization: Bearer {license_key}
 * Form Data:
 *   - file: audio.wav (required)
 *   - model: "whisper-1" (optional, defaults to whisper-1)
 *   - language: "en" (optional, improves accuracy)
 *
 * Response (200):
 *   - success: bool (true if transcription succeeded)
 *   - text: string (transcribed text)
 *   - duration_seconds: number (audio duration in seconds)
 *   - tokens_used: number (tokens consumed for this transcription)
 *   - tokens_balance: number (user's remaining token balance)
 *   - transaction_id: string (unique identifier for this transaction)
 *
 * Error Responses:
 *   - 401: Invalid or missing license_key
 *   - 402: Insufficient credits (balance < cost)
 *   - 403: Device not active
 *   - 400: Invalid audio file
 *   - 500: Server error
 */
pub async fn transcribe_audio(
    audio_samples: &[f32],
    sample_rate: u32,
    license_key: &str,
    api_url: &str,
) -> Result<String, TranscriptionError> {
    if license_key.is_empty() {
        return Err(TranscriptionError::Unauthorized {
            message: "License key not configured. Please activate device first.".to_string(),
        });
    }

    // Convert audio to WAV format with CORRECT sample rate in header
    // OpenAI Whisper API will handle any necessary resampling internally
    println!("📊 Captured {} audio samples at {}Hz", audio_samples.len(), sample_rate);
    println!("🔄 Converting {} samples to WAV format...", audio_samples.len());
    let wav_bytes = audio_to_wav(audio_samples, sample_rate)
        .map_err(|e| TranscriptionError::ParseError {
            message: format!("Failed to convert audio to WAV: {}", e),
        })?;
    println!("✅ WAV file created: {} bytes ({}Hz sample rate)", wav_bytes.len(), sample_rate);

    // Create multipart form with audio file
    let form = multipart::Form::new()
        .part(
            "file",
            multipart::Part::bytes(wav_bytes)
                .file_name("audio.wav")
                .mime_str("audio/wav")
                .map_err(|e| TranscriptionError::ParseError {
                    message: format!("Invalid MIME type: {}", e),
                })?,
        )
        .text("model", "whisper-1")
        .text("language", "en"); // Optional: improves accuracy for English

    // Build server API endpoint URL
    let transcription_endpoint = format!("{}/api/desktop/transcribe", api_url);

    // Send request to server API (proxies to OpenAI)
    println!("📤 Sending audio to server API ({})", transcription_endpoint);
    let client = reqwest::Client::new();
    let response = client
        .post(&transcription_endpoint)
        .header("Authorization", format!("Bearer {}", license_key))
        .multipart(form)
        .send()
        .await
        .map_err(|e| TranscriptionError::NetworkError {
            message: format!("Connection failed: {}", e),
        })?;

    // Check for API errors
    let status = response.status();

    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_default();

        // Parse structured error response
        let error_response: ApiErrorResponse = match serde_json::from_str(&error_text) {
            Ok(err) => err,
            Err(_) => {
                // Fallback for unstructured errors
                return Err(TranscriptionError::ParseError {
                    message: format!("Server returned {}: {}", status, error_text),
                });
            }
        };

        // Classify error based on HTTP status code (BUG-004)
        return Err(match status.as_u16() {
            401 => TranscriptionError::Unauthorized {
                message: error_response.error,
            },
            402 => TranscriptionError::PaymentRequired {
                message: error_response.error,
                balance_tokens: error_response.balance_tokens,
                required_tokens: error_response.required_tokens,
            },
            403 => TranscriptionError::Forbidden {
                message: error_response.error,
            },
            404 => TranscriptionError::NotFound {
                message: error_response.error,
            },
            500..=599 => TranscriptionError::ServerError {
                message: error_response.error,
            },
            _ => TranscriptionError::ParseError {
                message: format!("Unexpected status {}: {}", status, error_response.error),
            },
        });
    }

    // Parse JSON response
    let transcription_response: TranscriptionResponse = response
        .json()
        .await
        .map_err(|e| TranscriptionError::ParseError {
            message: format!("Failed to parse server API response: {}", e),
        })?;

    // Check if transcription was successful
    if !transcription_response.success {
        return Err(TranscriptionError::ServerError {
            message: "Transcription failed: API returned success=false".to_string(),
        });
    }

    println!("✅ Transcription received: {} characters", transcription_response.text.len());
    println!("💰 Tokens used: {}, Balance remaining: {} tokens",
             transcription_response.tokens_used,
             transcription_response.tokens_balance);

    Ok(transcription_response.text)
}

/**
 * DESIGN DECISION: Type transcript character-by-character at OS level
 * WHY: Natural typing speed (feels human), works in ANY application
 *
 * REASONING CHAIN:
 * 1. Receive transcript from OpenAI Whisper API
 * 2. Initialize Enigo (cross-platform keyboard simulator)
 * 3. Type each character with 50ms delay (20 chars/second = natural speed)
 * 4. Handle special characters (newlines, tabs, etc.)
 * 5. Result: Transcript appears wherever cursor is, in any app
 *
 * PATTERN: Pattern-KEYBOARD-001 (OS-Level Keyboard Simulation)
 * PERFORMANCE: ~50ms/char (20 chars/sec) feels natural, not robotic
 * CROSS-PLATFORM: Works on Windows (SendInput), macOS (CGEvent), Linux (X11)
 */
pub fn type_transcript(transcript: &str) -> Result<()> {
    use enigo::{Settings, Keyboard, Direction};

    let mut enigo = Enigo::new(&Settings::default())
        .context("Failed to initialize keyboard simulator")?;

    println!("⌨️  Typing transcript ({} chars) at cursor position...", transcript.len());

    for ch in transcript.chars() {
        // Type the character
        enigo.text(&ch.to_string())
            .context("Failed to type character")?;

        // Small delay between characters (5ms = 200 chars/second, very fast UX)
        thread::sleep(Duration::from_millis(5));
    }

    println!("✅ Typing complete!");

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audio_to_wav() {
        // Generate 1 second of 440Hz sine wave at 16kHz
        let sample_rate = 16000;
        let frequency = 440.0; // Hz (A4 note)

        let samples: Vec<f32> = (0..sample_rate)
            .map(|i| {
                let t = i as f32 / sample_rate as f32;
                (2.0 * std::f32::consts::PI * frequency * t).sin()
            })
            .collect();

        let wav_bytes = audio_to_wav(&samples, sample_rate).unwrap();

        // WAV file header is 44 bytes + data
        // Data size = samples * 2 bytes (i16)
        let expected_size = 44 + (samples.len() * 2);
        assert_eq!(wav_bytes.len(), expected_size);

        // Check WAV header magic number "RIFF"
        assert_eq!(&wav_bytes[0..4], b"RIFF");
        assert_eq!(&wav_bytes[8..12], b"WAVE");
    }

    /// Test deserialization of TranscriptionResponse with token-based API contract
    /// Expected format matches website/app/api/desktop/transcribe/route.ts:338-345
    #[test]
    fn test_transcription_response_deserialization_success() {
        // Simulate actual API response (token-based)
        let json_response = r#"{
            "success": true,
            "text": "This is a test transcription",
            "duration_seconds": 600,
            "tokens_used": 3750,
            "tokens_balance": 996250,
            "transaction_id": "550e8400-e29b-41d4-a716-446655440000"
        }"#;

        // Test deserialization
        let response: TranscriptionResponse = serde_json::from_str(json_response)
            .expect("Failed to deserialize TranscriptionResponse");

        // Assert all 6 fields match expected values
        assert_eq!(response.text, "This is a test transcription");
        assert_eq!(response.duration_seconds, 600);
        assert_eq!(response.tokens_used, 3750);
        assert_eq!(response.tokens_balance, 996250);
        assert_eq!(response.transaction_id, "550e8400-e29b-41d4-a716-446655440000");
        assert!(response.success);
    }

    /// Test deserialization with success=false (API error case)
    #[test]
    fn test_transcription_response_deserialization_failure() {
        let json_response = r#"{
            "success": false,
            "text": "",
            "duration_seconds": 0,
            "tokens_used": 0,
            "tokens_balance": 996250,
            "transaction_id": ""
        }"#;

        let response: TranscriptionResponse = serde_json::from_str(json_response)
            .expect("Failed to deserialize error response");

        assert!(!response.success);
        assert_eq!(response.text, "");
    }

    /// Test deserialization of 402 error with token-based fields (BUG-002A.1)
    /// Expected format matches website/app/api/desktop/transcribe/route.ts:172-182
    #[test]
    fn test_api_error_response_402_tokens() {
        // Simulate actual API 402 response (token-based)
        let json_response = r#"{
            "error": "Insufficient tokens",
            "balance_tokens": 0,
            "required_tokens": 31,
            "shortfall_tokens": 31,
            "message": "You need 31 tokens but only have 0. Please upgrade or purchase more tokens."
        }"#;

        // Test deserialization
        let error: ApiErrorResponse = serde_json::from_str(json_response)
            .expect("Failed to deserialize ApiErrorResponse");

        // Assert token fields are correctly deserialized
        assert_eq!(error.error, "Insufficient tokens");
        assert_eq!(error.balance_tokens, 0);
        assert_eq!(error.required_tokens, 31);
        assert_eq!(error.shortfall_tokens, 31);
        assert!(error.message.contains("31 tokens"));
    }

    /// Test compatibility with USD-based 402 errors (backward compatibility)
    /// Some legacy API responses may still use USD fields
    #[test]
    fn test_api_error_response_402_usd_fallback() {
        // Simulate legacy API 402 response (USD-based)
        let json_response = r#"{
            "error": "Insufficient credits",
            "balance_usd": 0.00,
            "required_usd": 0.02,
            "message": "Please add credits to continue."
        }"#;

        // Test deserialization with fallback to USD fields
        let error: ApiErrorResponse = serde_json::from_str(json_response)
            .expect("Failed to deserialize ApiErrorResponse");

        // Assert USD fields are correctly deserialized
        assert_eq!(error.error, "Insufficient credits");
        assert_eq!(error.balance_usd, 0.00);
        assert_eq!(error.required_usd, 0.02);
        assert_eq!(error.message, "Please add credits to continue.");
    }
}
