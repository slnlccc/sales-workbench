@echo off
title Sales Workbench

echo ========================================
echo   Sales Workbench - Quick Start
echo ========================================
echo.

cd /d "%~dp0"

echo 1. Installing frontend packages...
call npm install --registry=https://registry.npmmirror.com
echo.

echo 2. Installing backend packages...
cd server
call npm install --registry=https://registry.npmmirror.com
cd ..
echo.

echo 3. Starting backend server...
start "Backend" cmd /k "cd /d "%~dp0server" && node src/server.js"
timeout /t 3 /nobreak >nul
echo.

echo 4. Starting frontend server...
start "Frontend" cmd /k "cd /d "%~dp0" && npm run dev"

echo.
echo ========================================
echo   Starting... Please wait 10 seconds
echo   URL: http://localhost:5174/
echo ========================================
echo.

timeout /t 10 /nobreak >nul

echo Opening browser...
start "" "http://localhost:5174/"

echo.
echo Done! If browser didn't open, visit: http://localhost:5174/
echo Login: admin / admin123
echo.
pause
