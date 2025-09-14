# PowerShell script para iniciar el servidor
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Bar VIP Manager - Iniciando Servidor" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar instalacion
if (-not (Test-Path "node_modules")) {
    Write-Host "ERROR: Dependencias no instaladas." -ForegroundColor Red
    Write-Host "Ejecuta install.ps1 primero." -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host "Iniciando servidor de desarrollo..." -ForegroundColor Yellow
Write-Host ""
Write-Host "El proyecto estara disponible en: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Credenciales de demo:" -ForegroundColor Yellow
Write-Host "  Email: demo@barvip.com" -ForegroundColor White
Write-Host "  Password: demo123" -ForegroundColor White
Write-Host ""
Write-Host "Presiona Ctrl+C para detener el servidor" -ForegroundColor Gray
Write-Host ""

# Iniciar servidor
npm run dev
