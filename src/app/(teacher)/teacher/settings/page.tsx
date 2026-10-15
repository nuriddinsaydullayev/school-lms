import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import TeacherProfileSettings, { TeacherProfileData } from '@/components/teacher/ProfileSettingsForm'

export const metadata: Metadata = {
  title: 'Teacher Settings — Profile & Preferences',
  description: 'Manage your professional profile, credentials, contact info, and subjects taught.',
}

export const dynamic = 'force-dynamic'

export default async function TeacherSettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch full teacher profile with school info
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      avatar_url,
      bio,
      phone,
      qualifications,
      subjects_taught,
      role,
      schools (
        name
      )
    `)
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'teacher') {
    redirect('/login')
  }

  const schoolObj = Array.isArray(profile.schools) ? profile.schools[0] : profile.schools
  const schoolName = (schoolObj as any)?.name || 'EduSpark Academy'

  const initialData: TeacherProfileData = {
    id: profile.id,
    fullName: profile.full_name || '',
    email: user.email || null,
    phone: profile.phone || '',
    bio: profile.bio || '',
    avatarUrl: profile.avatar_url || '',
    qualifications: profile.qualifications || '',
    subjectsTaught: Array.isArray(profile.subjects_taught) ? profile.subjects_taught : [],
    schoolName,
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Teacher Profile & Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Customize your public credentials, contact details, and subjects for the automated scheduler.
        </p>
      </div>

      <TeacherProfileSettings initialData={initialData} />
    </div>
  )
}
