@echo off
title Sales Workbench - Environment Check

echo ========================================
echo   Sales Workbench - Environment Check
echo ========================================
echo.

echo [1] Checking Node.js...
where node >nul 2>nul
if %errorlevel% equ 0 (
    for /f "delims=" %%i in ('node -v') do set nodever=%%i
    echo     OK - Installed, version: %nodever%
) else (
    echo     FAIL - Not installed
    echo       Please visit https://nodejs.org/ to download LTS version
)
echo.

echo [2] Checking npm...
where npm >nul 2>nul
if %errorlevel% equ 0 (
    for /f "delims=" %%i in ('npm -v') do set npmver=%%i
    echo     OK - Installed, version: %npmver%
) else (
    echo     FAIL - Not installed (comes with Node.js)
)
echo.

cd /d "%~dp0"

echo [3] Checking frontend dependencies...
if exist "node_modules" (
    echo     OK - Installed
) else (
    echo     INFO - Not installed (will auto-install when running start.bat)
)
echo.

echo [4] Checking backend dependencies...
if exist "server\node_modules" (
    echo     OK - Installed
) else (
    echo     INFO - Not installed (will auto-install when running start.bat)
)
echo.

echo [5] Checking frontend port 5174...
netstat -ano | findstr ":5174" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo     OK - Frontend service running
) else (
    echo     INFO - Not running (normal, starts later)
)
echo.

echo [6] Checking backend port 3001...
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo     OK - Backend service running
) else (
    echo     INFO - Not running (normal, starts later)
)
echo.

echo ========================================
echo   Check Complete
echo ========================================
echo.
echo If all items show OK, run start.bat
echo.
pause
