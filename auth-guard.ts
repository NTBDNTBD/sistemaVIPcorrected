import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Configuración de seguridad
const ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"]
const CSRF_HEADER = "x-csrf-token"
const SESSION_DURATION = 15 * 60 * 1000 // 15 minutos

export interface AuthUser {
  id: string
  email: string
  role: "manager" | "cashier" | "admin"
  permissions: string[]
}

export interface SecurityLog {
  event: "access_denied" | "invalid_method" | "csrf_failure" | "auth_failure"
  ip: string
  userAgent: string
  path: string
  timestamp: Date
  details?: any
}

// Configuración de rutas y permisos
const ROUTE_PERMISSIONS = {
  "/api/products": {
    GET: ["manager", "cashier"],
    POST: ["manager"],
    PUT: ["manager"],
    DELETE: ["manager"],
  },
  "/api/transactions": {
    GET: ["manager", "cashier"],
    POST: ["manager", "cashier"],
    PUT: ["manager"],
    DELETE: ["manager"],
  },
  "/api/reports": {
    GET: ["manager"],
    POST: ["manager"],
    PUT: ["manager"],
    DELETE: ["manager"],
  },
  "/api/settings": {
    GET: ["manager"],
    POST: ["manager"],
    PUT: ["manager"],
    DELETE: ["manager"],
  },
  "/api/users": {
    GET: ["manager"],
    POST: ["manager"],
    PUT: ["manager"],
    DELETE: ["manager"],
  },
}

const PUBLIC_ROUTES = ["/", "/login", "/auth/callback", "/api/auth/login", "/api/auth/logout"]

const CSRF_PROTECTED_METHODS = ["POST", "PUT", "DELETE", "PATCH"]

export class AuthGuard {
  private supabase: any
  private isConfigured: boolean

  constructor() {
    this.isConfigured = this.checkSupabaseConfig()
    if (this.isConfigured) {
      this.supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    }
  }

  private checkSupabaseConfig(): boolean {
    return !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://tu-proyecto.supabase.co"
    )
  }

  async validateSession(request: NextRequest): Promise<AuthUser | null> {
    if (!this.isConfigured) return null

    try {
      const token = request.cookies.get("sb-access-token")?.value
      if (!token) return null

      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser(token)
      if (error || !user) return null

      // Obtener información del usuario desde system_users
      const { data: systemUser, error: userError } = await this.supabase
        .from("system_users")
        .select(`
          id,
          email,
          role,
          is_active,
          last_login,
          user_roles (
            role_name,
            permissions
          )
        `)
        .eq("email", user.email)
        .eq("is_active", true)
        .single()

      if (userError || !systemUser) {
        await this.logSecurityEvent({
          event: "auth_failure",
          ip: this.getClientIP(request),
          userAgent: request.headers.get("user-agent") || "",
          path: request.nextUrl.pathname,
          timestamp: new Date(),
          details: { email: user.email, error: "User not found in system_users" },
        })
        return null
      }

      // Actualizar último login
      await this.supabase.from("system_users").update({ last_login: new Date().toISOString() }).eq("id", systemUser.id)

      return {
        id: systemUser.id,
        email: systemUser.email,
        role: systemUser.role,
        permissions: systemUser.user_roles?.permissions || [],
      }
    } catch (error) {
      console.error("Session validation error:", error)
      return null
    }
  }

  validateMethod(request: NextRequest): boolean {
    return ALLOWED_METHODS.includes(request.method)
  }

  validateCSRF(request: NextRequest): boolean {
    if (!CSRF_PROTECTED_METHODS.includes(request.method)) {
      return true
    }

    const csrfToken = request.headers.get(CSRF_HEADER)
    const sessionToken = request.cookies.get("csrf-token")?.value

    return !!(csrfToken && sessionToken && csrfToken === sessionToken)
  }

  checkRoutePermission(path: string, method: string, userRole: string): boolean {
    const routeConfig = ROUTE_PERMISSIONS[path as keyof typeof ROUTE_PERMISSIONS]
    if (!routeConfig) return true // Permitir rutas no configuradas

    const allowedRoles = routeConfig[method as keyof typeof routeConfig]
    return allowedRoles ? allowedRoles.includes(userRole) : false
  }

  isPublicRoute(path: string): boolean {
    return PUBLIC_ROUTES.some((route) => path.startsWith(route))
  }

  private getClientIP(request: NextRequest): string {
    return (
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      request.ip ||
      "unknown"
    )
  }

  private async logSecurityEvent(event: SecurityLog): Promise<void> {
    if (!this.isConfigured) return

    try {
      await this.supabase.from("security_logs").insert({
        event_type: event.event,
        ip_address: event.ip,
        user_agent: event.userAgent,
        request_path: event.path,
        created_at: event.timestamp.toISOString(),
        details: event.details,
      })
    } catch (error) {
      console.error("Failed to log security event:", error)
    }
  }

  async guard(request: NextRequest): Promise<NextResponse> {
    const path = request.nextUrl.pathname
    const method = request.method

    // 1. Validar método HTTP
    if (!this.validateMethod(request)) {
      await this.logSecurityEvent({
        event: "invalid_method",
        ip: this.getClientIP(request),
        userAgent: request.headers.get("user-agent") || "",
        path,
        timestamp: new Date(),
        details: { method },
      })
      return new NextResponse("Method Not Allowed", { status: 405 })
    }

    // 2. Permitir rutas públicas
    if (this.isPublicRoute(path)) {
      return NextResponse.next()
    }

    // 3. Validar CSRF para métodos sensibles
    if (!this.validateCSRF(request)) {
      await this.logSecurityEvent({
        event: "csrf_failure",
        ip: this.getClientIP(request),
        userAgent: request.headers.get("user-agent") || "",
        path,
        timestamp: new Date(),
      })
      return new NextResponse("CSRF Token Invalid", { status: 403 })
    }

    // 4. Validar sesión y obtener usuario
    const user = await this.validateSession(request)
    if (!user) {
      await this.logSecurityEvent({
        event: "access_denied",
        ip: this.getClientIP(request),
        userAgent: request.headers.get("user-agent") || "",
        path,
        timestamp: new Date(),
        details: { reason: "No valid session" },
      })

      if (path.startsWith("/api/")) {
        return new NextResponse("Unauthorized", { status: 401 })
      }

      const redirectUrl = new URL("/login", request.url)
      redirectUrl.searchParams.set("redirectTo", path)
      return NextResponse.redirect(redirectUrl)
    }

    // 5. Validar permisos de ruta
    if (!this.checkRoutePermission(path, method, user.role)) {
      await this.logSecurityEvent({
        event: "access_denied",
        ip: this.getClientIP(request),
        userAgent: request.headers.get("user-agent") || "",
        path,
        timestamp: new Date(),
        details: {
          reason: "Insufficient permissions",
          userRole: user.role,
          requiredMethod: method,
        },
      })

      if (path.startsWith("/api/")) {
        return new NextResponse("Forbidden", { status: 403 })
      }

      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    // 6. Agregar información del usuario a los headers para uso en la aplicación
    const response = NextResponse.next()
    response.headers.set("x-user-id", user.id)
    response.headers.set("x-user-email", user.email)
    response.headers.set("x-user-role", user.role)

    return response
  }
}
