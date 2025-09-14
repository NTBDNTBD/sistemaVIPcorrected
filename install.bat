@echo off
echo ========================================
echo  Bar VIP Manager - Instalacion Automatica
echo ========================================
echo.

echo Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado.
    echo Por favor instala Node.js desde: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js encontrado!
echo.

echo Instalando dependencias...
call npm install

if %errorlevel% neq 0 (
    echo ERROR: Fallo la instalacion de dependencias
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Instalacion completada exitosamente!
echo ========================================
echo.
echo Para ejecutar el proyecto:
echo   1. Ejecuta: start.bat
echo   2. O manualmente: npm run dev
echo.
echo El proyecto estara disponible en: http://localhost:3000
echo.
echo Para configuracion de produccion, consulta README.md
echo.
pause
