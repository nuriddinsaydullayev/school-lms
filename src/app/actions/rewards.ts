'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import type { ActionResult } from './homework'

export async function purchaseReward(itemName: string, cost: number): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // 1. Check current balance
  const { data: balanceRecord, error: balanceError } = await supabase
    .from('token_balances')
    .select('balance')
    .eq('student_id', user.id)
    .maybeSingle()

  if (balanceError) return { success: false, error: balanceError.message }
  
  const currentBalance = balanceRecord?.balance ?? 0
  if (currentBalance < cost) {
    return { success: false, error: "You don't have enough tokens for this item!" }
  }

  // 2. Spend the tokens
  // A student IS allowed to insert their own 'spent' tokens via RLS, or we can use admin.
  // The RLS policy for tokens is: (get_my_role() = 'teacher' or auth.uid() = student_id)
  // So the student can safely insert a spent record.
  const { error: insertError } = await supabase
    .from('tokens')
    .insert({
      student_id: user.id,
      type: 'spent',
      amount: cost,
      reason: `Purchased: ${itemName}`,
    })

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  // Refresh routes
  revalidatePath('/student/rewards')
  revalidatePath('/student/dashboard')
  
  return { success: true }
}
