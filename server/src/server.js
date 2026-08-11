try { require('dotenv').config() } catch (_) { /* 允许未安装 dotenv，Railway 用环境变量 */ }
const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

const app = express()

app.set('trust proxy', true)

const PORT = process.env.PORT || 3001
const HOST = process.env.HOST || '0.0.0.0'

// ================================================
// 1. 健康检查（绝对最优先，避免被任何中间件拦截导致 400）
// ================================================
function sendHealthOk(res) {
  res.status(200).type('text/plain; charset=utf-8').send('ok')
}
app.use('/healthz', (req, res) => sendHealthOk(res))
app.use('/health',  (req, res) => sendHealthOk(res))
app.head(['/', '/healthz', '/health'], (req, res) => {
  res.status(200).set('Content-Length', '0').end()
})

// ================================================
// 2. CORS（放宽）
// ================================================
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Range'],
  maxAge: 86400,
}))
app.options('*', (req, res) => res.status(204).end())

// ================================================
// 3. Body Parser（出错时不抛 400，改为打日志并放行）
// ================================================
app.use(express.json({ limit: '10mb' }))
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    console.warn('[BodyParser] JSON 解析失败，忽略:', err.message, 'URL=', req.url)
    req.body = req.body || {}
    return next()
  }
  next(err)
})
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade')
  next()
})

// 4xx 请求日志
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      console.warn(`[HTTP ${res.statusCode}] ${req.method} ${req.url} ua=${String(req.headers['user-agent'] || '').slice(0, 60)} t=${Date.now() - start}ms`)
    }
  })
  next()
})

// ================================================
// 4. API 路由（安全加载）
// ================================================
const routes = [
  ['/api/users',     './routes/userRoutes'],
  ['/api/projects',  './routes/projectRoutes'],
  ['/api/contracts', './routes/contractRoutes'],
  ['/api/schedules', './routes/scheduleRoutes'],
  ['/api/customers', './routes/customerRoutes'],
  ['/api/sync',      './routes/syncRoutes'],
  ['/api/ai',        './routes/aiRoutes'],
  ['/api/data',      './routes/dataRoutes'],
]
routes.forEach(([prefix, modPath]) => {
  try {
    const handler = require(modPath)
    app.use(prefix, handler)
    console.log('路由加载 OK:', prefix)
  } catch (err) {
    console.warn('路由加载失败（跳过）:', prefix, err.message)
  }
})

// ================================================
// 5. 静态文件 & SPA fallback
// ================================================
const staticDirs = [
  path.join(__dirname, '../dist'),
  path.join(__dirname, '../../lite/dist'),
  path.join(__dirname, '../../dist'),
  path.join(__dirname, 'dist'),
]
console.log('寻找静态目录，候选路径:', staticDirs)
let staticDir = null
for (const p of staticDirs) {
  try {
    const idx = path.join(p, 'index.html')
    if (fs.existsSync(p) && fs.existsSync(idx)) {
      staticDir = p
      console.log('✅ 静态文件目录:', p, ' | index.html size =', fs.statSync(idx).size, 'bytes')
      break
    } else {
      console.log('  ✘ 跳过 (index.html 不存在):', p)
    }
  } catch (err) {
    console.log('  ✘ 跳过 (读取错误):', p, err.message)
  }
}

if (staticDir) {
  app.use(express.static(staticDir, { fallthrough: true, index: false }))
  app.get('*', (req, res) => {
    try {
      const idx = path.join(staticDir, 'index.html')
      if (!fs.existsSync(idx)) throw new Error('index.html missing')
      res.status(200).sendFile(idx, {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      })
    } catch (err) {
      console.error('sendFile 失败:', err.message)
      res.status(500).type('text/html; charset=utf-8').send(
        `<title>部署中...</title><meta name="viewport" content="width=device-width,initial-scale=1">` +
        `<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px;text-align:center">` +
        `<h2>🚀 前端静态资源正在构建</h2>` +
        `<p>Railway 首次部署需要 2-5 分钟，请稍后刷新。</p>` +
        `</body>`
      )
    }
  })
} else {
  console.warn('⚠️  未找到前端构建产物，仅提供 API 服务。构建阶段可能失败。')
  app.get('/', (req, res) => {
    res.status(503).type('text/html; charset=utf-8').send(
      `<title>构建中...</title><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px;text-align:center">` +
      `<h2>🛠 构建失败或前端尚未生成</h2>` +
      `<p>请查看 Railway 的 <b>Deploy Logs</b> 是否有 npm install / build 错误。</p>` +
      `</body>`
    )
  })
}

// ================================================
// 6. 全局错误兜底
// ================================================
app.use((req, res) => {
  if (req.url.startsWith('/api/')) {
    res.status(404).json({ code: 404, msg: 'API 不存在', url: req.url })
  } else if (!res.headersSent) {
    if (staticDir) {
      const idx = path.join(staticDir, 'index.html')
      if (fs.existsSync(idx)) return res.status(200).sendFile(idx)
    }
    res.status(404).type('text/plain; charset=utf-8').send('404 Not Found')
  }
})

app.use((err, req, res, next) => {
  console.error('[GlobalError]', err?.stack || err?.message || String(err))
  if (res.headersSent) return next(err)
  res.status(500).type('text/html; charset=utf-8').send(
    `<title>服务错误</title><body style="padding:40px;text-align:center;font-family:sans-serif">` +
    `<h2>⚠️ 服务器遇到一个错误</h2>` +
    `<p style="color:#666">${String(err?.message || err).slice(0, 200)}</p>` +
    `<p><a href="/">点此返回首页</a></p></body>`
  )
})

// ============ 启动 ============
const server = app.listen(PORT, HOST, () => {
  console.log(`========================================`)
  console.log(`服务器运行在 ${HOST}:${PORT}`)
  console.log(`版本: v2.3 (修复版)`  )
  console.log(`========================================`)

  setTimeout(async () => {
    try {
      const connectDB = require('./config/db')
      await connectDB()
      console.log('数据库连接成功')
      const User = require('./models/User')
      const adminExists = await User.findOne({ username: 'admin' })
      if (!adminExists) {
        await User.create({
          username: 'admin', email: 'admin@example.com',
          password: 'admin123', name: '管理员'
        })
        console.log('默认账号已创建: admin / admin123')
      }
      setTimeout(() => {
        try {
          const { startScheduler } = require('./services/dailyUpdateService')
          startScheduler()
        } catch (err) { console.error('定时任务启动失败:', err.message) }
      }, 5000)
    } catch (err) { console.error('数据库初始化失败（不影响服务）:', err.message) }
  }, 2000)

  try {
    const { listEnabledProviders } = require('./services/deepseekService')
    const enabled = listEnabledProviders()
    if (enabled.length > 0) console.log('AI 服务: 已启用 -> ' + enabled.join(' | '))
    else console.log('AI 服务: 未配置。推荐配置 SILICONFLOW_API_KEY（免费）')
  } catch (_) {}
})

server.on('error', (err) => {
  console.error('服务器错误:', err.message)
  if (err.syscall === 'listen') console.error(`端口 ${PORT} 可能已被占用`)
})
process.on('uncaughtException', (err) => { console.error('未捕获异常:', err.message) })
process.on('unhandledRejection', (reason) => { console.error('未处理的 Promise 拒绝:', reason) })
