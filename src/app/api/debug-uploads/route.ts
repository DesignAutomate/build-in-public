import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Query uploads table
    const { data: uploads, error: uploadsError } = await supabase
      .from('uploads')
      .select('id, file_url, file_name, file_type, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (uploadsError) {
      return NextResponse.json({ error: uploadsError.message }, { status: 500 })
    }

    // Also list files in storage bucket to compare
    const { data: storageFiles, error: storageError } = await supabase.storage
      .from('uploads')
      .list(user.id, { limit: 10 })

    // Check bucket public status by trying to get a public URL
    let bucketInfo = null
    if (uploads && uploads.length > 0) {
      const testPath = uploads[0].file_url

      // Try to extract path from URL if it's a full URL
      let storagePath = testPath
      if (testPath.startsWith('http')) {
        const match = testPath.match(/\/uploads\/(.+)$/)
        if (match) {
          storagePath = match[1]
        }
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(storagePath)

      // Try to create a signed URL (works for private buckets)
      const { data: signedUrlData, error: signedError } = await supabase.storage
        .from('uploads')
        .createSignedUrl(storagePath, 3600)

      bucketInfo = {
        testPath: storagePath,
        publicUrl: publicUrlData?.publicUrl,
        signedUrl: signedUrlData?.signedUrl,
        signedError: signedError?.message,
      }
    }

    return NextResponse.json({
      userId: user.id,
      uploadsCount: uploads?.length || 0,
      uploads: uploads?.map(u => ({
        id: u.id,
        file_url: u.file_url,
        file_name: u.file_name,
        file_type: u.file_type,
      })),
      storageFilesCount: storageFiles?.length || 0,
      storageFiles: storageFiles?.map(f => f.name),
      storageError: storageError?.message,
      bucketInfo,
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
