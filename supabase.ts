import { getSupabaseClient, isSupabaseConfigured, isDemo } from "./supabase/client"

export { isSupabaseConfigured, isDemo }

export const supabase = getSupabaseClient()

export const createClient = () => supabase
export { getSupabaseClient }
