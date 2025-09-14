# PowerShell script alternativo para instalacion
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Bar VIP Manager - Instalacion PowerShell" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
Write-Host "Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js no esta instalado." -ForegroundColor Red
    Write-Host "Por favor instala Node.js desde: https://nodejs.org/" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host ""
Write-Host "Instalando dependencias..." -ForegroundColor Yellow

# Instalar dependencias
try {
    npm install
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host " Instalacion completada exitosamente!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Para ejecutar el proyecto:" -ForegroundColor Cyan
    Write-Host "  1. Ejecuta: .\start.ps1" -ForegroundColor White
    Write-Host "  2. O manualmente: npm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "El proyecto estara disponible en: http://localhost:3000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Credenciales de demo:" -ForegroundColor Yellow
    Write-Host "  Email: demo@barvip.com" -ForegroundColor White
    Write-Host "  Password: demo123" -ForegroundColor White
} catch {
    Write-Host "ERROR: Fallo la instalacion de dependencias" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Read-Host "Presiona Enter para continuar"
