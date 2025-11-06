/**
 * Desktop Authentication API
 *
 * DESIGN DECISION: License-based authentication for desktop apps
 * WHY: Desktop apps authenticate with license key, get session token
 *
 * REASONING CHAIN:
 * 1. Desktop app sends license_key + device_fingerprint on first launch
 * 2. Backend validates license exists and not already activated
 * 3. Backend activates device (updates device record)
 * 4. Backend returns auth session for Supabase client
 * 5. Desktop app stores session locally (encrypted)
 * 6. Desktop app uses session for all subsequent API calls
 *
 * PATTERN: Pattern-AUTH-001 (JWT authentication for desktop apps)
 * RELATED: /api/license/validate, devices table
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/desktop/auth
 *
 * Authenticate desktop app with license key.
 *
 * Request Body:
 * {
 *   license_key: string;
 *   device_fingerprint: string;
 *   device_name?: string;
 *   device_type?: string;
 * }
 *
 * Response:
 * {
 *   success: true;
 *   device_id: string;
 *   user_id: string;
 *   tier: string;
 *   session: {
 *     access_token: string;
 *     refresh_token: string;
 *     expires_at: number;
 *   };
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Parse request body
    const body = await request.json();
    const {
      license_key,
      device_fingerprint,
      device_name,
      device_type,
    } = body;

    if (!license_key || !device_fingerprint) {
      return NextResponse.json(
        { error: 'license_key and device_fingerprint are required' },
        { status: 400 }
      );
    }

    // DESIGN DECISION: Find device by license_key
    // WHY: License key is unique per device
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('id, user_id, license_key, device_fingerprint, is_active, activated_at')
      .eq('license_key', license_key)
      .single();

    if (deviceError || !device) {
      return NextResponse.json(
        { error: 'Invalid license key' },
        { status: 401 }
      );
    }

    // DESIGN DECISION: Check if device already activated with different fingerprint
    // WHY: Prevent license key reuse across multiple machines
    if (device.activated_at && device.device_fingerprint !== device_fingerprint) {
      return NextResponse.json(
        { error: 'License key already activated on a different device' },
        { status: 403 }
      );
    }

    // Activate device if not already activated
    if (!device.activated_at) {
      const { error: updateError } = await supabase
        .from('devices')
        .update({
          device_fingerprint,
          device_name: device_name || 'Desktop App',
          device_type: device_type || 'desktop',
          activated_at: new Date().toISOString(),
          is_active: true,
        })
        .eq('id', device.id);

      if (updateError) {
        console.error('Device activation error:', updateError);
        return NextResponse.json(
          { error: 'Failed to activate device' },
          { status: 500 }
        );
      }
    }

    // Get user profile + subscription tier
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', device.user_id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    // DESIGN DECISION: Create Supabase auth session for desktop app
    // WHY: Desktop app can use Supabase client for all API calls (RLS policies work)
    // NOTE: This requires service role key for admin auth operations
    // For now, return device_id and expect desktop to use license_key for auth

    // TODO: Implement proper session token generation
    // Options:
    // 1. Use Supabase Admin API to create session (requires service role key)
    // 2. Use JWT signing with secret key
    // 3. Use API key system (simpler, store in devices table)

    // Return device info (desktop app will use license_key as bearer token)
    return NextResponse.json({
      success: true,
      device_id: device.id,
      user_id: device.user_id,
      tier: profile.subscription_tier,
      // TODO: Add session tokens when auth system implemented
      message: 'Device authenticated successfully. Use license_key as bearer token for API calls.',
    });
  } catch (error) {
    console.error('Desktop auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/desktop/auth
 *
 * Verify current authentication status.
 *
 * Response:
 * {
 *   authenticated: boolean;
 *   device_id: string;
 *   user_id: string;
 *   tier: string;
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
      return NextResponse.json(
        { authenticated: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { authenticated: false, error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user_id: user.id,
      tier: profile.subscription_tier,
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
