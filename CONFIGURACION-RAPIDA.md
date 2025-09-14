# 🚀 Configuración Rápida

## 1. Configurar Variables de Entorno

Después de descargar el proyecto:

1. **Crea el archivo `.env.local` en la raíz del proyecto:**

2. **Edita `.env.local` con tus credenciales reales:**

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=https://hzhgbdhihpqffmoefmmv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6aGdiZGhpaHBxZmZtb2VmbW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MzQ5MjYsImV4cCI6MjA3MDUxMDkyNn0.0yHC5dB5YAAz-RZgLYz6h03i3OsqFFqSLdoNIh7ezpw
\`\`\`

## 2. Instalar Dependencias

\`\`\`bash
npm install
\`\`\`

## 3. Ejecutar Scripts SQL en Supabase

Ve a tu proyecto Supabase → SQL Editor y ejecuta EN ORDEN:

1. `scripts/verify-complete-system.sql`

## 4. Iniciar Aplicación

\`\`\`bash
npm run dev
\`\`\`

## 5. Login de Prueba

- Email: `manager@barvip.com`
- Contraseña: (la que configuraste en Supabase Auth)

## Tus Credenciales Actuales:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=https://hzhgbdhihpqffmoefmmv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6aGdiZGhpaHBxZmZtb2VmbW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MzQ5MjYsImV4cCI6MjA3MDUxMDkyNn0.0yHC5dB5YAAz-RZgLYz6h03i3OsqFFqSLdoNIh7ezpw
