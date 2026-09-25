import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function Home() {
  const supabase = await createClient()

  // 1. Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. If authenticated, fetch their role to determine which dashboard
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role === 'teacher') {
    redirect('/teacher/dashboard')
  } else {
    // Default to student dashboard if role is 'student' or not found
    redirect('/student/dashboard')
  }
}
