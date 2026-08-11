# ===== 构建阶段（拷贝顺序已调整：先 copy 全量源码，避免缓存层错乱）=====
FROM node:20-alpine AS builder
WORKDIR /app

# 一次性 copy 所有可能用到的文件（lite + server），避免多次 copy 触发脏缓存
# .dockerignore 已经排除了 node_modules / dist
COPY . /app

# 1. 安装后端依赖
RUN echo '[1/3] Install server dependencies' \
    && cd server \
    && npm install --no-audit --no-fund --production=false \
    || (echo 'server install failed, attempting with --legacy-peer-deps' \
        && npm install --no-audit --no-fund --production=false --legacy-peer-deps)

# 2. 安装前端依赖
RUN echo '[2/3] Install lite dependencies' \
    && cd /app/lite \
    && npm install --no-audit --no-fund --production=false \
    || (echo 'lite install failed, attempting with --legacy-peer-deps' \
        && npm install --no-audit --no-fund --production=false --legacy-peer-deps)

# 3. 构建前端并复制到 server/dist
RUN echo '[3/3] Build lite and copy to server/dist' \
    && cd /app/lite \
    && npm run build \
    && mkdir -p /app/server/dist \
    && cp -r dist/* /app/server/dist/ \
    && echo "Build OK, index.html size: $(wc -c < /app/server/dist/index.html) bytes" \
    && echo "server/dist contents:" && ls -la /app/server/dist/

# ===== 运行阶段 =====
FROM node:20-alpine
WORKDIR /app/server
ENV NODE_ENV=production \
    PORT=3000

COPY --from=builder /app/server ./

EXPOSE 3000
CMD ["node", "src/server.js"]
