@echo off
chcp 65001 >nul
echo ============================================
echo          销售工作台 - 启动程序
echo ============================================
echo.

set NODE_ENV=production

cd /d "%~dp0server"

if not exist node_modules (
    echo 正在安装依赖...
    npm install
    if %errorlevel% neq 0 (
        echo 依赖安装失败，请检查网络连接
        pause
        exit /b 1
    )
)

echo 正在启动销售工作台...
echo 启动完成后，请打开浏览器访问: http://localhost:3001
echo.

node src/server.js

pause