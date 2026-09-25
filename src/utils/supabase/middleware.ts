import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database.types'

/**
 * updateSession — called by the root middleware on every request.
 *
 * Responsibilities:
 *  1. Refreshes the Supabase session token if it has expired.
 *  2. Reads the user's role from the profile and enforces route guards:
 *       /student/** → requires role === 'student'
 *       /teacher/** → requires role === 'teacher'
 *     Unauthenticated users are redirected to /login.
 *     Authenticated users visiting /login or /signup are redirected to
 *     their role-specific dashboard.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write cookies to both the request and the response so that the
          // refreshed session is available to all subsequent server code.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ⚠️  IMPORTANT: Do NOT add any logic between createServerClient and
  // getUser(). A bug here could make it hard to debug auth issues.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── Auth route guards ──────────────────────────────────────────

  const isAuthRoute      = pathname.startsWith('/login') || pathname.startsWith('/signup')
  const isStudentRoute   = pathname.startsWith('/student')
  const isTeacherRoute   = pathname.startsWith('/teacher')
  const isProtectedRoute = isStudentRoute || isTeacherRoute

  // 1. Redirect unauthenticated users away from protected routes
  if (!user && isProtectedRoute) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 2. Redirect authenticated users away from auth pages
  if (user && isAuthRoute) {
    // Fetch their role to send them to the right dashboard
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const dashboardPath = profile?.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = dashboardPath
    return NextResponse.redirect(dashboardUrl)
  }

  // 3. Role-based access control for dashboard routes
  if (user && isProtectedRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = profile?.role

    if (isStudentRoute && role !== 'student') {
      // Teacher trying to access student routes → redirect to their dashboard
      const url = request.nextUrl.clone()
      url.pathname = '/teacher/dashboard'
      return NextResponse.redirect(url)
    }

    if (isTeacherRoute && role !== 'teacher') {
      // Student trying to access teacher routes → redirect to their dashboard
      const url = request.nextUrl.clone()
      url.pathname = '/student/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // ── Return the (possibly token-refreshed) response ─────────────
  return supabaseResponse
}
