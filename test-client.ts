import { createClient } from "@supabase/supabase-js"

export function createTestClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables")
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function testManagerLogin() {
  try {
    const supabase = createTestClient()

    // Check if manager exists in system_users
    const { data: user, error } = await supabase
      .from("system_users")
      .select(`
        *,
        user_roles (
          name,
          display_name,
          permissions
        )
      `)
      .eq("email", "manager@barvip.com")
      .eq("is_active", true)
      .single()

    if (error) {
      console.error("Manager user not found:", error.message)
      return { success: false, error: error.message }
    }

    console.log("Manager user found:", user)
    return { success: true, user }
  } catch (error) {
    console.error("Test failed:", error)
    return { success: false, error: error.message }
  }
}
