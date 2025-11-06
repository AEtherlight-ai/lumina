/**
 * DESIGN DECISION: Supabase client for browser-side operations
 * WHY: Next.js 15 App Router requires separate client/server instances
 *
 * REASONING CHAIN:
 * 1. Use @supabase/ssr for Next.js App Router compatibility
 * 2. Browser client for client components (useState, useEffect)
 * 3. Server client for Server Components and API routes
 * 4. Middleware client for auth checks on protected routes
 *
 * PATTERN: Pattern-AUTH-001 (Supabase SSR Authentication)
 * RELATED: middleware.ts, server.ts, auth pages
 */

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
