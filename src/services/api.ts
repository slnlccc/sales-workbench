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