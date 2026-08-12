const cloudSync = require('../services/cloudSyncService')

// 上传数据到云端
const syncUpload = async (req, res) => {
  try {
    const result = await cloudSync.uploadToCloud(req.user.id)
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
    const cloudData = await cloudSync.downloadFromCloud(req.user.id)
    const imported = await cloudSync.importCloudData(req.user.id, cloudData)
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
    const status = await cloudSync.getSyncStatus(req.user.id)
    res.json(status)
  } catch (err) {
    res.status(500).json({ message: err.message || '获取同步状态失败' })
  }
}

// 检查云同步是否已配置
const syncConfig = async (req, res) => {
  res.json({
    configured: cloudSync.isConfigured(),
    region: process.env.TENCENT_COS_REGION || '',
    bucket: process.env.TENCENT_COS_BUCKET || '',
  })
}

module.exports = {
  syncUpload,
  syncPull,
  syncStatus,
  syncConfig,
}
