/**
 * Voice Capture Component - VoiceTyper Style
 *
 * DESIGN DECISION: Mouse-driven recording with configurable hotkeys
 * WHY: User wants everything controlled via mouse (middle button = record, right click = paste location)
 *
 * REASONING CHAIN:
 * 1. Middle mouse button = start/stop recording (configurable)
 * 2. Right click in input box = select paste destination (future)
 * 3. Auto-copy to clipboard when transcription completes
 * 4. Top ticker bar shows real-time transcription (scrolling right-to-left)
 * 5. Color-coded: blue/green recording, red/blue secure (future)
 * 6. Clean, minimal UI (VoiceTyper inspired)
 *
 * PATTERN: Pattern-UI-004 (VoiceTyper-Style Voice Capture)
 * RELATED: useVoiceCapture.ts (state management), TickerBar.tsx (scrolling text)
 * FUTURE: Configurable hotkeys, secure mode indicator, auto-paste to active input
 */

import { useEffect, useState } from 'react';
import { useVoiceCapture } from '../hooks/useVoiceCapture';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface TokenWarning {
  level: string;        // "medium" | "high" | "critical"
  threshold: number;    // 80 | 90 | 95
  message: string;      // User-friendly warning message
  percentage_used: number;
}

interface TokenBalance {
  success: boolean;
  tokens_balance: number;
  tokens_used_this_month: number;
  subscription_tier: string;
  minutes_remaining: number;
  warnings?: TokenWarning[];  // NEW: Server-calculated warnings
}

export function VoiceCapture() {
  const { state, isRecording, result, error, startCapture, stopCapture } =
    useVoiceCapture();

  const [recordingMode, setRecordingMode] = useState<'hold' | 'click'>('click'); // TODO: Make configurable in settings
  const [isClickRecording, setIsClickRecording] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [showInsufficientTokens, setShowInsufficientTokens] = useState(false);
  const [showLowBalanceToast, setShowLowBalanceToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [lastWarningThreshold, setLastWarningThreshold] = useState<number | null>(null);

  /**
   * DESIGN DECISION: Display server-calculated warnings (NO client-side calculation)
   * WHY: Server is source of truth for thresholds, prevents client/server mismatch
   *
   * PATTERN: Pattern-MONETIZATION-001 (Server-Side Key Management)
   * CHANGE: Replaced client-side warning calculation with server warnings (Sprint 4)
   */
  const checkBalanceWarnings = (balance: TokenBalance) => {
    // If no warnings from server, clear any existing warnings
    if (!balance.warnings || balance.warnings.length === 0) {
      return;
    }

    // Get highest severity warning (server sends them in order)
    const highestWarning = balance.warnings[0];

    // Only show warning if threshold changed (prevent duplicate toasts)
    if (lastWarningThreshold === highestWarning.threshold) {
      return;
    }

    // Update state and show toast
    setLastWarningThreshold(highestWarning.threshold);
    setToastMessage(highestWarning.message);
    setShowLowBalanceToast(true);

    // Auto-hide toast after 5 seconds
    setTimeout(() => {
      setShowLowBalanceToast(false);
    }, 5000);
  };

  /**
   * DESIGN DECISION: Load token balance on component mount + background polling
   * WHY: User needs real-time visibility into token balance
   *
   * REASONING CHAIN:
   * 1. Load balance immediately on mount
   * 2. Set up polling interval (5 minutes)
   * 3. Check warning thresholds after each load
   * 4. Show toast notifications at 80%/90%/95% usage
   * 5. Result: User never surprised by insufficient tokens
   */
  useEffect(() => {
    const loadBalance = async () => {
      try {
        const balance = await invoke<TokenBalance>('get_token_balance');
        setTokenBalance(balance);
        checkBalanceWarnings(balance);
        console.log('Token balance loaded:', balance);
      } catch (error) {
        console.error('Failed to load token balance:', error);
        // Don't block UX if balance check fails
      }
    };

    // Load immediately
    loadBalance();

    // Poll every 5 minutes (300000ms)
    const intervalId = setInterval(() => {
      loadBalance();
    }, 300000);

    // Listen for insufficient-tokens events from backend
    const unlistenPromise = listen<TokenBalance>('insufficient-tokens', (event) => {
      console.warn('Insufficient tokens:', event.payload);
      setTokenBalance(event.payload);
      setShowInsufficientTokens(true);
    });

    return () => {
      clearInterval(intervalId);
      unlistenPromise.then(unlisten => unlisten());
    };
  }, [lastWarningThreshold]);

  /**
   * DESIGN DECISION: Refresh balance after transcription completes
   * WHY: User sees updated balance after tokens are consumed
   */
  useEffect(() => {
    if (state === 'complete' && result) {
      // Refresh balance after transcription
      invoke<TokenBalance>('get_token_balance')
        .then(balance => {
          setTokenBalance(balance);
          checkBalanceWarnings(balance);
          console.log('Balance refreshed:', balance);
        })
        .catch(err => console.error('Failed to refresh balance:', err));
    }
  }, [state, result]);

  /**
   * DESIGN DECISION: Auto-copy transcription to clipboard
   * WHY: User wants to paste anywhere (Ctrl+V) without clicking "Send" buttons
   */
  useEffect(() => {
    if (state === 'complete' && result) {
      // Auto-copy to clipboard
      writeText(result.text).then(() => {
        console.log('Transcription copied to clipboard:', result.text);
      }).catch((err) => {
        console.error('Failed to copy to clipboard:', err);
      });
    }
  }, [state, result]);

  /**
   * DESIGN DECISION: Mouse button 3 (middle button) for recording
   * WHY: User requested mouse-driven workflow (middle = record, right = paste location)
   *
   * NOTE: auxclick event captures middle mouse button (button = 1)
   */
  useEffect(() => {
    const handleAuxClick = (e: MouseEvent) => {
      if (e.button === 1) { // Middle mouse button
        e.preventDefault();

        if (recordingMode === 'click') {
          // Click-to-start, click-to-stop
          if (state === 'idle') {
            startCapture();
            setIsClickRecording(true);
          } else if (isRecording && isClickRecording) {
            stopCapture();
            setIsClickRecording(false);
          }
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 1 && recordingMode === 'hold') { // Middle button hold mode
        e.preventDefault();
        if (state === 'idle') {
          startCapture();
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 1 && recordingMode === 'hold') { // Middle button hold mode
        e.preventDefault();
        if (isRecording) {
          stopCapture();
        }
      }
    };

    window.addEventListener('auxclick', handleAuxClick);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('auxclick', handleAuxClick);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [state, isRecording, recordingMode, isClickRecording, startCapture, stopCapture]);

  /**
   * DESIGN DECISION: Clean, minimal UI (VoiceTyper inspired)
   * WHY: User wants cleaner look, transcription visible, no unnecessary buttons
   */
  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          backgroundColor: '#ffffff',
          overflow: 'hidden',
        }}
      >
      {/* Top ticker bar - shows recording status and transcription in real-time */}
      {/* Thin recording indicator bar at very top - pulses while recording */}
      {isRecording && (
        <div
          style={{
            height: '2px',
            backgroundColor: '#10b981',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.3) 0%, rgba(16, 185, 129, 1) 50%, rgba(16, 185, 129, 0.3) 100%)',
              animation: 'pulse-bar 1.5s ease-in-out infinite',
            }}
          />
        </div>
      )}

      {(isRecording || state === 'processing' || (state === 'complete' && result)) && (
        <div
          style={{
            height: '48px',
            backgroundColor: isRecording ? '#10b981' : '#3b82f6', // green when recording, blue otherwise
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Pulsing overlay for processing state */}
          {state === 'processing' && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 1) 50%, rgba(59, 130, 246, 0.3) 100%)',
                animation: 'pulse-bar 1.5s ease-in-out infinite',
              }}
            />
          )}
          <div
            style={{
              color: 'white',
              fontSize: '18px',
              fontWeight: '500',
              whiteSpace: 'nowrap',
              animation: result && result.text.length > 50 ? 'scroll-left 15s linear infinite' : 'none',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {isRecording && !result && '🎤 Recording...'}
            {state === 'processing' && '⚙️ Transcribing...'}
            {result && result.text}
          </div>
        </div>
      )}

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          gap: '24px',
        }}
      >
        {/* Record button */}
        <button
          onClick={() => {
            if (recordingMode === 'click') {
              if (state === 'idle') {
                startCapture();
                setIsClickRecording(true);
              } else if (isRecording && isClickRecording) {
                stopCapture();
                setIsClickRecording(false);
              }
            }
          }}
          disabled={state === 'processing'}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: isRecording ? '#ef4444' : '#3b82f6',
            color: 'white',
            fontSize: '32px',
            cursor: state === 'processing' ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: isRecording
              ? '0 0 30px rgba(239, 68, 68, 0.6)'
              : '0 2px 8px rgba(0, 0, 0, 0.15)',
          }}
        >
          {state === 'idle' && '🎤'}
          {state === 'recording' && '⏸'}
          {state === 'processing' && '⚡'}
          {state === 'complete' && '✓'}
          {state === 'error' && '✗'}
        </button>

        {/* Status text */}
        <div style={{ textAlign: 'center', maxWidth: '600px' }}>
          {state === 'idle' && (
            <p style={{ color: '#6b7280', fontSize: '16px' }}>
              Click the button or use middle mouse button to record
            </p>
          )}

          {state === 'recording' && (
            <p style={{ color: '#ef4444', fontWeight: '600', fontSize: '18px' }}>
              Recording...
            </p>
          )}

          {state === 'processing' && (
            <p style={{ color: '#3b82f6', fontWeight: '600', fontSize: '18px' }}>
              Transcribing...
            </p>
          )}

          {state === 'complete' && result && (
            <div>
              <p style={{ fontSize: '20px', fontWeight: '500', marginBottom: '12px', color: '#1f2937' }}>
                {result.text}
              </p>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                ✅ Copied to clipboard • Confidence: {(result.confidence * 100).toFixed(0)}% • {(result.duration_ms / 1000).toFixed(1)}s
              </p>
              <p style={{ color: '#9ca3af', fontSize: '13px', marginTop: '8px' }}>
                Press Ctrl+V to paste anywhere
              </p>
            </div>
          )}

          {state === 'error' && (
            <p style={{ color: '#ef4444', fontSize: '16px' }}>Error: {error}</p>
          )}
        </div>

        {/* Recording mode toggle */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button
            onClick={() => setRecordingMode('click')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: recordingMode === 'click' ? '2px solid #3b82f6' : '2px solid #e5e7eb',
              backgroundColor: recordingMode === 'click' ? '#eff6ff' : 'white',
              color: recordingMode === 'click' ? '#3b82f6' : '#6b7280',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Click to Start/Stop
          </button>
          <button
            onClick={() => setRecordingMode('hold')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: recordingMode === 'hold' ? '2px solid #3b82f6' : '2px solid #e5e7eb',
              backgroundColor: recordingMode === 'hold' ? '#eff6ff' : 'white',
              color: recordingMode === 'hold' ? '#3b82f6' : '#6b7280',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Hold to Record
          </button>
        </div>
      </div>

        {/* Token Balance Display */}
        {tokenBalance && (
          <div style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            padding: '12px 16px',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
            fontSize: '14px',
            color: '#374151',
          }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>
              {tokenBalance.tokens_balance.toLocaleString()} tokens
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {tokenBalance.subscription_tier}
            </div>
          </div>
        )}

        {/* CSS animation for scrolling ticker */}
        <style>{`
          @keyframes scroll-left {
            0% {
              transform: translateX(100%);
            }
            100% {
              transform: translateX(-100%);
            }
          }

          @keyframes pulse-bar {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }
        `}</style>
      </div>

      {/* Insufficient Tokens Modal */}
      {showInsufficientTokens && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowInsufficientTokens(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '400px',
              textAlign: 'center',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ margin: '0 0 16px 0', color: '#1f2937', fontSize: '24px' }}>
              Insufficient Tokens
            </h2>
            <p style={{ margin: '0 0 24px 0', color: '#6b7280', fontSize: '16px' }}>
              You need at least 375 tokens to transcribe 1 minute of audio.
              <br />
              <br />
              Current balance: <strong>{tokenBalance?.tokens_balance.toLocaleString() || 0} tokens</strong>
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  window.open('https://aetherlight-aelors-projects.vercel.app/dashboard?action=upgrade', '_blank');
                  setShowInsufficientTokens(false);
                }}
                style={{
                  padding: '12px 24px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Buy More Tokens
              </button>
              <button
                onClick={() => setShowInsufficientTokens(false)}
                style={{
                  padding: '12px 24px',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Low Balance Toast Notification */}
      {showLowBalanceToast && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            background: lastWarningThreshold === 95 ? '#dc2626' : lastWarningThreshold === 90 ? '#f59e0b' : '#fbbf24',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            fontSize: '16px',
            fontWeight: 600,
            zIndex: 10000,
            maxWidth: '400px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          <span>{toastMessage}</span>
          <button
            onClick={() => setShowLowBalanceToast(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Toast animation */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
