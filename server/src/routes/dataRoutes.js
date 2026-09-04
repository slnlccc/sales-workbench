/**
 * 数据查询 API
 * 市场概览、市情雷达各模块、竞争对手动态、手动刷新
 */

const express = require('express')
const router = express.Router()
const { protectOrGuest } = require('../middleware/auth')
const { getMarketData, runDailyUpdate } = require('../services/dailyUpdateService')
const { isConfigured } = require('../services/baiduService')

// 获取市场数据概览（含市情雷达各模块：行业动态/原材料价格/招投标/政策法规/行业展会/竞争对手动态）
router.get('/market-overview', protectOrGuest, (req, res) => {
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

// 手动刷新市场数据（AI 可用时重新生成，不可用时确保 fallback 数据在内存中）
router.post('/refresh', protectOrGuest, async (req, res) => {
  try {
    await runDailyUpdate()
    const data = getMarketData()
    res.json({
      ...data,
      message: isConfigured() ? '数据刷新成功' : 'AI 未启用，已使用内置兜底数据',
      aiEnabled: isConfigured(),
    })
  } catch (err) {
    console.error('手动刷新失败:', err.message)
    const data = getMarketData()
    res.json({
      ...data,
      message: '刷新异常，已返回兜底数据',
      aiEnabled: isConfigured(),
    })
  }
})

module.exports = router
