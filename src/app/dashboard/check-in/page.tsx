'use client'

import { useState, useEffect } from 'react'
import {
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
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ProjectSelector, { Project } from '@/components/project-selector'
import FileUpload, { UploadedFile } from '@/components/file-upload'

type CheckInType = 'morning' | 'midday' | 'evening'
type Mood = 'great' | 'good' | 'okay' | 'struggling' | null

interface ProjectUpdate {
  project_id: string
  project_name: string
  update_text: string
  is_win: boolean
  has_blocker: boolean
  blocker_description: string
}

const getCheckInType = (): CheckInType => {
  const hour = new Date().getHours()
  if (hour < 11) return 'morning'
  if (hour < 15) return 'midday'
  return 'evening'
}

const checkInConfig = {
  morning: {
    label: 'Morning Check-in',
    icon: Sun,
    color: 'var(--accent-amber)',
    greeting: 'Good morning! What are you planning to work on today?',
  },
  midday: {
    label: 'Midday Check-in',
    icon: CloudSun,
    color: 'var(--accent-teal)',
    greeting: 'How\'s your day going? Share your progress.',
  },
  evening: {
    label: 'Evening Check-in',
    icon: Moon,
    color: 'var(--accent-coral)',
    greeting: 'Wrapping up? Let\'s capture what you accomplished.',
  },
}

const moodOptions: { value: Mood; label: string; icon: typeof Smile; color: string }[] = [
  { value: 'great', label: 'Great', icon: Heart, color: 'var(--accent-coral)' },
  { value: 'good', label: 'Good', icon: Smile, color: 'var(--accent-teal)' },
  { value: 'okay', label: 'Okay', icon: Meh, color: 'var(--accent-amber)' },
  { value: 'struggling', label: 'Struggling', icon: Frown, color: 'var(--text-muted)' },
]

export default function CheckInPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [checkInType] = useState<CheckInType>(getCheckInType)
  const [existingCheckInId, setExistingCheckInId] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [projectUpdates, setProjectUpdates] = useState<Record<string, ProjectUpdate>>({})
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [generalNotes, setGeneralNotes] = useState('')
  const [mood, setMood] = useState<Mood>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const supabase = createClient()
  const config = checkInConfig[checkInType]
  const Icon = config.icon

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // Load active projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (projectsData) {
        setProjects(projectsData)
      }

      // Check for existing check-in today
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data: existingCheckIn } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', user.id)
        .eq('check_in_type', checkInType)
        .gte('created_at', todayStart.toISOString())
        .single()

      if (existingCheckIn) {
        setExistingCheckInId(existingCheckIn.id)
        setGeneralNotes(existingCheckIn.general_notes || '')
        setMood(existingCheckIn.mood)

        // Load existing project updates
        const { data: updates } = await supabase
          .from('project_updates')
          .select('*')
          .eq('check_in_id', existingCheckIn.id)

        if (updates && updates.length > 0) {
          const selectedIds: string[] = []
          const updatesMap: Record<string, ProjectUpdate> = {}

          updates.forEach((update: {
            project_id: string
            update_text: string
            is_win: boolean
            has_blocker: boolean
            blocker_description: string | null
          }) => {
            const project = projectsData?.find(p => p.id === update.project_id)
            selectedIds.push(update.project_id)
            updatesMap[update.project_id] = {
              project_id: update.project_id,
              project_name: project?.name || 'Unknown',
              update_text: update.update_text || '',
              is_win: update.is_win || false,
              has_blocker: update.has_blocker || false,
              blocker_description: update.blocker_description || '',
            }
          })

          setSelectedProjectIds(selectedIds)
          setProjectUpdates(updatesMap)
        }

        // Load existing uploads
        const { data: uploads } = await supabase
          .from('uploads')
          .select('*')
          .eq('check_in_id', existingCheckIn.id)

        if (uploads) {
          const filesWithPreviews = uploads.map((upload: {
            id: string
            file_name: string
            file_path: string
            file_type: string
            file_size: number
            context_note: string | null
          }) => {
            const { data: urlData } = supabase.storage
              .from('uploads')
              .getPublicUrl(upload.file_path)

            return {
              id: upload.id,
              file_name: upload.file_name,
              file_path: upload.file_path,
              file_type: upload.file_type,
              file_size: upload.file_size,
              context_note: upload.context_note || '',
              preview_url: upload.file_type.startsWith('image/') ? urlData.publicUrl : undefined,
            }
          })
          setUploadedFiles(filesWithPreviews)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProjectSelection = (ids: string[]) => {
    setSelectedProjectIds(ids)

    // Initialize updates for newly selected projects
    const newUpdates = { ...projectUpdates }
    ids.forEach(id => {
      if (!newUpdates[id]) {
        const project = projects.find(p => p.id === id)
        newUpdates[id] = {
          project_id: id,
          project_name: project?.name || 'Unknown',
          update_text: '',
          is_win: false,
          has_blocker: false,
          blocker_description: '',
        }
      }
    })

    // Remove updates for deselected projects
    Object.keys(newUpdates).forEach(id => {
      if (!ids.includes(id)) {
        delete newUpdates[id]
      }
    })

    setProjectUpdates(newUpdates)
  }

  const updateProjectUpdate = (
    projectId: string,
    field: keyof ProjectUpdate,
    value: string | boolean
  ) => {
    setProjectUpdates(prev => ({
      ...prev,
      [projectId]: {
        ...prev[projectId],
        [field]: value,
      },
    }))
  }

  const handleSave = async () => {
    if (!userId) return

    setSaving(true)
    setMessage(null)

    try {
      // Create or update check-in
      let checkInId = existingCheckInId

      if (existingCheckInId) {
        // Update existing
        const { error } = await supabase
          .from('check_ins')
          .update({
            general_notes: generalNotes || null,
            mood,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingCheckInId)

        if (error) throw error
      } else {
        // Create new
        const { data, error } = await supabase
          .from('check_ins')
          .insert({
            user_id: userId,
            check_in_type: checkInType,
            general_notes: generalNotes || null,
            mood,
          })
          .select()
          .single()

        if (error) throw error
        checkInId = data.id
        setExistingCheckInId(data.id)
      }

      // Delete existing project updates and recreate
      if (checkInId) {
        await supabase
          .from('project_updates')
          .delete()
          .eq('check_in_id', checkInId)

        // Create project updates
        const projectUpdateRecords = Object.values(projectUpdates).map(update => ({
          check_in_id: checkInId,
          project_id: update.project_id,
          update_text: update.update_text || null,
          is_win: update.is_win,
          has_blocker: update.has_blocker,
          blocker_description: update.has_blocker ? update.blocker_description : null,
        }))

        if (projectUpdateRecords.length > 0) {
          const { error: updateError } = await supabase
            .from('project_updates')
            .insert(projectUpdateRecords)

          if (updateError) throw updateError
        }

        // Update upload records with check_in_id
        for (const file of uploadedFiles) {
          if (file.id.startsWith('temp_')) {
            // New upload - create record
            const { data: uploadData, error: uploadError } = await supabase
              .from('uploads')
              .insert({
                user_id: userId,
                check_in_id: checkInId,
                file_name: file.file_name,
                file_path: file.file_path,
                file_type: file.file_type,
                file_size: file.file_size,
                context_note: file.context_note || null,
              })
              .select()
              .single()

            if (uploadError) throw uploadError

            // Update local file ID
            if (uploadData) {
              file.id = uploadData.id
            }
          } else {
            // Existing upload - update context note
            await supabase
              .from('uploads')
              .update({ context_note: file.context_note || null })
              .eq('id', file.id)
          }
        }
      }

      setMessage({ type: 'success', text: 'Check-in saved successfully!' })
      setTimeout(() => setMessage(null), 4000)
    } catch (error) {
      console.error('Error saving check-in:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setMessage({ type: 'error', text: `Failed to save: ${errorMessage}` })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2
            className="w-8 h-8 mx-auto mb-4 animate-spin"
            style={{ color: 'var(--accent-coral)' }}
          />
          <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10 max-w-3xl">
      {/* Header */}
      <header className="animate-fade-in-up">
        <div className="flex items-center gap-2 mb-2">
          <CalendarCheck className="w-5 h-5" style={{ color: config.color }} />
          <span
            className="text-sm font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            {config.label}
          </span>
        </div>
        <div className="flex items-center gap-4 mb-3">
          <h1
            className="text-4xl font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            {today}
          </h1>
          <div
            className="px-4 py-2 rounded-xl flex items-center gap-2"
            style={{ background: `${config.color}20` }}
          >
            <Icon className="w-5 h-5" style={{ color: config.color }} />
            <span className="text-sm font-medium" style={{ color: config.color }}>
              {checkInType.charAt(0).toUpperCase() + checkInType.slice(1)}
            </span>
          </div>
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>
          {config.greeting}
        </p>
        {existingCheckInId && (
          <p className="mt-2 text-sm" style={{ color: 'var(--accent-teal)' }}>
            Editing existing check-in
          </p>
        )}
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
            <Check className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--accent-teal)' }} />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--accent-coral)' }} />
          )}
          <span
            className="text-sm font-medium"
            style={{ color: message.type === 'success' ? 'var(--accent-teal)' : 'var(--accent-coral)' }}
          >
            {message.text}
          </span>
        </div>
      )}

      {/* Section 1: Projects */}
      <section
        className="p-8 rounded-2xl animate-fade-in-up-delay-1"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255, 107, 107, 0.15)' }}
          >
            <CalendarCheck className="w-6 h-6" style={{ color: 'var(--accent-coral)' }} />
          </div>
          <div>
            <h2
              className="text-xl font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              What are you working on?
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Select the projects you&apos;re updating today
            </p>
          </div>
        </div>

        <ProjectSelector
          projects={projects}
          selectedIds={selectedProjectIds}
          onSelectionChange={handleProjectSelection}
        />

        {/* Project update forms */}
        {selectedProjectIds.length > 0 && (
          <div className="mt-8 space-y-6">
            {selectedProjectIds.map((projectId) => {
              const update = projectUpdates[projectId]
              if (!update) return null

              return (
                <div
                  key={projectId}
                  className="p-5 rounded-xl"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                >
                  <h3
                    className="text-base font-semibold mb-4"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
                  >
                    {update.project_name}
                  </h3>

                  <div className="space-y-4">
                    <textarea
                      value={update.update_text}
                      onChange={(e) => updateProjectUpdate(projectId, 'update_text', e.target.value)}
                      placeholder="What progress did you make? What did you learn?"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl text-sm resize-y transition-all duration-200"
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)',
                      }}
                    />

                    <div className="flex flex-wrap gap-3">
                      {/* Win toggle */}
                      <button
                        type="button"
                        onClick={() => updateProjectUpdate(projectId, 'is_win', !update.is_win)}
                        className={`
                          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                          transition-all duration-200
                        `}
                        style={{
                          background: update.is_win ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-card)',
                          border: `1px solid ${update.is_win ? 'var(--accent-amber)' : 'var(--border-default)'}`,
                          color: update.is_win ? 'var(--accent-amber)' : 'var(--text-secondary)',
                        }}
                      >
                        <Star className={`w-4 h-4 ${update.is_win ? 'fill-current' : ''}`} />
                        Mark as win
                      </button>

                      {/* Blocker toggle */}
                      <button
                        type="button"
                        onClick={() => updateProjectUpdate(projectId, 'has_blocker', !update.has_blocker)}
                        className={`
                          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                          transition-all duration-200
                        `}
                        style={{
                          background: update.has_blocker ? 'rgba(255, 107, 107, 0.15)' : 'var(--bg-card)',
                          border: `1px solid ${update.has_blocker ? 'var(--accent-coral)' : 'var(--border-default)'}`,
                          color: update.has_blocker ? 'var(--accent-coral)' : 'var(--text-secondary)',
                        }}
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Flag blocker
                      </button>
                    </div>

                    {/* Blocker description */}
                    {update.has_blocker && (
                      <input
                        type="text"
                        value={update.blocker_description}
                        onChange={(e) => updateProjectUpdate(projectId, 'blocker_description', e.target.value)}
                        placeholder="What's blocking you?"
                        className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-200"
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--accent-coral)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Section 2: Screenshots & Recordings */}
      <section
        className="p-8 rounded-2xl animate-fade-in-up-delay-2"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(45, 212, 191, 0.15)' }}
          >
            <FileText className="w-6 h-6" style={{ color: 'var(--accent-teal)' }} />
          </div>
          <div>
            <h2
              className="text-xl font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              Screenshots & Recordings
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Visual proof of your progress
            </p>
          </div>
        </div>

        {userId && (
          <FileUpload
            userId={userId}
            files={uploadedFiles}
            onFilesChange={setUploadedFiles}
          />
        )}
      </section>

      {/* Section 3: General Notes */}
      <section
        className="p-8 rounded-2xl animate-fade-in-up-delay-3"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(245, 158, 11, 0.15)' }}
          >
            <FileText className="w-6 h-6" style={{ color: 'var(--accent-amber)' }} />
          </div>
          <div>
            <h2
              className="text-xl font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              General Notes
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Anything else on your mind?
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <textarea
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            placeholder="Thoughts, reflections, or anything not specific to a project..."
            rows={4}
            className="w-full px-5 py-4 rounded-xl text-base resize-y transition-all duration-200 min-h-[120px]"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
          />

          {/* Mood selector */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              How are you feeling? (optional)
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
        </div>
      </section>

      {/* Save button */}
      <div className="flex justify-end pt-6 pb-8">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-base font-semibold transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
              Save Check-in
            </>
          )}
        </button>
      </div>
    </div>
  )
}
