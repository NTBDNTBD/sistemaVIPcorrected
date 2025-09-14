// Server-only Twilio functions
import { isDemo } from "./supabase"

// Configuración de Twilio (solo servidor)
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER

let twilioClient: any = null

export const getTwilioClient = () => {
  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials not configured")
  }

  if (!twilioClient) {
    const twilio = require("twilio")
    twilioClient = twilio(accountSid, authToken)
  }

  return twilioClient
}

// Enviar SMS (solo servidor)
export const sendSMS = async (to: string, message: string) => {
  if (isDemo()) {
    console.log(`[DEMO SMS] To: ${to}, Message: ${message}`)
    return { success: true, demo: true }
  }

  try {
    const client = getTwilioClient()
    const result = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: to,
    })

    return { success: true, sid: result.sid }
  } catch (error) {
    console.error("Error sending SMS:", error)
    throw error
  }
}

// Enviar WhatsApp (solo servidor)
export const sendWhatsApp = async (to: string, message: string) => {
  if (isDemo()) {
    console.log(`[DEMO WhatsApp] To: ${to}, Message: ${message}`)
    return { success: true, demo: true }
  }

  try {
    const client = getTwilioClient()
    const result = await client.messages.create({
      body: message,
      from: `whatsapp:${twilioWhatsAppNumber}`,
      to: `whatsapp:${to}`,
    })

    return { success: true, sid: result.sid }
  } catch (error) {
    console.error("Error sending WhatsApp:", error)
    throw error
  }
}

// Enviar Email (solo servidor)
export const sendEmail = async (to: string, subject: string, htmlContent: string, textContent?: string) => {
  if (isDemo()) {
    console.log(`[DEMO Email] To: ${to}, Subject: ${subject}`)
    return { success: true, demo: true }
  }

  try {
    console.log(`[Email would be sent] To: ${to}, Subject: ${subject}`)
    return { success: true, messageId: "demo-message-id" }
  } catch (error) {
    console.error("Error sending email:", error)
    throw error
  }
}
