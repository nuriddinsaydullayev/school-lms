import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import WelcomeHeader from '@/components/student/WelcomeHeader'
import ScheduleCard  from '@/components/student/ScheduleCard'
import TokenWidget   from '@/components/student/TokenWidget'
import HomeworkList  from '@/components/student/HomeworkList'
import AiTutorChat   from '@/components/student/AiTutorChat'
import { getStudentAssignments } from '@/app/actions/homework'

import JoinClassWidget from '@/components/student/JoinClassWidget'

export const metadata: Metadata = { title: 'Dashboard' }

// Revalidate every 60 s so fresh data shows without a full page reload
export const revalidate = 60

export default async function StudentDashboardPage() {
  const supabase = await createClient()

  // ── Auth ────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // ── Parallel data fetching ──────────────────────────────────
  const [
    profileResult,
    tokenBalanceResult,
    recentTokensResult,
    allBalancesResult,
    assignments,
  ] = await Promise.all([
    // 1. Student profile + school name
    supabase
      .from('profiles')
      .select('full_name, level, xp_points, role, schools(name)')
      .eq('id', user.id)
      .maybeSingle(),

    // 2. This student's token balance
    supabase
      .from('token_balances')
      .select('*')
      .eq('student_id', user.id)
      .maybeSingle(),

    // 3. Last 4 token transactions for the activity feed
    supabase
      .from('tokens')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(4),

    // 4. All student balances (for rank calculation)
    supabase
      .from('token_balances')
      .select('student_id, balance')
      .order('balance', { ascending: false }),

    // 5. Pending assignments via Server Action (handles complex filter)
    getStudentAssignments(),
  ])

  // ── Guard: ensure profile exists & role is student ──────────
  if (!profileResult.data || profileResult.data.role !== 'student') {
    redirect('/login')
  }

  const profile          = profileResult.data
  const tokenBalance     = tokenBalanceResult.data
  const recentTokens     = recentTokensResult.data ?? []
  const allBalances      = allBalancesResult.data  ?? []

  // ── Extract school name from join ────────────────────────────
  const schoolData = profile.schools
  const schoolName = schoolData && !Array.isArray(schoolData)
    ? (schoolData as unknown as { name: string }).name
    : undefined

  // ── Rank calculation ─────────────────────────────────────────
  // Sort by balance descending (already ordered), find this student's position
  const rankIndex   = allBalances.findIndex((b) => b.student_id === user.id)
  const rank        = rankIndex >= 0 ? rankIndex + 1 : allBalances.length + 1
  const totalStudents = Math.max(allBalances.length, 1)

  // ── Default balance if no tokens yet ────────────────────────
  const safeBalance = tokenBalance ?? {
    student_id:   user.id,
    school_id:    null,
    balance:      0,
    total_earned: 0,
    total_spent:  0,
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">

      {/* ── Welcome Header ── */}
      <WelcomeHeader
        profile={profile}
        pendingCount={assignments.length}
        schoolName={schoolName}
      />

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left: Classes + Tokens */}
        <div className="lg:col-span-5 space-y-6">
          <JoinClassWidget />
          <TokenWidget
            balance={safeBalance}
            recentTransactions={recentTokens}
            rank={rank}
            totalStudents={totalStudents}
          />
          <ScheduleCard />
        </div>

        {/* Right: Homework (real) */}
        <div className="lg:col-span-7">
          <div className="min-h-[600px] flex flex-col">
            <HomeworkList assignments={assignments} />
          </div>
        </div>

      </div>

      {/* ── Floating AI Tutor bubble ── */}
      <AiTutorChat variant="bubble" />
    </div>
  )
}
