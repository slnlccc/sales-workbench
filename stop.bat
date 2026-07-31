@echo off
title Sales Workbench - Stop

echo ========================================
echo   Sales Workbench - Stop Services
echo ========================================
echo.

echo Stopping all services...
taskkill /f /im node.exe 2>nul

echo.
echo OK - All services stopped
echo.
pause
