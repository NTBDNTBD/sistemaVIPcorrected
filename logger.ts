export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: string
  context?: string
}

export class Logger {
  private static instance: Logger
  private logLevel: LogLevel
  private logs: LogEntry[] = []
  private maxLogs = 1000

  private constructor() {
    this.logLevel = process.env.NODE_ENV === "production" ? LogLevel.WARN : LogLevel.DEBUG
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel
  }

  private createLogEntry(level: LogLevel, message: string, data?: any, context?: string): LogEntry {
    return {
      level,
      message,
      data,
      context,
      timestamp: new Date().toISOString(),
    }
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // In development, also log to console
    if (process.env.NODE_ENV === "development") {
      const levelName = LogLevel[entry.level]
      const contextStr = entry.context ? `[${entry.context}]` : ""
      console.log(`[${levelName}]${contextStr} ${entry.message}`, entry.data || "")
    }
  }

  debug(message: string, data?: any, context?: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.addLog(this.createLogEntry(LogLevel.DEBUG, message, data, context))
    }
  }

  info(message: string, data?: any, context?: string): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.addLog(this.createLogEntry(LogLevel.INFO, message, data, context))
    }
  }

  warn(message: string, data?: any, context?: string): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.addLog(this.createLogEntry(LogLevel.WARN, message, data, context))
    }
  }

  error(message: string, data?: any, context?: string): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.addLog(this.createLogEntry(LogLevel.ERROR, message, data, context))

      // Always log errors to console even in production
      console.error(`[ERROR]${context ? `[${context}]` : ""} ${message}`, data || "")
    }
  }

  // Get recent logs for debugging
  getLogs(limit = 100): LogEntry[] {
    return this.logs.slice(-limit)
  }

  // Clear logs
  clearLogs(): void {
    this.logs = []
  }
}

// Export singleton instance
export const logger = Logger.getInstance()

// Convenience functions
export const log = {
  debug: (message: string, data?: any, context?: string) => logger.debug(message, data, context),
  info: (message: string, data?: any, context?: string) => logger.info(message, data, context),
  warn: (message: string, data?: any, context?: string) => logger.warn(message, data, context),
  error: (message: string, data?: any, context?: string) => logger.error(message, data, context),
}
