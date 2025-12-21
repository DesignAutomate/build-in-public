'use client'

interface QuestionPillsProps {
  onPillClick: (text: string) => void
}

// Sentence starters that insert into the main textarea
const sentenceStarters = [
  "The problem I was solving was ",
  "What finally worked was ",
  "What didn't work was ",
  "The surprising thing was ",
  "The technical challenge was ",
  "I decided to ",
  "I got stuck on ",
  "The breakthrough was ",
]

export default function QuestionPills({ onPillClick }: QuestionPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {sentenceStarters.map((starter, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onPillClick(starter)}
          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-coral)'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)'
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          {starter.trim()}...
        </button>
      ))}
    </div>
  )
}
