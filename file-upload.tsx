"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { X, Upload, FileImage } from "lucide-react"

interface FileUploadProps {
  maxFiles?: number
  maxSize?: number
  acceptedTypes?: string[]
  onUploadComplete?: (files: any[]) => void
  endpoint?: string
}

export function FileUpload({
  maxFiles = 10,
  maxSize = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ["image/jpeg", "image/png", "image/webp"],
  onUploadComplete,
  endpoint = "/api/upload",
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])

    // Validate file count
    if (selectedFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`)
      return
    }

    // Validate file types and sizes
    const validFiles: File[] = []
    const errors: string[] = []

    for (const file of selectedFiles) {
      if (!acceptedTypes.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type`)
        continue
      }

      if (file.size > maxSize) {
        errors.push(`${file.name}: File too large (max ${maxSize / (1024 * 1024)}MB)`)
        continue
      }

      validFiles.push(file)
    }

    if (errors.length > 0) {
      setError(errors.join(", "))
      return
    }

    setFiles(validFiles)
    setError(null)
    setSuccess(null)
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Please select files to upload")
      return
    }

    setUploading(true)
    setProgress(0)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append("files", file)
      })

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Upload failed")
      }

      setSuccess(`Successfully uploaded ${files.length} file(s)`)
      setFiles([])
      onUploadComplete?.(result.files)

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <FileImage className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Drag and drop files here, or click to select</p>
          <p className="text-xs text-gray-500">
            Max {maxFiles} files, {maxSize / (1024 * 1024)}MB each
          </p>
          <p className="text-xs text-gray-500">Supported: {acceptedTypes.join(", ")}</p>
        </div>
        <Input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(",")}
          onChange={handleFileSelect}
          className="mt-4"
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Selected Files:</h4>
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center space-x-2">
                <FileImage className="h-4 w-4" />
                <span className="text-sm">{file.name}</span>
                <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeFile(index)} disabled={uploading}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-gray-600 text-center">Uploading...</p>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Button onClick={handleUpload} disabled={files.length === 0 || uploading} className="w-full">
        <Upload className="h-4 w-4 mr-2" />
        {uploading ? "Uploading..." : `Upload ${files.length} File(s)`}
      </Button>
    </div>
  )
}
