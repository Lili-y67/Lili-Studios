@echo off
cd /d "%~dp0"
start "Les Immortelles - Serveur local" powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\local-server.ps1"
timeout /t 2 /nobreak >nul
start "" http://localhost:4173/
