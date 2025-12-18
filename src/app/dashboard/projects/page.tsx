import Link from 'next/link'
import { FolderKanban, Plus, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import ProjectCard, { Project } from '@/components/project-card'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, description, status, progress_percentage, created_at')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error loading projects:', error)
  }

  const projectList = (projects || []) as Project[]

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FolderKanban className="w-5 h-5" style={{ color: 'var(--accent-coral)' }} />
              <span
                className="text-sm font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                Projects
              </span>
            </div>
            <h1
              className="text-4xl font-bold tracking-tight mb-3"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              Your Projects
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Track your builds and share your progress with the world.
            </p>
          </div>

          <Link
            href="/dashboard/projects/new"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, var(--accent-coral), var(--accent-coral-hover))',
              color: 'white',
              boxShadow: '0 4px 20px rgba(255, 107, 107, 0.3)',
            }}
          >
            <Plus className="w-4 h-4" />
            New Project
          </Link>
        </div>
      </header>

      {/* Projects Grid or Empty State */}
      {projectList.length > 0 ? (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projectList.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </section>
      ) : (
        <section
          className="relative p-8 rounded-2xl overflow-hidden animate-fade-in-up-delay-1"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {/* Background pattern */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, var(--text-muted) 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />

          <div className="relative text-center max-w-md mx-auto py-12">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center animate-pulse-subtle"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.2), rgba(245, 158, 11, 0.2))',
                border: '1px solid var(--border-default)',
              }}
            >
              <Sparkles className="w-8 h-8" style={{ color: 'var(--accent-coral)' }} />
            </div>

            <h2
              className="text-xl font-semibold mb-3"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              No projects yet
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Create your first project to start tracking your build in public journey.
            </p>

            <Link
              href="/dashboard/projects/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, var(--accent-coral), var(--accent-coral-hover))',
                color: 'white',
                boxShadow: '0 4px 20px rgba(255, 107, 107, 0.3)',
              }}
            >
              <Plus className="w-4 h-4" />
              Create Your First Project
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
