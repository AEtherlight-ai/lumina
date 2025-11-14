/**
 * Error Dialog Component (BUG-004)
 *
 * DESIGN DECISION: Reusable error dialog with action buttons for specific error types
 * WHY: Each API error type (401/402/403/500) needs specific user actions and guidance
 *
 * REASONING CHAIN:
 * 1. Backend detects API error (401/402/403/500) → Emits frontend event
 * 2. Frontend listens for events → Shows ErrorDialog with appropriate error type
 * 3. User reads error message → Clicks action button (re-activate, upgrade, retry)
 * 4. Dialog triggers callback → Parent component handles action
 * 5. User resolves issue → Dialog closes, app continues
 *
 * Error Type Mapping:
 * - unauthorized (401): License invalid/revoked → "Re-activate License" button
 * - payment-required (402): Insufficient tokens → "Upgrade or Purchase Tokens" + balance display
 * - forbidden (403): Device not active → "Activate Device" button
 * - server-error (500): Temporary server issue → "Retry" button
 * - network-error: Connection failed → "Retry" button
 *
 * UX Design:
 * - Dark theme (#1e1e1e background) matches desktop app aesthetic
 * - Red title (#ef4444) for error visibility
 * - Token balance display for 402 errors (user knows exact shortfall)
 * - Primary action button (blue) + secondary close button (gray)
 * - Modal overlay prevents interaction until error resolved
 *
 * PATTERN: Pattern-UI-009 (Error Dialog with Action Buttons)
 * RELATED: main.rs (event emission), App.tsx (event listeners - BUG-005)
 */

import React from 'react';

interface ErrorDialogProps {
  errorType: 'unauthorized' | 'payment-required' | 'forbidden' | 'server-error' | 'network-error';
  message: string;
  tokenBalance?: number;
  tokensRequired?: number;
  onAction: () => void;
  onClose: () => void;
}

export const ErrorDialog: React.FC<ErrorDialogProps> = ({
  errorType,
  message,
  tokenBalance,
  tokensRequired,
  onAction,
  onClose,
}) => {
  const getTitle = () => {
    switch (errorType) {
      case 'unauthorized':
        return 'License Invalid';
      case 'payment-required':
        return 'Insufficient Tokens';
      case 'forbidden':
        return 'Device Not Active';
      case 'server-error':
        return 'Server Error';
      case 'network-error':
        return 'Network Error';
    }
  };

  const getActionText = () => {
    switch (errorType) {
      case 'unauthorized':
        return 'Re-activate License';
      case 'payment-required':
        return 'Upgrade or Purchase Tokens';
      case 'forbidden':
        return 'Activate Device';
      case 'server-error':
      case 'network-error':
        return 'Retry';
    }
  };

  const getIcon = () => {
    switch (errorType) {
      case 'unauthorized':
        return '🔐';
      case 'payment-required':
        return '💳';
      case 'forbidden':
        return '🚫';
      case 'server-error':
        return '⚠️';
      case 'network-error':
        return '📡';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
    }}>
      <div style={{
        backgroundColor: '#1e1e1e',
        padding: '28px',
        borderRadius: '12px',
        maxWidth: '450px',
        width: '90%',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
        }}>
          <span style={{ fontSize: '32px' }}>{getIcon()}</span>
          <h2 style={{
            margin: 0,
            color: '#ef4444',
            fontSize: '22px',
            fontWeight: 600,
          }}>
            {getTitle()}
          </h2>
        </div>

        {/* Error Message */}
        <p style={{
          margin: '0 0 20px 0',
          color: '#d1d5db',
          fontSize: '15px',
          lineHeight: '1.6',
        }}>
          {message}
        </p>

        {/* Token Balance Display (for payment-required errors) */}
        {errorType === 'payment-required' && tokenBalance !== undefined && tokensRequired !== undefined && (
          <div style={{
            padding: '16px',
            backgroundColor: '#2a2a2a',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #444',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}>
              <span style={{ color: '#9ca3af', fontSize: '14px' }}>Current balance:</span>
              <span style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600 }}>
                {tokenBalance} tokens
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}>
              <span style={{ color: '#9ca3af', fontSize: '14px' }}>Required:</span>
              <span style={{ color: '#ef4444', fontSize: '16px', fontWeight: 600 }}>
                {tokensRequired} tokens
              </span>
            </div>
            <div style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #444',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ color: '#9ca3af', fontSize: '14px' }}>Shortfall:</span>
              <span style={{ color: '#fbbf24', fontSize: '18px', fontWeight: 700 }}>
                {Math.max(0, tokensRequired - tokenBalance)} tokens
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onAction}
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: '15px',
              fontWeight: 600,
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            {getActionText()}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              fontSize: '15px',
              fontWeight: 600,
              backgroundColor: '#444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#555'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#444'}
          >
            Close
          </button>
        </div>

        {/* Help Text */}
        {errorType === 'network-error' && (
          <p style={{
            marginTop: '16px',
            marginBottom: 0,
            padding: '12px',
            backgroundColor: '#2a2a2a',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#9ca3af',
            lineHeight: '1.5',
          }}>
            <strong style={{ color: '#ffffff' }}>Troubleshooting:</strong><br />
            • Check your internet connection<br />
            • Verify firewall settings allow desktop app<br />
            • Try again in a few moments
          </p>
        )}
      </div>
    </div>
  );
};
