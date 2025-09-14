"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { hybridDataService } from '@/lib/hybrid-data-service'

interface User {
  id: string
  email: string
  role: {
    name: string
    display_name: string
    permissions: {
      [key: string]: boolean
    }
  }
  name: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => void
  refreshUser: () => Promise<void>
  connectionStatus: 'online' | 'offline' | 'reconnecting'
  pendingOperations: number
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'reconnecting'>('online')
  const [pendingOperations, setPendingOperations] = useState(0)

  // Auto-login demo user on mount and setup monitoring
  useEffect(() => {
    const demoUser = {
      id: '1',
      email: 'manager@barvip.com',
      role: {
        name: 'admin',
        display_name: 'Administrador',
        permissions: {
          manage_users: true,
          manage_products: true,
          manage_inventory: true,
          view_reports: true,
          manage_sales: true,
          manage_members: true,
          manage_settings: true,
          view_analytics: true,
          manage_staff: true,
          manage_finances: true
        }
      },
      name: 'Demo Manager'
    }
    setUser(demoUser)
    setLoading(false)

    // Update connection status periodically
    const updateStatus = () => {
      setConnectionStatus(hybridDataService.getConnectionStatus())
      setPendingOperations(hybridDataService.getPendingOperationsCount())
    }

    updateStatus()
    const interval = setInterval(updateStatus, 2000)

    return () => clearInterval(interval)
  }, [])

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setLoading(true)
    
    try {
      // Try to authenticate with Supabase first (if online)
      if (hybridDataService.getConnectionStatus() === 'online') {
        try {
          // Here you would normally call Supabase auth
          // For now, we'll use demo authentication with hybrid data service
          const users = await hybridDataService.getData('users', { email })
          
          if (users.length > 0) {
            const authenticatedUser = users[0]
            setUser({
              id: authenticatedUser.id,
              email: authenticatedUser.email,
              role: authenticatedUser.role,
              name: authenticatedUser.name
            })
            setLoading(false)
            return true
          }
        } catch (error) {
          console.warn('Supabase authentication failed, falling back to demo:', error)
        }
      }
      
      // Demo credentials fallback with FULL ADMIN PERMISSIONS
      if (email === 'manager@barvip.com' && password === 'manager123') {
        const demoUser = {
          id: '1',
          email: 'manager@barvip.com',
          role: {
            name: 'admin',
            display_name: 'Administrador',
            permissions: {
              manage_users: true,
              manage_products: true,
              manage_inventory: true,
              view_reports: true,
              manage_sales: true,
              manage_members: true,
              manage_settings: true,
              view_analytics: true,
              manage_staff: true,
              manage_finances: true,
              create_products: true,
              delete_products: true,
              edit_products: true,
              create_users: true,
              delete_users: true,
              edit_users: true,
              view_all_data: true,
              export_data: true,
              import_data: true,
              system_admin: true
            }
          },
          name: 'Demo Manager'
        }
        setUser(demoUser)
        setLoading(false)
        return true
      }
      
      if (email === 'bartender@barvip.com' && password === 'bartender123') {
        const demoUser = {
          id: '2',
          email: 'bartender@barvip.com',
          role: {
            name: 'bartender',
            display_name: 'Bartender',
            permissions: {
              manage_products: true,
              manage_sales: true,
              view_reports: false,
              manage_inventory: true,
              manage_users: false,
              manage_members: false,
              manage_settings: false
            }
          },
          name: 'Demo Bartender'
        }
        setUser(demoUser)
        setLoading(false)
        return true
      }

      setLoading(false)
      return false
    } catch (error) {
      console.error('Login error:', error)
      setLoading(false)
      return false
    }
  }

  const refreshUser = async () => {
    // Refresh user data if needed
    if (user) {
      setUser({...user})
    }
  }

  const signOut = () => {
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signIn, 
      signOut,
      refreshUser,
      connectionStatus, 
      pendingOperations 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
