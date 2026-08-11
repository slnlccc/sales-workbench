# ===== 构建阶段 =====
FROM node:20-alpine AS builder
WORKDIR /app

# 1. 安装并构建后端依赖
COPY server/package*.json ./server/
RUN cd server && npm install --no-audit --no-fund --production=false

# 2. 安装并构建前端（lite 简洁版）
COPY lite/package*.json ./lite/
RUN cd lite && npm install --no-audit --no-fund --production=false

# 3. 拷贝源码
COPY server ./server
COPY lite ./lite

# 4. 构建前端 + 复制到 server/dist
RUN cd lite && npm run build \
    && mkdir -p /app/server/dist \
    && cp -r dist/* /app/server/dist/ \
    && echo "Build OK, index size: $(wc -c < /app/server/dist/index.html) bytes"

# ===== 运行阶段 =====
FROM node:20-alpine
WORKDIR /app/server
ENV NODE_ENV=production

COPY --from=builder /app/server ./

EXPOSE 3000 3001
CMD ["node", "src/server.js"]
