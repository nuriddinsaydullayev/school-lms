import { Brain, Clock, Zap, ChevronRight, Lightbulb } from 'lucide-react'
import type { Database } from '@/types/database.types'

type AssignmentRow = Database['public']['Tables']['assignments']['Row'] & {
  classes?: { name: string | null } | null
}

interface SmartPlannerProps {
  assignments: AssignmentRow[]
  xpPoints:    number
}

// Estimate difficulty (minutes) from max_score and token_reward
function estimateMins(a: AssignmentRow) {
  const base = Math.round((a.max_score / 100) * 30 + (a.token_reward / 10) * 10)
  return Math.max(15, Math.min(base, 90))
}

// Priority score: overdue first, then earliest due_date, then most tokens
function priorityScore(a: AssignmentRow) {
  if (!a.due_date) return 50
  const daysLeft = (new Date(a.due_date).getTime() - Date.now()) / 86_400_000
  if (daysLeft < 0) return 0
  if (daysLeft < 1) return 10
  if (daysLeft < 3) return 25
  return 50
}

const SLOT_COLORS = [
  'from-indigo-500 to-violet-500',
  'from-sky-500 to-indigo-500',
  'from-violet-500 to-purple-500',
]

const FREE_TIME_SLOTS = ['4:00 PM – 5:30 PM', '6:30 PM – 8:00 PM', '8:30 PM – 9:30 PM']

export default function SmartPlanner({ assignments, xpPoints }: SmartPlannerProps) {
  // Sort by priority, take top 3 pending tasks
  const sorted = [...assignments]
    .sort((a, b) => priorityScore(a) - priorityScore(b))
    .slice(0, 3)

  const totalMins = sorted.reduce((s, a) => s + estimateMins(a), 0)
  const totalHrs  = Math.floor(totalMins / 60)
  const totalRem  = totalMins % 60

  // Assign tasks to free-time slots
  const plan = FREE_TIME_SLOTS.map((slot, i) => ({
    slot,
    task: sorted[i] ?? null,
    gradient: SLOT_COLORS[i % SLOT_COLORS.length],
  }))

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-700/50">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30">
            <Brain className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm leading-tight">Aqlli Rejalashtiruvchi</h2>
            <p className="text-xs text-slate-400 mt-0.5">AI-suggested daily plan</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Study time needed</p>
          <p className="text-sm font-bold text-indigo-400 tabular-nums">
            {totalHrs > 0 ? `${totalHrs}h ` : ''}{totalRem > 0 ? `${totalRem}m` : ''}
            {totalMins === 0 ? 'All done!' : ''}
          </p>
        </div>
      </div>

      {/* AI Tip banner */}
      <div className="mx-4 mb-4 flex items-start gap-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3">
        <Lightbulb className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-300 leading-relaxed">
          {assignments.length === 0
            ? "You're all caught up! Use your free time to review past notes or explore the Rewards store. 🎉"
            : xpPoints < 100
            ? "You're just starting out! Tackle smaller tasks first to build momentum and earn your first XP."
            : "Great progress! Prioritise the tasks due soonest and take a 10-min break every 45 minutes for best results."}
        </p>
      </div>

      {/* Schedule slots */}
      <div className="px-4 pb-5 space-y-2.5">
        {plan.map(({ slot, task, gradient }, i) => (
          <div
            key={i}
            className={`rounded-xl overflow-hidden ${task ? '' : 'opacity-40'}`}
          >
            {task ? (
              <div className={`bg-gradient-to-r ${gradient} p-px rounded-xl`}>
                <div className="bg-slate-800 rounded-[11px] px-3.5 py-2.5 flex items-center gap-3">
                  <div className="flex-shrink-0 text-center">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5 whitespace-nowrap">
                      {slot.split(' – ')[0]}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400">{task.classes?.name ?? 'Assignment'}</span>
                      <span className="text-[10px] text-slate-500">·</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5 text-yellow-400" />
                        {estimateMins(task)} min
                      </span>
                    </div>
                  </div>
                  <div className={`text-[10px] font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
                    +{task.xp_reward} XP
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-700/30 border border-slate-600/30 rounded-xl px-3.5 py-2.5 flex items-center gap-3">
                <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-slate-500">{slot}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">Free slot — review or relax 🎯</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="border-t border-slate-700/50 px-5 py-3 flex items-center justify-between">
        <p className="text-xs text-slate-500">Powered by EduSpark AI</p>
        <button className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition">
          Customise plan
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
