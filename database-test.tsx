"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertTriangle, Database, RefreshCw } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { isDemo } from "@/lib/supabase/client"

interface DatabaseTest {
  name: string
  status: "success" | "error" | "warning" | "pending"
  message: string
  details?: string
}

export default function DatabaseTest() {
  const [tests, setTests] = useState<DatabaseTest[]>([])
  const [loading, setLoading] = useState(false)
  const [lastRun, setLastRun] = useState<Date | null>(null)

  const runDatabaseTests = async () => {
    setLoading(true)
    const testResults: DatabaseTest[] = []

    testResults.push({
      name: "Modo de Operación",
      status: isDemo() ? "warning" : "success",
      message: isDemo() ? "Ejecutando en modo demo" : "Conectado a Supabase",
      details: isDemo() ? "Usando datos de demostración" : "Base de datos real conectada",
    })

    try {
      const { data, error } = await supabase.from("system_settings").select("count").limit(1)
      if (error) throw error

      testResults.push({
        name: "Conexión Supabase",
        status: "success",
        message: "Conexión exitosa",
        details: "Cliente Supabase respondiendo correctamente",
      })
    } catch (error) {
      testResults.push({
        name: "Conexión Supabase",
        status: "error",
        message: "Error de conexión",
        details: error instanceof Error ? error.message : "Error desconocido",
      })
    }

    const tablesToTest = [
      "user_roles",
      "system_users",
      "product_categories",
      "products",
      "vip_members",
      "transactions",
      "suppliers",
      "rewards",
    ]

    for (const table of tablesToTest) {
      try {
        const { data, error } = await supabase.from(table).select("count").limit(1)
        if (error) throw error

        testResults.push({
          name: `Tabla: ${table}`,
          status: "success",
          message: "Tabla accesible",
          details: `Tabla ${table} existe y es accesible`,
        })
      } catch (error) {
        testResults.push({
          name: `Tabla: ${table}`,
          status: "error",
          message: "Tabla no accesible",
          details: error instanceof Error ? error.message : "Error desconocido",
        })
      }
    }

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      testResults.push({
        name: "Sistema de Autenticación",
        status: user ? "success" : "warning",
        message: user ? "Usuario autenticado" : "Sin usuario autenticado",
        details: user ? `Usuario: ${user.email}` : "Ejecutando sin autenticación",
      })
    } catch (error) {
      testResults.push({
        name: "Sistema de Autenticación",
        status: "error",
        message: "Error en autenticación",
        details: error instanceof Error ? error.message : "Error desconocido",
      })
    }

    setTests(testResults)
    setLastRun(new Date())
    setLoading(false)
  }

  useEffect(() => {
    runDatabaseTests()
  }, [])

  const getStatusIcon = (status: DatabaseTest["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <RefreshCw className="h-4 w-4 text-gray-500 animate-spin" />
    }
  }

  const getStatusBadge = (status: DatabaseTest["status"]) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800">Exitoso</Badge>
      case "error":
        return <Badge variant="destructive">Error</Badge>
      case "warning":
        return <Badge variant="secondary">Advertencia</Badge>
      default:
        return <Badge variant="outline">Pendiente</Badge>
    }
  }

  const successCount = tests.filter((t) => t.status === "success").length
  const errorCount = tests.filter((t) => t.status === "error").length
  const warningCount = tests.filter((t) => t.status === "warning").length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="mr-2 h-5 w-5" />
            Pruebas de Conexión de Base de Datos
          </CardTitle>
          <CardDescription>Verificación del estado de la base de datos y componentes del sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex space-x-4">
              <div className="text-sm">
                <span className="text-green-600 font-medium">{successCount} exitosos</span>
              </div>
              <div className="text-sm">
                <span className="text-red-600 font-medium">{errorCount} errores</span>
              </div>
              <div className="text-sm">
                <span className="text-yellow-600 font-medium">{warningCount} advertencias</span>
              </div>
            </div>
            <Button onClick={runDatabaseTests} disabled={loading} size="sm">
              {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Ejecutar Pruebas
            </Button>
          </div>

          {lastRun && (
            <p className="text-sm text-muted-foreground mb-4">Última ejecución: {lastRun.toLocaleString()}</p>
          )}

          <div className="space-y-3">
            {tests.map((test, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(test.status)}
                  <div>
                    <div className="font-medium">{test.name}</div>
                    <div className="text-sm text-muted-foreground">{test.message}</div>
                    {test.details && <div className="text-xs text-muted-foreground mt-1">{test.details}</div>}
                  </div>
                </div>
                {getStatusBadge(test.status)}
              </div>
            ))}
          </div>

          {isDemo() && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                El sistema está ejecutándose en modo demo. Algunas funcionalidades pueden usar datos de prueba.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
