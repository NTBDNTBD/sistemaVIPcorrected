import { headers } from "next/headers"

interface LoginAttempt {
  timestamp: number
  ip: string
  email: string
  success: boolean
  userAgent: string
}

interface LoginRateLimitEntry {
  attempts: LoginAttempt[]
  blockedUntil: number
  consecutiveFailures: number
  lastAttempt: number
}

export class LoginRateLimiter {
  private store = new Map<string, LoginRateLimitEntry>()
  private ipStore = new Map<string, LoginRateLimitEntry>()

  // Configuration
  private readonly MAX_ATTEMPTS_PER_EMAIL = 3
  private readonly MAX_ATTEMPTS_PER_IP = 10
  private readonly WINDOW_MS = 15 * 60 * 1000 // 15 minutes
  private readonly BLOCK_DURATION_BASE = 15 * 60 * 1000 // 15 minutes base
  private readonly MAX_BLOCK_DURATION = 24 * 60 * 60 * 1000 // 24 hours max

  constructor() {
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  private cleanup(): void {
    const now = Date.now()

    // Clean email-based entries
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.blockedUntil && entry.attempts.length === 0) {
        this.store.delete(key)
      } else {
        // Remove old attempts
        entry.attempts = entry.attempts.filter((attempt) => now - attempt.timestamp < this.WINDOW_MS)
        if (entry.attempts.length === 0 && now > entry.blockedUntil) {
          this.store.delete(key)
        }
      }
    }

    // Clean IP-based entries
    for (const [key, entry] of this.ipStore.entries()) {
      if (now > entry.blockedUntil && entry.attempts.length === 0) {
        this.ipStore.delete(key)
      } else {
        entry.attempts = entry.attempts.filter((attempt) => now - attempt.timestamp < this.WINDOW_MS)
        if (entry.attempts.length === 0 && now > entry.blockedUntil) {
          this.ipStore.delete(key)
        }
      }
    }
  }

  private getClientInfo(): { ip: string; userAgent: string } {
    const headersList = headers()
    const xForwardedFor = headersList.get("x-forwarded-for")
    const xRealIp = headersList.get("x-real-ip")
    const ip = xForwardedFor?.split(",")[0] || xRealIp || "unknown"
    const userAgent = headersList.get("user-agent") || "unknown"

    return { ip, userAgent }
  }

  public checkLoginAttempt(email: string): {
    allowed: boolean
    reason?: string
    retryAfter?: number
    remainingAttempts?: number
  } {
    const now = Date.now()
    const { ip, userAgent } = this.getClientInfo()

    // Check email-based rate limiting
    const emailEntry = this.store.get(email.toLowerCase()) || {
      attempts: [],
      blockedUntil: 0,
      consecutiveFailures: 0,
      lastAttempt: 0,
    }

    // Check IP-based rate limiting
    const ipEntry = this.ipStore.get(ip) || {
      attempts: [],
      blockedUntil: 0,
      consecutiveFailures: 0,
      lastAttempt: 0,
    }

    // Check if email is currently blocked
    if (now < emailEntry.blockedUntil) {
      return {
        allowed: false,
        reason: "Email temporarily blocked due to too many failed attempts",
        retryAfter: Math.ceil((emailEntry.blockedUntil - now) / 1000),
      }
    }

    // Check if IP is currently blocked
    if (now < ipEntry.blockedUntil) {
      return {
        allowed: false,
        reason: "IP address temporarily blocked due to suspicious activity",
        retryAfter: Math.ceil((ipEntry.blockedUntil - now) / 1000),
      }
    }

    // Clean old attempts
    emailEntry.attempts = emailEntry.attempts.filter((attempt) => now - attempt.timestamp < this.WINDOW_MS)
    ipEntry.attempts = ipEntry.attempts.filter((attempt) => now - attempt.timestamp < this.WINDOW_MS)

    // Count recent failed attempts
    const recentEmailFailures = emailEntry.attempts.filter((a) => !a.success).length
    const recentIpFailures = ipEntry.attempts.filter((a) => !a.success).length

    // Check email rate limit
    if (recentEmailFailures >= this.MAX_ATTEMPTS_PER_EMAIL) {
      return {
        allowed: false,
        reason: "Too many failed login attempts for this email",
        retryAfter: Math.ceil(this.WINDOW_MS / 1000),
      }
    }

    // Check IP rate limit
    if (recentIpFailures >= this.MAX_ATTEMPTS_PER_IP) {
      return {
        allowed: false,
        reason: "Too many failed login attempts from this IP address",
        retryAfter: Math.ceil(this.WINDOW_MS / 1000),
      }
    }

    return {
      allowed: true,
      remainingAttempts: Math.min(
        this.MAX_ATTEMPTS_PER_EMAIL - recentEmailFailures,
        this.MAX_ATTEMPTS_PER_IP - recentIpFailures,
      ),
    }
  }

  public recordLoginAttempt(email: string, success: boolean): void {
    const now = Date.now()
    const { ip, userAgent } = this.getClientInfo()

    const attempt: LoginAttempt = {
      timestamp: now,
      ip,
      email: email.toLowerCase(),
      success,
      userAgent,
    }

    // Update email-based tracking
    const emailEntry = this.store.get(email.toLowerCase()) || {
      attempts: [],
      blockedUntil: 0,
      consecutiveFailures: 0,
      lastAttempt: 0,
    }

    emailEntry.attempts.push(attempt)
    emailEntry.lastAttempt = now

    if (success) {
      // Reset consecutive failures on successful login
      emailEntry.consecutiveFailures = 0
    } else {
      emailEntry.consecutiveFailures++

      // Apply progressive blocking for email
      if (emailEntry.consecutiveFailures >= this.MAX_ATTEMPTS_PER_EMAIL) {
        const blockDuration = Math.min(
          this.BLOCK_DURATION_BASE * Math.pow(2, emailEntry.consecutiveFailures - this.MAX_ATTEMPTS_PER_EMAIL),
          this.MAX_BLOCK_DURATION,
        )
        emailEntry.blockedUntil = now + blockDuration
      }
    }

    this.store.set(email.toLowerCase(), emailEntry)

    // Update IP-based tracking
    const ipEntry = this.ipStore.get(ip) || {
      attempts: [],
      blockedUntil: 0,
      consecutiveFailures: 0,
      lastAttempt: 0,
    }

    ipEntry.attempts.push(attempt)
    ipEntry.lastAttempt = now

    if (!success) {
      ipEntry.consecutiveFailures++

      // Apply progressive blocking for IP
      if (ipEntry.consecutiveFailures >= this.MAX_ATTEMPTS_PER_IP) {
        const blockDuration = Math.min(
          this.BLOCK_DURATION_BASE * Math.pow(2, ipEntry.consecutiveFailures - this.MAX_ATTEMPTS_PER_IP),
          this.MAX_BLOCK_DURATION,
        )
        ipEntry.blockedUntil = now + blockDuration
      }
    } else {
      // Don't reset IP failures on success (IP could be shared)
      // Only reset after the window expires
    }

    this.ipStore.set(ip, ipEntry)
  }

  public getLoginStats(email: string): {
    recentAttempts: number
    consecutiveFailures: number
    blockedUntil: number
    lastAttempt: number
  } {
    const entry = this.store.get(email.toLowerCase())
    if (!entry) {
      return {
        recentAttempts: 0,
        consecutiveFailures: 0,
        blockedUntil: 0,
        lastAttempt: 0,
      }
    }

    const now = Date.now()
    const recentAttempts = entry.attempts.filter((attempt) => now - attempt.timestamp < this.WINDOW_MS).length

    return {
      recentAttempts,
      consecutiveFailures: entry.consecutiveFailures,
      blockedUntil: entry.blockedUntil,
      lastAttempt: entry.lastAttempt,
    }
  }
}

// Export singleton instance
export const loginRateLimiter = new LoginRateLimiter()
