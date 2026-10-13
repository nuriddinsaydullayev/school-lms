'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  Calendar,
  Plus,
  Trash2,
  Clock,
  MapPin,
  BookOpen,
  Loader2,
  Building2,
  Filter,
  Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { createScheduleEntry, deleteScheduleEntry } from '@/app/actions/schedule'
import { ScheduleEntry, DAYS_OF_WEEK, formatTime } from '@/types/schedule'
import AiScheduleModal from './AiScheduleModal'

interface ClassOption {
  id: string
  name: string
  subject: string | null
  teacher?: {
    full_name: string
  } | null
}

interface AdminScheduleManagerProps {
  classes: ClassOption[]
  initialSchedules: ScheduleEntry[]
}

export default function AdminScheduleManager({
  classes,
  initialSchedules,
}: AdminScheduleManagerProps) {
  const [schedules, setSchedules] = useState<ScheduleEntry[]>(initialSchedules)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)

  useEffect(() => {
    setSchedules(initialSchedules)
  }, [initialSchedules])

  const [selectedClassId, setSelectedClassId] = useState<string>(
    classes[0]?.id || ''
  )
  const [filterClassId, setFilterClassId] = useState<string>('all')

  // Form states
  const [subject, setSubject] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState<number>(1)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [roomNumber, setRoomNumber] = useState('')

  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Handle class selection change in creation form: auto-fill subject if available
  function handleClassSelect(classId: string) {
    setSelectedClassId(classId)
    const cls = classes.find((c) => c.id === classId)
    if (cls?.subject) {
      setSubject(cls.subject)
    }
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedClassId) {
      toast.error('Please select a class.')
      return
    }

    if (!subject.trim()) {
      toast.error('Subject name is required.')
      return
    }

    if (startTime >= endTime) {
      toast.error('Start time must be before end time.')
      return
    }

    startTransition(async () => {
      const res = await createScheduleEntry({
        class_id: selectedClassId,
        subject: subject.trim(),
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        room_number: roomNumber.trim() || undefined,
      })

      if (res.success) {
        toast.success('Schedule entry added!')
        const cls = classes.find((c) => c.id === selectedClassId)
        // Optimistic local add
        const newEntry: ScheduleEntry = {
          id: 'temp-' + Date.now(),
          school_id: null,
          class_id: selectedClassId,
          subject: subject.trim(),
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          room_number: roomNumber.trim() || null,
          classes: cls ? { id: cls.id, name: cls.name } : null,
        }
        setSchedules((prev) => [...prev, newEntry])
        setRoomNumber('')
      } else {
        toast.error(res.error || 'Failed to create schedule entry')
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Are you sure you want to remove this timetable entry?')) return

    setDeletingId(id)
    startTransition(async () => {
      const res = await deleteScheduleEntry(id)
      if (res.success) {
        toast.success('Schedule entry deleted.')
        setSchedules((prev) => prev.filter((s) => s.id !== id))
      } else {
        toast.error(res.error || 'Failed to delete entry')
      }
      setDeletingId(null)
    })
  }

  // Filtered schedules
  const displayedSchedules = schedules.filter(
    (s) => filterClassId === 'all' || s.class_id === filterClassId
  )

  // Group schedules by day of week
  const schedulesByDay = DAYS_OF_WEEK.map((day) => ({
    ...day,
    entries: displayedSchedules
      .filter((s) => s.day_of_week === day.value)
      .sort((a, b) => a.start_time.localeCompare(b.start_time)),
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* ── Left Column: Add Schedule Entry Form ── */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 text-base">Add Timetable Slot</h2>
              <p className="text-xs text-slate-400">Schedule periods for any classroom</p>
            </div>
          </div>

          {classes.length === 0 ? (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
              No classes found. Please create at least one class first.
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Select Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => handleClassSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.teacher ? `(${c.teacher.full_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Subject / Topic <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Advanced Mathematics"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Day of the Week <span className="text-red-500">*</span>
                </label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Room / Venue (Optional)
                </label>
                <input
                  type="text"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="e.g. Science Lab 101"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <button
                type="submit"
                disabled={isPending || !selectedClassId}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding Slot...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Schedule Entry
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── Right Column: Timetable Grid & Entries ── */}
      <div className="lg:col-span-7 space-y-6">
        {/* Filter & AI Generator Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Filter size={16} className="text-amber-600" />
              <span>Filter:</span>
            </div>

            <select
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="all">All Classes ({schedules.length} slots)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Glowing AI Auto-Schedule Button */}
          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="relative group inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-amber-500/25 hover:shadow-lg hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <span className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 opacity-0 group-hover:opacity-40 blur-xs transition duration-200" />
            <Sparkles className="w-4 h-4 animate-pulse relative z-10 text-amber-100" />
            <span className="relative z-10">✨ AI Auto-Schedule</span>
          </button>
        </div>

        {/* AI Schedule Modal */}
        <AiScheduleModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          classesCount={classes.length}
        />

        {/* Weekly Day Cards */}
        <div className="space-y-4">
          {schedulesByDay.map((day) => (
            <div
              key={day.value}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
            >
              <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">{day.label}</h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {day.entries.length} {day.entries.length === 1 ? 'period' : 'periods'}
                </span>
              </div>

              <div className="p-4">
                {day.entries.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2 text-center">
                    No classes scheduled for {day.label}.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {day.entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {entry.subject}
                            </span>
                            {entry.classes?.name && (
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                                {entry.classes.name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1 text-amber-700 font-medium">
                              <Clock size={12} />
                              {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                            </span>
                            {entry.room_number && (
                              <span className="flex items-center gap-1 text-slate-400">
                                <MapPin size={12} />
                                {entry.room_number}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDelete(entry.id)}
                          disabled={deletingId === entry.id}
                          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Remove from schedule"
                        >
                          {deletingId === entry.id ? (
                            <Loader2 size={16} className="animate-spin text-rose-500" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
