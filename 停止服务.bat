@echo off
chcp 65001 >nul
title 销售工作台 - 停止服务

echo ========================================
echo   销售工作台 - 停止服务
echo ========================================
echo.

echo 正在停止前端服务...
taskkill /f /im node.exe 2>nul

echo 正在停止后端服务...
taskkill /f /im node.exe 2>nul

echo.
echo ✓ 所有服务已停止
echo.
pause
