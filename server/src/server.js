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

app.use('/api/users', require('./routes/userRoutes'))
app.use('/api/projects', require('./routes/projectRoutes'))
app.use('/api/contracts', require('./routes/contractRoutes'))
app.use('/api/schedules', require('./routes/scheduleRoutes'))
app.use('/api/customers', require('./routes/customerRoutes'))
app.use('/api/sync', require('./routes/syncRoutes'))

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist', 'index.html'))
})

const PORT = process.env.PORT || 3001
const HOST = process.env.HOST || '0.0.0.0'

initDB().then(() => {
  app.listen(PORT, HOST, () => {
    console.log(`服务器运行在 ${HOST}:${PORT}`)
    console.log(`网络访问模式: 公网开放模式（支持HTTP/HTTPS、公网IP、动态IP、云端域名）`)
    console.log(`安全策略: JWT鉴权已启用，IP白名单已关闭`)
  })
}).catch(err => {
  console.error('服务器启动失败:', err)
  process.exit(1)
})