const express = require('express')
const router = express.Router()
const { protect, protectOrGuest } = require('../middleware/auth')
const {
  syncMinutes,
  fetchUserAccessToken,
  refreshUserToken,
  searchMinutesAsUser,
} = require('../services/feishuService')
const { isConfigured: isAIConfigured, chatJSON } = require('../services/baiduService')

// =====================================
// 路由分组 1：OAuth 用户授权流程（无需登录，但要 state 校验）
// =====================================

/**
 * GET /api/feishu/login
 * 跳转飞书 OAuth 授权页
 * 前端按钮 href="/api/feishu/login" 即可
 */
router.get('/login', (req, res) => {
  const appId = req.query.app_id || process.env.FEISHU_APP_ID
  // state 用于回调时识别是哪个用户的请求（前端可传一个临时标识，后端不严格校验只透传）
  const state = req.query.state || 'sw'
  const redirectUri = `${req.protocol}://${req.get('host')}/api/feishu/callback`

  if (!appId) {
    return res.status(400).send('飞书应用未配置：缺少 App ID')
  }

  const authUrl =
    `https://open.feishu.cn/open-apis/authen/v1/authorize` +
    `?app_id=${encodeURIComponent(appId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}`

  res.redirect(authUrl)
})

/**
 * GET /api/feishu/callback
 * 飞书授权后回调到这里，前端用 query 里的 code 换 user token
 * 这里我们返回一个简单的 HTML 页面，把 code 通过 postMessage 传给父窗口
 */
router.get('/callback', (req, res) => {
  const { code, state, error, error_description } = req.query
  if (error) {
    return res.send(
      `<script>alert('飞书授权失败: ${error_description || error}');window.close();</script>`
    )
  }
  if (!code) {
    return res.status(400).send('回调缺少 code 参数')
  }
  // 通过 postMessage 把 code 传给父窗口（前端弹窗模式），然后自动关闭
  res.send(`<!doctype html><html><body><script>
    (function(){
      var code = ${JSON.stringify(code)};
      var state = ${JSON.stringify(state || '')};
      try {
        if (window.opener) {
          window.opener.postMessage({type:'feishu:auth-code', code: code, state: state}, '*');
        }
      } catch(e) {}
      setTimeout(function(){ window.close(); }, 100);
    })();
  </script>授权成功，窗口将自动关闭...</body></html>`)
})

/**
 * POST /api/feishu/exchange-user-token
 * body: { appId, appSecret, code }
 * 用 OAuth code 换 user_access_token，并把 token 信息返回给前端
 * 前端把 userToken 存 localStorage
 */
router.post('/exchange-user-token', async (req, res) => {
  const appId = req.body?.appId || process.env.FEISHU_APP_ID
  const appSecret = req.body?.appSecret || process.env.FEISHU_APP_SECRET
  const code = req.body?.code
  const redirectUri = req.body?.redirectUri ||
    `${req.protocol}://${req.get('host')}/api/feishu/callback`

  if (!appId || !appSecret) {
    return res.status(200).json({ ok: false, message: '飞书应用未配置' })
  }
  if (!code) {
    return res.status(200).json({ ok: false, message: '缺少 OAuth code' })
  }

  try {
    const tokenInfo = await fetchUserAccessToken(appId, appSecret, code, redirectUri)
    res.json({ ok: true, ...tokenInfo })
  } catch (err) {
    res.status(200).json({ ok: false, message: err.message || '换取 user token 失败' })
  }
})

// =====================================
// 路由分组 2：飞书同步（用 protectOrGuest，飞书 user token 是真正鉴权）
// 飞书 sync 不依赖工作台用户身份（飞书 user_access_token 才是凭证），
// 即便工作台 JWT 过期也能跑通，避免"refresh 失败→logout→无法同步"死锁
// =====================================
router.use(protectOrGuest)

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

/**
 * POST /api/feishu/sync-user
 * body: { appId, appSecret, userAccessToken, userRefreshToken, userExpiresAt }
 * 用 user_access_token 拉取用户私有妙记（owner_ids=me）
 *
 * 如果 access_token 过期，自动用 refresh_token 续期，返回新 token 供前端更新
 */
router.post('/sync-user', async (req, res) => {
  const appId = req.body?.appId || process.env.FEISHU_APP_ID
  const appSecret = req.body?.appSecret || process.env.FEISHU_APP_SECRET
  let userAccessToken = req.body?.userAccessToken
  const userRefreshToken = req.body?.userRefreshToken
  const userExpiresAt = req.body?.userExpiresAt // 毫秒时间戳

  // 调试日志（定位飞书返回 "Invalid access token" 问题）
  console.log('[sync-user] 收到请求:', {
    hasAppId: !!appId,
    hasAppSecret: !!appSecret,
    hasUserAccessToken: !!userAccessToken,
    userAccessTokenPrefix: userAccessToken ? userAccessToken.substring(0, 10) : '(none)',
    userAccessTokenLength: userAccessToken ? userAccessToken.length : 0,
    hasUserRefreshToken: !!userRefreshToken,
    userExpiresAt,
    userExpiresAtPast: userExpiresAt ? Date.now() > userExpiresAt : 'n/a',
  })

  if (!appId || !appSecret) {
    return res.status(200).json({ source: 'mock', items: [], message: '飞书应用未配置' })
  }
  if (!userAccessToken) {
    return res.status(200).json({
      source: 'mock',
      items: [],
      message: '未完成飞书授权：请点击"飞书授权登录"按钮',
    })
  }

  // access_token 过期自动 refresh
  let newTokenInfo = null
  if (userExpiresAt && Date.now() > userExpiresAt) {
    if (!userRefreshToken) {
      return res.status(200).json({
        source: 'mock',
        items: [],
        message: '飞书授权已过期，请重新点击"飞书授权登录"',
      })
    }
    try {
      newTokenInfo = await refreshUserToken(appId, appSecret, userRefreshToken)
      userAccessToken = newTokenInfo.accessToken
    } catch (err) {
      return res.status(200).json({
        source: 'mock',
        items: [],
        message: '飞书授权续期失败，请重新登录：' + err.message,
      })
    }
  }

  try {
    const items = await searchMinutesAsUser(userAccessToken, { days: 90 })
    res.json({
      source: 'real',
      items,
      message: `已同步 ${items.length} 条妙记`,
      // 如果有 refresh 续期，把新 token 回传给前端更新
      refreshedToken: newTokenInfo,
    })
  } catch (err) {
    res.status(200).json({
      source: 'mock',
      items: [],
      message: err.message || '拉取妙记失败',
    })
  }
})

// =====================================
// AI 智能提取待办事项 & 知识沉淀
// =====================================

/**
 * 用 AI 从会议内容中精准提取待办事项和知识沉淀
 * POST /api/feishu/extract-ai
 * body: { meetings: [{ id, title, content }] }
 * 返回: { results: [{ id, todos: string[], insights: string[] }] }
 */
router.post('/extract-ai', protect, async (req, res) => {
  try {
    const { meetings } = req.body
    if (!Array.isArray(meetings) || meetings.length === 0) {
      return res.json({ results: [] })
    }

    if (!isAIConfigured()) {
      return res.status(503).json({ message: 'AI 服务未配置' })
    }

    const systemPrompt = `你是一个专业的会议纪要分析助手。请从会议内容中提取【待办事项】和【知识沉淀】。

【待办事项】提取规则（非常重要，严格执行）：
1. 只提取明确需要某人去执行、有动作指向的事项
2. 必须包含动作词（如：提交、准备、安排、跟进、确认、完成、编写、整理、拜访、联系、推进、落实、出具、对接、协调等）
3. 以下内容绝对不能作为待办事项：
   - 会议议题、背景介绍、内容概括
   - 检测结果、数据指标、参数描述（如"硫磷达标，钛控制在0.18-0.23区间"）
   - 工艺说明、技术方案描述（如"马扩至1.2米后直接轧环"）
   - 已完成事项的陈述
   - 问题、疑问、讨论内容
4. 每条待办不超过60字，去掉前缀标点
5. 最多提取8条，宁缺毋滥

【知识沉淀】提取规则：
1. 提取可复用的方法论、经验总结、关键洞察
2. 必须是有启发性的结论，不是简单的事实陈述
3. 最多提取5条

请只返回 JSON，格式为：{"todos": ["..."], "insights": ["..."]}`

    // 限制并发，避免 API 限流
    const BATCH = 3
    const results = []

    for (let i = 0; i < meetings.length; i += BATCH) {
      const batch = meetings.slice(i, i + BATCH)
      const promises = batch.map(async (m) => {
        try {
          // 截断超长内容，避免 token 超限
          const content = (m.content || '').slice(0, 4000)
          const userMsg = `会议标题：${m.title || ''}\n\n会议内容：\n${content}`

          const data = await chatJSON([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMsg },
          ])

          return {
            id: m.id,
            todos: Array.isArray(data.todos) ? data.todos.filter(t => typeof t === 'string' && t.trim()).slice(0, 8) : [],
            insights: Array.isArray(data.insights) ? data.insights.filter(t => typeof t === 'string' && t.trim()).slice(0, 5) : [],
          }
        } catch (e) {
          console.error(`[extract-ai] 会议 ${m.id} 提取失败:`, e.message)
          return { id: m.id, todos: [], insights: [], error: e.message }
        }
      })

      const batchResults = await Promise.all(promises)
      results.push(...batchResults)
    }

    res.json({ results })
  } catch (err) {
    console.error('[extract-ai] 批量提取失败:', err)
    res.status(500).json({ message: 'AI 提取失败: ' + err.message })
  }
})

module.exports = router
