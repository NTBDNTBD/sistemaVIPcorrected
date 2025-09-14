// Plantillas de mensajes para diferentes tipos de notificaciones

export interface NotificationData {
  memberName: string
  memberCode: string
  daysLeft?: number
  daysExpired?: number
  renewalLink?: string
  barName?: string
  contactPhone?: string
}

// Plantillas para SMS
export const smsTemplates = {
  welcome: (data: NotificationData) =>
    `¡Bienvenido ${data.memberName} al ${data.barName || "Bar VIP"}! 🍸 Tu membresía VIP está activa. Código: ${data.memberCode}. ¡Disfruta de todos los beneficios exclusivos!`,

  expiring: (data: NotificationData) =>
    `Hola ${data.memberName}, tu membresía VIP expira en ${data.daysLeft} días. Renueva ahora para seguir disfrutando de beneficios exclusivos. Código: ${data.memberCode}`,

  expired: (data: NotificationData) =>
    `${data.memberName}, tu membresía VIP expiró hace ${data.daysExpired} días. Renueva hoy y recupera todos tus beneficios exclusivos. Contacto: ${data.contactPhone || "Bar VIP"}`,

  renewed: (data: NotificationData) =>
    `¡Excelente ${data.memberName}! Tu membresía VIP ha sido renovada por 90 días más. Código: ${data.memberCode}. ¡Gracias por seguir siendo parte de nuestra familia VIP!`,
}

// Plantillas para WhatsApp
export const whatsappTemplates = {
  welcome: (data: NotificationData) =>
    `🍸 *¡Bienvenido al ${data.barName || "Bar VIP"}!* 🍸\n\nHola *${data.memberName}*,\n\n¡Tu membresía VIP está activa!\n\n✨ *Código de miembro:* ${data.memberCode}\n\n🎯 *Beneficios incluidos:*\n• Acceso a área VIP\n• Descuentos exclusivos\n• Programa de puntos\n• Eventos especiales\n\n¡Disfruta de la experiencia VIP! 🥂`,

  expiring: (data: NotificationData) =>
    `⏰ *Renovación de Membresía VIP* ⏰\n\nHola *${data.memberName}*,\n\nTu membresía VIP expira en *${data.daysLeft} días*.\n\n🔄 Renueva ahora para mantener:\n• Acceso VIP\n• Descuentos exclusivos\n• Puntos acumulados\n\n📱 *Código:* ${data.memberCode}\n\n¡No pierdas tus beneficios exclusivos!`,

  expired: (data: NotificationData) =>
    `😔 *Membresía VIP Expirada* 😔\n\nHola *${data.memberName}*,\n\nTu membresía VIP expiró hace *${data.daysExpired} días*.\n\n🔄 *¡Renueva hoy y recupera:*\n• Acceso completo al área VIP\n• Todos tus puntos acumulados\n• Descuentos exclusivos\n\n📞 Contacto: ${data.contactPhone || "Bar VIP"}\n\n¡Te esperamos de vuelta! 🍸`,

  renewed: (data: NotificationData) =>
    `🎉 *¡Membresía Renovada!* 🎉\n\n¡Excelente *${data.memberName}*!\n\nTu membresía VIP ha sido renovada por *90 días más*.\n\n✅ *Estado:* Activa\n🆔 *Código:* ${data.memberCode}\n\n¡Gracias por seguir siendo parte de nuestra familia VIP! 🥂✨`,
}

// Plantillas para Email
export const emailTemplates = {
  welcome: (data: NotificationData) => ({
    subject: `¡Bienvenido al ${data.barName || "Bar VIP"} - Membresía VIP Activada!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .welcome-badge { background: #4CAF50; color: white; padding: 10px 20px; border-radius: 25px; display: inline-block; margin: 20px 0; }
          .member-code { background: #fff; border: 2px dashed #667eea; padding: 15px; text-align: center; margin: 20px 0; border-radius: 8px; }
          .benefits { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .benefit-item { padding: 10px 0; border-bottom: 1px solid #eee; }
          .footer { text-align: center; padding: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🍸 ${data.barName || "Bar VIP"} 🍸</h1>
            <h2>¡Bienvenido a la Experiencia VIP!</h2>
          </div>
          <div class="content">
            <div class="welcome-badge">✨ MEMBRESÍA ACTIVADA ✨</div>
            
            <h3>Hola ${data.memberName},</h3>
            <p>¡Felicidades! Tu membresía VIP ha sido activada exitosamente. Ahora eres parte de nuestro exclusivo club de miembros VIP.</p>
            
            <div class="member-code">
              <h4>Tu Código de Miembro VIP</h4>
              <h2 style="color: #667eea; margin: 0;">${data.memberCode}</h2>
              <p><small>Presenta este código para acceder a todos los beneficios</small></p>
            </div>
            
            <div class="benefits">
              <h4>🎯 Tus Beneficios Exclusivos:</h4>
              <div class="benefit-item">🏆 Acceso prioritario al área VIP</div>
              <div class="benefit-item">💰 Descuentos exclusivos en bebidas premium</div>
              <div class="benefit-item">⭐ Programa de puntos y recompensas</div>
              <div class="benefit-item">🎉 Invitaciones a eventos especiales</div>
              <div class="benefit-item">🍸 Cocteles signature exclusivos</div>
              <div class="benefit-item">📱 Código QR personalizado</div>
            </div>
            
            <p><strong>Duración de la membresía:</strong> 90 días a partir de hoy</p>
            <p>¡Esperamos verte pronto y que disfrutes de todos los beneficios VIP!</p>
          </div>
          <div class="footer">
            <p>Gracias por elegir ${data.barName || "Bar VIP"}</p>
            <p>🥂 ¡Salud! 🥂</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `¡Bienvenido ${data.memberName} al ${data.barName || "Bar VIP"}! Tu membresía VIP está activa. Código: ${data.memberCode}. Disfruta de acceso VIP, descuentos exclusivos, programa de puntos y eventos especiales.`,
  }),

  expiring: (data: NotificationData) => ({
    subject: `⏰ Tu Membresía VIP expira en ${data.daysLeft} días - ¡Renueva Ahora!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .warning-badge { background: #ff9800; color: white; padding: 10px 20px; border-radius: 25px; display: inline-block; margin: 20px 0; }
          .renewal-cta { background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; margin: 20px 0; }
          .member-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Renovación de Membresía VIP</h1>
          </div>
          <div class="content">
            <div class="warning-badge">⚠️ EXPIRA EN ${data.daysLeft} DÍAS</div>
            
            <h3>Hola ${data.memberName},</h3>
            <p>Tu membresía VIP está próxima a expirar. No queremos que pierdas todos los beneficios exclusivos que has estado disfrutando.</p>
            
            <div class="member-info">
              <h4>Información de tu Membresía</h4>
              <p><strong>Código:</strong> ${data.memberCode}</p>
              <p><strong>Días restantes:</strong> ${data.daysLeft} días</p>
              <p><strong>Estado:</strong> Próxima a expirar</p>
            </div>
            
            <h4>🔄 Renueva ahora y mantén:</h4>
            <ul>
              <li>✅ Acceso completo al área VIP</li>
              <li>✅ Todos tus puntos acumulados</li>
              <li>✅ Descuentos exclusivos</li>
              <li>✅ Invitaciones a eventos especiales</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${data.renewalLink || "#"}" class="renewal-cta">🔄 RENOVAR MEMBRESÍA</a>
            </div>
            
            <p><small>Si tienes alguna pregunta, no dudes en contactarnos.</small></p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hola ${data.memberName}, tu membresía VIP expira en ${data.daysLeft} días. Renueva ahora para mantener todos tus beneficios exclusivos. Código: ${data.memberCode}`,
  }),

  expired: (data: NotificationData) => ({
    subject: `😔 Tu Membresía VIP ha Expirado - ¡Renueva y Recupera tus Beneficios!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .expired-badge { background: #e74c3c; color: white; padding: 10px 20px; border-radius: 25px; display: inline-block; margin: 20px 0; }
          .renewal-cta { background: #27ae60; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; margin: 20px 0; }
          .member-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e74c3c; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>😔 Membresía VIP Expirada</h1>
          </div>
          <div class="content">
            <div class="expired-badge">❌ EXPIRADA HACE ${data.daysExpired} DÍAS</div>
            
            <h3>Hola ${data.memberName},</h3>
            <p>Tu membresía VIP ha expirado, pero ¡aún puedes recuperar todos tus beneficios exclusivos!</p>
            
            <div class="member-info">
              <h4>Información de tu Membresía</h4>
              <p><strong>Código:</strong> ${data.memberCode}</p>
              <p><strong>Días desde expiración:</strong> ${data.daysExpired} días</p>
              <p><strong>Estado:</strong> Expirada</p>
            </div>
            
            <h4>🔄 Renueva hoy y recupera:</h4>
            <ul>
              <li>🏆 Acceso completo al área VIP</li>
              <li>⭐ Todos tus puntos acumulados</li>
              <li>💰 Descuentos exclusivos</li>
              <li>🎉 Invitaciones a eventos especiales</li>
              <li>🍸 Cocteles signature exclusivos</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${data.renewalLink || "#"}" class="renewal-cta">🔄 RENOVAR AHORA</a>
            </div>
            
            <p><strong>¡Te extrañamos!</strong> Nuestro equipo está listo para recibirte de vuelta con todos los honores VIP.</p>
            
            <p><small>Contacto: ${data.contactPhone || "Bar VIP"}</small></p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hola ${data.memberName}, tu membresía VIP expiró hace ${data.daysExpired} días. Renueva hoy y recupera todos tus beneficios exclusivos. Código: ${data.memberCode}. Contacto: ${data.contactPhone || "Bar VIP"}`,
  }),

  renewed: (data: NotificationData) => ({
    subject: `🎉 ¡Membresía VIP Renovada Exitosamente!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-badge { background: #4CAF50; color: white; padding: 10px 20px; border-radius: 25px; display: inline-block; margin: 20px 0; }
          .member-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50; }
          .celebration { text-align: center; font-size: 2em; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 ¡Membresía Renovada! 🎉</h1>
          </div>
          <div class="content">
            <div class="celebration">🥂✨🍸✨🥂</div>
            
            <div class="success-badge">✅ RENOVACIÓN EXITOSA</div>
            
            <h3>¡Excelente ${data.memberName}!</h3>
            <p>Tu membresía VIP ha sido renovada exitosamente por <strong>90 días más</strong>. ¡Gracias por seguir siendo parte de nuestra familia VIP!</p>
            
            <div class="member-info">
              <h4>Información Actualizada</h4>
              <p><strong>Código:</strong> ${data.memberCode}</p>
              <p><strong>Estado:</strong> ✅ Activa</p>
              <p><strong>Duración:</strong> 90 días</p>
              <p><strong>Beneficios:</strong> Todos restaurados</p>
            </div>
            
            <h4>🎯 Tus Beneficios VIP Continúan:</h4>
            <ul>
              <li>🏆 Acceso prioritario al área VIP</li>
              <li>💰 Descuentos exclusivos</li>
              <li>⭐ Programa de puntos activo</li>
              <li>🎉 Eventos especiales</li>
              <li>🍸 Cocteles signature</li>
            </ul>
            
            <div class="celebration">
              <p><strong>¡Nos vemos pronto en el área VIP!</strong></p>
              <p>🥂 ¡Salud por otros 90 días increíbles! 🥂</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `¡Excelente ${data.memberName}! Tu membresía VIP ha sido renovada por 90 días más. Código: ${data.memberCode}. ¡Gracias por seguir siendo parte de nuestra familia VIP!`,
  }),
}
