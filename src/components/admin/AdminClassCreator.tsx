'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2, Sparkles, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { createAdminClass } from '@/app/actions/admin'

interface TeacherOption {
  id: string
  full_name: string
  role: string
}

interface AdminClassCreatorProps {
  teachers: TeacherOption[]
}

export default function AdminClassCreator({ teachers }: AdminClassCreatorProps) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [teacherId, setTeacherId] = useState(teachers[0]?.id || '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Class name is required')
      return
    }

    if (!teacherId) {
      toast.error('Please assign a teacher to this class')
      return
    }

    startTransition(async () => {
      const res = await createAdminClass({
        name: name.trim(),
        subject: subject.trim() || undefined,
        description: description.trim() || undefined,
        teacher_id: teacherId,
      })

      if (res.success) {
        toast.success(`Class "${name}" created and assigned!`)
        setName('')
        setSubject('')
        setDescription('')
      } else {
        toast.error(res.error || 'Failed to create class')
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-50">
          <Plus className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-800 text-base">Create New Class</h2>
          <p className="text-xs text-slate-400">Generate a section & assign a teacher</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Class Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. AP World History - Period 3"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Assign Teacher <span className="text-red-500">*</span>
          </label>
          {teachers.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              No teachers found. Go to <strong>Users & Roles</strong> to promote a user to teacher first.
            </div>
          ) : (
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name} ({t.role})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Social Studies"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">Description / Schedule</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Meets Mon/Wed/Fri in Room 204"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={isPending || teachers.length === 0}
          className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating Class...
            </>
          ) : (
            <>
              <UserCheck className="w-4 h-4" />
              Create & Assign Class
            </>
          )}
        </button>
      </form>
    </div>
  )
}
