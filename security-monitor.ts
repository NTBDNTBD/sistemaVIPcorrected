import { log } from "@/lib/logger"

interface SecurityEvent {
  type: string
  ip: string
  userAgent: string
  details: Record<string, any>
  severity: "low" | "medium" | "high" | "critical"
  timestamp?: string
}

interface ThreatPattern {
  type: string
  pattern: RegExp | ((event: SecurityEvent) => boolean)
  threshold: number
  timeWindow: number // in milliseconds
}

export class SecurityMonitor {
  private events: SecurityEvent[] = []
  private blockedIPs = new Set<string>()
  private suspiciousIPs = new Map<string, { count: number; lastSeen: number }>()

  private threatPatterns: ThreatPattern[] = [
    {
      type: "brute_force_login",
      pattern: (event) => event.type === "login_failed",
      threshold: 5,
      timeWindow: 300000, // 5 minutes
    },
    {
      type: "sql_injection_attempt",
      pattern: (event) => event.type === "malicious_input_detected" && event.details.threats?.includes("sql_injection"),
      threshold: 3,
      timeWindow: 600000, // 10 minutes
    },
    {
      type: "xss_attempt",
      pattern: (event) => event.type === "malicious_input_detected" && event.details.threats?.includes("xss"),
      threshold: 3,
      timeWindow: 600000, // 10 minutes
    },
    {
      type: "rate_limit_abuse",
      pattern: (event) => event.type === "rate_limit_exceeded",
      threshold: 10,
      timeWindow: 300000, // 5 minutes
    },
  ]

  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    const timestamp = new Date().toISOString()
    const fullEvent = { ...event, timestamp }

    this.events.push(fullEvent)

    // Keep only last 1000 events in memory
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000)
    }

    // Check for threat patterns
    await this.analyzeThreats(fullEvent)

    log.info(
      `Security event: ${event.type}`,
      {
        severity: event.severity,
        ip: event.ip,
        details: event.details,
      },
      "SECURITY",
    )

    // Send alerts for high/critical events
    if (event.severity === "high" || event.severity === "critical") {
      await this.sendSecurityAlert(fullEvent)
    }
  }

  private async analyzeThreats(event: SecurityEvent): Promise<void> {
    const now = Date.now()

    for (const pattern of this.threatPatterns) {
      const matchingEvents = this.events.filter((e) => {
        const eventTime = new Date(e.timestamp!).getTime()
        const isInTimeWindow = now - eventTime <= pattern.timeWindow
        const matchesPattern = typeof pattern.pattern === "function" ? pattern.pattern(e) : pattern.pattern.test(e.type)
        const sameIP = e.ip === event.ip

        return isInTimeWindow && matchesPattern && sameIP
      })

      if (matchingEvents.length >= pattern.threshold) {
        await this.handleThreatDetected(pattern.type, event.ip, matchingEvents)
      }
    }
  }

  private async handleThreatDetected(threatType: string, ip: string, events: SecurityEvent[]): Promise<void> {
    // Block IP temporarily
    this.blockedIPs.add(ip)

    // Remove block after 1 hour
    setTimeout(() => {
      this.blockedIPs.delete(ip)
    }, 3600000)

    // Log critical security event
    await this.logSecurityEvent({
      type: "threat_detected",
      ip,
      userAgent: events[0]?.userAgent || "unknown",
      details: {
        threatType,
        eventCount: events.length,
        timespan: "last hour",
      },
      severity: "critical",
    })
  }

  private async sendSecurityAlert(event: SecurityEvent): Promise<void> {
    try {
      log.warn(
        "Security alert triggered",
        {
          type: event.type,
          severity: event.severity,
          ip: event.ip,
          details: event.details,
        },
        "SECURITY_ALERT",
      )

      // If we have email configuration, send alert
      const alertEmail = process.env.SECURITY_ALERT_EMAIL
      if (alertEmail) {
        log.info("Alert would be sent to email", { email: alertEmail }, "SECURITY_ALERT")
      }

      const alertPhone = process.env.SECURITY_ALERT_PHONE
      if (alertPhone && event.severity === "critical") {
        log.warn("Critical alert would be sent to phone", { phone: alertPhone }, "SECURITY_ALERT")
      }
    } catch (error) {
      log.error("Failed to send security alert", { error }, "SECURITY_ALERT")
    }
  }

  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip)
  }

  getSecurityEvents(limit = 100, severity?: SecurityEvent["severity"]): SecurityEvent[] {
    let filteredEvents = this.events

    if (severity) {
      filteredEvents = this.events.filter((e) => e.severity === severity)
    }

    return filteredEvents
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
      .slice(0, limit)
  }

  getSecurityStats(): {
    totalEvents: number
    eventsBySeverity: Record<string, number>
    topThreats: Array<{ type: string; count: number }>
    blockedIPs: number
  } {
    const eventsBySeverity = this.events.reduce(
      (acc, event) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const threatCounts = this.events.reduce(
      (acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const topThreats = Object.entries(threatCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalEvents: this.events.length,
      eventsBySeverity,
      topThreats,
      blockedIPs: this.blockedIPs.size,
    }
  }

  // Clean up old events periodically
  cleanup(): void {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    this.events = this.events.filter((event) => {
      const eventTime = new Date(event.timestamp!).getTime()
      return eventTime > oneWeekAgo
    })
  }
}
