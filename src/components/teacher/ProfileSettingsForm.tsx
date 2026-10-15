'use client'

import { useState, useTransition } from 'react'
import {
  Save,
  Loader2,
  User,
  Phone,
  GraduationCap,
  BookOpen,
  Image as ImageIcon,
  AlignLeft,
  Sparkles,
  CheckCircle2,
  Plus,
  X,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { updateProfile } from '@/app/actions/teacher'

export interface TeacherProfileData {
  id: string
  fullName: string
  email?: string | null
  phone: string
  bio: string
  avatarUrl: string
  qualifications: string
  subjectsTaught: string[]
  schoolName?: string
}

interface TeacherProfileSettingsProps {
  initialData: TeacherProfileData
}

const COMMON_SUBJECT_SUGGESTIONS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'English Literature',
  'World History',
  'Geography',
  'Physical Education',
  'Fine Arts',
  'Economics',
]

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=faces',
]

export default function TeacherProfileSettings({ initialData }: TeacherProfileSettingsProps) {
  const [fullName, setFullName] = useState(initialData.fullName || '')
  const [phone, setPhone] = useState(initialData.phone || '')
  const [bio, setBio] = useState(initialData.bio || '')
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl || '')
  const [qualifications, setQualifications] = useState(initialData.qualifications || '')
  const [subjectsTaught, setSubjectsTaught] = useState<string[]>(initialData.subjectsTaught || [])
  const [newSubjectInput, setNewSubjectInput] = useState('')
  const [avatarPreviewError, setAvatarPreviewError] = useState(false)

  const [isPending, startTransition] = useTransition()

  function handleAddSubject(subjectToAdd: string) {
    const trimmed = subjectToAdd.trim()
    if (!trimmed) return
    if (subjectsTaught.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Subject already added.')
      return
    }
    if (subjectsTaught.length >= 15) {
      toast.error('Maximum 15 subjects allowed.')
      return
    }
    setSubjectsTaught((prev) => [...prev, trimmed])
    setNewSubjectInput('')
  }

  function handleRemoveSubject(subjectToRemove: string) {
    setSubjectsTaught((prev) => prev.filter((s) => s !== subjectToRemove))
  }

  function handleKeyDownNewSubject(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddSubject(newSubjectInput)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const trimmedName = fullName.trim()
    if (!trimmedName) {
      toast.error('Full name is required.')
      return
    }

    startTransition(async () => {
      const res = await updateProfile({
        full_name: trimmedName,
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        qualifications: qualifications.trim() || null,
        subjects_taught: subjectsTaught,
      })

      if (res.success) {
        toast.success('Teacher profile updated successfully! 🎉')
      } else {
        toast.error(res.error || 'Failed to update profile.')
      }
    })
  }

  const initials = fullName
    ? fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'T'

  return (
    <div className="space-y-8">
      {/* ── Profile Hero Banner Card ── */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/80 shadow-xs">
        {/* Decorative Top Banner */}
        <div className="h-40 sm:h-48 w-full bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent pointer-events-none" />
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute left-1/3 -bottom-20 w-80 h-80 bg-violet-400/20 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Profile Identity Bar */}
        <div className="px-6 sm:px-8 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20">
            {/* Avatar with Ring */}
            <div className="flex items-end gap-5">
              <div className="relative group">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-slate-900 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center text-white text-3xl font-bold transition-transform group-hover:scale-[1.02]">
                  {avatarUrl && !avatarPreviewError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt={fullName}
                      onError={() => setAvatarPreviewError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="tracking-wider">{initials}</span>
                  )}
                </div>
                <div className="absolute bottom-1 right-1 p-1.5 bg-emerald-500 rounded-full border-2 border-white" title="Active Faculty" />
              </div>

              {/* Title & Tagline */}
              <div className="space-y-1 mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {fullName || 'Your Name'}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-800">
                    <ShieldCheck size={13} />
                    Verified Teacher
                  </span>
                </div>
                <p className="text-sm text-slate-500 flex items-center gap-2 flex-wrap">
                  <span>{initialData.schoolName || 'EduSpark Academy'}</span>
                  {qualifications && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-600 font-medium">{qualifications.split('\n')[0]}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Save Button for quick action on desktop */}
            <div className="self-end sm:self-auto hidden sm:block">
              <button
                type="button"
                onClick={() => {
                  const form = document.getElementById('teacher-profile-form') as HTMLFormElement
                  if (form) form.requestSubmit()
                }}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-sm font-semibold shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/30 transition-all disabled:opacity-50"
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isPending ? 'Saving Profile...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-Column Main Layout ── */}
      <form id="teacher-profile-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols): Primary Profile Fields */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Core Information */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
                <User size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Basic Information</h3>
                <p className="text-xs text-slate-400">Your public identity on class cards and timetable</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Eleanor Vance"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1 (555) 234-5678"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Email (Read-only reference) */}
            {initialData.email && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    disabled
                    value={initialData.email}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-sm cursor-not-allowed select-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400">Email is linked to your school authentication account.</p>
              </div>
            )}

            {/* Bio / About */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Bio / About Me
                </label>
                <span className="text-[11px] text-slate-400">{bio.length} / 1000</span>
              </div>
              <textarea
                rows={4}
                value={bio}
                maxLength={1000}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your teaching philosophy, years of experience, or what students can expect in your classroom..."
                className="w-full p-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition-all resize-none"
              />
            </div>
          </div>

          {/* Card 2: Professional Qualifications */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <GraduationCap size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Academic Qualifications & Degrees</h3>
                <p className="text-xs text-slate-400">List your degrees, certifications, or licenses</p>
              </div>
            </div>

            <textarea
              rows={3}
              value={qualifications}
              maxLength={1000}
              onChange={(e) => setQualifications(e.target.value)}
              placeholder="e.g. Ph.D. in Applied Mathematics (MIT)&#10;M.Ed. in Secondary Education (Columbia)&#10;State Certified Master Educator"
              className="w-full p-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all font-mono text-xs leading-relaxed"
            />
            <p className="text-[11px] text-slate-400">Tip: Put one degree or certification per line for clean display.</p>
          </div>

          {/* Card 3: Subjects Taught (Critical for AI Timetable Solver) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Subjects & Courses Taught</h3>
                  <p className="text-xs text-slate-400">Used by the AI auto-scheduler to assign you the right periods</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {subjectsTaught.length} added
              </span>
            </div>

            {/* Input for adding new subject */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={newSubjectInput}
                  onChange={(e) => setNewSubjectInput(e.target.value)}
                  onKeyDown={handleKeyDownNewSubject}
                  placeholder="Type a subject name and press Enter..."
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
                />
              </div>
              <button
                type="button"
                onClick={() => handleAddSubject(newSubjectInput)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Plus size={16} />
                Add
              </button>
            </div>

            {/* Current Subjects Tags */}
            <div className="min-h-[48px] p-3 rounded-2xl bg-slate-50/70 border border-slate-100 flex flex-wrap gap-2 items-center">
              {subjectsTaught.length === 0 ? (
                <span className="text-xs text-slate-400 italic">
                  No subjects added yet. Add subjects to ensure the AI auto-schedule tool accurately routes timetable slots to you.
                </span>
              ) : (
                subjectsTaught.map((subject) => (
                  <span
                    key={subject}
                    className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-semibold shadow-2xs group"
                  >
                    <span>{subject}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubject(subject)}
                      className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Quick Suggestions */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Popular Suggestions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SUBJECT_SUGGESTIONS.map((subj) => {
                  const alreadyAdded = subjectsTaught.some((s) => s.toLowerCase() === subj.toLowerCase())
                  return (
                    <button
                      key={subj}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => handleAddSubject(subj)}
                      className={`text-xs px-2.5 py-1 rounded-xl border transition-colors ${
                        alreadyAdded
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-default line-through'
                          : 'bg-white text-slate-600 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200 border-slate-200'
                      }`}
                    >
                      + {subj}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Profile Avatar & Quick Preview */}
        <div className="lg:col-span-4 space-y-6">
          {/* Avatar Settings Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <ImageIcon size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Profile Picture</h3>
                <p className="text-xs text-slate-400">Direct photo URL or preset avatar</p>
              </div>
            </div>

            {/* Avatar URL Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Avatar Image URL
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => {
                  setAvatarUrl(e.target.value)
                  setAvatarPreviewError(false)
                }}
                placeholder="https://example.com/photo.jpg"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all font-mono"
              />
              <p className="text-[11px] text-slate-400">Paste any public image link (Unsplash, Gravatar, Cloudinary, etc.)</p>
            </div>

            {/* Quick Avatar Presets */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Or pick a preset avatar:
              </span>
              <div className="flex items-center gap-2 justify-between">
                {AVATAR_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAvatarUrl(preset)
                      setAvatarPreviewError(false)
                    }}
                    className={`w-11 h-11 rounded-2xl overflow-hidden border-2 transition-all hover:scale-105 ${
                      avatarUrl === preset ? 'border-violet-600 ring-2 ring-violet-200' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preset} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Stats / Summary Card */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-6 text-white space-y-4 shadow-md">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h4 className="font-bold text-sm text-white">Teacher Portal Sync</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Updating your profile helps your school administrator and AI auto-scheduler assign your exact subject periods and prevents timetable overlaps.
            </p>
            <div className="pt-2 border-t border-slate-800 text-xs text-slate-400 space-y-1.5">
              <div className="flex justify-between">
                <span>Subjects Configured:</span>
                <span className="text-white font-semibold">{subjectsTaught.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Verified Status:</span>
                <span className="text-emerald-400 font-semibold">Active Staff</span>
              </div>
            </div>
          </div>

          {/* Save Action for Mobile / Bottom of page */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-semibold text-sm shadow-lg shadow-violet-500/25 transition-all disabled:opacity-50"
            >
              {isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {isPending ? 'Saving Changes...' : 'Save All Profile Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
