/**
 * Quick Send Menu Component
 *
 * DESIGN DECISION: Copy enhanced prompts to clipboard + open AI tools
 * WHY: Users want to immediately send transcription to their preferred AI tool
 *
 * REASONING CHAIN:
 * 1. User captures voice → transcription complete
 * 2. User wants to send to ChatGPT/Claude/Cursor with context
 * 3. Enhanced prompt includes transcription + pattern context (future)
 * 4. Copy to clipboard + open URL = minimal friction
 * 5. User can customize prompt template (future: settings)
 *
 * PATTERN: Pattern-UI-003 (Quick Send to AI Tools)
 * RELATED: VoiceCapture.tsx, useVoiceCapture.ts
 * FUTURE: Pattern matching integration, custom prompt templates, keyboard shortcuts
 */

/**
 * DESIGN DECISION: PatternMatch interface for future integration
 * WHY: Phase 1 implemented pattern matching (Rust core), Phase 2 adds voice capture
 * NOTE: Currently using placeholder - full integration in Phase 3
 */
interface PatternMatch {
  confidence: number;
  pattern: {
    id: string;
    name: string;
    chainOfThought: {
      designDecision: string;
      why: string;
      reasoningChain: string[];
    };
  };
}

interface QuickSendMenuProps {
  transcription: string;
  confidence?: number;
  matches?: PatternMatch[]; // Optional for now, will be populated when pattern matching integrated
  onClose?: () => void;
}

/**
 * DESIGN DECISION: buildEnhancedPrompt with or without pattern context
 * WHY: Works with transcription-only now, ready for pattern integration later
 *
 * REASONING CHAIN:
 * 1. If pattern matches exist → include full Chain of Thought context
 * 2. If no matches → send transcription with basic context
 * 3. Pattern context helps AI understand user intent (40% better responses per Pattern-027)
 * 4. Future: Customizable template (user preferences)
 */
function buildEnhancedPrompt(
  transcription: string,
  confidence?: number,
  match?: PatternMatch
): string {
  if (match) {
    // Pattern match available - include full context
    return `
User request: ${transcription}

Matched pattern (${(match.confidence * 100).toFixed(0)}% confidence):
${match.pattern.chainOfThought.designDecision}

Reasoning:
${match.pattern.chainOfThought.why}

Implementation steps:
${match.pattern.chainOfThought.reasoningChain.map((step, i) => `${i + 1}. ${step}`).join('\n')}

Please implement this following the pattern above, with tests and Chain of Thought documentation.
    `.trim();
  } else {
    // No pattern match - basic enhanced prompt
    const confidenceText =
      confidence !== undefined
        ? ` (${(confidence * 100).toFixed(0)}% transcription confidence)`
        : '';
    return `
User request: ${transcription}${confidenceText}

Please implement this with:
- Clean, maintainable code
- Unit tests for core functionality
- Chain of Thought documentation (design decisions and reasoning)
- Error handling

Ask clarifying questions if the requirement is ambiguous.
    `.trim();
  }
}

/**
 * DESIGN DECISION: Separate buttons for ChatGPT, Claude, Cursor
 * WHY: Users have preferences, want to send to specific tool quickly
 *
 * FUTURE: Settings to customize URLs, add more tools (Copilot, Cody, etc.)
 */
export function QuickSendMenu({
  transcription,
  confidence,
  matches,
  onClose,
}: QuickSendMenuProps) {
  const bestMatch = matches && matches.length > 0 ? matches[0] : undefined;

  /**
   * DESIGN DECISION: Copy to clipboard THEN open URL
   * WHY: User pastes with Ctrl+V when AI tool opens (instant workflow)
   */
  const sendToTool = (url: string) => {
    const enhancedPrompt = buildEnhancedPrompt(
      transcription,
      confidence,
      bestMatch
    );

    // Copy to clipboard
    navigator.clipboard
      .writeText(enhancedPrompt)
      .then(() => {
        console.log('Enhanced prompt copied to clipboard');
        // Open AI tool in default browser
        window.open(url, '_blank');
        // Close menu after successful action
        if (onClose) {
          setTimeout(onClose, 500); // Delay to let user see the action
        }
      })
      .catch((err) => {
        console.error('Failed to copy to clipboard:', err);
        alert('Failed to copy prompt. Please check clipboard permissions.');
      });
  };

  const sendToChatGPT = () => sendToTool('https://chat.openai.com');
  const sendToClaude = () => sendToTool('https://claude.ai');
  const sendToCursor = () => sendToTool('https://cursor.sh'); // Opens Cursor website, user can paste into app

  /**
   * DESIGN DECISION: Visual button styling with icons
   * WHY: Recognizable brand colors help users identify tools quickly
   */
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '16px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        minWidth: '200px',
      }}
    >
      <h3
        style={{
          margin: '0 0 8px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#374151',
        }}
      >
        Quick Send to AI
      </h3>

      <button
        onClick={sendToChatGPT}
        style={{
          padding: '10px 16px',
          backgroundColor: '#10a37f', // ChatGPT green
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = '#0d8c6d')
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = '#10a37f')
        }
      >
        📋 Send to ChatGPT
      </button>

      <button
        onClick={sendToClaude}
        style={{
          padding: '10px 16px',
          backgroundColor: '#d97706', // Claude orange
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = '#b45309')
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = '#d97706')
        }
      >
        📋 Send to Claude
      </button>

      <button
        onClick={sendToCursor}
        style={{
          padding: '10px 16px',
          backgroundColor: '#6366f1', // Cursor purple
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = '#4f46e5')
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = '#6366f1')
        }
      >
        📋 Send to Cursor
      </button>

      {bestMatch && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#6b7280',
          }}
        >
          🎯 Pattern match: {(bestMatch.confidence * 100).toFixed(0)}%
          confidence
        </div>
      )}

      {!bestMatch && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: '#fef3c7',
            borderRadius: '4px',
            fontSize: '11px',
            color: '#92400e',
          }}
        >
          ℹ️ Pattern matching coming in Phase 3
        </div>
      )}
    </div>
  );
}
