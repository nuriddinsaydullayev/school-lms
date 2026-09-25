import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import RewardStore from '@/components/student/RewardStore'
import { Gift } from 'lucide-react'

export const metadata: Metadata = { title: 'Rewards Store' }
export const revalidate = 0 // always fetch fresh balance for store

export default async function RewardsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tokenBalance } = await supabase
    .from('token_balances')
    .select('balance')
    .eq('student_id', user.id)
    .maybeSingle()

  const balance = tokenBalance?.balance ?? 0

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Gift className="text-violet-500" /> Rewards Store
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Exchange your hard-earned tokens for fun rewards and perks.
          </p>
        </div>
      </div>

      <RewardStore currentBalance={balance} />
    </div>
  )
}
