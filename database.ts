import { createClient } from "@supabase/supabase-js"
import { SecurityMonitor } from "@/lib/security-monitor"

const securityMonitor = new SecurityMonitor()

export function getDatabaseConnection(): string | null {
  const possibleUrls = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
  ]

  for (const url of possibleUrls) {
    if (url && typeof url === "string" && url.length > 0) {
      try {
        // Validate URL format
        const parsed = new URL(url)
        if (parsed.protocol === "postgres:" || parsed.protocol === "postgresql:") {
          return url
        }
      } catch (error) {
        console.warn(`Invalid database URL format: ${url}`)
      }
    }
  }

  console.warn("No valid DATABASE_URL found, using Supabase client instead")
  return null
}

export async function executeRawSQL(query: string, params: any[] = []) {
  const databaseUrl = getDatabaseConnection()

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for raw SQL operations")
  }

  const suspiciousPatterns = [
    /;\s*(DROP|DELETE|TRUNCATE|ALTER)\s+/i,
    /UNION\s+SELECT/i,
    /--\s*$/,
    /\/\*.*\*\//,
    /xp_cmdshell/i,
    /sp_executesql/i,
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(query)) {
      await securityMonitor.logSecurityEvent({
        type: "suspicious_sql_detected",
        ip: "server",
        userAgent: "database-util",
        details: {
          query: query.substring(0, 200),
          pattern: pattern.toString(),
        },
        severity: "critical",
      })
      throw new Error("Potentially dangerous SQL query detected")
    }
  }

  try {
    console.log("Executing SQL:", query.substring(0, 100) + "...", "with", params.length, "parameters")

    // In production, use proper PostgreSQL client
    // const { Client } = require('pg')
    // const client = new Client({
    //   connectionString: databaseUrl,
    //   ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    // })
    // await client.connect()
    // const result = await client.query(query, params)
    // await client.end()
    // return result

    return {
      success: true,
      message: "SQL executed successfully (simulated)",
      rowCount: 0,
    }
  } catch (error) {
    console.error("SQL execution error:", error)

    await securityMonitor.logSecurityEvent({
      type: "sql_execution_error",
      ip: "server",
      userAgent: "database-util",
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
        query: query.substring(0, 100),
      },
      severity: "high",
    })

    throw error
  }
}

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin configuration (URL or Service Role Key)")
  }

  // Validate URL format
  try {
    new URL(supabaseUrl)
  } catch (error) {
    throw new Error("Invalid Supabase URL format")
  }

  // Validate service role key format (should be a JWT)
  if (!serviceRoleKey.includes(".") || serviceRoleKey.split(".").length !== 3) {
    throw new Error("Invalid Supabase Service Role Key format")
  }

  try {
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          "X-Client-Info": "vip-bar-management-admin",
        },
      },
    })
  } catch (error) {
    console.error("Failed to create Supabase admin client:", error)
    throw new Error("Failed to initialize admin database client")
  }
}

export function isDemoMode(): boolean {
  const hasSupabaseUrl = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("tu-proyecto")
  )

  const hasDatabaseUrl = !!getDatabaseConnection()

  return !hasSupabaseUrl && !hasDatabaseUrl
}

export async function getDatabaseStatus(): Promise<{
  supabase: {
    configured: boolean
    connected?: boolean
    error?: string
  }
  directConnection: {
    available: boolean
    url?: string
  }
  mode: "production" | "demo"
  recommendations: string[]
}> {
  const recommendations: string[] = []

  // Check Supabase configuration
  const supabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  let supabaseConnected = false
  let supabaseError: string | undefined

  if (supabaseConfigured) {
    try {
      const admin = getSupabaseAdmin()
      const { error } = await admin.from("system_settings").select("setting_key").limit(1)

      if (error && !error.message.includes("No rows")) {
        supabaseError = error.message
      } else {
        supabaseConnected = true
      }
    } catch (error) {
      supabaseError = error instanceof Error ? error.message : "Connection failed"
    }
  }

  // Check direct database connection
  const directUrl = getDatabaseConnection()

  // Generate recommendations
  if (!supabaseConfigured) {
    recommendations.push("Configure Supabase environment variables for full functionality")
  }

  if (!directUrl) {
    recommendations.push("Consider adding DATABASE_URL for direct database operations")
  }

  if (supabaseConfigured && !supabaseConnected) {
    recommendations.push("Check Supabase connection and credentials")
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    recommendations.push("Add SUPABASE_SERVICE_ROLE_KEY for admin operations")
  }

  return {
    supabase: {
      configured: supabaseConfigured,
      connected: supabaseConnected,
      error: supabaseError,
    },
    directConnection: {
      available: !!directUrl,
      url: directUrl ? directUrl.replace(/:[^:@]*@/, ":***@") : undefined, // Mask password
    },
    mode: supabaseConfigured && supabaseConnected ? "production" : "demo",
    recommendations,
  }
}
