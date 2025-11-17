/**
 * React hook for license activation state management (BUG-005)
 *
 * DESIGN DECISION: Separate hook for activation logic
 * WHY: Keeps App.tsx clean, logic is testable, reusable if needed elsewhere
 *
 * REASONING CHAIN:
 * 1. Hook checks if license_key is empty on mount
 * 2. If empty → showDialog = true
 * 3. User enters key → handleActivate() calls backend
 * 4. On success → showDialog = false, onSuccess callback
 * 5. On error → error state set, dialog stays open
 * 6. Backend can also emit 'show-license-activation' event (401/403 errors from BUG-004)
 *
 * Event Integration (BUG-004):
 * - Backend emits 'show-license-activation' when API returns 401 (Unauthorized)
 * - Backend emits 'show-device-activation' when API returns 403 (Forbidden)
 * - Hook listens for these events and shows dialog for re-activation
 *
 * PATTERN: Pattern-UI-006 (React Hooks for State Management)
 * RELATED: LicenseActivationDialog.tsx (UI component), auth.rs (backend validation), main.rs (event emission)
 */

import { useState, useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';

interface UseLicenseActivationOptions {
  licenseKey: string;
}

interface UseLicenseActivationReturn {
  showDialog: boolean;
  handleActivate: () => Promise<void>;
  handleClose: () => void;
}

export function useLicenseActivation(
  options: UseLicenseActivationOptions
): UseLicenseActivationReturn {
  const { licenseKey } = options;
  const [showDialog, setShowDialog] = useState(false);
  const [hasActivated, setHasActivated] = useState(false);

  // Check if license_key is empty on mount
  useEffect(() => {
    if (!licenseKey || licenseKey.trim() === '') {
      console.log('[useLicenseActivation] License key is empty, showing activation dialog');
      setShowDialog(true);
    }
  }, [licenseKey]);

  // Listen for backend 'show-license-activation' event (emitted on 401 errors from BUG-004)
  useEffect(() => {
    const unlistenPromise = listen('show-license-activation', (event) => {
      console.log('[useLicenseActivation] Backend requested license activation:', event);
      setShowDialog(true);
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // Listen for backend 'show-device-activation' event (emitted on 403 errors from BUG-004)
  useEffect(() => {
    const unlistenPromise = listen('show-device-activation', (event) => {
      console.log('[useLicenseActivation] Backend requested device activation (403):', event);
      setShowDialog(true);
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // Handle license activation (called by LicenseActivationDialog onActivated callback)
  const handleActivate = useCallback(async () => {
    console.log('[useLicenseActivation] License activated successfully');
    setHasActivated(true);
    setShowDialog(false); // Close dialog on success

    // Wait a bit to ensure settings file is fully written to disk before reload
    // This prevents the activation dialog from reappearing due to race condition
    console.log('[useLicenseActivation] Waiting for settings to persist...');
    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay

    // Reload page to refresh settings (license_key, user_id, device_id, tier)
    console.log('[useLicenseActivation] Reloading page to refresh settings');
    window.location.reload();
  }, []);

  // Handle dialog close (only allowed if already activated)
  const handleClose = useCallback(() => {
    if (hasActivated) {
      setShowDialog(false);
    } else {
      // Can't close without activation
      console.log('[useLicenseActivation] Cannot close dialog without activating license');
    }
  }, [hasActivated]);

  return {
    showDialog,
    handleActivate,
    handleClose,
  };
}
