import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AdminLayoutClient from '@/components/admin/AdminLayoutClient'

/**
 * Server Component layout wrapping all /admin/** routes.
 * Strictly verifies role === 'admin' before rendering.
 * Loads the administrator's school name for branding.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login?redirectTo=/admin/dashboard')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, school_id, schools(name)')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin') {
    // Non-admin users are ejected to their relevant dashboard
    if (profile?.role === 'teacher') {
      redirect('/teacher/dashboard')
    }
    redirect('/student/dashboard')
  }

  let schoolName = 'EduSpark'
  if (profile.schools && !Array.isArray(profile.schools)) {
    schoolName = (profile.schools as unknown as { name: string }).name
  }

  return (
    <AdminLayoutClient schoolName={schoolName}>
      {children}
    </AdminLayoutClient>
  )
}
