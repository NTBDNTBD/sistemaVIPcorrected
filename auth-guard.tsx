"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { Shield, RefreshCw, Lock, AlertTriangle } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
  requiredPermission?: string
  requiredPermissions?: string[]
  adminOnly?: boolean
  allowDemo?: boolean
}

export function AuthGuard({ children, requiredPermission, requiredPermissions, adminOnly, allowDemo }: AuthGuardProps) {
  const { user, loading, refreshUser } = useAuth()
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (!loading && !user && !allowDemo) {
      router.push("/login")
    }
  }, [user, loading, router, allowDemo])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refreshUser()
    setIsRefreshing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  if (!user && !allowDemo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Acceso Requerido
            </CardTitle>
            <CardDescription>Redirigiendo al login...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Allow demo mode if specified
  if (allowDemo && !user) {
    return <>{children}</>
  }

  if (user) {
    // Check admin-only access
    if (adminOnly && user.role?.name !== "administrador" && user.role?.name !== "admin") {
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <Shield className="mr-2 h-5 w-5" />
                Solo Administradores
              </CardTitle>
              <CardDescription>Esta página está restringida a administradores</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Acceso requerido:</strong> Administrador
                  <br />
                  <strong>Tu rol:</strong> {user.role?.display_name || user.role?.name || "Sin rol"}
                  <br />
                  <strong>Tu email:</strong> {user.email}
                </AlertDescription>
              </Alert>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => router.push("/dashboard")} className="flex-1">
                  Ir al Dashboard
                </Button>
                <Button onClick={handleRefresh} disabled={isRefreshing} className="flex-1">
                  {isRefreshing ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Actualizar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    // Check single required permission - SAFE ACCESS
    if (requiredPermission && user.role?.permissions && !user.role.permissions[requiredPermission]) {
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <Lock className="mr-2 h-5 w-5" />
                Acceso Denegado
              </CardTitle>
              <CardDescription>No tienes permisos para acceder a esta página</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Permiso requerido:</strong> {requiredPermission}
                  <br />
                  <strong>Tu rol:</strong> {user.role?.display_name || user.role?.name || "Sin rol"}
                  <br />
                  <strong>Tu email:</strong> {user.email}
                </AlertDescription>
              </Alert>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => router.back()} className="flex-1">
                  Volver
                </Button>
                <Button onClick={handleRefresh} disabled={isRefreshing} className="flex-1">
                  {isRefreshing ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Actualizar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    // Check multiple required permissions - SAFE ACCESS
    if (requiredPermissions && requiredPermissions.length > 0) {
      const missingPermissions = requiredPermissions.filter((permission) => {
        // Admin users have all permissions
        if (user.role?.name === "admin" || user.role?.name === "administrador") {
          return false
        }
        // Safe access to permissions
        if (!user.role?.permissions || typeof user.role.permissions !== 'object') {
          return true
        }
        return !user.role.permissions[permission]
      })

      if (missingPermissions.length > 0) {
        return (
          <div className="flex items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center text-red-600">
                  <Lock className="mr-2 h-5 w-5" />
                  Permisos Insuficientes
                </CardTitle>
                <CardDescription>Te faltan permisos para acceder a esta página</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Permisos faltantes:</strong> {missingPermissions.join(", ")}
                    <br />
                    <strong>Tu rol:</strong> {user.role?.display_name || user.role?.name || "Sin rol"}
                    <br />
                    <strong>Tu email:</strong> {user.email}
                  </AlertDescription>
                </Alert>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => router.back()} className="flex-1">
                    Volver
                  </Button>
                  <Button onClick={handleRefresh} disabled={isRefreshing} className="flex-1">
                    {isRefreshing ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Actualizar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      }
    }
  }

  return <>{children}</>
}
