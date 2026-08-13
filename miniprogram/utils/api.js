// 小程序共用 HTTP 请求封装
// 用 wx.request 调用 Railway 后端 REST API，替代微信云函数
// 与电脑端Web共享同一个 MongoDB 数据库 + COS 云同步

const API_BASE = 'https://sales-workbench-production-cac2.up.railway.app/api'

const TOKEN_KEY = 'jwt_token'
const USER_KEY = 'user_info'

// 获取缓存的 JWT
const getToken = () => wx.getStorageSync(TOKEN_KEY) || ''
const setToken = (t) => wx.setStorageSync(TOKEN_KEY, t)
const clearToken = () => wx.removeStorageSync(TOKEN_KEY)

const getUser = () => wx.getStorageSync(USER_KEY) || null
const setUser = (u) => wx.setStorageSync(USER_KEY, u)
const clearUser = () => wx.removeStorageSync(USER_KEY)

const isLoggedIn = () => !!getToken()

// 统一请求
const request = (method, url, data, opts = {}) => new Promise((resolve, reject) => {
  const fullUrl = url.startsWith('http') ? url : API_BASE + url
  const token = getToken()

  wx.request({
    url: fullUrl,
    method,
    data,
    header: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
    success: (res) => {
      const { statusCode, data } = res
      if (statusCode === 401) {
        clearToken()
        clearUser()
        wx.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
        setTimeout(() => {
          const pages = getCurrentPages()
          if (pages.length === 0 || pages[pages.length - 1].route !== 'pages/index/index') {
            wx.reLaunch({ url: '/pages/index/index' })
          }
        }, 1000)
        reject(new Error('未授权'))
        return
      }
      if (statusCode >= 200 && statusCode < 300) {
        resolve(data)
      } else {
        const msg = data?.message || `HTTP ${statusCode}`
        wx.showToast({ title: msg, icon: 'none' })
        reject(new Error(msg))
      }
    },
    fail: (err) => {
      console.error('[request] fail:', err)
      wx.showToast({ title: '网络错误', icon: 'none' })
      reject(err)
    }
  })
})

const http = {
  get: (u, q) => {
    const qs = q && Object.keys(q).length > 0
      ? '?' + Object.entries(q).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v == null ? '' : v)}`).join('&')
      : ''
    return request('GET', u + qs, null)
  },
  post: (u, d) => request('POST', u, d || {}),
  put: (u, d) => request('PUT', u, d || {}),
  delete: (u) => request('DELETE', u, null),
}

// ============================================================
// 登录 / 注册
// ============================================================
const auth = {
  async login(username, password) {
    const data = await http.post('/users/login', { username, password })
    setToken(data.token)
    if (data.user) setUser(data.user)
    return data
  },
  async register(user) {
    return http.post('/users/register', user)
  },
  async profile() {
    const data = await http.get('/users/profile')
    setUser(data)
    return data
  },
  logout() {
    clearToken()
    clearUser()
  },
  isLoggedIn,
  getToken,
  getUser,
}

// ============================================================
// 项目管理
// ============================================================
const projects = {
  list: (filter) => http.get('/projects', filter || {}),
  get: (id) => http.get(`/projects/${id}`),
  create: (body) => http.post('/projects', body),
  update: (id, body) => http.put(`/projects/${id}`, body),
  del: (id) => http.delete(`/projects/${id}`),
}

// ============================================================
// 合同管理
// ============================================================
const contracts = {
  list: (filter) => http.get('/contracts', filter || {}),
  get: (id) => http.get(`/contracts/${id}`),
  create: (body) => http.post('/contracts', body),
  update: (id, body) => http.put(`/contracts/${id}`, body),
  del: (id) => http.delete(`/contracts/${id}`),
  linkedProjects: (id) => http.get(`/contracts/${id}/projects`),
}

// ============================================================
// 日程
// ============================================================
const schedules = {
  list: (filter) => http.get('/schedules', filter || {}),
  get: (id) => http.get(`/schedules/${id}`),
  create: (body) => http.post('/schedules', body),
  update: (id, body) => http.put(`/schedules/${id}`, body),
  del: (id) => http.delete(`/schedules/${id}`),
  toggle: (id) => http.post(`/schedules/${id}/toggle`),
}

// ============================================================
// 客户管理
// ============================================================
const customers = {
  list: (filter) => http.get('/customers', filter || {}),
  get: (id) => http.get(`/customers/${id}`),
  create: (body) => http.post('/customers', body),
  update: (id, body) => http.put(`/customers/${id}`, body),
  del: (id) => http.delete(`/customers/${id}`),
  addProject: (id, body) => http.post(`/customers/${id}/projects`, body),
  updateProject: (id, body) => http.put(`/customers/${id}/projects`, body),
  delProject: (id, pid) => http.delete(`/customers/${id}/projects/${pid}`),
}

// ============================================================
// 市场数据 / 市情雷达 / 竞争对手
// ============================================================
const market = {
  overview: () => http.get('/data/market-overview'),
  competitors: () => http.get('/data/competitors'), // 公开接口
  refresh: () => http.post('/data/refresh'),
}

// ============================================================
// AI 功能
// ============================================================
const ai = {
  voiceAssistant: (payload) => http.post('/ai/voice-assistant', payload), // {text}
  voiceAsr: (payload) => http.post('/ai/voice-asr', payload), // { audioBase64, format: 'mp3', sampleRate: 16000, channels: 1 }
  voiceCorrect: (payload) => http.post('/ai/voice-correct', payload), // {text}
  customerAnalysis: (payload) => http.post('/ai/customer-analysis', payload),
  reportGeneration: (payload) => http.post('/ai/report-generation', payload),
  industryInsight: (payload) => http.post('/ai/industry-insight', payload),
  chat: (messages, opts) => http.post('/ai/chat', { messages, ...(opts || {}) }),
  memoKnowledge: (notes) => http.post('/ai/memo-knowledge', { notes }),
}

// ============================================================
// 云同步（COS）
// ============================================================
const sync = {
  upload: () => http.post('/sync/upload'),
  pull: () => http.post('/sync/pull'),
  status: () => http.get('/sync/status'),
  config: () => http.get('/sync/config'),
}

module.exports = {
  API_BASE,
  auth,
  projects,
  contracts,
  schedules,
  customers,
  market,
  ai,
  sync,
  http,
}
