import {
  getSupabaseClient as getSafeSupabaseClient,
  isSupabaseConfigured as checkSupabaseConfigured,
} from "./supabase/client"

let supabaseClient: ReturnType<typeof getSafeSupabaseClient> | null = null

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = getSafeSupabaseClient()
  }
  return supabaseClient
}

export const supabase = getSupabaseClient()

export const isSupabaseConfigured = checkSupabaseConfigured

export default getSupabaseClient
