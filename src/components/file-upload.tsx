'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Upload,
  X,
  FileVideo,
  Loader2,
  Image as ImageIcon,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface UploadedFile {
  id: string
  file_name: string
  file_url: string  // This stores the storage path, not the full URL
  file_type: string
  file_size: number
  user_context: string
  preview_url?: string  // This is a signed URL for display
  what_am_i_looking_at?: string  // Enhanced prompt: What am I looking at?
  why_does_this_matter?: string  // Enhanced prompt: Why does this matter?
}

interface FileUploadProps {
  userId: string
  files: UploadedFile[]
  onFilesChange: (files: UploadedFile[]) => void
}

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm']
const ACCEPTED_TYPES = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES]
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export default function FileUpload({ userId, files, onFilesChange }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Store handleFilesUpload in a ref so paste handler can access latest version
  const handleFilesUploadRef = useRef<(files: File[]) => Promise<void>>()

  // Handle clipboard paste via Ctrl+V / Cmd+V
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const imageFiles: File[] = []

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            const timestamp = Date.now()
            const extension = file.type.split('/')[1] || 'png'
            const namedFile = new File([file], `clipboard_${timestamp}.${extension}`, {
              type: file.type,
            })
            imageFiles.push(namedFile)
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault()
        if (handleFilesUploadRef.current) {
          await handleFilesUploadRef.current(imageFiles)
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  // Generate a signed URL for displaying an image
  const getSignedUrl = async (storagePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('uploads')
        .createSignedUrl(storagePath, 3600)

      if (error) return null
      return data.signedUrl
    } catch {
      return null
    }
  }

  const uploadFile = async (file: File): Promise<UploadedFile | null> => {
    if (!ACCEPTED_TYPES.includes(file.type)) return null
    if (file.size > MAX_FILE_SIZE) return null

    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `${userId}/${timestamp}_${sanitizedName}`

    try {
      const { error } = await supabase.storage
        .from('uploads')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) throw error

      const signedUrl = await getSignedUrl(storagePath)
      const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type)

      return {
        id: `temp_${timestamp}_${Math.random().toString(36).slice(2)}`,
        file_name: file.name,
        file_url: storagePath,
        file_type: file.type,
        file_size: file.size,
        user_context: '',
        preview_url: isImage && signedUrl ? signedUrl : undefined,
      }
    } catch {
      return null
    }
  }

  const handleFilesUpload = async (fileList: File[]) => {
    const validFiles = fileList.filter(
      file => ACCEPTED_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE
    )

    if (validFiles.length === 0) return

    setUploading(true)

    const uploadedFiles: UploadedFile[] = []

    for (const file of validFiles) {
      const uploaded = await uploadFile(file)
      if (uploaded) {
        uploadedFiles.push(uploaded)
      }
    }

    onFilesChange([...files, ...uploadedFiles])
    setUploading(false)
  }

  handleFilesUploadRef.current = handleFilesUpload

  const handleFiles = async (fileList: FileList) => {
    await handleFilesUpload(Array.from(fileList))
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files.length > 0) {
      await handleFiles(e.dataTransfer.files)
    }
  }, [files, onFilesChange, userId])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFiles(e.target.files)
    }
  }

  const removeFile = async (fileToRemove: UploadedFile) => {
    try {
      await supabase.storage.from('uploads').remove([fileToRemove.file_url])
    } catch {
      // Ignore storage errors
    }

    onFilesChange(files.filter(f => f.id !== fileToRemove.id))
    if (expandedFileId === fileToRemove.id) {
      setExpandedFileId(null)
    }
  }

  const updateFileField = (fileId: string, field: keyof UploadedFile, value: string) => {
    onFilesChange(
      files.map(f => f.id === fileId ? { ...f, [field]: value } : f)
    )
  }

  const isImage = (fileType: string) => ACCEPTED_IMAGE_TYPES.includes(fileType)

  return (
    <div className="space-y-3">
      {/* Compact horizontal thumbnail row */}
      <div
        className="flex items-center gap-3 overflow-x-auto pb-2"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Existing files as thumbnails */}
        {files.map((file) => (
          <div key={file.id} className="flex-shrink-0">
            <div
              className={`relative w-16 h-16 rounded-lg overflow-hidden cursor-pointer group transition-all duration-200 ${
                expandedFileId === file.id ? 'ring-2 ring-offset-2' : ''
              }`}
              style={{
                background: 'var(--bg-elevated)',
                ringColor: 'var(--accent-coral)',
                ringOffsetColor: 'var(--bg-primary)',
              }}
              onClick={() => setExpandedFileId(expandedFileId === file.id ? null : file.id)}
            >
              {isImage(file.file_type) && file.preview_url ? (
                <img
                  src={file.preview_url}
                  alt={file.file_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: 'var(--bg-card)' }}
                >
                  <FileVideo className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
                </div>
              )}

              {/* Delete button on hover */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile(file)
                }}
                className="absolute -top-1 -right-1 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ background: 'var(--accent-coral)' }}
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          </div>
        ))}

        {/* Add button */}
        <div className="flex-shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105 ${
              isDragging ? 'scale-105' : ''
            }`}
            style={{
              borderColor: isDragging ? 'var(--accent-coral)' : 'var(--border-default)',
              background: isDragging ? 'rgba(255, 107, 107, 0.05)' : 'transparent',
            }}
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--accent-coral)' }} />
            ) : (
              <Plus className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            )}
          </button>
        </div>
      </div>

      {/* Help text */}
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Drop files, click +, or press Ctrl+V to paste
      </p>

      {/* Expanded file details */}
      {expandedFileId && files.find(f => f.id === expandedFileId) && (
        <div
          className="p-4 rounded-xl space-y-3 animate-fade-in-up"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          {(() => {
            const file = files.find(f => f.id === expandedFileId)!
            return (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {file.file_name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setExpandedFileId(null)}
                    className="p-1 rounded-lg hover:bg-opacity-20"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    What am I looking at?
                  </label>
                  <input
                    type="text"
                    value={file.what_am_i_looking_at || ''}
                    onChange={(e) => updateFileField(file.id, 'what_am_i_looking_at', e.target.value)}
                    placeholder="Describe what's shown..."
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Why does this matter?
                  </label>
                  <input
                    type="text"
                    value={file.why_does_this_matter || ''}
                    onChange={(e) => updateFileField(file.id, 'why_does_this_matter', e.target.value)}
                    placeholder="Why is this significant?"
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}
