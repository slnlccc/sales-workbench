import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'

interface User {
  _id: string
  username: string
  email: string
  name: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string, name?: string) => Promise<void>
  logout: () => void
  loading: boolean
  /** 最近一次被强制登出的原因描述（例如"登录已过期"），用于登录页展示提示。 */
  logoutMessage: string | null
  /** 尝试用旧 token 换新 token。返回成功/失败。供 API 拦截器使用。 */
  refreshToken: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ===== 本地认证系统（兜底机制，后端不可用时使用）=====
interface LocalUser {
  _id: string
  username: string
  email: string
  name: string
  password: string
}

const LOCAL_USERS_KEY = 'sw_local_users'
const LOCAL_TOKEN_KEY = 'token'
const TOKEN_REFRESH_AHEAD = 60 * 60 * 1000 // 提前 1 小时刷新，不等最后一刻

const getLocalUsers = (): LocalUser[] => {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY)
    if (!raw) {
      const defaultUsers: LocalUser[] = [
        { _id: 'local-admin', username: 'admin', email: 'admin@example.com', name: '管理员', password: 'admin123' },
      ]
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(defaultUsers))
      return defaultUsers
    }
    return JSON.parse(raw)
  } catch {
    return []
  }
}

const saveLocalUser = (user: LocalUser) => {
  const users = getLocalUsers()
  users.push(user)
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users))
}

const generateLocalToken = (userId: string): string => {
  // 不加 btoa！直接明文 local.xxx 格式
  // 这样所有 startsWith('local.') 判断才能正确命中
  // （local token 只是后端不可达时的临时离线兜底，不需要加密）
  return `local.${userId}.${Date.now()}`
}

// 本地登录验证
const localLogin = (username: string, password: string): User => {
  const users = getLocalUsers()
  const found = users.find(u => u.username === username && u.password === password)
  if (!found) throw new Error('用户名或密码错误')
  return { _id: found._id, username: found.username, email: found.email, name: found.name }
}

// 本地注册
const localRegister = (username: string, email: string, password: string, name?: string): User => {
  const users = getLocalUsers()
  if (users.find(u => u.username === username)) throw new Error('用户名已存在')
  if (users.find(u => u.email === email)) throw new Error('邮箱已存在')
  const newUser: LocalUser = {
    _id: `local-${Date.now()}`, username, email, name: name || username, password,
  }
  saveLocalUser(newUser)
  return { _id: newUser._id, username: newUser.username, email: newUser.email, name: newUser.name }
}

// 解码 JWT（不验证签名），拿到 exp 过期时间戳
function decodeJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

// 尝试后端登录，失败则使用本地登录
const tryBackendLogin = async (username: string, password: string): Promise<{ user: User; token: string } | null> => {
  try {
    const response = await fetch('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!response.ok) return null
    const data = await response.json()
    return { user: { _id: data._id, username: data.username, email: data.email, name: data.name }, token: data.token }
  } catch { return null }
}

const tryBackendRegister = async (username: string, email: string, password: string, name?: string): Promise<{ user: User; token: string } | null> => {
  try {
    const response = await fetch('/api/users/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, name }),
    })
    if (!response.ok) return null
    const data = await response.json()
    return { user: { _id: data._id, username: data.username, email: data.email, name: data.name }, token: data.token }
  } catch { return null }
}

// 后端刷新 token（用旧 token 换新 token）
const tryBackendRefresh = async (oldToken: string): Promise<{ user: User; token: string } | null> => {
  try {
    const response = await fetch('/api/users/refresh-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: oldToken }),
    })
    if (!response.ok) return null
    const data = await response.json()
    return { user: data.user, token: data.token }
  } catch { return null }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem(LOCAL_TOKEN_KEY))
  const [loading, setLoading] = useState(true)
  const [logoutMessage, setLogoutMessage] = useState<string | null>(null)

  // 防止多个并发请求同时触发 refreshToken
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null)
  // 自动刷新定时器句柄
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ===== 初始化：恢复状态 + 验证 token 有效性 =====
  useEffect(() => {
    let mounted = true
    let onRefreshed: ((e: Event) => void) | null = null
    let onLoggedOut: ((e: Event) => void) | null = null

    const initAuth = async () => {
      const storedToken = localStorage.getItem(LOCAL_TOKEN_KEY)
      const storedUser = localStorage.getItem('sw_current_user')

      // 没有 token → 直接登出状态
      if (!storedToken || !storedUser) {
        localStorage.removeItem(LOCAL_TOKEN_KEY)
        localStorage.removeItem('sw_current_user')
        if (mounted) {
          setToken(null)
          setLoading(false)
        }
        return
      }

      // 先恢复本地状态
      try {
        setUser(JSON.parse(storedUser))
        setToken(storedToken)
      } catch {
        localStorage.removeItem(LOCAL_TOKEN_KEY)
        localStorage.removeItem('sw_current_user')
        if (mounted) {
          setToken(null)
          setLoading(false)
        }
        return
      }

      // 本地降级 token：后端不可用时的兜底登录
      // initAuth 只在应用启动时恢复状态，不再主动探测后端恢复
      // （如果用户是用 localLogin 主动登录的，说明当时后端确实不可用，就保持离线模式不打扰用户）
      // 真正的后端恢复检测交给 api.ts 的 401 拦截器 + login 重试逻辑处理
      if (storedToken.startsWith('local.')) {
        if (mounted) setLoading(false)
        return
      }

      // 用 refresh-token 接口验证 token 是否还有效
      // - 有效 → 换新 token（续期 30 天）
      // - 过期但在 24 小时宽限期内 → 换新 token
      // - 内存 DB 冷启动后找不到用户 → 失败 → 清除本地状态，让用户重新登录
      try {
        const result = await tryBackendRefresh(storedToken)
        if (!mounted) return
        if (result) {
          localStorage.setItem(LOCAL_TOKEN_KEY, result.token)
          localStorage.setItem('sw_current_user', JSON.stringify(result.user))
          setToken(result.token)
          setUser(result.user)
        } else {
          // refresh 失败 → token 已失效，清除让用户重新登录
          localStorage.removeItem(LOCAL_TOKEN_KEY)
          localStorage.removeItem('sw_current_user')
          setToken(null)
          setUser(null)
          setLogoutMessage('登录已过期，请重新登录')
        }
      } catch {
        // 服务器不可用 → 保持当前状态，等后端恢复后用户操作时再刷新
      }
      if (mounted) setLoading(false)
    }

    initAuth()

    // 监听 api.ts 静默刷新成功后的 token 通知
    onRefreshed = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail && typeof detail === 'string' && mounted) setToken(detail)
    }
    window.addEventListener('auth:token-refreshed', onRefreshed)

    // 监听全局登出事件（api.ts 在 401 + refresh 失败后触发）
    onLoggedOut = (e: Event) => {
      const detail = (e as CustomEvent).detail
      const reason = detail?.message || '登录已过期，请重新登录'
      if (mounted) {
        // 清理 token、user、定时器
        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current)
          refreshTimerRef.current = null
        }
        localStorage.removeItem(LOCAL_TOKEN_KEY)
        localStorage.removeItem('sw_current_user')
        setToken(null)
        setUser(null)
        setLogoutMessage(reason)
      }
    }
    window.addEventListener('auth:logged-out', onLoggedOut)

    return () => {
      mounted = false
      if (onRefreshed) window.removeEventListener('auth:token-refreshed', onRefreshed)
      if (onLoggedOut) window.removeEventListener('auth:logged-out', onLoggedOut)
    }
  }, [])

  // ===== 公开的 refreshToken 方法 =====
  const refreshToken = useCallback(async (): Promise<boolean> => {
    // 本地 token 无法刷新
    if (!token || token.startsWith('local.')) return false

    // 如果已有刷新在进行中，直接等它完成
    if (refreshPromiseRef.current) return refreshPromiseRef.current

    refreshPromiseRef.current = (async () => {
      try {
        const result = await tryBackendRefresh(token)
        if (result) {
          localStorage.setItem(LOCAL_TOKEN_KEY, result.token)
          localStorage.setItem('sw_current_user', JSON.stringify(result.user))
          setToken(result.token)
          setUser(result.user)
          return true
        }
        return false
      } catch {
        return false
      } finally {
        refreshPromiseRef.current = null
      }
    })()

    return refreshPromiseRef.current
  }, [token])

  // ===== token 变化时，自动安排下一次刷新 =====
  useEffect(() => {
    // 清除旧定时器
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }

    if (!token || token.startsWith('local.')) return

    const exp = decodeJwtExp(token)
    if (!exp) return

    const msUntilExpire = exp - Date.now()
    if (msUntilExpire <= 0) return // 已过期，不自动刷

    // 提前 TOKEN_REFRESH_AHEAD 触发刷新
    const delay = Math.max(1000, msUntilExpire - TOKEN_REFRESH_AHEAD)

    refreshTimerRef.current = setTimeout(() => {
      refreshToken().catch(() => { /* 静默失败 */ })
    }, delay)

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
    }
  }, [token, refreshToken])

  // ===== 登录 =====
  const login = async (username: string, password: string) => {
    setLoading(true)
    try {
      const backendResult = await tryBackendLogin(username, password)
      let loggedInUser: User, newToken: string

      if (backendResult) {
        loggedInUser = backendResult.user
        newToken = backendResult.token
      } else {
        loggedInUser = localLogin(username, password)
        newToken = generateLocalToken(loggedInUser._id)
      }

      localStorage.setItem(LOCAL_TOKEN_KEY, newToken)
      localStorage.setItem('sw_current_user', JSON.stringify(loggedInUser))
      setUser(loggedInUser)
      setToken(newToken)
      setLogoutMessage(null)
    } finally {
      setLoading(false)
    }
  }

  const register = async (username: string, email: string, password: string, name?: string) => {
    setLoading(true)
    try {
      const backendResult = await tryBackendRegister(username, email, password, name)
      let registeredUser: User, newToken: string

      if (backendResult) {
        registeredUser = backendResult.user
        newToken = backendResult.token
      } else {
        registeredUser = localRegister(username, email, password, name)
        newToken = generateLocalToken(registeredUser._id)
      }

      localStorage.setItem(LOCAL_TOKEN_KEY, newToken)
      localStorage.setItem('sw_current_user', JSON.stringify(registeredUser))
      setUser(registeredUser)
      setToken(newToken)
      setLogoutMessage(null)
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
    localStorage.removeItem(LOCAL_TOKEN_KEY)
    localStorage.removeItem('sw_current_user')
    setUser(null)
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, logoutMessage, refreshToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
