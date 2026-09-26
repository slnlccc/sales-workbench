const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/auth')
const { syncMinutes } = require('../services/feishuService')

// 所有飞书路由都需要登录（避免匿名用户消耗 App Secret）
router.use(protect)

/**
 * POST /api/feishu/sync
 * body: { appId, appSecret }
 * 返回: { source: 'real' | 'mock', items: [], message?: string }
 *
 * 轻量方案：App ID/Secret 由前端 localStorage 传给后端，后端用此凭证
 * 调飞书 API。后续可迁移到 Render 环境变量（FEISHU_APP_ID/SECRET）更安全。
 */
router.post('/sync', async (req, res) => {
  const appId = req.body?.appId || process.env.FEISHU_APP_ID
  const appSecret = req.body?.appSecret || process.env.FEISHU_APP_SECRET

  if (!appId || !appSecret) {
    return res.status(200).json({
      source: 'mock',
      items: [],
      message: '飞书应用未配置：请在前端"飞书配置"中填入 App ID 和 App Secret',
    })
  }

  try {
    const items = await syncMinutes(appId, appSecret)
    res.json({ source: 'real', items, message: `已同步 ${items.length} 条妙记` })
  } catch (err) {
    // 同步失败时返回 mock 标识，让前端走 fallback；HTTP 200 避免前端 catch
    res.status(200).json({
      source: 'mock',
      items: [],
      message: err.message || '飞书同步失败',
    })
  }
})

module.exports = router
