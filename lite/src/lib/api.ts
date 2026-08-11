const API_BASE = '/api'

const getToken = () => localStorage.getItem('lite_token')

const request = async (url: string, options: RequestInit = {}) => {
  const token = getToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(`${API_BASE}${url}`, { ...options, headers })
  const data = await response.json().catch(() => ({}))

  if (response.status === 401) {
    localStorage.removeItem('lite_token')
    localStorage.removeItem('lite_user')
    window.location.href = '/login'
    throw new Error('登录已过期')
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || '请求失败')
  }

  // 后端统一返回 { success, data, ... } 或直接数据（用户列表兼容）。
  // 剥掉外层包装，直接返回 data 字段，避免各页面 normalizeList 不一致
  // 同时向后兼容：如果没有 data 就返回整个对象（如登录接口：返回 {token, user, ...}）
  return (data && typeof data === 'object' && 'data' in data) ? data.data : data
}

// ===== 认证 =====
export const authApi = {
  login: (data: { username: string; password: string }) =>
    request('/users/login', { method: 'POST', body: JSON.stringify(data) }),

  register: (data: { username: string; email: string; password: string; name?: string }) =>
    request('/users/register', { method: 'POST', body: JSON.stringify(data) }),

  getProfile: () => request('/users/profile'),
}

// ===== 订单（复用 projects 接口）=====
export const orderApi = {
  list: () => request('/projects'),
  get: (id: string) => request(`/projects/${id}`),
  create: (data: any) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request(`/projects/${id}`, { method: 'DELETE' }),
}

// ===== 客户 =====
export const customerApi = {
  list: () => request('/customers'),
  get: (id: string) => request(`/customers/${id}`),
  create: (data: any) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request(`/customers/${id}`, { method: 'DELETE' }),
}

// ===== 备忘（复用 schedules 接口）=====
export const memoApi = {
  list: () => request('/schedules'),
  get: (id: string) => request(`/schedules/${id}`),
  create: (data: any) => request('/schedules', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request(`/schedules/${id}`, { method: 'DELETE' }),
  toggle: (id: string) => request(`/schedules/${id}/toggle`, { method: 'POST' }),
}

// ===== AI 助手（流式）=====
export const aiApi = {
  /**
   * 流式对话，通过回调逐块返回内容
   * @param messages 消息列表 [{role, content}]
   * @param onChunk 每收到一段内容时的回调
   * @param signal AbortSignal 用于取消
   */
  chat: async (
    messages: { role: string; content: string }[],
    onChunk: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<void> => {
    const token = getToken()
    const response = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ messages }),
      signal,
    })

    if (!response.ok || !response.body) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || data.message || 'AI 请求失败')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') return
        try {
          const parsed = JSON.parse(data)
          if (parsed.content) onChunk(parsed.content)
          if (parsed.error) throw new Error(parsed.error)
        } catch (e: any) {
          if (e.message) throw e
        }
      }
    }
  },
}
