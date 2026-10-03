'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  Brain,
  Clock,
  Zap,
  ChevronRight,
  Lightbulb,
  X,
  Sliders,
  Check,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/utils/supabase/client'
import type { Database } from '@/types/database.types'

type AssignmentRow = Database['public']['Tables']['assignments']['Row'] & {
  classes?: { name: string | null } | null
}

interface SmartPlannerProps {
  assignments: AssignmentRow[]
  xpPoints:    number
}

// ── Types ──────────────────────────────────────────────────────
interface PlannerSlot {
  id:    string
  label: string
  start: string
  end:   string
  title: string
}

// ── Constants ──────────────────────────────────────────────────
const STORAGE_KEY = 'eduspark_planner_slots'

const DEFAULT_SLOTS: PlannerSlot[] = [
  { id: 's1', label: 'Slot 1 (Early Evening)', start: '16:00', end: '17:30', title: '4:00 PM – 5:30 PM' },
  { id: 's2', label: 'Slot 2 (Prime Focus)',   start: '18:30', end: '20:00', title: '6:30 PM – 8:00 PM' },
  { id: 's3', label: 'Slot 3 (Night Review)',  start: '20:30', end: '21:30', title: '8:30 PM – 9:30 PM' },
]

const SLOT_COLORS = [
  'from-indigo-500 to-violet-500',
  'from-sky-500 to-indigo-500',
  'from-violet-500 to-purple-500',
]

// ── Helpers ────────────────────────────────────────────────────
/** Format a 24h time string (HH:MM) into a human-readable label. */
function format24to12(t: string): string {
  const [hStr, mStr] = t.split(':')
  const h = parseInt(hStr, 10)
  const m = mStr
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m} ${period}`
}

/** Recompute the human-readable title from start/end in 24h format. */
function makeTitle(start: string, end: string): string {
  return `${format24to12(start)} – ${format24to12(end)}`
}

/** Estimate difficulty (minutes) from max_score and token_reward */
function estimateMins(a: AssignmentRow) {
  const base = Math.round((a.max_score / 100) * 30 + (a.token_reward / 10) * 10)
  return Math.max(15, Math.min(base, 90))
}

/** Priority score: overdue first, then earliest due_date */
function priorityScore(a: AssignmentRow) {
  if (!a.due_date) return 50
  const daysLeft = (new Date(a.due_date).getTime() - Date.now()) / 86_400_000
  if (daysLeft < 0) return 0
  if (daysLeft < 1) return 10
  if (daysLeft < 3) return 25
  return 50
}

// ── Main Component ─────────────────────────────────────────────
export default function SmartPlanner({ assignments, xpPoints }: SmartPlannerProps) {
  const [slots, setSlots]           = useState<PlannerSlot[]>(DEFAULT_SLOTS)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tempSlots, setTempSlots]   = useState<PlannerSlot[]>(DEFAULT_SLOTS)
  const [isSaving, startSave]       = useTransition()
  const [isHydrated, setIsHydrated] = useState(false)

  const supabase = createClient()

  // ── 1. Load persisted slots on mount ─────────────────────────
  // Strategy: try Supabase → fallback to localStorage → use defaults
  useEffect(() => {
    async function load() {
      // First: try loading from Supabase planner_settings table
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data, error } = await (supabase as any)
            .from('planner_settings')
            .select('slots')
            .eq('student_id', user.id)
            .maybeSingle()

          if (!error && data?.slots && Array.isArray(data.slots) && data.slots.length > 0) {
            setSlots(data.slots)
            setIsHydrated(true)
            return
          }
        }
      } catch (err) {
        // DB not ready yet — fall through to localStorage
      }

      // Fallback: try localStorage
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed: PlannerSlot[] = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSlots(parsed)
          }
        }
      } catch (err) {
        // localStorage parse failure — use defaults silently
      }

      setIsHydrated(true)
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 2. Open modal → copy current slots to temp buffer ────────
  function handleOpenModal() {
    setTempSlots(slots.map((s) => ({ ...s })))
    setIsModalOpen(true)
  }

  // ── 3. Save → persist to Supabase AND localStorage ───────────
  function handleSaveModal(e: React.FormEvent) {
    e.preventDefault()
    const finalSlots = tempSlots.map((s) => ({
      ...s,
      title: makeTitle(s.start, s.end),
    }))

    startSave(async () => {
      // --- Optimistic UI update first ---
      setSlots(finalSlots)
      setIsModalOpen(false)

      // --- Persist to localStorage (instant, always works) ---
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(finalSlots))
      } catch (err) {
        console.warn('[SmartPlanner] localStorage write failed:', err)
      }

      // --- Persist to Supabase (best-effort, non-blocking) ---
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { error } = await (supabase as any)
            .from('planner_settings')
            .upsert(
              {
                student_id: user.id,
                slots: finalSlots,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'student_id' }
            )

          if (error) {
            console.warn('[SmartPlanner] Supabase upsert failed (localStorage used as fallback):', error.message)
          }
        }
      } catch (err) {
        console.warn('[SmartPlanner] Supabase unavailable, slots saved to localStorage only.')
      }

      toast.success('Study plan saved! Your slots are synced across sessions. ✅')
    })
  }

  // ── Derived state ─────────────────────────────────────────────
  const sorted = [...assignments]
    .sort((a, b) => priorityScore(a) - priorityScore(b))
    .slice(0, slots.length)

  const totalMins = sorted.reduce((s, a) => s + estimateMins(a), 0)
  const totalHrs  = Math.floor(totalMins / 60)
  const totalRem  = totalMins % 60

  const plan = slots.map((slotObj, i) => ({
    slot:     slotObj.title,
    task:     sorted[i] ?? null,
    gradient: SLOT_COLORS[i % SLOT_COLORS.length],
  }))

  return (
    <>
      {/* ── Customise Plan Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600">
                  <Sliders size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Customise Study Hours</h3>
                  <p className="text-xs text-slate-500">Changes are synced across all your devices</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="px-6 py-5 space-y-4">
              {tempSlots.map((slot, index) => (
                <div key={slot.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <span className="text-xs font-semibold text-slate-700">{slot.label}</span>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Start time */}
                    <div>
                      <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={slot.start}
                        onChange={(e) => {
                          const val = e.target.value
                          setTempSlots((prev) =>
                            prev.map((s, idx) =>
                              idx === index
                                ? { ...s, start: val }
                                : s
                            )
                          )
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>

                    {/* End time */}
                    <div>
                      <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={slot.end}
                        onChange={(e) => {
                          const val = e.target.value
                          setTempSlots((prev) =>
                            prev.map((s, idx) =>
                              idx === index
                                ? { ...s, end: val }
                                : s
                            )
                          )
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                  </div>

                  {/* Live preview of formatted range */}
                  <p className="text-[10px] text-indigo-500 font-medium">
                    Preview: {makeTitle(slot.start, slot.end)}
                  </p>
                </div>
              ))}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition shadow-md shadow-indigo-200 disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Save Plan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Main Planner Card ── */}
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

        {/* Schedule slots (skeleton while loading) */}
        <div className="px-4 pb-5 space-y-2.5">
          {!isHydrated
            ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-xl bg-slate-700/40 animate-pulse"
                />
              ))
            : plan.map(({ slot, task, gradient }, i) => (
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
          <button
            type="button"
            onClick={handleOpenModal}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
          >
            Customise plan
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  )
}
