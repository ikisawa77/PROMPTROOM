@echo off
cd /d "%~dp0"
title PROMPTROOM - Local Control Center
echo.
echo   PROMPTROOM LOCAL CONTROL CENTER
echo   http://localhost:9090
echo.
call npm run control
echo.
echo Control Center stopped.
pause
