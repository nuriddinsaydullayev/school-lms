import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import JoinClassWidget from '@/components/student/JoinClassWidget'
import { BookOpen, Users, Hash } from 'lucide-react'
import { format } from 'date-fns'

export const metadata: Metadata = { title: 'My Classes' }

export default async function StudentClassesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: enrollments } = await supabase
    .from('class_enrollments')
    .select(`
      id,
      enrolled_at,
      classes (
        id,
        name,
        subject,
        description,
        join_code,
        profiles ( full_name )
      )
    `)
    .eq('student_id', user.id)
    .order('enrolled_at', { ascending: false })

  const subjectColor = (subject?: string | null) => {
    const s = subject?.toLowerCase() ?? ''
    if (s.includes('math'))    return 'bg-indigo-50 text-indigo-700'
    if (s.includes('phys'))    return 'bg-sky-50 text-sky-700'
    if (s.includes('chem'))    return 'bg-emerald-50 text-emerald-700'
    if (s.includes('hist'))    return 'bg-amber-50 text-amber-700'
    if (s.includes('lit') || s.includes('english')) return 'bg-violet-50 text-violet-700'
    return 'bg-slate-100 text-slate-600'
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Classes</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage the classes you are enrolled in, or join a new one.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT — Join a class widget (moved here from dashboard) */}
        <div className="lg:col-span-4">
          <div className="sticky top-6 space-y-4">
            <JoinClassWidget />

            {/* Tip card */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-sm text-indigo-700 leading-relaxed">
              <p className="font-semibold mb-1">💡 How to join a class</p>
              <p className="text-xs text-indigo-600">
                Ask your teacher for the 6-character class code and enter it in the box above.
                You will instantly gain access to all class assignments.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT — Enrolled classes */}
        <div className="lg:col-span-8">
          {!enrollments || enrollments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm p-12 text-center flex flex-col items-center">
              <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="w-7 h-7 text-indigo-400" />
              </div>
              <p className="text-slate-800 font-semibold">No classes yet</p>
              <p className="text-slate-500 text-sm mt-2 max-w-xs">
                Use the join code from your teacher to enroll in your first class and unlock assignments.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {enrollments.map((enr: any) => {
                const cls = enr.classes
                if (!cls) return null
                return (
                  <div
                    key={enr.id}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:border-indigo-200 hover:shadow-md transition-all group"
                  >
                    {/* Subject pill */}
                    {cls.subject && (
                      <span className={`inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-3 ${subjectColor(cls.subject)}`}>
                        {cls.subject}
                      </span>
                    )}

                    <h3 className="font-bold text-slate-800 text-base leading-tight mb-1 group-hover:text-indigo-700 transition-colors">
                      {cls.name}
                    </h3>

                    {cls.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-4">{cls.description}</p>
                    )}

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-50 mt-auto">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs text-slate-500">
                          <span className="font-medium text-slate-700">
                            {cls.profiles?.full_name ?? 'Unknown'}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 ml-auto">
                        <Hash className="w-3 h-3 text-slate-300" />
                        <span className="text-xs font-mono text-slate-400">{cls.join_code}</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 mt-2">
                      Enrolled {format(new Date(enr.enrolled_at), 'dd MMM yyyy')}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
