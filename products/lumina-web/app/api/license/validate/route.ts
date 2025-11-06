/**
 * DESIGN DECISION: License validation endpoint for desktop app activation
 * WHY: Desktop apps need to validate license keys on first launch and store user context
 *
 * REASONING CHAIN:
 * 1. Desktop app prompts user for license key on first launch
 * 2. User pastes license key from web dashboard
 * 3. Desktop app generates device fingerprint (OS + CPU + MAC address hash)
 * 4. POST request to this endpoint with license_key + device_fingerprint
 * 5. Backend validates license not already activated
 * 6. Update device record (status='active', device_fingerprint, activated_at)
 * 7. Return user profile + tier info
 * 8. Desktop app stores user_id + tier locally for offline use
 *
 * PATTERN: Pattern-LICENSE-002 (License Validation and Activation)
 * RELATED: app/dashboard/download, desktop settings, devices table
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { license_key, device_fingerprint, device_name, os_info } = body;

    // Validate required fields
    if (!license_key || !device_fingerprint) {
      return NextResponse.json(
        { error: 'Missing required fields: license_key, device_fingerprint' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Find device by license key
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('*, profiles!inner(id, full_name, subscription_tier, storage_limit_mb, storage_bonus_mb)')
      .eq('license_key', license_key)
      .single();

    if (deviceError || !device) {
      return NextResponse.json(
        { error: 'Invalid license key' },
        { status: 404 }
      );
    }

    // Check if already activated
    if (device.is_active && device.device_fingerprint) {
      // Check if same device (re-activation after reinstall)
      if (device.device_fingerprint === device_fingerprint) {
        // Allow re-activation on same device
        return NextResponse.json({
          valid: true,
          user_id: device.user_id,
          device_id: device.id,
          tier: device.profiles.subscription_tier,
          storage_limit_mb: device.profiles.storage_limit_mb,
          storage_bonus_mb: device.profiles.storage_bonus_mb,
          user_name: device.profiles.full_name,
          message: 'Device re-activated successfully',
        });
      } else {
        // Different device trying to use same license
        return NextResponse.json(
          { error: 'License already activated on another device' },
          { status: 403 }
        );
      }
    }

    // Activate device
    const { error: updateError } = await supabase
      .from('devices')
      .update({
        is_active: true,
        device_fingerprint: device_fingerprint,
        activated_at: new Date().toISOString(),
        device_name: device_name || device.device_name,
        last_seen_at: new Date().toISOString(),
        // Update OS info if provided
        ...(os_info && { device_type: os_info.platform || device.device_type }),
      })
      .eq('id', device.id);

    if (updateError) {
      console.error('Device activation error:', updateError);
      return NextResponse.json(
        { error: 'Failed to activate device' },
        { status: 500 }
      );
    }

    // Return success with user context
    return NextResponse.json({
      valid: true,
      user_id: device.user_id,
      device_id: device.id,
      tier: device.profiles.subscription_tier,
      storage_limit_mb: device.profiles.storage_limit_mb,
      storage_bonus_mb: device.profiles.storage_bonus_mb,
      user_name: device.profiles.full_name,
      message: 'Device activated successfully',
    });
  } catch (error) {
    console.error('License validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
