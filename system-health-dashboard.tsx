"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Activity,
  Database,
  Shield,
  Users,
  ShoppingCart,
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { isDemo } from "@/lib/supabase/client"

interface HealthCheck {
  component: string
  status: "healthy" | "warning" | "critical" | "unknown"
  message: string
  lastChecked: Date
  responseTime?: number
}

export default function SystemHealthDashboard() {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([])
  const [loading, setLoading] = useState(false)
  const [overallHealth, setOverallHealth] = useState<"healthy" | "warning" | "critical">("unknown")

  const runHealthChecks = async () => {
    setLoading(true)
    const checks: HealthCheck[] = []
    const startTime = Date.now()

    // Database Health
    try {
      const dbStart = Date.now()
      const { error } = await supabase.from("system_users").select("count").limit(1)
      const dbTime = Date.now() - dbStart

      checks.push({
        component: "Base de Datos",
        status: error ? "critical" : dbTime > 2000 ? "warning" : "healthy",
        message: error ? `Error: ${error.message}` : `Respondiendo en ${dbTime}ms`,
        lastChecked: new Date(),
        responseTime: dbTime,
      })
    } catch (error) {
      checks.push({
        component: "Base de Datos",
        status: "critical",
        message: "Conexión fallida",
        lastChecked: new Date(),
      })
    }

    // Authentication Health
    try {
      const authStart = Date.now()
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()
      const authTime = Date.now() - authStart

      checks.push({
        component: "Autenticación",
        status: error ? "warning" : "healthy",
        message: user ? `Usuario: ${user.email}` : "Sin usuario autenticado",
        lastChecked: new Date(),
        responseTime: authTime,
      })
    } catch (error) {
      checks.push({
        component: "Autenticación",
        status: "critical",
        message: "Sistema de autenticación no disponible",
        lastChecked: new Date(),
      })
    }

    // POS System Health
    try {
      const posStart = Date.now()
      const { data: products, error } = await supabase.from("products").select("count").eq("is_active", true).limit(1)
      const posTime = Date.now() - posStart

      checks.push({
        component: "Sistema POS",
        status: error ? "warning" : "healthy",
        message: error ? "Funcionando en modo demo" : "Sistema operativo",
        lastChecked: new Date(),
        responseTime: posTime,
      })
    } catch (error) {
      checks.push({
        component: "Sistema POS",
        status: "warning",
        message: "Modo demo activo",
        lastChecked: new Date(),
      })
    }

    // User Management Health
    try {
      const userStart = Date.now()
      const { data: roles, error } = await supabase.from("user_roles").select("count").limit(1)
      const userTime = Date.now() - userStart

      checks.push({
        component: "Gestión de Usuarios",
        status: error ? "warning" : "healthy",
        message: error ? "Acceso limitado" : "Sistema operativo",
        lastChecked: new Date(),
        responseTime: userTime,
      })
    } catch (error) {
      checks.push({
        component: "Gestión de Usuarios",
        status: "critical",
        message: "Sistema no disponible",
        lastChecked: new Date(),
      })
    }

    // Security Health
    const isHTTPS = window.location.protocol === "https:"
    checks.push({
      component: "Seguridad",
      status: isHTTPS ? "healthy" : "warning",
      message: isHTTPS ? "Conexión segura" : "Conexión no segura (desarrollo)",
      lastChecked: new Date(),
    })

    // Calculate overall health
    const criticalCount = checks.filter((c) => c.status === "critical").length
    const warningCount = checks.filter((c) => c.status === "warning").length

    let overall: "healthy" | "warning" | "critical" = "healthy"
    if (criticalCount > 0) {
      overall = "critical"
    } else if (warningCount > 0) {
      overall = "warning"
    }

    setHealthChecks(checks)
    setOverallHealth(overall)
    setLoading(false)
  }

  useEffect(() => {
    runHealthChecks()
    // Set up periodic health checks every 5 minutes
    const interval = setInterval(runHealthChecks, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "critical":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <RefreshCw className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return <Badge className="bg-green-100 text-green-800">Saludable</Badge>
      case "warning":
        return <Badge variant="secondary">Advertencia</Badge>
      case "critical":
        return <Badge variant="destructive">Crítico</Badge>
      default:
        return <Badge variant="outline">Desconocido</Badge>
    }
  }

  const getComponentIcon = (component: string) => {
    switch (component) {
      case "Base de Datos":
        return <Database className="h-4 w-4" />
      case "Autenticación":
        return <Shield className="h-4 w-4" />
      case "Sistema POS":
        return <ShoppingCart className="h-4 w-4" />
      case "Gestión de Usuarios":
        return <Users className="h-4 w-4" />
      case "Seguridad":
        return <Shield className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Estado del Sistema</span>
              {getStatusBadge(overallHealth)}
            </div>
            <Button onClick={runHealthChecks} disabled={loading} size="sm">
              {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Actualizar
            </Button>
          </CardTitle>
          <CardDescription>Monitoreo en tiempo real del estado de todos los componentes del sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {overallHealth === "critical" && (
            <Alert className="mb-4" variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Estado Crítico:</strong> Uno o más componentes críticos no están funcionando correctamente.
              </AlertDescription>
            </Alert>
          )}

          {overallHealth === "warning" && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Advertencias Detectadas:</strong> Algunos componentes tienen limitaciones o están en modo
                degradado.
              </AlertDescription>
            </Alert>
          )}

          {isDemo() && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Modo Demo:</strong> El sistema está ejecutándose en modo demostración con funcionalidad
                limitada.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {healthChecks.map((check, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getComponentIcon(check.component)}
                  {getStatusIcon(check.status)}
                  <div>
                    <div className="font-medium">{check.component}</div>
                    <div className="text-sm text-muted-foreground">{check.message}</div>
                    <div className="text-xs text-muted-foreground">
                      Última verificación: {check.lastChecked.toLocaleTimeString()}
                      {check.responseTime && ` • ${check.responseTime}ms`}
                    </div>
                  </div>
                </div>
                {getStatusBadge(check.status)}
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-sm font-medium">Componentes Saludables</div>
                  <div className="text-lg font-bold text-green-600">
                    {healthChecks.filter((c) => c.status === "healthy").length}
                  </div>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <div>
                  <div className="text-sm font-medium">Con Advertencias</div>
                  <div className="text-lg font-bold text-yellow-600">
                    {healthChecks.filter((c) => c.status === "warning").length}
                  </div>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <div>
                  <div className="text-sm font-medium">Críticos</div>
                  <div className="text-lg font-bold text-red-600">
                    {healthChecks.filter((c) => c.status === "critical").length}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
