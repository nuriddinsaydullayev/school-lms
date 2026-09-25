import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

/**
 * Creates a Supabase client for use in:
 *  - Server Components
 *  - Server Actions
 *  - Route Handlers (API routes)
 *
 * Reads and writes cookies via `next/headers` to maintain the user session.
 * Must be called inside an async server context.
 *
 * @example — Server Component
 * const supabase = await createClient()
 * const { data: { user } } = await supabase.auth.getUser()
 *
 * @example — Server Action
 * 'use server'
 * const supabase = await createClient()
 * const { error } = await supabase.from('submissions').insert({ ... })
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
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
            // setAll() is called from a Server Component — cookies cannot
            // be mutated here. The middleware will handle session refresh.
          }
        },
      },
    }
  )
}

/**
 * Creates a Supabase Admin client using the service-role key.
 * Bypasses ALL Row Level Security — use only in trusted server-side code.
 *
 * Never expose the service-role key to the browser.
 *
 * @example — Award tokens from a Server Action
 * const supabaseAdmin = createAdminClient()
 * await supabaseAdmin.from('tokens').insert({ ... })
 */
export function createAdminClient() {
  return createSupabaseAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
