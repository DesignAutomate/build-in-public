'use client'

import { DayType } from './day-type-selector'

interface QuestionPillsProps {
  dayType: DayType
  onPillClick: (text: string) => void
  category?: 'general' | 'problem' | 'solution' | 'learning'
}

interface QuestionPill {
  text: string
  category: 'general' | 'stuck' | 'breakthrough' | 'problem' | 'solution' | 'learning'
}

const questionPills: QuestionPill[] = [
  // General prompts
  { text: "What's the one thing I want to accomplish today?", category: 'general' },
  { text: "What would make today feel successful?", category: 'general' },
  { text: "What's the most important decision I made?", category: 'general' },
  { text: "What would I do differently next time?", category: 'general' },
  { text: "What's surprising me about this project?", category: 'general' },

  // When stuck
  { text: "What assumption might be wrong?", category: 'stuck' },
  { text: "Who could I ask for help?", category: 'stuck' },
  { text: "What's the simplest version of this I could build?", category: 'stuck' },
  { text: "What would I tell a junior dev facing this?", category: 'stuck' },
  { text: "What's the real problem I'm trying to solve?", category: 'stuck' },
  { text: "What resources haven't I tried yet?", category: 'stuck' },

  // When breakthrough
  { text: "What was the 'aha moment'?", category: 'breakthrough' },
  { text: "Why did this solution work when others didn't?", category: 'breakthrough' },
  { text: "What would my past self need to know?", category: 'breakthrough' },
  { text: "How could I explain this to someone else?", category: 'breakthrough' },
  { text: "What pattern can I apply elsewhere?", category: 'breakthrough' },
  { text: "What made this click today?", category: 'breakthrough' },

  // Problem-focused
  { text: "What user pain point am I addressing?", category: 'problem' },
  { text: "What's the technical challenge here?", category: 'problem' },
  { text: "What constraints am I working within?", category: 'problem' },

  // Solution-focused
  { text: "What approach am I taking?", category: 'solution' },
  { text: "What alternatives did I consider?", category: 'solution' },
  { text: "What trade-offs did I make?", category: 'solution' },

  // Learning-focused
  { text: "What did I learn that I didn't expect?", category: 'learning' },
  { text: "What would I research more?", category: 'learning' },
  { text: "What mistake taught me something?", category: 'learning' },
]

export default function QuestionPills({ dayType, onPillClick, category }: QuestionPillsProps) {
  // Filter pills based on day type and category
  const getRelevantPills = (): QuestionPill[] => {
    let filtered = questionPills

    // If a specific category is requested, filter to that
    if (category) {
      filtered = filtered.filter(p => p.category === category)
    } else {
      // Otherwise, show contextual pills based on day type
      if (dayType === 'stuck') {
        filtered = filtered.filter(p => p.category === 'stuck' || p.category === 'general')
      } else if (dayType === 'breakthrough') {
        filtered = filtered.filter(p => p.category === 'breakthrough' || p.category === 'general')
      } else {
        filtered = filtered.filter(p => p.category === 'general')
      }
    }

    // Shuffle and limit to 5 pills
    return filtered.sort(() => Math.random() - 0.5).slice(0, 5)
  }

  const pills = getRelevantPills()

  if (pills.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {pills.map((pill, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onPillClick(pill.text)}
          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)',
          }}
        >
          {pill.text}
        </button>
      ))}
    </div>
  )
}
