/**
 * DESIGN DECISION: Supabase server client for Server Components
 * WHY: Server-side auth verification, database operations in API routes
 *
 * REASONING CHAIN:
 * 1. Server Components need cookies for auth state
 * 2. API routes need server client for protected operations
 * 3. Use cookies() from next/headers for Next.js 15
 *
 * PATTERN: Pattern-AUTH-001 (Supabase SSR Authentication)
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
