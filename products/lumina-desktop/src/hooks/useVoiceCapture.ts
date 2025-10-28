/**
 * Voice Capture Hook
 *
 * DESIGN DECISION: Custom React hook for voice capture state management
 * WHY: Encapsulates IPC logic, provides clean API for components
 *
 * REASONING CHAIN:
 * 1. Components need to trigger voice capture (button press, ` or ~ hotkey)
 * 2. IPC calls (start_capture, stop_capture) are async
 * 3. Hook manages state: idle → recording → processing → complete
 * 4. Provides isRecording, result, error state to UI
 * 5. Cleanup on unmount prevents memory leaks
 *
 * PATTERN: Pattern-REACT-001 (Custom Hook for Tauri IPC)
 * RELATED: VoiceCapture.tsx, main.rs (IPC commands)
 * FUTURE: Add streaming transcription, real-time waveform data
 */

import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface VoiceCaptureResult {
  text: string;
  confidence: number;
  duration_ms: number;
}

type CaptureState = 'idle' | 'recording' | 'processing' | 'complete' | 'error';

export function useVoiceCapture() {
  const [state, setState] = useState<CaptureState>('idle');
  const [result, setResult] = useState<VoiceCaptureResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * DESIGN DECISION: Start capture via Tauri IPC
   * WHY: Delegates to Rust backend (cpal handles OS audio APIs)
   */
  const startCapture = useCallback(async () => {
    try {
      setState('recording');
      setError(null);
      await invoke('start_capture');
    } catch (err) {
      setState('error');
      setError(err as string);
      console.error('Failed to start capture:', err);
    }
  }, []);

  /**
   * DESIGN DECISION: Stop capture and retrieve transcription
   * WHY: Backend returns audio samples → Whisper transcription → text result
   */
  const stopCapture = useCallback(async () => {
    try {
      setState('processing');
      const captureResult = await invoke<VoiceCaptureResult>('stop_capture');
      setResult(captureResult);
      setState('complete');

      // Auto-reset to idle after 3 seconds
      setTimeout(() => {
        setState('idle');
        setResult(null);
      }, 3000);
    } catch (err) {
      setState('error');
      setError(err as string);
      console.error('Failed to stop capture:', err);
    }
  }, []);

  /**
   * DESIGN DECISION: Cleanup on unmount
   * WHY: Prevent audio stream leak if component unmounts during recording
   */
  useEffect(() => {
    return () => {
      if (state === 'recording') {
        invoke('stop_capture').catch(console.error);
      }
    };
  }, [state]);

  return {
    state,
    isRecording: state === 'recording',
    result,
    error,
    startCapture,
    stopCapture,
  };
}
