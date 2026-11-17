# Instala dependencias y ejecuta las pruebas unitarias de todos los microservicios.
# Uso: powershell -ExecutionPolicy Bypass -File scripts/test-all.ps1
$root = Split-Path -Parent $PSScriptRoot
$services = @('users-service', 'catalog-service', 'loans-service', 'rfid-service', 'notifications-service')
$failed = @()
foreach ($svc in $services) {
  Write-Host "`n=== $svc ===" -ForegroundColor Cyan
  Push-Location (Join-Path $root "services/$svc")
  if (-not (Test-Path node_modules)) { npm install --no-audit --no-fund | Out-Null }
  npm test
  if ($LASTEXITCODE -ne 0) { $failed += $svc }
  Pop-Location
}
if ($failed.Count -gt 0) { Write-Host "`nFallaron: $($failed -join ', ')" -ForegroundColor Red; exit 1 }
Write-Host "`nTodas las pruebas pasaron ✔" -ForegroundColor Green
