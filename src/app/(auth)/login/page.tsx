'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import toast from 'react-hot-toast'
import {
  BookOpen,
  GraduationCap,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  Star,
  Trophy,
  Brain,
  Building2,
  ChevronDown,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────
type AuthMode = 'login' | 'signup'
type UserRole = 'student' | 'teacher'

interface School {
  id: string
  name: string
  subdomain: string
}

// ── Small feature-badge component ─────────────────────────────
function FeatureBadge({
  icon: Icon,
  text,
}: {
  icon: React.ElementType
  text: string
}) {
  return (
    <div className="flex items-center gap-2 text-indigo-200 text-sm">
      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/10">
        <Icon className="w-4 h-4" />
      </div>
      <span>{text}</span>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode]             = useState<AuthMode>('login')
  const [role, setRole]             = useState<UserRole>('student')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [fullName, setFullName]     = useState('')
  const [schoolId, setSchoolId]     = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [schools, setSchools]       = useState<School[]>([])
  const [schoolsLoading, setSchoolsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]       = useState(false)

  // ── Fetch schools when user switches to sign-up mode ──────────
  useEffect(() => {
    if (mode !== 'signup') return
    setSchoolsLoading(true)
    supabase
      .from('schools')
      .select('id, name, subdomain')
      .order('name')
      .then(({ data, error }) => {
        if (!error && data) {
          setSchools(data)
          // Pre-select first school if available
          if (data.length > 0 && !schoolId) {
            setSchoolId(data[0].id)
          }
        }
        setSchoolsLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // ── Handlers ──────────────────────────────────────────────────

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    // Fetch role from profiles to redirect correctly
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle()

    toast.success(`Welcome back!`)
    router.push(profile?.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard')
    router.refresh()
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()

    if (!schoolId) {
      toast.error('Please select a school to continue.')
      return
    }
    if (!inviteCode.trim()) {
      toast.error('Please enter the invite code given by your school.')
      return
    }

    setLoading(true)

    // ── Validate invite code against the DB before touching Auth ──
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, invite_code')
      .eq('id', schoolId)
      .maybeSingle()

    if (schoolError || !school) {
      toast.error('Could not verify school. Please try again.')
      setLoading(false)
      return
    }

    if (school.invite_code.toUpperCase() !== inviteCode.trim().toUpperCase()) {
      toast.error('Invalid invite code. Please check with your school administrator.')
      setLoading(false)
      return
    }

    // ── Invite code is valid — proceed with sign-up ───────────────
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          school_id: schoolId,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success('Account created! Check your email to confirm your address.')
    setLoading(false)
    setMode('login')
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex">

      {/* ── Left panel: Branding ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 flex-col justify-between p-12 relative overflow-hidden">

        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 bg-white/20 rounded-xl backdrop-blur-sm">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-white font-bold text-2xl tracking-tight">EduSpark</span>
        </div>

        {/* Hero text */}
        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Learning reimagined
            <br />
            <span className="text-indigo-200">with AI &amp; play.</span>
          </h1>
          <p className="text-indigo-200 text-lg leading-relaxed max-w-sm">
            Earn XP, collect tokens, get instant AI help, and track your progress — all in one place.
          </p>

          {/* Feature badges */}
          <div className="space-y-3 pt-2">
            <FeatureBadge icon={Brain}    text="AI Tutor — hints when you're stuck" />
            <FeatureBadge icon={Trophy}   text="Earn tokens & climb the leaderboard" />
            <FeatureBadge icon={Star}     text="XP levels that track your growth" />
            <FeatureBadge icon={BookOpen} text="Smart assignments with AI feedback" />
          </div>
        </div>

        {/* Footer */}
        <p className="relative text-indigo-300 text-sm">
          © {new Date().getFullYear()} EduSpark. Built for curious minds.
        </p>
      </div>

      {/* ── Right panel: Auth form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50">
        <div className="w-full max-w-md space-y-8">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex items-center justify-center w-9 h-9 bg-indigo-600 rounded-xl">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-800">EduSpark</span>
          </div>

          {/* Heading */}
          <div>
            <h2 className="text-3xl font-bold text-slate-900">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-2 text-slate-500">
              {mode === 'login'
                ? "Sign in to continue your learning journey."
                : "Join EduSpark and start earning XP today."}
            </p>
          </div>

          {/* Mode toggle tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
            {(['login', 'signup'] as AuthMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  mode === m
                    ? 'bg-white text-indigo-600 shadow-sm shadow-slate-200'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form
            onSubmit={mode === 'login' ? handleLogin : handleSignup}
            className="space-y-5"
          >

            {/* ── Sign-up only: Full name ── */}
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700" htmlFor="fullName">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  placeholder="Ali Hassan"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
            )}

            {/* ── Sign-up only: School selector ── */}
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700" htmlFor="school">
                  School
                </label>
                {schoolsLoading ? (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading schools...
                  </div>
                ) : schools.length === 0 ? (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm">
                    <Building2 className="w-4 h-4 flex-shrink-0" />
                    No schools found. Ask your admin to create one first.
                  </div>
                ) : (
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                      <Building2 className="w-4 h-4 text-slate-400" />
                    </div>
                    <select
                      id="school"
                      required
                      value={schoolId}
                      onChange={(e) => setSchoolId(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition appearance-none"
                    >
                      <option value="" disabled>Select your school…</option>
                      {schools.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Sign-up only: Invite Code ── */}
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700" htmlFor="inviteCode">
                  Invite Code
                </label>
                <input
                  id="inviteCode"
                  type="text"
                  required
                  placeholder="e.g. SPARK2025"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={12}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-mono placeholder-slate-400 tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
                <p className="text-xs text-slate-400">Ask your school administrator for the invite code.</p>
              </div>
            )}

            {/* ── Sign-up only: Role selector ── */}
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  I am a…
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Student */}
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                      role === 'student'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${role === 'student' ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm">Student</p>
                      <p className="text-xs opacity-70">Learn &amp; earn</p>
                    </div>
                  </button>

                  {/* Teacher */}
                  <button
                    type="button"
                    onClick={() => setRole('teacher')}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                      role === 'teacher'
                        ? 'border-violet-500 bg-violet-50 text-violet-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${role === 'teacher' ? 'bg-violet-100' : 'bg-slate-100'}`}>
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm">Teacher</p>
                      <p className="text-xs opacity-70">Teach &amp; manage</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@school.dev"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700" htmlFor="password">
                  Password
                </label>
                {mode === 'login' && (
                  <Link
                    href="/forgot-password"
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || (mode === 'signup' && (schoolsLoading || schools.length === 0))}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-200"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'login' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Bottom toggle */}
          <p className="text-center text-sm text-slate-500">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="font-semibold text-indigo-600 hover:text-indigo-700 transition"
            >
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
