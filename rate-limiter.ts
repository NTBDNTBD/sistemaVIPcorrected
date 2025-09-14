import type { NextRequest } from "next/server"

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  skipSuccessfulRequests?: boolean
}

interface RateLimitEntry {
  count: number
  resetTime: number
  blocked: boolean
  consecutiveFailures: number
  lastFailureTime: number
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  private getKey(request: NextRequest): string {
    const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"
    return `${ip}:${userAgent.slice(0, 50)}`
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key)
      }
    }
  }

  public async checkRateLimit(key: string, requests: number, window: number): Promise<boolean> {
    const now = Date.now()
    let entry = this.store.get(key)

    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + window,
        blocked: false,
        consecutiveFailures: 0,
        lastFailureTime: 0,
      }
    }

    entry.count++

    // Progressive penalty: increase block time based on consecutive failures
    const progressivePenalty = Math.min(entry.consecutiveFailures * 60000, 3600000) // Max 1 hour
    const effectiveWindow = window + progressivePenalty

    if (entry.count > requests) {
      entry.blocked = true
      entry.consecutiveFailures++
      entry.lastFailureTime = now
      entry.resetTime = now + effectiveWindow
      this.store.set(key, entry)
      return false
    }

    this.store.set(key, entry)
    return true
  }

  public resetFailures(key: string): void {
    const entry = this.store.get(key)
    if (entry) {
      entry.consecutiveFailures = 0
      entry.lastFailureTime = 0
      this.store.set(key, entry)
    }
  }

  public check(request: NextRequest): { allowed: boolean; remaining: number; resetTime: number } {
    const key = this.getKey(request)
    const now = Date.now()

    let entry = this.store.get(key)

    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
        blocked: false,
        consecutiveFailures: 0,
        lastFailureTime: 0,
      }
    }

    entry.count++

    if (entry.count > this.config.maxRequests) {
      entry.blocked = true
      this.store.set(key, entry)
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      }
    }

    this.store.set(key, entry)
    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    }
  }

  public block(request: NextRequest, duration = 3600000): void {
    const key = this.getKey(request)
    const entry = this.store.get(key) || {
      count: 0,
      resetTime: 0,
      blocked: false,
      consecutiveFailures: 0,
      lastFailureTime: 0,
    }

    this.store.set(key, {
      ...entry,
      count: this.config.maxRequests + 1,
      resetTime: Date.now() + duration,
      blocked: true,
      consecutiveFailures: entry.consecutiveFailures + 1,
      lastFailureTime: Date.now(),
    })
  }

  public getStatus(key: string): RateLimitEntry | null {
    return this.store.get(key) || null
  }
}

export const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 3, // Reduced to 3 login attempts per 15 minutes
})

export const apiLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 API calls per minute
})

export const strictLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // Reduced to 5 requests per minute for sensitive operations
})

export const passwordResetLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 password reset attempts per hour
})
