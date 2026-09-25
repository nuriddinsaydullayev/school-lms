import { Clock, MapPin, BookOpen } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────
interface ClassSession {
  id: string
  subject: string
  teacher: string
  room: string
  startTime: string   // "HH:mm"
  endTime: string
  color: string       // Tailwind colour token stem (e.g. "indigo")
}

// ── Mock data ─────────────────────────────────────────────────
// Replace with: supabase.from('class_enrollments').select('classes(*)') filtered to today
const TODAY_SCHEDULE: ClassSession[] = [
  {
    id: '1',
    subject: 'Mathematics',
    teacher: 'Ms. Aisha Raza',
    room: 'Room 101',
    startTime: '08:00',
    endTime: '09:00',
    color: 'indigo',
  },
  {
    id: '2',
    subject: 'Physics',
    teacher: 'Mr. Tariq Hussain',
    room: 'Room 204',
    startTime: '09:15',
    endTime: '10:15',
    color: 'violet',
  },
  {
    id: '3',
    subject: 'English Literature',
    teacher: 'Ms. Fatima Malik',
    room: 'Room 112',
    startTime: '10:30',
    endTime: '11:30',
    color: 'emerald',
  },
  {
    id: '4',
    subject: 'Computer Science',
    teacher: 'Mr. Usman Baig',
    room: 'Lab 1',
    startTime: '13:00',
    endTime: '14:00',
    color: 'amber',
  },
]

// ── Helpers ────────────────────────────────────────────────────
const COLOR_MAP: Record<string, { dot: string; badge: string; border: string }> = {
  indigo:  { dot: 'bg-indigo-500',  badge: 'bg-indigo-50 text-indigo-700',  border: 'border-indigo-200' },
  violet:  { dot: 'bg-violet-500',  badge: 'bg-violet-50 text-violet-700',  border: 'border-violet-200' },
  emerald: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700',border: 'border-emerald-200' },
  amber:   { dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700',    border: 'border-amber-200' },
  rose:    { dot: 'bg-rose-500',    badge: 'bg-rose-50 text-rose-700',      border: 'border-rose-200' },
}

function getSessionStatus(startTime: string, endTime: string): 'past' | 'active' | 'upcoming' {
  const now   = new Date()
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const start = new Date(now); start.setHours(sh, sm, 0, 0)
  const end   = new Date(now); end.setHours(eh, em, 0, 0)

  if (now < start) return 'upcoming'
  if (now >= start && now <= end) return 'active'
  return 'past'
}

// ── Component ──────────────────────────────────────────────────
export default function ScheduleCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50">
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 text-sm">Today's Schedule</h2>
            <p className="text-xs text-slate-400">{TODAY_SCHEDULE.length} classes</p>
          </div>
        </div>
        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
          Monday
        </span>
      </div>

      {/* Timeline */}
      <div className="px-5 py-4 space-y-0">
        {TODAY_SCHEDULE.map((session, index) => {
          const status = getSessionStatus(session.startTime, session.endTime)
          const colors = COLOR_MAP[session.color] ?? COLOR_MAP.indigo
          const isLast = index === TODAY_SCHEDULE.length - 1

          return (
            <div key={session.id} className="flex gap-3">
              {/* Time axis */}
              <div className="flex flex-col items-center flex-shrink-0 w-10">
                <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${
                  status === 'active'   ? colors.dot + ' ring-4 ring-indigo-100' :
                  status === 'past'     ? 'bg-slate-200' :
                                          colors.dot
                }`} />
                {!isLast && <div className="w-px flex-1 bg-slate-100 my-1" />}
              </div>

              {/* Card */}
              <div className={`flex-1 mb-3 rounded-xl border p-3 transition-all ${
                status === 'active'
                  ? `${colors.border} bg-gradient-to-r from-white to-slate-50 shadow-sm`
                  : status === 'past'
                  ? 'border-slate-100 bg-slate-50 opacity-60'
                  : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-semibold text-sm truncate ${status === 'past' ? 'text-slate-400' : 'text-slate-800'}`}>
                        {session.subject}
                      </p>
                      {status === 'active' && (
                        <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{session.teacher}</p>
                  </div>
                  <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge}`}>
                    {session.startTime}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    {session.startTime} – {session.endTime}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <MapPin className="w-3 h-3" />
                    {session.room}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
