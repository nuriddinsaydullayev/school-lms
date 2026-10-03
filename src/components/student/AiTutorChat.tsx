'use client'

import { useChat } from '@ai-sdk/react'
import { type UIMessage, DefaultChatTransport } from 'ai'
import { useRef, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import toast from 'react-hot-toast'
import { createClient } from '@/utils/supabase/client'
import {
  Brain,
  Send,
  Loader2,
  X,
  ChevronDown,
  Sparkles,
  User,
  RotateCcw,
  Mic,
  MicOff,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────
interface AiTutorChatProps {
  /** If the student opened the tutor from an assignment page */
  assignmentId?: string
  assignmentTitle?: string
  assignmentDescription?: string
  /** 'bubble' = floating FAB (default). 'panel' = embedded full-height. */
  variant?: 'bubble' | 'panel'
}

// ── Helpers: extract plain text from a UIMessage ──────────────
function getMessageText(message: UIMessage): string {
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((p) => p.type === 'text')
      .map((p) => (p as { type: 'text'; text: string }).text)
      .join('')
  }
  return ''
}

// ── Message bubble ─────────────────────────────────────────────
function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user'
  const text   = getMessageText(message)
  if (!text) return null

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-white ${
          isUser
            ? 'bg-indigo-500'
            : 'bg-gradient-to-br from-violet-500 to-purple-600'
        }`}
      >
        {isUser ? <User size={14} /> : <Sparkles size={14} />}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm whitespace-pre-wrap'
            : 'bg-slate-100 text-slate-800 rounded-tl-sm'
        }`}
      >
        {isUser ? (
          text
        ) : (
          <div className="prose prose-sm max-w-none text-slate-800 break-words">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                code: ({ className, children, ...props }) => {
                  const isInline = !className
                  return isInline ? (
                    <code className="bg-slate-200/80 text-slate-900 rounded px-1.5 py-0.5 text-xs font-mono" {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-slate-900 text-slate-100 rounded-lg p-2.5 my-2 text-xs font-mono overflow-x-auto" {...props}>
                      {children}
                    </code>
                  )
                },
                strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
              }}
            >
              {text}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Typing indicator ───────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
        <Sparkles size={14} className="text-white" />
      </div>
      <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Welcome message factory ────────────────────────────────────
function makeWelcomeMessage(assignmentTitle?: string): UIMessage {
  return {
    id: 'welcome',
    role: 'assistant',
    parts: [
      {
        type: 'text',
        text: assignmentTitle
          ? `Hi! I'm your AI Tutor 👋 I can see you're working on **"${assignmentTitle}"**. What would you like help understanding? Remember, I'll guide you — not just give you the answer! 💡`
          : "Hi! I'm your AI Tutor 👋 Ask me anything about your lessons or assignments. I'm here to help you understand, not just give answers! 💡",
      },
    ],
  }
}

// ── Main Component ─────────────────────────────────────────────
export default function AiTutorChat({
  assignmentId,
  assignmentTitle,
  assignmentDescription,
  variant = 'bubble',
}: AiTutorChatProps) {
  const [isOpen, setIsOpen] = useState(variant === 'panel')
  const [inputText, setInputText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<any>(null)

  const storageKey = `eduspark_ai_chat_${assignmentId ?? 'general'}`

  // ── AI SDK v7 useChat ─────────────────────────────────────
  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: {
        assignmentId,
        assignmentTitle,
        assignmentDescription,
      }
    }),
    messages: [makeWelcomeMessage(assignmentTitle)],
    onError: (error) => {
      console.error('[AiTutorChat]', error)
    },
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  // ── Restore chat history from localStorage or Supabase ────
  useEffect(() => {
    let restored = false

    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed)
          restored = true
        }
      }
    } catch (e) {
      console.warn('Failed to parse chat from localStorage', e)
    }

    if (!restored) {
      // Fallback: load recent prompt/response logs from Supabase
      const supabase = createClient()
      let query = supabase
        .from('ai_tutor_logs')
        .select('id, prompt, response, created_at')
        .order('created_at', { ascending: true })
        .limit(8)

      if (assignmentId) {
        query = query.eq('assignment_id', assignmentId)
      }

      query.then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const historyMessages: UIMessage[] = [
            makeWelcomeMessage(assignmentTitle),
          ]
          data.forEach((log) => {
            historyMessages.push({
              id: `user-${log.id}`,
              role: 'user',
              parts: [{ type: 'text', text: log.prompt }],
            })
            historyMessages.push({
              id: `assistant-${log.id}`,
              role: 'assistant',
              parts: [{ type: 'text', text: log.response }],
            })
          })
          setMessages(historyMessages)
        }
      })
    }
  }, [assignmentId, storageKey, setMessages, assignmentTitle])

  // ── Persist messages to localStorage on change ─────────────
  useEffect(() => {
    if (messages.length > 1) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages))
      } catch (e) {
        console.warn('Failed to save chat to localStorage', e)
      }
    }
  }, [messages, storageKey])

  // Initialize SpeechRecognition on mount
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event: any) => {
        let transcript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }
        setInputText((prev) => {
          const trimmed = prev.trim()
          return trimmed ? `${trimmed} ${transcript}` : transcript
        })
      }

      recognition.onerror = (event: any) => {
        console.error('[SpeechRecognition error]', event.error)
        setIsListening(false)
        if (event.error === 'not-allowed') {
          toast.error('Microphone access was denied. Please allow microphone permission.')
        } else if (event.error !== 'no-speech') {
          toast.error(`Voice error: ${event.error}`)
        }
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }
  }, [])

  function toggleListening() {
    if (!recognitionRef.current) {
      toast.error('Voice dictation is not supported in this browser.')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
        toast('Listening… speak your question', { icon: '🎙️' })
      } catch (err) {
        console.error(err)
      }
    }
  }

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen])

  // ── Send handler ─────────────────────────────────────────
  function handleSend() {
    const text = inputText.trim()
    if (!text || isLoading) return
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
    sendMessage({ text })
    setInputText('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleReset() {
    try {
      localStorage.removeItem(storageKey)
    } catch (e) {}
    setMessages([makeWelcomeMessage(assignmentTitle)])
    toast.success('Conversation history reset')
  }

  // ── Chat panel (shared between bubble and panel variants) ──
  const chatPanel = (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">AI Tutor</p>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${
                isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'
              }`} />
              {isLoading ? 'Thinking…' : 'Online'}
            </p>
          </div>
        </div>
        <button
          onClick={handleReset}
          title="Clear conversation history"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'Listening… speak clearly into your mic' : 'Ask a question… (Enter to send)'}
            rows={1}
            disabled={isLoading}
            className={`flex-1 resize-none px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition disabled:opacity-50 max-h-32 ${
              isListening
                ? 'border-rose-300 bg-rose-50/40 focus:ring-rose-400'
                : 'border-slate-200 bg-slate-50 focus:ring-indigo-400'
            }`}
          />

          {/* Microphone speech-to-text button */}
          <button
            type="button"
            onClick={toggleListening}
            disabled={isLoading}
            title={isListening ? 'Stop listening' : 'Voice input (Dictate question)'}
            className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl transition ${
              isListening
                ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse shadow-md shadow-rose-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          {/* Send button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading
              ? <Loader2 size={16} className="animate-spin" />
              : <Send    size={16} />}
          </button>
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">
          {isListening ? '🎙️ Speak now — click mic again when finished' : 'AI may make mistakes. Always verify with your teacher.'}
        </p>
      </div>
    </div>
  )

  // ── Panel variant ─────────────────────────────────────────
  if (variant === 'panel') return chatPanel

  // ── Bubble variant: floating button + popup ───────────────
  const messageCount = messages.filter((m) => m.role === 'user').length

  return (
    <>
      {/* Floating chat window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[540px] shadow-2xl shadow-indigo-200/50 rounded-2xl flex flex-col">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-3 right-3 z-10 p-1 rounded-full bg-white/80 backdrop-blur-sm text-slate-500 hover:text-slate-800 transition"
            aria-label="Close AI Tutor"
          >
            <X size={14} />
          </button>
          {chatPanel}
        </div>
      )}

      {/* Floating action button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? 'Close AI Tutor' : 'Open AI Tutor'}
        className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg transition-all duration-300 ${
          isOpen
            ? 'bg-slate-700 text-white shadow-slate-300'
            : 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-indigo-300 hover:shadow-xl hover:scale-105'
        }`}
      >
        {isOpen ? (
          <>
            <ChevronDown size={18} />
            <span className="text-sm font-medium">Minimise</span>
          </>
        ) : (
          <>
            <Brain size={18} />
            <span className="text-sm font-medium">AI Tutor</span>
            {messageCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-xs font-bold">
                {messageCount}
              </span>
            )}
          </>
        )}
      </button>
    </>
  )
}
