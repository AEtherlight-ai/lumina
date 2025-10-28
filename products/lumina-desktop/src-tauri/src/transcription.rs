/**
 * OpenAI Whisper API Transcription + Keyboard Typing Module
 *
 * DESIGN DECISION: Desktop app types transcript directly via OS-level keyboard simulation
 * WHY: Works everywhere (any application, not just VS Code), feels natural to user
 *
 * REASONING CHAIN:
 * 1. User presses hotkey (Shift+~ or `) while cursor is positioned
 * 2. Desktop app captures audio → sends to OpenAI Whisper API
 * 3. Receives transcript back from API
 * 4. **Types transcript character-by-character at OS level** (wherever cursor is)
 * 5. Works in: VS Code, Cursor, Claude Code, Notepad, browser, ANY app
 * 6. Result: Seamless voice-to-text that works everywhere
 *
 * PATTERN: Pattern-WHISPER-001 (OpenAI Whisper API) + Pattern-KEYBOARD-001 (OS-Level Typing)
 * PERFORMANCE: ~2-5s transcription + ~50ms/char typing (feels natural)
 * RELATED: voice.rs (audio capture), main.rs (hotkey handling)
 */

use anyhow::{Context, Result};
use reqwest::multipart;
use serde::Deserialize;
use std::io::Write;
use enigo::Enigo;
use std::thread;
use std::time::Duration;

/// OpenAI Whisper API response
#[derive(Debug, Deserialize)]
struct WhisperResponse {
    text: String,
}

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
 * DESIGN DECISION: Call OpenAI Whisper API with multipart form upload
 * WHY: API requires multipart/form-data with audio file + model parameter
 *
 * API Endpoint: https://api.openai.com/v1/audio/transcriptions
 * Method: POST
 * Headers: Authorization: Bearer <api_key>
 * Form Data:
 *   - file: audio.wav (required)
 *   - model: "whisper-1" (required)
 *   - language: "en" (optional, improves accuracy)
 *   - response_format: "json" (default)
 */
pub async fn transcribe_audio(
    audio_samples: &[f32],
    sample_rate: u32,
    api_key: &str,
) -> Result<String> {
    if api_key.is_empty() {
        anyhow::bail!("OpenAI API key not configured. Please set it in Settings.");
    }

    // Convert audio to WAV format with CORRECT sample rate in header
    // OpenAI Whisper API will handle any necessary resampling internally
    println!("📊 Captured {} audio samples at {}Hz", audio_samples.len(), sample_rate);
    println!("🔄 Converting {} samples to WAV format...", audio_samples.len());
    let wav_bytes = audio_to_wav(audio_samples, sample_rate)
        .context("Failed to convert audio to WAV")?;
    println!("✅ WAV file created: {} bytes ({}Hz sample rate)", wav_bytes.len(), sample_rate);

    // DEBUG: Save WAV file to disk for inspection
    let debug_path = std::env::temp_dir().join("lumina_debug.wav");
    std::fs::write(&debug_path, &wav_bytes)
        .context("Failed to write debug WAV file")?;
    println!("🔍 DEBUG: Saved WAV to {:?}", debug_path);

    // Create multipart form with audio file
    let form = multipart::Form::new()
        .part(
            "file",
            multipart::Part::bytes(wav_bytes)
                .file_name("audio.wav")
                .mime_str("audio/wav")?,
        )
        .text("model", "whisper-1")
        .text("language", "en"); // Optional: improves accuracy for English

    // Send request to OpenAI API
    println!("📤 Sending audio to OpenAI Whisper API...");
    let client = reqwest::Client::new();
    let response = client
        .post("https://api.openai.com/v1/audio/transcriptions")
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .send()
        .await
        .context("Failed to send request to OpenAI API")?;

    // Check for API errors
    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        anyhow::bail!(
            "OpenAI API error ({}): {}",
            status,
            error_text
        );
    }

    // Parse JSON response
    let whisper_response: WhisperResponse = response
        .json()
        .await
        .context("Failed to parse OpenAI API response")?;

    println!("✅ Transcription received: {} characters", whisper_response.text.len());

    Ok(whisper_response.text)
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
}
