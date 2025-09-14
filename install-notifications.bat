@echo off
echo ========================================
echo  Instalando Sistema de Notificaciones
echo ========================================
echo.

echo Instalando dependencias adicionales...
call npm install twilio @sendgrid/mail @types/qrcode

if %errorlevel% neq 0 (
    echo ERROR: Fallo la instalacion de dependencias de notificaciones
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Sistema de Notificaciones Instalado!
echo ========================================
echo.
echo CONFIGURACION REQUERIDA:
echo.
echo 1. Consulta la documentacion para configurar servicios externos
echo 2. Copia .env.example a .env.local
echo 3. Completa las variables de entorno segun la documentacion
echo.
echo FUNCIONALIDADES:
echo - SMS automaticos
echo - WhatsApp automatico
echo - Emails HTML
echo - Notificaciones por vencimiento
echo - Mensajes de bienvenida
echo - Notificaciones de renovacion
echo.
echo Para probar en modo demo, simplemente inicia el servidor.
echo.
pause
