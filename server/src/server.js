require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const connectDB = require('./config/db')
const User = require('./models/User')

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

app.use(express.static(path.join(__dirname, '../../dist')))

// 健康检查端点（无需认证，供 Railway 健康检查使用）
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), version: 'v2.1', timestamp: Date.now() })
})

app.use('/api/users', require('./routes/userRoutes'))
app.use('/api/projects', require('./routes/projectRoutes'))
app.use('/api/contracts', require('./routes/contractRoutes'))
app.use('/api/schedules', require('./routes/scheduleRoutes'))
app.use('/api/customers', require('./routes/customerRoutes'))
app.use('/api/sync', require('./routes/syncRoutes'))
app.use('/api/ai', require('./routes/aiRoutes'))
app.use('/api/data', require('./routes/dataRoutes'))

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist', 'index.html'))
})

const PORT = process.env.PORT || 3001
const HOST = process.env.HOST || '0.0.0.0'

// 先启动 HTTP 服务器（让健康检查能通过）
const server = app.listen(PORT, HOST, () => {
  console.log(`服务器运行在 ${HOST}:${PORT}`)
  console.log(`网络访问模式: 公网开放模式（支持HTTP/HTTPS、公网IP、动态IP、云端域名）`)
  console.log(`安全策略: JWT鉴权已启用，IP白名单已关闭`)

  // 异步初始化数据库（不阻塞服务器启动）
  initDB().then(() => {
    console.log('数据库初始化完成')

    // 启动每日数据更新定时任务
    const { startScheduler } = require('./services/dailyUpdateService')
    startScheduler()

    // 检查 AI 服务配置
    if (process.env.DEEPSEEK_API_KEY) {
      console.log('AI 服务: DeepSeek 已接入')
    } else {
      console.log('AI 服务: 未配置 DEEPSEEK_API_KEY，AI 功能暂不可用')
    }
  }).catch(err => {
    console.error('数据库初始化失败（不影响服务启动）:', err.message)
  })
})