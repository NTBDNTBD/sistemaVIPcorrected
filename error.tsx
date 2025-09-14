"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { errorHandler } from "@/lib/error-handler"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to our error handling system
    errorHandler.handleError(error, {
      component: "GlobalErrorPage",
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent: typeof window !== "undefined" ? navigator.userAgent : undefined,
    })
  }, [error])

  const handleGoHome = () => {
    window.location.href = "/dashboard"
  }

  const handleReload = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <CardTitle className="text-destructive">Error de Aplicación</CardTitle>
          </div>
          <CardDescription>
            Se produjo un error inesperado. Por favor, intenta de nuevo o contacta al soporte técnico.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {error.message || "Error desconocido"}
              {error.digest && (
                <>
                  <br />
                  <strong>ID:</strong> {error.digest}
                </>
              )}
            </AlertDescription>
          </Alert>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={reset} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Intentar de nuevo
            </Button>
            <Button onClick={handleReload} variant="outline" className="flex-1 bg-transparent">
              <RefreshCw className="mr-2 h-4 w-4" />
              Recargar
            </Button>
            <Button onClick={handleGoHome} variant="secondary" className="flex-1">
              <Home className="mr-2 h-4 w-4" />
              Inicio
            </Button>
          </div>

          <div className="text-sm text-muted-foreground text-center">
            Si el problema persiste, contacta al administrador del sistema.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
