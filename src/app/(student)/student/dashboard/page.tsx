import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

// ── Components ──────────────────────────────────────────────────
import WelcomeHeader  from '@/components/student/WelcomeHeader'
import TokenWidget    from '@/components/student/TokenWidget'
import HomeworkList   from '@/components/student/HomeworkList'
import AiTutorChat    from '@/components/student/AiTutorChat'
import JoinClassWidget from '@/components/student/JoinClassWidget'
import DailySchedule  from '@/components/student/DailySchedule'
import SmartPlanner   from '@/components/student/SmartPlanner'
import VirtualBadges  from '@/components/student/VirtualBadges'
import PeerHelpTeaser from '@/components/student/PeerHelpTeaser'

// ── Server Actions ───────────────────────────────────────────────
import { getStudentAssignments } from '@/app/actions/homework'

export const metadata: Metadata = { title: 'Dashboard' }
export const revalidate = 60

export default async function StudentDashboardPage() {
  const supabase = await createClient()

  // ── Auth ────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── Parallel data fetching ──────────────────────────────────
  const [
    profileResult,
    tokenBalanceResult,
    recentTokensResult,
    allBalancesResult,
    submissionsResult,
    assignments,
  ] = await Promise.all([
    // 1. Profile + school name
    supabase
      .from('profiles')
      .select('full_name, level, xp_points, role, schools(name)')
      .eq('id', user.id)
      .maybeSingle(),

    // 2. Token balance
    supabase
      .from('token_balances')
      .select('*')
      .eq('student_id', user.id)
      .maybeSingle(),

    // 3. Last 4 transactions
    supabase
      .from('tokens')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(4),

    // 4. All balances for rank
    supabase
      .from('token_balances')
      .select('student_id, balance')
      .order('balance', { ascending: false }),

    // 5. Submitted count (for badge calculation)
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('status', 'submitted'),

    // 6. Pending assignments
    getStudentAssignments(),
  ])

  // ── Guard ───────────────────────────────────────────────────
  if (!profileResult.data || profileResult.data.role !== 'student') {
    redirect('/login')
  }

  const profile       = profileResult.data
  const tokenBalance  = tokenBalanceResult.data
  const recentTokens  = recentTokensResult.data ?? []
  const allBalances   = allBalancesResult.data  ?? []
  const submittedCount = submissionsResult.count ?? 0

  // ── School name ─────────────────────────────────────────────
  const schoolData = profile.schools
  const schoolName = schoolData && !Array.isArray(schoolData)
    ? (schoolData as unknown as { name: string }).name
    : undefined

  // ── Rank ────────────────────────────────────────────────────
  const rankIndex     = allBalances.findIndex((b) => b.student_id === user.id)
  const rank          = rankIndex >= 0 ? rankIndex + 1 : allBalances.length + 1
  const totalStudents = Math.max(allBalances.length, 1)

  // ── Safe balance ────────────────────────────────────────────
  const safeBalance = tokenBalance ?? {
    student_id:   user.id,
    school_id:    null,
    balance:      0,
    total_earned: 0,
    total_spent:  0,
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">

      {/* ─── Row 1: Welcome Header (full width) ─────────────── */}
      <WelcomeHeader
        profile={profile}
        pendingCount={assignments.length}
        schoolName={schoolName}
      />

      {/* ─── Row 2: Three-column main grid ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── LEFT COLUMN (4 cols) ── */}
        <div className="lg:col-span-4 space-y-6">

          {/* Join a class */}
          <JoinClassWidget />

          {/* Token balance + rank */}
          <TokenWidget
            balance={safeBalance}
            recentTransactions={recentTokens}
            rank={rank}
            totalStudents={totalStudents}
          />

          {/* Virtual Badges / Nishonlar */}
          <VirtualBadges
            xpPoints={profile.xp_points}
            level={profile.level}
            submittedCount={submittedCount}
            tokenBalance={safeBalance.balance ?? 0}
          />
        </div>

        {/* ── CENTRE COLUMN (5 cols) ── */}
        <div className="lg:col-span-5 space-y-6">

          {/* Homework to-do list */}
          <HomeworkList assignments={assignments} />

          {/* Peer Help Teaser */}
          <PeerHelpTeaser />
        </div>

        {/* ── RIGHT COLUMN (3 cols) ── */}
        <div className="lg:col-span-3 space-y-6">

          {/* Daily Class Schedule / Dars Jadvali */}
          <DailySchedule assignments={assignments} />

          {/* Smart Planner / Aqlli Rejalashtiruvchi */}
          <SmartPlanner
            assignments={assignments}
            xpPoints={profile.xp_points}
          />
        </div>

      </div>

      {/* ─── Floating AI Tutor bubble ──────────────────────── */}
      <AiTutorChat variant="bubble" />
    </div>
  )
}
