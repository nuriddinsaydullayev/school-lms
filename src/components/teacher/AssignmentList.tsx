'use client'

import { useState, useTransition } from 'react'
import { Trash2, Loader2, BookOpen, Clock, Award, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { deleteAssignment } from '@/app/actions/teacher'
import type { AssignmentRow } from '@/types/database.types'

export type ExtendedAssignment = AssignmentRow & {
  classes: { name: string } | null
}

export default function AssignmentList({ assignments }: { assignments: ExtendedAssignment[] }) {
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this assignment? All student submissions will also be deleted.')) return

    setDeletingId(id)
    startTransition(async () => {
      const res = await deleteAssignment(id)
      if (res.success) {
        toast.success('Assignment deleted.')
      } else {
        toast.error(res.error || 'Failed to delete assignment.')
      }
      setDeletingId(null)
    })
  }

  if (assignments.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center flex flex-col items-center">
        <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-3">
          <BookOpen className="w-6 h-6 text-indigo-400" />
        </div>
        <p className="text-slate-800 font-medium">No assignments found</p>
        <p className="text-slate-500 text-sm mt-1">Create an assignment from your Dashboard to get started.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {assignments.map((assign) => (
        <div key={assign.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col hover:border-indigo-100 transition-colors">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-bold text-slate-800 text-lg leading-tight">{assign.title}</h3>
              <p className="text-xs font-semibold text-indigo-600 mt-1">{assign.classes?.name}</p>
            </div>
            <button
              onClick={() => handleDelete(assign.id)}
              disabled={isPending}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="Delete Assignment"
            >
              {deletingId === assign.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            </button>
          </div>

          <p className="text-sm text-slate-600 mb-4 line-clamp-2 min-h-[40px]">
            {assign.description || <span className="italic text-slate-400">No description provided.</span>}
          </p>

          <div className="mt-auto grid grid-cols-2 gap-2 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <Clock size={14} className="text-slate-400" />
              {assign.due_date ? new Date(assign.due_date).toLocaleDateString() : 'No due date'}
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <Award size={14} className="text-indigo-400" />
              {assign.max_score} points
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <Star size={14} className="text-amber-400" />
              {assign.xp_reward} XP
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <div className="w-3.5 h-3.5 rounded-full bg-violet-400 flex items-center justify-center text-[8px] font-bold text-white">T</div>
              {assign.token_reward} Tokens
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
