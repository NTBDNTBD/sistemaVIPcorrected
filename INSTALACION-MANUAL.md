# Instalación Manual del Sistema VIP Bar Management

## Archivos Requeridos

### 1. package.json
\`\`\`json
{
  "name": "vip-bar-management",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "bcryptjs": "^2.4.3",
    "next": "14.2.16",
    "react": "^18",
    "react-dom": "^18",
    "tailwindcss": "^3.4.1"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "eslint": "^8",
    "eslint-config-next": "14.2.16",
    "typescript": "^5"
  }
}
\`\`\`

### 2. .env.local (CREAR EN LA RAÍZ)
\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=https://hzhgbdhihpqffmoefmmv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6aGdiZGhpaHBxZmZtb2VmbW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MzQ5MjYsImV4cCI6MjA3MDUxMDkyNn0.0yHC5dB5YAAz-RZgLYz6h03i3OsqFFqSLdoNIh7ezpw
\`\`\`

## Pasos de Instalación

1. **Crear proyecto Next.js:**
   \`\`\`bash
   npx create-next-app@latest vip-bar-management --typescript --tailwind --eslint --app
   cd vip-bar-management
   \`\`\`

2. **Instalar dependencias adicionales:**
   \`\`\`bash
   npm install @supabase/supabase-js bcryptjs
   npm install -D @types/bcryptjs
   \`\`\`

3. **Crear archivo .env.local** con el contenido de arriba

4. **Ejecutar script SQL** en Supabase (scripts/verify-complete-system.sql)

5. **Copiar archivos del proyecto:**
   - app/login/page.tsx
   - lib/auth.ts
   - lib/supabase.ts
   - components/auth-guard.tsx

6. **Iniciar aplicación:**
   \`\`\`bash
   npm run dev
   \`\`\`

## Credenciales de Prueba
- Email: manager@barvip.com
- Contraseña: (configurada en Supabase Auth)
