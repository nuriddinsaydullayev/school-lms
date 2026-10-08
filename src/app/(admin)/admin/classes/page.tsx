import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/utils/supabase/server'
import AdminClassCreator from '@/components/admin/AdminClassCreator'
import { BookOpen, Users, KeyRound, Clock } from 'lucide-react'

export const metadata: Metadata = { title: 'Manage Classes | Admin' }
export const revalidate = 10

export default async function AdminClassesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role, school_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!adminProfile || adminProfile.role !== 'admin' || !adminProfile.school_id) {
    redirect('/login')
  }

  const schoolId = adminProfile.school_id
  const adminClient = createAdminClient()

  // 1. Fetch all teachers in this school to populate teacher assignment select
  const { data: teachersData } = await adminClient
    .from('profiles')
    .select('id, full_name, role')
    .eq('school_id', schoolId)
    .in('role', ['teacher', 'admin'])
    .order('full_name', { ascending: true })

  // 2. Fetch all classes in this school with teacher and enrollment details
  const { data: classesData } = await adminClient
    .from('classes')
    .select(`
      *,
      teacher:profiles!classes_teacher_id_fkey(id, full_name, avatar_url, role),
      enrollments:class_enrollments(count)
    `)
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })

  const teachers = (teachersData ?? [])
  const classes = (classesData ?? []).map((cls: any) => ({
    ...cls,
    teacher: Array.isArray(cls.teacher) ? cls.teacher[0] : cls.teacher,
    studentCount: cls.enrollments?.[0]?.count ?? 0,
  }))

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Class Management
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Create new school sections, assign teachers, and monitor enrollment join codes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Create Class Form */}
        <div className="lg:col-span-5">
          <AdminClassCreator teachers={teachers} />
        </div>

        {/* Right Column: Class Roster */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <BookOpen size={16} className="text-amber-600" />
                Active School Classes ({classes.length})
              </h2>
            </div>

            {classes.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">No classes found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Use the form on the left to create your first class.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-slate-200 transition-all shadow-none hover:shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-base">{cls.name}</h3>
                          {cls.subject && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                              {cls.subject}
                            </span>
                          )}
                        </div>
                        {cls.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {cls.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 self-start px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs">
                        <Users size={13} className="text-slate-400" />
                        <span className="font-semibold">{cls.studentCount}</span>
                        <span className="text-slate-400">students</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <span className="text-slate-400">Assigned Teacher:</span>
                        <span className="font-medium text-slate-800">
                          {cls.teacher?.full_name ?? 'None'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 flex items-center gap-1">
                          <KeyRound size={12} /> Join Code:
                        </span>
                        <code className="px-2 py-0.5 bg-slate-200 text-slate-800 font-mono font-bold rounded">
                          {cls.join_code}
                        </code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
