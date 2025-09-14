import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { verifyToken } from "@/lib/jwt-auth"

export interface RBACConfig {
  requiredRole?: string[]
  requiredPermissions?: string[]
  adminOnly?: boolean
  allowDemo?: boolean
}

export interface RoutePermissions {
  [path: string]: {
    [method: string]: RBACConfig
  }
}

export const API_ROUTE_PERMISSIONS: RoutePermissions = {
  "/api/auth/login": {
    POST: { allowDemo: true },
  },
  "/api/auth/logout": {
    POST: { allowDemo: true },
  },
  "/api/upload": {
    POST: { requiredPermissions: ["manage_products"] },
  },
  "/api/upload/avatar": {
    POST: { requiredPermissions: ["manage_users"] },
  },
  "/api/notifications/send": {
    POST: { requiredPermissions: ["manage_notifications"] },
  },
  "/api/notifications/process": {
    GET: { requiredPermissions: ["manage_notifications"] },
    POST: { requiredPermissions: ["manage_notifications"] },
  },
  "/api/products": {
    GET: { requiredPermissions: ["view_products"] },
    POST: { requiredPermissions: ["manage_products"] },
    PUT: { requiredPermissions: ["manage_products"] },
    DELETE: { requiredPermissions: ["manage_products"] },
  },
  "/api/members": {
    GET: { requiredPermissions: ["view_members"] },
    POST: { requiredPermissions: ["manage_members"] },
    PUT: { requiredPermissions: ["manage_members"] },
    DELETE: { requiredPermissions: ["manage_members"] },
  },
  "/api/transactions": {
    GET: { requiredPermissions: ["view_reports"] },
    POST: { requiredPermissions: ["process_payments"] },
    PUT: { requiredPermissions: ["manage_transactions"] },
    DELETE: { adminOnly: true },
  },
  "/api/reports": {
    GET: { requiredPermissions: ["view_reports"] },
    POST: { requiredPermissions: ["view_reports"] },
  },
  "/api/settings": {
    GET: { requiredPermissions: ["view_settings"] },
    POST: { requiredPermissions: ["manage_settings"] },
    PUT: { requiredPermissions: ["manage_settings"] },
    DELETE: { adminOnly: true },
  },
  "/api/users": {
    GET: { adminOnly: true },
    POST: { adminOnly: true },
    PUT: { adminOnly: true },
    DELETE: { adminOnly: true },
  },
  "/api/rewards": {
    GET: { requiredPermissions: ["view_rewards"] },
    POST: { requiredPermissions: ["manage_rewards"] },
    PUT: { requiredPermissions: ["manage_rewards"] },
    DELETE: { requiredPermissions: ["manage_rewards"] },
  },
}

export async function withRBAC(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>,
  config?: RBACConfig,
): Promise<NextResponse> {
  try {
    const path = request.nextUrl.pathname
    const method = request.method

    // Get route-specific configuration
    const routeConfig = API_ROUTE_PERMISSIONS[path]?.[method] || config
    if (!routeConfig) {
      // No specific configuration, allow access
      return await handler(request)
    }

    // Check if demo mode is allowed for this route
    if (routeConfig.allowDemo) {
      return await handler(request)
    }

    // Get current user from JWT token or session
    let user = null
    try {
      const accessToken = request.cookies.get("access_token")?.value
      if (accessToken) {
        const payload = await verifyToken(accessToken)
        if (payload) {
          user = {
            id: payload.userId,
            email: payload.email,
            role: {
              name: payload.role,
              permissions: payload.permissions,
            },
          }
        }
      }

      // Fallback to server-side user check
      if (!user) {
        user = await getCurrentUser()
      }
    } catch (error) {
      console.error("RBAC: Error getting user:", error)
    }

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Check admin-only access
    if (routeConfig.adminOnly && user.role.name !== "admin" && user.role.name !== "administrador") {
      return NextResponse.json(
        {
          error: "Admin access required",
          details: {
            userRole: user.role.name,
            requiredRole: "admin",
          },
        },
        { status: 403 },
      )
    }

    // Check required roles
    if (routeConfig.requiredRole && !routeConfig.requiredRole.includes(user.role.name)) {
      return NextResponse.json(
        {
          error: "Insufficient role permissions",
          details: {
            userRole: user.role.name,
            requiredRoles: routeConfig.requiredRole,
          },
        },
        { status: 403 },
      )
    }

    // Check required permissions
    if (routeConfig.requiredPermissions) {
      const hasAllPermissions = routeConfig.requiredPermissions.every((permission) => {
        // Admin users have all permissions
        if (user.role.name === "admin" || user.role.name === "administrador") {
          return true
        }
        return user.role.permissions[permission] === true
      })

      if (!hasAllPermissions) {
        return NextResponse.json(
          {
            error: "Insufficient permissions",
            details: {
              userPermissions: Object.keys(user.role.permissions).filter((key) => user.role.permissions[key] === true),
              requiredPermissions: routeConfig.requiredPermissions,
            },
          },
          { status: 403 },
        )
      }
    }

    // Add user context to request headers for use in handlers
    const response = await handler(request)
    response.headers.set("x-user-id", user.id)
    response.headers.set("x-user-email", user.email)
    response.headers.set("x-user-role", user.role.name)

    return response
  } catch (error) {
    console.error("RBAC middleware error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export function createRBACHandler(config: RBACConfig) {
  return (handler: (request: NextRequest) => Promise<NextResponse>) => {
    return (request: NextRequest) => withRBAC(request, handler, config)
  }
}
