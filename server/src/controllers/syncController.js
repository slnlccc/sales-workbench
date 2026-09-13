const cloudSync = require('../services/cloudSyncService')
const cosKeys = require('../config/cosKeys')

// 统一获取用户ID字符串
const getUserId = (req) => String(req.user._id || req.user.id)
const getUsername = (req) => String(req.user.username || '')

// 上传数据到云端
const syncUpload = async (req, res) => {
  try {
    const result = await cloudSync.uploadToCloud(getUserId(req), getUsername(req))
    res.json({
      message: '数据同步到云端成功',
      ...result,
    })
  } catch (err) {
    res.status(500).json({ message: err.message || '云端同步失败' })
  }
}

// 从云端拉取数据
const syncPull = async (req, res) => {
  try {
    const userId = getUserId(req)
    const username = getUsername(req)
    const cloudData = await cloudSync.downloadFromCloud(username)
    const imported = await cloudSync.importCloudData(userId, cloudData)
    res.json({
      message: '从云端拉取数据成功',
      imported,
      cloudExportedAt: cloudData.exportedAt,
    })
  } catch (err) {
    res.status(500).json({ message: err.message || '云端拉取失败' })
  }
}

// 获取同步状态
const syncStatus = async (req, res) => {
  try {
    const status = await cloudSync.getSyncStatus(getUsername(req))
    res.json(status)
  } catch (err) {
    res.status(500).json({ message: err.message || '获取同步状态失败' })
  }
}

// 检查云同步是否已配置
const syncConfig = async (req, res) => {
  res.json({
    configured: cloudSync.isConfigured(),
    region: process.env.TENCENT_COS_REGION || cosKeys.TENCENT_COS_REGION || '',
    bucket: process.env.TENCENT_COS_BUCKET || cosKeys.TENCENT_COS_BUCKET || '',
  })
}

// 接收前端传来的 localStorage 数据，直接写入云端（绕过 MongoDB）
const syncUploadLocal = async (req, res) => {
  try {
    const localData = req.body
    if (!localData || typeof localData !== 'object') {
      return res.status(400).json({ message: '无效的数据格式' })
    }
    const result = await cloudSync.uploadLocalDataToCloud(getUsername(req), localData)
    res.json({ message: '本地数据同步到云端成功', ...result })
  } catch (err) {
    res.status(500).json({ message: err.message || '云端同步失败' })
  }
}

module.exports = {
  syncUpload,
  syncUploadLocal,
  syncPull,
  syncStatus,
  syncConfig,
}
