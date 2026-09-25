'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClass } from '@/app/actions/class'

export default function ClassCreator() {
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    
    const data = {
      name: form.get('name') as string,
      subject: form.get('subject') as string,
      description: form.get('description') as string,
    }

    startTransition(async () => {
      const res = await createClass(data)
      if (res.success) {
        toast.success('Class created! Students can now join.')
        ;(e.target as HTMLFormElement).reset()
      } else {
        toast.error(res.error || 'Failed to create class')
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50">
          <Plus className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-800 text-sm">Create New Class</h2>
          <p className="text-xs text-slate-400">Generate a unique join code</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-700">Class Name <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            name="name" 
            required 
            placeholder="e.g. Intro to Computer Science"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-700">Subject</label>
          <input 
            type="text" 
            name="subject" 
            placeholder="e.g. Computer Science"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-700">Description</label>
          <textarea 
            name="description" 
            rows={3} 
            placeholder="Briefly describe what students will learn..."
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
          />
        </div>

        <button 
          type="submit" 
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-50"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {isPending ? 'Creating...' : 'Create Class'}
        </button>
      </form>
    </div>
  )
}
