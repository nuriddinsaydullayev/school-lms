import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import ClassCreator from '@/components/teacher/ClassCreator'
import { Users, BookOpen } from 'lucide-react'

export const metadata: Metadata = { title: 'Manage Classes' }

export default async function TeacherClassesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch classes with enrollment counts
  const { data: classesData } = await supabase
    .from('classes')
    .select('*, enrollments:class_enrollments(count)')
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false })

  const classes = (classesData ?? []).map((cls: any) => ({
    ...cls,
    _count: { enrollments: cls.enrollments?.[0]?.count ?? 0 }
  }))

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Classes</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your classrooms and generate join codes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Create Class) */}
        <div className="lg:col-span-4 space-y-6">
          <ClassCreator />
        </div>

        {/* Right Column (Class List) */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2 mb-4">
              <BookOpen size={16} className="text-indigo-600" /> Active Classrooms
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.length === 0 ? (
                <div className="col-span-full text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl">
                  <p className="text-sm text-slate-500">You haven't created any classes yet.</p>
                </div>
              ) : (
                classes.map((cls) => (
                  <div key={cls.id} className="p-5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all group">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">{cls.name}</h3>
                        {cls.subject && (
                          <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                            {cls.subject}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 bg-white border border-slate-100 px-2.5 py-1 rounded-lg shadow-sm">
                        <Users size={14} className="text-indigo-500" />
                        <span className="text-xs font-semibold">{cls._count?.enrollments ?? 0}</span>
                      </div>
                    </div>
                    {cls.description && (
                      <p className="text-sm text-slate-600 mb-4 line-clamp-2">{cls.description}</p>
                    )}
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500">Join code:</span>
                      <code className="px-2 py-1 bg-slate-200 text-slate-800 font-mono font-bold text-sm rounded tracking-wider">
                        {cls.join_code}
                      </code>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
