# Copia el código compartido (services/_shared) a cada microservicio.
# Uso (desde la raíz del proyecto):  powershell -ExecutionPolicy Bypass -File scripts/sync-shared.ps1
$root = Split-Path -Parent $PSScriptRoot
$shared = Join-Path $root 'services/_shared'
$withDb = @('users-service', 'catalog-service', 'loans-service', 'rfid-service', 'notifications-service')

foreach ($svc in $withDb) {
  $dest = Join-Path $root "services/$svc/src/shared"
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  Copy-Item "$shared/*.ts" $dest -Force
  Write-Host "✔ $svc"
}

# ai-service no usa MySQL: se omite database.ts
$aiDest = Join-Path $root 'services/ai-service/src/shared'
New-Item -ItemType Directory -Force -Path $aiDest | Out-Null
Get-ChildItem "$shared/*.ts" | Where-Object { $_.Name -ne 'database.ts' } | Copy-Item -Destination $aiDest -Force
Write-Host "✔ ai-service"
