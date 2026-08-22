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

// ============================================================
// AI API
// ============================================================
export const aiApi = {
  // 语音助手 — 解析销售指令
  voiceAssistant: (text: string) =>
    request('/ai/voice-assistant', { method: 'POST', body: JSON.stringify({ text }) }),

  // 客户分析
  customerAnalysis: (data: { customerName: string; customerInfo?: any; records?: any[]; projects?: any[] }) =>
    request('/ai/customer-analysis', { method: 'POST', body: JSON.stringify(data) }),

  // 报告生成（通用）
  reportGeneration: (data: { reportType: string; records?: any[]; dateRange?: string; extraInfo?: string }) =>
    request('/ai/report-generation', { method: 'POST', body: JSON.stringify(data) }),

  // 出差报告生成
  travelReport: (data: {
    travelers?: string;
    travelDate?: string;
    location?: string;
    purpose?: string;
    clients?: string;
    planAchievement?: string;
    industryInfo?: string;
    marketInfo?: string;
    otherHarvest?: string;
    risks?: string;
    helpNeeded?: string;
    nextSteps?: string;
  }) =>
    request('/ai/travel-report', { method: 'POST', body: JSON.stringify(data) }),

  // 出差报告 — AI 解析原始文本为结构化字段
  tripParse: (data: { rawText: string; travelers?: string; travelDate?: string; location?: string }) =>
    request('/ai/trip-parse', { method: 'POST', body: JSON.stringify(data) }),

  // 行业洞察
  industryInsight: (data: { topic?: string; articles?: string }) =>
    request('/ai/industry-insight', { method: 'POST', body: JSON.stringify(data) }),

  // 备忘录知识沉淀
  memoKnowledge: (content: string) =>
    request('/ai/memo-knowledge', { method: 'POST', body: JSON.stringify({ content }) }),

  // 语音文本锻造专业矫正
  voiceCorrect: (text: string) =>
    request('/ai/voice-correct', { method: 'POST', body: JSON.stringify({ text }) }),

  // 语音录音转文字（MediaRecorder 录音上传后端 ASR）
  voiceAsr: (data: { audioBase64: string; format?: string; sampleRate?: number; channels?: number }) =>
    request('/ai/voice-asr', { method: 'POST', body: JSON.stringify(data) }),

  // AI 对话（流式）
  chat: async (messages: Array<{ role: string; content: string }>, onChunk: (text: string) => void) => {
    const token = getToken()
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const response = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages }),
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
        } catch {
          // 跳过无法解析的行
        }
      }
    }
  },
}

// ============================================================
// 市场数据 API
// ============================================================
export const dataApi = {
  // 市场数据概览（含市情雷达各模块）
  marketOverview: () => request('/data/market-overview'),

  // 竞争对手动态（手机端/电脑端实时拉取）
  competitors: () => request('/data/competitors'),

  // 手动刷新
  refresh: () => request('/data/refresh', { method: 'POST' }),
}
