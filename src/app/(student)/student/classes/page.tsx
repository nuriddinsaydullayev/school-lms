import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import JoinClassWidget from '@/components/student/JoinClassWidget'
import { BookOpen, Users } from 'lucide-react'

export const metadata: Metadata = { title: 'My Classes' }

export default async function StudentClassesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch enrollments with nested class data and the teacher's profile
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
        profiles ( full_name )
      )
    `)
    .eq('student_id', user.id)
    .order('enrolled_at', { ascending: false })

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Classes</h1>
          <p className="text-sm text-slate-500 mt-1">Manage the classes you are currently enrolled in.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: Join Class Widget */}
        <div className="lg:col-span-1">
          <JoinClassWidget />
        </div>

        {/* Right: Enrolled Classes */}
        <div className="lg:col-span-2 space-y-4">
          {!enrollments || enrollments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-3">
                <BookOpen className="w-6 h-6 text-indigo-400" />
              </div>
              <p className="text-slate-800 font-medium">No classes yet</p>
              <p className="text-slate-500 text-sm mt-1">Use a join code from your teacher to enroll in your first class.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {enrollments.map((enr: any) => {
                const cls = enr.classes
                if (!cls) return null
                return (
                  <div key={enr.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:border-indigo-100 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-800 text-lg leading-tight">{cls.name}</h3>
                        {cls.subject && (
                          <span className="inline-block mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                            {cls.subject}
                          </span>
                        )}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 ml-3">
                        <BookOpen className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                    {cls.description && (
                      <p className="text-sm text-slate-600 mb-4 line-clamp-2">{cls.description}</p>
                    )}
                    <div className="mt-auto pt-4 border-t border-slate-50 flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-500">
                        Teacher: <span className="font-medium text-slate-700">{cls.profiles?.full_name ?? 'Unknown'}</span>
                      </span>
                    </div>
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
