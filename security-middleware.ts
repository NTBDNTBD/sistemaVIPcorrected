import { type NextRequest, NextResponse } from "next/server"
import { randomBytes, timingSafeEqual } from "crypto"

interface SecurityConfig {
  requireAuth?: boolean
  requireRole?: string[]
  rateLimitRequests?: number
  rateLimitWindow?: number
  requireCSRF?: boolean
  allowedMethods?: string[]
}

interface RateLimitEntry {
  count: number
  resetTime: number
  blocked: boolean
}

// In-memory rate limiting store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>()
const csrfTokenStore = new Map<string, { token: string; expires: number }>()

export class SecurityMiddleware {
  private static instance: SecurityMiddleware
  private suspiciousIPs = new Set<string>()
  private blockedIPs = new Set<string>()

  static getInstance(): SecurityMiddleware {
    if (!SecurityMiddleware.instance) {
      SecurityMiddleware.instance = new SecurityMiddleware()
    }
    return SecurityMiddleware.instance
  }

  // Generate CSRF token
  generateCSRFToken(sessionId: string): string {
    const token = randomBytes(32).toString("hex")
    const expires = Date.now() + 60 * 60 * 1000 // 1 hour
    csrfTokenStore.set(sessionId, { token, expires })
    return token
  }

  // Validate CSRF token
  validateCSRFToken(sessionId: string, providedToken: string): boolean {
    const stored = csrfTokenStore.get(sessionId)
    if (!stored || stored.expires < Date.now()) {
      csrfTokenStore.delete(sessionId)
      return false
    }

    const storedBuffer = Buffer.from(stored.token, "hex")
    const providedBuffer = Buffer.from(providedToken, "hex")

    if (storedBuffer.length !== providedBuffer.length) {
      return false
    }

    return timingSafeEqual(storedBuffer, providedBuffer)
  }

  // Rate limiting
  checkRateLimit(identifier: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now()
    const entry = rateLimitStore.get(identifier)

    if (!entry || now > entry.resetTime) {
      rateLimitStore.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
        blocked: false,
      })
      return true
    }

    if (entry.blocked) {
      return false
    }

    entry.count++

    if (entry.count > maxRequests) {
      entry.blocked = true
      this.suspiciousIPs.add(identifier)

      // Block IP after multiple violations
      if (entry.count > maxRequests * 3) {
        this.blockedIPs.add(identifier)
      }

      return false
    }

    return true
  }

  // Input validation and sanitization
  validateInput(input: any, type: "email" | "phone" | "text" | "number" | "uuid"): boolean {
    if (!input || typeof input !== "string") return false

    const patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^\+?[\d\s\-$$$$]{10,}$/,
      text: /^[a-zA-Z0-9\s\-_.,!?áéíóúñÁÉÍÓÚÑ]{1,500}$/,
      number: /^\d+(\.\d+)?$/,
      uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    }

    return patterns[type].test(input.trim())
  }

  // SQL injection detection
  detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(--|\/\*|\*\/|;|'|"|`)/,
      /(\bOR\b|\bAND\b).*[=<>]/i,
      /(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)/i,
    ]

    return sqlPatterns.some((pattern) => pattern.test(input))
  }

  // XSS detection
  detectXSS(input: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    ]

    return xssPatterns.some((pattern) => pattern.test(input))
  }

  // Main security check
  async checkSecurity(request: NextRequest, config: SecurityConfig): Promise<NextResponse | null> {
    const ip = this.getClientIP(request)
    const userAgent = request.headers.get("user-agent") || ""
    const method = request.method

    // Check blocked IPs
    if (this.blockedIPs.has(ip)) {
      await this.logSecurityEvent("BLOCKED_IP_ACCESS", { ip, userAgent, path: request.nextUrl.pathname })
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Method validation
    if (config.allowedMethods && !config.allowedMethods.includes(method)) {
      await this.logSecurityEvent("INVALID_METHOD", { ip, method, path: request.nextUrl.pathname })
      return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
    }

    // Rate limiting
    if (config.rateLimitRequests && config.rateLimitWindow) {
      if (!this.checkRateLimit(ip, config.rateLimitRequests, config.rateLimitWindow)) {
        await this.logSecurityEvent("RATE_LIMIT_EXCEEDED", { ip, path: request.nextUrl.pathname })
        return NextResponse.json({ error: "Too many requests" }, { status: 429 })
      }
    }

    // CSRF protection for state-changing operations
    if (config.requireCSRF && ["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
      const csrfToken = request.headers.get("x-csrf-token")
      const sessionId = request.headers.get("x-session-id") || ip

      if (!csrfToken || !this.validateCSRFToken(sessionId, csrfToken)) {
        await this.logSecurityEvent("CSRF_TOKEN_INVALID", { ip, path: request.nextUrl.pathname })
        return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
      }
    }

    // Input validation for POST requests
    if (method === "POST") {
      try {
        const body = await request.clone().json()
        if (await this.validateRequestBody(body, ip, request.nextUrl.pathname)) {
          return NextResponse.json({ error: "Invalid input detected" }, { status: 400 })
        }
      } catch (error) {
        // Invalid JSON is also suspicious
        await this.logSecurityEvent("INVALID_JSON", { ip, path: request.nextUrl.pathname })
        return NextResponse.json({ error: "Invalid request format" }, { status: 400 })
      }
    }

    // Authentication check
    if (config.requireAuth) {
      const authResult = await this.checkAuthentication(request)
      if (!authResult.valid) {
        await this.logSecurityEvent("AUTH_FAILED", { ip, path: request.nextUrl.pathname, reason: authResult.reason })
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }

      // Role-based access control
      if (config.requireRole && !config.requireRole.includes(authResult.role)) {
        await this.logSecurityEvent("INSUFFICIENT_PERMISSIONS", {
          ip,
          path: request.nextUrl.pathname,
          userRole: authResult.role,
          requiredRoles: config.requireRole,
        })
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
      }
    }

    return null // Security checks passed
  }

  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get("x-forwarded-for")
    const realIP = request.headers.get("x-real-ip")

    if (forwarded) {
      return forwarded.split(",")[0].trim()
    }
    if (realIP) {
      return realIP
    }

    return request.ip || "unknown"
  }

  private async validateRequestBody(body: any, ip: string, path: string): Promise<boolean> {
    if (!body || typeof body !== "object") return false

    // Check all string values for injection attempts
    const checkValue = (value: any): boolean => {
      if (typeof value === "string") {
        if (this.detectSQLInjection(value) || this.detectXSS(value)) {
          this.logSecurityEvent("INJECTION_ATTEMPT", { ip, path, suspiciousValue: value.substring(0, 100) })
          return true
        }
      } else if (typeof value === "object" && value !== null) {
        return Object.values(value).some(checkValue)
      }
      return false
    }

    return Object.values(body).some(checkValue)
  }

  private async checkAuthentication(request: NextRequest): Promise<{ valid: boolean; role?: string; reason?: string }> {
    try {
      // Check for session cookie or authorization header
      const authHeader = request.headers.get("authorization")
      const sessionCookie = request.cookies.get("sb-access-token")

      if (!authHeader && !sessionCookie) {
        return { valid: false, reason: "No authentication provided" }
      }

      // In a real implementation, validate the token with Supabase
      // For now, we'll do basic validation
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7)
        // Validate JWT token format
        if (!/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(token)) {
          return { valid: false, reason: "Invalid token format" }
        }
      }

      // Return valid with default role (in production, extract from token)
      return { valid: true, role: "administrador" }
    } catch (error) {
      return { valid: false, reason: "Token validation error" }
    }
  }

  private async logSecurityEvent(event: string, details: any): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      severity: this.getEventSeverity(event),
    }

    console.log(`[SECURITY] ${event}:`, logEntry)

    // In production, send to security monitoring system
    if (process.env.SECURITY_ALERT_EMAIL && logEntry.severity === "HIGH") {
      // Send alert email (implement with your email service)
      console.log(`[ALERT] High severity security event: ${event}`)
    }
  }

  private getEventSeverity(event: string): "LOW" | "MEDIUM" | "HIGH" {
    const highSeverityEvents = ["INJECTION_ATTEMPT", "BLOCKED_IP_ACCESS", "MULTIPLE_AUTH_FAILURES"]
    const mediumSeverityEvents = ["RATE_LIMIT_EXCEEDED", "CSRF_TOKEN_INVALID", "INSUFFICIENT_PERMISSIONS"]

    if (highSeverityEvents.includes(event)) return "HIGH"
    if (mediumSeverityEvents.includes(event)) return "MEDIUM"
    return "LOW"
  }
}

// Helper function to apply security to API routes
export async function withSecurity(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
  config: SecurityConfig,
): Promise<NextResponse> {
  const security = SecurityMiddleware.getInstance()

  const securityResult = await security.checkSecurity(request, config)
  if (securityResult) {
    return securityResult
  }

  try {
    return await handler(request)
  } catch (error) {
    console.error("Handler error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
