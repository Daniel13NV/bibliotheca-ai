@echo off
chcp 65001 >nul
title Bibliotheca AI - Detener
cd /d "%~dp0"
echo Deteniendo Bibliotheca AI (tus datos se conservan)...
docker compose stop
echo.
echo [OK] Todo detenido. Cierra la ventana de Expo con Ctrl+C si sigue abierta
echo      y, si quieres liberar memoria, cierra Docker Desktop.
echo.
pause
