import type { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'
import LeaderboardView from '@/components/student/LeaderboardView'

export const metadata: Metadata = { title: 'Leaderboard' }
export const revalidate = 60

export default async function LeaderboardPage() {
  const supabase = await createClient()

  // Fetch top 50 students by XP
  const { data: students } = await supabase
    .from('profiles')
    .select('id, full_name, xp_points, level')
    .eq('role', 'student')
    .order('xp_points', { ascending: false })
    .limit(50)

  // Fetch current user so we can highlight them
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <LeaderboardView
      students={students ?? []}
      currentUserId={user?.id}
    />
  )
}
