export const SECURITY_CONFIG = {
  // CORS settings
  ALLOWED_ORIGINS:
    process.env.NODE_ENV === "production"
      ? ["https://vip-bar-management.vercel.app"]
      : ["http://localhost:3000", "http://127.0.0.1:3000"],

  // Rate limiting
  RATE_LIMIT: {
    LOGIN_ATTEMPTS: 5,
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    API_REQUESTS: 100,
    API_WINDOW_MS: 60 * 1000, // 1 minute
  },

  // File upload limits
  UPLOAD_LIMITS: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ["image/jpeg", "image/png", "image/webp"],
    MAX_FILES: 10,
  },

  // JWT settings
  JWT: {
    ACCESS_TOKEN_EXPIRY: "15m",
    REFRESH_TOKEN_EXPIRY: "7d",
    COOKIE_OPTIONS: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      path: "/",
    },
  },

  // CSP directives
  CSP: {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", "https://hzhgbdhihpqffmoefmmv.supabase.co", "wss://hzhgbdhihpqffmoefmmv.supabase.co"],
    "frame-ancestors": ["'none'"],
  },
}
