import { Clock, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react'
import type { Database } from '@/types/database.types'

// ── Types ──────────────────────────────────────────────────────
type AssignmentRow = Database['public']['Tables']['assignments']['Row'] & {
  classes?: { name: string | null } | null
}

interface DailyScheduleProps {
  assignments: AssignmentRow[]
}

// Sample daily timetable — in production this would come from a classes/timetable table
const TIMETABLE = [
  { time: '08:00', duration: '45 min', subject: 'Mathematics',   color: 'indigo',  emoji: '📐' },
  { time: '08:55', duration: '45 min', subject: 'Physics',       color: 'sky',     emoji: '⚗️'  },
  { time: '10:00', duration: '45 min', subject: 'Literature',    color: 'violet',  emoji: '📖' },
  { time: '10:55', duration: '45 min', subject: 'History',       color: 'amber',   emoji: '🏛️'  },
  { time: '12:30', duration: '45 min', subject: 'Chemistry',     color: 'emerald', emoji: '🧪' },
  { time: '13:25', duration: '45 min', subject: 'English',       color: 'rose',    emoji: '✍️'  },
]

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  dot: 'bg-indigo-500'  },
  sky:     { bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200',     dot: 'bg-sky-500'     },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  dot: 'bg-violet-500'  },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    dot: 'bg-rose-500'    },
}

function getNowMinutes() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export default function DailySchedule({ assignments }: DailyScheduleProps) {
  const nowMins = getNowMinutes()

  // Map assignment class names to timetable subjects (fuzzy match)
  const assignmentSubjects = new Set(
    assignments.map((a) => a.classes?.name?.toLowerCase() ?? '').filter(Boolean)
  )

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50">
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 text-sm leading-tight">Dars Jadvali</h2>
            <p className="text-xs text-slate-400">Today's class schedule</p>
          </div>
        </div>
        <span className="text-xs font-medium bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full">
          {TIMETABLE.length} classes
        </span>
      </div>

      {/* Timeline */}
      <div className="px-4 pb-4 space-y-1.5">
        {TIMETABLE.map((cls, i) => {
          const clsMins   = timeToMinutes(cls.time)
          const endMins   = clsMins + parseInt(cls.duration)
          const isNow     = nowMins >= clsMins && nowMins < endMins
          const isPast    = nowMins >= endMins
          const colors    = COLOR_MAP[cls.color]
          const hasHw     = Array.from(assignmentSubjects).some((s) =>
            s.includes(cls.subject.toLowerCase()) || cls.subject.toLowerCase().includes(s)
          )

          return (
            <div
              key={i}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all ${
                isNow
                  ? `${colors.bg} ${colors.border} shadow-sm`
                  : isPast
                  ? 'bg-slate-50 border-slate-100 opacity-50'
                  : 'bg-white border-slate-100 hover:border-slate-200'
              }`}
            >
              {/* Time */}
              <div className="w-12 flex-shrink-0 text-center">
                <span className={`text-xs font-bold tabular-nums ${isNow ? colors.text : 'text-slate-500'}`}>
                  {cls.time}
                </span>
              </div>

              {/* Dot connector */}
              <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                <div className={`w-2.5 h-2.5 rounded-full ${isNow ? colors.dot : isPast ? 'bg-slate-300' : 'bg-slate-200'}`} />
              </div>

              {/* Subject */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{cls.emoji}</span>
                  <span className={`text-sm font-semibold truncate ${isNow ? colors.text : 'text-slate-700'}`}>
                    {cls.subject}
                  </span>
                  {isNow && (
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-white px-1.5 py-0.5 rounded-full text-emerald-600 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                      Now
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">{cls.duration}</span>
              </div>

              {/* HW badge */}
              {hasHw && !isPast && (
                <div className="flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex-shrink-0">
                  <BookOpen className="w-3 h-3" />
                  HW due
                </div>
              )}
              {isPast && (
                <CheckCircle2 className="w-4 h-4 text-slate-300 flex-shrink-0" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
