@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\diagnostico.ps1"
echo.
echo Ya puedes cerrar esta ventana.
pause
