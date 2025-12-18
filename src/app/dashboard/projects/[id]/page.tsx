'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FolderKanban,
  ArrowLeft,
  Save,
  Loader2,
  Lightbulb,
  Users,
  MessageSquare,
  Wrench,
  Calendar,
  AlertCircle,
  Trash2,
  Check,
  X,
  TrendingUp,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ProjectData {
  id: string
  name: string
  description: string
  goals: string
  target_audience: string
  content_angle: string
  technologies: string
  target_completion_date: string
  status: 'active' | 'paused' | 'completed'
  progress_percentage: number
}

const defaultProject: ProjectData = {
  id: '',
  name: '',
  description: '',
  goals: '',
  target_audience: '',
  content_angle: '',
  technologies: '',
  target_completion_date: '',
  status: 'active',
  progress_percentage: 0,
}

const statusOptions = [
  { value: 'active', label: 'Active', color: 'var(--accent-teal)' },
  { value: 'paused', label: 'Paused', color: 'var(--accent-amber)' },
  { value: 'completed', label: 'Completed', color: 'var(--accent-coral)' },
]

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [project, setProject] = useState<ProjectData>(defaultProject)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProject()
  }, [id])

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      // Convert technologies array to comma-separated string
      const techArray = data.technologies as string[] | null
      const techString = techArray ? techArray.join(', ') : ''

      setProject({
        id: data.id,
        name: data.name || '',
        description: data.description || '',
        goals: data.goals || '',
        target_audience: data.target_audience || '',
        content_angle: data.content_angle || '',
        technologies: techString,
        target_completion_date: data.target_completion_date || '',
        status: data.status || 'active',
        progress_percentage: data.progress_percentage || 0,
      })
    } catch (error) {
      console.error('Error loading project:', error)
      setMessage({ type: 'error', text: 'Failed to load project' })
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: keyof ProjectData, value: string | number) => {
    setProject(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      // Convert comma-separated technologies to array
      const technologiesArray = project.technologies
        .split(',')
        .map(tech => tech.trim())
        .filter(tech => tech.length > 0)

      const payload = {
        name: project.name.trim(),
        description: project.description.trim() || null,
        goals: project.goals.trim() || null,
        target_audience: project.target_audience.trim() || null,
        content_angle: project.content_angle.trim() || null,
        technologies: technologiesArray.length > 0 ? technologiesArray : null,
        target_completion_date: project.target_completion_date || null,
        status: project.status,
        progress_percentage: project.progress_percentage,
        updated_at: new Date().toISOString(),
      }

      console.log('Updating project with payload:', payload)

      const { error } = await supabase
        .from('projects')
        .update(payload)
        .eq('id', id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Project saved successfully!' })
      setTimeout(() => setMessage(null), 4000)
    } catch (error) {
      console.error('Error saving project:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setMessage({ type: 'error', text: `Failed to save: ${errorMessage}` })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)

      if (error) throw error

      router.push('/dashboard/projects')
    } catch (error) {
      console.error('Error deleting project:', error)
      setMessage({ type: 'error', text: 'Failed to delete project' })
      setDeleting(false)
      setShowDeleteConfirm(false)
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
          <p style={{ color: 'var(--text-muted)' }}>Loading project...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10 max-w-3xl">
      {/* Header */}
      <header className="animate-fade-in-up">
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-2 text-sm font-medium mb-6 transition-colors hover:opacity-80"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>

        <div className="flex items-center gap-2 mb-2">
          <FolderKanban className="w-5 h-5" style={{ color: 'var(--accent-coral)' }} />
          <span
            className="text-sm font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            Edit Project
          </span>
        </div>
        <h1
          className="text-4xl font-bold tracking-tight mb-3"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
        >
          {project.name || 'Untitled Project'}
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

      {/* Progress & Status Section */}
      <section
        className="p-8 rounded-2xl animate-fade-in-up-delay-1"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(45, 212, 191, 0.15)' }}
          >
            <TrendingUp className="w-6 h-6" style={{ color: 'var(--accent-teal)' }} />
          </div>
          <div>
            <h2
              className="text-xl font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              Progress & Status
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Track your project&apos;s journey
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Progress Slider */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label
                className="text-sm font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                Progress
              </label>
              <span
                className="text-lg font-bold"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
              >
                {project.progress_percentage}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={project.progress_percentage}
              onChange={(e) => updateField('progress_percentage', parseInt(e.target.value))}
              className="w-full h-3 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--accent-coral) 0%, var(--accent-amber) ${project.progress_percentage}%, var(--bg-elevated) ${project.progress_percentage}%)`,
              }}
            />
          </div>

          {/* Status Dropdown */}
          <div>
            <label
              className="block text-sm font-medium mb-3"
              style={{ color: 'var(--text-secondary)' }}
            >
              Status
            </label>
            <div className="flex gap-3">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateField('status', option.value)}
                  className={`
                    flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${project.status === option.value ? 'ring-2' : 'hover:opacity-80'}
                  `}
                  style={{
                    background: project.status === option.value
                      ? `${option.color}20`
                      : 'var(--bg-elevated)',
                    color: project.status === option.value ? option.color : 'var(--text-secondary)',
                    border: `1px solid ${project.status === option.value ? option.color : 'var(--border-default)'}`,
                    ringColor: option.color,
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Project Basics */}
      <section
        className="p-8 rounded-2xl animate-fade-in-up-delay-2"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255, 107, 107, 0.15)' }}
          >
            <FolderKanban className="w-6 h-6" style={{ color: 'var(--accent-coral)' }} />
          </div>
          <div>
            <h2
              className="text-xl font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              Project Basics
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              The essentials about your project
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label
              className="block text-sm font-medium mb-3"
              style={{ color: 'var(--text-secondary)' }}
            >
              Project Name <span style={{ color: 'var(--accent-coral)' }}>*</span>
            </label>
            <input
              type="text"
              value={project.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g., SaaS Analytics Dashboard"
              className="w-full px-5 py-4 rounded-xl text-base transition-all duration-200 focus:ring-2 focus:ring-[var(--accent-coral)]"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-3"
              style={{ color: 'var(--text-secondary)' }}
            >
              Description
            </label>
            <textarea
              value={project.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="What is this project about? What problem does it solve?"
              rows={4}
              className="w-full px-5 py-4 rounded-xl text-base resize-y transition-all duration-200 focus:ring-2 focus:ring-[var(--accent-coral)] min-h-[120px]"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>
      </section>

      {/* Goals & Vision */}
      <section
        className="p-8 rounded-2xl animate-fade-in-up-delay-3"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(45, 212, 191, 0.15)' }}
          >
            <Lightbulb className="w-6 h-6" style={{ color: 'var(--accent-teal)' }} />
          </div>
          <div>
            <h2
              className="text-xl font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              Goals & Vision
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Define what success looks like
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label
              className="block text-sm font-medium mb-3"
              style={{ color: 'var(--text-secondary)' }}
            >
              Goals
            </label>
            <textarea
              value={project.goals}
              onChange={(e) => updateField('goals', e.target.value)}
              placeholder="What does success look like for this project?"
              rows={4}
              className="w-full px-5 py-4 rounded-xl text-base resize-y transition-all duration-200 focus:ring-2 focus:ring-[var(--accent-teal)] min-h-[120px]"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                className="block text-sm font-medium mb-3"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Calendar className="w-4 h-4 inline-block mr-2 opacity-70" />
                Target Completion
              </label>
              <input
                type="date"
                value={project.target_completion_date}
                onChange={(e) => updateField('target_completion_date', e.target.value)}
                className="w-full px-5 py-4 rounded-xl text-base transition-all duration-200 focus:ring-2 focus:ring-[var(--accent-teal)]"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  colorScheme: 'dark',
                }}
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-3"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Wrench className="w-4 h-4 inline-block mr-2 opacity-70" />
                Technologies Used
              </label>
              <input
                type="text"
                value={project.technologies}
                onChange={(e) => updateField('technologies', e.target.value)}
                placeholder="e.g., Next.js, Supabase, Tailwind"
                className="w-full px-5 py-4 rounded-xl text-base transition-all duration-200 focus:ring-2 focus:ring-[var(--accent-teal)]"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Content Strategy */}
      <section
        className="p-8 rounded-2xl animate-fade-in-up-delay-3"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(245, 158, 11, 0.15)' }}
          >
            <MessageSquare className="w-6 h-6" style={{ color: 'var(--accent-amber)' }} />
          </div>
          <div>
            <h2
              className="text-xl font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              Content Strategy
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              How you&apos;ll share this project publicly
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label
              className="block text-sm font-medium mb-3"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Users className="w-4 h-4 inline-block mr-2 opacity-70" />
              Target Audience (optional)
            </label>
            <textarea
              value={project.target_audience}
              onChange={(e) => updateField('target_audience', e.target.value)}
              placeholder="Override your default target audience for this specific project..."
              rows={3}
              className="w-full px-5 py-4 rounded-xl text-base resize-y transition-all duration-200 focus:ring-2 focus:ring-[var(--accent-amber)] min-h-[100px]"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-3"
              style={{ color: 'var(--text-secondary)' }}
            >
              Content Angle (optional)
            </label>
            <textarea
              value={project.content_angle}
              onChange={(e) => updateField('content_angle', e.target.value)}
              placeholder="How should content about this project be framed?"
              rows={4}
              className="w-full px-5 py-4 rounded-xl text-base resize-y transition-all duration-200 focus:ring-2 focus:ring-[var(--accent-amber)] min-h-[120px]"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>
      </section>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-6 pb-8">
        {/* Delete button */}
        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:opacity-80"
            style={{
              background: 'rgba(255, 107, 107, 0.1)',
              color: 'var(--accent-coral)',
              border: '1px solid rgba(255, 107, 107, 0.3)',
            }}
          >
            <Trash2 className="w-4 h-4" />
            Delete Project
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Are you sure?
            </span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: 'var(--accent-coral)',
                color: 'white',
              }}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Yes, delete
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-default)',
              }}
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        )}

        {/* Save button */}
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
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  )
}
