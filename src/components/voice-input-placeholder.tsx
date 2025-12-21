'use client'

import { useState } from 'react'
import { Mic } from 'lucide-react'

interface VoiceInputPlaceholderProps {
  className?: string
}

export default function VoiceInputPlaceholder({ className = '' }: VoiceInputPlaceholderProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setShowTooltip(true)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-muted)',
        }}
        aria-label="Voice input coming soon"
      >
        <Mic className="w-4 h-4" />
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap z-50 animate-fade-in-up"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div className="flex items-center gap-2">
            <span>🎤</span>
            <span>Voice input coming soon</span>
          </div>
          {/* Arrow */}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45"
            style={{
              background: 'var(--bg-card)',
              borderRight: '1px solid var(--border-default)',
              borderBottom: '1px solid var(--border-default)',
              marginTop: '-4px',
            }}
          />
        </div>
      )}
    </div>
  )
}
