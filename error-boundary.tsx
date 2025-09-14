"use client"

import type React from "react"
import { Component, type ErrorInfo, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    })

    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo)
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Log error to monitoring service in production
    if (process.env.NODE_ENV === "production") {
      this.logErrorToService(error, errorInfo)
    }
  }

  private logErrorToService = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      // In a real implementation, send to error monitoring service
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      }

      console.error("[ErrorBoundary] Error logged:", errorReport)

      // Example: Send to monitoring service
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // })
    } catch (loggingError) {
      console.error("Failed to log error:", loggingError)
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = "/dashboard"
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      const isDevelopment = process.env.NODE_ENV === "development"

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <CardTitle className="text-destructive">¡Algo salió mal!</CardTitle>
              </div>
              <CardDescription>
                Se produjo un error inesperado en la aplicación. Nuestro equipo ha sido notificado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <Bug className="h-4 w-4" />
                <AlertDescription>
                  <strong>ID del Error:</strong> {this.state.errorId}
                  <br />
                  <strong>Mensaje:</strong> {this.state.error?.message || "Error desconocido"}
                </AlertDescription>
              </Alert>

              {isDevelopment && this.state.error && (
                <details className="bg-muted p-4 rounded-lg">
                  <summary className="cursor-pointer font-medium mb-2">Detalles técnicos (solo en desarrollo)</summary>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Stack Trace:</strong>
                      <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto">
                        {this.state.error.stack}
                      </pre>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={this.handleRetry} className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Intentar de nuevo
                </Button>
                <Button onClick={this.handleReload} variant="outline" className="flex-1 bg-transparent">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Recargar página
                </Button>
                <Button onClick={this.handleGoHome} variant="secondary" className="flex-1">
                  <Home className="mr-2 h-4 w-4" />
                  Ir al inicio
                </Button>
              </div>

              <div className="text-sm text-muted-foreground text-center">
                Si el problema persiste, contacta al soporte técnico con el ID del error.
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook for functional components to handle errors
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error("Error handled by useErrorHandler:", error, errorInfo)

    // In production, log to monitoring service
    if (process.env.NODE_ENV === "production") {
      // Log error to service
      console.error("[useErrorHandler] Production error:", {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      })
    }
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(Component: React.ComponentType<P>, fallback?: ReactNode) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}
