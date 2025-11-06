/**
 * DESIGN DECISION: Server-side license generation with nanoid
 * WHY: 24-character keys provide 2^144 keyspace (collision-resistant) while being typeable
 *
 * REASONING CHAIN:
 * 1. User clicks "Add Device" in web dashboard
 * 2. POST request to this endpoint
 * 3. Generate unique license key (nanoid, 24 chars)
 * 4. Insert into devices table (status='pending', license_key=xxx)
 * 5. Return license key to frontend
 * 6. Frontend displays key + redirects to download page
 *
 * PATTERN: Pattern-LICENSE-001 (License Generation)
 * RELATED: app/dashboard/download, devices table, desktop activation
 */

import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user profile for tier limits
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const tier = profile?.subscription_tier || 'free';

    // Check device limits
    const { count: deviceCount } = await supabase
      .from('devices')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const tierLimits: Record<string, number> = {
      free: 3,
      network: 5,
      pro: 10,
      enterprise: 999, // Effectively unlimited
    };

    const limit = tierLimits[tier] || 3;

    if ((deviceCount || 0) >= limit) {
      return NextResponse.json(
        {
          error: `Device limit reached (${limit} devices on ${tier} tier)`,
          upgrade_url: '/dashboard/subscription',
        },
        { status: 403 }
      );
    }

    // Generate unique license key
    const licenseKey = nanoid(24); // 24 chars = 2^144 keyspace

    // Get form data to determine device info (if provided)
    let deviceName = 'New Device';
    let deviceType = 'desktop';

    try {
      const formData = await request.formData();
      deviceName = (formData.get('device_name') as string) || deviceName;
      deviceType = (formData.get('device_type') as string) || deviceType;
    } catch {
      // If not form data, use defaults
    }

    // Insert device record
    const { data: device, error: insertError } = await supabase
      .from('devices')
      .insert({
        user_id: user.id,
        device_name: deviceName,
        device_type: deviceType,
        license_key: licenseKey,
        is_active: false, // Pending activation
        storage_allocated_mb: 0, // Will be set on activation
      })
      .select()
      .single();

    if (insertError) {
      console.error('License generation error:', insertError);
      return NextResponse.json(
        { error: 'Failed to generate license' },
        { status: 500 }
      );
    }

    // Return license key + device ID
    return NextResponse.json({
      success: true,
      license_key: licenseKey,
      device_id: device.id,
      message: 'License generated successfully',
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
