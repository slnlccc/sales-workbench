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
// 加 25s 超时保护：AI 生成可能很慢，超时后先返回当前数据，AI 在后台继续生成
// 并发保护：如果已有刷新在进行中，直接返回当前数据，避免重复触发 AI 调用
let refreshInProgress = false
router.post('/refresh', protectOrGuest, async (req, res) => {
  const REFRESH_TIMEOUT_MS = 25 * 1000
  const timeout = new Promise((resolve) => setTimeout(resolve, REFRESH_TIMEOUT_MS))
  try {
    if (!refreshInProgress) {
      refreshInProgress = true
      // 后台跑完整刷新，完成后才释放锁（超时不释放，防止并发触发）
      const updatePromise = runDailyUpdate().finally(() => {
        refreshInProgress = false
      })
      // 接口最多等 25s，超时就先返回当前数据，AI 生成继续在后台
      await Promise.race([updatePromise, timeout])
    }
    const data = getMarketData()
    res.json({
      ...data,
      message: isConfigured() ? '数据刷新成功' : 'AI 未启用，已使用内置兜底数据',
      aiEnabled: isConfigured(),
    })
  } catch (err) {
    refreshInProgress = false
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
