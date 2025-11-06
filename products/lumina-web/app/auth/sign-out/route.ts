/**
 * DESIGN DECISION: Server-side sign-out route
 * WHY: Properly clear session cookies, redirect to home
 *
 * PATTERN: Pattern-AUTH-005 (Sign Out Flow)
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL('/', request.url));
}
