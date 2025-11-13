/**
 * License Activation Dialog Component (BUG-002)
 *
 * DESIGN DECISION: Blocking modal dialog for first-time license activation
 * WHY: Users must activate device before using voice capture functionality
 *
 * REASONING CHAIN:
 * 1. App launches → checks if license_key exists in settings
 * 2. If empty → Show this dialog (blocking - can't dismiss without activation)
 * 3. User enters license key from dashboard (https://aetherlight.ai/dashboard)
 * 4. User clicks "Activate Device" → calls activate_license() Tauri command
 * 5. On success (200 OK) → Dialog closes, app continues to main interface
 * 6. On error (400/403/404/500) → Show error message with retry button
 *
 * Error Handling:
 * - 400: Invalid request → "Check license key format (XXXX-XXXX-XXXX-XXXX)"
 * - 404: Invalid license key → "Key not found - check dashboard"
 * - 403: Already activated → "Deactivate other device first"
 * - 500: Server error → "Try again later or contact support"
 * - Network error → "Check internet connection"
 *
 * UX Design:
 * - Dark theme (#1e1e1e background) matches desktop app aesthetic
 * - Large, clear input field with placeholder "XXXX-XXXX-XXXX-XXXX"
 * - Error messages in red (#ef4444) with icon
 * - Loading state during activation ("Activating..." with disabled button)
 * - Help text with link to dashboard
 * - Auto-focus on input field for quick entry
 * - Enter key submits form
 *
 * PATTERN: Pattern-UI-008 (Blocking Activation Dialog)
 * RELATED: auth.rs (backend validation), App.tsx (first-launch check)
 */

import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

interface LicenseActivationDialogProps {
  onActivated: () => void;  // Callback when activation succeeds
}

export const LicenseActivationDialog: React.FC<LicenseActivationDialogProps> = ({ onActivated }) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  const handleActivate = async () => {
    // Validate input
    if (!licenseKey.trim()) {
      setError('Please enter a license key');
      return;
    }

    setIsActivating(true);
    setError(null);

    try {
      // Call backend Tauri command
      const result = await invoke<string>('activate_license', {
        licenseKey: licenseKey.trim()
      });

      console.log('✅ Activation successful:', result);

      // Show success message briefly before closing
      alert(result);

      // Call parent callback to reload app
      onActivated();
    } catch (err) {
      console.error('❌ Activation failed:', err);
      setError(`${err}`);
    } finally {
      setIsActivating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isActivating) {
      handleActivate();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 9999,
    }}>
      <div style={{
        backgroundColor: '#1e1e1e',
        padding: '32px',
        borderRadius: '12px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}>
        {/* Header */}
        <h2 style={{
          margin: '0 0 8px 0',
          color: '#ffffff',
          fontSize: '24px',
          fontWeight: 600,
        }}>
          Activate ÆtherLight Desktop
        </h2>
        <p style={{
          margin: '0 0 24px 0',
          color: '#b0b0b0',
          fontSize: '14px',
          lineHeight: '1.5',
        }}>
          Enter your license key from the dashboard to activate voice capture
        </p>

        {/* License Key Input */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '14px',
          }}>
            License Key
          </label>
          <input
            type="text"
            placeholder="XXXX-XXXX-XXXX-XXXX"
            value={licenseKey}
            onChange={(e) => {
              setLicenseKey(e.target.value);
              setError(null);  // Clear error on input change
            }}
            onKeyPress={handleKeyPress}
            disabled={isActivating}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: error ? '2px solid #ef4444' : '1px solid #444',
              borderRadius: '8px',
              backgroundColor: '#2a2a2a',
              color: '#ffffff',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'monospace',  // Better for license key format
            }}
            autoFocus
          />
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: '#ef444410',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            color: '#ef4444',
            fontSize: '14px',
            lineHeight: '1.5',
          }}>
            ❌ {error}
          </div>
        )}

        {/* Activate Button */}
        <button
          onClick={handleActivate}
          disabled={isActivating || !licenseKey.trim()}
          style={{
            width: '100%',
            padding: '14px',
            fontSize: '16px',
            fontWeight: 600,
            border: 'none',
            borderRadius: '8px',
            backgroundColor: isActivating || !licenseKey.trim() ? '#444' : '#3b82f6',
            color: '#ffffff',
            cursor: isActivating || !licenseKey.trim() ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {isActivating ? 'Activating...' : 'Activate Device'}
        </button>

        {/* Help Section */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: '#2a2a2a',
          borderRadius: '8px'
        }}>
          <p style={{
            margin: '0 0 8px 0',
            color: '#b0b0b0',
            fontSize: '13px',
            lineHeight: '1.5',
          }}>
            <strong style={{ color: '#ffffff' }}>Don't have a license key?</strong>
          </p>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: '#b0b0b0',
            lineHeight: '1.5',
          }}>
            Sign in to your dashboard at{' '}
            <a
              href="https://aetherlight.ai/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#3b82f6',
                textDecoration: 'none',
              }}
            >
              aetherlight.ai/dashboard
            </a>
            {' '}to get your free or pro license key.
          </p>
        </div>

        {/* Error Codes Reference (only shown in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#2a2a2a',
            borderRadius: '8px',
            fontSize: '11px',
            color: '#888',
          }}>
            <strong>Dev Mode - Error Codes:</strong><br />
            • 404: Invalid license key (not in database)<br />
            • 403: Already activated on another device<br />
            • 400: Invalid request format<br />
            • 500: Server error
          </div>
        )}
      </div>
    </div>
  );
};
