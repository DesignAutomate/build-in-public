'use client'

import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'

interface AutoExpandingTextareaProps {
  value: string
  onChange: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
  placeholder?: string
  minRows?: number
  maxRows?: number
  className?: string
  style?: React.CSSProperties
  id?: string
}

export interface AutoExpandingTextareaRef {
  focus: () => void
  insertText: (text: string) => void
  getSelectionStart: () => number
}

const AutoExpandingTextarea = forwardRef<AutoExpandingTextareaRef, AutoExpandingTextareaProps>(
  (
    {
      value,
      onChange,
      onFocus,
      onBlur,
      placeholder,
      minRows = 3,
      maxRows = 20,
      className = '',
      style = {},
      id,
    },
    ref
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      insertText: (text: string) => {
        if (!textareaRef.current) return
        const textarea = textareaRef.current
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const newValue = value.substring(0, start) + text + value.substring(end)
        onChange(newValue)
        // Set cursor position after inserted text
        setTimeout(() => {
          textarea.focus()
          textarea.setSelectionRange(start + text.length, start + text.length)
        }, 0)
      },
      getSelectionStart: () => textareaRef.current?.selectionStart ?? value.length,
    }))

    // Auto-resize logic
    useEffect(() => {
      const textarea = textareaRef.current
      if (!textarea) return

      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto'

      // Calculate line height (approximate)
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24
      const minHeight = lineHeight * minRows
      const maxHeight = lineHeight * maxRows

      // Set height based on content, clamped between min and max
      const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)
      textarea.style.height = `${newHeight}px`

      // Show scrollbar if content exceeds max height
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden'
    }, [value, minRows, maxRows])

    return (
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-xl text-sm resize-none transition-all duration-200 ${className}`}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-primary)',
          lineHeight: '1.6',
          ...style,
        }}
      />
    )
  }
)

AutoExpandingTextarea.displayName = 'AutoExpandingTextarea'

export default AutoExpandingTextarea
