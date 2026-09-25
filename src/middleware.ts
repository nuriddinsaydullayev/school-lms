import { updateSession } from '@/utils/supabase/middleware'
import { type NextRequest } from 'next/server'

/**
 * Next.js root middleware.
 *
 * Runs on every matched request to:
 *  - Refresh the Supabase auth session (keeps JWTs alive)
 *  - Enforce role-based route guards (student / teacher)
 *  - Redirect unauthenticated users to /login
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     *   - _next/static  (static files)
     *   - _next/image   (image optimisation)
     *   - favicon.ico
     *   - Public assets (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
