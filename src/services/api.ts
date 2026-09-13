const API_BASE = '/api'

const getToken = () => localStorage.getItem('token')

/** 需要触发 data:changed 的 localStorage key 前缀（业务数据变更） */
const DATA_STORAGE_KEYS = [
  'sw_projects', 'sw_contracts', 'sw_customers', 'sw_schedules',
  'sw_workbench_data',
]
let storageSpyInstalled = false

/**
 * 全局监听 localStorage.setItem。
 * 项目管理、工作记录等页面直接写 localStorage 而不走 fetch API，
 * 所以我们需要在此 patch 上才能捕获所有数据变更并触发自动同步。
 */
function installStorageSpy() {
  if (storageSpyInstalled) return
  storageSpyInstalled = true
  const origSetItem = localStorage.setItem.bind(localStorage)
  const origRemoveItem = localStorage.removeItem.bind(localStorage)

  function shouldFire(key: string) {
    if (!key) return false
    // 白名单里的业务数据 key
    if (DATA_STORAGE_KEYS.some(prefix => key.startsWith(prefix))) return true
    // 或者是任何包含 project/contract/customer/schedule/record/memo 的 key
    const lower = key.toLowerCase()
    return ['project', 'contract', 'customer', 'schedule', 'record', 'memo'].some(k => lower.includes(k))
  }

  localStorage.setItem = function(key: string, value: string) {
    const result = origSetItem(key, value)
    if (shouldFire(key)) {
      window.dispatchEvent(new CustomEvent('data:changed'))
    }
    return result
  }

  localStorage.removeItem = function(key: string) {
    const result = origRemoveItem(key)
    if (shouldFire(key)) {
      window.dispatchEvent(new CustomEvent('data:changed'))
    }
    return result
  }
}

installStorageSpy()

/** 一次性请求刷新 token（避免多个并发 401 同时刷新） */
let refreshPromise: Promise<string | null> | null = null

async function refreshTokenSilently(): Promise<string | null> {
  if (refreshPromise) return refreshPromise
  const old = getToken()
  if (!old || old.startsWith('local.')) return null

  refreshPromise = (async () => {
    try {
      const resp = await fetch(`${API_BASE}/users/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: old }),
      })
      if (!resp.ok) return null
      const data = await resp.json()
      if (data.token) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('sw_current_user', JSON.stringify(data.user))
        // 通知 AuthContext 新 token 已就绪
        window.dispatchEvent(new CustomEvent('auth:token-refreshed', { detail: data.token }))
        return data.token
      }
      return null
    } catch {
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

const request = async (url: string, options: RequestInit = {}): Promise<any> => {
  const isRefreshCall = url.includes('/refresh-token')
  // 同步相关路由也不触发 data:changed（否则会形成 upload→data:changed→upload 死循环）
  const isSyncCall = url.startsWith('/sync') && (options.method || 'GET') !== 'GET'
  const token = getToken()
  const headers: HeadersInit = { 'Content-Type': 'application/json', ...options.headers }
  if (token && !isRefreshCall) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(`${API_BASE}${url}`, { ...options, headers })

  // 401 自动刷新后重试一次（只对非 refresh-token 调用生效）
  if (response.status === 401 && !isRefreshCall) {
    const newToken = await refreshTokenSilently()
    if (newToken) {
      const retryHeaders: HeadersInit = { 'Content-Type': 'application/json', ...options.headers, Authorization: `Bearer ${newToken}` }
      const retryResp = await fetch(`${API_BASE}${url}`, { ...options, headers: retryHeaders })
      if (retryResp.ok) {
        const data = await retryResp.json()
        if ((options.method || 'GET') !== 'GET' && !isSyncCall) {
          window.dispatchEvent(new CustomEvent('data:changed'))
        }
        return data
      }
    }
    // refresh 也失败了 → token 彻底失效（可能是用户在内存DB里不存在了）
    // 通知 AuthContext 全局登出，跳转到登录页
    window.dispatchEvent(new CustomEvent('auth:logged-out', {
      detail: { reason: 'token_expired', message: '登录已过期，请重新登录' }
    }))
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || '请求失败')
  }

  // 数据修改成功 → 通知自动同步（GET 和 sync/upload 都不触发）
  if ((options.method || 'GET') !== 'GET' && !isSyncCall) {
    window.dispatchEvent(new CustomEvent('data:changed'))
  }

  return data
}

export { refreshTokenSilently }

export const authApi = {
  login: (data: { username: string; password: string }) =>
    request('/users/login', { method: 'POST', body: JSON.stringify(data) }),

  register: (data: { username: string; email: string; password: string; name?: string }) =>
    request('/users/register', { method: 'POST', body: JSON.stringify(data) }),

  getProfile: () => request('/users/profile'),

  updateProfile: (data: { name?: string; email?: string }) =>
    request('/users/profile', { method: 'PUT', body: JSON.stringify(data) })
}

export const projectApi = {
  list: (params?: { search?: string; contractStatus?: string; deliveryStatus?: string }) => {
    const query = new URLSearchParams(params).toString()
    return request(`/projects${query ? '?' + query : ''}`)
  },
  get: (id: string) => request(`/projects/${id}`),
  create: (data: any) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request(`/projects/${id}`, { method: 'DELETE' })
}

export const contractApi = {
  list: (params?: { search?: string; paymentStatus?: string }) => {
    const query = new URLSearchParams(params).toString()
    return request(`/contracts${query ? '?' + query : ''}`)
  },
  get: (id: string) => request(`/contracts/${id}`),
  create: (data: any) => request('/contracts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request(`/contracts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request(`/contracts/${id}`, { method: 'DELETE' }),
  getLinkedProjects: (id: string) => request(`/contracts/${id}/projects`)
}

export const scheduleApi = {
  list: (params?: { date?: string; closed?: string }) => {
    const query = new URLSearchParams(params).toString()
    return request(`/schedules${query ? '?' + query : ''}`)
  },
  get: (id: string) => request(`/schedules/${id}`),
  create: (data: any) => request('/schedules', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request(`/schedules/${id}`, { method: 'DELETE' }),
  toggleClosed: (id: string) => request(`/schedules/${id}/toggle`, { method: 'POST' })
}

export const customerApi = {
  list: () => request('/customers'),
  get: (id: string) => request(`/customers/${id}`),
  create: (data: any) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request(`/customers/${id}`, { method: 'DELETE' }),
  addProject: (id: string, project: any) =>
    request(`/customers/${id}/projects`, { method: 'POST', body: JSON.stringify({ project }) }),
  updateProject: (id: string, project: any) =>
    request(`/customers/${id}/projects`, { method: 'PUT', body: JSON.stringify({ project }) }),
  deleteProject: (id: string, projectId: string) =>
    request(`/customers/${id}/projects/${projectId}`, { method: 'DELETE' })
}

export const syncApi = {
  upload: () => request('/sync/upload', { method: 'POST' }),
  // 上传前端 localStorage 数据到云端（绕过 MongoDB，桥接数据源）
  uploadLocal: (data: any) => request('/sync/upload-local', { method: 'POST', body: JSON.stringify(data) }),
  pull: () => request('/sync/pull', { method: 'POST' }),
  status: () => request('/sync/status'),
  config: () => request('/sync/config'),
}

/**
 * 从 localStorage 收集所有业务数据，供 uploadLocal 使用。
 * 前端各页面直接写 localStorage，数据结构各不同，这里做统一采集。
 */
export function collectLocalStorageData() {
  const read = (key: string) => {
    try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
  }
  return {
    data: {
      // 项目/合同（来自 ProjectManagerPage）
      projects: read('workbench.projects.v1'),
      contracts: read('workbench.contracts.v1'),
      // 客户
      customers: read('workbench.customers.v1'),
      // 日程
      schedules: read('workbench.schedules.v1'),
      // 工作记录（来自 useWorkbenchStore）
      workbench: read('sw_workbench_data'),
    }
  }
}

// ============================================================
// AI API
// ============================================================
export const aiApi = {
  voiceAssistant: (text: string) =>
    request('/ai/voice-assistant', { method: 'POST', body: JSON.stringify({ text }) }),

  customerAnalysis: (data: { customerName: string; customerInfo?: any; records?: any[]; projects?: any[] }) =>
    request('/ai/customer-analysis', { method: 'POST', body: JSON.stringify(data) }),

  reportGeneration: (data: { reportType: string; records?: any[]; dateRange?: string; extraInfo?: string }) =>
    request('/ai/report-generation', { method: 'POST', body: JSON.stringify(data) }),

  travelReport: (data: {
    travelers?: string; travelDate?: string; location?: string; purpose?: string;
    clients?: string; planAchievement?: string; industryInfo?: string; marketInfo?: string;
    otherHarvest?: string; risks?: string; helpNeeded?: string; nextSteps?: string;
  }) => request('/ai/travel-report', { method: 'POST', body: JSON.stringify(data) }),

  travelParse: (data: { rawText: string; travelers?: string; travelDate?: string; location?: string }) =>
    request('/ai/trip-parse', { method: 'POST', body: JSON.stringify(data) }),

  industryInsight: (data: { topic?: string; articles?: string }) =>
    request('/ai/industry-insight', { method: 'POST', body: JSON.stringify(data) }),

  memoKnowledge: (content: string) =>
    request('/ai/memo-knowledge', { method: 'POST', body: JSON.stringify({ content }) }),

  voiceCorrect: (text: string) =>
    request('/ai/voice-correct', { method: 'POST', body: JSON.stringify({ text }) }),

  expandText: (text: string, style?: string) =>
    request('/ai/expand-text', { method: 'POST', body: JSON.stringify({ text, style }) }),

  voiceAsr: (data: { audioBase64: string; format?: string; sampleRate?: number; channels?: number }) =>
    request('/ai/voice-asr', { method: 'POST', body: JSON.stringify(data) }),

  chat: async (messages: Array<{ role: string; content: string }>, onChunk: (text: string) => void) => {
    const token = getToken()
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const response = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST', headers, body: JSON.stringify({ messages }),
    })
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(errData.message || 'AI 对话失败')
    }
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const jsonStr = trimmed.slice(6)
        if (jsonStr === '[DONE]') continue
        try {
          const parsed = JSON.parse(jsonStr)
          if (parsed.content) onChunk(parsed.content)
          if (parsed.error) throw new Error(parsed.error)
        } catch { /* skip malformed */ }
      }
    }
  },
}

// ============================================================
// 市场数据 API
// ============================================================
export const dataApi = {
  marketOverview: () => request('/data/market-overview'),
  competitors: () => request('/data/competitors'),
  refresh: () => request('/data/refresh', { method: 'POST' }),
}
