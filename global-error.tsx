"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log critical global error
    console.error("Global error occurred:", error)

    // In production, send to monitoring service
    if (process.env.NODE_ENV === "production") {
      // Send to error monitoring service
      console.error("[CRITICAL] Global application error:", {
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        timestamp: new Date().toISOString(),
        url: typeof window !== "undefined" ? window.location.href : undefined,
      })
    }
  }, [error])

  const handleReload = () => {
    window.location.reload()
  }

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center p-4 bg-red-50">
          <Card className="w-full max-w-lg border-red-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <CardTitle className="text-red-600">Error Crítico del Sistema</CardTitle>
              </div>
              <CardDescription>
                Se produjo un error crítico en la aplicación. El sistema necesita ser reiniciado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Error crítico:</strong> {error.message || "Error del sistema"}
                  {error.digest && (
                    <>
                      <br />
                      <strong>ID del error:</strong> {error.digest}
                    </>
                  )}
                </AlertDescription>
              </Alert>

              <div className="flex flex-col gap-2">
                <Button onClick={reset} className="bg-red-600 hover:bg-red-700">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reiniciar aplicación
                </Button>
                <Button onClick={handleReload} variant="outline" className="border-red-300 text-red-700 bg-transparent">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Recargar página completa
                </Button>
              </div>

              <div className="text-sm text-red-600 text-center">
                Si el problema persiste, contacta inmediatamente al soporte técnico.
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  )
}
