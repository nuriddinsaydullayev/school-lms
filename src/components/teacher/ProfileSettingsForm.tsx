'use client'

import { useTransition } from 'react'
import { Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { updateProfile } from '@/app/actions/teacher'

interface ProfileSettingsFormProps {
  initialName: string
}

export default function ProfileSettingsForm({ initialName }: ProfileSettingsFormProps) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const fullName = form.get('full_name') as string

    if (!fullName.trim()) {
      toast.error('Name cannot be empty')
      return
    }

    startTransition(async () => {
      const res = await updateProfile({ full_name: fullName.trim() })
      if (res.success) {
        toast.success('Profile updated successfully!')
      } else {
        toast.error(res.error || 'Failed to update profile')
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-lg">
      <h2 className="font-semibold text-slate-800 text-lg mb-4">Personal Information</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Full Name</label>
          <input 
            type="text" 
            name="full_name" 
            defaultValue={initialName}
            required 
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <button 
          type="submit" 
          disabled={isPending}
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-50"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
