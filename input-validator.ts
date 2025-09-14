import { z } from "zod"

// Common validation schemas
export const emailSchema = z.string().email().max(255)
export const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
  )

export const phoneSchema = z.string().regex(/^\+?[\d\s\-()]{10,20}$/, "Invalid phone number format")
export const nameSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-ZÀ-ÿ\s\-'.]+$/, "Invalid name format")
export const amountSchema = z.number().positive().max(999999.99)
export const idSchema = z.string().uuid()

// Product validation
export const productSchema = z.object({
  name: nameSchema,
  price: amountSchema,
  category: z.enum(["bebidas", "comida", "snacks", "otros"]),
  stock: z.number().int().min(0).max(99999),
  description: z.string().max(500).optional(),
  barcode: z.string().max(50).optional(),
})

// Transaction validation
export const transactionSchema = z.object({
  amount: amountSchema,
  type: z.enum(["sale", "refund", "adjustment"]),
  payment_method: z.enum(["cash", "card", "transfer", "points"]),
  items: z
    .array(
      z.object({
        product_id: idSchema,
        quantity: z.number().int().positive().max(999),
        unit_price: amountSchema,
      }),
    )
    .min(1)
    .max(50),
})

// User validation
export const userSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  role: z.enum(["admin", "manager", "cashier"]),
  phone: phoneSchema.optional(),
})

// VIP Member validation
export const vipMemberSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  tier: z.enum(["bronze", "silver", "gold", "platinum"]),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
})

export class InputValidator {
  validateInput(input: string): { isValid: boolean; threats: string[] } {
    const threats: string[] = []

    // Check for SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /('|(\\')|(;)|(--)|(\|)|(\*)|(%)|(\+))/,
      /(\b(OR|AND)\b.*=.*)/i,
    ]

    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        threats.push("sql_injection")
        break
      }
    }

    // Check for XSS patterns
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe|<object|<embed|<link|<meta/i,
    ]

    for (const pattern of xssPatterns) {
      if (pattern.test(input)) {
        threats.push("xss")
        break
      }
    }

    // Check for path traversal
    if (/\.\.\/|\.\.\\/.test(input)) {
      threats.push("path_traversal")
    }

    // Check for command injection
    if (/[;&|`$(){}[\]\\]/.test(input)) {
      threats.push("command_injection")
    }

    return {
      isValid: threats.length === 0,
      threats,
    }
  }
}

// Input sanitization
export class InputSanitizer {
  static sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, "") // Remove potential HTML tags
      .replace(/['"]/g, "") // Remove quotes to prevent SQL injection
      .slice(0, 1000) // Limit length
  }

  static sanitizeNumber(input: any): number | null {
    const num = Number.parseFloat(input)
    return isNaN(num) ? null : num
  }

  static sanitizeEmail(input: string): string {
    return input.toLowerCase().trim().slice(0, 255)
  }

  static validateAndSanitize<T>(schema: z.ZodSchema<T>, data: any): { success: boolean; data?: T; errors?: string[] } {
    try {
      const result = schema.parse(data)
      return { success: true, data: result }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        }
      }
      return { success: false, errors: ["Validation failed"] }
    }
  }
}

// XSS Protection
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

// SQL Injection Protection (for raw queries)
export function escapeSql(input: string): string {
  return input.replace(/'/g, "''").replace(/;/g, "")
}
