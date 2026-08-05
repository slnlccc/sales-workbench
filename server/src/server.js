require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')

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

const PORT = process.env.PORT || 3001
const HOST = process.env.HOST || '0.0.0.0'

// ============ 健康检查端点（最优先注册，无需任何依赖）============
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), version: 'v2.1' })
})

// ============ 托管静态文件 ============
app.use(express.static(path.join(__dirname, '../../dist')))

// ============ API 路由（延迟加载，确保健康检查优先）============
let routesLoaded = false

function loadRoutes() {
  if (routesLoaded) return
  routesLoaded = true

  try {
    app.use('/api/users', require('./routes/userRoutes'))
    app.use('/api/projects', require('./routes/projectRoutes'))
    app.use('/api/contracts', require('./routes/contractRoutes'))
    app.use('/api/schedules', require('./routes/scheduleRoutes'))
    app.use('/api/customers', require('./routes/customerRoutes'))
    app.use('/api/sync', require('./routes/syncRoutes'))
    app.use('/api/ai', require('./routes/aiRoutes'))
    app.use('/api/data', require('./routes/dataRoutes'))
    console.log('API 路由加载完成')
  } catch (err) {
    console.error('API 路由加载失败:', err.message)
  }
}

// ============ 数据库初始化（延迟执行，不阻塞启动）============
async function initDB() {
  try {
    const connectDB = require('./config/db')
    await connectDB()
    console.log('数据库连接成功')

    const User = require('./models/User')
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

    // 数据库就绪后再加载路由（部分路由依赖数据库）
    loadRoutes()

    // 启动每日数据更新（延迟执行，避免阻塞启动）
    setTimeout(() => {
      try {
        const { startScheduler } = require('./services/dailyUpdateService')
        startScheduler()
      } catch (err) {
        console.error('定时任务启动失败（不影响服务）:', err.message)
      }
    }, 5000)
  } catch (err) {
    console.error('数据库初始化失败（不影响服务启动）:', err.message)
    // 即使数据库失败也加载路由，让 API 返回友好错误
    loadRoutes()
  }
}

// ============ 启动服务器 ============
const server = app.listen(PORT, HOST, () => {
  console.log(`========================================`)
  console.log(`服务器运行在 ${HOST}:${PORT}`)
  console.log(`版本: v2.1`)
  console.log(`网络访问模式: 公网开放模式`)
  console.log(`========================================`)

  // 路由先加载（确保基础 API 可用）
  loadRoutes()

  // 数据库初始化延迟 2 秒开始（确保健康检查先通过）
  setTimeout(() => {
    initDB()
  }, 2000)

  // 检查 AI 服务配置
  if (process.env.DEEPSEEK_API_KEY) {
    console.log('AI 服务: DeepSeek 已接入')
  } else {
    console.log('AI 服务: 未配置 DEEPSEEK_API_KEY，AI 功能暂不可用')
  }
})

// ============ 服务器错误处理 ============
server.on('error', (err) => {
  console.error('服务器错误:', err.message)
  if (err.syscall === 'listen') {
    console.error(`端口 ${PORT} 可能已被占用`)
  }
})

process.on('uncaughtException', (err) => {
  console.error('未捕获异常:', err.message)
})

process.on('unhandledRejection', (reason) => {
  console.error('未处理的 Promise 拒绝:', reason)
})

// ============ 前端 fallback ============
app.get('*', (req, res) => {
  if (!routesLoaded) loadRoutes()
  res.sendFile(path.join(__dirname, '../../dist', 'index.html'))
})
