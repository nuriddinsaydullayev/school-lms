import { google } from '@ai-sdk/google'
import { streamText, type UIMessage } from 'ai'
import { createClient } from '@/utils/supabase/server'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(request: Request) {
  // ── Auth guard ─────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // ── Parse request body ─────────────────────────────────────
  // useChat (AI SDK v7) sends { messages, id } plus any extra `body` fields
  const {
    messages,
    assignmentId,
    assignmentTitle,
    assignmentDescription,
  }: {
    messages: UIMessage[]
    assignmentId?: string
    assignmentTitle?: string
    assignmentDescription?: string
  } = await request.json()

  // ── System prompt ──────────────────────────────────────────
  const systemPrompt = [
    'You are EduSpark AI — a friendly, encouraging tutor inside a school Learning Management System.',
    '',
    'Your core principles:',
    '1. NEVER give direct answers or write complete solutions. Guide students to discover answers themselves.',
    '2. Break complex problems into small, digestible steps.',
    '3. Ask Socratic questions to prompt thinking (e.g. "What do you already know about this topic?").',
    '4. Be encouraging — celebrate effort, not just results.',
    '5. Use simple, age-appropriate language. Avoid jargon unless explaining it.',
    '6. Keep responses concise (3–5 sentences max per turn) unless asked to elaborate.',
    '7. Use emojis sparingly to keep the tone warm (e.g. ✅ for correct steps, 💡 for hints).',
    '',
    assignmentTitle
      ? `Current assignment: "${assignmentTitle}"`
      : 'The student is asking a general question (not tied to a specific assignment).',
    assignmentDescription ? `Assignment details: ${assignmentDescription}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  // ── Map incoming messages to CoreMessage[] for streamText ──
  // useChat might send `.content` (string) or `.parts` (array). We normalize it.
  const coreMessages = messages.map((m: any) => ({
    role: m.role,
    content: m.content || m.parts?.map((p: any) => p.text).join('') || '',
  }))

  // ── Stream the response ────────────────────────────────────
  const result = streamText({
    model: google('gemini-3.5-flash'),
    system: systemPrompt,
    messages: coreMessages,
    maxOutputTokens: 600,
    temperature: 0.7,

    // Log the interaction to the DB after the stream completes
    onFinish: async ({ text, usage }) => {
      // Find the last user message to log as the prompt
      const lastUser = coreMessages.reverse().find((m) => m.role === 'user')
      const promptText = lastUser?.content ?? ''

      if (promptText) {
        const { error } = await supabase.from('ai_tutor_logs').insert({
          student_id:    user.id,
          assignment_id: assignmentId ?? null,
          prompt:        promptText,
          response:      text,
          model:         'gemini-3.5-flash',
          tokens_used:   usage.totalTokens,
        })

        if (error) {
          console.error('[api/chat] Failed to log AI interaction:', error.message)
        }
      }
    },
  })

  // AI SDK v7: toUIMessageStreamResponse() replaces toDataStreamResponse()
  return result.toUIMessageStreamResponse()
}
