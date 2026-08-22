require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const connectDB = require('./config/db')
const User = require('./models/User')
const { startDailyUpdate } = require('./services/dailyUpdateService')

const fs = require('fs')

const app = express()

app.set('trust proxy', 1)

const corsOptions = {
  origin: function (origin, callback) {
    callback(null, true)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  maxAge: 86400,
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  next()
})

const resolveStaticDir = () => {
  const candidates = [
    path.join(__dirname, '../dist'),
    path.join(__dirname, '../../dist'),
    path.join(__dirname, '../../../dist'),
    path.join(process.cwd(), 'dist'),
    path.join(process.cwd(), 'server', 'dist'),
    path.join(process.cwd(), '../dist'),
  ]
  for (const dir of candidates) {
    try {
      if (fs.existsSync(path.join(dir, 'index.html'))) {
        console.log(`[static] 找到前端构建产物: ${dir}`)
        return dir
      }
    } catch { /* skip */ }
  }
  console.error('[static] 未找到前端构建产物！尝试启动时再次检查')
  return candidates[0]
}

let STATIC_DIR = resolveStaticDir()

const staticMimeTypes = {
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

const KNOWN_STATIC_PREFIXES = ['/assets/', '/favicon', '/manifest']

const staticFileServer = (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next()

  const urlPath = decodeURIComponent(req.path)

  const isStatic = KNOWN_STATIC_PREFIXES.some(p => urlPath.startsWith(p))
  if (!isStatic) return next()

  const dir = resolveStaticDir()
  const safePath = path.join(dir, urlPath)

  if (!safePath.startsWith(dir)) return next()

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      return next()
    }
    const ext = path.extname(safePath).toLowerCase()
    const mime = staticMimeTypes[ext] || 'application/octet-stream'
    res.setHeader('Content-Type', mime)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.setHeader('Accept-Ranges', 'bytes')
    fs.createReadStream(safePath).on('error', next).pipe(res)
  })
}

app.use(staticFileServer)

app.use(express.static(STATIC_DIR, {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase()
    const mime = staticMimeTypes[ext]
    if (mime) {
      res.setHeader('Content-Type', mime)
    }
    res.setHeader('Cache-Control', ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable')
  }
}))

const initDB = async () => {
  await connectDB()

  const adminExists = await User.findOne({ username: 'admin' })
  if (!adminExists) {
    await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123',
      name: '管理员'
    })
    console.log('默认账号已创建: admin / admin123')
  }
}

// 公开健康检查端点（Railway 健康检查用，不需要认证）
app.get('/api/health', (req, res) => {
  const cloudSync = require('./services/cloudSyncService')
  const baidu = require('./services/baiduService')
  const cosKeys = require('./config/cosKeys')
  const cosCfg = (k) => process.env[k] || cosKeys[k] || ''
  const v = (k) => {
    const val = cosCfg(k)
    if (!val) return 'NOT_SET'
    if (val.startsWith('your-') || val === 'placeholder') return `PLACEHOLDER(${val})`
    if (k.includes('SECRET') || k.includes('KEY')) {
      return val.length >= 8 ? `${val.slice(0, 4)}...${val.slice(-3)}` : 'HIDDEN'
    }
    return val
  }
  const statDir = resolveStaticDir()
  const indexExists = fs.existsSync(path.join(statDir, 'index.html'))
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cloudSyncConfigured: cloudSync.isConfigured(),
    cosRegion: cosCfg('TENCENT_COS_REGION'),
    cosBucket: cosCfg('TENCENT_COS_BUCKET') ? 'set' : 'unset',
    aiConfigured: baidu.isConfigured(),
    staticDir: statDir,
    staticIndexExists: indexExists,
  })
})

app.use('/api/users', require('./routes/userRoutes'))
app.use('/api/projects', require('./routes/projectRoutes'))
app.use('/api/contracts', require('./routes/contractRoutes'))
app.use('/api/schedules', require('./routes/scheduleRoutes'))
app.use('/api/customers', require('./routes/customerRoutes'))
app.use('/api/sync', require('./routes/syncRoutes'))
app.use('/api/ai', require('./routes/aiRoutes'))
app.use('/api/data', require('./routes/dataRoutes'))

app.get('*', (req, res, next) => {
  const accept = req.headers.accept || ''
  if (accept.includes('text/html') || accept === '*/*') {
    const dir = resolveStaticDir()
    const indexPath = path.join(dir, 'index.html')
    if (fs.existsSync(indexPath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache')
      res.sendFile(indexPath)
    } else {
      res.status(503).send(`<html><body><h2>前端构建产物未找到</h2><p>期望路径: ${dir}</p><p>请在 Railway 上重新部署并确保 npm run build 成功</p></body></html>`)
    }
  } else {
    res.status(404).json({ message: 'Not found' })
  }
})

const PORT = process.env.PORT || 3001
const HOST = process.env.HOST || '0.0.0.0'

initDB().then(() => {
  app.listen(PORT, HOST, () => {
    console.log(`服务器运行在 ${HOST}:${PORT}`)
    console.log(`网络访问模式: 公网开放模式（支持HTTP/HTTPS、公网IP、动态IP、云端域名）`)
    console.log(`安全策略: JWT鉴权已启用，IP白名单已关闭`)

    // 启动每日数据自动更新（每天 8:00）
    startDailyUpdate()
  })
}).catch(err => {
  console.error('服务器启动失败:', err)
  process.exit(1)
})