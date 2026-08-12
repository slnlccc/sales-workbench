const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

let mongoServer = null

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    })
    console.log('MongoDB连接成功')
  } catch (err) {
    console.warn('MongoDB连接失败，切换到内存数据库:', err.message)
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
}

module.exports = connectDB