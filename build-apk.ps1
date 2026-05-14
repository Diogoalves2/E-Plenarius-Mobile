# ───────────────────────────────────────────────────────────
# E-Plenarius mobile — wrapper PowerShell
# Executa o build do APK via WSL2 Ubuntu.
#
# Uso (do Windows):
#   cd "c:\Users\Diogo Alves\Desktop\E-plenarius\mobile"
#   .\build-apk.ps1
# ───────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"

$scriptPath = "/mnt/c/Users/Diogo Alves/Desktop/E-plenarius/mobile/scripts/build-apk.sh"

Write-Host "🚀 Iniciando build do APK via WSL Ubuntu..." -ForegroundColor Cyan
wsl -d Ubuntu bash "$scriptPath"

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "✓ APK gerado: $PSScriptRoot\eplenarius.apk" -ForegroundColor Green
} else {
  Write-Host ""
  Write-Host "✗ Build falhou (exit $LASTEXITCODE)" -ForegroundColor Red
  exit $LASTEXITCODE
}
