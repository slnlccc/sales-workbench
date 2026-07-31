const express = require('express')
const router = express.Router()
const { getModels } = require('../services/dailyUpdateService')
const { callDeepSeek } = require('../services/deepseekService')
const { protect: auth } = require('../middleware/auth')

/**
 * GET /api/data/metal-prices
 * 获取最新金属价格
 */
router.get('/metal-prices', auth, async (req, res) => {
  try {
    const { MetalPrice } = getModels()
    const latest = await MetalPrice.findOne().sort({ date: -1 })
    res.json({ success: true, data: latest })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/data/metal-prices/history
 * 获取金属价格历史趋势
 */
router.get('/metal-prices/history', auth, async (req, res) => {
  try {
    const { MetalPrice } = getModels()
    const days = parseInt(req.query.days) || 30
    const history = await MetalPrice.find()
      .sort({ date: -1 })
      .limit(days)
    res.json({ success: true, data: history })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/data/industry-news
 * 获取行业资讯
 */
router.get('/industry-news', auth, async (req, res) => {
  try {
    const { IndustryNews } = getModels()
    const { category, limit = 20 } = req.query
    const filter = category ? { category } : {}
    const news = await IndustryNews.find(filter)
      .sort({ publishDate: -1, createdAt: -1 })
      .limit(parseInt(limit))
    res.json({ success: true, data: news })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/data/exhibitions
 * 获取展会信息
 */
router.get('/exhibitions', auth, async (req, res) => {
  try {
    const { Exhibition } = getModels()
    const { status } = req.query
    const filter = status ? { status } : {}
    const exhibitions = await Exhibition.find(filter)
      .sort({ date: 1 })
    res.json({ success: true, data: exhibitions })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/data/refresh
 * 手动触发数据更新
 */
router.post('/refresh', auth, async (req, res) => {
  try {
    const { runDailyUpdate } = require('../services/dailyUpdateService')
    await runDailyUpdate()
    res.json({ success: true, message: '数据更新完成' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/data/market-overview
 * 获取市场概览（综合数据）
 */
router.get('/market-overview', auth, async (req, res) => {
  try {
    const { MetalPrice, IndustryNews, Exhibition } = getModels()

    const [latestPrice, recentNews, upcomingExhibitions] = await Promise.all([
      MetalPrice.findOne().sort({ date: -1 }),
      IndustryNews.find().sort({ publishDate: -1 }).limit(5),
      Exhibition.find({ status: 'upcoming' }).sort({ date: 1 }).limit(3),
    ])

    // 如果有金属价格数据，用 AI 生成市场分析摘要
    let analysis = null
    if (latestPrice) {
      try {
        analysis = await callDeepSeek(
          '你是金属市场分析师。根据价格数据生成简短的市场分析摘要（100字以内）。',
          `今日金属价格：${JSON.stringify(latestPrice.metals)}`,
          { temperature: 0.3, max_tokens: 300 }
        )
      } catch (e) {
        // AI 分析失败不影响整体返回
      }
    }

    res.json({
      success: true,
      data: {
        metalPrices: latestPrice,
        news: recentNews,
        exhibitions: upcomingExhibitions,
        analysis,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
