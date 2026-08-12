const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/auth')
const { syncUpload, syncPull, syncStatus, syncConfig } = require('../controllers/syncController')

// 所有同步路由都需要登录
router.use(protect)

// 上传数据到云端
router.post('/upload', syncUpload)

// 从云端拉取数据
router.post('/pull', syncPull)

// 获取同步状态
router.get('/status', syncStatus)

// 获取云同步配置信息
router.get('/config', syncConfig)

module.exports = router
