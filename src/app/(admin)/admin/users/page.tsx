import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/utils/supabase/server'
import UserRoleManager, { UserRowItem } from '@/components/admin/UserRoleManager'
import { Users } from 'lucide-react'

export const metadata: Metadata = { title: 'User Management | Admin' }
export const revalidate = 10

export default async function AdminUsersPage() {
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

  // Fetch all users in this school
  const { data: usersData } = await adminClient
    .from('profiles')
    .select('id, full_name, role, avatar_url, created_at, xp_points, level')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })

  const users: UserRowItem[] = (usersData ?? []) as UserRowItem[]

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          User & Role Management
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review all school members and manage permissions (promote students to teachers or assign admins).
        </p>
      </div>

      <UserRoleManager initialUsers={users} currentAdminId={user.id} />
    </div>
  )
}
