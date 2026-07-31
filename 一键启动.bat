@echo off
chcp 65001 >nul
title 销售工作台 - 一键启动

echo ========================================
echo   销售工作台 - 一键启动脚本
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] 检查 Node.js 环境...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [错误] 未检测到 Node.js！
    echo.
    echo 请先安装 Node.js：
    echo 1. 访问 https://nodejs.org/
    echo 2. 下载 LTS 版本（推荐 v20.x）
    echo 3. 双击安装，一路下一步即可
    echo 4. 安装完成后，重新运行本脚本
    echo.
    pause
    exit /b 1
)
for /f "delims=" %%i in ('node -v') do set nodever=%%i
echo       Node.js 版本: %nodever%
echo       ✓ 环境正常
echo.

echo [2/5] 检查前端依赖...
if not exist "node_modules" (
    echo       正在安装前端依赖（首次运行需要 1-3 分钟，请耐心等待）...
    call npm install --registry=https://registry.npmmirror.com
    if %errorlevel% neq 0 (
        echo.
        echo [错误] 前端依赖安装失败！
        pause
        exit /b 1
    )
    echo       ✓ 前端依赖安装完成
) else (
    echo       ✓ 前端依赖已存在
)
echo.

echo [3/5] 检查后端依赖...
cd server
if not exist "node_modules" (
    echo       正在安装后端依赖（首次运行需要 1-3 分钟，请耐心等待）...
    call npm install --registry=https://registry.npmmirror.com
    if %errorlevel% neq 0 (
        echo.
        echo [错误] 后端依赖安装失败！
        pause
        exit /b 1
    )
    echo       ✓ 后端依赖安装完成
) else (
    echo       ✓ 后端依赖已存在
)
cd ..
echo.

echo [4/5] 启动后端服务...
start "销售工作台-后端" cmd /k "cd /d "%~dp0server" && node src/server.js"
timeout /t 3 /nobreak >nul
echo       ✓ 后端服务已启动
echo.

echo [5/5] 启动前端服务...
echo       正在启动前端开发服务器...
echo       启动完成后会自动打开浏览器
echo.
start "销售工作台-前端" cmd /k "cd /d "%~dp0" && npm run dev"

timeout /t 8 /nobreak >nul

echo ========================================
echo   启动完成！
echo ========================================
echo.
echo   访问地址: http://localhost:5174/
echo   默认账号: admin / admin123
echo.
echo   正在打开浏览器...
echo.

start "" "http://localhost:5174/"

echo   提示：
echo   - 两个黑色命令行窗口不要关闭！
echo   - 关闭它们会停止服务
echo   - 如浏览器未自动打开，请手动访问上面的地址
echo.
pause
