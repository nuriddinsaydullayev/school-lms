'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createAssignment } from '@/app/actions/teacher'
import type { ClassRow } from '@/types/database.types'

interface AssignmentCreatorProps {
  classes: ClassRow[]
}

export default function AssignmentCreator({ classes }: AssignmentCreatorProps) {
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formElement = e.currentTarget
    const form = new FormData(formElement)
    
    const data = {
      title: form.get('title') as string,
      description: form.get('description') as string,
      class_id: form.get('class_id') as string,
      due_date: (form.get('due_date') as string) || undefined,
      max_score: parseInt(form.get('max_score') as string) || 100,
      xp_reward: parseInt(form.get('xp_reward') as string) || 50,
      token_reward: parseInt(form.get('token_reward') as string) || 10,
      is_published: true, // Auto-publish for now
    }

    startTransition(async () => {
      const res = await createAssignment(data)
      if (res.success) {
        toast.success('Assignment created & published!')
        formElement.reset()
      } else {
        toast.error(res.error || 'Failed to create assignment')
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50">
          <Plus className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-800 text-sm">Quick Create Assignment</h2>
          <p className="text-xs text-slate-400">Publish a new task to your class</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-700">Class</label>
          <select 
            name="class_id" 
            required 
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">Select a class...</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-700">Title</label>
          <input 
            type="text" 
            name="title" 
            required 
            placeholder="e.g. Chapter 1 Quiz"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-700">Instructions</label>
          <textarea 
            name="description" 
            rows={3} 
            placeholder="Describe the task..."
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">Due Date</label>
            <input 
              type="datetime-local" 
              name="due_date" 
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">Max Score</label>
            <input 
              type="number" 
              name="max_score" 
              defaultValue={100}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">XP Reward</label>
            <input 
              type="number" 
              name="xp_reward" 
              defaultValue={50}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">Token Reward</label>
            <input 
              type="number" 
              name="token_reward" 
              defaultValue={10}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition disabled:opacity-50"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {isPending ? 'Publishing...' : 'Publish Assignment'}
        </button>
      </form>
    </div>
  )
}
