import { createClient } from "@/lib/supabase/server"

export interface SecurityValidation {
  isValid: boolean
  errors: string[]
  sanitized?: any
}

export class DatabaseSecurity {
  private static instance: DatabaseSecurity
  private supabase = createClient()

  static getInstance(): DatabaseSecurity {
    if (!DatabaseSecurity.instance) {
      DatabaseSecurity.instance = new DatabaseSecurity()
    }
    return DatabaseSecurity.instance
  }

  // Input validation and sanitization
  validateEmail(email: string): SecurityValidation {
    const errors: string[] = []
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

    if (!email || typeof email !== "string") {
      errors.push("Email is required and must be a string")
    } else if (!emailRegex.test(email)) {
      errors.push("Invalid email format")
    } else if (email.length > 255) {
      errors.push("Email too long")
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized: email?.toLowerCase().trim(),
    }
  }

  validatePhone(phone: string): SecurityValidation {
    const errors: string[] = []
    const phoneRegex = /^\+?[1-9]\d{1,14}$/

    if (phone && !phoneRegex.test(phone)) {
      errors.push("Invalid phone format")
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized: phone?.replace(/\D/g, ""),
    }
  }

  validatePrice(price: number): SecurityValidation {
    const errors: string[] = []

    if (typeof price !== "number" || isNaN(price)) {
      errors.push("Price must be a valid number")
    } else if (price < 0) {
      errors.push("Price cannot be negative")
    } else if (price > 999999.99) {
      errors.push("Price too high")
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized: Math.round(price * 100) / 100,
    }
  }

  sanitizeString(input: string, maxLength = 255): string {
    if (!input || typeof input !== "string") return ""

    return input
      .trim()
      .slice(0, maxLength)
      .replace(/[<>]/g, "") // Remove potential XSS characters
      .replace(/\0/g, "") // Remove null bytes
  }

  // SQL injection prevention
  escapeIdentifier(identifier: string): string {
    return identifier.replace(/[^a-zA-Z0-9_]/g, "")
  }

  // Rate limiting check
  async checkRateLimit(userId: string, action: string, limit = 10, windowMinutes = 1): Promise<boolean> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000)

    const { count } = await this.supabase
      .from("security_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action", action)
      .gte("created_at", windowStart.toISOString())

    return (count || 0) < limit
  }

  // Log security event
  async logSecurityEvent(
    userId: string,
    action: string,
    tableName: string,
    recordId?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.supabase.from("security_logs").insert({
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      details,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
  }

  // Check for suspicious activity
  async detectSuspiciousActivity(userId: string): Promise<{
    isSuspicious: boolean
    reasons: string[]
  }> {
    const reasons: string[] = []
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // Check for too many failed login attempts
    const { count: failedLogins } = await this.supabase
      .from("security_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action", "LOGIN_FAILED")
      .gte("created_at", last24Hours.toISOString())

    if ((failedLogins || 0) > 5) {
      reasons.push("Multiple failed login attempts")
    }

    // Check for unusual activity patterns
    const { count: totalActions } = await this.supabase
      .from("security_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", last24Hours.toISOString())

    if ((totalActions || 0) > 1000) {
      reasons.push("Unusually high activity")
    }

    return {
      isSuspicious: reasons.length > 0,
      reasons,
    }
  }
}

export const dbSecurity = DatabaseSecurity.getInstance()
