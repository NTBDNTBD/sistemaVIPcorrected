"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { generateSecurePassword, validatePassword } from "@/lib/auth-utils"
import { Key, Eye, EyeOff, CheckCircle, XCircle, RefreshCw } from "lucide-react"

export function UserPasswordDemo() {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [validation, setValidation] = useState({ isValid: false, errors: [] as string[] })
  const { toast } = useToast()

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    setValidation(validatePassword(value))
  }

  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword()
    setPassword(newPassword)
    setValidation(validatePassword(newPassword))
    toast({
      title: "Contraseña Generada",
      description: `Nueva contraseña segura: ${newPassword}`,
      duration: 8000,
    })
  }

  const testScenarios = [
    {
      title: "Crear Usuario Administrador",
      description: "Prueba crear un nuevo usuario con rol de administrador",
      action: () => {
        toast({
          title: "Escenario de Prueba",
          description: "Haz clic en 'Nuevo Usuario' y selecciona rol 'Administrador'",
        })
      },
    },
    {
      title: "Generar Contraseña Automática",
      description: "Usa el generador de contraseñas seguras",
      action: handleGeneratePassword,
    },
    {
      title: "Cambiar Contraseña de Admin",
      description: "Prueba cambiar la contraseña del administrador principal",
      action: () => {
        toast({
          title: "Escenario de Prueba",
          description: "Busca al admin en la tabla y haz clic en el ícono de llave (🔑)",
        })
      },
    },
    {
      title: "Restablecer Contraseña",
      description: "Restablece la contraseña de un usuario con contraseña temporal",
      action: () => {
        toast({
          title: "Escenario de Prueba",
          description: "Haz clic en el ícono de candado (🔒) junto a cualquier usuario",
        })
      },
    },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="mr-2 h-5 w-5" />
            Demostración de Gestión de Contraseñas
          </CardTitle>
          <CardDescription>Prueba todas las funcionalidades del sistema de contraseñas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Password Generator Test */}
          <div className="space-y-2">
            <Label htmlFor="test-password">Probar Validador de Contraseñas</Label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Input
                  id="test-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="Ingresa una contraseña para probar..."
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button onClick={handleGeneratePassword}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Generar
              </Button>
            </div>

            {/* Password Validation Display */}
            {password && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  {validation.isValid ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className={validation.isValid ? "text-green-700" : "text-red-700"}>
                    {validation.isValid ? "Contraseña válida" : "Contraseña inválida"}
                  </span>
                </div>

                {validation.errors.length > 0 && (
                  <div className="text-sm text-red-600">
                    <p>Errores encontrados:</p>
                    <ul className="list-disc list-inside ml-2">
                      {validation.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Test Scenarios */}
          <div className="space-y-3">
            <h4 className="font-medium">Escenarios de Prueba</h4>
            <div className="grid gap-3 md:grid-cols-2">
              {testScenarios.map((scenario, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-2">
                    <h5 className="font-medium text-sm">{scenario.title}</h5>
                    <p className="text-xs text-muted-foreground">{scenario.description}</p>
                    <Button size="sm" variant="outline" onClick={scenario.action}>
                      Probar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Current Demo Users */}
          <div className="space-y-2">
            <h4 className="font-medium">Usuarios Demo Disponibles</h4>
            <div className="grid gap-2">
              <div className="flex items-center justify-between p-2 border rounded">
                <div>
                  <span className="font-medium">admin@barvip.com</span>
                  <Badge variant="destructive" className="ml-2 text-xs">
                    Contraseña por defecto
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">demo123</span>
              </div>
              <div className="flex items-center justify-between p-2 border rounded">
                <div>
                  <span className="font-medium">gerente@barvip.com</span>
                  <Badge variant="default" className="ml-2 text-xs">
                    Contraseña cambiada
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">demo123</span>
              </div>
              <div className="flex items-center justify-between p-2 border rounded">
                <div>
                  <span className="font-medium">cajero1@barvip.com</span>
                  <Badge variant="default" className="ml-2 text-xs">
                    Contraseña cambiada
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">demo123</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Key className="h-4 w-4" />
        <AlertDescription>
          <strong>Instrucciones de Prueba:</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Usa el generador de contraseñas para crear contraseñas seguras</li>
            <li>Crea nuevos usuarios con diferentes roles</li>
            <li>Cambia contraseñas usando el ícono de llave (🔑)</li>
            <li>Restablece contraseñas usando el ícono de candado (🔒)</li>
            <li>Observa los indicadores de estado de contraseña</li>
          </ol>
        </AlertDescription>
      </Alert>
    </div>
  )
}
