'use client'

import { useState, useTransition } from 'react'
import { Save, Loader2, User, Image, AlignLeft, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface StudentProfileFormProps {
  initialData: {
    fullName:  string
    avatarUrl: string
    bio:       string
  }
}

export default function StudentProfileForm({ initialData }: StudentProfileFormProps) {
  const [fullName, setFullName]   = useState(initialData.fullName)
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl)
  const [bio, setBio]             = useState(initialData.bio)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const trimmedName = fullName.trim()
    if (!trimmedName) {
      toast.error('Name cannot be empty')
      return
    }

    startTransition(async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        toast.error('You must be signed in to update your profile.')
        return
      }

      // Update full_name, avatar_url, and bio via authenticated RLS grant
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name:  trimmedName,
          avatar_url: avatarUrl.trim() || null,
          bio:        bio.trim() || null,
        })
        .eq('id', user.id)

      if (error) {
        toast.error(error.message || 'Failed to update profile.')
        return
      }

      toast.success('Profile updated successfully! 🎉')
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 max-w-2xl">
      <div className="flex items-center gap-3 pb-6 mb-6 border-b border-slate-100">
        <div className="relative">
          {avatarUrl.trim() ? (
            <img
              src={avatarUrl.trim()}
              alt={fullName || 'Avatar'}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-100 shadow-sm"
              onError={(e) => {
                // Fallback to placeholder if URL broken
                ;(e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                  fullName || 'User'
                )}`
              }}
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-indigo-100">
              {fullName ? fullName.charAt(0).toUpperCase() : <User size={24} />}
            </div>
          )}
        </div>
        <div>
          <h2 className="font-bold text-slate-800 text-lg leading-tight">
            {fullName || 'Student'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">Preview of your public profile</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider">
            <User size={14} className="text-indigo-600" />
            Full Name
          </label>
          <input
            type="text"
            required
            maxLength={100}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Alex Morgan"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
          />
        </div>

        {/* Avatar URL */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider">
            <Image size={14} className="text-indigo-600" />
            Avatar Image URL
          </label>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/my-photo.jpg"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
          />
          <p className="text-[11px] text-slate-400">
            Paste a link to any direct image file (e.g. Unsplash, Discord, Dicebear).
          </p>
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider">
            <AlignLeft size={14} className="text-indigo-600" />
            Bio & Interests
          </label>
          <textarea
            rows={4}
            maxLength={300}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell your classmates about your favorite subjects, hobbies, or study goals..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition resize-none"
          />
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Brief introduction visible to classmates.</span>
            <span>{bio.length}/300</span>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition shadow-md shadow-indigo-100 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
