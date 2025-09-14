import type { NextResponse } from "next/server"

export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Needed for Next.js
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  )

  // Security headers
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-XSS-Protection", "1; mode=block")

  // HSTS (HTTP Strict Transport Security)
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")

  // Permissions Policy
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")

  return response
}

export function generateSecurityHeaders(): Record<string, string> {
  const isDevelopment = process.env.NODE_ENV === "development"

  return {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "X-DNS-Prefetch-Control": "off",
    "X-Download-Options": "noopen",
    "X-Permitted-Cross-Domain-Policies": "none",
    ...(isDevelopment
      ? {}
      : {
          "Expect-CT": "max-age=86400, enforce",
          "Feature-Policy": "camera 'none'; microphone 'none'; geolocation 'none'",
        }),
  }
}

// CSRF Token Management
export class CSRFProtection {
  private static tokens = new Map<string, { token: string; expires: number }>()

  static generateToken(sessionId: string): string {
    const token = crypto.randomUUID()
    const expires = Date.now() + 60 * 60 * 1000 // 1 hour

    this.tokens.set(sessionId, { token, expires })

    // Cleanup expired tokens
    setTimeout(() => this.cleanup(), 60 * 60 * 1000)

    return token
  }

  static validateToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId)

    if (!stored || stored.expires < Date.now()) {
      this.tokens.delete(sessionId)
      return false
    }

    return stored.token === token
  }

  private static cleanup(): void {
    const now = Date.now()
    for (const [sessionId, data] of this.tokens.entries()) {
      if (data.expires < now) {
        this.tokens.delete(sessionId)
      }
    }
  }
}
