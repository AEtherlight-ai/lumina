/**
 * Lumina Desktop - Main Application with Voice Capture, Settings, and Dashboard
 *
 * DESIGN DECISION: Three-mode interface - VoiceCapture (default), Settings, and Dashboard
 * WHY: Users primarily use voice capture, with analytics dashboard and settings when needed
 *
 * REASONING CHAIN:
 * 1. Default view = VoiceCapture with scrolling ticker bar during recording
 * 2. Settings button (gear icon) switches to settings UI
 * 3. Dashboard button (chart icon) switches to analytics dashboard
 * 4. Back button returns to voice capture
 * 5. Close button hides to system tray (prevent_close in main.rs)
 * 6. System tray menu has "Settings" to re-open and "Exit" to quit
 *
 * PATTERN: Pattern-UI-005 (Multi-Mode Desktop Application)
 * RELATED: VoiceCapture.tsx (voice UI), Dashboard.tsx (analytics), main.rs (system tray)
 * FUTURE: Add pattern library management view
 */

import './App.css';
import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { VoiceCapture } from './components/VoiceCapture';
import Dashboard from './components/Dashboard';
import InvitationPanel from './components/InvitationPanel';
import InstallationWizard from './components/InstallationWizard';

interface Settings {
  recording_hotkey: string | null;
  paste_hotkey: string | null;
  auto_paste: boolean;
  offline_mode: boolean;
  whisper_model: string;
  license_key: string;
}

function App() {
  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null);
  const [currentView, setCurrentView] = useState<'voice' | 'settings' | 'dashboard' | 'invitations'>('voice');
  const [settings, setSettings] = useState<Settings>({
    recording_hotkey: null,
    paste_hotkey: null,
    auto_paste: false,
    offline_mode: true,
    whisper_model: 'base.en',
    license_key: '',
  });

  const [activeTab, setActiveTab] = useState<'general' | 'hotkeys' | 'api'>('general');
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);
  const [isPasteHotkey, setIsPasteHotkey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Check if this is the first run
  useEffect(() => {
    invoke<boolean>('is_first_run')
      .then(setIsFirstRun)
      .catch((error) => {
        console.error('Failed to check first run:', error);
        setIsFirstRun(false); // Default to not first run on error
      });
  }, []);

  // Load settings on mount
  useEffect(() => {
    invoke<Settings>('get_settings').then(setSettings).catch(console.error);
  }, []);

  /**
   * DESIGN DECISION: Always treat save_settings as successful if no exception thrown
   * WHY: Rust backend returns Ok(()) even with warnings (mouse button hotkeys)
   *
   * REASONING CHAIN:
   * 1. User saves settings (including mouse buttons)
   * 2. Rust backend saves to settings.json successfully
   * 3. Rust backend logs warning about mouse buttons not supported
   * 4. Rust backend returns Ok(()) to frontend (not an error)
   * 5. Frontend should show "Saved" not "Error"
   * 6. User sees success message, understands from logs that mouse buttons need keyboard fallback
   */
  const saveSettings = async () => {
    setSaveStatus('saving');
    try {
      await invoke('save_settings', { settings });
      // Success: settings saved to disk even if backend logged warnings
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      // Only show error if invoke() actually threw an exception
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  /**
   * DESIGN DECISION: Use fullscreen modal overlay for hotkey recording
   * WHY: Need to completely block all UI interactions while recording hotkey
   *
   * REASONING CHAIN:
   * 1. Show fullscreen modal overlay (blocks all clicks)
   * 2. Display "Press any key or mouse button..." message
   * 3. Attach listeners to modal div with tabIndex for keyboard focus
   * 4. Capture the input and immediately close modal
   * 5. This prevents recording from interfering with button clicks
   */
  const modalRef = useRef<HTMLDivElement>(null);

  const recordHotkey = (type: 'recording' | 'paste') => {
    if (type === 'recording') {
      setIsRecordingHotkey(true);
    } else {
      setIsPasteHotkey(true);
    }
  };

  const cancelRecording = () => {
    setIsRecordingHotkey(false);
    setIsPasteHotkey(false);
  };

  // Focus modal when it appears
  useEffect(() => {
    if ((isRecordingHotkey || isPasteHotkey) && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isRecordingHotkey, isPasteHotkey]);

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      cancelRecording();
      return;
    }

    // Ignore modifier-only key presses (Ctrl, Shift, Alt, Meta by themselves)
    const modifierKeys = ['Control', 'Shift', 'Alt', 'Meta', 'Command'];
    if (modifierKeys.includes(e.key)) {
      return; // Wait for user to press a real key
    }

    const modifiers = [];
    if (e.ctrlKey || e.metaKey) modifiers.push('CommandOrControl');
    if (e.shiftKey) modifiers.push('Shift');
    if (e.altKey) modifiers.push('Alt');

    const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    const hotkey = modifiers.length > 0 ? `${modifiers.join('+')}+${key}` : key;

    if (isRecordingHotkey) {
      setSettings(prev => ({ ...prev, recording_hotkey: hotkey }));
      setIsRecordingHotkey(false);
    } else if (isPasteHotkey) {
      setSettings(prev => ({ ...prev, paste_hotkey: hotkey }));
      setIsPasteHotkey(false);
    }
  };

  const handleModalMouseClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const modifiers = [];
    if (e.ctrlKey || e.metaKey) modifiers.push('CommandOrControl');
    if (e.shiftKey) modifiers.push('Shift');
    if (e.altKey) modifiers.push('Alt');

    const mouseButtonNames = [
      'LeftClick',
      'MiddleClick',
      'RightClick',
      'Mouse3',
      'Mouse4',
      'Mouse5',
    ];

    const buttonName = mouseButtonNames[e.button] || `Mouse${e.button}`;
    const hotkey = modifiers.length > 0 ? `${modifiers.join('+')}+${buttonName}` : buttonName;

    if (isRecordingHotkey) {
      setSettings(prev => ({ ...prev, recording_hotkey: hotkey }));
      setIsRecordingHotkey(false);
    } else if (isPasteHotkey) {
      setSettings(prev => ({ ...prev, paste_hotkey: hotkey }));
      setIsPasteHotkey(false);
    }
  };

  // Show loading state while checking first run
  if (isFirstRun === null) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚀</div>
          <p style={{ fontSize: '18px', margin: 0 }}>Loading Lumina...</p>
        </div>
      </div>
    );
  }

  // Show installation wizard on first run
  if (isFirstRun) {
    return (
      <InstallationWizard
        onComplete={() => {
          setIsFirstRun(false);
          // Reload settings after installation
          invoke<Settings>('get_settings').then(setSettings).catch(console.error);
        }}
      />
    );
  }

  // Show VoiceCapture by default, Dashboard and Settings when requested
  if (currentView === 'voice') {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
        <VoiceCapture />

        {/* Floating Action Buttons */}
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          display: 'flex',
          gap: '12px',
        }}>
          {/* Invitations Button (P3-012) */}
          <button
            onClick={() => setCurrentView('invitations')}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(99, 102, 241, 0.9)',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Viral Invitations"
          >
            🚀
          </button>

          {/* Dashboard Button */}
          <button
            onClick={() => setCurrentView('dashboard')}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(16, 185, 129, 0.9)',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Analytics Dashboard"
          >
            📊
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setCurrentView('settings')}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(102, 126, 234, 0.9)',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Settings"
          >
            ⚙️
          </button>
        </div>
      </div>
    );
  }

  // Dashboard View
  if (currentView === 'dashboard') {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Dashboard Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
        }}>
          <Dashboard />
        </div>

        {/* Back Button */}
        <button
          onClick={() => setCurrentView('voice')}
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            padding: '12px 24px',
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            backdropFilter: 'blur(10px)',
          }}
        >
          ← Back to Voice Capture
        </button>
      </div>
    );
  }

  // Invitations View (P3-012)
  if (currentView === 'invitations') {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Invitations Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
        }}>
          <InvitationPanel currentTier="pro" />
        </div>

        {/* Back Button */}
        <button
          onClick={() => setCurrentView('voice')}
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            padding: '12px 24px',
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            backdropFilter: 'blur(10px)',
          }}
        >
          ← Back to Voice Capture
        </button>
      </div>
    );
  }

  // Settings View
  return (
    <>
      <div style={{
        width: '100%',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {/* Header with Back Button */}
        <div style={{
          padding: '24px 32px',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <button
            onClick={() => setCurrentView('voice')}
            style={{
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            ← Back
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: 600 }}>
              Lumina Settings
            </h1>
            <p style={{ margin: '8px 0 0 0', color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
              Voice-to-Intelligence Platform
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '4px',
          padding: '16px 32px',
          background: 'rgba(255, 255, 255, 0.05)'
        }}>
          {(['general', 'hotkeys', 'api'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 24px',
                background: activeTab === tab ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          padding: '20px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            maxWidth: '600px',
            width: '100%',
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            {activeTab === 'general' && (
              <div>
                <h2 style={{ marginTop: 0, color: '#1f2937' }}>General Settings</h2>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.offline_mode}
                      onChange={(e) => setSettings({ ...settings, offline_mode: e.target.checked })}
                      style={{ width: '20px', height: '20px' }}
                    />
                    <span style={{ color: '#374151', fontSize: '15px' }}>
                      <strong>Offline Mode</strong> (Local transcription with Whisper.cpp)
                    </span>
                  </label>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.auto_paste}
                      onChange={(e) => setSettings({ ...settings, auto_paste: e.target.checked })}
                      style={{ width: '20px', height: '20px' }}
                    />
                    <span style={{ color: '#374151', fontSize: '15px' }}>
                      <strong>Auto-paste after transcription</strong>
                    </span>
                  </label>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: 500 }}>
                    Whisper Model
                  </label>
                  <select
                    value={settings.whisper_model}
                    onChange={(e) => setSettings({ ...settings, whisper_model: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="tiny.en">Tiny (Fastest, least accurate)</option>
                    <option value="base.en">Base (Recommended)</option>
                    <option value="small.en">Small (Slower, more accurate)</option>
                    <option value="medium.en">Medium (Slow, very accurate)</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'hotkeys' && (
              <div>
                <h2 style={{ marginTop: 0, color: '#1f2937' }}>Hotkey Configuration</h2>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>
                  Click "+" to set a hotkey, then press any keyboard key combination
                </p>
                <p style={{ color: '#f59e0b', fontSize: '12px', marginBottom: '24px', fontWeight: 500 }}>
                  ⚠️ Mouse button hotkeys not yet supported. Use keyboard keys (e.g., Ctrl+Shift+R). Built-in: ` (open panel), ~ (transcribe inline).
                </p>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: 500 }}>
                    Recording Hotkey
                  </label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input
                      type="text"
                      value={settings.recording_hotkey || 'Not set'}
                      readOnly
                      style={{
                        flex: 1,
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: '#f9fafb'
                      }}
                    />
                    <button
                      onClick={() => recordHotkey('recording')}
                      style={{
                        padding: '12px 24px',
                        background: isRecordingHotkey ? '#ef4444' : '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '18px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        minWidth: '60px'
                      }}
                    >
                      {isRecordingHotkey ? '⏺' : '+'}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: 500 }}>
                    Paste Hotkey
                  </label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input
                      type="text"
                      value={settings.paste_hotkey || 'Not set'}
                      readOnly
                      style={{
                        flex: 1,
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: '#f9fafb'
                      }}
                    />
                    <button
                      onClick={() => recordHotkey('paste')}
                      style={{
                        padding: '12px 24px',
                        background: isPasteHotkey ? '#ef4444' : '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '18px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        minWidth: '60px'
                      }}
                    >
                      {isPasteHotkey ? '⏺' : '+'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'api' && (
              <div>
                <h2 style={{ marginTop: 0, color: '#1f2937' }}>API Configuration</h2>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: 500 }}>
                    License Key
                  </label>
                  <input
                    type="password"
                    value={settings.license_key}
                    onChange={(e) => setSettings({ ...settings, license_key: e.target.value })}
                    placeholder="Enter your license key"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                  <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '8px' }}>
                    Get your license key from{' '}
                    <a
                      href="https://aetherlight.ai/dashboard/download"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#3b82f6', textDecoration: 'none' }}
                    >
                      aetherlight.ai/dashboard/download
                    </a>
                  </p>
                </div>
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={saveSettings}
              disabled={saveStatus === 'saving'}
              style={{
                width: '100%',
                padding: '14px',
                background: saveStatus === 'saved' ? '#10b981' : saveStatus === 'error' ? '#ef4444' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
                marginTop: '24px',
                transition: 'all 0.2s'
              }}
            >
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'saved' && '✓ Saved!'}
              {saveStatus === 'error' && '✗ Error saving'}
              {saveStatus === 'idle' && 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Hotkey Recording Modal */}
      {(isRecordingHotkey || isPasteHotkey) && (
        <div
          ref={modalRef}
          tabIndex={0}
          onKeyDown={handleModalKeyDown}
          onMouseDown={handleModalMouseClick}
          onMouseUp={handleModalMouseClick}
          onAuxClick={handleModalMouseClick}
          onClick={handleModalMouseClick}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'crosshair'
          }}
        >
          <div style={{
            background: 'white',
            padding: '48px',
            borderRadius: '16px',
            textAlign: 'center',
            maxWidth: '500px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
          }}>
            <h2 style={{ margin: '0 0 16px 0', color: '#1f2937', fontSize: '24px' }}>
              Recording {isRecordingHotkey ? 'Recording' : 'Paste'} Hotkey
            </h2>
            <p style={{ margin: '0 0 24px 0', color: '#6b7280', fontSize: '16px' }}>
              Press any key or click any mouse button
            </p>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: '14px' }}>
              (Press ESC to cancel)
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
