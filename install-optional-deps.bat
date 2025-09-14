@echo off
echo ========================================
echo  Instalando Dependencias Opcionales
echo ========================================
echo.

echo Instalando Twilio y SendGrid...
call npm install twilio @sendgrid/mail

if %errorlevel% neq 0 (
    echo ERROR: Fallo la instalacion
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Dependencias instaladas exitosamente!
echo ========================================
echo.
echo Las advertencias de modulos faltantes desapareceran.
echo El sistema seguira funcionando en modo demo.
echo.
pause
