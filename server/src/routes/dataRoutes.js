/**
 * 数据查询 API
 * 市场概览、市情雷达各模块、竞争对手动态、手动刷新
 */

const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/auth')
const { getMarketData, runDailyUpdate } = require('../services/dailyUpdateService')
const { isConfigured } = require('../services/deepseekService')

// 获取市场数据概览（含市情雷达各模块：行业动态/原材料价格/招投标/政策法规/行业展会/竞争对手动态）
router.get('/market-overview', protect, (req, res) => {
  const data = getMarketData()
  res.json({
    ...data,
    aiEnabled: isConfigured(),
  })
})

// 单独获取竞争对手动态（公开接口，手机端/电脑端实时拉取，无需登录）
router.get('/competitors', (req, res) => {
  const data = getMarketData()
  res.json({
    competitors: data.competitors,
    lastUpdate: data.radarLastUpdate,
    aiEnabled: isConfigured(),
  })
})

// 手动刷新市场数据（触发全部雷达模块重新生成）
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
