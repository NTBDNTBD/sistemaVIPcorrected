@echo off
echo ========================================
echo  Bar VIP Manager - Construir para Produccion
echo ========================================
echo.

echo Construyendo proyecto...
call npm run build

if %errorlevel% neq 0 (
    echo ERROR: Fallo la construccion
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Construccion completada!
echo ========================================
echo.
echo Para iniciar en modo produccion:
echo   npm start
echo.
pause
