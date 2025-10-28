/**
 * Audio Indicator Overlay - 2px bar at top of desktop
 *
 * DESIGN DECISION: Full-width, 2px tall, audio-reactive bar
 * WHY: User wants visual feedback that appears when recording starts, disappears when stops
 *
 * REASONING CHAIN:
 * 1. Hotkey pressed → overlay window appears at top of screen
 * 2. Audio callback emits 'audio-level' events with RMS values (0.0-1.0)
 * 3. Component listens to events and animates bar position based on volume
 * 4. Louder voice = more movement (wider wave), quieter = less movement
 * 5. Hotkey pressed again → overlay window closes
 * 6. Result: Simple, visual feedback that "you can hear them or see it bounce with their voice"
 *
 * PATTERN: Pattern-UI-005 (Audio-Reactive Desktop Overlay)
 * PERFORMANCE: <16ms per frame (60fps), <5% CPU
 * RELATED: main.rs (window creation), voice.rs (audio events)
 */

import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

export function AudioIndicator() {
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    // Listen to audio level events from Rust backend
    const unlisten = listen<number>('audio-level', (event) => {
      setAudioLevel(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Calculate bar position based on audio level
  // Higher volume = more horizontal movement (wave effect)
  const movement = audioLevel * 50; // Scale 0.0-1.0 to 0-50% screen width

  return (
    <div
      style={{
        width: '100vw',
        height: '2px',
        background: `linear-gradient(90deg,
          rgba(16, 185, 129, 0.3) 0%,
          rgba(16, 185, 129, 1) ${50 - movement}%,
          rgba(16, 185, 129, 1) ${50 + movement}%,
          rgba(16, 185, 129, 0.3) 100%)`,
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        pointerEvents: 'none', // Don't block clicks
      }}
    />
  );
}
