import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createAdminClient } from '@/utils/supabase/server'
import {
  Users,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  ArrowRight,
  PlusCircle,
  UserCheck,
} from 'lucide-react'

export const metadata: Metadata = { title: 'Admin Dashboard' }
export const revalidate = 30

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('id, full_name, role, school_id, schools(name)')
    .eq('id', user.id)
    .maybeSingle()

  if (!adminProfile || adminProfile.role !== 'admin' || !adminProfile.school_id) {
    redirect('/login')
  }

  const schoolId = adminProfile.school_id
  const adminClient = createAdminClient()

  // Fetch counts in parallel scoped strictly to school_id
  const [
    studentsRes,
    teachersRes,
    classesRes,
    recentClassesRes,
    recentUsersRes,
  ] = await Promise.all([
    adminClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('role', 'student'),

    adminClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('role', 'teacher'),

    adminClient
      .from('classes')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId),

    // Quick list of recent classes with teacher details
    adminClient
      .from('classes')
      .select(`
        id,
        name,
        subject,
        join_code,
        created_at,
        teacher:profiles!classes_teacher_id_fkey(full_name, avatar_url)
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(5),

    // Quick list of recent members
    adminClient
      .from('profiles')
      .select('id, full_name, role, created_at, avatar_url')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const totalStudents = studentsRes.count ?? 0
  const totalTeachers = teachersRes.count ?? 0
  const totalClasses = classesRes.count ?? 0
  const recentClasses = recentClassesRes.data ?? []
  const recentUsers = recentUsersRes.data ?? []

  let schoolName = 'EduSpark'
  if (adminProfile.schools && !Array.isArray(adminProfile.schools)) {
    schoolName = (adminProfile.schools as unknown as { name: string }).name
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              <ShieldCheck size={14} /> School Administrator
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">{schoolName}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1.5">
            Welcome back, {adminProfile.full_name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            School operations, class assignments, and membership management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/classes"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
          >
            <PlusCircle size={16} />
            Create Class
          </Link>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
          >
            <UserCheck size={16} />
            Manage Users
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Students</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalStudents}</h3>
            <p className="text-xs text-slate-400 mt-1">Enrolled in school</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Teachers</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalTeachers}</h3>
            <p className="text-xs text-slate-400 mt-1">Faculty members</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Classes</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalClasses}</h3>
            <p className="text-xs text-slate-400 mt-1">Active sections</p>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Classes & Recent Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Classes */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-slate-700" />
                <h2 className="font-semibold text-slate-900">Recent Classes</h2>
              </div>
              <Link
                href="/admin/classes"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                View all <ArrowRight size={12} />
              </Link>
            </div>

            <div className="divide-y divide-slate-100 mt-3">
              {recentClasses.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  No classes created yet.
                </div>
              ) : (
                recentClasses.map((c: any) => {
                  const teacherData = Array.isArray(c.teacher) ? c.teacher[0] : c.teacher
                  return (
                    <div key={c.id} className="py-3.5 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-slate-800">{c.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Teacher: {teacherData?.full_name || 'Unassigned'}
                          {c.subject ? ` • ${c.subject}` : ''}
                        </p>
                      </div>
                      <span className="font-mono text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-700 rounded-md">
                        {c.join_code}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
          <Link
            href="/admin/classes"
            className="mt-4 pt-3 border-t border-slate-100 text-center text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            Create or manage classes →
          </Link>
        </div>

        {/* Recent Users */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-slate-700" />
                <h2 className="font-semibold text-slate-900">Recent Members</h2>
              </div>
              <Link
                href="/admin/users"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                Manage all <ArrowRight size={12} />
              </Link>
            </div>

            <div className="divide-y divide-slate-100 mt-3">
              {recentUsers.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  No users found in school.
                </div>
              ) : (
                recentUsers.map((u: any) => (
                  <div key={u.id} className="py-3.5 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-slate-800">{u.full_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Joined {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${
                        u.role === 'admin'
                          ? 'bg-amber-100 text-amber-800'
                          : u.role === 'teacher'
                          ? 'bg-violet-100 text-violet-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {u.role}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          <Link
            href="/admin/users"
            className="mt-4 pt-3 border-t border-slate-100 text-center text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            Promote to teacher or change roles →
          </Link>
        </div>
      </div>
    </div>
  )
}
