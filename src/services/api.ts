const API_BASE = '/api'

const getToken = () => localStorage.getItem('token')

const request = async (url: string, options: RequestInit = {}) => {
  const token = getToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${url}`, { ...options, headers })
  const data = await response.json()

  if (response.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
    throw new Error('登录已过期，请重新登录')
  }

  if (!response.ok) {
    throw new Error(data.message || '请求失败')
  }

  return data
}

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
  
  update: (id: string, data: any) => 
    request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  delete: (id: string) => request(`/projects/${id}`, { method: 'DELETE' })
}

export const contractApi = {
  list: (params?: { search?: string; paymentStatus?: string }) => {
    const query = new URLSearchParams(params).toString()
    return request(`/contracts${query ? '?' + query : ''}`)
  },
  
  get: (id: string) => request(`/contracts/${id}`),
  
  create: (data: any) => request('/contracts', { method: 'POST', body: JSON.stringify(data) }),
  
  update: (id: string, data: any) => 
    request(`/contracts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
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
  
  update: (id: string, data: any) => 
    request(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  delete: (id: string) => request(`/schedules/${id}`, { method: 'DELETE' }),
  
  toggleClosed: (id: string) => request(`/schedules/${id}/toggle`, { method: 'POST' })
}

export const customerApi = {
  list: () => request('/customers'),
  
  get: (id: string) => request(`/customers/${id}`),
  
  create: (data: any) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  
  update: (id: string, data: any) => 
    request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
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
  pull: () => request('/sync/pull', { method: 'POST' }),
  status: () => request('/sync/status'),
  config: () => request('/sync/config'),
}

// ============ AI 服务 API ============

export const aiApi = {
  /** 语音助手 - 解析语音指令 */
  voiceAssistant: (message: string, context?: string) =>
    request('/ai/voice-assistant', { method: 'POST', body: JSON.stringify({ message, context }) }),

  /** 客户分析 - 画像/跟进/商机预测 */
  customerAnalysis: (customerData: any, analysisType: 'profile' | 'followup' | 'opportunity') =>
    request('/ai/customer-analysis', { method: 'POST', body: JSON.stringify({ customerData, analysisType }) }),

  /** 报告生成 - 周报/出差/拜访/方案 */
  generateReport: (reportType: 'weekly' | 'business_trip' | 'visit_memo' | 'proposal', data: any, period?: string) =>
    request('/ai/generate-report', { method: 'POST', body: JSON.stringify({ reportType, data, period }) }),

  /** 行业资讯智能摘要 */
  marketInsight: (newsItems?: any[], industry?: string) =>
    request('/ai/market-insight', { method: 'POST', body: JSON.stringify({ newsItems, industry }) }),

  /** 锻造专业文本矫正（独立接口） */
  forgeCorrect: (text: string, useAI = true) =>
    request('/ai/forge-correct', { method: 'POST', body: JSON.stringify({ text, useAI }) }),
}

// ============ 数据服务 API ============

export const dataApi = {
  /** 获取最新金属价格 */
  metalPrices: () => request('/data/metal-prices'),

  /** 获取金属价格历史 */
  metalPriceHistory: (days?: number) => request(`/data/metal-prices/history?days=${days || 30}`),

  /** 获取行业资讯 */
  industryNews: (category?: string, limit?: number) => {
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (limit) params.set('limit', String(limit))
    return request(`/data/industry-news?${params}`)
  },

  /** 获取展会信息 */
  exhibitions: (status?: string) => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    return request(`/data/exhibitions?${params}`)
  },

  /** 获取市场概览 */
  marketOverview: () => request('/data/market-overview'),

  /** 手动刷新数据 */
  refresh: () => request('/data/refresh', { method: 'POST' }),
}