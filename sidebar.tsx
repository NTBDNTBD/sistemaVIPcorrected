"use client"

import { Link } from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Rocket } from "lucide-react"

const Sidebar = () => {
  const pathname = usePathname()

  return (
    <div className="flex flex-col space-y-4">
      {/* ... otros elementos existentes */}
      <Link
        href="/settings"
        className={cn(
          "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          pathname === "/settings"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
        )}
      >
        {/* ... icono y texto existentes */}
        <span>Configuración</span>
      </Link>
      {hasPermission("manage_users") && (
        <Link
          href="/setup"
          className={cn(
            "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            pathname === "/setup"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          <Rocket className="h-4 w-4" />
          <span>Configuración Producción</span>
        </Link>
      )}
      {/* rest of code here */}
    </div>
  )
}

export default Sidebar
