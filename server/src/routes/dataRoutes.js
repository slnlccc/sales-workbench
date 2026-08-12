/**
 * 数据查询 API
 * 市场概览、手动刷新
 */

const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/auth')
const { getMarketData, runDailyUpdate } = require('../services/dailyUpdateService')
const { isConfigured } = require('../services/deepseekService')

// 获取市场数据概览
router.get('/market-overview', protect, (req, res) => {
  const data = getMarketData()
  res.json({
    ...data,
    aiEnabled: isConfigured(),
  })
})

// 手动刷新市场数据
router.post('/refresh', protect, async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({
      message: 'AI 功能未启用，无法刷新数据。请配置 DEEPSEEK_API_KEY',
      aiEnabled: false,
    })
  }

  try {
    await runDailyUpdate()
    const data = getMarketData()
    res.json({
      ...data,
      message: '数据刷新成功',
      aiEnabled: true,
    })
  } catch (err) {
    console.error('手动刷新失败:', err.message)
    res.status(500).json({ message: '数据刷新失败: ' + err.message })
  }
})

module.exports = router
