import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { SecurityMonitor } from "@/lib/security-monitor"

const securityMonitor = new SecurityMonitor()

export const isSupabaseConfigured = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || url.length === 0 || key.length === 0) {
    return false
  }

  // Check for placeholder values
  const placeholders = ["tu-proyecto.supabase.co", "tu_anon_key_aqui", "your-project", "placeholder"]

  if (placeholders.some((p) => url.includes(p) || key.includes(p))) {
    return false
  }

  // Basic URL validation
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.protocol === "https:" && parsedUrl.hostname.includes("supabase")
  } catch {
    return false
  }
})()

export const isDemo = () => !isSupabaseConfigured

let clientInstance: any = null
let connectionAttempts = 0
const MAX_CONNECTION_ATTEMPTS = 3

function createSupabaseClient() {
  if (!isSupabaseConfigured) {
    return null
  }

  if (clientInstance) {
    return clientInstance
  }

  try {
    connectionAttempts++
    clientInstance = createClientComponentClient()

    // Test connection on first creation
    if (typeof window !== "undefined" && connectionAttempts === 1) {
      clientInstance
        .from("system_settings")
        .select("setting_key")
        .limit(1)
        .then(({ error }: any) => {
          if (error && !error.message.includes("No rows")) {
            console.warn("Supabase client connection test failed:", error)
            securityMonitor.logSecurityEvent({
              type: "client_connection_warning",
              ip: "client",
              userAgent: navigator.userAgent || "unknown",
              details: { error: error.message },
              severity: "medium",
            })
          }
        })
        .catch((err: any) => {
          console.error("Supabase client test error:", err)
        })
    }

    return clientInstance
  } catch (error) {
    console.error("Failed to create Supabase client:", error)

    if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
      console.error("Max connection attempts reached, falling back to demo mode")
      return null
    }

    throw error
  }
}

export const supabase = isSupabaseConfigured
  ? createSupabaseClient()
  : {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signInWithPassword: () =>
          Promise.resolve({
            data: null,
            error: {
              message: "Demo mode - use demo credentials",
              status: 503,
              code: "DEMO_MODE",
            },
          }),
        signOut: () => Promise.resolve({ error: null }),
        onAuthStateChange: (callback: any) => {
          // Return a mock subscription
          return {
            data: {
              subscription: {
                unsubscribe: () => console.log("Demo mode: Auth state listener unsubscribed"),
              },
            },
          }
        },
      },
      from: (table: string) => ({
        select: (columns?: string) => ({
          data: [],
          error: { message: `Demo mode: ${table} not available`, code: "DEMO_MODE" },
          eq: () => ({ data: [], error: { message: `Demo mode: ${table} not available`, code: "DEMO_MODE" } }),
          limit: () => ({ data: [], error: { message: `Demo mode: ${table} not available`, code: "DEMO_MODE" } }),
          single: () => ({ data: null, error: { message: `Demo mode: ${table} not available`, code: "DEMO_MODE" } }),
        }),
        insert: (values: any) => ({
          data: null,
          error: { message: `Demo mode: Cannot insert into ${table}`, code: "DEMO_MODE" },
        }),
        update: (values: any) => ({
          eq: () => ({ data: null, error: { message: `Demo mode: Cannot update ${table}`, code: "DEMO_MODE" } }),
        }),
        delete: () => ({
          eq: () => ({ data: null, error: { message: `Demo mode: Cannot delete from ${table}`, code: "DEMO_MODE" } }),
        }),
      }),
    }

export function createClient() {
  return supabase
}

export function getSupabaseClient() {
  return supabase
}

export async function checkClientConnection(): Promise<{
  isConnected: boolean
  error?: string
  latency?: number
}> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      isConnected: false,
      error: "Supabase not configured",
    }
  }

  const startTime = Date.now()

  try {
    const { error } = await supabase.from("system_settings").select("setting_key").limit(1)

    const latency = Date.now() - startTime

    if (error && !error.message.includes("No rows")) {
      return {
        isConnected: false,
        error: error.message,
        latency,
      }
    }

    return {
      isConnected: true,
      latency,
    }
  } catch (error) {
    return {
      isConnected: false,
      error: error instanceof Error ? error.message : "Connection failed",
      latency: Date.now() - startTime,
    }
  }
}
