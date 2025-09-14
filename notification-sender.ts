// Funciones auxiliares para enviar notificaciones (modo demo)
import { isDemo } from "./supabase"

export const sendWelcomeNotification = async (email: string, name: string) => {
  if (isDemo()) {
    console.log(`[DEMO] Enviando bienvenida a ${name} (${email})`)
    return { success: true, demo: true }
  }

  // En producción, aquí iría la lógica real de notificación
  return { success: true }
}

export const sendRenewalNotification = async (email: string, name: string) => {
  if (isDemo()) {
    console.log(`[DEMO] Enviando notificación de renovación a ${name} (${email})`)
    return { success: true, demo: true }
  }

  // En producción, aquí iría la lógica real de notificación
  return { success: true }
}
