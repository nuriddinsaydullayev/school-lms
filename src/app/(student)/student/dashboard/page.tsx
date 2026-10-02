import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

// ── Components ──────────────────────────────────────────────────
import WelcomeHeader  from '@/components/student/WelcomeHeader'
import TokenWidget    from '@/components/student/TokenWidget'
import HomeworkList   from '@/components/student/HomeworkList'
import AiTutorChat    from '@/components/student/AiTutorChat'

// ── Server Actions ───────────────────────────────────────────────
import { getStudentAssignments } from '@/app/actions/homework'
import Link from 'next/link'
import {
  Calendar,
  ClipboardList,
  ChevronRight,
  Clock,
  BookOpen,
  Medal,
} from 'lucide-react'

export const metadata: Metadata = { title: 'Dashboard' }
export const revalidate = 60

// ── Daily Summary Card ──────────────────────────────────────────
function DailySummaryCard({
  pendingCount,
  nextSubject,
}: {
  pendingCount: number
  nextSubject: string | null
}) {
  const items = [
    {
      icon: Clock,
      label: 'Next class',
      value: nextSubject ?? 'No more classes today',
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      icon: ClipboardList,
      label: 'Assignments pending',
      value: pendingCount === 0 ? 'All caught up 🎉' : `${pendingCount} assignment${pendingCount !== 1 ? 's' : ''}`,
      color: pendingCount > 0 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50',
    },
    {
      icon: BookOpen,
      label: 'Study plan',
      value: 'View today\'s smart plan →',
      color: 'text-violet-600 bg-violet-50',
      href: '/student/planner',
    },
  ]

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50">
            <Calendar className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 text-sm">Daily Summary</h2>
            <p className="text-xs text-slate-400">Your day at a glance</p>
          </div>
        </div>
        <Link
          href="/student/planner"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition"
        >
          Full Planner
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="px-4 pb-5 space-y-2">
        {items.map(({ icon: Icon, label, value, color, href }) => {
          const inner = (
            <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition group">
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-semibold text-slate-700 truncate mt-0.5">{value}</p>
              </div>
              {href && <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition flex-shrink-0" />}
            </div>
          )
          return href ? (
            <Link key={label} href={href}>{inner}</Link>
          ) : (
            <div key={label}>{inner}</div>
          )
        })}
      </div>
    </div>
  )
}

// ── Badges Quick-Link ───────────────────────────────────────────
function BadgesQuickLink({ earnedCount, totalCount }: { earnedCount: number; totalCount: number }) {
  const pct = Math.round((earnedCount / totalCount) * 100)
  return (
    <Link href="/student/badges" className="block group">
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5 hover:border-amber-200 hover:shadow-sm transition">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100">
              <Medal className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">My Badges</h3>
              <p className="text-xs text-slate-500">{earnedCount} of {totalCount} earned</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" />
        </div>
        <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-amber-600 font-medium mt-2">{pct}% collection complete</p>
      </div>
    </Link>
  )
}

// ── Helpers ─────────────────────────────────────────────────────
const TIMETABLE = [
  { time: '08:00', endTime: '08:45', subject: 'Mathematics' },
  { time: '08:55', endTime: '09:40', subject: 'Physics'     },
  { time: '10:00', endTime: '10:45', subject: 'Literature'  },
  { time: '10:55', endTime: '11:40', subject: 'History'     },
  { time: '12:30', endTime: '13:15', subject: 'Chemistry'   },
  { time: '13:25', endTime: '14:10', subject: 'English'     },
]

function getNextSubject(): string | null {
  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const next = TIMETABLE.find((c) => toMins(c.time) > nowMins)
  return next?.subject ?? null
}

function computeEarnedBadges(xp: number, level: number, submitted: number, tokens: number) {
  return [
    submitted >= 1, submitted >= 5, tokens >= 50,
    level >= 3, xp >= 500, false,
  ].filter(Boolean).length
}

// ── Page ────────────────────────────────────────────────────────
export default async function StudentDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    profileResult,
    tokenBalanceResult,
    recentTokensResult,
    allBalancesResult,
    submissionsResult,
    assignments,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, level, xp_points, role, schools(name)')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('token_balances')
      .select('*')
      .eq('student_id', user.id)
      .maybeSingle(),
    supabase
      .from('tokens')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(4),
    supabase
      .from('token_balances')
      .select('student_id, balance')
      .order('balance', { ascending: false }),
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('status', 'submitted'),
    getStudentAssignments(),
  ])

  if (!profileResult.data || profileResult.data.role !== 'student') redirect('/login')

  const profile        = profileResult.data
  const tokenBalance   = tokenBalanceResult.data
  const recentTokens   = recentTokensResult.data ?? []
  const allBalances    = allBalancesResult.data  ?? []
  const submittedCount = submissionsResult.count ?? 0

  const schoolData = profile.schools
  const schoolName = schoolData && !Array.isArray(schoolData)
    ? (schoolData as unknown as { name: string }).name
    : undefined

  const rankIndex     = allBalances.findIndex((b) => b.student_id === user.id)
  const rank          = rankIndex >= 0 ? rankIndex + 1 : allBalances.length + 1
  const totalStudents = Math.max(allBalances.length, 1)

  const safeBalance = tokenBalance ?? {
    student_id: user.id, school_id: null,
    balance: 0, total_earned: 0, total_spent: 0,
  }

  const earnedBadgeCount = computeEarnedBadges(
    profile.xp_points, profile.level, submittedCount, safeBalance.balance ?? 0
  )
  const nextSubject = getNextSubject()

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">

      {/* ── Welcome Header ── */}
      <WelcomeHeader
        profile={profile}
        pendingCount={assignments.length}
        schoolName={schoolName}
      />

      {/* ── Main 2-column grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT (5 cols) — progress + summary */}
        <div className="lg:col-span-5 space-y-6">
          <TokenWidget
            balance={safeBalance}
            recentTransactions={recentTokens}
            rank={rank}
            totalStudents={totalStudents}
          />
          <DailySummaryCard
            pendingCount={assignments.length}
            nextSubject={nextSubject}
          />
          <BadgesQuickLink earnedCount={earnedBadgeCount} totalCount={6} />
        </div>

        {/* RIGHT (7 cols) — homework */}
        <div className="lg:col-span-7">
          <HomeworkList assignments={assignments} />
        </div>

      </div>

      <AiTutorChat variant="bubble" />
    </div>
  )
}
