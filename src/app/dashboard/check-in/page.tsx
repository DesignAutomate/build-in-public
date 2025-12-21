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
  FileText,
  Save,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
  Quote,
  Youtube,
  Linkedin,
  HelpCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ProjectSelector, { Project } from '@/components/project-selector'
import FileUpload, { UploadedFile } from '@/components/file-upload'
import DayTypeSelector, { DayType } from '@/components/day-type-selector'
import QuestionPills from '@/components/question-pills'
import VoiceInputPlaceholder from '@/components/voice-input-placeholder'

type CheckInType = 'morning' | 'midday' | 'evening'

interface ProjectUpdate {
  project_id: string
  project_name: string
  problem_to_solve: string
  what_didnt_work: string
  what_worked: string
  surprise_learning: string
  is_win: boolean
  is_blocker: boolean
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
    greeting: 'Good morning! What problem are you tackling today?',
  },
  midday: {
    label: 'Midday Check-in',
    icon: CloudSun,
    color: 'var(--accent-teal)',
    greeting: 'How\'s your day going? Share what you\'re learning.',
  },
  evening: {
    label: 'Evening Check-in',
    icon: Moon,
    color: 'var(--accent-coral)',
    greeting: 'Wrapping up? Let\'s capture your discoveries.',
  },
}

export default function CheckInPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [checkInType] = useState<CheckInType>(getCheckInType)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [projectUpdates, setProjectUpdates] = useState<Record<string, ProjectUpdate>>({})
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [generalNotes, setGeneralNotes] = useState('')
  const [dayType, setDayType] = useState<DayType>(null)
  const [breakthroughs, setBreakthroughs] = useState('')
  const [flagYoutube, setFlagYoutube] = useState(false)
  const [flagLinkedin, setFlagLinkedin] = useState(false)
  const [inMyOwnWords, setInMyOwnWords] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [activeTextareaId, setActiveTextareaId] = useState<string | null>(null)

  // Refs for textareas to insert question pill text
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

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

  const handleProjectSelection = (ids: string[]) => {
    setSelectedProjectIds(ids)

    const newUpdates = { ...projectUpdates }
    ids.forEach(id => {
      if (!newUpdates[id]) {
        const project = projects.find(p => p.id === id)
        newUpdates[id] = {
          project_id: id,
          project_name: project?.name || 'Unknown',
          problem_to_solve: '',
          what_didnt_work: '',
          what_worked: '',
          surprise_learning: '',
          is_win: false,
          is_blocker: false,
          blocker_description: '',
        }
      }
    })

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

  const handlePillClick = (text: string) => {
    if (activeTextareaId && textareaRefs.current[activeTextareaId]) {
      const textarea = textareaRefs.current[activeTextareaId]!
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const currentValue = textarea.value
      const newValue = currentValue.substring(0, start) + text + ' ' + currentValue.substring(end)

      // Determine which field to update based on the textarea ID
      if (activeTextareaId === 'generalNotes') {
        setGeneralNotes(newValue)
      } else if (activeTextareaId === 'breakthroughs') {
        setBreakthroughs(newValue)
      } else if (activeTextareaId === 'inMyOwnWords') {
        setInMyOwnWords(newValue)
      } else if (activeTextareaId.startsWith('problem_')) {
        const projectId = activeTextareaId.replace('problem_', '')
        updateProjectUpdate(projectId, 'problem_to_solve', newValue)
      } else if (activeTextareaId.startsWith('didntwork_')) {
        const projectId = activeTextareaId.replace('didntwork_', '')
        updateProjectUpdate(projectId, 'what_didnt_work', newValue)
      } else if (activeTextareaId.startsWith('worked_')) {
        const projectId = activeTextareaId.replace('worked_', '')
        updateProjectUpdate(projectId, 'what_worked', newValue)
      } else if (activeTextareaId.startsWith('surprise_')) {
        const projectId = activeTextareaId.replace('surprise_', '')
        updateProjectUpdate(projectId, 'surprise_learning', newValue)
      }

      // Focus back on textarea
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + text.length + 1, start + text.length + 1)
      }, 0)
    }
  }

  const handleSave = async () => {
    if (!userId) return

    setSaving(true)
    setMessage(null)

    try {
      // STEP 1: Create check-in record with new fields
      console.log('=== STEP 1: Creating check_in ===')
      const insertPayload = {
        user_id: userId,
        check_in_type: checkInType,
        check_in_date: todayISO,
        general_notes: generalNotes || null,
        day_type: dayType,
        breakthroughs: breakthroughs || null,
        flag_youtube: flagYoutube,
        flag_linkedin: flagLinkedin,
        in_my_own_words: inMyOwnWords || null,
      }
      console.log('Payload:', JSON.stringify(insertPayload, null, 2))

      const { data: checkInData, error: checkInError } = await supabase
        .from('check_ins')
        .insert(insertPayload)
        .select()
        .single()

      if (checkInError) {
        console.error('=== CHECK_INS INSERT FAILED ===')
        console.error('Error:', checkInError)
        throw new Error(`Check-in failed: ${checkInError.message} (${checkInError.code})`)
      }

      const checkInId = checkInData.id
      console.log('=== CHECK_IN SUCCESS, ID:', checkInId, '===')

      // STEP 2: Create project updates with new fields
      if (Object.keys(projectUpdates).length > 0) {
        console.log('=== STEP 2: Creating project_updates ===')
        const projectUpdateRecords = Object.values(projectUpdates).map(update => ({
          check_in_id: checkInId,
          project_id: update.project_id,
          problem_to_solve: update.problem_to_solve || null,
          what_didnt_work: update.what_didnt_work || null,
          what_worked: update.what_worked || null,
          surprise_learning: update.surprise_learning || null,
          is_win: update.is_win,
          is_blocker: update.is_blocker,
          blocker_description: update.is_blocker ? update.blocker_description : null,
        }))
        console.log('Payload:', JSON.stringify(projectUpdateRecords, null, 2))

        const { error: updateError } = await supabase
          .from('project_updates')
          .insert(projectUpdateRecords)

        if (updateError) {
          console.error('=== PROJECT_UPDATES INSERT FAILED ===')
          console.error('Error:', updateError)
          throw new Error(`Project updates failed: ${updateError.message} (${updateError.code})`)
        }
        console.log('=== PROJECT_UPDATES SUCCESS ===')
      }

      // STEP 3: Create upload records with new fields
      if (uploadedFiles.length > 0) {
        console.log('=== STEP 3: Creating uploads ===')
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
            console.log('Upload payload:', JSON.stringify(uploadPayload, null, 2))

            const { error: uploadError } = await supabase
              .from('uploads')
              .insert(uploadPayload)

            if (uploadError) {
              console.error('=== UPLOADS INSERT FAILED ===')
              console.error('Error:', uploadError)
              throw new Error(`Upload record failed: ${uploadError.message} (${uploadError.code})`)
            }
          }
        }
        console.log('=== UPLOADS SUCCESS ===')
      }

      // Success - show message and redirect
      setMessage({ type: 'success', text: 'Check-in saved successfully!' })
      setTimeout(() => {
        router.push('/dashboard/check-in/history')
      }, 1500)
    } catch (error) {
      console.error('=== SAVE FAILED ===')
      console.error('Error:', error)
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

      {/* Day Type Selector - replaces mood */}
      <section
        className="p-8 rounded-2xl animate-fade-in-up"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <DayTypeSelector value={dayType} onChange={setDayType} />
      </section>

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

        {/* Problem-first project update forms */}
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
                    {/* Primary: Problem to solve */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label
                          className="text-sm font-medium"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          What problem were you trying to solve? *
                        </label>
                        <VoiceInputPlaceholder />
                      </div>
                      <textarea
                        ref={el => { textareaRefs.current[`problem_${projectId}`] = el }}
                        value={update.problem_to_solve}
                        onChange={(e) => updateProjectUpdate(projectId, 'problem_to_solve', e.target.value)}
                        onFocus={() => setActiveTextareaId(`problem_${projectId}`)}
                        placeholder="Describe the challenge or goal you were working on..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl text-sm resize-y transition-all duration-200"
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-default)',
                          color: 'var(--text-primary)',
                        }}
                      />
                      {activeTextareaId === `problem_${projectId}` && (
                        <div className="mt-2">
                          <QuestionPills dayType={dayType} onPillClick={handlePillClick} category="problem" />
                        </div>
                      )}
                    </div>

                    {/* Optional: What didn't work */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label
                          className="text-sm font-medium"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          What didn&apos;t work? (optional)
                        </label>
                        <VoiceInputPlaceholder />
                      </div>
                      <textarea
                        ref={el => { textareaRefs.current[`didntwork_${projectId}`] = el }}
                        value={update.what_didnt_work}
                        onChange={(e) => updateProjectUpdate(projectId, 'what_didnt_work', e.target.value)}
                        onFocus={() => setActiveTextareaId(`didntwork_${projectId}`)}
                        placeholder="Approaches that failed or dead ends..."
                        rows={2}
                        className="w-full px-4 py-3 rounded-xl text-sm resize-y transition-all duration-200"
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-default)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>

                    {/* Optional: What worked */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label
                          className="text-sm font-medium"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          What finally worked? (optional)
                        </label>
                        <VoiceInputPlaceholder />
                      </div>
                      <textarea
                        ref={el => { textareaRefs.current[`worked_${projectId}`] = el }}
                        value={update.what_worked}
                        onChange={(e) => updateProjectUpdate(projectId, 'what_worked', e.target.value)}
                        onFocus={() => setActiveTextareaId(`worked_${projectId}`)}
                        placeholder="The solution or approach that succeeded..."
                        rows={2}
                        className="w-full px-4 py-3 rounded-xl text-sm resize-y transition-all duration-200"
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-default)',
                          color: 'var(--text-primary)',
                        }}
                      />
                      {activeTextareaId === `worked_${projectId}` && (
                        <div className="mt-2">
                          <QuestionPills dayType={dayType} onPillClick={handlePillClick} category="solution" />
                        </div>
                      )}
                    </div>

                    {/* Optional: Surprise learning */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label
                          className="text-sm font-medium"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          Any surprises? (optional)
                        </label>
                        <VoiceInputPlaceholder />
                      </div>
                      <textarea
                        ref={el => { textareaRefs.current[`surprise_${projectId}`] = el }}
                        value={update.surprise_learning}
                        onChange={(e) => updateProjectUpdate(projectId, 'surprise_learning', e.target.value)}
                        onFocus={() => setActiveTextareaId(`surprise_${projectId}`)}
                        placeholder="Unexpected discoveries or learnings..."
                        rows={2}
                        className="w-full px-4 py-3 rounded-xl text-sm resize-y transition-all duration-200"
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-default)',
                          color: 'var(--text-primary)',
                        }}
                      />
                      {activeTextareaId === `surprise_${projectId}` && (
                        <div className="mt-2">
                          <QuestionPills dayType={dayType} onPillClick={handlePillClick} category="learning" />
                        </div>
                      )}
                    </div>

                    {/* Win/Blocker toggles */}
                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => updateProjectUpdate(projectId, 'is_win', !update.is_win)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                        style={{
                          background: update.is_win ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-card)',
                          border: `1px solid ${update.is_win ? 'var(--accent-amber)' : 'var(--border-default)'}`,
                          color: update.is_win ? 'var(--accent-amber)' : 'var(--text-secondary)',
                        }}
                      >
                        <Star className={`w-4 h-4 ${update.is_win ? 'fill-current' : ''}`} />
                        Mark as win
                      </button>

                      <button
                        type="button"
                        onClick={() => updateProjectUpdate(projectId, 'is_blocker', !update.is_blocker)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                        style={{
                          background: update.is_blocker ? 'rgba(255, 107, 107, 0.15)' : 'var(--bg-card)',
                          border: `1px solid ${update.is_blocker ? 'var(--accent-coral)' : 'var(--border-default)'}`,
                          color: update.is_blocker ? 'var(--accent-coral)' : 'var(--text-secondary)',
                        }}
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Flag blocker
                      </button>
                    </div>

                    {update.is_blocker && (
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

      {/* Section 2: Breakthroughs */}
      <section
        className="p-8 rounded-2xl animate-fade-in-up-delay-2"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(245, 158, 11, 0.15)' }}
          >
            <Sparkles className="w-6 h-6" style={{ color: 'var(--accent-amber)' }} />
          </div>
          <div>
            <h2
              className="text-xl font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              Any major wins or discoveries today?
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Capture your breakthroughs for content ideas
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-2">
            <textarea
              ref={el => { textareaRefs.current['breakthroughs'] = el }}
              value={breakthroughs}
              onChange={(e) => setBreakthroughs(e.target.value)}
              onFocus={() => setActiveTextareaId('breakthroughs')}
              placeholder="Describe any major wins, 'aha' moments, or discoveries..."
              rows={4}
              className="flex-1 px-5 py-4 rounded-xl text-base resize-y transition-all duration-200 min-h-[120px]"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            />
            <VoiceInputPlaceholder className="mt-4" />
          </div>

          {activeTextareaId === 'breakthroughs' && (
            <QuestionPills dayType={dayType} onPillClick={handlePillClick} />
          )}

          {/* Content flags */}
          <div className="flex flex-wrap gap-4 pt-2">
            <label
              className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.01]"
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
                className="w-5 h-5"
                style={{ color: flagYoutube ? '#ff0000' : 'var(--text-muted)' }}
              />
              <span
                className="text-sm font-medium"
                style={{ color: flagYoutube ? '#ff0000' : 'var(--text-secondary)' }}
              >
                This deserves a YouTube tutorial
              </span>
            </label>

            <label
              className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.01]"
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
                className="w-5 h-5"
                style={{ color: flagLinkedin ? '#0a66c2' : 'var(--text-muted)' }}
              />
              <span
                className="text-sm font-medium"
                style={{ color: flagLinkedin ? '#0a66c2' : 'var(--text-secondary)' }}
              >
                This deserves a LinkedIn post
              </span>
            </label>
          </div>
        </div>
      </section>

      {/* Section 3: Screenshots & Recordings */}
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

      {/* Section 4: In My Own Words */}
      <section
        className="p-8 rounded-2xl animate-fade-in-up-delay-3"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255, 107, 107, 0.15)' }}
          >
            <Quote className="w-6 h-6" style={{ color: 'var(--accent-coral)' }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2
                className="text-xl font-semibold"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
              >
                In My Own Words
              </h2>
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
                  The AI will keep these verbatim in your content
                </div>
              </div>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Any phrases or quotes you want preserved exactly?
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <textarea
            ref={el => { textareaRefs.current['inMyOwnWords'] = el }}
            value={inMyOwnWords}
            onChange={(e) => setInMyOwnWords(e.target.value)}
            onFocus={() => setActiveTextareaId('inMyOwnWords')}
            placeholder="&quot;This is exactly how I'd describe it...&quot; or key phrases you want to keep word-for-word"
            rows={3}
            className="flex-1 px-5 py-4 rounded-xl text-base resize-y transition-all duration-200"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              fontStyle: 'italic',
            }}
          />
          <VoiceInputPlaceholder className="mt-4" />
        </div>
      </section>

      {/* Section 5: General Notes */}
      <section
        className="p-8 rounded-2xl animate-fade-in-up-delay-3"
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
              General Notes
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Anything else on your mind?
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-2">
            <textarea
              ref={el => { textareaRefs.current['generalNotes'] = el }}
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              onFocus={() => setActiveTextareaId('generalNotes')}
              placeholder="Thoughts, reflections, or anything not specific to a project..."
              rows={4}
              className="flex-1 px-5 py-4 rounded-xl text-base resize-y transition-all duration-200 min-h-[120px]"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            />
            <VoiceInputPlaceholder className="mt-4" />
          </div>

          {activeTextareaId === 'generalNotes' && (
            <QuestionPills dayType={dayType} onPillClick={handlePillClick} />
          )}
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
