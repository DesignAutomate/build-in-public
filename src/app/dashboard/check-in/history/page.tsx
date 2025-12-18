'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CalendarCheck,
  Sun,
  CloudSun,
  Moon,
  Plus,
  Loader2,
  Star,
  AlertTriangle,
  Image as ImageIcon,
  ChevronRight,
  Heart,
  Smile,
  Meh,
  Frown,
  FileVideo,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface CheckIn {
  id: string
  check_in_type: 'morning' | 'midday' | 'evening'
  check_in_date: string
  general_notes: string | null
  mood: 'great' | 'good' | 'okay' | 'struggling' | null
  created_at: string
  project_updates: {
    id: string
    project_id: string
    update_text: string | null
    is_win: boolean
    is_blocker: boolean
    project: {
      name: string
    } | null
  }[]
  uploads: {
    id: string
    file_url: string
    file_type: string
  }[]
}

const checkInTypeConfig = {
  morning: {
    icon: Sun,
    color: 'var(--accent-amber)',
    label: 'Morning',
  },
  midday: {
    icon: CloudSun,
    color: 'var(--accent-teal)',
    label: 'Midday',
  },
  evening: {
    icon: Moon,
    color: 'var(--accent-coral)',
    label: 'Evening',
  },
}

const moodConfig = {
  great: { icon: Heart, color: 'var(--accent-coral)' },
  good: { icon: Smile, color: 'var(--accent-teal)' },
  okay: { icon: Meh, color: 'var(--accent-amber)' },
  struggling: { icon: Frown, color: 'var(--text-muted)' },
}

interface GroupedCheckIns {
  [date: string]: CheckIn[]
}

export default function CheckInHistoryPage() {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadCheckIns()
  }, [])

  // Helper to get proper image URL from Supabase storage
  const getImageUrl = (fileUrl: string): string => {
    // If it's already a full URL (contains http), use it directly
    if (fileUrl.startsWith('http')) {
      return fileUrl
    }
    // Otherwise, treat it as a storage path and get the public URL
    const { data } = supabase.storage.from('uploads').getPublicUrl(fileUrl)
    return data.publicUrl
  }

  const loadCheckIns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('check_ins')
        .select(`
          id,
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
            project:projects (name)
          ),
          uploads (
            id,
            file_url,
            file_type
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error loading check-ins:', error)
        return
      }

      setCheckIns(data as CheckIn[] || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const groupByDate = (items: CheckIn[]): GroupedCheckIns => {
    return items.reduce((groups: GroupedCheckIns, item) => {
      const date = item.check_in_date || item.created_at.split('T')[0]
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(item)
      return groups
    }, {})
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (dateStr === today.toISOString().split('T')[0]) {
      return 'Today'
    }
    if (dateStr === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday'
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const groupedCheckIns = groupByDate(checkIns)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2
            className="w-8 h-8 mx-auto mb-4 animate-spin"
            style={{ color: 'var(--accent-coral)' }}
          />
          <p style={{ color: 'var(--text-muted)' }}>Loading check-ins...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <header className="flex items-center justify-between animate-fade-in-up">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CalendarCheck className="w-5 h-5" style={{ color: 'var(--accent-coral)' }} />
            <span
              className="text-sm font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              Check-in History
            </span>
          </div>
          <h1
            className="text-4xl font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            Your Journey
          </h1>
          <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
            {checkIns.length} check-ins recorded
          </p>
        </div>

        <Link
          href="/dashboard/check-in"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, var(--accent-coral), var(--accent-coral-hover))',
            color: 'white',
            boxShadow: '0 4px 20px rgba(255, 107, 107, 0.3)',
          }}
        >
          <Plus className="w-5 h-5" />
          New Check-in
        </Link>
      </header>

      {/* Check-ins list */}
      {checkIns.length === 0 ? (
        <div
          className="p-12 rounded-2xl text-center animate-fade-in-up"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <CalendarCheck
            className="w-16 h-16 mx-auto mb-4"
            style={{ color: 'var(--text-muted)' }}
          />
          <h2
            className="text-xl font-semibold mb-2"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            No check-ins yet
          </h2>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
            Start documenting your build journey with your first check-in
          </p>
          <Link
            href="/dashboard/check-in"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold transition-all duration-200 hover:scale-105"
            style={{
              background: 'var(--accent-coral)',
              color: 'white',
            }}
          >
            <Plus className="w-5 h-5" />
            Create your first check-in
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedCheckIns).map(([date, dayCheckIns], groupIndex) => (
            <div key={date} className="animate-fade-in-up" style={{ animationDelay: `${groupIndex * 0.1}s` }}>
              {/* Date header */}
              <h2
                className="text-lg font-semibold mb-4 flex items-center gap-3"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: 'var(--accent-coral)' }}
                />
                {formatDate(date)}
              </h2>

              {/* Check-ins for this date */}
              <div className="space-y-4 ml-6 border-l-2" style={{ borderColor: 'var(--border-subtle)' }}>
                {dayCheckIns.map((checkIn) => {
                  const typeConfig = checkInTypeConfig[checkIn.check_in_type]
                  const TypeIcon = typeConfig.icon
                  const MoodIcon = checkIn.mood ? moodConfig[checkIn.mood].icon : null

                  const wins = checkIn.project_updates.filter(u => u.is_win)
                  const blockers = checkIn.project_updates.filter(u => u.is_blocker)
                  const imageCount = checkIn.uploads.filter(u => u.file_type.startsWith('image/')).length

                  return (
                    <div
                      key={checkIn.id}
                      className="relative pl-6 group"
                    >
                      {/* Timeline dot */}
                      <div
                        className="absolute -left-2 top-6 w-4 h-4 rounded-full border-2"
                        style={{
                          background: 'var(--bg-primary)',
                          borderColor: typeConfig.color,
                        }}
                      />

                      <Link
                        href={`/dashboard/check-in/${checkIn.id}`}
                        className="block p-5 rounded-xl transition-all duration-200 hover:scale-[1.01] cursor-pointer"
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {/* Header row */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ background: `${typeConfig.color}20` }}
                            >
                              <TypeIcon className="w-5 h-5" style={{ color: typeConfig.color }} />
                            </div>
                            <div>
                              <span
                                className="text-sm font-semibold"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {typeConfig.label} Check-in
                              </span>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {formatTime(checkIn.created_at)}
                              </p>
                            </div>
                          </div>

                          {MoodIcon && (
                            <div
                              className="px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                              style={{ background: `${moodConfig[checkIn.mood!].color}15` }}
                            >
                              <MoodIcon
                                className="w-4 h-4"
                                style={{ color: moodConfig[checkIn.mood!].color }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Projects */}
                        {checkIn.project_updates.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {checkIn.project_updates.map((update) => (
                              <span
                                key={update.id}
                                className="px-3 py-1 rounded-full text-xs font-medium"
                                style={{
                                  background: 'var(--bg-elevated)',
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                {update.project?.name || 'Unknown project'}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Notes preview */}
                        {checkIn.general_notes && (
                          <p
                            className="text-sm line-clamp-2 mb-3"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {checkIn.general_notes}
                          </p>
                        )}

                        {/* Stats row */}
                        <div className="flex items-center gap-4">
                          {wins.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Star className="w-4 h-4 fill-current" style={{ color: 'var(--accent-amber)' }} />
                              <span className="text-xs font-medium" style={{ color: 'var(--accent-amber)' }}>
                                {wins.length} win{wins.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                          {blockers.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4" style={{ color: 'var(--accent-coral)' }} />
                              <span className="text-xs font-medium" style={{ color: 'var(--accent-coral)' }}>
                                {blockers.length} blocker{blockers.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                          {imageCount > 0 && (
                            <div className="flex items-center gap-1.5">
                              <ImageIcon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                                {imageCount} image{imageCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}

                          {/* View arrow */}
                          <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                          </div>
                        </div>

                        {/* Image previews */}
                        {checkIn.uploads.length > 0 && (
                          <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                            {checkIn.uploads.slice(0, 4).map((upload, i) => (
                              <div
                                key={upload.id}
                                className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0"
                                style={{ background: 'var(--bg-elevated)' }}
                              >
                                {upload.file_type.startsWith('image/') ? (
                                  <img
                                    src={getImageUrl(upload.file_url)}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <FileVideo className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
                                  </div>
                                )}
                                {i === 3 && checkIn.uploads.length > 4 && (
                                  <div
                                    className="absolute inset-0 flex items-center justify-center text-sm font-semibold"
                                    style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}
                                  >
                                    +{checkIn.uploads.length - 4}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
