# 📱 Sistema de Notificaciones Automáticas

## 🎯 Funcionalidades Implementadas

### **Tipos de Notificaciones**
- ✅ **Bienvenida**: Al crear nueva membresía
- ✅ **Por Vencer**: 7 días antes de expirar
- ✅ **Vencida**: Hasta 7 días después de expirar
- ✅ **Renovación**: Al renovar membresía

### **Canales de Comunicación**
- 📱 **SMS** con Twilio
- 💬 **WhatsApp** con Twilio Business API
- 📧 **Email HTML** con SendGrid

## 🔧 Configuración

### **1. Crear Cuentas**
- **Twilio**: https://twilio.com (SMS + WhatsApp)
- **SendGrid**: https://sendgrid.com (Email)

### **2. Variables de Entorno**
Copia `.env.example` a `.env.local` y completa:

\`\`\`env
# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=+14155238886

# SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
FROM_EMAIL=noreply@tubarvip.com

# Configuración del Bar
NEXT_PUBLIC_BAR_NAME="Tu Bar VIP"
NEXT_PUBLIC_CONTACT_PHONE="+1234567890"
\`\`\`

### **3. Configurar Twilio WhatsApp**
1. En Twilio Console → Messaging → Try it out → Send a WhatsApp message
2. Sigue las instrucciones para configurar tu número de WhatsApp Business
3. Usa el número sandbox para pruebas: `+14155238886`

## 🚀 Uso del Sistema

### **Notificaciones Automáticas**
El sistema verifica automáticamente:
- Cada día busca membresías por vencer (7 días antes)
- Cada día busca membresías vencidas (hasta 7 días después)
- Envía notificaciones por todos los canales habilitados

### **Notificaciones Manuales**
\`\`\`javascript
// Enviar bienvenida
await sendWelcomeNotification(memberId)

// Enviar renovación
await sendRenewalNotification(memberId)

// Procesar todas las automáticas
await processAutomaticNotifications()
\`\`\`

### **API Endpoints**
- `POST /api/notifications/process` - Procesar automáticas
- `POST /api/notifications/send` - Enviar manual

## 📊 Panel de Notificaciones

Accede a `/notifications` para:
- Ver historial de notificaciones enviadas
- Estadísticas por canal (SMS, WhatsApp, Email)
- Configurar preferencias
- Procesar notificaciones manualmente

## 🎨 Plantillas de Mensajes

### **SMS** (160 caracteres)
- Mensajes concisos y directos
- Incluye código de miembro
- Call-to-action claro

### **WhatsApp** (Formato enriquecido)
- Emojis y formato markdown
- Mensajes más detallados
- Información estructurada

### **Email** (HTML completo)
- Diseño profesional con CSS
- Información completa de beneficios
- Botones de acción
- Responsive design

## 🔄 Automatización

### **Cron Job Recomendado**
\`\`\`bash
# Ejecutar cada hora
0 * * * * curl -X POST https://tubarvip.com/api/notifications/process
\`\`\`

### **Vercel Cron (vercel.json)**
\`\`\`json
{
  "crons": [
    {
      "path": "/api/notifications/process",
      "schedule": "0 */6 * * *"
    }
  ]
}
\`\`\`

## 🛡️ Seguridad

- Token de autorización para endpoints
- Logs de todas las notificaciones
- Manejo de errores robusto
- Rate limiting recomendado

## 📈 Métricas

El sistema registra:
- Total de notificaciones enviadas
- Tasa de éxito por canal
- Errores y fallos
- Tiempo de envío
- Preferencias de usuario

## 🧪 Modo Demo

Sin configuración, el sistema funciona en modo demo:
- Simula envío de notificaciones
- Muestra logs en consola
- Permite probar toda la funcionalidad
- No requiere cuentas externas

## 🚨 Solución de Problemas

### **Error: Twilio credentials not configured**
- Verifica TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN
- Asegúrate que estén en .env.local

### **Error: SendGrid API key invalid**
- Verifica SENDGRID_API_KEY
- Confirma que el dominio esté verificado

### **WhatsApp no funciona**
- Verifica que el número esté en sandbox
- Envía "join [sandbox-name]" al número de Twilio

### **Notificaciones no se envían**
- Revisa los logs en `/notifications`
- Verifica que los miembros tengan teléfono/email
- Confirma que las preferencias estén habilitadas

## 💡 Mejoras Futuras

- [ ] Plantillas personalizables por usuario
- [ ] Integración con más proveedores (Mailgun, etc.)
- [ ] Notificaciones push para móviles
- [ ] A/B testing de mensajes
- [ ] Análisis de engagement
- [ ] Programación de envíos
