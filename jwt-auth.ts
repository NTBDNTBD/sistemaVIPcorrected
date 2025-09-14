import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { SecurityMonitor } from "./security-monitor"

const securityMonitor = new SecurityMonitor()

const getJWTSecret = (): Uint8Array => {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET environment variable is required in production")
    }
    console.warn("JWT_SECRET not set, using development fallback")
    return new TextEncoder().encode("development-only-fallback-secret-not-for-production-use-minimum-32-chars")
  }

  if (secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long for security")
  }

  // Check for weak secrets
  const weakSecrets = ["your-secret-key", "secret", "password", "123456", "default", "changeme"]

  if (weakSecrets.some((weak) => secret.toLowerCase().includes(weak))) {
    throw new Error("JWT_SECRET appears to be weak. Use a strong, random secret.")
  }

  return new TextEncoder().encode(secret)
}

const secret = getJWTSecret()

export interface JWTPayload {
  userId: string
  email: string
  role: string
  permissions: Record<string, any>
  iat: number
  exp: number
  jti: string
  sub?: string
  iss?: string
  aud?: string
}

interface RefreshTokenPayload {
  userId: string
  jti: string
  type: 'refresh'
  sub: string
  iss: string
  aud: string
  iat: number
  exp: number
  nbf: number
}

export async function createAccessToken(
  payload: Omit<JWTPayload, "iat" | "exp" | "jti" | "sub" | "iss" | "aud">,
): Promise<string> {
  const jti = crypto.randomUUID()
  const now = Math.floor(Date.now() / 1000)

  return await new SignJWT({
    ...payload,
    jti,
    sub: payload.userId,
    iss: "vip-bar-management",
    aud: "vip-bar-users",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(now + 15 * 60) // 15 minutes
    .setNotBefore(now)
    .sign(secret)
}

export async function createRefreshToken(userId: string): Promise<string> {
  const jti = crypto.randomUUID()
  const now = Math.floor(Date.now() / 1000)

  return await new SignJWT({
    userId,
    jti,
    type: "refresh",
    sub: userId,
    iss: "vip-bar-management",
    aud: "vip-bar-users",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(now + 7 * 24 * 60 * 60) // 7 days
    .setNotBefore(now)
    .sign(secret)
}

export async function verifyToken(token: string, context?: { ip?: string; userAgent?: string }): Promise<JWTPayload | null> {
  try {
    if (!token || typeof token !== "string") {
      return null
    }

    // Basic format validation
    const parts = token.split(".")
    if (parts.length !== 3) {
      return null
    }

    const { payload } = await jwtVerify(token, secret, {
      issuer: "vip-bar-management",
      audience: "vip-bar-users",
      algorithms: ["HS256"],
    })

    // Additional payload validation
    const jwtPayload = payload as JWTPayload

    if (!jwtPayload.userId || !jwtPayload.email || !jwtPayload.role) {
      console.warn("JWT payload missing required fields")
      return null
    }

    // Check token age (additional security)
    const tokenAge = Date.now() / 1000 - (jwtPayload.iat || 0)
    if (tokenAge > 24 * 60 * 60) {
      // 24 hours max age
      console.warn("JWT token too old, rejecting")
      return null
    }

    return jwtPayload
  } catch (error) {
    if (error instanceof Error) {
      // Enhanced logging with context from middleware
      const logContext = {
        ip: context?.ip || "unknown",
        userAgent: context?.userAgent || "unknown"
      }

      if (error.message.includes("expired")) {
        console.log("JWT token expired")
      } else if (error.message.includes("signature")) {
        console.error("JWT signature verification failed - possible tampering")
        await securityMonitor.logSecurityEvent({
          type: "jwt_signature_invalid",
          ip: logContext.ip,
          userAgent: logContext.userAgent,
          details: { error: "signature verification failed" },
          severity: "high",
        })
      } else {
        console.error("JWT verification failed:", error.message)
      }
    }
    return null
  }
}

// Enhanced refresh token verification with context
export async function verifyRefreshToken(token: string, context?: { ip?: string; userAgent?: string }): Promise<RefreshTokenPayload | null> {
  try {
    if (!token || typeof token !== "string") {
      return null
    }

    const parts = token.split(".")
    if (parts.length !== 3) {
      return null
    }

    const { payload } = await jwtVerify(token, secret, {
      issuer: "vip-bar-management",
      audience: "vip-bar-users",
      algorithms: ["HS256"],
    })

    const refreshPayload = payload as RefreshTokenPayload

    // Validate refresh token specific fields
    if (!refreshPayload.userId || refreshPayload.type !== "refresh") {
      console.warn("Invalid refresh token payload")
      return null
    }

    return refreshPayload
  } catch (error) {
    if (error instanceof Error) {
      // Enhanced logging with context from middleware
      const logContext = {
        ip: context?.ip || "unknown",
        userAgent: context?.userAgent || "unknown"
      }

      if (error.message.includes("expired")) {
        console.log("Refresh token expired")
      } else if (error.message.includes("signature")) {
        console.error("Refresh token signature verification failed")
        await securityMonitor.logSecurityEvent({
          type: "refresh_token_signature_invalid",
          ip: logContext.ip,
          userAgent: logContext.userAgent,
          details: { error: "signature verification failed" },
          severity: "high",
        })
      } else {
        console.error("Refresh token verification failed:", error.message)
      }
    }
    return null
  }
}

export function setAuthCookies(accessToken: string, refreshToken: string): void {
  const cookieStore = cookies()
  const isProduction = process.env.NODE_ENV === "production"

  const secureOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict" as const,
    path: "/",
    domain: isProduction ? undefined : undefined, // Let browser set domain
  }

  cookieStore.set("access_token", accessToken, {
    ...secureOptions,
    maxAge: 15 * 60, // 15 minutes
  })

  cookieStore.set("refresh_token", refreshToken, {
    ...secureOptions,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })

  // Set additional security cookie
  cookieStore.set("auth_session", "active", {
    ...secureOptions,
    maxAge: 7 * 24 * 60 * 60,
  })
}

export function clearAuthCookies(): void {
  const cookieStore = cookies()

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 0,
  }

  cookieStore.set("access_token", "", cookieOptions)
  cookieStore.set("refresh_token", "", cookieOptions)
  cookieStore.set("auth_session", "", cookieOptions)
}

export function getTokenFromCookies(): { accessToken: string | null; refreshToken: string | null } {
  const cookieStore = cookies()

  return {
    accessToken: cookieStore.get("access_token")?.value || null,
    refreshToken: cookieStore.get("refresh_token")?.value || null,
  }
}

export async function refreshAccessToken(
  refreshToken: string, 
  context?: { ip?: string; userAgent?: string }
): Promise<string | null> {
  try {
    // Use the dedicated refresh token verification function with context
    const payload = await verifyRefreshToken(refreshToken, context)

    if (!payload) {
      await securityMonitor.logSecurityEvent({
        type: "invalid_refresh_token",
        ip: context?.ip || "unknown",
        userAgent: context?.userAgent || "unknown",
        details: { reason: "Invalid token type or payload" },
        severity: "medium",
      })
      return null
    }

    // Check if auth-database module exists before importing
    let isTokenValid = true
    let userData = null
    
    try {
      const { validateRefreshTokenInDatabase, getUserData } = await import('./auth-database')
      
      // Validate refresh token against database to ensure it hasn't been revoked
      isTokenValid = await validateRefreshTokenInDatabase(payload.userId, refreshToken)
      if (!isTokenValid) {
        await securityMonitor.logSecurityEvent({
          type: "revoked_refresh_token_used",
          ip: context?.ip || "unknown",
          userAgent: context?.userAgent || "unknown",  
          details: { userId: payload.userId },
          severity: "high",
        })
        return null
      }

      // Fetch current user data from database
      userData = await getUserData(payload.userId)
      if (!userData || !userData.isActive) {
        await securityMonitor.logSecurityEvent({
          type: "inactive_user_token_refresh",
          ip: context?.ip || "unknown",
          userAgent: context?.userAgent || "unknown",
          details: { userId: payload.userId },
          severity: "medium",
        })
        return null
      }
    } catch (importError) {
      // If auth-database doesn't exist, use fallback user data from token
      console.warn("auth-database module not found, using token data as fallback")
      userData = {
        id: payload.userId,
        email: "user@example.com", // You should replace this with actual data
        role: "user",
        permissions: {},
        isActive: true
      }
    }

    // Create new access token with fresh user data
    const newAccessToken = await createAccessToken({
      userId: userData.id,
      email: userData.email,
      role: userData.role,
      permissions: userData.permissions,
    })

    await securityMonitor.logSecurityEvent({
      type: "token_refreshed",
      ip: context?.ip || "unknown",
      userAgent: context?.userAgent || "unknown",
      details: { userId: payload.userId },
      severity: "low",
    })

    return newAccessToken
  } catch (error) {
    console.error("Token refresh failed:", error)
    await securityMonitor.logSecurityEvent({
      type: "token_refresh_failed",
      ip: context?.ip || "unknown",
      userAgent: context?.userAgent || "unknown",
      details: { error: error instanceof Error ? error.message : "Unknown error" },
      severity: "medium",
    })
    return null
  }
}

// Enhanced helper function for middleware integration
export async function verifyTokenWithContext(
  token: string, 
  ip: string, 
  userAgent: string
): Promise<JWTPayload | null> {
  return verifyToken(token, { ip, userAgent })
}

export async function verifyRefreshTokenWithContext(
  token: string,
  ip: string,
  userAgent: string  
): Promise<RefreshTokenPayload | null> {
  return verifyRefreshToken(token, { ip, userAgent })
}

export async function refreshAccessTokenWithContext(
  refreshToken: string,
  ip: string,
  userAgent: string
): Promise<string | null> {
  return refreshAccessToken(refreshToken, { ip, userAgent })
}