'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, Loader2, MessageSquare, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { gradeSubmission } from '@/app/actions/teacher'
import type { SubmissionRow } from '@/types/database.types'

// The data shape we expect from the joined query in page.tsx
export type PendingSubmission = SubmissionRow & {
  assignments: { title: string, max_score: number } | null
  profiles: { full_name: string } | null
}

interface SubmissionsGraderProps {
  submissions: PendingSubmission[]
}

export default function SubmissionsGrader({ submissions }: SubmissionsGraderProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleGrade(e: React.FormEvent<HTMLFormElement>, submissionId: string) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const score = parseInt(form.get('score') as string, 10)
    const feedback = form.get('feedback') as string

    startTransition(async () => {
      const res = await gradeSubmission(submissionId, score, feedback)
      if (res.success) {
        toast.success('Graded successfully!')
        setActiveId(null)
      } else {
        toast.error(res.error || 'Failed to grade submission')
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
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {sub.assignments?.title ?? 'Unknown Assignment'}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-xs text-slate-400 font-medium whitespace-nowrap bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
                    {new Date(sub.submitted_at!).toLocaleDateString()}
                  </span>
                </button>

                {/* Expanded grading area */}
                {isActive && (
                  <div className="p-4 border-t border-slate-100 bg-white space-y-4 animate-in slide-in-from-top-2 duration-200">
                    
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

                    <form onSubmit={(e) => handleGrade(e, sub.id)} className="pt-2 border-t border-slate-100">
                      <div className="grid grid-cols-12 gap-3 mb-3">
                        <div className="col-span-4 space-y-1.5">
                          <label className="block text-xs font-medium text-slate-700">Score (out of {maxScore})</label>
                          <input 
                            type="number" 
                            name="score" 
                            required 
                            min="0"
                            max={maxScore}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                            placeholder="0"
                          />
                        </div>
                        <div className="col-span-8 space-y-1.5">
                          <label className="block text-xs font-medium text-slate-700">Teacher Feedback</label>
                          <input 
                            type="text" 
                            name="feedback" 
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                            placeholder="Great job!"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveId(null)}
                          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isPending}
                          className="px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isPending && <Loader2 size={12} className="animate-spin" />}
                          Submit Grade
                        </button>
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
