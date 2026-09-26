/**
 * 飞书妙记 (Lark Minutes) 后端代理服务
 *
 * 设计目的：
 *  1. 解决浏览器跨域问题：飞书开放平台 API 不返回 Access-Control-Allow-Origin，
 *     浏览器从 sales-workbench-bksc.onrender.com 直接调 open.feishu.cn 必失败。
 *  2. 避免 App Secret 暴露在前端 localStorage 中（虽然当前轻量方案仍由前端
 *     传给后端，但 Secret 不再发往飞书 API 之外的第三方）。
 *
 * 真实飞书 API（依据 lark-cli 文档）：
 *  - 鉴权:  POST /open-apis/auth/v3/tenant_access_token/internal
 *  - 搜索:  POST /open-apis/minutes/v1/minutes/search
 *           scope: minutes:minutes.search:read
 *           必须至少一个过滤条件（query / owner_ids / participant_ids / start_time / end_time）
 *           bot/tenant 身份没有 "me"，所以默认用最近 N 天作为时间范围过滤
 *
 * 注：之前的 GET /open-apis/minutes/v1/minutes?limit=30 是错误路径，飞书实测 404。
 */

const axios = require('axios')

const FEISHU_BASE = 'https://open.feishu.cn/open-apis'

// axios 实例：不读环境变量代理（避免 sandbox HTTP_PROXY 把 HTTPS 请求劫持为明文）
// Render 服务器没有 HTTP_PROXY，但本地 sandbox 有，会导致 400
const http = axios.create({
  timeout: 15000,
  proxy: false, // 关键：禁用 axios 从 env 读取代理
})

// 把 axios 错误转换成更可读的消息（保留飞书 API 业务错误和 HTTP 层错误）
function formatAxiosError(prefix, err) {
  if (err.response) {
    // 飞书 API 返回了 HTTP 响应
    const status = err.response.status
    const data = err.response.data
    let detail = ''
    if (typeof data === 'string') {
      // HTML 错误页（如代理/网关错误）
      detail = data.slice(0, 200)
    } else if (data) {
      detail = JSON.stringify(data).slice(0, 300)
    }
    return `${prefix}: HTTP ${status} ${detail}`
  }
  // 网络层错误（DNS/超时/代理）
  return `${prefix}: ${err.code || err.message}`
}

// 1) 获取 tenant_access_token（应用凭证 → token）
async function fetchTenantAccessToken(appId, appSecret) {
  let res
  try {
    res = await http.post(
      `${FEISHU_BASE}/auth/v3/tenant_access_token/internal`,
      { app_id: appId, app_secret: appSecret },
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    throw new Error(formatAxiosError('飞书鉴权失败', err))
  }
  const data = res.data || {}
  // 注意：tenant_access_token 接口成功时返回 { code: 0, tenant_access_token, expire }
  if (data.code !== 0) {
    throw new Error(`飞书鉴权失败: ${data.msg || 'code=' + data.code}`)
  }
  return data.tenant_access_token
}

// 2) 搜索妙记列表（bot/tenant 身份）
//    bot 身份没有 "me"，必须传一个过滤条件；默认用最近 N 天作为时间范围
async function searchMinutes(token, options = {}) {
  const { pageSize = 30, days = 90 } = options
  const now = Date.now()
  // 飞书 API 时间戳为秒级字符串
  const startTime = String(Math.floor((now - days * 24 * 60 * 60 * 1000) / 1000))
  const endTime = String(Math.floor(now / 1000))

  let res
  try {
    res = await http.post(
      `${FEISHU_BASE}/minutes/v1/minutes/search`,
      {
        page_size: pageSize,
        start_time: startTime,
        end_time: endTime,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    )
  } catch (err) {
    throw new Error(formatAxiosError('拉取妙记列表失败', err))
  }
  const data = res.data || {}
  if (data.code !== 0) {
    const msg = data.msg || ''
    // 友好提示：scope 不足时引导用户去开放平台后台
    if (msg.includes('permission') || msg.includes('scope') || msg.includes('权限')) {
      throw new Error(
        `飞书权限不足：请到飞书开放平台后台为应用开通 "minutes:minutes.search:read" 权限并发布新版本（${msg}）`
      )
    }
    throw new Error(`拉取妙记列表失败: ${msg || 'code=' + data.code}`)
  }
  // 飞书返回结构: { code, msg, data: { items, has_more, page_token } }
  const items = data.data?.items || []
  // 统一字段为前端可消费的形态
  return items.map((m) => ({
    minutes_id: m.minute_token || m.minutes_id || m.token || '',
    minute_token: m.minute_token || m.minutes_id || m.token || '',
    title: m.title || '未命名妙记',
    owner_id: m.owner?.open_id || m.owner_id || '',
    create_time: m.create_time || m.start_time || Math.floor(now / 1000),
    url: m.url || '',
    summary: m.summary || '',
  }))
}

// 3) 同步入口：appId/appSecret 换 token → 拉妙记列表
async function syncMinutes(appId, appSecret, options = {}) {
  if (!appId || !appSecret) {
    throw new Error('飞书应用未配置：缺少 App ID 或 App Secret')
  }
  const token = await fetchTenantAccessToken(appId, appSecret)
  const items = await searchMinutes(token, options)
  return items
}

module.exports = {
  syncMinutes,
  fetchTenantAccessToken,
  searchMinutes,
}
