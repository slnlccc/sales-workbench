const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/auth')
const { syncUpload, syncUploadLocal, syncPull, syncStatus, syncConfig } = require('../controllers/syncController')

// 所有同步路由都需要登录
router.use(protect)

// 上传 MongoDB 里的数据到云端（原有方式）
router.post('/upload', syncUpload)

// 上传前端 localStorage 的数据到云端（绕过 MongoDB，桥接前端数据源）
router.post('/upload-local', syncUploadLocal)

// 从云端拉取数据
router.post('/pull', syncPull)

// 获取同步状态
router.get('/status', syncStatus)

// 获取云同步配置信息
router.get('/config', syncConfig)

module.exports = router
