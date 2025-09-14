"use client"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export interface User {
  id: string
  email: string
  full_name?: string
  role?: string
  permissions?: any
  is_demo?: boolean
}

// Demo user for when Supabase is not configured
const DEMO_USER: User = {
  id: "demo-manager",
  email: "manager@barvip.com", 
  full_name: "Gerente Demo",
  role: "manager",
  permissions: {
    products: { read: true, create: true, update: true, delete: true },
    transactions: { read: true, create: true, update: true, delete: false },
    reports: { read: true, create: false, update: false, delete: false },
    members: { read: true, create: true, update: true, delete: false },
  },
  is_demo: true,
}

export function createSupabaseClient() {
  try {
    // Always return null to force demo mode and avoid server imports
    console.log("Using demo mode")
    return null
  } catch (error) {
    console.error("Error creating Supabase client:", error)
    return null
  }
}

export async function getCurrentUserClient(): Promise<User | null> {
  try {
    // Always use demo mode for now to avoid server issues
    console.log("Using demo user")
    return DEMO_USER

    // Try to get auth cookies for demo detection
    if (typeof window !== "undefined") {
      const cookies = document.cookie
      if (cookies.includes("demo-user") || cookies.includes("demo-manager")) {
        console.log("Demo session detected")
        return DEMO_USER
      }
    }

    const supabase = createSupabaseClient()
    if (!supabase) {
      console.log("No Supabase client, using demo user")
      return DEMO_USER
    }

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      console.log("No authenticated user, using demo")
      return DEMO_USER
    }

    // If we have a Supabase user, try to get their profile
    try {
      const { data: userProfile, error: profileError } = await supabase
        .from("system_users")
        .select(`
          id,
          email,
          full_name,
          role_id,
          user_roles!inner (
            name,
            display_name,
            permissions
          )
        `)
        .eq("email", user.email)
        .single()

      if (profileError || !userProfile) {
        console.log("No user profile found, using demo")
        return DEMO_USER
      }

      return {
        id: userProfile.id,
        email: userProfile.email,
        full_name: userProfile.full_name,
        role: userProfile.user_roles.name,
        permissions: userProfile.user_roles.permissions || {},
        is_demo: false,
      }
    } catch (profileError) {
      console.error("Error fetching user profile:", profileError)
      return DEMO_USER
    }
  } catch (error) {
    console.error("Error in getCurrentUserClient:", error)
    return DEMO_USER
  }
}

export async function signOutClient(): Promise<void> {
  try {
    const supabase = createSupabaseClient()
    if (supabase) {
      await supabase.auth.signOut()
    }
    
    // Clear any demo cookies
    if (typeof window !== "undefined") {
      document.cookie = "demo-user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
      document.cookie = "demo-manager=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    }
  } catch (error) {
    console.error("Error signing out:", error)
  }
}