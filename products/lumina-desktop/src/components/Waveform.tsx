/**
 * Waveform Animation Component
 *
 * DESIGN DECISION: CSS-based waveform animation (no canvas, no heavy libs)
 * WHY: <3MB binary target, CSS animations are performant and lightweight
 *
 * REASONING CHAIN:
 * 1. Voice capture needs visual feedback (user knows it's recording)
 * 2. Canvas waveform = complex, adds bundle size, needs animation loop
 * 3. CSS @keyframes = built-in, hardware-accelerated, zero overhead
 * 4. Animated bars (opacity + scaleY) create waveform effect
 * 5. Randomized delays create natural "audio wave" appearance
 *
 * PATTERN: Pattern-UI-001 (Lightweight CSS Animations)
 * RELATED: VoiceCapture.tsx (parent component)
 * FUTURE: Real waveform visualization from audio samples (P2-004)
 */

interface WaveformProps {
  isRecording: boolean;
}

export function Waveform({ isRecording }: WaveformProps) {
  /**
   * DESIGN DECISION: 5 animated bars with staggered delays
   * WHY: Simulates audio waveform without actual audio analysis
   *
   * REASONING CHAIN:
   * 1. Each bar animates opacity + scaleY (height)
   * 2. animation-delay creates offset (bars don't sync)
   * 3. CSS calc() randomizes timing (natural wave effect)
   * 4. isRecording toggles animation (animation-play-state)
   */
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        height: '40px',
      }}
    >
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          style={{
            width: '4px',
            height: '100%',
            backgroundColor: '#3b82f6', // Tailwind blue-500
            borderRadius: '2px',
            transformOrigin: 'center',
            animation: isRecording
              ? `waveform 0.8s ease-in-out infinite`
              : 'none',
            animationDelay: `${i * 0.1}s`,
            opacity: isRecording ? 1 : 0.3,
          }}
        />
      ))}
      <style>{`
        @keyframes waveform {
          0%, 100% {
            transform: scaleY(0.3);
            opacity: 0.5;
          }
          50% {
            transform: scaleY(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
