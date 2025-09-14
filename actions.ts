"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect" // AÑADIDO
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { withServerActionSecurity } from "@/lib/server-action-security"
import { createAccessToken, createRefreshToken, setAuthCookies } from "@/lib/jwt-auth"
import { SecurityMonitor } from "@/lib/security-monitor"

const securityMonitor = new SecurityMonitor()

const DEMO_USERS = [
  {
    email: "admin@barvip.com",
    password: process.env.DEMO_ADMIN_PASSWORD || "admin123",
    role: "admin",
    name: "Administrador Demo",
    permissions: {
      users: { read: true, create: true, update: true, delete: true },
      products: { read: true, create: true, update: true, delete: true },
      transactions: { read: true, create: true, update: true, delete: true },
      reports: { read: true, create: true, update: true, delete: true },
      settings: { read: true, create: true, update: true, delete: true },
    },
  },
  {
    email: "manager@barvip.com",
    password: process.env.DEMO_MANAGER_PASSWORD || "manager123",
    role: "manager",
    name: "Gerente Demo",
    permissions: {
      products: { read: true, create: true, update: true, delete: true },
      transactions: { read: true, create: true, update: true, delete: false },
      reports: { read: true, create: false, update: false, delete: false },
      members: { read: true, create: true, update: true, delete: false },
    },
  },
  {
    email: "cashier@barvip.com",
    password: process.env.DEMO_CASHIER_PASSWORD || "cashier123",
    role: "cashier",
    name: "Cajero Demo",
    permissions: {
      products: { read: true, create: false, update: false, delete: false },
      transactions: { read: true, create: true, update: false, delete: false },
      pos: { read: true, create: true, update: false, delete: false },
    },
  },
]

async function authenticateDemo(email: string, password: string, clientIP?: string, userAgent?: string) {
  const demoUser = DEMO_USERS.find((u) => u.email === email && u.password === password)

  if (demoUser) {
    try {
      // Create JWT tokens for demo users
      const accessToken = await createAccessToken({
        userId: `demo-${demoUser.role}`,
        email: demoUser.email,
        role: demoUser.role,
        permissions: demoUser.permissions,
      })

      const refreshToken = await createRefreshToken(`demo-${demoUser.role}`)

      // Set secure cookies
      setAuthCookies(accessToken, refreshToken)

      // Log successful demo authentication
      await securityMonitor.logSecurityEvent({
        type: "demo_login_success",
        ip: clientIP || "unknown",
        userAgent: userAgent || "unknown",
        details: { email: demoUser.email, role: demoUser.role },
        severity: "low",
      })

      return {
        success: true,
        user: {
          id: `demo-${demoUser.role}`,
          email: demoUser.email,
          full_name: demoUser.name,
          role: demoUser.role,
          permissions: demoUser.permissions,
          is_demo: true,
        },
      }
    } catch (error) {
      console.error("Demo authentication token creation failed:", error)
      return { error: "Error interno de autenticación" }
    }
  }

  // Log failed demo authentication attempt
  if (clientIP) {
    await securityMonitor.logSecurityEvent({
      type: "demo_login_failed",
      ip: clientIP,
      userAgent: userAgent || "unknown",
      details: { email, attempted_role: "unknown" },
      severity: "medium",
    })
  }

  return { error: "Credenciales demo inválidas" }
}

function validateAuthInput(email: string, password: string): { isValid: boolean; error?: string } {
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Formato de email inválido" }
  }

  if (email.length > 255) {
    return { isValid: false, error: "Email demasiado largo" }
  }

  // Password validation
  if (password.length < 6) {
    return { isValid: false, error: "Contraseña demasiado corta" }
  }

  if (password.length > 128) {
    return { isValid: false, error: "Contraseña demasiado larga" }
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /[<>]/g, // HTML tags
    /javascript:/i, // JavaScript injection
    /on\w+\s*=/i, // Event handlers
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b)/i, // SQL injection
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(email) || pattern.test(password)) {
      return { isValid: false, error: "Entrada inválida detectada" }
    }
  }

  return { isValid: true }
}

export const signIn = withServerActionSecurity(
  async function signInAction(prevState: any, formData: FormData) {
    if (!formData) {
      return { error: "Form data is missing" }
    }

    const email = formData.get("email")
    const password = formData.get("password")

    if (!email || !password) {
      return { error: "Email y contraseña son requeridos" }
    }

    const emailStr = email.toString().trim().toLowerCase()
    const passwordStr = password.toString()

    if (!emailStr || !passwordStr) {
      return { error: "Email y contraseña no pueden estar vacíos" }
    }

    const validation = validateAuthInput(emailStr, passwordStr)
    if (!validation.isValid) {
      return { error: validation.error }
    }

    const clientIP = process.env.NODE_ENV === "development" ? "localhost" : "unknown"
    const userAgent = "server-action"

    try {
      console.log("[v0] Authentication attempt for:", emailStr)
      console.log("[v0] Supabase configured:", isSupabaseConfigured)

      if (!isSupabaseConfigured) {
        console.log("[v0] Supabase not configured, using demo mode")
        const demoResult = await authenticateDemo(emailStr, passwordStr, clientIP, userAgent)
        if (demoResult.success) {
          redirect('/dashboard')
        }
        return demoResult
      }

      const cookieStore = cookies()
      const supabase = createServerActionClient({ cookies: () => cookieStore })

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailStr,
        password: passwordStr,
      })

      if (error) {
        console.error("Authentication error:", error)

        await securityMonitor.logSecurityEvent({
          type: "supabase_login_failed",
          ip: clientIP,
          userAgent,
          details: {
            email: emailStr,
            error: error.message,
            status: error.status,
          },
          severity: error.status === 429 ? "high" : "medium",
        })

        if (
          error.message.includes("Request rate limit reached") ||
          error.message.includes("Too many requests") ||
          error.status === 429
        ) {
          console.log("[v0] Supabase rate limited, falling back to demo mode")
          return await authenticateDemo(emailStr, passwordStr, clientIP, userAgent)
        }

        if (error.message.includes("Invalid login credentials")) {
          return { error: "Credenciales inválidas. Verifica tu email y contraseña." }
        }
        if (error.message.includes("Email not confirmed")) {
          return { error: "Email no confirmado. Revisa tu bandeja de entrada." }
        }
        if (error.message.includes("refresh_token_not_found")) {
          console.log("[v0] Refresh token error, clearing session and using demo mode")
          try {
            await supabase.auth.signOut()
          } catch (signOutError) {
            console.error("Error signing out:", signOutError)
          }
          return await authenticateDemo(emailStr, passwordStr, clientIP, userAgent)
        }

        return { error: "Error de autenticación. Intenta de nuevo." }
      }

      if (!data.user) {
        return { error: "Error inesperado durante el login" }
      }

      try {
        const { data: userProfile, error: profileError } = await supabase
          .from("system_users")
          .select(`
            id,
            email,
            full_name,
            is_active,
            role_id,
            failed_login_attempts,
            locked_until,
            last_login,
            created_at,
            user_roles!inner (
              name,
              display_name,
              permissions
            )
          `)
          .eq("email", data.user.email)
          .single()

        if (profileError || !userProfile) {
          console.error("User profile error:", profileError)
          console.log("[v0] Database error, falling back to demo mode")
          await supabase.auth.signOut()
          return await authenticateDemo(emailStr, passwordStr, clientIP, userAgent)
        }

        if (!userProfile.is_active) {
          await securityMonitor.logSecurityEvent({
            type: "inactive_user_login_attempt",
            ip: clientIP,
            userAgent,
            details: { email: emailStr, userId: userProfile.id },
            severity: "high",
          })
          await supabase.auth.signOut()
          return { error: "Cuenta desactivada. Contacta al administrador." }
        }

        if (userProfile.locked_until && new Date(userProfile.locked_until) > new Date()) {
          await securityMonitor.logSecurityEvent({
            type: "locked_account_login_attempt",
            ip: clientIP,
            userAgent,
            details: {
              email: emailStr,
              userId: userProfile.id,
              lockedUntil: userProfile.locked_until,
            },
            severity: "high",
          })
          await supabase.auth.signOut()
          return { error: "Cuenta bloqueada temporalmente. Intenta más tarde." }
        }

        const accessToken = await createAccessToken({
          userId: userProfile.id,
          email: userProfile.email,
          role: userProfile.user_roles.name,
          permissions: userProfile.user_roles.permissions || {},
        })

        const refreshToken = await createRefreshToken(userProfile.id)
        setAuthCookies(accessToken, refreshToken)

        await supabase
          .from("system_users")
          .update({
            last_login: new Date().toISOString(),
            failed_login_attempts: 0,
            locked_until: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userProfile.id)

        await securityMonitor.logSecurityEvent({
          type: "supabase_login_success",
          ip: clientIP,
          userAgent,
          details: {
            email: emailStr,
            userId: userProfile.id,
            role: userProfile.user_roles.name,
          },
          severity: "low",
        })

        // Successful login, redirect to dashboard
        redirect('/dashboard')
      } catch (dbError) {
        // MODIFICADO: Verificar si es un redirect antes de tratar como error
        if (isRedirectError(dbError)) {
          throw dbError // Re-lanzar el redirect
        }
        console.error("Database operation error:", dbError)
        console.log("[v0] Database error, falling back to demo mode")
        return await authenticateDemo(emailStr, passwordStr, clientIP, userAgent)
      }
    } catch (error) {
      // MODIFICADO: Verificar si es un redirect antes de tratar como error
      if (isRedirectError(error)) {
        throw error // Re-lanzar el redirect
      }
      console.error("Login error:", error)
      console.log("[v0] Unexpected error, falling back to demo mode")
      return await authenticateDemo(emailStr, passwordStr, clientIP, userAgent)
    }
  },
  {
    rateLimitRequests: 5, // Reduced back to 5 for better security
    rateLimitWindow: 300000, // 5 minutes
    requireCSRF: true,
    validateInput: true,
    logActivity: true,
  },
)

export const signOut = withServerActionSecurity(
  async function signOutAction() {
    try {
      if (isSupabaseConfigured) {
        const cookieStore = cookies()
        const supabase = createServerActionClient({ cookies: () => cookieStore })
        try {
          await supabase.auth.signOut()
        } catch (signOutError) {
          console.error("Supabase sign out error:", signOutError)
          // Continue with redirect even if sign out fails
        }
      }
    } catch (error) {
      // MODIFICADO: Verificar si es un redirect antes de tratar como error
      if (isRedirectError(error)) {
        throw error // Re-lanzar el redirect
      }
      console.error("Sign out error:", error)
      // Continue with redirect even if there's an error
    }
    redirect("/login")
  },
  {
    rateLimitRequests: 20, // Increased from 10 to 20 for sign out
    rateLimitWindow: 60000,
    requireCSRF: true,
    validateInput: false,
    logActivity: true,
  },
)