'use client'

import { useState, useTransition } from 'react'
import { Sparkles, Loader2, X, Wand2, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { generateScheduleWithAI } from '@/app/actions/schedule'

interface AiScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  classesCount: number
}

const PRESET_CONSTRAINTS = [
  'Math and Science every morning between 09:00 and 11:30',
  'No Physical Education on Monday mornings',
  'Spread classes evenly across Monday to Friday',
  'Avoid scheduling back-to-back classes for the same subject',
]

export default function AiScheduleModal({
  isOpen,
  onClose,
  onSuccess,
  classesCount,
}: AiScheduleModalProps) {
  const [constraints, setConstraints] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (!isOpen) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    startTransition(async () => {
      const res = await generateScheduleWithAI(constraints)
      if (res.success) {
        toast.success(`✨ Timetable generated! Added ${res.count || 0} schedule slots.`, {
          duration: 5000,
        })
        router.refresh()
        if (onSuccess) onSuccess()
        onClose()
      } else {
        toast.error(res.error || 'Failed to generate schedule with AI.')
      }
    })
  }

  function handleAddPreset(preset: string) {
    if (!constraints) {
      setConstraints(preset)
    } else {
      setConstraints((prev) => `${prev.trim()}; ${preset}`)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={() => {
          if (!isPending) onClose()
        }}
      />

      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Glowing Top Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-6 text-white relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
                <Sparkles className="w-5 h-5 text-amber-100" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">AI Auto-Schedule Generator</h3>
                <p className="text-xs text-amber-100/90">Powered by Google Gemini 3.8 Flash</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Timetable Rules & Custom Constraints
            </label>
            <p className="text-xs text-slate-500 leading-relaxed">
              Describe specific scheduling requirements for your {classesCount} registered classes.
              Gemini will coordinate timings, teachers, and rooms automatically without conflicts.
            </p>

            <textarea
              rows={4}
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              placeholder="e.g. Math every morning for 10-A, no PE on Monday, science labs scheduled in the afternoons..."
              disabled={isPending}
              className="w-full px-3.5 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Quick Preset Tags */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Quick Suggestions:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_CONSTRAINTS.map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleAddPreset(preset)}
                  className="text-xs px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 border border-slate-200/60 transition-colors text-left"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isPending}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isPending || classesCount === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-sm font-semibold shadow-md shadow-amber-500/20 transition-all hover:shadow-lg disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Schedule with Gemini...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate Timetable
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
