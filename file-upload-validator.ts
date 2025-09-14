import { SECURITY_CONFIG } from "./security-config"

export interface FileValidationResult {
  isValid: boolean
  errors: string[]
  sanitizedName?: string
}

export interface UploadedFile {
  name: string
  size: number
  type: string
  buffer: Buffer
}

export class FileUploadValidator {
  private readonly DANGEROUS_EXTENSIONS = [
    ".exe",
    ".bat",
    ".cmd",
    ".com",
    ".pif",
    ".scr",
    ".vbs",
    ".js",
    ".jar",
    ".php",
    ".asp",
    ".aspx",
    ".jsp",
    ".py",
    ".rb",
    ".pl",
    ".sh",
    ".ps1",
  ]

  private readonly MAGIC_NUMBERS = {
    "image/jpeg": [0xff, 0xd8, 0xff],
    "image/png": [0x89, 0x50, 0x4e, 0x47],
    "image/webp": [0x52, 0x49, 0x46, 0x46],
    "image/gif": [0x47, 0x49, 0x46],
  }

  public validateFile(file: UploadedFile): FileValidationResult {
    const errors: string[] = []

    // Check file size
    if (file.size > SECURITY_CONFIG.UPLOAD_LIMITS.MAX_FILE_SIZE) {
      errors.push(`File size exceeds maximum limit of ${SECURITY_CONFIG.UPLOAD_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB`)
    }

    if (file.size === 0) {
      errors.push("File is empty")
    }

    // Check file type
    if (!SECURITY_CONFIG.UPLOAD_LIMITS.ALLOWED_TYPES.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`)
    }

    // Check file extension
    const extension = this.getFileExtension(file.name).toLowerCase()
    if (this.DANGEROUS_EXTENSIONS.includes(extension)) {
      errors.push(`File extension ${extension} is not allowed`)
    }

    // Validate magic numbers (file signature)
    if (!this.validateMagicNumbers(file.buffer, file.type)) {
      errors.push("File content does not match declared file type")
    }

    // Sanitize filename
    const sanitizedName = this.sanitizeFilename(file.name)
    if (!sanitizedName) {
      errors.push("Invalid filename")
    }

    // Check for embedded scripts in images
    if (this.containsSuspiciousContent(file.buffer)) {
      errors.push("File contains suspicious content")
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedName,
    }
  }

  public validateMultipleFiles(files: UploadedFile[]): {
    isValid: boolean
    errors: string[]
    validFiles: UploadedFile[]
    invalidFiles: { file: UploadedFile; errors: string[] }[]
  } {
    const errors: string[] = []
    const validFiles: UploadedFile[] = []
    const invalidFiles: { file: UploadedFile; errors: string[] }[] = []

    // Check total number of files
    if (files.length > SECURITY_CONFIG.UPLOAD_LIMITS.MAX_FILES) {
      errors.push(`Too many files. Maximum ${SECURITY_CONFIG.UPLOAD_LIMITS.MAX_FILES} files allowed`)
    }

    // Check total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    const maxTotalSize = SECURITY_CONFIG.UPLOAD_LIMITS.MAX_FILE_SIZE * SECURITY_CONFIG.UPLOAD_LIMITS.MAX_FILES
    if (totalSize > maxTotalSize) {
      errors.push(`Total file size exceeds maximum limit`)
    }

    // Validate each file
    for (const file of files) {
      const validation = this.validateFile(file)
      if (validation.isValid) {
        validFiles.push({ ...file, name: validation.sanitizedName! })
      } else {
        invalidFiles.push({ file, errors: validation.errors })
      }
    }

    return {
      isValid: errors.length === 0 && invalidFiles.length === 0,
      errors,
      validFiles,
      invalidFiles,
    }
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf(".")
    return lastDot === -1 ? "" : filename.substring(lastDot)
  }

  private validateMagicNumbers(buffer: Buffer, mimeType: string): boolean {
    const expectedMagicNumbers = this.MAGIC_NUMBERS[mimeType as keyof typeof this.MAGIC_NUMBERS]
    if (!expectedMagicNumbers) return true // Skip validation for unknown types

    if (buffer.length < expectedMagicNumbers.length) return false

    for (let i = 0; i < expectedMagicNumbers.length; i++) {
      if (buffer[i] !== expectedMagicNumbers[i]) return false
    }

    return true
  }

  private sanitizeFilename(filename: string): string | null {
    // Remove path traversal attempts
    let sanitized = filename.replace(/[/\\:*?"<>|]/g, "")

    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x1f\x80-\x9f]/g, "")

    // Limit length
    if (sanitized.length > 255) {
      const extension = this.getFileExtension(sanitized)
      const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf("."))
      sanitized = nameWithoutExt.substring(0, 255 - extension.length) + extension
    }

    // Ensure filename is not empty after sanitization
    if (!sanitized || sanitized.trim().length === 0) {
      return null
    }

    // Add timestamp to prevent conflicts
    const timestamp = Date.now()
    const extension = this.getFileExtension(sanitized)
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf("."))

    return `${nameWithoutExt}_${timestamp}${extension}`
  }

  private containsSuspiciousContent(buffer: Buffer): boolean {
    const content = buffer.toString("utf8", 0, Math.min(buffer.length, 1024))

    // Check for script tags and suspicious patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /onclick=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /eval\(/i,
      /document\./i,
      /window\./i,
    ]

    return suspiciousPatterns.some((pattern) => pattern.test(content))
  }
}

export const fileUploadValidator = new FileUploadValidator()
