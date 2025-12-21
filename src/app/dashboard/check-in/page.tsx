'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarCheck,
  Sun,
  CloudSun,
  Moon,
  Star,
  AlertTriangle,
  Save,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
  Quote,
  Youtube,
  Linkedin,
  HelpCircle,
  Plus,
  ChevronLeft,
  Image as ImageIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import FileUpload, { UploadedFile } from '@/components/file-upload'
import DayTypeSelector, { DayType } from '@/components/day-type-selector'
import QuestionPills from '@/components/question-pills'
import VoiceInputPlaceholder from '@/components/voice-input-placeholder'
import AutoExpandingTextarea, { AutoExpandingTextareaRef } from '@/components/auto-expanding-textarea'

type CheckInType = 'morning' | 'midday' | 'evening'

interface Project {
  id: string
  name: string
  status: string
}

const getCheckInType = (): CheckInType => {
  const hour = new Date().getHours()
  if (hour < 11) return 'morning'
  if (hour < 15) return 'midday'
  return 'evening'
}

const checkInConfig = {
  morning: {
    label: 'Morning Update',
    icon: Sun,
    color: 'var(--accent-amber)',
    greeting: 'What are you working on?',
  },
  midday: {
    label: 'Midday Update',
    icon: CloudSun,
    color: 'var(--accent-teal)',
    greeting: 'How\'s it going?',
  },
  evening: {
    label: 'Evening Update',
    icon: Moon,
    color: 'var(--accent-coral)',
    greeting: 'What did you accomplish?',
  },
}

export default function CheckInPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [checkInType] = useState<CheckInType>(getCheckInType)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  // Form state
  const [dayType, setDayType] = useState<DayType>(null)
  const [updateText, setUpdateText] = useState('')
  const [problemToSolve, setProblemToSolve] = useState('')
  const [whatDidntWork, setWhatDidntWork] = useState('')
  const [whatWorked, setWhatWorked] = useState('')
  const [surpriseLearning, setSurpriseLearning] = useState('')
  const [isWin, setIsWin] = useState(false)
  const [isBlocker, setIsBlocker] = useState(false)
  const [blockerDescription, setBlockerDescription] = useState('')
  const [breakthroughs, setBreakthroughs] = useState('')
  const [flagYoutube, setFlagYoutube] = useState(false)
  const [flagLinkedin, setFlagLinkedin] = useState(false)
  const [inMyOwnWords, setInMyOwnWords] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Ref for main textarea to insert question pill text
  const mainTextareaRef = useRef<AutoExpandingTextareaRef>(null)

  const supabase = createClient()
  const config = checkInConfig[checkInType]
  const Icon = config.icon

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const todayISO = new Date().toISOString().split('T')[0]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (projectsData) {
        setProjects(projectsData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePillClick = (text: string) => {
    if (mainTextareaRef.current) {
      mainTextareaRef.current.insertText(text)
    }
  }

  const handleSave = async () => {
    if (!userId || !selectedProject) return

    setSaving(true)
    setMessage(null)

    try {
      // Create check-in record
      const checkInPayload = {
        user_id: userId,
        check_in_type: checkInType,
        check_in_date: todayISO,
        general_notes: null,
        day_type: dayType,
        breakthroughs: breakthroughs || null,
        flag_youtube: flagYoutube,
        flag_linkedin: flagLinkedin,
        in_my_own_words: inMyOwnWords || null,
      }

      const { data: checkInData, error: checkInError } = await supabase
        .from('check_ins')
        .insert(checkInPayload)
        .select()
        .single()

      if (checkInError) {
        throw new Error(`Check-in failed: ${checkInError.message}`)
      }

      const checkInId = checkInData.id

      // Create project update
      const projectUpdatePayload = {
        check_in_id: checkInId,
        project_id: selectedProject.id,
        update_text: updateText || null,
        problem_to_solve: problemToSolve || null,
        what_didnt_work: whatDidntWork || null,
        what_worked: whatWorked || null,
        surprise_learning: surpriseLearning || null,
        is_win: isWin,
        is_blocker: isBlocker,
        blocker_description: isBlocker ? blockerDescription : null,
      }

      const { error: updateError } = await supabase
        .from('project_updates')
        .insert(projectUpdatePayload)

      if (updateError) {
        throw new Error(`Project update failed: ${updateError.message}`)
      }

      // Create upload records
      if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          if (file.id.startsWith('temp_')) {
            const uploadPayload = {
              user_id: userId,
              check_in_id: checkInId,
              file_name: file.file_name,
              file_url: file.file_url,
              file_type: file.file_type,
              file_size: file.file_size,
              user_context: file.user_context || null,
              what_am_i_looking_at: file.what_am_i_looking_at || null,
              why_does_this_matter: file.why_does_this_matter || null,
            }

            const { error: uploadError } = await supabase
              .from('uploads')
              .insert(uploadPayload)

            if (uploadError) {
              throw new Error(`Upload failed: ${uploadError.message}`)
            }
          }
        }
      }

      setMessage({ type: 'success', text: 'Update saved!' })
      setTimeout(() => {
        router.push('/dashboard/check-in/history')
      }, 1500)
    } catch (error) {
      console.error('Save failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setMessage({ type: 'error', text: errorMessage })
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

  // STEP 1: Project Selection (if no project selected)
  if (!selectedProject) {
    return (
      <div className="space-y-8 max-w-3xl">
        {/* Header */}
        <header className="animate-fade-in-up">
          <div className="flex items-center gap-2 mb-2">
            <CalendarCheck className="w-5 h-5" style={{ color: config.color }} />
            <span
              className="text-sm font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              New Update
            </span>
          </div>
          <h1
            className="text-3xl font-bold tracking-tight mb-2"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            Which project are you updating?
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Select the project you&apos;re working on
          </p>
        </header>

        {/* Project Cards */}
        <div className="grid gap-4 sm:grid-cols-2 animate-fade-in-up-delay-1">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => setSelectedProject(project)}
              className="p-5 rounded-xl text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <h3
                className="text-lg font-semibold mb-1"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
              >
                {project.name}
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Click to add an update
              </p>
            </button>
          ))}

          {/* Add New Project */}
          <button
            type="button"
            onClick={() => router.push('/dashboard/projects')}
            className="p-5 rounded-xl text-left border-2 border-dashed transition-all duration-200 hover:scale-[1.02]"
            style={{
              borderColor: 'var(--border-default)',
              background: 'transparent',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--bg-elevated)' }}
              >
                <Plus className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
              </div>
              <div>
                <h3
                  className="text-base font-semibold"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  New Project
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Create a project first
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    )
  }

  // STEP 2: Update Form (project selected)
  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header with back button */}
      <header className="animate-fade-in-up">
        <button
          type="button"
          onClick={() => setSelectedProject(null)}
          className="flex items-center gap-2 mb-4 text-sm hover:opacity-80 transition-opacity"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronLeft className="w-4 h-4" />
          Change project
        </button>

        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-5 h-5" style={{ color: config.color }} />
          <span
            className="text-sm font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            {config.label}
          </span>
        </div>
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
        >
          {selectedProject.name}
        </h1>
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

      {/* Update Type */}
      <section className="animate-fade-in-up">
        <DayTypeSelector value={dayType} onChange={setDayType} />
      </section>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

      {/* What happened? - Main field */}
      <section className="space-y-3 animate-fade-in-up-delay-1">
        <div className="flex items-center justify-between">
          <label
            className="text-base font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            What happened?
          </label>
          <VoiceInputPlaceholder />
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Brain dump everything. Get as much out of your head as you can. Don&apos;t worry about structure - just capture what happened.
        </p>
        <AutoExpandingTextarea
          ref={mainTextareaRef}
          value={updateText}
          onChange={setUpdateText}
          placeholder="Start typing or click a prompt below..."
          minRows={4}
          maxRows={15}
        />
        <QuestionPills onPillClick={handlePillClick} />
      </section>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

      {/* Structured detail fields */}
      <section className="space-y-5 animate-fade-in-up-delay-1">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Optional: Add more detail if you want
        </p>

        {/* Problem to solve */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              What problem were you trying to solve?
            </label>
            <VoiceInputPlaceholder />
          </div>
          <AutoExpandingTextarea
            value={problemToSolve}
            onChange={setProblemToSolve}
            placeholder="The challenge or goal..."
            minRows={2}
            maxRows={8}
          />
        </div>

        {/* What didn't work */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              What didn&apos;t work?
            </label>
            <VoiceInputPlaceholder />
          </div>
          <AutoExpandingTextarea
            value={whatDidntWork}
            onChange={setWhatDidntWork}
            placeholder="Approaches that failed..."
            minRows={2}
            maxRows={8}
          />
        </div>

        {/* What worked */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              What finally worked?
            </label>
            <VoiceInputPlaceholder />
          </div>
          <AutoExpandingTextarea
            value={whatWorked}
            onChange={setWhatWorked}
            placeholder="The solution..."
            minRows={2}
            maxRows={8}
          />
        </div>

        {/* Surprise learning */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Any surprises or unexpected learnings?
            </label>
            <VoiceInputPlaceholder />
          </div>
          <AutoExpandingTextarea
            value={surpriseLearning}
            onChange={setSurpriseLearning}
            placeholder="Something unexpected..."
            minRows={2}
            maxRows={8}
          />
        </div>
      </section>

      {/* Quick flags */}
      <section className="flex flex-wrap gap-3 animate-fade-in-up-delay-1">
        <button
          type="button"
          onClick={() => setIsWin(!isWin)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
          style={{
            background: isWin ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-elevated)',
            border: `1px solid ${isWin ? 'var(--accent-amber)' : 'var(--border-default)'}`,
            color: isWin ? 'var(--accent-amber)' : 'var(--text-secondary)',
          }}
        >
          <Star className={`w-4 h-4 ${isWin ? 'fill-current' : ''}`} />
          Mark as win
        </button>

        <button
          type="button"
          onClick={() => setIsBlocker(!isBlocker)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
          style={{
            background: isBlocker ? 'rgba(255, 107, 107, 0.15)' : 'var(--bg-elevated)',
            border: `1px solid ${isBlocker ? 'var(--accent-coral)' : 'var(--border-default)'}`,
            color: isBlocker ? 'var(--accent-coral)' : 'var(--text-secondary)',
          }}
        >
          <AlertTriangle className="w-4 h-4" />
          Flag as blocker
        </button>
      </section>

      {isBlocker && (
        <div className="space-y-2 animate-fade-in-up">
          <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            What&apos;s blocking you?
          </label>
          <AutoExpandingTextarea
            value={blockerDescription}
            onChange={setBlockerDescription}
            placeholder="Describe the blocker..."
            minRows={2}
            maxRows={5}
            style={{ borderColor: 'var(--accent-coral)' }}
          />
        </div>
      )}

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

      {/* Breakthroughs */}
      <section className="space-y-3 animate-fade-in-up-delay-2">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5" style={{ color: 'var(--accent-amber)' }} />
          <label
            className="text-base font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            Any major wins or discoveries?
          </label>
          <VoiceInputPlaceholder />
        </div>
        <AutoExpandingTextarea
          value={breakthroughs}
          onChange={setBreakthroughs}
          placeholder="Big 'aha' moments or breakthroughs..."
          minRows={3}
          maxRows={10}
        />

        {/* Content flags */}
        <div className="flex flex-wrap gap-3 pt-1">
          <label
            className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200"
            style={{
              background: flagYoutube ? 'rgba(255, 0, 0, 0.1)' : 'var(--bg-elevated)',
              border: `1px solid ${flagYoutube ? '#ff0000' : 'var(--border-default)'}`,
            }}
          >
            <input
              type="checkbox"
              checked={flagYoutube}
              onChange={(e) => setFlagYoutube(e.target.checked)}
              className="sr-only"
            />
            <Youtube
              className="w-4 h-4"
              style={{ color: flagYoutube ? '#ff0000' : 'var(--text-muted)' }}
            />
            <span
              className="text-sm"
              style={{ color: flagYoutube ? '#ff0000' : 'var(--text-secondary)' }}
            >
              YouTube tutorial
            </span>
          </label>

          <label
            className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200"
            style={{
              background: flagLinkedin ? 'rgba(10, 102, 194, 0.1)' : 'var(--bg-elevated)',
              border: `1px solid ${flagLinkedin ? '#0a66c2' : 'var(--border-default)'}`,
            }}
          >
            <input
              type="checkbox"
              checked={flagLinkedin}
              onChange={(e) => setFlagLinkedin(e.target.checked)}
              className="sr-only"
            />
            <Linkedin
              className="w-4 h-4"
              style={{ color: flagLinkedin ? '#0a66c2' : 'var(--text-muted)' }}
            />
            <span
              className="text-sm"
              style={{ color: flagLinkedin ? '#0a66c2' : 'var(--text-secondary)' }}
            >
              LinkedIn post
            </span>
          </label>
        </div>
      </section>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

      {/* In my own words */}
      <section className="space-y-3 animate-fade-in-up-delay-2">
        <div className="flex items-center gap-3">
          <Quote className="w-5 h-5" style={{ color: 'var(--accent-coral)' }} />
          <label
            className="text-base font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            In my own words
          </label>
          <div className="relative group">
            <HelpCircle
              className="w-4 h-4 cursor-help"
              style={{ color: 'var(--text-muted)' }}
            />
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              The AI will preserve these phrases
            </div>
          </div>
          <VoiceInputPlaceholder />
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Any phrases or wording you want the AI to pay particular attention to. These won&apos;t be changed significantly when generating content.
        </p>
        <AutoExpandingTextarea
          value={inMyOwnWords}
          onChange={setInMyOwnWords}
          placeholder="Key phrases to keep verbatim..."
          minRows={2}
          maxRows={6}
          style={{ fontStyle: 'italic' }}
        />
      </section>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

      {/* Screenshots & Files */}
      <section className="space-y-3 animate-fade-in-up-delay-3">
        <div className="flex items-center gap-3">
          <ImageIcon className="w-5 h-5" style={{ color: 'var(--accent-teal)' }} />
          <label
            className="text-base font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            Screenshots & Files
          </label>
        </div>
        {userId && (
          <FileUpload
            userId={userId}
            files={uploadedFiles}
            onFilesChange={setUploadedFiles}
          />
        )}
      </section>

      {/* Save button */}
      <div className="flex justify-end pt-4 pb-8">
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
              Save Update
            </>
          )}
        </button>
      </div>
    </div>
  )
}
