import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import ClassOverview from '@/components/teacher/ClassOverview'
import AssignmentCreator from '@/components/teacher/AssignmentCreator'
import SubmissionsGrader, { PendingSubmission } from '@/components/teacher/SubmissionsGrader'

export const metadata: Metadata = { title: 'Teacher Dashboard' }
export const revalidate = 60

export default async function TeacherDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all necessary data in parallel
  const [
    profileResult,
    classesResult,
    submissionsResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .maybeSingle(),
    
    // Get classes and count enrollments. 
    // The relationship is from class_enrollments (class_id) to classes (id).
    // Using the count syntax: 'class_enrollments(count)'
    supabase
      .from('classes')
      .select(`
        *,
        enrollments:class_enrollments(count)
      `)
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false }),

    // Get pending submissions across all assignments owned by this teacher.
    // Inner join on assignments guarantees we only get submissions for assignments this teacher created.
    supabase
      .from('submissions')
      .select(`
        *,
        assignments!inner(title, teacher_id, max_score, token_reward, xp_reward),
        profiles(full_name)
      `)
      .eq('status', 'submitted')
      .eq('assignments.teacher_id', user.id)
      .order('submitted_at', { ascending: true })
  ])

  if (!profileResult.data || profileResult.data.role !== 'teacher') {
    redirect('/login')
  }

  const profile = profileResult.data
  
  // Format the classes result to match the component's expected _count shape
  const rawClasses = classesResult.data ?? []
  const classes = rawClasses.map((cls: any) => ({
    ...cls,
    _count: { enrollments: cls.enrollments?.[0]?.count ?? 0 }
  }))

  const pendingSubmissions = (submissionsResult.data ?? []) as unknown as PendingSubmission[]

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {profile.full_name.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Here's what's happening in your classes today.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (Classes & Create) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="h-[350px]">
            <ClassOverview classes={classes} />
          </div>
          <AssignmentCreator classes={classes} />
        </div>

        {/* Right Column (Grading) */}
        <div className="lg:col-span-7">
          <div className="min-h-[600px] h-[calc(100vh-140px)] max-h-[800px]">
            <SubmissionsGrader submissions={pendingSubmissions} />
          </div>
        </div>

      </div>
    </div>
  )
}
