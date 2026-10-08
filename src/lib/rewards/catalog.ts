/**
 * Reward store catalogue — single source of truth for prices.
 * The client imports this for display; the server re-reads it on every
 * purchase, so tampering with the request cannot change the price.
 */

export type RewardCategory = 'privilege' | 'gift'

export interface RewardItem {
  id:          string
  name:        string
  description: string
  cost:        number
  icon:        string
  category:    RewardCategory
  badge?:      string
  stock?:      string
}

export const REWARD_ITEMS: readonly RewardItem[] = [
  // ── School Privileges ─────────────────────────────────────────
  {
    id: 'priv-1',
    name: '1-Day Homework Extension',
    description: 'Extend the due date of any single assignment by 24 hours without any XP penalty.',
    cost: 80,
    icon: '⏳',
    category: 'privilege',
    badge: 'Popular',
    stock: 'Unlimited',
  },
  {
    id: 'priv-2',
    name: 'Choose Your Desk for a Week',
    description: 'Pick your preferred seat in any class for a whole week (subject to teacher approval).',
    cost: 120,
    icon: '🪑',
    category: 'privilege',
    badge: 'Fun',
    stock: '5 available this month',
  },
  {
    id: 'priv-3',
    name: 'Skip One Minor Homework',
    description: 'Pass on one daily practice or short quiz assignment with full credit granted.',
    cost: 180,
    icon: '🎟️',
    category: 'privilege',
    badge: 'Hot',
    stock: '1 per semester',
  },
  {
    id: 'priv-4',
    name: 'Extra AI Tutor Hint Pack',
    description: 'Unlock 5 instant step-by-step mathematical breakdowns and solution hints in AI Tutor.',
    cost: 40,
    icon: '💡',
    category: 'privilege',
    stock: 'Instant unlock',
  },

  // ── Brand Gifts & Physical Merch ──────────────────────────────
  {
    id: 'gift-1',
    name: 'Cafeteria Snack Voucher',
    description: 'Get a free fresh pastry, warm sandwich, or healthy juice from the campus cafeteria.',
    cost: 100,
    icon: '🥪',
    category: 'gift',
    badge: 'Tasty',
    stock: 'Digital QR Code',
  },
  {
    id: 'gift-2',
    name: '$10 Bookshop Voucher',
    description: 'Receive a digital gift card redeemable at the school bookstore or partner stationery shop.',
    cost: 220,
    icon: '📚',
    category: 'gift',
    badge: 'Best Value',
    stock: 'Digital gift card',
  },
  {
    id: 'gift-3',
    name: 'EduSpark School Hoodie',
    description: 'Premium heavyweight cotton hoodie with custom school badge and embroidered logo.',
    cost: 380,
    icon: '🧥',
    category: 'gift',
    badge: 'Exclusive',
    stock: 'Physical item (pickup at office)',
  },
  {
    id: 'gift-4',
    name: 'Stainless Steel Water Bottle',
    description: 'Eco-friendly insulated water bottle engraved with your student name and school crest.',
    cost: 160,
    icon: '💧',
    category: 'gift',
    stock: 'Physical item',
  },
]

export function findRewardItem(id: string): RewardItem | undefined {
  return REWARD_ITEMS.find((i) => i.id === id)
}
