/**
 * DESIGN DECISION: GET endpoint for fetching user's devices
 * WHY: Download page needs device list for display
 *
 * PATTERN: Pattern-API-001 (RESTful API design)
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch devices
    const { data: devices } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Fetch profile for tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      devices: devices || [],
      tier: profile?.subscription_tier || 'free',
    });
  } catch (error) {
    console.error('Failed to fetch devices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
