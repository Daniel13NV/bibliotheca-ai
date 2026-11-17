@echo off
chcp 65001 >nul
title Bibliotheca AI - Iniciar
cd /d "%~dp0"

echo ==============================================
echo    Bibliotheca AI - Iniciando el sistema
echo ==============================================
echo.

rem --- 1. Docker Desktop -------------------------------------------------
docker info >nul 2>&1
if not errorlevel 1 goto docker_ok
echo Abriendo Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
echo Esperando a que Docker termine de arrancar (1-2 minutos)...
:wait_docker
timeout /t 5 /nobreak >nul
docker info >nul 2>&1
if errorlevel 1 goto wait_docker
:docker_ok
echo [OK] Docker esta listo.
echo.

rem --- 2. Backend --------------------------------------------------------
echo Levantando microservicios, bases de datos, IA, n8n y Node-RED...
docker compose up -d
if errorlevel 1 (
  echo.
  echo [ERROR] No se pudo levantar el backend. Revisa el mensaje de arriba.
  pause
  exit /b 1
)
echo [OK] Backend en marcha.
echo.

rem --- 3. IP de la PC para la app ---------------------------------------
set IP=
for /f %%i in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi' -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress"') do set IP=%%i
if defined IP (
  > "mobile\.env" echo EXPO_PUBLIC_API_URL=http://%IP%:3000
  echo [OK] La app usara el servidor http://%IP%:3000
) else (
  echo [AVISO] No encontre la IP del Wi-Fi. Revisa mobile\.env manualmente.
)
echo.

rem --- 4. App movil ------------------------------------------------------
echo Abriendo Expo en otra ventana (escanea el QR con Expo Go)...
start "Bibliotheca AI - App" cmd /k "cd /d "%~dp0mobile" && npx expo start -c"

echo Esperando a que el API Gateway responda...
timeout /t 20 /nobreak >nul
start "" http://localhost:3000/health

echo.
echo ==============================================
echo  Listo. Paginas utiles:
echo    Estado:     http://localhost:3000/health
echo    Node-RED:   http://localhost:1880
echo    n8n:        http://localhost:5678
echo    RabbitMQ:   http://localhost:15672
echo ==============================================
echo.
pause
