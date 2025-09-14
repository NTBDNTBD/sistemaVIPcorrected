// Client-side notification service (sin Twilio directo)
import { isDemo } from "./supabase"

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

// Enviar notificación usando API routes
export const sendMemberNotification = async (
  member: Member,
  type: "welcome" | "expiring" | "expired" | "renewed",
  additionalData: any = {},
) => {
  if (isDemo()) {
    console.log(`[DEMO] Sending ${type} notification to ${member.full_name}`)
    return [{ channel: "demo", success: true, demo: true }]
  }

  try {
    const response = await fetch("/api/notifications/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        memberId: member.id,
        type,
        additionalData,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to send notification")
    }

    const result = await response.json()
    return result.result || []
  } catch (error) {
    console.error("Error sending notification:", error)
    return [{ channel: "error", success: false, error: error.message }]
  }
}

// Procesar notificaciones automáticas
export const processAutomaticNotifications = async () => {
  if (isDemo()) {
    console.log("[DEMO] Processing automatic notifications...")
    return
  }

  try {
    const response = await fetch("/api/notifications/process", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to process notifications")
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error("Error processing notifications:", error)
    throw error
  }
}
