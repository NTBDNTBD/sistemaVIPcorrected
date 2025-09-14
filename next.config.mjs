/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n: {
    locales: ['es'],
    defaultLocale: 'es',
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude server-only modules from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        child_process: false,
        'https-proxy-agent': false,
        'http-proxy-agent': false,
      }
    }
    return config
  },
  experimental: {
    serverComponentsExternalPackages: ['twilio', '@sendgrid/mail']
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    domains: ['hzhgbdhihpqffmoefmmv.supabase.co'],
  },
  async headers() {
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    const csp = isDevelopment 
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss: http: https: https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none';"
      : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; object-src 'none'; frame-ancestors 'none'; form-action 'self'; base-uri 'self';"

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: isDevelopment 
              ? 'http://localhost:3000' 
              : process.env.NEXT_PUBLIC_APP_URL || 'https://vip-bar-management.vercel.app',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400',
          },
        ],
      },
      {
        source: '/uploads/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/.well-known/security.txt',
        destination: '/api/security-txt',
      },
    ]
  },
}

export default nextConfig
