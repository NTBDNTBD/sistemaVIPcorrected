import { headers } from "next/headers"
import { isRedirectError } from "next/dist/client/components/redirect" // AÑADIDO
import { RateLimiter } from "@/lib/rate-limiter"
import { InputValidator } from "@/lib/input-validator"
import { SecurityMonitor } from "@/lib/security-monitor"

interface ServerActionSecurityOptions {
  rateLimitRequests?: number
  rateLimitWindow?: number
  requireCSRF?: boolean
  validateInput?: boolean
  logActivity?: boolean
}

const rateLimiter = new RateLimiter()
const inputValidator = new InputValidator()
const securityMonitor = new SecurityMonitor()

export function withServerActionSecurity<T extends any[], R>(
  action: (...args: T) => Promise<R>,
  options: ServerActionSecurityOptions = {},
) {
  return async (...args: T): Promise<R> => {
    const {
      rateLimitRequests = 100,
      rateLimitWindow = 300000,
      requireCSRF = true,
      validateInput = true,
      logActivity = true,
    } = options

    try {
      const headersList = headers()
      const userAgent = headersList.get("user-agent") || ""
      const xForwardedFor = headersList.get("x-forwarded-for")
      const xRealIp = headersList.get("x-real-ip")
      const clientIP = xForwardedFor?.split(",")[0] || xRealIp || "unknown"

      const rateLimitKey = `server_action:${clientIP}`
      const isAllowed = await rateLimiter.checkRateLimit(rateLimitKey, rateLimitRequests, rateLimitWindow)

      if (!isAllowed) {
        if (logActivity) {
          await securityMonitor.logSecurityEvent({
            type: "rate_limit_exceeded",
            ip: clientIP,
            userAgent,
            details: { action: action.name, limit: rateLimitRequests },
            severity: "medium",
          })
        }
        throw new Error("Too many requests. Please try again later.")
      }

      if (requireCSRF) {
        const origin = headersList.get("origin")
        const referer = headersList.get("referer")
        const host = headersList.get("host")

        if (!origin && !referer) {
          if (logActivity) {
            await securityMonitor.logSecurityEvent({
              type: "csrf_missing_headers",
              ip: clientIP,
              userAgent,
              details: { action: action.name },
              severity: "high",
            })
          }
          throw new Error("Invalid request origin")
        }

        const allowedOrigins = [`https://${host}`, `http://${host}`, process.env.NEXT_PUBLIC_APP_URL].filter(Boolean)

        const requestOrigin = origin || new URL(referer!).origin
        if (!allowedOrigins.includes(requestOrigin)) {
          if (logActivity) {
            await securityMonitor.logSecurityEvent({
              type: "csrf_invalid_origin",
              ip: clientIP,
              userAgent,
              details: { action: action.name, origin: requestOrigin },
              severity: "high",
            })
          }
          throw new Error("Invalid request origin")
        }
      }

      if (validateInput && args.length > 0) {
        for (const arg of args) {
          if (typeof arg === "string") {
            const validation = inputValidator.validateInput(arg)
            if (!validation.isValid) {
              if (logActivity) {
                await securityMonitor.logSecurityEvent({
                  type: "malicious_input_detected",
                  ip: clientIP,
                  userAgent,
                  details: {
                    action: action.name,
                    threats: validation.threats,
                    input: arg.substring(0, 100),
                  },
                  severity: "high",
                })
              }
              throw new Error("Invalid input detected")
            }
          }
        }
      }

      if (logActivity) {
        await securityMonitor.logSecurityEvent({
          type: "server_action_executed",
          ip: clientIP,
          userAgent,
          details: { action: action.name },
          severity: "low",
        })
      }

      return await action(...args)
    } catch (error) {
      // MODIFICADO: No logar redirects como errores
      if (isRedirectError(error)) {
        // Re-lanzar el redirect sin logging - esto es comportamiento normal
        throw error
      }

      // Solo logar errores reales (no redirects)
      if (logActivity) {
        const headersList = headers()
        const userAgent = headersList.get("user-agent") || ""
        const xForwardedFor = headersList.get("x-forwarded-for")
        const xRealIp = headersList.get("x-real-ip")
        const clientIP = xForwardedFor?.split(",")[0] || xRealIp || "unknown"

        await securityMonitor.logSecurityEvent({
          type: "server_action_error",
          ip: clientIP,
          userAgent,
          details: {
            action: action.name,
            error: error instanceof Error ? error.message : "Unknown error",
          },
          severity: "medium",
        })
      }
      throw error
    }
  }
}