import type React from "react"
import { SecurityMonitor } from "@/lib/security-monitor"

const securityMonitor = new SecurityMonitor()

export interface ErrorContext {
  userId?: string
  userAgent?: string
  url?: string
  timestamp?: string
  component?: string
  action?: string
  additionalData?: Record<string, any>
}

export interface AppError extends Error {
  code?: string
  statusCode?: number
  context?: ErrorContext
  isOperational?: boolean
}

export class AppErrorHandler {
  private static instance: AppErrorHandler

  static getInstance(): AppErrorHandler {
    if (!AppErrorHandler.instance) {
      AppErrorHandler.instance = new AppErrorHandler()
    }
    return AppErrorHandler.instance
  }

  // Create a standardized error
  createError(
    message: string,
    code?: string,
    statusCode?: number,
    context?: ErrorContext,
    isOperational = true,
  ): AppError {
    const error = new Error(message) as AppError
    error.code = code
    error.statusCode = statusCode
    error.context = {
      timestamp: new Date().toISOString(),
      ...context,
    }
    error.isOperational = isOperational

    return error
  }

  // Handle different types of errors
  async handleError(error: AppError | Error, context?: ErrorContext): Promise<void> {
    const appError = this.normalizeError(error, context)

    // Log error based on severity
    await this.logError(appError)

    // Send to monitoring service if critical
    if (this.isCriticalError(appError)) {
      await this.notifyMonitoring(appError)
    }

    // In development, also log to console
    if (process.env.NODE_ENV === "development") {
      console.error("AppErrorHandler:", appError)
    }
  }

  private normalizeError(error: AppError | Error, context?: ErrorContext): AppError {
    if (this.isAppError(error)) {
      return {
        ...error,
        context: { ...error.context, ...context },
      }
    }

    // Convert regular Error to AppError
    const appError = new Error(error.message) as AppError
    appError.stack = error.stack
    appError.code = "UNKNOWN_ERROR"
    appError.statusCode = 500
    appError.context = {
      timestamp: new Date().toISOString(),
      ...context,
    }
    appError.isOperational = false

    return appError
  }

  private isAppError(error: any): error is AppError {
    return error && typeof error === "object" && "isOperational" in error
  }

  private async logError(error: AppError): Promise<void> {
    const severity = this.getErrorSeverity(error)

    await securityMonitor.logSecurityEvent({
      type: "application_error",
      ip: error.context?.userAgent || "unknown",
      userAgent: error.context?.userAgent || "unknown",
      details: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        stack: error.stack,
        context: error.context,
        isOperational: error.isOperational,
      },
      severity,
    })
  }

  private getErrorSeverity(error: AppError): "low" | "medium" | "high" | "critical" {
    if (!error.isOperational) return "critical"
    if (error.statusCode && error.statusCode >= 500) return "high"
    if (error.statusCode && error.statusCode >= 400) return "medium"
    return "low"
  }

  private isCriticalError(error: AppError): boolean {
    return (
      !error.isOperational ||
      (error.statusCode !== undefined && error.statusCode >= 500) ||
      error.code === "DATABASE_CONNECTION_FAILED" ||
      error.code === "SECURITY_BREACH"
    )
  }

  private async notifyMonitoring(error: AppError): Promise<void> {
    try {
      // In production, send to monitoring service
      console.error("[CRITICAL ERROR]", {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        context: error.context,
        timestamp: new Date().toISOString(),
      })

      // Example: Send to external monitoring service
      // await fetch('/api/monitoring/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     error: {
      //       message: error.message,
      //       code: error.code,
      //       statusCode: error.statusCode,
      //       stack: error.stack,
      //       context: error.context
      //     }
      //   })
      // })
    } catch (notificationError) {
      console.error("Failed to notify monitoring service:", notificationError)
    }
  }

  // Specific error creators
  createValidationError(message: string, field?: string, context?: ErrorContext): AppError {
    return this.createError(message, "VALIDATION_ERROR", 400, {
      ...context,
      field,
    })
  }

  createAuthenticationError(message: string, context?: ErrorContext): AppError {
    return this.createError(message, "AUTHENTICATION_ERROR", 401, context)
  }

  createAuthorizationError(message: string, context?: ErrorContext): AppError {
    return this.createError(message, "AUTHORIZATION_ERROR", 403, context)
  }

  createNotFoundError(resource: string, context?: ErrorContext): AppError {
    return this.createError(`${resource} not found`, "NOT_FOUND_ERROR", 404, {
      ...context,
      resource,
    })
  }

  createDatabaseError(message: string, context?: ErrorContext): AppError {
    return this.createError(message, "DATABASE_ERROR", 500, context, false)
  }

  createNetworkError(message: string, context?: ErrorContext): AppError {
    return this.createError(message, "NETWORK_ERROR", 503, context)
  }
}

// Global error handler instance
export const errorHandler = AppErrorHandler.getInstance()

// Utility functions for common error scenarios
export function handleAsyncError<T>(promise: Promise<T>, context?: ErrorContext): Promise<[AppError | null, T | null]> {
  return promise
    .then<[null, T]>((data: T) => [null, data])
    .catch<[AppError, null]>((error: Error) => {
      const appError = errorHandler.createError(error.message, "ASYNC_ERROR", 500, context, false)
      errorHandler.handleError(appError)
      return [appError, null]
    })
}

export function wrapAsyncFunction<T extends any[], R>(fn: (...args: T) => Promise<R>, context?: ErrorContext) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      const appError = errorHandler.createError(
        error instanceof Error ? error.message : "Unknown error",
        "WRAPPED_FUNCTION_ERROR",
        500,
        context,
        false,
      )
      await errorHandler.handleError(appError)
      throw appError
    }
  }
}

// React error boundary integration
export function createErrorBoundaryHandler(component: string) {
  return (error: Error, errorInfo: React.ErrorInfo) => {
    const appError = errorHandler.createError(
      error.message,
      "REACT_ERROR_BOUNDARY",
      500,
      {
        component,
        componentStack: errorInfo.componentStack,
        url: typeof window !== "undefined" ? window.location.href : undefined,
        userAgent: typeof window !== "undefined" ? navigator.userAgent : undefined,
      },
      false,
    )

    errorHandler.handleError(appError)
  }
}
