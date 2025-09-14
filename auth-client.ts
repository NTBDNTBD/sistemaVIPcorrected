"use client"

import { getSupabaseClient, isDemo } from "./supabase/client"
import type { User } from "./auth"

export type { User } from "./auth"

export function createSupabaseClient() {
  return getSupabaseClient()
}

export async function getCurrentUserClient(): Promise<User | null> {
  try {
    if (isDemo()) {
      return {
        id: "demo-user-1",
        email: "manager@barvip.com",
        full_name: "Manager Demo",
        role: {
          name: "gerente",
          display_name: "Gerente",
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
        status: "active",
        password_changed: true,
        last_login: new Date().toISOString(),
      }
    }

    const supabase = createSupabaseClient()

    if (!supabase) {
      console.log("No Supabase client available, using demo user")
      return {
        id: "demo-user-1",
        email: "manager@barvip.com",
        full_name: "Manager Demo",
        role: {
          name: "gerente",
          display_name: "Gerente",
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
        status: "active",
        password_changed: true,
        last_login: new Date().toISOString(),
      }
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("No authenticated user found:", authError)
      return null
    }

    // Query the system_users table to get user details and role
    const { data: systemUser, error: dbError } = await supabase
      .from("system_users")
      .select(`
        *,
        user_roles (
          name,
          display_name,
          permissions
        )
      `)
      .eq("email", user.email)
      .eq("is_active", true)
      .single()

    if (dbError || !systemUser) {
      console.error("User not found in system_users table:", dbError)
      return {
        id: user.id,
        email: user.email || "demo@barvip.com",
        full_name: user.email?.split("@")[0] || "Demo User",
        role: {
          name: "gerente",
          display_name: "Gerente",
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
        status: "active",
        password_changed: true,
        last_login: new Date().toISOString(),
      }
    }

    // Update last login
    await supabase
      .from("system_users")
      .update({
        last_login: new Date().toISOString(),
        failed_login_attempts: 0,
        locked_until: null,
      })
      .eq("id", systemUser.id)

    return {
      id: systemUser.id,
      email: systemUser.email,
      full_name: systemUser.full_name || systemUser.email.split("@")[0],
      role: systemUser.user_roles || {
        name: "gerente",
        display_name: "Gerente",
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
      status: systemUser.is_active ? "active" : "inactive",
      password_changed: true,
      last_login: systemUser.last_login,
    }
  } catch (error) {
    console.error("Get current user error:", error)
    return {
      id: "demo-user-error",
      email: "demo@barvip.com",
      full_name: "Demo User",
      role: {
        name: "gerente",
        display_name: "Gerente",
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
      status: "active",
      password_changed: true,
      last_login: new Date().toISOString(),
    }
  }
}

export async function signOutClient() {
  try {
    const supabase = createSupabaseClient()
    if (supabase) {
      await supabase.auth.signOut()
    }
  } catch (error) {
    console.error("Sign out error:", error)
  }
}
