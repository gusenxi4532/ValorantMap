@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Please install Node.js 22 or newer, then try again.
 pause
 exit /b 1
)
set PORT=8788
start "" "http://127.0.0.1:8788"
node server.cjs
pause
