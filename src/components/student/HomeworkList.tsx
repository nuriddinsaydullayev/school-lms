'use client'

import { useState, useTransition } from 'react'
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns'
import {
  ClipboardList,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronRight,
  Loader2,
  X,
  Send,
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { submitAssignment } from '@/app/actions/homework'
import type { Database } from '@/types/database.types'

// ── Types ──────────────────────────────────────────────────────
type AssignmentRow = Database['public']['Tables']['assignments']['Row']

// The page passes assignments with the nested classes join
export type AssignmentWithClass = AssignmentRow & {
  classes: { name: string; subject: string | null } | null
}

interface HomeworkListProps {
  assignments: AssignmentWithClass[]
}

// ── Helpers ────────────────────────────────────────────────────
const SUBJECT_COLORS: Record<string, string> = {
  Mathematics:       'bg-indigo-100 text-indigo-700',
  Physics:           'bg-violet-100 text-violet-700',
  'English Literature': 'bg-emerald-100 text-emerald-700',
  'Computer Science':'bg-amber-100 text-amber-700',
  Chemistry:         'bg-rose-100 text-rose-700',
  Biology:           'bg-teal-100 text-teal-700',
}

function subjectColor(subject: string | null | undefined) {
  return subject
    ? SUBJECT_COLORS[subject] ?? 'bg-slate-100 text-slate-600'
    : 'bg-slate-100 text-slate-600'
}

function dueDateMeta(dueDate: string | null): {
  label: string; urgent: boolean; overdue: boolean
} {
  if (!dueDate) return { label: 'No due date', urgent: false, overdue: false }
  const d = new Date(dueDate)
  if (isPast(d))     return { label: `Overdue · ${format(d, 'd MMM')}`,     urgent: true,  overdue: true  }
  if (isToday(d))    return { label: 'Due today',                             urgent: true,  overdue: false }
  if (isTomorrow(d)) return { label: 'Due tomorrow',                          urgent: true,  overdue: false }
  return { label: `Due ${formatDistanceToNow(d, { addSuffix: true })}`,       urgent: false, overdue: false }
}

// ── Submission Modal ────────────────────────────────────────────
function SubmitModal({
  assignment,
  onClose,
  onSuccess,
}: {
  assignment: AssignmentWithClass
  onClose: () => void
  onSuccess: (id: string) => void
}) {
  const [content, setContent]   = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return

    startTransition(async () => {
      const result = await submitAssignment(assignment.id, content.trim())
      if (result.success) {
        toast.success(`Submitted! +${assignment.token_reward} tokens · +${assignment.xp_reward} XP earned 🎉`)
        onSuccess(assignment.id)
        onClose()
      } else {
        toast.error(result.error ?? 'Submission failed. Please try again.')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-800">{assignment.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {assignment.classes?.subject ?? 'Assignment'} · Max {assignment.max_score} pts
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Rewards preview */}
          <div className="flex gap-3">
            <div className="flex-1 bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-emerald-700">+{assignment.xp_reward}</p>
              <p className="text-xs text-emerald-600">XP on submit</p>
            </div>
            <div className="flex-1 bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-amber-700">+{assignment.token_reward}</p>
              <p className="text-xs text-amber-600">Tokens earned</p>
            </div>
          </div>

          {/* Answer textarea */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Your Answer
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your answer here…"
              required
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none transition"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!content.trim() || isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {isPending ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Assignment Row ─────────────────────────────────────────────
function AssignmentRow({
  assignment,
  checked,
  onCheck,
  onSubmitClick,
}: {
  assignment: AssignmentWithClass
  checked: boolean
  onCheck: () => void
  onSubmitClick: () => void
}) {
  const { label, urgent, overdue } = dueDateMeta(assignment.due_date)
  const subject = assignment.classes?.subject ?? null

  return (
    <div
      className={`group flex items-start gap-3 p-4 rounded-xl border transition-all duration-200 ${
        checked
          ? 'bg-slate-50 border-slate-100 opacity-60'
          : overdue
          ? 'bg-rose-50/50 border-rose-100 hover:border-rose-200'
          : urgent
          ? 'bg-amber-50/40 border-amber-100 hover:border-amber-200'
          : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
      }`}
    >
      {/* Checkbox (local UI state only) */}
      <button
        onClick={onCheck}
        aria-label={checked ? 'Mark incomplete' : 'Mark complete'}
        className="mt-0.5 flex-shrink-0 text-slate-300 hover:text-indigo-500 transition-colors"
      >
        {checked
          ? <CheckCircle2 className="w-5 h-5 text-indigo-500" />
          : <Circle       className="w-5 h-5" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className={`font-medium text-sm leading-snug ${checked ? 'line-through text-slate-400' : 'text-slate-800'}`}>
            {assignment.title}
          </p>
          {/* Due date badge */}
          <span className={`flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            overdue ? 'bg-rose-100 text-rose-700'   :
            urgent  ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-500'
          }`}>
            {(overdue || urgent) && <AlertCircle className="w-3 h-3" />}
            {label}
          </span>
        </div>

        <div className="flex items-center flex-wrap gap-2 mt-1.5">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${subjectColor(subject)}`}>
            {subject ?? assignment.classes?.name ?? 'Assignment'}
          </span>
          <span className="text-xs text-slate-400">
            +{assignment.xp_reward} XP · +{assignment.token_reward} tokens
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
        {/* Submit button */}
        {!checked && (
          <button
            onClick={onSubmitClick}
            className="hidden group-hover:flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            <Send size={12} />
            Submit
          </button>
        )}
        {/* Detail link */}
        <Link
          href={`/student/assignments/${assignment.id}`}
          className="p-1.5 rounded-lg text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-all"
          aria-label={`Open ${assignment.title}`}
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────
export default function HomeworkList({ assignments }: HomeworkListProps) {
  const [checked,       setChecked]       = useState<Set<string>>(new Set())
  const [submitting,    setSubmitting]    = useState<AssignmentWithClass | null>(null)
  // After real submit, move assignment out of the list locally
  const [submittedIds,  setSubmittedIds]  = useState<Set<string>>(new Set())

  const visible = assignments.filter((a) => !submittedIds.has(a.id))
  const pending  = visible.filter((a) => !checked.has(a.id))
  const done     = visible.filter((a) =>  checked.has(a.id))

  const completionPct = visible.length
    ? Math.round((done.length / visible.length) * 100)
    : 100

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function onSubmitSuccess(id: string) {
    setSubmittedIds((prev) => new Set(prev).add(id))
    setChecked((prev) => { const n = new Set(prev); n.delete(id); return n })
  }

  return (
    <>
      {/* Submit Modal */}
      {submitting && (
        <SubmitModal
          assignment={submitting}
          onClose={() => setSubmitting(null)}
          onSuccess={onSubmitSuccess}
        />
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-50">
                <ClipboardList className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-800 text-sm">Homework</h2>
                <p className="text-xs text-slate-400">
                  {pending.length} pending · {done.length + submittedIds.size} done
                </p>
              </div>
            </div>
            <span className="text-sm font-bold text-slate-700">{completionPct}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">

          {/* Pending */}
          {pending.length > 0 && (
            <div className="space-y-2">
              {pending.map((a) => (
                <AssignmentRow
                  key={a.id}
                  assignment={a}
                  checked={false}
                  onCheck={() => toggle(a.id)}
                  onSubmitClick={() => setSubmitting(a)}
                />
              ))}
            </div>
          )}

          {/* Marked done locally */}
          {done.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide pt-2">
                Marked done
              </p>
              {done.map((a) => (
                <AssignmentRow
                  key={a.id}
                  assignment={a}
                  checked
                  onCheck={() => toggle(a.id)}
                  onSubmitClick={() => setSubmitting(a)}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {pending.length === 0 && done.length === 0 && (
            <div className="text-center py-10">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="font-medium text-slate-600">All caught up!</p>
              <p className="text-xs text-slate-400 mt-1">No pending assignments 🎉</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
