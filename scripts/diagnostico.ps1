$ErrorActionPreference = 'Continue'
Set-Location (Split-Path $PSScriptRoot -Parent)
$out = Join-Path (Get-Location) 'diagnostico.txt'
& {
  "=== FECHA"; Get-Date
  "=== IP Wi-Fi"
  $ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi' -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress
  $ip
  "=== PERFIL DE RED"; Get-NetConnectionProfile | Format-Table InterfaceAlias, Name, NetworkCategory -AutoSize | Out-String
  "=== WSL"; wsl -l -v 2>&1 | Out-String
  "=== DISCO C"; Get-PSDrive C | Format-Table Name, @{n='LibreGB';e={[math]::Round($_.Free/1GB,1)}}, @{n='UsadoGB';e={[math]::Round($_.Used/1GB,1)}} -AutoSize | Out-String
  "=== PROCESOS DOCKER"; Get-Process *docker*, vmmem*, wsl* -ErrorAction SilentlyContinue | Format-Table Id, ProcessName, StartTime -AutoSize | Out-String
  "=== DOCKER VERSION"; docker version 2>&1 | Out-String
  "=== DOCKER PS"; docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>&1 | Out-String
  "=== HEALTH localhost"
  try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 10 http://localhost:3000/health).Content } catch { "ERROR: $($_.Exception.Message)" }
  "=== HEALTH por IP $ip"
  try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 10 "http://${ip}:3000/health").Content } catch { "ERROR: $($_.Exception.Message)" }
  "=== QUIEN ESCUCHA 3000 / 8081"
  netstat -ano | Select-String ':3000 |:8081 ' | Out-String
  foreach ($p in (Get-NetTCPConnection -LocalPort 3000,8081 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)) { Get-Process -Id $p -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, Path | Format-List | Out-String }
  "=== PERFILES FIREWALL"; Get-NetFirewallProfile | Format-Table Name, Enabled, DefaultInboundAction, AllowLocalFirewallRules -AutoSize | Out-String
  "=== REGLA Bibliotheca"; Get-NetFirewallRule -DisplayName 'Bibliotheca' -ErrorAction SilentlyContinue | Format-Table DisplayName, Enabled, Profile, Action -AutoSize | Out-String
  "=== REGLAS DE BLOQUEO ENTRANTES ACTIVAS"
  Get-NetFirewallRule -Direction Inbound -Action Block -Enabled True -ErrorAction SilentlyContinue | ForEach-Object {
    $app = ($_ | Get-NetFirewallApplicationFilter).Program
    $port = ($_ | Get-NetFirewallPortFilter).LocalPort
    "{0} | perfil={1} | programa={2} | puerto={3}" -f $_.DisplayName, $_.Profile, $app, $port
  }
  "=== REGLAS DOCKER / NODE"
  Get-NetFirewallRule -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -match 'docker|node|vpnkit|com\.docker' } | ForEach-Object {
    $app = ($_ | Get-NetFirewallApplicationFilter).Program
    "{0} | {1} | {2} | {3} | perfil={4} | {5}" -f $_.DisplayName, $_.Direction, $_.Action, $_.Enabled, $_.Profile, $app
  }
  "=== FIN"
} *>&1 | Out-File -FilePath $out -Encoding utf8
Write-Host "Listo. Resultado guardado en $out"
