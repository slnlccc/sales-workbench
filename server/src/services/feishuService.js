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
  const { pageSize = 20, days = 90 } = options
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

// ============================================================
// OAuth user_access_token 流程（拉取用户私有妙记所必需）
// ============================================================

// 4) 用 OAuth code 换 user_access_token
//    正确端点是 /authen/v1/access_token（不要用 /authen/v1/access_token/internal/user_access_token，那是旧版会 404）
async function fetchUserAccessToken(appId, appSecret, code, redirectUri) {
  // 先拿 tenant_access_token（调 user token 接口需要 TAT 鉴权）
  const tat = await fetchTenantAccessToken(appId, appSecret)

  let res
  try {
    res = await http.post(
      `${FEISHU_BASE}/authen/v1/access_token`,
      {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tat}`,
        },
      }
    )
  } catch (err) {
    throw new Error(formatAxiosError('换取 user token 失败', err))
  }
  const data = res.data || {}
  if (data.code !== 0) {
    throw new Error(`换取 user token 失败: ${data.msg || 'code=' + data.code}`)
  }
  // data.data: { access_token, refresh_token, token_type, expires_in(秒), refresh_expires_in }
  const ud = data.data || {}
  return {
    accessToken: ud.access_token,
    refreshToken: ud.refresh_token,
    openId: ud.open_id,
    expiresAt: Date.now() + (ud.expires_in || 7200) * 1000,
    refreshExpiresAt: Date.now() + (ud.refresh_expires_in || 30 * 86400) * 1000,
  }
}

// 5) 用 refresh_token 续期 user_access_token
//    正确端点是 /authen/v1/refresh_access_token（旧版 /authen/v1/refresh_access_token/internal 会 404）
async function refreshUserToken(appId, appSecret, refreshToken) {
  const tat = await fetchTenantAccessToken(appId, appSecret)
  let res
  try {
    res = await http.post(
      `${FEISHU_BASE}/authen/v1/refresh_access_token`,
      {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tat}`,
        },
      }
    )
  } catch (err) {
    throw new Error(formatAxiosError('刷新 user token 失败', err))
  }
  const data = res.data || {}
  if (data.code !== 0) {
    throw new Error(`刷新 user token 失败: ${data.msg || 'code=' + data.code}`)
  }
  const ud = data.data || {}
  return {
    accessToken: ud.access_token,
    refreshToken: ud.refresh_token || refreshToken, // 续期后 refresh_token 可能换新也可能不变
    openId: ud.open_id,
    expiresAt: Date.now() + (ud.expires_in || 7200) * 1000,
    refreshExpiresAt: Date.now() + (ud.refresh_expires_in || 30 * 86400) * 1000,
  }
}

// 6) 用 user_access_token 搜索妙记（owner_ids=me 能拉到用户私有的妙记）
//    正确请求体格式（参考 lark-cli --dry-run 输出）：
//      {
//        "filter": {
//          "create_time": { "start_time": "ISO 8601", "end_time": "ISO 8601" },
//          "owner_ids": ["ou_xxx"]   // 必须是 open_id，不是 "me"
//        }
//      }
//    时间格式：ISO 8601 字符串（YYYY-MM-DDTHH:MM:SSZ），不是 unix 时间戳
async function searchMinutesAsUser(userAccessToken, options = {}) {
  const { pageSize = 20, days = 90, userOpenId } = options

  // 时间格式：ISO 8601（UTC）— 飞书要求精确格式 2026-08-26T00:00:00Z
  // 注意不能用 toISOString().replace()，因为 .972Z 替换后格式会错乱
  const pad = (n) => String(n).padStart(2, '0')
  const fmtIso = (d, endOfDay = false) => {
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${endOfDay ? '23:59:59Z' : '00:00:00Z'}`
  }
  const now = new Date()
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  const startTimeIso = fmtIso(start, false)
  const endTimeIso = fmtIso(now, true)

  // 构造请求体：filter.create_time + filter.owner_ids（必须是 open_id）
  const baseBody = {
    filter: {
      create_time: {
        start_time: startTimeIso,
        end_time: endTimeIso,
      },
    },
  }
  if (userOpenId) {
    baseBody.filter.owner_ids = [userOpenId]
  }

  // 分页拉取所有妙记（飞书 search 默认 page_size 最大 50）
  let allItems = []
  let pageToken = ''
  let pageCount = 0

  do {
    pageCount++
    const body = { ...baseBody }
    if (pageToken) body.page_token = pageToken

    console.log(`[searchMinutesAsUser] 第${pageCount}页 请求飞书 search:`, {
      tokenPrefix: userAccessToken ? userAccessToken.substring(0, 15) + '...' : '(none)',
      userOpenId: userOpenId || '(none)',
      startTimeIso, endTimeIso,
      pageToken: pageToken || '(first page)',
    })

    let res
    try {
      res = await http.post(
        `${FEISHU_BASE}/minutes/v1/minutes/search`,
        body,
        {
          params: { page_size: String(pageSize) },
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userAccessToken}`,
          },
        }
      )
    } catch (err) {
      throw new Error(formatAxiosError('拉取用户妙记失败', err))
    }
    const data = res.data || {}
    if (data.code !== 0) {
      throw new Error(`拉取用户妙记失败: ${data.msg || 'code=' + data.code}`)
    }
    const pageItems = data.data?.items || []
    allItems = allItems.concat(pageItems)
    pageToken = data.data?.page_token || ''
    const hasMore = data.data?.has_more

    console.log(`[searchMinutesAsUser] 第${pageCount}页 返回 ${pageItems.length} 条, has_more=${hasMore}, total=${allItems.length}`)

    if (!hasMore || !pageToken) break
    // 安全限制：最多拉 10 页（500 条），防止死循环
    if (pageCount >= 10) break
  } while (pageToken)

  const items = allItems
  const nowSec = Math.floor(Date.now() / 1000)

  // 飞书 search API 只返回 display_info + meta_data + token，没有 title/summary
  // 需要对每条 item 再调 detail API 拉真实 title + AI summary
  const enriched = await Promise.all(
    items.map(async (m) => {
      const token = m.minute_token || m.minutes_id || m.token || ''
      // 从 display_info 提取标题（第一行的纯文本部分）
      const displayInfo = m.display_info || ''
      const titleFromDisplay = displayInfo.split('\n')[0] || '未命名妙记'

      let title = titleFromDisplay
      let summary = m.meta_data?.description || ''
      let createTime = nowSec
      let chapters = []
      let keywords = []

      // 调 detail API 拉真实 title + summary（用户身份，可读用户私有妙记详情）
      if (token) {
        try {
          const detail = await fetchMinuteDetail(userAccessToken, token)
          if (detail?.title) title = detail.title
          if (detail?.summary) summary = detail.summary
          if (detail?.create_time) createTime = detail.create_time
          if (detail?.chapters) chapters = detail.chapters
          if (detail?.keywords) keywords = detail.keywords
        } catch (e) {
          // 详情拉失败不影响列表，用 search 的 fallback 数据
          console.warn(`[searchMinutesAsUser] 拉详情失败 token=${token}:`, e.message)
        }
      }

      return {
        minutes_id: token,
        minute_token: token,
        title,
        owner_id: m.owner?.open_id || m.owner_id || '',
        create_time: createTime,
        url: m.meta_data?.app_link || m.url || '',
        summary,
        chapters,
        keywords,
      }
    })
  )
  return enriched
}

// 7) 拉单条妙记详情（title + AI summary + create_time）
//    GET /minutes/v1/minutes/{minute_token}       → 妙记基础信息（title、create_time 等）
//    GET /minutes/v1/minutes/{minute_token}/artifacts  → AI 产物（summary、transcript 等）
//    两个接口合并返回给前端
async function fetchMinuteDetail(userAccessToken, minuteToken) {
  // 1) 基础信息
  let title = ''
  let createTime = 0
  try {
    const res = await http.get(
      `${FEISHU_BASE}/minutes/v1/minutes/${minuteToken}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAccessToken}`,
        },
      }
    )
    const data = res.data || {}
    if (data.code === 0) {
      const m = data.data?.minute || data.data || {}
      title = m.title || ''
      createTime = m.create_time || m.start_time || 0
    }
  } catch (e) {
    // 基础信息失败时仍可尝试 artifacts，不直接抛
  }

  // 2) AI 产物（summary / transcript / minute_chapters / keywords）
  //    飞书返回结构：data 直接含 summary(string)、transcript、minute_chapters、keywords
  //    不是嵌套在 data.artifacts 里（之前字段路径错了）
  let summary = ''
  let chapters = []
  let keywords = []
  try {
    const res = await http.get(
      `${FEISHU_BASE}/minutes/v1/minutes/${minuteToken}/artifacts`,
      {
        params: { type: 'summary' },
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAccessToken}`,
        },
      }
    )
    const data = res.data || {}
    if (data.code === 0) {
      const d = data.data || {}
      summary = d.summary || ''
      chapters = d.minute_chapters || []
      keywords = d.keywords || []
    }
  } catch (e) {
    // artifacts 失败不抛，只返回基础信息
  }

  return { title, summary, create_time: createTime, chapters, keywords }
}

module.exports = {
  syncMinutes,
  fetchTenantAccessToken,
  searchMinutes,
  // OAuth user token 流程
  fetchUserAccessToken,
  refreshUserToken,
  searchMinutesAsUser,
}
