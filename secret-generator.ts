import crypto from "crypto"

export function generateSecureSecret(length = 64): string {
  return crypto.randomBytes(length).toString("hex")
}

export function generateJWTSecret(): string {
  return generateSecureSecret(32)
}

export function generateAPIKey(): string {
  const prefix = "vip_bar_"
  const randomPart = crypto.randomBytes(24).toString("base64url")
  return `${prefix}${randomPart}`
}

export function generateDemoPassword(): string {
  const adjectives = ["secure", "strong", "robust", "solid", "safe"]
  const nouns = ["password", "key", "access", "auth", "login"]
  const year = new Date().getFullYear()
  const randomNum = Math.floor(Math.random() * 1000)

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]

  return `${adjective}-${noun}-${year}-${randomNum}`
}

export function validateSecretStrength(secret: string): {
  isStrong: boolean
  issues: string[]
  score: number
} {
  const issues: string[] = []
  let score = 0

  if (secret.length < 16) {
    issues.push("Secret should be at least 16 characters long")
  } else if (secret.length >= 32) {
    score += 2
  } else {
    score += 1
  }

  if (!/[a-z]/.test(secret)) {
    issues.push("Secret should contain lowercase letters")
  } else {
    score += 1
  }

  if (!/[A-Z]/.test(secret)) {
    issues.push("Secret should contain uppercase letters")
  } else {
    score += 1
  }

  if (!/\d/.test(secret)) {
    issues.push("Secret should contain numbers")
  } else {
    score += 1
  }

  if (!/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(secret)) {
    issues.push("Secret should contain special characters")
  } else {
    score += 1
  }

  // Check for common patterns
  if (/(.)\1{2,}/.test(secret)) {
    issues.push("Secret should not contain repeated characters")
    score -= 1
  }

  if (/123|abc|password|secret|admin/i.test(secret)) {
    issues.push("Secret should not contain common words or patterns")
    score -= 2
  }

  return {
    isStrong: issues.length === 0 && score >= 4,
    issues,
    score: Math.max(0, score),
  }
}
