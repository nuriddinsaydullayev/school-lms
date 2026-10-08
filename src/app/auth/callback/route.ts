import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

/**
 * /auth/callback
 *
 * Supabase redirects here after email confirmation or OAuth login.
 * Exchanges the `code` query param for a session, then sends the
 * user to their role-specific dashboard.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code        = searchParams.get('code')
  const redirectTo  = searchParams.get('next') ?? null

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Determine role-based redirect destination
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()

      let defaultDashboard = '/student/dashboard'
      if (profile?.role === 'admin') defaultDashboard = '/admin/dashboard'
      else if (profile?.role === 'teacher') defaultDashboard = '/teacher/dashboard'

      const destination = redirectTo ?? defaultDashboard

      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  // Something went wrong — send to login with an error hint
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
