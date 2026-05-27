@echo off
setlocal

set "ROOT=%~dp0"
cd /d "%ROOT%"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js, then run this file again.
  pause
  exit /b 1
)

node scripts\start-lyrics-data-installer.mjs
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
  echo Lyrics Data Installer exited with code %EXIT_CODE%.
  pause
)
exit /b %EXIT_CODE%
