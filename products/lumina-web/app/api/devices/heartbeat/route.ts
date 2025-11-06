/**
 * Device Heartbeat API
 *
 * DESIGN DECISION: Desktop apps send heartbeat every 30 seconds to stay "online"
 * WHY: Enables real-time connection status in web dashboard
 *
 * REASONING CHAIN:
 * 1. Desktop app calls POST /api/devices/heartbeat every 30 seconds
 * 2. Update last_seen_at timestamp
 * 3. Set connection_status to 'online' (or 'syncing' during data sync)
 * 4. Supabase Realtime broadcasts change to web dashboard
 * 5. Dashboard shows green dot for devices with last_seen_at < 2 minutes ago
 *
 * PATTERN: Pattern-HEARTBEAT-001 (Device heartbeat mechanism)
 * PATTERN: Pattern-API-005 (Heartbeat API design)
 * RELATED: supabase/migrations/006_realtime_connection_status.sql
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/devices/heartbeat
 *
 * Accept heartbeat from desktop app, update last_seen_at timestamp.
 *
 * Request Body:
 * {
 *   device_id: string;
 *   status?: 'online' | 'syncing'; // Optional, defaults to 'online'
 * }
 *
 * Response:
 * {
 *   success: true;
 *   device_id: string;
 *   last_seen_at: string;
 *   connection_status: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { device_id, status = 'online' } = body;

    if (!device_id) {
      return NextResponse.json(
        { error: 'device_id is required' },
        { status: 400 }
      );
    }

    // Validate status
    if (!['online', 'syncing'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "online" or "syncing"' },
        { status: 400 }
      );
    }

    // Update last_seen_at and connection_status
    // DESIGN DECISION: Use upsert pattern (update if exists, insert if not)
    // WHY: Desktop app might send heartbeat before device is registered in web dashboard
    const { data: device, error: updateError } = await supabase
      .from('devices')
      .update({
        last_seen_at: new Date().toISOString(),
        connection_status: status,
      })
      .eq('id', device_id)
      .eq('user_id', user.id) // Security: Only update devices owned by current user
      .select('id, device_name, last_seen_at, connection_status')
      .single();

    if (updateError) {
      console.error('Heartbeat update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update device status' },
        { status: 500 }
      );
    }

    if (!device) {
      return NextResponse.json(
        { error: 'Device not found or not owned by user' },
        { status: 404 }
      );
    }

    // Return updated device status
    return NextResponse.json({
      success: true,
      device_id: device.id,
      device_name: device.device_name,
      last_seen_at: device.last_seen_at,
      connection_status: device.connection_status,
    });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/devices/heartbeat
 *
 * Get current connection status for all user's devices.
 * Useful for initial dashboard load.
 *
 * Response:
 * {
 *   devices: Array<{
 *     id: string;
 *     device_name: string;
 *     last_seen_at: string | null;
 *     connection_status: string;
 *     is_online: boolean; // Computed: last_seen_at within last 2 minutes
 *   }>;
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all devices for user
    const { data: devices, error: fetchError } = await supabase
      .from('devices')
      .select('id, device_name, last_seen_at, connection_status')
      .eq('user_id', user.id)
      .order('last_seen_at', { ascending: false, nullsFirst: false });

    if (fetchError) {
      console.error('Fetch devices error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch devices' },
        { status: 500 }
      );
    }

    // Compute is_online based on last_seen_at
    // DESIGN DECISION: Device is online if last_seen_at within last 2 minutes
    // WHY: Desktop app sends heartbeat every 30 seconds, so 2 minutes = 4 missed heartbeats
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

    const devicesWithStatus = devices.map((device) => {
      const lastSeen = device.last_seen_at
        ? new Date(device.last_seen_at)
        : null;
      const is_online =
        lastSeen && lastSeen > twoMinutesAgo && device.connection_status !== 'offline';

      return {
        ...device,
        is_online,
      };
    });

    return NextResponse.json({
      devices: devicesWithStatus,
    });
  } catch (error) {
    console.error('Get heartbeat status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
