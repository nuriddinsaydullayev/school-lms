import { createClient } from '@/utils/supabase/server'
import StudentLayoutClient from '@/components/student/StudentLayoutClient'

/**
 * Server Component layout wrapping all /student/** routes.
 * Fetches the authenticated user's school name once here so it
 * can be displayed in the sidebar and mobile header without
 * extra client-side fetches on every page.
 */
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // getUser() is safe to call in layouts; it doesn't throw if unauthenticated.
  const { data: { user } } = await supabase.auth.getUser()

  let schoolName = 'EduSpark' // safe fallback

  if (user) {
    // Join profiles → schools in one query to get the school name
    const { data } = await supabase
      .from('profiles')
      .select('school_id, schools(name)')
      .eq('id', user.id)
      .maybeSingle()

    if (data?.schools && !Array.isArray(data.schools)) {
      schoolName = (data.schools as unknown as { name: string }).name
    }
  }

  return (
    <StudentLayoutClient schoolName={schoolName}>
      {children}
    </StudentLayoutClient>
  )
}
