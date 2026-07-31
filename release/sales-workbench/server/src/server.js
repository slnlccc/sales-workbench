require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const connectDB = require('./config/db')
const User = require('./models/User')

const app = express()

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

app.use(cors())
app.use(express.json())

app.use(express.static(path.join(__dirname, '../../dist')))

app.use('/api/users', require('./routes/userRoutes'))
app.use('/api/projects', require('./routes/projectRoutes'))
app.use('/api/contracts', require('./routes/contractRoutes'))
app.use('/api/schedules', require('./routes/scheduleRoutes'))
app.use('/api/customers', require('./routes/customerRoutes'))

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist', 'index.html'))
})

const PORT = process.env.PORT || 3001

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`)
    console.log(`访问地址: http://localhost:${PORT}`)
  })
}).catch(err => {
  console.error('数据库初始化失败:', err)
  process.exit(1)
})