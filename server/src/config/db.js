const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

let mongoServer = null

const connectDB = async () => {
  // 优先使用 MONGODB_URI 环境变量（Railway MongoDB / Atlas 等）
  // Railway 会自动注入 MONGOURL 变量
  const mongoUri = process.env.MONGODB_URI || process.env.MONGOURL

  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      })
      console.log('MongoDB 连接成功:', mongoUri.replace(/\/\/.*:.*@/, '//***:***@'))
      return
    } catch (err) {
      console.warn('MongoDB 连接失败，切换到内存数据库:', err.message)
    }
  } else {
    console.log('未配置 MONGODB_URI，使用内存数据库（数据不会持久化）')
  }

  // 降级到内存数据库
  try {
    mongoServer = await MongoMemoryServer.create()
    const uri = mongoServer.getUri()
    await mongoose.connect(uri)
    console.log('内存 MongoDB 连接成功（仅开发/演示用，数据不持久化）')
  } catch (memErr) {
    console.error('内存 MongoDB 也连接失败:', memErr.message)
    process.exit(1)
  }
}

module.exports = connectDB