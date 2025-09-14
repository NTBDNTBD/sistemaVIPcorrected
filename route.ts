import { type NextRequest, NextResponse } from "next/server"
import { fileUploadValidator } from "@/lib/file-upload-validator"

async function uploadHandler(request: NextRequest) {
  try {
    // Check content type
    const contentType = request.headers.get("content-type")
    if (!contentType?.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Invalid content type. Expected multipart/form-data" }, { status: 400 })
    }

    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    // Convert File objects to UploadedFile format
    const uploadedFiles = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        buffer: Buffer.from(await file.arrayBuffer()),
      })),
    )

    // Validate files
    const validation = fileUploadValidator.validateMultipleFiles(uploadedFiles)

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "File validation failed",
          details: validation.errors,
          invalidFiles: validation.invalidFiles.map(({ file, errors }) => ({
            filename: file.name,
            errors,
          })),
        },
        { status: 400 },
      )
    }

    // Here you would typically upload to your storage service
    // For now, we'll simulate the upload process
    const uploadResults = validation.validFiles.map((file) => ({
      originalName: file.name,
      filename: file.name, // This would be the sanitized name
      size: file.size,
      type: file.type,
      url: `/uploads/${file.name}`, // This would be the actual URL after upload
    }))

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadResults.length} file(s)`,
      files: uploadResults,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Internal server error during file upload" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const sec = SecurityMiddleware.getInstance()
  const secResp = await sec.checkSecurity(request, { rateLimitRequests: 30, rateLimitWindow: 60_000, allowedMethods: ['POST'] })
  if (secResp) return secResp

  const cookie = request.cookies.get('access_token')?.value
  if (!cookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Parse form data
  const form = await request.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'No form data' }, { status: 400 })
  const file = form.get('file') as any
  if (!file || typeof file.stream !== 'function') return NextResponse.json({ error: 'File missing' }, { status: 400 })

  const allowed = ['image/png','image/jpeg','image/jpg','application/pdf']
  const maxBytes = 10 * 1024 * 1024
  const fileSize = Number(file.size || 0)
  if (fileSize > maxBytes) return NextResponse.json({ error: 'File too large' }, { status: 413 })
  if (!allowed.includes(file.type)) return NextResponse.json({ error: 'Invalid file type' }, { status: 415 })

  // Store using supabase server helper
  try {
    const supabase = supabaseServer()
    const key = `uploads/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
    const buf = Buffer.from(await file.arrayBuffer())
    const { data, error } = await supabase.storage.from('public').upload(key, buf, { contentType: file.type })
    if (error) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    const publicUrl = supabase.storage.from('public').getPublicUrl(key).data?.publicUrl
    return NextResponse.json({ ok: true, url: publicUrl })
  } catch (e) {
    console.error('Upload error', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return uploadHandler(request)
}

// Apply rate limiting to upload endpoint
export const runtime = "nodejs"
