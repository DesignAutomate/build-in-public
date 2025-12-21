'use client'

import { Lightbulb, Cog, BrickWall } from 'lucide-react'

export type DayType = 'breakthrough' | 'grind' | 'stuck' | null

interface DayTypeSelectorProps {
  value: DayType
  onChange: (value: DayType) => void
}

const dayTypeOptions: {
  value: DayType
  label: string
  emoji: string
  icon: typeof Lightbulb
  color: string
  description: string
}[] = [
  {
    value: 'breakthrough',
    label: 'Breakthrough',
    emoji: '💡',
    icon: Lightbulb,
    color: 'var(--accent-amber)',
    description: 'Major wins or discoveries',
  },
  {
    value: 'grind',
    label: 'Grind',
    emoji: '⚙️',
    icon: Cog,
    color: 'var(--accent-teal)',
    description: 'Steady progress',
  },
  {
    value: 'stuck',
    label: 'Stuck',
    emoji: '🧱',
    icon: BrickWall,
    color: 'var(--accent-coral)',
    description: 'Facing blockers',
  },
]

export default function DayTypeSelector({ value, onChange }: DayTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <label
        className="block text-sm font-medium"
        style={{ color: 'var(--text-secondary)' }}
      >
        What kind of update is this?
      </label>
      <div className="flex flex-wrap gap-3">
        {dayTypeOptions.map((option) => {
          const isSelected = value === option.value
          const Icon = option.icon

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(isSelected ? null : option.value)}
              className="flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: isSelected ? `${option.color}20` : 'var(--bg-elevated)',
                border: `2px solid ${isSelected ? option.color : 'var(--border-default)'}`,
                color: isSelected ? option.color : 'var(--text-secondary)',
              }}
            >
              <span className="text-lg">{option.emoji}</span>
              <div className="text-left">
                <span className="font-semibold">{option.label}</span>
                {isSelected && (
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: 'var(--text-muted)', opacity: 0.8 }}
                  >
                    {option.description}
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
