"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { signOut } from "@/lib/actions"
import {
  LayoutDashboard,
  ShoppingCart,
  CreditCard,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  Users,
  Package,
  QrCode,
} from "lucide-react"
import type { User } from "@/lib/auth"

interface DashboardNavProps {
  user: User
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "POS", href: "/pos", icon: ShoppingCart },
  { name: "Transacciones", href: "/transactions", icon: CreditCard },
  { name: "Productos", href: "/products", icon: Package },
  { name: "Códigos QR", href: "/qr-codes", icon: QrCode },
  { name: "Miembros VIP", href: "/members", icon: Users },
  { name: "Reportes", href: "/reports", icon: BarChart3 },
  { name: "Notificaciones", href: "/notifications", icon: Bell },
  { name: "Configuración", href: "/settings", icon: Settings },
]

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-lg font-semibold">La EX's Bar VIP</h1>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn("w-full justify-start", isActive && "bg-secondary")}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="flex items-center space-x-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              {user.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.role.display_name}</p>
          </div>
        </div>
        <form action={signOut}>
          <Button variant="outline" size="sm" className="w-full bg-transparent">
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </form>
      </div>
    </div>
  )
}
