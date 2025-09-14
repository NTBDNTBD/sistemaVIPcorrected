import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { cache } from "react"
import { SecurityMonitor } from "@/lib/security-monitor"

const securityMonitor = new SecurityMonitor()

export const isSupabaseConfigured = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Basic presence check
  if (!url || !key || url.length === 0 || key.length === 0) {
    return false
  }

  // Check for placeholder values
  const placeholderValues = [
    "https://tu-proyecto.supabase.co",
    "tu_anon_key_aqui",
    "your-project-url",
    "your-anon-key",
    "placeholder",
  ]

  if (
    placeholderValues.some(
      (placeholder) =>
        url.toLowerCase().includes(placeholder.toLowerCase()) || key.toLowerCase().includes(placeholder.toLowerCase()),
    )
  ) {
    return false
  }

  // Validate URL format
  try {
    const parsedUrl = new URL(url)
    if (!parsedUrl.hostname.includes("supabase.co") && !parsedUrl.hostname.includes("localhost")) {
      console.warn("Supabase URL does not appear to be a valid Supabase endpoint")
      return false
    }
  } catch (error) {
    console.error("Invalid Supabase URL format:", error)
    return false
  }

  // Validate key format (basic JWT structure check)
  if (!key.includes(".") || key.split(".").length !== 3) {
    console.error("Supabase anon key does not appear to be a valid JWT")
    return false
  }

  return true
})()

export async function checkDatabaseHealth(): Promise<{
  isHealthy: boolean
  error?: string
  latency?: number
  details?: any
}> {
  if (!isSupabaseConfigured) {
    return {
      isHealthy: false,
      error: "Supabase not configured",
    }
  }

  const startTime = Date.now()

  try {
    const client = createClient()

    // Test basic connectivity with auth session instead of table query
    const { data, error } = await client.auth.getSession()

    const latency = Date.now() - startTime

    if (error) {
      // Log database connectivity issues
      await securityMonitor.logSecurityEvent({
        type: "database_connection_error",
        ip: "server",
        userAgent: "health-check",
        details: {
          error: error.message,
          code: error.code || 'AUTH_ERROR',
          latency,
        },
        severity: "high",
      })

      return {
        isHealthy: false,
        error: error.message,
        latency,
        details: { code: error.code || 'AUTH_ERROR' },
      }
    }

    // Log successful health check if latency is concerning
    if (latency > 5000) {
      await securityMonitor.logSecurityEvent({
        type: "database_slow_response",
        ip: "server",
        userAgent: "health-check",
        details: { latency },
        severity: "medium",
      })
    }

    return {
      isHealthy: true,
      latency,
    }
  } catch (error) {
    const latency = Date.now() - startTime

    await securityMonitor.logSecurityEvent({
      type: "database_health_check_failed",
      ip: "server",
      userAgent: "health-check",
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
        latency,
      },
      severity: "critical",
    })

    return {
      isHealthy: false,
      error: error instanceof Error ? error.message : "Unknown error",
      latency,
    }
  }
}

export const createClient = cache(() => {
  const cookieStore = cookies()

  if (!isSupabaseConfigured) {
    console.warn("Supabase environment variables are not properly configured. Using mock client.")

    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        signInWithPassword: () =>
          Promise.resolve({
            data: null,
            error: {
              message: "Supabase not configured - using demo mode",
              status: 503,
            },
          }),
        signUp: () =>
          Promise.resolve({
            data: null,
            error: {
              message: "Supabase not configured - using demo mode",
              status: 503,
            },
          }),
        signOut: () => Promise.resolve({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: (table: string) => ({
        select: (columns?: string) => ({
          single: () =>
            Promise.resolve({
              data: null,
              error: { message: `Demo mode: ${table} table not available`, code: "DEMO_MODE" },
            }),
          eq: (column: string, value: any) => ({
            single: () =>
              Promise.resolve({
                data: null,
                error: { message: `Demo mode: ${table} table not available`, code: "DEMO_MODE" },
              }),
            limit: (count: number) =>
              Promise.resolve({
                data: [],
                error: { message: `Demo mode: ${table} table not available`, code: "DEMO_MODE" },
              }),
          }),
          limit: (count: number) =>
            Promise.resolve({
              data: [],
              error: { message: `Demo mode: ${table} table not available`, code: "DEMO_MODE" },
            }),
        }),
        insert: (values: any) =>
          Promise.resolve({
            data: null,
            error: { message: `Demo mode: Cannot insert into ${table}`, code: "DEMO_MODE" },
          }),
        update: (values: any) => ({
          eq: (column: string, value: any) =>
            Promise.resolve({
              data: null,
              error: { message: `Demo mode: Cannot update ${table}`, code: "DEMO_MODE" },
            }),
        }),
        delete: () => ({
          eq: (column: string, value: any) =>
            Promise.resolve({
              data: null,
              error: { message: `Demo mode: Cannot delete from ${table}`, code: "DEMO_MODE" },
            }),
        }),
        upsert: (values: any) =>
          Promise.resolve({
            data: null,
            error: { message: `Demo mode: Cannot upsert into ${table}`, code: "DEMO_MODE" },
          }),
      }),
      storage: {
        from: (bucket: string) => ({
          upload: () =>
            Promise.resolve({
              data: null,
              error: { message: "Demo mode: Storage not available", code: "DEMO_MODE" },
            }),
          download: () =>
            Promise.resolve({
              data: null,
              error: { message: "Demo mode: Storage not available", code: "DEMO_MODE" },
            }),
        }),
      },
    }
  }

  try {
    const client = createServerComponentClient({ cookies: () => cookieStore })

    if (process.env.NODE_ENV === "development") {
      // Validate connection in development without depending on specific tables
      client.auth.getSession()
        .then(({ error }) => {
          if (error) {
            console.error("Supabase connection validation failed:", error)
          }
        })
        .catch((err) => {
          console.error("Supabase connection test failed:", err)
        })
    }

    return client
  } catch (error) {
    console.error("Failed to create Supabase client:", error)
    throw new Error("Database connection failed")
  }
})

export const createServerClient = createClient

export function getDatabaseUrl(): string | null {
  const urls = [process.env.DATABASE_URL, process.env.POSTGRES_URL, process.env.POSTGRES_PRISMA_URL].filter(Boolean)

  if (urls.length === 0) {
    return null
  }

  // Return the first valid URL
  for (const url of urls) {
    try {
      if (url && url.startsWith("postgres")) {
        new URL(url) // Validate URL format
        return url
      }
    } catch (error) {
      console.warn(`Invalid database URL format: ${url}`)
    }
  }

  return null
}

export function validateDatabaseConfig(): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Check Supabase configuration
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push("NEXT_PUBLIC_SUPABASE_URL is missing")
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing")
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    warnings.push("SUPABASE_SERVICE_ROLE_KEY is missing - admin operations will not work")
  }

  // Check direct database connection
  const dbUrl = getDatabaseUrl()
  if (!dbUrl) {
    warnings.push("No direct database URL found - some operations may be limited")
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}
