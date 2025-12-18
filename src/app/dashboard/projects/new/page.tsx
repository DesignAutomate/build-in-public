'use client'

import { useState } from 'react'
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
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ProjectForm {
  name: string
  description: string
  goals: string
  target_audience: string
  content_angle: string
  technologies: string
  target_completion_date: string
}

const defaultForm: ProjectForm = {
  name: '',
  description: '',
  goals: '',
  target_audience: '',
  content_angle: '',
  technologies: '',
  target_completion_date: '',
}

export default function NewProjectPage() {
  const [form, setForm] = useState<ProjectForm>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const updateField = (field: keyof ProjectForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) {
      setError('Project name is required')
      return
    }

    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Convert comma-separated technologies to array
      const technologiesArray = form.technologies
        .split(',')
        .map(tech => tech.trim())
        .filter(tech => tech.length > 0)

      const payload = {
        user_id: user.id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        goals: form.goals.trim() || null,
        target_audience: form.target_audience.trim() || null,
        content_angle: form.content_angle.trim() || null,
        technologies: technologiesArray.length > 0 ? technologiesArray : null,
        target_completion_date: form.target_completion_date || null,
        status: 'active',
        progress_percentage: 0,
      }

      console.log('Creating project with payload:', payload)

      const { error: insertError } = await supabase
        .from('projects')
        .insert(payload)

      if (insertError) {
        console.error('Supabase error:', insertError)
        throw insertError
      }

      router.push('/dashboard/projects')
    } catch (err) {
      console.error('Error creating project:', err)
      const message = err instanceof Error ? err.message : 'Failed to create project'
      setError(message)
    } finally {
      setSaving(false)
    }
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
            New Project
          </span>
        </div>
        <h1
          className="text-4xl font-bold tracking-tight mb-3"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
        >
          Create a Project
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Start tracking a new build and share your journey.
        </p>
      </header>

      {/* Error message */}
      {error && (
        <div
          className="flex items-center gap-3 px-5 py-4 rounded-xl animate-fade-in-up border-l-4"
          style={{
            background: 'rgba(255, 107, 107, 0.1)',
            borderLeftColor: 'var(--accent-coral)',
          }}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--accent-coral)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--accent-coral)' }}>
            {error}
          </span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Project Basics */}
        <section
          className="p-8 rounded-2xl animate-fade-in-up-delay-1"
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
                value={form.name}
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
                value={form.description}
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
          className="p-8 rounded-2xl animate-fade-in-up-delay-2"
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
                value={form.goals}
                onChange={(e) => updateField('goals', e.target.value)}
                placeholder="What does success look like for this project? What milestones are you aiming for?"
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
                  value={form.target_completion_date}
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
                  value={form.technologies}
                  onChange={(e) => updateField('technologies', e.target.value)}
                  placeholder="e.g., Next.js, Supabase, Tailwind"
                  className="w-full px-5 py-4 rounded-xl text-base transition-all duration-200 focus:ring-2 focus:ring-[var(--accent-teal)]"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                  }}
                />
                <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Separate with commas
                </p>
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
                value={form.target_audience}
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
              <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                Leave empty to use your default audience from settings
              </p>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-3"
                style={{ color: 'var(--text-secondary)' }}
              >
                Content Angle (optional)
              </label>
              <textarea
                value={form.content_angle}
                onChange={(e) => updateField('content_angle', e.target.value)}
                placeholder="How should content about this project be framed? e.g., 'Focus on the technical challenges and solutions', 'Highlight the business metrics and growth'"
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

        {/* Submit button */}
        <div className="flex items-center justify-between pt-6 pb-8">
          <Link
            href="/dashboard/projects"
            className="px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:opacity-80"
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
            }}
          >
            Cancel
          </Link>

          <button
            type="submit"
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
                Creating...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Create Project
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
