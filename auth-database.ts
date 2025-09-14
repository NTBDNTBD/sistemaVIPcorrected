// lib/auth-database.ts - Implementación real con Supabase
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // ¡Usa la service role key!

// Cliente con permisos de admin para operaciones de servidor
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface UserData {
  id: string
  email: string
  role: string
  permissions: Record<string, any>
  isActive: boolean
  lastLoginAt?: Date
}

// Hash del token para seguridad (no almacenamos el token completo)
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function validateRefreshTokenInDatabase(userId: string, refreshToken: string): Promise<boolean> {
  try {
    const tokenHash = hashToken(refreshToken)
    
    const { data, error } = await supabaseAdmin
      .from('refresh_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('token_hash', tokenHash)
      .eq('is_revoked', false)
      .single()
    
    if (error || !data) {
      console.log('Refresh token not found in database')
      return false
    }
    
    // Verificar si el token ha expirado
    const expiresAt = new Date(data.expires_at)
    if (expiresAt < new Date()) {
      console.log('Refresh token expired, revoking...')
      // Marcar como revocado
      await supabaseAdmin
        .from('refresh_tokens')
        .update({ 
          is_revoked: true, 
          revoked_at: new Date().toISOString() 
        })
        .eq('id', data.id)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Database validation error:', error)
    return false
  }
}

export async function getUserData(userId: string): Promise<UserData | null> {
  try {
    // Primero obtener datos básicos del usuario de auth.users
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (authError || !authUser.user) {
      console.log('User not found in auth.users')
      return null
    }

    // Luego obtener datos adicionales de tu tabla de perfiles/usuarios
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles') // Ajusta el nombre de tu tabla
      .select('role, permissions, is_active, last_login_at')
      .eq('user_id', userId)
      .single()
    
    // Si no tienes tabla de perfiles, usa valores por defecto
    const userData = {
      id: authUser.user.id,
      email: authUser.user.email!,
      role: profile?.role || 'user',
      permissions: profile?.permissions || {},
      isActive: profile?.is_active !== false, // true por defecto
      lastLoginAt: profile?.last_login_at ? new Date(profile.last_login_at) : undefined
    }
    
    return userData
  } catch (error) {
    console.error('Database lookup error:', error)
    return null
  }
}

export async function storeRefreshToken(
  userId: string, 
  refreshToken: string, 
  expiresAt: Date,
  deviceInfo?: string,
  ipAddress?: string
): Promise<boolean> {
  try {
    const tokenHash = hashToken(refreshToken)
    
    const { error } = await supabaseAdmin
      .from('refresh_tokens')
      .insert({
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        is_revoked: false,
        device_info: deviceInfo,
        ip_address: ipAddress,
        created_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('Error storing refresh token:', error)
      return false
    }
    
    console.log('Refresh token stored successfully for user:', userId)
    return true
  } catch (error) {
    console.error('Database storage error:', error)
    return false
  }
}

export async function revokeRefreshToken(userId: string, refreshToken?: string): Promise<boolean> {
  try {
    let query = supabaseAdmin
      .from('refresh_tokens')
      .update({ 
        is_revoked: true, 
        revoked_at: new Date().toISOString() 
      })
      .eq('user_id', userId)
      .eq('is_revoked', false) // Solo revocar tokens activos
    
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken)
      query = query.eq('token_hash', tokenHash)
    }
    
    const { error } = await query
    
    if (error) {
      console.error('Error revoking refresh token:', error)
      return false
    }
    
    console.log('Refresh token(s) revoked for user:', userId)
    return true
  } catch (error) {
    console.error('Database revocation error:', error)
    return false
  }
}

export async function cleanupExpiredTokens(): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('refresh_tokens')
      .update({ 
        is_revoked: true, 
        revoked_at: new Date().toISOString() 
      })
      .lt('expires_at', new Date().toISOString())
      .eq('is_revoked', false)
    
    if (error) {
      console.error('Error cleaning up tokens:', error)
    } else {
      console.log('Cleaned up expired refresh tokens')
    }
  } catch (error) {
    console.error('Token cleanup error:', error)
  }
}

// Función adicional: Obtener todos los tokens activos de un usuario
export async function getUserActiveTokens(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('refresh_tokens')
      .select('id, created_at, expires_at, device_info, ip_address')
      .eq('user_id', userId)
      .eq('is_revoked', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
    
    return data || []
  } catch (error) {
    console.error('Error fetching user tokens:', error)
    return []
  }
}

// Función adicional: Revocar todos los tokens excepto el actual
export async function revokeOtherTokens(userId: string, currentToken: string): Promise<boolean> {
  try {
    const currentTokenHash = hashToken(currentToken)
    
    const { error } = await supabaseAdmin
      .from('refresh_tokens')
      .update({ 
        is_revoked: true, 
        revoked_at: new Date().toISOString() 
      })
      .eq('user_id', userId)
      .eq('is_revoked', false)
      .neq('token_hash', currentTokenHash)
    
    return !error
  } catch (error) {
    console.error('Error revoking other tokens:', error)
    return false
  }
}