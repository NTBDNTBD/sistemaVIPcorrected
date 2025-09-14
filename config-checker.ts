export interface ConfigStatus {
  mode: "demo" | "production"
  supabase: {
    configured: boolean
    url: string | null
    hasAnonKey: boolean
  }
  notifications: {
    twilio: {
      configured: boolean
      hasSid: boolean
      hasToken: boolean
      hasPhone: boolean
    }
    sendgrid: {
      configured: boolean
      hasApiKey: boolean
      hasFromEmail: boolean
    }
  }
  security: {
    hasCronToken: boolean
  }
}

export function checkConfiguration(): ConfigStatus {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const twilioSid = process.env.TWILIO_ACCOUNT_SID
  const twilioToken = process.env.TWILIO_AUTH_TOKEN
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER
  const sendgridKey = process.env.SENDGRID_API_KEY
  const fromEmail = process.env.FROM_EMAIL
  const cronToken = process.env.NOTIFICATION_CRON_TOKEN

  const supabaseConfigured = !!(supabaseUrl && supabaseKey)
  const twilioConfigured = !!(twilioSid && twilioToken && twilioPhone)
  const sendgridConfigured = !!(sendgridKey && fromEmail)

  return {
    mode: supabaseConfigured ? "production" : "demo",
    supabase: {
      configured: supabaseConfigured,
      url: supabaseUrl || null,
      hasAnonKey: !!supabaseKey,
    },
    notifications: {
      twilio: {
        configured: twilioConfigured,
        hasSid: !!twilioSid,
        hasToken: !!twilioToken,
        hasPhone: !!twilioPhone,
      },
      sendgrid: {
        configured: sendgridConfigured,
        hasApiKey: !!sendgridKey,
        hasFromEmail: !!fromEmail,
      },
    },
    security: {
      hasCronToken: !!cronToken,
    },
  }
}

export function getConfigurationSteps(config: ConfigStatus): string[] {
  const steps: string[] = []

  if (!config.supabase.configured) {
    steps.push("Configurar Supabase (URL y API Key)")
    steps.push("Ejecutar scripts SQL en Supabase")
  }

  if (!config.notifications.twilio.configured) {
    steps.push("Configurar Twilio para SMS/WhatsApp (opcional)")
  }

  if (!config.notifications.sendgrid.configured) {
    steps.push("Configurar SendGrid para emails (opcional)")
  }

  if (!config.security.hasCronToken) {
    steps.push("Configurar token de seguridad para notificaciones")
  }

  if (steps.length === 0) {
    steps.push("¡Configuración completa! Sistema listo para producción")
  }

  return steps
}
