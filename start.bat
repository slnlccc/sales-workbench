@echo off
title Sales Workbench - Startup

echo ========================================
echo   Sales Workbench - One-Click Startup
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] Checking Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Node.js not found!
    echo.
    echo Please install Node.js first:
    echo 1. Visit https://nodejs.org/
    echo 2. Download LTS version (v20.x recommended)
    echo 3. Install with default settings
    echo 4. Restart this script after installation
    echo.
    pause
    exit /b 1
)
for /f "delims=" %%i in ('node -v') do set nodever=%%i
echo       Node.js version: %nodever%
echo       OK
echo.

echo [2/5] Installing frontend dependencies...
if not exist "node_modules" (
    echo       Installing (first run, may take 1-3 minutes)...
    call npm install --registry=https://registry.npmmirror.com
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Frontend install failed!
        pause
        exit /b 1
    )
    echo       OK - Installed
) else (
    echo       OK - Already installed
)
echo.

echo [3/5] Installing backend dependencies...
cd server
if not exist "node_modules" (
    echo       Installing (first run, may take 1-3 minutes)...
    call npm install --registry=https://registry.npmmirror.com
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Backend install failed!
        pause
        exit /b 1
    )
    echo       OK - Installed
) else (
    echo       OK - Already installed
)
cd ..
echo.

echo [4/5] Starting backend service...
start "Workbench-Backend" cmd /k "cd /d "%~dp0server" && node src/server.js"
timeout /t 3 /nobreak >nul
echo       OK - Backend started
echo.

echo [5/5] Starting frontend service...
echo       Starting dev server...
echo       Browser will open automatically when ready
echo.
start "Workbench-Frontend" cmd /k "cd /d "%~dp0" && npm run dev"

timeout /t 8 /nobreak >nul

echo ========================================
echo   Startup Complete!
echo ========================================
echo.
echo   Access: http://localhost:5174/
echo   Default: admin / admin123
echo.
echo   Opening browser...
echo.

start "" "http://localhost:5174/"

echo   Notes:
echo   - Do NOT close the two black command windows!
echo   - Closing them will stop the services
echo   - If browser doesn't open, visit the address above manually
echo.
pause
