import type { User } from "./auth"

export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false

  // Admin users have all permissions
  if (user.role.name === "admin") return true

  // Check specific permission
  return user.role.permissions[permission] === true
}

export function generateSecurePassword(): string {
  const length = 12
  const lowercase = "abcdefghijklmnopqrstuvwxyz"
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const numbers = "0123456789"
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?"

  let password = ""

  // Ensure at least one character from each category
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]

  // Fill the rest randomly
  const allChars = lowercase + uppercase + numbers + symbols
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("")
}

export function validatePassword(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push("Mínimo 8 caracteres")
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Al menos una letra minúscula")
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Al menos una letra mayúscula")
  }

  if (!/\d/.test(password)) {
    errors.push("Al menos un número")
  }

  if (!/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) {
    errors.push("Al menos un carácter especial")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
