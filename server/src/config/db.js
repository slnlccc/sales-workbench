const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

let mongoServer = null

const connectDB = async () => {
  // 支持 MONGODB_URI 和 Railway 自动注入的 MONGOURL
  const mongoURI = process.env.MONGODB_URI || process.env.MONGOURL

  if (mongoURI) {
    try {
      await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      })
      console.log('MongoDB连接成功:', mongoURI.includes('mongodb-memory') ? '内存模式' : '远程数据库')
      return
    } catch (err) {
      console.warn('MongoDB连接失败，切换到内存数据库:', err.message)
    }
  } else {
    console.log('未配置 MONGODB_URI/MONGOURL，使用内存数据库')
  }

  // 降级到内存数据库
  try {
    mongoServer = await MongoMemoryServer.create()
    const uri = mongoServer.getUri()
    await mongoose.connect(uri)
    console.log('内存MongoDB连接成功:', uri)
  } catch (memErr) {
    console.error('内存MongoDB也连接失败:', memErr.message)
    process.exit(1)
  }
}

module.exports = connectDB
