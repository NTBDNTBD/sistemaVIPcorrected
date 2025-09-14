"use client"

export interface DemoUser {
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

const DEMO_USERS = {
  "manager@barvip.com": {
    password: "manager123",
    user: {
      id: "demo-manager-1",
      email: "manager@barvip.com",
      full_name: "Manager VIP",
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
    },
  },
  "admin@barvip.com": {
    password: "demo123",
    user: {
      id: "demo-admin-1",
      email: "admin@barvip.com",
      full_name: "Admin Demo",
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
    },
  },
}

export function getDemoUser(): DemoUser | null {
  if (typeof window === "undefined") return null

  const userData = localStorage.getItem("vip_bar_user")
  if (!userData) return null

  try {
    return JSON.parse(userData)
  } catch {
    return null
  }
}

export function setDemoUser(user: DemoUser) {
  if (typeof window === "undefined") return
  localStorage.setItem("vip_bar_user", JSON.stringify(user))
}

export function clearDemoUser() {
  if (typeof window === "undefined") return
  localStorage.removeItem("vip_bar_user")
}

export function isAuthenticated(): boolean {
  return getDemoUser() !== null
}

export function demoSignIn(email: string, password: string): { success: boolean; user?: DemoUser; error?: string } {
  const userConfig = DEMO_USERS[email as keyof typeof DEMO_USERS]

  if (!userConfig) {
    return { success: false, error: "Usuario no encontrado" }
  }

  if (userConfig.password !== password) {
    return { success: false, error: "Contraseña incorrecta" }
  }

  setDemoUser(userConfig.user)
  return { success: true, user: userConfig.user }
}

export function demoSignOut() {
  clearDemoUser()
}
