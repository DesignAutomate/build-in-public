'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Upload,
  X,
  FileVideo,
  Loader2,
  Image as ImageIcon,
  Keyboard,
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
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Store handleFilesUpload in a ref so paste handler can access latest version
  const handleFilesUploadRef = useRef<(files: File[]) => Promise<void>>()

  // Handle clipboard paste via Ctrl+V / Cmd+V - this is the primary paste method
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      console.log('=== PASTE EVENT ===')
      const items = e.clipboardData?.items
      if (!items) {
        console.log('No clipboard items')
        return
      }

      console.log('Clipboard items count:', items.length)
      const imageFiles: File[] = []

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        console.log(`Item ${i}: kind=${item.kind}, type=${item.type}`)

        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            console.log(`Got file: ${file.name}, size: ${file.size}`)
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
        console.log(`Found ${imageFiles.length} image(s) to upload`)
        e.preventDefault()
        if (handleFilesUploadRef.current) {
          await handleFilesUploadRef.current(imageFiles)
        }
      } else {
        console.log('No images found in clipboard')
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

  // Generate a signed URL for displaying an image (works for private buckets)
  const getSignedUrl = async (storagePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('uploads')
        .createSignedUrl(storagePath, 3600) // 1 hour expiry

      if (error) {
        console.error('Failed to create signed URL:', error)
        return null
      }
      return data.signedUrl
    } catch (error) {
      console.error('Error creating signed URL:', error)
      return null
    }
  }

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
    const storagePath = `${userId}/${timestamp}_${sanitizedName}`

    console.log('=== UPLOADING FILE ===')
    console.log('Storage path:', storagePath)

    try {
      const { error } = await supabase.storage
        .from('uploads')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        console.error('Upload error:', error)
        throw error
      }

      console.log('Upload successful')

      // Get a signed URL for preview (works for private buckets)
      const signedUrl = await getSignedUrl(storagePath)
      console.log('Signed URL:', signedUrl)

      const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type)

      return {
        id: `temp_${timestamp}_${Math.random().toString(36).slice(2)}`,
        file_name: file.name,
        file_url: storagePath,  // Store the path, not the full URL
        file_type: file.type,
        file_size: file.size,
        user_context: '',
        preview_url: isImage && signedUrl ? signedUrl : undefined,
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
    // file_url now stores the storage path directly
    try {
      console.log('Removing file:', fileToRemove.file_url)
      const { error } = await supabase.storage
        .from('uploads')
        .remove([fileToRemove.file_url])

      if (error) {
        console.error('Error deleting file from storage:', error)
      }
    } catch (error) {
      console.error('Error deleting file:', error)
    }

    onFilesChange(files.filter(f => f.id !== fileToRemove.id))
  }

  const updateFileField = (fileId: string, field: keyof UploadedFile, value: string) => {
    onFilesChange(
      files.map(f => f.id === fileId ? { ...f, [field]: value } : f)
    )
  }

  const isImage = (fileType: string) => ACCEPTED_IMAGE_TYPES.includes(fileType)

  return (
    <div className="space-y-4">
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
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Tip: Press Ctrl+V (Cmd+V) to paste from clipboard</span>
              </div>
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
                    onError={(e) => {
                      console.log('Image load error for:', file.file_name)
                      // Hide broken image
                      e.currentTarget.style.display = 'none'
                    }}
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

              {/* Enhanced context prompts */}
              <div className="p-3 space-y-3">
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
                    placeholder="Describe what's shown in this image..."
                    className="w-full px-3 py-2 rounded-lg text-sm transition-all duration-200"
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
                    placeholder="Why is this significant for your progress?"
                    className="w-full px-3 py-2 rounded-lg text-sm transition-all duration-200"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
