@echo off
cd /d "%~dp0"
set NODE_USE_SYSTEM_CA=1
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js 24 LTS is required. https://nodejs.org/
 pause
 exit /b 1
)
if not exist node_modules call npm ci
start "" http://localhost:4317
node server/index.js
pause
