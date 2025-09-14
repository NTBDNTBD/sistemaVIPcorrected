import { getSupabaseClient, isDemo } from "./supabase"
import { sendMemberNotification } from "./notification-service-client"

export const checkExpiringMemberships = async () => {
  if (isDemo()) {
    console.log("Demo mode - skipping membership checks")
    return
  }

  try {
    const supabase = getSupabaseClient()

    const today = new Date()
    const warningDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 días

    // Buscar membresías que expiran en 7 días
    const { data: expiringMembers } = await supabase
      .from("vip_members")
      .select("*")
      .lte("membership_end", warningDate.toISOString().split("T")[0])
      .gte("membership_end", today.toISOString().split("T")[0])
      .eq("is_active", true)

    // Crear notificaciones para membresías por vencer
    if (expiringMembers) {
      for (const member of expiringMembers) {
        const daysLeft = Math.ceil(
          (new Date(member.membership_end).getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        )

        await supabase.from("membership_notifications").insert({
          member_id: member.id,
          notification_type: "expiring_soon",
          message: `La membresía de ${member.full_name} expira en ${daysLeft} días`,
        })

        // Enviar notificación automática
        await sendMemberNotification(member, "expiring", { daysLeft })
      }
    }

    // Buscar membresías vencidas
    const { data: expiredMembers } = await supabase
      .from("vip_members")
      .select("*")
      .lt("membership_end", today.toISOString().split("T")[0])
      .eq("is_active", true)

    // Desactivar membresías vencidas y crear notificaciones
    if (expiredMembers) {
      for (const member of expiredMembers) {
        await supabase.from("vip_members").update({ is_active: false }).eq("id", member.id)

        await supabase.from("membership_notifications").insert({
          member_id: member.id,
          notification_type: "expired",
          message: `La membresía de ${member.full_name} ha expirado`,
        })

        // Enviar notificación automática
        const daysExpired = Math.ceil(
          (today.getTime() - new Date(member.membership_end).getTime()) / (1000 * 60 * 60 * 24),
        )
        await sendMemberNotification(member, "expired", { daysExpired })
      }
    }
  } catch (error) {
    console.error("Error checking memberships:", error)
  }
}

export const renewMembership = async (memberId: string) => {
  if (isDemo()) {
    console.log("Demo mode - membership renewal simulated")
    return
  }

  try {
    const supabase = getSupabaseClient()

    const newEndDate = new Date()
    newEndDate.setDate(newEndDate.getDate() + 90) // 90 días

    const { error } = await supabase
      .from("vip_members")
      .update({
        membership_end: newEndDate.toISOString().split("T")[0],
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId)

    if (error) throw error

    // Crear notificación de renovación
    await supabase.from("membership_notifications").insert({
      member_id: memberId,
      notification_type: "renewed",
      message: "Membresía renovada exitosamente por 90 días más",
    })

    // Obtener datos del miembro para notificación
    const { data: member } = await supabase.from("vip_members").select("*").eq("id", memberId).single()

    if (member) {
      await sendMemberNotification(member, "renewed")
    }
  } catch (error) {
    console.error("Error renewing membership:", error)
    throw error
  }
}
