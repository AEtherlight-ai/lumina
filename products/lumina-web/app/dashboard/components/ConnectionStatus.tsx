/**
 * Connection Status Widget
 *
 * DESIGN DECISION: Show real-time connection status for all user devices
 * WHY: Users need visibility into which devices are currently connected
 *
 * REASONING CHAIN:
 * 1. Fetch initial device status on mount
 * 2. Subscribe to Supabase Realtime updates on devices table
 * 3. Show green dot for online devices (last_seen_at < 2 minutes)
 * 4. Show gray dot for offline devices
 * 5. Update UI in real-time when devices connect/disconnect
 *
 * PATTERN: Pattern-REALTIME-001 (Supabase Realtime subscriptions)
 * PATTERN: Pattern-UI-005 (Real-time status indicators)
 * RELATED: /api/devices/heartbeat, devices table
 */

'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface Device {
  id: string;
  device_name: string;
  last_seen_at: string | null;
  connection_status: 'online' | 'offline' | 'syncing';
  is_online: boolean;
}

interface ConnectionStatusProps {
  className?: string;
}

export default function ConnectionStatus({ className = '' }: ConnectionStatusProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Fetch initial device status
    const fetchDevices = async () => {
      try {
        const response = await fetch('/api/devices/heartbeat');
        if (!response.ok) {
          throw new Error('Failed to fetch device status');
        }
        const data = await response.json();
        setDevices(data.devices);
        setLoading(false);
      } catch (err) {
        console.error('Fetch devices error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    fetchDevices();

    // Subscribe to Realtime updates
    // DESIGN DECISION: Subscribe to all devices for current user
    // WHY: Supabase RLS policies ensure we only get updates for our own devices
    const channel = supabase
      .channel('devices-realtime')
      .on<Device>(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'devices',
        },
        (payload: RealtimePostgresChangesPayload<Device>) => {
          console.log('Realtime update:', payload);

          // DESIGN DECISION: Compute is_online client-side
          // WHY: last_seen_at might have just been updated, need fresh calculation
          const computeIsOnline = (device: Device): Device => {
            if (!device.last_seen_at) return { ...device, is_online: false };

            const now = new Date();
            const lastSeen = new Date(device.last_seen_at);
            const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
            const is_online = lastSeen > twoMinutesAgo && device.connection_status !== 'offline';

            return { ...device, is_online };
          };

          if (payload.eventType === 'INSERT') {
            // New device added
            const newDevice = computeIsOnline(payload.new as Device);
            setDevices((prev) => [...prev, newDevice]);
          } else if (payload.eventType === 'UPDATE') {
            // Device status updated (heartbeat received)
            const updatedDevice = computeIsOnline(payload.new as Device);
            setDevices((prev) =>
              prev.map((d) => (d.id === updatedDevice.id ? updatedDevice : d))
            );
          } else if (payload.eventType === 'DELETE') {
            // Device removed
            setDevices((prev) => prev.filter((d) => d.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Compute relative time (e.g., "2 minutes ago")
  const getRelativeTime = (timestamp: string | null): string => {
    if (!timestamp) return 'Never';

    const now = new Date();
    const lastSeen = new Date(timestamp);
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return (
      <div className={`rounded-lg border border-gray-700 bg-gray-800 p-4 ${className}`}>
        <h3 className="mb-3 text-sm font-semibold text-gray-300">Device Status</h3>
        <div className="flex items-center justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-lg border border-red-700 bg-red-900/20 p-4 ${className}`}>
        <h3 className="mb-2 text-sm font-semibold text-red-400">Connection Error</h3>
        <p className="text-sm text-red-300">{error}</p>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className={`rounded-lg border border-gray-700 bg-gray-800 p-4 ${className}`}>
        <h3 className="mb-3 text-sm font-semibold text-gray-300">Device Status</h3>
        <p className="text-sm text-gray-400">No devices connected</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-gray-700 bg-gray-800 p-4 ${className}`}>
      <h3 className="mb-3 text-sm font-semibold text-gray-300">Device Status</h3>
      <div className="space-y-2">
        {devices.map((device) => (
          <div
            key={device.id}
            className="flex items-center justify-between rounded-md bg-gray-700/50 p-3"
          >
            <div className="flex items-center gap-3">
              {/* Status indicator dot */}
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  device.is_online
                    ? device.connection_status === 'syncing'
                      ? 'bg-yellow-500 animate-pulse'
                      : 'bg-green-500'
                    : 'bg-gray-500'
                }`}
                title={device.is_online ? 'Online' : 'Offline'}
              ></div>

              {/* Device name */}
              <div>
                <div className="text-sm font-medium text-gray-200">
                  {device.device_name || 'Unnamed Device'}
                </div>
                <div className="text-xs text-gray-400">
                  Last seen: {getRelativeTime(device.last_seen_at)}
                </div>
              </div>
            </div>

            {/* Connection status badge */}
            <div
              className={`rounded-full px-2 py-1 text-xs font-medium ${
                device.is_online
                  ? device.connection_status === 'syncing'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-green-500/20 text-green-400'
                  : 'bg-gray-600/20 text-gray-400'
              }`}
            >
              {device.is_online
                ? device.connection_status === 'syncing'
                  ? 'Syncing'
                  : 'Online'
                : 'Offline'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
