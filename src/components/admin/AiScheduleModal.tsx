'use client'

import { useState, useTransition } from 'react'
import {
  Sparkles,
  Loader2,
  X,
  Wand2,
  Clock,
  Layers,
  BookOpen,
  Sliders,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { generateScheduleWithAI } from '@/app/actions/schedule'

interface AiScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  classesCount: number
}

const PRESET_WORKLOADS = [
  'Math: 5, English: 5, Science: 4, History: 3, PE: 2, Art: 1',
  'Math: 6, Physics: 4, Chemistry: 4, English: 3, Computer: 3',
  'Core Subjects: 5 periods each, Electives: 2 periods each',
]

const PRESET_CONSTRAINTS = [
  'No PE on Monday first period',
  'Math and Science only in morning blocks',
  'Double period for Science lab on Wednesday',
  'Spread teacher workloads evenly across the week',
]

export default function AiScheduleModal({
  isOpen,
  onClose,
  onSuccess,
  classesCount,
}: AiScheduleModalProps) {
  // Structured configuration states
  const [schoolStartTime, setSchoolStartTime] = useState('08:00')
  const [periodDuration, setPeriodDuration] = useState(45)
  const [breakDuration, setBreakDuration] = useState(5)
  const [maxPeriodsPerDay, setMaxPeriodsPerDay] = useState(6)
  const [curriculumWorkload, setCurriculumWorkload] = useState(
    'Math: 5, Science: 4, English: 4, Social Studies: 3, PE: 2, Art: 2'
  )
  const [additionalConstraints, setAdditionalConstraints] = useState('')

  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (!isOpen) return null

  // Calculate total daily hours preview
  const totalMins = maxPeriodsPerDay * periodDuration + (maxPeriodsPerDay - 1) * breakDuration
  const [stH, stM] = schoolStartTime.split(':').map((v) => parseInt(v, 10))
  const endTotalMins = (isNaN(stH) ? 8 : stH) * 60 + (isNaN(stM) ? 0 : stM) + totalMins
  const endHour = Math.floor(endTotalMins / 60)
    .toString()
    .padStart(2, '0')
  const endMinute = (endTotalMins % 60).toString().padStart(2, '0')
  const calculatedEndTime = `${endHour}:${endMinute}`

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    startTransition(async () => {
      const res = await generateScheduleWithAI({
        school_start_time: schoolStartTime,
        period_duration_minutes: periodDuration,
        break_duration_minutes: breakDuration,
        max_periods_per_day: maxPeriodsPerDay,
        curriculum_workload: curriculumWorkload.trim(),
        additional_constraints: additionalConstraints.trim(),
      })

      if (res.success) {
        toast.success(
          `✨ Timetable generated! Successfully scheduled ${res.count || 0} dense periods across Monday–Friday.`,
          { duration: 5000 }
        )
        router.refresh()
        if (onSuccess) onSuccess()
        onClose()
      } else {
        toast.error(res.error || 'Failed to generate timetable with AI.')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="fixed inset-0"
        onClick={() => {
          if (!isPending) onClose()
        }}
      />

      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in zoom-in-95 duration-200 my-8">
        {/* Glowing Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-6 text-white relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md">
                <Sparkles className="w-6 h-6 text-amber-100" />
              </div>
              <div>
                <h3 className="font-bold text-lg sm:text-xl text-white">
                  High-Density AI Timetable Generator
                </h3>
                <p className="text-xs text-amber-100/90 mt-0.5">
                  Pre-computes rigid periods and solves teacher/room allocation with Gemini 3.8
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-6">
          {/* Section 1: Pre-computed Daily Bell Schedule */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Clock size={14} className="text-amber-600" />
                1. School Day Bell Schedule
              </span>
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                Estimated day: {schoolStartTime} – {calculatedEndTime}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 block">Start Time</label>
                <input
                  type="time"
                  required
                  value={schoolStartTime}
                  disabled={isPending}
                  onChange={(e) => setSchoolStartTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 block">
                  Period Length
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min={20}
                    max={120}
                    required
                    value={periodDuration}
                    disabled={isPending}
                    onChange={(e) => setPeriodDuration(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <span className="text-[10px] text-slate-400 ml-1.5 font-medium">min</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 block">
                  Break Interval
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min={0}
                    max={30}
                    required
                    value={breakDuration}
                    disabled={isPending}
                    onChange={(e) => setBreakDuration(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <span className="text-[10px] text-slate-400 ml-1.5 font-medium">min</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 block">
                  Periods / Day
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min={2}
                    max={9}
                    required
                    value={maxPeriodsPerDay}
                    disabled={isPending}
                    onChange={(e) => setMaxPeriodsPerDay(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <span className="text-[10px] text-slate-400 ml-1.5 font-medium">slots</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Weekly Curriculum Workload */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Layers size={14} className="text-amber-600" />
                2. Weekly Curriculum Workload
              </label>
              <span className="text-[11px] text-slate-400">Total weekly capacity: ~{maxPeriodsPerDay * 5} slots</span>
            </div>

            <input
              type="text"
              required
              value={curriculumWorkload}
              disabled={isPending}
              onChange={(e) => setCurriculumWorkload(e.target.value)}
              placeholder="e.g. Math: 5, Science: 4, English: 4, History: 3, PE: 2"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
            />

            <div className="flex flex-wrap gap-1.5 pt-1">
              {PRESET_WORKLOADS.map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={isPending}
                  onClick={() => setCurriculumWorkload(preset)}
                  className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200 border border-slate-200/50 transition-colors"
                >
                  ⚡ {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Additional Constraints */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Sliders size={14} className="text-amber-600" />
              3. Custom Constraints & Teacher Rules
            </label>

            <textarea
              rows={2}
              value={additionalConstraints}
              disabled={isPending}
              onChange={(e) => setAdditionalConstraints(e.target.value)}
              placeholder="e.g. No PE on Monday first period; keep double science lab on Wednesday..."
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all resize-none"
            />

            <div className="flex flex-wrap gap-1.5">
              {PRESET_CONSTRAINTS.map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (!additionalConstraints) setAdditionalConstraints(preset)
                    else setAdditionalConstraints((prev) => `${prev.trim()}; ${preset}`)
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200 border border-slate-200/50 transition-colors"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <BookOpen size={14} className="text-slate-400" />
              <span>Targeting <strong>{classesCount}</strong> registered classes</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs sm:text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isPending || classesCount === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-xs sm:text-sm font-semibold shadow-md shadow-amber-500/25 transition-all hover:shadow-lg disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Solving Master Schedule...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Generate Full Timetable
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
