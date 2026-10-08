'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, Loader2, MessageSquare, AlertCircle, Coins, Sparkles, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { gradeSubmission } from '@/app/actions/teacher'
import type { SubmissionRow } from '@/types/database.types'
import { useRouter } from 'next/navigation'

// The data shape we expect from the joined query in page.tsx
export type PendingSubmission = SubmissionRow & {
  assignments: {
    title: string
    max_score: number
    token_reward?: number
    xp_reward?: number
  } | null
  profiles: { full_name: string } | null
}

interface SubmissionsGraderProps {
  submissions: PendingSubmission[]
}

export default function SubmissionsGrader({ submissions: initialSubmissions }: SubmissionsGraderProps) {
  const [submissions, setSubmissions] = useState<PendingSubmission[]>(initialSubmissions)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Keep in sync with server component updates
  if (initialSubmissions !== submissions && initialSubmissions.length !== submissions.length) {
    setSubmissions(initialSubmissions)
  }

  async function handleGradeAction(
    submissionId: string,
    score: number,
    feedback: string,
    decision: 'approve' | 'return'
  ) {
    startTransition(async () => {
      const res = await gradeSubmission(submissionId, score, feedback, decision)
      if (res.success) {
        if (decision === 'approve') {
          toast.success('Approved! Tokens & XP awarded to student. 🪙')
        } else {
          toast.success('Submission returned to student for revision.')
        }

        // Optimistically remove from pending list
        setSubmissions((prev) => prev.filter((s) => s.id !== submissionId))
        setActiveId(null)
        router.refresh()
      } else {
        toast.error(res.error || 'Failed to process submission.')
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-50">
            <CheckCircle className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 text-sm">Needs Grading</h2>
            <p className="text-xs text-slate-400">Pending student submissions</p>
          </div>
        </div>
        {submissions.length > 0 && (
          <span className="flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
            {submissions.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {submissions.length === 0 ? (
          <div className="text-center py-10 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-slate-800">All caught up!</p>
            <p className="text-xs text-slate-500 mt-1">No pending submissions to grade.</p>
          </div>
        ) : (
          submissions.map((sub) => {
            const isActive = activeId === sub.id
            const maxScore = sub.assignments?.max_score ?? 100
            const tokenReward = sub.assignments?.token_reward ?? 0
            const xpReward = sub.assignments?.xp_reward ?? 0

            return (
              <div key={sub.id} className="rounded-xl border border-slate-200 overflow-hidden bg-white transition-all">
                {/* Header / Clickable area */}
                <button
                  type="button"
                  onClick={() => setActiveId(isActive ? null : sub.id)}
                  className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 transition flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {sub.profiles?.full_name ?? 'Unknown Student'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-slate-500 truncate">
                        {sub.assignments?.title ?? 'Unknown Assignment'}
                      </p>
                      {tokenReward > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          <Coins size={10} /> +{tokenReward}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="flex-shrink-0 text-xs text-slate-400 font-medium whitespace-nowrap bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
                    {new Date(sub.submitted_at!).toLocaleDateString()}
                  </span>
                </button>

                {/* Expanded grading area */}
                {isActive && (
                  <div className="p-4 border-t border-slate-100 bg-white space-y-4 animate-in slide-in-from-top-2 duration-200">
                    
                    {/* Reward preview banner */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                      <span className="text-slate-500 font-medium">Upon Approval Reward:</span>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                          <Coins size={13} /> {tokenReward} Tokens
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="inline-flex items-center gap-1 font-bold text-indigo-600">
                          <Sparkles size={13} /> {xpReward} XP
                        </span>
                      </div>
                    </div>

                    {/* Student's answer */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                        <MessageSquare size={12} /> Student Answer
                      </p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {sub.content || <span className="italic text-slate-400">No content provided (maybe a file attachment).</span>}
                      </p>
                    </div>

                    {/* AI Feedback (if enabled) */}
                    {sub.ai_feedback && (
                      <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100/50">
                        <p className="text-xs font-semibold text-indigo-600 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertCircle size={12} /> AI Tutor Notes
                        </p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                          {sub.ai_feedback}
                        </p>
                      </div>
                    )}

                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        const form = new FormData(e.currentTarget)
                        const score = parseInt(form.get('score') as string, 10) || maxScore
                        const feedback = (form.get('feedback') as string) || ''
                        handleGradeAction(sub.id, score, feedback, 'approve')
                      }}
                      className="pt-2 border-t border-slate-100 space-y-3"
                    >
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-4 space-y-1.5">
                          <label className="block text-xs font-medium text-slate-700">Score (out of {maxScore})</label>
                          <input 
                            type="number" 
                            name="score" 
                            required 
                            min="0"
                            max={maxScore}
                            defaultValue={maxScore}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            placeholder={String(maxScore)}
                          />
                        </div>
                        <div className="col-span-8 space-y-1.5">
                          <label className="block text-xs font-medium text-slate-700">Teacher Feedback</label>
                          <input 
                            type="text" 
                            name="feedback" 
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            placeholder="Great job! Keep it up."
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={(e) => {
                            const formElement = (e.currentTarget as HTMLButtonElement).closest('form')
                            const feedbackInput = formElement?.querySelector('input[name="feedback"]') as HTMLInputElement
                            const feedback = feedbackInput?.value || 'Please revise and resubmit.'
                            handleGradeAction(sub.id, 0, feedback, 'return')
                          }}
                          className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <RotateCcw size={13} />
                          Return / Request Revision
                        </button>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveId(null)}
                            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isPending}
                            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                          >
                            {isPending ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Coins size={13} />
                            )}
                            Approve &amp; Reward
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
