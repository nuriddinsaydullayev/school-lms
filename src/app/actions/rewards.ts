'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export interface PurchaseResult {
  success: boolean
  error?: string
  voucherCode?: string
  remainingBalance?: number
}

export async function purchaseReward(itemName: string, cost: number): Promise<PurchaseResult> {
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

  // 2. Spend the tokens in the append-only ledger
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

  const voucherCode = `EDUSPARK-${Math.random().toString(36).substring(2, 7).toUpperCase()}`

  // 3. Log to reward_redemptions table
  try {
    await (supabase as any)
      .from('reward_redemptions')
      .insert({
        student_id: user.id,
        item_name: itemName,
        cost: cost,
        voucher_code: voucherCode,
        status: 'active',
      })
  } catch (e) {
    // Non-blocking fallback
  }

  // Refresh routes
  revalidatePath('/student/rewards')
  revalidatePath('/student/dashboard')

  return {
    success: true,
    voucherCode,
    remainingBalance: currentBalance - cost,
  }
}

export async function getStudentRewardsData() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { balance: 0, redemptions: [] }

  const { data: balanceRecord } = await supabase
    .from('token_balances')
    .select('balance')
    .eq('student_id', user.id)
    .maybeSingle()

  let redemptions: any[] = []
  try {
    const { data: redData } = await (supabase as any)
      .from('reward_redemptions')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })

    if (redData) {
      redemptions = redData.map((r: any) => ({
        id: r.id,
        itemName: r.item_name,
        cost: r.cost,
        code: r.voucher_code,
        redeemedAt: r.created_at,
        status: r.status,
      }))
    }
  } catch (e) {
    // Non-blocking fallback
  }

  return {
    balance: balanceRecord?.balance ?? 0,
    redemptions,
  }
}
