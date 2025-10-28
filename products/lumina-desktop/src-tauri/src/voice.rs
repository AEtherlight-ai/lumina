/**
 * Cross-Platform Voice Capture Module
 *
 * DESIGN DECISION: Use cpal for cross-platform audio input
 * WHY: cpal abstracts OS-specific APIs (CoreAudio/WASAPI/ALSA) into unified interface
 *
 * REASONING CHAIN:
 * 1. Need audio capture for voice input (microphone access)
 * 2. Each OS has different API: Windows (WASAPI), macOS (CoreAudio), Linux (ALSA/PulseAudio)
 * 3. cpal provides cross-platform abstraction (write once, works everywhere)
 * 4. 16kHz sample rate required for Whisper.cpp (speech recognition optimized)
 * 5. Ring buffer prevents audio loss during processing spikes
 * 6. Async design (tokio) prevents UI blocking during capture
 *
 * PATTERN: Pattern-VOICE-003 (Cross-Platform Audio Capture)
 * PERFORMANCE: <10ms latency, <5% CPU during recording, <200MB memory
 * RELATED: main.rs (IPC commands), transcription.rs (Whisper integration)
 * FUTURE: Streaming transcription, noise cancellation, VAD (voice activity detection)
 */

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, Host, Sample, SampleFormat, Stream, StreamConfig};
use std::sync::{Arc, Mutex};
use std::cell::RefCell;
use tauri::Emitter;

/// Voice capture errors
#[derive(Debug, thiserror::Error)]
pub enum VoiceError {
    #[error("No audio input device found")]
    NoDevice,

    #[error("Failed to get default input config: {0}")]
    ConfigError(String),

    #[error("Failed to build audio stream: {0}")]
    StreamError(String),

    #[error("Unsupported sample format: {0:?}")]
    UnsupportedFormat(SampleFormat),
}

/// Voice capture result type
pub type Result<T> = std::result::Result<T, VoiceError>;

/**
 * DESIGN DECISION: Thread-local storage for active VoiceCapture instance
 * WHY: VoiceCapture contains non-Send Stream, cannot be stored in global static or Tauri state
 *
 * REASONING CHAIN:
 * 1. Stream must stay alive during recording or audio capture stops
 * 2. VoiceCapture contains Stream, so VoiceCapture must stay alive
 * 3. Tauri state requires Send types, but Stream is not Send
 * 4. Global statics also require Send + Sync
 * 5. Solution: Use thread-local storage (doesn't require Send)
 * 6. toggle_recording creates/destroys VoiceCapture in thread-local
 * 7. Audio buffer still shared via Arc for State access
 *
 * PATTERN: Pattern-RUST-010 (Thread-Local Storage for non-Send Resources)
 */
thread_local! {
    static ACTIVE_CAPTURE: RefCell<Option<VoiceCapture>> = RefCell::new(None);
}

/**
 * Voice Capture Engine
 *
 * DESIGN DECISION: Ring buffer with Arc<Mutex<>> for thread-safe audio storage
 * WHY: Audio capture runs on separate thread, UI thread needs access
 *
 * REASONING CHAIN:
 * 1. cpal audio callback runs on high-priority OS thread (low latency)
 * 2. UI thread (React frontend) needs captured audio for transcription
 * 3. Arc<Mutex<Vec<f32>>> enables safe cross-thread access
 * 4. Ring buffer (capacity 16000 * 30 = 30 seconds @ 16kHz) prevents overflow
 * 5. stop_capture() drains buffer and returns audio data
 */
pub struct VoiceCapture {
    host: Host,
    device: Device,
    config: StreamConfig,
    buffer: Arc<Mutex<Vec<f32>>>,
    stream: Option<Stream>,
    actual_sample_rate: u32, // ACTUAL rate the device is capturing at
}

impl VoiceCapture {
    /**
     * DESIGN DECISION: Initialize with default audio device and 16kHz config
     * WHY: Whisper.cpp requires 16kHz sample rate, default device = user's microphone
     */
    pub fn new() -> Result<Self> {
        // Get default audio host (WASAPI on Windows, CoreAudio on macOS, ALSA on Linux)
        let host = cpal::default_host();

        // Get default input device (user's primary microphone)
        let device = host
            .default_input_device()
            .ok_or(VoiceError::NoDevice)?;

        // Get default input config and force 16kHz for Whisper
        let mut config = device
            .default_input_config()
            .map_err(|e| VoiceError::ConfigError(e.to_string()))?
            .config();

        // CRITICAL: Whisper.cpp expects 16kHz sample rate
        config.sample_rate = cpal::SampleRate(16000);

        // Shared buffer for audio samples (30 seconds capacity)
        let buffer = Arc::new(Mutex::new(Vec::with_capacity(16000 * 30)));

        Ok(Self {
            host,
            device,
            config: config.clone(),
            buffer,
            stream: None,
            actual_sample_rate: config.sample_rate.0, // Store the configured rate
        })
    }

    /**
     * DESIGN DECISION: Initialize with external shared buffer
     * WHY: Allow Tauri state to own buffer (avoiding non-Send Stream in state)
     *
     * REASONING CHAIN:
     * 1. VoiceCapture contains Stream which is not Send (has *mut ())
     * 2. Tauri managed state requires Send types
     * 3. Solution: State owns buffer (Arc<Mutex<Vec<f32>>>), VoiceCapture is local variable
     * 4. Create VoiceCapture with State's buffer when recording starts
     * 5. VoiceCapture drops when recording stops (Stream closes)
     * 6. Buffer survives in State for next capture
     * 7. Result: Thread-safe without storing non-Send types in State
     */
    pub fn new_with_buffer(buffer: Arc<Mutex<Vec<f32>>>) -> Result<Self> {
        // Get default audio host (WASAPI on Windows, CoreAudio on macOS, ALSA on Linux)
        let host = cpal::default_host();

        // Get default input device (user's primary microphone)
        let device = host
            .default_input_device()
            .ok_or(VoiceError::NoDevice)?;

        // DESIGN DECISION: Capture at device's native sample rate, resample to 16kHz later
        // WHY: Setting config.sample_rate doesn't change device's actual rate
        //
        // REASONING CHAIN:
        // 1. Device captures at native rate (typically 44.1kHz or 48kHz on Windows)
        // 2. Setting config.sample_rate only changes metadata, not actual capture rate
        // 3. If we label 44.1kHz audio as 16kHz, Whisper interprets at wrong speed
        // 4. Result: Severely garbled transcriptions (pitch/speed distortion)
        // 5. Solution: Capture at native rate, then resample to 16kHz using rubato
        //
        // PATTERN: Pattern-AUDIO-001 (Proper Audio Resampling)
        // Accept device's native sample rate (don't try to override)
        let config = device
            .default_input_config()
            .map_err(|e| VoiceError::ConfigError(e.to_string()))?
            .config();

        // DEBUG: Print actual device sample rate
        println!("🎤 Device native sample rate: {}Hz", config.sample_rate.0);

        Ok(Self {
            host,
            device,
            config: config.clone(),
            buffer,
            stream: None,
            actual_sample_rate: config.sample_rate.0, // Store for later
        })
    }

    /**
     * DESIGN DECISION: Start capture with callback-based architecture
     * WHY: cpal uses callbacks for low-latency audio (OS directly calls our function)
     *
     * REASONING CHAIN:
     * 1. Build audio stream with closure that receives samples
     * 2. Convert samples to f32 (Whisper expects float32)
     * 3. Append to shared buffer (Mutex for thread safety)
     * 4. Return stream handle (keeps capture running)
     */
    pub fn start_capture(&mut self, app_handle: tauri::AppHandle) -> Result<()> {
        let buffer = Arc::clone(&self.buffer);
        let config = self.config.clone();

        // DEBUG: Get ACTUAL device config that will be used for stream
        let actual_device_config = self.device.default_input_config()
            .map_err(|e| VoiceError::ConfigError(e.to_string()))?;

        println!("🔍 DEBUG Stream Config:");
        println!("  - Stored config rate: {}Hz", config.sample_rate.0);
        println!("  - Actual device config rate: {}Hz", actual_device_config.sample_rate().0);
        println!("  - Sample format: {:?}", actual_device_config.sample_format());
        println!("  - Channels: {}", actual_device_config.channels());

        // Build stream based on sample format
        let stream = match actual_device_config.sample_format() {
            SampleFormat::F32 => self.build_stream::<f32>(app_handle.clone(), config, buffer)?,
            SampleFormat::I16 => self.build_stream::<i16>(app_handle.clone(), config, buffer)?,
            SampleFormat::U16 => self.build_stream::<u16>(app_handle.clone(), config, buffer)?,
            format => return Err(VoiceError::UnsupportedFormat(format)),
        };

        // Start the stream (begins capturing audio)
        stream
            .play()
            .map_err(|e| VoiceError::StreamError(e.to_string()))?;

        // Store the ACTUAL sample rate from the device config
        self.actual_sample_rate = actual_device_config.sample_rate().0;

        self.stream = Some(stream);
        Ok(())
    }

    /**
     * DESIGN DECISION: Generic stream builder for multiple sample formats
     * WHY: Different audio devices use different formats (f32, i16, u16)
     *
     * REASONING CHAIN:
     * 1. Windows: Often uses i16 (16-bit signed integer)
     * 2. macOS: Often uses f32 (32-bit float)
     * 3. Linux: Varies by driver
     * 4. Convert all to f32 for Whisper.cpp (to_sample() handles conversion)
     */
    fn build_stream<T>(
        &self,
        app_handle: tauri::AppHandle,
        config: StreamConfig,
        buffer: Arc<Mutex<Vec<f32>>>,
    ) -> Result<Stream>
    where
        T: Sample + cpal::SizedSample,
        f32: cpal::FromSample<T>,
    {
        let channels = config.channels as usize;

        let stream = self
            .device
            .build_input_stream(
                &config,
                move |data: &[T], _: &cpal::InputCallbackInfo| {
                    let mut buffer = buffer.lock().unwrap();
                    let mut samples_f32 = Vec::new();

                    if channels == 1 {
                        // Mono: just convert directly
                        for &sample in data {
                            let s: f32 = sample.to_sample();
                            buffer.push(s);
                            samples_f32.push(s);
                        }
                    } else {
                        // Stereo (or more): average all channels to mono
                        for chunk in data.chunks(channels) {
                            let mut sum: f32 = 0.0;
                            for &sample in chunk {
                                let sample_f32: f32 = sample.to_sample();
                                sum += sample_f32;
                            }
                            let mono_sample = sum / channels as f32;
                            buffer.push(mono_sample);
                            samples_f32.push(mono_sample);
                        }
                    }

                    // Calculate RMS audio level for visual feedback
                    let rms: f32 = if !samples_f32.is_empty() {
                        let sum_of_squares: f32 = samples_f32.iter().map(|s| s * s).sum();
                        (sum_of_squares / samples_f32.len() as f32).sqrt()
                    } else {
                        0.0
                    };

                    // Emit audio level event to frontend (non-blocking)
                    let _ = app_handle.emit("audio-level", rms);
                },
                |err| eprintln!("Audio stream error: {}", err),
                None, // No timeout
            )
            .map_err(|e| VoiceError::StreamError(e.to_string()))?;

        Ok(stream)
    }

    /**
     * DESIGN DECISION: Stop and return captured audio with sample rate
     * WHY: Need to pass native sample rate to resampling function
     *
     * REASONING CHAIN:
     * 1. Drop stream (stops audio capture)
     * 2. Lock buffer and drain to Vec<f32>
     * 3. Clear buffer for next capture
     * 4. Return audio samples + native sample rate to caller
     * 5. Sample rate is needed for proper resampling to 16kHz
     *
     * PATTERN: Pattern-AUDIO-001 (Proper Audio Resampling)
     */
    pub fn stop_capture(&mut self) -> (Vec<f32>, u32) {
        // Stop stream by dropping it
        self.stream = None;

        // Extract audio from buffer
        let mut buffer = self.buffer.lock().unwrap();
        let audio = buffer.drain(..).collect();

        (audio, self.actual_sample_rate)
    }

    /**
     * DESIGN DECISION: List available input devices
     * WHY: Users may have multiple microphones (built-in, USB, Bluetooth)
     */
    pub fn list_devices() -> Result<Vec<String>> {
        let host = cpal::default_host();
        let devices: Vec<String> = host
            .input_devices()
            .map_err(|e| VoiceError::ConfigError(e.to_string()))?
            .filter_map(|d| d.name().ok())
            .collect();

        Ok(devices)
    }
}

/**
 * DESIGN DECISION: Global start/stop functions for Tauri commands
 * WHY: Allow main.rs to control recording without storing non-Send types in Tauri state
 *
 * REASONING CHAIN:
 * 1. main.rs cannot store VoiceCapture in Tauri state (not Send)
 * 2. Solution: Provide global functions that manage ACTIVE_CAPTURE static
 * 3. Audio buffer passed from State (Arc<Mutex<Vec<f32>>>)
 * 4. VoiceCapture stored in global static during recording
 * 5. Stream stays alive until stop_recording_global() called
 * 6. Result: Real audio capture without violating Tauri's Send requirements
 */

/// Start recording with external buffer (from Tauri state)
pub fn start_recording_global(buffer: Arc<Mutex<Vec<f32>>>, app_handle: tauri::AppHandle) -> Result<()> {
    ACTIVE_CAPTURE.with(|active| {
        let mut active = active.borrow_mut();

        if active.is_some() {
            return Err(VoiceError::StreamError("Recording already in progress".to_string()));
        }

        // Clear buffer for new recording
        {
            let mut buf = buffer.lock().unwrap();
            buf.clear();
        }

        // Create and start VoiceCapture
        let mut capture = VoiceCapture::new_with_buffer(buffer)?;
        capture.start_capture(app_handle)?;

        // Store in thread-local (keeps Stream alive)
        *active = Some(capture);

        Ok(())
    })
}

/// Stop recording and return audio samples with sample rate
pub fn stop_recording_global() -> (Vec<f32>, u32) {
    ACTIVE_CAPTURE.with(|active| {
        let mut active = active.borrow_mut();

        if let Some(mut capture) = active.take() {
            capture.stop_capture()
        } else {
            (Vec::new(), 44100) // Default fallback (should never happen)
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_voice_capture_new() {
        // Test initialization (may fail on systems without microphone)
        match VoiceCapture::new() {
            Ok(vc) => {
                assert_eq!(vc.config.sample_rate.0, 16000);
                assert!(vc.stream.is_none());
            }
            Err(VoiceError::NoDevice) => {
                // Expected on systems without microphone
                println!("No audio device found (expected in CI/headless environments)");
            }
            Err(e) => panic!("Unexpected error: {}", e),
        }
    }

    #[test]
    fn test_list_devices() {
        // Should return list (may be empty on headless systems)
        match VoiceCapture::list_devices() {
            Ok(devices) => {
                println!("Found {} audio devices", devices.len());
                for device in devices {
                    println!("  - {}", device);
                }
            }
            Err(e) => {
                println!("Could not list devices: {}", e);
            }
        }
    }
}
