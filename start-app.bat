@echo off
cd /d "%~dp0"
title PROMPTROOM - App Server
if not exist "dist\index.html" (
  echo Production build not found. Building...
  call npm run build
  if errorlevel 1 (
    echo Build failed.
    pause
    exit /b 1
  )
)
echo.
echo   PROMPTROOM APP
echo   http://localhost:8787
echo.
call npm start
echo.
echo Server stopped.
pause
