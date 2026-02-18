@echo off
set "NODE=C:\Program Files\nodejs\node.exe"
if not exist "%NODE%" (
  echo Node.js not found at "%NODE%". Please install from https://nodejs.org
  pause
  exit /b 1
)
cd /d "%~dp0"
echo Starting server at http://localhost:3000
"%NODE%" server.js
pause
