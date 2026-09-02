#!/usr/bin/env bash
set -e

echo "=== 前端构建 ==="
npm ci || npm install
npm run build

echo "=== 后端依赖 ==="
cd server
MONGOMS_DISABLE_POSTINSTALL=1 npm ci || npm install
cd ..

echo "=== 复制前端产物到 server/dist ==="
mkdir -p server/dist
cp -r dist/* server/dist/

echo "=== 构建完成 ==="
