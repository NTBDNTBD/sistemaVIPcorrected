import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { 
  verifyTokenWithContext, 
  refreshAccessTokenWithContext, 
  verifyRefreshTokenWithContext 
} from "@/lib/jwt-auth"
import { generateCSP } from "@/lib/csp-generator"
import { SecurityMonitor } from "@/lib/security-monitor"

const loginAttempts = new Map<string, { count: number; resetTime: number; consecutiveFailures: number }>()
const securityMonitor = new SecurityMonitor()

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")
  const cfConnectingIP = request.headers.get("cf-connecting-ip")

  if (cfConnectingIP) return cfConnectingIP
  if (forwarded) return forwarded.split(",")[0].trim()
  if (realIP) return realIP
  return request.ip || "unknown"
}

function clearAuthCookies(response: NextResponse): void {
  response.cookies.delete("access_token")
  response.cookies.delete("refresh_token")
}

async function detectSuspiciousActivity(request: NextRequest, clientIP: string, userAgent: string): Promise<void> {
  const path = request.nextUrl.pathname
  const method = request.method

  // Detect potential path traversal attempts
  if (path.includes("../") || path.includes("..\\") || path.includes("%2e%2e")) {
    await securityMonitor.logSecurityEvent({
      type: "path_traversal_attempt",
      ip: clientIP,
      userAgent,
      details: { path, method },
      severity: "high",
    })
  }

  // Detect potential SQL injection in URL parameters
  const url = new URL(request.url)
  const searchParams = url.searchParams.toString()
  const sqlPatterns = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b|'|"|;|--)/i

  if (sqlPatterns.test(searchParams)) {
    await securityMonitor.logSecurityEvent({
      type: "sql_injection_attempt_url",
      ip: clientIP,
      userAgent,
      details: { path, searchParams: searchParams.substring(0, 200) },
      severity: "high",
    })
  }

  // Detect suspicious user agents
  const suspiciousAgents = /bot|crawler|spider|scraper|curl|wget|python|php/i
  if (suspiciousAgents.test(userAgent) && !path.startsWith("/api/")) {
    await securityMonitor.logSecurityEvent({
      type: "suspicious_user_agent",
      ip: clientIP,
      userAgent,
      details: { path },
      severity: "low",
    })
  }
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const clientIP = getClientIP(request)
  const userAgent = request.headers.get("user-agent") || ""

  // Security headers
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()",
  )
  response.headers.set("X-DNS-Prefetch-Control", "off")
  response.headers.set("X-Download-Options", "noopen")
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none")
  response.headers.set("Content-Security-Policy", generateCSP())

  // CORS protection for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin")
    const referer = request.headers.get("referer")

    const allowedOrigins =
      process.env.NODE_ENV === "production"
        ? [
            "https://vip-bar-management.vercel.app",
            "https://laexoficial10-in7ld8hwa-laexbarviplomejor-4398s-projects.vercel.app",
          ]
        : ["http://localhost:3000", "http://127.0.0.1:3000"]

    if (origin && !allowedOrigins.includes(origin)) {
      await securityMonitor.logSecurityEvent({
        type: "cors_violation",
        ip: clientIP,
        userAgent,
        details: { origin, path: request.nextUrl.pathname },
        severity: "high",
      })
      return new NextResponse("CORS Error: Origin not allowed", { status: 403 })
    }

    if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
      if (!origin && !referer) {
        await securityMonitor.logSecurityEvent({
          type: "missing_origin_headers",
          ip: clientIP,
          userAgent,
          details: { path: request.nextUrl.pathname, method: request.method },
          severity: "medium",
        })
        return new NextResponse("Missing origin headers", { status: 400 })
      }
    }
  }

  // Enhanced login rate limiting
  if (request.nextUrl.pathname === "/api/auth/login" && request.method === "POST") {
    const now = Date.now()
    const windowMs = 15 * 60 * 1000 // 15 minutes
    const maxAttempts = 3

    const attempts = loginAttempts.get(clientIP)
    if (attempts) {
      if (now < attempts.resetTime) {
        if (attempts.count >= maxAttempts) {
          const penaltyMultiplier = Math.min(attempts.consecutiveFailures, 10)
          const penaltyTime = windowMs * penaltyMultiplier

          await securityMonitor.logSecurityEvent({
            type: "login_rate_limit_exceeded",
            ip: clientIP,
            userAgent,
            details: {
              attempts: attempts.count,
              consecutiveFailures: attempts.consecutiveFailures,
              penaltyTime: penaltyTime / 1000,
            },
            severity: "high",
          })

          return new NextResponse("Too many login attempts. Try again later.", {
            status: 429,
            headers: {
              "Retry-After": Math.ceil(penaltyTime / 1000).toString(),
            },
          })
        }
        attempts.count++
        attempts.consecutiveFailures++
      } else {
        loginAttempts.set(clientIP, {
          count: 1,
          resetTime: now + windowMs,
          consecutiveFailures: attempts.consecutiveFailures,
        })
      }
    } else {
      loginAttempts.set(clientIP, {
        count: 1,
        resetTime: now + windowMs,
        consecutiveFailures: 0,
      })
    }
  }

  await detectSuspiciousActivity(request, clientIP, userAgent)

  // Enhanced authentication for protected routes
  const protectedPaths = [
    "/dashboard",
    "/pos",
    "/transactions", 
    "/reports",
    "/settings",
    "/members",
    "/products",
    "/qr-codes",
    "/notifications",
    "/admin",
    "/users",
  ]
  const isProtectedPath = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path))

  if (isProtectedPath) {
    const accessToken = request.cookies.get("access_token")?.value
    const refreshToken = request.cookies.get("refresh_token")?.value

    // No tokens at all - redirect to login
    if (!accessToken && !refreshToken) {
      await securityMonitor.logSecurityEvent({
        type: "unauthorized_access_attempt",
        ip: clientIP,
        userAgent,
        details: { path: request.nextUrl.pathname },
        severity: "medium",
      })
      return NextResponse.redirect(new URL("/login", request.url))
    }

    // Try to verify access token first
    if (accessToken) {
      try {
        const payload = await verifyTokenWithContext(accessToken, clientIP, userAgent)
        if (payload) {
          // Token is valid - add user headers and continue
          response.headers.set("X-User-ID", payload.userId || payload.sub || "")
          response.headers.set("X-User-Role", payload.role || "user")
          response.headers.set("X-User-Email", payload.email || "")
          return response
        }
      } catch (error) {
        // Token verification failed - already logged in verifyTokenWithContext
        console.error("Access token verification error:", error)
      }
    }

    // Access token failed/missing - try refresh token
    if (refreshToken) {
      try {
        // First verify the refresh token is valid
        const refreshPayload = await verifyRefreshTokenWithContext(refreshToken, clientIP, userAgent)
        if (refreshPayload) {
          // Generate new access token
          const newAccessToken = await refreshAccessTokenWithContext(refreshToken, clientIP, userAgent)
          if (newAccessToken) {
            // Set new access token cookie
            response.cookies.set("access_token", newAccessToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "strict",
              maxAge: 15 * 60, // 15 minutes
            })

            // Verify the new access token to get user data for headers
            try {
              const newTokenPayload = await verifyTokenWithContext(newAccessToken, clientIP, userAgent)
              if (newTokenPayload) {
                response.headers.set("X-User-ID", newTokenPayload.userId || newTokenPayload.sub || "")
                response.headers.set("X-User-Role", newTokenPayload.role || "user")
                response.headers.set("X-User-Email", newTokenPayload.email || "")

                // Token refresh success is already logged in refreshAccessTokenWithContext
                return response
              }
            } catch (verifyError) {
              console.error("Failed to verify new access token:", verifyError)
            }
          }
        }
      } catch (error) {
        // Refresh token verification failed - already logged in verifyRefreshTokenWithContext
        console.error("Refresh token verification error:", error)
      }
    }

    // All authentication methods failed - clear cookies and redirect
    await securityMonitor.logSecurityEvent({
      type: "invalid_token_access",
      ip: clientIP,
      userAgent,
      details: { path: request.nextUrl.pathname },
      severity: "high",
    })

    const redirectResponse = NextResponse.redirect(new URL("/login", request.url))
    clearAuthCookies(redirectResponse)
    return redirectResponse
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}