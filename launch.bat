@echo off
title ElementorForge
color 0B
echo.
echo  =========================================
echo   ^⚡ ElementorForge — Starting...
echo  =========================================
echo.

:: Check if node_modules exists, install if not
if not exist "node_modules\" (
    echo  [*] First run detected. Installing dependencies...
    echo.
    npm install
    echo.
)

echo  [*] Server starting at http://localhost:3500
echo  [*] Press Ctrl+C to stop
echo.

:: Open browser after a short delay
start /B timeout /t 2 /nobreak >nul && start http://localhost:3500

node server.js
pause
