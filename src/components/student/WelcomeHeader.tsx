import { format } from 'date-fns'
import { Sparkles } from 'lucide-react'
import type { Database } from '@/types/database.types'

// ── Types ──────────────────────────────────────────────────────
type Profile = Database['public']['Tables']['profiles']['Row']

interface WelcomeHeaderProps {
  profile: Pick<Profile, 'full_name' | 'level' | 'xp_points'>
  pendingCount: number
  schoolName?: string
}

// XP needed to reach the next level (simple linear formula: level × 100)
function xpForNextLevel(level: number) {
  return level * 100
}

function XpBar({ current, max }: { current: number; max: number }) {
  const pct = Math.min(Math.round((current / max) * 100), 100)
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-400 to-violet-400 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-indigo-200 tabular-nums whitespace-nowrap">
        {current} / {max} XP
      </span>
    </div>
  )
}

export default function WelcomeHeader({ profile, pendingCount, schoolName }: WelcomeHeaderProps) {
  const today = new Date()
  const greeting = (() => {
    const h = today.getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const firstName       = profile.full_name.split(' ')[0]
  const xpForNext       = xpForNextLevel(profile.level)
  // XP within the current level (progress resets each level)
  const xpInCurrentLevel = profile.xp_points % xpForNext

  const levelTitles: Record<number, string> = {
    1: 'Beginner', 2: 'Explorer', 3: 'Learner', 4: 'Scholar',
    5: 'Achiever', 6: 'Expert', 7: 'Master', 8: 'Champion',
    9: 'Legend', 10: 'Grandmaster',
  }

  return (
    <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-2xl p-6 text-white relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Greeting */}
        <div className="space-y-1">
          <p className="text-indigo-200 text-sm font-medium">
            {format(today, 'EEEE, d MMMM yyyy')}
          </p>
          {schoolName && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider bg-white/15 text-indigo-100 px-2 py-0.5 rounded-full">
              🏫 {schoolName}
            </span>
          )}
          <h1 className="text-2xl font-bold">
            {greeting}, {firstName}! 👋
          </h1>
          <p className="text-indigo-200 text-sm">
            {pendingCount > 0 ? (
              <>
                You have{' '}
                <span className="text-white font-semibold">
                  {pendingCount} assignment{pendingCount !== 1 ? 's' : ''}
                </span>{' '}
                pending.
              </>
            ) : (
              <span className="text-white font-semibold">All caught up! 🎉</span>
            )}
          </p>
        </div>

        {/* Level + XP */}
        <div className="flex-shrink-0 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-5 py-3 space-y-2 min-w-[210px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-xs font-semibold text-indigo-100 uppercase tracking-wide">
                Level {profile.level}
              </span>
            </div>
            <span className="text-xs text-indigo-200">
              {levelTitles[profile.level] ?? 'Grandmaster'}
            </span>
          </div>
          <XpBar current={xpInCurrentLevel} max={xpForNext} />
        </div>
      </div>
    </div>
  )
}
