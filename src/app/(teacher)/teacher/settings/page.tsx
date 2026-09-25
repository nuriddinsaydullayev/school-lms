import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import ProfileSettingsForm from '@/components/teacher/ProfileSettingsForm'

export const metadata: Metadata = { title: 'Settings' }

export default async function TeacherSettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'teacher') {
    redirect('/login')
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your account and profile preferences.</p>
        </div>
      </div>

      <ProfileSettingsForm initialName={profile.full_name} />
    </div>
  )
}
