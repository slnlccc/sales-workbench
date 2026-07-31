@echo off
chcp 65001 >nul
title 销售工作台 - 环境检测

echo ========================================
echo   销售工作台 - 环境检测工具
echo ========================================
echo.

echo [1] 检查 Node.js...
where node >nul 2>nul
if %errorlevel% equ 0 (
    for /f "delims=" %%i in ('node -v') do set nodever=%%i
    echo     ✓ 已安装，版本: %nodever%
) else (
    echo     ✗ 未安装
    echo       请访问 https://nodejs.org/ 下载安装 LTS 版本
)
echo.

echo [2] 检查 npm...
where npm >nul 2>nul
if %errorlevel% equ 0 (
    for /f "delims=" %%i in ('npm -v') do set npmver=%%i
    echo     ✓ 已安装，版本: %npmver%
) else (
    echo     ✗ 未安装（随 Node.js 一起安装）
)
echo.

cd /d "%~dp0"

echo [3] 检查前端依赖...
if exist "node_modules" (
    echo     ✓ 已安装
) else (
    echo     ✗ 未安装（首次运行"一键启动.bat"会自动安装）
)
echo.

echo [4] 检查后端依赖...
if exist "server\node_modules" (
    echo     ✓ 已安装
) else (
    echo     ✗ 未安装（首次运行"一键启动.bat"会自动安装）
)
echo.

echo [5] 检查前端端口 5174...
netstat -ano | findstr ":5174" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo     ✓ 前端服务已运行
) else (
    echo     - 前端服务未运行（正常，启动后才会占用）
)
echo.

echo [6] 检查后端端口 3001...
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo     ✓ 后端服务已运行
) else (
    echo     - 后端服务未运行（正常，启动后才会占用）
)
echo.

echo ========================================
echo   检测完成
echo ========================================
echo.
echo 如所有项目都显示 ✓，请双击"一键启动.bat"
echo.
pause
