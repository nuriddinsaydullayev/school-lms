import { createClient } from '@/utils/supabase/server'
import TeacherLayoutClient from '@/components/teacher/TeacherLayoutClient'

/**
 * Server Component layout wrapping all /teacher/** routes.
 * Fetches the school name once per navigation so both sidebars
 * and the mobile top bar show the correct tenant branding.
 */
export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let schoolName = 'EduSpark'

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('schools(name)')
      .eq('id', user.id)
      .maybeSingle()

    if (data?.schools && !Array.isArray(data.schools)) {
      schoolName = (data.schools as unknown as { name: string }).name
    }
  }

  return (
    <TeacherLayoutClient schoolName={schoolName}>
      {children}
    </TeacherLayoutClient>
  )
}
