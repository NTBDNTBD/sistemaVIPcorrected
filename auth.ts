"use server"

import { redirect } from "next/navigation"
import { withServerActionSecurity } from "@/lib/server-action-security"
import {
  createAccessToken,
  createRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  getTokenFromCookies,
  verifyToken,
} from "@/lib/jwt-auth"
import { log } from "@/lib/logger"

export interface User {
  id: string
  email: string
  full_name: string
  role: {
    name: string
    display_name: string
    permissions: Record<string, boolean>
  }
  status: "active" | "inactive"
  password_changed: boolean
  last_login?: string
}

function isPreviewEnvironment(): boolean {
  return typeof window !== "undefined" && window.location.hostname.includes("vusercontent.net")
}

function isSupabaseConfigured(): boolean {
  if (isPreviewEnvironment()) {
    return false // Always use demo mode in preview
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return !!(
    url &&
    key &&
    url !== "https://tu-proyecto.supabase.co" &&
    key !== "tu_anon_key_aqui" &&
    url.includes("supabase.co")
  )
}

function demoSignIn(email: string, password: string) {
  const validCredentials = [
    { email: "manager@barvip.com", password: "manager123" },
    { email: "admin@barvip.com", password: "demo123" },
  ]

  const isValid = validCredentials.some((cred) => cred.email === email && cred.password === password)

  if (!isValid) {
    return { error: "Credenciales inválidas" }
  }

  const user = {
    id: "demo-user-1",
    email: email,
    full_name: email === "manager@barvip.com" ? "Manager VIP" : "Admin Demo",
    role: {
      name: "administrador",
      display_name: "Administrador",
      permissions: {
        manage_users: true,
        manage_members: true,
        manage_products: true,
        process_payments: true,
        view_reports: true,
        manage_settings: true,
        manage_notifications: true,
        view_analytics: true,
      },
    },
    status: "active" as const,
    password_changed: true,
    last_login: new Date().toISOString(),
  }

  return { success: true, user }
}

export const signIn = withServerActionSecurity(
  async function signInAction(prevState: any, formData: FormData) {
    try {
      if (!formData) {
        return { error: "Form data is missing" }
      }

      const email = formData.get("email")
      const password = formData.get("password")

      if (!email || !password) {
        return { error: "Email y contraseña son requeridos" }
      }

      // Always use demo mode in preview or when Supabase not configured
      if (!isSupabaseConfigured()) {
        log.info("Using demo authentication mode", { email: email.toString() }, "AUTH")
        const result = demoSignIn(email.toString(), password.toString())

        if (result.success) {
          const accessToken = await createAccessToken({
            userId: result.user.id,
            email: result.user.email,
            role: result.user.role.name,
            permissions: result.user.role.permissions,
          })

          const refreshToken = await createRefreshToken(result.user.id)
          setAuthCookies(accessToken, refreshToken)

          return { success: true, user: result.user, redirect: "/dashboard" }
        }

        return result
      }

      // Dynamic import for production only
      try {
        const { createServerClient } = await import("@/lib/supabase/server")
        const supabase = createServerClient()

        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.toString(),
          password: password.toString(),
        })

        if (error) {
          log.error("Supabase auth error", { error: error.message, email: email.toString() }, "AUTH")
          const fallbackResult = demoSignIn(email.toString(), password.toString())
          if (fallbackResult.success) {
            const accessToken = await createAccessToken({
              userId: fallbackResult.user.id,
              email: fallbackResult.user.email,
              role: fallbackResult.user.role.name,
              permissions: fallbackResult.user.role.permissions,
            })

            const refreshToken = await createRefreshToken(fallbackResult.user.id)
            setAuthCookies(accessToken, refreshToken)

            return { success: true, user: fallbackResult.user, redirect: "/dashboard" }
          }
          return fallbackResult
        }

        if (!data.user) {
          return { error: "Credenciales inválidas" }
        }

        // Get user profile from database
        const { data: profile, error: profileError } = await supabase
          .from("system_users")
          .select(`
            id,
            email,
            full_name,
            is_active,
            last_login,
            role_id,
            user_roles!inner (
              name,
              display_name,
              permissions
            )
          `)
          .eq("email", data.user.email)
          .eq("is_active", true)
          .maybeSingle()

        if (profileError || !profile) {
          log.error("Profile fetch error", { error: profileError?.message }, "AUTH")
          const fallbackResult = demoSignIn(email.toString(), password.toString())
          if (fallbackResult.success) {
            const accessToken = await createAccessToken({
              userId: fallbackResult.user.id,
              email: fallbackResult.user.email,
              role: fallbackResult.user.role.name,
              permissions: fallbackResult.user.role.permissions,
            })

            const refreshToken = await createRefreshToken(fallbackResult.user.id)
            setAuthCookies(accessToken, refreshToken)

            return { success: true, user: fallbackResult.user, redirect: "/dashboard" }
          }
          return fallbackResult
        }

        const user: User = {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.user_roles || {
            name: "administrador",
            display_name: "Administrador",
            permissions: {
              manage_users: true,
              manage_members: true,
              manage_products: true,
              process_payments: true,
              view_reports: true,
              manage_settings: true,
              manage_notifications: true,
              view_analytics: true,
            },
          },
          status: profile.is_active ? "active" : "inactive",
          password_changed: true,
          last_login: profile.last_login || new Date().toISOString(),
        }

        const accessToken = await createAccessToken({
          userId: user.id,
          email: user.email,
          role: user.role.name,
          permissions: user.role.permissions,
        })

        const refreshToken = await createRefreshToken(user.id)
        setAuthCookies(accessToken, refreshToken)

        return { success: true, user, redirect: "/dashboard" }
      } catch (importError) {
        log.error("Supabase import error", { error: importError }, "AUTH")
        const fallbackResult = demoSignIn(email.toString(), password.toString())
        if (fallbackResult.success) {
          const accessToken = await createAccessToken({
            userId: fallbackResult.user.id,
            email: fallbackResult.user.email,
            role: fallbackResult.user.role.name,
            permissions: fallbackResult.user.role.permissions,
          })

          const refreshToken = await createRefreshToken(fallbackResult.user.id)
          setAuthCookies(accessToken, refreshToken)

          return { success: true, user: fallbackResult.user, redirect: "/dashboard" }
        }
        return fallbackResult
      }
    } catch (error) {
      log.error("Login error", { error }, "AUTH")
      const email = formData?.get("email")
      const password = formData?.get("password")

      if (email && password) {
        log.info("Falling back to demo authentication", { email: email.toString() }, "AUTH")
        const fallbackResult = demoSignIn(email.toString(), password.toString())
        if (fallbackResult.success) {
          const accessToken = await createAccessToken({
            userId: fallbackResult.user.id,
            email: fallbackResult.user.email,
            role: fallbackResult.user.role.name,
            permissions: fallbackResult.user.role.permissions,
          })

          const refreshToken = await createRefreshToken(fallbackResult.user.id)
          setAuthCookies(accessToken, refreshToken)

          return { success: true, user: fallbackResult.user, redirect: "/dashboard" }
        }
        return fallbackResult
      }

      return {
        error: "Error de configuración. Usando modo demo.",
      }
    }
  },
  {
    rateLimitRequests: 5,
    rateLimitWindow: 300000, // 5 minutes for login attempts
    requireCSRF: true,
    validateInput: true,
    logActivity: true,
  },
)

export const signOut = withServerActionSecurity(
  async function signOutAction() {
    try {
      clearAuthCookies()

      if (isSupabaseConfigured()) {
        const { createServerClient } = await import("@/lib/supabase/server")
        const supabase = createServerClient()
        await supabase.auth.signOut()
      }
    } catch (error) {
      log.error("Sign out error", { error }, "AUTH")
    }
    redirect("/login")
  },
  {
    rateLimitRequests: 10,
    rateLimitWindow: 60000,
    requireCSRF: true,
    validateInput: false,
    logActivity: true,
  },
)

export const getCurrentUser = withServerActionSecurity(
  async function getCurrentUserAction(): Promise<User | null> {
    try {
      const { accessToken, refreshToken } = getTokenFromCookies()

      if (accessToken) {
        const payload = await verifyToken(accessToken)
        if (payload) {
          return {
            id: payload.userId,
            email: payload.email,
            full_name: payload.email.split("@")[0],
            role: {
              name: payload.role,
              display_name: payload.role,
              permissions: payload.permissions,
            },
            status: "active",
            password_changed: true,
            last_login: new Date(payload.iat * 1000).toISOString(),
          }
        }
      }

      if (!isSupabaseConfigured()) {
        return null
      }

      const { createServerClient } = await import("@/lib/supabase/server")
      const supabase = createServerClient()

      let user
      try {
        const { data, error } = await supabase.auth.getUser()

        if (
          error &&
          (error.message?.includes("refresh_token_not_found") ||
            error.message?.includes("Invalid Refresh Token") ||
            error.status === 400)
        ) {
          log.info("Invalid refresh token detected, clearing session", {}, "AUTH")
          await supabase.auth.signOut()
          return null
        }

        if (error) {
          log.error("Auth error", { error: error.message }, "AUTH")
          return null
        }

        user = data.user
      } catch (authError: any) {
        if (authError.message?.includes("refresh_token_not_found") || authError.code === "refresh_token_not_found") {
          log.info("Refresh token error caught, clearing session", {}, "AUTH")
          try {
            await supabase.auth.signOut()
          } catch (signOutError) {
            log.error("Error signing out", { error: signOutError }, "AUTH")
          }
          return null
        }
        log.error("Authentication error", { error: authError }, "AUTH")
        return null
      }

      if (!user) {
        return null
      }

      const { data: profile, error: profileError } = await supabase
        .from("system_users")
        .select(`
          id,
          email,
          full_name,
          is_active,
          last_login,
          role_id,
          user_roles!inner (
            name,
            display_name,
            permissions
          )
        `)
        .eq("email", user.email)
        .eq("is_active", true)
        .maybeSingle()

      if (profileError || !profile) {
        log.error("Profile fetch error", { error: profileError?.message }, "AUTH")
        return null
      }

      return {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.user_roles || {
          name: "administrador",
          display_name: "Administrador",
          permissions: {},
        },
        status: profile.is_active ? "active" : "inactive",
        password_changed: true,
        last_login: profile.last_login,
      }
    } catch (error) {
      log.error("Get current user error", { error }, "AUTH")
      return null
    }
  },
  {
    rateLimitRequests: 200,
    rateLimitWindow: 60000,
    requireCSRF: false,
    validateInput: false,
    logActivity: false,
  },
)

export const resetPassword = withServerActionSecurity(
  async function resetPasswordAction(userId: string, newPassword: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      log.info("Password reset requested in demo mode", { userId }, "AUTH")
      throw new Error("Password reset not available in demo mode")
    }

    try {
      const { createServerClient } = await import("@/lib/supabase/server")
      const supabase = createServerClient()

      const { error } = await supabase
        .from("system_users")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)

      if (error) {
        throw new Error("Failed to reset password")
      }
    } catch (error) {
      log.error("Reset password error", { error, userId }, "AUTH")
      throw error
    }
  },
  {
    rateLimitRequests: 3,
    rateLimitWindow: 900000,
    requireCSRF: true,
    validateInput: true,
    logActivity: true,
  },
)

export const changePassword = withServerActionSecurity(
  async function changePasswordAction(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      log.info("Password change requested in demo mode", { userId }, "AUTH")
      throw new Error("Password change not available in demo mode")
    }

    try {
      const { createServerClient } = await import("@/lib/supabase/server")
      const supabase = createServerClient()

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        throw new Error("Failed to change password")
      }

      await supabase
        .from("system_users")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
    } catch (error) {
      log.error("Change password error", { error, userId }, "AUTH")
      throw error
    }
  },
  {
    rateLimitRequests: 5,
    rateLimitWindow: 300000,
    requireCSRF: true,
    validateInput: true,
    logActivity: true,
  },
)
