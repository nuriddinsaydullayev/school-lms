// Shared Forum types & constants (used by client page, server actions, and API routes)

export const FORUM_SUBJECTS = [
  'Math', 'Physics', 'Chemistry', 'Literature', 'History', 'English', 'Other',
] as const
export type ForumSubject = (typeof FORUM_SUBJECTS)[number]

export const FORUM_GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const

export type QuestionStatus = 'open' | 'solved' | 'closed'
export type QualityTier    = 'excellent' | 'good' | 'partial' | 'poor'

/** Hours a question must stay open before its author may close & reclaim. */
export const CLOSE_AFTER_HOURS = 24

/** "Hard question" bonus: 20 % of the bounty, min 2, max 10 tokens. */
export function hardQuestionBonus(bounty: number): number {
  return Math.min(10, Math.max(2, Math.ceil(bounty * 0.2)))
}

/** Max hard-question bonuses a student may claim per rolling 7 days. */
export const MAX_BONUS_CLAIMS_PER_WEEK = 2

export interface ForumAnswerDTO {
  id:         string
  authorId:   string
  authorName: string
  body:       string
  likes:      number
  isAccepted: boolean
  createdAt:  string
}

export interface ForumQuestionDTO {
  id:          string
  authorId:    string
  authorName:  string
  title:       string
  body:        string
  subject:     string
  bounty:      number
  targetGrade: number | null
  isAiGraded:  boolean
  status:      QuestionStatus
  createdAt:   string
  answers:     ForumAnswerDTO[]
}

export interface ForumData {
  currentUserId: string | null
  balance:       number
  questions:     ForumQuestionDTO[]
  error?:        string
}

export interface AcceptResult {
  success:        boolean
  tokensAwarded?: number
  refunded?:      number
  qualityTier?:   QualityTier | null
  aiRationale?:   string | null
  aiVerified?:    boolean
  warning?:       string
  error?:         string
}

export interface CloseResult {
  success:   boolean
  refunded?: number
  bonus?:    number
  bonusSkippedReason?: string
  warning?:  string
  error?:    string
}
