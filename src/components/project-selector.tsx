'use client'

import { Check } from 'lucide-react'

export interface Project {
  id: string
  name: string
  status: string
}

interface ProjectSelectorProps {
  projects: Project[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
}

export default function ProjectSelector({
  projects,
  selectedIds,
  onSelectionChange,
}: ProjectSelectorProps) {
  const toggleProject = (projectId: string) => {
    if (selectedIds.includes(projectId)) {
      onSelectionChange(selectedIds.filter(id => id !== projectId))
    } else {
      onSelectionChange([...selectedIds, projectId])
    }
  }

  if (projects.length === 0) {
    return (
      <div
        className="p-6 rounded-xl text-center"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
      >
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No active projects. Create a project first to track your progress.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-3">
      {projects.map((project) => {
        const isSelected = selectedIds.includes(project.id)

        return (
          <button
            key={project.id}
            type="button"
            onClick={() => toggleProject(project.id)}
            className={`
              relative flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium
              transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
            `}
            style={{
              background: isSelected ? 'rgba(255, 107, 107, 0.15)' : 'var(--bg-elevated)',
              border: `2px solid ${isSelected ? 'var(--accent-coral)' : 'var(--border-default)'}`,
              color: isSelected ? 'var(--accent-coral)' : 'var(--text-secondary)',
            }}
          >
            {/* Checkmark indicator */}
            <div
              className={`
                w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200
                ${isSelected ? 'scale-100' : 'scale-90'}
              `}
              style={{
                background: isSelected ? 'var(--accent-coral)' : 'var(--bg-card)',
                border: isSelected ? 'none' : '1px solid var(--border-default)',
              }}
            >
              {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
            </div>

            <span>{project.name}</span>
          </button>
        )
      })}
    </div>
  )
}
