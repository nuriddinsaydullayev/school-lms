import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import VirtualBadges from '@/components/student/VirtualBadges'
import PeerHelpTeaser from '@/components/student/PeerHelpTeaser'
import { Medal } from 'lucide-react'

export const metadata: Metadata = { title: 'Badges & Rewards' }
export const revalidate = 300

export default async function StudentBadgesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileResult, balanceResult, submissionsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('xp_points, level, role')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('token_balances')
      .select('balance')
      .eq('student_id', user.id)
      .maybeSingle(),
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('status', 'submitted'),
  ])

  if (!profileResult.data || profileResult.data.role !== 'student') redirect('/login')

  const profile        = profileResult.data
  const tokenBalance   = balanceResult.data?.balance ?? 0
  const submittedCount = submissionsResult.count ?? 0

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500">
          <Medal className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Badges &amp; Achievements
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Nishonlar — collect them all by completing tasks and levelling up!
          </p>
        </div>
      </div>

      {/* Two-column layout: badges left, peer help right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">
          <VirtualBadges
            xpPoints={profile.xp_points}
            level={profile.level}
            submittedCount={submittedCount}
            tokenBalance={tokenBalance}
          />
        </div>
        <div className="lg:col-span-5 space-y-6">
          <PeerHelpTeaser />

          {/* How to earn badges tip */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5">
            <h3 className="font-bold text-slate-800 text-sm mb-3">How to earn badges</h3>
            <ul className="space-y-2 text-xs text-slate-600">
              {[
                ['🚀', 'First Step',       'Submit your first assignment'],
                ['💪', 'Hard Worker',      'Submit 5+ assignments'],
                ['🪙', 'Token Collector',  'Accumulate 50+ tokens'],
                ['🎓', 'Scholar',          'Reach Level 3'],
                ['⚡', 'XP Master',        'Earn 500 total XP'],
                ['📐', 'Math King',        'Complete 3 Math assignments'],
              ].map(([emoji, name, desc]) => (
                <li key={name} className="flex items-start gap-2">
                  <span className="text-sm flex-shrink-0">{emoji}</span>
                  <span>
                    <span className="font-semibold text-slate-700">{name}</span>
                    {' — '}{desc}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
