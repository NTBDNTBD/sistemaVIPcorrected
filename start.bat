@echo off
echo ========================================
echo  Bar VIP Manager - Iniciando Servidor
echo ========================================
echo.

echo Verificando instalacion...
if not exist "node_modules" (
    echo ERROR: Dependencias no instaladas.
    echo Ejecuta install.bat primero.
    pause
    exit /b 1
)

echo Iniciando servidor de desarrollo...
echo.
echo El proyecto estara disponible en: http://localhost:3000
echo.
echo Credenciales de demo:
echo   Email: demo@barvip.com
echo   Password: demo123
echo.
echo Presiona Ctrl+C para detener el servidor
echo.

call npm run dev
