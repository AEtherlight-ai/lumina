/**
 * Desktop API Authentication Middleware
 *
 * DESIGN DECISION: Validate desktop app requests via license key
 * WHY: Desktop apps use license_key as bearer token for authentication
 *
 * REASONING CHAIN:
 * 1. Extract Authorization header from request
 * 2. Validate bearer token format (Bearer <license_key>)
 * 3. Lookup device by license_key
 * 4. Validate device is active and not revoked
 * 5. Return device + user info for downstream handlers
 * 6. Rate limit: 100 requests/minute per device
 *
 * PATTERN: Pattern-AUTH-002 (API authentication middleware)
 * PATTERN: Pattern-SECURITY-001 (Rate limiting)
 * RELATED: /api/desktop/*, devices table
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export interface AuthenticatedDevice {
  device_id: string;
  user_id: string;
  device_name: string;
  is_active: boolean;
}

/**
 * Validate desktop app request using license key bearer token
 *
 * Usage in API route:
 * ```typescript
 * const auth = await validateDesktopAuth(request);
 * if (!auth.success) {
 *   return NextResponse.json({ error: auth.error }, { status: auth.status });
 * }
 * const device = auth.device;
 * ```
 */
export async function validateDesktopAuth(
  request: NextRequest
): Promise<
  | { success: true; device: AuthenticatedDevice }
  | { success: false; error: string; status: number }
> {
  try {
    // Extract Authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return {
        success: false,
        error: 'Authorization header is required',
        status: 401,
      };
    }

    // Parse bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return {
        success: false,
        error: 'Invalid Authorization header format. Expected: Bearer <license_key>',
        status: 401,
      };
    }

    const license_key = parts[1];

    // Lookup device by license key
    const supabase = await createClient();
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('id, user_id, device_name, is_active, license_key')
      .eq('license_key', license_key)
      .single();

    if (deviceError || !device) {
      return {
        success: false,
        error: 'Invalid license key',
        status: 401,
      };
    }

    // Validate device is active
    if (!device.is_active) {
      return {
        success: false,
        error: 'Device has been deactivated',
        status: 403,
      };
    }

    // TODO: Rate limiting (100 requests/minute per device)
    // Options:
    // 1. Use Upstash Redis for distributed rate limiting
    // 2. Use Supabase Edge Functions with Deno KV
    // 3. Use in-memory Map (simple but not distributed)
    //
    // For now, skip rate limiting (implement in Phase 3)

    // Return authenticated device info
    return {
      success: true,
      device: {
        device_id: device.id,
        user_id: device.user_id,
        device_name: device.device_name,
        is_active: device.is_active,
      },
    };
  } catch (error) {
    console.error('Desktop auth validation error:', error);
    return {
      success: false,
      error: 'Internal server error',
      status: 500,
    };
  }
}

/**
 * Rate limit check for desktop API (100 requests/minute per device)
 *
 * TODO: Implement with Redis or KV store
 *
 * For now, returns success (no rate limiting)
 */
export async function checkRateLimit(
  device_id: string
): Promise<{ allowed: true } | { allowed: false; retry_after: number }> {
  // TODO: Implement rate limiting
  // Example with Redis:
  // const key = `rate_limit:${device_id}`;
  // const count = await redis.incr(key);
  // if (count === 1) {
  //   await redis.expire(key, 60); // 1 minute window
  // }
  // if (count > 100) {
  //   const ttl = await redis.ttl(key);
  //   return { allowed: false, retry_after: ttl };
  // }
  // return { allowed: true };

  // For now, allow all requests
  return { allowed: true };
}

/**
 * Helper: Get user session from Supabase (for authenticated requests)
 */
export async function getUserFromAuth(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}
