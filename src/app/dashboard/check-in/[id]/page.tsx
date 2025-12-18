'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  CalendarCheck,
  Sun,
  CloudSun,
  Moon,
  Star,
  AlertTriangle,
  FileText,
  Save,
  Loader2,
  Check,
  AlertCircle,
  Smile,
  Meh,
  Frown,
  Heart,
  Trash2,
  X,
  FileVideo,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type CheckInType = 'morning' | 'midday' | 'evening'
type Mood = 'great' | 'good' | 'okay' | 'struggling' | null

interface ProjectUpdate {
  id: string
  project_id: string
  update_text: string | null
  is_win: boolean
  is_blocker: boolean
  blocker_description: string | null
  project: {
    id: string
    name: string
  } | null
}

interface Upload {
  id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  user_context: string | null
}

interface CheckIn {
  id: string
  user_id: string
  check_in_type: CheckInType
  check_in_date: string
  general_notes: string | null
  mood: Mood
  created_at: string
  project_updates: ProjectUpdate[]
  uploads: Upload[]
}

const checkInConfig = {
  morning: {
    label: 'Morning Check-in',
    icon: Sun,
    color: 'var(--accent-amber)',
  },
  midday: {
    label: 'Midday Check-in',
    icon: CloudSun,
    color: 'var(--accent-teal)',
  },
  evening: {
    label: 'Evening Check-in',
    icon: Moon,
    color: 'var(--accent-coral)',
  },
}

const moodOptions: { value: Mood; label: string; icon: typeof Smile; color: string }[] = [
  { value: 'great', label: 'Great', icon: Heart, color: 'var(--accent-coral)' },
  { value: 'good', label: 'Good', icon: Smile, color: 'var(--accent-teal)' },
  { value: 'okay', label: 'Okay', icon: Meh, color: 'var(--accent-amber)' },
  { value: 'struggling', label: 'Struggling', icon: Frown, color: 'var(--text-muted)' },
]

export default function CheckInDetailPage() {
  const router = useRouter()
  const params = useParams()
  const checkInId = params.id as string

  const [checkIn, setCheckIn] = useState<CheckIn | null>(null)
  const [generalNotes, setGeneralNotes] = useState('')
  const [mood, setMood] = useState<Mood>(null)
  const [projectUpdates, setProjectUpdates] = useState<ProjectUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedImage, setSelectedImage] = useState<Upload | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadCheckIn()
  }, [checkInId])

  // Helper to get proper image URL from Supabase storage
  const getImageUrl = (fileUrl: string): string => {
    if (fileUrl.startsWith('http')) {
      return fileUrl
    }
    const { data } = supabase.storage.from('uploads').getPublicUrl(fileUrl)
    return data.publicUrl
  }

  const loadCheckIn = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('check_ins')
        .select(`
          id,
          user_id,
          check_in_type,
          check_in_date,
          general_notes,
          mood,
          created_at,
          project_updates (
            id,
            project_id,
            update_text,
            is_win,
            is_blocker,
            blocker_description,
            project:projects (id, name)
          ),
          uploads (
            id,
            file_name,
            file_url,
            file_type,
            file_size,
            user_context
          )
        `)
        .eq('id', checkInId)
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        console.error('Error loading check-in:', error)
        router.push('/dashboard/check-in/history')
        return
      }

      setCheckIn(data as CheckIn)
      setGeneralNotes(data.general_notes || '')
      setMood(data.mood)
      setProjectUpdates(data.project_updates as ProjectUpdate[])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!checkIn) return

    setSaving(true)
    setMessage(null)

    try {
      // Update check-in
      const { error: checkInError } = await supabase
        .from('check_ins')
        .update({
          general_notes: generalNotes || null,
          mood,
        })
        .eq('id', checkIn.id)

      if (checkInError) throw checkInError

      // Update project updates
      for (const update of projectUpdates) {
        const { error: updateError } = await supabase
          .from('project_updates')
          .update({
            update_text: update.update_text,
            is_win: update.is_win,
            is_blocker: update.is_blocker,
            blocker_description: update.is_blocker ? update.blocker_description : null,
          })
          .eq('id', update.id)

        if (updateError) throw updateError
      }

      setMessage({ type: 'success', text: 'Changes saved!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error saving:', error)
      setMessage({ type: 'error', text: 'Failed to save changes' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!checkIn) return

    setDeleting(true)

    try {
      // Delete uploads from storage
      for (const upload of checkIn.uploads) {
        try {
          const url = new URL(upload.file_url)
          const pathParts = url.pathname.split('/uploads/')
          if (pathParts.length > 1) {
            const filePath = decodeURIComponent(pathParts[1])
            await supabase.storage.from('uploads').remove([filePath])
          }
        } catch {
          // Continue even if file deletion fails
        }
      }

      // Delete upload records
      await supabase
        .from('uploads')
        .delete()
        .eq('check_in_id', checkIn.id)

      // Delete project updates
      await supabase
        .from('project_updates')
        .delete()
        .eq('check_in_id', checkIn.id)

      // Delete check-in
      const { error } = await supabase
        .from('check_ins')
        .delete()
        .eq('id', checkIn.id)

      if (error) throw error

      router.push('/dashboard/check-in/history')
    } catch (error) {
      console.error('Error deleting:', error)
      setMessage({ type: 'error', text: 'Failed to delete check-in' })
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const updateProjectUpdate = (
    updateId: string,
    field: keyof ProjectUpdate,
    value: string | boolean | null
  ) => {
    setProjectUpdates(prev =>
      prev.map(u => u.id === updateId ? { ...u, [field]: value } : u)
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2
            className="w-8 h-8 mx-auto mb-4 animate-spin"
            style={{ color: 'var(--accent-coral)' }}
          />
          <p style={{ color: 'var(--text-muted)' }}>Loading check-in...</p>
        </div>
      </div>
    )
  }

  if (!checkIn) {
    return (
      <div className="text-center py-12">
        <p style={{ color: 'var(--text-muted)' }}>Check-in not found</p>
        <Link
          href="/dashboard/check-in/history"
          className="text-sm mt-4 inline-block"
          style={{ color: 'var(--accent-coral)' }}
        >
          Back to history
        </Link>
      </div>
    )
  }

  const config = checkInConfig[checkIn.check_in_type]
  const Icon = config.icon

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <header className="animate-fade-in-up">
        <Link
          href="/dashboard/check-in/history"
          className="inline-flex items-center gap-2 text-sm mb-4 transition-colors hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to history
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: `${config.color}20` }}
              >
                <Icon className="w-6 h-6" style={{ color: config.color }} />
              </div>
              <div>
                <h1
                  className="text-2xl font-bold"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
                >
                  {config.label}
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {formatDate(checkIn.check_in_date)} at {formatTime(checkIn.created_at)}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-3 rounded-xl transition-all duration-200 hover:scale-105"
            style={{
              background: 'rgba(255, 107, 107, 0.1)',
              color: 'var(--accent-coral)',
            }}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Messages */}
      {message && (
        <div
          className="flex items-center gap-3 px-5 py-4 rounded-xl animate-fade-in-up border-l-4"
          style={{
            background: message.type === 'success' ? 'rgba(45, 212, 191, 0.1)' : 'rgba(255, 107, 107, 0.1)',
            borderLeftColor: message.type === 'success' ? 'var(--accent-teal)' : 'var(--accent-coral)',
          }}
        >
          {message.type === 'success' ? (
            <Check className="w-5 h-5" style={{ color: 'var(--accent-teal)' }} />
          ) : (
            <AlertCircle className="w-5 h-5" style={{ color: 'var(--accent-coral)' }} />
          )}
          <span
            className="text-sm font-medium"
            style={{ color: message.type === 'success' ? 'var(--accent-teal)' : 'var(--accent-coral)' }}
          >
            {message.text}
          </span>
        </div>
      )}

      {/* Project Updates */}
      {projectUpdates.length > 0 && (
        <section
          className="p-6 rounded-2xl animate-fade-in-up"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255, 107, 107, 0.15)' }}
            >
              <CalendarCheck className="w-5 h-5" style={{ color: 'var(--accent-coral)' }} />
            </div>
            <h2
              className="text-lg font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              Project Updates
            </h2>
          </div>

          <div className="space-y-4">
            {projectUpdates.map((update) => (
              <div
                key={update.id}
                className="p-4 rounded-xl"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
              >
                <h3
                  className="text-base font-semibold mb-3"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
                >
                  {update.project?.name || 'Unknown project'}
                </h3>

                <textarea
                  value={update.update_text || ''}
                  onChange={(e) => updateProjectUpdate(update.id, 'update_text', e.target.value)}
                  placeholder="What progress did you make?"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm resize-y mb-3 transition-all duration-200"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                  }}
                />

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => updateProjectUpdate(update.id, 'is_win', !update.is_win)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                    style={{
                      background: update.is_win ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-card)',
                      border: `1px solid ${update.is_win ? 'var(--accent-amber)' : 'var(--border-default)'}`,
                      color: update.is_win ? 'var(--accent-amber)' : 'var(--text-secondary)',
                    }}
                  >
                    <Star className={`w-4 h-4 ${update.is_win ? 'fill-current' : ''}`} />
                    Win
                  </button>

                  <button
                    type="button"
                    onClick={() => updateProjectUpdate(update.id, 'is_blocker', !update.is_blocker)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                    style={{
                      background: update.is_blocker ? 'rgba(255, 107, 107, 0.15)' : 'var(--bg-card)',
                      border: `1px solid ${update.is_blocker ? 'var(--accent-coral)' : 'var(--border-default)'}`,
                      color: update.is_blocker ? 'var(--accent-coral)' : 'var(--text-secondary)',
                    }}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Blocker
                  </button>
                </div>

                {update.is_blocker && (
                  <input
                    type="text"
                    value={update.blocker_description || ''}
                    onChange={(e) => updateProjectUpdate(update.id, 'blocker_description', e.target.value)}
                    placeholder="What's blocking you?"
                    className="w-full mt-3 px-4 py-3 rounded-xl text-sm transition-all duration-200"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--accent-coral)',
                      color: 'var(--text-primary)',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Uploads Gallery */}
      {checkIn.uploads.length > 0 && (
        <section
          className="p-6 rounded-2xl animate-fade-in-up"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(45, 212, 191, 0.15)' }}
            >
              <FileText className="w-5 h-5" style={{ color: 'var(--accent-teal)' }} />
            </div>
            <h2
              className="text-lg font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              Screenshots & Recordings
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {checkIn.uploads.map((upload) => (
              <div
                key={upload.id}
                className="relative rounded-xl overflow-hidden cursor-pointer group"
                style={{ background: 'var(--bg-elevated)' }}
                onClick={() => upload.file_type.startsWith('image/') && setSelectedImage(upload)}
              >
                <div className="aspect-square">
                  {upload.file_type.startsWith('image/') ? (
                    <img
                      src={getImageUrl(upload.file_url)}
                      alt={upload.file_name}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-card)' }}>
                      <FileVideo className="w-12 h-12" style={{ color: 'var(--text-muted)' }} />
                    </div>
                  )}
                </div>
                {upload.user_context && (
                  <div
                    className="absolute bottom-0 left-0 right-0 px-3 py-2 text-xs truncate"
                    style={{ background: 'rgba(0,0,0,0.7)', color: 'white' }}
                  >
                    {upload.user_context}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* General Notes */}
      <section
        className="p-6 rounded-2xl animate-fade-in-up"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(245, 158, 11, 0.15)' }}
          >
            <FileText className="w-5 h-5" style={{ color: 'var(--accent-amber)' }} />
          </div>
          <h2
            className="text-lg font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            General Notes
          </h2>
        </div>

        <textarea
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder="Thoughts, reflections, or anything not specific to a project..."
          rows={4}
          className="w-full px-5 py-4 rounded-xl text-base resize-y mb-5 min-h-[120px]"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
          }}
        />

        {/* Mood selector */}
        <div>
          <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
            How were you feeling?
          </label>
          <div className="flex flex-wrap gap-3">
            {moodOptions.map((option) => {
              const MoodIcon = option.icon
              const isSelected = mood === option.value

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMood(isSelected ? null : option.value)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{
                    background: isSelected ? `${option.color}20` : 'var(--bg-elevated)',
                    border: `1px solid ${isSelected ? option.color : 'var(--border-default)'}`,
                    color: isSelected ? option.color : 'var(--text-secondary)',
                  }}
                >
                  <MoodIcon className="w-4 h-4" />
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Save button */}
      <div className="flex justify-end pt-4 pb-8">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-base font-semibold transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, var(--accent-coral), var(--accent-coral-hover))',
            color: 'white',
            boxShadow: '0 4px 20px rgba(255, 107, 107, 0.3)',
          }}
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div
            className="w-full max-w-md p-6 rounded-2xl animate-fade-in-up"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255, 107, 107, 0.15)' }}
              >
                <Trash2 className="w-6 h-6" style={{ color: 'var(--accent-coral)' }} />
              </div>
              <h3
                className="text-xl font-semibold"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
              >
                Delete Check-in?
              </h3>
            </div>

            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              This will permanently delete this check-in, all project updates, and uploaded files.
              This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] disabled:opacity-50"
                style={{
                  background: 'var(--accent-coral)',
                  color: 'white',
                }}
              >
                {deleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.9)' }}
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full"
            style={{ background: 'rgba(255,255,255,0.1)' }}
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={getImageUrl(selectedImage.file_url)}
            alt={selectedImage.file_name}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {selectedImage.user_context && (
            <div
              className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm"
              style={{ background: 'rgba(0,0,0,0.8)', color: 'white' }}
            >
              {selectedImage.user_context}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
