import Link from 'next/link'
import { Calendar, ArrowRight } from 'lucide-react'

export interface Project {
  id: string
  name: string
  description: string | null
  status: 'active' | 'paused' | 'completed'
  progress_percentage: number
  created_at: string
}

interface ProjectCardProps {
  project: Project
  index?: number
}

const statusConfig = {
  active: {
    label: 'Active',
    bg: 'rgba(45, 212, 191, 0.15)',
    color: 'var(--accent-teal)',
  },
  paused: {
    label: 'Paused',
    bg: 'rgba(245, 158, 11, 0.15)',
    color: 'var(--accent-amber)',
  },
  completed: {
    label: 'Completed',
    bg: 'rgba(255, 107, 107, 0.15)',
    color: 'var(--accent-coral)',
  },
}

export default function ProjectCard({ project, index = 0 }: ProjectCardProps) {
  const status = statusConfig[project.status] || statusConfig.active
  const createdDate = new Date(project.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Link
      href={`/dashboard/projects/${project.id}`}
      className={`
        group relative block p-6 rounded-2xl overflow-hidden
        transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1
        animate-fade-in-up-delay-${Math.min(index + 1, 3)}
      `}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Gradient accent at top */}
      <div
        className="absolute top-0 left-0 right-0 h-1 opacity-80"
        style={{
          background: `linear-gradient(90deg, ${status.color}, transparent)`,
        }}
      />

      {/* Header with status */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <h3
          className="text-lg font-semibold line-clamp-1"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)',
          }}
        >
          {project.name}
        </h3>
        <span
          className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium"
          style={{
            background: status.bg,
            color: status.color,
          }}
        >
          {status.label}
        </span>
      </div>

      {/* Description */}
      {project.description && (
        <p
          className="text-sm line-clamp-2 mb-5"
          style={{ color: 'var(--text-secondary)' }}
        >
          {project.description}
        </p>
      )}

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Progress
          </span>
          <span
            className="text-xs font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {project.progress_percentage}%
          </span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: 'var(--bg-elevated)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${project.progress_percentage}%`,
              background: `linear-gradient(90deg, var(--accent-coral), var(--accent-amber))`,
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-2 text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>{createdDate}</span>
        </div>

        <div
          className="flex items-center gap-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ color: 'var(--accent-coral)' }}
        >
          <span>View</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
        </div>
      </div>

      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(255, 107, 107, 0.08), transparent 70%)',
        }}
      />
    </Link>
  )
}
