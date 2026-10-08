import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import StudentProfileForm from '@/components/student/StudentProfileForm'
import { User, Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Settings — Student Profile',
  description: 'Manage your student profile, name, avatar, and bio.',
}

export default async function StudentSettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch current student profile data from Supabase
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, bio, role, xp_points, level')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'student') {
    redirect('/login')
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <User className="w-6 h-6 text-indigo-600" />
            Account Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Update your public profile information, avatar, and personal bio.
          </p>
        </div>

        {/* Level & XP pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-indigo-50 border border-indigo-100 px-3.5 py-1.5 rounded-2xl text-xs font-semibold text-indigo-700">
          <Sparkles size={14} className="text-indigo-600" />
          <span>Level {profile.level ?? 1}</span>
          <span className="text-indigo-300">·</span>
          <span>{profile.xp_points ?? 0} XP</span>
        </div>
      </div>

      {/* Profile Form */}
      <StudentProfileForm
        initialData={{
          fullName:  profile.full_name ?? '',
          avatarUrl: profile.avatar_url ?? '',
          bio:       profile.bio ?? '',
        }}
      />
    </div>
  )
}
