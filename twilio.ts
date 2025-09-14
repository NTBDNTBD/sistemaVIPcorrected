import twilio from "twilio"

// Configuración de Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER

let twilioClient: twilio.Twilio | null = null

export const getTwilioClient = () => {
  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials not configured")
  }

  if (!twilioClient) {
    twilioClient = twilio(accountSid, authToken)
  }

  return twilioClient
}

export const isDemo = () => {
  return !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN
}

// Enviar SMS
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

// Enviar WhatsApp
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
