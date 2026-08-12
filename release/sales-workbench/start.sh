#!/bin/bash
set -e

echo "================================================"
echo "          销售工作台 - 启动程序"
echo "================================================"
echo ""

export NODE_ENV=production

cd "$(dirname "$0")/server"

if [ ! -d "node_modules" ]; then
    echo "正在安装依赖..."
    npm install
fi

echo "正在启动销售工作台..."
echo "启动完成后，请打开浏览器访问: http://localhost:3001"
echo ""

node src/server.js