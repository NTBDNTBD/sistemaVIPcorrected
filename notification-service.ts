import { getSupabaseClient, isDemo } from "./supabase"
import { sendSMS, sendWhatsApp } from "./twilio"
import { sendEmail } from "./email-service"
import { smsTemplates, whatsappTemplates, emailTemplates, type NotificationData } from "./notification-templates"

export interface Member {
  id: string
  member_code: string
  full_name: string
  email: string
  phone: string
  membership_end: string
  is_active: boolean
  notification_preferences?: {
    sms: boolean
    whatsapp: boolean
    email: boolean
  }
}

export interface NotificationLog {
  id?: string
  member_id: string
  notification_type: "welcome" | "expiring" | "expired" | "renewed"
  channel: "sms" | "whatsapp" | "email"
  status: "sent" | "failed" | "demo"
  message: string
  sent_at: string
  error_message?: string
}

// Configuración del bar
const BAR_CONFIG = {
  name: process.env.NEXT_PUBLIC_BAR_NAME || "Bar VIP",
  contactPhone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "+50364506035",
  renewalLink: process.env.NEXT_PUBLIC_RENEWAL_LINK || "https://barvip.com/renovar",
  contactEmail: process.env.GMAIL_USER || "laexbarvip.lomejor@gmail.com",
}

// Registrar log de notificación
const logNotification = async (log: NotificationLog) => {
  if (isDemo()) {
    console.log("[DEMO] Notification Log:", log)
    return
  }

  try {
    const supabase = getSupabaseClient()
    await supabase.from("notification_logs").insert(log)
  } catch (error) {
    console.error("Error logging notification:", error)
  }
}

// Enviar notificación por canal específico
const sendNotificationByChannel = async (
  member: Member,
  type: "welcome" | "expiring" | "expired" | "renewed",
  channel: "sms" | "whatsapp" | "email",
  data: NotificationData,
) => {
  const log: NotificationLog = {
    member_id: member.id,
    notification_type: type,
    channel,
    status: "failed",
    message: "",
    sent_at: new Date().toISOString(),
  }

  try {
    let result
    let message = ""

    switch (channel) {
      case "sms":
        message = smsTemplates[type](data)
        result = await sendSMS(member.phone, message)
        break

      case "whatsapp":
        message = whatsappTemplates[type](data)
        result = await sendWhatsApp(member.phone, message)
        break

      case "email":
        const emailTemplate = emailTemplates[type](data)
        message = emailTemplate.subject
        result = await sendEmail(member.email, emailTemplate.subject, emailTemplate.html, emailTemplate.text)
        break

      default:
        throw new Error(`Unsupported channel: ${channel}`)
    }

    log.status = result.demo ? "demo" : "sent"
    log.message = message

    await logNotification(log)
    return { success: true, ...result }
  } catch (error: any) {
    log.error_message = error.message
    await logNotification(log)
    throw error
  }
}

// Enviar notificación completa (todos los canales habilitados)
export const sendMemberNotification = async (
  member: Member,
  type: "welcome" | "expiring" | "expired" | "renewed",
  additionalData: Partial<NotificationData> = {},
) => {
  const data: NotificationData = {
    memberName: member.full_name,
    memberCode: member.member_code,
    barName: BAR_CONFIG.name,
    contactPhone: BAR_CONFIG.contactPhone,
    renewalLink: BAR_CONFIG.renewalLink,
    ...additionalData,
  }

  const preferences = member.notification_preferences || {
    sms: true,
    whatsapp: true,
    email: true,
  }

  const results = []

  // Enviar por SMS si está habilitado
  if (preferences.sms && member.phone) {
    try {
      const result = await sendNotificationByChannel(member, type, "sms", data)
      results.push({ channel: "sms", ...result })
    } catch (error) {
      results.push({ channel: "sms", success: false, error: error.message })
    }
  }

  // Enviar por WhatsApp si está habilitado
  if (preferences.whatsapp && member.phone) {
    try {
      const result = await sendNotificationByChannel(member, type, "whatsapp", data)
      results.push({ channel: "whatsapp", ...result })
    } catch (error) {
      results.push({ channel: "whatsapp", success: false, error: error.message })
    }
  }

  // Enviar por Email si está habilitado
  if (preferences.email && member.email) {
    try {
      const result = await sendNotificationByChannel(member, type, "email", data)
      results.push({ channel: "email", ...result })
    } catch (error) {
      results.push({ channel: "email", success: false, error: error.message })
    }
  }

  return results
}

// Verificar y enviar notificaciones automáticas
export const processAutomaticNotifications = async () => {
  if (isDemo()) {
    console.log("[DEMO] Processing automatic notifications...")
    return
  }

  try {
    const supabase = getSupabaseClient()
    const today = new Date()

    // 1. Notificaciones de membresías por vencer (7 días antes)
    const warningDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const { data: expiringMembers } = await supabase
      .from("vip_members")
      .select("*")
      .eq("is_active", true)
      .lte("membership_end", warningDate.toISOString().split("T")[0])
      .gte("membership_end", today.toISOString().split("T")[0])

    if (expiringMembers) {
      for (const member of expiringMembers) {
        const daysLeft = Math.ceil(
          (new Date(member.membership_end).getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        )

        // Verificar si ya se envió notificación hoy
        const { data: existingLog } = await supabase
          .from("notification_logs")
          .select("id")
          .eq("member_id", member.id)
          .eq("notification_type", "expiring")
          .gte("sent_at", today.toISOString().split("T")[0])
          .limit(1)

        if (!existingLog || existingLog.length === 0) {
          await sendMemberNotification(member, "expiring", { daysLeft })
        }
      }
    }

    // 2. Notificaciones de membresías vencidas (hasta 7 días después)
    const expiredStartDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const { data: expiredMembers } = await supabase
      .from("vip_members")
      .select("*")
      .lt("membership_end", today.toISOString().split("T")[0])
      .gte("membership_end", expiredStartDate.toISOString().split("T")[0])

    if (expiredMembers) {
      for (const member of expiredMembers) {
        const daysExpired = Math.ceil(
          (today.getTime() - new Date(member.membership_end).getTime()) / (1000 * 60 * 60 * 24),
        )

        // Verificar si ya se envió notificación hoy
        const { data: existingLog } = await supabase
          .from("notification_logs")
          .select("id")
          .eq("member_id", member.id)
          .eq("notification_type", "expired")
          .gte("sent_at", today.toISOString().split("T")[0])
          .limit(1)

        if (!existingLog || existingLog.length === 0) {
          await sendMemberNotification(member, "expired", { daysExpired })

          // Desactivar membresía si no está ya desactivada
          if (member.is_active) {
            await supabase.from("vip_members").update({ is_active: false }).eq("id", member.id)
          }
        }
      }
    }

    console.log("Automatic notifications processed successfully")
  } catch (error) {
    console.error("Error processing automatic notifications:", error)
    throw error
  }
}

// Enviar notificación de bienvenida a nuevo miembro
export const sendWelcomeNotification = async (memberId: string) => {
  try {
    const supabase = getSupabaseClient()
    const { data: member } = await supabase.from("vip_members").select("*").eq("id", memberId).single()

    if (member) {
      await sendMemberNotification(member, "welcome")
    }
  } catch (error) {
    console.error("Error sending welcome notification:", error)
    throw error
  }
}

// Enviar notificación de renovación
export const sendRenewalNotification = async (memberId: string) => {
  try {
    const supabase = getSupabaseClient()
    const { data: member } = await supabase.from("vip_members").select("*").eq("id", memberId).single()

    if (member) {
      await sendMemberNotification(member, "renewed")
    }
  } catch (error) {
    console.error("Error sending renewal notification:", error)
    throw error
  }
}
