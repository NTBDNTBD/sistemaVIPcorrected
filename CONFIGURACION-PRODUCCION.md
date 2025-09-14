# Configuración para Modo Producción

## 🚀 Pasos para Cambiar de Demo a Producción

### 1. Configurar Supabase (OBLIGATORIO)

#### Crear Proyecto Supabase:
1. Ve a [supabase.com](https://supabase.com)
2. Crea una cuenta gratuita
3. Crea un nuevo proyecto
4. Espera a que se complete la configuración (2-3 minutos)

#### Obtener Credenciales:
1. Ve a **Settings** → **API**
2. Copia la **URL** del proyecto
3. Copia la **anon/public key**

#### Configurar Variables de Entorno:
Crea un archivo `.env.local` en la raíz del proyecto:

\`\`\`env
# Supabase Configuration (REQUERIDO)
NEXT_PUBLIC_SUPABASE_URL=https://hzhgbdhihpqffmoefmmv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6aGdiZGhpaHBxZmZtb2VmbW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MzQ5MjYsImV4cCI6MjA3MDUxMDkyNn0.0yHC5dB5YAAz-RZgLYz6h03i3OsqFFqSLdoNIh7ezpw

# Notificaciones (OPCIONAL)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=tu_auth_token_aqui
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=+14155238886

SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@tudominio.com

# Seguridad
NOTIFICATION_CRON_TOKEN=mi_token_secreto_123
\`\`\`

### 2. Ejecutar Scripts SQL

En Supabase → **SQL Editor**, ejecuta este script:

1. **Script:** Configuración completa (scripts/verify-complete-system.sql)

### 3. Reiniciar Aplicación

\`\`\`bash
# Detener con Ctrl+C
npm run dev
\`\`\`

### 4. Verificar Modo Producción

- Ve a `/setup` - Debe decir "Modo Producción"
- Inicia sesión con: `manager@barvip.com` / (tu contraseña)
- Los datos se guardan en Supabase, no en localStorage

## 📱 Configuraciones Opcionales

### Twilio (SMS/WhatsApp)
1. Crea cuenta en [twilio.com](https://twilio.com)
2. Obtén Account SID y Auth Token
3. Compra un número de teléfono
4. Agrega las variables al .env.local

### SendGrid (Email)
1. Crea cuenta en [sendgrid.com](https://sendgrid.com)
2. Crea una API Key
3. Verifica un dominio de envío
4. Agrega las variables al .env.local

## 🚀 Despliegue en Producción

### Vercel (Recomendado)
1. Sube tu código a GitHub
2. Conecta el repositorio en [vercel.com](https://vercel.com)
3. Configura las mismas variables de entorno
4. Despliega automáticamente

### Servidor Propio
\`\`\`bash
npm run build
npm start
\`\`\`

## ✅ Checklist de Producción

- [ ] Supabase configurado
- [ ] Scripts SQL ejecutados
- [ ] Variables de entorno configuradas
- [ ] Aplicación reiniciada
- [ ] Modo producción verificado
- [ ] Contraseñas por defecto cambiadas
- [ ] SSL habilitado (en despliegue)
- [ ] Backups configurados

## 🔐 Usuario Administrador

- **Admin:** manager@barvip.com / (tu contraseña configurada)

**IMPORTANTE:** Este usuario tiene todos los permisos administrativos.

## 🆘 Solución de Problemas

### Sigue en Modo Demo
- Verifica que el archivo .env.local esté en la raíz
- Verifica que las variables empiecen con NEXT_PUBLIC_
- Reinicia la aplicación

### Error de Base de Datos
- Verifica que ejecutaste el script SQL
- Verifica que la URL y API Key sean correctas
- Revisa los logs en Supabase

### No Puede Iniciar Sesión
- Crea el usuario manager@barvip.com en Supabase Auth
- Verifica que la tabla system_users tenga datos
\`\`\`

\`\`\`plaintext file="PASOS-PRODUCCION.txt"
PASOS RÁPIDOS PARA MODO PRODUCCIÓN
==================================

1. CREAR PROYECTO SUPABASE
   - Ve a supabase.com
   - Crea cuenta y nuevo proyecto
   - Copia URL y API Key

2. CREAR ARCHIVO .env.local
   - En la raíz del proyecto
   - Agregar:
     NEXT_PUBLIC_SUPABASE_URL=https://hzhgbdhihpqffmoefmmv.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key_aqui

3. EJECUTAR SCRIPT SQL EN SUPABASE
   - Ve a SQL Editor en Supabase
   - Ejecuta: scripts/verify-complete-system.sql

4. CREAR USUARIO EN SUPABASE AUTH
   - Ve a Authentication → Users
   - Crear: manager@barvip.com con tu contraseña

5. REINICIAR APLICACIÓN
   - Ctrl+C para detener
   - npm run dev para reiniciar

6. VERIFICAR
   - Ve a /setup
   - Debe decir "Modo Producción"
   - Login: manager@barvip.com / tu_contraseña

LISTO! Ya está en producción con base de datos real.

OPCIONAL:
- Configurar Twilio para SMS
- Configurar SendGrid para emails
- Desplegar en Vercel
