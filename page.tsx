import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function HomePage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-white">La EX's Bar VIP</h1>
          <p className="text-xl text-gray-300">Conecta Supabase para comenzar</p>
          <p className="text-sm text-gray-400">Configura las variables de entorno de Supabase en Project Settings</p>
        </div>
      </div>
    )
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  redirect("/dashboard")
}
