const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/auth')
const {
  syncMinutes,
  fetchUserAccessToken,
  refreshUserToken,
  searchMinutesAsUser,
} = require('../services/feishuService')

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
// 路由分组 2：需登录（带 workbench JWT）
// =====================================
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
    const items = await searchMinutesAsUser(userAccessToken, { days: 30 })
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

module.exports = router
