@echo off
setlocal

set "ROOT=%~dp0"
cd /d "%ROOT%"

if not defined DEV_MANAGER_PORT set "DEV_MANAGER_PORT=5172"
if not defined PLAYER_PORT set "PLAYER_PORT=5173"
if not defined SONG_PACK_PORT set "SONG_PACK_PORT=5174"

set "MANAGER_URL=http://127.0.0.1:%DEV_MANAGER_PORT%/"
set "STATUS_URL=%MANAGER_URL%api/status"
set "POWERSHELL_EXE=C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js, then run this file again.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Install Node.js with npm, then run this file again.
  pause
  exit /b 1
)

"%POWERSHELL_EXE%" -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri '%STATUS_URL%' -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 (
  echo Music Effect Launch Manager is already running.
  start "" "%MANAGER_URL%"
  exit /b 0
)

"%POWERSHELL_EXE%" -NoProfile -Command "$port = [int]'%DEV_MANAGER_PORT%'; $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($listener) { exit 0 } else { exit 1 }" >nul 2>nul
if not errorlevel 1 (
  echo Port %DEV_MANAGER_PORT% is already in use. Opening %MANAGER_URL% instead of starting a second manager.
  start "" "%MANAGER_URL%"
  exit /b 0
)

if not exist "%ROOT%node_modules\" (
  echo Installing dependencies with npm ci...
  call npm ci
  if errorlevel 1 (
    echo.
    echo Dependency install failed.
    pause
    exit /b 1
  )
)

echo Starting Music Effect Launch Manager...
echo Manager: %MANAGER_URL%
echo Player:  http://127.0.0.1:%PLAYER_PORT%/
echo Songs:   http://127.0.0.1:%SONG_PACK_PORT%/
echo.
echo Keep this window open while using Music Effect.
echo Close it with Ctrl+C when finished. Managed targets will stop with the manager.

start "" /min "%POWERSHELL_EXE%" -NoProfile -WindowStyle Hidden -Command "$statusUrl = '%STATUS_URL%'; $managerUrl = '%MANAGER_URL%'; for ($i = 0; $i -lt 60; $i++) { try { Invoke-WebRequest -UseBasicParsing -Uri $statusUrl -TimeoutSec 1 | Out-Null; Start-Process $managerUrl; exit 0 } catch { Start-Sleep -Milliseconds 500 } }; Start-Process $managerUrl"

call npm run dev
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
  echo Launch Manager exited with code %EXIT_CODE%.
  pause
)
exit /b %EXIT_CODE%
