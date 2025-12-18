'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Upload,
  X,
  FileVideo,
  Loader2,
  Image as ImageIcon,
  Clipboard,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface UploadedFile {
  id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  user_context: string
  preview_url?: string
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
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [pasteError, setPasteError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Store handleFilesUpload in a ref so paste handler can access it
  const handleFilesUploadRef = useRef<(files: File[]) => Promise<void>>()

  // Handle clipboard paste via Ctrl+V
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const imageFiles: File[] = []

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith('image/')) {
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

  // Handle click to paste from clipboard using Clipboard API
  const handlePasteFromClipboard = async () => {
    setPasteError(null)

    try {
      // Check if clipboard API is available
      if (!navigator.clipboard || !navigator.clipboard.read) {
        setPasteError('Clipboard access not supported in this browser')
        return
      }

      const clipboardItems = await navigator.clipboard.read()
      const imageFiles: File[] = []

      for (const item of clipboardItems) {
        // Look for image types in the clipboard item
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type)
            const timestamp = Date.now()
            const extension = type.split('/')[1] || 'png'
            const file = new File([blob], `clipboard_${timestamp}.${extension}`, { type })
            imageFiles.push(file)
            break // Only take one image per clipboard item
          }
        }
      }

      if (imageFiles.length === 0) {
        setPasteError('No images found in clipboard')
        setTimeout(() => setPasteError(null), 3000)
        return
      }

      await handleFilesUpload(imageFiles)
    } catch (error) {
      console.error('Clipboard paste error:', error)
      if (error instanceof Error && error.name === 'NotAllowedError') {
        setPasteError('Clipboard access denied. Try using Ctrl+V instead.')
      } else {
        setPasteError('Failed to read clipboard. Try using Ctrl+V instead.')
      }
      setTimeout(() => setPasteError(null), 3000)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const uploadFile = async (file: File): Promise<UploadedFile | null> => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      console.error('Invalid file type:', file.type)
      return null
    }

    if (file.size > MAX_FILE_SIZE) {
      console.error('File too large:', file.size)
      return null
    }

    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${userId}/${timestamp}_${sanitizedName}`

    try {
      const { error } = await supabase.storage
        .from('uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) throw error

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath)

      const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type)

      return {
        id: `temp_${timestamp}_${Math.random().toString(36).slice(2)}`,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
        user_context: '',
        preview_url: isImage ? urlData.publicUrl : undefined,
      }
    } catch (error) {
      console.error('Upload error:', error)
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
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }))

      const uploaded = await uploadFile(file)

      if (uploaded) {
        uploadedFiles.push(uploaded)
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }))
      }
    }

    onFilesChange([...files, ...uploadedFiles])
    setUploading(false)
    setUploadProgress({})
  }

  // Keep ref updated for paste handler
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
    // Extract file path from URL for deletion
    try {
      const url = new URL(fileToRemove.file_url)
      const pathParts = url.pathname.split('/uploads/')
      if (pathParts.length > 1) {
        const filePath = decodeURIComponent(pathParts[1])
        await supabase.storage
          .from('uploads')
          .remove([filePath])
      }
    } catch (error) {
      console.error('Error deleting file:', error)
    }

    onFilesChange(files.filter(f => f.id !== fileToRemove.id))
  }

  const updateFileNote = (fileId: string, note: string) => {
    onFilesChange(
      files.map(f => f.id === fileId ? { ...f, user_context: note } : f)
    )
  }

  const isImage = (fileType: string) => ACCEPTED_IMAGE_TYPES.includes(fileType)

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Drop zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative p-8 rounded-xl border-2 border-dashed cursor-pointer
          transition-all duration-200 hover:border-opacity-100
          ${isDragging ? 'scale-[1.01]' : ''}
        `}
        style={{
          background: isDragging ? 'rgba(255, 107, 107, 0.05)' : 'var(--bg-elevated)',
          borderColor: isDragging ? 'var(--accent-coral)' : 'var(--border-default)',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="text-center">
          {uploading ? (
            <>
              <Loader2
                className="w-10 h-10 mx-auto mb-3 animate-spin"
                style={{ color: 'var(--accent-coral)' }}
              />
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Uploading...
              </p>
            </>
          ) : (
            <>
              <Upload
                className="w-10 h-10 mx-auto mb-3"
                style={{ color: isDragging ? 'var(--accent-coral)' : 'var(--text-muted)' }}
              />
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Drop files here or click to browse
              </p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                Images (PNG, JPG, GIF) and videos (MP4, WebM) up to 50MB
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handlePasteFromClipboard()
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                }}
              >
                <Clipboard className="w-4 h-4" />
                <span>or click to paste from clipboard</span>
              </button>
              {pasteError && (
                <p className="text-xs mt-2" style={{ color: 'var(--accent-coral)' }}>
                  {pasteError}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Upload progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div
              key={fileName}
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ background: 'var(--bg-elevated)' }}
            >
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--accent-coral)' }} />
              <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                {fileName}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {progress}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded files */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="relative rounded-xl overflow-hidden group"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
            >
              {/* Preview */}
              <div className="relative aspect-video">
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
                    <FileVideo className="w-12 h-12" style={{ color: 'var(--text-muted)' }} />
                  </div>
                )}

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => removeFile(file)}
                  className="absolute top-2 right-2 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ background: 'rgba(0, 0, 0, 0.7)' }}
                >
                  <X className="w-4 h-4 text-white" />
                </button>

                {/* File type indicator */}
                <div
                  className="absolute bottom-2 left-2 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1"
                  style={{ background: 'rgba(0, 0, 0, 0.7)', color: 'white' }}
                >
                  {isImage(file.file_type) ? (
                    <ImageIcon className="w-3 h-3" />
                  ) : (
                    <FileVideo className="w-3 h-3" />
                  )}
                  <span>{file.file_name.split('.').pop()?.toUpperCase()}</span>
                </div>
              </div>

              {/* Context note */}
              <div className="p-3">
                <input
                  type="text"
                  value={file.user_context}
                  onChange={(e) => updateFileNote(file.id, e.target.value)}
                  placeholder="Add context note (optional)"
                  className="w-full px-3 py-2 rounded-lg text-sm transition-all duration-200"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
