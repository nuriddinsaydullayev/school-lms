'use server'

import { randomBytes, randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/utils/supabase/server'
import { findRewardItem } from '@/lib/rewards/catalog'
import { spendTokens, grantTokens, getSchoolId } from '@/lib/tokens/ledger'

type Untyped = SupabaseClient<any, 'public', any>

export interface PurchaseResult {
  success: boolean
  error?: string
  voucherCode?: string
  remainingBalance?: number
  redemptionId?: string
}

function makeVoucherCode(): string {
  // Cryptographically random, unambiguous alphabet (no 0/O/1/I)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(8)
  let code = ''
  for (let i = 0; i < bytes.length; i++) {
    code += alphabet[bytes[i] % alphabet.length]
  }
  return `EDUSPARK-${code}`
}

/**
 * Purchase a reward by catalogue id.
 * The price is looked up on the server — the client only says WHICH item.
 */
export async function purchaseReward(itemId: string): Promise<PurchaseResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const item = typeof itemId === 'string' ? findRewardItem(itemId) : undefined
  if (!item) return { success: false, error: 'Unknown reward item.' }

  const schoolId = await getSchoolId(user.id)
  if (!schoolId) return { success: false, error: 'Your account is not linked to a school.' }

  const redemptionId = randomUUID()

  // 1. Atomic debit (balance check + insert under a per-student lock)
  const spend = await spendTokens({
    studentId:   user.id,
    schoolId,
    amount:      item.cost,
    reason:      `Purchased: ${item.name}`,
    source:      'reward_purchase',
    referenceId: redemptionId,
  })
  if (!spend.ok) return { success: false, error: spend.error }

  // 2. Issue the voucher (service role — students cannot insert redemptions)
  const voucherCode = makeVoucherCode()
  const { error: redErr } = await (createAdminClient() as unknown as Untyped)
    .from('reward_redemptions')
    .insert({
      id:           redemptionId,
      school_id:    schoolId,
      student_id:   user.id,
      item_id:      item.id,
      item_name:    item.name,
      cost:         item.cost,
      voucher_code: voucherCode,
      status:       'active',
    })

  if (redErr) {
    // Compensate: give the tokens back
    console.error('[purchaseReward] voucher insert failed, refunding:', redErr.message)
    await grantTokens({
      studentId:   user.id,
      schoolId,
      amount:      item.cost,
      reason:      `Refund (voucher failed): ${item.name}`,
      source:      'reward_refund',
      referenceId: redemptionId,
    })
    return { success: false, error: 'Could not issue your voucher. Your tokens were refunded.' }
  }

  revalidatePath('/student/rewards')
  revalidatePath('/student/dashboard')

  return {
    success: true,
    voucherCode,
    redemptionId,
    remainingBalance: spend.remainingBalance,
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
    const { data: redData } = await (supabase as unknown as Untyped)
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
