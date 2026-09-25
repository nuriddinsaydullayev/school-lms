'use client'

import { useState, useTransition } from 'react'
import { UserPlus, Loader2, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { joinClass } from '@/app/actions/class'

export default function JoinClassWidget() {
  const [isPending, startTransition] = useTransition()
  const [code, setCode] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!code.trim()) return

    startTransition(async () => {
      const res = await joinClass(code)
      if (res.success) {
        toast.success('Successfully joined class!')
        setCode('')
      } else {
        toast.error(res.error || 'Failed to join class')
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-50">
          <UserPlus className="w-4 h-4 text-violet-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-800 text-sm">Join a Class</h2>
          <p className="text-xs text-slate-400">Got a code from your teacher?</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input 
          type="text" 
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. A1B2C3"
          maxLength={6}
          disabled={isPending}
          className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono tracking-wider placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 uppercase"
        />
        <button 
          type="submit" 
          disabled={isPending || code.trim().length === 0}
          className="flex-shrink-0 flex items-center justify-center px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition disabled:opacity-50"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
        </button>
      </form>
    </div>
  )
}
