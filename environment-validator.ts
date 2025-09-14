interface EnvironmentConfig {
  required: string[]
  optional: string[]
  production: string[]
}

const ENV_CONFIG: EnvironmentConfig = {
  required: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "JWT_SECRET"],
  optional: [
    "GMAIL_USER",
    "GMAIL_APP_PASSWORD",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "SENDGRID_API_KEY",
    "DATADOG_API_KEY",
  ],
  production: ["DATABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SECURITY_ALERT_EMAIL", "SECURITY_ALERT_PHONE"],
}

export interface ValidationResult {
  isValid: boolean
  missing: string[]
  warnings: string[]
  errors: string[]
}

export function validateEnvironment(): ValidationResult {
  const missing: string[] = []
  const warnings: string[] = []
  const errors: string[] = []

  // Check required variables
  for (const envVar of ENV_CONFIG.required) {
    if (!process.env[envVar]) {
      missing.push(envVar)
    }
  }

  // Check production-specific variables
  if (process.env.NODE_ENV === "production") {
    for (const envVar of ENV_CONFIG.production) {
      if (!process.env[envVar]) {
        missing.push(envVar)
      }
    }
  }

  // Validate JWT secret strength
  const jwtSecret = process.env.JWT_SECRET
  if (jwtSecret) {
    if (jwtSecret.length < 32) {
      errors.push("JWT_SECRET must be at least 32 characters long")
    }
    if (jwtSecret === "04bcb4ef-d8ab-4656-b0ba-f8a3b2f8a352") {
      errors.push("JWT_SECRET is using default value - change it immediately!")
    }
  }

  // Check for default/example values
  const dangerousDefaults = [
    { key: "TWILIO_AUTH_TOKEN", value: "8d53a7a867bb1de65341a35e261ff19f" },
    { key: "GMAIL_APP_PASSWORD", value: "axmh htdg jrhp kggk" },
    { key: "NEXT_PUBLIC_SUPABASE_URL", value: "https://your-project.supabase.co" },
  ]

  for (const { key, value } of dangerousDefaults) {
    if (process.env[key] === value) {
      errors.push(`${key} is using example/default value - update with real credentials`)
    }
  }

  // Check optional integrations
  for (const envVar of ENV_CONFIG.optional) {
    if (!process.env[envVar]) {
      warnings.push(`${envVar} not set - related features will use demo mode`)
    }
  }

  return {
    isValid: missing.length === 0 && errors.length === 0,
    missing,
    warnings,
    errors,
  }
}

export function logEnvironmentStatus(): void {
  const validation = validateEnvironment()

  if (validation.isValid) {
    console.log("✅ Environment configuration is valid")
  } else {
    console.error("❌ Environment configuration issues found:")

    if (validation.missing.length > 0) {
      console.error("Missing required variables:", validation.missing)
    }

    if (validation.errors.length > 0) {
      console.error("Configuration errors:", validation.errors)
    }
  }

  if (validation.warnings.length > 0) {
    console.warn("⚠️ Configuration warnings:", validation.warnings)
  }
}

// Auto-validate on import in development
if (process.env.NODE_ENV === "development") {
  logEnvironmentStatus()
}
