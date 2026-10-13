'use client'

import { useState } from 'react'
import {
  CalendarDays,
  Clock,
  MapPin,
  BookOpen,
  User,
  GraduationCap,
} from 'lucide-react'
import { ScheduleEntry, DAYS_OF_WEEK, formatTime } from '@/types/schedule'

interface TimetableGridProps {
  schedules: ScheduleEntry[]
  role: 'student' | 'teacher'
  emptyMessage?: string
}

export default function TimetableGrid({
  schedules,
  role,
  emptyMessage = 'No scheduled classes found.',
}: TimetableGridProps) {
  // Current day of week (Monday=1 .. Sunday=0/7 -> map Sunday to 1 for fallback)
  const currentJsDay = new Date().getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const initialActiveDay = currentJsDay === 0 ? 1 : currentJsDay

  const [activeDay, setActiveDay] = useState<number>(initialActiveDay)

  // Filter schedules by day
  const dailyEntries = schedules
    .filter((s) => s.day_of_week === activeDay)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  return (
    <div className="space-y-6">
      {/* ── Day of Week Tabs ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {DAYS_OF_WEEK.map((day) => {
          const count = schedules.filter((s) => s.day_of_week === day.value).length
          const isSelected = activeDay === day.value
          const isToday = currentJsDay === day.value

          return (
            <button
              key={day.value}
              onClick={() => setActiveDay(day.value)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span>{day.label}</span>
              {isToday && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    isSelected
                      ? 'bg-indigo-500 text-white'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  Today
                </span>
              )}
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                  isSelected
                    ? 'bg-slate-800 text-slate-300'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Day Schedule Timeline ── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 sm:p-8">
        <div className="flex items-center justify-between pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {DAYS_OF_WEEK.find((d) => d.value === activeDay)?.label} Classes
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {dailyEntries.length} periods scheduled
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
          </div>
        </div>

        <div className="mt-6">
          {dailyEntries.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto text-slate-300">
                <CalendarDays size={24} />
              </div>
              <p className="text-sm font-medium text-slate-600">No classes scheduled</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">{emptyMessage}</p>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 border-l-2 border-indigo-100 space-y-6 my-2">
              {dailyEntries.map((entry, idx) => (
                <div key={entry.id} className="relative group">
                  {/* Timeline bullet dot */}
                  <div className="absolute -left-[31px] sm:-left-[39px] top-4 w-4 h-4 rounded-full border-2 border-white bg-indigo-600 ring-4 ring-indigo-50 group-hover:scale-125 transition-transform" />

                  <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-200 hover:shadow-md transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="font-bold text-slate-900 text-base">
                            {entry.subject}
                          </h3>
                          {entry.classes?.name && (
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                              {entry.classes.name}
                            </span>
                          )}
                        </div>

                        {role === 'student' && entry.classes?.teacher && (
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                            <User size={13} className="text-slate-400" />
                            Instructor: {entry.classes.teacher.full_name}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
                        <Clock size={13} className="text-indigo-600" />
                        <span>
                          {formatTime(entry.start_time)} – {formatTime(entry.end_time)}
                        </span>
                      </div>
                    </div>

                    {entry.room_number && (
                      <div className="pt-3 border-t border-slate-200/60 flex items-center gap-2 text-xs text-slate-500">
                        <MapPin size={13} className="text-slate-400" />
                        <span>
                          Location:{' '}
                          <span className="font-semibold text-slate-700">
                            {entry.room_number}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
