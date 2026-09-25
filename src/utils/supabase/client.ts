import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

/**
 * Creates a Supabase client for use in Client Components ('use client').
 *
 * This is a singleton-friendly factory — call it at the top of any
 * Client Component or custom hook that needs Supabase access.
 *
 * @example
 * const supabase = createClient()
 * const { data } = await supabase.from('profiles').select('*')
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
