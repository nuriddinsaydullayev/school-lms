import { Award } from 'lucide-react'

interface Badge {
  id:       string
  emoji:    string
  label:    string
  desc:     string
  color:    string
  earned:   boolean
  earnedOn?: string
}

interface VirtualBadgesProps {
  xpPoints: number
  level:    number
  /** Count of submitted assignments */
  submittedCount: number
  /** Current token balance */
  tokenBalance: number
}

// Derive badges from real stats — no separate DB table needed yet
function computeBadges(xp: number, level: number, submitted: number, tokens: number): Badge[] {
  return [
    {
      id: 'first-step',
      emoji: '🚀', label: 'First Step',
      desc: 'Submitted your first assignment',
      color: 'from-sky-400 to-indigo-500',
      earned: submitted >= 1,
      earnedOn: submitted >= 1 ? 'Earned' : undefined,
    },
    {
      id: 'hard-worker',
      emoji: '💪', label: 'Hard Worker',
      desc: 'Submitted 5 or more assignments',
      color: 'from-indigo-500 to-violet-600',
      earned: submitted >= 5,
      earnedOn: submitted >= 5 ? 'Earned' : undefined,
    },
    {
      id: 'token-collector',
      emoji: '🪙', label: 'Token Collector',
      desc: 'Accumulated 50+ tokens',
      color: 'from-amber-400 to-orange-500',
      earned: tokens >= 50,
      earnedOn: tokens >= 50 ? 'Earned' : undefined,
    },
    {
      id: 'scholar',
      emoji: '🎓', label: 'Scholar',
      desc: 'Reached Level 3',
      color: 'from-emerald-400 to-teal-500',
      earned: level >= 3,
      earnedOn: level >= 3 ? 'Earned' : undefined,
    },
    {
      id: 'xp-master',
      emoji: '⚡', label: 'XP Master',
      desc: 'Earned 500 total XP',
      color: 'from-violet-500 to-purple-600',
      earned: xp >= 500,
      earnedOn: xp >= 500 ? 'Earned' : undefined,
    },
    {
      id: 'math-king',
      emoji: '📐', label: 'Math King',
      desc: 'Completed 3 Math assignments',
      color: 'from-rose-400 to-pink-600',
      earned: false, // future: filter by class subject
    },
  ]
}

export default function VirtualBadges({ xpPoints, level, submittedCount, tokenBalance }: VirtualBadgesProps) {
  const badges  = computeBadges(xpPoints, level, submittedCount, tokenBalance)
  const earned  = badges.filter((b) => b.earned)
  const locked  = badges.filter((b) => !b.earned)

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50">
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 text-sm leading-tight">Nishonlar</h2>
            <p className="text-xs text-slate-400">Your earned badges</p>
          </div>
        </div>
        <span className="text-xs font-semibold bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full">
          {earned.length} / {badges.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="px-5 mb-4">
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-700"
            style={{ width: `${Math.round((earned.length / badges.length) * 100)}%` }}
          />
        </div>
      </div>

      {/* Earned badges */}
      {earned.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Unlocked</p>
          <div className="grid grid-cols-3 gap-2.5">
            {earned.map((b) => (
              <div key={b.id} className="flex flex-col items-center text-center group">
                <div className={`relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${b.color} shadow-md group-hover:scale-105 transition-transform duration-200`}>
                  <span className="text-2xl">{b.emoji}</span>
                  {/* Glow ring */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${b.color} opacity-30 blur-md -z-10`} />
                </div>
                <p className="text-xs font-bold text-slate-700 mt-2 leading-tight">{b.label}</p>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5 line-clamp-2">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked badges */}
      {locked.length > 0 && (
        <div className="px-5 pb-5 border-t border-slate-50 pt-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Locked</p>
          <div className="grid grid-cols-3 gap-2.5">
            {locked.map((b) => (
              <div key={b.id} className="flex flex-col items-center text-center opacity-40">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200">
                  <span className="text-2xl grayscale">{b.emoji}</span>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-2 leading-tight">{b.label}</p>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5 line-clamp-2">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {earned.length === 0 && (
        <div className="px-5 pb-6 text-center">
          <p className="text-3xl mb-2">🔒</p>
          <p className="text-sm font-medium text-slate-600">No badges yet</p>
          <p className="text-xs text-slate-400 mt-1">Submit assignments to unlock your first badge!</p>
        </div>
      )}
    </div>
  )
}
